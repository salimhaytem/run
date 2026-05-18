import '@/lib/i18n';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Toast } from '@/components/ui/Toast';
import { colors } from '@/theme/tokens';

const GHView = GestureHandlerRootView as unknown as React.ComponentType<{ children: React.ReactNode; style?: any }>;

export default function RootLayout() {
  return (
    <GHView style={styles.root}>
      <View style={styles.root}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="run/[id]/recap" options={{ title: 'Run Recap', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="sos/active" options={{ title: 'SOS Pacer', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="partner/index" options={{ title: 'Espace Partenaire' }} />
          <Stack.Screen name="chat/[id]" options={{ title: 'Chat' }} />
        </Stack>
        <Toast />
      </View>
    </GHView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});