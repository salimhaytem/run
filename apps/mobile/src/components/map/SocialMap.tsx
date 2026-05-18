import { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, Alert } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, cancelAnimation, Easing } from 'react-native-reanimated';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { sendRunInvitation } from '@/features/discovery/sendInvitation';
import { useToast } from '@/hooks/useToast';
import { colors, spacing } from '@/theme/tokens';

interface NearbyRunner { user_id: string; username: string; avatar_url: string | null; lat: number; lng: number; distance_m: number }
interface MapItem { id: string; title: string; subtitle?: string; lat: number; lng: number; type: 'runner' | 'crew' | 'event' | 'partner' }

function PulseMarker({ item }: { item: MapItem }) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    if (item.type !== 'runner' && item.type !== 'event') return;
    scale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, true,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, true,
    );
    return () => { cancelAnimation(scale); cancelAnimation(opacity); };
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const glowColor = item.type === 'runner' ? colors.mapRunner : colors.mapEvent;

  return (
    <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          Styles.pulseDot,
          { backgroundColor: glowColor, width: 32, height: 32, borderRadius: 16 },
          animStyle,
        ]}
      />
      <View style={[Styles.coreDot, { backgroundColor: glowColor }]} />
    </View>
  );
}

export function SocialMap() {
  const { user } = useAuth();
  const toast = useToast();
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState({ latitude: 33.5731, longitude: -7.5898, latitudeDelta: 0.05, longitudeDelta: 0.05 });
  const [items, setItems] = useState<MapItem[]>([]);

  const loadData = useCallback(async (latitude: number, longitude: number) => {
    const { data: runners } = await supabase.rpc('nearby_runners', { lat: latitude, lng: longitude, radius_m: 8000 });
    const runnerItems: MapItem[] = ((runners as NearbyRunner[]) ?? []).map((r) => ({ id: r.user_id, title: r.username, subtitle: `${(r.distance_m / 1000).toFixed(1)} km`, lat: r.lat, lng: r.lng, type: 'runner' as const }));

    const { data: partners } = await supabase.from('partners').select('id, name, location, city').eq('is_featured', true).limit(20);
    const partnerItems: MapItem[] = ((partners ?? []) as any[]).map((p) => {
      const coords = p.location?.coordinates ?? [longitude, latitude];
      return { id: p.id, title: p.name, subtitle: p.city, lat: coords[1] ?? latitude, lng: coords[0] ?? longitude, type: 'partner' as const };
    });

    const { data: events } = await supabase.from('partner_events').select('id, title, starts_at, location').gte('starts_at', new Date().toISOString()).limit(10);
    const eventItems: MapItem[] = ((events ?? []) as any[]).map((e) => {
      const coords = e.location?.coordinates;
      return { id: e.id, title: e.title, subtitle: coords ? new Date(e.starts_at).toLocaleDateString('fr-FR') : undefined, lat: coords ? coords[1] : latitude + 0.002, lng: coords ? coords[0] : longitude + 0.002, type: 'event' as const };
    });

    const { data: crews } = await supabase.from('crews').select('id, name, city, xp').eq('crew_type', 'public').order('xp', { ascending: false }).limit(10);
    const crewItems: MapItem[] = ((crews ?? []) as any[]).map((c, i) => ({ id: c.id, title: c.name, subtitle: c.city ?? undefined, lat: latitude + 0.001 * (i + 1), lng: longitude + 0.001 * (i + 1), type: 'crew' as const }));

    setItems([...runnerItems, ...partnerItems, ...eventItems, ...crewItems]);
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = loc.coords;
        setRegion((r) => ({ ...r, latitude, longitude }));
        loadData(latitude, longitude);
      }
    })();
    const channel = supabase.channel('map_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'live_presence' }, async () => {
      const loc = await Location.getCurrentPositionAsync({});
      loadData(loc.coords.latitude, loc.coords.longitude);
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleMarkerPress = async (item: MapItem) => {
    if (item.type === 'partner') { Alert.alert(item.title, `Partenaire: ${item.subtitle ?? ''}`); return; }
    if (item.type === 'crew') { router.push(`/chat/crew-${item.id}`); return; }
    if (item.type === 'runner' && user && item.id !== user.id) {
      Alert.alert(`@${item.title}`, 'Inviter ce runner ?', [
        { text: 'Run ensemble ?', onPress: () => sendRunInvitation(user.id, item.id, 'Run ensemble ?').then(() => toast.success('Invitation envoyée')) },
        { text: 'Annuler', style: 'cancel' },
      ]);
    }
  };

  const pinColor = (type: MapItem['type']) => {
    switch (type) { case 'runner': return colors.mapRunner; case 'crew': return colors.mapCrew; case 'event': return colors.mapEvent; default: return colors.mapPartner; }
  };

  return (
    <View style={Styles.wrap}>
      <MapView ref={mapRef} style={Styles.map} region={region} provider={PROVIDER_DEFAULT}>
        {items.map((item) => (
          <Marker
            key={`${item.type}-${item.id}`}
            coordinate={{ latitude: item.lat, longitude: item.lng }}
            pinColor={pinColor(item.type)}
            onPress={() => handleMarkerPress(item)}
          />
        ))}
      </MapView>
      <View style={Styles.legend}>
        <LegendDot color={colors.mapRunner} label="Runners" />
        <LegendDot color={colors.mapCrew} label="Crews" />
        <LegendDot color={colors.mapEvent} label="Events" />
        <LegendDot color={colors.mapPartner} label="Partenaires" />
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={Styles.legendItem}>
      <View style={[Styles.dot, { backgroundColor: color }]} />
      <Text style={Styles.legendText}>{label}</Text>
    </View>
  );
}

const Styles = StyleSheet.create({
  wrap: { flex: 1 },
  map: { flex: 1 },
  legend: { position: 'absolute', bottom: spacing.lg, left: spacing.md, right: spacing.md, flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.surface + 'EE', padding: spacing.sm, borderRadius: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: colors.textSecondary, fontSize: 12 },
  pulseDot: { position: 'absolute' },
  coreDot: { width: 12, height: 12, borderRadius: 6 },
});