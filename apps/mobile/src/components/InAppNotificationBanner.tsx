import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { AppText } from './AppText';
import { API_BASE_URL } from '@/services/apiClient';
import {
  NOTICE_KEYS,
  PersonalNotification,
  useMarkNotificationRead,
} from '@/services/noticeService';
import { useAuthStore } from '@/store/useAuthStore';

function getBannerMeta(type: string) {
  switch (type) {
    case 'POST_LIKED':
      return { icon: 'heart' as const, color: COLORS.danger, bg: COLORS.dangerLight };
    case 'POST_COMMENTED':
      return { icon: 'chatbubble' as const, color: COLORS.primary, bg: COLORS.primaryLight };
    case 'NEW_MESSAGE':
      return { icon: 'paper-plane' as const, color: COLORS.secondary, bg: COLORS.secondaryLight };
    case 'EVENT_CREATED':
      return { icon: 'calendar' as const, color: COLORS.secondary, bg: COLORS.secondaryLight };
    case 'ANNOUNCEMENT':
      return { icon: 'megaphone' as const, color: COLORS.warning, bg: COLORS.warningLight };
    default:
      return { icon: 'notifications' as const, color: COLORS.primary, bg: COLORS.primaryLight };
  }
}

export function InAppNotificationBanner() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, accessToken } = useAuthStore();
  const markRead = useMarkNotificationRead();

  const [banner, setBanner] = useState<PersonalNotification | null>(null);
  const translateY = useRef(new Animated.Value(-140)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    Animated.timing(translateY, {
      toValue: -140,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setBanner(null));
  };

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const socket = io(`${API_BASE_URL}/ws/feed`, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    const handleNewNotif = (notif: PersonalNotification) => {
      queryClient.invalidateQueries({ queryKey: NOTICE_KEYS.notifications });
      setBanner(notif);

      if (hideTimer.current) clearTimeout(hideTimer.current);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 70,
        friction: 10,
      }).start();

      hideTimer.current = setTimeout(() => {
        dismiss();
      }, 4500);
    };

    socket.on('notification.new', handleNewNotif);

    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      socket.off('notification.new', handleNewNotif);
      socket.disconnect();
    };
  }, [isAuthenticated, accessToken, queryClient]);

  if (!banner) return null;

  const meta = getBannerMeta(banner.type);

  const handlePress = () => {
    const current = banner;
    dismiss();
    if (!current.isRead) {
      markRead.mutate(current.id);
    }
    if ((current.type === 'POST_LIKED' || current.type === 'POST_COMMENTED') && current.referenceId) {
      router.push(`/(tabs)/feed/post/${current.referenceId}` as any);
    } else if (current.type === 'NEW_MESSAGE' && current.referenceId) {
      router.push(`/(tabs)/connect/${current.referenceId}` as any);
    } else {
      router.push('/(tabs)/notice' as any);
    }
  };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          top: Math.max(insets.top, 12) + 6,
          transform: [{ translateY }],
        },
      ]}
    >
      <TouchableOpacity activeOpacity={0.9} onPress={handlePress} style={styles.card}>
        <View style={[styles.iconBox, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={20} color={meta.color} />
        </View>
        <View style={styles.textWrap}>
          <AppText variant="label" color={COLORS.textPrimary} numberOfLines={1}>
            {banner.title}
          </AppText>
          <AppText variant="caption" color={COLORS.textSecondary} numberOfLines={1}>
            {banner.body}
          </AppText>
        </View>
        <TouchableOpacity onPress={dismiss} hitSlop={8}>
          <Ionicons name="close" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 9999,
    elevation: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: '#2E2520',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primarySoft,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
});

