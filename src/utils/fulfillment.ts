import { consumeUnsoldCredential } from './credentials';
import { getZelenkaAccount } from './zelenka';
import { sendTelegramNotification, escapeHtml } from './telegram';
import { createAdminClient } from '@/utils/supabase/admin';
import { processReferralReward } from '@/utils/referrals';

/**
 * Fulfills all pending orders associated with a Stripe or free checkout session ID.
 * Allocates credentials (pre-assigned or Zelenka API), increments product sold counts,
 * clears the user's cart, and triggers notifications and referral rewards.
 */
export async function fulfillOrderSession(sessionId: string): Promise<boolean> {
  const supabaseAdmin = createAdminClient();

  // 1. Fetch pending/completed orders for this session
  const { data: orders, error: ordersErr } = await supabaseAdmin
    .from('orders')
    .select('id, user_id, product_id, variant_id, amount, product_key, status')
    .eq('session_id', sessionId);

  if (ordersErr || !orders || orders.length === 0) {
    console.log(`[Fulfillment] No orders found in DB for session: ${sessionId}`);
    return false;
  }

  // Check if all orders are already fulfilled (key allocated)
  const alreadyFulfilled = orders.every(
    o => o.product_key && o.product_key !== 'PENDING_FULFILLMENT' && o.product_key !== 'WALLET_TOPUP_PENDING' && !o.product_key.includes('PENDING')
  );

  if (alreadyFulfilled) {
    console.log(`[Fulfillment] All orders for session ${sessionId} are already fulfilled.`);
    return true;
  }

  console.log(`[Fulfillment] Fulfilling ${orders.length} orders for session ${sessionId}...`);

  let orderSummary = '';
  const createdOrderIds: string[] = [];
  let userEmail = 'Unknown Email';
  let userCountry: string | null = null;
  const userId = orders[0].user_id;

  // Get user details for notifications
  if (userId) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, country')
      .eq('id', userId)
      .single();
    if (profile?.email) {
      userEmail = profile.email;
    }
    if (profile?.country) {
      userCountry = profile.country;
    }
  }

  // ─── WALLET TOP-UP FULFILLMENT BRANCH ───
  const isWalletTopup = orders.some(
    o => o.product_key === 'WALLET_TOPUP_PENDING' || (!o.product_id && o.product_key?.includes('WALLET'))
  );

  if (isWalletTopup) {
    const topupAmount = orders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

    if (userId && topupAmount > 0) {
      // Check idempotency via transaction reference_id
      const { data: existingTx } = await supabaseAdmin
        .from('transactions')
        .select('id')
        .eq('reference_id', sessionId)
        .maybeSingle();

      if (!existingTx) {
        // Try increment_wallet_balance RPC or fallback to atomic update
        const { error: rpcErr } = await supabaseAdmin.rpc('increment_wallet_balance', {
          p_user_id: userId,
          amount: topupAmount,
        });

        if (rpcErr) {
          const { error: rpcErr2 } = await supabaseAdmin.rpc('increment_wallet_balance', {
            user_id: userId,
            amount: topupAmount,
          });

          if (rpcErr2) {
            const { data: pData } = await supabaseAdmin
              .from('profiles')
              .select('wallet_balance')
              .eq('id', userId)
              .single();
            const curBal = Number(pData?.wallet_balance || 0);
            await supabaseAdmin
              .from('profiles')
              .update({ wallet_balance: curBal + topupAmount })
              .eq('id', userId);
          }
        }

        // Record transaction
        await supabaseAdmin.from('transactions').insert({
          user_id: userId,
          type: 'credit_topup',
          amount: topupAmount,
          status: 'completed',
          reference_id: sessionId,
          label: 'شحن رصيد المحفظة (Wallet Top-Up)',
        });

        // Notify user
        await supabaseAdmin.from('notifications').insert({
          user_id: userId,
          title: 'تم شحن رصيد محفظتك بنجاح! 💳',
          message: `تم إضافة $${topupAmount.toFixed(2)} إلى رصيد محفظتك الرقمية في UpStore بنجاح. يمكنك استخدامه للشراء الفوري الآن.`,
          type: 'wallet',
        });
      }

      // Mark order completed
      await supabaseAdmin
        .from('orders')
        .update({
          status: 'completed',
          product_key: 'WALLET_TOPUP_COMPLETED',
        })
        .eq('session_id', sessionId);

      // Send Telegram alert
      const shortId = sessionId.substring(0, 8).toUpperCase();
      const telegramMessage = `
<b>عملية شحن رصيد محفظة مؤكدة بنجاح! 💳</b>
━━━━━━━━━━━━━━━━━━
<b>رقم العملية:</b> <code>#${shortId}</code>
<b>معرف الجلسة:</b> <code>${sessionId}</code>

<b>معلومات العميل:</b>
<b>البريد:</b> ${escapeHtml(userEmail)}

<b>تفاصيل الشحن:</b>
• <b>الرصيد المضاف:</b> <b>+$${topupAmount.toFixed(2)} USD</b>

<i>تمت إضافة الرصيد إلى محفظة العميل وتحديث حسابه بنجاح.</i>
      `.trim();
      await sendTelegramNotification(telegramMessage);

      return true;
    }
  }

  // 2. Clear cart for user
  if (userId) {
    await supabaseAdmin.from('cart_items').delete().eq('user_id', userId);
  }

  // Batch-fetch all referenced products and variants in parallel (eliminating N+1 sequential DB calls)
  const distinctProductIds = Array.from(new Set(orders.map((o) => o.product_id).filter(Boolean)));
  const distinctVariantIds = Array.from(new Set(orders.map((o) => o.variant_id).filter(Boolean)));

  const [productsRes, variantsRes] = await Promise.all([
    distinctProductIds.length > 0
      ? supabaseAdmin.from('products').select('id, name, delivery_mode, zelenka_api_key, zelenka_product_id').in('id', distinctProductIds)
      : Promise.resolve({ data: [] }),
    distinctVariantIds.length > 0
      ? supabaseAdmin.from('product_variants').select('id, name, zelenka_product_id').in('id', distinctVariantIds)
      : Promise.resolve({ data: [] }),
  ]);

  const productMap = new Map((productsRes.data || []).map((p: any) => [p.id, p]));
  const variantMap = new Map((variantsRes.data || []).map((v: any) => [v.id, v]));

  // 3. Fulfill each order
  for (const order of orders) {
    // Skip if already has key
    if (order.product_key && order.product_key !== 'PENDING_FULFILLMENT') {
      createdOrderIds.push(order.id);
      continue;
    }

    const orderId = order.id;
    const productId = order.product_id;
    const variantId = order.variant_id;
    createdOrderIds.push(orderId);

    // Fast O(1) in-memory lookup
    const prodData: any = productId ? productMap.get(productId) : null;
    const variantData: any = variantId ? variantMap.get(variantId) : null;

    let finalProductKey = `KEY-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    if (prodData) {
      if (prodData.delivery_mode === 'pre_assigned') {
        const credential = await consumeUnsoldCredential(productId, orderId, variantId);
        if (credential) {
          finalProductKey = credential;
        } else {
          finalProductKey = 'OUT_OF_STOCK_PENDING_ADMIN_REFILL';
        }
      } else if (prodData.delivery_mode === 'zelenka_api') {
        let credential = null;
        const apiKey = prodData.zelenka_api_key || process.env.ZELENKA_API_KEY;
        const targetZelenkaProductId = variantData?.zelenka_product_id || prodData.zelenka_product_id;
        if (apiKey && targetZelenkaProductId) {
          credential = await getZelenkaAccount(apiKey, targetZelenkaProductId);
        }
        if (credential) {
          finalProductKey = credential;
        } else {
          finalProductKey = 'OUT_OF_STOCK_PENDING_ZELENKA_API';
        }
      }
    }

    // Update order with key and set status to completed
    await supabaseAdmin
      .from('orders')
      .update({
        product_key: finalProductKey,
        status: 'completed',
      })
      .eq('id', orderId);

    // Increment sold count
    await supabaseAdmin.rpc('increment_product_sold_count', { row_id: productId });

    const parentName = prodData?.name || 'Digital Product';
    const variantName = variantData?.name || '';
    const productName = escapeHtml(variantName ? `${parentName} - ${variantName}` : parentName);
    orderSummary += `• <b>${productName}</b>\n   └ القيمة: $${order.amount}\n`;
  }

  // 4. Send customer notification
  if (userId) {
    const totalAmount = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      title: 'Payment Successful!',
      message: `Your payment of $${totalAmount.toFixed(2)} was successful. Your digital products are now available in your orders.`,
      type: 'order'
    });
  }

  // 5. Send Telegram Notification
  const orderIdStr = createdOrderIds.length > 0 ? createdOrderIds[0].substring(0, 8).toUpperCase() : sessionId.substring(0, 8).toUpperCase();
  const totalUsdAmount = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const countryLine = userCountry ? `\n<b>الموقع / الدولة:</b> ${escapeHtml(userCountry)}` : '';
  const telegramMessage = `
<b>طلب مدفوع جديد تم بنجاح!</b>
━━━━━━━━━━━━━━━━━━
<b>رقم الطلب:</b> <code>#${orderIdStr}</code>

<b>معلومات العميل:</b>
<b>البريد:</b> ${escapeHtml(userEmail)}${countryLine}
<b>بوابة الدفع:</b> Stripe/Fulfillment

<b>المنتجات المطلوبة:</b>
${orderSummary}
<b>الإجمالي المدفوع:</b> $${totalUsdAmount.toFixed(2)}

<i>تم تسليم الطلب للعميل بنجاح.</i>
  `.trim();
  await sendTelegramNotification(telegramMessage);

  // 6. Referral reward check
  try {
    if (userId) {
      await processReferralReward(userId);
    }
  } catch (refError) {
    console.error('Error processing referral reward:', refError);
  }

  return true;
}

/**
 * Fulfills an order session with custom credentials entered by Admin
 * (e.g. license key or email:password account payload).
 */
export async function fulfillOrderWithCustomKey(
  sessionId: string,
  customKeyOrPayload: string
): Promise<{ success: boolean; orderId?: string; customerEmail?: string; productName?: string }> {
  const supabaseAdmin = createAdminClient();

  // 1. Fetch orders for this session
  let { data: orders, error: ordersErr } = await supabaseAdmin
    .from('orders')
    .select('id, user_id, product_id, variant_id, amount, product_key, status, products(name, name_ar)')
    .eq('session_id', sessionId);

  if (ordersErr || !orders || orders.length === 0) {
    // Try matching prefix if 8 chars or by order id
    const { data: matchedOrders } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, product_id, variant_id, amount, product_key, status, session_id, products(name, name_ar)')
      .or(`session_id.ilike.%${sessionId}%,id.ilike.${sessionId}%`);
    if (matchedOrders && matchedOrders.length > 0) {
      orders = matchedOrders;
    } else {
      console.log(`[Fulfillment Custom] No orders found for session/id: ${sessionId}`);
      return { success: false };
    }
  }

  const userId = orders[0].user_id;
  let userEmail = 'Customer';
  if (userId) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();
    if (profile?.email) userEmail = profile.email;
  }

  // Clear cart
  if (userId) {
    await supabaseAdmin.from('cart_items').delete().eq('user_id', userId);
  }

  // Update all orders in this session
  for (const ord of orders) {
    await supabaseAdmin
      .from('orders')
      .update({
        product_key: customKeyOrPayload.trim(),
        status: 'completed',
      })
      .eq('id', ord.id);

    if (ord.product_id) {
      await supabaseAdmin.rpc('increment_product_sold_count', { row_id: ord.product_id });
    }
  }

  // Send customer notification in notifications table
  if (userId) {
    const totalAmount = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
    const shortId = orders[0].id.substring(0, 8).toUpperCase();
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      title: 'تم اعتماد وتسليم طلبك بنجاح!',
      message: `تم اعتماد وتسليم بيانات طلبك #${shortId} بقيمة $${totalAmount.toFixed(2)}. يمكنك الآن عرض الإيصال ونسخ التراخيص من حسابك.`,
      type: 'order',
    });
  }

  // Referral reward
  try {
    if (userId) {
      await processReferralReward(userId);
    }
  } catch (e) {
    console.error('Referral reward error:', e);
  }

  const prod = orders[0].products as any;
  const prodName = prod?.name_ar || prod?.name || 'Digital Product';
  const orderIdStr = orders[0].id.substring(0, 8).toUpperCase();

  return {
    success: true,
    orderId: orderIdStr,
    customerEmail: userEmail,
    productName: prodName,
  };
}
