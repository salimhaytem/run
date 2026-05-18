import { supabase } from '@/lib/supabase';

export async function followUser(followerId: string, followingId: string) {
  const { error } = await supabase.from('follows').insert({
    follower_id: followerId,
    following_id: followingId,
  });
  if (error) throw error;
}

export async function unfollowUser(followerId: string, followingId: string) {
  await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);
}

export async function searchRunners(query: string, limit = 20) {
  const { data } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, city')
    .ilike('username', `%${query}%`)
    .limit(limit);
  return data ?? [];
}
