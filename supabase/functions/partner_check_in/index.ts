import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

Deno.serve(async (req) => {
  const { user_id, partner_id, event_id, check_in_type, qr_code } = await req.json();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data, error } = await supabase
    .from('check_ins')
    .insert({ user_id, partner_id, event_id, check_in_type, qr_code })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }

  return new Response(JSON.stringify({ check_in: data }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
