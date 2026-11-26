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
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
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

const CATEGORIES: { key: PostCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: PostCategory.LIFE, label: 'Đời sống khu phố', icon: 'sunny-outline' },
  { key: PostCategory.WARNING, label: 'Cảnh báo / An ninh', icon: 'warning-outline' },
  { key: PostCategory.EVENT_RECAP, label: 'Hoạt động cộng đồng', icon: 'people-outline' },
];

const QUICK_LANDMARKS: SelectedLocation[] = [
  { locationName: 'Nhà văn hóa Tổ dân phố', latitude: 21.0182, longitude: 105.8014 },
  { locationName: 'Trụ sở Tuần tra & Công an', latitude: 21.0188, longitude: 105.8021 },
  { locationName: 'Sân chơi sinh hoạt chung', latitude: 21.0175, longitude: 105.8008 },
  { locationName: 'Cổng ngõ khu dân cư', latitude: 21.0191, longitude: 105.8011 },
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
  const [gpsLoading, setGpsLoading] = useState(false);
  const [isOfficial, setIsOfficial] = useState(canOfficer);
  const [isPinned, setIsPinned] = useState(false);

  const createPost = useCreatePost();

  const handleGetCurrentGps = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Chưa cấp quyền vị trí', 'Vui lòng cho phép truy cập GPS để gắn vị trí tự động.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({
        locationName: location?.locationName || `Vị trí hiện tại (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
    } catch {
      Alert.alert('Không thể lấy GPS', 'Bạn có thể chọn nhanh điểm mốc bên dưới hoặc mở bản đồ.');
    } finally {
      setGpsLoading(false);
    }
  };

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
      {/* Top Status Row */}
      <View style={styles.topMetaRow}>
        <View style={styles.neighborhoodBadge}>
          <View style={styles.greenDot} />
          <AppText variant="label" color={COLORS.secondary}>
            {user?.neighborhoodName || 'TỔ DÂN PHỐ'}
          </AppText>
        </View>
        <View style={styles.draftBadge}>
          <Ionicons name="cloud-done-outline" size={14} color={COLORS.primary} />
          <AppText variant="caption" color={COLORS.primary} style={{ marginLeft: 4 }}>
            Sẵn sàng đăng
          </AppText>
        </View>
      </View>

      {/* Author Strip */}
      <AppCard style={styles.authorCard}>
        <Avatar
          name={user?.fullName || 'CD'}
          uri={user?.avatarUrl}
          size={42}
          isOfficial={canOfficer}
        />
        <View style={styles.authorInfo}>
          <AppText variant="h3" style={{ fontSize: 15 }}>{user?.fullName || 'Cư dân'}</AppText>
          <AppText variant="caption" color={COLORS.textSecondary}>
            {user ? getRoleLabel(user.role, user.staffTitle) : 'Cư dân'}
          </AppText>
        </View>
      </AppCard>

      {/* Category Pill Selector */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionTitleRow}>
          <AppText variant="label" color={COLORS.textPrimary}>
            Lĩnh vực bài viết <AppText variant="label" color={COLORS.danger}>*</AppText>
          </AppText>
          <AppText variant="caption" color={COLORS.textMuted}>Chọn 1 mục</AppText>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {CATEGORIES.map((cat) => {
            const active = category === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                onPress={() => setCategory(cat.key)}
                style={[styles.catChip, active && styles.catChipActive]}
              >
                <Ionicons
                  name={cat.icon}
                  size={15}
                  color={active ? COLORS.textInverse : COLORS.primary}
                />
                <AppText
                  variant="caption"
                  semibold={active}
                  color={active ? COLORS.textInverse : COLORS.textPrimary}
                  style={{ marginLeft: 6 }}
                >
                  {cat.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Media Section (Camera + Gallery) */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionTitleRow}>
          <AppText variant="label" color={COLORS.textPrimary}>
            Hình ảnh đính kèm ({mediaUrls.length}/4)
          </AppText>
        </View>
        <View style={styles.mediaActionGrid}>
          <TouchableOpacity onPress={handleTakePhoto} style={styles.mediaActionCard}>
            <View style={styles.mediaActionIconBox}>
              <Ionicons name="camera" size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" semibold color={COLORS.primary}>
                Chụp ảnh trực tiếp
              </AppText>
              <AppText variant="caption" color={COLORS.textMuted} style={{ fontSize: 11 }}>
                Tự động gắn GPS
              </AppText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={handlePickFromLibrary} style={styles.mediaActionCard}>
            <View style={styles.mediaActionIconBox}>
              <Ionicons name="images" size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" semibold color={COLORS.textPrimary}>
                Chọn ảnh từ máy
              </AppText>
              <AppText variant="caption" color={COLORS.textMuted} style={{ fontSize: 11 }}>
                Từ thư viện ảnh
              </AppText>
            </View>
          </TouchableOpacity>
        </View>

        {mediaUrls.length > 0 && (
          <View style={styles.thumbGrid}>
            {mediaUrls.map((uri, idx) => (
              <View key={`${uri}-${idx}`} style={styles.thumbWrap}>
                <Image source={{ uri }} style={styles.thumb} />
                <View style={styles.thumbOverlayBadge}>
                  <Ionicons name="location" size={10} color={COLORS.textInverse} />
                  <AppText variant="caption" color={COLORS.textInverse} style={{ fontSize: 10, marginLeft: 2 }}>
                    Ảnh #{idx + 1}
                  </AppText>
                </View>
                <TouchableOpacity
                  onPress={() => setMediaUrls((prev) => prev.filter((_, i) => i !== idx))}
                  style={styles.removeBtn}
                >
                  <Ionicons name="close-circle" size={22} color={COLORS.textInverse} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Location & Landmarks Card */}
      <AppCard style={styles.locationCard}>
        <View style={styles.sectionTitleRow}>
          <AppText variant="label" color={COLORS.textPrimary}>
            Vị trí & Điểm mốc
          </AppText>
          {location && (
            <AppText variant="caption" color={COLORS.secondary} semibold>
              • Đã gắn vị trí
            </AppText>
          )}
        </View>

        <View style={styles.gpsBar}>
          <TouchableOpacity onPress={handleGetCurrentGps} style={styles.gpsBtn} disabled={gpsLoading}>
            {gpsLoading ? (
              <ActivityIndicator size="small" color={COLORS.textInverse} />
            ) : (
              <Ionicons name="locate" size={15} color={COLORS.textInverse} />
            )}
            <AppText variant="caption" semibold color={COLORS.textInverse} style={{ marginLeft: 5 }}>
              Lấy GPS hiện tại
            </AppText>
          </TouchableOpacity>
          <AppText variant="caption" color={COLORS.textSecondary} numberOfLines={1} style={{ flex: 1 }}>
            {location
              ? `${location.latitude.toFixed(4)}° N, ${location.longitude.toFixed(4)}° E`
              : 'Chưa lấy tọa độ'}
          </AppText>
        </View>

        {/* Map Preview Box */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setMapPickerOpen(true)}
          style={styles.mapPreviewBox}
        >
          <View style={styles.mapPinBadge}>
            <Ionicons name="location" size={18} color={COLORS.textInverse} />
          </View>
          <View style={styles.mapGhimPill}>
            <AppText variant="caption" semibold color={COLORS.textInverse} style={{ fontSize: 11 }}>
              {location ? location.locationName : 'Chạm để mở bản đồ & ghim vị trí'}
            </AppText>
          </View>
          <View style={styles.mapFullBtn}>
            <Ionicons name="expand-outline" size={13} color={COLORS.primary} />
            <AppText variant="caption" semibold color={COLORS.primary} style={{ marginLeft: 4, fontSize: 11 }}>
              Bản đồ
            </AppText>
          </View>
        </TouchableOpacity>

        <AppText variant="caption" semibold color={COLORS.textSecondary} style={{ marginTop: SPACING.sm }}>
          Điểm mốc Tổ dân phố (chọn nhanh)
        </AppText>
        <View style={styles.landmarkRow}>
          {QUICK_LANDMARKS.map((lm) => {
            const active = location?.locationName === lm.locationName;
            return (
              <TouchableOpacity
                key={lm.locationName}
                onPress={() => setLocation(lm)}
                style={[styles.landmarkChip, active && styles.landmarkChipActive]}
              >
                <AppText
                  variant="caption"
                  color={active ? COLORS.primary : COLORS.textSecondary}
                  semibold={active}
                >
                  {lm.locationName}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </AppCard>

      {/* Title & Content */}
      <AppCard style={styles.inputCard}>
        <AppText variant="label" color={COLORS.textPrimary} style={styles.inputLabel}>
          Tiêu đề bài viết
        </AppText>
        <TextInput
          style={styles.titleInput}
          placeholder="Nhập tiêu đề ngắn gọn (không bắt buộc)..."
          placeholderTextColor={COLORS.textMuted}
          value={title}
          onChangeText={setTitle}
        />

        <View style={[styles.sectionTitleRow, { marginTop: SPACING.md }]}>
          <AppText variant="label" color={COLORS.textPrimary}>
            Nội dung chi tiết <AppText variant="label" color={COLORS.danger}>*</AppText>
          </AppText>
          <AppText variant="caption" color={COLORS.textMuted}>
            {content.length}/500 ký tự
          </AppText>
        </View>
        <TextInput
          style={styles.contentInput}
          placeholder="Chia sẻ thông tin, tin tức hoặc hoạt động với cư dân Tổ dân phố..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          maxLength={500}
          textAlignVertical="top"
          value={content}
          onChangeText={setContent}
        />
      </AppCard>

      {canOfficer && (
        <AppCard style={styles.optionsCard}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="body" semibold>Đăng dưới danh nghĩa Ban điều hành</AppText>
              <AppText variant="caption" color={COLORS.textSecondary}>
                Hiển thị huy hiệu chính thức của Tổ dân phố
              </AppText>
            </View>
            <Switch value={isOfficial} onValueChange={setIsOfficial} trackColor={{ true: COLORS.primary }} />
          </View>
          {canLead && (
            <View style={[styles.switchRow, { marginTop: SPACING.md }]}>
              <View style={{ flex: 1 }}>
                <AppText variant="body" semibold>Ghim lên đầu bảng tin</AppText>
                <AppText variant="caption" color={COLORS.textSecondary}>
                  Thông báo quan trọng cần mọi cư dân chú ý
                </AppText>
              </View>
              <Switch value={isPinned} onValueChange={setIsPinned} trackColor={{ true: COLORS.primary }} />
            </View>
          )}
        </AppCard>
      )}

      <AppButton
        title="Đăng bài lên bảng tin"
        onPress={handleSubmit}
        loading={createPost.isPending}
        fullWidth
        icon={<Ionicons name="paper-plane-outline" size={18} color={COLORS.textInverse} />}
      />

      <LocationPickerModal
        visible={mapPickerOpen}
        initialLocation={location}
        onClose={() => setMapPickerOpen(false)}
        onSelect={(loc) => setLocation(loc)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 40 },
  topMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  neighborhoodBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.secondary },
  draftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  authorCard: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md },
  authorInfo: { marginLeft: SPACING.md },
  sectionBlock: { gap: SPACING.sm },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catScroll: { gap: SPACING.sm },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },

  mediaActionGrid: { flexDirection: 'row', gap: SPACING.sm },
  mediaActionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.primarySoft,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
  },
  mediaActionIconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: 4 },
  thumbWrap: { position: 'relative', width: '48%' },
  thumb: { width: '100%', height: 110, borderRadius: RADIUS.lg },
  thumbOverlayBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.72)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  removeBtn: { position: 'absolute', top: 4, right: 4 },

  locationCard: { gap: SPACING.sm },
  gpsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceAlt,
    padding: 6,
    borderRadius: RADIUS.lg,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  mapPreviewBox: {
    height: 116,
    borderRadius: RADIUS.lg,
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  mapPinBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  mapGhimPill: {
    backgroundColor: '#131B2E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  mapFullBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.md,
  },
  landmarkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  landmarkChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  landmarkChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },

  inputCard: { gap: SPACING.xs },
  inputLabel: { marginBottom: 4 },
  titleInput: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
  },
  contentInput: {
    fontSize: 15,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    minHeight: 110,
  },
  optionsCard: { gap: SPACING.xs },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md },
});
