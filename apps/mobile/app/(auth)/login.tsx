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
  Modal,
  Linking,
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
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
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
      const raw = err?.response?.data?.message || err?.message;
      const msg = Array.isArray(raw)
        ? raw.join('\n')
        : typeof raw === 'string'
          ? raw
          : 'Không thể kết nối tới máy chủ Backend (kiểm tra cổng 3000).';
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

            <View style={styles.pwdHeaderRow}>
              <AppText variant="label" color={COLORS.textSecondary}>
                Mật khẩu
              </AppText>
              <TouchableOpacity onPress={() => setForgotOpen(true)}>
                <AppText variant="caption" semibold color={COLORS.primary}>
                  Quên mật khẩu?
                </AppText>
              </TouchableOpacity>
            </View>

            <View style={styles.passwordWrap}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Nhập mật khẩu..."
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeBtn}
                hitSlop={8}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>

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
              Điền nhanh tài khoản trải nghiệm:
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

      {/* Forgot Password Support Modal */}
      <Modal visible={forgotOpen} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <AppCard style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <AppText variant="h3">Khôi phục mật khẩu</AppText>
              <TouchableOpacity onPress={() => setForgotOpen(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <AppText variant="body" color={COLORS.textSecondary}>
              Để đảm bảo an toàn thông tin cư dân, vui lòng liên hệ trực tiếp Tổ trưởng hoặc Ban điều hành Tổ dân phố để xác minh SĐT và cấp lại mật khẩu mới.
            </AppText>
            <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs }}>
              <AppButton
                title="Đóng"
                variant="outline"
                onPress={() => setForgotOpen(false)}
                style={{ flex: 1 }}
              />
              <AppButton
                title="Gọi Tổ trưởng"
                onPress={() => Linking.openURL('tel:0987654321')}
                style={{ flex: 1 }}
              />
            </View>
          </AppCard>
        </View>
      </Modal>
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
  pwdHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
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
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  eyeBtn: {
    paddingHorizontal: SPACING.md,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: { gap: SPACING.md },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
