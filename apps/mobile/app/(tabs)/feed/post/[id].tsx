import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PostComment, ReportStatus } from '@todanpho/shared';
import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { AppButton, AppCard, AppText, Avatar, Badge, EmptyState } from '@/components';
import { FeedPostCard } from '@/components/FeedPostCard';
import {
  useAcceptReport,
  useAddComment,
  useDeletePost,
  usePostDetail,
  useReportPost,
  useStartDirectChat,
  useTogglePinPost,
  useToggleReaction,
  useUpdatePost,
  useUpdateReportStatus,
} from '@/services/feedService';
import { isOfficerRole, useAuthStore } from '@/store/useAuthStore';
import { formatRelativeTimeVi, getRoleLabel } from '@/utils/date';

const STATUS_LABEL: Record<string, { label: string; tone: 'warning' | 'primary' | 'success' | 'danger' | 'neutral' }> = {
  NEW: { label: 'Mới tiếp nhận', tone: 'warning' },
  PENDING: { label: 'Chờ xử lý', tone: 'warning' },
  ACCEPTED: { label: 'Đã tiếp nhận', tone: 'primary' },
  IN_PROGRESS: { label: 'Đang xử lý', tone: 'primary' },
  RESOLVED: { label: 'Đã giải quyết', tone: 'success' },
  REJECTED: { label: 'Từ chối', tone: 'danger' },
};

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isOfficer = isOfficerRole(user?.role);

  // Safeguard: If routed with id === 'create', immediately redirect to create screen
  React.useEffect(() => {
    if (id === 'create') {
      router.replace('/(tabs)/feed/create');
    }
  }, [id, router]);

  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const isPostIdValid = Boolean(id) && id !== 'create';
  const { data: post, isLoading, refetch } = usePostDetail(isPostIdValid ? id! : '');
  const toggleReaction = useToggleReaction();
  const addComment = useAddComment();
  const togglePin = useTogglePinPost();
  const deletePost = useDeletePost();
  const updatePost = useUpdatePost();
  const reportPost = useReportPost();
  const acceptReport = useAcceptReport();
  const updateReportStatus = useUpdateReportStatus();
  const startDirectChat = useStartDirectChat();

  const groupedComments = useMemo(() => {
    const all = post?.comments ?? [];
    const roots = all.filter((c) => !c.parentId);
    const replyMap = new Map<string, PostComment[]>();
    for (const c of all) {
      if (c.parentId) {
        const list = replyMap.get(c.parentId) ?? [];
        list.push(c);
        replyMap.set(c.parentId, list);
      }
    }
    return { roots, replyMap };
  }, [post?.comments]);

  const handleSendComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed || !id) return;
    addComment.mutate(
      {
        postId: id,
        payload: { content: trimmed, parentId: replyTo?.id },
      },
      {
        onSuccess: () => {
          setCommentText('');
          setReplyTo(null);
        },
      },
    );
  };

  const openEditModal = () => {
    if (!post) return;
    setEditTitle(post.title || '');
    setEditContent(post.content);
    setEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!id || editContent.trim().length < 2) {
      Alert.alert('Thiếu nội dung', 'Nội dung tối thiểu 2 ký tự.');
      return;
    }
    updatePost.mutate(
      {
        postId: id,
        payload: { title: editTitle.trim() || undefined, content: editContent.trim() },
      },
      {
        onSuccess: () => {
          setEditModalOpen(false);
          refetch();
        },
        onError: (err: any) => {
          Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể chỉnh sửa bài viết');
        },
      },
    );
  };

  const handleReportSubmit = () => {
    if (!id || reportReason.trim().length < 3) {
      Alert.alert('Thiếu lý do', 'Vui lòng nhập lý do báo cáo (tối thiểu 3 ký tự).');
      return;
    }
    reportPost.mutate(
      { postId: id, payload: { reason: reportReason.trim() } },
      {
        onSuccess: () => {
          setReportModalOpen(false);
          setReportReason('');
          Alert.alert('Đã gửi báo cáo', 'Ban điều hành sẽ xem xét nội dung này.');
        },
      },
    );
  };

  const handleIncidentAction = (nextStatus: ReportStatus, note: string) => {
    if (!post?.incidentReport) return;
    if (nextStatus === ReportStatus.ACCEPTED) {
      acceptReport.mutate(
        { reportId: post.incidentReport.id, note },
        { onSuccess: () => refetch() },
      );
      return;
    }
    updateReportStatus.mutate(
      { reportId: post.incidentReport.id, status: nextStatus, note },
      {
        onSuccess: () => refetch(),
        onError: (err: any) => {
          Alert.alert('Không hợp lệ', err?.response?.data?.message || 'Không thể chuyển trạng thái');
        },
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

  const incident = post.incidentReport;
  const incidentStatusMeta = incident
    ? STATUS_LABEL[incident.status] || { label: incident.status, tone: 'neutral' }
    : null;

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
          onMessageAuthor={() =>
            startDirectChat.mutate(post.authorId, {
              onSuccess: (conv) =>
                router.push({
                  pathname: '/(tabs)/connect/[id]',
                  params: { id: conv.id, title: post.author?.fullName || 'Trò chuyện' },
                } as any),
              onError: (err: any) => {
                const raw = err?.response?.data?.message || err?.message;
                const msg = Array.isArray(raw)
                  ? raw.join('\n')
                  : raw || 'Không thể mở cuộc trò chuyện với cư dân này.';
                Alert.alert('Không thể nhắn tin', msg);
              },
            })
          }
          onTogglePin={() => togglePin.mutate(post.id)}
          onEdit={post.authorId === user?.id ? openEditModal : undefined}
          onReportPost={() => setReportModalOpen(true)}
          onDelete={() =>
            deletePost.mutate(post.id, {
              onSuccess: () => router.back(),
              onError: (err: any) =>
                Alert.alert('Không thể xóa', err?.response?.data?.message || 'Lỗi khi xóa bài viết'),
            })
          }
        />

        {/* Incident Workflow & History Timeline */}
        {incident && incidentStatusMeta && (
          <AppCard style={styles.incidentCard}>
            <View style={styles.incidentHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Badge label={incident.code || 'PHẢN ÁNH'} tone="danger" />
                <Badge label={incidentStatusMeta.label} tone={incidentStatusMeta.tone} />
              </View>
              <AppText variant="caption" color={COLORS.textMuted}>
                Mức độ: {incident.priority}
              </AppText>
            </View>

            {incident.assignedTo && (
              <AppText variant="caption" color={COLORS.primary} style={{ marginBottom: 8 }}>
                Cán bộ phụ trách: {incident.assignedTo.fullName}
              </AppText>
            )}

            {/* Officer Workflow Actions */}
            {isOfficer &&
              incident.status !== ReportStatus.RESOLVED &&
              incident.status !== ReportStatus.REJECTED && (
                <View style={styles.officerActions}>
                  {(incident.status === ReportStatus.NEW ||
                    incident.status === ReportStatus.PENDING) && (
                    <TouchableOpacity
                      onPress={() => handleIncidentAction(ReportStatus.ACCEPTED, 'Ban điều hành đã tiếp nhận')}
                      style={styles.officerBtn}
                    >
                      <AppText variant="label" color={COLORS.textInverse}>Tiếp nhận</AppText>
                    </TouchableOpacity>
                  )}
                  {(incident.status === ReportStatus.ACCEPTED ||
                    incident.status === ReportStatus.PENDING) && (
                    <TouchableOpacity
                      onPress={() => handleIncidentAction(ReportStatus.IN_PROGRESS, 'Đang cử đội kỹ thuật xử lý')}
                      style={[styles.officerBtn, { backgroundColor: COLORS.warning }]}
                    >
                      <AppText variant="label" color={COLORS.textInverse}>Đang xử lý</AppText>
                    </TouchableOpacity>
                  )}
                  {(incident.status === ReportStatus.ACCEPTED ||
                    incident.status === ReportStatus.IN_PROGRESS) && (
                    <TouchableOpacity
                      onPress={() => handleIncidentAction(ReportStatus.RESOLVED, 'Đã khắc phục xong sự cố')}
                      style={[styles.officerBtn, { backgroundColor: COLORS.secondary }]}
                    >
                      <AppText variant="label" color={COLORS.textInverse}>Hoàn thành</AppText>
                    </TouchableOpacity>
                  )}
                </View>
              )}

            {/* Status History Timeline */}
            {incident.statusHistory && incident.statusHistory.length > 0 && (
              <View style={styles.historyBlock}>
                <AppText variant="label" color={COLORS.textSecondary} style={{ marginBottom: 6 }}>
                  Lịch sử xử lý ({incident.statusHistory.length})
                </AppText>
                {incident.statusHistory.map((h) => (
                  <View key={h.id} style={styles.historyRow}>
                    <View style={styles.historyDot} />
                    <View style={{ flex: 1 }}>
                      <AppText variant="caption" semibold>
                        {STATUS_LABEL[h.toStatus]?.label || h.toStatus} • {h.changedBy.fullName}
                      </AppText>
                      {h.note ? (
                        <AppText variant="caption" color={COLORS.textSecondary}>
                          {h.note}
                        </AppText>
                      ) : null}
                      <AppText variant="caption" color={COLORS.textMuted} style={{ fontSize: 11 }}>
                        {formatRelativeTimeVi(h.createdAt)}
                      </AppText>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </AppCard>
        )}

        <AppText variant="h3" style={styles.commentsHeading}>
          Bình luận ({post.comments.length})
        </AppText>

        {groupedComments.roots.length === 0 ? (
          <AppCard>
            <AppText variant="body" color={COLORS.textSecondary}>
              Chưa có bình luận nào. Hãy để lại ý kiến của bạn!
            </AppText>
          </AppCard>
        ) : (
          groupedComments.roots.map((cmt) => {
            const replies = groupedComments.replyMap.get(cmt.id) ?? [];
            return (
              <View key={cmt.id} style={{ marginBottom: SPACING.md }}>
                <View style={styles.commentItem}>
                  <Avatar name={cmt.author.fullName} uri={cmt.author.avatarUrl} size={36} />
                  <View style={styles.commentBubble}>
                    <View style={styles.commentHeader}>
                      <AppText variant="body" semibold>{cmt.author.fullName}</AppText>
                      <AppText variant="label" color={COLORS.textMuted}>
                        {getRoleLabel(cmt.author.role)}
                      </AppText>
                    </View>
                    <AppText variant="body" style={styles.commentContent}>{cmt.content}</AppText>
                    <View style={styles.commentMetaRow}>
                      <AppText variant="caption" color={COLORS.textMuted}>
                        {formatRelativeTimeVi(cmt.createdAt)}
                      </AppText>
                      <TouchableOpacity onPress={() => setReplyTo(cmt)}>
                        <AppText variant="caption" semibold color={COLORS.primary}>
                          Trả lời
                        </AppText>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {replies.map((rep) => (
                  <View key={rep.id} style={styles.replyItem}>
                    <Avatar name={rep.author.fullName} uri={rep.author.avatarUrl} size={28} />
                    <View style={styles.commentBubble}>
                      <View style={styles.commentHeader}>
                        <AppText variant="caption" semibold>{rep.author.fullName}</AppText>
                        <AppText variant="caption" color={COLORS.textMuted} style={{ fontSize: 11 }}>
                          {formatRelativeTimeVi(rep.createdAt)}
                        </AppText>
                      </View>
                      <AppText variant="body">{rep.content}</AppText>
                    </View>
                  </View>
                ))}
              </View>
            );
          })
        )}
      </ScrollView>

      {replyTo && (
        <View style={styles.replyBanner}>
          <AppText variant="caption" color={COLORS.primary} numberOfLines={1} style={{ flex: 1 }}>
            Đang trả lời {replyTo.author.fullName}: "{replyTo.content}"
          </AppText>
          <TouchableOpacity onPress={() => setReplyTo(null)}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Comment Composer */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder={replyTo ? `Trả lời ${replyTo.author.fullName}...` : 'Viết bình luận...'}
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

      {/* Edit Post Modal */}
      <Modal visible={editModalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <AppCard style={styles.modalCard}>
            <AppText variant="h3" style={{ marginBottom: SPACING.sm }}>Chỉnh sửa bài viết</AppText>
            <TextInput
              style={styles.modalInput}
              placeholder="Tiêu đề (tùy chọn)"
              placeholderTextColor={COLORS.textMuted}
              value={editTitle}
              onChangeText={setEditTitle}
            />
            <TextInput
              style={[styles.modalInput, { minHeight: 110 }]}
              placeholder="Nội dung bài viết..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              textAlignVertical="top"
              value={editContent}
              onChangeText={setEditContent}
            />
            <View style={styles.modalBtnRow}>
              <AppButton title="Hủy" variant="outline" onPress={() => setEditModalOpen(false)} style={{ flex: 1 }} />
              <AppButton title="Lưu" onPress={handleSaveEdit} loading={updatePost.isPending} style={{ flex: 1 }} />
            </View>
          </AppCard>
        </View>
      </Modal>

      {/* Report Content Modal */}
      <Modal visible={reportModalOpen} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <AppCard style={styles.modalCard}>
            <AppText variant="h3" style={{ marginBottom: SPACING.sm }}>Báo cáo bài viết vi phạm</AppText>
            <TextInput
              style={[styles.modalInput, { minHeight: 90 }]}
              placeholder="Nhập lý do báo cáo nội dung này..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              textAlignVertical="top"
              value={reportReason}
              onChangeText={setReportReason}
            />
            <View style={styles.modalBtnRow}>
              <AppButton title="Hủy" variant="outline" onPress={() => setReportModalOpen(false)} style={{ flex: 1 }} />
              <AppButton title="Gửi báo cáo" variant="danger" onPress={handleReportSubmit} loading={reportPost.isPending} style={{ flex: 1 }} />
            </View>
          </AppCard>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: SPACING.lg, paddingBottom: SPACING.xl },

  incidentCard: { marginBottom: SPACING.md, gap: SPACING.sm, borderColor: '#5C262E' },
  incidentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  officerActions: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  officerBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  historyBlock: {
    marginTop: 4,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    gap: 8,
  },
  historyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 5,
  },

  commentsHeading: { marginBottom: SPACING.md },
  commentItem: { flexDirection: 'row', alignItems: 'flex-start' },
  replyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginLeft: 42,
    marginTop: 8,
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
  commentContent: { marginBottom: 4 },
  commentMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
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
  sendBtnDisabled: { opacity: 0.45 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: { gap: SPACING.md },
  modalInput: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  modalBtnRow: { flexDirection: 'row', gap: SPACING.sm },
});
