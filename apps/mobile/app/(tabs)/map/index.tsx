import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { AppCard, AppText, Badge, EmptyState } from '@/components';
import { apiClient } from '@/services/apiClient';
import { useAuthStore } from '@/store/useAuthStore';

const STATUS_FILTERS = [
  { key: '', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ tiếp nhận' },
  { key: 'IN_PROGRESS', label: 'Đang xử lý' },
  { key: 'RESOLVED', label: 'Đã giải quyết' },
];

export default function MapScreen() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [reportStatus, setReportStatus] = useState('');

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['map-markers', reportStatus],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/map/markers', {
        params: { reportStatus: reportStatus || undefined },
      });
      return res.data.data as {
        neighborhood: { name: string };
        reports: any[];
        events: any[];
        places: any[];
      };
    },
    enabled: isAuthenticated,
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AppText variant="h2">Bản đồ Cộng đồng</AppText>
        <Badge label="Chỉ hiện công khai" tone="success" />
      </View>

      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {STATUS_FILTERS.map((f) => {
            const active = reportStatus === f.key;
            return (
              <TouchableOpacity
                key={f.key || 'all'}
                onPress={() => setReportStatus(f.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <AppText variant="caption" semibold={active} color={active ? COLORS.textInverse : COLORS.textSecondary}>
                  {f.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
          <AppText variant="h3" style={styles.sectionTitle}>
            Phản ánh công khai trên địa bàn ({data?.reports?.length ?? 0})
          </AppText>
          {(data?.reports ?? []).length === 0 ? (
            <EmptyState
              icon="map-outline"
              title="Không có điểm phản ánh công khai"
              description="Các phản ánh riêng tư được ẩn hoàn toàn khỏi bản đồ."
            />
          ) : (
            (data?.reports ?? []).map((r) => (
              <AppCard key={r.id} style={styles.itemCard}>
                <View style={styles.rowBetween}>
                  <View style={styles.iconRow}>
                    <Ionicons name="warning-outline" size={18} color={COLORS.warning} />
                    <AppText variant="body" semibold style={{ marginLeft: 6 }}>
                      {r.title}
                    </AppText>
                  </View>
                  <Badge label={r.status} tone="primary" />
                </View>
                <AppText variant="caption" color={COLORS.textSecondary}>
                  {r.addressText || 'Khu vực tổ dân phố'} • GPS: {r.latitude?.toFixed(4)}, {r.longitude?.toFixed(4)}
                </AppText>
              </AppCard>
            ))
          )}

          <AppText variant="h3" style={styles.sectionTitle}>
            Địa điểm cộng đồng & Sự kiện ({(data?.places?.length ?? 0) + (data?.events?.length ?? 0)})
          </AppText>
          {(data?.places ?? []).map((p) => (
            <AppCard key={p.id} style={styles.itemCard}>
              <View style={styles.iconRow}>
                <Ionicons name="business-outline" size={18} color={COLORS.secondary} />
                <AppText variant="body" semibold style={{ marginLeft: 6 }}>
                  {p.name}
                </AppText>
              </View>
              <AppText variant="caption" color={COLORS.textSecondary}>
                {p.address} • GPS: {p.latitude?.toFixed(4)}, {p.longitude?.toFixed(4)}
              </AppText>
            </AppCard>
          ))}
          {(data?.events ?? []).map((e) => (
            <AppCard key={e.id} style={styles.itemCard}>
              <View style={styles.iconRow}>
                <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                <AppText variant="body" semibold style={{ marginLeft: 6 }}>
                  Sự kiện: {e.title}
                </AppText>
              </View>
              <AppText variant="caption" color={COLORS.textSecondary}>
                {e.locationName} • GPS: {e.latitude?.toFixed(4)}, {e.longitude?.toFixed(4)}
              </AppText>
            </AppCard>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterBar: {
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  chipRow: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
  },
  chipActive: { backgroundColor: COLORS.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: SPACING.lg, gap: SPACING.sm },
  sectionTitle: { marginTop: SPACING.sm, marginBottom: 4 },
  itemCard: { gap: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
});
