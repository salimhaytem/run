import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useRunTracker } from '@/features/run/useRunTracker';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatBlock } from '@/components/ui/StatBlock';
import { formatDuration, formatKm, formatPace, paceSecPerKm } from '@/lib/geo';
import { supabase } from '@/lib/supabase';
import { sendRunInvitation } from '@/features/discovery/sendInvitation';
import { colors, spacing, typography } from '@/theme/tokens';

const INVITE_MESSAGES = ['Run ensemble ?', '5 km tranquille ?', 'Session rapide ?'];

export default function RunScreen() {
  const { user, profile } = useAuth();
  const visibility = profile?.visibility_default ?? 'public';
  const { isActive, isPaused, distanceM, durationSec, beginRun, pauseRun, resumeRun, endRun } =
    useRunTracker(user?.id, visibility);
  const [invites, setInvites] = useState<
    { id: string; message: string; from_user_id: string; profiles?: { username: string } }[]
  >([]);

  const loadInvites = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('run_invitations')
      .select('id, message, from_user_id')
      .eq('to_user_id', user.id)
      .eq('status', 'pending');
    const rows = data ?? [];
    const withNames = await Promise.all(
      rows.map(async (inv) => {
        const { data: p } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', inv.from_user_id)
          .single();
        return { ...inv, profiles: p };
      }),
    );
    setInvites(withNames as typeof invites);
  };

  useEffect(() => {
    loadInvites();
    const sub = supabase
      .channel('invites')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'run_invitations' }, loadInvites)
      .subscribe();
    return () => {
      supabase.removeChannel(sub);
    };
  }, [user?.id]);

  const handleStart = async () => {
    try {
      await beginRun();
    } catch (e) {
      Alert.alert('Erreur', (e as Error).message);
    }
  };

  const handleStop = async () => {
    try {
      const run = await endRun();
      if (run?.id) router.push(`/run/${run.id}/recap`);
    } catch (e) {
      Alert.alert('Erreur', (e as Error).message);
    }
  };

  const acceptInvite = async (inv: (typeof invites)[0]) => {
    const { data: session } = await supabase
      .from('shared_sessions')
      .insert({ created_by: inv.from_user_id })
      .select('id')
      .single();
    if (!session) return;
    await supabase.from('shared_session_participants').insert([
      { session_id: session.id, user_id: inv.from_user_id },
      { session_id: session.id, user_id: user!.id },
    ]);
    await supabase
      .from('run_invitations')
      .update({ status: 'accepted', shared_session_id: session.id })
      .eq('id', inv.id);
    router.push(`/chat/${session.id}`);
  };

  const pace = paceSecPerKm(distanceM, durationSec);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Run</Text>
      <Card>
        <View style={styles.stats}>
          <StatBlock label="Distance" value={`${formatKm(distanceM)} km`} />
          <StatBlock label="Temps" value={formatDuration(durationSec)} />
          <StatBlock label="Allure" value={formatPace(pace)} />
        </View>
        {!isActive ? (
          <Button title="Démarrer" onPress={handleStart} />
        ) : (
          <View style={styles.actions}>
            {isPaused ? (
              <Button title="Reprendre" onPress={resumeRun} variant="secondary" />
            ) : (
              <Button title="Pause" onPress={pauseRun} variant="secondary" />
            )}
            <Button title="Terminer" onPress={handleStop} variant="danger" />
          </View>
        )}
      </Card>

      {invites.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invitations</Text>
          {invites.map((inv) => (
            <Card key={inv.id} style={{ marginBottom: spacing.sm }}>
              <Text style={styles.inviteMsg}>{inv.message}</Text>
              <Text style={styles.inviteFrom}>@{inv.profiles?.username ?? 'runner'}</Text>
              <Button title="Accepter" onPress={() => acceptInvite(inv)} />
            </Card>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Proposer une session</Text>
        {INVITE_MESSAGES.map((msg) => (
          <Pressable
            key={msg}
            style={styles.quickMsg}
            onPress={async () => {
              if (!user) return;
              const { data: nearby } = await supabase.rpc('nearby_runners', {
                lat: 33.5731,
                lng: -7.5898,
                radius_m: 5000,
              });
              const target = nearby?.[0]?.user_id;
              if (target) {
                await sendRunInvitation(user.id, target, msg);
                Alert.alert('Invitation envoyée', msg);
              }
            }}
          >
            <Text style={styles.quickMsgText}>{msg}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  title: { ...typography.title, color: colors.text, marginBottom: spacing.md },
  stats: { flexDirection: 'row', marginBottom: spacing.lg },
  actions: { gap: spacing.sm },
  section: { marginTop: spacing.lg },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: spacing.sm },
  inviteMsg: { color: colors.text, fontSize: 16 },
  inviteFrom: { color: colors.textSecondary, marginBottom: spacing.sm },
  quickMsg: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  quickMsgText: { color: colors.textSecondary },
});
