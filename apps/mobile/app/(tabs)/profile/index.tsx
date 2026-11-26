import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  Linking,
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
      {/* Espresso Dark Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.brandIconBox}>
            <Ionicons name="business" size={18} color={COLORS.primary} />
          </View>
          <View>
            <View style={{ flexDirection: 'row' }}>
              <AppText variant="label" color={COLORS.textPrimary} style={{ fontSize: 13 }}>SMART </AppText>
              <AppText variant="label" color={COLORS.warning} style={{ fontSize: 13 }}>NEIGHBORHOOD</AppText>
            </View>
            <AppText variant="caption" color={COLORS.textMuted}>
              {user.neighborhoodName || 'Tổ dân phố 12 - P. Dịch Vọng Hậu'}
            </AppText>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/notice' as any)}
          style={styles.bellBtn}
        >
          <Ionicons name="megaphone-outline" size={18} color={COLORS.warning} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Vibrant VNeID Card */}
        <View style={styles.vneidHeroCard}>
          <View style={styles.vneidTopRow}>
            <View style={styles.vneidVerifiedPill}>
              <Ionicons name="checkmark-circle" size={13} color={COLORS.warning} />
              <AppText variant="label" color="#FEF3C7" style={{ marginLeft: 4, fontSize: 10 }}>
                CƯ DÂN ĐÃ XÁC THỰC VNEID
              </AppText>
            </View>
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  'Mã QR Cư dân số',
                  `Mã định danh: #CD-${user.id.slice(0, 6).toUpperCase()}\nHọ tên: ${user.fullName}\nSĐT: ${user.phoneNumber}`,
                )
              }
              style={styles.qrPill}
            >
              <Ionicons name="qr-code-outline" size={13} color={COLORS.primary} />
              <AppText variant="label" color={COLORS.textPrimary} style={{ marginLeft: 4, fontSize: 11 }}>
                Mã QR
              </AppText>
            </TouchableOpacity>
          </View>

          <View style={styles.heroUserRow}>
            <Avatar
              name={user.fullName}
              uri={user.avatarUrl}
              size={60}
              isOfficial={isOfficer}
            />
            <View style={{ flex: 1 }}>
              <AppText variant="h2" color="#FFFFFF" numberOfLines={1}>{user.fullName}</AppText>
              <AppText variant="caption" color="#FDE68A" style={{ marginTop: 2 }}>
                {getRoleLabel(user.role, user.staffTitle)} • {user.phoneNumber}
              </AppText>
              <View style={styles.codeTag}>
                <AppText variant="caption" color="#F5F5F4" style={{ fontSize: 11 }}>
                  Mã CD: #CD-{user.id.slice(0, 6).toUpperCase()}
                </AppText>
              </View>
            </View>
          </View>

          <View style={styles.addressBanner}>
            <Ionicons name="location-outline" size={14} color="#FDE68A" />
            <AppText variant="caption" color="#FFFFFF" numberOfLines={1} style={{ marginLeft: 6, flex: 1 }}>
              {household ? `Số ${household.houseNumber}, ${household.street}` : user.neighborhoodName || 'Khu dân cư Tổ dân phố'}
            </AppText>
          </View>
        </View>

        {/* 4-Column Stats Row */}
        <AppCard style={styles.statsCard}>
          <View style={styles.statCol}>
            <View style={[styles.statIconBox, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="warning-outline" size={16} color={COLORS.primary} />
            </View>
            <AppText variant="h3" color={COLORS.primary}>{history?.reports?.length ?? 0}</AppText>
            <AppText variant="caption" color={COLORS.textMuted} style={{ fontSize: 11 }}>Phản ánh</AppText>
          </View>

          <View style={styles.statCol}>
            <View style={[styles.statIconBox, { backgroundColor: COLORS.warningLight }]}>
              <Ionicons name="newspaper-outline" size={16} color={COLORS.warning} />
            </View>
            <AppText variant="h3" color={COLORS.warning}>{history?.posts?.length ?? 0}</AppText>
            <AppText variant="caption" color={COLORS.textMuted} style={{ fontSize: 11 }}>Bài viết</AppText>
          </View>

          <View style={styles.statCol}>
            <View style={[styles.statIconBox, { backgroundColor: COLORS.dangerLight }]}>
              <Ionicons name="heart-outline" size={16} color={COLORS.danger} />
            </View>
            <AppText variant="h3" color={COLORS.danger}>{memberCount}</AppText>
            <AppText variant="caption" color={COLORS.textMuted} style={{ fontSize: 11 }}>Nhân khẩu</AppText>
          </View>

          <View style={styles.statCol}>
            <View style={[styles.statIconBox, { backgroundColor: COLORS.secondaryLight }]}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.secondary} />
            </View>
            <AppText variant="h3" color={COLORS.secondary}>{history?.events?.length ?? 0}</AppText>
            <AppText variant="caption" color={COLORS.textMuted} style={{ fontSize: 11 }}>Sự kiện</AppText>
          </View>
        </AppCard>

        {/* Quick Call Leader Card */}
        <AppCard style={styles.leaderCallCard}>
          <View style={[styles.menuIconBox, { backgroundColor: COLORS.primaryLight }]}>
            <Ionicons name="call-outline" size={18} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppText variant="body" semibold>Tổ Trưởng TDP</AppText>
              <Badge label="Trực ban 24/7" tone="warning" />
            </View>
            <AppText variant="caption" color={COLORS.primary}>024.3833.91xx</AppText>
          </View>
          <TouchableOpacity
            onPress={() => Linking.openURL('tel:0912345678')}
            style={styles.callNowBtn}
          >
            <Ionicons name="call" size={14} color={COLORS.textInverse} />
            <AppText variant="label" color={COLORS.textInverse} style={{ marginLeft: 4 }}>
              Gọi ngay
            </AppText>
          </TouchableOpacity>
        </AppCard>

        {/* Hộ gia đình & Cộng đồng */}
        <View style={styles.groupHeaderRow}>
          <AppText variant="label" color={COLORS.primary}>HỘ GIA ĐÌNH & CỘNG ĐỒNG</AppText>
          <Badge label={household ? `Mã ${household.code}` : 'Cư dân'} tone="warning" />
        </View>

        <AppCard style={styles.section}>
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

          {isOfficer && (
            <TouchableOpacity
              style={[styles.menuRow, styles.dividerTop]}
              onPress={() => router.push('/(tabs)/residents')}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.menuIconBox, { backgroundColor: COLORS.primaryLight }]}>
                  <Ionicons name="people-outline" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="body" semibold>Quản lý Cư dân & Hộ gia đình</AppText>
                  <AppText variant="caption" color={COLORS.textMuted}>Cổng công vụ Tổ trưởng / Cán bộ</AppText>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </AppCard>

        {/* Cài đặt & Bảo mật */}
        <AppText variant="label" color={COLORS.danger} style={{ marginTop: 4 }}>
          CÀI ĐẶT & BẢO MẬT
        </AppText>

        <AppCard style={styles.section}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabelWrap}>
              <View style={[styles.menuIconBox, { backgroundColor: COLORS.warningLight }]}>
                <Ionicons name="notifications-outline" size={18} color={COLORS.warning} />
              </View>
              <AppText variant="body" style={{ marginLeft: 10 }}>Nhận thông báo khẩn từ tổ</AppText>
            </View>
            <Switch
              value={settings?.pushAnnouncements ?? true}
              onValueChange={(val) => updateSettings.mutate({ pushAnnouncements: val })}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabelWrap}>
              <View style={[styles.menuIconBox, { backgroundColor: COLORS.secondaryLight }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={COLORS.secondary} />
              </View>
              <AppText variant="body" style={{ marginLeft: 10 }}>Nhận tin nhắn mới</AppText>
            </View>
            <Switch
              value={settings?.pushMessages ?? true}
              onValueChange={(val) => updateSettings.mutate({ pushMessages: val })}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabelWrap}>
              <View style={[styles.menuIconBox, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="call-outline" size={18} color={COLORS.primary} />
              </View>
              <AppText variant="body" style={{ marginLeft: 10 }}>Hiển thị SĐT với cư dân khác</AppText>
            </View>
            <Switch
              value={settings?.showPhoneNumber ?? false}
              onValueChange={(val) => updateSettings.mutate({ showPhoneNumber: val })}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
            />
          </View>

          <TouchableOpacity
            style={[styles.menuRow, styles.dividerTop]}
            onPress={() => setShowPwdForm(!showPwdForm)}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="key-outline" size={18} color={COLORS.primary} />
              </View>
              <AppText variant="body" semibold>Đổi mật khẩu tài khoản</AppText>
            </View>
            <Ionicons name={showPwdForm ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          {showPwdForm && (
            <View style={styles.pwdForm}>
              <TextInput
                style={styles.input}
                placeholder="Mật khẩu cũ"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                value={oldPassword}
                onChangeText={setOldPassword}
              />
              <TextInput
                style={styles.input}
                placeholder="Mật khẩu mới (>= 6 ký tự)"
                placeholderTextColor={COLORS.textMuted}
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
        </AppCard>

        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={18} color="#FECDD3" />
          <AppText variant="body" semibold color="#FECDD3" style={{ marginLeft: 8 }}>
            Đăng xuất tài khoản
          </AppText>
        </TouchableOpacity>

        <AppText variant="caption" color={COLORS.textMuted} style={styles.footerCaption}>
          Smart Neighborhood • Số hóa Tổ dân phố Việt Nam
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
    backgroundColor: '#14100E',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  brandIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.warningLight,
    borderWidth: 1,
    borderColor: '#5C3D12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 40 },

  vneidHeroCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    backgroundColor: '#B91C1C',
    borderWidth: 1,
    borderColor: '#F97316',
    gap: SPACING.md,
  },
  vneidTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vneidVerifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 15, 13, 0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  qrPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 15, 13, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.md,
  },
  heroUserRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  codeTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(18, 15, 13, 0.45)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    marginTop: 6,
  },
  addressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 15, 13, 0.4)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },

  statsCard: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.md },
  statCol: { flex: 1, alignItems: 'center', gap: 4 },
  statIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  leaderCallCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  callNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },

  groupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  section: { gap: SPACING.sm },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  menuIconBox: {
    width: 34,
    height: 34,
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
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5B1420',
    borderWidth: 1,
    borderColor: '#9F1239',
    paddingVertical: 13,
    borderRadius: RADIUS.lg,
  },
  footerCaption: { textAlign: 'center', marginTop: 4 },
});
