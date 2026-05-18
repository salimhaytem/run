import { Image, View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/tokens';

export function Avatar({ url, name, size = 48 }: { url?: string | null; name?: string; size?: number }) {
  const initial = (name ?? '?')[0].toUpperCase();
  if (url) {
    return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ color: colors.text, fontSize: size / 2.5, fontWeight: '700' }}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
