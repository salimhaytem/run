import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import { useHaptics } from '@/hooks/useHaptics';
import { colors, spacing, typography } from '@/theme/tokens';

export default function LoginScreen() {
  const toast = useToast();
  const haptics = useHaptics();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email.trim() || !password) { toast.error('Email et mot de passe requis'); return; }
    setLoading(true);
    haptics.medium();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    haptics.success();
    router.replace('/(tabs)/map');
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown} style={styles.content}>
        <Text style={styles.brand}>PACE</Text>
        <Text style={styles.subtitle}>Social Running Network</Text>

        <Input
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          icon="✉️"
        />
        <Input
          placeholder="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          icon="🔒"
        />

        <Button title="Connexion" onPress={login} loading={loading} haptic="medium" />

        <Pressable onPress={() => router.push('/(auth)/register')}>
          <Text style={styles.link}>Pas de compte ? S'inscrire</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center' },
  content: { padding: spacing.xl, gap: spacing.md },
  brand: { ...typography.title, color: colors.primary, textAlign: 'center', fontSize: 42, marginBottom: spacing.xs },
  subtitle: { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
  link: { color: colors.primary, textAlign: 'center', marginTop: spacing.md, fontWeight: '600' },
});