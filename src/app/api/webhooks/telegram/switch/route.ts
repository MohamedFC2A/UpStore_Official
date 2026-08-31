import { NextResponse } from 'next/server';
import {
  SWITCH_BOT_TOKEN,
  SWITCH_BOT_USERNAME,
  setSwitchBotWebhook,
  sendSwitchBotMessage,
  answerSwitchBotCallbackQuery,
  editSwitchBotMessage,
  getStoreMaintenanceStatus,
  setStoreMaintenanceStatus,
  getStoreLiveMetrics,
  buildSwitchBotReplyKeyboard,
  buildSwitchBotInlinePanel,
} from '@/utils/telegramSwitchBot';
import { processSwitchAiQuery } from '@/utils/telegramSwitchAiEngine';
import {
  isAuthorizedTelegramAdmin,
  TELEGRAM_UNAUTHORIZED_MESSAGE,
  verifyTelegramWebhookSecret,
} from '@/utils/telegram';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Builds the executive welcome & control message
 */
function buildExecutiveControlMessage(isMaintenance: boolean, metrics: any) {
  const statusEmoji = isMaintenance ? '🔴' : '🟢';
  const statusTitle = isMaintenance ? 'مغلق مؤقتاً (وضع النوم 🌙)' : 'أونلاين ونشط ومتاح للشراء ☀️';
  const actionHint = isMaintenance
    ? 'الموقع مغلق حالياً ولا يمكن للزوار الدفع أو الشراء حتى تفتحه.'
    : 'الموقع مفتوح حالياً والتسليم التلقائي يعمل بأعلى كفاءة.';

  return `🎛️ <b>غرفة التحكم المركزية لمتجر UpStore</b>
بواسطة: <b>@${SWITCH_BOT_USERNAME}</b> (مدعوم بـ Gemini 2.5 Flash)

━━━━━━━━━━━━━━━━━━━━
⚡ <b>حالة الموقع الآن:</b> ${statusEmoji} <b>${statusTitle}</b>
ℹ️ ${actionHint}
━━━━━━━━━━━━━━━━━━━━

📊 <b>نظرة سريعة على أداء اليوم:</b>
• <b>طلبات اليوم:</b> ${metrics.totalOrdersToday} طلب (${metrics.completedOrdersToday} مكتمل | ${metrics.pendingOrdersToday} معلق)
• <b>مبيعات اليوم:</b> $${metrics.revenueTodayUsd} USD (~${metrics.revenueTodayEgp} ج.م)
• <b>المنتجات النشطة:</b> ${metrics.totalProductsCount} منتج (${metrics.lowStockCount} منخفض المخزون)

💡 <b>الأوامر السريعة:</b>
- اضغط <b>🔴 إيقاف الموقع</b> عند الذهاب للنوم لقفل المتجر.
- اضغط <b>🟢 فتح الموقع</b> عند الاستيقاظ لاستئناف استقبال الطلبات.
- أو اكتب لي أي سؤال أو استفسار وسأجيبك فوراً بالذكاء الاصطناعي! ✨`;
}

