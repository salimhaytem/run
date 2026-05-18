import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Location from 'expo-location';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { useHaptics } from '@/hooks/useHaptics';
import { colors, spacing, typography } from '@/theme/tokens';

const CITIES = ['Casablanca', 'Rabat', 'Marrakech', 'Tanger', 'Fès'];
const LEVELS = ['Débutant', 'Intermédiaire', 'Avancé', 'Élite'];

export default function OnboardingScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const haptics = useHaptics();
  const [city, setCity] = useState('Casablanca');
  const [level, setLevel] = useState('Débutant');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);

  const complete = async () => {
    if (!user) return;
    setLoading(true);
    haptics.medium();
    await supabase.from('profiles').update({ city, runner_level: level, bio, onboarding_completed: true }).eq('id', user.id);

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      await Location.requestBackgroundPermissionsAsync();
    }

    setLoading(false);
    haptics.success();
    router.replace('/(tabs)/map');
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown} style={styles.content}>
        <Text style={styles.brand}>Bienvenue sur PACE</Text>
        <Text style={styles.subtitle}>Configure ton profil</Text>

        <Text style={styles.label}>Ville</Text>
        <View style={styles.chipRow}>
          {CITIES.map((c) => (
            <Pressable
              key={c}
              style={[styles.chip, city === c && styles.chipActive]}
              onPress={() => setCity(c)}
              accessibilityRole="radio"
              accessibilityState={{ selected: city === c }}
            >
              <Text style={[styles.chipText, city === c && styles.chipTextActive]}>{c}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Niveau</Text>
        <View style={styles.chipRow}>
          {LEVELS.map((l) => (
            <Pressable
              key={l}
              style={[styles.chip, level === l && styles.chipActive]}
              onPress={() => setLevel(l)}
              accessibilityRole="radio"
              accessibilityState={{ selected: level === l }}
            >
              <Text style={[styles.chipText, level === l && styles.chipTextActive]}>{l}</Text>
            </Pressable>
          ))}
        </View>

        <Input
          label="Bio (optionnelle)"
          placeholder="Parle-nous de toi..."
          value={bio}
          onChangeText={setBio}
          multiline
          style={{ minHeight: 80, paddingTop: spacing.sm }}
        />

        <Button title="C'est parti !" onPress={complete} loading={loading} haptic="medium" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center' },
  content: { padding: spacing.xl },
  brand: { ...typography.title, color: colors.primary, textAlign: 'center', fontSize: 32, marginBottom: spacing.xs },
  subtitle: { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
  label: { color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
  chipText: { color: colors.textSecondary },
  chipTextActive: { color: colors.primary, fontWeight: '600' },
});
