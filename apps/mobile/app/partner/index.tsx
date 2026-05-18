import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Share } from 'react-native';
import * as Location from 'expo-location';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/BottomSheet';
import { useToast } from '@/hooks/useToast';
import { useHaptics } from '@/hooks/useHaptics';
import { colors, spacing, typography } from '@/theme/tokens';

interface Challenge { id: string; title: string; target_runs: number; reward_description: string | null }
interface Partner { id: string; name: string; city: string; category: string }

export default function PartnerScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const haptics = useHaptics();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('café');
  const [eventTitle, setEventTitle] = useState('Sunrise Run — Départ 7h');
  const [offerTitle, setOfferTitle] = useState('20% après le run');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengeTitle, setChallengeTitle] = useState('10 runs = café offert');
  const [challengeTarget, setChallengeTarget] = useState('10');
  const [challengeReward, setChallengeReward] = useState('Café offert');
  const [showChallenges, setShowChallenges] = useState(false);
  const [qrPartner, setQrPartner] = useState<string | null>(null);

  useEffect(() => { loadPartners(); loadChallenges(); }, []);

  const loadPartners = async () => {
    const { data } = await supabase.from('partners').select('id, name, city, category').limit(20);
    setPartners(data ?? []);
  };

  const loadChallenges = async () => {
    const { data } = await supabase.from('challenges').select('*').limit(20);
    setChallenges((data as Challenge[]) ?? []);
  };

  const registerPartner = async () => {
    if (!user || !name.trim()) return;
    haptics.medium();
    const loc = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = loc.coords;
    await supabase.rpc('create_partner', { p_name: name, p_category: category, p_city: 'Casablanca', p_lat: latitude, p_lng: longitude });
    await supabase.from('profiles').update({ is_partner: true }).eq('id', user.id);
    setName(''); loadPartners();
    toast.success('Commerce créé !');
  };

  const createEvent = async (partnerId: string) => {
    haptics.light();
    const starts = new Date(); starts.setDate(starts.getDate() + 1); starts.setHours(7, 0, 0, 0);
    await supabase.from('partner_events').insert({ partner_id: partnerId, title: eventTitle, description: 'Départ collectif depuis le café', starts_at: starts.toISOString(), is_sponsored: true });
    toast.success('Événement créé !');
  };

  const createOffer = async (partnerId: string) => {
    haptics.light();
    await supabase.from('partner_offers').insert({ partner_id: partnerId, title: offerTitle, description: 'Valable après le run du matin', discount_percent: 20 });
    toast.success('Offre publiée !');
  };

  const createChallenge = async () => {
    haptics.light();
    await supabase.from('challenges').insert({ title: challengeTitle, target_runs: parseInt(challengeTarget, 10), reward_description: challengeReward });
    toast.success('Challenge créé !'); loadChallenges();
  };

  const checkIn = async (partnerId: string, type: 'departure' | 'return') => {
    if (!user) return;
    haptics.medium();
    await supabase.functions.invoke('partner_check_in', { body: { user_id: user.id, partner_id: partnerId, check_in_type: type, qr_code: `PACE-${partnerId}-${type}` } });
    toast.success(type === 'departure' ? 'Départ enregistré' : 'Retour enregistré !');
  };

  const shareQr = async () => {
    if (qrPartner) { await Share.share({ message: qrPartner, title: 'QR Code PACE' }); }
    setQrPartner(null);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Marketplace locale</Text>

      <Card>
        <Text style={styles.section}>Devenir partenaire</Text>
        <TextInput style={styles.input} placeholder="Nom du commerce" placeholderTextColor={colors.textSecondary} value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Catégorie" placeholderTextColor={colors.textSecondary} value={category} onChangeText={setCategory} />
        <Button title="Enregistrer le commerce" onPress={registerPartner} haptic="medium" />
      </Card>

      {partners.map((p, i) => (
        <Animated.View key={p.id} entering={FadeInDown.delay(i * 50)}>
          <Card style={styles.partnerCard}>
            <Text style={styles.partnerName}>{p.name}</Text>
            <Text style={styles.partnerCity}>{p.city} · {p.category}</Text>
            <TextInput style={styles.input} value={eventTitle} onChangeText={setEventTitle} placeholderTextColor={colors.textSecondary} />
            <View style={{ gap: spacing.sm }}>
              <Button title="Créer événement" onPress={() => createEvent(p.id)} variant="secondary" haptic="light" />
              <Button title="Publier offre" onPress={() => createOffer(p.id)} variant="secondary" haptic="light" />
              <Button title="Afficher QR Code" onPress={() => { setQrPartner(`PACE-${p.id}`); haptics.light(); }} variant="secondary" haptic="light" />
              <View style={styles.row}>
                <Button title="Check-in départ" onPress={() => checkIn(p.id, 'departure')} haptic="light" />
                <Button title="Check-in retour" onPress={() => checkIn(p.id, 'return')} haptic="light" />
              </View>
            </View>
          </Card>
        </Animated.View>
      ))}

      <Card>
        <Text style={styles.section}>Créer un challenge</Text>
        <TextInput style={styles.input} value={challengeTitle} onChangeText={setChallengeTitle} placeholderTextColor={colors.textSecondary} />
        <TextInput style={styles.input} value={challengeTarget} onChangeText={setChallengeTarget} keyboardType="numeric" placeholderTextColor={colors.textSecondary} />
        <TextInput style={styles.input} value={challengeReward} onChangeText={setChallengeReward} placeholderTextColor={colors.textSecondary} />
        <Button title="Créer le challenge" onPress={createChallenge} variant="secondary" haptic="medium" />
      </Card>

      <Pressable onPress={() => setShowChallenges(!showChallenges)}>
        <Text style={styles.toggleBtn}>{showChallenges ? 'Masquer' : 'Voir'} challenges ({challenges.length})</Text>
      </Pressable>

      {showChallenges && challenges.map((c) => (
        <Card key={c.id} style={styles.partnerCard}>
          <Text style={styles.partnerName}>{c.title}</Text>
          <Text style={styles.partnerCity}>{c.target_runs} runs · {c.reward_description ?? 'Récompense'}</Text>
        </Card>
      ))}

      <Sheet visible={!!qrPartner} onClose={() => setQrPartner(null)} title="QR Code" snapPoints={['35%']}>
        <View style={styles.qrBox}>
          <Text style={styles.qrText}>{qrPartner}</Text>
        </View>
        <Button title="Partager" onPress={shareQr} variant="secondary" haptic="medium" />
      </Sheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  title: { ...typography.title, color: colors.text, marginBottom: spacing.md },
  section: { color: colors.text, fontWeight: '600', marginBottom: spacing.sm },
  input: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, color: colors.text, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  partnerCard: { marginBottom: spacing.md },
  partnerName: { color: colors.text, fontSize: 18, fontWeight: '600' },
  partnerCity: { color: colors.textSecondary, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  toggleBtn: { color: colors.primary, fontWeight: '600', marginVertical: spacing.md },
  qrBox: { backgroundColor: '#fff', padding: spacing.xl, borderRadius: 16, alignItems: 'center', marginBottom: spacing.md },
  qrText: { color: '#000', fontSize: 16, fontWeight: '700', letterSpacing: 2 },
});