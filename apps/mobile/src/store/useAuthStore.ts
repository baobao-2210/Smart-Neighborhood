import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { UserRole } from '@todanpho/shared';

const REFRESH_TOKEN_KEY = 'smart_neighborhood_refresh_token';

export interface AuthUser {
  id: string;
  fullName: string;
  phoneNumber: string;
  email?: string | null;
  role: UserRole;
  staffTitle?: string | null;
  neighborhoodId: string;
  neighborhoodName?: string | null;
  avatarUrl?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setSession: (user: AuthUser, accessToken: string, refreshToken: string) => Promise<void>;
  setAccessToken: (accessToken: string) => void;
  setUser: (user: AuthUser) => void;
  clearSession: () => Promise<void>;
  setHydrated: (val: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isHydrated: false,

  setSession: async (user, accessToken, refreshToken) => {
    try {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    } catch {
      // Web fallback if SecureStore is unavailable
    }
    set({
      user,
      accessToken,
      isAuthenticated: true,
      isHydrated: true,
    });
  },

  setAccessToken: (accessToken) => set({ accessToken }),

  setUser: (user) => set({ user }),

  clearSession: async () => {
    try {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      // Ignore on web
    }
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isHydrated: true,
    });
  },

  setHydrated: (val) => set({ isHydrated: val }),
}));

export async function getStoredRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function isOfficerRole(role?: UserRole): boolean {
  if (!role) return false;
  return [UserRole.LEADER, UserRole.STAFF, UserRole.SUPER_ADMIN].includes(role);
}

export function isLeaderRole(role?: UserRole): boolean {
  if (!role) return false;
  return [UserRole.LEADER, UserRole.SUPER_ADMIN].includes(role);
}
