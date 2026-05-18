import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { colors, spacing } from '@/theme/tokens';

interface StatBlockProps {
  label: string;
  value: string;
  animated?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StatBlock({ label, value, animated = false, size = 'md' }: StatBlockProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    if (animated) {
      opacity.value = withTiming(1, { duration: 400 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    }
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: animated ? opacity.value : 1,
    transform: [{ translateY: animated ? translateY.value : 0 }],
  }));

  const valueSize = size === 'sm' ? 18 : size === 'lg' ? 28 : 22;
  const labelSize = size === 'sm' ? 10 : size === 'lg' ? 14 : 12;

  return (
    <Animated.View style={[styles.wrap, animStyle]}>
      <Text style={[styles.value, { fontSize: valueSize }]}>{value}</Text>
      <Text style={[styles.label, { fontSize: labelSize }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', flex: 1 },
  value: { color: colors.text, fontWeight: '700' },
  label: { color: colors.textSecondary, marginTop: spacing.xs },
});