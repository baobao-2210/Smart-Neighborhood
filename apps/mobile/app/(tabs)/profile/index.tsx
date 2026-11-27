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
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { AppButton, AppCard, AppText, Avatar, Badge, EmptyState } from '@/components';
import { isOfficerRole, useAuthStore } from '@/store/useAuthStore';
import {
  useChangePassword,
  useMyHistory,
  useMyHousehold,
  useMyProfile,
  useRequestAccountDeletion,
  useUpdateProfile,
  useUpdateSettings,
} from '@/services/userService';
import { apiClient } from '@/services/apiClient';
import { formatRelativeTimeVi, getRoleLabel } from '@/utils/date';

type HistoryTab = 'POSTS' | 'REPORTS' | 'EVENTS';

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

function extractError(err: any, fallback: string) {
  const msg = err?.response?.data?.message || err?.message;
  if (Array.isArray(msg)) return msg.join('\n');
  if (typeof msg === 'string') return msg;
  return fallback;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, clearSession } = useAuthStore();
  const isOfficer = isOfficerRole(user?.role);

  const { data: profile } = useMyProfile();
  const { data: household } = useMyHousehold();
  const { data: history } = useMyHistory();
  const updateSettings = useUpdateSettings();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const requestDeletion = useRequestAccountDeletion();

  // Edit Profile Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAvatarUri, setEditAvatarUri] = useState<string | null>(null);

  // QR Citizen Card Modal
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Activity History Modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyTab, setHistoryTab] = useState<HistoryTab>('POSTS');

  // Password Change
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Account Deletion Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  const handleOpenEditModal = () => {
    setEditFullName(profile?.fullName || user?.fullName || '');
    setEditEmail(profile?.email || user?.email || '');
    setEditAvatarUri(null);
    setEditModalOpen(true);
  };

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setEditAvatarUri(result.assets[0].uri);
    }
  };

  const handleSaveProfile = () => {
    if (editFullName.trim().length < 2) {
      Alert.alert('Thiếu họ tên', 'Vui lòng nhập họ tên đầy đủ (tối thiểu 2 ký tự).');
      return;
    }
    updateProfile.mutate(
      {
        fullName: editFullName.trim(),
        email: editEmail.trim() || undefined,
        localAvatarUri: editAvatarUri,
      },
      {
        onSuccess: () => {
          setEditModalOpen(false);
          Alert.alert('Đã lưu', 'Hồ sơ cá nhân đã được cập nhật.');
        },
        onError: (err: any) => {
          Alert.alert('Không thể cập nhật', extractError(err, 'Vui lòng kiểm tra lại thông tin.'));
        },
      },
    );
  };

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
          Alert.alert('Thất bại', extractError(err, 'Không thể đổi mật khẩu'));
        },
      },
    );
  };

  const handleConfirmDeleteAccount = () => {
    if (deleteReason.trim().length < 5) {
      Alert.alert('Thiếu lý do', 'Vui lòng nhập lý do yêu cầu xóa tài khoản (tối thiểu 5 ký tự).');
      return;
    }
    requestDeletion.mutate(deleteReason.trim(), {
      onSuccess: () => {
        setDeleteModalOpen(false);
        Alert.alert('Đã tiếp nhận', 'Yêu cầu xóa tài khoản đã được gửi tới Ban quản trị.');
        handleLogout();
      },
      onError: (err: any) => {
        Alert.alert('Không thể gửi yêu cầu', extractError(err, 'Vui lòng thử lại sau.'));
      },
    });
  };

  if (!user) return null;

  const settings = profile?.setting;
  const memberCount = household?.members?.length ?? 0;
  const citizenCode = `#CD-${user.id.slice(0, 6).toUpperCase()}`;

  const openHistoryAt = (tab: HistoryTab) => {
    setHistoryTab(tab);
    setHistoryModalOpen(true);
  };

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
              <AppText variant="label" color={COLORS.textPrimary} style={{ fontSize: 13 }}>
                SMART{' '}
              </AppText>
              <AppText variant="label" color={COLORS.warning} style={{ fontSize: 13 }}>
                NEIGHBORHOOD
              </AppText>
            </View>
            <AppText variant="caption" color={COLORS.textMuted}>
              {user.neighborhoodName || 'Tổ dân phố'}
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
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity onPress={handleOpenEditModal} style={styles.qrPill}>
                <Ionicons name="create-outline" size={13} color={COLORS.primary} />
                <AppText variant="label" color={COLORS.textPrimary} style={{ marginLeft: 4, fontSize: 11 }}>
                  Sửa hồ sơ
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setQrModalOpen(true)} style={styles.qrPill}>
                <Ionicons name="qr-code-outline" size={13} color={COLORS.primary} />
                <AppText variant="label" color={COLORS.textPrimary} style={{ marginLeft: 4, fontSize: 11 }}>
                  Mã QR
                </AppText>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroUserRow}>
            <TouchableOpacity onPress={handleOpenEditModal} activeOpacity={0.85}>
              <View style={{ position: 'relative' }}>
                <Avatar
                  name={user.fullName}
                  uri={user.avatarUrl}
                  size={62}
                  isOfficial={isOfficer}
                />
                <View style={styles.avatarEditBadge}>
                  <Ionicons name="camera" size={12} color="#FFFFFF" />
                </View>
              </View>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <AppText variant="h2" color="#FFFFFF" numberOfLines={1}>
                {user.fullName}
              </AppText>
              <AppText variant="caption" color="#FDE68A" style={{ marginTop: 2 }}>
                {getRoleLabel(user.role, user.staffTitle)} • {user.phoneNumber}
              </AppText>
              {user.email ? (
                <AppText variant="caption" color="#FEE2E2" numberOfLines={1} style={{ marginTop: 1 }}>
                  {user.email}
                </AppText>
              ) : null}
              <View style={styles.codeTag}>
                <AppText variant="caption" color="#F5F5F4" style={{ fontSize: 11 }}>
                  Mã CD: {citizenCode}
                </AppText>
              </View>
            </View>
          </View>

          <View style={styles.addressBanner}>
            <Ionicons name="location-outline" size={14} color="#FDE68A" />
            <AppText variant="caption" color="#FFFFFF" numberOfLines={1} style={{ marginLeft: 6, flex: 1 }}>
              {household
                ? `Số ${household.houseNumber}, ${household.street}`
                : user.neighborhoodName || 'Khu dân cư Tổ dân phố'}
            </AppText>
          </View>
        </View>

        {/* 4-Column Interactive Stats Row */}
        <AppCard style={styles.statsCard}>
          <TouchableOpacity onPress={() => openHistoryAt('REPORTS')} style={styles.statCol}>
            <View style={[styles.statIconBox, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="warning-outline" size={16} color={COLORS.primary} />
            </View>
            <AppText variant="h3" color={COLORS.primary}>
              {history?.reports?.length ?? 0}
            </AppText>
            <AppText variant="caption" color={COLORS.textMuted} style={{ fontSize: 11 }}>
              Phản ánh
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => openHistoryAt('POSTS')} style={styles.statCol}>
            <View style={[styles.statIconBox, { backgroundColor: COLORS.warningLight }]}>
              <Ionicons name="newspaper-outline" size={16} color={COLORS.warning} />
            </View>
            <AppText variant="h3" color={COLORS.warning}>
              {history?.posts?.length ?? 0}
            </AppText>
            <AppText variant="caption" color={COLORS.textMuted} style={{ fontSize: 11 }}>
              Bài viết
            </AppText>
          </TouchableOpacity>

          <View style={styles.statCol}>
            <View style={[styles.statIconBox, { backgroundColor: COLORS.dangerLight }]}>
              <Ionicons name="heart-outline" size={16} color={COLORS.danger} />
            </View>
            <AppText variant="h3" color={COLORS.danger}>
              {memberCount}
            </AppText>
            <AppText variant="caption" color={COLORS.textMuted} style={{ fontSize: 11 }}>
              Nhân khẩu
            </AppText>
          </View>

          <TouchableOpacity onPress={() => openHistoryAt('EVENTS')} style={styles.statCol}>
            <View style={[styles.statIconBox, { backgroundColor: COLORS.secondaryLight }]}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.secondary} />
            </View>
            <AppText variant="h3" color={COLORS.secondary}>
              {history?.events?.length ?? 0}
            </AppText>
            <AppText variant="caption" color={COLORS.textMuted} style={{ fontSize: 11 }}>
              Sự kiện
            </AppText>
          </TouchableOpacity>
        </AppCard>

        {/* Quick Call Leader Card */}
        <AppCard style={styles.leaderCallCard}>
          <View style={[styles.menuIconBox, { backgroundColor: COLORS.primaryLight }]}>
            <Ionicons name="call-outline" size={18} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppText variant="body" semibold>
                Tổ Trưởng TDP
              </AppText>
              <Badge label="Trực ban 24/7" tone="warning" />
            </View>
            <AppText variant="caption" color={COLORS.primary}>
              0987.654.321
            </AppText>
          </View>
          <TouchableOpacity
            onPress={() => Linking.openURL('tel:0987654321')}
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
          <AppText variant="label" color={COLORS.primary}>
            HỘ GIA ĐÌNH & CỘNG ĐỒNG
          </AppText>
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
                      <AppText variant="body" semibold>
                        {m.fullName}
                      </AppText>
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

          <TouchableOpacity
            style={[styles.menuRow, styles.dividerTop]}
            onPress={() => openHistoryAt('POSTS')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: COLORS.secondaryLight }]}>
                <Ionicons name="time-outline" size={18} color={COLORS.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="body" semibold>
                  Lịch sử hoạt động của tôi
                </AppText>
                <AppText variant="caption" color={COLORS.textMuted}>
                  Bài viết, phản ánh & sự kiện đã tham gia
                </AppText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

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
                  <AppText variant="body" semibold>
                    Quản lý Cư dân & Hộ gia đình
                  </AppText>
                  <AppText variant="caption" color={COLORS.textMuted}>
                    Cổng công vụ Tổ trưởng / Cán bộ
                  </AppText>
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
              <AppText variant="body" style={{ marginLeft: 10 }}>
                Nhận thông báo khẩn từ tổ
              </AppText>
            </View>
            <Switch
              value={settings?.pushAnnouncements ?? true}
              onValueChange={(val) => updateSettings.mutate({ pushAnnouncements: val })}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabelWrap}>
              <View style={[styles.menuIconBox, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
              </View>
              <AppText variant="body" style={{ marginLeft: 10 }}>
                Nhận thông báo sự kiện tổ
              </AppText>
            </View>
            <Switch
              value={settings?.pushEvents ?? true}
              onValueChange={(val) => updateSettings.mutate({ pushEvents: val })}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabelWrap}>
              <View style={[styles.menuIconBox, { backgroundColor: COLORS.dangerLight }]}>
                <Ionicons name="warning-outline" size={18} color={COLORS.danger} />
              </View>
              <AppText variant="body" style={{ marginLeft: 10 }}>
                Cập nhật tiến độ phản ánh
              </AppText>
            </View>
            <Switch
              value={settings?.pushReports ?? true}
              onValueChange={(val) => updateSettings.mutate({ pushReports: val })}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabelWrap}>
              <View style={[styles.menuIconBox, { backgroundColor: COLORS.secondaryLight }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={COLORS.secondary} />
              </View>
              <AppText variant="body" style={{ marginLeft: 10 }}>
                Nhận tin nhắn mới
              </AppText>
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
              <AppText variant="body" style={{ marginLeft: 10 }}>
                Hiển thị SĐT với cư dân khác
              </AppText>
            </View>
            <Switch
              value={settings?.showPhoneNumber ?? false}
              onValueChange={(val) => updateSettings.mutate({ showPhoneNumber: val })}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
            />
          </View>

          {/* Direct Message Privacy Selector */}
          <View style={[styles.dividerTop, { gap: 8 }]}>
            <AppText variant="caption" color={COLORS.textSecondary} semibold>
              Ai có thể nhắn tin trực tiếp cho bạn?
            </AppText>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { key: 'NEIGHBORHOOD_ONLY', label: 'Cư dân trong tổ' },
                { key: 'OFFICERS_ONLY', label: 'Chỉ Ban điều hành' },
              ].map((opt) => {
                const currentPolicy = settings?.allowDirectMessage || 'NEIGHBORHOOD_ONLY';
                const active = currentPolicy === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => updateSettings.mutate({ allowDirectMessage: opt.key })}
                    style={[styles.policyChip, active && styles.policyChipActive]}
                  >
                    <AppText
                      variant="caption"
                      semibold={active}
                      color={active ? COLORS.primary : COLORS.textSecondary}
                    >
                      {opt.label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.menuRow, styles.dividerTop]}
            onPress={() => setShowPwdForm(!showPwdForm)}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="key-outline" size={18} color={COLORS.primary} />
              </View>
              <AppText variant="body" semibold>
                Đổi mật khẩu tài khoản
              </AppText>
            </View>
            <Ionicons
              name={showPwdForm ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={COLORS.textMuted}
            />
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
            onPress={() => setDeleteModalOpen(true)}
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

      {/* Modal 1: Chỉnh sửa hồ sơ & Avatar */}
      <Modal visible={editModalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <AppCard style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <AppText variant="h3">Chỉnh sửa hồ sơ cá nhân</AppText>
              <TouchableOpacity onPress={() => setEditModalOpen(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={handlePickAvatar} style={styles.editAvatarWrap}>
              <Avatar
                name={editFullName || user.fullName}
                uri={editAvatarUri || user.avatarUrl}
                size={76}
                isOfficial={isOfficer}
              />
              <AppText variant="caption" semibold color={COLORS.primary} style={{ marginTop: 6 }}>
                Chạm để đổi ảnh đại diện
              </AppText>
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Họ và tên..."
              placeholderTextColor={COLORS.textMuted}
              value={editFullName}
              onChangeText={setEditFullName}
            />
            <TextInput
              style={styles.input}
              placeholder="Email (không bắt buộc)..."
              placeholderTextColor={COLORS.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={editEmail}
              onChangeText={setEditEmail}
            />

            <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs }}>
              <AppButton
                title="Hủy"
                variant="outline"
                onPress={() => setEditModalOpen(false)}
                style={{ flex: 1 }}
              />
              <AppButton
                title="Lưu thay đổi"
                onPress={handleSaveProfile}
                loading={updateProfile.isPending}
                style={{ flex: 1 }}
              />
            </View>
          </AppCard>
        </View>
      </Modal>

      {/* Modal 2: Thẻ Cư dân số & Mã QR */}
      <Modal visible={qrModalOpen} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <AppCard style={styles.qrModalCard}>
            <View style={styles.modalHeaderRow}>
              <AppText variant="h3">Thẻ Cư dân điện tử</AppText>
              <TouchableOpacity onPress={() => setQrModalOpen(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.qrCenterBox}>
              <View style={styles.qrIconFrame}>
                <Ionicons name="qr-code" size={110} color={COLORS.primary} />
              </View>
              <AppText variant="h3" style={{ marginTop: 10 }}>
                {user.fullName}
              </AppText>
              <AppText variant="caption" color={COLORS.primary} semibold>
                {citizenCode} • {getRoleLabel(user.role, user.staffTitle)}
              </AppText>
              <AppText variant="caption" color={COLORS.textSecondary} style={{ marginTop: 4 }}>
                SĐT: {user.phoneNumber}
              </AppText>
              <AppText variant="caption" color={COLORS.textSecondary}>
                {household
                  ? `Hộ ${household.code} - Số ${household.houseNumber}, ${household.street}`
                  : user.neighborhoodName || 'Tổ dân phố'}
              </AppText>
            </View>

            <AppButton title="Đóng" onPress={() => setQrModalOpen(false)} fullWidth />
          </AppCard>
        </View>
      </Modal>

      {/* Modal 3: Lịch sử hoạt động của tôi */}
      <Modal visible={historyModalOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <TouchableOpacity onPress={() => setHistoryModalOpen(false)}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <AppText variant="h3">Lịch sử hoạt động</AppText>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.historyTabs}>
            {[
              { key: 'POSTS' as const, label: `Bài viết (${history?.posts?.length ?? 0})` },
              { key: 'REPORTS' as const, label: `Phản ánh (${history?.reports?.length ?? 0})` },
              { key: 'EVENTS' as const, label: `Sự kiện (${history?.events?.length ?? 0})` },
            ].map((t) => {
              const active = historyTab === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setHistoryTab(t.key)}
                  style={[styles.historyTabBtn, active && styles.historyTabActive]}
                >
                  <AppText
                    variant="caption"
                    semibold={active}
                    color={active ? COLORS.primary : COLORS.textSecondary}
                  >
                    {t.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          <FlatList
            data={
              historyTab === 'POSTS'
                ? history?.posts ?? []
                : historyTab === 'REPORTS'
                  ? history?.reports ?? []
                  : history?.events ?? []
            }
            keyExtractor={(item: any) => item.id}
            contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md }}
            renderItem={({ item }: { item: any }) => {
              if (historyTab === 'POSTS') {
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setHistoryModalOpen(false);
                      router.push(`/(tabs)/feed/post/${item.id}` as any);
                    }}
                  >
                    <AppCard style={{ gap: 4 }}>
                      <AppText variant="h3" numberOfLines={1} style={{ fontSize: 15 }}>
                        {item.title || 'Bài viết cộng đồng'}
                      </AppText>
                      <AppText variant="body" color={COLORS.textSecondary} numberOfLines={2}>
                        {item.content}
                      </AppText>
                      <AppText variant="caption" color={COLORS.textMuted}>
                        {formatRelativeTimeVi(item.createdAt)}
                      </AppText>
                    </AppCard>
                  </TouchableOpacity>
                );
              }
              if (historyTab === 'REPORTS') {
                return (
                  <TouchableOpacity
                    disabled={!item.postId}
                    onPress={() => {
                      if (item.postId) {
                        setHistoryModalOpen(false);
                        router.push(`/(tabs)/feed/post/${item.postId}` as any);
                      }
                    }}
                  >
                    <AppCard style={{ gap: 4 }}>
                      <View style={styles.modalHeaderRow}>
                        <Badge label={item.code || 'PHẢN ÁNH'} tone="danger" />
                        <Badge label={item.status} tone="primary" />
                      </View>
                      <AppText variant="h3" numberOfLines={1} style={{ fontSize: 15 }}>
                        {item.title}
                      </AppText>
                      <AppText variant="body" color={COLORS.textSecondary} numberOfLines={2}>
                        {item.description}
                      </AppText>
                      <AppText variant="caption" color={COLORS.textMuted}>
                        {formatRelativeTimeVi(item.createdAt)}
                      </AppText>
                    </AppCard>
                  </TouchableOpacity>
                );
              }
              const ev = item.event || item;
              return (
                <AppCard style={{ gap: 4 }}>
                  <Badge label={item.status || 'REGISTERED'} tone="success" />
                  <AppText variant="h3" style={{ fontSize: 15 }}>
                    {ev.title || 'Sự kiện tổ dân phố'}
                  </AppText>
                  <AppText variant="caption" color={COLORS.textSecondary}>
                    {ev.locationName || ''}
                  </AppText>
                </AppCard>
              );
            }}
            ListEmptyComponent={
              <EmptyState
                icon="document-text-outline"
                title="Chưa có dữ liệu"
                description="Hoạt động của bạn sẽ được lưu lại tại đây."
              />
            }
          />
        </View>
      </Modal>

      {/* Modal 4: Yêu cầu xóa tài khoản */}
      <Modal visible={deleteModalOpen} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <AppCard style={styles.modalCard}>
            <AppText variant="h3" color={COLORS.danger}>
              Yêu cầu xóa tài khoản
            </AppText>
            <AppText variant="body" color={COLORS.textSecondary}>
              Tài khoản sẽ chuyển sang trạng thái chờ duyệt xóa và tạm ngừng hoạt động.
            </AppText>
            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              placeholder="Nhập lý do yêu cầu xóa tài khoản..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              textAlignVertical="top"
              value={deleteReason}
              onChangeText={setDeleteReason}
            />
            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              <AppButton
                title="Hủy"
                variant="outline"
                onPress={() => setDeleteModalOpen(false)}
                style={{ flex: 1 }}
              />
              <AppButton
                title="Gửi yêu cầu"
                variant="danger"
                onPress={handleConfirmDeleteAccount}
                loading={requestDeletion.isPending}
                style={{ flex: 1 }}
              />
            </View>
          </AppCard>
        </View>
      </Modal>
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
    backgroundColor: '#2A221D',
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
    borderColor: '#EF4444',
    gap: SPACING.md,
  },
  vneidTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vneidVerifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  qrPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13,18,22,0.75)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  heroUserRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  avatarEditBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: '#B91C1C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeTag: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  addressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },

  statsCard: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.md },
  statCol: { flex: 1, alignItems: 'center', gap: 4 },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  leaderCallCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
  },
  callNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
  },

  groupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  section: { gap: SPACING.md },
  menuRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
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
  policyChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  policyChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },

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

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: { gap: SPACING.md },
  qrModalCard: { gap: SPACING.md },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editAvatarWrap: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  qrCenterBox: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  qrIconFrame: {
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.primarySoft,
  },

  historyContainer: { flex: 1, backgroundColor: COLORS.background },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#2A221D',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  historyTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  historyTabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  historyTabActive: {
    borderBottomColor: COLORS.primary,
  },
});
