import { View, Text, StyleSheet } from 'react-native';
import { Button } from './Button';
import { colors, spacing, typography } from '@/theme/tokens';

interface ErrorViewProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorView({ title = 'Oups !', message, onRetry }: ErrorViewProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Button
          title="Réessayer"
          onPress={onRetry}
          variant="secondary"
          size="sm"
          haptic="medium"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  icon: { fontSize: 40, marginBottom: spacing.md },
  title: { ...typography.heading, color: colors.text, marginBottom: spacing.sm },
  message: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
});
