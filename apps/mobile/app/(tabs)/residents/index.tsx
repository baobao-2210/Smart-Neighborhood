import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { AppButton, AppCard, AppText, Badge, EmptyState } from '@/components';
import { apiClient } from '@/services/apiClient';
import { isOfficerRole, useAuthStore } from '@/store/useAuthStore';

export default function ResidentsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const canOfficer = isOfficerRole(user?.role);

  const [tab, setTab] = useState<'HOUSEHOLDS' | 'RESIDENTS'>('HOUSEHOLDS');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [street, setStreet] = useState('Ngõ 12, Nơ Trang Long');

  const { data: households = [], isLoading: loadingHH } = useQuery({
    queryKey: ['households', search],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/households', {
        params: { search: search || undefined },
      });
      return res.data.data as any[];
    },
    enabled: isAuthenticated && canOfficer,
  });

  const { data: residents = [], isLoading: loadingRes } = useQuery({
    queryKey: ['residents', search],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/residents', {
        params: { search: search || undefined },
      });
      return res.data.data as any[];
    },
    enabled: isAuthenticated && canOfficer,
  });

  const createHousehold = useMutation({
    mutationFn: () =>
      apiClient.post('/api/v1/households', {
        code: code.trim(),
        houseNumber: houseNumber.trim(),
        street: street.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['households'] });
      setModalOpen(false);
      setCode('');
      setHouseNumber('');
    },
    onError: (err: any) => {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể tạo hộ gia đình');
    },
  });

  if (!canOfficer) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <EmptyState
          icon="lock-closed-outline"
          title="Không có quyền truy cập"
          description="Chức năng quản lý toàn bộ hộ dân chỉ dành cho Tổ trưởng và Cán bộ tổ."
          actionLabel="Quay lại Cá nhân"
          onAction={() => router.replace('/(tabs)/profile' as any)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <AppText variant="h2">Quản lý Cư dân</AppText>
        <TouchableOpacity onPress={() => setModalOpen(true)}>
          <Ionicons name="add-circle" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.segmentRow}>
        <TouchableOpacity
          onPress={() => setTab('HOUSEHOLDS')}
          style={[styles.segmentBtn, tab === 'HOUSEHOLDS' && styles.segmentActive]}
        >
          <AppText
            variant="body"
            semibold={tab === 'HOUSEHOLDS'}
            color={tab === 'HOUSEHOLDS' ? COLORS.primary : COLORS.textSecondary}
          >
            Hộ gia đình ({households.length})
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab('RESIDENTS')}
          style={[styles.segmentBtn, tab === 'RESIDENTS' && styles.segmentActive]}
        >
          <AppText
            variant="body"
            semibold={tab === 'RESIDENTS'}
            color={tab === 'RESIDENTS' ? COLORS.primary : COLORS.textSecondary}
          >
            Nhân khẩu ({residents.length})
          </AppText>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo mã hộ, số nhà, họ tên, CCCD..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {tab === 'HOUSEHOLDS' ? (
        loadingHH ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={households}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const head = (item.members ?? []).find((m: any) => m.isHead);
              return (
                <AppCard style={styles.card}>
                  <View style={styles.rowBetween}>
                    <AppText variant="h3" color={COLORS.primary}>
                      {item.code}
                    </AppText>
                    <Badge label={`${item.members?.length ?? 0} nhân khẩu`} tone="neutral" />
                  </View>
                  <AppText variant="body" semibold>
                    Số {item.houseNumber}, {item.street}
                  </AppText>
                  <AppText variant="caption" color={COLORS.textSecondary}>
                    Chủ hộ: {head?.fullName || 'Chưa cập nhật'}
                  </AppText>
                </AppCard>
              );
            }}
            ListEmptyComponent={<EmptyState icon="home-outline" title="Chưa có hộ gia đình nào" />}
          />
        )
      ) : loadingRes ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={residents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <AppCard style={styles.card}>
              <View style={styles.rowBetween}>
                <AppText variant="h3">{item.fullName}</AppText>
                <Badge label={item.residenceType} tone="primary" />
              </View>
              <AppText variant="caption" color={COLORS.textSecondary}>
                CCCD: {item.cccdNumber || 'Chưa có'} • Hộ: {item.household?.code}
              </AppText>
              <AppText variant="caption" color={COLORS.textMuted}>
                Trạng thái: {item.residenceStatus}
              </AppText>
            </AppCard>
          )}
          ListEmptyComponent={<EmptyState icon="people-outline" title="Chưa có nhân khẩu nào" />}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <AppCard style={{ gap: SPACING.sm }}>
            <AppText variant="h3">Thêm Hộ gia đình mới</AppText>
            <TextInput
              style={styles.input}
              placeholder="Mã hộ (VD: HK-2026-0002)"
              value={code}
              onChangeText={setCode}
            />
            <TextInput
              style={styles.input}
              placeholder="Số nhà (VD: 28)"
              value={houseNumber}
              onChangeText={setHouseNumber}
            />
            <TextInput
              style={styles.input}
              placeholder="Đường / Ngõ"
              value={street}
              onChangeText={setStreet}
            />
            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              <AppButton title="Hủy" variant="outline" onPress={() => setModalOpen(false)} style={{ flex: 1 }} />
              <AppButton
                title="Tạo hộ"
                onPress={() => createHousehold.mutate()}
                loading={createHousehold.isPending}
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
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  segmentActive: { borderBottomColor: COLORS.primary },
  searchWrap: { padding: SPACING.md, backgroundColor: COLORS.surface },
  searchInput: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: SPACING.lg, gap: SPACING.md },
  card: { gap: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  input: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
