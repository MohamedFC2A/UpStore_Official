import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireAuthenticatedUser, enforceSameOriginRequest } from '@/utils/security';
import { createCryptomusPayment } from '@/utils/cryptomus';

export async function POST(req: Request) {
  try {
    const originError = await enforceSameOriginRequest(req);
    if (originError) {
      return originError;
    }

    const auth = await requireAuthenticatedUser();
    if (auth.error || !auth.user) {
      return auth.error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = auth.user;

    const body = await req.json().catch(() => ({}));
    const { items, currency = 'USD', couponCode } = body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    if (items.length > 50) {
      return NextResponse.json({ error: 'Too many items in cart' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const productIds = items.map((i: any) => i.product_id || i.product?.id).filter(Boolean);

    const { getActiveFlashDealSlugFromDb } = await import('@/utils/products');
    const activeFlashSlug = await getActiveFlashDealSlugFromDb(supabaseAdmin);

    const { data: dbProducts, error: prodErr } = await supabaseAdmin
      .from('products')
      .select('id, name, name_ar, our_price, flash_deal_price, stock, slug')
      .in('id', productIds);

    if (prodErr || !dbProducts) {
      return NextResponse.json({ error: 'Failed to fetch product data' }, { status: 500 });
    }

    const variantIds = items.map((i: any) => i.variant_id || i.variant?.id).filter(Boolean);
    let variantMap = new Map();
    if (variantIds.length > 0) {
      const { data: dbVariants } = await supabaseAdmin
        .from('product_variants')
        .select('*')
        .in('id', variantIds);
      variantMap = new Map(dbVariants?.map((v) => [v.id, v]) || []);
    }

    let subtotalUsd = 0;
    const orderInserts: any[] = [];
    const sessionId = `cryptomus_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    for (const item of items) {
      const prodId = item.product_id || item.product?.id;
      const variantId = item.variant_id || item.variant?.id || null;
      const qty = Math.min(Math.max(Number(item.quantity) || 1, 1), 50);

      const dbProd = dbProducts.find((p) => p.id === prodId);
      const dbVariant = variantId ? variantMap.get(variantId) : (item.variant || null);
      if (!dbProd) {
        return NextResponse.json({ error: 'One or more items in cart are invalid' }, { status: 400 });
      }

      const availableStock = dbVariant ? Number(dbVariant.stock || 0) : Number(dbProd.stock || 0);
      if (availableStock < qty && dbProd.stock < qty) {
        const displayName = dbVariant ? `${dbProd.name_ar || dbProd.name} - ${dbVariant.name_ar || dbVariant.name}` : (dbProd.name_ar || dbProd.name);
        return NextResponse.json(
          { error: `الكمية المطلوبة من "${displayName}" غير متوفرة في المخزون.` },
          { status: 400 }
        );
      }

      const isFlash = activeFlashSlug && dbProd.slug === activeFlashSlug && dbProd.flash_deal_price;
      const unitAmount = Number(
        dbVariant?.our_price !== undefined && dbVariant?.our_price !== null
          ? dbVariant.our_price
          : (isFlash ? dbProd.flash_deal_price : dbProd.our_price)
      ) || 0;

      subtotalUsd += unitAmount * qty;

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

    if (orderInserts.length === 0 || subtotalUsd <= 0) {
      return NextResponse.json({ error: 'Invalid order calculation' }, { status: 400 });
    }

    // Apply coupon discount & 5% tax
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
    const finalTotalUsd = discountedSubtotal + taxAmount;

    const { error: insertErr } = await supabaseAdmin.from('orders').insert(orderInserts);
    if (insertErr) {
      console.error('[Cryptomus Checkout] Error creating orders:', insertErr);
      return NextResponse.json({ error: 'Failed to create order records' }, { status: 500 });
    }

    // Call Cryptomus Invoice API
    const paymentRes = await createCryptomusPayment({
      amount: finalTotalUsd.toFixed(2),
      currency: 'USD',
      orderId: sessionId,
      additionalData: user.email || undefined,
    });

    return NextResponse.json({
      url: paymentRes.url,
      sessionId,
      uuid: paymentRes.uuid,
    });
  } catch (error: any) {
    console.error('[Cryptomus Checkout Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate Cryptomus checkout' },
      { status: 500 }
    );
  }
}
