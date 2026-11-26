import {
  PostCategory,
  PostType,
  PostVisibility,
  ReportCategory,
  ReportPriority,
  ReportStatus,
  ReportVisibility,
  UserRole,
} from './index';

export type ReactionType = 'LIKE' | 'HEART' | 'CLAP';

export type FeedFilterType = 'ALL' | 'OFFICIAL' | 'LIFE' | 'WARNING' | 'INCIDENT' | 'PINNED';

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

export interface IncidentHistoryItem {
  id: string;
  fromStatus: ReportStatus;
  toStatus: ReportStatus;
  note?: string | null;
  createdAt: string;
  changedBy: {
    id: string;
    fullName: string;
    role: UserRole;
  };
}

export interface IncidentSummary {
  id: string;
  code?: string | null;
  category: ReportCategory;
  priority: ReportPriority;
  visibility: ReportVisibility;
  status: ReportStatus;
  assignedTo?: {
    id: string;
    fullName: string;
    staffTitle?: string | null;
  } | null;
  statusHistory?: IncidentHistoryItem[];
}

export interface PostEditHistoryItem {
  id: string;
  oldTitle?: string | null;
  oldContent: string;
  newTitle?: string | null;
  newContent: string;
  createdAt: string;
  editor: {
    id: string;
    fullName: string;
  };
}

export interface PostItem {
  id: string;
  neighborhoodId: string;
  authorId: string;
  author: PostAuthor;
  type?: PostType;
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
  incidentReport?: IncidentSummary | null;
  editHistories?: PostEditHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostPayload {
  type?: PostType;
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
  incidentCategory?: ReportCategory;
  incidentPriority?: ReportPriority;
  incidentVisibility?: ReportVisibility;
}

export interface UpdatePostPayload {
  title?: string;
  content: string;
  locationName?: string;
}

export interface CreateCommentPayload {
  content: string;
  parentId?: string;
}

export interface ToggleReactionPayload {
  type: ReactionType;
}

export interface ReportPostPayload {
  reason: string;
}
