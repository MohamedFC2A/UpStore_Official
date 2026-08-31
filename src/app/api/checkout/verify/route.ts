import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { fulfillOrderSession } from '@/utils/fulfillment';
import { getBtcPayInvoice } from '@/utils/btcpay';
import { getRequiredEnv, requireAuthenticatedUser, enforceSameOriginRequest } from '@/utils/security';

function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, {
    apiVersion: '2026-05-27.dahlia' as any,
  });
}

export async function GET(req: Request) {
  try {
    const originError = await enforceSameOriginRequest(req);
    if (originError) return originError;

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // 1. Authenticate user
    const auth = await requireAuthenticatedUser();
    if (auth.error || !auth.user) {
      return auth.error!;
    }
    const user = auth.user;

    // Handle Free Checkout bypass
    if (sessionId.startsWith('free_')) {
      console.log(`[Verify API] Free checkout session detected: ${sessionId}. Bypassing payment check.`);
      return NextResponse.json({ success: true, payment_status: 'paid' });
    }

    // Determine if it is a BTCPay Server session
    const isBtcPay = !sessionId.startsWith('cs_');

    if (isBtcPay) {
      console.log(`[Verify API] Fetching invoice details from BTCPay Server for: ${sessionId}`);
      try {
        const invoice = await getBtcPayInvoice(sessionId);

        // Security check: Verify owner
        const metadataUserId = invoice.metadata?.userId;
        if (metadataUserId && metadataUserId !== user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Verify status
        if (invoice.status === 'Settled') {
          console.log(`[Verify API] BTCPay Invoice is SETTLED. Triggering synchronous fulfillment...`);
          const success = await fulfillOrderSession(sessionId);
          return NextResponse.json({ success, payment_status: 'paid' });
        } else {
          console.log(`[Verify API] BTCPay Invoice is not settled: ${invoice.status}`);
          return NextResponse.json({ 
            success: false, 
            payment_status: invoice.status, 
            message: 'Payment not settled or completed yet.' 
          });
        }
      } catch (btcErr: any) {
        console.error('[Verify API] BTCPay verify error:', btcErr);
        return NextResponse.json({ error: `BTCPay verification failed: ${btcErr.message}` }, { status: 400 });
      }
    }

    // Standard Stripe Session verification
    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe gateway is not configured on this environment.' }, { status: 400 });
    }
    console.log(`[Verify API] Fetching session details from Stripe for: ${sessionId}`);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Stripe session not found' }, { status: 404 });
    }

    if (session.metadata?.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify payment status
    if (session.payment_status === 'paid') {
      console.log(`[Verify API] Session is PAID. Triggering synchronous fulfillment...`);
      const success = await fulfillOrderSession(sessionId);
      return NextResponse.json({ success, payment_status: session.payment_status });
    } else {
      console.log(`[Verify API] Session is unpaid: ${session.payment_status}`);
      return NextResponse.json({ 
        success: false, 
        payment_status: session.payment_status, 
        message: 'Payment not completed or verified yet.' 
      });
    }
  } catch (err: any) {
    console.error('[Verify Route Error]:', err);
    return NextResponse.json({ error: 'An internal error occurred verifying checkout.' }, { status: 500 });
  }
}
