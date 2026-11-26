import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '@/constants/theme';
import { AppCard, AppText, Avatar, Badge, EmptyState } from '@/components';
import { apiClient } from '@/services/apiClient';
import { useAuthStore } from '@/store/useAuthStore';
import { formatRelativeTimeVi } from '@/utils/date';

export default function ConnectScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/conversations');
      return res.data.data as any[];
    },
    enabled: isAuthenticated,
  });

  const createSupportChat = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/api/v1/conversations', {
        type: 'SUPPORT',
        name: 'Hỗ trợ Tổ trưởng Tổ dân phố',
        participantIds: ['user-leader-01'],
      });
      return res.data.data;
    },
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      router.push(`/(tabs)/connect/${conv.id}` as any);
    },
    onError: (err: any) => {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể tạo cuộc trò chuyện');
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chatbubbles" size={18} color={COLORS.primary} />
          </View>
          <View>
            <AppText variant="h2" style={{ fontSize: 18 }}>Kết nối Cộng đồng</AppText>
            <AppText variant="caption" color={COLORS.textMuted}>Trao đổi trực tiếp với Tổ trưởng & Cư dân</AppText>
          </View>
        </View>
        <TouchableOpacity onPress={() => createSupportChat.mutate()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="create-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
          renderItem={({ item }) => {
            const other = (item.members ?? []).find((m: any) => m.userId !== user?.id)?.user;
            const title = item.name || other?.fullName || 'Cuộc trò chuyện';
            const lastMsg = item.messages?.[0];
            return (
              <TouchableOpacity
                onPress={() => router.push(`/(tabs)/connect/${item.id}` as any)}
                activeOpacity={0.85}
              >
                <AppCard style={styles.convCard}>
                  <Avatar name={title} size={46} isOfficial={item.type !== 'DIRECT'} />
                  <View style={styles.convMeta}>
                    <View style={styles.rowBetween}>
                      <AppText variant="h3" numberOfLines={1} style={{ flex: 1 }}>
                        {title}
                      </AppText>
                      <Badge label={item.type} tone="neutral" />
                    </View>
                    <AppText variant="body" color={COLORS.textSecondary} numberOfLines={1}>
                      {lastMsg
                        ? lastMsg.isModerated
                          ? '[Tin nhắn đã bị ẩn]'
                          : lastMsg.content
                        : 'Chưa có tin nhắn nào'}
                    </AppText>
                    {lastMsg && (
                      <AppText variant="caption" color={COLORS.textMuted}>
                        {formatRelativeTimeVi(lastMsg.createdAt)}
                      </AppText>
                    )}
                  </View>
                </AppCard>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              title="Chưa có cuộc trò chuyện nào"
              description="Nhắn tin trực tiếp với Tổ trưởng hoặc tham gia nhóm cộng đồng."
              actionLabel="Nhắn tin với Tổ trưởng"
              onAction={() => createSupportChat.mutate()}
            />
          }
        />
      )}
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
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: SPACING.lg, gap: SPACING.md },
  convCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  convMeta: { flex: 1, gap: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
});
