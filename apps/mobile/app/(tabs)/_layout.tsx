import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';
import { InAppNotificationBanner } from '@/components/InAppNotificationBanner';
import { useMyNotifications } from '@/services/noticeService';
import { useAuthStore } from '@/store/useAuthStore';

export default function TabsLayout() {
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuthStore();
  const { data: notifData } = useMyNotifications();
  const unreadCount = notifData?.unreadCount ?? 0;

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isHydrated, isAuthenticated, router]);

  return (
    <View style={{ flex: 1 }}>
      <InAppNotificationBanner />
      <Tabs
        screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: '#2A221D',
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarItemStyle: {
          borderRadius: 12,
          marginHorizontal: 4,
        },
        tabBarActiveBackgroundColor: 'transparent',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Bảng tin',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="connect"
        options={{
          title: 'Trò chuyện',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notice/index"
        options={{
          title: 'Thông báo',
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: COLORS.danger,
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '700',
          },
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={21} color={color} />
          ),
        }}
      />

      {/* Bản đồ được tích hợp vào màn hình Đăng tin / Phản ánh, ẩn khỏi thanh Tab Bar */}
      <Tabs.Screen
        name="map/index"
        options={{
          href: null,
        }}
      />

      {/* Module 3: Quản lý cư dân ẩn khỏi Bottom Tab Bar, chỉ mở qua Cổng quản trị theo quyền */}
      <Tabs.Screen
        name="residents/index"
        options={{
          href: null,
        }}
      />
    </Tabs>
    </View>
  );
}
