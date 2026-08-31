import { NextResponse } from 'next/server';
import { getPaymobConfig, verifyPaymobHmac } from '@/utils/paymob';
import { fulfillOrderSession } from '@/utils/fulfillment';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const receivedHmac = searchParams.get('hmac') || '';

    const body = await req.json().catch(() => ({}));
    const transaction = body.obj || body;

    const config = await getPaymobConfig();

    // Verify HMAC
    if (config.hmacSecret) {
      if (!receivedHmac) {
        console.warn('[Paymob Webhook] Rejected webhook with missing HMAC signature.');
        return NextResponse.json({ error: 'Missing HMAC signature' }, { status: 401 });
      }
      const isValid = verifyPaymobHmac(transaction, receivedHmac, config.hmacSecret);
      if (!isValid) {
        console.warn('[Paymob Webhook] Invalid HMAC signature received.');
        return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === 'production') {
      console.error('[Paymob Webhook] Missing PAYMOB_HMAC secret in production configuration.');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const isSuccess = transaction.success === true || transaction.success === 'true';
    const sessionId = transaction.order?.merchant_order_id || transaction.order?.id || transaction.extras?.session_id;

    if (isSuccess && sessionId) {
      console.log(`[Paymob Webhook] Transaction ${transaction.id} SUCCESS for session ${sessionId}. Fulfilling...`);
      await fulfillOrderSession(String(sessionId));
      return NextResponse.json({ success: true, message: 'Order fulfilled' });
    }

    return NextResponse.json({ success: true, message: 'Webhook received' });
  } catch (err: any) {
    console.error('[Paymob Webhook Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal webhook error' }, { status: 500 });
  }
}
