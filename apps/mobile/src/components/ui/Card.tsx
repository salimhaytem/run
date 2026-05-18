import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, elevation } from '@/theme/tokens';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  onPress?: () => void;
  haptic?: 'light' | 'medium';
  accessibilityLabel?: string;
}

export function Card({ children, style, elevated, onPress, haptic, accessibilityLabel }: CardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const content = (
    <Animated.View
      style={[
        styles.card,
        elevated && elevation.medium,
        animatedStyle,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={() => {
          if (haptic === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          else if (haptic === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPressIn={() => { scale.value = withSpring(0.98, { damping: 15, stiffness: 200, mass: 0.5 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 200, mass: 0.5 }); }}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});