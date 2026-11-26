import React from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TouchableOpacityProps,
} from 'react-native';
import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { AppText } from './AppText';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';

interface AppButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function AppButton({
  title,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  style,
  ...rest
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  const getContainerStyle = (): ViewStyle => {
    switch (variant) {
      case 'secondary':
        return { backgroundColor: COLORS.primaryLight };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: COLORS.primary,
        };
      case 'danger':
        return { backgroundColor: COLORS.danger };
      case 'ghost':
        return { backgroundColor: 'transparent' };
      default:
        return { backgroundColor: COLORS.primary };
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'secondary':
      case 'outline':
      case 'ghost':
        return COLORS.primary;
      default:
        return COLORS.textInverse;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      disabled={isDisabled}
      style={[
        styles.base,
        getContainerStyle(),
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <>
          {icon}
          <AppText
            variant="body"
            semibold
            color={getTextColor()}
            style={icon ? styles.textWithIcon : undefined}
          >
            {title}
          </AppText>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    minHeight: 46,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.55,
  },
  textWithIcon: {
    marginLeft: SPACING.sm,
  },
});

