import { useCallback, ReactNode } from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';

interface AnimatedPressableProps {
  children: ReactNode;
  scaleTo?: number;
  haptic?: 'light' | 'medium' | 'heavy';
  style?: StyleProp<ViewStyle>;
  onPress?: (e: any) => void;
  onPressIn?: (e: any) => void;
  onPressOut?: (e: any) => void;
  disabled?: boolean;
}

export function AnimatedPressable({
  children,
  scaleTo = 0.97,
  haptic,
  onPressIn,
  onPressOut,
  style,
  ...props
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pressInHaptic = useCallback(() => {
    if (haptic === 'light') {
      try { (global as any).Haptics?.impactAsync?.(0); } catch {}
    } else if (haptic === 'medium') {
      try { (global as any).Haptics?.impactAsync?.(1); } catch {}
    } else if (haptic === 'heavy') {
      try { (global as any).Haptics?.impactAsync?.(2); } catch {}
    }
  }, [haptic]);

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPressIn={(e: any) => {
          scale.value = withSpring(scaleTo, { damping: 15, stiffness: 200, mass: 0.5 });
          if (haptic) runOnJS(pressInHaptic)();
          onPressIn?.(e);
        }}
        onPressOut={(e: any) => {
          scale.value = withSpring(1, { damping: 15, stiffness: 200, mass: 0.5 });
          onPressOut?.(e);
        }}
        {...props}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export const AnimatedPressableSpring = AnimatedPressable;