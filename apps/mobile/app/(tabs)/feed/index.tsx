import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FeedFilterType } from '@todanpho/shared';
import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { AppCard, AppText, Avatar, Badge, EmptyState } from '@/components';
import { FeedPostCard } from '@/components/FeedPostCard';
import {
  useDeletePost,
  useFeedPosts,
  useReports,
  useTogglePinPost,
  useToggleReaction,
  useUpdateReportStatus,
} from '@/services/feedService';
import { isOfficerRole, useAuthStore } from '@/store/useAuthStore';
import { formatRelativeTimeVi } from '@/utils/date';

const FILTERS: { key: FeedFilterType; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'OFFICIAL', label: 'Ban điều hành' },
  { key: 'WARNING', label: 'Cảnh báo' },
  { key: 'LIFE', label: 'Đời sống' },
  { key: 'PINNED', label: 'Đã ghim' },
];

const STATUS_BADGE: Record<string, { label: string; tone: 'warning' | 'primary' | 'success' | 'danger' }> = {
  PENDING: { label: 'Chờ tiếp nhận', tone: 'warning' },
  IN_PROGRESS: { label: 'Đang xử lý', tone: 'primary' },
  RESOLVED: { label: 'Đã giải quyết', tone: 'success' },
  REJECTED: { label: 'Từ chối', tone: 'danger' },
};

