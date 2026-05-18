import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { useHaptics } from '@/hooks/useHaptics';
import { colors, spacing, typography } from '@/theme/tokens';

export default function RegisterScreen() {
  const toast = useToast();
  const haptics = useHaptics();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const register = async () => {
    if (!username.trim() || !email.trim() || !password) { toast.error('Tous les champs sont requis'); return; }
    if (password.length < 6) { toast.error('6 caractères minimum'); return; }
    setLoading(true);
    haptics.medium();
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: username.trim() } },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    haptics.success();
    toast.success('Compte créé !');
    router.push('/(auth)/onboarding');
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown} style={styles.content}>
        <Text style={styles.brand}>Rejoindre PACE</Text>
        <Text style={styles.subtitle}>Crée ton profil runner</Text>

        <TextInput style={styles.input} placeholder="Pseudo" placeholderTextColor={colors.textSecondary} value={username} onChangeText={setUsername} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.textSecondary} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Mot de passe (6+)" placeholderTextColor={colors.textSecondary} value={password} onChangeText={setPassword} secureTextEntry />

        <Button title="S'inscrire" onPress={register} loading={loading} haptic="medium" />

        <Pressable onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.link}>Déjà un compte ? Connexion</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center' },
  content: { padding: spacing.xl, gap: spacing.md },
  brand: { ...typography.title, color: colors.primary, textAlign: 'center', fontSize: 32, marginBottom: spacing.xs },
  subtitle: { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
  input: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, color: colors.text, borderWidth: 1, borderColor: colors.border },
  link: { color: colors.primary, textAlign: 'center', marginTop: spacing.md },
});