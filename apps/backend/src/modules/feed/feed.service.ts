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
  AiAssistDto,
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

  async aiAssist(dto: AiAssistDto) {
    const raw = (dto.prompt || '').trim();
    const hasImage = Boolean(dto.imageBase64?.trim());
    if (!raw && !hasImage) {
      throw new BadRequestException('Vui lòng nhập mô tả hoặc chọn ảnh để AI phân tích');
    }

    const q = raw.toLowerCase();
    const loc = dto.locationName?.trim() || 'khu vực trước nhà / ngõ dân cư';

    const geminiKey = process.env.GEMINI_API_KEY;
    const candidateModels = process.env.GEMINI_MODEL
      ? [process.env.GEMINI_MODEL]
      : ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.8-flash'];

    if (geminiKey) {
      const sysPrompt = hasImage
        ? `Bạn là Trợ lý AI phân tích ảnh hiện trường cho Tổ dân phố thông minh Việt Nam. Hãy quan sát RẤT KỸ từng chi tiết trong bức ảnh người dân vừa chụp${raw ? ` (ghi chú thêm: "${raw}")` : ''}. Địa điểm: "${loc}".
Hãy mô tả sát thực tế những gì thấy trong ảnh (vật thể, tình trạng hư hỏng/rác/ngập/chướng ngại, mức độ nguy hiểm cho người đi bộ/xe cộ, bối cảnh xung quanh) và trả về JSON thuần (không markdown) gồm:
- detectedIssues: mảng 3-4 vấn đề CỤ THỂ nhìn thấy trực tiếp trong ảnh (bằng tiếng Việt rõ ràng)
- suggestedTitle: tiêu đề ngắn <= 80 ký tự sát với ảnh
- suggestedContent: nội dung phản ánh hoặc bài viết lịch sự, rõ ràng <= 350 ký tự dựa trên đúng hình ảnh
- guidanceText: hướng dẫn ngắn 1-2 câu chỉ ra điểm cần lưu ý thêm khi gửi phản ánh này
- missingInfoChecklist: mảng 2-3 thông tin ảnh chưa thể hiện rõ (VD: số nhà cụ thể, thời gian phát hiện, kích thước ước lượng)
- recommendedCategory: một trong INFRASTRUCTURE|LIGHTING|SANITATION|SECURITY|OTHER
- recommendedPriority: một trong NORMAL|HIGH|URGENT`
        : `Bạn là Trợ lý AI của ứng dụng Tổ dân phố thông minh Việt Nam. Người dân hỏi hoặc mô tả ngắn: "${raw}". Địa điểm hiện tại: "${loc}". Đã có ảnh: ${dto.hasPhoto ? 'Có' : 'Chưa'}. Hãy trả về JSON thuần (không markdown) gồm: detectedIssues (mảng rỗng []), suggestedTitle (tiêu đề ngắn <= 80 ký tự), suggestedContent (nội dung bài viết/phản ánh lịch sự, rõ ràng <= 350 ký tự), guidanceText (hướng dẫn ngắn gọn 1-2 câu), missingInfoChecklist (mảng 3 gợi ý thông tin nên bổ sung), recommendedCategory (INFRASTRUCTURE|LIGHTING|SANITATION|SECURITY|OTHER), recommendedPriority (NORMAL|HIGH|URGENT).`;

      const parts: any[] = [{ text: sysPrompt }];
      if (hasImage && dto.imageBase64) {
        parts.push({
          inlineData: {
            mimeType: dto.mimeType || 'image/jpeg',
            data: dto.imageBase64.replace(/^data:image\/\w+;base64,/, ''),
          },
        });
      }

      for (const model of candidateModels) {
        try {
          const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': geminiKey,
              },
              body: JSON.stringify({
                contents: [{ parts }],
                generationConfig: { responseMimeType: 'application/json' },
              }),
              signal: AbortSignal.timeout(hasImage ? 12000 : 6000),
            },
          );
          if (resp.ok) {
            const json: any = await resp.json();
            const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              return JSON.parse(text);
            }
          }
        } catch {
          // Try next model or fallback to built-in Vietnamese assistant
        }
      }
    }

    const checklist: string[] = [];
    if (!dto.locationName) {
      checklist.push('Ghim vị trí cụ thể hoặc ghi rõ số nhà / đầu ngõ gần nhất');
    }
    if (!dto.hasPhoto && !hasImage) {
      checklist.push('Chụp thêm 1-2 ảnh rõ hiện trường (góc gần và góc rộng)');
    }

    if (hasImage && !raw) {
      return {
        detectedIssues: [
          'Đã ghi nhận ảnh hiện trường đính kèm',
          'Cần bổ sung mô tả ngắn về tình trạng thực tế trong ảnh',
          'Xác định mức độ ảnh hưởng đến đi lại hoặc sinh hoạt xung quanh',
        ],
        suggestedTitle: 'Phản ánh tình trạng hiện trường tại khu dân cư',
        suggestedContent: `Kính gửi Ban điều hành Tổ dân phố, tôi xin gửi hình ảnh hiện trường ghi nhận tại ${loc}. Kính nhờ Ban điều hành kiểm tra thực tế và hỗ trợ xử lý sớm để đảm bảo an toàn, mỹ quan cho bà con trong tổ.`,
        guidanceText:
          'Bạn hãy bổ sung 1 câu mô tả điều gì đang xảy ra trong ảnh (ví dụ: hỏng hóc, rác thải, đèn tắt...) để cán bộ tiếp nhận xử lý nhanh nhất.',
        missingInfoChecklist: [
          ...checklist,
          'Ghi rõ tình trạng cụ thể trong ảnh đã kéo dài bao lâu',
        ],
        recommendedCategory: ReportCategory.INFRASTRUCTURE,
        recommendedPriority: ReportPriority.NORMAL,
      };
    }

    const rules: Array<{
      match: RegExp;
      category: ReportCategory;
      priority: ReportPriority;
      title: string;
      content: string;
      guidance: string;
      extraChecks: string[];
    }> = [
      {
        match: /ổ gà|sụt lún|nứt|hố ga|mặt đường|vỉa hè|nắp cống|đường/,
        category: ReportCategory.INFRASTRUCTURE,
        priority: ReportPriority.HIGH,
        title: 'Phản ánh mặt đường xuống cấp / ổ gà gây mất an toàn',
        content: `Kính gửi Ban điều hành Tổ dân phố, hiện tại đoạn đường tại ${loc} xuất hiện tình trạng ổ gà / hư hỏng mặt đường gây nguy hiểm cho người đi lại, đặc biệt vào buổi tối hoặc trời mưa. Kính nhờ Ban điều hành kiểm tra và có phương án khắc phục sớm để đảm bảo an toàn cho bà con.`,
        guidance:
          'Để Ban điều hành xử lý nhanh, bạn nên nêu rõ kích thước ước lượng (rộng/sâu), vị trí sát số nhà nào và mức độ cản trở xe cộ.',
        extraChecks: ['Ước lượng độ rộng/sâu và tình trạng đọng nước hoặc mất nắp cống'],
      },
      {
        match: /đèn|chiếu sáng|tối|cháy bóng|cột điện|dây điện/,
        category: ReportCategory.LIGHTING,
        priority: ReportPriority.HIGH,
        title: 'Đề nghị kiểm tra đèn chiếu sáng công cộng bị tắt',
        content: `Kính gửi Ban điều hành Tổ dân phố, hệ thống đèn chiếu sáng tại ${loc} hiện đang không sáng vào ban đêm, làm khu vực bị tối và tiềm ẩn nguy cơ mất an toàn giao thông, an ninh trật tự. Kính nhờ Tổ trưởng báo đơn vị kỹ thuật kiểm tra và thay thế sớm.`,
        guidance:
          'Bạn nên ghi rõ số trụ đèn (nếu có) hoặc mô tả khoảng cột đèn từ số nhà nào đến số nhà nào.',
        extraChecks: ['Ghi rõ thời gian đèn bắt đầu hỏng (bao nhiêu ngày) và số trụ đèn'],
      },
      {
        match: /rác|vệ sinh|mùi hôi|cống|ngập|thoát nước|muỗi/,
        category: ReportCategory.SANITATION,
        priority: ReportPriority.NORMAL,
        title: 'Phản ánh tồn đọng rác thải / vệ sinh môi trường',
        content: `Kính gửi Ban điều hành Tổ dân phố, tại khu vực ${loc} đang có tình trạng rác thải tồn đọng / ứ đọng nước gây mùi hôi và ảnh hưởng mỹ quan khu dân cư. Rất mong Ban điều hành phối hợp đơn vị thu gom xử lý kịp thời.`,
        guidance:
          'Nêu rõ tình trạng kéo dài mấy ngày và ảnh hưởng đến hộ dân xung quanh như thế nào.',
        extraChecks: ['Cho biết rác/nước thải đã tồn đọng bao lâu và có bốc mùi hay không'],
      },
      {
        match: /an ninh|trộm|khả nghi|ồn ào|karaoke|cãi vã|đánh nhau|xe đỗ/,
        category: ReportCategory.SECURITY,
        priority: ReportPriority.URGENT,
        title: 'Phản ánh tình hình an ninh trật tự khu dân cư',
        content: `Kính gửi Ban điều hành và Cảnh sát khu vực, tại ${loc} vừa ghi nhận tình huống ảnh hưởng đến an ninh trật tự / sinh hoạt chung của bà con. Kính mong Tổ bảo vệ và Cảnh sát khu vực kiểm tra, nhắc nhở kịp thời để giữ gìn bình yên cho khu phố.`,
        guidance:
          'Với vấn đề an ninh, bạn nên bật "Gửi phản ánh riêng tư" nếu cần bảo mật danh tính và ghi rõ khung giờ xảy ra.',
        extraChecks: ['Ghi rõ thời điểm xảy ra sự việc và cân nhắc chế độ Gửi riêng tư'],
      },
    ];

    const matched = rules.find((r) => r.match.test(q));
    if (matched) {
      return {
        suggestedTitle: matched.title,
        suggestedContent: matched.content,
        guidanceText: matched.guidance,
        missingInfoChecklist: [...checklist, ...matched.extraChecks],
        recommendedCategory: matched.category,
        recommendedPriority: matched.priority,
      };
    }

    const cleanTopic = raw.replace(/\?+$/, '').trim();
    const isQuestion = /thế nào|làm sao|cách nào|nên viết|hướng dẫn|\?/.test(q);
    return {
      suggestedTitle: isQuestion
        ? 'Phản ánh / Chia sẻ vấn đề tại khu dân cư'
        : cleanTopic.slice(0, 80),
      suggestedContent: dto.isReportMode
        ? `Kính gửi Ban điều hành Tổ dân phố, tôi xin phản ánh sự việc tại ${loc}: ${cleanTopic}. Kính mong Ban điều hành xem xét và hỗ trợ xử lý sớm để đảm bảo sinh hoạt chung của bà con.`
        : `Xin chào bà con Tổ dân phố, mình xin chia sẻ thông tin tại ${loc}: ${cleanTopic}. Mong mọi người cùng lưu ý và trao đổi thêm nhé!`,
      guidanceText:
        'Bài viết rõ ràng nên gồm 3 ý: (1) Sự việc gì, (2) Ở đâu & lúc nào, (3) Đề xuất mong muốn xử lý.',
      missingInfoChecklist: [
        ...checklist,
        'Nêu rõ thời gian phát hiện sự việc hoặc mong muốn hỗ trợ cụ thể',
      ],
      recommendedCategory: ReportCategory.OTHER,
      recommendedPriority: ReportPriority.NORMAL,
    };
  }
}
