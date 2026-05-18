import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '@/theme/tokens';

export function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', flex: 1 },
  value: { color: colors.text, fontSize: 22, fontWeight: '700' },
  label: { color: colors.textSecondary, fontSize: 12, marginTop: spacing.xs },
});
