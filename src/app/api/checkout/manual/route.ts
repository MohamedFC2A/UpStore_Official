import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { normalizeProductRecord } from '@/utils/products';
import {
  checkStoreMaintenanceMode,
  enforceSameOriginRequest,
  requireAuthenticatedUser,
} from '@/utils/security';
import { getZelenkaStock } from '@/utils/zelenka';
import { calculateOrderTotals, PricingItem } from '@/utils/pricing';

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
    const { items, currency = 'egp', paymentMethod = 'local_transfer', couponCode, totalUsd, isWalletTopup, clientTelemetry } = body || {};

    const ALLOWED_CURRENCIES = ['usd', 'egp', 'sar'];
    const lowerCurrency = currency.toLowerCase();
    if (!ALLOWED_CURRENCIES.includes(lowerCurrency)) {
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

    const supabaseAdmin = createAdminClient();

    // ─── WALLET TOP-UP FLOW FOR MANUAL / LOCAL / PAYPAL ───
    if (isWalletTopupMode) {
      const topupAmount = Number(items[0]?.product?.our_price || items[0]?.product?.price || items[0]?.amount || totalUsd || 10);
      if (typeof topupAmount !== 'number' || !Number.isFinite(topupAmount) || topupAmount < 1 || topupAmount > 10000) {
        return NextResponse.json({ error: 'الحد الأدنى للشحن هو 1$' }, { status: 400 });
      }

      const totals = calculateOrderTotals([], couponCode, topupAmount);
      const sessionId = `manual_wallet_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const orderToInsert = {
        user_id: user.id,
        product_id: null,
        variant_id: null,
        amount: topupAmount,
        status: 'pending_manual_payment',
        product_key: 'WALLET_TOPUP_PENDING',
        session_id: sessionId,
        payment_sender: `شحن محفظة • ${paymentMethod}`,
        client_telemetry: clientTelemetry || {},
      };

      const { error: insertErr } = await supabaseAdmin.from('orders').insert([orderToInsert]);
      if (insertErr) {
        console.error('[Manual Wallet Top-Up DB Insert Error]:', insertErr);
        return NextResponse.json({ error: 'Failed to record topup order' }, { status: 500 });
      }

      // Send Telegram notification
      try {
        const { sendTelegramNotification, escapeHtml } = await import('@/utils/telegram');
        const shortSessionId = sessionId.replace('manual_', '').substring(0, 8).toUpperCase();
        const totalFormattedStr = lowerCurrency === 'egp'
          ? `${totals.totalEgp} EGP`
          : lowerCurrency === 'sar'
          ? `${totals.totalSar} SAR`
          : `$${totals.totalUsd.toFixed(2)} USD`;

        const telegramMsg = `
<b>طلب شحن رصيد محفظة يدوي جديد!</b>
━━━━━━━━━━━━━━━━━━
<b>رقم الجلسة:</b> <code>#${shortSessionId}</code>
<b>معرف الجلسة الكامل:</b> <code>${sessionId}</code>

<b>معلومات العميل:</b>
<b>البريد:</b> ${escapeHtml(user.email || 'غير محدد')}
<b>طريقة الدفع:</b> ${escapeHtml(paymentMethod)}
<b>العملة:</b> ${lowerCurrency.toUpperCase()}

<b>تفاصيل الشحن:</b>
• <b>شحن رصيد محفظة UpStore</b>: $${topupAmount.toFixed(2)} (صافي الرصيد)
• <b>الضريبة (5% VAT)</b>: ${lowerCurrency === 'egp' ? `+${totals.taxEgp} ج.م` : lowerCurrency === 'sar' ? `+${totals.taxSar} ر.س` : `+$${totals.taxUsd.toFixed(2)}`}
• <b>المبلغ الإجمالي المطلوب سداده</b>: <b>${totalFormattedStr}</b>

<i>الطلب مسجل في انتظار تأكيد السداد ورفع الإيصال.</i>
        `.trim();
        await sendTelegramNotification(telegramMsg);
      } catch (tgErr) {
        console.warn('[Manual Wallet Top-Up Telegram Error]:', tgErr);
      }

      const redirectUrl = `/checkout/pay?session_id=${sessionId}&method=${paymentMethod}&currency=${lowerCurrency}`;
      return NextResponse.json({
        url: redirectUrl,
        sessionId,
        totalAmount: totals.totalUsd,
        totalLocal: lowerCurrency === 'egp' ? totals.totalEgp : lowerCurrency === 'sar' ? totals.totalSar : totals.totalUsd,
        currency: lowerCurrency,
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

    const sessionId = `manual_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const ordersToInsert = [];
    let subtotalUsd = 0;

    for (const item of items) {
      const prodId = item.product_id || item.product?.id;
      const variantId = item.variant_id || item.variant?.id;
      const dbProd = productMap.get(prodId);
      const dbVariant = variantId ? variantMap.get(variantId) : (item.variant || null);
      
      if (!dbProd) {
        return NextResponse.json({ error: `Product not found` }, { status: 400 });
      }

      const quantity = Math.min(Math.max(1, Number(item.quantity) || 1), 100);

      // Verify and sync stock in real time
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

    // 1. Prepare items for centralized pricing engine
    const pricingItems: PricingItem[] = [];
    for (const item of items) {
      const prodId = item.product_id || item.id;
      const variantId = item.variant_id || null;
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const dbProd = productMap.get(prodId) as any;
      const dbVariant = variantId && variantMap ? (variantMap.get(variantId) as any) : null;

      if (!dbProd) {
        return NextResponse.json({
          error: `Product not found in database for ID: ${prodId}`,
        }, { status: 400 });
      }

      pricingItems.push({
        product_id: prodId,
        variant_id: variantId,
        quantity,
        product: dbProd,
        variant: dbVariant,
      });
    }

    // 2. Calculate accurate subtotal, 5% VAT, and final total
    const totals = calculateOrderTotals(pricingItems, couponCode);

    // 3. Build orders to insert with proportionally allocated tax-inclusive amounts
    const totalOrderUnits = pricingItems.reduce((acc, it) => acc + it.quantity, 0);

    for (const pItem of pricingItems) {
      const dbProd = pItem.product;
      const dbVariant = pItem.variant;
      const rawUnitUsd = Number(dbVariant?.our_price ?? dbProd?.our_price ?? 0);
      
      const effectiveUnitUsd = totals.subtotalUsd > 0
        ? Math.round(((rawUnitUsd / totals.subtotalUsd) * totals.totalUsd) * 100) / 100
        : Math.round((totals.totalUsd / totalOrderUnits) * 100) / 100;

      for (let i = 0; i < pItem.quantity; i++) {
        ordersToInsert.push({
          user_id: user.id,
          product_id: pItem.product_id,
          variant_id: pItem.variant_id || null,
          amount: effectiveUnitUsd,
          status: 'pending_manual_payment',
          product_key: 'PENDING_FULFILLMENT',
          session_id: sessionId,
          client_telemetry: clientTelemetry || {},
        });
      }
    }

    // Insert orders
    if (ordersToInsert.length > 0) {
      const { error: insertErr } = await supabaseAdmin.from('orders').insert(ordersToInsert);
      if (insertErr) {
        console.error('[Manual Checkout Error]:', insertErr);
        return NextResponse.json({ error: 'Failed to create order.' }, { status: 500 });
      }
    }

    // Send Telegram Notification with full pricing transparency
    try {
      const { sendTelegramNotification, escapeHtml } = await import('@/utils/telegram');
      
      let orderSummary = '';
      const isLocal = lowerCurrency === 'sar' || lowerCurrency === 'egp';
      const rate = lowerCurrency === 'sar' ? 4 : lowerCurrency === 'usd' ? 1 : 53;

      const counts: Record<string, { count: number; price: number }> = {};
      for (const ord of ordersToInsert) {
        const dbProd = ord.product_id ? (productMap.get(ord.product_id) as any) : null;
        const dbVariant = ord.variant_id && variantMap ? variantMap.get(ord.variant_id) as any : null;
        
        const parentName = dbProd?.name || 'Digital Product';
        const variantName = dbVariant?.name || '';
        const pName = variantName ? `${parentName} - ${variantName}` : parentName;

        if (!counts[pName]) {
          const itemPrice = isLocal ? Math.ceil(ord.amount * rate) : Math.ceil(ord.amount * rate * 100) / 100;
          counts[pName] = { count: 0, price: itemPrice };
        }
        counts[pName].count += 1;
      }

      for (const [pName, detail] of Object.entries(counts)) {
        const unitPriceStr = isLocal ? `${detail.price}` : detail.price.toFixed(2);
        orderSummary += `• <b>${escapeHtml(pName)}</b>\n   └ الكمية: ${detail.count} | السعر: ${unitPriceStr} (${lowerCurrency.toUpperCase()})\n`;
      }

      const shortSessionId = sessionId.replace('manual_', '').substring(0, 8).toUpperCase();
      const totalFormattedStr = lowerCurrency === 'egp'
        ? `${totals.totalEgp} EGP`
        : lowerCurrency === 'sar'
        ? `${totals.totalSar} SAR`
        : `$${totals.totalUsd.toFixed(2)} USD`;

      const taxSummaryStr = lowerCurrency === 'egp'
        ? `المجموع: ${totals.subtotalEgp} ج.م | الضريبة (5%): +${totals.taxEgp} ج.م`
        : lowerCurrency === 'sar'
        ? `المجموع: ${totals.subtotalSar} ر.س | الضريبة (5%): +${totals.taxSar} ر.س`
        : `المجموع: $${totals.subtotalUsd.toFixed(2)} | الضريبة (5%): +$${totals.taxUsd.toFixed(2)}`;

      const telegramMessage = `
<b>طلب دفع محلي جديد معلّق (بانتظار التحويل والإيصال)!</b>
━━━━━━━━━━━━━━━━━━
<b>رقم الطلب:</b> <code>#${shortSessionId}</code>
<b>الجلسة:</b> <code>${sessionId}</code>
<b>وسيلة الدفع:</b> <code>${escapeHtml(paymentMethod.toUpperCase())}</code>

<b>العميل:</b>
<b>البريد:</b> ${escapeHtml(user.email || 'Unknown')}

<b>المنتجات المطلوبة:</b>
${orderSummary}
<b>تفاصيل الضريبة (5% VAT):</b> <i>${taxSummaryStr}</i>
<b>إجمالي القيمة المطلوب سدادها:</b> <code>${totalFormattedStr}</code>

<i>العميل في طريقه لإرسال إثبات التحويل عبر صفحة الدفع أو التيليجرام.</i>
      `.trim();

      await sendTelegramNotification(telegramMessage);
    } catch (tgErr) {
      console.error('Error sending local checkout Telegram notification:', tgErr);
    }

    // Clear cart for this user
    await supabaseAdmin.from('cart_items').delete().eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      sessionId: sessionId,
      url: `/checkout/manual-success?session_id=${sessionId}&currency=${lowerCurrency}&method=${encodeURIComponent(paymentMethod)}`
    });
  } catch (err: any) {
    console.error('[Manual Checkout Route Error]:', err);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
