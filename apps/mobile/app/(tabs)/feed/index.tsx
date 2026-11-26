import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FeedFilterType } from '@todanpho/shared';
import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { AppText, Avatar, EmptyState } from '@/components';
import { FeedPostCard } from '@/components/FeedPostCard';
import {
  useDeletePost,
  useFeedPosts,
  useTogglePinPost,
  useToggleReaction,
} from '@/services/feedService';
import { isOfficerRole, useAuthStore } from '@/store/useAuthStore';

const FILTERS: { key: FeedFilterType; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'OFFICIAL', label: 'Ban điều hành' },
  { key: 'WARNING', label: 'Cảnh báo' },
  { key: 'LIFE', label: 'Đời sống' },
  { key: 'PINNED', label: 'Đã ghim' },
];

export default function FeedScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [filter, setFilter] = useState<FeedFilterType>('ALL');
  const [search, setSearch] = useState('');

  const { data: posts = [], isLoading, isRefetching, refetch } = useFeedPosts(filter, search);
  const toggleReaction = useToggleReaction();
  const togglePin = useTogglePinPost();
  const deletePost = useDeletePost();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Neighborhood Header */}
      <View style={styles.topHeader}>
        <View>
          <AppText variant="caption" color={COLORS.primary} semibold>
            SMART NEIGHBORHOOD
          </AppText>
          <AppText variant="h2">{user.neighborhoodName}</AppText>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/profile' as any)}
          style={styles.profileBtn}
        >
          <Avatar
            name={user.fullName}
            uri={user.avatarUrl}
            size={40}
            isOfficial={isOfficerRole(user.role)}
          />
        </TouchableOpacity>
      </View>

      {/* Search & Filter */}
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

      {/* Feed List */}
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
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[COLORS.primary]}
            />
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
              description="Hãy là người đầu tiên chia sẻ thông tin hữu ích cho tổ dân phố."
              actionLabel="Đăng bài mới"
              onAction={() => router.push('/(tabs)/feed/create')}
            />
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push('/(tabs)/feed/create')}
        style={styles.fab}
      >
        <Ionicons name="add" size={24} color={COLORS.textInverse} />
        <AppText variant="body" semibold color={COLORS.textInverse} style={styles.fabText}>
          Đăng bài
        </AppText>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
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
  profileBtn: {
    padding: 2,
  },
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
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  chipRow: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: 90,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    marginLeft: 6,
  },
});
