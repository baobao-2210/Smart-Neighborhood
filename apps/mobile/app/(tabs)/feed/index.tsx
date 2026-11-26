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
  { key: 'WARNING', label: 'Cảnh báo khẩn' },
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
      'Hỗ trợ khẩn cấp & Loa phường',
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

  const renderEspressoHeader = () => (
    <View style={styles.homeHeaderContainer}>
      {/* Phát thanh nội bộ */}
      <AppCard style={styles.broadcastCard}>
        <View style={styles.broadcastIconCircle}>
          <Ionicons name="volume-high" size={18} color={COLORS.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.broadcastLabelRow}>
            <AppText variant="label" color={COLORS.warning}>
              PHÁT THANH NỘI BỘ
            </AppText>
            <View style={styles.liveDot} />
          </View>
          <AppText variant="caption" color={COLORS.textSecondary} numberOfLines={1}>
            Lịch thu gom rác tái chế: Thứ 3 - Thứ 5 - Thứ 7 (19:30)
          </AppText>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/notice' as any)}
          style={styles.listenPill}
        >
          <AppText variant="label" color={COLORS.primary}>
            Nghe
          </AppText>
          <Ionicons name="play" size={11} color={COLORS.primary} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </AppCard>

      {/* Quick Composer Box */}
      <AppCard style={styles.composerCard}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/feed/create')}
          style={styles.composerInputRow}
        >
          <Avatar
            name={user?.fullName || 'CD'}
            uri={user?.avatarUrl}
            size={38}
            isOfficial={isOfficer}
          />
          <View style={styles.composerPlaceholder}>
            <AppText variant="body" color={COLORS.textMuted} numberOfLines={1}>
              Hôm nay khu phố ta có tin gì mới, {user?.fullName?.split(' ').pop() || 'bạn'}?
            </AppText>
          </View>
        </TouchableOpacity>

        <View style={styles.composerActionsRow}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/feed/create')}
            style={[styles.composerPill, { borderColor: '#134E4A', backgroundColor: COLORS.secondaryLight }]}
          >
            <Ionicons name="images-outline" size={15} color={COLORS.secondary} />
            <AppText variant="caption" semibold color={COLORS.secondary} style={{ marginLeft: 5 }}>
              Ảnh/Video
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/feed/report-create' as any)}
            style={[styles.composerPill, { borderColor: '#4C1D24', backgroundColor: COLORS.dangerLight }]}
          >
            <Ionicons name="warning-outline" size={15} color={COLORS.danger} />
            <AppText variant="caption" semibold color={COLORS.danger} style={{ marginLeft: 5 }}>
              Báo sự cố
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/connect' as any)}
            style={[styles.composerPill, { borderColor: COLORS.primarySoft, backgroundColor: COLORS.primaryLight }]}
          >
            <Ionicons name="chatbubbles-outline" size={15} color={COLORS.primary} />
            <AppText variant="caption" semibold color={COLORS.primary} style={{ marginLeft: 5 }}>
              Kết nối
            </AppText>
          </TouchableOpacity>
        </View>
      </AppCard>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Espresso Dark Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.brandIconBox}>
            <Ionicons name="business" size={18} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.brandTitleRow}>
              <AppText variant="label" color={COLORS.textPrimary} style={{ fontSize: 13 }}>
                SMART{' '}
              </AppText>
              <AppText variant="label" color={COLORS.warning} style={{ fontSize: 13 }}>
                NEIGHBORHOOD
              </AppText>
            </View>
            <AppText variant="caption" color={COLORS.textMuted} numberOfLines={1}>
              {user?.neighborhoodName || 'Tổ dân phố 12 - P. Dịch Vọng Hậu'}
            </AppText>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleSOS} style={styles.sosIconBtn}>
            <Ionicons name="megaphone-outline" size={18} color={COLORS.warning} />
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
          <AppText variant="body" semibold={tab === 'POSTS'} color={tab === 'POSTS' ? COLORS.primary : COLORS.textMuted}>
            Bảng tin
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab('REPORTS')}
          style={[styles.segmentBtn, tab === 'REPORTS' && styles.segmentActive]}
        >
          <AppText variant="body" semibold={tab === 'REPORTS'} color={tab === 'REPORTS' ? COLORS.primary : COLORS.textMuted}>
            Phản ánh sự cố ({reports.length})
          </AppText>
        </TouchableOpacity>
      </View>

      {tab === 'POSTS' ? (
        <>
          <View style={styles.filterSection}>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={17} color={COLORS.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm bài viết, thông báo, sự cố, tác giả..."
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
                      color={active ? COLORS.primary : COLORS.textSecondary}
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
              ListHeaderComponent={renderEspressoHeader}
              refreshControl={
                <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
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
              <Ionicons name="warning-outline" size={18} color={COLORS.textInverse} />
              <AppText variant="body" semibold color={COLORS.textInverse} style={{ marginLeft: 8 }}>
                Báo sự cố mới (Camera & GPS)
              </AppText>
            </TouchableOpacity>
          }
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetchReports} tintColor={COLORS.primary} />
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
                  <Ionicons name="location-outline" size={14} color={COLORS.danger} />
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

      {/* Stitch Floating + Đăng bài Cyan Pill */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() =>
          router.push(
            tab === 'POSTS'
              ? '/(tabs)/feed/create'
              : ('/(tabs)/feed/report-create' as any),
          )
        }
        style={styles.fab}
      >
        <Ionicons name="add" size={20} color={COLORS.textInverse} />
        <AppText variant="label" color={COLORS.textInverse} style={{ marginLeft: 4, fontSize: 13 }}>
          {tab === 'POSTS' ? 'Đăng bài' : 'Báo sự cố'}
        </AppText>
      </TouchableOpacity>
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
    backgroundColor: '#14100E',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: SPACING.sm },
  brandIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitleRow: { flexDirection: 'row', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  sosIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.warningLight,
    borderWidth: 1,
    borderColor: '#5C3D12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: '#14100E',
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
    backgroundColor: COLORS.background,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: SPACING.lg,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    height: 40,
    marginBottom: SPACING.sm,
  },
  searchInput: { flex: 1, marginLeft: SPACING.sm, fontSize: 13, color: COLORS.textPrimary },
  chipRow: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  listContent: { padding: SPACING.lg, paddingBottom: 90 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  homeHeaderContainer: { gap: SPACING.md, marginBottom: SPACING.md },
  broadcastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderColor: '#453017',
  },
  broadcastIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  broadcastLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.danger },
  listenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },

  composerCard: { padding: SPACING.md, gap: SPACING.md },
  composerInputRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  composerPlaceholder: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  composerActionsRow: { flexDirection: 'row', gap: SPACING.sm },
  composerPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
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

  fab: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 11,
    borderRadius: RADIUS.full,
    elevation: 6,
  },
});
