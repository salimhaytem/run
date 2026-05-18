import { View, TextInput, Text, StyleSheet, ViewStyle, TextInputProps } from 'react-native';
import { colors, spacing, radius, typography } from '@/theme/tokens';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  icon?: string;
}

export function Input({ label, error, containerStyle, icon, style, ...props }: InputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, !!error && styles.inputError]}>
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textTertiary}
          {...props}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', marginBottom: spacing.md },
  label: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.xs, marginLeft: spacing.xs },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    height: '100%',
  },
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 12, marginTop: spacing.xs, marginLeft: spacing.xs },
  icon: { marginRight: spacing.sm, fontSize: 18 },
});
