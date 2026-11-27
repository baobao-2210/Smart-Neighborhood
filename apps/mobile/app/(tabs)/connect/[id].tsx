import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { AppText, Avatar } from '@/components';
import { API_BASE_URL, apiClient } from '@/services/apiClient';
import {
  CONNECT_KEYS,
  useConversations,
  useMessages,
  useSendMessage,
} from '@/services/connectService';
import { isLeaderRole, isOfficerRole, useAuthStore } from '@/store/useAuthStore';
import { formatRelativeTimeVi, getRoleLabel } from '@/utils/date';

const QUICK_PROMPTS = [
  'Chào bạn, mình nhắn từ Bảng tin tổ dân phố',
  'Nhờ Tổ trưởng kiểm tra giúp sự cố khu phố',
  'Cảm ơn bạn nhiều nhé!',
];

export default function ChatRoomScreen() {
  const router = useRouter();
  const {
    id: conversationId,
    title: paramTitle,
    subtitle: paramSubtitle,
    type: paramType,
  } = useLocalSearchParams<{
    id: string;
    title?: string;
    subtitle?: string;
    type?: string;
  }>();
  const queryClient = useQueryClient();
  const { user, accessToken } = useAuthStore();
  const canModerate = isLeaderRole(user?.role);

  const [text, setText] = useState('');
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [previewFullUrl, setPreviewFullUrl] = useState<string | null>(null);
  const [quickSwitchOpen, setQuickSwitchOpen] = useState(false);

  const { data: conversations = [] } = useConversations();
  const { data: messages = [], isLoading } = useMessages(conversationId ?? '');
  const sendMessage = useSendMessage(conversationId ?? '');

  const currentConv = useMemo(
    () => conversations.find((c: any) => c.id === conversationId),
    [conversations, conversationId],
  );

  const otherUser = useMemo(
    () => (currentConv?.members ?? []).find((m: any) => m.userId !== user?.id)?.user,
    [currentConv, user?.id],
  );

  const convType = paramType || currentConv?.type || 'DIRECT';

  const roomTitle = useMemo(() => {
    if (paramTitle) return paramTitle;
    if (!currentConv) return 'Phòng trò chuyện';
    if (currentConv.type === 'DIRECT') {
      return otherUser?.fullName || currentConv.name || 'Trò chuyện';
    }
    return currentConv.name || otherUser?.fullName || 'Phòng trò chuyện';
  }, [paramTitle, currentConv, otherUser]);

  const roomSubtitle = useMemo(() => {
    if (paramSubtitle) return paramSubtitle;
    if (convType === 'SUPPORT') return 'Ban điều hành Tổ dân phố';
    if (convType === 'GROUP') {
      const count = currentConv?.members?.length;
      return count ? `Nhóm cộng đồng • ${count} thành viên` : 'Nhóm tổ dân phố';
    }
    if (otherUser) return `${getRoleLabel(otherUser.role, otherUser.staffTitle)} • Hoạt động`;
    return 'Trò chuyện trực tiếp';
  }, [paramSubtitle, convType, currentConv, otherUser]);

  useEffect(() => {
    if (!conversationId || !accessToken) return;

    const socket = io(`${API_BASE_URL}/ws/chat`, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      socket.emit('client:join_conversation', { conversationId });
    });

    socket.on('server:new_message', () => {
      queryClient.invalidateQueries({ queryKey: CONNECT_KEYS.messages(conversationId) });
      queryClient.invalidateQueries({ queryKey: CONNECT_KEYS.conversations });
    });

    return () => {
      socket.disconnect();
    };
  }, [conversationId, accessToken, queryClient]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.75,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setPendingImageUri(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Chưa cấp quyền Camera', 'Vui lòng cấp quyền để chụp ảnh gửi tin nhắn.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.75,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setPendingImageUri(result.assets[0].uri);
    }
  };

  const handleSend = (overrideText?: string) => {
    const rawText = typeof overrideText === 'string' ? overrideText : text;
    const trimmed = rawText.trim();
    if ((!trimmed && !pendingImageUri) || !conversationId) return;

    const contentToSend = trimmed || '[Hình ảnh]';
    const imgToSend = pendingImageUri;
    if (!overrideText) setText('');
    setPendingImageUri(null);

    sendMessage.mutate(
      { content: contentToSend, localImageUri: imgToSend },
      {
        onError: (err: any) => {
          if (!overrideText) setText(trimmed);
          setPendingImageUri(imgToSend);
          const raw = err?.response?.data?.message || err?.message;
          const msg = Array.isArray(raw)
            ? raw.join('\n')
            : raw || 'Vui lòng kiểm tra kết nối mạng.';
          Alert.alert('Không thể gửi tin nhắn', msg);
        },
      },
    );
  };

  const handleLongPress = (msg: any) => {
    const options: any[] = [
      {
        text: 'Báo cáo vi phạm',
        onPress: () =>
          apiClient
            .post(`/api/v1/messages/${msg.id}/report`, { reason: 'Nội dung không phù hợp' })
            .then(() => Alert.alert('Đã báo cáo', 'Cảm ơn bạn đã phản hồi.'))
            .catch(() => Alert.alert('Lỗi', 'Không thể gửi báo cáo.')),
      },
    ];
    if (canModerate) {
      options.push({
        text: msg.isModerated ? 'Hiện lại tin nhắn' : 'Ẩn tin nhắn (Kiểm duyệt)',
        style: 'destructive',
        onPress: () =>
          apiClient
            .patch(`/api/v1/messages/${msg.id}/moderate`, { isModerated: !msg.isModerated })
            .then(() =>
              queryClient.invalidateQueries({
                queryKey: CONNECT_KEYS.messages(conversationId ?? ''),
              }),
            ),
      });
    }
    options.push({ text: 'Đóng', style: 'cancel' });
    Alert.alert('Tùy chọn tin nhắn', undefined, options);
  };

  const canSend = Boolean(text.trim() || pendingImageUri);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom Polished Chat Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/connect' as any)}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerProfile}>
          <View style={{ position: 'relative' }}>
            <Avatar
              name={roomTitle}
              uri={otherUser?.avatarUrl}
              size={40}
              isOfficial={convType !== 'DIRECT' || isOfficerRole(otherUser?.role)}
            />
            <View style={styles.headerOnlineDot} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="h3" numberOfLines={1} style={{ fontSize: 16 }}>
              {roomTitle}
            </AppText>
            <AppText variant="caption" color={COLORS.secondary} numberOfLines={1}>
              {roomSubtitle}
            </AppText>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setQuickSwitchOpen(true)}
          style={styles.switchBtn}
        >
          <Ionicons name="people-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={messages}
            inverted
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="chatbubbles" size={32} color={COLORS.primary} />
                </View>
                <AppText variant="h3" style={{ marginTop: 12 }}>
                  Bắt đầu cuộc trò chuyện
                </AppText>
                <AppText
                  variant="body"
                  color={COLORS.textSecondary}
                  style={{ textAlign: 'center', marginTop: 4, paddingHorizontal: 24 }}
                >
                  Gửi tin nhắn hoặc hình ảnh hiện trường để trao đổi nhanh với {roomTitle}.
                </AppText>

                <View style={styles.quickPromptsWrap}>
                  {QUICK_PROMPTS.map((q) => (
                    <TouchableOpacity
                      key={q}
                      onPress={() => handleSend(q)}
                      style={styles.quickPromptChip}
                    >
                      <AppText variant="caption" color={COLORS.primary} semibold>
                        {q}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            }
            renderItem={({ item, index }) => {
              const isMe = item.senderId === user?.id;
              const prevMsg = messages[index + 1];
              const showSenderHeader =
                !isMe && (!prevMsg || prevMsg.senderId !== item.senderId);
              const attachments = item.attachments ?? [];

              return (
                <View style={[styles.msgRow, isMe ? styles.msgRight : styles.msgLeft]}>
                  {showSenderHeader && (
                    <AppText variant="caption" color={COLORS.textSecondary} style={styles.senderName}>
                      {item.sender?.fullName}
                    </AppText>
                  )}

                  <View style={styles.bubbleLine}>
                    {!isMe && (
                      <View style={styles.msgAvatarSlot}>
                        {showSenderHeader && (
                          <Avatar
                            name={item.sender?.fullName || 'CD'}
                            uri={item.sender?.avatarUrl}
                            size={28}
                            isOfficial={isOfficerRole(item.sender?.role)}
                          />
                        )}
                      </View>
                    )}

                    <TouchableOpacity
                      onLongPress={() => handleLongPress(item)}
                      activeOpacity={0.88}
                      style={[
                        styles.bubble,
                        isMe ? styles.bubbleMe : styles.bubbleOther,
                      ]}
                    >
                      {attachments.map((att) => (
                        <TouchableOpacity
                          key={att.id}
                          activeOpacity={0.9}
                          onPress={() => setPreviewFullUrl(att.url)}
                        >
                          <Image
                            source={{ uri: att.url }}
                            style={styles.attachmentImage}
                          />
                        </TouchableOpacity>
                      ))}

                      {(item.content !== '[Hình ảnh]' || attachments.length === 0) && (
                        <AppText
                          variant="body"
                          color={isMe ? COLORS.textInverse : COLORS.textPrimary}
                          style={{ lineHeight: 20 }}
                        >
                          {item.content}
                        </AppText>
                      )}

                      <AppText
                        variant="caption"
                        color={isMe ? 'rgba(13, 18, 22, 0.7)' : COLORS.textMuted}
                        style={styles.timeText}
                      >
                        {formatRelativeTimeVi(item.createdAt)}
                      </AppText>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Image attachment preview before sending */}
        {pendingImageUri && (
          <View style={styles.previewBar}>
            <Image source={{ uri: pendingImageUri }} style={styles.previewThumb} />
            <View style={{ flex: 1, marginLeft: SPACING.sm }}>
              <AppText variant="caption" color={COLORS.textSecondary}>
                Ảnh đính kèm đã sẵn sàng gửi
              </AppText>
            </View>
            <TouchableOpacity
              onPress={() => setPendingImageUri(null)}
              style={styles.removePreviewBtn}
            >
              <Ionicons name="close-circle" size={22} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        )}

        {/* Composer Bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity onPress={handleTakePhoto} style={styles.mediaBtn}>
            <Ionicons name="camera-outline" size={21} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePickImage} style={styles.mediaBtn}>
            <Ionicons name="image-outline" size={21} color={COLORS.secondary} />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor={COLORS.textMuted}
            value={text}
            onChangeText={setText}
            multiline
          />

          <TouchableOpacity
            onPress={() => handleSend()}
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            disabled={!canSend || sendMessage.isPending}
          >
            {sendMessage.isPending ? (
              <ActivityIndicator size="small" color={COLORS.textInverse} />
            ) : (
              <Ionicons
                name="send"
                size={17}
                color={canSend ? COLORS.textInverse : COLORS.textMuted}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Fullscreen Image Viewer Modal */}
      <Modal visible={Boolean(previewFullUrl)} transparent animationType="fade">
        <View style={styles.fullImageBackdrop}>
          <TouchableOpacity
            onPress={() => setPreviewFullUrl(null)}
            style={styles.fullImageClose}
          >
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          {previewFullUrl && (
            <Image
              source={{ uri: previewFullUrl }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Quick Switcher Menu: Tất cả người đã chat */}
      <Modal
        visible={quickSwitchOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setQuickSwitchOpen(false)}
      >
        <View style={styles.switchBackdrop}>
          <View style={styles.switchSheet}>
            <View style={styles.switchHeader}>
              <AppText variant="h3">Người đã chat ({conversations.length})</AppText>
              <TouchableOpacity onPress={() => setQuickSwitchOpen(false)}>
                <Ionicons name="close" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={conversations}
              keyExtractor={(c: any) => c.id}
              renderItem={({ item: conv }: { item: any }) => {
                const other = (conv.members ?? []).find((m: any) => m.userId !== user?.id)?.user;
                const name =
                  conv.type === 'DIRECT'
                    ? other?.fullName || conv.name || 'Cư dân'
                    : conv.name || other?.fullName || 'Cuộc trò chuyện';
                const lastMsg = conv.messages?.[0];
                const isCurrent = conv.id === conversationId;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setQuickSwitchOpen(false);
                      if (!isCurrent) {
                        router.replace({
                          pathname: '/(tabs)/connect/[id]',
                          params: { id: conv.id, title: name, type: conv.type },
                        } as any);
                      }
                    }}
                    style={[styles.switchRow, isCurrent && styles.switchRowActive]}
                  >
                    <Avatar
                      name={name}
                      uri={other?.avatarUrl}
                      size={42}
                      isOfficial={conv.type !== 'DIRECT' || isOfficerRole(other?.role)}
                    />
                    <View style={{ flex: 1 }}>
                      <AppText variant="body" semibold numberOfLines={1}>
                        {name}
                      </AppText>
                      <AppText variant="caption" color={COLORS.textSecondary} numberOfLines={1}>
                        {lastMsg ? lastMsg.content : 'Chạm để mở đoạn chat'}
                      </AppText>
                    </View>
                    {isCurrent && (
                      <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#2A221D' },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    backgroundColor: '#2A221D',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerProfile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerOnlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#2A221D',
  },
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    transform: [{ scaleY: -1 }],
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickPromptsWrap: {
    marginTop: SPACING.lg,
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  quickPromptChip: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primarySoft,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
  },
  listContent: { padding: SPACING.md, gap: SPACING.xs + 2 },
  msgRow: { marginVertical: 2 },
  msgRight: { alignItems: 'flex-end' },
  msgLeft: { alignItems: 'flex-start' },
  senderName: {
    marginLeft: 38,
    marginBottom: 3,
    fontSize: 11.5,
  },
  bubbleLine: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    maxWidth: '84%',
  },
  msgAvatarSlot: {
    width: 28,
    alignItems: 'center',
  },
  bubble: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 1,
    borderRadius: RADIUS.lg,
    gap: 4,
  },
  bubbleMe: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#2E2520',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 4,
  },
  timeText: {
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  attachmentImage: {
    width: 215,
    height: 155,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
  },
  previewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  previewThumb: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
  },
  removePreviewBtn: {
    padding: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    backgroundColor: '#2A221D',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 6,
  },
  mediaBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    color: COLORS.textPrimary,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 15,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fullImageBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImageClose: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: '94%',
    height: '80%',
  },
  switchBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  switchSheet: {
    maxHeight: '65%',
    backgroundColor: '#211A16',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingBottom: SPACING.lg,
  },
  switchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 4,
  },
  switchRowActive: {
    backgroundColor: COLORS.primaryLight,
  },
});
