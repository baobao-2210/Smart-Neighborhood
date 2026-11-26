import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/theme';

export default function ReportCreateRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(tabs)/feed/create?mode=REPORT');
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}
