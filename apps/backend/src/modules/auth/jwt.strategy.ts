import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/auth.decorators';
import { UserRole } from '@todanpho/shared';

export interface JwtPayload {
  sub: string;
  neighborhoodId: string;
  role: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET')!,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        deletedAt: null,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        neighborhoodId: true,
        role: true,
        phoneNumber: true,
        fullName: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị khóa');
    }

    return {
      id: user.id,
      neighborhoodId: user.neighborhoodId,
      role: user.role as UserRole,
      phoneNumber: user.phoneNumber,
      fullName: user.fullName,
    };
  }
}

