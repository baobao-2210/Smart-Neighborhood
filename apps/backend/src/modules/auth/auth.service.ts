import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  ChangePasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { phoneNumber: dto.phoneNumber },
    });
    if (existing) {
      throw new ConflictException('Số điện thoại đã được đăng ký');
    }

    const neighborhood = await this.prisma.neighborhood.findFirst({
      where: { code: dto.neighborhoodCode, isActive: true },
    });
    if (!neighborhood) {
      throw new BadRequestException('Mã tổ dân phố không tồn tại hoặc ngừng hoạt động');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        neighborhoodId: neighborhood.id,
        phoneNumber: dto.phoneNumber,
        passwordHash,
        fullName: dto.fullName.trim(),
        role: 'RESIDENT',
        setting: { create: {} },
      },
      include: { neighborhood: true },
    });

    const tokens = await this.issueTokens(user.id, user.neighborhoodId, user.role);
    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async login(dto: LoginDto, ipAddress?: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        phoneNumber: dto.phoneNumber,
        deletedAt: null,
      },
      include: { neighborhood: true },
    });

    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Số điện thoại hoặc mật khẩu không đúng');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Tài khoản đang bị tạm khóa hoặc chờ xóa');
    }

    const tokens = await this.issueTokens(user.id, user.neighborhoodId, user.role);

    await this.auditService.log({
      neighborhoodId: user.neighborhoodId,
      actorId: user.id,
      action: 'LOGIN',
      resource: 'AUTH',
      resourceId: user.id,
      ipAddress,
    });

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async refresh(dto: RefreshTokenDto) {
    let payload: { sub: string; neighborhoodId: string; role: string };
    try {
      payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null, status: 'ACTIVE' },
    });

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Phiên đăng nhập đã bị thu hồi');
    }

    const valid = await argon2.verify(user.refreshTokenHash, dto.refreshToken);
    if (!valid) {
      // Phát hiện tái sử dụng token cũ -> thu hồi phiên ngay lập tức
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: null },
      });
      throw new UnauthorizedException('Refresh token đã bị thu hồi do bất thường bảo mật');
    }

    return this.issueTokens(user.id, user.neighborhoodId, user.role);
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
    return { loggedOut: true };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await argon2.verify(user.passwordHash, dto.oldPassword))) {
      throw new BadRequestException('Mật khẩu cũ không chính xác');
    }

    const newHash = await argon2.hash(dto.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash, refreshTokenHash: null },
    });

    await this.auditService.log({
      neighborhoodId: user.neighborhoodId,
      actorId: user.id,
      action: 'CHANGE_PASSWORD',
      resource: 'AUTH',
      resourceId: user.id,
    });

    return { updated: true };
  }

  async getActiveNeighborhoods() {
    return this.prisma.neighborhood.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  private async issueTokens(userId: string, neighborhoodId: string, role: string) {
    const payload = { sub: userId, neighborhoodId, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m') as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d') as any,
      }),
    ]);

    const refreshTokenHash = await argon2.hash(refreshToken);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: any) {
    return {
      id: user.id,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      staffTitle: user.staffTitle,
      neighborhoodId: user.neighborhoodId,
      neighborhoodName: user.neighborhood?.name ?? null,
    };
  }
}
