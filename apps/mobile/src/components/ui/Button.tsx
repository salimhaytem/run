import { Pressable, StyleSheet, Text, ActivityIndicator, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius } from '@/theme/tokens';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'premium';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  haptic?: 'light' | 'medium' | 'heavy';
  icon?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  haptic = 'light',
  icon,
}: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const bg =
    variant === 'primary' ? colors.primary
    : variant === 'danger' ? colors.danger
    : variant === 'premium' ? '#FFD700'
    : variant === 'secondary' ? colors.surfaceElevated
    : 'transparent';

  const textColor =
    variant === 'ghost' ? colors.primary
    : variant === 'premium' ? '#000'
    : colors.text;

  const paddingV = size === 'sm' ? spacing.sm : size === 'lg' ? spacing.lg : spacing.md;
  const paddingH = size === 'sm' ? spacing.md : size === 'lg' ? spacing.xl : spacing.lg;
  const fontSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={() => {
          if (haptic === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          else if (haptic === 'heavy') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          else if (haptic === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        disabled={disabled || loading}
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 200, mass: 0.5 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 200, mass: 0.5 }); }}
        style={({ pressed }: { pressed: boolean }) => [
          styles.btn,
          {
            backgroundColor: bg,
            paddingVertical: paddingV,
            paddingHorizontal: paddingH,
            opacity: pressed || disabled ? 0.7 : 1,
          },
          variant === 'ghost' && styles.ghost,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : (
          <View style={styles.row}>
            {icon && <Text style={[styles.icon, { color: textColor }]}>{icon}</Text>}
            <Text style={[styles.text, { color: textColor, fontSize }]}>{title}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghost: { borderWidth: 1, borderColor: colors.primary, backgroundColor: 'transparent' },
  text: { fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { fontSize: 16 },
});