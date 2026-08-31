import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { processReferralReward } from '@/utils/referrals';
import { createAdminClient } from '@/utils/supabase/admin';
import { normalizeProductRecord } from '@/utils/products';
import { calculateOrderTotals } from '@/utils/pricing';
import {
  checkStoreMaintenanceMode,
  enforceSameOriginRequest,
  getConfiguredAppOrigin,
  getRequiredEnv,
  requireAuthenticatedUser,
} from '@/utils/security';

async function getStripeClient() {
  let key = process.env.STRIPE_SECRET_KEY || '';
  if (!key) {
    try {
      const { createAdminClient } = await import('@/utils/supabase/admin');
      const supabaseAdmin = createAdminClient();
      const { data } = await supabaseAdmin.from('site_settings').select('value').eq('key', 'stripe_secret_key').maybeSingle();
      if (data?.value) key = String(data.value);
    } catch {
      // ignore
    }
  }

  if (!key) {
    return null;
  }

  return new Stripe(key, {
    apiVersion: '2026-05-27.dahlia' as any,
  });
}

export async function POST(req: Request) {
  try {
    const maintenanceError = await checkStoreMaintenanceMode();
    if (maintenanceError) {
      return maintenanceError;
    }

    const originError = await enforceSameOriginRequest(req);
    if (originError) {
      return originError;
    }

    const stripe = await getStripeClient();
    if (!stripe) {
      return NextResponse.json({
        error: 'بوابة البطاقات البنكية (Stripe) غير مهيأة حالياً. يرجى اختيار Bybit أو محفظة كاش أو الدفع المباشر.',
      }, { status: 400 });
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
        message: 'لديك طلب دفع محلي قيد المتابعة والعد التنازلي حالياً. لا يمكنك بدء أو إتمام عملية دفع جديدة حتى إتمام الطلب الحالي أو انتهاء مهلة العداد.',
        activeOrderId: localPayCheck.orderId,
      }, { status: 409 });
    }

    // Extract IP and Country from headers
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'Unknown IP';
    const country = req.headers.get('cf-ipcountry') || req.headers.get('x-vercel-ip-country') || 'Unknown Country';

    // Parse the body
    const body = await req.json().catch(() => ({}));
    const { items, currency = 'usd', couponCode, isWalletTopup, totalUsd } = body || {};

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

    const isWalletTopupMode = Boolean(
      isWalletTopup ||
      items.some((i: any) => i.product_id === 'wallet_topup' || i.id === 'wallet_topup' || i.product?.id === 'wallet_topup' || i.product?.delivery_mode === 'wallet_topup')
    );

    const origin = getConfiguredAppOrigin();

    // ─── WALLET TOP-UP FLOW ───
    if (isWalletTopupMode) {
      const topupAmount = Number(items[0]?.product?.our_price || items[0]?.product?.price || items[0]?.amount || totalUsd || 10);
      if (typeof topupAmount !== 'number' || !Number.isFinite(topupAmount) || topupAmount < 1 || topupAmount > 10000) {
        return NextResponse.json({ error: 'الحد الأدنى للشحن هو 1$' }, { status: 400 });
      }

      const pricingTotals = calculateOrderTotals([], couponCode, topupAmount);
      const lowerCur = currency.toLowerCase();
      const finalPayAmount = lowerCur === 'egp' ? pricingTotals.totalEgp : lowerCur === 'sar' ? pricingTotals.totalSar : pricingTotals.totalUsd;

      const session = await stripe.checkout.sessions.create({
        automatic_payment_methods: { enabled: true },
        line_items: [
          {
            price_data: {
              currency: lowerCur,
              product_data: {
                name: 'UpStore Wallet Top-Up (شحن رصيد المحفظة)',
                description: `إضافة $${topupAmount.toFixed(2)} إلى رصيد المحفظة الفوري (شامل ضريبة 5% VAT)`,
                images: ['https://upstore.one/logo.png'],
              },
              unit_amount: Math.ceil(finalPayAmount * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${origin}/dashboard?tab=wallet&topup_success=true`,
        cancel_url: `${origin}/dashboard?tab=wallet&topup_canceled=true`,
        customer_email: user.email,
        metadata: {
          type: 'wallet_topup',
          userId: user.id,
          amountAdded: topupAmount.toString(),
          totalPaid: finalPayAmount.toString(),
        },
      } as any);

      return NextResponse.json({ url: session.url, sessionId: session.id });
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

    let totalAmount = 0;

    // Create Stripe line items
    const lineItems = items.map((item: any) => {
      const prodId = item.product_id || item.product?.id;
      const variantId = item.variant_id || item.variant?.id;
      const dbProd = productMap.get(prodId);
      const dbVariant = variantId ? variantMap.get(variantId) : null;

      if (!dbProd) {
        throw new Error(`Product not found: ${prodId}`);
      }

      // Get the correct price for the currency from DB, defaulting to our_price (usd)
      let unitAmount = Number(dbVariant ? dbVariant.our_price : (dbProd.our_price || 0));
      if (currency === 'egp') {
        unitAmount = dbVariant 
          ? (dbVariant.price_egp ? Math.ceil(Number(dbVariant.price_egp)) : Math.ceil(unitAmount * 53))
          : (dbProd.price_egp ? Math.ceil(Number(dbProd.price_egp)) : Math.ceil(unitAmount * 53));
      } else if (currency === 'sar') {
        unitAmount = dbVariant 
          ? (dbVariant.price_sar ? Math.ceil(Number(dbVariant.price_sar)) : Math.ceil(unitAmount * 4))
          : (dbProd.price_sar ? Math.ceil(Number(dbProd.price_sar)) : Math.ceil(unitAmount * 4));
      }

      const amountInSmallestUnit = Math.ceil(unitAmount * 100);
      const quantity = Math.min(Math.max(1, Number(item.quantity) || 1), 100);
      totalAmount += (amountInSmallestUnit * quantity);

      const name = dbVariant ? `${dbProd.name} - ${dbVariant.name}` : (dbProd.name || 'UpStore Product');
      const image = dbVariant?.image_url || dbProd.image_url || undefined;

      return {
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: name,
            images: image ? [image] : [],
            metadata: {
              productId: dbProd.id,
              variantId: dbVariant?.id || '',
              usdPrice: String(dbVariant ? dbVariant.our_price : dbProd.our_price),
            },
          },
          unit_amount: amountInSmallestUnit,
        },
        quantity: quantity,
      };
    });

    if (totalAmount === 0 && user) {
      // ─── BYPASS STRIPE FOR FREE PRODUCTS ───

      const { sendTelegramNotification, escapeHtml } = await import('@/utils/telegram');
      const freeSessionId = `free_${Date.now()}`;

      // 1. Create transaction
      await supabaseAdmin.from('transactions').insert({
        user_id: user.id,
        amount: 0,
        type: 'purchase',
        status: 'completed',
        reference_id: freeSessionId
      });

      const createdOrderIds = [];
      let orderSummary = '';

      // 2. Create orders
      for (const item of items) {
        const productId = item.product_id || item.product?.id;
        const variantId = item.variant_id || item.variant?.id || null;
        const { data: prodData } = await supabaseAdmin
          .from('products')
          .select('name, delivery_mode, zelenka_api_key, zelenka_product_id')
          .eq('id', productId)
          .single();
        const quantity = Math.max(1, Number(item.quantity) || 1);

        for (let unitIndex = 0; unitIndex < quantity; unitIndex += 1) {
          const { data: orderData, error: orderErr } = await supabaseAdmin
            .from('orders')
            .insert({
              user_id: user.id,
              product_id: productId,
              variant_id: variantId,
              amount: 0,
              status: 'completed',
              product_key: 'PENDING_FULFILLMENT',
              session_id: freeSessionId,
            })
            .select('id')
            .single();

          if (orderErr || !orderData?.id) {
            console.error('Error creating order:', orderErr?.message);
            continue;
          }

          const orderId = orderData.id;
          createdOrderIds.push(orderId);

          let finalProductKey = `KEY-FREE-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

          if (prodData) {
            if (prodData.delivery_mode === 'pre_assigned') {
              const { consumeUnsoldCredential } = await import('@/utils/credentials');
              const credential = await consumeUnsoldCredential(productId, orderId, variantId);
              finalProductKey = credential || 'OUT_OF_STOCK_PENDING_ADMIN_REFILL';
            } else if (prodData.delivery_mode === 'zelenka_api') {
              const { getZelenkaAccount } = await import('@/utils/zelenka');
              let credential = null;
              const apiKey = prodData.zelenka_api_key || process.env.ZELENKA_API_KEY;
              let targetZelenkaProductId = prodData.zelenka_product_id;
              if (variantId) {
                const { data: vData } = await supabaseAdmin
                  .from('product_variants')
                  .select('zelenka_product_id')
                  .eq('id', variantId)
                  .maybeSingle();
                if (vData?.zelenka_product_id) {
                  targetZelenkaProductId = vData.zelenka_product_id;
                }
              }
              if (apiKey && targetZelenkaProductId) {
                credential = await getZelenkaAccount(apiKey, targetZelenkaProductId);
              }
              finalProductKey = credential || 'OUT_OF_STOCK_PENDING_ZELENKA_API';
            }
          }

          await supabaseAdmin
            .from('orders')
            .update({ product_key: finalProductKey })
            .eq('id', orderId);

          await supabaseAdmin.rpc('increment_product_sold_count', {
            row_id: productId,
            sold_units: 1,
          });
        }

        const dbProd = productMap.get(productId);
        const dbVariant = variantId ? variantMap.get(variantId) : null;
        const parentName = dbProd?.name || item.product?.name || 'Unknown Product';
        const variantName = dbVariant?.name || '';
        const productName = escapeHtml(variantName ? `${parentName} - ${variantName}` : parentName);
        orderSummary += `• <b>${productName}</b>\n   └ الكمية: ${quantity}\n`;
      }

      // 3. Clear cart
      await supabaseAdmin.from('cart_items').delete().eq('user_id', user.id);

      // 4. Notification
      await supabaseAdmin.from('notifications').insert({
        user_id: user.id,
        title: 'Payment Successful!',
        message: 'Your free products have been added to your orders.',
        type: 'order'
      });

      const userEmail = escapeHtml(user.email || 'Unknown Email');
      const orderIdStr = createdOrderIds.length > 0 ? createdOrderIds[0].substring(0, 8).toUpperCase() : freeSessionId;
      
      const telegramMessage = `
<b>طلب مجاني جديد تم بنجاح!</b>
━━━━━━━━━━━━━━━━━━
<b>رقم الطلب (السرّي):</b> <code>#${orderIdStr}</code>

<b>معلومات العميل:</b>
<b>البريد:</b> ${userEmail}
<b>الدولة:</b> ${country}
<b>الآيبي:</b> <code>${ip}</code>

<b>المنتجات المطلوبة:</b>
${orderSummary}
<b>الإجمالي:</b> 0.00 $ (مجاني)

<i>تمت إضافة المنتجات لحساب العميل.</i>
      `.trim();
      await sendTelegramNotification(telegramMessage);

      // 6. PROCESS REFERRAL REWARD
      try {
        await processReferralReward(user.id);
      } catch (refError) {
        console.error('Error processing referral reward:', refError);
      }

      return NextResponse.json({ 
        url: `${origin}/checkout/success?session_id=${freeSessionId}`,
        success: true,
        orderId: orderIdStr,
        isFree: true 
      });
    }

    // We store the cart metadata. Product details are stored on each line item's product metadata
    // to bypass the Stripe 500-character limit entirely.
    const orderMetadata = {
      userId: user.id,
      userIp: ip,
      userCountry: country,
    };

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      automatic_payment_methods: { enabled: true },
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart?canceled=true`,
      metadata: orderMetadata,
      locale: 'auto',
    } as any);

    // ─── Create pending orders in the database (Atomic Single Batch Insert) ───
    const allPendingOrders = items.flatMap((item: any) => {
      const prodId = item.product_id || item.product?.id;
      const variantId = item.variant_id || item.variant?.id || null;
      const dbProd = productMap.get(prodId);
      const dbVariant = variantId ? variantMap.get(variantId) : null;
      const unitAmount = Number(dbVariant ? dbVariant.our_price : (dbProd?.our_price || 0));
      const quantity = Math.min(Math.max(1, Number(item.quantity) || 1), 100);

      return Array.from({ length: quantity }, () => ({
        user_id: user.id,
        product_id: prodId,
        variant_id: variantId,
        amount: unitAmount,
        status: 'pending',
        product_key: 'PENDING_FULFILLMENT',
        session_id: session.id,
      }));
    });

    if (allPendingOrders.length > 0) {
      await supabaseAdmin.from('orders').insert(allPendingOrders);
    }

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe Checkout Error:', err);
    return NextResponse.json({ error: 'An internal error occurred during checkout.' }, { status: 500 });
  }
}
