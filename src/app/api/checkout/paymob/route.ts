import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { createPaymobPaymentKey } from '@/utils/paymob';
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

    const body = await req.json().catch(() => ({}));
    const { items, paymentMethod = 'paymob_wallet', phone, couponCode, isWalletTopup, totalUsd } = body || {};

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

    // ─── WALLET TOP-UP FLOW FOR PAYMOB ───
    if (isWalletTopupMode) {
      const topupAmount = Number(items[0]?.product?.our_price || items[0]?.product?.price || items[0]?.amount || totalUsd || 10);
      if (typeof topupAmount !== 'number' || !Number.isFinite(topupAmount) || topupAmount < 1 || topupAmount > 10000) {
        return NextResponse.json({ error: 'الحد الأدنى للشحن هو 1$' }, { status: 400 });
      }

      const pricingTotals = calculateOrderTotals([], couponCode, topupAmount);
      const totalEgp = pricingTotals.totalEgp;
      const sessionId = `paymob_wallet_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const orderToInsert = {
        user_id: user.id,
        product_id: null,
        variant_id: null,
        amount: topupAmount,
        status: 'pending_manual_payment',
        product_key: 'WALLET_TOPUP_PENDING',
        session_id: sessionId,
        payment_sender: `Paymob ${paymentMethod} • شحن محفظة`,
      };

      const { error: insertErr } = await supabaseAdmin.from('orders').insert([orderToInsert]);
      if (insertErr) {
        console.error('[Paymob Wallet Top-Up DB Insert Error]:', insertErr);
        return NextResponse.json({ error: 'Failed to record topup order' }, { status: 500 });
      }

      const isCard = paymentMethod === 'paymob_card';
      const orderItemsPayload = [
        {
          name: 'UpStore Wallet Top-Up (شحن محفظة)',
          amount_cents: Math.round(totalEgp * 100),
          quantity: 1,
        },
      ];

      const userEmail = user.email || 'customer@upstore.one';
      const amountInCents = Math.round(totalEgp * 100);

      const paymobRes = await createPaymobPaymentKey({
        amountCents: amountInCents,
        currency: 'EGP',
        orderId: sessionId,
        sessionId,
        email: userEmail,
        phone: phone || user.phone || '+201012345678',
        paymentMethod: paymentMethod,
        items: orderItemsPayload,
      });

      return NextResponse.json({
        url: paymobRes.checkoutUrl,
        sessionId,
        paymentToken: paymobRes.paymentToken,
        amountEgp: totalEgp,
      });
    }
    const productIds = items.map((i: any) => i.product_id || i.product?.id).filter(Boolean);

    const { getActiveFlashDealSlugFromDb } = await import('@/utils/products');
    const activeFlashSlug = await getActiveFlashDealSlugFromDb(supabaseAdmin);

    const { data: dbProducts } = await supabaseAdmin
      .from('products')
      .select('id, slug, market_price, name, our_price, price_egp, price_sar, delivery_mode, zelenka_api_key, zelenka_product_id, stock, is_flash_deal, flash_deal_price, flash_deal_duration_hours, updated_at')
      .in('id', productIds);

    const productMap = new Map(
      dbProducts?.map((p) => {
        const norm = normalizeProductRecord(p, activeFlashSlug);
        return [norm.id, norm];
      }) || []
    );

    const variantIds = items.map((i: any) => i.variant_id || i.variant?.id).filter(Boolean);
    let variantMap = new Map();
    if (variantIds.length > 0) {
      const { data: dbVariants } = await supabaseAdmin
        .from('product_variants')
        .select('*')
        .in('id', variantIds);
      variantMap = new Map(dbVariants?.map((v) => [v.id, v]) || []);
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
        return NextResponse.json(
          {
            error: `المنتج "${displayName}" غير متوفر بالكمية المطلوبة. المتاح حالياً: ${currentStock}`,
          },
          { status: 400 }
        );
      }
    }

    // Calculate total in EGP (1 EGP = 100 cents/piastres)
    let subtotalEgp = 0;
    const orderItemsPayload: Array<{ name: string; amount_cents: number; quantity: number }> = [];

    for (const item of items) {
      const prodId = item.product_id || item.product?.id;
      const variantId = item.variant_id || item.variant?.id;
      const dbProd = productMap.get(prodId);
      const dbVariant = variantId ? variantMap.get(variantId) : (item.variant || null);
      if (!dbProd) continue;

      const unitUsd = Number(
        dbVariant?.our_price !== undefined && dbVariant?.our_price !== null
          ? dbVariant.our_price
          : (dbProd.our_price || 0)
      );

      let itemPriceEgp = dbVariant?.price_egp
        ? Number(dbVariant.price_egp)
        : (dbProd.price_egp ? Number(dbProd.price_egp) : Math.ceil(unitUsd * 53));

      const qty = Math.min(Math.max(1, Number(item.quantity) || 1), 100);
      const lineTotal = itemPriceEgp * qty;
      subtotalEgp += lineTotal;

      orderItemsPayload.push({
        name: dbVariant ? `${dbProd.name} (${dbVariant.name})` : dbProd.name,
        amount_cents: Math.round(itemPriceEgp * 100),
        quantity: qty,
      });
    }

    // Apply coupon discount & 5% VAT
    let discountPct = 0;
    if (couponCode) {
      const code = String(couponCode).trim().toUpperCase();
      if (code === 'UPSTORE10' || code === 'SAVE10') {
        discountPct = 10;
      } else if (code === 'UPSTORE20' || code === 'VIP20') {
        if (subtotalEgp >= 20 * 53) discountPct = 20;
      }
    }

    const discountAmount = (subtotalEgp * discountPct) / 100;
    const discountedSubtotal = Math.max(0, subtotalEgp - discountAmount);
    const taxAmount = discountedSubtotal * 0.05; // 5% VAT
    const totalEgp = Math.ceil(discountedSubtotal + taxAmount);

    const sessionId = `paymob_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Create pending orders in database
    const orderInserts = [];
    for (const item of items) {
      const prodId = item.product_id || item.product?.id;
      const variantId = item.variant_id || item.variant?.id || null;
      const dbProd = productMap.get(prodId)!;
      const dbVariant = variantId ? variantMap.get(variantId) : null;

      const unitAmount = Number(dbVariant ? dbVariant.our_price : (dbProd?.our_price || 0));
      const qty = Math.min(Math.max(1, Number(item.quantity) || 1), 100);

      for (let q = 0; q < qty; q++) {
        orderInserts.push({
          user_id: user.id,
          product_id: prodId,
          variant_id: variantId,
          amount: unitAmount,
          status: 'pending',
          product_key: 'PENDING_FULFILLMENT',
          session_id: sessionId,
        });
      }
    }

    const { error: insertErr } = await supabaseAdmin.from('orders').insert(orderInserts);
    if (insertErr) {
      console.error('[Paymob Checkout] Error creating orders:', insertErr);
      return NextResponse.json({ error: 'Failed to create order records' }, { status: 500 });
    }

    // Call Paymob 3-step checkout API
    const userEmail = user.email || 'customer@upstore.one';
    const amountInCents = Math.round(totalEgp * 100);

    const paymobRes = await createPaymobPaymentKey({
      amountCents: amountInCents,
      currency: 'EGP',
      orderId: sessionId,
      sessionId,
      email: userEmail,
      phone: phone || user.phone || '+201012345678',
      paymentMethod: paymentMethod,
      items: orderItemsPayload,
    });

    return NextResponse.json({
      url: paymobRes.checkoutUrl,
      sessionId,
      paymentToken: paymobRes.paymentToken,
    });
  } catch (error: any) {
    console.error('[Paymob Checkout Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate Paymob checkout' },
      { status: 500 }
    );
  }
}
