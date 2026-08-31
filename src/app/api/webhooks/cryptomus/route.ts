import { NextResponse } from 'next/server';
import { fulfillOrderSession } from '@/utils/fulfillment';
import { verifyCryptomusWebhook } from '@/utils/cryptomus';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const { sign } = body;
    let apiKey = process.env.CRYPTOMUS_API_KEY || '';

    if (!apiKey) {
      try {
        const { createAdminClient } = await import('@/utils/supabase/admin');
        const supabaseAdmin = createAdminClient();
        const { data } = await supabaseAdmin
          .from('site_settings')
          .select('value')
          .eq('key', 'cryptomus_api_key')
          .maybeSingle();
        if (data?.value) apiKey = String(data.value);
      } catch {
        // ignore
      }
    }

    // Verify signature
    const isValid = verifyCryptomusWebhook(body, sign, apiKey);
    if (!isValid) {
      console.warn('[Cryptomus Webhook] Invalid signature received');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const { order_id: sessionId, status, is_final } = body;

    console.log(`[Cryptomus Webhook] Received notification for session ${sessionId}, status: ${status}, is_final: ${is_final}`);

    // Status: 'paid' or 'paid_over'
    if (status === 'paid' || status === 'paid_over') {
      console.log(`[Cryptomus Webhook] Payment confirmed for ${sessionId}. Fulfilling orders...`);
      try {
        await fulfillOrderSession(sessionId);
      } catch (fulfillErr) {
        console.error('[Cryptomus Webhook] Error fulfilling order:', fulfillErr);
      }
    }

    return NextResponse.json({ message: 'Webhook processed successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('[Cryptomus Webhook Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
