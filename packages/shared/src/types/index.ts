// ==========================================
// ĐỊNH NGHĨA ENUMS & TYPES DÙNG CHUNG (6 MODULE)
// ==========================================

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',     // Quản trị viên hệ thống (đa tổ dân phố)
  LEADER = 'LEADER',               // Tổ trưởng tổ dân phố
  STAFF = 'STAFF',                 // Cán bộ / Nhân viên được phân công
  RESIDENT = 'RESIDENT',           // Cư dân
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETION_REQUESTED = 'DELETION_REQUESTED',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum ResidenceType {
  THUONG_TRU = 'THUONG_TRU',
  TAM_TRU = 'TAM_TRU',
  TAM_VANG = 'TAM_VANG',
  LUU_TRU = 'LUU_TRU',
}

export enum ResidenceStatus {
  DANG_CU_TRU = 'DANG_CU_TRU',
  TAM_VANG = 'TAM_VANG',
  DA_CHUYEN_DI = 'DA_CHUYEN_DI',
}

export enum HouseholdRelation {
  CHU_HO = 'CHU_HO',
  VO_CHONG = 'VO_CHONG',
  CON = 'CON',
  BO_ME = 'BO_ME',
  ONG_BA = 'ONG_BA',
  CHAU = 'CHAU',
  ANH_CHI_EM = 'ANH_CHI_EM',
  NGUOI_THUE = 'NGUOI_THUE',
  KHAC = 'KHAC',
}

export enum PostCategory {
  LIFE = 'LIFE',
  WARNING = 'WARNING',
  EVENT_RECAP = 'EVENT_RECAP',
}

export enum PostVisibility {
  PUBLIC = 'PUBLIC',
  OFFICERS_ONLY = 'OFFICERS_ONLY',
}

export enum ReportCategory {
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  SANITATION = 'SANITATION',
  SECURITY = 'SECURITY',
  LIGHTING = 'LIGHTING',
  OTHER = 'OTHER',
}

export enum ReportVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

export enum ReportStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
}

export enum AnnouncementPriority {
  NORMAL = 'NORMAL',
  IMPORTANT = 'IMPORTANT',
  URGENT = 'URGENT',
}

export enum EventStatus {
  UPCOMING = 'UPCOMING',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum EventRegistrationStatus {
  REGISTERED = 'REGISTERED',
  CANCELLED = 'CANCELLED',
  ATTENDED = 'ATTENDED',
}

export enum ConversationType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
  SUPPORT = 'SUPPORT',
}

export enum AttachmentEntityType {
  POST = 'POST',
  REPORT = 'REPORT',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  MESSAGE = 'MESSAGE',
}
