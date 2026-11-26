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
import { feedMockStore } from './feedMockStore';
import { useAuthStore } from '@/store/useAuthStore';

export const FEED_KEYS = {
  all: ['feed-posts'] as const,
  list: (filter: FeedFilterType, search: string) =>
    ['feed-posts', filter, search] as const,
  detail: (id: string) => ['feed-post', id] as const,
};

async function fetchPosts(filter: FeedFilterType, search: string): Promise<PostItem[]> {
  try {
    const res = await apiClient.get('/api/v1/posts', {
      params: { filter, search: search || undefined, page: 1, limit: 30 },
    });
    return res.data.data;
  } catch {
    return feedMockStore.getPosts(filter, search);
  }
}

async function fetchPostDetail(
  id: string,
): Promise<(PostItem & { comments: PostComment[] }) | null> {
  try {
    const res = await apiClient.get(`/api/v1/posts/${id}`);
    return res.data.data;
  } catch {
    return feedMockStore.getPostById(id);
  }
}

export function useFeedPosts(filter: FeedFilterType, search: string) {
  return useQuery({
    queryKey: FEED_KEYS.list(filter, search),
    queryFn: () => fetchPosts(filter, search),
  });
}

export function usePostDetail(id: string) {
  return useQuery({
    queryKey: FEED_KEYS.detail(id),
    queryFn: () => fetchPostDetail(id),
    enabled: Boolean(id),
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async (payload: CreatePostPayload) => {
      try {
        const res = await apiClient.post('/api/v1/posts', payload);
        return res.data.data as PostItem;
      } catch {
        return feedMockStore.createPost(payload, user);
      }
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
      try {
        await apiClient.post(`/api/v1/posts/${postId}/reactions`, { type });
      } catch {
        feedMockStore.toggleReaction(postId, type);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: FEED_KEYS.all });
      queryClient.invalidateQueries({ queryKey: FEED_KEYS.detail(variables.postId) });
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({
      postId,
      payload,
    }: {
      postId: string;
      payload: CreateCommentPayload;
    }) => {
      try {
        const res = await apiClient.post(`/api/v1/posts/${postId}/comments`, payload);
        return res.data.data as PostComment;
      } catch {
        return feedMockStore.addComment(postId, payload, user);
      }
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
      try {
        await apiClient.patch(`/api/v1/posts/${postId}/pin`);
      } catch {
        feedMockStore.togglePin(postId);
      }
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
      try {
        await apiClient.delete(`/api/v1/posts/${postId}`);
      } catch {
        feedMockStore.deletePost(postId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FEED_KEYS.all });
    },
  });
}

