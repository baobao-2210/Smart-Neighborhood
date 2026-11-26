import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { AppText } from '@/components';
import { API_BASE_URL, apiClient } from '@/services/apiClient';
import { isLeaderRole, useAuthStore } from '@/store/useAuthStore';
import { formatRelativeTimeVi } from '@/utils/date';

export default function ChatRoomScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user, accessToken } = useAuthStore();
  const canModerate = isLeaderRole(user?.role);

  const [text, setText] = useState('');
  const [socketRef, setSocketRef] = useState<Socket | null>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/conversations/${conversationId}/messages`);
      return res.data.data as any[];
    },
    enabled: Boolean(conversationId),
  });

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
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });

    setSocketRef(socket);
    return () => {
      socket.disconnect();
    };
  }, [conversationId, accessToken, queryClient]);

  const sendRest = useMutation({
    mutationFn: (content: string) =>
      apiClient.post(`/api/v1/conversations/${conversationId}/messages`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || !conversationId) return;
    setText('');

    if (socketRef?.connected) {
      socketRef.emit('client:send_message', { conversationId, content: trimmed });
    } else {
      sendRest.mutate(trimmed);
    }
  };

  const handleLongPress = (msg: any) => {
    const options: any[] = [
      {
        text: 'Báo cáo vi phạm',
        onPress: () =>
          apiClient
            .post(`/api/v1/messages/${msg.id}/report`, { reason: 'Nội dung không phù hợp' })
            .then(() => Alert.alert('Đã báo cáo', 'Cảm ơn bạn đã phản hồi.')),
      },
    ];
    if (canModerate) {
      options.push({
        text: msg.isModerated ? 'Hiện lại tin nhắn' : 'Ẩn tin nhắn (Kiểm duyệt)',
        style: 'destructive',
        onPress: () =>
          apiClient
            .patch(`/api/v1/messages/${msg.id}/moderate`, { isModerated: !msg.isModerated })
            .then(() => queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })),
      });
    }
    options.push({ text: 'Đóng', style: 'cancel' });
    Alert.alert('Tùy chọn tin nhắn', undefined, options);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        data={messages}
        inverted
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isMe = item.senderId === user?.id;
          return (
            <TouchableOpacity
              onLongPress={() => handleLongPress(item)}
              activeOpacity={0.85}
              style={[styles.msgRow, isMe ? styles.msgRight : styles.msgLeft]}
            >
              {!isMe && (
                <AppText variant="label" color={COLORS.textSecondary} style={{ marginBottom: 2 }}>
                  {item.sender?.fullName}
                </AppText>
              )}
              <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                <AppText
                  variant="body"
                  color={isMe ? COLORS.textInverse : COLORS.textPrimary}
                >
                  {item.content}
                </AppText>
              </View>
              <AppText variant="caption" color={COLORS.textMuted} style={{ marginTop: 2 }}>
                {formatRelativeTimeVi(item.createdAt)}
              </AppText>
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Nhập tin nhắn..."
          placeholderTextColor={COLORS.textMuted}
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendBtn}>
          <Ionicons name="send" size={18} color={COLORS.textInverse} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listContent: { padding: SPACING.md, gap: SPACING.sm },
  msgRow: { maxWidth: '80%' },
  msgRight: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  msgLeft: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
  },
  bubbleMe: { backgroundColor: COLORS.primary },
  bubbleOther: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: SPACING.sm,
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
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

