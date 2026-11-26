import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { AppButton, AppCard, AppText } from '@/components';
import {
  LocationPickerModal,
  SelectedLocation,
} from '@/components/LocationPickerModal';
import { useCreateReport } from '@/services/feedService';

const REPORT_CATEGORIES = [
  { key: 'LIGHTING', label: 'Chiếu sáng / Cột điện', icon: 'bulb-outline' as const },
  { key: 'SANITATION', label: 'Môi trường & Rác thải', icon: 'trash-outline' as const },
  { key: 'INFRASTRUCTURE', label: 'Hạ tầng đường xá', icon: 'construct-outline' as const },
  { key: 'SECURITY', label: 'An ninh trật tự', icon: 'shield-outline' as const },
  { key: 'OTHER', label: 'Khác', icon: 'ellipsis-horizontal-circle-outline' as const },
];

const QUICK_LANDMARKS: SelectedLocation[] = [
  { locationName: 'Nhà văn hóa Tổ dân phố', latitude: 21.0182, longitude: 105.8014 },
  { locationName: 'Trụ sở Tuần tra & Công an', latitude: 21.0188, longitude: 105.8021 },
  { locationName: 'Điểm tập kết rác T3-T5', latitude: 21.0179, longitude: 105.8005 },
  { locationName: 'Sân chơi sinh hoạt chung', latitude: 21.0175, longitude: 105.8008 },
];

