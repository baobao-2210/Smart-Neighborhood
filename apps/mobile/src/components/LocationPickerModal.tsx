import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { AppButton } from './AppButton';
import { AppCard } from './AppCard';
import { AppText } from './AppText';

export interface SelectedLocation {
  locationName: string;
  latitude: number;
  longitude: number;
}

interface LocationPickerModalProps {
  visible: boolean;
  initialLocation?: SelectedLocation | null;
  onClose: () => void;
  onSelect: (loc: SelectedLocation) => void;
}

const NEIGHBORHOOD_LANDMARKS: SelectedLocation[] = [
  {
    locationName: 'Nhà văn hóa Tổ dân phố số 5',
    latitude: 10.8130,
    longitude: 106.6990,
  },
  {
    locationName: 'Đầu ngõ 12, Nơ Trang Long',
    latitude: 10.8128,
    longitude: 106.6985,
  },
  {
    locationName: 'Hẻm 14, Khu dân cư Tổ 5',
    latitude: 10.8121,
    longitude: 106.6979,
  },
  {
    locationName: 'Trạm y tế Phường 12',
    latitude: 10.8138,
    longitude: 106.6996,
  },
];

export function LocationPickerModal({
  visible,
  initialLocation,
  onClose,
  onSelect,
}: LocationPickerModalProps) {
  const [selected, setSelected] = useState<SelectedLocation>(
    initialLocation ?? NEIGHBORHOOD_LANDMARKS[0],
  );
  const [customName, setCustomName] = useState(
    initialLocation?.locationName ?? NEIGHBORHOOD_LANDMARKS[0].locationName,
  );
  const [locating, setLocating] = useState(false);

  const handleUseCurrentGps = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Chưa cấp quyền vị trí',
          'Vui lòng cho phép ứng dụng truy cập GPS để lấy tọa độ hiện tại.',
        );
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = pos.coords;

      let label = `Vị trí hiện tại (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
      try {
        const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo) {
          const parts = [geo.streetNumber, geo.street, geo.district].filter(Boolean);
          if (parts.length > 0) label = parts.join(', ');
        }
      } catch {
        // Fallback to coordinate label
      }

      setSelected({ locationName: label, latitude, longitude });
      setCustomName(label);
    } catch {
      Alert.alert('Không lấy được GPS', 'Vui lòng chọn điểm trên bản đồ khu vực bên dưới.');
    } finally {
      setLocating(false);
    }
  };

  const handleConfirm = () => {
    onSelect({
      locationName: customName.trim() || selected.locationName,
      latitude: selected.latitude,
      longitude: selected.longitude,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <AppText variant="h3">Chọn vị trí trên Bản đồ</AppText>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Interactive Map Area Preview */}
          <AppCard style={styles.mapPreview}>
            <View style={styles.mapGrid}>
              <Ionicons name="map" size={42} color={COLORS.primary} />
              <AppText variant="body" semibold color={COLORS.primary} style={{ marginTop: 6 }}>
                {customName || selected.locationName}
              </AppText>
              <AppText variant="caption" color={COLORS.textSecondary}>
                Tọa độ GPS: {selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}
              </AppText>
            </View>

            <TouchableOpacity
              onPress={handleUseCurrentGps}
              disabled={locating}
              style={styles.gpsBtn}
            >
              {locating ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Ionicons name="locate" size={18} color={COLORS.primary} />
              )}
              <AppText variant="body" semibold color={COLORS.primary} style={{ marginLeft: 6 }}>
                {locating ? 'Đang định vị GPS...' : 'Lấy vị trí GPS hiện tại'}
              </AppText>
            </TouchableOpacity>
          </AppCard>

          <AppText variant="label" color={COLORS.textSecondary}>
            Tên địa điểm / Số nhà hiển thị
          </AppText>
          <TextInput
            style={styles.input}
            placeholder="Nhập tên vị trí hoặc số nhà..."
            value={customName}
            onChangeText={setCustomName}
          />

          <AppText variant="label" color={COLORS.textSecondary} style={{ marginTop: SPACING.sm }}>
            Điểm mốc trên Bản đồ Tổ dân phố
          </AppText>
          {NEIGHBORHOOD_LANDMARKS.map((lm) => {
            const isSelected =
              lm.latitude === selected.latitude && lm.longitude === selected.longitude;
            return (
              <TouchableOpacity
                key={lm.locationName}
                onPress={() => {
                  setSelected(lm);
                  setCustomName(lm.locationName);
                }}
              >
                <AppCard
                  style={[
                    styles.landmarkCard,
                    isSelected ? styles.landmarkActive : undefined,
                  ] as any}
                >
                  <Ionicons
                    name="location"
                    size={20}
                    color={isSelected ? COLORS.primary : COLORS.textSecondary}
                  />
                  <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                    <AppText variant="body" semibold={isSelected}>
                      {lm.locationName}
                    </AppText>
                    <AppText variant="caption" color={COLORS.textMuted}>
                      {lm.latitude.toFixed(4)}, {lm.longitude.toFixed(4)}
                    </AppText>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  )}
                </AppCard>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <AppButton title="Xác nhận vị trí này" onPress={handleConfirm} fullWidth />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  content: { padding: SPACING.lg, gap: SPACING.sm },
  mapPreview: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  mapGrid: {
    backgroundColor: COLORS.surfaceAlt,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  landmarkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  landmarkActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  footer: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});

