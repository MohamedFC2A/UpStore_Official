import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { normalizeProductRecord } from '@/utils/products';
import {
  checkStoreMaintenanceMode,
  enforceSameOriginRequest,
  getConfiguredAppOrigin,
  requireAuthenticatedUser,
} from '@/utils/security';
import { processReferralReward } from '@/utils/referrals';
import { sendTelegramNotification, escapeHtml } from '@/utils/telegram';

import { calculateOrderTotals, PricingItem } from '@/utils/pricing';

export async function POST(req: Request) {
  try {
    const maintenanceError = await checkStoreMaintenanceMode();
    if (maintenanceError) return maintenanceError;

    const originError = await enforceSameOriginRequest(req);
    if (originError) return originError;

    const auth = await requireAuthenticatedUser();
    if (auth.error || !auth.user) {
      return auth.error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = auth.user;

    // Check active Arab local payment countdown restriction
    const { checkActiveLocalPaymentRestriction } = await import('@/utils/localPaySecurity');
    const localPayCheck = await checkActiveLocalPaymentRestriction(user.id);
    if (localPayCheck.restricted) {
      return NextResponse.json({
        error: 'ACTIVE_LOCAL_PAYMENT_IN_PROGRESS',
        message: 'لديك طلب دفع محلي قيد المتابعة والعد التنازلي حالياً. لا يمكنك إتمام عملية دفع جديدة من المحفظة حتى إتمام الطلب الحالي أو انتهاء مهلة العداد.',
        activeOrderId: localPayCheck.orderId,
      }, { status: 409 });
    }

    const body = await req.json().catch(() => ({}));
    const { items, currency = 'usd', couponCode } = body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'سلة المشتريات فارغة' }, { status: 400 });
    }

    if (items.length > 50) {
      return NextResponse.json({ error: 'عدد المنتجات في السلة يتجاوز الحد المسموح' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Fetch user's current profile and wallet balance
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, display_name, wallet_balance, country')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'تعذر العثور على بيانات المحفظة' }, { status: 400 });
    }

    const currentBalance = Number(profile.wallet_balance || 0);

    // 2. Fetch products and variants
    const productIds = items.map((i: any) => i.product_id || i.product?.id).filter(Boolean);
    const { getActiveFlashDealSlugFromDb } = await import('@/utils/products');
    const activeFlashSlug = await getActiveFlashDealSlugFromDb(supabaseAdmin);

    const { data: dbProducts } = await supabaseAdmin
      .from('products')
      .select('id, slug, market_price, name, name_ar, our_price, price_egp, price_sar, image_url, delivery_mode, zelenka_api_key, zelenka_product_id, stock, is_flash_deal, flash_deal_price, flash_deal_duration_hours, updated_at')
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

    // 3. Calculate accurate total in USD with 5% VAT & coupon discount
    const pricingItems: PricingItem[] = [];
    for (const item of items) {
      const prodId = item.product_id || item.product?.id;
      const variantId = item.variant_id || item.variant?.id || null;
      const dbProd = productMap.get(prodId) as any;
      const dbVariant = variantId ? (variantMap.get(variantId) as any) : null;

      if (!dbProd) {
        return NextResponse.json({ error: `المنتج غير موجود: ${prodId}` }, { status: 400 });
      }

      pricingItems.push({
        product_id: prodId,
        variant_id: variantId,
        quantity: Math.min(Math.max(1, Number(item.quantity) || 1), 100),
        product: dbProd,
        variant: dbVariant,
      });
    }

    const totals = calculateOrderTotals(pricingItems, couponCode);
    const totalUsdAmount = totals.totalUsd;

    // 4. Check if wallet balance is sufficient
    if (currentBalance < totalUsdAmount) {
      const needed = (totalUsdAmount - currentBalance).toFixed(2);
      return NextResponse.json(
        {
          error: `رصيد المحفظة ($${currentBalance.toFixed(2)}) غير كافٍ لإتمام الطلب ($${totalUsdAmount.toFixed(2)}). يرجى شحن $${needed} إضافية.`,
          currentBalance,
          requiredAmount: totalUsdAmount,
        },
        { status: 400 }
      );
    }

    // 5. Deduct balance atomically from database
    const { data: newBalance, error: deductError } = await supabaseAdmin.rpc('decrement_wallet_balance', {
      p_user_id: user.id,
      amount: totalUsdAmount,
    });

    if (deductError) {
      console.error('[Wallet Checkout Deduct Error]:', deductError);
      return NextResponse.json(
        { error: 'تعذر خصم المبلغ من المحفظة: ' + deductError.message },
        { status: 400 }
      );
    }

    const sessionId = `wallet_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 6. Record transaction in database
    await supabaseAdmin.from('transactions').insert({
      user_id: user.id,
      amount: -totalUsdAmount,
      type: 'purchase',
      status: 'completed',
      label: `شراء منتجات رقمية (محفظة UpStore)`,
      reference_id: sessionId,
    });

    // 7. Fulfill and Create Orders
    const createdOrderIds: string[] = [];
    let orderSummary = '';

    for (const item of items) {
      const productId = item.product_id || item.product?.id;
      const variantId = item.variant_id || item.variant?.id || null;
      const dbProd = productMap.get(productId) as any;
      const dbVariant = variantId ? (variantMap.get(variantId) as any) : null;
      const rawUnitAmount = Number(dbVariant ? dbVariant.our_price : (dbProd?.our_price || 0));
      const effectiveUnitAmount = totals.subtotalUsd > 0
        ? Math.round(((rawUnitAmount / totals.subtotalUsd) * totals.totalUsd) * 100) / 100
        : rawUnitAmount;
      const quantity = Math.max(1, Number(item.quantity) || 1);

      for (let unitIndex = 0; unitIndex < quantity; unitIndex++) {
        const { data: orderData, error: orderErr } = await supabaseAdmin
          .from('orders')
          .insert({
            user_id: user.id,
            product_id: productId,
            variant_id: variantId,
            amount: effectiveUnitAmount,
            status: 'completed',
            product_key: 'PENDING_FULFILLMENT',
            session_id: sessionId,
          })
          .select('id')
          .single();

        if (orderErr || !orderData?.id) {
          console.error('[Wallet Checkout Order Insert Error]:', orderErr);
          continue;
        }

        const orderId = orderData.id;
        createdOrderIds.push(orderId);

        let finalProductKey = `KEY-UPSTORE-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

        if (dbProd) {
          if (dbProd.delivery_mode === 'pre_assigned') {
            const { consumeUnsoldCredential } = await import('@/utils/credentials');
            const credential = await consumeUnsoldCredential(productId, orderId, variantId);
            finalProductKey = credential || 'OUT_OF_STOCK_PENDING_ADMIN_REFILL';
          } else if (dbProd.delivery_mode === 'zelenka_api') {
            const { getZelenkaAccount } = await import('@/utils/zelenka');
            let credential = null;
            const apiKey = dbProd.zelenka_api_key || process.env.ZELENKA_API_KEY;
            let targetZelenkaProductId = dbProd.zelenka_product_id;
            if (variantId && dbVariant?.zelenka_product_id) {
              targetZelenkaProductId = dbVariant.zelenka_product_id;
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

      const parentName = dbProd?.name || item.product?.name || 'UpStore Product';
      const variantName = dbVariant?.name || '';
      const fullProductName = variantName ? `${parentName} - ${variantName}` : parentName;
      orderSummary += `• <b>${escapeHtml(fullProductName)}</b> (الكمية: ${quantity})\n`;
    }

    // 8. Clear Cart
    await supabaseAdmin.from('cart_items').delete().eq('user_id', user.id);

    // 9. Send in-app notification
    await supabaseAdmin.from('notifications').insert({
      user_id: user.id,
      title: 'تم الدفع بنجاح عبر المحفظة!',
      message: `تم خصم $${totalUsdAmount.toFixed(2)} من محفظتك وتفعيل طلبك فوراً. الرصيد المتبقي: $${Number(newBalance || 0).toFixed(2)}.`,
      type: 'order',
    });

    // 10. Send Telegram Alert
    try {
      const orderIdStr = createdOrderIds.length > 0 ? createdOrderIds[0].substring(0, 8).toUpperCase() : sessionId;
      const userEmail = escapeHtml(user.email || profile.email || 'N/A');
      const telegramMessage = `
<b>⚡ طلب ناجح عبر محفظة UpStore!</b>
━━━━━━━━━━━━━━━━━━
<b>رقم الطلب:</b> <code>#${orderIdStr}</code>
<b>العميل:</b> ${escapeHtml(profile.display_name || 'User')} (${userEmail})
<b>المبلغ المخصوم:</b> <b>$${totalUsdAmount.toFixed(2)} USD</b>
<b>الرصيد المتبقي بالمحفظة:</b> $${Number(newBalance || 0).toFixed(2)} USD

<b>المنتجات المطلوبة:</b>
${orderSummary}
<i>تم تسليم التراخيص وخصم الرصيد تلقائياً.</i>
      `.trim();
      await sendTelegramNotification(telegramMessage);
    } catch {
      // ignore
    }

    // 11. Process Referral Reward if eligible
    try {
      await processReferralReward(user.id);
    } catch {}

    const origin = getConfiguredAppOrigin();
    return NextResponse.json({
      success: true,
      url: `${origin}/checkout/success?session_id=${sessionId}`,
      orderId: createdOrderIds[0] || sessionId,
      newBalance,
    });
  } catch (err: any) {
    console.error('[Wallet Checkout Exception]:', err);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء معالجة الدفع عبر المحفظة: ' + err.message },
      { status: 500 }
    );
  }
}
