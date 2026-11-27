import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import {
  CreateCommentPayload,
  CreatePostPayload,
  FeedFilterType,
  PostComment,
  PostItem,
  ReactionType,
  ReportPostPayload,
  UpdatePostPayload,
} from '@todanpho/shared';
import { API_BASE_URL, apiClient } from './apiClient';
import { useAuthStore } from '@/store/useAuthStore';

export const FEED_KEYS = {
  all: ['feed-posts'] as const,
  list: (filter: FeedFilterType, search: string) =>
    ['feed-posts', filter, search] as const,
  detail: (id: string) => ['feed-post', id] as const,
  reports: ['feed-reports'] as const,
};

export function useFeedRealtime() {
  const queryClient = useQueryClient();
  const { isAuthenticated, accessToken } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const socket = io(`${API_BASE_URL}/ws/feed`, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    const invalidateFeed = () => {
      queryClient.invalidateQueries({ queryKey: FEED_KEYS.all });
      queryClient.invalidateQueries({ queryKey: FEED_KEYS.reports });
    };

    const events = [
      'post.created',
      'post.updated',
      'post.deleted',
      'post.liked',
      'post.commented',
      'incident.created',
      'incident.accepted',
      'incident.assigned',
      'incident.status_changed',
      'incident.resolved',
    ];

    events.forEach((evt) => socket.on(evt, invalidateFeed));

    return () => {
      events.forEach((evt) => socket.off(evt, invalidateFeed));
      socket.disconnect();
    };
  }, [isAuthenticated, accessToken, queryClient]);
}

export function useFeedPosts(filter: FeedFilterType, search: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: FEED_KEYS.list(filter, search),
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/posts', {
        params: { filter, search: search || undefined, page: 1, limit: 30 },
      });
      return res.data.data as PostItem[];
    },
    enabled: isAuthenticated,
  });
}

