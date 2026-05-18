import { supabase } from '@/lib/supabase';
import { STORY_DURATION_HOURS } from '@pace/shared';

export async function publishStory(userId: string, localUri: string, mediaType: 'image' | 'video') {
  const path = `${userId}/${Date.now()}.${mediaType === 'image' ? 'jpg' : 'mp4'}`;
  const blob = await fetch(localUri).then((r) => r.blob());
  await supabase.storage.from('stories').upload(path, blob);
  const { data: urlData } = supabase.storage.from('stories').getPublicUrl(path);

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + STORY_DURATION_HOURS);

  const { data, error } = await supabase
    .from('stories')
    .insert({
      user_id: userId,
      media_url: urlData.publicUrl,
      media_type: mediaType,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
