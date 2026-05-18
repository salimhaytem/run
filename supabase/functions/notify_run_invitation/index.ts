import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

Deno.serve(async (req) => {
  const { invitation_id } = await req.json();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: inv } = await supabase
    .from('run_invitations')
    .select('to_user_id, message, from_user_id, profiles!run_invitations_from_user_id_fkey(username)')
    .eq('id', invitation_id)
    .single();

  if (!inv) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  }

  // Push via Expo would use inv.to_user push_token from profiles
  return new Response(JSON.stringify({ notified: true, invitation_id }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
