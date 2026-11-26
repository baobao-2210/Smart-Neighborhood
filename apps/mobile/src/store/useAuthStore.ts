import { create } from 'zustand';
import { UserRole } from '@todanpho/shared';

export interface AuthUser {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: UserRole;
  staffTitle?: string | null;
  neighborhoodId: string;
  neighborhoodName: string;
  avatarUrl?: string | null;
}

interface AuthState {
  user: AuthUser;
  accessToken: string | null;
  switchDemoRole: (role: UserRole) => void;
}

const DEMO_USERS: Record<UserRole, AuthUser> = {
  [UserRole.RESIDENT]: {
    id: 'user-resident-01',
    fullName: 'Nguyễn Văn An',
    phoneNumber: '0912345678',
    role: UserRole.RESIDENT,
    neighborhoodId: 'tdp-05-p12',
    neighborhoodName: 'Tổ dân phố số 5 - P.12',
    avatarUrl: null,
  },
  [UserRole.LEADER]: {
    id: 'user-leader-01',
    fullName: 'Trần Thị Minh',
    phoneNumber: '0987654321',
    role: UserRole.LEADER,
    staffTitle: 'Tổ trưởng',
    neighborhoodId: 'tdp-05-p12',
    neighborhoodName: 'Tổ dân phố số 5 - P.12',
    avatarUrl: null,
  },
  [UserRole.STAFF]: {
    id: 'user-staff-01',
    fullName: 'Đại úy Vũ Đức Thắng',
    phoneNumber: '0944556677',
    role: UserRole.STAFF,
    staffTitle: 'Cảnh sát khu vực',
    neighborhoodId: 'tdp-05-p12',
    neighborhoodName: 'Tổ dân phố số 5 - P.12',
    avatarUrl: null,
  },
  [UserRole.SUPER_ADMIN]: {
    id: 'user-admin-01',
    fullName: 'Quản trị viên Phường',
    phoneNumber: '0999888777',
    role: UserRole.SUPER_ADMIN,
    neighborhoodId: 'tdp-05-p12',
    neighborhoodName: 'Tổ dân phố số 5 - P.12',
    avatarUrl: null,
  },
};

export const useAuthStore = create<AuthState>((set) => ({
  user: DEMO_USERS[UserRole.RESIDENT],
  accessToken: null,
  switchDemoRole: (role) => set({ user: DEMO_USERS[role] }),
}));

export function isOfficerRole(role: UserRole): boolean {
  return [UserRole.LEADER, UserRole.STAFF, UserRole.SUPER_ADMIN].includes(role);
}

export function isLeaderRole(role: UserRole): boolean {
  return [UserRole.LEADER, UserRole.SUPER_ADMIN].includes(role);
}
