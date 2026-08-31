import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  enforceSameOriginRequest,
  requireAuthenticatedUser,
} from '@/utils/security';
import { sendTelegramNotification, escapeHtml } from '@/utils/telegram';

export async function POST(req: Request) {
  try {
    const originError = await enforceSameOriginRequest(req);
    if (originError) {
      return originError;
    }

    const auth = await requireAuthenticatedUser().catch(() => ({ user: null, error: null }));
    const user = auth?.user || null;

    const body = await req.json().catch(() => ({}));
    const {
      sessionId,
      paymentSender,
      paymentTransactionId,
      paymentScreenshot,
      paymentMethod = 'manual_transfer',
      ocrResult,
      excessPreference = 'wallet',
      refundRecipientAccount = '',
      amountDiff = 0,
      clientTelemetry,
    } = body || {};

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Verify that the orders exist for this sessionId
    let query = supabaseAdmin
      .from('orders')
      .select('id, amount, product_id, user_id, products(name)')
      .eq('session_id', sessionId);
    
    if (user) {
      query = query.eq('user_id', user.id);
    }

    const { data: orders, error: fetchErr } = await query;

    if (fetchErr || !orders || orders.length === 0) {
      return NextResponse.json({ error: 'Orders not found' }, { status: 404 });
    }

    const effectiveUserId = user?.id || orders[0]?.user_id;

    // 2. Update the orders with manual payment details and update status to pending
    const updatePayload: Record<string, any> = {
      status: 'pending',
      payment_sender: paymentSender || ocrResult?.senderName || ocrResult?.senderAccount || ocrResult?.senderPhone || null,
      payment_transaction_id: paymentTransactionId || ocrResult?.referenceNumber || null,
      payment_screenshot: paymentScreenshot || null,
      updated_at: new Date().toISOString(),
    };
    if (clientTelemetry) {
      updatePayload.client_telemetry = clientTelemetry;
    }

    const { error: updateErr } = await supabaseAdmin
      .from('orders')
      .update(updatePayload)
      .eq('session_id', sessionId);

    if (updateErr) {
      console.error('[Manual Submit Error]:', updateErr);
      return NextResponse.json({ error: 'Failed to update payment details' }, { status: 500 });
    }

    // 3. Construct Currency & Amounts
    const isSaudi = paymentMethod.includes('stc') || paymentMethod.includes('alrajhi') || paymentMethod.includes('snb') || paymentMethod.includes('urpay') || sessionId.includes('_sar');
    const isUsd = paymentMethod.includes('bybit') || paymentMethod.includes('binance') || paymentMethod.includes('crypto') || sessionId.includes('_usd');
    const currency = isSaudi ? 'sar' : isUsd ? 'usd' : 'egp';
    const isLocal = currency === 'sar' || currency === 'egp';
    const rate = currency === 'sar' ? 4 : currency === 'usd' ? 1 : 53;

    const totalAmount = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
    const displayTotalAmount = isLocal ? Math.ceil(totalAmount * rate) : Math.ceil(totalAmount * rate * 100) / 100;

    // Group orders by product name
    const orderItems: Array<{ name: string; quantity: number; price: number }> = [];
    const counts: Record<string, { count: number; price: number }> = {};
    for (const ord of orders) {
      const pName = (ord as any).products?.name || 'Digital Product';
      if (!counts[pName]) {
        const itemPrice = isLocal ? Math.ceil(ord.amount * rate) : Math.ceil(ord.amount * rate * 100) / 100;
        counts[pName] = { count: 0, price: itemPrice };
      }
      counts[pName].count += 1;
    }

    for (const [pName, detail] of Object.entries(counts)) {
      orderItems.push({
        name: pName,
        quantity: detail.count,
        price: detail.price,
      });
    }

    // 4. Create an in-app notification for the user
    if (effectiveUserId) {
      try {
        const isStrict = ocrResult?.status === 'strict_review' || ocrResult?.recipientStatus === 'recipient_missing';
        const shortSession = sessionId.slice(0, 8);
        const formattedAmountStr = isLocal ? `${displayTotalAmount}` : displayTotalAmount.toFixed(2);
        await supabaseAdmin.from('notifications').insert({
          user_id: effectiveUserId,
          title: isStrict ? 'إثبات الدفع قيد المراجعة المشددة' : 'تم استلام إثبات الدفع بنجاح',
          message: isStrict
            ? `تم استلام إيصال طلبك #${shortSession} وهو قيد المراجعة والتدقيق اليدوي المشدد لعدم وضوح اسم المحول إليه الكامل في الصورة.`
            : `تم استلام إثبات التحويل لطلبك #${shortSession} بقيمة ${formattedAmountStr} ${currency.toUpperCase()}. جاري الاعتماد الفوري.`,
          type: 'order_update',
          is_read: false,
        });
      } catch (notifErr) {
        console.error('[Notification Insert Error]:', notifErr);
      }
    }

    // 5. Dispatch alert to dedicated @UpStore_payment_bot
    try {
      const { detectSmartLocation } = await import('@/utils/geo');
      const geo = await detectSmartLocation(req);

      const { dispatchPaymentAlertToAdmin } = await import('@/utils/telegramPaymentBot');
      await dispatchPaymentAlertToAdmin({
        sessionId,
        userId: effectiveUserId || 'guest',
        customerEmail: user?.email || 'Guest User',
        customerLocation: geo.formattedLocation,
        customerIp: geo.ip,
        paymentMethod,
        totalAmount: displayTotalAmount,
        currency,
        orderItems,
        paymentSender: paymentSender || ocrResult?.senderName || ocrResult?.senderAccount || ocrResult?.senderPhone,
        paymentTransactionId: paymentTransactionId || ocrResult?.referenceNumber,
        paymentScreenshot,
        ocrResult,
        excessPreference,
        refundRecipientAccount,
        amountDiff,
        clientTelemetry,
      });
    } catch (tgErr) {
      console.error('[Payment Bot Alert Error]:', tgErr);
    }

    return NextResponse.json({ success: true, redirectUrl: `/track?session_id=${encodeURIComponent(sessionId)}` });
  } catch (err: any) {
    console.error('[Manual Submit Route Error]:', err);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
