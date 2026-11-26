import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/theme';
import { AppText } from './AppText';

interface AvatarProps {
  name: string;
  uri?: string | null;
  size?: number;
  isOfficial?: boolean;
}

export function Avatar({ name, uri, size = 44, isOfficial = false }: AvatarProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: isOfficial ? COLORS.primary : COLORS.secondary,
            },
          ]}
        >
          <AppText
            variant="caption"
            bold
            color={COLORS.textInverse}
            style={{ fontSize: Math.max(12, size * 0.36) }}
          >
            {initials || 'CD'}
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  image: {
    resizeMode: 'cover',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

