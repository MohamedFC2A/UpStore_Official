import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { verifyBybitDepositRecord } from '@/utils/bybit';
import { fulfillOrderSession } from '@/utils/fulfillment';
import {
  enforceSameOriginRequest,
  requireAuthenticatedUser,
} from '@/utils/security';

export async function POST(req: Request) {
  try {
    const originError = await enforceSameOriginRequest(req);
    if (originError) {
      return originError;
    }

    const auth = await requireAuthenticatedUser().catch(() => ({ user: null, error: null }));
    const user = auth?.user || null;

    const body = await req.json().catch(() => ({}));
    const { sessionId, txId, coin = 'USDT' } = body || {};

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // Check order existence and ownership
    let query = supabaseAdmin
      .from('orders')
      .select('id, status, amount, user_id')
      .eq('session_id', sessionId);

    if (user) {
      query = query.eq('user_id', user.id);
    }

    const { data: orders, error: fetchErr } = await query;

    if (fetchErr || !orders || orders.length === 0) {
      return NextResponse.json({ error: 'Orders not found' }, { status: 404 });
    }

    // Check if already completed
    const isCompleted = orders.some(o => o.status === 'completed' || o.status === 'fulfilled');
    if (isCompleted) {
      return NextResponse.json({ success: true, verified: true, payment_status: 'paid' });
    }

    // If TXID is provided, attempt automated on-chain verification
    if (txId && typeof txId === 'string' && txId.trim().length >= 8) {
      const cleanTxId = txId.trim();

      // 1. Anti-Replay Check: Has this TXID already been redeemed on another order/transaction?
      const { data: existingTx } = await supabaseAdmin
        .from('transactions')
        .select('id, reference_id')
        .eq('reference_id', cleanTxId)
        .maybeSingle();

      const { data: existingOrderWithTx } = await supabaseAdmin
        .from('orders')
        .select('id, session_id')
        .eq('payment_transaction_id', cleanTxId)
        .neq('session_id', sessionId)
        .maybeSingle();

      if (existingTx || existingOrderWithTx) {
        return NextResponse.json({
          error: 'معرّف المعاملة (TXID) تم استخدامه واعتماده مسبقاً في طلب آخر.',
          success: false,
          verified: false,
        }, { status: 400 });
      }

      const totalOrderAmountUsd = orders.reduce((sum, o) => sum + Number(o.amount || 0), 0);
      const verification = await verifyBybitDepositRecord(cleanTxId, coin);

      // Verify on-chain status AND verified deposit amount matches or exceeds total (allowing 2% crypto slippage/rounding)
      const verifiedAmount = Number(verification.amount || 0);
      const isAmountValid = verifiedAmount >= (totalOrderAmountUsd * 0.98);

      if (verification.verified && isAmountValid) {
        console.log(`[Bybit Verify] TXID ${cleanTxId} (${verifiedAmount} ${coin}) verified for session ${sessionId}. Fulfilling...`);

        // Record transaction to lock TXID permanently
        await supabaseAdmin.from('transactions').insert({
          user_id: user?.id || orders[0].user_id,
          amount: verifiedAmount,
          type: 'purchase',
          status: 'completed',
          reference_id: cleanTxId,
          label: `Bybit Crypto Payment (${cleanTxId.substring(0, 12)}...)`,
        });

        // Update orders with transaction ID
        await supabaseAdmin
          .from('orders')
          .update({
            payment_transaction_id: cleanTxId,
            updated_at: new Date().toISOString(),
          })
          .eq('session_id', sessionId);

        const fulfilled = await fulfillOrderSession(sessionId);

        if (fulfilled) {
          return NextResponse.json({
            success: true,
            verified: true,
            payment_status: 'paid',
            message: 'Payment verified and orders fulfilled!',
          });
        }
      } else if (verification.verified && !isAmountValid) {
        console.warn(`[Bybit Verify] Amount mismatch for TXID ${cleanTxId}: required $${totalOrderAmountUsd}, deposited $${verifiedAmount}`);
        return NextResponse.json({
          success: false,
          verified: false,
          payment_status: 'underpaid',
          error: `المبلغ المودع في هذه المعاملة (${verifiedAmount} USDT) أقل من إجمالي الطلب المطلوب (${totalOrderAmountUsd.toFixed(2)} USDT).`,
        }, { status: 400 });
      }
    }

    // If not verified automatically, check current order status
    return NextResponse.json({
      success: false,
      verified: false,
      payment_status: 'pending',
      message: 'Payment confirmation pending or TXID not yet confirmed on blockchain.',
    });
  } catch (err: any) {
    console.error('[Bybit Verify Route Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
