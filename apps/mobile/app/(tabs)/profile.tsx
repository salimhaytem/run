import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { StatBlock } from '@/components/ui/StatBlock';
import { formatPace } from '@/lib/geo';
import { exportUserData, requestAccountDeletion } from '@/lib/privacy';
import { activatePremium } from '@/features/monetization/premium';
import { followUser, searchRunners } from '@/features/social/followUser';
import { publishStory } from '@/features/stories/publishStory';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography } from '@/theme/tokens';
import { Alert } from 'react-native';

export default function ProfileScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [badges, setBadges] = useState<{ name: string; code: string }[]>([]);
  const [runs, setRuns] = useState<{ id: string; distance_m: number; started_at: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setBio(profile.bio ?? '');
    loadSocial();
    loadRuns();
    loadBadges();
  }, [profile?.id]);

  const loadSocial = async () => {
    if (!user) return;
    const [{ count: f1 }, { count: f2 }] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
    ]);
    setFollowers(f1 ?? 0);
    setFollowing(f2 ?? 0);
  };

  const loadRuns = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('runs')
      .select('id, distance_m, started_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('started_at', { ascending: false })
      .limit(10);
    setRuns(data ?? []);
  };

  const loadBadges = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_badges')
      .select('badges(name, code)')
      .eq('user_id', user.id);
    setBadges(
      (data ?? []).map((b: { badges: { name: string; code: string } }) => b.badges),
    );
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from('profiles').update({ bio }).eq('id', user.id);
    await refreshProfile();
    setSaving(false);
  };

  const pickAvatar = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (res.canceled || !user) return;
    const uri = res.assets[0].uri;
    const ext = uri.split('.').pop() ?? 'jpg';
    const path = `${user.id}/avatar.${ext}`;
    const blob = await fetch(uri).then((r) => r.blob());
    await supabase.storage.from('avatars').upload(path, blob, { upsert: true });
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id);
    await refreshProfile();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  if (!profile) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={pickAvatar} style={styles.avatarWrap}>
        <Avatar url={profile.avatar_url} name={profile.username} size={88} />
        <Text style={styles.changePhoto}>Changer photo</Text>
      </Pressable>
      <Text style={styles.username}>@{profile.username}</Text>
      <Text style={styles.meta}>
        {profile.city} · Niv. {profile.level} · {profile.is_premium ? 'Premium' : 'Free'}
      </Text>

      <View style={styles.socialRow}>
        <StatBlock label="Followers" value={String(followers)} />
        <StatBlock label="Following" value={String(following)} />
        <StatBlock label="Streak" value={String(profile.current_streak)} />
      </View>
      <Button
        title="Suivre un runner (démo)"
        variant="secondary"
        onPress={async () => {
          const list = await searchRunners('runner');
          const target = list.find((r) => r.id !== user?.id);
          if (target && user) {
            await followUser(user.id, target.id);
            loadSocial();
            Alert.alert('Suivi', `Tu suis @${target.username}`);
          }
        }}
      />

      <Card>
        <View style={styles.stats}>
          <StatBlock label="Km total" value={Number(profile.total_km).toFixed(1)} />
          <StatBlock label="Runs/sem." value={String(profile.weekly_runs)} />
          <StatBlock label="Allure" value={formatPace(profile.avg_pace_sec_per_km)} />
        </View>
        <View style={styles.stats}>
          <StatBlock label="Sauvetages" value={String(profile.rescues_done)} />
          <StatBlock label="Max km" value={Number(profile.max_distance_km).toFixed(1)} />
          <StatBlock label="XP" value={String(profile.xp)} />
        </View>
      </Card>

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={styles.input}
        value={bio}
        onChangeText={setBio}
        multiline
        placeholderTextColor={colors.textSecondary}
      />
      <Button title="Enregistrer" onPress={saveProfile} loading={saving} />

      {badges.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Badges</Text>
          <View style={styles.badges}>
            {badges.map((b) => (
              <View key={b.code} style={styles.badge}>
                <Text style={styles.badgeText}>{b.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>Historique runs</Text>
      <FlatList
        data={runs}
        scrollEnabled={false}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/run/${item.id}/recap`)}>
            <Card style={{ marginBottom: spacing.sm }}>
              <Text style={styles.runItem}>
                {(item.distance_m / 1000).toFixed(2)} km ·{' '}
                {new Date(item.started_at).toLocaleDateString('fr-FR')}
              </Text>
            </Card>
          </Pressable>
        )}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stories & Premium</Text>
        <Button
          title="Publier une story"
          variant="secondary"
          onPress={async () => {
            const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
            if (!res.canceled && user) {
              await publishStory(user.id, res.assets[0].uri, 'image');
              Alert.alert('Story publiée', 'Visible 24h');
            }
          }}
        />
        {!profile.is_premium && user && (
          <Button title="Passer Premium" onPress={() => activatePremium(user.id).then(refreshProfile)} />
        )}
      </View>

      {profile.is_partner && (
        <Button title="Espace partenaire" onPress={() => router.push('/partner')} variant="secondary" />
      )}
      <Button
        title="Exporter mes données (RGPD)"
        variant="ghost"
        onPress={async () => {
          if (!user) return;
          const data = await exportUserData(user.id);
          Alert.alert('Export prêt', JSON.stringify(data).slice(0, 200) + '...');
        }}
      />
      <Button
        title="Supprimer mon compte"
        variant="danger"
        onPress={async () => {
          if (user) await requestAccountDeletion(user.id);
          router.replace('/(auth)/login');
        }}
      />
      <Button title="Déconnexion" onPress={signOut} variant="ghost" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  avatarWrap: { alignItems: 'center', marginBottom: spacing.sm },
  changePhoto: { color: colors.primary, marginTop: spacing.xs },
  username: { ...typography.heading, color: colors.text, textAlign: 'center' },
  meta: { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md },
  socialRow: { flexDirection: 'row', marginBottom: spacing.md },
  stats: { flexDirection: 'row', marginBottom: spacing.sm },
  label: { color: colors.textSecondary, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    color: colors.text,
    marginVertical: spacing.sm,
    minHeight: 80,
  },
  section: { marginTop: spacing.lg },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: { backgroundColor: colors.primaryMuted, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20 },
  badgeText: { color: colors.primary, fontWeight: '600' },
  runItem: { color: colors.text },
});
