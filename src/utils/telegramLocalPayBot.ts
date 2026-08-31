/**
 * telegramLocalPayBot.ts — Dedicated Arabi Pay & Local Payment Verification Bot
 * Bot Token: 7894216934:AAG_DQhEbgFxIJ776uo5w8-6BqtrkBIVd_M
 * Username: @UpStore_Local_pay_bot
 */

import {
  escapeHtml,
  TelegramInlineButton,
  resilientTelegramFetch,
  generateTelegramWebhookSecret,
} from './telegram';
import { formatTelemetryForTelegram, ClientTelemetryData } from './clientTelemetry';

export const LOCAL_PAY_BOT_TOKEN =
  process.env.TELEGRAM_LOCAL_PAY_BOT_TOKEN || '7894216934:AAG_DQhEbgFxIJ776uo5w8-6BqtrkBIVd_M';
export const LOCAL_PAY_BOT_USERNAME =
  process.env.TELEGRAM_LOCAL_PAY_BOT_USERNAME || 'UpStore_Local_pay_bot';

export type { TelegramInlineButton };

export interface LocalPayOrderAlertDetails {
  orderRef: string; // e.g. UP-593812
  sessionId: string; // arab_UP-593812
  customerName?: string;
  customerEmail?: string;
  userId?: string;
  phone?: string;
  countryName: string;
  countryFlag?: string;
  methodName: string;
  displayPrice: string;
  totalUsd?: number;
  items: Array<{
    name: string;
    quantity: number;
    amount?: number;
  }>;
  userNote?: string;
  customerIp?: string;
  biometricVerified?: boolean;
  userStrikes?: number;
  clientTelemetry?: Partial<ClientTelemetryData>;
}

async function getLocalPayAdminChatId(): Promise<string | number> {
  if (process.env.TELEGRAM_LOCAL_PAY_CHAT_ID) return process.env.TELEGRAM_LOCAL_PAY_CHAT_ID;
  if (process.env.TELEGRAM_PAYMENT_CHAT_ID) return process.env.TELEGRAM_PAYMENT_CHAT_ID;
  if (process.env.TELEGRAM_CHAT_ID) return process.env.TELEGRAM_CHAT_ID;
  try {
    const { createAdminClient } = await import('@/utils/supabase/admin');
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'telegram_payment_chat_id')
      .maybeSingle();
    if (data?.value) {
      const clean = typeof data.value === 'string' ? data.value.replace(/^"|"$/g, '') : String(data.value);
      if (clean) return clean;
    }
  } catch (e) {
    console.error('Error loading chat id from site_settings:', e);
  }
  return '8982469612'; // Verified Admin Chat ID
}

let lastWebhookCheck = 0;

/**
 * Ensures the webhook for @UpStore_Local_pay_bot is active
 */
export async function ensureLocalPayBotWebhook(): Promise<void> {
  const now = Date.now();
  if (now - lastWebhookCheck < 5 * 60 * 1000) return; // Check every 5 mins
  lastWebhookCheck = now;

  try {
    const token = LOCAL_PAY_BOT_TOKEN;
    if (!token) return;
    const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`).then((r) => r.json()).catch(() => null);
    const expectedUrl = 'https://www.upstore.one/api/webhooks/telegram/local-pay';
    if (!infoRes?.result?.url || infoRes.result.url !== expectedUrl) {
      console.log('[Local Pay Bot] Restoring webhook to:', expectedUrl);
      await setLocalPayBotWebhook(expectedUrl);
    }
  } catch (e) {
    console.warn('[Local Pay Bot] Webhook check failed:', e);
  }
}

/**
 * Sets the webhook for @UpStore_Local_pay_bot with cryptographic Secret Token
 */
export async function setLocalPayBotWebhook(webhookUrl?: string): Promise<{ ok: boolean; description?: string }> {
  const token = LOCAL_PAY_BOT_TOKEN;
  if (!token) return { ok: false, description: 'Missing local pay bot token' };

  const url = webhookUrl || 'https://www.upstore.one/api/webhooks/telegram/local-pay';
  const secretToken = generateTelegramWebhookSecret(token);

  try {
    const res = await resilientTelegramFetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        drop_pending_updates: false,
        allowed_updates: ['message', 'callback_query'],
        secret_token: secretToken,
      }),
    });
    return await res.json();
  } catch (err: any) {
    return { ok: false, description: err.message };
  }
}

/**
 * Sends a message from @UpStore_Local_pay_bot with retry resilience
 */
export async function sendLocalPayBotMessage(
  chatId: string | number,
  text: string,
  replyMarkup?: TelegramInlineButton[][] | Record<string, any>
): Promise<{ ok: boolean; result?: any; error?: string }> {
  const token = LOCAL_PAY_BOT_TOKEN;
  if (!token) return { ok: false, error: 'Local pay bot token missing' };

  // Ensure webhook is properly active
  ensureLocalPayBotWebhook().catch(() => {});

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const safeText = text.length > 4000 ? text.substring(0, 3990) + '...' : text;

  const payload: Record<string, any> = {
    chat_id: chatId,
    text: safeText,
    parse_mode: 'HTML',
    disable_web_page_preview: false,
  };

  if (replyMarkup) {
    if (Array.isArray(replyMarkup)) {
      payload.reply_markup = { inline_keyboard: replyMarkup };
    } else {
      payload.reply_markup = replyMarkup;
    }
  }

  try {
    let res = await resilientTelegramFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      delete payload.parse_mode;
      res = await resilientTelegramFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    return await res.json();
  } catch (err: any) {
    console.error('[Local Pay Bot Send Error]:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Edits the text of an existing message in @UpStore_Local_pay_bot
 */
export async function editLocalPayBotMessage(
  chatId: string | number,
  messageId: number,
  newText: string,
  inlineKeyboard?: TelegramInlineButton[][]
): Promise<boolean> {
  const token = LOCAL_PAY_BOT_TOKEN;
  if (!token) return false;

  const url = `https://api.telegram.org/bot${token}/editMessageText`;
  try {
    const res = await resilientTelegramFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: newText.length > 4096 ? newText.substring(0, 4090) + '...' : newText,
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard ? { inline_keyboard: inlineKeyboard } : { inline_keyboard: [] },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Answers a Telegram callback query
 */
export async function answerLocalPayBotCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert: boolean = false
): Promise<boolean> {
  const token = LOCAL_PAY_BOT_TOKEN;
  if (!token) return false;

  const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || 'تم تنفيذ الإجراء بنجاح',
        show_alert: showAlert,
      }),
    });
    return true;
  } catch (err) {
    console.error('[Local Pay Bot Callback Error]:', err);
    return false;
  }
}

