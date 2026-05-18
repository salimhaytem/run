import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Alert } from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography } from '@/theme/tokens';

export default function PartnerScreen() {
  const { user } = useAuth();
  const [partners, setPartners] = useState<{ id: string; name: string; city: string }[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('café');
  const [eventTitle, setEventTitle] = useState('Sunrise Run — Départ 7h');
  const [offerTitle, setOfferTitle] = useState('20% après le run');

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    const { data } = await supabase.from('partners').select('id, name, city').limit(20);
    setPartners(data ?? []);
  };

  const registerPartner = async () => {
    if (!user || !name.trim()) return;
    const loc = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = loc.coords;
    await supabase.rpc('create_partner', {
      p_name: name,
      p_category: category,
      p_city: 'Casablanca',
      p_lat: latitude,
      p_lng: longitude,
    });
    await supabase.from('profiles').update({ is_partner: true }).eq('id', user.id);
    setName('');
    loadPartners();
    Alert.alert('Partenaire créé', 'Tu peux maintenant créer des événements.');
  };

  const createEvent = async (partnerId: string) => {
    const starts = new Date();
    starts.setDate(starts.getDate() + 1);
    starts.setHours(7, 0, 0, 0);
    await supabase.from('partner_events').insert({
      partner_id: partnerId,
      title: eventTitle,
      description: 'Départ collectif depuis le café',
      starts_at: starts.toISOString(),
      is_sponsored: true,
    });
    Alert.alert('Événement créé', eventTitle);
  };

  const createOffer = async (partnerId: string) => {
    await supabase.from('partner_offers').insert({
      partner_id: partnerId,
      title: offerTitle,
      description: 'Valable après le run du matin',
      discount_percent: 20,
    });
    Alert.alert('Offre publiée', offerTitle);
  };

  const checkIn = async (partnerId: string, type: 'departure' | 'return') => {
    if (!user) return;
    await supabase.functions.invoke('partner_check_in', {
      body: {
        user_id: user.id,
        partner_id: partnerId,
        check_in_type: type,
        qr_code: `PACE-${partnerId}-${type}`,
      },
    });
    Alert.alert('Check-in', type === 'departure' ? 'Départ enregistré' : 'Retour enregistré — profite de l\'offre !');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Marketplace locale</Text>

      <Card>
        <Text style={styles.section}>Devenir partenaire</Text>
        <TextInput style={styles.input} placeholder="Nom du commerce" placeholderTextColor={colors.textSecondary} value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Catégorie" placeholderTextColor={colors.textSecondary} value={category} onChangeText={setCategory} />
        <Button title="Enregistrer le commerce" onPress={registerPartner} />
      </Card>

      {partners.map((p) => (
        <Card key={p.id} style={styles.partnerCard}>
          <Text style={styles.partnerName}>{p.name}</Text>
          <Text style={styles.partnerCity}>{p.city}</Text>
          <TextInput style={styles.input} value={eventTitle} onChangeText={setEventTitle} placeholderTextColor={colors.textSecondary} />
          <Button title="Créer événement" onPress={() => createEvent(p.id)} variant="secondary" />
          <Button title="Publier offre" onPress={() => createOffer(p.id)} variant="secondary" />
          <View style={styles.row}>
            <Button title="Check-in départ" onPress={() => checkIn(p.id, 'departure')} />
            <Button title="Check-in retour" onPress={() => checkIn(p.id, 'return')} />
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  title: { ...typography.title, color: colors.text, marginBottom: spacing.md },
  section: { color: colors.text, fontWeight: '600', marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    color: colors.text,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  partnerCard: { marginBottom: spacing.md },
  partnerName: { color: colors.text, fontSize: 18, fontWeight: '600' },
  partnerCity: { color: colors.textSecondary, marginBottom: spacing.sm },
  row: { gap: spacing.sm, marginTop: spacing.sm },
});
