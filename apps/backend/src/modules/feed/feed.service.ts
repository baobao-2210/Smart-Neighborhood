import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttachmentEntityType,
  PostCategory,
  PostType,
  PostVisibility,
  ReactionType,
  ReportCategory,
  ReportPriority,
  ReportStatus,
  ReportVisibility,
  UserRole,
} from '@todanpho/shared';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateCommentDto,
  CreatePostDto,
  FeedQueryDto,
  ReportPostDto,
  ToggleReactionDto,
  UpdatePostDto,
} from './dto/feed.dto';
import { FeedGateway } from './feed.gateway';

export interface RequestUserContext {
  userId: string;
  neighborhoodId: string;
  role: UserRole;
}

@Injectable()
export class FeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly feedGateway: FeedGateway,
  ) {}

  async getPosts(query: FeedQueryDto, user: RequestUserContext) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {
      neighborhoodId: user.neighborhoodId,
      deletedAt: null,
    };

    if (!this.isOfficer(user.role)) {
      where.OR = [
        { visibility: PostVisibility.PUBLIC },
        { authorId: user.userId },
      ];
    }

    if (query.filter === 'OFFICIAL') {
      where.isOfficial = true;
    } else if (query.filter === 'LIFE') {
      where.category = PostCategory.LIFE;
    } else if (query.filter === 'WARNING') {
      where.category = PostCategory.WARNING;
    } else if (query.filter === 'INCIDENT') {
      where.type = PostType.INCIDENT;
    } else if (query.filter === 'PINNED') {
      where.isPinned = true;
    }

    if (query.search?.trim()) {
      const s = query.search.trim();
      where.AND = [
        {
          OR: [
            { content: { contains: s, mode: 'insensitive' } },
            { title: { contains: s, mode: 'insensitive' } },
            { author: { fullName: { contains: s, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: {
          author: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              role: true,
              staffTitle: true,
            },
          },
          reactions: {
            select: {
              userId: true,
              type: true,
            },
          },
          incidentReport: {
            include: {
              assignedTo: {
                select: { id: true, fullName: true, staffTitle: true },
              },
            },
          },
          _count: {
            select: {
              comments: true,
              reactions: true,
            },
          },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    const postIds = posts.map((p) => p.id);
    const attachments = postIds.length
      ? await this.prisma.attachment.findMany({
          where: {
            entityType: AttachmentEntityType.POST,
            entityId: { in: postIds },
          },
        })
      : [];

    const attachmentMap = new Map<string, typeof attachments>();
    for (const att of attachments) {
      const list = attachmentMap.get(att.entityId) ?? [];
      list.push(att);
      attachmentMap.set(att.entityId, list);
    }

    const formatted = posts.map((post) =>
      this.formatPost(post, attachmentMap.get(post.id) ?? [], user),
    );

    return {
      data: formatted,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPostById(postId: string, user: RequestUserContext) {
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        neighborhoodId: user.neighborhoodId,
        deletedAt: null,
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            role: true,
            staffTitle: true,
          },
        },
        reactions: {
          select: {
            userId: true,
            type: true,
          },
        },
        incidentReport: {
          include: {
            assignedTo: {
              select: { id: true, fullName: true, staffTitle: true },
            },
            statusHistory: {
              orderBy: { createdAt: 'asc' },
              include: {
                changedBy: { select: { id: true, fullName: true, role: true } },
              },
            },
          },
        },
        editHistories: {
          orderBy: { createdAt: 'desc' },
          include: {
            editor: { select: { id: true, fullName: true } },
          },
        },
        comments: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
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
        _count: {
          select: {
            comments: true,
            reactions: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Không tìm thấy bài viết trong tổ dân phố');
    }

    this.assertCanViewPost(post, user);

    const attachments = await this.prisma.attachment.findMany({
      where: {
        entityType: AttachmentEntityType.POST,
        entityId: post.id,
      },
    });

    return {
      ...this.formatPost(post, attachments, user),
      comments: post.comments,
      editHistories: post.editHistories,
    };
  }

  async createPost(dto: CreatePostDto, user: RequestUserContext) {
    const officer = this.isOfficer(user.role);
    const leader = this.isLeader(user.role);
    const postType = dto.type ?? PostType.NORMAL;

    if (postType === PostType.INCIDENT && !dto.incidentCategory) {
      throw new BadRequestException('Vui lòng chọn danh mục sự cố');
    }

    const isPrivateIncident =
      postType === PostType.INCIDENT &&
      dto.incidentVisibility === ReportVisibility.PRIVATE;

    const visibility = isPrivateIncident
      ? PostVisibility.PRIVATE
      : officer
        ? (dto.visibility ?? PostVisibility.PUBLIC)
        : PostVisibility.PUBLIC;

    const result = await this.prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: {
          neighborhoodId: user.neighborhoodId,
          authorId: user.userId,
          type: postType,
          title: dto.title?.trim() || null,
          content: dto.content.trim(),
          category:
            postType === PostType.INCIDENT
              ? PostCategory.WARNING
              : (dto.category ?? PostCategory.LIFE),
          visibility,
          isOfficial: officer && postType === PostType.NORMAL ? Boolean(dto.isOfficial) : false,
          isPinned: leader && !isPrivateIncident ? Boolean(dto.isPinned) : false,
          locationName: dto.locationName?.trim() || null,
          latitude: dto.latitude ?? null,
          longitude: dto.longitude ?? null,
        },
        include: {
          author: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              role: true,
              staffTitle: true,
            },
          },
          reactions: true,
          _count: {
            select: {
              comments: true,
              reactions: true,
            },
          },
        },
      });

      let incidentReport: any = null;
      if (postType === PostType.INCIDENT) {
        const year = new Date().getFullYear();
        const suffix = Math.floor(1000 + Math.random() * 9000);
        const code = `PA-${year}-${suffix}`;

        incidentReport = await tx.report.create({
          data: {
            code,
            postId: post.id,
            neighborhoodId: user.neighborhoodId,
            reporterId: user.userId,
            category: dto.incidentCategory ?? ReportCategory.OTHER,
            priority: dto.incidentPriority ?? ReportPriority.NORMAL,
            visibility: dto.incidentVisibility ?? ReportVisibility.PUBLIC,
            title: dto.title?.trim() || dto.content.trim().slice(0, 120),
            description: dto.content.trim(),
            status: ReportStatus.NEW,
            latitude: dto.latitude ?? null,
            longitude: dto.longitude ?? null,
            addressText: dto.locationName?.trim() || null,
          },
          include: {
            assignedTo: {
              select: { id: true, fullName: true, staffTitle: true },
            },
          },
        });

        await tx.reportStatusHistory.create({
          data: {
            reportId: incidentReport.id,
            changedById: user.userId,
            fromStatus: ReportStatus.NEW,
            toStatus: ReportStatus.NEW,
            note: 'Cư dân gửi phản ánh sự cố mới',
          },
        });

        // Notify neighborhood officers
        const officers = await tx.user.findMany({
          where: {
            neighborhoodId: user.neighborhoodId,
            role: { in: [UserRole.LEADER, UserRole.STAFF, UserRole.SUPER_ADMIN] },
            status: 'ACTIVE',
            id: { not: user.userId },
          },
          select: { id: true },
        });

        if (officers.length > 0) {
          await tx.notification.createMany({
            data: officers.map((off) => ({
              userId: off.id,
              type: 'INCIDENT_CREATED',
              title: `Phản ánh mới [${code}]`,
              body: incidentReport.title,
              referenceId: incidentReport.id,
            })),
          });
        }
      }

      if (dto.mediaUrls?.length) {
        await tx.attachment.createMany({
          data: dto.mediaUrls.map((url) => ({
            uploaderId: user.userId,
            entityType: AttachmentEntityType.POST,
            entityId: post.id,
            url,
            mimeType: 'image/jpeg',
            fileSize: 0,
          })),
        });
      }

      const attachments = dto.mediaUrls?.length
        ? await tx.attachment.findMany({
            where: { entityType: AttachmentEntityType.POST, entityId: post.id },
          })
        : [];

      return { post: { ...post, incidentReport }, attachments };
    });

    const formatted = this.formatPost(result.post, result.attachments, user);

    this.feedGateway.emitFeedEvent(
      user.neighborhoodId,
      'post.created',
      formatted,
      { isPrivate: isPrivateIncident, ownerId: user.userId },
    );

    if (postType === PostType.INCIDENT && result.post.incidentReport) {
      this.feedGateway.emitFeedEvent(
        user.neighborhoodId,
        'incident.created',
        result.post.incidentReport,
        { isPrivate: isPrivateIncident, ownerId: user.userId },
      );
    }

    return formatted;
  }

  async updatePost(postId: string, dto: UpdatePostDto, user: RequestUserContext) {
    const post = await this.ensurePostInNeighborhood(postId, user.neighborhoodId);

    if (post.authorId !== user.userId) {
      throw new ForbiddenException(
        'Chỉ tác giả mới được chỉnh sửa nội dung gốc của bài viết',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.postEditHistory.create({
        data: {
          postId: post.id,
          editorId: user.userId,
          oldTitle: post.title,
          oldContent: post.content,
          newTitle: dto.title !== undefined ? dto.title.trim() || null : post.title,
          newContent: dto.content.trim(),
        },
      });

      const nextPost = await tx.post.update({
        where: { id: postId },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() || null } : {}),
          content: dto.content.trim(),
          ...(dto.locationName !== undefined
            ? { locationName: dto.locationName.trim() || null }
            : {}),
        },
        include: {
          author: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              role: true,
              staffTitle: true,
            },
          },
          reactions: { select: { userId: true, type: true } },
          incidentReport: {
            include: {
              assignedTo: { select: { id: true, fullName: true, staffTitle: true } },
            },
          },
          _count: { select: { comments: true, reactions: true } },
        },
      });

      return nextPost;
    });

    const attachments = await this.prisma.attachment.findMany({
      where: { entityType: AttachmentEntityType.POST, entityId: postId },
    });

    const formatted = this.formatPost(updated, attachments, user);
    this.feedGateway.emitFeedEvent(
      user.neighborhoodId,
      'post.updated',
      formatted,
      { isPrivate: updated.visibility === PostVisibility.PRIVATE, ownerId: updated.authorId },
    );

    return formatted;
  }

  async toggleReaction(
    postId: string,
    dto: ToggleReactionDto,
    user: RequestUserContext,
  ) {
    const post = await this.ensurePostInNeighborhood(postId, user.neighborhoodId);
    this.assertCanViewPost(post, user);

    const existing = await this.prisma.reaction.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: user.userId,
        },
      },
    });

    let activeType: string | null = dto.type;
    if (existing) {
      if (existing.type === dto.type) {
        await this.prisma.reaction.delete({ where: { id: existing.id } });
        activeType = null;
      } else {
        await this.prisma.reaction.update({
          where: { id: existing.id },
          data: { type: dto.type },
        });
      }
    } else {
      await this.prisma.reaction.create({
        data: {
          postId,
          userId: user.userId,
          type: dto.type,
        },
      });
    }

    this.feedGateway.emitFeedEvent(
      user.neighborhoodId,
      'post.liked',
      { postId, userId: user.userId, type: activeType },
      { isPrivate: post.visibility === PostVisibility.PRIVATE, ownerId: post.authorId },
    );

    if (activeType !== null && post.authorId !== user.userId) {
      const actor = await this.prisma.user.findUnique({
        where: { id: user.userId },
        select: { fullName: true },
      });
      const notif = await this.prisma.notification.create({
        data: {
          userId: post.authorId,
          type: 'POST_LIKED',
          title: `${actor?.fullName || 'Một cư dân'} đã thích bài viết của bạn`,
          body: (post.title || post.content).slice(0, 100),
          referenceId: post.id,
        },
      });
      this.feedGateway.emitToUser(post.authorId, 'notification.new', notif);
    }

    return { postId, active: activeType !== null, type: activeType };
  }

  async addComment(
    postId: string,
    dto: CreateCommentDto,
    user: RequestUserContext,
  ) {
    const post = await this.ensurePostInNeighborhood(postId, user.neighborhoodId);
    this.assertCanViewPost(post, user);

    if (dto.parentId) {
      const parent = await this.prisma.comment.findFirst({
        where: { id: dto.parentId, postId, deletedAt: null },
      });
      if (!parent) {
        throw new NotFoundException('Không tìm thấy bình luận gốc để trả lời');
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        postId,
        authorId: user.userId,
        parentId: dto.parentId ?? null,
        content: dto.content.trim(),
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            role: true,
            staffTitle: true,
          },
        },
      },
    });

    this.feedGateway.emitFeedEvent(
      user.neighborhoodId,
      'post.commented',
      { postId, comment },
      { isPrivate: post.visibility === PostVisibility.PRIVATE, ownerId: post.authorId },
    );

    if (post.authorId !== user.userId) {
      const notif = await this.prisma.notification.create({
        data: {
          userId: post.authorId,
          type: 'POST_COMMENTED',
          title: `${comment.author.fullName} đã bình luận bài viết của bạn`,
          body: comment.content.slice(0, 100),
          referenceId: post.id,
        },
      });
      this.feedGateway.emitToUser(post.authorId, 'notification.new', notif);
    }

    return comment;
  }

  async reportPost(postId: string, dto: ReportPostDto, user: RequestUserContext) {
    const post = await this.ensurePostInNeighborhood(postId, user.neighborhoodId);
    this.assertCanViewPost(post, user);

    const existing = await this.prisma.postReport.findUnique({
      where: {
        postId_reporterId: { postId, reporterId: user.userId },
      },
    });

    if (existing) {
      return this.prisma.postReport.update({
        where: { id: existing.id },
        data: { reason: dto.reason.trim() },
      });
    }

    return this.prisma.postReport.create({
      data: {
        postId,
        reporterId: user.userId,
        reason: dto.reason.trim(),
      },
    });
  }

  async togglePin(postId: string, user: RequestUserContext) {
    if (!this.isLeader(user.role)) {
      throw new ForbiddenException('Chỉ Tổ trưởng hoặc Quản trị viên mới có quyền ghim bài');
    }

    const post = await this.ensurePostInNeighborhood(postId, user.neighborhoodId);
    if (post.visibility === PostVisibility.PRIVATE) {
      throw new BadRequestException('Không thể ghim bài viết riêng tư lên bảng tin');
    }

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: { isPinned: !post.isPinned },
    });

    this.feedGateway.emitFeedEvent(user.neighborhoodId, 'post.updated', {
      id: updated.id,
      isPinned: updated.isPinned,
    });

    return updated;
  }

  async deletePost(postId: string, user: RequestUserContext) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, neighborhoodId: user.neighborhoodId, deletedAt: null },
      include: { incidentReport: true },
    });
    if (!post) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    const canDelete = this.isLeader(user.role) || post.authorId === user.userId;
    if (!canDelete) {
      throw new ForbiddenException('Bạn không có quyền xóa bài viết này');
    }

    if (
      post.incidentReport &&
      (post.incidentReport.status === ReportStatus.ACCEPTED ||
        post.incidentReport.status === ReportStatus.IN_PROGRESS)
    ) {
      throw new ForbiddenException(
        'Không thể xóa bài viết khi phản ánh sự cố đang được xử lý',
      );
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });

    this.feedGateway.emitFeedEvent(
      user.neighborhoodId,
      'post.deleted',
      { id: postId },
      { isPrivate: post.visibility === PostVisibility.PRIVATE, ownerId: post.authorId },
    );

    return { id: postId, deleted: true };
  }

  private async ensurePostInNeighborhood(postId: string, neighborhoodId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, neighborhoodId, deletedAt: null },
    });
    if (!post) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }
    return post;
  }

  private assertCanViewPost(post: { visibility: string; authorId: string }, user: RequestUserContext) {
    if (post.visibility === PostVisibility.OFFICERS_ONLY && !this.isOfficer(user.role)) {
      throw new ForbiddenException('Bạn không có quyền xem bài viết nội bộ này');
    }
    if (
      post.visibility === PostVisibility.PRIVATE &&
      post.authorId !== user.userId &&
      !this.isOfficer(user.role)
    ) {
      throw new ForbiddenException('Bạn không có quyền xem bài viết riêng tư này');
    }
  }

  private formatPost(post: any, attachments: any[], user: RequestUserContext) {
    const reactionBreakdown: Record<ReactionType, number> = {
      LIKE: 0,
      HEART: 0,
      CLAP: 0,
    };
    let userReaction: ReactionType | null = null;

    for (const r of post.reactions ?? []) {
      const type = r.type as ReactionType;
      if (reactionBreakdown[type] !== undefined) {
        reactionBreakdown[type] += 1;
      }
      if (r.userId === user.userId) {
        userReaction = type;
      }
    }

    const hidePrivateLocation =
      post.visibility === PostVisibility.PRIVATE &&
      post.authorId !== user.userId &&
      !this.isOfficer(user.role);

    return {
      id: post.id,
      neighborhoodId: post.neighborhoodId,
      authorId: post.authorId,
      author: post.author,
      type: post.type,
      category: post.category,
      visibility: post.visibility,
      title: post.title,
      content: post.content,
      isPinned: post.isPinned,
      isOfficial: post.isOfficial,
      locationName: hidePrivateLocation ? null : post.locationName,
      latitude: hidePrivateLocation ? null : post.latitude,
      longitude: hidePrivateLocation ? null : post.longitude,
      media: hidePrivateLocation
        ? []
        : attachments.map((a) => ({
            id: a.id,
            url: a.url,
            mimeType: a.mimeType,
            fileName: a.fileName,
          })),
      reactionCount: post._count?.reactions ?? 0,
      commentCount: post._count?.comments ?? 0,
      userReaction,
      reactionBreakdown,
      incidentReport: post.incidentReport ?? null,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }

  private isOfficer(role: UserRole): boolean {
    return (
      role === UserRole.SUPER_ADMIN ||
      role === UserRole.LEADER ||
      role === UserRole.STAFF
    );
  }

  private isLeader(role: UserRole): boolean {
    return role === UserRole.SUPER_ADMIN || role === UserRole.LEADER;
  }
}