export default function FeedScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isOfficer = isOfficerRole(user?.role);

  const [tab, setTab] = useState<'POSTS' | 'REPORTS'>('POSTS');
  const [filter, setFilter] = useState<FeedFilterType>('ALL');
  const [search, setSearch] = useState('');

  const { data: posts = [], isLoading, isRefetching, refetch } = useFeedPosts(filter, search);
  const { data: reports = [], isLoading: loadingReports, refetch: refetchReports } = useReports();
  const toggleReaction = useToggleReaction();
  const togglePin = useTogglePinPost();
  const deletePost = useDeletePost();
  const updateReportStatus = useUpdateReportStatus();

  const handleSOS = () => {
    Alert.alert(
      'Hỗ trợ khẩn cấp SOS',
      'Chọn kênh liên hệ khẩn cấp của Tổ dân phố:',
      [
        { text: 'Gọi Công an phường (113)', onPress: () => Linking.openURL('tel:113') },
        { text: 'Gọi Tổ trưởng', onPress: () => Linking.openURL('tel:0912345678') },
        { text: 'Nhắn tin Tổ trưởng', onPress: () => router.push('/(tabs)/connect' as any) },
        { text: 'Đóng', style: 'cancel' },
      ],
    );
  };

  const handleUpdateReport = (reportId: string) => {
    Alert.alert('Cập nhật trạng thái phản ánh', undefined, [
      {
        text: 'Đang xử lý',
        onPress: () => updateReportStatus.mutate({ reportId, status: 'IN_PROGRESS', note: 'Ban điều hành đang kiểm tra' }),
      },
      {
        text: 'Đã giải quyết',
        onPress: () => updateReportStatus.mutate({ reportId, status: 'RESOLVED', note: 'Đã xử lý xong' }),
      },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  const renderStitchHomeHeader = () => (
    <View style={styles.homeHeaderContainer}>
      {/* Welcome & VNeID Verified Card */}
      <AppCard style={styles.welcomeCard}>
        <View style={styles.welcomeRow}>
          <View style={styles.welcomeLeft}>
            <View style={styles.welcomeNameRow}>
              <AppText variant="h3" numberOfLines={1} style={styles.welcomeName}>
                Xin chào, {user?.fullName || 'Cư dân'}
              </AppText>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
            </View>
            <View style={styles.welcomeUnitRow}>
              <Ionicons name="business-outline" size={13} color={COLORS.textMuted} />
              <AppText variant="caption" color={COLORS.textSecondary} numberOfLines={1} style={{ marginLeft: 4 }}>
                {user?.neighborhoodName || 'Tổ 12 - P. Yên Hòa'} • Cư dân số
              </AppText>
            </View>
          </View>
          <View style={styles.vneidPill}>
            <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.primary} />
            <AppText variant="label" color={COLORS.primary} style={{ marginLeft: 4 }}>
              Đã định danh
            </AppText>
          </View>
        </View>
      </AppCard>

      {/* Emergency Quick Bar */}
      <View style={styles.emergencyBanner}>
        <View style={styles.emergencyLeft}>
          <View style={styles.emergencyIconCircle}>
            <Ionicons name="call" size={16} color={COLORS.textInverse} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="label" color={COLORS.danger} numberOfLines={1}>
              Khẩn cấp khu phố
            </AppText>
            <AppText variant="caption" color={COLORS.textSecondary} numberOfLines={1}>
              Hỗ trợ trật tự & sự cố 24/7
            </AppText>
          </View>
        </View>
        <View style={styles.emergencyActions}>
          <TouchableOpacity
            onPress={() => Linking.openURL('tel:113')}
            style={styles.policeBtn}
          >
            <Ionicons name="shield-outline" size={13} color={COLORS.danger} />
            <AppText variant="label" color={COLORS.danger} style={{ marginLeft: 3 }}>
              Công an
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/connect' as any)}
            style={styles.leaderBtn}
          >
            <Ionicons name="call-outline" size={13} color={COLORS.textInverse} />
            <AppText variant="label" color={COLORS.textInverse} style={{ marginLeft: 3 }}>
              Tổ trưởng
            </AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2-Column Action Cards */}
      <View style={styles.twoColRow}>
        <AppCard style={styles.halfCard}>
          <View style={styles.halfCardHeader}>
            <AppText variant="caption" color={COLORS.textSecondary}>
              Phản ánh & Kiến nghị
            </AppText>
            <View style={[styles.miniIconBadge, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="megaphone-outline" size={14} color={COLORS.primary} />
            </View>
          </View>
          <AppText variant="h3" style={styles.halfCardTitle}>
            {reports.length} Phản ánh
          </AppText>
          <AppText variant="caption" color={COLORS.textMuted} numberOfLines={2} style={styles.halfCardDesc}>
            Theo dõi tiến độ xử lý hạ tầng, đèn đường, vệ sinh khu phố.
          </AppText>
          <TouchableOpacity
            onPress={() => setTab('REPORTS')}
            style={styles.halfPrimaryBtn}
          >
            <AppText variant="label" color={COLORS.textInverse}>
              Xem phản ánh
            </AppText>
            <Ionicons name="arrow-forward" size={14} color={COLORS.textInverse} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </AppCard>

        <AppCard style={styles.halfCard}>
          <View style={styles.halfCardHeader}>
            <AppText variant="caption" color={COLORS.textSecondary}>
              An toàn khu phố
            </AppText>
            <View style={[styles.miniIconBadge, { backgroundColor: COLORS.secondaryLight }]}>
              <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.secondary} />
            </View>
          </View>
          <AppText variant="h3" style={styles.halfCardTitle}>
            Khu vực an toàn
          </AppText>
          <AppText variant="caption" color={COLORS.textMuted} numberOfLines={2} style={styles.halfCardDesc}>
            Tuần tra dân phòng ca đêm duy trì 22:00 - 05:00 hằng ngày.
          </AppText>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/notice' as any)}
            style={styles.halfOutlineBtn}
          >
            <AppText variant="label" color={COLORS.primary}>
              Xem thông báo
            </AppText>
            <Ionicons name="notifications-outline" size={13} color={COLORS.primary} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </AppCard>
      </View>

      {/* Dịch vụ cư dân (4-column grid) */}
      <View style={styles.serviceSection}>
        <View style={styles.sectionHeaderRow}>
          <AppText variant="h3">Dịch vụ cư dân</AppText>
          <TouchableOpacity onPress={() => router.push('/(tabs)/notice' as any)}>
            <AppText variant="caption" semibold color={COLORS.primary}>
              Tất cả tiện ích
            </AppText>
          </TouchableOpacity>
        </View>
        <View style={styles.serviceGrid}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/feed/report-create' as any)}
            style={styles.serviceItem}
          >
            <View style={styles.serviceIconBox}>
              <Ionicons name="camera-outline" size={22} color={COLORS.primary} />
            </View>
            <AppText variant="caption" semibold style={styles.serviceLabel}>
              Gửi phản ánh
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/feed/create')}
            style={styles.serviceItem}
          >
            <View style={styles.serviceIconBox}>
              <Ionicons name="create-outline" size={22} color={COLORS.primary} />
            </View>
            <AppText variant="caption" semibold style={styles.serviceLabel}>
              Đăng bài viết
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/connect' as any)}
            style={styles.serviceItem}
          >
            <View style={styles.serviceIconBox}>
              <Ionicons name="chatbubbles-outline" size={22} color={COLORS.primary} />
            </View>
            <AppText variant="caption" semibold style={styles.serviceLabel}>
              Hỏi Tổ trưởng
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/profile' as any)}
            style={styles.serviceItem}
          >
            <View style={styles.serviceIconBox}>
              <Ionicons name="id-card-outline" size={22} color={COLORS.primary} />
            </View>
            <AppText variant="caption" semibold style={styles.serviceLabel}>
              Sổ hộ khẩu
            </AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.infoTipBanner}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
          <AppText variant="caption" color={COLORS.textSecondary} style={{ flex: 1, marginLeft: 8 }}>
            Lịch thu gom rác tái chế tuần này: <AppText variant="caption" semibold>Thứ 3 - Thứ 5 - Thứ 7 (19:30)</AppText>
          </AppText>
        </View>
      </View>

      {/* Nhịp sống khu dân cư Header */}
      <View style={styles.feedTitleRow}>
        <View style={styles.feedTitleLeft}>
          <AppText variant="h3">Nhịp sống khu dân cư</AppText>
          <View style={styles.newPill}>
            <AppText variant="label" color={COLORS.primary}>
              Mới
            </AppText>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/feed/create')}
          style={styles.createPillBtn}
        >
          <Ionicons name="create-outline" size={14} color={COLORS.textInverse} />
          <AppText variant="label" color={COLORS.textInverse} style={{ marginLeft: 4 }}>
            Đăng bài
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderBottomCta = () => (
    <View style={styles.bottomCtaBanner}>
      <View style={{ flex: 1, paddingRight: SPACING.sm }}>
        <AppText variant="body" semibold color={COLORS.textInverse}>
          Bạn phát hiện vấn đề đô thị?
        </AppText>
        <AppText variant="caption" color="#DBEAFE">
          Đèn đường hỏng, rác thải tồn đọng...
        </AppText>
      </View>
      <TouchableOpacity
        onPress={() => router.push('/(tabs)/feed/report-create' as any)}
        style={styles.bottomCtaBtn}
      >
        <Ionicons name="camera-outline" size={16} color={COLORS.primary} />
        <AppText variant="label" color={COLORS.primary} style={{ marginLeft: 5 }}>
          Chụp gửi ngay
        </AppText>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Stitch Top App Bar */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.brandIconBox}>
            <Ionicons name="business" size={18} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="body" semibold numberOfLines={1}>
              {user?.neighborhoodName || 'Tổ 12 - P. Yên Hòa'}
            </AppText>
            <AppText variant="caption" color={COLORS.textMuted} numberOfLines={1}>
              Cầu Giấy, Hà Nội
            </AppText>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleSOS} style={styles.sosBtn}>
            <AppText variant="label" color={COLORS.textInverse}>
              SOS
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/notice' as any)}
            style={styles.bellBtn}
          >
            <Ionicons name="notifications-outline" size={20} color={COLORS.textPrimary} />
            <View style={styles.bellDot} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile' as any)}>
            <Avatar
              name={user?.fullName || 'CD'}
              uri={user?.avatarUrl}
              size={34}
              isOfficial={isOfficer}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sub-tabs: Bảng tin | Phản ánh sự cố */}
      <View style={styles.segmentRow}>
        <TouchableOpacity
          onPress={() => setTab('POSTS')}
          style={[styles.segmentBtn, tab === 'POSTS' && styles.segmentActive]}
        >
          <AppText variant="body" semibold={tab === 'POSTS'} color={tab === 'POSTS' ? COLORS.primary : COLORS.textSecondary}>
            Bảng tin
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab('REPORTS')}
          style={[styles.segmentBtn, tab === 'REPORTS' && styles.segmentActive]}
        >
          <AppText variant="body" semibold={tab === 'REPORTS'} color={tab === 'REPORTS' ? COLORS.primary : COLORS.textSecondary}>
            Phản ánh ({reports.length})
          </AppText>
        </TouchableOpacity>
      </View>

      {tab === 'POSTS' ? (
        <>
          <View style={styles.filterSection}>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm bài viết, thông báo..."
                placeholderTextColor={COLORS.textMuted}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={FILTERS}
              keyExtractor={(item) => item.key}
              contentContainerStyle={styles.chipRow}
              renderItem={({ item }) => {
                const active = filter === item.key;
                return (
                  <TouchableOpacity
                    onPress={() => setFilter(item.key)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <AppText
                      variant="caption"
                      semibold={active}
                      color={active ? COLORS.textInverse : COLORS.textSecondary}
                    >
                      {item.label}
                    </AppText>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <FlatList
              data={posts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={renderStitchHomeHeader}
              ListFooterComponent={renderBottomCta}
              refreshControl={
                <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[COLORS.primary]} />
              }
              renderItem={({ item }) => (
                <FeedPostCard
                  post={item}
                  onPressDetail={() => router.push(`/(tabs)/feed/${item.id}`)}
                  onReact={(type) => toggleReaction.mutate({ postId: item.id, type })}
                  onTogglePin={() => togglePin.mutate(item.id)}
                  onDelete={() => deletePost.mutate(item.id)}
                />
              )}
              ListEmptyComponent={
                <EmptyState
                  icon="newspaper-outline"
                  title="Chưa có bài viết nào"
                  description="Hãy là người đầu tiên chia sẻ thông tin cho tổ dân phố."
                  actionLabel="Đăng bài mới"
                  onAction={() => router.push('/(tabs)/feed/create')}
                />
              }
            />
          )}
        </>
      ) : loadingReports ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/feed/report-create' as any)}
              style={styles.createReportWideBtn}
            >
              <Ionicons name="add-circle-outline" size={20} color={COLORS.textInverse} />
              <AppText variant="body" semibold color={COLORS.textInverse} style={{ marginLeft: 8 }}>
                Tạo phản ánh mới (Camera & GPS)
              </AppText>
            </TouchableOpacity>
          }
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetchReports} colors={[COLORS.primary]} />
          }
          renderItem={({ item }) => {
            const st = STATUS_BADGE[item.status] || { label: item.status, tone: 'neutral' };
            return (
              <AppCard style={styles.reportCard}>
                <View style={styles.reportTop}>
                  <Badge label={st.label} tone={st.tone} />
                  <AppText variant="caption" color={COLORS.textMuted}>
                    {formatRelativeTimeVi(item.createdAt)}
                  </AppText>
                </View>
                <AppText variant="h3" style={styles.reportTitle}>
                  {item.title}
                </AppText>
                <View style={styles.reportLocationRow}>
                  <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
                  <AppText variant="caption" color={COLORS.textSecondary} style={{ marginLeft: 4 }}>
                    {item.addressText || 'Chưa gắn địa chỉ'}
                  </AppText>
                </View>
                <AppText variant="body" color={COLORS.textSecondary} numberOfLines={3}>
                  {item.description}
                </AppText>
                <View style={styles.reportFooter}>
                  <Badge
                    label={item.visibility === 'PRIVATE' ? 'Riêng tư' : 'Công khai'}
                    tone={item.visibility === 'PRIVATE' ? 'neutral' : 'primary'}
                  />
                  {isOfficer && (
                    <TouchableOpacity onPress={() => handleUpdateReport(item.id)}>
                      <AppText variant="caption" semibold color={COLORS.primary}>
                        Cập nhật trạng thái →
                      </AppText>
                    </TouchableOpacity>
                  )}
                </View>
              </AppCard>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="alert-circle-outline"
              title="Chưa có phản ánh nào"
              description="Gửi báo cáo sự cố hạ tầng, vệ sinh hoặc an ninh tới Ban điều hành."
              actionLabel="Gửi phản ánh"
              onAction={() => router.push('/(tabs)/feed/report-create' as any)}
            />
          }
        />
      )}
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
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: SPACING.sm },
  brandIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  sosBtn: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.md,
  },
  bellBtn: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
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
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  segmentActive: { borderBottomColor: COLORS.primary },
  filterSection: {
    backgroundColor: COLORS.surface,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    marginHorizontal: SPACING.lg,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    height: 40,
    marginBottom: SPACING.sm,
  },
  searchInput: { flex: 1, marginLeft: SPACING.sm, fontSize: 14, color: COLORS.textPrimary },
  chipRow: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
  },
  chipActive: { backgroundColor: COLORS.primary },
  listContent: { padding: SPACING.lg, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  homeHeaderContainer: { gap: SPACING.md, marginBottom: SPACING.md },
  welcomeCard: { padding: SPACING.md },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  welcomeLeft: { flex: 1 },
  welcomeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  welcomeName: { fontSize: 16, flexShrink: 1 },
  welcomeUnitRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  vneidPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primarySoft,
  },

  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.dangerLight,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  emergencyLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: SPACING.sm },
  emergencyIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  policeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  leaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },

  twoColRow: { flexDirection: 'row', gap: SPACING.md },
  halfCard: { flex: 1, padding: SPACING.md, justifyContent: 'space-between' },
  halfCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  miniIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halfCardTitle: { fontSize: 16, marginTop: 6 },
  halfCardDesc: { marginTop: 4, marginBottom: 10, lineHeight: 16 },
  halfPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  halfOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },

  serviceSection: { gap: SPACING.sm },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  serviceGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm },
  serviceItem: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 6,
  },
  serviceIconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceLabel: { textAlign: 'center', fontSize: 11 },
  infoTipBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },

  feedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  feedTitleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  newPill: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  createPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
  },

  bottomCtaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginTop: SPACING.md,
  },
  bottomCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: RADIUS.lg,
  },

  createReportWideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.md,
  },
  reportCard: { marginBottom: SPACING.md, gap: SPACING.xs },
  reportTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reportTitle: { marginBottom: 2 },
  reportLocationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
});
