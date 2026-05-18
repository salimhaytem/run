import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography } from '@/theme/tokens';

interface Crew {
  id: string;
  name: string;
  city: string | null;
  level: number;
  xp: number;
  collective_streak: number;
  crew_type: string;
}

export default function CrewsScreen() {
  const { user } = useAuth();
  const [crews, setCrews] = useState<Crew[]>([]);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('Casablanca');

  const load = async () => {
    const { data } = await supabase
      .from('crews')
      .select('id, name, city, level, xp, collective_streak, crew_type')
      .order('xp', { ascending: false });
    setCrews((data as Crew[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const createCrew = async () => {
    if (!user || !name.trim()) return;
    const { data: crew } = await supabase
      .from('crews')
      .insert({ name, city, owner_id: user.id, crew_type: 'public' })
      .select('id')
      .single();
    if (crew) {
      await supabase.from('crew_members').insert({ crew_id: crew.id, user_id: user.id, role: 'owner' });
    }
    setModal(false);
    setName('');
    load();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Crews</Text>
        <Button title="+ Créer" onPress={() => setModal(true)} />
      </View>
      <FlatList
        data={crews}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.crewCard}>
            <Text style={styles.crewName}>{item.name}</Text>
            <Text style={styles.crewMeta}>
              {item.city} · Niv. {item.level} · {item.xp} XP · Streak {item.collective_streak}
            </Text>
            <Pressable onPress={() => router.push(`/chat/crew-${item.id}`)}>
              <Text style={styles.link}>Chat crew →</Text>
            </Pressable>
          </Card>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Rejoins ou crée ton premier crew</Text>}
      </View>

      <Modal visible={modal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Nouveau crew</Text>
            <TextInput
              style={styles.input}
              placeholder="Nom du crew"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Ville"
              placeholderTextColor={colors.textSecondary}
              value={city}
              onChangeText={setCity}
            />
            <Button title="Créer" onPress={createCrew} />
            <Button title="Annuler" onPress={() => setModal(false)} variant="ghost" />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  title: { ...typography.title, color: colors.text },
  list: { padding: spacing.md, paddingTop: 0 },
  crewCard: { marginBottom: spacing.md },
  crewName: { color: colors.text, fontSize: 18, fontWeight: '600' },
  crewMeta: { color: colors.textSecondary, marginTop: spacing.xs },
  link: { color: colors.primary, marginTop: spacing.sm },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl },
  modalBg: { flex: 1, backgroundColor: '#0009', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '600', marginBottom: spacing.md },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    color: colors.text,
    marginBottom: spacing.md,
  },
});
