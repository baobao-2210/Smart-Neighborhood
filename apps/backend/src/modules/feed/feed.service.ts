import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateCommentDto,
  CreatePostDto,
  FeedQueryDto,
  ToggleReactionDto,
} from './dto/feed.dto';
import {
  AttachmentEntityType,
  PostCategory,
  PostVisibility,
  UserRole,
} from '@todanpho/shared';

export interface RequestUserContext {
  userId: string;
  neighborhoodId: string;
  role: UserRole;
}

@Injectable()
export class FeedService {
  constructor(private readonly prisma: PrismaService) {}

  async getPosts(query: FeedQueryDto, user: RequestUserContext) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {
      neighborhoodId: user.neighborhoodId,
      deletedAt: null,
    };

    if (!this.isOfficer(user.role)) {
      where.visibility = PostVisibility.PUBLIC;
    }

    if (query.filter === 'OFFICIAL') {
      where.isOfficial = true;
    } else if (query.filter === 'LIFE') {
      where.category = PostCategory.LIFE;
    } else if (query.filter === 'WARNING') {
      where.category = PostCategory.WARNING;
    } else if (query.filter === 'PINNED') {
      where.isPinned = true;
    }

    if (query.search?.trim()) {
      where.OR = [
        { content: { contains: query.search.trim(), mode: 'insensitive' } },
        { title: { contains: query.search.trim(), mode: 'insensitive' } },
        {
          author: {
            fullName: { contains: query.search.trim(), mode: 'insensitive' },
          },
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
      this.formatPost(post, attachmentMap.get(post.id) ?? [], user.userId),
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

    if (
      post.visibility === PostVisibility.OFFICERS_ONLY &&
      !this.isOfficer(user.role)
    ) {
      throw new ForbiddenException('Bạn không có quyền xem bài viết nội bộ này');
    }

    const attachments = await this.prisma.attachment.findMany({
      where: {
        entityType: AttachmentEntityType.POST,
        entityId: post.id,
      },
    });

    return {
      ...this.formatPost(post, attachments, user.userId),
      comments: post.comments,
    };
  }

  async createPost(dto: CreatePostDto, user: RequestUserContext) {
    const officer = this.isOfficer(user.role);
    const leader = this.isLeader(user.role);

    const post = await this.prisma.post.create({
      data: {
        neighborhoodId: user.neighborhoodId,
        authorId: user.userId,
        title: dto.title?.trim(),
        content: dto.content.trim(),
        category: dto.category ?? PostCategory.LIFE,
        visibility: officer
          ? (dto.visibility ?? PostVisibility.PUBLIC)
          : PostVisibility.PUBLIC,
        isOfficial: officer ? Boolean(dto.isOfficial) : false,
        isPinned: leader ? Boolean(dto.isPinned) : false,
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

    let attachments: any[] = [];
    if (dto.mediaUrls?.length) {
      await this.prisma.attachment.createMany({
        data: dto.mediaUrls.map((url) => ({
          uploaderId: user.userId,
          entityType: AttachmentEntityType.POST,
          entityId: post.id,
          url,
          mimeType: 'image/jpeg',
          fileSize: 0,
        })),
      });
      attachments = await this.prisma.attachment.findMany({
        where: { entityType: AttachmentEntityType.POST, entityId: post.id },
      });
    }

    return this.formatPost(post, attachments, user.userId);
  }

  async toggleReaction(
    postId: string,
    dto: ToggleReactionDto,
    user: RequestUserContext,
  ) {
    await this.ensurePostInNeighborhood(postId, user.neighborhoodId);

    const existing = await this.prisma.reaction.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: user.userId,
        },
      },
    });

    if (existing) {
      if (existing.type === dto.type) {
        await this.prisma.reaction.delete({
          where: { id: existing.id },
        });
        return { action: 'removed', type: null };
      } else {
        await this.prisma.reaction.update({
          where: { id: existing.id },
          data: { type: dto.type },
        });
        return { action: 'updated', type: dto.type };
      }
    }

    await this.prisma.reaction.create({
      data: {
        postId,
        userId: user.userId,
        type: dto.type,
      },
    });

    return { action: 'added', type: dto.type };
  }

  async addComment(
    postId: string,
    dto: CreateCommentDto,
    user: RequestUserContext,
  ) {
    await this.ensurePostInNeighborhood(postId, user.neighborhoodId);

    return this.prisma.comment.create({
      data: {
        postId,
        authorId: user.userId,
        parentId: dto.parentId,
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
  }

  async togglePin(postId: string, user: RequestUserContext) {
    if (!this.isLeader(user.role)) {
      throw new ForbiddenException('Chỉ Tổ trưởng hoặc Super Admin mới có quyền ghim bài');
    }

    const post = await this.ensurePostInNeighborhood(postId, user.neighborhoodId);

    return this.prisma.post.update({
      where: { id: postId },
      data: { isPinned: !post.isPinned },
    });
  }

  async deletePost(postId: string, user: RequestUserContext) {
    const post = await this.ensurePostInNeighborhood(postId, user.neighborhoodId);

    if (post.authorId !== user.userId && !this.isLeader(user.role)) {
      throw new ForbiddenException('Bạn không có quyền xóa bài viết này');
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });
    return { deleted: true, id: postId };
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

  private isLeader(role: UserRole): boolean {
    return role === UserRole.LEADER || role === UserRole.SUPER_ADMIN;
  }

  private isOfficer(role: UserRole): boolean {
    return (
      role === UserRole.LEADER ||
      role === UserRole.STAFF ||
      role === UserRole.SUPER_ADMIN
    );
  }

  private formatPost(post: any, media: any[], currentUserId: string) {
    const breakdown = { LIKE: 0, HEART: 0, CLAP: 0 };
    let userReaction: string | null = null;

    for (const r of post.reactions ?? []) {
      if (r.type in breakdown) {
        breakdown[r.type as keyof typeof breakdown] += 1;
      }
      if (r.userId === currentUserId) {
        userReaction = r.type;
      }
    }

    return {
      id: post.id,
      neighborhoodId: post.neighborhoodId,
      authorId: post.authorId,
      author: post.author,
      category: post.category,
      visibility: post.visibility,
      title: post.title,
      content: post.content,
      isPinned: post.isPinned,
      isOfficial: post.isOfficial,
      media: media.map((m) => ({
        id: m.id,
        url: m.url,
        mimeType: m.mimeType,
        fileName: m.fileName,
      })),
      reactionCount: post._count?.reactions ?? 0,
      commentCount: post._count?.comments ?? 0,
      userReaction,
      reactionBreakdown: breakdown,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }
}
