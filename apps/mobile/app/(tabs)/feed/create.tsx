import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { PostCategory } from '@todanpho/shared';
import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { AppButton, AppCard, AppText, Avatar } from '@/components';
import {
  LocationPickerModal,
  SelectedLocation,
} from '@/components/LocationPickerModal';
import { useCreatePost } from '@/services/feedService';
import { isLeaderRole, isOfficerRole, useAuthStore } from '@/store/useAuthStore';
import { getRoleLabel } from '@/utils/date';

const CATEGORIES: { key: PostCategory; label: string }[] = [
  { key: PostCategory.LIFE, label: 'Đời sống' },
  { key: PostCategory.WARNING, label: 'Cảnh báo' },
  { key: PostCategory.EVENT_RECAP, label: 'Hoạt động tổ' },
];

export default function CreatePostScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canOfficer = isOfficerRole(user?.role);
  const canLead = isLeaderRole(user?.role);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<PostCategory>(PostCategory.LIFE);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [location, setLocation] = useState<SelectedLocation | null>(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [isOfficial, setIsOfficial] = useState(canOfficer);
  const [isPinned, setIsPinned] = useState(false);

  const createPost = useCreatePost();

  const handlePickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setMediaUrls((prev) => [...prev, ...uris].slice(0, 4));
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Chưa cấp quyền Camera', 'Vui lòng cho phép truy cập Camera để chụp ảnh trực tiếp.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setMediaUrls((prev) => [...prev, result.assets[0].uri].slice(0, 4));
    }
  };

  const handleSubmit = () => {
    if (content.trim().length < 2) {
      Alert.alert('Thiếu nội dung', 'Vui lòng nhập nội dung bài viết (tối thiểu 2 ký tự).');
      return;
    }

    createPost.mutate(
      {
        title: title.trim() || undefined,
        content: content.trim(),
        category,
        isOfficial: canOfficer ? isOfficial : false,
        isPinned: canLead ? isPinned : false,
        locationName: location?.locationName,
        latitude: location?.latitude,
        longitude: location?.longitude,
        mediaUrls,
      },
      {
        onSuccess: () => {
          router.back();
        },
        onError: (err: any) => {
          Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể đăng bài viết');
        },
      },
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppCard style={styles.authorCard}>
        <Avatar
          name={user?.fullName || 'CD'}
          uri={user?.avatarUrl}
          size={44}
          isOfficial={canOfficer}
        />
        <View style={styles.authorInfo}>
          <AppText variant="h3">{user?.fullName || 'Cư dân'}</AppText>
          <AppText variant="caption" color={COLORS.textSecondary}>
            {user ? getRoleLabel(user.role, user.staffTitle) : 'Cư dân'} • {user?.neighborhoodName || 'Tổ dân phố'}
          </AppText>
        </View>
      </AppCard>

      <AppCard>
        <AppText variant="label" color={COLORS.textSecondary} style={styles.catLabel}>
          Phân loại bài viết
        </AppText>
        <View style={styles.catRow}>
          {CATEGORIES.map((cat) => {
            const active = category === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                onPress={() => setCategory(cat.key)}
                style={[styles.catChip, active && styles.catChipActive]}
              >
                <AppText
                  variant="caption"
                  semibold={active}
                  color={active ? COLORS.textInverse : COLORS.textSecondary}
                >
                  {cat.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          style={styles.titleInput}
          placeholder="Tiêu đề (không bắt buộc)..."
          placeholderTextColor={COLORS.textMuted}
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          style={styles.textArea}
          placeholder="Chia sẻ thông tin, cảnh báo hoặc hoạt động cộng đồng tới bà con..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          textAlignVertical="top"
          value={content}
          onChangeText={setContent}
        />

        {location && (
          <View style={styles.selectedLocationRow}>
            <Ionicons name="location" size={16} color={COLORS.primary} />
            <AppText variant="caption" semibold color={COLORS.primary} style={{ flex: 1, marginLeft: 6 }}>
              {location.locationName}
            </AppText>
            <TouchableOpacity onPress={() => setLocation(null)}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {mediaUrls.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewRow}>
            {mediaUrls.map((uri, idx) => (
              <View key={`${uri}-${idx}`} style={styles.previewBox}>
                <Image source={{ uri }} style={styles.previewImg} />
                <TouchableOpacity
                  onPress={() => setMediaUrls((prev) => prev.filter((_, i) => i !== idx))}
                  style={styles.removeImgBtn}
                >
                  <Ionicons name="close-circle" size={22} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {/* 3 nút công cụ: Chọn ảnh từ máy | Chụp ảnh trực tiếp | Bản đồ chọn vị trí */}
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={handlePickFromLibrary} style={styles.toolBtn}>
            <Ionicons name="images-outline" size={20} color={COLORS.primary} />
            <AppText variant="caption" semibold color={COLORS.primary} style={styles.toolLabel}>
              Chọn ảnh ({mediaUrls.length}/4)
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleTakePhoto} style={styles.toolBtn}>
            <Ionicons name="camera-outline" size={20} color={COLORS.secondary} />
            <AppText variant="caption" semibold color={COLORS.secondary} style={styles.toolLabel}>
              Chụp ảnh
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMapPickerOpen(true)} style={styles.toolBtn}>
            <Ionicons name="map-outline" size={20} color={COLORS.warning} />
            <AppText variant="caption" semibold color={COLORS.warning} style={styles.toolLabel}>
              Vị trí bản đồ
            </AppText>
          </TouchableOpacity>
        </View>
      </AppCard>

      {canOfficer && (
        <AppCard style={styles.leaderOptions}>
          <View style={styles.switchRow}>
            <View style={styles.switchMeta}>
              <AppText variant="body" semibold>
                Gắn nhãn Ban điều hành
              </AppText>
              <AppText variant="caption" color={COLORS.textSecondary}>
                Hiển thị huy hiệu thông báo chính thức từ tổ dân phố
              </AppText>
            </View>
            <Switch value={isOfficial} onValueChange={setIsOfficial} />
          </View>

          {canLead && (
            <View style={[styles.switchRow, styles.switchDivider]}>
              <View style={styles.switchMeta}>
                <AppText variant="body" semibold>
                  Ghim lên đầu bảng tin
                </AppText>
                <AppText variant="caption" color={COLORS.textSecondary}>
                  Giữ bài viết luôn xuất hiện đầu tiên khi cư dân mở app
                </AppText>
              </View>
              <Switch value={isPinned} onValueChange={setIsPinned} />
            </View>
          )}
        </AppCard>
      )}

      <AppButton
        title="Đăng lên bảng tin"
        onPress={handleSubmit}
        loading={createPost.isPending}
        fullWidth
      />

      <LocationPickerModal
        visible={mapPickerOpen}
        initialLocation={location}
        onClose={() => setMapPickerOpen(false)}
        onSelect={setLocation}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, gap: SPACING.md },
  authorCard: { flexDirection: 'row', alignItems: 'center' },
  authorInfo: { marginLeft: SPACING.md },
  catLabel: { marginBottom: SPACING.xs },
  catRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  catChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
  },
  catChipActive: { backgroundColor: COLORS.primary },
  titleInput: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  textArea: {
    minHeight: 130,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  selectedLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  previewRow: { marginBottom: SPACING.md },
  previewBox: { position: 'relative', marginRight: SPACING.sm },
  previewImg: { width: 100, height: 100, borderRadius: RADIUS.md },
  removeImgBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    gap: SPACING.xs,
  },
  toolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
  },
  toolLabel: { marginLeft: 4 },
  leaderOptions: { gap: SPACING.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchMeta: { flex: 1, paddingRight: SPACING.md },
  switchDivider: {
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
});
