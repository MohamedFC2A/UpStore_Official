import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireAuthenticatedUser } from '@/utils/security';
import { isAdminIdentity } from '@/utils/auth';

export async function POST(req: Request) {
  try {
    const auth = await requireAuthenticatedUser();
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, email')
      .eq('id', auth.user.id)
      .maybeSingle();

    const isUserAdmin = profile?.role === 'admin' || isAdminIdentity({ id: auth.user.id, email: auth.user.email });
    if (!isUserAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { gatewayId, enabled } = body;

    if (!gatewayId || typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid gatewayId or enabled state' }, { status: 400 });
    }

    // Map gatewayId to site_settings key
    const KEY_MAP: Record<string, string> = {
      bybit: 'enable_bybit',
      binance_pay: 'enable_binance_pay',
      stripe: 'enable_stripe',
      lemonsqueezy: 'enable_lemonsqueezy',
      nowpayments: 'enable_nowpayments',
      cryptomus: 'enable_cryptomus',
      btcpay: 'enable_btcpay',
      paymob: 'enable_paymob',
      egypt_manual: 'enable_egypt_manual',
      saudi_manual: 'enable_saudi_manual',
      instapay: 'enable_instapay',
      vodafone_cash: 'enable_vodafone_cash',
      stc_pay: 'enable_stc_pay',
      alrajhi: 'enable_alrajhi',
    };

    const settingKey = KEY_MAP[gatewayId] || `enable_${gatewayId}`;

    // Upsert into site_settings
    const { error: upsertError } = await supabaseAdmin.from('site_settings').upsert({
      key: settingKey,
      value: enabled,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });

    if (upsertError) {
      console.error('[ADMIN_GATEWAY_TOGGLE_DB_ERROR]:', upsertError);
      return NextResponse.json({ error: 'Failed to update gateway setting in database' }, { status: 500 });
    }

    console.log(`[ADMIN_GATEWAY_TOGGLE] Gateway '${gatewayId}' set to ${enabled} by ${auth.user.email}`);

    return NextResponse.json({
      success: true,
      gatewayId,
      settingKey,
      enabled,
      message: `Gateway '${gatewayId}' successfully ${enabled ? 'enabled' : 'disabled'}`,
    });
  } catch (error: any) {
    console.error('[ADMIN_GATEWAY_TOGGLE_ERROR]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to toggle gateway' },
      { status: 500 }
    );
  }
}
