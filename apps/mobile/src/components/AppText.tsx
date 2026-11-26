import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY } from '@/constants/theme';

type TextVariant = keyof typeof TYPOGRAPHY;

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  bold?: boolean;
  semibold?: boolean;
}

export function AppText({
  variant = 'body',
  color = COLORS.textPrimary,
  bold,
  semibold,
  style,
  children,
  ...rest
}: AppTextProps) {
  return (
    <Text
      style={[
        TYPOGRAPHY[variant],
        { color },
        bold && styles.bold,
        semibold && styles.semibold,
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  bold: { fontWeight: '700' },
  semibold: { fontWeight: '600' },
});

