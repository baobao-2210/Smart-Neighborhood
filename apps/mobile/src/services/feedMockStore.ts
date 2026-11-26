import {
  CreateCommentPayload,
  CreatePostPayload,
  FeedFilterType,
  PostCategory,
  PostComment,
  PostItem,
  PostVisibility,
  ReactionType,
  UserRole,
} from '@todanpho/shared';
import { AuthUser } from '@/store/useAuthStore';

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3600 * 1000).toISOString();

let mockPosts: PostItem[] = [
  {
    id: 'post-01',
    neighborhoodId: 'tdp-05-p12',
    authorId: 'user-leader-01',
    author: {
      id: 'user-leader-01',
      fullName: 'Trần Thị Minh',
      role: UserRole.LEADER,
      staffTitle: 'Tổ trưởng',
    },
    category: PostCategory.EVENT_RECAP,
    visibility: PostVisibility.PUBLIC,
    title: 'Phát động Ngày Chủ Nhật Xanh',
    content:
      'Kính gửi toàn thể bà con Tổ dân phố số 5!\n\nSáng Chủ Nhật tuần này (07h00), Ban điều hành tổ phát động buổi Tổng vệ sinh môi trường "Ngày Chủ Nhật Xanh" tại các tuyến ngõ 12, 14 và khu vực Nhà văn hóa. Đề nghị mỗi hộ gia đình cử 01 đại diện tham gia phát quang bụi rậm, khơi thông cống rãnh phòng chống sốt xuất huyết.',
    isPinned: true,
    isOfficial: true,
    media: [
      {
        id: 'media-01',
        url: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80',
        mimeType: 'image/jpeg',
      },
    ],
    reactionCount: 28,
    commentCount: 2,
    userReaction: 'HEART',
    reactionBreakdown: { LIKE: 12, HEART: 10, CLAP: 6 },
    createdAt: hoursAgo(2),
    updatedAt: hoursAgo(2),
  },
  {
    id: 'post-02',
    neighborhoodId: 'tdp-05-p12',
    authorId: 'user-staff-01',
    author: {
      id: 'user-staff-01',
      fullName: 'Đại úy Vũ Đức Thắng',
      role: UserRole.STAFF,
      staffTitle: 'Cảnh sát khu vực',
    },
    category: PostCategory.WARNING,
    visibility: PostVisibility.PUBLIC,
    title: 'Cảnh báo lừa đảo giả danh VNeID',
    content:
      'CẢNH BÁO AN NINH: Hiện nay xuất hiện một số đối tượng giả danh cán bộ công an gọi điện yêu cầu cập nhật định danh VNeID qua đường link lạ. Bà con tuyệt đối KHÔNG bấm vào link lạ, KHÔNG cung cấp mã OTP hay mật khẩu ngân hàng.',
    isPinned: false,
    isOfficial: true,
    media: [],
    reactionCount: 41,
    commentCount: 1,
    userReaction: null,
    reactionBreakdown: { LIKE: 25, HEART: 4, CLAP: 12 },
    createdAt: hoursAgo(6),
    updatedAt: hoursAgo(6),
  },
  {
    id: 'post-03',
    neighborhoodId: 'tdp-05-p12',
    authorId: 'user-resident-02',
    author: {
      id: 'user-resident-02',
      fullName: 'Cô Lê Thị Lan (Ngõ 14)',
      role: UserRole.RESIDENT,
    },
    category: PostCategory.LIFE,
    visibility: PostVisibility.PUBLIC,
    content:
      'Nhà mình mới thu hoạch ít rau sạch trồng trên sân thượng, có dư vài bó rau muống và mồng tơi. Cô bác nào ở gần số nhà 18 ngõ 14 cần nấu canh thì ghé lấy giúp nhé, hoàn toàn miễn phí ạ!',
    isPinned: false,
    isOfficial: false,
    media: [
      {
        id: 'media-02',
        url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&q=80',
        mimeType: 'image/jpeg',
      },
    ],
    reactionCount: 19,
    commentCount: 1,
    userReaction: 'LIKE',
    reactionBreakdown: { LIKE: 8, HEART: 9, CLAP: 2 },
    createdAt: hoursAgo(14),
    updatedAt: hoursAgo(14),
  },
];

