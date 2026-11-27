import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttachmentEntityType, UserRole } from '@todanpho/shared';
import { AuthenticatedUser } from '../../common/decorators/auth.decorators';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { FeedGateway } from '../feed/feed.gateway';
import {
  CreateConversationDto,
  MessageQueryDto,
  ModerateMessageDto,
  ReportMessageDto,
  SendMessageDto,
} from './dto/chat.dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly feedGateway: FeedGateway,
  ) {}

  async getNeighborhoodContacts(user: AuthenticatedUser, search?: string) {
    const where: Record<string, any> = {
      neighborhoodId: user.neighborhoodId,
      deletedAt: null,
      status: 'ACTIVE',
      id: { not: user.id },
    };

    if (search?.trim()) {
      const q = search.trim();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { staffTitle: { contains: q, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        staffTitle: true,
      },
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
      take: 50,
    });

    return users;
  }

  async getMyConversations(user: AuthenticatedUser) {
    return this.prisma.conversation.findMany({
      where: {
        neighborhoodId: user.neighborhoodId,
        members: { some: { userId: user.id } },
      },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
                role: true,
                staffTitle: true,
              },
            },
          },
        },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, content: true, senderId: true, createdAt: true, isModerated: true },
        },
      },
    });
  }

  async createConversation(dto: CreateConversationDto, user: AuthenticatedUser) {
    const isOfficer =
      user.role === UserRole.LEADER ||
      user.role === UserRole.STAFF ||
      user.role === UserRole.SUPER_ADMIN;

    if (dto.type === 'GROUP' && !isOfficer) {
      throw new ForbiddenException('Chỉ Tổ trưởng hoặc Cán bộ tổ mới được tạo nhóm chat');
    }

    const inputIds = dto.participantIds ?? [];
    if (dto.type !== 'SUPPORT' && inputIds.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất 1 thành viên để trò chuyện');
    }

    let uniqueMemberIds = Array.from(new Set([user.id, ...inputIds]));

    if (dto.type === 'SUPPORT') {
      const existingSupport = await this.prisma.conversation.findFirst({
        where: {
          neighborhoodId: user.neighborhoodId,
          type: 'SUPPORT',
          createdById: user.id,
        },
        include: {
          members: {
            include: {
              user: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
            },
          },
        },
      });
      if (existingSupport) {
        return existingSupport;
      }

      const officers = await this.prisma.user.findMany({
        where: {
          neighborhoodId: user.neighborhoodId,
          role: { in: [UserRole.LEADER, UserRole.STAFF] },
          deletedAt: null,
          status: 'ACTIVE',
        },
        select: { id: true },
        take: 5,
      });
      uniqueMemberIds = Array.from(new Set([user.id, ...officers.map((o) => o.id)]));
    }

    if (dto.type === 'DIRECT' && uniqueMemberIds.length === 2) {
      const targetUserId = uniqueMemberIds.find((id) => id !== user.id)!;
      const target = await this.prisma.user.findFirst({
        where: { id: targetUserId, neighborhoodId: user.neighborhoodId, deletedAt: null },
        include: { setting: true },
      });
      if (!target) throw new NotFoundException('Không tìm thấy người nhận trong tổ dân phố');

      const targetIsOfficer =
        target.role === 'LEADER' || target.role === 'STAFF' || target.role === 'SUPER_ADMIN';
      if (
        !isOfficer &&
        !targetIsOfficer &&
        target.setting?.allowDirectMessage === 'OFFICERS_ONLY'
      ) {
        throw new ForbiddenException('Người dùng này chỉ nhận tin nhắn từ Cán bộ tổ');
      }

      const existing = await this.prisma.conversation.findFirst({
        where: {
          neighborhoodId: user.neighborhoodId,
          type: 'DIRECT',
          AND: [
            { members: { some: { userId: user.id } } },
            { members: { some: { userId: targetUserId } } },
          ],
        },
        include: {
          members: {
            include: {
              user: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
            },
          },
        },
      });
      if (existing) {
        return existing;
      }
    }

    return this.prisma.conversation.create({
      data: {
        neighborhoodId: user.neighborhoodId,
        type: dto.type,
        name: dto.name?.trim(),
        createdById: user.id,
        lastMessageAt: new Date(),
        members: {
          create: uniqueMemberIds.map((uid) => ({
            userId: uid,
            memberRole: uid === user.id ? 'ADMIN' : 'MEMBER',
          })),
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
          },
        },
      },
    });
  }

  async getMessages(
    conversationId: string,
    query: MessageQueryDto,
    user: AuthenticatedUser,
  ) {
    await this.ensureConversationMember(conversationId, user.id, user.neighborhoodId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    const skip = (page - 1) * limit;

    const where = { conversationId, deletedAt: null };
    const [items, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: { id: true, fullName: true, avatarUrl: true, role: true, staffTitle: true },
          },
        },
      }),
      this.prisma.message.count({ where }),
    ]);

    const msgIds = items.map((m) => m.id);
    const attachments = msgIds.length
      ? await this.prisma.attachment.findMany({
          where: {
            entityType: AttachmentEntityType.MESSAGE,
            entityId: { in: msgIds },
          },
        })
      : [];

    const attMap = new Map<string, typeof attachments>();
    for (const att of attachments) {
      const list = attMap.get(att.entityId) ?? [];
      list.push(att);
      attMap.set(att.entityId, list);
    }

    return {
      data: items.map((m) => ({
        ...m,
        content: m.isModerated ? '[Tin nhắn đã bị ẩn do vi phạm quy tắc cộng đồng]' : m.content,
        attachments: attMap.get(m.id) ?? [],
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async sendMessage(
    conversationId: string,
    dto: SendMessageDto,
    user: AuthenticatedUser,
  ) {
    await this.ensureConversationMember(conversationId, user.id, user.neighborhoodId);

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: user.id,
        content: dto.content.trim(),
      },
      include: {
        sender: {
          select: { id: true, fullName: true, avatarUrl: true, role: true, staffTitle: true },
        },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    let createdAttachments: any[] = [];
    if (dto.attachmentUrls?.length) {
      await this.prisma.attachment.createMany({
        data: dto.attachmentUrls.map((url) => ({
          uploaderId: user.id,
          entityType: AttachmentEntityType.MESSAGE,
          entityId: message.id,
          url,
          mimeType: 'image/jpeg',
          fileSize: 0,
        })),
      });
      createdAttachments = await this.prisma.attachment.findMany({
        where: {
          entityType: AttachmentEntityType.MESSAGE,
          entityId: message.id,
        },
      });
    }

    const recipients = await this.prisma.conversationMember.findMany({
      where: { conversationId, userId: { not: user.id } },
      select: { userId: true },
    });

    for (const r of recipients) {
      const notif = await this.prisma.notification.create({
        data: {
          userId: r.userId,
          type: 'NEW_MESSAGE',
          title: `Tin nhắn mới từ ${message.sender.fullName}`,
          body: message.content.slice(0, 100),
          referenceId: conversationId,
        },
      });
      this.feedGateway.emitToUser(r.userId, 'notification.new', notif);
    }

    return {
      ...message,
      attachments: createdAttachments,
    };
  }

  async reportMessage(
    messageId: string,
    dto: ReportMessageDto,
    user: AuthenticatedUser,
  ) {
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, deletedAt: null },
      include: { conversation: true },
    });
    if (!message || message.conversation.neighborhoodId !== user.neighborhoodId) {
      throw new NotFoundException('Không tìm thấy tin nhắn');
    }

    await this.ensureConversationMember(message.conversationId, user.id, user.neighborhoodId);

    return this.prisma.messageReport.create({
      data: {
        messageId,
        reporterId: user.id,
        reason: dto.reason.trim(),
      },
    });
  }

  async moderateMessage(
    messageId: string,
    dto: ModerateMessageDto,
    user: AuthenticatedUser,
  ) {
    const message = await this.prisma.message.findFirst({
      where: { id: messageId },
      include: { conversation: true },
    });
    if (!message || message.conversation.neighborhoodId !== user.neighborhoodId) {
      throw new NotFoundException('Không tìm thấy tin nhắn');
    }

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { isModerated: dto.isModerated },
    });

    await this.auditService.log({
      neighborhoodId: user.neighborhoodId,
      actorId: user.id,
      action: 'MODERATE_MESSAGE',
      resource: 'CHAT',
      resourceId: messageId,
      newData: { isModerated: dto.isModerated },
    });

    return updated;
  }

  async ensureConversationMember(
    conversationId: string,
    userId: string,
    neighborhoodId: string,
  ) {
    const member = await this.prisma.conversationMember.findFirst({
      where: {
        conversationId,
        userId,
        conversation: { neighborhoodId },
      },
    });
    if (!member) {
      throw new ForbiddenException('Bạn không thuộc cuộc trò chuyện này');
    }
    return member;
  }
}

