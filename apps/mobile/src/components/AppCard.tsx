import React from 'react';
import { View, StyleSheet, ViewProps, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SPACING } from '@/constants/theme';

interface AppCardProps extends ViewProps {
  padded?: boolean;
  style?: ViewStyle;
}

export function AppCard({ padded = true, style, children, ...rest }: AppCardProps) {
  return (
    <View style={[styles.card, padded && styles.padded, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  padded: {
    padding: SPACING.lg,
  },
});

