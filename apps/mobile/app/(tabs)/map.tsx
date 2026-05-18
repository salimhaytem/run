import { View, StyleSheet, Pressable, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, cancelAnimation, Easing } from 'react-native-reanimated';
import { useEffect } from 'react';
import { router } from 'expo-router';
import { SocialMap } from '@/components/map/SocialMap';
import { colors, spacing } from '@/theme/tokens';

function SosButton() {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, true,
    );
    return () => cancelAnimation(pulse);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View style={[styles.sosBtn, animStyle]}>
      <Pressable onPress={() => router.push('/sos/active')} style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
        <Text style={styles.sosText}>SOS</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <SocialMap />
      <SosButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sosBtn: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.md,
    backgroundColor: colors.danger,
    borderRadius: 20,
    shadowColor: '#FF4757',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  sosText: { color: colors.text, fontWeight: '700', fontSize: 16 },
});