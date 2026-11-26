import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import { COLORS } from '@/constants/theme';

export default function Index() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (rootNavigationState?.key) {
      router.replace('/(tabs)/feed');
    }
  }, [rootNavigationState?.key, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}
