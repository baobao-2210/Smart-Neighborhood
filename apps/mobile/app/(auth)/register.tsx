import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { AppButton, AppCard, AppText } from '@/components';
import { registerApi } from '@/services/userService';
import { useAuthStore } from '@/store/useAuthStore';

export default function RegisterScreen() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [neighborhoodCode, setNeighborhoodCode] = useState('TDP-05-P12');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !phoneNumber.trim() || password.length < 6) {
      Alert.alert('Thông tin chưa hợp lệ', 'Vui lòng nhập đầy đủ họ tên, SĐT và mật khẩu >= 6 ký tự.');
      return;
    }

    setLoading(true);
    try {
      const data = await registerApi({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        password,
        neighborhoodCode: neighborhoodCode.trim(),
      });
      await setSession(data.user, data.accessToken, data.refreshToken);
      router.replace('/(tabs)/feed');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Đăng ký thất bại.';
      Alert.alert('Lỗi đăng ký', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="h1" color={COLORS.primary} style={styles.title}>
          Đăng ký Cư dân
        </AppText>
        <AppText variant="body" color={COLORS.textSecondary} style={styles.subtitle}>
          Tham gia cổng thông tin Tổ dân phố của bạn
        </AppText>

        <AppCard>
          <AppText variant="label" color={COLORS.textSecondary} style={styles.label}>
            Họ và tên
          </AppText>
          <TextInput
            style={styles.input}
            placeholder="Ví dụ: Lê Minh Tuấn"
            placeholderTextColor={COLORS.textMuted}
            value={fullName}
            onChangeText={setFullName}
          />

          <AppText variant="label" color={COLORS.textSecondary} style={styles.label}>
            Số điện thoại
          </AppText>
          <TextInput
            style={styles.input}
            placeholder="09xxxxxxxx"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />

          <AppText variant="label" color={COLORS.textSecondary} style={styles.label}>
            Mật khẩu (tối thiểu 6 ký tự)
          </AppText>
          <TextInput
            style={styles.input}
            placeholder="Nhập mật khẩu..."
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <AppText variant="label" color={COLORS.textSecondary} style={styles.label}>
            Mã Tổ dân phố
          </AppText>
          <TextInput
            style={styles.input}
            placeholder="TDP-05-P12"
            placeholderTextColor={COLORS.textMuted}
            value={neighborhoodCode}
            onChangeText={setNeighborhoodCode}
          />

          <AppButton
            title="Tạo tài khoản"
            onPress={handleRegister}
            loading={loading}
            fullWidth
          />

          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <AppText variant="body" color={COLORS.primary} semibold>
              Đã có tài khoản? Quay lại Đăng nhập
            </AppText>
          </TouchableOpacity>
        </AppCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, flexGrow: 1, justifyContent: 'center' },
  title: { marginBottom: 4 },
  subtitle: { marginBottom: SPACING.lg },
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
  backBtn: { alignItems: 'center', marginTop: SPACING.md },
});

