import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserRole } from '@todanpho/shared';
import { API_BASE_URL, apiClient } from './apiClient';
import { useAuthStore } from '@/store/useAuthStore';

export interface ContactItem {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  role: UserRole;
  staffTitle?: string | null;
}

export interface ChatAttachment {
  id: string;
  url: string;
  mimeType: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isModerated: boolean;
  createdAt: string;
  sender?: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
    role: UserRole;
    staffTitle?: string | null;
  };
  attachments?: ChatAttachment[];
}

export const CONNECT_KEYS = {
  conversations: ['conversations'] as const,
  contacts: (search: string) => ['contacts', search] as const,
  messages: (id: string) => ['messages', id] as const,
};

export function useConversations() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: CONNECT_KEYS.conversations,
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/conversations');
      return (res.data.data ?? []) as any[];
    },
    enabled: isAuthenticated,
  });
}

export function useContacts(search: string, enabled = true) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: CONNECT_KEYS.contacts(search),
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/contacts', {
        params: search.trim() ? { search: search.trim() } : undefined,
      });
      return (res.data.data ?? []) as ContactItem[];
    },
    enabled: isAuthenticated && enabled,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      type: 'DIRECT' | 'GROUP' | 'SUPPORT';
      name?: string;
      participantIds: string[];
    }) => {
      const res = await apiClient.post('/api/v1/conversations', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONNECT_KEYS.conversations });
    },
  });
}

export function useMessages(conversationId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: CONNECT_KEYS.messages(conversationId),
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/conversations/${conversationId}/messages`, {
        params: { page: 1, limit: 50 },
      });
      return (res.data.data ?? []) as ChatMessage[];
    },
    enabled: Boolean(conversationId) && isAuthenticated,
  });
}

export async function uploadChatImage(uri: string): Promise<string | null> {
  if (!uri.startsWith('file://') && !uri.startsWith('content://')) {
    return uri;
  }
  const token = useAuthStore.getState().accessToken;
  const form = new FormData();
  const filename = uri.split('/').pop() || `chat-${Date.now()}.jpg`;
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

  if (!res.ok) return null;
  const json = await res.json();
  const path = json?.data?.url || json?.url;
  if (!path) return null;
  return path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      content,
      localImageUri,
    }: {
      content: string;
      localImageUri?: string | null;
    }) => {
      let attachmentUrls: string[] | undefined;
      if (localImageUri) {
        const uploadedUrl = await uploadChatImage(localImageUri);
        if (uploadedUrl) {
          attachmentUrls = [uploadedUrl];
        }
      }
      const res = await apiClient.post(`/api/v1/conversations/${conversationId}/messages`, {
        content,
        attachmentUrls,
      });
      return res.data.data as ChatMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONNECT_KEYS.messages(conversationId) });
      queryClient.invalidateQueries({ queryKey: CONNECT_KEYS.conversations });
    },
  });
}

