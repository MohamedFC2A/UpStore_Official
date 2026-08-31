import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  enforceSameOriginRequest,
  getConfiguredAppOrigin,
  getRequiredEnv,
  requireAuthenticatedUser,
} from '@/utils/security';

function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, {
    apiVersion: '2026-05-27.dahlia' as any,
  });
}

export async function POST(req: Request) {
  try {
    const originError = await enforceSameOriginRequest(req);
    if (originError) {
      return originError;
    }

    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json(
        { error: 'بوابة الدفع بالبطاقات البنكية غير مهيأة حالياً.' },
        { status: 400 }
      );
    }

    const auth = await requireAuthenticatedUser();
    if (auth.error || !auth.user) {
      return auth.error!;
    }
    const user = auth.user;

    const body = await req.json().catch(() => ({}));
    const { amount, currency = 'usd' } = body || {};

    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 1 || amount > 1000) {
      return NextResponse.json({ error: 'Minimum top up amount is 1' }, { status: 400 });
    }

    const origin = getConfiguredAppOrigin();

    // Create a stripe session for Wallet Top Up
    const session = await stripe.checkout.sessions.create({
      automatic_payment_methods: { enabled: true },
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: 'Wallet Top-Up (UpStore)',
              description: 'Add funds to your secure digital wallet.',
              images: ['https://upstore.one/logo.png'], // Add a generic logo
            },
            unit_amount: Math.ceil(amount * 100), // convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/dashboard?tab=wallet&topup_success=true`,
      cancel_url: `${origin}/dashboard?tab=wallet&topup_canceled=true`,
      customer_email: user.email,
      metadata: {
        type: 'wallet_topup',
        userId: user.id,
        amountAdded: amount.toString(),
      },
    } as any);

    return NextResponse.json({ url: session.url, success: true });

  } catch (error: any) {
    console.error('Wallet Top-Up Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred during wallet top-up' },
      { status: 500 }
    );
  }
}
