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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppCard style={styles.profileCard}>
          <Avatar
            name={user.fullName}
            uri={user.avatarUrl}
            size={64}
            isOfficial={isOfficer}
          />
          <AppText variant="h2" style={styles.name}>
            {user.fullName}
          </AppText>
          <AppText variant="body" color={COLORS.textSecondary}>
            {user.phoneNumber} • {user.neighborhoodName || 'Tổ dân phố'}
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
              Quản lý Tổ dân phố (Cán bộ)
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

        {/* Hộ gia đình của tôi */}
        <AppCard style={styles.section}>
          <AppText variant="h3" style={styles.sectionTitle}>
            Hộ gia đình của tôi
          </AppText>
          {household ? (
            <>
              <AppText variant="body" semibold color={COLORS.primary}>
                Mã hộ: {household.code} • Số {household.houseNumber}, {household.street}
              </AppText>
              {(household.members ?? []).map((m: any) => (
                <View key={m.id} style={styles.memberRow}>
                  <AppText variant="body">{m.fullName}</AppText>
                  <Badge
                    label={m.isHead ? 'Chủ hộ' : m.residenceType}
                    tone={m.isHead ? 'primary' : 'neutral'}
                  />
                </View>
              ))}
            </>
          ) : (
            <AppText variant="caption" color={COLORS.textSecondary}>
              Tài khoản chưa được liên kết vào sổ hộ gia đình nào.
            </AppText>
          )}
        </AppCard>

        {/* Lịch sử hoạt động */}
        <AppCard style={styles.section}>
          <AppText variant="h3" style={styles.sectionTitle}>
            Lịch sử hoạt động
          </AppText>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <AppText variant="h2" color={COLORS.primary}>
                {history?.posts?.length ?? 0}
              </AppText>
              <AppText variant="caption" color={COLORS.textSecondary}>
                Bài viết
              </AppText>
            </View>
            <View style={styles.statBox}>
              <AppText variant="h2" color={COLORS.warning}>
                {history?.reports?.length ?? 0}
              </AppText>
              <AppText variant="caption" color={COLORS.textSecondary}>
                Phản ánh
              </AppText>
            </View>
            <View style={styles.statBox}>
              <AppText variant="h2" color={COLORS.secondary}>
                {history?.events?.length ?? 0}
              </AppText>
              <AppText variant="caption" color={COLORS.textSecondary}>
                Sự kiện
              </AppText>
            </View>
          </View>
        </AppCard>

        {/* Cài đặt thông báo & riêng tư */}
        <AppCard style={styles.section}>
          <AppText variant="h3" style={styles.sectionTitle}>
            Thông báo & Quyền riêng tư
          </AppText>
          <View style={styles.switchRow}>
            <AppText variant="body">Nhận thông báo khẩn từ tổ</AppText>
            <Switch
              value={settings?.pushAnnouncements ?? true}
              onValueChange={(val) => updateSettings.mutate({ pushAnnouncements: val })}
            />
          </View>
          <View style={styles.switchRow}>
            <AppText variant="body">Nhận tin nhắn mới</AppText>
            <Switch
              value={settings?.pushMessages ?? true}
              onValueChange={(val) => updateSettings.mutate({ pushMessages: val })}
            />
          </View>
          <View style={styles.switchRow}>
            <AppText variant="body">Hiển thị SĐT với cư dân khác</AppText>
            <Switch
              value={settings?.showPhoneNumber ?? false}
              onValueChange={(val) => updateSettings.mutate({ showPhoneNumber: val })}
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
              <Ionicons name="key-outline" size={20} color={COLORS.textPrimary} />
              <AppText variant="body" semibold style={styles.menuText}>
                Đổi mật khẩu
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
                title="Cập nhật mật khẩu"
                onPress={handleChangePassword}
                loading={changePassword.isPending}
              />
            </View>
          )}

          <TouchableOpacity style={styles.menuRow} onPress={handleDeleteAccountRequest}>
            <View style={styles.menuLeft}>
              <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
              <AppText variant="body" semibold color={COLORS.danger} style={styles.menuText}>
                Yêu cầu xóa tài khoản
              </AppText>
            </View>
          </TouchableOpacity>
        </AppCard>

        <AppButton
          title="Đăng xuất"
          variant="outline"
          onPress={handleLogout}
          fullWidth
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  profileCard: { alignItems: 'center', paddingVertical: SPACING.xl },
  name: { marginTop: SPACING.md, marginBottom: 4 },
  badgeRow: { marginTop: SPACING.sm },
  section: { gap: SPACING.sm },
  sectionTitle: { marginBottom: 4 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  menuText: { marginLeft: SPACING.sm },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: SPACING.sm },
  statBox: { alignItems: 'center' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  pwdForm: { gap: SPACING.sm, paddingVertical: SPACING.sm },
  input: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
