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
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { AppButton, AppCard, AppText } from '@/components';
import {
  LocationPickerModal,
  SelectedLocation,
} from '@/components/LocationPickerModal';
import { useCreateReport } from '@/services/feedService';

const REPORT_CATEGORIES = [
  { key: 'INFRASTRUCTURE', label: 'Hạ tầng' },
  { key: 'LIGHTING', label: 'Chiếu sáng' },
  { key: 'SANITATION', label: 'Vệ sinh' },
  { key: 'SECURITY', label: 'An ninh' },
  { key: 'OTHER', label: 'Khác' },
];

export default function CreateReportScreen() {
  const router = useRouter();
  const createReport = useCreateReport();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('INFRASTRUCTURE');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [location, setLocation] = useState<SelectedLocation | null>(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

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
      <AppCard>
        <AppText variant="label" color={COLORS.textSecondary} style={styles.label}>
          Danh mục sự cố
        </AppText>
        <View style={styles.chipRow}>
          {REPORT_CATEGORIES.map((c) => {
            const active = category === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                onPress={() => setCategory(c.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <AppText
                  variant="caption"
                  semibold={active}
                  color={active ? COLORS.textInverse : COLORS.textSecondary}
                >
                  {c.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          style={styles.input}
          placeholder="Tiêu đề phản ánh (VD: Hỏng nắp cống ngõ 12)..."
          placeholderTextColor={COLORS.textMuted}
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Mô tả chi tiết tình trạng sự cố..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          textAlignVertical="top"
          value={description}
          onChangeText={setDescription}
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

        <View style={styles.toolbar}>
          <TouchableOpacity onPress={handlePickFromLibrary} style={styles.toolBtn}>
            <Ionicons name="images-outline" size={20} color={COLORS.primary} />
            <AppText variant="caption" semibold color={COLORS.primary} style={{ marginLeft: 4 }}>
              Chọn ảnh ({mediaUrls.length}/4)
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleTakePhoto} style={styles.toolBtn}>
            <Ionicons name="camera-outline" size={20} color={COLORS.secondary} />
            <AppText variant="caption" semibold color={COLORS.secondary} style={{ marginLeft: 4 }}>
              Chụp ảnh
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMapPickerOpen(true)} style={styles.toolBtn}>
            <Ionicons name="map-outline" size={20} color={COLORS.warning} />
            <AppText variant="caption" semibold color={COLORS.warning} style={{ marginLeft: 4 }}>
              Vị trí bản đồ
            </AppText>
          </TouchableOpacity>
        </View>
      </AppCard>

      <AppCard style={styles.privacyRow}>
        <View style={{ flex: 1, paddingRight: SPACING.md }}>
          <AppText variant="body" semibold>
            Gửi chế độ Riêng tư
          </AppText>
          <AppText variant="caption" color={COLORS.textSecondary}>
            Chỉ Tổ trưởng và Cán bộ phụ trách xem được. Không hiển thị vị trí công khai.
          </AppText>
        </View>
        <Switch value={isPrivate} onValueChange={setIsPrivate} />
      </AppCard>

      <AppButton
        title="Gửi phản ánh"
        onPress={handleSubmit}
        loading={createReport.isPending}
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
  label: { marginBottom: SPACING.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
  },
  chipActive: { backgroundColor: COLORS.primary },
  input: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: { minHeight: 110 },
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
  privacyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
