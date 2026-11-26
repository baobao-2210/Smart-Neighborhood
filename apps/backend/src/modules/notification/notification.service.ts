import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../../common/decorators/auth.decorators';
import { PrismaService } from '../../database/prisma.service';
import {
  AnnouncementQueryDto,
  CreateAnnouncementDto,
  CreateEventDto,
  EventQueryDto,
  EventRegisterDto,
  RegisterDeviceTokenDto,
} from './dto/notification.dto';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async getAnnouncements(query: AnnouncementQueryDto, user: AuthenticatedUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {
      neighborhoodId: user.neighborhoodId,
      deletedAt: null,
    };

    if (query.priority) where.priority = query.priority;
    if (query.isPinned !== undefined) where.isPinned = query.isPinned;

    const [items, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
        include: {
          author: { select: { id: true, fullName: true, role: true, staffTitle: true } },
          readReceipts: {
            where: { userId: user.id },
            select: { readAt: true },
          },
          _count: { select: { readReceipts: true } },
        },
      }),
      this.prisma.announcement.count({ where }),
    ]);

    const data = items.map((a) => ({
      ...a,
      isRead: a.readReceipts.length > 0,
      readAt: a.readReceipts[0]?.readAt ?? null,
      readCount: a._count.readReceipts,
      readReceipts: undefined,
      _count: undefined,
    }));

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async createAnnouncement(dto: CreateAnnouncementDto, user: AuthenticatedUser) {
    const announcement = await this.prisma.announcement.create({
      data: {
        neighborhoodId: user.neighborhoodId,
        authorId: user.id,
        title: dto.title.trim(),
        content: dto.content.trim(),
        priority: dto.priority ?? 'NORMAL',
        isPinned: Boolean(dto.isPinned),
      },
    });

    // Lưu lịch sử thông báo cho các cư dân trong tổ bật nhận thông báo
    const residents = await this.prisma.user.findMany({
      where: {
        neighborhoodId: user.neighborhoodId,
        deletedAt: null,
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    if (residents.length) {
      await this.prisma.notification.createMany({
        data: residents.map((r) => ({
          userId: r.id,
          type: 'ANNOUNCEMENT',
          title: announcement.title,
          body: announcement.content.slice(0, 120),
          referenceId: announcement.id,
        })),
      });
    }

    return announcement;
  }

  async markAsRead(announcementId: string, user: AuthenticatedUser) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id: announcementId, neighborhoodId: user.neighborhoodId, deletedAt: null },
    });
    if (!announcement) throw new NotFoundException('Không tìm thấy thông báo');

    return this.prisma.announcementReadReceipt.upsert({
      where: {
        announcementId_userId: { announcementId, userId: user.id },
      },
      update: {},
      create: { announcementId, userId: user.id },
    });
  }

  async getAnnouncementStats(announcementId: string, user: AuthenticatedUser) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id: announcementId, neighborhoodId: user.neighborhoodId, deletedAt: null },
    });
    if (!announcement) throw new NotFoundException('Không tìm thấy thông báo');

    const [totalResidents, readCount] = await Promise.all([
      this.prisma.user.count({
        where: { neighborhoodId: user.neighborhoodId, deletedAt: null, status: 'ACTIVE' },
      }),
      this.prisma.announcementReadReceipt.count({
        where: { announcementId },
      }),
    ]);

    return {
      announcementId,
      totalResidents,
      readCount,
      readRate: totalResidents > 0 ? Math.round((readCount / totalResidents) * 100) : 0,
    };
  }

  async getEvents(query: EventQueryDto, user: AuthenticatedUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {
      neighborhoodId: user.neighborhoodId,
      deletedAt: null,
    };
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: 'asc' },
        include: {
          organizer: { select: { id: true, fullName: true, staffTitle: true } },
          registrations: {
            where: { userId: user.id },
            select: { status: true },
          },
          _count: {
            select: {
              registrations: { where: { status: 'REGISTERED' } },
            },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    const data = items.map((e) => ({
      ...e,
      myRegistrationStatus: e.registrations[0]?.status ?? null,
      registeredCount: e._count.registrations,
      registrations: undefined,
      _count: undefined,
    }));

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async createEvent(dto: CreateEventDto, user: AuthenticatedUser) {
    return this.prisma.event.create({
      data: {
        neighborhoodId: user.neighborhoodId,
        organizerId: user.id,
        title: dto.title.trim(),
        description: dto.description.trim(),
        locationName: dto.locationName.trim(),
        latitude: dto.latitude,
        longitude: dto.longitude,
        startTime: new Date(dto.startTime),
        endTime: dto.endTime ? new Date(dto.endTime) : null,
        maxAttendees: dto.maxAttendees,
      },
    });
  }

  async registerEvent(
    eventId: string,
    dto: EventRegisterDto,
    user: AuthenticatedUser,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, neighborhoodId: user.neighborhoodId, deletedAt: null },
    });
    if (!event) throw new NotFoundException('Không tìm thấy sự kiện');

    if (dto.status === 'REGISTERED' && event.maxAttendees) {
      const currentCount = await this.prisma.eventRegistration.count({
        where: { eventId, status: 'REGISTERED' },
      });
      if (currentCount >= event.maxAttendees) {
        throw new BadRequestException('Sự kiện đã đủ số lượng đăng ký');
      }
    }

    return this.prisma.eventRegistration.upsert({
      where: {
        eventId_userId: { eventId, userId: user.id },
      },
      update: { status: dto.status },
      create: { eventId, userId: user.id, status: dto.status },
    });
  }

  async registerDeviceToken(
    dto: RegisterDeviceTokenDto,
    user: AuthenticatedUser,
  ) {
    await this.prisma.deviceToken.upsert({
      where: { token: dto.token },
      update: { userId: user.id, platform: dto.platform },
      create: { userId: user.id, token: dto.token, platform: dto.platform },
    });
    return { registered: true };
  }
}

