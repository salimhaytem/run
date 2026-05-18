import { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { colors, spacing } from '@/theme/tokens';

interface NearbyRunner {
  user_id: string;
  username: string;
  lat: number;
  lng: number;
  distance_m: number;
}

interface MapItem {
  id: string;
  title: string;
  lat: number;
  lng: number;
  type: 'runner' | 'crew' | 'event' | 'partner';
}

export function SocialMap() {
  const [region, setRegion] = useState({
    latitude: 33.5731,
    longitude: -7.5898,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [items, setItems] = useState<MapItem[]>([]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = loc.coords;
        setRegion((r) => ({ ...r, latitude, longitude }));

        const { data: runners } = await supabase.rpc('nearby_runners', {
          lat: latitude,
          lng: longitude,
          radius_m: 8000,
        });

        const runnerItems: MapItem[] = ((runners as NearbyRunner[]) ?? []).map((r) => ({
          id: r.user_id,
          title: r.username,
          lat: r.lat,
          lng: r.lng,
          type: 'runner' as const,
        }));

        const { data: partners } = await supabase
          .from('partners')
          .select('id, name, location')
          .eq('is_featured', true)
          .limit(20);

        const partnerItems: MapItem[] = (partners ?? []).map((p: { id: string; name: string }) => ({
          id: p.id,
          title: p.name,
          lat: region.latitude,
          lng: region.longitude,
          type: 'partner' as const,
        }));

        const { data: events } = await supabase
          .from('partner_events')
          .select('id, title, starts_at')
          .gte('starts_at', new Date().toISOString())
          .limit(10);

        const eventItems: MapItem[] = (events ?? []).map((e: { id: string; title: string }) => ({
          id: e.id,
          title: e.title,
          lat: latitude + 0.002,
          lng: longitude + 0.002,
          type: 'event' as const,
        }));

        setItems([...runnerItems, ...partnerItems, ...eventItems]);
      }
    })();

    const channel = supabase
      .channel('live_presence')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_presence' }, () => {
        // refresh on presence change
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const pinColor = (type: MapItem['type']) => {
    switch (type) {
      case 'runner':
        return colors.mapRunner;
      case 'crew':
        return colors.mapCrew;
      case 'event':
        return colors.mapEvent;
      default:
        return colors.mapPartner;
    }
  };

  return (
    <View style={styles.wrap}>
      <MapView style={styles.map} region={region} provider={PROVIDER_DEFAULT}>
        {items.map((item) => (
          <Marker
            key={`${item.type}-${item.id}`}
            coordinate={{ latitude: item.lat, longitude: item.lng }}
            title={item.title}
            pinColor={pinColor(item.type)}
          />
        ))}
      </MapView>
      <View style={styles.legend}>
        <LegendDot color={colors.mapRunner} label="Runners" />
        <LegendDot color={colors.mapEvent} label="Events" />
        <LegendDot color={colors.mapPartner} label="Partenaires" />
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  map: { flex: 1 },
  legend: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface + 'EE',
    padding: spacing.sm,
    borderRadius: 12,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: colors.textSecondary, fontSize: 12 },
});
