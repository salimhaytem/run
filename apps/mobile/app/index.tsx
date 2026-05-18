import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/theme/tokens';

export default function Index() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/welcome" />;
  if (!profile?.onboarding_completed) return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href="/(tabs)/map" />;
}
