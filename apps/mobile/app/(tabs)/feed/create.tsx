import React, { useEffect, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import {
  PostCategory,
  PostType,
  ReportCategory,
  ReportPriority,
  ReportVisibility,
} from '@todanpho/shared';
import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { AppButton, AppCard, AppText, Avatar } from '@/components';
import {
  LocationPickerModal,
  SelectedLocation,
} from '@/components/LocationPickerModal';
import { useCreatePost } from '@/services/feedService';
import { isLeaderRole, isOfficerRole, useAuthStore } from '@/store/useAuthStore';
import { getRoleLabel } from '@/utils/date';

type ComposerTopic =
  | { kind: 'POST'; category: PostCategory; label: string; icon: keyof typeof Ionicons.glyphMap }
  | { kind: 'REPORT'; label: string; icon: keyof typeof Ionicons.glyphMap };

const TOPICS: ComposerTopic[] = [
  { kind: 'POST', category: PostCategory.LIFE, label: 'Tin tức / Đời sống', icon: 'sunny-outline' },
  { kind: 'REPORT', label: 'Phản ánh sự cố', icon: 'warning-outline' },
  { kind: 'POST', category: PostCategory.WARNING, label: 'Cảnh báo khẩn', icon: 'alert-circle-outline' },
  { kind: 'POST', category: PostCategory.EVENT_RECAP, label: 'Hoạt động tổ', icon: 'people-outline' },
];

const REPORT_SUBCATEGORIES: { key: ReportCategory; label: string }[] = [
  { key: ReportCategory.INFRASTRUCTURE, label: 'Hạ tầng / Đường ngõ' },
  { key: ReportCategory.LIGHTING, label: 'Đèn chiếu sáng' },
  { key: ReportCategory.SANITATION, label: 'Rác thải / Vệ sinh' },
  { key: ReportCategory.SECURITY, label: 'An ninh trật tự' },
  { key: ReportCategory.OTHER, label: 'Khác' },
];

const PRIORITIES: { key: ReportPriority; label: string }[] = [
  { key: ReportPriority.NORMAL, label: 'Bình thường' },
  { key: ReportPriority.HIGH, label: 'Cần xử lý sớm' },
  { key: ReportPriority.URGENT, label: 'Khẩn cấp' },
];

const QUICK_LANDMARKS: SelectedLocation[] = [
  { locationName: 'Nhà văn hóa Tổ dân phố', latitude: 21.0182, longitude: 105.8014 },
  { locationName: 'Trụ sở Tuần tra & Công an', latitude: 21.0188, longitude: 105.8021 },
  { locationName: 'Sân chơi sinh hoạt chung', latitude: 21.0175, longitude: 105.8008 },
  { locationName: 'Cổng ngõ khu dân cư', latitude: 21.0191, longitude: 105.8011 },
];

export default function UnifiedCreateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; openMap?: string }>();
  const user = useAuthStore((s) => s.user);
  const canOfficer = isOfficerRole(user?.role);
  const canLead = isLeaderRole(user?.role);

  const [selectedTopicIdx, setSelectedTopicIdx] = useState(params.mode === 'REPORT' ? 1 : 0);
  const [reportSubCat, setReportSubCat] = useState<ReportCategory>(ReportCategory.INFRASTRUCTURE);
  const [priority, setPriority] = useState<ReportPriority>(ReportPriority.NORMAL);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [location, setLocation] = useState<SelectedLocation | null>(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(params.openMap === '1');
  const [gpsLoading, setGpsLoading] = useState(false);

  const [isPrivateReport, setIsPrivateReport] = useState(false);
  const [isOfficial, setIsOfficial] = useState(canOfficer);
  const [isPinned, setIsPinned] = useState(false);

  const createPost = useCreatePost();

  useEffect(() => {
    if (params.mode === 'REPORT') setSelectedTopicIdx(1);
    if (params.openMap === '1') setMapPickerOpen(true);
  }, [params.mode, params.openMap]);

  const activeTopic = TOPICS[selectedTopicIdx];
  const isReportMode = activeTopic.kind === 'REPORT';

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
        locationName:
          location?.locationName ||
          `Vị trí hiện tại (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`,
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
    if (isReportMode && (!title.trim() || content.trim().length < 2)) {
      Alert.alert('Thiếu thông tin', 'Khi phản ánh sự cố, vui lòng nhập tiêu đề và mô tả chi tiết.');
      return;
    }

    if (!isReportMode && content.trim().length < 2) {
      Alert.alert('Thiếu nội dung', 'Vui lòng nhập nội dung bài viết (tối thiểu 2 ký tự).');
      return;
    }

    createPost.mutate(
      {
        type: isReportMode ? PostType.INCIDENT : PostType.NORMAL,
        title: title.trim() || undefined,
        content: content.trim(),
        category: activeTopic.kind === 'POST' ? activeTopic.category : PostCategory.WARNING,
        isOfficial: !isReportMode && canOfficer ? isOfficial : false,
        isPinned: !isReportMode && canLead ? isPinned : false,
        locationName: location?.locationName,
        latitude: location?.latitude,
        longitude: location?.longitude,
        mediaUrls,
        ...(isReportMode
          ? {
              incidentCategory: reportSubCat,
              incidentPriority: priority,
              incidentVisibility: isPrivateReport
                ? ReportVisibility.PRIVATE
                : ReportVisibility.PUBLIC,
            }
          : {}),
      },
      {
        onSuccess: (created) => {
          if (isReportMode) {
            Alert.alert(
              'Đã gửi phản ánh',
              `Mã phản ánh ${created.incidentReport?.code || ''} đã được ghi nhận và thông báo cho Ban điều hành.`,
            );
          }
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
      {/* Facebook-style Author Header */}
      <AppCard style={styles.authorCard}>
        <Avatar
          name={user?.fullName || 'CD'}
          uri={user?.avatarUrl}
          size={44}
          isOfficial={canOfficer}
        />
        <View style={styles.authorInfo}>
          <AppText variant="h3" style={{ fontSize: 16 }}>{user?.fullName || 'Cư dân'}</AppText>
          <AppText variant="caption" color={COLORS.textSecondary}>
            {user ? getRoleLabel(user.role, user.staffTitle) : 'Cư dân'} • {user?.neighborhoodName || 'Tổ dân phố'}
          </AppText>
        </View>
      </AppCard>

      {/* Unified Topic Selector */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionTitleRow}>
          <AppText variant="label" color={COLORS.textPrimary}>Chủ đề bài viết</AppText>
          <AppText variant="caption" color={COLORS.primary}>Chọn 1 loại</AppText>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {TOPICS.map((t, idx) => {
            const active = selectedTopicIdx === idx;
            const isRep = t.kind === 'REPORT';
            return (
              <TouchableOpacity
                key={t.label}
                onPress={() => setSelectedTopicIdx(idx)}
                style={[
                  styles.catChip,
                  active && (isRep ? styles.catChipReportActive : styles.catChipActive),
                ]}
              >
                <Ionicons
                  name={t.icon}
                  size={15}
                  color={active ? (isRep ? COLORS.danger : COLORS.primary) : COLORS.textSecondary}
                />
                <AppText
                  variant="caption"
                  semibold={active}
                  color={active ? (isRep ? COLORS.danger : COLORS.primary) : COLORS.textPrimary}
                  style={{ marginLeft: 6 }}
                >
                  {t.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Incident details when Phản ánh sự cố is selected */}
      {isReportMode && (
        <AppCard style={styles.reportSubCard}>
          <AppText variant="label" color={COLORS.danger} style={{ marginBottom: 8 }}>
            Mức độ khẩn thiết
          </AppText>
          <View style={[styles.landmarkRow, { marginBottom: SPACING.md }]}>
            {PRIORITIES.map((p) => {
              const active = priority === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  onPress={() => setPriority(p.key)}
                  style={[styles.landmarkChip, active && styles.priorityActive]}
                >
                  <AppText
                    variant="caption"
                    color={active ? COLORS.warning : COLORS.textSecondary}
                    semibold={active}
                  >
                    {p.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          <AppText variant="label" color={COLORS.danger} style={{ marginBottom: 8 }}>
            Hạng mục sự cố hiện trường
          </AppText>
          <View style={styles.landmarkRow}>
            {REPORT_SUBCATEGORIES.map((sc) => {
              const active = reportSubCat === sc.key;
              return (
                <TouchableOpacity
                  key={sc.key}
                  onPress={() => setReportSubCat(sc.key)}
                  style={[styles.landmarkChip, active && styles.landmarkChipActive]}
                >
                  <AppText
                    variant="caption"
                    color={active ? COLORS.primary : COLORS.textSecondary}
                    semibold={active}
                  >
                    {sc.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </AppCard>
      )}

      {/* Text Composer */}
      <AppCard style={styles.inputCard}>
        <TextInput
          style={styles.titleInput}
          placeholder={isReportMode ? 'Tiêu đề sự cố (bắt buộc)...' : 'Tiêu đề bài viết (không bắt buộc)...'}
          placeholderTextColor={COLORS.textMuted}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={styles.contentInput}
          placeholder={
            isReportMode
              ? 'Mô tả chi tiết tình trạng sự cố để Ban điều hành xử lý...'
              : 'Bạn đang nghĩ gì? Chia sẻ tin tức, hình ảnh hoặc thông báo cho khu phố...'
          }
          placeholderTextColor={COLORS.textMuted}
          multiline
          maxLength={500}
          textAlignVertical="top"
          value={content}
          onChangeText={setContent}
        />
        <AppText variant="caption" color={COLORS.textMuted} style={{ textAlign: 'right' }}>
          {content.length}/500 ký tự
        </AppText>
      </AppCard>

      {/* Media Section (Camera + Gallery) */}
      <View style={styles.sectionBlock}>
        <AppText variant="label" color={COLORS.textPrimary}>
          Ảnh & Video đính kèm ({mediaUrls.length}/4)
        </AppText>
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
                Mở Camera ngay
              </AppText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={handlePickFromLibrary} style={styles.mediaActionCard}>
            <View style={styles.mediaActionIconBox}>
              <Ionicons name="images" size={20} color={COLORS.secondary} />
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
                <TouchableOpacity
                  onPress={() => setMediaUrls((prev) => prev.filter((_, i) => i !== idx))}
                  style={styles.removeBtn}
                >
                  <Ionicons name="close-circle" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Location & Map Picker */}
      <AppCard style={styles.locationCard}>
        <View style={styles.sectionTitleRow}>
          <AppText variant="label" color={COLORS.textPrimary}>
            Vị trí & Bản đồ khu phố
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

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setMapPickerOpen(true)}
          style={styles.mapPreviewBox}
        >
          <View style={styles.mapPinBadge}>
            <Ionicons name="location" size={18} color={COLORS.textInverse} />
          </View>
          <View style={styles.mapGhimPill}>
            <AppText variant="caption" semibold color={COLORS.textPrimary} style={{ fontSize: 11 }}>
              {location ? location.locationName : 'Chạm để mở bản đồ & ghim vị trí'}
            </AppText>
          </View>
        </TouchableOpacity>

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

      {/* Options */}
      {isReportMode ? (
        <AppCard style={styles.optionsCard}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="body" semibold>Gửi phản ánh riêng tư</AppText>
              <AppText variant="caption" color={COLORS.textSecondary}>
                Chỉ bạn và Tổ trưởng / Cán bộ phụ trách xem được (không hiển thị công khai)
              </AppText>
            </View>
            <Switch value={isPrivateReport} onValueChange={setIsPrivateReport} trackColor={{ true: COLORS.primary }} />
          </View>
        </AppCard>
      ) : canOfficer ? (
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
      ) : null}

      <AppButton
        title={isReportMode ? 'Đăng phản ánh sự cố' : 'Đăng bài lên bảng tin'}
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
  catChipActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  catChipReportActive: { backgroundColor: COLORS.dangerLight, borderColor: COLORS.danger },
  reportSubCard: { padding: SPACING.md, borderColor: '#5C262E' },

  inputCard: { gap: SPACING.sm },
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
    minHeight: 120,
  },

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
    height: 100,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPinBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  mapGhimPill: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
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
  priorityActive: {
    backgroundColor: COLORS.warningLight,
    borderColor: COLORS.warning,
  },
  optionsCard: { gap: SPACING.xs },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md },
});
