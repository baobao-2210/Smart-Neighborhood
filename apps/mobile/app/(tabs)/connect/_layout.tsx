import React from 'react';
import { Stack } from 'expo-router';
import { COLORS } from '@/constants/theme';

export default function ConnectLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.textPrimary,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Phòng trò chuyện' }} />
    </Stack>
  );
}

