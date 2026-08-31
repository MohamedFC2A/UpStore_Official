import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  answerLocalPayBotCallbackQuery,
  editLocalPayBotMessage,
  sendLocalPayBotMessage,
  LOCAL_PAY_BOT_USERNAME,
  LOCAL_PAY_BOT_TOKEN,
  setLocalPayBotWebhook,
} from '@/utils/telegramLocalPayBot';
import {
  dispatchConfirmedLocalPaymentToFulfillmentBot,
  PAYMENT_BOT_USERNAME,
} from '@/utils/telegramPaymentBot';
import {
  escapeHtml,
  isAuthorizedTelegramAdmin,
  TELEGRAM_UNAUTHORIZED_MESSAGE,
  verifyTelegramWebhookSecret,
} from '@/utils/telegram';
import { fulfillOrderSession } from '@/utils/fulfillment';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    // Cryptographic Secret Token Verification
    if (!verifyTelegramWebhookSecret(req, LOCAL_PAY_BOT_TOKEN)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized secret token' }, { status: 403 });
    }

    const update = await req.json().catch(() => null);
    if (!update) {
      return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // ──────────────────────────────────────────────────────────
    // 1. Handle Inline Button Clicks (Callback Queries)
    // ──────────────────────────────────────────────────────────
    if (update.callback_query) {
      const { id, from, message, data } = update.callback_query;
      const chatId = message?.chat?.id || from?.id;
      const messageId = message?.message_id;

      if (!chatId || !await isAuthorizedTelegramAdmin(chatId)) {
        await answerLocalPayBotCallbackQuery(id, '⛔ غير مصرح لك بهذا الإجراء', true);
        return NextResponse.json({ ok: true });
      }

      if (!data) {
        await answerLocalPayBotCallbackQuery(id, 'لا يوجد إجراء محدد');
        return NextResponse.json({ ok: true });
      }

      // ── A. Admin Confirmed: YES - Payment Received (نعم تم الدفع) ──
      if (data.startsWith('local_pay_confirm:')) {
        const orderRef = data.replace('local_pay_confirm:', '').trim().replace(/^#/, '');
        console.log(`[Local Pay Bot] Admin ${from?.first_name} confirmed payment for order #${orderRef}`);

        // 1. Query order in Supabase
        const { data: matchedOrders } = await supabaseAdmin
          .from('orders')
          .select('id, user_id, amount, status, session_id, payment_sender, created_at, products(id, name, name_ar)')
          .or(`session_id.eq.arab_${orderRef},session_id.ilike.%${orderRef}%,id.ilike.%${orderRef}%`);

        const primaryOrder = matchedOrders && matchedOrders.length > 0 ? matchedOrders[0] : null;
        const targetUserId = primaryOrder?.user_id || null;
        const targetSessionId = primaryOrder?.session_id || `arab_${orderRef}`;

        // 2. Fetch customer profile info
        let customerProfile: any = null;
        if (targetUserId) {
          const { data: prof } = await supabaseAdmin
            .from('profiles')
            .select('id, email, display_name, phone, country')
            .eq('id', targetUserId)
            .maybeSingle();
          customerProfile = prof;
        }

        // Check if this order is a wallet topup
        const isWalletTopupOrder = (matchedOrders || []).some(
          (o: any) => o.product_key === 'WALLET_TOPUP_PENDING' || (!o.product_id && o.product_key?.includes('WALLET'))
        );

        if (isWalletTopupOrder) {
          // Fulfill wallet topup immediately
          await fulfillOrderSession(targetSessionId);

          await answerLocalPayBotCallbackQuery(
            id,
            'تم تأكيد الدفع وإضافة الرصيد إلى محفظة العميل بنجاح!',
            true
          );

          if (chatId && messageId) {
            const updatedText = `
<b>✅ تم شحن رصيد المحفظة بنجاح للطلب #${escapeHtml(orderRef)}!</b>
━━━━━━━━━━━━━━━━━━━━━━━━━
<b>الجلسة:</b> <code>${escapeHtml(targetSessionId)}</code>
<b>العميل:</b> <b>${escapeHtml(customerProfile?.display_name || 'العميل')}</b> (<code>${escapeHtml(customerProfile?.email || 'غير محدد')}</code>)
<b>المعتمد:</b> ${escapeHtml(from?.first_name || 'الأدمن')}
<b>الوقت:</b> ${new Date().toLocaleTimeString('ar-EG')}
<b>الحالة:</b> مكتمل وتمت إضافة الرصيد إلى محفظة العميل فورياً 💳
            `.trim();
            await editLocalPayBotMessage(chatId, messageId, updatedText);
          }

          return NextResponse.json({ ok: true });
        }

        // 3. Update order status to pending fulfillment / awaiting key
        if (matchedOrders && matchedOrders.length > 0) {
          const orderIds = matchedOrders.map((o) => o.id);
          await supabaseAdmin
            .from('orders')
            .update({
              status: 'pending_fulfillment',
              product_key: 'CONFIRMED_AWAITING_KEY',
            })
            .in('id', orderIds);
        } else {
          await supabaseAdmin
            .from('orders')
            .update({
              status: 'pending_fulfillment',
              product_key: 'CONFIRMED_AWAITING_KEY',
            })
            .eq('session_id', targetSessionId);
        }

        // 4. Insert notification for the customer: "تم تسليم في الوقت المناسب"
        if (targetUserId) {
          try {
            await supabaseAdmin.from('notifications').insert({
              user_id: targetUserId,
              title: `تم تأكيد سداد الطلب #${orderRef}`,
              message: `تم تسليم في الوقت المناسب وتم تأكيد استلام سداد طلبك بنجاح! جاري رفع وتسليم بيانات المفتاح/الحساب لحسابك الآن.`,
              type: 'order',
              is_read: false,
            });
          } catch (notifErr) {
            console.warn('[Local Pay Bot] Notification insert error:', notifErr);
          }
        }

        // 5. Build items breakdown for the fulfillment bot
        const itemsList = (matchedOrders || []).map((o: any) => ({
          name: o.products?.name_ar || o.products?.name || 'طلب رقمي',
          quantity: 1,
          amount: Number(o.amount || 0),
        }));

        // 6. Dispatch prompt to @UpStore_payment_bot so Admin can upload/enter license key or account
        await dispatchConfirmedLocalPaymentToFulfillmentBot({
          orderRef: orderRef,
          sessionId: targetSessionId,
          customerName: customerProfile?.display_name || 'عميل UpStore',
          customerEmail: customerProfile?.email || 'غير محدد',
          userId: targetUserId || undefined,
          countryName: customerProfile?.country || 'دولة عربية',
          methodName: primaryOrder?.payment_sender || 'تحويل محلي Arabi Pay',
          displayPrice: primaryOrder?.amount ? `$${Number(primaryOrder.amount).toFixed(2)} USD` : undefined,
          totalUsd: primaryOrder?.amount ? Number(primaryOrder.amount) : undefined,
          items: itemsList.length > 0 ? itemsList : [{ name: 'منتج رقمي', quantity: 1 }],
        }).catch((err) => {
          console.warn('[Local Pay Bot] Error dispatching to fulfillment bot:', err);
        });

        // 7. Answer callback query
        await answerLocalPayBotCallbackQuery(
          id,
          'تم تأكيد الدفع بنجاح! تم إلغاء الموقت وإشعار العميل وإرسال إشعار رفع المفتاح إلى @UpStore_payment_bot.',
          true
        );

        // 8. Edit message in @UpStore_Local_pay_bot to reflect confirmation
        if (chatId && messageId) {
          const updatedText = `
<b>✅ تم تأكيد استلام الدفع بنجاح للطلب #${escapeHtml(orderRef)}!</b>
━━━━━━━━━━━━━━━━━━━━━━━━━
<b>الجلسة:</b> <code>${escapeHtml(targetSessionId)}</code>
<b>العميل:</b> <b>${escapeHtml(customerProfile?.display_name || 'العميل')}</b> (<code>${escapeHtml(customerProfile?.email || 'غير محدد')}</code>)
<b>المعتمد:</b> ${escapeHtml(from?.first_name || 'الأدمن')}
<b>الوقت:</b> ${new Date().toLocaleTimeString('ar-EG')}

<b>الإجراءات المكتملة:</b>
1. ✅ تم إلغاء الموقت التنازلي من واجهة العميل فوراً.
2. 📢 تم إرسال إشعار في حساب العميل: <i>"تم تسليم في الوقت المناسب"</i>.
3. 🚀 تم إرسال إشعار فوري إلى <b>@${PAYMENT_BOT_USERNAME}</b> لرفع المفتاح أو بيانات الحساب.
          `.trim();

          await editLocalPayBotMessage(chatId, messageId, updatedText, [
            [
              {
                text: 'فتح بوت التسليم @UpStore_payment_bot',
                url: `https://t.me/${PAYMENT_BOT_USERNAME}`,
              },
            ],
            [
              {
                text: 'لوحة تحكم UpStore',
                url: 'https://upstore.one/admin',
              },
            ],
          ]);
        }

        return NextResponse.json({ ok: true });
      }

      // ── B. Admin Rejected: NO - Payment Not Received (لا لم يتم الدفع) ──
      if (data.startsWith('local_pay_reject:')) {
        const orderRef = data.replace('local_pay_reject:', '').trim().replace(/^#/, '');
        console.log(`[Local Pay Bot] Admin ${from?.first_name} rejected payment for order #${orderRef}`);

        // 1. Query order in Supabase
        const { data: matchedOrders } = await supabaseAdmin
          .from('orders')
          .select('id, user_id, amount, session_id')
          .or(`session_id.eq.arab_${orderRef},session_id.ilike.%${orderRef}%,id.ilike.%${orderRef}%`);

        const primaryOrder = matchedOrders && matchedOrders.length > 0 ? matchedOrders[0] : null;
        const targetUserId = primaryOrder?.user_id || null;
        const targetSessionId = primaryOrder?.session_id || `arab_${orderRef}`;

        // 2. Mark order as cancelled and unpaid
        if (matchedOrders && matchedOrders.length > 0) {
          const orderIds = matchedOrders.map((o) => o.id);
          await supabaseAdmin
            .from('orders')
            .update({
              status: 'cancelled',
              product_key: 'UNPAID_CANCELLED',
            })
            .in('id', orderIds);
        } else {
          await supabaseAdmin
            .from('orders')
            .update({
              status: 'cancelled',
              product_key: 'UNPAID_CANCELLED',
            })
            .eq('session_id', targetSessionId);
        }

        // 3. Issue Strike to Customer Profile
        let newStrikes = 1;
        let isBanned = false;
        let customerProfile: any = null;

        if (targetUserId) {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id, email, display_name, phone, strike_count, strikes_history, is_banned, ban_reason, is_phone_blacklisted')
            .eq('id', targetUserId)
            .maybeSingle();

          customerProfile = profile;

          if (profile) {
            const currentStrikes = Number(profile.strike_count || 0);
            newStrikes = currentStrikes + 1;
            const existingHistory = Array.isArray(profile.strikes_history) ? profile.strikes_history : [];
            isBanned = newStrikes >= 2;

            const strikeEntry = {
              id: crypto.randomUUID(),
              strike_number: newStrikes,
              reason: `عدم الالتزام بسداد طلب Arabi Pay (#${orderRef}) بعد التأكيد`,
              order_id: orderRef,
              created_at: new Date().toISOString(),
              issued_by: `@${LOCAL_PAY_BOT_USERNAME}`,
            };

            const updatedFields: Record<string, any> = {
              strike_count: newStrikes,
              strikes_history: [...existingHistory, strikeEntry],
              is_banned: isBanned ? true : Boolean(profile.is_banned),
              ban_reason: isBanned
                ? `تم حظر الحساب نهائياً لتكرار عدم الالتزام بسداد طلبات Arabi Pay (الوصول للإنذار الثاني ${newStrikes}/2).`
                : profile.ban_reason,
              is_phone_blacklisted: isBanned ? true : Boolean(profile.is_phone_blacklisted),
            };

            await supabaseAdmin.from('profiles').update(updatedFields).eq('id', targetUserId);

            // 4. Insert Warning Notification for Customer
            try {
              await supabaseAdmin.from('notifications').insert({
                user_id: targetUserId,
                title: isBanned
                  ? `تم حظر الحساب نهائياً (الإنذار الثاني ${newStrikes}/2)`
                  : `تحذير أمني: إنذار لعدم سداد الطلب #${orderRef} (${newStrikes}/2)`,
                message: isBanned
                  ? `تم حظر حسابك ورقم هاتفك نهائياً بعد تسجيل الإنذار الثاني بسبب عدم سداد طلب Arabi Pay (#${orderRef}). لاستئناف الخدمة يرجى مراجعة الدعم الفني.`
                  : `تم إلغاء الطلب #${orderRef} وتسجيل الإنذار الأول (${newStrikes}/2) على حسابك لعدم إتمام السداد. تذكر أن تكرار المخالفة سيؤدي لحظر الحساب نهائياً.`,
                type: isBanned ? 'warning' : 'alert',
                is_read: false,
              });
            } catch (notifErr) {
              console.warn('[Local Pay Bot] Warning notification error:', notifErr);
            }
          }
        }

        // 5. Answer callback query
        await answerLocalPayBotCallbackQuery(
          id,
          `تم تسجيل عدم الدفع وإلغاء الطلب، وتم تسجيل الإنذار (${newStrikes}/2) على العميل وإلغاء الموقت.`,
          true
        );

        // 6. Edit message in @UpStore_Local_pay_bot
        if (chatId && messageId) {
          const updatedText = `
<b>❌ تم تسجيل عدم الدفع وإلغاء الطلب #${escapeHtml(orderRef)}</b>
━━━━━━━━━━━━━━━━━━━━━━━━━
<b>الجلسة:</b> <code>${escapeHtml(targetSessionId)}</code>
<b>العميل:</b> <b>${escapeHtml(customerProfile?.display_name || 'العميل')}</b> (<code>${escapeHtml(customerProfile?.email || 'غير محدد')}</code>)
<b>بواسطة:</b> ${escapeHtml(from?.first_name || 'الأدمن')}
<b>الوقت:</b> ${new Date().toLocaleTimeString('ar-EG')}

<b>الإجراءات المطبقة:</b>
1. 🛑 تم إلغاء الطلب وإخفاء الموقت التنازلي من واجهة العميل.
2. ⚠️ تم تسجيل <b>الإنذار (${newStrikes}/2)</b> على حساب العميل${isBanned ? ' وتم حظر الحساب نهائياً (2 Strikes)' : ''}.
3. 📢 تم إرسال إشعار تحذيري رسمي إلى حساب العميل.
          `.trim();

          await editLocalPayBotMessage(chatId, messageId, updatedText, [
            [
              {
                text: 'لوحة تحكم UpStore',
                url: 'https://upstore.one/admin',
              },
            ],
          ]);
        }

        return NextResponse.json({ ok: true });
      }
    }

    // ──────────────────────────────────────────────────────────
    // 2. Handle Text Messages & Bot Start / Help
    // ──────────────────────────────────────────────────────────
    if (update.message) {
      const { chat, text, from } = update.message;
      const chatId = chat?.id;

      if (!chatId || !text) {
        return NextResponse.json({ ok: true });
      }

      // Security Guard: Reject unauthorized users
      const isAuth = await isAuthorizedTelegramAdmin(chatId);
      if (!isAuth) {
        await sendLocalPayBotMessage(chatId, TELEGRAM_UNAUTHORIZED_MESSAGE);
        return NextResponse.json({ ok: true, blocked: true });
      }

      const trimmedText = text.trim();

      if (trimmedText === '/start' || trimmedText === '/help') {
        const welcome = `
أهلاً بك <b>${escapeHtml(from?.first_name || 'أدمن')}</b> في بوت التحقق من المدفوعات المحلية <b>@${LOCAL_PAY_BOT_USERNAME}</b> لمتجر <b>UpStore</b>!
━━━━━━━━━━━━━━━━━━━━━━━━━

<b>مهام البوت:</b>
1. استقبال طلبات الدفع العربي والمحلي (Arabi Pay) فور إنشائها.
2. عرض كافة بيانات العميل والطلب ورقم الطلب الرسمي المتطابق مع الدعم.
3. أزرار تفاعلية للتحقق الفوري:
   • <b>نعم تم الدفع:</b> لإلغاء الموقت فوراً، إشعار العميل بالتسليم في الوقت المناسب، وإرسال تنبيه إلى <b>@${PAYMENT_BOT_USERNAME}</b> لرفع المفتاح.
   • <b>لا لم يتم الدفع:</b> لإلغاء الموقت وإلغاء الطلب وتسجيل الإنذار الأول (Strike 1/2) على حساب العميل.
        `.trim();

        await sendLocalPayBotMessage(chatId, welcome, [
          [{ text: 'لوحة تحكم UpStore', url: 'https://upstore.one/admin' }],
        ]);
        return NextResponse.json({ ok: true });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[Local Pay Bot Webhook Handler Error]:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const webhookResult = await setLocalPayBotWebhook();
  return NextResponse.json({
    status: 'active',
    bot: `@${LOCAL_PAY_BOT_USERNAME}`,
    service: 'UpStore Arabi Pay & Local Payment Verification Webhook',
    webhook_registration: webhookResult,
  });
}
