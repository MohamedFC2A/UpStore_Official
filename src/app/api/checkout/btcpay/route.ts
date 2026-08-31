import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { createBtcPayInvoice } from '@/utils/btcpay';
import { normalizeProductRecord } from '@/utils/products';
import {
  enforceSameOriginRequest,
  getConfiguredAppOrigin,
  requireAuthenticatedUser,
} from '@/utils/security';
import { calculateOrderTotals, PricingItem } from '@/utils/pricing';

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

    // Extract IP and Country from headers
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'Unknown IP';
    const country = req.headers.get('cf-ipcountry') || req.headers.get('x-vercel-ip-country') || 'Unknown Country';

    // Parse the body
    const body = await req.json();
    const { items, currency = 'usd', couponCode } = body || {};

    const ALLOWED_CURRENCIES = ['usd', 'egp', 'sar'];
    if (!ALLOWED_CURRENCIES.includes(currency.toLowerCase())) {
      return NextResponse.json({ error: 'Invalid currency' }, { status: 400 });
    }

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

    const { data: dbProducts } = await supabaseAdmin
      .from('products')
      .select('id, slug, market_price, name, our_price, price_egp, price_sar, image_url, delivery_mode, zelenka_api_key, zelenka_product_id, stock, is_flash_deal, flash_deal_price, flash_deal_duration_hours, updated_at')
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

    // ─── SYNC AND VERIFY STOCK FOR EACH ITEM ───
    const { getZelenkaStock } = await import('@/utils/zelenka');
    for (const item of items) {
      const prodId = item.product_id || item.product?.id;
      const variantId = item.variant_id || item.variant?.id;
      const dbProd = productMap.get(prodId) as any;
      const dbVariant = variantId ? variantMap.get(variantId) as any : null;
      
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
          if (dbVariant) {
            await supabaseAdmin.from('product_variants').update({ stock: currentStock }).eq('id', dbVariant.id);
            dbVariant.stock = currentStock;
          } else {
            await supabaseAdmin.from('products').update({ stock: currentStock }).eq('id', dbProd.id);
            dbProd.stock = currentStock;
          }
        }
      } else if (dbProd.delivery_mode === 'pre_assigned') {
        const query = supabaseAdmin
          .from('product_credentials')
          .select('id', { count: 'exact', head: true })
          .eq('product_id', dbProd.id)
          .eq('is_sold', false);

        if (dbVariant) {
          query.eq('variant_id', dbVariant.id);
        } else {
          query.is('variant_id', null);
        }

        const { count } = await query;
        currentStock = count || 0;
        
        if (dbVariant) {
          await supabaseAdmin.from('product_variants').update({ stock: currentStock }).eq('id', dbVariant.id);
          dbVariant.stock = currentStock;
        } else {
          await supabaseAdmin.from('products').update({ stock: currentStock }).eq('id', dbProd.id);
          dbProd.stock = currentStock;
        }
      }

      if (currentStock < quantity) {
        const displayName = dbVariant ? `${dbProd.name} - ${dbVariant.name}` : dbProd.name;
        return NextResponse.json({
          error: `المنتج "${displayName}" غير متوفر بالكمية المطلوبة. المتاح حالياً: ${currentStock}`
        }, { status: 400 });
      }
    }

    const origin = getConfiguredAppOrigin();

    const pricingItems: PricingItem[] = [];
    for (const item of items) {
      const prodId = item.product_id || item.product?.id;
      const variantId = item.variant_id || item.variant?.id || null;
      const dbProd = productMap.get(prodId) as any;
      const dbVariant = variantId ? (variantMap.get(variantId) as any) : null;

      if (dbProd) {
        pricingItems.push({
          product_id: prodId,
          variant_id: variantId,
          quantity: Math.min(Math.max(1, Number(item.quantity) || 1), 100),
          product: dbProd,
          variant: dbVariant,
        });
      }
    }

    const totals = calculateOrderTotals(pricingItems, couponCode);
    const totalUsdAmount = totals.totalUsd;

    if (totalUsdAmount === 0) {
      return NextResponse.json({ error: 'Free orders are not processed via BTCPay Server.' }, { status: 400 });
    }

    // Create BTCPay Server Invoice with 5% VAT and coupon applied
    const invoice = await createBtcPayInvoice({
      amount: totalUsdAmount,
      currency: 'USD', // BTCPay Server resolves rates automatically based on currency, USD is universally supported
      buyerEmail: user.email,
      redirectUrl: `${origin}/checkout/success?session_id={InvoiceId}`,
      cancelUrl: `${origin}/cart?canceled=true`,
      metadata: {
        userId: user.id,
        userIp: ip,
        userCountry: country,
        source: 'BTCPayServer',
        taxUsd: totals.taxUsd,
        couponCode: couponCode || null,
      }
    });

    // ─── Create pending orders in the database with allocated amounts ───
    for (const pItem of pricingItems) {
      const prodId = pItem.product_id;
      const variantId = pItem.variant_id || null;
      const dbProd = pItem.product;
      const dbVariant = pItem.variant;
      
      const rawUnitAmount = Number(dbVariant ? dbVariant.our_price : (dbProd?.our_price || 0));
      const effectiveUnitAmount = totals.subtotalUsd > 0
        ? Math.round(((rawUnitAmount / totals.subtotalUsd) * totals.totalUsd) * 100) / 100
        : rawUnitAmount;

      const quantity = pItem.quantity;

      // Create pending orders mapped individually with variant_id
      const pendingOrders = Array.from({ length: quantity }, () => ({
        user_id: user.id,
        product_id: prodId,
        variant_id: variantId,
        amount: effectiveUnitAmount,
        status: 'pending',
        product_key: 'PENDING_FULFILLMENT',
        session_id: invoice.id,
      }));

      if (pendingOrders.length > 0) {
        await supabaseAdmin.from('orders').insert(pendingOrders);
      }
    }

    return NextResponse.json({ url: `/checkout/pay?session_id=${invoice.id}` });
  } catch (err: any) {
    console.error('BTCPay Checkout Error:', err);
    return NextResponse.json({ error: err.message || 'An internal error occurred during checkout.' }, { status: 500 });
  }
}
