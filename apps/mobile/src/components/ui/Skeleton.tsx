import { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { colors, radius as radiusTokens } from '@/theme/tokens';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = radiusTokens.sm, style }: SkeletonProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(opacity);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.base,
        { width: width as any, height, borderRadius },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function SkeletonCircle({ size }: { size: number }) {
  return <Skeleton width={size} height={size} borderRadius={size / 2} />;
}

export function SkeletonCard({ lines = 3, height = 120 }: { lines?: number; height?: number }) {
  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.header}>
        <SkeletonCircle size={40} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={12} />
        </View>
      </View>
      <Skeleton width="100%" height={height} borderRadius={8} />
      <View style={{ gap: 6, marginTop: 12 }}>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} width={`${70 + Math.random() * 30}%`} height={14} />
        ))}
      </View>
    </View>
  );
}

export function SkeletonAvatar({ size = 88 }: { size?: number }) {
  return (
    <View style={{ alignItems: 'center', marginBottom: 16 }}>
      <SkeletonCircle size={size} />
      <Skeleton width={100} height={16} borderRadius={8} style={{ marginTop: 12 }} />
      <Skeleton width={140} height={14} borderRadius={8} style={{ marginTop: 8 }} />
    </View>
  );
}

export function SkeletonFeed() {
  return (
    <View style={{ padding: 16, gap: 16 }}>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={{ alignItems: 'center', gap: 6 }}>
            <SkeletonCircle size={56} />
            <Skeleton width={40} height={10} />
          </View>
        ))}
      </View>
      <SkeletonCard />
      <SkeletonCard />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surfaceElevated,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});