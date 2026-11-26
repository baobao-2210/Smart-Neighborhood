import React from 'react';
import { Stack } from 'expo-router';
import { COLORS } from '@/constants/theme';

export default function FeedLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.textPrimary,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Chi tiết bài viết' }} />
      <Stack.Screen
        name="create"
        options={{ title: 'Đăng bài mới', presentation: 'modal' }}
      />
      <Stack.Screen
        name="report-create"
        options={{ title: 'Gửi phản ánh sự cố', presentation: 'modal' }}
      />
    </Stack>
  );
}

