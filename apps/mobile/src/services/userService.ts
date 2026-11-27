import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL, apiClient } from './apiClient';
import { AuthUser, useAuthStore } from '@/store/useAuthStore';

export const USER_KEYS = {
  me: ['user-me'] as const,
  household: ['user-household'] as const,
  history: ['user-history'] as const,
};

export async function loginApi(phoneNumber: string, password: string) {
  const res = await apiClient.post('/api/v1/auth/login', { phoneNumber, password });
  return res.data.data as {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
  };
}

export async function registerApi(payload: {
  phoneNumber: string;
  password: string;
  fullName: string;
  neighborhoodCode: string;
}) {
  const res = await apiClient.post('/api/v1/auth/register', payload);
  return res.data.data as {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
  };
}

export function useMyProfile() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: USER_KEYS.me,
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/users/me');
      return res.data.data;
    },
    enabled: isAuthenticated,
  });
}

export function useMyHousehold() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: USER_KEYS.household,
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/users/me/household');
      return res.data.data;
    },
    enabled: isAuthenticated,
  });
}

export function useMyHistory() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: USER_KEYS.history,
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/users/me/history');
      return res.data.data as { posts: any[]; reports: any[]; events: any[] };
    },
    enabled: isAuthenticated,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const res = await apiClient.patch('/api/v1/users/me/settings', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_KEYS.me });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload: { oldPassword: string; newPassword: string }) => {
      const res = await apiClient.patch('/api/v1/auth/password', payload);
      return res.data.data;
    },
  });
}

export function useRequestAccountDeletion() {
  return useMutation({
    mutationFn: async (reason: string) => {
      const res = await apiClient.post('/api/v1/users/me/deletion-request', { reason });
      return res.data.data;
    },
  });
}

async function uploadAvatarUri(uri: string): Promise<string | null> {
  if (!uri.startsWith('file://') && !uri.startsWith('content://')) {
    return uri;
  }
  const token = useAuthStore.getState().accessToken;
  const form = new FormData();
  const filename = uri.split('/').pop() || `avatar-${Date.now()}.jpg`;
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

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      fullName?: string;
      email?: string;
      localAvatarUri?: string | null;
    }) => {
      let avatarUrl: string | undefined;
      if (payload.localAvatarUri) {
        const uploaded = await uploadAvatarUri(payload.localAvatarUri);
        if (uploaded) avatarUrl = uploaded;
      }

      const body: Record<string, any> = {};
      if (payload.fullName?.trim()) body.fullName = payload.fullName.trim();
      if (payload.email?.trim()) body.email = payload.email.trim();
      if (avatarUrl) body.avatarUrl = avatarUrl;

      const res = await apiClient.patch('/api/v1/users/me', body);
      return res.data.data;
    },
    onSuccess: (updated) => {
      const current = useAuthStore.getState().user;
      if (current && updated) {
        useAuthStore.getState().setUser({
          ...current,
          fullName: updated.fullName ?? current.fullName,
          email: updated.email ?? current.email,
          avatarUrl: updated.avatarUrl ?? current.avatarUrl,
        });
      }
      queryClient.invalidateQueries({ queryKey: USER_KEYS.me });
      queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

