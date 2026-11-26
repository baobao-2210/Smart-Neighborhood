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
  Switch,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AnnouncementPriority } from '@todanpho/shared';
import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { AppButton, AppCard, AppText, Badge, EmptyState } from '@/components';
import { isOfficerRole, useAuthStore } from '@/store/useAuthStore';
import { formatRelativeTimeVi } from '@/utils/date';
import {
  PersonalNotification,
  useAnnouncements,
  useAnnouncementStats,
  useCreateAnnouncement,
  useCreateEvent,
  useEvents,
  useMarkAllNotificationsRead,
  useMarkAnnouncementRead,
  useMarkNotificationRead,
  useMyNotifications,
  useRegisterEvent,
} from '@/services/noticeService';

type NoticeTab = 'PERSONAL' | 'ANNOUNCEMENTS' | 'EVENTS';

const PRIORITY_OPTIONS: { key: AnnouncementPriority; label: string }[] = [
  { key: AnnouncementPriority.NORMAL, label: 'Thường' },
  { key: AnnouncementPriority.IMPORTANT, label: 'Quan trọng' },
  { key: AnnouncementPriority.URGENT, label: 'Khẩn cấp' },
];

const EVENT_STATUS_MAP: Record<
  string,
  { label: string; tone: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' }
> = {
  UPCOMING: { label: 'Sắp diễn ra', tone: 'primary' },
  ONGOING: { label: 'Đang diễn ra', tone: 'success' },
  COMPLETED: { label: 'Đã kết thúc', tone: 'neutral' },
  CANCELLED: { label: 'Đã hủy', tone: 'danger' },
};

const NOTIF_META: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; label: string }
> = {
  INCIDENT_CREATED: {
    icon: 'warning',
    color: COLORS.danger,
    bg: COLORS.dangerLight,
    label: 'Phản ánh mới',
  },
  INCIDENT_ACCEPTED: {
    icon: 'checkmark-circle',
    color: COLORS.primary,
    bg: COLORS.primaryLight,
    label: 'Tiếp nhận sự cố',
  },
  INCIDENT_STATUS_CHANGED: {
    icon: 'sync-circle',
    color: COLORS.warning,
    bg: COLORS.warningLight,
    label: 'Cập nhật xử lý',
  },
  ANNOUNCEMENT: {
    icon: 'megaphone',
    color: COLORS.primary,
    bg: COLORS.primaryLight,
    label: 'Thông báo tổ',
  },
  EVENT_CREATED: {
    icon: 'calendar',
    color: COLORS.secondary,
    bg: COLORS.secondaryLight,
    label: 'Sự kiện mới',
  },
  POST_LIKED: {
    icon: 'heart',
    color: COLORS.danger,
    bg: COLORS.dangerLight,
    label: 'Tương tác bài viết',
  },
  POST_COMMENTED: {
    icon: 'chatbubble',
    color: COLORS.primary,
    bg: COLORS.primaryLight,
    label: 'Bình luận mới',
  },
  NEW_MESSAGE: {
    icon: 'paper-plane',
    color: COLORS.secondary,
    bg: COLORS.secondaryLight,
    label: 'Tin nhắn mới',
  },
};

