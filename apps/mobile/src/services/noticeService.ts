import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnnouncementPriority, EventRegistrationStatus } from '@todanpho/shared';
import { apiClient } from './apiClient';
import { useAuthStore } from '@/store/useAuthStore';

export interface PersonalNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  referenceId?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  isPinned: boolean;
  publishedAt: string;
  isRead: boolean;
  readAt?: string | null;
  readCount: number;
  author?: {
    id: string;
    fullName: string;
    staffTitle?: string | null;
  };
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  locationName: string;
  startTime: string;
  endTime?: string | null;
  status: string;
  maxAttendees?: number | null;
  myRegistrationStatus?: EventRegistrationStatus | null;
  registeredCount: number;
  organizer?: {
    id: string;
    fullName: string;
    staffTitle?: string | null;
  };
}

export const NOTICE_KEYS = {
  notifications: ['personal-notifications'] as const,
  announcements: (priority?: string) => ['announcements', priority ?? 'ALL'] as const,
  announcementStats: (id: string) => ['announcement-stats', id] as const,
  events: ['events'] as const,
};

export function useMyNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: NOTICE_KEYS.notifications,
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/notifications', {
        params: { page: 1, limit: 40 },
      });
      return {
        items: (res.data.data ?? []) as PersonalNotification[],
        unreadCount: (res.data.meta?.unreadCount ?? 0) as number,
      };
    },
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.patch(`/api/v1/notifications/${id}/read`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTICE_KEYS.notifications });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/api/v1/notifications/read-all');
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTICE_KEYS.notifications });
    },
  });
}

export function useAnnouncements(priority?: AnnouncementPriority) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: NOTICE_KEYS.announcements(priority),
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/announcements', {
        params: priority ? { priority } : undefined,
      });
      return (res.data.data ?? []) as AnnouncementItem[];
    },
    enabled: isAuthenticated,
  });
}

export function useMarkAnnouncementRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/v1/announcements/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}

export function useAnnouncementStats(id: string | null) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: NOTICE_KEYS.announcementStats(id ?? ''),
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/announcements/${id}/stats`);
      return res.data.data as {
        announcementId: string;
        totalResidents: number;
        readCount: number;
        readRate: number;
      };
    },
    enabled: Boolean(id) && isAuthenticated,
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title: string;
      content: string;
      priority: AnnouncementPriority;
      isPinned: boolean;
    }) => {
      const res = await apiClient.post('/api/v1/announcements', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: NOTICE_KEYS.notifications });
    },
  });
}

export function useEvents() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: NOTICE_KEYS.events,
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/events');
      return (res.data.data ?? []) as EventItem[];
    },
    enabled: isAuthenticated,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title: string;
      description: string;
      locationName: string;
      startTime: string;
      maxAttendees?: number;
    }) => {
      const res = await apiClient.post('/api/v1/events', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTICE_KEYS.events });
      queryClient.invalidateQueries({ queryKey: NOTICE_KEYS.notifications });
    },
  });
}

export function useRegisterEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'REGISTERED' | 'CANCELLED' }) =>
      apiClient.post(`/api/v1/events/${id}/register`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTICE_KEYS.events });
    },
  });
}
