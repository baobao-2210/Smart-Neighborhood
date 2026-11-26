import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreateCommentPayload,
  CreatePostPayload,
  FeedFilterType,
  PostComment,
  PostItem,
  ReactionType,
} from '@todanpho/shared';
import { apiClient } from './apiClient';
import { useAuthStore } from '@/store/useAuthStore';

export const FEED_KEYS = {
  all: ['feed-posts'] as const,
  list: (filter: FeedFilterType, search: string) =>
    ['feed-posts', filter, search] as const,
  detail: (id: string) => ['feed-post', id] as const,
  reports: ['feed-reports'] as const,
};

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
    enabled: Boolean(id) && isAuthenticated,
  });
}

async function uploadLocalImages(uris: string[]): Promise<string[]> {
  const uploaded: string[] = [];
  for (const uri of uris) {
    if (!uri.startsWith('file://') && !uri.startsWith('content://')) {
      uploaded.push(uri);
      continue;
    }
    try {
      const form = new FormData();
      const filename = uri.split('/').pop() || `photo-${Date.now()}.jpg`;
      form.append('file', {
        uri,
        name: filename,
        type: 'image/jpeg',
      } as any);
      const res = await apiClient.post('/api/v1/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.data?.url) {
        uploaded.push(`${apiClient.defaults.baseURL}${res.data.data.url}`);
      }
    } catch {
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
    },
  });
}
