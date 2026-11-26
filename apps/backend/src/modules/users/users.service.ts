import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateDeletionRequestDto,
  HistoryQueryDto,
  UpdateProfileDto,
  UpdateUserSettingDto,
} from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phoneNumber: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        staffTitle: true,
        status: true,
        neighborhoodId: true,
        neighborhood: {
          select: { id: true, code: true, name: true, ward: true, district: true, city: true },
        },
        setting: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName.trim() } : {}),
        ...(dto.email !== undefined ? { email: dto.email.trim() } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
      },
      select: {
        id: true,
        phoneNumber: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        staffTitle: true,
      },
    });
  }

  async getMyHousehold(userId: string) {
    const member = await this.prisma.householdMember.findFirst({
      where: { userId, deletedAt: null },
      include: {
        household: {
          include: {
            members: {
              where: { deletedAt: null },
              orderBy: [{ isHead: 'desc' }, { createdAt: 'asc' }],
            },
          },
        },
      },
    });

    if (!member) {
      return null;
    }

    return member.household;
  }

  async getMyHistory(userId: string, query: HistoryQueryDto) {
    const limit = query.limit ?? 20;
    const [posts, reports, events] = await Promise.all([
      query.type === 'ALL' || query.type === 'POSTS'
        ? this.prisma.post.findMany({
            where: { authorId: userId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: { id: true, title: true, content: true, category: true, createdAt: true },
          })
        : Promise.resolve([]),
      query.type === 'ALL' || query.type === 'REPORTS'
        ? this.prisma.report.findMany({
            where: { reporterId: userId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: { id: true, title: true, category: true, status: true, visibility: true, createdAt: true },
          })
        : Promise.resolve([]),
      query.type === 'ALL' || query.type === 'EVENTS'
        ? this.prisma.eventRegistration.findMany({
            where: { userId },
            orderBy: { registeredAt: 'desc' },
            take: limit,
            include: { event: { select: { id: true, title: true, startTime: true, locationName: true } } },
          })
        : Promise.resolve([]),
    ]);

    return { posts, reports, events };
  }

  async updateSettings(userId: string, dto: UpdateUserSettingDto) {
    return this.prisma.userSetting.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto },
    });
  }

  async createDeletionRequest(
    userId: string,
    neighborhoodId: string,
    dto: CreateDeletionRequestDto,
  ) {
    const req = await this.prisma.accountDeletionRequest.create({
      data: {
        userId,
        reason: dto.reason.trim(),
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'DELETION_REQUESTED' },
    });

    await this.auditService.log({
      neighborhoodId,
      actorId: userId,
      action: 'REQUEST_ACCOUNT_DELETION',
      resource: 'USERS',
      resourceId: userId,
      newData: { reason: dto.reason },
    });

    return req;
  }
}