const mockComments: Record<string, PostComment[]> = {
  'post-01': [
    {
      id: 'cmt-01',
      postId: 'post-01',
      authorId: 'user-resident-01',
      author: {
        id: 'user-resident-01',
        fullName: 'Nguyễn Văn An',
        role: UserRole.RESIDENT,
      },
      content: 'Gia đình số nhà 24 ngõ 12 xin đăng ký 2 người tham gia ạ.',
      createdAt: hoursAgo(1.5),
    },
    {
      id: 'cmt-02',
      postId: 'post-01',
      authorId: 'user-staff-01',
      author: {
        id: 'user-staff-01',
        fullName: 'Đại úy Vũ Đức Thắng',
        role: UserRole.STAFF,
        staffTitle: 'Cảnh sát khu vực',
      },
      content: 'Ban điều hành đã chuẩn bị sẵn chổi, bao tải và nước uống tại đầu ngõ 12.',
      createdAt: hoursAgo(1),
    },
  ],
  'post-02': [
    {
      id: 'cmt-03',
      postId: 'post-02',
      authorId: 'user-resident-02',
      author: {
        id: 'user-resident-02',
        fullName: 'Cô Lê Thị Lan (Ngõ 14)',
        role: UserRole.RESIDENT,
      },
      content: 'Cảm ơn đồng chí Thắng đã cảnh báo kịp thời để các bác lớn tuổi cảnh giác.',
      createdAt: hoursAgo(5),
    },
  ],
  'post-03': [
    {
      id: 'cmt-04',
      postId: 'post-03',
      authorId: 'user-resident-01',
      author: {
        id: 'user-resident-01',
        fullName: 'Nguyễn Văn An',
        role: UserRole.RESIDENT,
      },
      content: 'Tình làng nghĩa xóm ấm áp quá cô Lan ơi!',
      createdAt: hoursAgo(12),
    },
  ],
};

export const feedMockStore = {
  getPosts(filter: FeedFilterType, search?: string): PostItem[] {
    let list = [...mockPosts];

    if (filter === 'OFFICIAL') list = list.filter((p) => p.isOfficial);
    else if (filter === 'LIFE') list = list.filter((p) => p.category === PostCategory.LIFE);
    else if (filter === 'WARNING') list = list.filter((p) => p.category === PostCategory.WARNING);
    else if (filter === 'PINNED') list = list.filter((p) => p.isPinned);

    if (search?.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.content.toLowerCase().includes(q) ||
          (p.title?.toLowerCase().includes(q) ?? false) ||
          p.author.fullName.toLowerCase().includes(q),
      );
    }

    return list.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  },

  getPostById(id: string): (PostItem & { comments: PostComment[] }) | null {
    const post = mockPosts.find((p) => p.id === id);
    if (!post) return null;
    return {
      ...post,
      comments: mockComments[id] ?? [],
    };
  },

  createPost(payload: CreatePostPayload, user: AuthUser): PostItem {
    const newPost: PostItem = {
      id: `post-${Date.now()}`,
      neighborhoodId: user.neighborhoodId,
      authorId: user.id,
      author: {
        id: user.id,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        staffTitle: user.staffTitle,
      },
      category: payload.category ?? PostCategory.LIFE,
      visibility: payload.visibility ?? PostVisibility.PUBLIC,
      title: payload.title?.trim(),
      content: payload.content.trim(),
      isPinned: Boolean(payload.isPinned),
      isOfficial: Boolean(payload.isOfficial),
      media: (payload.mediaUrls ?? []).map((url, idx) => ({
        id: `media-${Date.now()}-${idx}`,
        url,
        mimeType: 'image/jpeg',
      })),
      reactionCount: 0,
      commentCount: 0,
      userReaction: null,
      reactionBreakdown: { LIKE: 0, HEART: 0, CLAP: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockPosts = [newPost, ...mockPosts];
    mockComments[newPost.id] = [];
    return newPost;
  },

  toggleReaction(postId: string, type: ReactionType) {
    mockPosts = mockPosts.map((post) => {
      if (post.id !== postId) return post;
      const breakdown = { ...post.reactionBreakdown };
      let nextReaction: ReactionType | null = type;
      let total = post.reactionCount;

      if (post.userReaction === type) {
        breakdown[type] = Math.max(0, breakdown[type] - 1);
        total = Math.max(0, total - 1);
        nextReaction = null;
      } else {
        if (post.userReaction) {
          breakdown[post.userReaction] = Math.max(0, breakdown[post.userReaction] - 1);
        } else {
          total += 1;
        }
        breakdown[type] = (breakdown[type] ?? 0) + 1;
      }

      return {
        ...post,
        userReaction: nextReaction,
        reactionCount: total,
        reactionBreakdown: breakdown,
      };
    });
  },

  addComment(postId: string, payload: CreateCommentPayload, user: AuthUser): PostComment {
    const comment: PostComment = {
      id: `cmt-${Date.now()}`,
      postId,
      authorId: user.id,
      parentId: payload.parentId,
      author: {
        id: user.id,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        staffTitle: user.staffTitle,
      },
      content: payload.content.trim(),
      createdAt: new Date().toISOString(),
    };

    mockComments[postId] = [...(mockComments[postId] ?? []), comment];
    mockPosts = mockPosts.map((p) =>
      p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p,
    );
    return comment;
  },

  togglePin(postId: string) {
    mockPosts = mockPosts.map((p) =>
      p.id === postId ? { ...p, isPinned: !p.isPinned } : p,
    );
  },

  deletePost(postId: string) {
    mockPosts = mockPosts.filter((p) => p.id !== postId);
    delete mockComments[postId];
  },
};
