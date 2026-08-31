import { NextResponse } from 'next/server';
import { fulfillOrderSession } from '@/utils/fulfillment';
import { verifyLemonSqueezyWebhook, getLemonSqueezyCredentials } from '@/utils/lemonsqueezy';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const signature = req.headers.get('x-signature') || '';

    const credentials = await getLemonSqueezyCredentials();
    const webhookSecret = credentials?.webhookSecret || process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

    if (webhookSecret) {
      const isValid = verifyLemonSqueezyWebhook(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.warn('[Lemon Squeezy Webhook] Invalid signature received');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else {
      console.warn('[Lemon Squeezy Webhook] No webhook secret configured - processing in open development mode');
    }

    const eventName = body.meta?.event_name || req.headers.get('x-event-name');
    const customData = body.meta?.custom_data || {};
    const sessionId = customData.session_id;
    const orderStatus = body.data?.attributes?.status;

    console.log(
      `[Lemon Squeezy Webhook] Event: ${eventName}, Status: ${orderStatus}, Session: ${sessionId}`
    );

    if (eventName === 'order_created' && (orderStatus === 'paid' || orderStatus === 'processed')) {
      if (sessionId) {
        console.log(`[Lemon Squeezy Webhook] Fulfilling order session: ${sessionId}`);
        try {
          await fulfillOrderSession(sessionId);
        } catch (fulfillErr) {
          console.error('[Lemon Squeezy Webhook] Error fulfilling order:', fulfillErr);
        }
      }
    }

    return NextResponse.json({ message: 'Webhook processed successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('[Lemon Squeezy Webhook Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
