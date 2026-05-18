import { View, StyleSheet, Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import { SocialMap } from '@/components/map/SocialMap';
import { colors, spacing } from '@/theme/tokens';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <SocialMap />
      <Pressable style={styles.sosBtn} onPress={() => router.push('/sos/active')}>
        <Text style={styles.sosText}>SOS</Text>
      </Pressable>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  sosText: { color: colors.text, fontWeight: '700' },
});
