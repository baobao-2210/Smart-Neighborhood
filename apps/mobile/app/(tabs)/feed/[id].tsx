import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { AppCard, AppText, Avatar, EmptyState } from '@/components';
import { FeedPostCard } from '@/components/FeedPostCard';
import {
  useAddComment,
  useDeletePost,
  usePostDetail,
  useTogglePinPost,
  useToggleReaction,
} from '@/services/feedService';
import { formatRelativeTimeVi, getRoleLabel } from '@/utils/date';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [commentText, setCommentText] = useState('');

  const { data: post, isLoading } = usePostDetail(id ?? '');
  const toggleReaction = useToggleReaction();
  const addComment = useAddComment();
  const togglePin = useTogglePinPost();
  const deletePost = useDeletePost();

  const handleSendComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed || !id) return;
    addComment.mutate(
      { postId: id, payload: { content: trimmed } },
      {
        onSuccess: () => setCommentText(''),
      },
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!post) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="Không tìm thấy bài viết"
        description="Bài viết có thể đã bị xóa hoặc không thuộc tổ dân phố của bạn."
        actionLabel="Quay lại bảng tin"
        onAction={() => router.back()}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <FeedPostCard
          post={post}
          showFullContent
          onReact={(type) => toggleReaction.mutate({ postId: post.id, type })}
          onTogglePin={() => togglePin.mutate(post.id)}
          onDelete={() =>
            deletePost.mutate(post.id, { onSuccess: () => router.back() })
          }
        />

        <AppText variant="h3" style={styles.commentsHeading}>
          Bình luận ({post.comments.length})
        </AppText>

        {post.comments.length === 0 ? (
          <AppCard>
            <AppText variant="body" color={COLORS.textSecondary}>
              Chưa có bình luận nào. Hãy để lại ý kiến của bạn!
            </AppText>
          </AppCard>
        ) : (
          post.comments.map((cmt) => (
            <View key={cmt.id} style={styles.commentItem}>
              <Avatar name={cmt.author.fullName} uri={cmt.author.avatarUrl} size={36} />
              <View style={styles.commentBubble}>
                <View style={styles.commentHeader}>
                  <AppText variant="body" semibold>
                    {cmt.author.fullName}
                  </AppText>
                  <AppText variant="label" color={COLORS.textMuted}>
                    {getRoleLabel(cmt.author.role)}
                  </AppText>
                </View>
                <AppText variant="body" style={styles.commentContent}>
                  {cmt.content}
                </AppText>
                <AppText variant="caption" color={COLORS.textMuted}>
                  {formatRelativeTimeVi(cmt.createdAt)}
                </AppText>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Comment Composer */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Viết bình luận..."
          placeholderTextColor={COLORS.textMuted}
          value={commentText}
          onChangeText={setCommentText}
          multiline
        />
        <TouchableOpacity
          onPress={handleSendComment}
          disabled={!commentText.trim() || addComment.isPending}
          style={[
            styles.sendBtn,
            (!commentText.trim() || addComment.isPending) && styles.sendBtnDisabled,
          ]}
        >
          <Ionicons name="send" size={18} color={COLORS.textInverse} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  commentsHeading: {
    marginBottom: SPACING.md,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  commentBubble: {
    flex: 1,
    marginLeft: SPACING.sm,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentContent: {
    marginBottom: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    maxHeight: 100,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
});

