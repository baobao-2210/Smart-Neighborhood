import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { AppButton, AppCard, AppText, Avatar, Badge, EmptyState } from '@/components';
import { isOfficerRole, useAuthStore } from '@/store/useAuthStore';
import { formatRelativeTimeVi, getRoleLabel } from '@/utils/date';
import {
  ContactItem,
  useContacts,
  useConversations,
  useCreateConversation,
} from '@/services/connectService';

type ConvFilter = 'ALL' | 'DIRECT' | 'SUPPORT' | 'GROUP';

interface ChattedPerson {
  userId: string;
  fullName: string;
  avatarUrl?: string | null;
  role: any;
  staffTitle?: string | null;
  conversationId: string;
  convType: string;
  lastMessage?: string;
  lastMessageAt?: string;
}

const CONV_FILTERS: { key: ConvFilter; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'DIRECT', label: 'Đã chat 1-1' },
  { key: 'SUPPORT', label: 'Hỗ trợ Tổ' },
  { key: 'GROUP', label: 'Nhóm tổ' },
];

const CONV_TYPE_META: Record<
  string,
  { label: string; tone: 'primary' | 'warning' | 'success' | 'neutral' }
> = {
  DIRECT: { label: 'Trực tiếp', tone: 'neutral' },
  SUPPORT: { label: 'Hỗ trợ Tổ', tone: 'warning' },
  GROUP: { label: 'Nhóm tổ', tone: 'primary' },
};

