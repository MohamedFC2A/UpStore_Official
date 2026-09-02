/**
 * liveMonitor.mjs — Real-time Activity & Transaction Monitor for @upstorelive_bot
 * 
 * Token: 8613863800:AAGGSfKgvW9t87LIJ_etxXs4SFqWayWXWcs
 * Broadcasts all visitor entries, interactions, browsing, purchases, and provides 
 * instant Admin Approval buttons for wallet top-ups and orders.
 * Operates 24/7 on VPS with resilient long-polling and subscriber persistence.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { creditUserWallet, getUserWallet } from './storeWallet.mjs';
import { getUserLanguage, t } from './storeI18n.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SUBSCRIBERS_FILE = path.join(__dirname, 'live_subscribers.json');

const LIVE_BOT_TOKEN = process.env.LIVE_BOT_TOKEN || '8613863800:AAGGSfKgvW9t87LIJ_etxXs4SFqWayWXWcs';
const LIVE_API = `https://api.telegram.org/bot${LIVE_BOT_TOKEN}`;

const UPSTORE_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8855216740:AAEbNj5orlWvMb7sDRw7Zasqim4GybGDT0o';
const UPSTORE_API = `https://api.telegram.org/bot${UPSTORE_BOT_TOKEN}`;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://whukcfkqqwuktwedcpgm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
let supabase = null;
try {
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
} catch (err) {
  console.warn('[LiveMonitor Supabase Warning]:', err.message);
}

// Default admin IDs from environment
const DEFAULT_ADMINS = ['8982469612'];

// In-memory set of subscribed chat IDs
let subscribers = new Set(DEFAULT_ADMINS);

// Track processed request IDs to prevent duplicate approvals
const processedRequests = new Set();

// External callback handler for direct order delivery
let orderApprovalHandler = null;
export function setOrderApprovalHandler(fn) {
  orderApprovalHandler = fn;
}

function loadSubscribers() {
  try {
    if (fs.existsSync(SUBSCRIBERS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, 'utf8'));
      if (Array.isArray(data)) {
        data.forEach(id => subscribers.add(String(id)));
      }
    }
  } catch (err) {
    console.warn('[LiveMonitor] Warning loading subscribers:', err.message);
  }
}

function saveSubscribers() {
  try {
    fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(Array.from(subscribers), null, 2), 'utf8');
  } catch (err) {
    console.warn('[LiveMonitor] Warning saving subscribers:', err.message);
  }
}

// Load on initialization
loadSubscribers();

export function addSubscriber(chatId) {
  const idStr = String(chatId);
  if (!subscribers.has(idStr)) {
    subscribers.add(idStr);
    saveSubscribers();
    console.log(`[LiveMonitor] ✅ Added new subscriber chat: ${idStr}`);
    return true;
  }
  return false;
}

export function removeSubscriber(chatId) {
  const idStr = String(chatId);
  if (subscribers.has(idStr)) {
    subscribers.delete(idStr);
    saveSubscribers();
    return true;
  }
  return false;
}

export function getSubscribers() {
  return Array.from(subscribers);
}

/**
 * Send message to customer on @upstore_one_bot
 */
export async function sendUpstoreBotMessage(chatId, htmlText, replyMarkup = null) {
  try {
    const payload = {
      chat_id: chatId,
      text: htmlText,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };
    if (replyMarkup) payload.reply_markup = replyMarkup;

    const res = await fetch(`${UPSTORE_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.error('[LiveMonitor] Error sending message via @upstore_one_bot:', err.message);
    return null;
  }
}

/**
 * Broadcast an HTML message to all subscribed admin chats on @upstorelive_bot
 */
export async function broadcastLiveMessage(htmlText, replyMarkup = null) {
  const list = Array.from(subscribers);
  if (list.length === 0) return;

  for (const chatId of list) {
    try {
      const payload = {
        chat_id: chatId,
        text: htmlText,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      };
      if (replyMarkup) payload.reply_markup = replyMarkup;

      const res = await fetch(`${LIVE_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!resData.ok) {
        if (resData.description?.includes('blocked') || resData.description?.includes('deactivated')) {
          console.warn(`[LiveMonitor] Chat ${chatId} blocked bot. Removing.`);
          subscribers.delete(chatId);
          saveSubscribers();
        }
      }
    } catch (err) {
      console.warn(`[LiveMonitor] Error broadcasting to ${chatId}:`, err.message);
    }
  }
}

