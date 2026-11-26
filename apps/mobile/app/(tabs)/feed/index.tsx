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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topHeader}>
        <View>
          <AppText variant="caption" color={COLORS.primary} semibold>
            SMART NEIGHBORHOOD
          </AppText>
          <AppText variant="h2">{user?.neighborhoodName || 'Tổ dân phố số 5'}</AppText>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/profile' as any)}
          style={styles.profileBtn}
        >
          <Avatar
            name={user?.fullName || 'CD'}
            uri={user?.avatarUrl}
            size={40}
            isOfficial={isOfficer}
          />
        </TouchableOpacity>
      </View>

      {/* Sub-tabs: Bài viết | Phản ánh sự cố */}
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
            Phản ánh sự cố ({reports.length})
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
                placeholder="Tìm kiếm bài viết, cảnh báo, tác giả..."
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
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetchReports} colors={[COLORS.primary]} />
          }
          renderItem={({ item }) => {
            const st = STATUS_BADGE[item.status] || { label: item.status, tone: 'neutral' };
            return (
              <AppCard style={styles.reportCard}>
                <View style={styles.reportTop}>
                  <Badge label={st.label} tone={st.tone} />
                  <Badge
                    label={item.visibility === 'PRIVATE' ? 'Riêng tư' : 'Công khai'}
                    tone={item.visibility === 'PRIVATE' ? 'neutral' : 'primary'}
                  />
                </View>
                <AppText variant="h3" style={styles.reportTitle}>
                  {item.title}
                </AppText>
                <AppText variant="body" color={COLORS.textSecondary}>
                  {item.description}
                </AppText>
                <View style={styles.reportFooter}>
                  <AppText variant="caption" color={COLORS.textMuted}>
                    {item.addressText || 'Chưa gắn địa chỉ'} • {formatRelativeTimeVi(item.createdAt)}
                  </AppText>
                  {isOfficer && (
                    <TouchableOpacity onPress={() => handleUpdateReport(item.id)}>
                      <AppText variant="caption" semibold color={COLORS.primary}>
                        Cập nhật trạng thái
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
        <Ionicons name="add" size={24} color={COLORS.textInverse} />
        <AppText variant="body" semibold color={COLORS.textInverse} style={styles.fabText}>
          {tab === 'POSTS' ? 'Đăng bài' : 'Gửi phản ánh'}
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
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  profileBtn: { padding: 2 },
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
    borderRadius: RADIUS.md,
    height: 42,
    marginBottom: SPACING.sm,
  },
  searchInput: { flex: 1, marginLeft: SPACING.sm, fontSize: 15, color: COLORS.textPrimary },
  chipRow: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
  },
  chipActive: { backgroundColor: COLORS.primary },
  listContent: { padding: SPACING.lg, paddingBottom: 90 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  reportCard: { marginBottom: SPACING.md, gap: SPACING.xs },
  reportTop: { flexDirection: 'row', gap: SPACING.sm, marginBottom: 4 },
  reportTitle: { marginBottom: 2 },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
    elevation: 6,
  },
  fabText: { marginLeft: 6 },
});
