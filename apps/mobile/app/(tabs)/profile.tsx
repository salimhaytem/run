import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, FlatList, Alert } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { StatBlock } from '@/components/ui/StatBlock';
import { Sheet } from '@/components/ui/BottomSheet';
import { Skeleton, SkeletonAvatar } from '@/components/ui/Skeleton';
import { useToast } from '@/hooks/useToast';
import { useHaptics } from '@/hooks/useHaptics';
import { formatPace } from '@/lib/geo';
import { exportUserData, requestAccountDeletion } from '@/lib/privacy';
import { activatePremium } from '@/features/monetization/premium';
import { followUser } from '@/features/social/followUser';
import { publishStory } from '@/features/stories/publishStory';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography } from '@/theme/tokens';

interface ListUser {
  id: string;
  username: string;
  avatar_url: string | null;
}

export default function ProfileScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const toast = useToast();
  const haptics = useHaptics();
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [badges, setBadges] = useState<{ name: string; code: string }[]>([]);
  const [runs, setRuns] = useState<{ id: string; distance_m: number; started_at: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [crewName, setCrewName] = useState<string | null>(null);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followList, setFollowList] = useState<ListUser[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    setBio(profile.bio ?? '');
    Promise.all([loadSocial(), loadRuns(), loadBadges(), loadCrew()]).finally(() => setInitialLoading(false));
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

  const loadCrew = async () => {
    if (!user || !profile?.primary_crew_id) return;
    const { data } = await supabase.from('crews').select('name').eq('id', profile.primary_crew_id).single();
    if (data) setCrewName((data as { name: string }).name);
  };

  const loadRuns = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('runs').select('id, distance_m, started_at').eq('user_id', user.id).eq('status', 'completed')
      .order('started_at', { ascending: false }).limit(10);
    setRuns(data ?? []);
  };

  const loadBadges = async () => {
    if (!user) return;
    const { data } = await supabase.from('user_badges').select('badges(name, code)').eq('user_id', user.id);
    setBadges((data ?? []).map((b: any) => b.badges));
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from('profiles').update({ bio }).eq('id', user.id);
    await refreshProfile();
    setSaving(false);
    haptics.success();
    toast.success('Profil mis à jour');
  };

  const pickAvatar = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (res.canceled || !user) return;
    haptics.light();
    const uri = res.assets[0].uri;
    const ext = uri.split('.').pop() ?? 'jpg';
    const path = `${user.id}/avatar.${ext}`;
    const blob = await fetch(uri).then((r) => r.blob());
    await supabase.storage.from('avatars').upload(path, blob, { upsert: true });
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id);
    await refreshProfile();
    toast.success('Photo mise à jour');
  };

  const loadFollowList = async (type: 'followers' | 'following') => {
    if (!user) return;
    haptics.light();
    if (type === 'followers') {
      const { data } = await supabase.from('follows').select('follower_id, profiles!follower_id(id, username, avatar_url)').eq('following_id', user.id);
      setFollowList((data ?? []).map((r: any) => ({ id: r.profiles.id, username: r.profiles.username, avatar_url: r.profiles.avatar_url })));
      setShowFollowers(true);
    } else {
      const { data } = await supabase.from('follows').select('following_id, profiles!following_id(id, username, avatar_url)').eq('follower_id', user.id);
      setFollowList((data ?? []).map((r: any) => ({ id: r.profiles.id, username: r.profiles.username, avatar_url: r.profiles.avatar_url })));
      setShowFollowing(true);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  if (!profile || initialLoading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <SkeletonAvatar />
        <Card><Skeleton width="100%" height={80} /></Card>
        <Skeleton width="100%" height={80} style={{ marginTop: spacing.md }} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={pickAvatar} style={styles.avatarWrap}>
        <Avatar url={profile.avatar_url} name={profile.username} size={88} story />
        <Text style={styles.changePhoto}>Changer photo</Text>
      </Pressable>
      <Text style={styles.username}>@{profile.username}</Text>
      <Text style={styles.meta}>
        {profile.city} · Niv. {profile.level} · {profile.is_premium ? '⭐ Premium' : 'Free'}
        {crewName ? ` · ${crewName}` : ''}
      </Text>

      <Animated.View entering={FadeInDown.delay(100)} style={styles.socialRow}>
        <Pressable style={{ flex: 1, alignItems: 'center' }} onPress={() => loadFollowList('followers')}>
          <StatBlock label="Followers" value={String(followers)} animated />
        </Pressable>
        <Pressable style={{ flex: 1, alignItems: 'center' }} onPress={() => loadFollowList('following')}>
          <StatBlock label="Following" value={String(following)} animated />
        </Pressable>
        <StatBlock label="Streak" value={String(profile.current_streak)} animated />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200)}>
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
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300)}>
        <Text style={styles.label}>Bio</Text>
        <TextInput style={styles.input} value={bio} onChangeText={setBio} multiline placeholderTextColor={colors.textSecondary} />
        <Button title="Enregistrer" onPress={saveProfile} loading={saving} haptic="medium" />
      </Animated.View>

      {badges.length > 0 && (
        <Animated.View entering={FadeInDown.delay(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>Badges</Text>
          <View style={styles.badges}>
            {badges.map((b) => (
              <View key={b.code} style={styles.badge}>
                <Text style={styles.badgeText}>{b.name}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(500)}>
        <Text style={styles.sectionTitle}>Historique runs</Text>
        <FlatList
          data={runs}
          scrollEnabled={false}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/run/${item.id}/recap`)}>
              <Card style={{ marginBottom: spacing.sm }}>
                <Text style={styles.runItem}>{(item.distance_m / 1000).toFixed(2)} km · {new Date(item.started_at).toLocaleDateString('fr-FR')}</Text>
              </Card>
            </Pressable>
          )}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(600)} style={styles.section}>
        <Text style={styles.sectionTitle}>Stories & Premium</Text>
        <Button title="Publier une story" variant="secondary" haptic="light" onPress={async () => {
          const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
          if (!res.canceled && user) {
            await publishStory(user.id, res.assets[0].uri, 'image');
            toast.success('Story publiée — visible 24h');
          }
        }} />
        {!profile.is_premium && user && (
          <Button title="⭐ Passer Premium" variant="premium" haptic="medium" onPress={() => activatePremium(user.id).then(refreshProfile).then(() => toast.success('Premium activé !'))} />
        )}
      </Animated.View>

      {profile.is_partner && (
        <Button title="Espace partenaire" onPress={() => router.push('/partner')} variant="secondary" haptic="light" />
      )}
      <Button title="Exporter mes données (RGPD)" variant="ghost" haptic="light" onPress={async () => {
        if (!user) return;
        const data = await exportUserData(user.id);
        toast.info('Données exportées');
      }} />
      <Button title="Supprimer mon compte" variant="danger" haptic="heavy" onPress={async () => {
        if (user) await requestAccountDeletion(user.id);
        router.replace('/(auth)/login');
      }} />
      <Button title="Déconnexion" onPress={signOut} variant="ghost" haptic="light" />

      <Sheet visible={showFollowers} onClose={() => setShowFollowers(false)} title="Followers" snapPoints={['50%']}>
        {followList.map((f) => (
          <View key={f.id} style={styles.followRow}>
            <Avatar url={f.avatar_url} name={f.username} size={36} />
            <Text style={styles.followName}>@{f.username}</Text>
          </View>
        ))}
      </Sheet>

      <Sheet visible={showFollowing} onClose={() => setShowFollowing(false)} title="Following" snapPoints={['50%']}>
        {followList.map((f) => (
          <View key={f.id} style={styles.followRow}>
            <Avatar url={f.avatar_url} name={f.username} size={36} />
            <Text style={styles.followName}>@{f.username}</Text>
          </View>
        ))}
      </Sheet>
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
  input: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, color: colors.text, marginVertical: spacing.sm, minHeight: 80, borderWidth: 1, borderColor: colors.border },
  section: { marginTop: spacing.lg },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: { backgroundColor: colors.primaryMuted, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20 },
  badgeText: { color: colors.primary, fontWeight: '600' },
  runItem: { color: colors.text },
  followRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  followName: { color: colors.text, fontSize: 14 },
});