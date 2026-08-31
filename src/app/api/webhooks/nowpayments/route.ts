import { NextResponse } from 'next/server';
import { fulfillOrderSession } from '@/utils/fulfillment';
import { verifyNowPaymentsWebhook, getNowPaymentsCredentials } from '@/utils/nowpayments';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const signature =
      req.headers.get('x-nowpayments-sig') ||
      req.headers.get('X-NOWPayments-Sig') ||
      '';

    const { ipnSecret } = await getNowPaymentsCredentials();

    if (!ipnSecret) {
      console.error('[NOWPayments Webhook] Missing IPN Secret Key in configuration');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // Verify HMAC-SHA512 signature
    const isValid = verifyNowPaymentsWebhook(body, signature, ipnSecret);
    if (!isValid) {
      console.warn('[NOWPayments Webhook] Invalid signature received');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const { order_id: sessionId, payment_status, payment_id, actually_paid, pay_currency } = body;

    console.log(
      `[NOWPayments Webhook] Received notification for session ${sessionId}, status: ${payment_status}, payment_id: ${payment_id}, paid: ${actually_paid} ${pay_currency}`
    );

    // Status: 'finished' is final destination settlement, 'confirmed' is blockchain confirmed
    if (payment_status === 'finished' || payment_status === 'confirmed') {
      console.log(`[NOWPayments Webhook] Payment confirmed for session ${sessionId}. Fulfilling orders...`);
      try {
        await fulfillOrderSession(sessionId);
      } catch (fulfillErr) {
        console.error('[NOWPayments Webhook] Error fulfilling order:', fulfillErr);
      }
    }

    return NextResponse.json({ message: 'Webhook processed successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('[NOWPayments Webhook Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
