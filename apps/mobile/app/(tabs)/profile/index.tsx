import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { UserRole } from '@todanpho/shared';
import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { AppText, AppCard, Avatar, Badge } from '@/components';
import { isOfficerRole, useAuthStore } from '@/store/useAuthStore';
import { getRoleLabel } from '@/utils/date';

const ROLE_OPTIONS: { role: UserRole; label: string }[] = [
  { role: UserRole.RESIDENT, label: 'Cư dân' },
  { role: UserRole.STAFF, label: 'Cán bộ tổ' },
  { role: UserRole.LEADER, label: 'Tổ trưởng' },
  { role: UserRole.SUPER_ADMIN, label: 'Super Admin' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, switchDemoRole } = useAuthStore();
  const isOfficer = isOfficerRole(user.role);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppCard style={styles.profileCard}>
          <Avatar name={user.fullName} uri={user.avatarUrl} size={64} isOfficial={isOfficer} />
          <AppText variant="h2" style={styles.name}>
            {user.fullName}
          </AppText>
          <AppText variant="body" color={COLORS.textSecondary}>
            {user.phoneNumber} • {user.neighborhoodName}
          </AppText>
          <View style={styles.badgeRow}>
            <Badge
              label={getRoleLabel(user.role, user.staffTitle)}
              tone={isOfficer ? 'primary' : 'success'}
            />
          </View>
        </AppCard>

        {isOfficer && (
          <AppCard style={styles.section}>
            <AppText variant="h3" style={styles.sectionTitle}>
              Quản lý Tổ dân phố (Dành cho Cán bộ)
            </AppText>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => router.push('/(tabs)/residents')}
            >
              <View style={styles.menuLeft}>
                <Ionicons name="people-outline" size={20} color={COLORS.primary} />
                <AppText variant="body" semibold style={styles.menuText}>
                  Quản lý Cư dân & Hộ gia đình
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </AppCard>
        )}

        <AppCard style={styles.section}>
          <AppText variant="h3" style={styles.sectionTitle}>
            Chuyển đổi vai trò kiểm thử (Demo RBAC)
          </AppText>
          <AppText variant="caption" color={COLORS.textSecondary} style={styles.sectionDesc}>
            Chọn 1 trong 4 vai trò chuẩn hệ thống để kiểm tra phân quyền hiển thị chức năng quản trị và thao tác trên Bảng tin.
          </AppText>
          <View style={styles.roleGrid}>
            {ROLE_OPTIONS.map((item) => {
              const active = user.role === item.role;
              return (
                <TouchableOpacity
                  key={item.role}
                  onPress={() => switchDemoRole(item.role)}
                  style={[styles.roleChip, active && styles.roleChipActive]}
                >
                  <AppText
                    variant="body"
                    semibold={active}
                    color={active ? COLORS.textInverse : COLORS.textPrimary}
                  >
                    {item.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </AppCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  name: {
    marginTop: SPACING.md,
    marginBottom: 4,
  },
  badgeRow: {
    marginTop: SPACING.sm,
  },
  section: {
    gap: SPACING.sm,
  },
  sectionTitle: {
    marginBottom: 2,
  },
  sectionDesc: {
    marginBottom: SPACING.sm,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuText: {
    marginLeft: SPACING.sm,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  roleChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
});