function formatDateTimeVi(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${min} • ${dd}/${mm}/${yyyy}`;
}

export default function NoticeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canOfficer = isOfficerRole(user?.role);

  const [tab, setTab] = useState<NoticeTab>('PERSONAL');
  const [priorityFilter, setPriorityFilter] = useState<AnnouncementPriority | undefined>(undefined);
  const [statsTargetId, setStatsTargetId] = useState<string | null>(null);

  // Create Modal state (for officers)
  const [modalOpen, setModalOpen] = useState(false);
  const [createType, setCreateType] = useState<'ANNOUNCEMENT' | 'EVENT'>('ANNOUNCEMENT');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>(AnnouncementPriority.IMPORTANT);
  const [isPinned, setIsPinned] = useState(false);
  const [locationName, setLocationName] = useState('Nhà văn hóa Tổ dân phố');
  const [daysOffset, setDaysOffset] = useState(2);

  const {
    data: notifData,
    isLoading: loadingNotifs,
    isRefetching: refetchingNotifs,
    refetch: refetchNotifs,
  } = useMyNotifications();
  const notifications = notifData?.items ?? [];
  const unreadCount = notifData?.unreadCount ?? 0;

  const {
    data: announcements = [],
    isLoading: loadingAnn,
    isRefetching: refetchingAnn,
    refetch: refetchAnn,
  } = useAnnouncements(priorityFilter);

  const {
    data: events = [],
    isLoading: loadingEvt,
    isRefetching: refetchingEvt,
    refetch: refetchEvt,
  } = useEvents();

  const { data: statsData, isLoading: loadingStats } = useAnnouncementStats(statsTargetId);

  const markNotifRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const markAnnRead = useMarkAnnouncementRead();
  const registerEvent = useRegisterEvent();
  const createAnnouncement = useCreateAnnouncement();
  const createEvent = useCreateEvent();

  const extractError = (err: any, fallback: string) => {
    const msg = err?.response?.data?.message || err?.message;
    if (Array.isArray(msg)) return msg.join('\n');
    if (typeof msg === 'string') return msg;
    return fallback;
  };

  const handleOpenCreateModal = () => {
    setCreateType(tab === 'EVENTS' ? 'EVENT' : 'ANNOUNCEMENT');
    setModalOpen(true);
  };

  const handleCreate = () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ tiêu đề và nội dung.');
      return;
    }

    if (createType === 'ANNOUNCEMENT') {
      createAnnouncement.mutate(
        {
          title: title.trim(),
          content: content.trim(),
          priority,
          isPinned,
        },
        {
          onSuccess: () => {
            setModalOpen(false);
            setTitle('');
            setContent('');
            setIsPinned(false);
            setTab('ANNOUNCEMENTS');
            Alert.alert('Thành công', 'Đã ban hành thông báo tới toàn bộ cư dân trong tổ.');
          },
          onError: (err: any) => {
            Alert.alert('Không thể tạo thông báo', extractError(err, 'Vui lòng thử lại.'));
          },
        },
      );
    } else {
      if (!locationName.trim()) {
        Alert.alert('Thiếu địa điểm', 'Vui lòng nhập địa điểm tổ chức sự kiện.');
        return;
      }
      const start = new Date();
      start.setDate(start.getDate() + daysOffset);
      start.setHours(8, 30, 0, 0);

      createEvent.mutate(
        {
          title: title.trim(),
          description: content.trim(),
          locationName: locationName.trim(),
          startTime: start.toISOString(),
        },
        {
          onSuccess: () => {
            setModalOpen(false);
            setTitle('');
            setContent('');
            setTab('EVENTS');
            Alert.alert('Thành công', 'Đã tạo sự kiện cộng đồng và gửi thông báo tới cư dân.');
          },
          onError: (err: any) => {
            Alert.alert('Không thể tạo sự kiện', extractError(err, 'Vui lòng thử lại.'));
          },
        },
      );
    }
  };

  const handlePressNotification = (item: PersonalNotification) => {
    if (!item.isRead) {
      markNotifRead.mutate(item.id);
    }
    if ((item.type === 'POST_LIKED' || item.type === 'POST_COMMENTED') && item.referenceId) {
      router.push(`/(tabs)/feed/post/${item.referenceId}` as any);
    } else if (item.type === 'NEW_MESSAGE' && item.referenceId) {
      router.push(`/(tabs)/connect/${item.referenceId}` as any);
    } else if (item.type === 'ANNOUNCEMENT') {
      setTab('ANNOUNCEMENTS');
    } else if (item.type === 'EVENT_CREATED') {
      setTab('EVENTS');
    } else if (item.type.startsWith('INCIDENT')) {
      router.push('/(tabs)/feed' as any);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBox}>
            <Ionicons name="notifications" size={18} color={COLORS.primary} />
          </View>
          <View>
            <AppText variant="h2" style={{ fontSize: 18 }}>
              Thông báo & Sự kiện
            </AppText>
            <AppText variant="caption" color={COLORS.textMuted}>
              {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Đã cập nhật mới nhất'}
            </AppText>
          </View>
        </View>

        <View style={styles.headerRight}>
          {tab === 'PERSONAL' && unreadCount > 0 && (
            <TouchableOpacity
              onPress={() => markAllRead.mutate()}
              style={styles.readAllBtn}
              disabled={markAllRead.isPending}
            >
              <Ionicons name="checkmark-done-outline" size={16} color={COLORS.primary} />
              <AppText variant="caption" semibold color={COLORS.primary} style={{ marginLeft: 4 }}>
                Đọc tất cả
              </AppText>
            </TouchableOpacity>
          )}
          {canOfficer && (
            <TouchableOpacity onPress={handleOpenCreateModal} style={styles.addBtn}>
              <Ionicons name="add-circle" size={28} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 3 Tabs */}
      <View style={styles.segmentRow}>
        <TouchableOpacity
          onPress={() => setTab('PERSONAL')}
          style={[styles.segmentBtn, tab === 'PERSONAL' && styles.segmentActive]}
        >
          <AppText
            variant="caption"
            semibold={tab === 'PERSONAL'}
            color={tab === 'PERSONAL' ? COLORS.primary : COLORS.textSecondary}
          >
            Của tôi {unreadCount > 0 ? `(${unreadCount})` : ''}
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setTab('ANNOUNCEMENTS')}
          style={[styles.segmentBtn, tab === 'ANNOUNCEMENTS' && styles.segmentActive]}
        >
          <AppText
            variant="caption"
            semibold={tab === 'ANNOUNCEMENTS'}
            color={tab === 'ANNOUNCEMENTS' ? COLORS.primary : COLORS.textSecondary}
          >
            Bảng tin Tổ ({announcements.length})
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setTab('EVENTS')}
          style={[styles.segmentBtn, tab === 'EVENTS' && styles.segmentActive]}
        >
          <AppText
            variant="caption"
            semibold={tab === 'EVENTS'}
            color={tab === 'EVENTS' ? COLORS.primary : COLORS.textSecondary}
          >
            Sự kiện ({events.length})
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Tab 1: Personal Notifications */}
      {tab === 'PERSONAL' && (
        loadingNotifs ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refetchingNotifs}
                onRefresh={refetchNotifs}
                tintColor={COLORS.primary}
              />
            }
            renderItem={({ item }) => {
              const meta = NOTIF_META[item.type] || {
                icon: 'notifications-outline' as const,
                color: COLORS.primary,
                bg: COLORS.primaryLight,
                label: 'Thông báo',
              };
              return (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handlePressNotification(item)}
                >
                  <AppCard
                    style={
                      !item.isRead
                        ? { ...styles.card, ...styles.unreadNotifCard }
                        : styles.card
                    }
                  >
                    <View style={styles.notifRow}>
                      <View style={[styles.notifIconCircle, { backgroundColor: meta.bg }]}>
                        <Ionicons name={meta.icon} size={18} color={meta.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.rowBetween}>
                          <AppText variant="label" color={meta.color}>
                            {meta.label}
                          </AppText>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <AppText variant="caption" color={COLORS.textMuted}>
                              {formatRelativeTimeVi(item.createdAt)}
                            </AppText>
                            {!item.isRead && <View style={styles.unreadDot} />}
                          </View>
                        </View>
                        <AppText variant="h3" style={{ fontSize: 15, marginTop: 2 }}>
                          {item.title}
                        </AppText>
                        <AppText
                          variant="body"
                          color={COLORS.textSecondary}
                          numberOfLines={2}
                          style={{ marginTop: 2 }}
                        >
                          {item.body}
                        </AppText>
                      </View>
                    </View>
                  </AppCard>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <EmptyState
                icon="notifications-off-outline"
                title="Chưa có thông báo mới"
                description="Khi có thông báo từ Tổ dân phố hoặc cập nhật xử lý sự cố, hệ thống sẽ hiển thị tại đây."
              />
            }
          />
        )
      )}

      {/* Tab 2: Official Announcements */}
      {tab === 'ANNOUNCEMENTS' && (
        <View style={{ flex: 1 }}>
          <View style={styles.filterBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <TouchableOpacity
                onPress={() => setPriorityFilter(undefined)}
                style={[styles.filterChip, !priorityFilter && styles.filterChipActive]}
              >
                <AppText
                  variant="caption"
                  semibold={!priorityFilter}
                  color={!priorityFilter ? COLORS.primary : COLORS.textSecondary}
                >
                  Tất cả
                </AppText>
              </TouchableOpacity>
              {PRIORITY_OPTIONS.map((p) => {
                const active = priorityFilter === p.key;
                return (
                  <TouchableOpacity
                    key={p.key}
                    onPress={() => setPriorityFilter(p.key)}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                  >
                    <AppText
                      variant="caption"
                      semibold={active}
                      color={active ? COLORS.primary : COLORS.textSecondary}
                    >
                      {p.label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {loadingAnn ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <FlatList
              data={announcements}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refetchingAnn}
                  onRefresh={refetchAnn}
                  tintColor={COLORS.primary}
                />
              }
              renderItem={({ item }) => (
                <AppCard style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Badge
                      label={
                        item.priority === 'URGENT'
                          ? 'Khẩn cấp'
                          : item.priority === 'IMPORTANT'
                            ? 'Quan trọng'
                            : 'Thông báo'
                      }
                      tone={
                        item.priority === 'URGENT'
                          ? 'danger'
                          : item.priority === 'IMPORTANT'
                            ? 'warning'
                            : 'primary'
                      }
                    />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {canOfficer && (
                        <TouchableOpacity
                          onPress={() => setStatsTargetId(item.id)}
                          style={styles.statsChip}
                        >
                          <Ionicons name="bar-chart-outline" size={13} color={COLORS.primary} />
                          <AppText variant="caption" color={COLORS.primary} style={{ marginLeft: 4 }}>
                            Thống kê
                          </AppText>
                        </TouchableOpacity>
                      )}
                      {item.isPinned && <Ionicons name="pin" size={16} color={COLORS.primary} />}
                    </View>
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
                      <TouchableOpacity onPress={() => markAnnRead.mutate(item.id)}>
                        <AppText variant="caption" semibold color={COLORS.primary}>
                          Xác nhận đã đọc
                        </AppText>
                      </TouchableOpacity>
                    )}
                  </View>
                </AppCard>
              )}
              ListEmptyComponent={
                <EmptyState
                  icon="megaphone-outline"
                  title="Chưa có thông báo nào"
                  description="Thông báo chính thức từ Ban điều hành Tổ dân phố sẽ hiển thị tại đây."
                />
              }
            />
          )}
        </View>
      )}

      {/* Tab 3: Community Events */}
      {tab === 'EVENTS' && (
        loadingEvt ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refetchingEvt}
                onRefresh={refetchEvt}
                tintColor={COLORS.primary}
              />
            }
            renderItem={({ item }) => {
              const registered = item.myRegistrationStatus === 'REGISTERED';
              const statusMeta = EVENT_STATUS_MAP[item.status] || {
                label: item.status,
                tone: 'primary' as const,
              };
              return (
                <AppCard style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Badge label={statusMeta.label} tone={statusMeta.tone} />
                    <AppText variant="caption" color={COLORS.primary} semibold>
                      {formatDateTimeVi(item.startTime)}
                    </AppText>
                  </View>

                  <AppText variant="h3" style={styles.cardTitle}>
                    {item.title}
                  </AppText>
                  <AppText variant="body" color={COLORS.textSecondary}>
                    {item.description}
                  </AppText>

                  <View style={styles.eventMetaRow}>
                    <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
                    <AppText variant="caption" color={COLORS.textMuted} style={{ marginLeft: 4, flex: 1 }}>
                      {item.locationName}
                    </AppText>
                    <AppText variant="caption" color={COLORS.secondary} semibold>
                      {item.registeredCount}
                      {item.maxAttendees ? `/${item.maxAttendees}` : ''} người tham gia
                    </AppText>
                  </View>

                  <AppButton
                    title={registered ? 'Hủy đăng ký tham gia' : 'Đăng ký tham gia'}
                    variant={registered ? 'outline' : 'primary'}
                    loading={registerEvent.isPending}
                    onPress={() =>
                      registerEvent.mutate(
                        {
                          id: item.id,
                          status: registered ? 'CANCELLED' : 'REGISTERED',
                        },
                        {
                          onError: (err: any) =>
                            Alert.alert(
                              'Không thể thực hiện',
                              extractError(err, 'Vui lòng thử lại sau.'),
                            ),
                        },
                      )
                    }
                    style={{ marginTop: SPACING.md }}
                  />
                </AppCard>
              );
            }}
            ListEmptyComponent={
              <EmptyState
                icon="calendar-outline"
                title="Chưa có sự kiện nào"
                description="Các buổi họp tổ, ngày hội văn hóa hoặc hoạt động cộng đồng sẽ xuất hiện tại đây."
              />
            }
          />
        )
      )}

      {/* Modal Tạo Thông báo / Sự kiện (dành cho Ban điều hành) */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <AppCard style={styles.modalCard}>
            <View style={styles.rowBetween}>
              <AppText variant="h3">
                {createType === 'ANNOUNCEMENT' ? 'Ban hành Thông báo' : 'Tạo Sự kiện cộng đồng'}
              </AppText>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalTypeRow}>
              <TouchableOpacity
                onPress={() => setCreateType('ANNOUNCEMENT')}
                style={[
                  styles.modalTypeChip,
                  createType === 'ANNOUNCEMENT' && styles.filterChipActive,
                ]}
              >
                <AppText
                  variant="caption"
                  semibold={createType === 'ANNOUNCEMENT'}
                  color={createType === 'ANNOUNCEMENT' ? COLORS.primary : COLORS.textSecondary}
                >
                  Thông báo tổ
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setCreateType('EVENT')}
                style={[styles.modalTypeChip, createType === 'EVENT' && styles.filterChipActive]}
              >
                <AppText
                  variant="caption"
                  semibold={createType === 'EVENT'}
                  color={createType === 'EVENT' ? COLORS.primary : COLORS.textSecondary}
                >
                  Sự kiện cộng đồng
                </AppText>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Tiêu đề..."
              placeholderTextColor={COLORS.textMuted}
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={[styles.input, { minHeight: 90 }]}
              placeholder="Nội dung chi tiết..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              textAlignVertical="top"
              value={content}
              onChangeText={setContent}
            />

            {createType === 'ANNOUNCEMENT' ? (
              <>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {PRIORITY_OPTIONS.map((p) => {
                    const active = priority === p.key;
                    return (
                      <TouchableOpacity
                        key={p.key}
                        onPress={() => setPriority(p.key)}
                        style={[styles.filterChip, active && styles.filterChipActive, { flex: 1, alignItems: 'center' }]}
                      >
                        <AppText
                          variant="caption"
                          semibold={active}
                          color={active ? COLORS.primary : COLORS.textSecondary}
                        >
                          {p.label}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={styles.switchRow}>
                  <AppText variant="body">Ghim lên đầu bảng thông báo</AppText>
                  <Switch
                    value={isPinned}
                    onValueChange={setIsPinned}
                    trackColor={{ true: COLORS.primary }}
                  />
                </View>
              </>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Địa điểm tổ chức..."
                  placeholderTextColor={COLORS.textMuted}
                  value={locationName}
                  onChangeText={setLocationName}
                />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[
                    { days: 1, label: 'Ngày mai 08:30' },
                    { days: 2, label: '2 ngày tới' },
                    { days: 7, label: 'Tuần sau' },
                  ].map((opt) => {
                    const active = daysOffset === opt.days;
                    return (
                      <TouchableOpacity
                        key={opt.days}
                        onPress={() => setDaysOffset(opt.days)}
                        style={[styles.filterChip, active && styles.filterChipActive, { flex: 1, alignItems: 'center' }]}
                      >
                        <AppText
                          variant="caption"
                          semibold={active}
                          color={active ? COLORS.primary : COLORS.textSecondary}
                        >
                          {opt.label}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs }}>
              <AppButton
                title="Hủy"
                variant="outline"
                onPress={() => setModalOpen(false)}
                style={{ flex: 1 }}
              />
              <AppButton
                title="Đăng ngay"
                onPress={handleCreate}
                loading={createAnnouncement.isPending || createEvent.isPending}
                style={{ flex: 1 }}
              />
            </View>
          </AppCard>
        </View>
      </Modal>

      {/* Modal Thống kê lượt đọc cho Cán bộ */}
      <Modal visible={Boolean(statsTargetId)} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <AppCard style={styles.modalCard}>
            <AppText variant="h3">Thống kê tiếp nhận thông báo</AppText>
            {loadingStats || !statsData ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 20 }} />
            ) : (
              <View style={styles.statsBox}>
                <View style={styles.statItem}>
                  <AppText variant="h1" color={COLORS.primary}>
                    {statsData.readRate}%
                  </AppText>
                  <AppText variant="caption" color={COLORS.textSecondary}>
                    Tỷ lệ đã đọc
                  </AppText>
                </View>
                <View style={styles.statItem}>
                  <AppText variant="h1" color={COLORS.secondary}>
                    {statsData.readCount}/{statsData.totalResidents}
                  </AppText>
                  <AppText variant="caption" color={COLORS.textSecondary}>
                    Cư dân xác nhận
                  </AppText>
                </View>
              </View>
            )}
            <AppButton title="Đóng" onPress={() => setStatsTargetId(null)} fullWidth />
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
    backgroundColor: '#2A221D',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  readAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primarySoft,
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
  filterBar: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: SPACING.lg, gap: SPACING.md },
  card: { gap: 4 },
  unreadNotifCard: {
    borderColor: COLORS.primarySoft,
    backgroundColor: '#2C231D',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  notifIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { marginTop: 4, marginBottom: 2 },
  statsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: { gap: SPACING.sm },
  modalTypeRow: { flexDirection: 'row', gap: SPACING.sm },
  modalTypeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    backgroundColor: COLORS.surfaceAlt,
    color: COLORS.textPrimary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statsBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.md,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
});
