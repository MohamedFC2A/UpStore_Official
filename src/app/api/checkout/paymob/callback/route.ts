import { NextResponse } from 'next/server';
import { fulfillOrderSession } from '@/utils/fulfillment';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const success = searchParams.get('success');
    const pending = searchParams.get('pending');
    const txnResponseCode = searchParams.get('txn_response_code');
    const sessionId = searchParams.get('session_id') || searchParams.get('order_id') || searchParams.get('merchant_order_id');
    const transactionId = searchParams.get('id');

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const isSuccessful =
      success === 'true' ||
      pending === 'true' ||
      txnResponseCode === 'APPROVED' ||
      txnResponseCode === '200' ||
      txnResponseCode === '00' ||
      txnResponseCode === '0';

    if (isSuccessful && sessionId) {
      console.log(`[Paymob Callback] Payment verified for session ${sessionId} (TxID: ${transactionId}). Fulfilling...`);
      try {
        await fulfillOrderSession(sessionId);
      } catch (err) {
        console.error('[Paymob Callback] Error fulfilling order session:', err);
      }
      return NextResponse.redirect(`${appUrl}/checkout/success?session_id=${encodeURIComponent(sessionId)}`);
    }

    // Payment explicitly failed
    console.warn(`[Paymob Callback] Payment unsuccessful for session ${sessionId} (Success: ${success}, Code: ${txnResponseCode})`);
    return NextResponse.redirect(`${appUrl}/checkout/cancel?session_id=${encodeURIComponent(sessionId || '')}`);
  } catch (err) {
    console.error('[Paymob Callback Error]:', err);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${appUrl}/checkout/cancel`);
  }
}
