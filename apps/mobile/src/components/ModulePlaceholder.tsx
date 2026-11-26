import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '@/constants/theme';
import { AppText } from './AppText';
import { AppCard } from './AppCard';
import { Badge } from './Badge';

interface ModulePlaceholderProps {
  title: string;
  subtitle: string;
  moduleNumber: number;
  icon: keyof typeof Ionicons.glyphMap;
}

export function ModulePlaceholder({
  title,
  subtitle,
  moduleNumber,
  icon,
}: ModulePlaceholderProps) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AppText variant="h2">{title}</AppText>
        <Badge label={`Module ${moduleNumber}`} tone="neutral" />
      </View>
      <View style={styles.body}>
        <AppCard style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name={icon} size={36} color={COLORS.primary} />
          </View>
          <AppText variant="h3" style={styles.cardTitle}>
            {title}
          </AppText>
          <AppText variant="body" color={COLORS.textSecondary} style={styles.cardDesc}>
            {subtitle}
          </AppText>
          <Badge label="Đang chờ triển khai theo lộ trình" tone="warning" />
        </AppCard>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  body: {
    flex: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  cardTitle: {
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  cardDesc: {
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
});

