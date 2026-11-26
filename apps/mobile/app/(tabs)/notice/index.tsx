import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { AppButton, AppCard, AppText, Badge, EmptyState } from '@/components';
import { apiClient } from '@/services/apiClient';
import { isOfficerRole, useAuthStore } from '@/store/useAuthStore';
import { formatRelativeTimeVi } from '@/utils/date';

export default function NoticeScreen() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const canOfficer = isOfficerRole(user?.role);

  const [tab, setTab] = useState<'ANNOUNCEMENTS' | 'EVENTS'>('ANNOUNCEMENTS');
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [locationName, setLocationName] = useState('Nhà văn hóa Tổ dân phố số 5');

  const { data: announcements = [], isLoading: loadingAnn, refetch: refetchAnn } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/announcements');
      return res.data.data as any[];
    },
    enabled: isAuthenticated,
  });

  const { data: events = [], isLoading: loadingEvt, refetch: refetchEvt } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/events');
      return res.data.data as any[];
    },
    enabled: isAuthenticated,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/v1/announcements/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  });

  const registerEvent = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'REGISTERED' | 'CANCELLED' }) =>
      apiClient.post(`/api/v1/events/${id}/register`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });

  const createAnnouncement = useMutation({
    mutationFn: () =>
      apiClient.post('/api/v1/announcements', {
        title: title.trim(),
        content: content.trim(),
        priority: 'IMPORTANT',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setModalOpen(false);
      setTitle('');
      setContent('');
    },
  });

  const createEvent = useMutation({
    mutationFn: () =>
      apiClient.post('/api/v1/events', {
        title: title.trim(),
        description: content.trim(),
        locationName: locationName.trim(),
        startTime: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setModalOpen(false);
      setTitle('');
      setContent('');
    },
  });

  const handleCreate = () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tiêu đề và nội dung.');
      return;
    }
    if (tab === 'ANNOUNCEMENTS') createAnnouncement.mutate();
    else createEvent.mutate();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="notifications" size={18} color={COLORS.primary} />
          </View>
          <View>
            <AppText variant="h2" style={{ fontSize: 18 }}>Thông báo & Sự kiện</AppText>
            <AppText variant="caption" color={COLORS.textMuted}>Tin chính thức từ Tổ dân phố</AppText>
          </View>
        </View>
        {canOfficer && (
          <TouchableOpacity onPress={() => setModalOpen(true)} style={styles.addBtn}>
            <Ionicons name="add-circle" size={28} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.segmentRow}>
        <TouchableOpacity
          onPress={() => setTab('ANNOUNCEMENTS')}
          style={[styles.segmentBtn, tab === 'ANNOUNCEMENTS' && styles.segmentActive]}
        >
          <AppText
            variant="body"
            semibold={tab === 'ANNOUNCEMENTS'}
            color={tab === 'ANNOUNCEMENTS' ? COLORS.primary : COLORS.textSecondary}
          >
            Thông báo ({announcements.length})
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab('EVENTS')}
          style={[styles.segmentBtn, tab === 'EVENTS' && styles.segmentActive]}
        >
          <AppText
            variant="body"
            semibold={tab === 'EVENTS'}
            color={tab === 'EVENTS' ? COLORS.primary : COLORS.textSecondary}
          >
            Sự kiện ({events.length})
          </AppText>
        </TouchableOpacity>
      </View>

      {tab === 'ANNOUNCEMENTS' ? (
        loadingAnn ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={announcements}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={false} onRefresh={refetchAnn} />}
            renderItem={({ item }) => (
              <AppCard style={styles.card}>
                <View style={styles.rowBetween}>
                  <Badge
                    label={item.priority === 'URGENT' ? 'Khẩn cấp' : item.priority === 'IMPORTANT' ? 'Quan trọng' : 'Thông báo'}
                    tone={item.priority === 'URGENT' ? 'danger' : item.priority === 'IMPORTANT' ? 'warning' : 'primary'}
                  />
                  {item.isPinned && <Ionicons name="pin" size={16} color={COLORS.primary} />}
                </View>
                <AppText variant="h3" style={styles.cardTitle}>
                  {item.title}
                </AppText>
                <AppText variant="body" color={COLORS.textSecondary}>
                  {item.content}
                </AppText>
                <View style={styles.footer}>
                  <AppText variant="caption" color={COLORS.textMuted}>
                    {formatRelativeTimeVi(item.publishedAt)} • {item.readCount} đã đọc
                  </AppText>
                  {item.isRead ? (
                    <Badge label="Đã đọc" tone="success" />
                  ) : (
                    <TouchableOpacity onPress={() => markRead.mutate(item.id)}>
                      <AppText variant="caption" semibold color={COLORS.primary}>
                        Xác nhận đã đọc
                      </AppText>
                    </TouchableOpacity>
                  )}
                </View>
              </AppCard>
            )}
            ListEmptyComponent={<EmptyState icon="notifications-outline" title="Chưa có thông báo nào" />}
          />
        )
      ) : loadingEvt ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetchEvt} />}
          renderItem={({ item }) => {
            const registered = item.myRegistrationStatus === 'REGISTERED';
            return (
              <AppCard style={styles.card}>
                <Badge label={item.status} tone="primary" />
                <AppText variant="h3" style={styles.cardTitle}>
                  {item.title}
                </AppText>
                <AppText variant="body" color={COLORS.textSecondary}>
                  {item.description}
                </AppText>
                <AppText variant="caption" color={COLORS.textMuted} style={{ marginTop: 6 }}>
                  Địa điểm: {item.locationName} • Đã đăng ký: {item.registeredCount}
                </AppText>
                <AppButton
                  title={registered ? 'Hủy đăng ký tham gia' : 'Đăng ký tham gia'}
                  variant={registered ? 'outline' : 'primary'}
                  onPress={() =>
                    registerEvent.mutate({
                      id: item.id,
                      status: registered ? 'CANCELLED' : 'REGISTERED',
                    })
                  }
                  style={{ marginTop: SPACING.md }}
                />
              </AppCard>
            );
          }}
          ListEmptyComponent={<EmptyState icon="calendar-outline" title="Chưa có sự kiện nào" />}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <AppCard style={styles.modalCard}>
            <AppText variant="h3" style={{ marginBottom: SPACING.md }}>
              {tab === 'ANNOUNCEMENTS' ? 'Ban hành Thông báo mới' : 'Tạo Sự kiện cộng đồng'}
            </AppText>
            <TextInput
              style={styles.input}
              placeholder="Tiêu đề..."
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={[styles.input, { minHeight: 90 }]}
              placeholder="Nội dung chi tiết..."
              multiline
              textAlignVertical="top"
              value={content}
              onChangeText={setContent}
            />
            {tab === 'EVENTS' && (
              <TextInput
                style={styles.input}
                placeholder="Địa điểm tổ chức..."
                value={locationName}
                onChangeText={setLocationName}
              />
            )}
            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              <AppButton title="Hủy" variant="outline" onPress={() => setModalOpen(false)} style={{ flex: 1 }} />
              <AppButton
                title="Lưu"
                onPress={handleCreate}
                loading={createAnnouncement.isPending || createEvent.isPending}
                style={{ flex: 1 }}
              />
            </View>
          </AppCard>
        </View>
      </Modal>
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
  addBtn: { padding: 2 },
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: SPACING.lg, gap: SPACING.md },
  card: { gap: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { marginTop: 4, marginBottom: 2 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: { gap: SPACING.sm },
  input: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
