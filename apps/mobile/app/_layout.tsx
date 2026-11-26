import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import axios from 'axios';
import { COLORS } from '@/constants/theme';
import { API_BASE_URL } from '@/services/apiClient';
import { getStoredRefreshToken, useAuthStore } from '@/store/useAuthStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function AuthHydrator({ children }: { children: React.ReactNode }) {
  const { setSession, setHydrated } = useAuthStore();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const refreshToken = await getStoredRefreshToken();
        if (!refreshToken) {
          if (mounted) setHydrated(true);
          return;
        }
        const refreshRes = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
          refreshToken,
        });
        const { accessToken, refreshToken: nextRefresh } = refreshRes.data.data;
        const meRes = await axios.get(`${API_BASE_URL}/api/v1/users/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const me = meRes.data.data;
        if (mounted) {
          await setSession(
            {
              id: me.id,
              fullName: me.fullName,
              phoneNumber: me.phoneNumber,
              email: me.email,
              role: me.role,
              staffTitle: me.staffTitle,
              neighborhoodId: me.neighborhoodId,
              neighborhoodName: me.neighborhood?.name,
              avatarUrl: me.avatarUrl,
            },
            accessToken,
            nextRefresh,
          );
        }
      } catch {
        if (mounted) setHydrated(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [setSession, setHydrated]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthHydrator>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: COLORS.surface },
                headerTintColor: COLORS.textPrimary,
                headerTitleStyle: { fontWeight: '700' },
                contentStyle: { backgroundColor: COLORS.background },
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
          </AuthHydrator>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