export default function CreateReportScreen() {
  const router = useRouter();
  const createReport = useCreateReport();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('LIGHTING');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [location, setLocation] = useState<SelectedLocation | null>(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [notifyApp, setNotifyApp] = useState(true);

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
      setMediaUrls((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 4));
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
    if (!title.trim() || !description.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tiêu đề và mô tả sự cố.');
      return;
    }

    createReport.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        category,
        visibility: isPrivate ? 'PRIVATE' : 'PUBLIC',
        addressText: location?.locationName,
        latitude: isPrivate ? undefined : location?.latitude,
        longitude: isPrivate ? undefined : location?.longitude,
      },
      {
        onSuccess: () => {
          Alert.alert('Đã gửi phản ánh', 'Ban điều hành tổ sẽ tiếp nhận và xử lý sớm.');
          router.back();
        },
        onError: (err: any) => {
          Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể gửi phản ánh');
        },
      },
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Lĩnh vực phản ánh */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionTitleRow}>
          <AppText variant="label" color={COLORS.textPrimary}>
            Lĩnh vực phản ánh <AppText variant="label" color={COLORS.danger}>*</AppText>
          </AppText>
          <AppText variant="caption" color={COLORS.textMuted}>Chọn 1 lĩnh vực</AppText>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
          {REPORT_CATEGORIES.map((c) => {
            const active = category === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                onPress={() => setCategory(c.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Ionicons
                  name={c.icon}
                  size={15}
                  color={active ? COLORS.textInverse : COLORS.primary}
                />
                <AppText
                  variant="caption"
                  semibold={active}
                  color={active ? COLORS.textInverse : COLORS.textPrimary}
                  style={{ marginLeft: 6 }}
                >
                  {c.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Hình ảnh hiện trường */}
      <View style={styles.sectionBlock}>
        <AppText variant="label" color={COLORS.textPrimary}>
          Hình ảnh hiện trường ({mediaUrls.length}/4)
        </AppText>
        <AppText variant="caption" color={COLORS.textMuted}>
          Khuyến nghị chụp rõ số nhà, mốc nhận diện thực tế
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
                Từ thư viện máy
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
                    GPS Đính kèm
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

      {/* Vị trí sự việc & Điểm mốc */}
      <AppCard style={styles.locationCard}>
        <View style={styles.sectionTitleRow}>
          <AppText variant="label" color={COLORS.textPrimary}>
            Vị trí sự việc & Điểm mốc <AppText variant="label" color={COLORS.danger}>*</AppText>
          </AppText>
          {location && (
            <AppText variant="caption" color={COLORS.secondary} semibold>
              • Độ chính xác cao
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
              ? `GPS: ${location.latitude.toFixed(4)}° N, ${location.longitude.toFixed(4)}° E`
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
            <AppText variant="caption" semibold color={COLORS.textInverse} style={{ fontSize: 11 }}>
              {location ? location.locationName : 'Ghim tại đây trên bản đồ'}
            </AppText>
          </View>
          <View style={styles.mapFullBtn}>
            <Ionicons name="expand-outline" size={13} color={COLORS.primary} />
            <AppText variant="caption" semibold color={COLORS.primary} style={{ marginLeft: 4, fontSize: 11 }}>
              Toàn màn hình
            </AppText>
          </View>
        </TouchableOpacity>

        <AppText variant="caption" semibold color={COLORS.textSecondary} style={{ marginTop: 4 }}>
          Danh sách điểm mốc Tổ dân phố (bấm để chọn nhanh)
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

      {/* Tiêu đề & Mô tả chi tiết */}
      <AppCard style={styles.inputCard}>
        <AppText variant="label" color={COLORS.textPrimary}>
          Tiêu đề sự việc <AppText variant="label" color={COLORS.danger}>*</AppText>
        </AppText>
        <TextInput
          style={styles.input}
          placeholder="VD: Đèn đường chiếu sáng ngõ 48 bị chập chờn..."
          placeholderTextColor={COLORS.textMuted}
          value={title}
          onChangeText={setTitle}
        />

        <View style={[styles.sectionTitleRow, { marginTop: SPACING.sm }]}>
          <AppText variant="label" color={COLORS.textPrimary}>
            Mô tả chi tiết <AppText variant="label" color={COLORS.danger}>*</AppText>
          </AppText>
          <AppText variant="caption" color={COLORS.textMuted}>{description.length}/500 ký tự</AppText>
        </View>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Mô tả chi tiết tình trạng sự cố để Ban điều hành xử lý nhanh..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          maxLength={500}
          textAlignVertical="top"
          value={description}
          onChangeText={setDescription}
        />
      </AppCard>

      {/* Tùy chọn hiển thị & Thông báo */}
      <AppCard style={styles.optionsCard}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="body" semibold>Gửi phản ánh ẩn danh</AppText>
            <AppText variant="caption" color={COLORS.textSecondary}>
              Chỉ Tổ trưởng & Cảnh sát khu vực xem được thông tin cá nhân
            </AppText>
          </View>
          <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ true: COLORS.primary }} />
        </View>

        <View style={[styles.switchRow, { marginTop: SPACING.md }]}>
          <View style={{ flex: 1 }}>
            <AppText variant="body" semibold>Nhận kết quả qua Thông báo ứng dụng</AppText>
            <AppText variant="caption" color={COLORS.textSecondary}>
              Cập nhật ngay khi Tổ trưởng tiếp nhận và hoàn thành
            </AppText>
          </View>
          <Switch value={notifyApp} onValueChange={setNotifyApp} trackColor={{ true: COLORS.primary }} />
        </View>
      </AppCard>

      {/* Quy chế xử lý */}
      <View style={styles.policyBox}>
        <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.primary} />
        <AppText variant="caption" color={COLORS.textSecondary} style={{ flex: 1, marginLeft: 8 }}>
          <AppText variant="caption" semibold color={COLORS.primary}>Quy chế xử lý phản ánh: </AppText>
          Phản ánh sẽ được Tổ trưởng & Đội phản ứng nhanh tiếp nhận xử lý trong vòng 2 - 4 giờ làm việc.
        </AppText>
      </View>

      <AppButton
        title="Gửi phản ánh ngay"
        onPress={handleSubmit}
        loading={createReport.isPending}
        fullWidth
        icon={<Ionicons name="send-outline" size={18} color={COLORS.textInverse} />}
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
  sectionBlock: { gap: SPACING.xs },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chipScroll: { gap: SPACING.sm, paddingVertical: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },

  mediaActionGrid: { flexDirection: 'row', gap: SPACING.sm, marginTop: 4 },
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
  thumbGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: 6 },
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
  input: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  textArea: { minHeight: 110 },
  optionsCard: { gap: SPACING.xs },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md },
  policyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primaryLight,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
});
