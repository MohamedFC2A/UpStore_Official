import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireAuthenticatedUser, enforceSameOriginRequest } from '@/utils/security';
import { createLemonSqueezyCheckout, getLemonSqueezyCredentials } from '@/utils/lemonsqueezy';
import { calculateOrderTotals } from '@/utils/pricing';

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
    const { items, currency = 'USD', totalUsd: clientTotalUsd, couponCode, isWalletTopup } = body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    if (items.length > 50) {
      return NextResponse.json({ error: 'Too many items in cart' }, { status: 400 });
    }

    const credentials = await getLemonSqueezyCredentials();
    if (!credentials || !credentials.apiKey) {
      return NextResponse.json(
        { error: 'Lemon Squeezy credentials are not configured in system settings' },
        { status: 500 }
      );
    }

    const isWalletTopupMode = Boolean(
      isWalletTopup ||
      items.some((i: any) => i.product_id === 'wallet_topup' || i.id === 'wallet_topup' || i.product?.id === 'wallet_topup' || i.product?.delivery_mode === 'wallet_topup')
    );

    const supabaseAdmin = createAdminClient();

    // ─── WALLET TOP-UP FLOW FOR LEMON SQUEEZY ───
    if (isWalletTopupMode) {
      const topupAmount = Number(items[0]?.product?.our_price || items[0]?.product?.price || items[0]?.amount || clientTotalUsd || 10);
      if (typeof topupAmount !== 'number' || !Number.isFinite(topupAmount) || topupAmount < 1 || topupAmount > 10000) {
        return NextResponse.json({ error: 'الحد الأدنى للشحن هو 1$' }, { status: 400 });
      }

      const totals = calculateOrderTotals([], couponCode, topupAmount);
      const finalTotalUsd = totals.totalUsd;
      const finalTotalEgp = totals.totalEgp;
      const sessionId = `lemonsqueezy_wallet_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const orderToInsert = {
        user_id: user.id,
        product_id: null,
        variant_id: null,
        amount: topupAmount,
        status: 'pending_manual_payment',
        product_key: 'WALLET_TOPUP_PENDING',
        session_id: sessionId,
        payment_sender: 'Lemon Squeezy • شحن محفظة',
      };

      const { error: insertErr } = await supabaseAdmin.from('orders').insert([orderToInsert]);
      if (insertErr) {
        console.error('[Lemon Squeezy Wallet Top-Up DB Insert Error]:', insertErr);
        return NextResponse.json({ error: 'Failed to record topup order' }, { status: 500 });
      }

      const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://upstore.vercel.app';
      const returnUrl = `${siteUrl}/dashboard?tab=wallet&session_id=${sessionId}&topup_success=true`;

      const checkout = await createLemonSqueezyCheckout({
        amountUsd: finalTotalUsd,
        amountEgp: finalTotalEgp,
        productName: 'UpStore Wallet Top-Up (شحن رصيد المحفظة)',
        productDescription: `إضافة $${topupAmount.toFixed(2)} إلى رصيد محفظة UpStore (شامل ضريبة 5% VAT)`,
        sessionId,
        userId: user.id,
        userEmail: user.email,
        returnUrl,
        apiKey: credentials.apiKey,
        storeId: credentials.storeId,
        variantId: credentials.variantId,
      });

      return NextResponse.json({
        url: checkout.url,
        sessionId,
        checkoutId: checkout.checkoutId,
      });
    }
    const productIds = items.map((i: any) => i.product_id || i.product?.id).filter(Boolean);

    const { getActiveFlashDealSlugFromDb } = await import('@/utils/products');
    const activeFlashSlug = await getActiveFlashDealSlugFromDb(supabaseAdmin);

    const { data: dbProducts, error: prodErr } = await supabaseAdmin
      .from('products')
      .select('id, name, name_ar, our_price, flash_deal_price, price_egp, price_sar, stock, slug')
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
    const sessionId = `lemonsqueezy_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const productNames: string[] = [];

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
          { error: `المنتج "${displayName}" غير متوفر بالكمية المطلوبة في المخزون.` },
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
      const displayName = dbVariant ? `${dbProd.name_ar || dbProd.name} (${dbVariant.name_ar || dbVariant.name})` : (dbProd.name_ar || dbProd.name);
      productNames.push(`${displayName} x${qty}`);

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

    // Apply coupon discount
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
    const finalTotalEgp = Math.ceil(finalTotalUsd * 53);

    const { error: insertErr } = await supabaseAdmin.from('orders').insert(orderInserts);
    if (insertErr) {
      console.error('[Lemon Squeezy Checkout] Failed to create pending orders:', insertErr);
      return NextResponse.json({ error: 'Failed to record pending order' }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://upstore.vercel.app';
    const returnUrl = `${siteUrl}/dashboard?session_id=${sessionId}`;

    const checkout = await createLemonSqueezyCheckout({
      amountUsd: finalTotalUsd,
      amountEgp: finalTotalEgp,
      productName: productNames.slice(0, 3).join(', ') + (productNames.length > 3 ? '...' : ''),
      productDescription: `UpStore Order (${sessionId})`,
      sessionId,
      userId: user.id,
      userEmail: user.email,
      returnUrl,
      apiKey: credentials.apiKey,
      storeId: credentials.storeId,
      variantId: credentials.variantId,
    });

    return NextResponse.json({
      url: checkout.url,
      sessionId,
      checkoutId: checkout.checkoutId,
    });
  } catch (err: any) {
    console.error('Lemon Squeezy checkout error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to initiate Lemon Squeezy checkout' },
      { status: 500 }
    );
  }
}
