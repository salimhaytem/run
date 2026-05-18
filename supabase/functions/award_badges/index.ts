import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

Deno.serve(async (req) => {
  const { user_id, event } = await req.json();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const rules: Record<string, string | ((uid: string) => Promise<string | null>)> = {
    sos_completed: 'sos_hero',
    marathon: 'marathon_finisher',
    sunrise: 'sunrise_runner',
    invitation_sent: async (uid: string) => {
      const { count } = await supabase
        .from('run_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('from_user_id', uid);
      return (count ?? 0) >= 10 ? 'motivator' : null;
    },
    crew_activity: async (uid: string) => {
      const { data: crews } = await supabase
        .from('crews')
        .select('id')
        .eq('owner_id', uid);
      if (!crews || crews.length === 0) return null;
      for (const c of crews) {
        const { count } = await supabase
          .from('crew_members')
          .select('*', { count: 'exact', head: true })
          .eq('crew_id', c.id);
        if ((count ?? 0) >= 20) return 'crew_leader';
      }
      return null;
    },
  };

  const rule = rules[event];
  if (!rule) {
    return new Response(JSON.stringify({ awarded: false }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let code: string | null;
  if (typeof rule === 'function') {
    code = await rule(user_id);
  } else {
    code = rule;
  }

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
