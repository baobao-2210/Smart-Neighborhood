import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { AppButton, AppCard, AppText, Avatar, Badge } from '@/components';
import { isOfficerRole, useAuthStore } from '@/store/useAuthStore';
import {
  useChangePassword,
  useMyHistory,
  useMyHousehold,
  useMyProfile,
  useRequestAccountDeletion,
  useUpdateSettings,
} from '@/services/userService';
import { apiClient } from '@/services/apiClient';
import { getRoleLabel } from '@/utils/date';

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, clearSession } = useAuthStore();
  const isOfficer = isOfficerRole(user?.role);

  const { data: profile } = useMyProfile();
  const { data: household } = useMyHousehold();
  const { data: history } = useMyHistory();
  const updateSettings = useUpdateSettings();
  const changePassword = useChangePassword();
  const requestDeletion = useRequestAccountDeletion();

  const [showPwdForm, setShowPwdForm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleLogout = async () => {
    try {
      await apiClient.post('/api/v1/auth/logout');
    } catch {
      // Ignore network error on logout
    }
    await clearSession();
    router.replace('/(auth)/login');
  };

  const handleChangePassword = () => {
    if (!oldPassword || newPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    changePassword.mutate(
      { oldPassword, newPassword },
      {
        onSuccess: () => {
          Alert.alert('Thành công', 'Đã đổi mật khẩu. Vui lòng đăng nhập lại.');
          setShowPwdForm(false);
          setOldPassword('');
          setNewPassword('');
          handleLogout();
        },
        onError: (err: any) => {
          Alert.alert('Thất bại', err?.response?.data?.message || 'Không thể đổi mật khẩu');
        },
      },
    );
  };

  const handleDeleteAccountRequest = () => {
    Alert.alert(
      'Yêu cầu xóa tài khoản',
      'Tài khoản của bạn sẽ chuyển sang trạng thái chờ duyệt xóa và tạm ngừng hoạt động.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Gửi yêu cầu',
          style: 'destructive',
          onPress: () =>
            requestDeletion.mutate('Người dùng yêu cầu xóa tài khoản từ ứng dụng', {
              onSuccess: () => {
                Alert.alert('Đã tiếp nhận', 'Yêu cầu xóa tài khoản đã được ghi nhận.');
                handleLogout();
              },
            }),
        },
      ],
    );
  };

  if (!user) return null;

  const settings = profile?.setting;
  const memberCount = household?.members?.length ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Stitch Top Bar */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.brandIconBox}>
            <Ionicons name="person" size={18} color={COLORS.primary} />
          </View>
          <View>
            <AppText variant="body" semibold>
              {user.neighborhoodName || 'Tổ 12 - P. Yên Hòa'}
            </AppText>
            <AppText variant="caption" color={COLORS.textMuted}>
              Hồ sơ cư dân số
            </AppText>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/notice' as any)}
          style={styles.bellBtn}
        >
          <Ionicons name="notifications-outline" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Stitch Hero Profile Card */}
        <AppCard style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.avatarWrap}>
              <Avatar
                name={user.fullName}
                uri={user.avatarUrl}
                size={68}
                isOfficial={isOfficer}
              />
              <View style={styles.verifiedTick}>
                <Ionicons name="checkmark" size={11} color={COLORS.textInverse} />
              </View>
            </View>
            <View style={styles.heroInfo}>
              <AppText variant="h2" numberOfLines={1}>{user.fullName}</AppText>
              <Badge
                label={getRoleLabel(user.role, user.staffTitle)}
                tone={isOfficer ? 'primary' : 'success'}
                style={{ marginTop: 4 }}
              />
              <AppText variant="caption" color={COLORS.textSecondary} style={{ marginTop: 6 }}>
                {user.phoneNumber} • {household ? `Số ${household.houseNumber}, ${household.street}` : user.neighborhoodName || 'Cư dân Tổ dân phố'}
              </AppText>
            </View>
          </View>

          <View style={styles.heroBtnRow}>
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  'Mã QR Cư dân số',
                  `Mã định danh: ${user.id.slice(0, 8).toUpperCase()}\nHọ tên: ${user.fullName}\nSĐT: ${user.phoneNumber}`,
                )
              }
              style={styles.qrBtn}
            >
              <Ionicons name="qr-code-outline" size={16} color={COLORS.textInverse} />
              <AppText variant="label" color={COLORS.textInverse} style={{ marginLeft: 6 }}>
                Mã QR Cư dân
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowPwdForm(!showPwdForm)}
              style={styles.editBtn}
            >
              <Ionicons name="create-outline" size={16} color={COLORS.primary} />
              <AppText variant="label" color={COLORS.primary} style={{ marginLeft: 6 }}>
                Bảo mật & Mật khẩu
              </AppText>
            </TouchableOpacity>
          </View>
        </AppCard>

        {isOfficer && (
          <AppCard style={styles.section}>
            <AppText variant="label" color={COLORS.primary} style={{ marginBottom: 4 }}>
              CỔNG CÁN BỘ TỔ DÂN PHỐ
            </AppText>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => router.push('/(tabs)/residents')}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.menuIconBox, { backgroundColor: COLORS.primaryLight }]}>
                  <Ionicons name="people-outline" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="body" semibold>
                    Quản lý Cư dân & Hộ gia đình
                  </AppText>
                  <AppText variant="caption" color={COLORS.textMuted}>
                    Tra cứu nhân khẩu, hộ khẩu điện tử
                  </AppText>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </AppCard>
        )}

        {/* Sổ Hộ Khẩu Điện Tử */}
        <AppCard style={styles.section}>
          <View style={styles.householdHeader}>
            <View style={styles.householdTitleRow}>
              <View style={[styles.menuIconBox, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="home-outline" size={18} color={COLORS.primary} />
              </View>
              <View>
                <AppText variant="h3" style={{ fontSize: 16 }}>
                  Sổ Hộ Khẩu Điện Tử
                </AppText>
                <AppText variant="caption" color={COLORS.textMuted}>
                  {household ? `Mã hộ: ${household.code}` : 'Chưa liên kết mã hộ'}
                </AppText>
              </View>
            </View>
            <Badge label={`${memberCount} nhân khẩu`} tone="primary" />
          </View>

          {household ? (
            <View style={styles.memberList}>
              {(household.members ?? []).map((m: any) => (
                <View key={m.id} style={styles.memberCardRow}>
                  <View style={styles.memberInitialCircle}>
                    <AppText variant="label" color={COLORS.primary}>
                      {getInitials(m.fullName)}
                    </AppText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.memberNameLine}>
                      <AppText variant="body" semibold>{m.fullName}</AppText>
                      <Badge
                        label={m.isHead ? 'Chủ hộ' : m.residenceType}
                        tone={m.isHead ? 'primary' : 'neutral'}
                      />
                    </View>
                    <AppText variant="caption" color={COLORS.textMuted}>
                      {m.relationToHead || (m.isHead ? 'Chủ hộ gia đình' : 'Thành viên')}
                    </AppText>
                  </View>
                  <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.secondary} />
                </View>
              ))}
            </View>
          ) : (
            <AppText variant="caption" color={COLORS.textSecondary}>
              Tài khoản chưa được liên kết vào sổ hộ gia đình nào.
            </AppText>
          )}
        </AppCard>

        {/* 2-Column Activity Summary (Phản ánh & Hoạt động - KHÔNG có Đóng phí) */}
        <View style={styles.twoColStats}>
          <AppCard style={styles.statCard}>
            <View style={[styles.menuIconBox, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="megaphone-outline" size={18} color={COLORS.primary} />
            </View>
            <AppText variant="h3" style={{ marginTop: 8 }}>Phản ánh</AppText>
            <AppText variant="caption" color={COLORS.textMuted}>
              {history?.reports?.length ?? 0} hồ sơ đã gửi
            </AppText>
          </AppCard>

          <AppCard style={styles.statCard}>
            <View style={[styles.menuIconBox, { backgroundColor: COLORS.secondaryLight }]}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.secondary} />
            </View>
            <AppText variant="h3" style={{ marginTop: 8 }}>Hoạt động</AppText>
            <AppText variant="caption" color={COLORS.textMuted}>
              {history?.posts?.length ?? 0} bài • {history?.events?.length ?? 0} sự kiện
            </AppText>
          </AppCard>
        </View>

        {/* Thông báo & Quyền riêng tư */}
        <AppCard style={styles.section}>
          <AppText variant="h3" style={styles.sectionTitle}>
            Thông báo & Quyền riêng tư
          </AppText>
          <View style={styles.switchRow}>
            <View style={styles.switchLabelWrap}>
              <Ionicons name="notifications-outline" size={18} color={COLORS.primary} />
              <AppText variant="body" style={{ marginLeft: 10 }}>Nhận thông báo khẩn từ tổ</AppText>
            </View>
            <Switch
              value={settings?.pushAnnouncements ?? true}
              onValueChange={(val) => updateSettings.mutate({ pushAnnouncements: val })}
              trackColor={{ true: COLORS.primary }}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchLabelWrap}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={COLORS.primary} />
              <AppText variant="body" style={{ marginLeft: 10 }}>Nhận tin nhắn mới</AppText>
            </View>
            <Switch
              value={settings?.pushMessages ?? true}
              onValueChange={(val) => updateSettings.mutate({ pushMessages: val })}
              trackColor={{ true: COLORS.primary }}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchLabelWrap}>
              <Ionicons name="call-outline" size={18} color={COLORS.primary} />
              <AppText variant="body" style={{ marginLeft: 10 }}>Hiển thị SĐT với cư dân khác</AppText>
            </View>
            <Switch
              value={settings?.showPhoneNumber ?? false}
              onValueChange={(val) => updateSettings.mutate({ showPhoneNumber: val })}
              trackColor={{ true: COLORS.primary }}
            />
          </View>
        </AppCard>

        {/* Bảo mật & Tài khoản */}
        <AppCard style={styles.section}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setShowPwdForm(!showPwdForm)}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: COLORS.surfaceAlt }]}>
                <Ionicons name="key-outline" size={18} color={COLORS.textPrimary} />
              </View>
              <AppText variant="body" semibold>
                Đổi mật khẩu tài khoản
              </AppText>
            </View>
            <Ionicons name={showPwdForm ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          {showPwdForm && (
            <View style={styles.pwdForm}>
              <TextInput
                style={styles.input}
                placeholder="Mật khẩu cũ"
                secureTextEntry
                value={oldPassword}
                onChangeText={setOldPassword}
              />
              <TextInput
                style={styles.input}
                placeholder="Mật khẩu mới (>= 6 ký tự)"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <AppButton
                title="Xác nhận đổi mật khẩu"
                onPress={handleChangePassword}
                loading={changePassword.isPending}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.menuRow, styles.dividerTop]}
            onPress={handleDeleteAccountRequest}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: COLORS.dangerLight }]}>
                <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
              </View>
              <AppText variant="body" color={COLORS.danger} semibold>
                Yêu cầu xóa tài khoản
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuRow, styles.dividerTop]}
            onPress={handleLogout}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: COLORS.dangerLight }]}>
                <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
              </View>
              <AppText variant="body" color={COLORS.danger} semibold>
                Đăng xuất tài khoản
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </AppCard>

        <AppText variant="caption" color={COLORS.textMuted} style={styles.footerCaption}>
          Ứng dụng Quản trị Dân cư Số • Smart Neighborhood
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  brandIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 40 },

  heroCard: { gap: SPACING.md },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  avatarWrap: { position: 'relative' },
  verifiedTick: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: { flex: 1 },
  heroBtnRow: { flexDirection: 'row', gap: SPACING.sm },
  qrBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
  },

  section: { gap: SPACING.sm },
  sectionTitle: { marginBottom: 4, fontSize: 16 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerTop: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: SPACING.md,
    marginTop: 4,
  },

  householdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  householdTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  memberList: { gap: SPACING.sm },
  memberCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceAlt,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  memberInitialCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberNameLine: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },

  twoColStats: { flexDirection: 'row', gap: SPACING.md },
  statCard: { flex: 1, padding: SPACING.md },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  switchLabelWrap: { flexDirection: 'row', alignItems: 'center', flex: 1 },

  pwdForm: { gap: SPACING.sm, marginTop: SPACING.xs },
  input: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  footerCaption: { textAlign: 'center', marginTop: 4 },
});
