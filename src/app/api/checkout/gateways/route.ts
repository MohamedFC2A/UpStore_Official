import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET() {
  try {
    const supabaseAdmin = createAdminClient();
    const { data: settingsData } = await supabaseAdmin.from('site_settings').select('key, value');
    
    const enabledState: Record<string, boolean> = {
      bybit: true,
      binance_pay: true,
      stripe: true,
      lemonsqueezy: true,
      nowpayments: true,
      cryptomus: true,
      btcpay: true,
      paymob: true,
      egypt_manual: true,
      saudi_manual: true,
      vodafone_cash: true,
      instapay: true,
      orange_cash: true,
      stc_pay: true,
      alrajhi: true,
    };

    if (settingsData) {
      for (const item of settingsData) {
        if (item.key.startsWith('enable_')) {
          const gw = item.key.replace('enable_', '');
          enabledState[gw] = Boolean(item.value);
        }
      }
    }

    return NextResponse.json({
      success: true,
      enabledGateways: enabledState,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: true,
      enabledGateways: {
        bybit: true,
        binance_pay: true,
        stripe: true,
        nowpayments: true,
        cryptomus: true,
        btcpay: true,
        egypt_manual: true,
        saudi_manual: true,
      },
    });
  }
}
