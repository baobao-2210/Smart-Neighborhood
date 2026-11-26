import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './apiClient';
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

