import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '@/constants/theme';
import { AppText } from './AppText';
import { AppButton } from './AppButton';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = 'newspaper-outline',
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={36} color={COLORS.primary} />
      </View>
      <AppText variant="h3" style={styles.title}>
        {title}
      </AppText>
      {description && (
        <AppText variant="body" color={COLORS.textSecondary} style={styles.description}>
          {description}
        </AppText>
      )}
      {actionLabel && onAction && (
        <AppButton title={actionLabel} onPress={onAction} style={styles.button} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
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
  title: {
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  description: {
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  button: {
    marginTop: SPACING.sm,
  },
});

