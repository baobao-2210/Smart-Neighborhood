import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { AppButton, AppCard, AppText } from '@/components';
import { loginApi } from '@/services/userService';
import { useAuthStore } from '@/store/useAuthStore';

const DEMO_ACCOUNTS = [
  { label: 'Cư dân', phone: '0912345678', pass: '123456' },
  { label: 'Tổ trưởng', phone: '0987654321', pass: '123456' },
  { label: 'Cán bộ', phone: '0944556677', pass: '123456' },
];

export default function LoginScreen() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const [phoneNumber, setPhoneNumber] = useState('0912345678');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phoneNumber.trim() || !password) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số điện thoại và mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      const data = await loginApi(phoneNumber.trim(), password);
      await setSession(data.user, data.accessToken, data.refreshToken);
      router.replace('/(tabs)/feed');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Không thể kết nối tới máy chủ Backend (kiểm tra cổng 3000).';
      Alert.alert('Đăng nhập thất bại', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.brandBox}>
            <View style={styles.logoCircle}>
              <Ionicons name="home" size={34} color={COLORS.textInverse} />
            </View>
            <AppText variant="h1" color={COLORS.primary}>
              Smart Neighborhood
            </AppText>
            <AppText variant="body" color={COLORS.textSecondary} style={styles.subtitle}>
              Ứng dụng Quản lý Tổ dân phố số
            </AppText>
          </View>

          <AppCard style={styles.card}>
            <AppText variant="h3" style={styles.cardTitle}>
              Đăng nhập tài khoản
            </AppText>

            <AppText variant="label" color={COLORS.textSecondary} style={styles.label}>
              Số điện thoại
            </AppText>
            <TextInput
              style={styles.input}
              placeholder="Nhập số điện thoại..."
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />

            <AppText variant="label" color={COLORS.textSecondary} style={styles.label}>
              Mật khẩu
            </AppText>
            <TextInput
              style={styles.input}
              placeholder="Nhập mật khẩu..."
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <AppButton
              title="Đăng nhập"
              onPress={handleLogin}
              loading={loading}
              fullWidth
              style={styles.loginBtn}
            />

            <TouchableOpacity
              onPress={() => router.push('/(auth)/register')}
              style={styles.registerLink}
            >
              <AppText variant="body" color={COLORS.primary} semibold>
                Chưa có tài khoản? Đăng ký cư dân mới
              </AppText>
            </TouchableOpacity>
          </AppCard>

          <AppCard style={styles.demoCard}>
            <AppText variant="label" color={COLORS.textSecondary} style={styles.demoTitle}>
              Điền nhanh tài khoản đã seed trên Supabase:
            </AppText>
            <View style={styles.demoRow}>
              {DEMO_ACCOUNTS.map((acc) => (
                <TouchableOpacity
                  key={acc.phone}
                  onPress={() => {
                    setPhoneNumber(acc.phone);
                    setPassword(acc.pass);
                  }}
                  style={styles.demoChip}
                >
                  <AppText variant="caption" semibold color={COLORS.primary}>
                    {acc.label}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          </AppCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, justifyContent: 'center', flexGrow: 1 },
  brandBox: { alignItems: 'center', marginBottom: SPACING.xl },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  subtitle: { marginTop: 4 },
  card: { marginBottom: SPACING.md },
  cardTitle: { marginBottom: SPACING.md },
  label: { marginBottom: 6 },
  input: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loginBtn: { marginTop: SPACING.xs },
  registerLink: { alignItems: 'center', marginTop: SPACING.md },
  demoCard: { backgroundColor: COLORS.surfaceAlt },
  demoTitle: { marginBottom: SPACING.sm },
  demoRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  demoChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
});

