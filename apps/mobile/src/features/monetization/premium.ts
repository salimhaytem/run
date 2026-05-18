import { supabase } from '@/lib/supabase';

export async function activatePremium(userId: string) {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('tier', 'premium')
    .maybeSingle();

  if (existing) {
    await supabase.from('subscriptions').update({ expires_at: expiresAt }).eq('id', existing.id);
  } else {
    await supabase.from('subscriptions').insert({
      user_id: userId,
      tier: 'premium',
      provider: 'revenuecat',
      expires_at: expiresAt,
    });
  }

  await supabase.from('profiles').update({ is_premium: true }).eq('id', userId);
  await supabase
    .from('sos_credits')
    .update({ credits_remaining: 15 })
    .eq('user_id', userId);
}

export async function cancelPremium(userId: string) {
  await supabase.from('subscriptions').update({ expires_at: new Date().toISOString() }).eq('user_id', userId).eq('tier', 'premium');
  await supabase.from('profiles').update({ is_premium: false }).eq('id', userId);
  await supabase.from('sos_credits').update({ credits_remaining: 5 }).eq('user_id', userId);
}

export async function sendTip(fromUserId: string, toUserId: string, amountCents: number, sosRequestId?: string) {
  const fee = Math.round(amountCents * 0.1);
  await supabase.from('tips').insert({
    from_user_id: fromUserId,
    to_user_id: toUserId,
    amount_cents: amountCents,
    platform_fee_cents: fee,
    sos_request_id: sosRequestId ?? null,
  });
}

export async function activatePartnerPlan(userId: string, tier: 'partner_basic' | 'partner_pro') {
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('tier', tier)
    .maybeSingle();

  if (existing) return;

  await supabase.from('subscriptions').insert({
    user_id: userId,
    tier,
    provider: 'stripe',
  });
}

export async function getSubscriptionStatus(userId: string) {
  const { data } = await supabase
    .from('subscriptions')
    .select('tier, provider, expires_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return { tier: 'free', active: false };
  const active = !data.expires_at || new Date(data.expires_at) > new Date();
  return { ...data, active };
}
