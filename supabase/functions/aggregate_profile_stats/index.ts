import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

Deno.serve(async (req) => {
  const { user_id, run_id } = await req.json();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: run } = await supabase
    .from('runs')
    .select('distance_m, duration_sec, avg_pace_sec_per_km')
    .eq('id', run_id)
    .single();

  if (!run) {
    return new Response(JSON.stringify({ error: 'Run not found' }), { status: 404 });
  }

  const km = (run.distance_m ?? 0) / 1000;
  const xp_earned = Math.floor(km * 10);

  const { data, error: rpcError } = await supabase.rpc('increment_profile_stats', {
    p_user_id: user_id,
    p_km: km,
    p_xp: xp_earned,
    p_pace: run.avg_pace_sec_per_km
  });

  if (rpcError) {
    return new Response(JSON.stringify({ error: rpcError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, stats: data }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
