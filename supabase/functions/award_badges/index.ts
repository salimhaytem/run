import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

Deno.serve(async (req) => {
  const { user_id, event } = await req.json();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const rules: Record<string, string> = {
    sos_completed: 'sos_hero',
    marathon: 'marathon_finisher',
    sunrise: 'sunrise_runner',
  };

  const code = rules[event];
  if (!code) {
    return new Response(JSON.stringify({ awarded: false }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: badge } = await supabase.from('badges').select('id').eq('code', code).single();
  if (!badge) {
    return new Response(JSON.stringify({ awarded: false }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await supabase.from('user_badges').upsert({ user_id, badge_id: badge.id });

  return new Response(JSON.stringify({ awarded: true, code }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
