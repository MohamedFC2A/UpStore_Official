import { NextResponse } from 'next/server';
import { fulfillOrderSession } from '@/utils/fulfillment';
import { verifyBtcPayWebhookSignature } from '@/utils/btcpay';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('btcpay-sig') || req.headers.get('Btcpay-Sig');

    // Verify webhook signature
    const isValid = verifyBtcPayWebhookSignature(rawBody, signatureHeader);
    if (!isValid) {
      console.error('[BTCPay Webhook] Webhook signature verification failed.');
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    if (!rawBody || !rawBody.trim()) {
      return NextResponse.json({ error: 'Empty body' }, { status: 400 });
    }

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }
    console.log(`[BTCPay Webhook] Received webhook event: ${payload.type} for invoice: ${payload.invoiceId}`);

    // We fulfill the order when the invoice is Settled (fully paid)
    // In BTCPay Server, 'InvoiceSettled' is sent when the invoice is fully settled (confirmed on chain / lightning)
    // 'InvoiceProcessing' can be sent when paid but unconfirmed, but Settled is the safest.
    if (payload.type === 'InvoiceSettled') {
      const invoiceId = payload.invoiceId;
      if (!invoiceId) {
        return NextResponse.json({ error: 'Missing invoiceId in payload' }, { status: 400 });
      }

      console.log(`[BTCPay Webhook] Fulfilling order session for invoice: ${invoiceId}`);
      const success = await fulfillOrderSession(invoiceId);
      
      if (success) {
        return NextResponse.json({ received: true, fulfilled: true });
      } else {
        return NextResponse.json({ received: true, fulfilled: false, message: 'Fulfillment was skipped or already processed' });
      }
    }

    return NextResponse.json({ received: true, message: `Ignored event type: ${payload.type}` });
  } catch (err: any) {
    console.error('[BTCPay Webhook Error]:', err);
    return NextResponse.json({ error: 'Internal server error processing webhook' }, { status: 500 });
  }
}
