import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Pressable } from 'react-native';
import { colors } from '@/theme/tokens';

interface AvatarProps {
  url?: string | null;
  name?: string;
  size?: number;
  online?: boolean;
  story?: boolean;
  onPress?: () => void;
}

export function Avatar({ url, name, size = 48, online, story, onPress }: AvatarProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const initial = (name ?? '?')[0].toUpperCase();
  const ringSize = story ? size + 6 : size;

  const content = (
    <Animated.View style={[animatedStyle, { position: 'relative' }]}>
      <View
        style={[
          styles.ring,
          story && styles.storyRing,
          {
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
          },
        ]}
      >
        {url ? (
          <Image
            source={{ uri: url }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
          />
        ) : (
          <View
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors.text, fontSize: size / 2.5, fontWeight: '700' }}>{initial}</Text>
          </View>
        )}
      </View>
      {online && <View style={[styles.onlineDot, { right: 1, bottom: 1, width: size * 0.28, height: size * 0.28, borderRadius: size * 0.14 }]} />}
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={() => {
          scale.value = withSpring(0.9, { damping: 10, stiffness: 200 });
          setTimeout(() => { scale.value = withSpring(1, { damping: 10, stiffness: 200 }); }, 100);
          onPress();
        }}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyRing: {
    borderWidth: 2.5,
    borderColor: '#FF6B35',
    padding: 2,
  },
  onlineDot: {
    position: 'absolute',
    backgroundColor: '#00D9A5',
    borderWidth: 2,
    borderColor: colors.background,
  },
});