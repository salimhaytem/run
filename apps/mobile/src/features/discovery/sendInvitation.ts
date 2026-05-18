import { supabase } from '@/lib/supabase';

export async function sendRunInvitation(
  fromUserId: string,
  toUserId: string,
  message: string,
) {
  const { data, error } = await supabase
    .from('run_invitations')
    .insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      message,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) throw error;
  if (data?.id) {
    await supabase.functions.invoke('notify_run_invitation', {
      body: { invitation_id: data.id },
    });
    await supabase.functions.invoke('award_badges', {
      body: { user_id: fromUserId, event: 'invitation_sent' },
    });
  }
  return data;
}
