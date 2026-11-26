import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { AppText } from './AppText';

type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function Badge({ label, tone = 'primary', icon, style }: BadgeProps) {
  const toneStyles = {
    primary: { bg: COLORS.primaryLight, text: COLORS.primary },
    success: { bg: COLORS.successLight, text: COLORS.success },
    warning: { bg: COLORS.warningLight, text: COLORS.warning },
    danger: { bg: COLORS.dangerLight, text: COLORS.danger },
    neutral: { bg: COLORS.surfaceAlt, text: COLORS.textSecondary },
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: toneStyles.bg }, style]}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <AppText variant="label" color={toneStyles.text}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
});

