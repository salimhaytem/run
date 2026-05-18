import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

Deno.serve(async (req) => {
  const { sos_id, lat, lng, radius_m = 3000 } = await req.json();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: nearby } = await supabase.rpc('nearby_runners', {
    lat,
    lng,
    radius_m,
  });

  return new Response(
    JSON.stringify({ sos_id, notified_count: nearby?.length ?? 0 }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
