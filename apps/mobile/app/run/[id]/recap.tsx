import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import MapView, { Polyline } from 'react-native-maps';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { StatBlock } from '@/components/ui/StatBlock';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { useHaptics } from '@/hooks/useHaptics';
import { formatDuration, formatKm, formatPace } from '@/lib/geo';
import { colors, spacing, typography } from '@/theme/tokens';
import { useAuth } from '@/hooks/useAuth';
import * as ImagePicker from 'expo-image-picker';

export default function RunRecapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const haptics = useHaptics();
  const [run, setRun] = useState<{ distance_m: number; duration_sec: number; avg_pace_sec_per_km: number | null; polyline: GeoJSON.LineString | null; calories: number | null } | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: r } = await supabase.from('runs').select('*').eq('id', id).single();
      setRun(r);
      const { data: recap } = await supabase.from('run_recaps').select('photo_urls').eq('run_id', id).single();
      if (recap?.photo_urls) setPhotos(recap.photo_urls);
    })();
  }, [id]);

  const coords = run?.polyline?.coordinates?.map(([lng, lat]) => ({ latitude: lat, longitude: lng })) ?? [];
  const region = coords.length > 0
    ? { latitude: coords[0].latitude, longitude: coords[0].longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }
    : { latitude: 33.5731, longitude: -7.5898, latitudeDelta: 0.05, longitudeDelta: 0.05 };

  const addPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
    if (res.canceled || !id || !user) return;
    haptics.light();
    const uri = res.assets[0].uri;
    const path = `${user.id}/runs/${id}/${Date.now()}.jpg`;
    const blob = await fetch(uri).then((r) => r.blob());
    await supabase.storage.from('run-photos').upload(path, blob);
    const { data } = supabase.storage.from('run-photos').getPublicUrl(path);
    const next = [...photos, data.publicUrl];
    setPhotos(next);
    await supabase.from('run_recaps').update({ photo_urls: next }).eq('run_id', id);
    toast.success('Photo ajoutée');
  };

  const shareToFeed = async () => {
    if (!user || !run || !id) return;
    haptics.medium();
    await supabase.from('posts').insert({ user_id: user.id, run_id: id, content: `Run ${formatKm(run.distance_m)} km en ${formatDuration(run.duration_sec)}`, post_type: 'gps', gps_trace: run.polyline });
    toast.success('Partagé au feed !');
  };

  if (!run) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Run Recap</Text>
      <Animated.View entering={FadeInDown} style={styles.mapWrap}>
        <MapView style={styles.map} region={region}>
          {coords.length > 1 && <Polyline coordinates={coords} strokeColor={colors.primary} strokeWidth={4} />}
        </MapView>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(100)}>
        <Card>
          <View style={styles.stats}>
            <StatBlock label="Distance" value={`${formatKm(run.distance_m)} km`} />
            <StatBlock label="Durée" value={formatDuration(run.duration_sec)} />
            <StatBlock label="Allure" value={formatPace(run.avg_pace_sec_per_km)} />
          </View>
          {run.calories != null && <Text style={styles.calories}>~{run.calories} kcal</Text>}
        </Card>
      </Animated.View>
      <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
        <Button title="Ajouter photo" onPress={addPhoto} variant="secondary" haptic="light" />
        <Button title="Partager au feed" onPress={shareToFeed} haptic="medium" />
      </View>
      <ScrollView horizontal style={styles.photos}>
        {photos.map((url) => (
          <Image key={url} source={{ uri: url }} style={styles.photo} contentFit="cover" transition={300} cachePolicy="memory-disk" />
        ))}
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  title: { ...typography.title, color: colors.text, marginBottom: spacing.md },
  mapWrap: { height: 220, borderRadius: 16, overflow: 'hidden', marginBottom: spacing.md },
  map: { flex: 1 },
  stats: { flexDirection: 'row' },
  calories: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
  photos: { marginTop: spacing.md },
  photo: { width: 120, height: 120, borderRadius: 12, marginRight: spacing.sm },
});