export function usePostDetail(id: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: FEED_KEYS.detail(id),
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/posts/${id}`);
      return res.data.data as PostItem & { comments: PostComment[] };
    },
    enabled: Boolean(id) && id !== 'create' && isAuthenticated,
  });
}

async function uploadLocalImages(uris: string[]): Promise<string[]> {
  const uploaded: string[] = [];
  const token = useAuthStore.getState().accessToken;

  for (const uri of uris) {
    if (!uri.startsWith('file://') && !uri.startsWith('content://')) {
      uploaded.push(uri);
      continue;
    }
    try {
      const form = new FormData();
      const filename = uri.split('/').pop() || `photo-${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const mimeType = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';

      form.append('file', {
        uri,
        name: filename,
        type: mimeType === 'image/jpg' ? 'image/jpeg' : mimeType,
      } as any);

      const res = await fetch(`${API_BASE_URL}/api/v1/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: form,
      });

      if (res.ok) {
        const json = await res.json();
        const uploadedUrl = json?.data?.url || json?.url;
        if (uploadedUrl) {
          const fullUrl = uploadedUrl.startsWith('http')
            ? uploadedUrl
            : `${API_BASE_URL}${uploadedUrl}`;
          uploaded.push(fullUrl);
          continue;
        }
      }
      // If server upload failed, fallback to uri to avoid blocking post creation
      uploaded.push(uri);
    } catch (e) {
      console.warn('Image upload error, continuing with local URI:', e);
      uploaded.push(uri);
    }
  }
  return uploaded;
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePostPayload) => {
      const mediaUrls = payload.mediaUrls?.length
        ? await uploadLocalImages(payload.mediaUrls)
        : undefined;
      const res = await apiClient.post('/api/v1/posts', {
        ...payload,
        mediaUrls,
      });
      return res.data.data as PostItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FEED_KEYS.all });
      queryClient.invalidateQueries({ queryKey: FEED_KEYS.reports });
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      payload,
    }: {
      postId: string;
      payload: UpdatePostPayload;
    }) => {
      const res = await apiClient.patch(`/api/v1/posts/${postId}`, payload);
      return res.data.data as PostItem;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: FEED_KEYS.all });
      queryClient.invalidateQueries({ queryKey: FEED_KEYS.detail(variables.postId) });
    },
  });
}

export function useToggleReaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, type }: { postId: string; type: ReactionType }) => {
      await apiClient.post(`/api/v1/posts/${postId}/reactions`, { type });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: FEED_KEYS.all });
      queryClient.invalidateQueries({ queryKey: FEED_KEYS.detail(variables.postId) });
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      payload,
    }: {
      postId: string;
      payload: CreateCommentPayload;
    }) => {
      const res = await apiClient.post(`/api/v1/posts/${postId}/comments`, payload);
      return res.data.data as PostComment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: FEED_KEYS.all });
      queryClient.invalidateQueries({ queryKey: FEED_KEYS.detail(variables.postId) });
    },
  });
}

export function useReportPost() {
  return useMutation({
    mutationFn: async ({
      postId,
      payload,
    }: {
      postId: string;
      payload: ReportPostPayload;
    }) => {
      const res = await apiClient.post(`/api/v1/posts/${postId}/report`, payload);
      return res.data.data;
    },
  });
}

export function useStartDirectChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const res = await apiClient.post('/api/v1/conversations', {
        type: 'DIRECT',
        participantIds: [targetUserId],
      });
      return res.data.data as { id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Temporary in-memory cache so quick-camera photos from Feed pass exact file:// URI & base64 cleanly without URL encoding issues
const photoBase64Cache = new Map<string, string>();
let pendingInitialPhotos: Array<{ uri: string; base64?: string | null }> = [];

export function cachePhotoBase64(uri: string, base64?: string | null) {
  if (uri && base64) {
    photoBase64Cache.set(uri, base64);
  }
}

export function getCachedPhotoBase64(uri: string): string | undefined {
  return photoBase64Cache.get(uri);
}

export function setPendingInitialPhotos(items: Array<{ uri: string; base64?: string | null }>) {
  pendingInitialPhotos = items;
  items.forEach((it) => cachePhotoBase64(it.uri, it.base64));
}

export function consumePendingInitialPhotos(): string[] {
  if (pendingInitialPhotos.length === 0) return [];
  const uris = pendingInitialPhotos.map((it) => it.uri);
  pendingInitialPhotos = [];
  return uris;
}

export interface AiAssistResult {
  detectedIssues?: string[];
  suggestedTitle: string;
  suggestedContent: string;
  guidanceText: string;
  missingInfoChecklist: string[];
  recommendedCategory: string;
  recommendedPriority: string;
}

export function useAiPostAssist() {
  return useMutation({
    mutationFn: async (payload: {
      prompt?: string;
      isReportMode?: boolean;
      locationName?: string;
      hasPhoto?: boolean;
      imageBase64?: string;
      mimeType?: string;
    }) => {
      const res = await apiClient.post('/api/v1/posts/ai-assist', payload, {
        timeout: 30000,
      });
      return res.data.data as AiAssistResult;
    },
  });
}

export function useTogglePinPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      await apiClient.patch(`/api/v1/posts/${postId}/pin`);
    },
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: FEED_KEYS.all });
      queryClient.invalidateQueries({ queryKey: FEED_KEYS.detail(postId) });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      await apiClient.delete(`/api/v1/posts/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FEED_KEYS.all });
      queryClient.invalidateQueries({ queryKey: FEED_KEYS.reports });
    },
  });
}

// ==========================================
// PHẢN ÁNH SỰ CỐ (MODULE 1 REPORTS)
// ==========================================

export function useReports(status?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [...FEED_KEYS.reports, status || 'ALL'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/reports', {
        params: { status: status || undefined, page: 1, limit: 30 },
      });
      return res.data.data as any[];
    },
    enabled: isAuthenticated,
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title: string;
      description: string;
      category: string;
      visibility: 'PUBLIC' | 'PRIVATE';
      addressText?: string;
      latitude?: number;
      longitude?: number;
    }) => {
      const res = await apiClient.post('/api/v1/reports', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FEED_KEYS.reports });
      queryClient.invalidateQueries({ queryKey: FEED_KEYS.all });
    },
  });
}

export function useAcceptReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ reportId, note }: { reportId: string; note?: string }) => {
      const res = await apiClient.patch(`/api/v1/reports/${reportId}/accept`, { note });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FEED_KEYS.reports });
      queryClient.invalidateQueries({ queryKey: FEED_KEYS.all });
    },
  });
}

export function useUpdateReportStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      reportId,
      status,
      note,
    }: {
      reportId: string;
      status: string;
      note?: string;
    }) => {
      const res = await apiClient.patch(`/api/v1/reports/${reportId}/status`, {
        status,
        note,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FEED_KEYS.reports });
      queryClient.invalidateQueries({ queryKey: FEED_KEYS.all });
    },
  });
}
