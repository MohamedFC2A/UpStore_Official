import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { fulfillOrderSession } from '@/utils/fulfillment';
import { getRequiredEnv } from '@/utils/security';

function getStripeClient() {
  return new Stripe(getRequiredEnv('STRIPE_SECRET_KEY'), {
    apiVersion: '2026-05-27.dahlia',
  });
}

// Removed getSupabaseAdmin in favor of createAdminClient

export async function POST(req: Request) {
  const stripe = getStripeClient();
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = getRequiredEnv('STRIPE_WEBHOOK_SECRET');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Retrieve metadata
    const metadata = session.metadata;
    const userId = metadata?.userId;

    if (metadata?.type === 'wallet_topup' && userId) {
      try {
        const amountAdded = parseFloat(metadata.amountAdded || '0');
        const amountTotal = (session.amount_total || 0) / 100;
        
        if (amountAdded > 0) {
          const { createAdminClient } = await import('@/utils/supabase/admin');
          const supabaseAdmin = createAdminClient();
          
          // Idempotency check: has this session already been processed?
          const { data: existingTx } = await supabaseAdmin
            .from('transactions')
            .select('id')
            .eq('reference_id', session.id)
            .maybeSingle();

          if (existingTx) {
            console.log(`[Stripe Webhook] Wallet top-up for session ${session.id} already processed.`);
            return NextResponse.json({ received: true });
          }
          
          // 1 & 2. Atomically increment wallet balance
          const { data: newBalance, error: rpcError } = await supabaseAdmin.rpc('increment_wallet_balance', {
            p_user_id: userId,
            amount: amountAdded
          });

          if (rpcError) {
            throw new Error(`Failed to increment wallet balance: ${rpcError.message}`);
          }
            
          // 3. Create a transaction record
          await supabaseAdmin.from('transactions').insert({
            user_id: userId,
            amount: amountAdded,
            type: 'credit_topup',
            status: 'completed',
            reference_id: session.id,
            label: `Wallet Top-Up (Stripe)`
          });

          // 4. Send notification
          await supabaseAdmin.from('notifications').insert({
            user_id: userId,
            title: 'Wallet Top-Up Successful!',
            message: `You have successfully added $${amountAdded.toFixed(2)} to your wallet.`,
            type: 'wallet'
          });

          // 5. Send Telegram Notification
          const { sendTelegramNotification, escapeHtml } = await import('@/utils/telegram');
          const userEmail = escapeHtml(session.customer_details?.email || 'Unknown Email');
          
          const telegramMessage = `
<b>عملية شحن محفظة جديدة!</b>
━━━━━━━━━━━━━━━━━━
<b>معلومات العميل:</b>
<b>البريد:</b> ${userEmail}
<b>بوابة الدفع:</b> Stripe

<b>المبلغ المشحون:</b> $${amountAdded.toFixed(2)}
<b>الرصيد الجديد المتوقع:</b> $${Number(newBalance || 0).toFixed(2)}

<i>تمت إضافة الرصيد لحساب العميل بنجاح.</i>
          `.trim();
          await sendTelegramNotification(telegramMessage);
        }
      } catch (err) {
        console.error('Error fulfilling wallet topup:', err);
        return NextResponse.json({ error: 'Error fulfilling wallet topup' }, { status: 500 });
      }
    } else if (userId && userId !== 'guest') {
      try {
        await fulfillOrderSession(session.id);
      } catch (err) {
        console.error('Error fulfilling order:', err);
        return NextResponse.json({ error: 'Error fulfilling order' }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