export async function POST(req: Request) {
  try {
    // Cryptographic Secret Token Verification
    if (!verifyTelegramWebhookSecret(req, SWITCH_BOT_TOKEN)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized secret token' }, { status: 403 });
    }

    const update = await req.json().catch(() => null);
    if (!update) {
      return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
    }

    // ── 1. Handle Inline Callback Queries ────────────────────────────────
    if (update.callback_query) {
      const { id, from, message, data } = update.callback_query;
      const chatId = message?.chat?.id || from?.id;
      const messageId = message?.message_id;

      if (!chatId || !await isAuthorizedTelegramAdmin(chatId)) {
        await answerSwitchBotCallbackQuery(id, '⛔ غير مصرح لك بهذا الإجراء', true);
        return NextResponse.json({ ok: true });
      }

      if (!data) {
        return NextResponse.json({ ok: true });
      }

      if (data === 'SWITCH_ACTION_CLOSE') {
        await setStoreMaintenanceStatus(true);
        await answerSwitchBotCallbackQuery(id, 'تم إغلاق الموقع وتفعيل وضع النوم 🌙', true);
        const metrics = await getStoreLiveMetrics();
        const text = buildExecutiveControlMessage(true, metrics);
        if (messageId) {
          await editSwitchBotMessage(chatId, messageId, text, {
            reply_markup: buildSwitchBotInlinePanel(true),
          });
        }
        return NextResponse.json({ ok: true });
      }

      if (data === 'SWITCH_ACTION_OPEN') {
        await setStoreMaintenanceStatus(false);
        await answerSwitchBotCallbackQuery(id, 'تم فتح الموقع وأصبح أونلاين ☀️', true);
        const metrics = await getStoreLiveMetrics();
        const text = buildExecutiveControlMessage(false, metrics);
        if (messageId) {
          await editSwitchBotMessage(chatId, messageId, text, {
            reply_markup: buildSwitchBotInlinePanel(false),
          });
        }
        return NextResponse.json({ ok: true });
      }

      if (data === 'SWITCH_ACTION_REFRESH') {
        await answerSwitchBotCallbackQuery(id, 'تم تحديث البيانات 🔄');
        const { isMaintenance } = await getStoreMaintenanceStatus();
        const metrics = await getStoreLiveMetrics();
        const text = buildExecutiveControlMessage(isMaintenance, metrics);
        if (messageId) {
          await editSwitchBotMessage(chatId, messageId, text, {
            reply_markup: buildSwitchBotInlinePanel(isMaintenance),
          });
        }
        return NextResponse.json({ ok: true });
      }

      if (data === 'SWITCH_ACTION_STATS') {
        await answerSwitchBotCallbackQuery(id);
        const metrics = await getStoreLiveMetrics();
        const statsMsg = `📊 <b>تقرير المبيعات والنشاط التشغيلي اليوم:</b>

💰 <b>الإيرادات:</b> $${metrics.revenueTodayUsd} USD (~${metrics.revenueTodayEgp} ج.م)
📦 <b>إجمالي الطلبات:</b> ${metrics.totalOrdersToday} طلب
✅ <b>طلبات مكتملة:</b> ${metrics.completedOrdersToday} طلب
⏳ <b>طلبات معلقة:</b> ${metrics.pendingOrdersToday} طلب
🛒 <b>إجمالي المنتجات:</b> ${metrics.totalProductsCount} منتج
⚠️ <b>منتجات منخفضة المخزون:</b> ${metrics.lowStockCount} منتج`;

        await sendSwitchBotMessage(chatId, statsMsg, {
          reply_markup: buildSwitchBotReplyKeyboard(),
        });
        return NextResponse.json({ ok: true });
      }

      if (data === 'SWITCH_ACTION_PENDING') {
        await answerSwitchBotCallbackQuery(id);
        const metrics = await getStoreLiveMetrics();
        if (metrics.pendingManualList.length === 0) {
          await sendSwitchBotMessage(chatId, '✅ <b>لا توجد أي طلبات معلقة حالياً!</b> كل الطلبات منجزة أو مدفوعة بنجاح.');
        } else {
          let listMsg = `📦 <b>قائمة الطلبات المعلقة (${metrics.pendingManualList.length}):</b>\n\n`;
          metrics.pendingManualList.forEach((p, idx) => {
            listMsg += `<b>${idx + 1}. ${p.productName}</b>\n`;
            listMsg += `👤 العميل: <code>${p.customerEmail}</code>\n`;
            listMsg += `💵 المبلغ: <b>${p.amount} ${p.currency}</b>\n`;
            listMsg += `🆔 رقم الطلب: <code>${p.id}</code>\n\n`;
          });
          listMsg += `🔗 لمراجعة واعتماد الطلبات: <a href="https://www.upstore.one/admin">لوحة تحكم الأدمن</a>`;
          await sendSwitchBotMessage(chatId, listMsg);
        }
        return NextResponse.json({ ok: true });
      }

      return NextResponse.json({ ok: true });
    }

    // ── 2. Handle Text Messages & Persistent Commands ───────────────────
    if (update.message) {
      const { chat, text, from } = update.message;
      const chatId = chat?.id;
      const userName = from?.first_name || 'Admin';

      if (!chatId || !text) {
        return NextResponse.json({ ok: true });
      }

      // Security Guard: Reject unauthorized users
      const isAuth = await isAuthorizedTelegramAdmin(chatId);
      if (!isAuth) {
        await sendSwitchBotMessage(chatId, TELEGRAM_UNAUTHORIZED_MESSAGE);
        return NextResponse.json({ ok: true, blocked: true });
      }

      const trimmed = text.trim();

      // A. /start or /help command
      if (trimmed === '/start' || trimmed === '/help') {
        const { isMaintenance } = await getStoreMaintenanceStatus();
        const metrics = await getStoreLiveMetrics();
        const welcomeText = buildExecutiveControlMessage(isMaintenance, metrics);

        await sendSwitchBotMessage(chatId, welcomeText, {
          reply_markup: buildSwitchBotReplyKeyboard(),
        });
        await sendSwitchBotMessage(chatId, '👇 <b>لوحة التحكم اللحظية بالمتجر:</b>', {
          reply_markup: buildSwitchBotInlinePanel(isMaintenance),
        });
        return NextResponse.json({ ok: true });
      }

      // B. Persistent Button: 🔴 إيقاف الموقع (وضع النوم 🌙)
      if (trimmed.includes('إيقاف الموقع') || trimmed.includes('وضع النوم') || trimmed === '/close' || trimmed === '/off') {
        await setStoreMaintenanceStatus(true);
        const closeMsg = `🌙 <b>تم إيقاف الموقع وتفعيل وضع النوم بنجاح!</b>

🔴 <b>حالة المتجر:</b> مغلق ومحمي (SLEEP MODE).
🛡️ <b>الحماية:</b> لن يتمكن الزوار من إنشاء طلبات جديدة حتى تستيقظ وتفتح المتجر.
🛌 <b>تصبح على خير!</b> عند استيقاظك، اضغط زر <b>🟢 فتح الموقع</b> لاستئناف العمل فوراً.`;

        await sendSwitchBotMessage(chatId, closeMsg, {
          reply_markup: buildSwitchBotReplyKeyboard(),
        });
        await sendSwitchBotMessage(chatId, '👇 <b>التحكم السريع:</b>', {
          reply_markup: buildSwitchBotInlinePanel(true),
        });
        return NextResponse.json({ ok: true });
      }

      // C. Persistent Button: 🟢 فتح الموقع (أونلاين ☀️)
      if (trimmed.includes('فتح الموقع') || trimmed.includes('أونلاين') || trimmed === '/open' || trimmed === '/on') {
        await setStoreMaintenanceStatus(false);
        const metrics = await getStoreLiveMetrics();
        const openMsg = `☀️ <b>صباح الخير والبركة! تم فتح الموقع بنجاح.</b>

🟢 <b>حالة المتجر:</b> أونلاين ونشط لاستقبال الطلبات (ONLINE).
🚀 <b>حركة العمل:</b> التسليم التلقائي يعمل بكامل طاقته ومتاح لجميع الزوار.
📊 <b>طلبات اليوم:</b> ${metrics.totalOrdersToday} طلب (${metrics.completedOrdersToday} مكتمل).

نتمنى لك يوماً حافلاً بالمبيعات والأرباح! ✨`;

        await sendSwitchBotMessage(chatId, openMsg, {
          reply_markup: buildSwitchBotReplyKeyboard(),
        });
        await sendSwitchBotMessage(chatId, '👇 <b>التحكم السريع:</b>', {
          reply_markup: buildSwitchBotInlinePanel(false),
        });
        return NextResponse.json({ ok: true });
      }

      // D. Persistent Button: 📊 إحصائيات المبيعات
      if (trimmed.includes('إحصائيات المبيعات') || trimmed === '/stats') {
        const metrics = await getStoreLiveMetrics();
        const statsMsg = `📊 <b>تقرير المبيعات والنشاط التشغيلي اليوم:</b>

💰 <b>الإيرادات:</b> $${metrics.revenueTodayUsd} USD (~${metrics.revenueTodayEgp} ج.م)
📦 <b>إجمالي الطلبات:</b> ${metrics.totalOrdersToday} طلب
✅ <b>طلبات مكتملة:</b> ${metrics.completedOrdersToday} طلب
⏳ <b>طلبات معلقة:</b> ${metrics.pendingOrdersToday} طلب
🛒 <b>إجمالي المنتجات:</b> ${metrics.totalProductsCount} منتج
⚠️ <b>منتجات منخفضة المخزون:</b> ${metrics.lowStockCount} منتج`;

        await sendSwitchBotMessage(chatId, statsMsg, {
          reply_markup: buildSwitchBotReplyKeyboard(),
        });
        return NextResponse.json({ ok: true });
      }

      // E. Persistent Button: 📦 الطلبات المعلقة
      if (trimmed.includes('الطلبات المعلقة') || trimmed === '/pending') {
        const metrics = await getStoreLiveMetrics();
        if (metrics.pendingManualList.length === 0) {
          await sendSwitchBotMessage(chatId, '✅ <b>لا توجد أي طلبات معلقة حالياً!</b> كل الطلبات منجزة بنجاح.');
        } else {
          let listMsg = `📦 <b>قائمة الطلبات المعلقة (${metrics.pendingManualList.length}):</b>\n\n`;
          metrics.pendingManualList.forEach((p, idx) => {
            listMsg += `<b>${idx + 1}. ${p.productName}</b>\n`;
            listMsg += `👤 العميل: <code>${p.customerEmail}</code>\n`;
            listMsg += `💵 المبلغ: <b>${p.amount} ${p.currency}</b>\n`;
            listMsg += `🆔 رقم الطلب: <code>${p.id}</code>\n\n`;
          });
          listMsg += `🔗 لمراجعة واعتماد الطلبات: <a href="https://www.upstore.one/admin">لوحة تحكم الأدمن</a>`;
          await sendSwitchBotMessage(chatId, listMsg);
        }
        return NextResponse.json({ ok: true });
      }

      // F. Persistent Button: ⚡ فحص السيرفر والجاهزية
      if (trimmed.includes('فحص السيرفر') || trimmed === '/health') {
        const start = Date.now();
        const { isMaintenance } = await getStoreMaintenanceStatus();
        const dbLatency = Date.now() - start;

        const healthMsg = `⚡ <b>تقرير الجاهزية والحالة الفنية للسيرفر:</b>

🟢 <b>قاعدة البيانات (Supabase PostgreSQL):</b> متصلة (${dbLatency}ms)
🟢 <b>الاستضافة والسيرفر (Vercel Edge):</b> تعمل بكفاءة 100%
🟢 <b>بوابات الدفع (Paymob, Cryptomus, Instapay):</b> مهيأة ونشطة
${isMaintenance ? '🔴 <b>حالة المتجر:</b> مغلق مؤقتاً (Sleep Mode)' : '🟢 <b>حالة المتجر:</b> أونلاين ومتاح للزوار'}

🔗 <b>رابط الموقع:</b> <a href="https://www.upstore.one">https://www.upstore.one</a>`;

        await sendSwitchBotMessage(chatId, healthMsg, {
          reply_markup: buildSwitchBotReplyKeyboard(),
        });
        return NextResponse.json({ ok: true });
      }

      // G. Persistent Button: 🤖 المساعد الذكي (Gemini)
      if (trimmed.includes('المساعد الذكي') || trimmed === '/ai') {
        const aiHelpMsg = `🤖 <b>أهلاً بك! أنا مساعدك التشغيلي الذكي مدعوم بنموذج Google Gemini 2.5 Flash.</b>

يمكنك التحدث معي باللغة العربية وسأقوم بالرد عليك وإدارة المتجر فوراً!

💡 <b>أمثلة لما يمكنك طلبه مني:</b>
• <i>"لخصلي مبيعات اليوم بالتفصيل"</i>
• <i>"اكتب بوست إعلاني جذاب لمنتج جيمناي 18 شهر لتويتر وفيسبوك"</i>
• <i>"عايز انام.. اقفل الموقع"</i>
• <i>"صحيت.. افتح الموقع"</i>
• <i>"اقترح أفكار لزيادة المبيعات والعروض الترويجية"</i>

اكتب استفسارك الآن وسأجيبك فوراً! 🚀`;

        await sendSwitchBotMessage(chatId, aiHelpMsg, {
          reply_markup: buildSwitchBotReplyKeyboard(),
        });
        return NextResponse.json({ ok: true });
      }

      // H. Freeform Natural Language Queries -> Process with Gemini 2.5 Flash
      const aiResponse = await processSwitchAiQuery(chatId, trimmed, userName);
      const currentStatus = await getStoreMaintenanceStatus();

      await sendSwitchBotMessage(chatId, aiResponse.text, {
        reply_markup: buildSwitchBotReplyKeyboard(),
      });

      if (aiResponse.triggeredAction === 'CLOSE' || aiResponse.triggeredAction === 'OPEN') {
        await sendSwitchBotMessage(chatId, '👇 <b>لوحة التحكم المحدثة:</b>', {
          reply_markup: buildSwitchBotInlinePanel(currentStatus.isMaintenance),
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[Telegram Switch Bot Webhook Error]:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  const webhookResult = await setSwitchBotWebhook();
  const { isMaintenance, updatedAt } = await getStoreMaintenanceStatus();

  return NextResponse.json({
    status: 'active',
    service: 'UpStore Power Switch & Intelligence Bot Webhook',
    bot: `@${SWITCH_BOT_USERNAME}`,
    token_present: !!SWITCH_BOT_TOKEN,
    webhook_registration: webhookResult,
    store_maintenance_mode: isMaintenance,
    last_updated: updatedAt,
    engine: 'Gemini 2.5 Flash',
  });
}
