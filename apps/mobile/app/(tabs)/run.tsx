import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import * as Location from 'expo-location';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useRunTracker } from '@/features/run/useRunTracker';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { StatBlock } from '@/components/ui/StatBlock';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useToast } from '@/hooks/useToast';
import { useHaptics } from '@/hooks/useHaptics';
import { formatDuration, formatKm, formatPace, paceSecPerKm } from '@/lib/geo';
import { supabase } from '@/lib/supabase';
import { sendRunInvitation } from '@/features/discovery/sendInvitation';
import { colors, spacing, typography } from '@/theme/tokens';

const INVITE_MESSAGES = ['Run ensemble ?', '5 km tranquille ?', 'Session rapide ?'];

interface NearbyRunner { user_id: string; username: string; avatar_url: string | null; distance_m: number }

export default function RunScreen() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const haptics = useHaptics();
  const visibility = profile?.visibility_default ?? 'public';
  const { isActive, isPaused, distanceM, durationSec, beginRun, pauseRun, resumeRun, endRun } = useRunTracker(user?.id, visibility);
  const [invites, setInvites] = useState<{ id: string; message: string; from_user_id: string; profiles?: { username: string } }[]>([]);
  const [nearbyRunners, setNearbyRunners] = useState<NearbyRunner[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
      setLoading(false);
    })();
  }, []);

  const loadNearby = useCallback(async () => {
    if (!userLocation) return;
    const { data } = await supabase.rpc('nearby_runners', { lat: userLocation.lat, lng: userLocation.lng, radius_m: 5000 });
    setNearbyRunners((data as NearbyRunner[]) ?? []);
  }, [userLocation]);

  useEffect(() => { loadNearby(); const interval = setInterval(loadNearby, 30000); return () => clearInterval(interval); }, [loadNearby]);

  const loadInvites = async () => {
    if (!user) return;
    const { data } = await supabase.from('run_invitations').select('id, message, from_user_id').eq('to_user_id', user.id).eq('status', 'pending');
    const rows = data ?? [];
    const withNames = await Promise.all(rows.map(async (inv: any) => {
      const { data: p } = await supabase.from('profiles').select('username').eq('id', inv.from_user_id).single();
      return { ...inv, profiles: p };
    }));
    setInvites(withNames as typeof invites);
  };

  useEffect(() => {
    loadInvites();
    const sub = supabase.channel('invites').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'run_invitations' }, loadInvites).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [user?.id]);

  const handleStart = async () => {
    haptics.medium();
    try { await beginRun(); } catch (e) { toast.error((e as Error).message); }
  };

  const handleStop = async () => {
    haptics.heavy();
    try { const run = await endRun(); if (run?.id) router.push(`/run/${run.id}/recap`); } catch (e) { toast.error((e as Error).message); }
  };

  const acceptInvite = async (inv: any) => {
    haptics.medium();
    const { data: session } = await supabase.from('shared_sessions').insert({ created_by: inv.from_user_id }).select('id').single();
    if (!session) return;
    await supabase.from('shared_session_participants').insert([{ session_id: session.id, user_id: inv.from_user_id }, { session_id: session.id, user_id: user!.id }]);
    await supabase.from('run_invitations').update({ status: 'accepted', shared_session_id: session.id }).eq('id', inv.id);
    router.push(`/chat/${session.id}`);
  };

  const inviteRunner = async (targetId: string, msg: string) => {
    if (!user) return;
    haptics.light();
    await sendRunInvitation(user.id, targetId, msg);
    toast.success('Invitation envoyée');
  };

  const pace = paceSecPerKm(distanceM, durationSec);

  if (loading) return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SkeletonCard /><View style={{ marginTop: spacing.md }}><SkeletonCard /></View>
    </ScrollView>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Run</Text>
      <Animated.View entering={FadeInDown}>
        <Card>
          <View style={styles.stats}>
            <StatBlock label="Distance" value={`${formatKm(distanceM)} km`} />
            <StatBlock label="Temps" value={formatDuration(durationSec)} />
            <StatBlock label="Allure" value={formatPace(pace)} />
          </View>
          {!isActive ? (
            <Button title="Démarrer" onPress={handleStart} haptic="medium" />
          ) : (
            <View style={styles.actions}>
              {isPaused ? <Button title="Reprendre" onPress={resumeRun} variant="secondary" haptic="light" /> : <Button title="Pause" onPress={pauseRun} variant="secondary" haptic="light" />}
              <Button title="Terminer" onPress={handleStop} variant="danger" haptic="heavy" />
            </View>
          )}
        </Card>
      </Animated.View>

      {invites.length > 0 && (
        <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
          <Text style={styles.sectionTitle}>Invitations</Text>
          {invites.map((inv) => (
            <Card key={inv.id} style={{ marginBottom: spacing.sm }}>
              <Text style={styles.inviteMsg}>{inv.message}</Text>
              <Text style={styles.inviteFrom}>@{inv.profiles?.username ?? 'runner'}</Text>
              <Button title="Accepter" onPress={() => acceptInvite(inv)} haptic="medium" />
            </Card>
          ))}
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
        <Text style={styles.sectionTitle}>Runners proches</Text>
        {nearbyRunners.length === 0 ? (
          <Text style={styles.emptyText}>Aucun runner à proximité</Text>
        ) : (
          nearbyRunners.map((r) => (
            <Card key={r.user_id} style={{ marginBottom: spacing.sm }}>
              <View style={styles.nearbyRow}>
                <Avatar url={r.avatar_url} name={r.username} size={40} online />
                <View style={{ flex: 1 }}>
                  <Text style={styles.nearbyName}>@{r.username}</Text>
                  <Text style={styles.nearbyDist}>{(r.distance_m / 1000).toFixed(1)} km</Text>
                </View>
                <View style={{ gap: spacing.xs }}>
                  {INVITE_MESSAGES.map((msg) => (
                    <Pressable key={msg} style={styles.inviteBtn} onPress={() => inviteRunner(r.user_id, msg)}>
                      <Text style={styles.inviteBtnText}>{msg}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </Card>
          ))
        )}
      </Animated.View>
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
  emptyText: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md },
  nearbyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nearbyName: { color: colors.text, fontWeight: '600' },
  nearbyDist: { color: colors.textSecondary, fontSize: 12 },
  inviteBtn: { backgroundColor: colors.primaryMuted, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 8 },
  inviteBtnText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
});