/**
 * Answer callback query on @upstorelive_bot
 */
async function answerLiveCallbackQuery(callbackQueryId, text = '', showAlert = false) {
  try {
    await fetch(`${LIVE_API}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert,
      }),
    });
  } catch {}
}

/**
 * Edit message text on @upstorelive_bot
 */
async function editLiveMessageText(chatId, messageId, htmlText, replyMarkup = null) {
  try {
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text: htmlText,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };
    if (replyMarkup) payload.reply_markup = replyMarkup;

    await fetch(`${LIVE_API}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('[LiveMonitor] Error editing live message:', err.message);
  }
}

/**
 * Extract clean user metadata object
 */
export function extractUserInfo(from, chat = null, extraLang = '') {
  if (!from) return { id: 'Unknown', name: 'Unknown', username: '', lang: 'ar', premium: false };
  const firstName = from.first_name || '';
  const lastName = from.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'No Name';
  const username = from.username ? `@${from.username}` : 'No Username';
  const rawLang = from.language_code || extraLang || 'ar';
  const isPremium = Boolean(from.is_premium);

  return {
    id: from.id,
    fullName,
    username,
    rawLang,
    isPremium,
    chatId: chat?.id || from.id,
    chatType: chat?.type || 'private',
  };
}

function formatTimestamp(d = new Date()) {
  return d.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
}

/**
 * Notify: User started bot or sent message
 */
export async function notifyUserEntry(user, source = '/start', details = '') {
  const u = extractUserInfo(user);
  const time = formatTimestamp();
  const premBadge = u.isPremium ? ' ⭐ [Telegram Premium]' : '';

  const html = [
    '🔔 <b>[نشاط دخول للبوت / User Entry Detected]</b>',
    '━━━━━━━━━━━━━━━━━━━━━━',
    `👤 <b>المستخدم:</b> <b>${u.fullName}</b> (${u.username})${premBadge}`,
    `🆔 <b>User ID:</b> <code>${u.id}</code> <a href="tg://user?id=${u.id}">[فتح البروفايل]</a>`,
    `🌐 <b>لغة الجهاز:</b> <code>${u.rawLang}</code> | <b>نوع المحادثة:</b> <code>${u.chatType}</code>`,
    '━━━━━━━━━━━━━━━━━━━━━━',
    `⚡ <b>الحدث:</b> <code>${source}</code>`,
    details ? `📝 <b>تفاصيل:</b> ${details}` : '',
    `⏱ <b>التوقيت:</b> <code>${time}</code>`,
    '━━━━━━━━━━━━━━━━━━━━━━',
    '🤖 <i>بث مباشر من سيرفر UpStore VPS</i>',
  ].filter(Boolean).join('\n');

  await broadcastLiveMessage(html);
}

/**
 * Notify: User browsing catalog / category / brand / product
 */
export async function notifyUserNavigation(user, screenType, itemTitle, extra = '') {
  const u = extractUserInfo(user);
  const time = formatTimestamp();

  const html = [
    '🧭 <b>[تصفح وتفاعل / User Interaction]</b>',
    '━━━━━━━━━━━━━━━━━━━━━━',
    `👤 <b>المستخدم:</b> <b>${u.fullName}</b> (${u.username})`,
    `🆔 <b>User ID:</b> <code>${u.id}</code> <a href="tg://user?id=${u.id}">[بروفايل]</a>`,
    `🌐 <b>اللغة:</b> <code>${u.rawLang}</code>`,
    '━━━━━━━━━━━━━━━━━━━━━━',
    `📂 <b>النوع:</b> <code>${screenType}</code>`,
    `🎯 <b>العنصر:</b> <b>${itemTitle}</b>`,
    extra ? `💡 <b>معلومات:</b> ${extra}` : '',
    `⏱ <b>التوقيت:</b> <code>${time}</code>`,
  ].filter(Boolean).join('\n');

  await broadcastLiveMessage(html);
}

/**
 * Notify: User Chat Message
 */
export async function notifyUserChat(user, messageText, responseSnippet = '') {
  const u = extractUserInfo(user);
  const time = formatTimestamp();
  const cleanMsg = (messageText || '').slice(0, 300);

  const html = [
    '💬 <b>[محادثة / User Chat Message]</b>',
    '━━━━━━━━━━━━━━━━━━━━━━',
    `👤 <b>المستخدم:</b> <b>${u.fullName}</b> (${u.username})`,
    `🆔 <b>User ID:</b> <code>${u.id}</code> <a href="tg://user?id=${u.id}">[بروفايل]</a>`,
    '━━━━━━━━━━━━━━━━━━━━━━',
    `❓ <b>رسالة المستخدم:</b>\n<blockquote>${cleanMsg}</blockquote>`,
    responseSnippet ? `🤖 <b>الرد التلقائي:</b>\n<blockquote>${responseSnippet.slice(0, 200)}...</blockquote>` : '',
    `⏱ <b>التوقيت:</b> <code>${time}</code>`,
  ].filter(Boolean).join('\n');

  await broadcastLiveMessage(html);
}

/**
 * Notify: Purchase initiated (Bybit, Binance, Local)
 */
export async function notifyPurchaseAttempt(user, product, paymentMethod, orderRef) {
  const u = extractUserInfo(user);
  const time = formatTimestamp();

  const html = [
    '🛒 <b>[بدء عملية شراء جديدة / Checkout Initiated]</b>',
    '━━━━━━━━━━━━━━━━━━━━━━',
    `👤 <b>المشتري:</b> <b>${u.fullName}</b> (${u.username})`,
    `🆔 <b>User ID:</b> <code>${u.id}</code> <a href="tg://user?id=${u.id}">[بروفايل]</a>`,
    `🌐 <b>لغة العميل:</b> <code>${u.rawLang}</code>`,
    '━━━━━━━━━━━━━━━━━━━━━━',
    `📦 <b>المنتج:</b> <b>${product.name_ar || product.name}</b> (${product.subscription_duration || ''})`,
    `🆔 <b>رقم الطلب (Order Ref):</b> <code>#${orderRef}</code>`,
    `💳 <b>طريقة الدفع المختارة:</b> <b>${paymentMethod}</b>`,
    `💰 <b>السعر:</b> <code>$${product.our_price?.toFixed(2)} USDT</code> | <code>${product.price_egp || 0} EGP</code> | <code>${product.price_sar || 0} SAR</code>`,
    `⏳ <b>الحالة:</b> بانتظار تحويل العميل والفحص التلقائي ⚡`,
    `⏱ <b>التوقيت:</b> <code>${time}</code>`,
    '━━━━━━━━━━━━━━━━━━━━━━',
    '🚨 <i>يُرجى متابعة سجلات التحويل على السيرفر</i>',
  ].join('\n');

  await broadcastLiveMessage(html);
}

/**
 * Notify: Payment verified & instant delivery fulfilled with 16-digit serial key
 */
export async function notifyPurchaseDelivered(user, product, paymentMethod, orderRef, txInfo, credentials, serialCode = '') {
  const u = extractUserInfo(user);
  const time = formatTimestamp();

  const html = [
    '🎉 <b>[تم الدفع والتسليم الفوري بنجاح! / ORDER FULFILLED]</b>',
    '━━━━━━━━━━━━━━━━━━━━━━',
    `👤 <b>العميل:</b> <b>${u.fullName}</b> (${u.username})`,
    `🆔 <b>User ID:</b> <code>${u.id}</code> <a href="tg://user?id=${u.id}">[بروفايل]</a>`,
    '━━━━━━━━━━━━━━━━━━━━━━',
    `📦 <b>المنتج المسلّم:</b> <b>${product.name_ar || product.name}</b>`,
    `🆔 <b>رقم الطلب:</b> <code>#${orderRef}</code>`,
    `💳 <b>بوابة الدفع:</b> <b>${paymentMethod}</b>`,
    `💎 <b>المبلغ المستلم:</b> <code>$${txInfo.amount || product.our_price} USDT</code>`,
    `🔍 <b>رقم التحويل / TXID:</b> <code>${txInfo.transferId || txInfo.txID || 'VERIFIED'}</code>`,
    serialCode ? `🔑 <b>السيريال المولد (16 رقم):</b> <code>${serialCode}</code>` : '',
    '━━━━━━━━━━━━━━━━━━━━━━',
    '🔑 <b>بيانات الحساب التي استلمها العميل:</b>',
    `• <b>User/Email:</b> <code>${credentials.username}</code>`,
    `• <b>Pass:</b> <code>${credentials.password}</code>`,
    `• <b>المدة والضمان:</b> ${product.subscription_duration} | ${product.warranty_duration}`,
    '━━━━━━━━━━━━━━━━━━━━━━',
    `⏱ <b>توقيت التسليم:</b> <code>${time}</code>`,
    '✅ <i>تم التحديث في قاعدة بيانات Supabase وتفعيل الضمان 100%</i>',
  ].filter(Boolean).join('\n');

  await broadcastLiveMessage(html);
}

/**
 * Notify: Wallet Top-Up successful
 */
export async function notifyWalletTopup(user, amount, method, newBalance, txInfo = {}) {
  const u = extractUserInfo(user);
  const time = formatTimestamp();

  const html = [
    '💳 <b>[شحن رصيد محفظة ناجح / WALLET TOP-UP]</b>',
    '━━━━━━━━━━━━━━━━━━━━━━',
    `👤 <b>العميل:</b> <b>${u.fullName}</b> (${u.username})`,
    `🆔 <b>User ID:</b> <code>${u.id}</code> <a href="tg://user?id=${u.id}">[بروفايل]</a>`,
    `🌐 <b>لغة العميل:</b> <code>${u.rawLang}</code>`,
    '━━━━━━━━━━━━━━━━━━━━━━',
    `💰 <b>المبلغ المشحون:</b> <code>+$${Number(amount).toFixed(2)} USDT</code>`,
    `💳 <b>طريقة الشحن:</b> <b>${method}</b>`,
    `💎 <b>إجمالي رصيد المحفظة الجديد:</b> <code>$${Number(newBalance).toFixed(2)} USDT</code>`,
    txInfo?.txID || txInfo?.transferId ? `🔍 <b>معرف التحويل / TXID:</b> <code>${txInfo.transferId || txInfo.txID}</code>` : '',
    `⏱ <b>التوقيت:</b> <code>${time}</code>`,
    '━━━━━━━━━━━━━━━━━━━━━━',
    '⚡ <i>تم تحديث رصيد المحفظة بنجاح وهو متاح للشراء الفوري</i>',
  ].filter(Boolean).join('\n');

  await broadcastLiveMessage(html);
}

/**
 * Dispatch an interactive payment/top-up confirmation alert to @upstorelive_bot with Action Buttons!
 */
export async function notifyPendingPaymentApproval(user, amount, method, refOrTxId, type = 'WALLET_TOPUP', meta = {}) {
  const u = extractUserInfo(user);
  const time = formatTimestamp();
  const numAmount = Number(amount) || 5.0;
  const reqId = meta.reqId || `REQ-${Date.now().toString().slice(-6)}`;

  let title = '';
  let actionKeyboard = [];

  if (type === 'WALLET_TOPUP') {
    title = '💰 <b>[طلب تأكيد شحن محفظة / TOP-UP APPROVAL]</b>';
    actionKeyboard = [
      [
        { text: `✅ تأكيد وشحن $${numAmount.toFixed(2)} فوراً`, callback_data: `apprv_topup_${u.id}_${numAmount}_${reqId}` },
        { text: `❌ رفض الطلب`, callback_data: `rej_topup_${u.id}_${reqId}` },
      ],
    ];
  } else {
    title = '🛒 <b>[طلب اعتماد دفع لطلب شراء / ORDER APPROVAL]</b>';
    const shortId = meta.shortId || '643361f7';
    actionKeyboard = [
      [
        { text: `✅ تأكيد وتسليم المنتج فوراً`, callback_data: `apprv_order_${u.id}_${shortId}_${refOrTxId}_${reqId}` },
        { text: `❌ رفض الطلب`, callback_data: `rej_order_${u.id}_${refOrTxId}_${reqId}` },
      ],
    ];
  }

  const isInternalRefOrMissing = !refOrTxId || refOrTxId === reqId || /^#(?:TOPUP|UP|REQ|DOC|IMG)-/i.test(refOrTxId) || /^(?:TOPUP|UP|REQ|DOC|IMG)-/i.test(refOrTxId);
  const txidDisplay = isInternalRefOrMissing
    ? '<i>(طلب فحص تلقائي - بانتظار إدخال العميل لمعرف الدفع)</i>'
    : `<code>${refOrTxId}</code>`;

  const html = [
    title,
    '━━━━━━━━━━━━━━━━━━━━━━',
    `👤 <b>العميل:</b> <b>${u.fullName}</b> (@${u.username || 'بدون_يوزر'})`,
    `🆔 <b>User ID:</b> <code>${u.id}</code> <a href="tg://user?id=${u.id}">[فتح الدردشة 💬]</a>`,
    `💵 <b>المبلغ:</b> <code>$${numAmount.toFixed(2)} USDT</code> (~${Math.round(numAmount * 50)} EGP)`,
    `🏦 <b>طريقة الدفع:</b> <b>${method}</b>`,
    `🧾 <b>معرّف الدفع / TXID من العميل:</b> ${txidDisplay}`,
    meta.senderAccount && meta.senderAccount !== refOrTxId ? `📱 <b>حساب/رقم المحول:</b> <code>${meta.senderAccount}</code>` : '',
    `🆔 <b>رقم المرجع:</b> <code>#${reqId}</code>`,
    meta.rawMessage ? `💬 <b>نص رسالة العميل:</b>\n<blockquote>${meta.rawMessage}</blockquote>` : (meta.note ? `📝 <b>ملاحظة:</b> <code>${meta.note}</code>` : ''),
    `⏱ <b>التوقيت:</b> <code>${time}</code>`,
    '━━━━━━━━━━━━━━━━━━━━━━',
    '👇 <b>تأكد من مطابقة المعرف بحسابك ثم اضغط الإجراء فوراً:</b>',
  ].filter(Boolean).join('\n');

  await broadcastLiveMessage(html, { inline_keyboard: actionKeyboard });
}

/**
 * Notify: System update / deployment
 */
export async function notifySystemUpdate(title, details) {
  const time = formatTimestamp();
  const html = [
    `🚀 <b>[تحديث نظام UpStore / System Notice]</b>`,
    '━━━━━━━━━━━━━━━━━━━━━━',
    `📢 <b>${title}</b>`,
    details ? `<blockquote>${details}</blockquote>` : '',
    `⏱ <b>التوقيت:</b> <code>${time}</code>`,
    '🟢 <i>سيرفر VPS نشط 24/7 ومراقب مباشر</i>',
  ].filter(Boolean).join('\n');

  await broadcastLiveMessage(html);
}

/**
 * Start dedicated background polling on @upstorelive_bot
 * Allows any admin to receive alerts and manage approvals seamlessly!
 */
export function startLiveBotPolling() {
  console.log('🔄 Starting dedicated long-polling for @upstorelive_bot...');

  // Delete webhook to ensure polling works cleanly
  fetch(`${LIVE_API}/deleteWebhook`)
    .catch(() => {})
    .finally(() => {
      let offset = 0;

      async function pollUpdates() {
        try {
          const res = await fetch(`${LIVE_API}/getUpdates?offset=${offset}&timeout=20`, {
            signal: AbortSignal.timeout(30000),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.ok && Array.isArray(data.result)) {
              for (const update of data.result) {
                offset = update.update_id + 1;
                await handleLiveBotUpdate(update);
              }
            }
          }
        } catch (err) {
          // Timeout or temporary network hiccup
        } finally {
          setTimeout(pollUpdates, 1000);
        }
      }

      pollUpdates();
      console.log('🚀 @upstorelive_bot is active and listening for admin commands and approval buttons...');
    });
}

/**
 * Handle incoming updates on @upstorelive_bot (Messages & Callback Queries)
 */
async function handleLiveBotUpdate(update) {
  // ── 1. HANDLE CALLBACK QUERIES (Approve / Reject Buttons) ──
  if (update.callback_query) {
    const cb = update.callback_query;
    const adminChatId = cb.message?.chat?.id || cb.from?.id;
    const adminName = cb.from?.first_name || 'Admin';
    const messageId = cb.message?.message_id;
    const data = cb.data || '';

    // Auto-subscribe the admin who clicked
    addSubscriber(adminChatId);

    // ── A. Approve Wallet Top-Up (apprv_topup_CHATID_AMOUNT_REQID) ──
    if (data.startsWith('apprv_topup_')) {
      const parts = data.split('_');
      const targetChatId = parts[2];
      const amount = parseFloat(parts[3]) || 5.0;
      const reqId = parts.slice(4).join('_') || `REQ-${Date.now()}`;

      if (processedRequests.has(reqId)) {
        await answerLiveCallbackQuery(cb.id, '⚠️ هذا الطلب تمت معالجته مسبقاً!', true);
        return;
      }
      processedRequests.add(reqId);

      try {
        const creditedWallet = await creditUserWallet(
          targetChatId,
          amount,
          'ADMIN_APPROVED_TOPUP',
          { reqId, approvedBy: adminName, adminId: cb.from?.id },
          supabase
        );

        const targetLang = getUserLanguage(targetChatId) || 'ar';

        // 1. Notify the customer on @upstore_one_bot
        const bonusMsg = creditedWallet.creditedBonus > 0
          ? [
              `💵 <b>${t('recharged_amount_label', targetLang)}</b> <code>+$${amount.toFixed(2)} USDT</code>`,
              `🎁 <b>${t('wallet_bonus_label', targetLang)}</b> <code>+$${creditedWallet.creditedBonus.toFixed(2)} USDT</code>`,
              `💎 <b>${t('total_credited_label', targetLang)}</b> <code>+$${creditedWallet.totalCredited.toFixed(2)} USDT</code>`,
            ]
          : [
              `💵 <b>${t('amount_credited_label', targetLang)}</b> <code>+$${amount.toFixed(2)} USDT</code>`,
            ];

        const customerMsg = [
          t('wallet_topup_success_title', targetLang),
          '──────────────────',
          ...bonusMsg,
          `💳 <b>${t('wallet_new_balance_label', targetLang)}</b> <code>$${creditedWallet.balance.toFixed(2)} USDT</code>`,
          `🆔 <b>${t('order_ref_label', targetLang)}</b> <code>#${reqId}</code>`,
          '──────────────────',
          t('wallet_topup_ready_hint', targetLang),
        ].join('\n');

        await sendUpstoreBotMessage(targetChatId, customerMsg, {
          inline_keyboard: [
            [{ text: `🛍️ ${t('btn_catalog', targetLang)}`, callback_data: 'catalog' }],
            [{ text: `💳 ${t('btn_wallet', targetLang)}`, callback_data: 'payment_methods' }],
          ],
        });

        // 2. Answer callback toast
        await answerLiveCallbackQuery(cb.id, `✅ تم شحن $${creditedWallet.totalCredited || amount} للعميل بنجاح!`, true);

        // 3. Edit message in @upstorelive_bot
        const editedLiveText = [
          '✅ <b>[تمت الموافقة والشحن بنجاح]</b>',
          '━━━━━━━━━━━━━━━━━━━━━━',
          `👤 <b>العميل:</b> <code>${targetChatId}</code>`,
          `💵 <b>المبلغ المشحون:</b> <code>$${amount.toFixed(2)} USDT</code>`,
          ...(creditedWallet.creditedBonus > 0 ? [`🎁 <b>البونص الإضافي:</b> <code>+$${creditedWallet.creditedBonus.toFixed(2)} USDT</code>`] : []),
          `💎 <b>رصيد العميل الحالي:</b> <code>$${creditedWallet.balance.toFixed(2)} USDT</code>`,
          `🆔 <b>رقم المرجع:</b> <code>#${reqId}</code>`,
          `👮‍♂️ <b>المسؤول المعتمد:</b> <b>${adminName}</b>`,
          `⏱ <b>توقيت الاعتماد:</b> <code>${formatTimestamp()}</code>`,
          '━━━━━━━━━━━━━━━━━━━━━━',
          '⚡ <i>تم إرسال إشعار فوري للعميل على @upstore_one_bot</i>',
        ].join('\n');

        await editLiveMessageText(adminChatId, messageId, editedLiveText);
      } catch (err) {
        console.error('[LiveMonitor Topup Approval Error]:', err);
        await answerLiveCallbackQuery(cb.id, `❌ خطأ أثناء الشحن: ${err.message}`, true);
      }
      return;
    }

    // ── B. Reject Wallet Top-Up (rej_topup_CHATID_REQID) ──
    if (data.startsWith('rej_topup_')) {
      const parts = data.split('_');
      const targetChatId = parts[2];
      const reqId = parts.slice(3).join('_') || `REQ-${Date.now()}`;

      if (processedRequests.has(reqId)) {
        await answerLiveCallbackQuery(cb.id, '⚠️ هذا الطلب تمت معالجته مسبقاً!', true);
        return;
      }
      processedRequests.add(reqId);

      // Notify customer on @upstore_one_bot
      const rejectMsg = [
        '⚠️ <b>تنبيه بخصوص طلب شحن الرصيد:</b>',
        '──────────────────',
        `تعذر تأكيد استلام عملية التحويل لطلب الشحن <code>#${reqId}</code>.`,
        'يرجى التأكد من إتمام التحويل بشكل صحيح، أو التواصل مع الدعم الفني @UPSTORE_HELP للمساعدة.',
      ].join('\n');

      await sendUpstoreBotMessage(targetChatId, rejectMsg, {
        inline_keyboard: [
          [{ text: '💳 المحفظة والشحن مجدداً', callback_data: 'payment_methods' }],
          [{ text: '👨‍💻 الدعم الفني المباشر', callback_data: 'support' }],
        ],
      });

      await answerLiveCallbackQuery(cb.id, '❌ تم رفض الطلب وإشعار العميل.', false);

      const editedLiveText = [
        '❌ <b>[تم رفض طلب الشحن]</b>',
        '━━━━━━━━━━━━━━━━━━━━━━',
        `👤 <b>العميل:</b> <code>${targetChatId}</code>`,
        `🆔 <b>رقم المرجع:</b> <code>#${reqId}</code>`,
        `👮‍♂️ <b>المسؤول:</b> <b>${adminName}</b>`,
        `⏱ <b>توقيت الرفض:</b> <code>${formatTimestamp()}</code>`,
      ].join('\n');

      await editLiveMessageText(adminChatId, messageId, editedLiveText);
      return;
    }

    // ── C. Approve Direct Order Delivery (apprv_order_CHATID_SHORTID_ORDERREF_REQID) ──
    if (data.startsWith('apprv_order_')) {
      const parts = data.split('_');
      const targetChatId = parts[2];
      const shortId = parts[3];
      const orderRef = parts[4];
      const reqId = parts.slice(5).join('_') || `REQ-${Date.now()}`;

      if (processedRequests.has(reqId)) {
        await answerLiveCallbackQuery(cb.id, '⚠️ هذا الطلب تمت معالجته مسبقاً!', true);
        return;
      }
      processedRequests.add(reqId);

      if (typeof orderApprovalHandler === 'function') {
        try {
          const res = await orderApprovalHandler(targetChatId, shortId, orderRef, {
            adminName,
            adminId: cb.from?.id,
            reqId,
          });

          await answerLiveCallbackQuery(cb.id, '✅ تم تسليم الطلب وتوليد السيريال (16 رقم) بنجاح!', true);

          const editedLiveText = [
            '✅ <b>[تم اعتماد الطلب وتسليمه بنجاح]</b>',
            '━━━━━━━━━━━━━━━━━━━━━━',
            `👤 <b>العميل:</b> <code>${targetChatId}</code>`,
            `🆔 <b>رقم الطلب:</b> <code>#${orderRef}</code>`,
            res?.serialCode ? `🔑 <b>السيريال المولد:</b> <code>${res.serialCode}</code>` : '',
            `👮‍♂️ <b>المسؤول المعتمد:</b> <b>${adminName}</b>`,
            `⏱ <b>توقيت الاعتماد:</b> <code>${formatTimestamp()}</code>`,
          ].filter(Boolean).join('\n');

          await editLiveMessageText(adminChatId, messageId, editedLiveText);
        } catch (err) {
          console.error('[Order Approval Handler Exception]:', err);
          await answerLiveCallbackQuery(cb.id, `❌ خطأ أثناء التسليم: ${err.message}`, true);
        }
      } else {
        await answerLiveCallbackQuery(cb.id, '✅ تم تسجيل الموافقة بنجاح.', false);
      }
      return;
    }

    // ── D. Reject Direct Order (rej_order_CHATID_ORDERREF_REQID) ──
    if (data.startsWith('rej_order_')) {
      const parts = data.split('_');
      const targetChatId = parts[2];
      const orderRef = parts[3];
      const reqId = parts.slice(4).join('_') || `REQ-${Date.now()}`;

      if (processedRequests.has(reqId)) {
        await answerLiveCallbackQuery(cb.id, '⚠️ هذا الطلب تمت معالجته مسبقاً!', true);
        return;
      }
      processedRequests.add(reqId);

      const rejectMsg = [
        '⚠️ <b>تنبيه بخصوص طلب الشراء:</b>',
        '──────────────────',
        `تعذر تأكيد عملية الدفع للطلب <code>#${orderRef}</code>.`,
        'يرجى التأكد من إتمام التحويل أو التواصل مع الدعم الفني @UPSTORE_HELP للمساعدة.',
      ].join('\n');

      await sendUpstoreBotMessage(targetChatId, rejectMsg, {
        inline_keyboard: [
          [{ text: '🛍️ إعادة المحاولة من الكتالوج', callback_data: 'catalog' }],
          [{ text: '👨‍💻 الدعم الفني', callback_data: 'support' }],
        ],
      });

      await answerLiveCallbackQuery(cb.id, '❌ تم رفض الطلب وإشعار العميل.', false);

      const editedLiveText = [
        '❌ <b>[تم رفض طلب الشراء]</b>',
        '━━━━━━━━━━━━━━━━━━━━━━',
        `👤 <b>العميل:</b> <code>${targetChatId}</code>`,
        `🆔 <b>رقم الطلب:</b> <code>#${orderRef}</code>`,
        `👮‍♂️ <b>المسؤول:</b> <b>${adminName}</b>`,
        `⏱ <b>توقيت الرفض:</b> <code>${formatTimestamp()}</code>`,
      ].join('\n');

      await editLiveMessageText(adminChatId, messageId, editedLiveText);
      return;
    }

    if (data === 'status') {
      await answerLiveCallbackQuery(cb.id, '🟢 السيرفر نشط 24/7 والبث يعمل بأعلى كفاءة', false);
      return;
    }

    if (data === 'test_ping') {
      await answerLiveCallbackQuery(cb.id, '⚡ تم إرسال إشعار تجريبي!', false);
      await notifySystemUpdate('🔔 فحص تجريبي', `تم الاختبار بنجاح بواسطة ${adminName}`);
      return;
    }

    return;
  }

  // ── 2. HANDLE MESSAGES & COMMANDS ──
  const message = update.message || update.channel_post;
  if (!message) return;

  const chatId = message.chat.id;
  const from = message.from || message.chat;
  const text = (message.text || '').trim();

  // Any message automatically subscribes the chat
  const isNew = addSubscriber(chatId);

  if (text.startsWith('/start') || text.startsWith('/help') || text === 'تفعيل' || isNew) {
    const welcome = [
      '👑 <b>أهلاً بك في نظام المراقبة الحي والرصد الفوري لمتجر UpStore!</b>',
      '━━━━━━━━━━━━━━━━━━━━━━',
      '✅ <b>تم تفعيل اشتراكك واستلام البث المباشر وأزرار الاعتماد بنجاح!</b>',
      '',
      '📡 <b>ما سيتم عرضه على هذه القناة/المحادثة فوراً 24/7:</b>',
      '• 🔔 أي نشاط دخول أو بدء محادثة على @upstore_one_bot',
      '• 👤 كامل بيانات المستخدم (الاسم، المعرف، اللغة، نوع الجهاز، Premium)',
      '• 🧭 تصفح المنتجات والأقسام والأسعار لحظة بلحظة',
      '• 💰 طلبات شحن المحفظة مع أزرار التأكيد المباشرة [✅ تأكيد وشحن] و [❌ رفض]',
      '• 🛒 عمليات الشراء وتأكيد الدفع (Bybit, Binance, الدفع المحلي)',
      '• 🎉 التسليم الفوري وتوليد أكواد السيريال (16 رقم)',
      '',
      `🆔 <b>معرف المحادثة (Chat ID):</b> <code>${chatId}</code>`,
      `👥 <b>إجمالي قنوات البث المفعلة:</b> <code>${subscribers.size}</code>`,
      '🟢 <b>الحالة:</b> متصل ومراقب 24/7 على سيرفر VPS ⚡',
    ].join('\n');

    await fetch(`${LIVE_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: welcome,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 فحص حالة السيرفر (Status)', callback_data: 'status' }],
            [{ text: '📢 تجربة إشعار فوري (Test)', callback_data: 'test_ping' }],
          ],
        },
      }),
    });
    return;
  }

  if (text === '/status' || text === 'حالة') {
    const statusText = [
      '📊 <b>حالة نظام UpStore Live Monitor:</b>',
      '━━━━━━━━━━━━━━━━━━━━━━',
      `🟢 <b>سيرفر VPS:</b> متصل (104.207.77.162)`,
      `🤖 <b>البوت المراقب:</b> @upstorelive_bot`,
      `👑 <b>المتجر الرئيسي:</b> @upstore_one_bot`,
      `👥 <b>عدد المشتركين في التنبيهات:</b> <code>${subscribers.size}</code>`,
      `⏱ <b>الوقت الحالي:</b> <code>${formatTimestamp()}</code>`,
    ].join('\n');

    await fetch(`${LIVE_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: statusText,
        parse_mode: 'HTML',
      }),
    });
    return;
  }

  if (text === '/test' || text === 'تجربة') {
    await notifySystemUpdate('🔔 فحص تجريبي للنظام', 'تم استلام طلب الفحص من الأدمن بنجاح. النظام يعمل بأقصى سرعة ⚡');
    return;
  }
}
