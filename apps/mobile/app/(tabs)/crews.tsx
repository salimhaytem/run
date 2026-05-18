import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, Alert, Pressable } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Sheet } from '@/components/ui/BottomSheet';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/hooks/useToast';
import { useHaptics } from '@/hooks/useHaptics';
import { colors, spacing, typography } from '@/theme/tokens';

interface CrewMember { user_id: string; role: string; profiles?: { username: string; avatar_url: string | null } }
interface CrewEvent { id: string; title: string; starts_at: string; description: string | null }
interface CrewGoal { id: string; goal_type: string; target_value: number; current_value: number }
interface CrewDetail { id: string; name: string; description: string | null; city: string | null; crew_type: string; level: number; xp: number; collective_streak: number; owner_id: string; members: CrewMember[]; events: CrewEvent[]; goals: CrewGoal[] }
interface Crew { id: string; name: string; city: string | null; level: number; xp: number; collective_streak: number; crew_type: string; owner_id: string }

export default function CrewsScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const haptics = useHaptics();
  const [crews, setCrews] = useState<Crew[]>([]);
  const [myCrewIds, setMyCrewIds] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [detailCrew, setDetailCrew] = useState<CrewDetail | null>(null);
  const [name, setName] = useState('');
  const [city, setCity] = useState('Casablanca');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from('crews').select('id, name, city, level, xp, collective_streak, crew_type, owner_id').order('xp', { ascending: false });
    setCrews((data as Crew[]) ?? []);
    if (user) {
      const { data: membership } = await supabase.from('crew_members').select('crew_id').eq('user_id', user.id);
      setMyCrewIds((membership ?? []).map((m: any) => m.crew_id));
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const createCrew = async () => {
    if (!user || !name.trim()) return;
    haptics.medium();
    const { data: crew } = await supabase.from('crews').insert({ name, city, description: desc, owner_id: user.id, crew_type: 'public' }).select('id').single();
    if (crew) await supabase.from('crew_members').insert({ crew_id: crew.id, user_id: user.id, role: 'owner' });
    setShowCreate(false); setName(''); setDesc(''); load();
    toast.success(`Crew "${name}" créé !`);
  };

  const toggleJoin = async (crewId: string, joined: boolean) => {
    if (!user) return;
    haptics.light();
    if (joined) { await supabase.from('crew_members').delete().eq('crew_id', crewId).eq('user_id', user.id); toast.info('Crew quitté'); }
    else { await supabase.from('crew_members').insert({ crew_id: crewId, user_id: user.id, role: 'member' }); toast.success('Crew rejoint !'); }
    load();
  };

  const loadDetail = async (crewId: string) => {
    haptics.light();
    const { data: crew } = await supabase.from('crews').select('*').eq('id', crewId).single();
    if (!crew) return;
    const { data: members } = await supabase.from('crew_members').select('user_id, role, profiles(username, avatar_url)').eq('crew_id', crewId);
    const { data: events } = await supabase.from('crew_events').select('*').eq('crew_id', crewId).gte('starts_at', new Date().toISOString()).order('starts_at', { ascending: true }).limit(10);
    const { data: goals } = await supabase.from('crew_goals').select('*').eq('crew_id', crewId).limit(5);
    setDetailCrew({ id: crew.id, name: crew.name, description: crew.description, city: crew.city, crew_type: crew.crew_type, level: crew.level, xp: crew.xp, collective_streak: crew.collective_streak, owner_id: crew.owner_id, members: (members ?? []) as CrewMember[], events: (events ?? []) as CrewEvent[], goals: (goals ?? []) as CrewGoal[] });
  };

  const createEvent = async (crewId: string) => {
    const starts = new Date(); starts.setDate(starts.getDate() + 1); starts.setHours(7, 0, 0, 0);
    await supabase.from('crew_events').insert({ crew_id: crewId, title: 'Morning Run', description: 'Départ collectif', starts_at: starts.toISOString(), created_by: user!.id });
    toast.success('Événement Morning Run créé');
    if (detailCrew) loadDetail(detailCrew.id);
  };

  if (loading) return (
    <View style={styles.container}>
      <View style={styles.header}><Skeleton width={120} height={28} /><Skeleton width={80} height={40} /></View>
      <View style={{ padding: spacing.md, gap: spacing.md }}><SkeletonCard /><SkeletonCard /></View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Crews</Text>
        <Button title="+ Créer" onPress={() => setShowCreate(true)} haptic="light" />
      </View>
      <FlatList
        data={crews}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          const joined = myCrewIds.includes(item.id);
          return (
            <Animated.View entering={FadeInDown.delay(index * 50)}>
              <Card style={styles.crewCard}>
                <View style={styles.crewHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.crewName}>{item.name}</Text>
                    <Text style={styles.crewMeta}>{item.city ?? '—'} · Niv. {item.level} · {item.xp} XP · Streak {item.collective_streak}</Text>
                  </View>
                  <Button title={joined ? 'Quitter' : 'Rejoindre'} variant={joined ? 'secondary' : 'primary'} size="sm" onPress={() => toggleJoin(item.id, joined)} haptic="light" />
                </View>
                <View style={styles.crewActions}>
                  <Pressable onPress={() => loadDetail(item.id)}><Text style={styles.link}>Détail →</Text></Pressable>
                  <Pressable onPress={() => router.push(`/chat/crew-${item.id}`)}><Text style={styles.link}>Chat crew →</Text></Pressable>
                </View>
              </Card>
            </Animated.View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            title="Aucun crew"
            description="Rejoins ou crée ton premier crew pour courir en groupe."
            icon="👥"
            actionTitle="Créer un crew"
            onAction={() => setShowCreate(true)}
          />
        }
      />

      <Sheet visible={showCreate} onClose={() => setShowCreate(false)} title="Nouveau crew" snapPoints={['45%']}>
        <TextInput style={styles.input} placeholder="Nom du crew" placeholderTextColor={colors.textSecondary} value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Ville" placeholderTextColor={colors.textSecondary} value={city} onChangeText={setCity} />
        <TextInput style={styles.input} placeholder="Description" placeholderTextColor={colors.textSecondary} value={desc} onChangeText={setDesc} multiline />
        <Button title="Créer" onPress={createCrew} haptic="medium" />
      </Sheet>

      <Sheet visible={!!detailCrew} onClose={() => setDetailCrew(null)} title={detailCrew?.name} snapPoints={['70%']} scrollable>
        {detailCrew && (
          <>
            <Text style={styles.crewMeta}>{detailCrew.city} · {detailCrew.crew_type} · Niv.{detailCrew.level} · {detailCrew.xp}XP</Text>
            {detailCrew.description && <Text style={styles.desc}>{detailCrew.description}</Text>}
            <Text style={styles.subsection}>Membres ({detailCrew.members.length})</Text>
            {detailCrew.members.map((m) => (
              <View key={m.user_id} style={styles.memberRow}>
                <Avatar url={m.profiles?.avatar_url} name={m.profiles?.username} size={32} />
                <Text style={styles.memberName}>@{m.profiles?.username} {m.role === 'owner' ? '👑' : m.role === 'admin' ? '⭐' : ''}</Text>
              </View>
            ))}
            {detailCrew.events.length > 0 && <><Text style={styles.subsection}>Événements</Text>{detailCrew.events.map((e) => (<Card key={e.id} style={{ marginBottom: spacing.sm }}><Text style={{ color: colors.text, fontWeight: '600' }}>{e.title}</Text><Text style={{ color: colors.textSecondary, fontSize: 12 }}>{new Date(e.starts_at).toLocaleDateString('fr-FR')}</Text></Card>))}</>}
            {detailCrew.goals.length > 0 && <><Text style={styles.subsection}>Objectifs</Text>{detailCrew.goals.map((g) => (<View key={g.id} style={styles.goalRow}><Text style={{ color: colors.textSecondary }}>{g.goal_type}</Text><Text style={{ color: colors.text, fontWeight: '600' }}>{g.current_value}/{g.target_value}</Text></View>))}</>}
            {user && detailCrew.owner_id === user.id && <Button title="+ Créer événement" onPress={() => createEvent(detailCrew.id)} variant="secondary" haptic="light" />}
          </>
        )}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  title: { ...typography.title, color: colors.text },
  list: { padding: spacing.md, paddingTop: 0 },
  crewCard: { marginBottom: spacing.md },
  crewHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  crewName: { color: colors.text, fontSize: 18, fontWeight: '600' },
  crewMeta: { color: colors.textSecondary, marginTop: spacing.xs },
  crewActions: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  link: { color: colors.primary, fontWeight: '600' },
  desc: { color: colors.textSecondary, marginVertical: spacing.sm },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl },
  input: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, color: colors.text, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  subsection: { color: colors.text, fontWeight: '600', fontSize: 16, marginTop: spacing.md, marginBottom: spacing.sm },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  memberName: { color: colors.text, fontSize: 14 },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
});