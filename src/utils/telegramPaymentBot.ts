/**
 * telegramPaymentBot.ts — Dedicated Payment & Fulfillment Bot for UpStore
 * Bot Token: 8654341835:AAHDBnnzNQMMnunbTJPcR7sPAkyL18Nf3kQ
 * Username: @UpStore_payment_bot
 */

import {
  escapeHtml,
  TelegramInlineButton,
  resilientTelegramFetch,
  generateTelegramWebhookSecret,
} from './telegram';
import { ReceiptOcrResult } from './receiptOcr';
import { formatTelemetryForTelegram, ClientTelemetryData } from './clientTelemetry';

export const PAYMENT_BOT_TOKEN = process.env.TELEGRAM_PAYMENT_BOT_TOKEN || '8654341835:AAHDBnnzNQMMnunbTJPcR7sPAkyL18Nf3kQ';
export const PAYMENT_BOT_USERNAME = process.env.TELEGRAM_PAYMENT_BOT_USERNAME || 'UpStore_payment_bot';

/**
 * Sets the webhook for @UpStore_payment_bot with cryptographic Secret Token
 */
export async function setPaymentBotWebhook(webhookUrl?: string): Promise<{ ok: boolean; description?: string }> {
  const token = PAYMENT_BOT_TOKEN;
  if (!token) return { ok: false, description: 'Missing payment bot token' };

  const url = webhookUrl || 'https://www.upstore.one/api/webhooks/telegram/payment';
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

export type { TelegramInlineButton };

export interface PaymentOrderDetails {
  sessionId: string;
  userId?: string;
  customerEmail: string;
  customerLocation?: string;
  customerIp?: string;
  paymentMethod: string;
  totalAmount: number;
  currency: string;
  orderItems: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  paymentSender?: string;
  paymentTransactionId?: string;
  paymentScreenshot?: string;
  ocrResult?: ReceiptOcrResult;
  excessPreference?: 'wallet' | 'refund_vodafone' | 'refund_instapay' | 'refund_bank' | 'refund';
  refundRecipientAccount?: string;
  amountDiff?: number;
  clientTelemetry?: Partial<ClientTelemetryData>;
}

/**
 * Sends text notification from the Payment Bot to the admin chat
 */
export async function sendPaymentBotMessage(
  chatId: string | number,
  text: string,
  replyMarkup?: TelegramInlineButton[][] | Record<string, any>
): Promise<{ ok: boolean; result?: any; error?: string }> {
  const token = PAYMENT_BOT_TOKEN;
  if (!token) return { ok: false, error: 'Payment bot token missing' };

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
      // HTML format fallback: retry as plain text if HTML entity parsing failed
      delete payload.parse_mode;
      res = await resilientTelegramFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    return await res.json();
  } catch (err: any) {
    console.error('[Payment Bot Send Error]:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Sends a photo receipt directly with detailed OCR report and smart admin action buttons
 */
export async function sendPaymentBotPhoto(
  chatId: string | number,
  photoUrl: string,
  caption: string,
  inlineKeyboard?: TelegramInlineButton[][]
): Promise<{ ok: boolean; result?: any; error?: string }> {
  const token = PAYMENT_BOT_TOKEN;
  if (!token) return { ok: false, error: 'Payment bot token missing' };

  const url = `https://api.telegram.org/bot${token}/sendPhoto`;
  const cleanCaption = caption.length > 1024 ? caption.substring(0, 1020) + '...' : caption;

  // 1. Handle Base64 Data URI directly via Multipart/FormData upload
  if (photoUrl && (photoUrl.startsWith('data:') || photoUrl.startsWith('blob:'))) {
    try {
      const base64Data = photoUrl.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const blob = new Blob([buffer], { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('chat_id', String(chatId));
      formData.append('photo', blob, 'receipt.jpg');
      formData.append('caption', cleanCaption);
      formData.append('parse_mode', 'HTML');

      if (inlineKeyboard && inlineKeyboard.length > 0) {
        formData.append('reply_markup', JSON.stringify({ inline_keyboard: inlineKeyboard }));
      }

      const res = await resilientTelegramFetch(url, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.ok) return data;
      console.warn('[Payment Bot SendPhoto Base64 Failed]:', data);
    } catch (base64Err) {
      console.warn('[Payment Bot Base64 Upload Exception]:', base64Err);
    }

    // Fallback if base64 upload fails: Send as rich text without huge base64 in HTML
    return await sendPaymentBotMessage(
      chatId,
      `${caption}\n\n<i>(ملاحظة: تم تسجيل صورة الإيصال في النظام بنجاح)</i>`,
      inlineKeyboard
    );
  }

  // 2. Standard Public HTTP URL Photo
  const payload: Record<string, any> = {
    chat_id: chatId,
    photo: photoUrl,
    caption: cleanCaption,
    parse_mode: 'HTML',
  };

  if (inlineKeyboard && inlineKeyboard.length > 0) {
    payload.reply_markup = { inline_keyboard: inlineKeyboard };
  }

  try {
    const res = await resilientTelegramFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      console.warn('[Payment Bot SendPhoto Failed] Falling back to text:', data);
      const isHttp = typeof photoUrl === 'string' && (photoUrl.startsWith('http://') || photoUrl.startsWith('https://'));
      const receiptLink = isHttp ? `\n\n<b>رابط الإيصال:</b> <a href="${photoUrl}">اضغط للمعاينة</a>` : '';
      return await sendPaymentBotMessage(chatId, `${caption}${receiptLink}`, inlineKeyboard);
    }
    return data;
  } catch (err: any) {
    console.error('[Payment Bot Photo Error]:', err);
    const isHttp = typeof photoUrl === 'string' && (photoUrl.startsWith('http://') || photoUrl.startsWith('https://'));
    const receiptLink = isHttp ? `\n\n<b>رابط الإيصال:</b> <a href="${photoUrl}">اضغط للمعاينة</a>` : '';
    return await sendPaymentBotMessage(chatId, `${caption}${receiptLink}`, inlineKeyboard);
  }
}

/**
 * Answers a Telegram callback query (from inline button click)
 */
export async function answerPaymentBotCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert: boolean = false
): Promise<boolean> {
  const token = PAYMENT_BOT_TOKEN;
  if (!token) return false;

  const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
  try {
    await resilientTelegramFetch(url, {
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
    console.error('[Payment Bot Callback Error]:', err);
    return false;
  }
}

/**
 * Edits the caption of an existing photo message after admin decision
 */
export async function editPaymentBotCaption(
  chatId: string | number,
  messageId: number,
  newCaption: string,
  inlineKeyboard?: TelegramInlineButton[][]
): Promise<boolean> {
  const token = PAYMENT_BOT_TOKEN;
  if (!token) return false;

  const url = `https://api.telegram.org/bot${token}/editMessageCaption`;
  try {
    const res = await resilientTelegramFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        caption: newCaption.length > 1024 ? newCaption.substring(0, 1020) + '...' : newCaption,
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
 * Edits the text of an existing message after admin decision
 */
export async function editPaymentBotText(
  chatId: string | number,
  messageId: number,
  newText: string,
  inlineKeyboard?: TelegramInlineButton[][]
): Promise<boolean> {
  const token = PAYMENT_BOT_TOKEN;
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
 * Universally edits an existing payment message (photo caption or text message)
 */
export async function editPaymentBotMessage(
  chatId: string | number,
  messageId: number,
  newContent: string,
  inlineKeyboard?: TelegramInlineButton[][]
): Promise<boolean> {
  const token = PAYMENT_BOT_TOKEN;
  if (!token) return false;

  const captionSuccess = await editPaymentBotCaption(chatId, messageId, newContent, inlineKeyboard);
  if (captionSuccess) return true;

  return await editPaymentBotText(chatId, messageId, newContent, inlineKeyboard);
}

async function getPaymentAdminChatId(): Promise<string | number> {
  if (process.env.TELEGRAM_PAYMENT_CHAT_ID) return process.env.TELEGRAM_PAYMENT_CHAT_ID;
  if (process.env.TELEGRAM_CHAT_ID) return process.env.TELEGRAM_CHAT_ID;
  try {
    const { createAdminClient } = await import('@/utils/supabase/admin');
    const supabase = createAdminClient();
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'telegram_payment_chat_id').maybeSingle();
    if (data?.value) {
      const clean = typeof data.value === 'string' ? data.value.replace(/^"|"$/g, '') : String(data.value);
      if (clean) return clean;
    }
  } catch (e) {
    console.error('Error loading chat id from site_settings:', e);
  }
  return '8982469612'; // Verified Admin Chat ID
}

/**
 * Dispatches an executive payment alert to the Admin Telegram with complete OCR verification
 */
export async function dispatchPaymentAlertToAdmin(details: PaymentOrderDetails): Promise<void> {
  const chatId = await getPaymentAdminChatId();

  const shortSessionId = details.sessionId.replace('manual_', '').replace('bybit_', '').split('_')[0].substring(0, 8).toUpperCase();
  const ocr = details.ocrResult;

  // 1. Build items list
  let itemsSummary = '';
  for (const item of details.orderItems) {
    itemsSummary += `├ <b>${escapeHtml(item.name)}</b>\n│  └ الكمية: <code>x${item.quantity}</code> • السعر: <code>${item.price.toFixed(2)} ${details.currency.toUpperCase()}</code>\n`;
  }

  // 2. Build OCR Analysis Section
  let ocrSection = '';
  if (ocr && ocr.success) {
    const ocrAmt = ocr.amount !== null ? Number(ocr.amount) : null;
    const diff = ocrAmt !== null ? (ocrAmt - details.totalAmount) : 0;
    const isUnder = ocrAmt !== null && diff < -0.5;
    const isOver = ocrAmt !== null && diff > 0.5;

    let amountComparison = '';
    if (isUnder) {
      amountComparison = `\n│  └ <b>عجز مالي:</b> <code>-${Math.abs(diff).toFixed(2)} ${details.currency.toUpperCase()}</code>`;
    } else if (isOver) {
      let prefLabel = 'إيداع بالمحفظة (UpStore Wallet)';
      if (details.excessPreference === 'refund_vodafone') {
        prefLabel = `استرجاع على فودافون كاش (${escapeHtml(details.refundRecipientAccount || 'رقم المحفظة غير محدد')})`;
      } else if (details.excessPreference === 'refund_instapay') {
        prefLabel = `استرجاع على إنستاباي (${escapeHtml(details.refundRecipientAccount || 'حساب غير محدد')})`;
      } else if (details.excessPreference === 'refund_bank' || details.excessPreference === 'refund') {
        prefLabel = `استرجاع بنكي/محفظة (${escapeHtml(details.refundRecipientAccount || 'غير محدد')})`;
      }
      amountComparison = `\n│  └ <b>تحويل زائد:</b> <code>+${diff.toFixed(2)} ${details.currency.toUpperCase()}</code> (الرغبة: <b>${prefLabel}</b>)`;
    } else if (ocrAmt !== null) {
      amountComparison = ` (مطابق 100%)`;
    }

    const amountStr = ocrAmt !== null ? `${ocrAmt.toFixed(2)} ${ocr.currency || details.currency.toUpperCase()}` : 'غير محدد';
    
    ocrSection = `
━━━━━━━━━━━━━━━━━━━━━━━━━
<b>التحليل الجنائي للإيصال (AI OCR):</b>
├ <b>المبلغ المستخرج:</b> <code>${amountStr}</code>${amountComparison}
├ <b>المحوّل:</b> <code>${escapeHtml(ocr.senderName || ocr.senderPhone || ocr.senderAccount || details.paymentSender || 'غير ظاهر')}</code>
├ <b>المستلم:</b> <code>${escapeHtml(ocr.recipient || 'mo_matany')}</code>
├ <b>الرقم المرجعي (Ref):</b> <code>${escapeHtml(ocr.referenceNumber || details.paymentTransactionId || 'غير محدد')}</code>
├ <b>التوقيت:</b> <code>${escapeHtml(ocr.transactionDate || '')} ${escapeHtml(ocr.transactionTime || '')}</code>
└ <b>الحالة:</b> <code>${ocr.status === 'successful' ? 'ناجحة ومكتملة' : ocr.status}</code> (دقة: ${ocr.confidence}%)
`.trim();
  } else {
    ocrSection = `
━━━━━━━━━━━━━━━━━━━━━━━━━
<b>بيانات المحول المدخلة:</b>
├ <b>المرسل / الحساب:</b> <code>${escapeHtml(details.paymentSender || 'غير محدد')}</code>
└ <b>رقم العملية (Ref / TXID):</b> <code>${escapeHtml(details.paymentTransactionId || 'غير محدد')}</code>
`.trim();
  }

  const locationBadge = details.customerLocation
    ? `\n├ <b>الدولة / الموقع:</b> ${escapeHtml(details.customerLocation)}`
    : '';

  const telemetryBlock = details.clientTelemetry ? `\n\n${formatTelemetryForTelegram(details.clientTelemetry)}` : '';

  const caption = `
<b>إشعار دفع جديد بانتظار الاعتماد — UpStore Pay</b>
━━━━━━━━━━━━━━━━━━━━━━━━━

<b>بيانات المعاملة والعميل:</b>
├ <b>رقم الطلب:</b> <code>#${shortSessionId}</code>
├ <b>معرف الجلسة:</b> <code>${details.sessionId}</code>
├ <b>وسيلة الدفع:</b> <code>${escapeHtml(details.paymentMethod.toUpperCase())}</code>
├ <b>بريد العميل:</b> <code>${escapeHtml(details.customerEmail)}</code>${locationBadge}
└ <b>المبلغ المطلوب:</b> <code>${details.totalAmount.toFixed(2)} ${details.currency.toUpperCase()}</code>

<b>المنتجات المطلوبة:</b>
${itemsSummary}
${ocrSection}${telemetryBlock}

━━━━━━━━━━━━━━━━━━━━━━━━━
<b>خيارات الاعتماد وتسليم الطلب:</b>
• <b>آلي:</b> تسليم تلقائي من المخزون المسجل.
• <b>مفتاح:</b> إرسال كود اشتراك أو ترخيص.
• <b>حساب:</b> إرسال بريد وكلمة مرور (Email:Pass).
  `.trim();

  // Admin Interactive Inline Buttons
  const inlineKeyboard: TelegramInlineButton[][] = [
    [
      {
        text: 'اعتماد وتسليم آلي',
        callback_data: `approve_auto:${details.sessionId}`,
      },
      {
        text: 'إدخال مفتاح ترخيص',
        callback_data: `prompt_key:${details.sessionId}`,
      },
    ],
    [
      {
        text: 'إدخال حساب (Email:Pass)',
        callback_data: `prompt_account:${details.sessionId}`,
      },
      {
        text: 'رفض الطلب',
        callback_data: `reject_order:${details.sessionId}`,
      },
    ],
    [
      {
        text: 'لوحة تحكم UpStore',
        url: 'https://upstore.one/admin',
      },
      {
        text: 'فتح المحادثة',
        url: `https://t.me/${PAYMENT_BOT_USERNAME}`,
      },
    ],
  ];

  if (details.paymentScreenshot) {
    await sendPaymentBotPhoto(chatId, details.paymentScreenshot, caption, inlineKeyboard);
  } else {
    await sendPaymentBotMessage(chatId, caption, inlineKeyboard);
  }
}

/**
 * Dispatches an instant notification to @UpStore_payment_bot when a customer initiates an Arab local payment request
 */
export async function dispatchArabLocalSupportAlert(details: {
  sessionId?: string;
  countryName: string;
  countryFlag?: string;
  methodName: string;
  displayPrice: string;
  items: Array<{ name: string; quantity: number }>;
  userNote?: string;
  customerIp?: string;
}): Promise<void> {
  const chatId = await getPaymentAdminChatId();
  const itemsText = details.items.map(it => `• <b>${escapeHtml(it.name)}</b> <code>(x${it.quantity})</code>`).join('\n') || 'طلب رقمي';

  const text = `
<b>[تنبيه طلب دفع محلي جديد - الدول العربية]</b>
━━━━━━━━━━━━━━━━━━━━━━━━━
<b>الدولة:</b> <b>${escapeHtml(details.countryName)}</b>
<b>وسيلة الدفع المختارة:</b> <code>${escapeHtml(details.methodName)}</code>
<b>المبلغ الإجمالي:</b> <code>${escapeHtml(details.displayPrice)}</code>
<b>المنتجات:</b>
${itemsText}
${details.sessionId ? `<b>رقم الطلب الرسمي:</b> <code>#${escapeHtml(details.sessionId)}</code>\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━
<b>العميل متوجه الآن للتواصل مع:</b> <b>@UpStore_help</b>
`.trim();

  await sendPaymentBotMessage(chatId, text, [
    [
      {
        text: 'فتح محادثة الدعم @UpStore_help',
        url: 'https://t.me/UpStore_help',
      },
      {
        text: 'لوحة التحكم',
        url: 'https://upstore.one/admin',
      },
    ],
  ]);
}

/**
 * Dispatches an executive fulfillment prompt to @UpStore_payment_bot when payment is confirmed in @UpStore_Local_pay_bot
 */
export async function dispatchConfirmedLocalPaymentToFulfillmentBot(details: {
  orderRef: string;
  sessionId: string;
  customerName?: string;
  customerEmail?: string;
  userId?: string;
  countryName?: string;
  methodName?: string;
  displayPrice?: string;
  totalUsd?: number;
  items: Array<{ name: string; quantity: number; amount?: number }>;
}): Promise<void> {
  const chatId = await getPaymentAdminChatId();
  const cleanOrderRef = details.orderRef.replace(/^#/, '');

  let itemsSummary = '';
  for (const item of details.items) {
    itemsSummary += `├ <b>${escapeHtml(item.name)}</b>\n│  └ الكمية: <code>x${item.quantity}</code>${item.amount ? ` • القيمة: <code>$${item.amount.toFixed(2)} USD</code>` : ''}\n`;
  }
  if (!itemsSummary) {
    itemsSummary = `├ <b>طلب رقمي</b> <code>x1</code>\n`;
  }

  const text = `
<b>✅ تم تأكيد استلام الدفع بنجاح — جاهز لرفع وتسليم المفتاح</b>
━━━━━━━━━━━━━━━━━━━━━━━━━

<b>بيانات الطلب والعميل:</b>
├ <b>رقم الطلب الرسمي:</b> <code>#${escapeHtml(cleanOrderRef)}</code>
├ <b>معرف الجلسة:</b> <code>${escapeHtml(details.sessionId)}</code>
├ <b>اسم العميل:</b> <b>${escapeHtml(details.customerName || 'عميل UpStore')}</b>
├ <b>البريد الإلكتروني:</b> <code>${escapeHtml(details.customerEmail || 'غير محدد')}</code>
├ <b>الدولة ووسيلة الدفع:</b> <b>${escapeHtml(details.countryName || 'دولة عربية')}</b> • <code>${escapeHtml(details.methodName || 'تحويل محلي')}</code>
└ <b>المبلغ المسدد:</b> <b>${escapeHtml(details.displayPrice || 'غير محدد')}</b>${details.totalUsd ? ` (<code>$${details.totalUsd.toFixed(2)} USD</code>)` : ''}

<b>المنتجات المطلوبة:</b>
${itemsSummary}
━━━━━━━━━━━━━━━━━━━━━━━━━
<b>تم تأكيد أن العميل دفع وكل شيء سليم وصحيح ✅</b>
<i>يرجى اختيار طريقة تسليم ورفع المفتاح أو بيانات الحساب للعميل أدناه:</i>
  `.trim();

  const inlineKeyboard: TelegramInlineButton[][] = [
    [
      {
        text: 'اعتماد وتسليم آلي',
        callback_data: `approve_auto:${details.sessionId}`,
      },
      {
        text: 'إدخال مفتاح ترخيص',
        callback_data: `prompt_key:${details.sessionId}`,
      },
    ],
    [
      {
        text: 'إدخال حساب (Email:Pass)',
        callback_data: `prompt_account:${details.sessionId}`,
      },
      {
        text: 'لوحة التحكم UpStore',
        url: 'https://upstore.one/admin',
      },
    ],
    [
      {
        text: 'فتح محادثة البوت',
        url: `https://t.me/${PAYMENT_BOT_USERNAME}`,
      },
    ],
  ];

  await sendPaymentBotMessage(chatId, text, inlineKeyboard);
}


