import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import { COLORS } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';

export default function Index() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const { isHydrated, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!rootNavigationState?.key || !isHydrated) return;
    if (isAuthenticated) {
      router.replace('/(tabs)/feed');
    } else {
      router.replace('/(auth)/login');
    }
  }, [rootNavigationState?.key, isHydrated, isAuthenticated, router]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
      }}
    >
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}
