import { PostCategory, PostVisibility, UserRole } from './index';

export type ReactionType = 'LIKE' | 'HEART' | 'CLAP';

export type FeedFilterType = 'ALL' | 'OFFICIAL' | 'LIFE' | 'WARNING' | 'PINNED';

export interface PostAuthor {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  role: UserRole;
  staffTitle?: string | null;
}

export interface PostMediaItem {
  id: string;
  url: string;
  mimeType: string;
  fileName?: string | null;
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  parentId?: string | null;
  author: PostAuthor;
  content: string;
  createdAt: string;
}

export interface PostItem {
  id: string;
  neighborhoodId: string;
  authorId: string;
  author: PostAuthor;
  category: PostCategory;
  visibility: PostVisibility;
  title?: string | null;
  content: string;
  isPinned: boolean;
  isOfficial: boolean;
  locationName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  media: PostMediaItem[];
  reactionCount: number;
  commentCount: number;
  userReaction: ReactionType | null;
  reactionBreakdown: Record<ReactionType, number>;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostPayload {
  title?: string;
  content: string;
  category?: PostCategory;
  visibility?: PostVisibility;
  isOfficial?: boolean;
  isPinned?: boolean;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  mediaUrls?: string[];
}

export interface CreateCommentPayload {
  content: string;
  parentId?: string;
}

export interface ToggleReactionPayload {
  type: ReactionType;
}
