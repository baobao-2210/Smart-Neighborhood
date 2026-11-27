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
  ScrollView,
  Switch,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Gender,
  HouseholdRelation,
  ResidenceStatus,
  ResidenceType,
} from '@todanpho/shared';
import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { AppButton, AppCard, AppText, Badge, EmptyState } from '@/components';
import { apiClient } from '@/services/apiClient';
import { isOfficerRole, useAuthStore } from '@/store/useAuthStore';

const RESIDENCE_TYPE_LABEL: Record<string, string> = {
  THUONG_TRU: 'Thường trú',
  TAM_TRU: 'Tạm trú',
  TAM_VANG: 'Tạm vắng',
};

const RESIDENCE_STATUS_LABEL: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  DANG_CU_TRU: { label: 'Đang cư trú', tone: 'success' },
  TAM_VANG: { label: 'Tạm vắng', tone: 'warning' },
  DA_CHUYEN_DI: { label: 'Đã chuyển đi', tone: 'neutral' },
};

const GENDER_OPTIONS: { key: Gender; label: string }[] = [
  { key: Gender.MALE, label: 'Nam' },
  { key: Gender.FEMALE, label: 'Nữ' },
  { key: Gender.OTHER, label: 'Khác' },
];

const RELATION_OPTIONS: { key: HouseholdRelation; label: string }[] = [
  { key: HouseholdRelation.CHU_HO, label: 'Chủ hộ' },
  { key: HouseholdRelation.VO_CHONG, label: 'Vợ / Chồng' },
  { key: HouseholdRelation.CON, label: 'Con' },
  { key: HouseholdRelation.BO_ME, label: 'Bố / Mẹ' },
  { key: HouseholdRelation.ONG_BA, label: 'Ông / Bà' },
  { key: HouseholdRelation.CHAU, label: 'Cháu' },
  { key: HouseholdRelation.ANH_CHI_EM, label: 'Anh / Chị / Em' },
  { key: HouseholdRelation.NGUOI_THUE, label: 'Người thuê' },
  { key: HouseholdRelation.KHAC, label: 'Khác' },
];

function extractError(err: any, fallback: string) {
  const msg = err?.response?.data?.message || err?.message;
  if (Array.isArray(msg)) return msg.join('\n');
  if (typeof msg === 'string') return msg;
  return fallback;
}

