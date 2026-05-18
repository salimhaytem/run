import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography } from '@/theme/tokens';
import { DEFAULT_SOS_CREDITS, SOS_COOLDOWN_MINUTES, SOS_DAILY_LIMIT } from '@pace/shared';

export default function SosScreen() {
  const { user } = useAuth();
  const [credits, setCredits] = useState(DEFAULT_SOS_CREDITS);
  const [dailyCount, setDailyCount] = useState(0);
  const [openRequests, setOpenRequests] = useState<
    { id: string; difficulty: string; distance_remaining_m: number | null }[]
  >([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data: c } = await supabase.from('sos_credits').select('*').eq('user_id', user.id).single();
    if (c) {
      setCredits(c.credits_remaining);
      setDailyCount(c.daily_count);
    }
    const { data: reqs } = await supabase
      .from('sos_requests')
      .select('id, difficulty, distance_remaining_m')
      .eq('status', 'open')
      .neq('requester_id', user.id)
      .limit(10);
    setOpenRequests(reqs ?? []);
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const activateSos = async () => {
    if (!user) return;
    if (credits <= 0) {
      Alert.alert('Crédits épuisés', 'Passe Premium pour plus de crédits SOS.');
      return;
    }
    if (dailyCount >= SOS_DAILY_LIMIT) {
      Alert.alert('Limite atteinte', `Maximum ${SOS_DAILY_LIMIT} SOS par jour.`);
      return;
    }
    setLoading(true);
    const loc = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = loc.coords;

    const { data: sosId, error } = await supabase.rpc('create_sos_request', {
      p_lat: latitude,
      p_lng: longitude,
      p_difficulty: 'moderate',
      p_distance_remaining_m: 2000,
    });

    if (error) {
      Alert.alert('Erreur', error.message);
      setLoading(false);
      return;
    }

    await supabase.functions.invoke('notify_sos_nearby', {
      body: { sos_id: sosId, lat: latitude, lng: longitude },
    });

    setLoading(false);
    Alert.alert('SOS envoyé', `Les pacers proches sont notifiés. Cooldown ${SOS_COOLDOWN_MINUTES} min.`);
  };

  const acceptSos = async (sosId: string) => {
    if (!user) return;
    const { data: sos } = await supabase
      .from('sos_requests')
      .update({ pacer_id: user.id, status: 'matched' })
      .eq('id', sosId)
      .select()
      .single();

    if (sos) {
      await supabase.rpc('increment_rescues', { p_user_id: user.id });
      await supabase.functions.invoke('award_badges', {
        body: { user_id: user.id, event: 'sos_completed' },
      });
      router.push(`/chat/sos-${sosId}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SOS Pacer</Text>
      <Card>
        <Text style={styles.credits}>Crédits : {credits}</Text>
        <Text style={styles.meta}>Utilisations aujourd'hui : {dailyCount}/{SOS_DAILY_LIMIT}</Text>
        <Button title="SOS — besoin d'un pacer" onPress={activateSos} loading={loading} variant="danger" />
      </Card>

      <Text style={styles.section}>Missions proches</Text>
      {openRequests.map((r) => (
        <Card key={r.id} style={styles.request}>
          <Text style={styles.reqTitle}>Difficulté : {r.difficulty}</Text>
          {r.distance_remaining_m != null && (
            <Text style={styles.reqMeta}>{(r.distance_remaining_m / 1000).toFixed(1)} km restants</Text>
          )}
          <Button title="Accepter la mission" onPress={() => acceptSos(r.id)} />
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  title: { ...typography.title, color: colors.text, marginBottom: spacing.md },
  credits: { color: colors.text, fontSize: 18, fontWeight: '600' },
  meta: { color: colors.textSecondary, marginBottom: spacing.md },
  section: { color: colors.text, fontSize: 18, fontWeight: '600', marginTop: spacing.lg, marginBottom: spacing.sm },
  request: { marginBottom: spacing.md },
  reqTitle: { color: colors.text, fontWeight: '600' },
  reqMeta: { color: colors.textSecondary, marginBottom: spacing.sm },
});
