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
      <Stack.Screen
        name="create"
        options={{ title: 'Tạo bài viết & Phản ánh' }}
      />
      <Stack.Screen
        name="report-create"
        options={{ title: 'Gửi phản ánh sự cố' }}
      />
      <Stack.Screen name="[id]" options={{ title: 'Chi tiết bài viết' }} />
    </Stack>
  );
}

