import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/theme/tokens';

const CITIES = ['Casablanca', 'Rabat', 'Marrakech', 'Tanger', 'Fès'];
const LEVELS = ['Débutant', 'Intermédiaire', 'Avancé', 'Élite'];

export default function OnboardingScreen() {
  const { user } = useAuth();
  const [city, setCity] = useState('Casablanca');
  const [runnerLevel, setRunnerLevel] = useState('Intermédiaire');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);

  const complete = async () => {
    if (!user) return;
    setLoading(true);
    await Location.requestForegroundPermissionsAsync();
    await Notifications.requestPermissionsAsync();
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await supabase
      .from('profiles')
      .update({
        city,
        runner_level: runnerLevel,
        bio,
        push_token: token,
        onboarding_completed: true,
      })
      .eq('id', user.id);
    setLoading(false);
    router.replace('/(tabs)/map');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Bienvenue sur PACE</Text>
      <Text style={styles.sub}>Configure ton profil runner</Text>
      <Text style={styles.label}>Ville</Text>
      <View style={styles.chips}>
        {CITIES.map((c) => (
          <Text
            key={c}
            onPress={() => setCity(c)}
            style={[styles.chip, city === c && styles.chipActive]}
          >
            {c}
          </Text>
        ))}
      </View>
      <Text style={styles.label}>Niveau</Text>
      <View style={styles.chips}>
        {LEVELS.map((l) => (
          <Text
            key={l}
            onPress={() => setRunnerLevel(l)}
            style={[styles.chip, runnerLevel === l && styles.chipActive]}
          >
            {l}
          </Text>
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder="Bio (optionnel)"
        placeholderTextColor={colors.textSecondary}
        value={bio}
        onChangeText={setBio}
        multiline
      />
      <Button title="Commencer" onPress={complete} loading={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { color: colors.text, fontSize: 28, fontWeight: '700' },
  sub: { color: colors.textSecondary, marginBottom: spacing.lg },
  label: { color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    overflow: 'hidden',
  },
  chipActive: { backgroundColor: colors.primary, color: colors.text },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    color: colors.text,
    marginTop: spacing.lg,
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
