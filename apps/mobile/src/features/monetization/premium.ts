import { supabase } from '@/lib/supabase';

export async function activatePremium(userId: string) {
  await supabase.from('subscriptions').insert({
    user_id: userId,
    tier: 'premium',
    provider: 'revenuecat',
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
  await supabase.from('profiles').update({ is_premium: true }).eq('id', userId);
  await supabase
    .from('sos_credits')
    .update({ credits_remaining: 15 })
    .eq('user_id', userId);
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
  await supabase.from('subscriptions').insert({
    user_id: userId,
    tier,
    provider: 'stripe',
  });
}
