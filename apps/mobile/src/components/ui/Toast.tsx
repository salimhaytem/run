import Toast from 'react-native-toast-message';
import { colors, radius, spacing } from '@/theme/tokens';

export const toastConfig = {
  success: (internal: any) => (
    <BaseToast
      {...internal}
      backgroundColor={colors.accent}
      icon="✓"
    />
  ),
  error: (internal: any) => (
    <BaseToast
      {...internal}
      backgroundColor={colors.danger}
      icon="✕"
    />
  ),
  info: (internal: any) => (
    <BaseToast
      {...internal}
      backgroundColor={colors.primary}
      icon="i"
    />
  ),
};

function BaseToast({ text1, backgroundColor, icon }: { text1: string; backgroundColor: string; icon: string }) {
  const { View, Text } = require('react-native');
  return (
    <View
      style={{
        backgroundColor,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radius.lg,
        marginHorizontal: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', width: 24, textAlign: 'center' }}>{icon}</Text>
      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', flex: 1 }}>{text1}</Text>
    </View>
  );
}

export function showToast(type: 'success' | 'error' | 'info', message: string) {
  Toast.show({ type, text1: message, visibilityTime: 2500 });
}

export { Toast };