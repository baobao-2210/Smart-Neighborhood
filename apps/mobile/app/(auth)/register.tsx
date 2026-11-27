import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { AppButton, AppCard, AppText } from '@/components';
import { apiClient } from '@/services/apiClient';
import { registerApi } from '@/services/userService';
import { useAuthStore } from '@/store/useAuthStore';

interface NeighborhoodOption {
  id: string;
  code: string;
  name: string;
}

export default function RegisterScreen() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [neighborhoodCode, setNeighborhoodCode] = useState('TDP-05-P12');
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiClient
      .get('/api/v1/auth/neighborhoods')
      .then((res) => {
        const list = res.data?.data as NeighborhoodOption[];
        if (Array.isArray(list) && list.length > 0) {
          setNeighborhoods(list);
          setNeighborhoodCode(list[0].code);
        }
      })
      .catch(() => {
        // Fallback to default code
      });
  }, []);

  const handleRegister = async () => {
    if (!fullName.trim() || !phoneNumber.trim() || password.length < 6) {
      Alert.alert(
        'Thông tin chưa hợp lệ',
        'Vui lòng nhập đầy đủ họ tên, SĐT và mật khẩu (tối thiểu 6 ký tự).',
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Mật khẩu không khớp', 'Vui lòng nhập lại mật khẩu xác nhận giống nhau.');
      return;
    }

    if (!neighborhoodCode.trim()) {
      Alert.alert('Thiếu mã tổ', 'Vui lòng chọn hoặc nhập mã Tổ dân phố.');
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
      const raw = err?.response?.data?.message || err?.message;
      const msg = Array.isArray(raw)
        ? raw.join('\n')
        : typeof raw === 'string'
          ? raw
          : 'Đăng ký thất bại.';
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
          <View style={styles.passwordWrap}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Nhập mật khẩu..."
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showPwd}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPwd((v) => !v)} style={styles.eyeBtn}>
              <Ionicons
                name={showPwd ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>

          <AppText variant="label" color={COLORS.textSecondary} style={styles.label}>
            Xác nhận mật khẩu
          </AppText>
          <TextInput
            style={styles.input}
            placeholder="Nhập lại mật khẩu..."
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry={!showPwd}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <AppText variant="label" color={COLORS.textSecondary} style={styles.label}>
            Chọn Tổ dân phố
          </AppText>
          {neighborhoods.length > 0 && (
            <View style={styles.neighborhoodList}>
              {neighborhoods.map((nb) => {
                const active = neighborhoodCode === nb.code;
                return (
                  <TouchableOpacity
                    key={nb.id}
                    onPress={() => setNeighborhoodCode(nb.code)}
                    style={[styles.nbChip, active && styles.nbChipActive]}
                  >
                    <AppText
                      variant="caption"
                      semibold={active}
                      color={active ? COLORS.primary : COLORS.textPrimary}
                    >
                      {nb.name} ({nb.code})
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
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
  eyeBtn: { paddingHorizontal: SPACING.md },
  neighborhoodList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  nbChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  nbChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  backBtn: { alignItems: 'center', marginTop: SPACING.md },
});
