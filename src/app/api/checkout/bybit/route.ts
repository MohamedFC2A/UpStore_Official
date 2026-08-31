import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getBybitConfig, getBybitDepositAddress } from '@/utils/bybit';
import { normalizeProductRecord } from '@/utils/products';
import { calculateOrderTotals } from '@/utils/pricing';
import {
  enforceSameOriginRequest,
  getConfiguredAppOrigin,
  requireAuthenticatedUser,
} from '@/utils/security';
import { getZelenkaStock } from '@/utils/zelenka';

export async function POST(req: Request) {
  try {
    const originError = await enforceSameOriginRequest(req);
    if (originError) {
      return originError;
    }

    const auth = await requireAuthenticatedUser();
    if (auth.error || !auth.user) {
      return auth.error!;
    }
    const user = auth.user;

    // Check active Arab local payment countdown restriction
    const { checkActiveLocalPaymentRestriction } = await import('@/utils/localPaySecurity');
    const localPayCheck = await checkActiveLocalPaymentRestriction(user.id);
    if (localPayCheck.restricted) {
      return NextResponse.json({
        error: 'ACTIVE_LOCAL_PAYMENT_IN_PROGRESS',
        message: 'لديك طلب دفع محلي قيد المتابعة والعد التنازلي حالياً. لا يمكنك بدء عملية دفع جديدة حتى إتمام الطلب الحالي أو انتهاء مهلة العداد.',
        activeOrderId: localPayCheck.orderId,
      }, { status: 409 });
    }

    const body = await req.json().catch(() => ({}));
    const { items, network = 'TRC20', couponCode, isWalletTopup, totalUsd } = body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    if (items.length > 50) {
      return NextResponse.json({ error: 'Too many items in cart' }, { status: 400 });
    }

    const isWalletTopupMode = Boolean(
      isWalletTopup ||
      items.some((i: any) => i.product_id === 'wallet_topup' || i.id === 'wallet_topup' || i.product?.id === 'wallet_topup' || i.product?.delivery_mode === 'wallet_topup')
    );

    const supabaseAdmin = createAdminClient();

    // ─── WALLET TOP-UP FLOW FOR BYBIT ───
    if (isWalletTopupMode) {
      const topupAmount = Number(items[0]?.product?.our_price || items[0]?.product?.price || items[0]?.amount || totalUsd || 10);
      if (typeof topupAmount !== 'number' || !Number.isFinite(topupAmount) || topupAmount < 1 || topupAmount > 10000) {
        return NextResponse.json({ error: 'الحد الأدنى للشحن هو 1$' }, { status: 400 });
      }

      const pricingTotals = calculateOrderTotals([], couponCode, topupAmount);
      const totalUsdAmount = pricingTotals.totalUsd;

      // Fetch Bybit details
      const bybitCfg = await getBybitConfig();
      const depositInfo = await getBybitDepositAddress('USDT', network);
      const sessionId = `bybit_wallet_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const orderToInsert = {
        user_id: user.id,
        product_id: null,
        variant_id: null,
        amount: topupAmount,
        status: 'pending_manual_payment',
        product_key: 'WALLET_TOPUP_PENDING',
        session_id: sessionId,
        payment_sender: `Bybit ${network} • شحن محفظة`,
      };

      const { error: insertErr } = await supabaseAdmin.from('orders').insert([orderToInsert]);
      if (insertErr) {
        console.error('[Bybit Wallet Checkout Error]:', insertErr);
        return NextResponse.json({ error: 'Failed to create order.' }, { status: 500 });
      }

      // Send Telegram alert
      try {
        const { sendTelegramNotification, escapeHtml } = await import('@/utils/telegram');
        const shortId = sessionId.replace('bybit_wallet_', '').substring(0, 8).toUpperCase();
        const telegramMsg = `
<b>طلب شحن رصيد محفظة عبر Bybit / USDT جديد!</b>
━━━━━━━━━━━━━━━━━━
<b>رقم الطلب:</b> <code>#${shortId}</code>
<b>الجلسة:</b> <code>${sessionId}</code>
<b>العميل:</b> ${escapeHtml(user.email || 'Unknown')}
<b>رصيد الشحن المضاف:</b> <code>$${topupAmount.toFixed(2)}</code>
<b>الضريبة (5% VAT):</b> <code>+$${pricingTotals.taxUsd.toFixed(2)}</code>
<b>إجمالي المبلغ المطلوب بالـ USDT:</b> <code>${totalUsdAmount.toFixed(2)} USDT</code>
<b>الشبكة المحددة:</b> <code>${network}</code>
        `.trim();
        await sendTelegramNotification(telegramMsg);
      } catch (tErr) {
        console.warn('[Telegram Alert Error]:', tErr);
      }

      const origin = getConfiguredAppOrigin();
      const checkoutUrl = `${origin}/checkout/bybit?session_id=${sessionId}&amount=${totalUsdAmount}&network=${network}`;

      return NextResponse.json({
        url: checkoutUrl,
        sessionId,
        amount: totalUsdAmount,
        network,
        depositAddress: depositInfo?.address || bybitCfg.usdtTrc20Address,
        uid: bybitCfg.uid,
      });
    }
    const productIds = items.map((i: any) => i.product_id || i.product?.id).filter(Boolean);

    const { getActiveFlashDealSlugFromDb } = await import('@/utils/products');
    const activeFlashSlug = await getActiveFlashDealSlugFromDb(supabaseAdmin);

    const { data: dbProducts } = await supabaseAdmin
      .from('products')
      .select('id, slug, market_price, name, our_price, price_egp, price_sar, delivery_mode, zelenka_api_key, zelenka_product_id, stock, is_flash_deal, flash_deal_price, flash_deal_duration_hours, updated_at')
      .in('id', productIds);

    const productMap = new Map(dbProducts?.map(p => {
      const norm = normalizeProductRecord(p, activeFlashSlug);
      return [norm.id, norm];
    }) || []);

    const variantIds = items.map((i: any) => i.variant_id || i.variant?.id).filter(Boolean);
    let variantMap = new Map();
    if (variantIds.length > 0) {
      const { data: dbVariants } = await supabaseAdmin
        .from('product_variants')
        .select('*')
        .in('id', variantIds);
      variantMap = new Map(dbVariants?.map(v => [v.id, v]) || []);
    }

    // Check stock
    for (const item of items) {
      const prodId = item.product_id || item.product?.id;
      const variantId = item.variant_id || item.variant?.id;
      const dbProd = productMap.get(prodId) as any;
      const dbVariant = variantId ? (variantMap.get(variantId) as any) : null;
      
      if (!dbProd) {
        return NextResponse.json({ error: `Product not found: ${prodId}` }, { status: 400 });
      }

      const quantity = Math.min(Math.max(1, Number(item.quantity) || 1), 100);
      let currentStock = dbVariant ? Number(dbVariant.stock || 0) : Number(dbProd.stock || 0);

      if (dbProd.delivery_mode === 'zelenka_api') {
        const targetZelenkaProductId = dbVariant?.zelenka_product_id || dbProd.zelenka_product_id;
        const apiKey = dbProd.zelenka_api_key || process.env.ZELENKA_API_KEY;
        if (apiKey && targetZelenkaProductId) {
          currentStock = await getZelenkaStock(apiKey, targetZelenkaProductId);
        }
      }

      if (currentStock < quantity) {
        const displayName = dbVariant ? `${dbProd.name} - ${dbVariant.name}` : dbProd.name;
        return NextResponse.json({
          error: `المنتج "${displayName}" غير متوفر بالكمية المطلوبة. المتاح حالياً: ${currentStock}`
        }, { status: 400 });
      }
    }

    // Calculate total USD/USDT
    let subtotalUsd = 0;
    for (const item of items) {
      const prodId = item.product_id || item.product?.id;
      const variantId = item.variant_id || item.variant?.id;
      const dbProd = productMap.get(prodId);
      const dbVariant = variantId ? variantMap.get(variantId) : null;
      if (!dbProd) continue;

      const unitAmountUsd = Number(dbVariant ? dbVariant.our_price : (dbProd.our_price || 0));
      const quantity = Math.min(Math.max(1, Number(item.quantity) || 1), 100);
      subtotalUsd += (unitAmountUsd * quantity);
    }

    if (subtotalUsd <= 0) {
      return NextResponse.json({ error: 'Invalid total amount' }, { status: 400 });
    }

    // Apply coupon discount & 5% VAT
    let discountPct = 0;
    if (couponCode) {
      const code = String(couponCode).trim().toUpperCase();
      if (code === 'UPSTORE10' || code === 'SAVE10') {
        discountPct = 10;
      } else if (code === 'UPSTORE20' || code === 'VIP20') {
        if (subtotalUsd >= 20) discountPct = 20;
      }
    }

    const discountAmount = (subtotalUsd * discountPct) / 100;
    const discountedSubtotal = Math.max(0, subtotalUsd - discountAmount);
    const taxAmount = discountedSubtotal * 0.05; // 5% VAT
    const totalUsdAmount = discountedSubtotal + taxAmount;

    // Fetch Bybit details (live address or static fallback)
    const bybitCfg = await getBybitConfig();
    const depositInfo = await getBybitDepositAddress('USDT', network);

    const sessionId = `bybit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Create pending orders in DB
    const ordersToInsert = [];
    for (const item of items) {
      const prodId = item.product_id || item.product?.id;
      const variantId = item.variant_id || item.variant?.id || null;
      const dbProd = productMap.get(prodId);
      const dbVariant = variantId ? variantMap.get(variantId) : null;
      const unitAmount = Number(dbVariant ? dbVariant.our_price : (dbProd?.our_price || 0));
      const quantity = Math.min(Math.max(1, Number(item.quantity) || 1), 100);

      for (let i = 0; i < quantity; i++) {
        ordersToInsert.push({
          user_id: user.id,
          product_id: prodId,
          variant_id: variantId,
          amount: unitAmount,
          status: 'pending_manual_payment',
          product_key: 'PENDING_FULFILLMENT',
          session_id: sessionId,
        });
      }
    }

    if (ordersToInsert.length > 0) {
      const { error: insertErr } = await supabaseAdmin.from('orders').insert(ordersToInsert);
      if (insertErr) {
        console.error('[Bybit Checkout Error]:', insertErr);
        return NextResponse.json({ error: 'Failed to create order.' }, { status: 500 });
      }
    }

    // Send Telegram alert
    try {
      const { sendTelegramNotification, escapeHtml } = await import('@/utils/telegram');
      const shortId = sessionId.replace('bybit_', '').substring(0, 8).toUpperCase();
      const telegramMsg = `
<b>طلب دفع بالعملات الرقمية (Bybit / USDT) جديد!</b>
━━━━━━━━━━━━━━━━━━
<b>رقم الطلب:</b> <code>#${shortId}</code>
<b>الجلسة:</b> <code>${sessionId}</code>
<b>العميل:</b> ${escapeHtml(user.email || 'Unknown')}
<b>المبلغ المطلوب:</b> <code>${totalUsdAmount.toFixed(2)} USDT</code>
<b>الشبكة المحددة:</b> <code>${network}</code>
      `.trim();
      await sendTelegramNotification(telegramMsg);
    } catch (tErr) {
      console.warn('[Telegram Alert Error]:', tErr);
    }

    return NextResponse.json({
      success: true,
      sessionId,
      totalAmountUsdt: totalUsdAmount,
      bybitUid: bybitCfg.uid,
      depositAddress: depositInfo?.address || bybitCfg.usdtTrc20Address,
      network: depositInfo?.chain || network,
      binancePayId: bybitCfg.binancePayId,
      url: `/checkout/manual-success?session_id=${sessionId}&method=bybit&currency=usd`,
    });
  } catch (err: any) {
    console.error('[Bybit Checkout Route Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
