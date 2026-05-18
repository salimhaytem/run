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

  const { data: profile } = await supabase
    .from('profiles')
    .select('total_km, max_distance_km, current_streak, weekly_runs')
    .eq('id', user_id)
    .single();

  const km = (run.distance_m ?? 0) / 1000;
  const totalKm = Number(profile?.total_km ?? 0) + km;
  const maxKm = Math.max(Number(profile?.max_distance_km ?? 0), km);

  await supabase
    .from('profiles')
    .update({
      total_km: totalKm,
      max_distance_km: maxKm,
      weekly_runs: (profile?.weekly_runs ?? 0) + 1,
      avg_pace_sec_per_km: run.avg_pace_sec_per_km,
      current_streak: (profile?.current_streak ?? 0) + 1,
      xp: Math.floor(totalKm * 10),
    })
    .eq('id', user_id);

  return new Response(JSON.stringify({ ok: true, total_km: totalKm }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