export default function ResidentsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const canOfficer = isOfficerRole(user?.role);

  const [tab, setTab] = useState<'HOUSEHOLDS' | 'RESIDENTS'>('HOUSEHOLDS');
  const [search, setSearch] = useState('');
  const [resTypeFilter, setResTypeFilter] = useState<ResidenceType | ''>('');

  // Create Household Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [street, setStreet] = useState('Ngõ 12, Nơ Trang Long');

  // Household Detail + Add Member Modal
  const [selectedHousehold, setSelectedHousehold] = useState<any | null>(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [mFullName, setMFullName] = useState('');
  const [mCccd, setMCccd] = useState('');
  const [mDob, setMDob] = useState('1995-01-01');
  const [mGender, setMGender] = useState<Gender>(Gender.MALE);
  const [mIsHead, setMIsHead] = useState(false);
  const [mRelation, setMRelation] = useState<HouseholdRelation>(HouseholdRelation.CON);
  const [mResType, setMResType] = useState<ResidenceType>(ResidenceType.THUONG_TRU);

  // Edit Resident Modal
  const [editingResident, setEditingResident] = useState<any | null>(null);
  const [editResName, setEditResName] = useState('');
  const [editResType, setEditResType] = useState<ResidenceType>(ResidenceType.THUONG_TRU);
  const [editResStatus, setEditResStatus] = useState<ResidenceStatus>(ResidenceStatus.DANG_CU_TRU);

  const {
    data: households = [],
    isLoading: loadingHH,
    isRefetching: refetchingHH,
    refetch: refetchHH,
  } = useQuery({
    queryKey: ['households', search],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/households', {
        params: { search: search.trim() || undefined },
      });
      return res.data.data as any[];
    },
    enabled: isAuthenticated && canOfficer,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const {
    data: residents = [],
    isLoading: loadingRes,
    isRefetching: refetchingRes,
    refetch: refetchRes,
  } = useQuery({
    queryKey: ['residents', search, resTypeFilter],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/residents', {
        params: {
          search: search.trim() || undefined,
          residenceType: resTypeFilter || undefined,
        },
      });
      return res.data.data as any[];
    },
    enabled: isAuthenticated && canOfficer,
    staleTime: 0,
    refetchOnMount: 'always',
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
      Alert.alert('Thành công', 'Đã thêm hộ gia đình mới.');
    },
    onError: (err: any) => {
      Alert.alert('Lỗi', extractError(err, 'Không thể tạo hộ gia đình'));
    },
  });

  const addMember = useMutation({
    mutationFn: (householdId: string) =>
      apiClient.post(`/api/v1/households/${householdId}/members`, {
        fullName: mFullName.trim(),
        cccdNumber: mCccd.trim() || undefined,
        dateOfBirth: mDob.trim(),
        gender: mGender,
        isHead: mIsHead,
        relationToHead: mIsHead ? HouseholdRelation.CHU_HO : mRelation,
        residenceType: mResType,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['households'] });
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      const created = res.data?.data;
      if (selectedHousehold && created) {
        setSelectedHousehold({
          ...selectedHousehold,
          members: [...(selectedHousehold.members ?? []), created],
        });
      }
      setAddMemberOpen(false);
      setMFullName('');
      setMCccd('');
      Alert.alert('Thành công', 'Đã thêm nhân khẩu vào hộ gia đình.');
    },
    onError: (err: any) => {
      Alert.alert('Không thể thêm nhân khẩu', extractError(err, 'Kiểm tra lại thông tin nhập.'));
    },
  });

  const updateResident = useMutation({
    mutationFn: (memberId: string) =>
      apiClient.patch(`/api/v1/residents/${memberId}`, {
        fullName: editResName.trim() || undefined,
        residenceType: editResType,
        residenceStatus: editResStatus,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['households'] });
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      setEditingResident(null);
      Alert.alert('Đã cập nhật', 'Thông tin cư trú của nhân khẩu đã được lưu.');
    },
    onError: (err: any) => {
      Alert.alert('Không thể cập nhật', extractError(err, 'Vui lòng thử lại sau.'));
    },
  });

  const handleOpenEditResident = (r: any) => {
    setEditingResident(r);
    setEditResName(r.fullName || '');
    setEditResType(r.residenceType || ResidenceType.THUONG_TRU);
    setEditResStatus(r.residenceStatus || ResidenceStatus.DANG_CU_TRU);
  };

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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/profile' as any)}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <AppText variant="h2" style={{ fontSize: 18 }}>
            Quản lý Cư dân & Hộ gia đình
          </AppText>
          <AppText variant="caption" color={COLORS.textMuted}>
            {households.length} hộ • {residents.length} nhân khẩu
          </AppText>
        </View>
        <TouchableOpacity onPress={() => setModalOpen(true)}>
          <Ionicons name="add-circle" size={30} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Segment Tabs */}
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

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={17} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo mã hộ, số nhà, họ tên, CCCD..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {tab === 'RESIDENTS' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {[
              { key: '' as const, label: 'Tất cả' },
              { key: ResidenceType.THUONG_TRU, label: 'Thường trú' },
              { key: ResidenceType.TAM_TRU, label: 'Tạm trú' },
              { key: ResidenceType.TAM_VANG, label: 'Tạm vắng' },
            ].map((f) => {
              const active = resTypeFilter === f.key;
              return (
                <TouchableOpacity
                  key={f.key || 'all'}
                  onPress={() => setResTypeFilter(f.key)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <AppText
                    variant="caption"
                    semibold={active}
                    color={active ? COLORS.primary : COLORS.textSecondary}
                  >
                    {f.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
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
            refreshControl={
              <RefreshControl
                refreshing={refetchingHH}
                onRefresh={refetchHH}
                tintColor={COLORS.primary}
              />
            }
            renderItem={({ item }) => {
              const head = (item.members ?? []).find((m: any) => m.isHead);
              return (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setSelectedHousehold(item)}
                >
                  <AppCard style={styles.card}>
                    <View style={styles.rowBetween}>
                      <AppText variant="h3" color={COLORS.primary}>
                        {item.code}
                      </AppText>
                      <Badge label={`${item.members?.length ?? 0} nhân khẩu`} tone="primary" />
                    </View>
                    <AppText variant="body" semibold>
                      Số {item.houseNumber}, {item.street}
                    </AppText>
                    <View style={styles.rowBetween}>
                      <AppText variant="caption" color={COLORS.textSecondary}>
                        Chủ hộ: {head?.fullName || 'Chưa cập nhật'}
                      </AppText>
                      <AppText variant="caption" color={COLORS.primary}>
                        Chi tiết & Thêm nhân khẩu →
                      </AppText>
                    </View>
                  </AppCard>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <EmptyState icon="home-outline" title="Chưa có hộ gia đình nào" />
            }
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
          refreshControl={
            <RefreshControl
              refreshing={refetchingRes}
              onRefresh={refetchRes}
              tintColor={COLORS.primary}
            />
          }
          renderItem={({ item }) => {
            const stMeta = RESIDENCE_STATUS_LABEL[item.residenceStatus] || {
              label: item.residenceStatus,
              tone: 'neutral' as const,
            };
            return (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleOpenEditResident(item)}
              >
                <AppCard style={styles.card}>
                  <View style={styles.rowBetween}>
                    <AppText variant="h3" style={{ fontSize: 16 }}>
                      {item.fullName}
                    </AppText>
                    <Badge
                      label={RESIDENCE_TYPE_LABEL[item.residenceType] || item.residenceType}
                      tone="primary"
                    />
                  </View>
                  <AppText variant="caption" color={COLORS.textSecondary}>
                    CCCD: {item.cccdNumber || 'Chưa cập nhật'} • Hộ: {item.household?.code}
                  </AppText>
                  <View style={[styles.rowBetween, { marginTop: 4 }]}>
                    <Badge label={stMeta.label} tone={stMeta.tone} />
                    <AppText variant="caption" color={COLORS.primary}>
                      Cập nhật cư trú →
                    </AppText>
                  </View>
                </AppCard>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <EmptyState icon="people-outline" title="Chưa có nhân khẩu nào" />
          }
        />
      )}

      {/* Modal 1: Thêm Hộ gia đình mới */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <AppCard style={styles.modalCard}>
            <View style={styles.rowBetween}>
              <AppText variant="h3">Thêm Hộ gia đình mới</AppText>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Mã hộ (VD: HK-2026-0002)"
              placeholderTextColor={COLORS.textMuted}
              value={code}
              onChangeText={setCode}
            />
            <TextInput
              style={styles.input}
              placeholder="Số nhà (VD: 28)"
              placeholderTextColor={COLORS.textMuted}
              value={houseNumber}
              onChangeText={setHouseNumber}
            />
            <TextInput
              style={styles.input}
              placeholder="Đường / Ngõ"
              placeholderTextColor={COLORS.textMuted}
              value={street}
              onChangeText={setStreet}
            />
            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              <AppButton
                title="Hủy"
                variant="outline"
                onPress={() => setModalOpen(false)}
                style={{ flex: 1 }}
              />
              <AppButton
                title="Tạo hộ"
                onPress={() => {
                  if (!code.trim() || !houseNumber.trim() || !street.trim()) {
                    Alert.alert('Thiếu thông tin', 'Vui lòng nhập đủ mã hộ, số nhà và tên đường.');
                    return;
                  }
                  createHousehold.mutate();
                }}
                loading={createHousehold.isPending}
                style={{ flex: 1 }}
              />
            </View>
          </AppCard>
        </View>
      </Modal>

      {/* Modal 2: Chi tiết Hộ gia đình & Danh sách nhân khẩu */}
      <Modal
        visible={Boolean(selectedHousehold)}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {selectedHousehold && (
          <View style={styles.container}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setSelectedHousehold(null)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <AppText variant="h3">Hộ {selectedHousehold.code}</AppText>
              <TouchableOpacity onPress={() => setAddMemberOpen(true)}>
                <Ionicons name="person-add" size={22} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.listContent}>
              <AppCard style={{ gap: 6 }}>
                <AppText variant="label" color={COLORS.primary}>
                  ĐỊA CHỈ HỘ KHẨU
                </AppText>
                <AppText variant="h3">
                  Số {selectedHousehold.houseNumber}, {selectedHousehold.street}
                </AppText>
                <AppButton
                  title="+ Thêm nhân khẩu vào hộ"
                  onPress={() => setAddMemberOpen(true)}
                  style={{ marginTop: 6 }}
                />
              </AppCard>

              <AppText variant="label" color={COLORS.textSecondary}>
                DANH SÁCH NHÂN KHẨU ({selectedHousehold.members?.length ?? 0})
              </AppText>

              {(selectedHousehold.members ?? []).map((m: any) => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => handleOpenEditResident(m)}
                  activeOpacity={0.85}
                >
                  <AppCard style={styles.card}>
                    <View style={styles.rowBetween}>
                      <AppText variant="h3" style={{ fontSize: 15 }}>
                        {m.fullName}
                      </AppText>
                      <Badge
                        label={m.isHead ? 'Chủ hộ' : m.relationToHead || 'Thành viên'}
                        tone={m.isHead ? 'primary' : 'neutral'}
                      />
                    </View>
                    <AppText variant="caption" color={COLORS.textSecondary}>
                      {RESIDENCE_TYPE_LABEL[m.residenceType] || m.residenceType} •{' '}
                      {RESIDENCE_STATUS_LABEL[m.residenceStatus]?.label || m.residenceStatus}
                    </AppText>
                  </AppCard>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Modal 3: Thêm nhân khẩu vào hộ */}
      <Modal visible={addMemberOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
            <AppCard style={styles.modalCard}>
              <View style={styles.rowBetween}>
                <AppText variant="h3">Thêm nhân khẩu mới</AppText>
                <TouchableOpacity onPress={() => setAddMemberOpen(false)}>
                  <Ionicons name="close" size={22} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Họ và tên..."
                placeholderTextColor={COLORS.textMuted}
                value={mFullName}
                onChangeText={setMFullName}
              />
              <TextInput
                style={styles.input}
                placeholder="Số CCCD (không bắt buộc)..."
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                value={mCccd}
                onChangeText={setMCccd}
              />
              <TextInput
                style={styles.input}
                placeholder="Ngày sinh (YYYY-MM-DD)"
                placeholderTextColor={COLORS.textMuted}
                value={mDob}
                onChangeText={setMDob}
              />

              <AppText variant="caption" color={COLORS.textSecondary}>
                Giới tính
              </AppText>
              <View style={styles.chipRow}>
                {GENDER_OPTIONS.map((g) => (
                  <TouchableOpacity
                    key={g.key}
                    onPress={() => setMGender(g.key)}
                    style={[styles.filterChip, mGender === g.key && styles.filterChipActive]}
                  >
                    <AppText
                      variant="caption"
                      color={mGender === g.key ? COLORS.primary : COLORS.textSecondary}
                    >
                      {g.label}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.rowBetween}>
                <AppText variant="body">Là chủ hộ gia đình</AppText>
                <Switch
                  value={mIsHead}
                  onValueChange={setMIsHead}
                  trackColor={{ true: COLORS.primary }}
                />
              </View>

              {!mIsHead && (
                <>
                  <AppText variant="caption" color={COLORS.textSecondary}>
                    Quan hệ với chủ hộ
                  </AppText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chipRow}>
                      {RELATION_OPTIONS.filter((r) => r.key !== HouseholdRelation.CHU_HO).map((r) => (
                        <TouchableOpacity
                          key={r.key}
                          onPress={() => setMRelation(r.key)}
                          style={[styles.filterChip, mRelation === r.key && styles.filterChipActive]}
                        >
                          <AppText
                            variant="caption"
                            color={mRelation === r.key ? COLORS.primary : COLORS.textSecondary}
                          >
                            {r.label}
                          </AppText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}

              <AppText variant="caption" color={COLORS.textSecondary}>
                Loại cư trú
              </AppText>
              <View style={styles.chipRow}>
                {[ResidenceType.THUONG_TRU, ResidenceType.TAM_TRU, ResidenceType.TAM_VANG].map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setMResType(t)}
                    style={[styles.filterChip, mResType === t && styles.filterChipActive]}
                  >
                    <AppText
                      variant="caption"
                      color={mResType === t ? COLORS.primary : COLORS.textSecondary}
                    >
                      {RESIDENCE_TYPE_LABEL[t]}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: 6 }}>
                <AppButton
                  title="Hủy"
                  variant="outline"
                  onPress={() => setAddMemberOpen(false)}
                  style={{ flex: 1 }}
                />
                <AppButton
                  title="Lưu nhân khẩu"
                  onPress={() => {
                    if (!mFullName.trim() || !selectedHousehold) {
                      Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ tên nhân khẩu.');
                      return;
                    }
                    addMember.mutate(selectedHousehold.id);
                  }}
                  loading={addMember.isPending}
                  style={{ flex: 1 }}
                />
              </View>
            </AppCard>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal 4: Cập nhật nhân khẩu */}
      <Modal visible={Boolean(editingResident)} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <AppCard style={styles.modalCard}>
            <View style={styles.rowBetween}>
              <AppText variant="h3">Cập nhật nhân khẩu</AppText>
              <TouchableOpacity onPress={() => setEditingResident(null)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Họ và tên..."
              placeholderTextColor={COLORS.textMuted}
              value={editResName}
              onChangeText={setEditResName}
            />

            <AppText variant="caption" color={COLORS.textSecondary}>
              Loại cư trú
            </AppText>
            <View style={styles.chipRow}>
              {[ResidenceType.THUONG_TRU, ResidenceType.TAM_TRU, ResidenceType.TAM_VANG].map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setEditResType(t)}
                  style={[styles.filterChip, editResType === t && styles.filterChipActive]}
                >
                  <AppText
                    variant="caption"
                    color={editResType === t ? COLORS.primary : COLORS.textSecondary}
                  >
                    {RESIDENCE_TYPE_LABEL[t]}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>

            <AppText variant="caption" color={COLORS.textSecondary}>
              Trạng thái cư trú
            </AppText>
            <View style={styles.chipRow}>
              {[
                ResidenceStatus.DANG_CU_TRU,
                ResidenceStatus.TAM_VANG,
                ResidenceStatus.DA_CHUYEN_DI,
              ].map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setEditResStatus(s)}
                  style={[styles.filterChip, editResStatus === s && styles.filterChipActive]}
                >
                  <AppText
                    variant="caption"
                    color={editResStatus === s ? COLORS.primary : COLORS.textSecondary}
                  >
                    {RESIDENCE_STATUS_LABEL[s].label}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: 6 }}>
              <AppButton
                title="Hủy"
                variant="outline"
                onPress={() => setEditingResident(null)}
                style={{ flex: 1 }}
              />
              <AppButton
                title="Lưu"
                onPress={() => editingResident && updateResident.mutate(editingResident.id)}
                loading={updateResident.isPending}
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
    backgroundColor: '#2A221D',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
  searchWrap: { padding: SPACING.md, gap: SPACING.sm },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  filterRow: { gap: SPACING.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: SPACING.lg, gap: SPACING.md },
  card: { gap: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: { gap: SPACING.sm },
  input: {
    backgroundColor: COLORS.surfaceAlt,
    color: COLORS.textPrimary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