/**
 * Dispatches an instant executive payment verification alert to @UpStore_Local_pay_bot
 * Contains complete order and user dossier with [✅ نعم - تم الدفع] / [❌ لا - لم يتم الدفع] buttons
 */
export async function dispatchLocalPayOrderAlert(details: LocalPayOrderAlertDetails): Promise<void> {
  const chatId = await getLocalPayAdminChatId();

  // 1. Build items list
  let itemsSummary = '';
  for (const item of details.items) {
    itemsSummary += `├ <b>${escapeHtml(item.name)}</b>\n│  └ الكمية: <code>x${item.quantity}</code>${item.amount ? ` • القيمة: <code>$${item.amount.toFixed(2)} USD</code>` : ''}\n`;
  }
  if (!itemsSummary) {
    itemsSummary = `├ <b>طلب رقمي</b> <code>x1</code>\n`;
  }

  const cleanOrderRef = details.orderRef.replace(/^#/, '');

  // 2. Extra customer badges
  const strikesBadge =
    details.userStrikes && details.userStrikes > 0
      ? `\n├ ⚠️ <b>سجل الإنذارات:</b> <code>${details.userStrikes}/2 Strikes</code>`
      : '';

  const biometricBadge = details.biometricVerified
    ? `\n├ 🛡️ <b>تأكيد البصمة الذكية:</b> <code>تم التحقق من بصمة الجهاز ✅</code>`
    : '';

  const phoneBadge = details.phone
    ? `\n├ 📱 <b>الهاتف المسجل:</b> <code>${escapeHtml(details.phone)}</code>`
    : '';

  const noteBadge = details.userNote
    ? `\n├ 📝 <b>ملاحظة:</b> <code>${escapeHtml(details.userNote)}</code>`
    : '';

  const telemetryBlock = details.clientTelemetry ? `\n${formatTelemetryForTelegram(details.clientTelemetry)}\n` : '';

  const text = `
<b>[طلب دفع محلي جديد — بانتظار التحقق من السداد]</b>
━━━━━━━━━━━━━━━━━━━━━━━━━

<b>بيانات الطلب والعميل:</b>
├ <b>رقم الطلب الرسمي:</b> <code>#${escapeHtml(cleanOrderRef)}</code>
├ <b>معرف الجلسة:</b> <code>${escapeHtml(details.sessionId)}</code>
├ <b>اسم العميل / المعرف:</b> <b>${escapeHtml(details.customerName || 'عميل UpStore')}</b>
├ <b>البريد الإلكتروني:</b> <code>${escapeHtml(details.customerEmail || 'غير محدد')}</code>${phoneBadge}${strikesBadge}${biometricBadge}
├ <b>الدولة:</b> <b>${escapeHtml(details.countryName)}</b> ${details.countryFlag || ''}
├ <b>وسيلة الدفع:</b> <code>${escapeHtml(details.methodName)}</code>
├ <b>المبلغ المطلوب:</b> <b>${escapeHtml(details.displayPrice)}</b>${details.totalUsd ? ` (<code>$${details.totalUsd.toFixed(2)} USD</code>)` : ''}${noteBadge}
└ <b>تاريخ الإنشاء:</b> <code>${new Date().toLocaleTimeString('ar-EG')} - ${new Date().toLocaleDateString('ar-EG')}</code>

<b>المنتجات المطلوبة:</b>
${itemsSummary}${telemetryBlock}
━━━━━━━━━━━━━━━━━━━━━━━━━
<b>سؤال التحقق للأدمن:</b>
❓ <b>هل قام العميل بالدفع وتسليم المبلغ بالكامل؟</b>
  `.trim();

  const inlineKeyboard: TelegramInlineButton[][] = [
    [
      {
        text: '✅ نعم - تم استلام الدفع',
        callback_data: `local_pay_confirm:${cleanOrderRef}`,
      },
      {
        text: '❌ لا - لم يتم الدفع',
        callback_data: `local_pay_reject:${cleanOrderRef}`,
      },
    ],
    [
      {
        text: 'لوحة التحكم UpStore',
        url: 'https://upstore.one/admin',
      },
      {
        text: 'محادثة الدعم @UpStore_help',
        url: 'https://t.me/UpStore_help',
      },
    ],
  ];

  await sendLocalPayBotMessage(chatId, text, inlineKeyboard);
}