export default function ConnectScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isOfficer = isOfficerRole(user?.role);

  const [search, setSearch] = useState('');
  const [convFilter, setConvFilter] = useState<ConvFilter>('ALL');
  const [messengerMenuOpen, setMessengerMenuOpen] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [contactsOpen, setContactsOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [groupMode, setGroupMode] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const {
    data: conversations = [],
    isLoading,
    isRefetching,
    refetch,
  } = useConversations();

  const { data: quickContacts = [] } = useContacts('', true);
  const { data: modalContacts = [], isLoading: loadingContacts } = useContacts(
    contactSearch,
    contactsOpen,
  );

  const createConversation = useCreateConversation();

  // Danh sách tất cả những người đã từng chat (trích xuất từ lịch sử cuộc trò chuyện)
  const chattedPeople = useMemo<ChattedPerson[]>(() => {
    const map = new Map<string, ChattedPerson>();
    for (const conv of conversations) {
      const members = conv.members ?? [];
      const lastMsg = conv.messages?.[0];
      for (const m of members) {
        if (!m.user || m.userId === user?.id) continue;
        if (!map.has(m.userId)) {
          map.set(m.userId, {
            userId: m.userId,
            fullName: m.user.fullName,
            avatarUrl: m.user.avatarUrl,
            role: m.user.role,
            staffTitle: m.user.staffTitle,
            conversationId: conv.id,
            convType: conv.type,
            lastMessage: lastMsg
              ? lastMsg.isModerated
                ? '[Tin nhắn đã bị ẩn]'
                : lastMsg.content
              : undefined,
            lastMessageAt: lastMsg?.createdAt || conv.lastMessageAt,
          });
        }
      }
    }
    return Array.from(map.values());
  }, [conversations, user?.id]);

  const filteredMenuPeople = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    if (!q) return chattedPeople;
    return chattedPeople.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        (p.lastMessage || '').toLowerCase().includes(q),
    );
  }, [chattedPeople, menuSearch]);

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter((item: any) => {
      if (convFilter !== 'ALL' && item.type !== convFilter) return false;
      if (!q) return true;
      const other = (item.members ?? []).find((m: any) => m.userId !== user?.id)?.user;
      const title = (item.name || other?.fullName || '').toLowerCase();
      const lastContent = (item.messages?.[0]?.content || '').toLowerCase();
      return title.includes(q) || lastContent.includes(q);
    });
  }, [conversations, convFilter, search, user?.id]);

  const extractError = (err: any, fallback: string) => {
    const msg = err?.response?.data?.message || err?.message;
    if (Array.isArray(msg)) return msg.join('\n');
    if (typeof msg === 'string') return msg;
    return fallback;
  };

  const openChatWithPerson = (person: ChattedPerson) => {
    setMessengerMenuOpen(false);
    router.push({
      pathname: '/(tabs)/connect/[id]',
      params: {
        id: person.conversationId,
        title: person.fullName,
        subtitle: getRoleLabel(person.role, person.staffTitle),
        type: person.convType,
      },
    } as any);
  };

  const handleOpenSupportChat = () => {
    setMessengerMenuOpen(false);
    createConversation.mutate(
      {
        type: 'SUPPORT',
        name: 'Hỗ trợ Tổ trưởng Tổ dân phố',
        participantIds: [],
      },
      {
        onSuccess: (conv) => {
          router.push({
            pathname: '/(tabs)/connect/[id]',
            params: {
              id: conv.id,
              title: 'Hỗ trợ Tổ trưởng',
              subtitle: 'Ban điều hành Tổ dân phố',
              type: 'SUPPORT',
            },
          } as any);
        },
        onError: (err: any) => {
          Alert.alert('Lỗi', extractError(err, 'Không thể mở cuộc trò chuyện với Tổ trưởng.'));
        },
      },
    );
  };

  const handleStartDirectWith = (contact: ContactItem) => {
    if (groupMode && contactsOpen) {
      setSelectedIds((prev) =>
        prev.includes(contact.id)
          ? prev.filter((id) => id !== contact.id)
          : [...prev, contact.id],
      );
      return;
    }

    createConversation.mutate(
      {
        type: 'DIRECT',
        participantIds: [contact.id],
      },
      {
        onSuccess: (conv) => {
          setContactsOpen(false);
          router.push({
            pathname: '/(tabs)/connect/[id]',
            params: {
              id: conv.id,
              title: contact.fullName,
              subtitle: getRoleLabel(contact.role, contact.staffTitle),
              type: 'DIRECT',
            },
          } as any);
        },
        onError: (err: any) => {
          Alert.alert('Không thể nhắn tin', extractError(err, 'Vui lòng thử lại sau.'));
        },
      },
    );
  };

  const handleCreateGroup = () => {
    if (!groupName.trim() || selectedIds.length === 0) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên nhóm và chọn ít nhất 1 thành viên.');
      return;
    }
    createConversation.mutate(
      {
        type: 'GROUP',
        name: groupName.trim(),
        participantIds: selectedIds,
      },
      {
        onSuccess: (conv) => {
          setContactsOpen(false);
          setGroupMode(false);
          setGroupName('');
          setSelectedIds([]);
          router.push({
            pathname: '/(tabs)/connect/[id]',
            params: {
              id: conv.id,
              title: conv.name || 'Nhóm tổ',
              subtitle: `${selectedIds.length + 1} thành viên`,
              type: 'GROUP',
            },
          } as any);
        },
        onError: (err: any) => {
          Alert.alert('Lỗi tạo nhóm', extractError(err, 'Không thể tạo nhóm trò chuyện.'));
        },
      },
    );
  };

  const renderListHeader = () => (
    <View style={styles.listHeaderWrap}>
      {/* Messenger-style Horizontal Strip: Những người đã chat & Liên hệ nhanh */}
      <View style={styles.quickSection}>
        <View style={styles.quickTitleRow}>
          <AppText variant="label" color={COLORS.textSecondary}>
            NGƯỜI ĐÃ CHAT ({chattedPeople.length})
          </AppText>
          <TouchableOpacity onPress={() => setMessengerMenuOpen(true)}>
            <AppText variant="caption" semibold color={COLORS.primary}>
              Mở menu tất cả →
            </AppText>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickScroll}
        >
          <TouchableOpacity
            onPress={handleOpenSupportChat}
            style={styles.quickContactItem}
            activeOpacity={0.8}
          >
            <View style={styles.quickSupportCircle}>
              <Ionicons name="shield-checkmark" size={22} color={COLORS.warning} />
            </View>
            <AppText
              variant="caption"
              color={COLORS.warning}
              semibold
              numberOfLines={1}
              style={styles.quickName}
            >
              Tổ trưởng
            </AppText>
          </TouchableOpacity>

          {chattedPeople.map((p) => {
            const shortName = p.fullName.split(' ').slice(-2).join(' ');
            return (
              <TouchableOpacity
                key={p.userId}
                onPress={() => openChatWithPerson(p)}
                style={styles.quickContactItem}
                activeOpacity={0.8}
              >
                <View style={styles.quickAvatarWrap}>
                  <Avatar
                    name={p.fullName}
                    uri={p.avatarUrl}
                    size={50}
                    isOfficial={isOfficerRole(p.role)}
                  />
                  <View style={styles.onlineDot} />
                </View>
                <AppText
                  variant="caption"
                  color={COLORS.textPrimary}
                  numberOfLines={1}
                  style={styles.quickName}
                >
                  {shortName}
                </AppText>
              </TouchableOpacity>
            );
          })}

          {quickContacts
            .filter((c) => !chattedPeople.some((p) => p.userId === c.id))
            .map((c) => {
              const shortName = c.fullName.split(' ').slice(-2).join(' ');
              return (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => handleStartDirectWith(c)}
                  style={styles.quickContactItem}
                  activeOpacity={0.8}
                >
                  <View style={styles.quickAvatarWrap}>
                    <Avatar
                      name={c.fullName}
                      uri={c.avatarUrl}
                      size={50}
                      isOfficial={isOfficerRole(c.role)}
                    />
                  </View>
                  <AppText
                    variant="caption"
                    color={COLORS.textSecondary}
                    numberOfLines={1}
                    style={styles.quickName}
                  >
                    {shortName}
                  </AppText>
                </TouchableOpacity>
              );
            })}
        </ScrollView>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {CONV_FILTERS.map((f) => {
          const active = convFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setConvFilter(f.key)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <AppText
                variant="caption"
                semibold={active}
                color={active ? COLORS.primary : COLORS.textSecondary}
              >
                {f.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Messenger-style Top Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => setMessengerMenuOpen(true)}
            style={styles.menuBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="menu" size={22} color={COLORS.textPrimary} />
            {chattedPeople.length > 0 && (
              <View style={styles.menuBadgeDot}>
                <AppText variant="caption" style={styles.menuBadgeText}>
                  {chattedPeople.length}
                </AppText>
              </View>
            )}
          </TouchableOpacity>

          <View>
            <AppText variant="h2" style={{ fontSize: 19 }}>
              Đoạn chat
            </AppText>
            <AppText variant="caption" color={COLORS.textMuted}>
              {chattedPeople.length} người đã kết nối • {user?.neighborhoodName || 'Tổ dân phố'}
            </AppText>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => {
              setGroupMode(false);
              setSelectedIds([]);
              setContactsOpen(true);
            }}
            style={styles.newChatBtn}
          >
            <Ionicons name="create-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messenger Search bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={17} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm trên Messenger..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderListHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={COLORS.primary}
            />
          }
          renderItem={({ item }) => {
            const other = (item.members ?? []).find((m: any) => m.userId !== user?.id)?.user;
            const title =
              item.type === 'DIRECT'
                ? other?.fullName || item.name || 'Cư dân'
                : item.name || other?.fullName || 'Cuộc trò chuyện';
            const subtitle =
              item.type === 'DIRECT' && other
                ? getRoleLabel(other.role, other.staffTitle)
                : item.type === 'SUPPORT'
                  ? 'Ban điều hành Tổ dân phố'
                  : `${item.members?.length ?? 0} thành viên`;
            const lastMsg = item.messages?.[0];
            const typeMeta = CONV_TYPE_META[item.type] || {
              label: item.type,
              tone: 'neutral' as const,
            };

            const previewPrefix =
              lastMsg && lastMsg.senderId === user?.id ? 'Bạn: ' : '';

            return (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/connect/[id]',
                    params: { id: item.id, title, subtitle, type: item.type },
                  } as any)
                }
                activeOpacity={0.8}
                style={styles.messengerRow}
              >
                <View style={styles.rowAvatarWrap}>
                  <Avatar
                    name={title}
                    uri={other?.avatarUrl}
                    size={54}
                    isOfficial={item.type !== 'DIRECT' || isOfficerRole(other?.role)}
                  />
                  <View style={styles.rowOnlineDot} />
                </View>

                <View style={styles.convMeta}>
                  <View style={styles.rowBetween}>
                    <AppText variant="h3" numberOfLines={1} style={{ flex: 1, fontSize: 15.5 }}>
                      {title}
                    </AppText>
                    {lastMsg ? (
                      <AppText variant="caption" color={COLORS.textMuted}>
                        {formatRelativeTimeVi(lastMsg.createdAt)}
                      </AppText>
                    ) : (
                      <Badge label={typeMeta.label} tone={typeMeta.tone} />
                    )}
                  </View>

                  <View style={styles.rowBetween}>
                    <AppText
                      variant="body"
                      color={COLORS.textSecondary}
                      numberOfLines={1}
                      style={{ flex: 1, fontSize: 13.5 }}
                    >
                      {lastMsg
                        ? lastMsg.isModerated
                          ? '[Tin nhắn đã bị ẩn]'
                          : `${previewPrefix}${lastMsg.content}`
                        : 'Chạm để bắt đầu trò chuyện'}
                    </AppText>
                    {lastMsg && item.type !== 'DIRECT' && (
                      <Badge label={typeMeta.label} tone={typeMeta.tone} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              title="Chưa có cuộc trò chuyện nào"
              description="Chọn cư dân phía trên hoặc mở Menu góc trái để nhắn tin."
              actionLabel="Nhắn tin với Tổ trưởng"
              onAction={handleOpenSupportChat}
            />
          }
        />
      )}

      {/* Messenger Left-Side Menu Drawer: Tất cả người đã chat & Danh mục */}
      <Modal
        visible={messengerMenuOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setMessengerMenuOpen(false)}
      >
        <View style={styles.drawerBackdrop}>
          <View style={styles.drawerPanel}>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
              {/* Drawer User Header */}
              <View style={styles.drawerUserHeader}>
                <Avatar
                  name={user?.fullName || 'CD'}
                  uri={user?.avatarUrl}
                  size={44}
                  isOfficial={isOfficer}
                />
                <View style={{ flex: 1 }}>
                  <AppText variant="h3" numberOfLines={1} style={{ fontSize: 16 }}>
                    {user?.fullName || 'Cư dân'}
                  </AppText>
                  <AppText variant="caption" color={COLORS.textSecondary} numberOfLines={1}>
                    {user ? getRoleLabel(user.role, user.staffTitle) : 'Cư dân'}
                  </AppText>
                </View>
                <TouchableOpacity
                  onPress={() => setMessengerMenuOpen(false)}
                  style={styles.drawerCloseBtn}
                >
                  <Ionicons name="close" size={20} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Messenger Menu Shortcuts */}
              <View style={styles.drawerNavSection}>
                <TouchableOpacity
                  onPress={() => {
                    setConvFilter('ALL');
                    setMessengerMenuOpen(false);
                  }}
                  style={[styles.drawerNavItem, convFilter === 'ALL' && styles.drawerNavActive]}
                >
                  <Ionicons name="chatbubbles" size={19} color={COLORS.primary} />
                  <AppText variant="body" semibold style={{ flex: 1, marginLeft: 12 }}>
                    Tất cả đoạn chat
                  </AppText>
                  <Badge label={`${conversations.length}`} tone="primary" />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleOpenSupportChat} style={styles.drawerNavItem}>
                  <Ionicons name="shield-checkmark" size={19} color={COLORS.warning} />
                  <AppText variant="body" semibold style={{ flex: 1, marginLeft: 12 }}>
                    Nhắn tin Tổ trưởng
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setMessengerMenuOpen(false);
                    setGroupMode(false);
                    setContactsOpen(true);
                  }}
                  style={styles.drawerNavItem}
                >
                  <Ionicons name="people" size={19} color={COLORS.secondary} />
                  <AppText variant="body" semibold style={{ flex: 1, marginLeft: 12 }}>
                    Danh bạ cư dân trong tổ
                  </AppText>
                </TouchableOpacity>
              </View>

              {/* Divider + Tất cả những người đã chat */}
              <View style={styles.drawerPeopleHeader}>
                <AppText variant="label" color={COLORS.primary}>
                  TẤT CẢ NGƯỜI ĐÃ CHAT ({chattedPeople.length})
                </AppText>
              </View>

              <View style={[styles.searchBox, { marginHorizontal: SPACING.md, marginBottom: SPACING.sm }]}>
                <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm người đã chat..."
                  placeholderTextColor={COLORS.textMuted}
                  value={menuSearch}
                  onChangeText={setMenuSearch}
                />
              </View>

              <FlatList
                data={filteredMenuPeople}
                keyExtractor={(item) => item.userId}
                contentContainerStyle={styles.drawerPeopleList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => openChatWithPerson(item)}
                    style={styles.drawerPersonRow}
                  >
                    <View style={{ position: 'relative' }}>
                      <Avatar
                        name={item.fullName}
                        uri={item.avatarUrl}
                        size={42}
                        isOfficial={isOfficerRole(item.role)}
                      />
                      <View style={styles.drawerOnlineDot} />
                    </View>

                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={styles.rowBetween}>
                        <AppText variant="body" semibold numberOfLines={1} style={{ flex: 1 }}>
                          {item.fullName}
                        </AppText>
                        {item.lastMessageAt && (
                          <AppText variant="caption" color={COLORS.textMuted} style={{ fontSize: 11 }}>
                            {formatRelativeTimeVi(item.lastMessageAt)}
                          </AppText>
                        )}
                      </View>
                      <AppText variant="caption" color={COLORS.textSecondary} numberOfLines={1}>
                        {item.lastMessage || getRoleLabel(item.role, item.staffTitle)}
                      </AppText>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={{ padding: SPACING.lg, alignItems: 'center' }}>
                    <AppText variant="caption" color={COLORS.textMuted}>
                      Chưa có lịch sử trò chuyện nào.
                    </AppText>
                  </View>
                }
              />
            </SafeAreaView>
          </View>

          <TouchableOpacity
            style={styles.drawerOverlayTouch}
            activeOpacity={1}
            onPress={() => setMessengerMenuOpen(false)}
          />
        </View>
      </Modal>

      {/* Contacts / New Chat Modal */}
      <Modal visible={contactsOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setContactsOpen(false)}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <AppText variant="h3">
              {groupMode ? 'Tạo nhóm Tổ dân phố' : 'Danh bạ cư dân'}
            </AppText>
            {isOfficer ? (
              <TouchableOpacity onPress={() => setGroupMode((v) => !v)}>
                <AppText variant="caption" semibold color={COLORS.primary}>
                  {groupMode ? 'Nhắn 1-1' : '+ Tạo nhóm'}
                </AppText>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 50 }} />
            )}
          </View>

          {groupMode && (
            <View style={styles.groupNameBox}>
              <TextInput
                style={styles.searchInput}
                placeholder="Nhập tên nhóm trò chuyện..."
                placeholderTextColor={COLORS.textMuted}
                value={groupName}
                onChangeText={setGroupName}
              />
            </View>
          )}

          <View style={[styles.searchBox, { marginHorizontal: SPACING.lg, marginTop: SPACING.md }]}>
            <Ionicons name="search-outline" size={17} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm tên cư dân hoặc cán bộ..."
              placeholderTextColor={COLORS.textMuted}
              value={contactSearch}
              onChangeText={setContactSearch}
            />
          </View>

          {loadingContacts ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <FlatList
              data={modalContacts}
              keyExtractor={(c) => c.id}
              contentContainerStyle={styles.contactListContent}
              renderItem={({ item }) => {
                const selected = selectedIds.includes(item.id);
                return (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => handleStartDirectWith(item)}
                  >
                    <AppCard
                      style={
                        selected
                          ? { ...styles.convCard, borderColor: COLORS.primary }
                          : styles.convCard
                      }
                    >
                      <Avatar
                        name={item.fullName}
                        uri={item.avatarUrl}
                        size={44}
                        isOfficial={isOfficerRole(item.role)}
                      />
                      <View style={{ flex: 1 }}>
                        <AppText variant="h3" style={{ fontSize: 15 }}>
                          {item.fullName}
                        </AppText>
                        <AppText variant="caption" color={COLORS.textSecondary}>
                          {getRoleLabel(item.role, item.staffTitle)}
                        </AppText>
                      </View>
                      {groupMode ? (
                        <Ionicons
                          name={selected ? 'checkbox' : 'square-outline'}
                          size={22}
                          color={selected ? COLORS.primary : COLORS.textMuted}
                        />
                      ) : (
                        <View style={styles.chatPillBtn}>
                          <Ionicons name="paper-plane" size={14} color={COLORS.primary} />
                          <AppText variant="caption" semibold color={COLORS.primary} style={{ marginLeft: 4 }}>
                            Nhắn
                          </AppText>
                        </View>
                      )}
                    </AppCard>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <EmptyState
                  icon="people-outline"
                  title="Không tìm thấy cư dân"
                  description="Thử tìm kiếm với từ khóa khác."
                />
              }
            />
          )}

          {groupMode && (
            <View style={styles.modalFooter}>
              <AppButton
                title={`Tạo nhóm (${selectedIds.length} thành viên)`}
                onPress={handleCreateGroup}
                loading={createConversation.isPending}
                fullWidth
              />
            </View>
          )}
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 2, flex: 1 },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  menuBadgeDot: {
    position: 'absolute',
    top: -3,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  menuBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: COLORS.textInverse,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  newChatBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  listHeaderWrap: {
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  quickSection: {
    gap: SPACING.sm,
  },
  quickTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickScroll: {
    gap: SPACING.md,
    paddingVertical: 2,
  },
  quickContactItem: {
    alignItems: 'center',
    width: 64,
    gap: 5,
  },
  quickSupportCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.warningLight,
    borderWidth: 1.5,
    borderColor: '#5C3D12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAvatarWrap: {
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  quickName: {
    fontSize: 11.5,
    textAlign: 'center',
  },
  filterRow: {
    gap: SPACING.sm,
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
  listContent: { paddingBottom: 32 },
  messengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  rowAvatarWrap: {
    position: 'relative',
  },
  rowOnlineDot: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  convCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md },
  convMeta: { flex: 1, gap: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  chatPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },

  // Messenger Left Drawer Menu
  drawerBackdrop: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  drawerPanel: {
    width: '82%',
    maxWidth: 340,
    backgroundColor: '#211A16',
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  drawerOverlayTouch: {
    flex: 1,
  },
  drawerUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    padding: SPACING.md,
    backgroundColor: '#2A221D',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  drawerCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerNavSection: {
    padding: SPACING.sm,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  drawerNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
  },
  drawerNavActive: {
    backgroundColor: COLORS.primaryLight,
  },
  drawerPeopleHeader: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs + 2,
  },
  drawerPeopleList: {
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  drawerPersonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  drawerOnlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#211A16',
  },

  contactListContent: { padding: SPACING.lg, gap: SPACING.md },
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#2A221D',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  groupNameBox: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 44,
    justifyContent: 'center',
  },
  modalFooter: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
});
