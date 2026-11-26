import React from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PostCategory, PostItem, ReactionType } from '@todanpho/shared';
import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { AppCard } from './AppCard';
import { AppText } from './AppText';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { formatRelativeTimeVi, getRoleLabel } from '@/utils/date';
import { isLeaderRole, useAuthStore } from '@/store/useAuthStore';

interface FeedPostCardProps {
  post: PostItem;
  onPressDetail?: () => void;
  onReact: (type: ReactionType) => void;
  onMessageAuthor?: () => void;
  onTogglePin?: () => void;
  onEdit?: () => void;
  onReportPost?: () => void;
  onDelete?: () => void;
  showFullContent?: boolean;
}

const REACTIONS: {
  type: ReactionType;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
}[] = [
  { type: 'LIKE', icon: 'thumbs-up', label: 'Thích', color: COLORS.primary },
  { type: 'HEART', icon: 'heart', label: 'Tim', color: COLORS.danger },
];

export function FeedPostCard({
  post,
  onPressDetail,
  onReact,
  onMessageAuthor,
  onTogglePin,
  onEdit,
  onReportPost,
  onDelete,
  showFullContent = false,
}: FeedPostCardProps) {
  const currentUser = useAuthStore((s) => s.user);
  const canLead = isLeaderRole(currentUser?.role);
  const canDelete = canLead || post.authorId === currentUser?.id;

  const handleMoreActions = () => {
    const options: {
      text: string;
      onPress?: () => void;
      style?: 'destructive' | 'cancel';
    }[] = [];

    if (post.authorId === currentUser?.id && onEdit) {
      options.push({
        text: 'Chỉnh sửa bài viết',
        onPress: onEdit,
      });
    }
    if (canLead && onTogglePin) {
      options.push({
        text: post.isPinned ? 'Bỏ ghim bài viết' : 'Ghim lên đầu bảng tin',
        onPress: onTogglePin,
      });
    }
    if (post.authorId !== currentUser?.id && onReportPost) {
      options.push({
        text: 'Báo cáo bài viết vi phạm',
        onPress: onReportPost,
      });
    }
    if (canDelete && onDelete) {
      options.push({
        text: 'Xóa bài viết',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Xác nhận xóa', 'Bạn có chắc muốn xóa bài viết này?', [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Xóa', style: 'destructive', onPress: onDelete },
          ]),
      });
    }
    options.push({ text: 'Đóng', style: 'cancel' });

    Alert.alert('Tùy chọn bài viết', undefined, options);
  };

  return (
    <AppCard style={styles.card}>
      {post.isPinned && (
        <View style={styles.pinnedRow}>
          <Ionicons name="pin" size={14} color={COLORS.primary} />
          <AppText variant="label" color={COLORS.primary} style={styles.pinnedText}>
            Bài viết được ghim bởi Ban điều hành
          </AppText>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Avatar
          name={post.author.fullName}
          uri={post.author.avatarUrl}
          size={44}
          isOfficial={post.isOfficial}
        />
        <View style={styles.authorMeta}>
          <View style={styles.authorNameRow}>
            <AppText variant="h3" numberOfLines={1} style={styles.authorName}>
              {post.author.fullName}
            </AppText>
            {post.isOfficial && (
              <Badge
                label="Ban điều hành"
                tone="primary"
                style={styles.officialBadge}
              />
            )}
            {post.incidentReport && (
              <Badge
                label={`${post.incidentReport.code || 'Sự cố'} • ${post.incidentReport.status}`}
                tone="danger"
                style={styles.officialBadge}
              />
            )}
            {post.category === PostCategory.WARNING && !post.incidentReport && (
              <Badge
                label="Cảnh báo"
                tone="danger"
                style={styles.officialBadge}
              />
            )}
          </View>
          <AppText variant="caption" color={COLORS.textSecondary}>
            {getRoleLabel(post.author.role, post.author.staffTitle)} •{' '}
            {formatRelativeTimeVi(post.createdAt)}
          </AppText>
        </View>

        <TouchableOpacity onPress={handleMoreActions} hitSlop={10}>
          <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <TouchableOpacity
        activeOpacity={onPressDetail ? 0.85 : 1}
        onPress={onPressDetail}
        disabled={!onPressDetail}
      >
        {post.title ? (
          <AppText variant="h3" style={styles.postTitle}>
            {post.title}
          </AppText>
        ) : null}
        <AppText
          variant="bodyLarge"
          style={styles.content}
          numberOfLines={showFullContent ? undefined : 6}
        >
          {post.content}
        </AppText>
      </TouchableOpacity>

      {post.locationName ? (
        <View style={styles.locationRow}>
          <Ionicons name="location" size={14} color={COLORS.primary} />
          <AppText variant="caption" semibold color={COLORS.primary} style={{ marginLeft: 4 }}>
            {post.locationName}
          </AppText>
        </View>
      ) : null}

      {/* Media Gallery */}
      {post.media.length > 0 && (
        <ScrollView
          horizontal={post.media.length > 1}
          showsHorizontalScrollIndicator={false}
          style={styles.mediaScroll}
          contentContainerStyle={styles.mediaContainer}
        >
          {post.media.map((m) => (
            <TouchableOpacity
              key={m.id}
              activeOpacity={0.9}
              onPress={onPressDetail}
              disabled={!onPressDetail}
            >
              <Image
                source={{ uri: m.url }}
                style={[
                  styles.mediaImage,
                  post.media.length === 1 ? styles.singleImage : styles.multiImage,
                ]}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Stats */}
      <View style={styles.statsRow}>
        <AppText variant="caption" color={COLORS.textSecondary}>
          {post.reactionCount} lượt tương tác
        </AppText>
        <TouchableOpacity onPress={onPressDetail} disabled={!onPressDetail}>
          <AppText variant="caption" color={COLORS.textSecondary}>
            {post.commentCount} bình luận
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Actions */}
      <View style={styles.actionBar}>
        <View style={styles.reactionGroup}>
          {REACTIONS.map((item) => {
            const active = post.userReaction === item.type;
            return (
              <TouchableOpacity
                key={item.type}
                onPress={() => onReact(item.type)}
                style={[styles.actionBtn, active && styles.actionBtnActive]}
              >
                <Ionicons
                  name={active ? item.icon : (`${item.icon}-outline` as any)}
                  size={16}
                  color={active ? item.color : COLORS.textSecondary}
                />
                <AppText
                  variant="caption"
                  semibold={active}
                  color={active ? item.color : COLORS.textSecondary}
                  style={styles.actionLabel}
                >
                  {item.label}
                </AppText>
              </TouchableOpacity>
            );
          })}

          {onMessageAuthor && post.authorId !== currentUser?.id && (
            <TouchableOpacity onPress={onMessageAuthor} style={styles.actionBtn}>
              <Ionicons name="paper-plane-outline" size={15} color={COLORS.secondary} />
              <AppText
                variant="caption"
                semibold
                color={COLORS.secondary}
                style={styles.actionLabel}
              >
                Nhắn tin
              </AppText>
            </TouchableOpacity>
          )}
        </View>

        {onPressDetail && (
          <TouchableOpacity onPress={onPressDetail} style={styles.actionBtn}>
            <Ionicons name="chatbubble-outline" size={16} color={COLORS.textSecondary} />
            <AppText
              variant="caption"
              color={COLORS.textSecondary}
              style={styles.actionLabel}
            >
              Bình luận
            </AppText>
          </TouchableOpacity>
        )}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.md,
  },
  pinnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    paddingBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  pinnedText: {
    marginLeft: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  authorMeta: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  authorName: {
    flexShrink: 1,
  },
  officialBadge: {
    paddingVertical: 2,
  },
  postTitle: {
    marginBottom: 4,
  },
  content: {
    lineHeight: 23,
    marginBottom: SPACING.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
  },
  mediaScroll: {
    marginBottom: SPACING.md,
  },
  mediaContainer: {
    gap: SPACING.sm,
  },
  mediaImage: {
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
  },
  singleImage: {
    width: 320,
    height: 200,
    resizeMode: 'cover',
  },
  multiImage: {
    width: 240,
    height: 180,
    resizeMode: 'cover',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.sm,
  },
  reactionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionBtnActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primarySoft,
  },
  actionLabel: {
    marginLeft: 4,
  },
});
