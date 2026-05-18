import { supabase } from '@/lib/supabase';

/** RGPD: export user data summary */
export async function exportUserData(userId: string) {
  const [profile, runs, posts, crews] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('runs').select('*').eq('user_id', userId),
    supabase.from('posts').select('*').eq('user_id', userId),
    supabase.from('crew_members').select('*, crews(*)').eq('user_id', userId),
  ]);
  return {
    profile: profile.data,
    runs: runs.data,
    posts: posts.data,
    crews: crews.data,
    exportedAt: new Date().toISOString(),
  };
}

/** RGPD: delete account and related data (requires service role on server; client triggers sign-out) */
export async function requestAccountDeletion(userId: string) {
  await supabase.from('live_presence').delete().eq('user_id', userId);
  await supabase.auth.signOut();
}
