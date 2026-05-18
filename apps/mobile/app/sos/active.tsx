import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';
import * as Location from 'expo-location';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, cancelAnimation, Easing } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/BottomSheet';
import { useToast } from '@/hooks/useToast';
import { useHaptics } from '@/hooks/useHaptics';
import { colors, spacing, typography } from '@/theme/tokens';
import { DEFAULT_SOS_CREDITS, SOS_COOLDOWN_MINUTES, SOS_DAILY_LIMIT } from '@pace/shared';
import { sendTip } from '@/features/monetization/premium';

interface SosHistory { id: string; difficulty: string; status: string; created_at: string }

export default function SosScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const haptics = useHaptics();
  const [credits, setCredits] = useState(DEFAULT_SOS_CREDITS);
  const [dailyCount, setDailyCount] = useState(0);
  const [lastUsed, setLastUsed] = useState<string | null>(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [openRequests, setOpenRequests] = useState<{ id: string; difficulty: string; distance_remaining_m: number | null; requester_id: string }[]>([]);
  const [history, setHistory] = useState<SosHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [ratingSheet, setRatingSheet] = useState<{ sosId: string; pacerId: string } | null>(null);
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [tipSheet, setTipSheet] = useState<{ sosId: string; pacerId: string } | null>(null);
  const [tipAmount, setTipAmount] = useState(500);

  const pulseOpacity = useSharedValue(0.4);

  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(pulseOpacity);
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }));

  const load = useCallback(async () => {
    if (!user) return;
    const { data: c } = await supabase.from('sos_credits').select('*').eq('user_id', user.id).single();
    if (c) {
      setCredits(c.credits_remaining); setDailyCount(c.daily_count); setLastUsed(c.last_used_at);
      if (c.last_used_at) {
        const elapsed = (Date.now() - new Date(c.last_used_at).getTime()) / 60000;
        setCooldownLeft(Math.max(0, SOS_COOLDOWN_MINUTES - Math.round(elapsed)));
      }
    }
    const { data: reqs } = await supabase.from('sos_requests').select('id, difficulty, distance_remaining_m, requester_id').eq('status', 'open').neq('requester_id', user.id).limit(10);
    setOpenRequests(reqs ?? []);
    const { data: hist } = await supabase.from('sos_requests').select('id, difficulty, status, created_at').or(`requester_id.eq.${user.id},pacer_id.eq.${user.id}`).order('created_at', { ascending: false }).limit(20);
    setHistory(hist ?? []);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (cooldownLeft <= 0) return; const interval = setInterval(() => { setCooldownLeft((prev) => Math.max(0, prev - 1)); }, 60000); return () => clearInterval(interval); }, [cooldownLeft]);

  const activateSos = async () => {
    if (!user) return;
    if (credits <= 0) { toast.error('Crédits épuisés, passe Premium'); return; }
    if (dailyCount >= SOS_DAILY_LIMIT) { toast.error(`Max ${SOS_DAILY_LIMIT} SOS/jour`); return; }
    if (cooldownLeft > 0) { toast.info(`Encore ${cooldownLeft} min de cooldown`); return; }
    setLoading(true);
    haptics.heavy();
    const loc = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = loc.coords;
    const { data: sosId, error } = await supabase.rpc('create_sos_request', { p_lat: latitude, p_lng: longitude, p_difficulty: 'moderate', p_distance_remaining_m: 2000 });
    if (error) { toast.error(error.message); setLoading(false); return; }
    await supabase.functions.invoke('notify_sos_nearby', { body: { sos_id: sosId, lat: latitude, lng: longitude } });
    setLoading(false); load();
    toast.success('SOS envoyé — des pacers arrivent !');
  };

  const acceptSos = async (sosId: string, requesterId: string) => {
    if (!user) return;
    const { data: existing } = await supabase.from('sos_requests').select('status').eq('id', sosId).single();
    if (existing?.status !== 'open') { toast.error('Mission déjà prise'); load(); return; }
    haptics.medium();
    const { data: sos } = await supabase.from('sos_requests').update({ pacer_id: user.id, status: 'matched' }).eq('id', sosId).eq('status', 'open').select().single();
    if (sos) {
      await supabase.rpc('increment_rescues', { p_user_id: user.id });
      await supabase.functions.invoke('award_badges', { body: { user_id: user.id, event: 'sos_completed' } });
      toast.success('Mission acceptée !');
      router.push(`/chat/sos-${sosId}`);
    }
  };

  const submitRating = async () => {
    if (!ratingSheet || !user) return;
    await supabase.from('sos_ratings').insert({ sos_request_id: ratingSheet.sosId, rater_id: user.id, rated_id: ratingSheet.pacerId, rating, comment: ratingComment || null });
    haptics.success(); toast.success('Note enregistrée !');
    setRatingSheet(null); setRatingComment(''); setRating(5);
  };

  const submitTip = async () => {
    if (!tipSheet || !user) return;
    await sendTip(user.id, tipSheet.pacerId, tipAmount, tipSheet.sosId);
    haptics.success(); toast.success(`Tip de ${(tipAmount / 100).toFixed(2)} € envoyé !`);
    setTipSheet(null);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>SOS Pacer</Text>

      <Card>
        <View style={styles.creditsRow}>
          <Text style={styles.credits}>Crédits : {credits}</Text>
          <Text style={styles.meta}>Aujourd'hui : {dailyCount}/{SOS_DAILY_LIMIT}</Text>
        </View>
        {cooldownLeft > 0 && <Text style={styles.cooldown}>⏳ Cooldown : {cooldownLeft} min</Text>}
        <Animated.View style={pulseStyle}>
          <Button title="SOS — besoin d'un pacer" onPress={activateSos} loading={loading} variant="danger" disabled={cooldownLeft > 0} haptic="heavy" />
        </Animated.View>
      </Card>

      <Text style={styles.section}>Missions proches ({openRequests.length})</Text>
      {openRequests.map((r) => (
        <Animated.View key={r.id} entering={FadeInDown}>
          <Card style={styles.request}>
            <Text style={styles.reqTitle}>Difficulté : {r.difficulty}</Text>
            {r.distance_remaining_m != null && <Text style={styles.reqMeta}>{(r.distance_remaining_m / 1000).toFixed(1)} km restants</Text>}
            <Button title="Accepter la mission" onPress={() => acceptSos(r.id, r.requester_id)} haptic="medium" />
          </Card>
        </Animated.View>
      ))}

      <Pressable style={styles.toggleBtn} onPress={() => setShowHistory(!showHistory)}>
        <Text style={styles.toggleBtnText}>{showHistory ? 'Masquer' : 'Voir'} historique ({history.length})</Text>
      </Pressable>

      {showHistory && history.map((h) => (
        <Card key={h.id} style={styles.request}>
          <Text style={styles.reqTitle}>{h.difficulty} — {h.status}</Text>
          <Text style={styles.reqMeta}>{new Date(h.created_at).toLocaleDateString('fr-FR')}</Text>
          {h.status === 'completed' && (
            <View style={styles.row}>
              <Pressable style={styles.smallBtn} onPress={() => setRatingSheet({ sosId: h.id, pacerId: user?.id ?? '' })}>
                <Text style={styles.smallBtnText}>Noter</Text>
              </Pressable>
              <Pressable style={styles.smallBtn} onPress={() => setTipSheet({ sosId: h.id, pacerId: user?.id ?? '' })}>
                <Text style={styles.smallBtnText}>Tip</Text>
              </Pressable>
            </View>
          )}
        </Card>
      ))}

      <Sheet visible={!!ratingSheet} onClose={() => setRatingSheet(null)} title="Noter le pacer" snapPoints={['40%']}>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => { setRating(n); haptics.light(); }}>
              <Text style={[styles.star, rating >= n && { color: colors.warning }]}>★</Text>
            </Pressable>
          ))}
        </View>
        <TextInput style={styles.input} placeholder="Commentaire (optionnel)" placeholderTextColor={colors.textSecondary} value={ratingComment} onChangeText={setRatingComment} />
        <Button title="Envoyer la note" onPress={submitRating} haptic="medium" />
      </Sheet>

      <Sheet visible={!!tipSheet} onClose={() => setTipSheet(null)} title="Envoyer un tip" snapPoints={['40%']}>
        <View style={styles.tipRow}>
          {[200, 500, 1000, 2000].map((amount) => (
            <Pressable key={amount} style={[styles.tipOption, tipAmount === amount && { backgroundColor: colors.primaryMuted }]} onPress={() => setTipAmount(amount)}>
              <Text style={[styles.tipText, tipAmount === amount && { color: colors.primary }]}>{(amount / 100).toFixed(2)} €</Text>
            </Pressable>
          ))}
        </View>
        <Button title={`Envoyer ${(tipAmount / 100).toFixed(2)} €`} onPress={submitTip} haptic="medium" />
      </Sheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  title: { ...typography.title, color: colors.text, marginBottom: spacing.md },
  creditsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  credits: { color: colors.text, fontSize: 18, fontWeight: '600' },
  meta: { color: colors.textSecondary },
  cooldown: { color: colors.warning, fontWeight: '600', marginBottom: spacing.sm },
  section: { color: colors.text, fontSize: 18, fontWeight: '600', marginTop: spacing.lg, marginBottom: spacing.sm },
  request: { marginBottom: spacing.md },
  reqTitle: { color: colors.text, fontWeight: '600' },
  reqMeta: { color: colors.textSecondary, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  toggleBtn: { marginVertical: spacing.md },
  toggleBtnText: { color: colors.primary, fontWeight: '600' },
  smallBtn: { backgroundColor: colors.surfaceElevated, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 8 },
  smallBtnText: { color: colors.text },
  input: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, color: colors.text, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  ratingRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.md },
  star: { fontSize: 40, color: colors.textSecondary },
  tipRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.md },
  tipOption: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  tipText: { color: colors.text, fontWeight: '600' },
});