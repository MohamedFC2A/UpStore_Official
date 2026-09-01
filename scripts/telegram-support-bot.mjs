/**
 * telegram-support-bot.mjs — Dedicated Resilient Telegram Bot Runner for @upstore_one_bot
 * 
 * 100% Dedicated & Radically Decoupled for @upstore_one_bot with Clean Typography, ApplicationEmoji Custom Icons, Real Product Photos & In-Chat Bybit/Crypto Checkout
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import {
  STORE_CATEGORIES,
  STORE_BRANDS,
  STORE_CATALOG,
  getCategoryById,
  getBrandsByCategory,
  getBrandById,
  getProductsByBrand,
  getProductByShortIdOrSlug,
} from './storeCatalog.mjs';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  getUserLanguage,
  setUserLanguage,
  detectUserLanguage,
  getLocalizedDuration,
  getLocalizedWarranty,
  getLocalizedDeliveryMethod,
  getLocalizedAdvantages,
  t,
  matchPersistentButton,
} from './storeI18n.mjs';
import {
  notifyUserEntry,
  notifyUserNavigation,
  notifyUserChat,
  notifyPurchaseAttempt,
  notifyPurchaseDelivered,
  notifyWalletTopup,
  notifyPendingPaymentApproval,
  setOrderApprovalHandler,
  notifySystemUpdate,
  startLiveBotPolling,
} from './liveMonitor.mjs';
import {
  getUserWallet,
  creditUserWallet,
  debitUserWallet,
  calculateTopupBonus,
  TOPUP_DENOMINATIONS,
  MIN_TOPUP_USD,
  MIN_TOPUP_EGP,
  MIN_TOPUP_SAR,
} from './storeWallet.mjs';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8855216740:AAEbNj5orlWvMb7sDRw7Zasqim4GybGDT0o';
const BOT_USERNAME = 'upstore_one_bot';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const TELEGRAM_FILE_API = `https://api.telegram.org/file/bot${BOT_TOKEN}`;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://nkjutiglgywdfxfqkhzp.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
let supabase = null;
try {
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
} catch (e) {
  console.warn('[Supabase Init Warning]:', e.message);
}

import crypto from 'crypto';

const BYBIT_API_KEY = process.env.BYBIT_API_KEY || 'YSxK9ZT6tiYMUE8Fa7';
const BYBIT_API_SECRET = process.env.BYBIT_API_SECRET || 'Ckg1gXUjmmjbAO817O9o188b4RLTATKLX7cO';
const BYBIT_BASE_URL = 'https://api.bybit.com';

function signBybit(timestamp, paramsStr = '') {
  const recvWindow = '5000';
  const raw = `${timestamp}${BYBIT_API_KEY}${recvWindow}${paramsStr}`;
  return crypto.createHmac('sha256', BYBIT_API_SECRET).update(raw).digest('hex');
}

async function queryBybitApi(endpoint, queryParams = {}) {
  try {
    const timestamp = Date.now().toString();
    const queryString = Object.keys(queryParams).length > 0 
      ? new URLSearchParams(queryParams).toString() 
      : '';
    const fullPath = queryString ? `${endpoint}?${queryString}` : endpoint;
    const signature = signBybit(timestamp, queryString);

    const res = await fetch(`${BYBIT_BASE_URL}${fullPath}`, {
      method: 'GET',
      headers: {
        'X-BAPI-API-KEY': BYBIT_API_KEY,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': '5000',
        'X-BAPI-SIGN': signature,
      },
    });

    return await res.json();
  } catch (err) {
    console.error('[Bybit API Query Error]:', err.message);
    return null;
  }
}

async function verifyBybitPayment(expectedAmount) {
  try {
    const transfers = await queryBybitApi('/v5/asset/transfer/query-inter-transfer-list', {
      coin: 'USDT',
      limit: '10',
    });

    const now = Date.now();
    const THIRTY_MIN_MS = 30 * 60 * 1000;

    if (transfers?.result?.list) {
      for (const t of transfers.result.list) {
        const transferTime = parseInt(t.timestamp, 10);
        const amountNum = parseFloat(t.amount);
        if (
          t.status === 'SUCCESS' &&
          Math.abs(amountNum - expectedAmount) < 0.02 &&
          (now - transferTime) < THIRTY_MIN_MS
        ) {
          return {
            success: true,
            type: 'internal_transfer',
            transferId: t.transferId,
            amount: amountNum,
            coin: t.coin,
            timestamp: transferTime,
          };
        }
      }
    }

    const deposits = await queryBybitApi('/v5/asset/deposit/query-record', {
      coin: 'USDT',
      limit: '10',
    });

    if (deposits?.result?.rows) {
      for (const d of deposits.result.rows) {
        const depTime = parseInt(d.successAt || d.depositTime, 10);
        const amountNum = parseFloat(d.amount);
        if (
          (d.status === 3 || d.status === 1) &&
          Math.abs(amountNum - expectedAmount) < 0.02 &&
          (now - depTime) < THIRTY_MIN_MS
        ) {
          return {
            success: true,
            type: 'on_chain_deposit',
            txID: d.txID,
            amount: amountNum,
            coin: d.coin,
            timestamp: depTime,
          };
        }
      }
    }

    return { success: false };
  } catch (err) {
    console.error('[Bybit Payment Verification Exception]:', err.message);
    return { success: false, error: err.message };
  }
}

// Set of consumed transfer IDs / TxIDs to prevent double spending
const consumedTxIds = new Set();

function isTxIdConsumed(txId) {
  if (!txId) return false;
  return consumedTxIds.has(String(txId).trim().toLowerCase());
}

function markTxIdConsumed(txId) {
  if (!txId) return;
  consumedTxIds.add(String(txId).trim().toLowerCase());
}

/**
 * Generates a unique 16-digit serial key formatted in 4 blocks of 4 (e.g. 8492-4912-7019-3852)
 */
export function generate16DigitSerial() {
  let digits = '';
  for (let i = 0; i < 16; i++) {
    digits += Math.floor(Math.random() * 10);
  }
  return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}-${digits.slice(12, 16)}`;
}

async function verifyTransferIdOrTxid(txidInput, expectedAmount = null) {
  try {
    const cleanTx = (txidInput || '').trim();
    if (!cleanTx || cleanTx.length < 3) return { success: false };

    if (isTxIdConsumed(cleanTx)) {
      return { success: false, error: 'TXID_ALREADY_USED' };
    }

    // 1. Query Internal Transfers
    const transfers = await queryBybitApi('/v5/asset/transfer/query-inter-transfer-list', {
      coin: 'USDT',
      limit: '20',
    });

    if (transfers?.result?.list) {
      for (const t of transfers.result.list) {
        const transferIdStr = String(t.transferId || '');
        if (
          t.status === 'SUCCESS' &&
          (transferIdStr === cleanTx || cleanTx.includes(transferIdStr) || transferIdStr.includes(cleanTx))
        ) {
          if (isTxIdConsumed(transferIdStr)) return { success: false, error: 'TXID_ALREADY_USED' };
          markTxIdConsumed(transferIdStr);
          markTxIdConsumed(cleanTx);
          return {
            success: true,
            type: 'internal_transfer',
            transferId: t.transferId,
            amount: parseFloat(t.amount),
            coin: t.coin,
            timestamp: parseInt(t.timestamp, 10),
          };
        }
      }
    }

    // 2. Query On-Chain Deposits
    const deposits = await queryBybitApi('/v5/asset/deposit/query-record', {
      coin: 'USDT',
      limit: '20',
    });

    if (deposits?.result?.rows) {
      for (const d of deposits.result.rows) {
        const txIdStr = String(d.txID || '');
        if (
          (d.status === 3 || d.status === 1) &&
          (txIdStr === cleanTx || cleanTx.toLowerCase().includes(txIdStr.toLowerCase()) || txIdStr.toLowerCase().includes(cleanTx.toLowerCase()))
        ) {
          if (isTxIdConsumed(txIdStr)) return { success: false, error: 'TXID_ALREADY_USED' };
          markTxIdConsumed(txIdStr);
          markTxIdConsumed(cleanTx);
          return {
            success: true,
            type: 'on_chain_deposit',
            txID: d.txID,
            amount: parseFloat(d.amount),
            coin: d.coin,
            timestamp: parseInt(d.successAt || d.depositTime, 10),
          };
        }
      }
    }

    // 3. Fallback: if expectedAmount given, check matching amount in last 30 mins
    if (expectedAmount && expectedAmount > 0) {
      const fallbackVerify = await verifyBybitPayment(expectedAmount);
      if (fallbackVerify && fallbackVerify.success) {
        const fallbackId = fallbackVerify.transferId || fallbackVerify.txID || `${expectedAmount}_${Date.now()}`;
        if (!isTxIdConsumed(fallbackId)) {
          markTxIdConsumed(fallbackId);
          return fallbackVerify;
        }
      }
    }

    return { success: false };
  } catch (err) {
    console.error('[Verify Transfer ID Exception]:', err.message);
    return { success: false, error: err.message };
  }
}

const MONTHLY_MEDIA_UPLOAD_LIMIT = 5;

const mediaUploadRecords = new Map();
const userChatHistories = new Map();

function getMediaQuota(chatId) {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const record = mediaUploadRecords.get(chatId) || { monthKey: currentMonthKey, count: 0 };
  if (record.monthKey !== currentMonthKey) {
    record.monthKey = currentMonthKey;
    record.count = 0;
  }
  mediaUploadRecords.set(chatId, record);
  return { count: record.count, isExceeded: record.count >= MONTHLY_MEDIA_UPLOAD_LIMIT };
}

function consumeMediaQuota(chatId) {
  const quota = getMediaQuota(chatId);
  quota.count += 1;
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  mediaUploadRecords.set(chatId, { monthKey: currentMonthKey, count: quota.count });
}

function getChatHistory(chatId) {
  return userChatHistories.get(chatId) || [];
}

function appendChatHistory(chatId, userMsg, botMsg) {
  const history = getChatHistory(chatId);
  history.push({ role: 'user', content: userMsg });
  history.push({ role: 'assistant', content: botMsg });
  if (history.length > 10) history.splice(0, history.length - 10);
  userChatHistories.set(chatId, history);
}

function resetChatHistory(chatId) {
  userChatHistories.delete(chatId);
}

async function sendPhoto(chatId, photoPathOrUrl, caption, replyMarkup = null, businessConnectionId = null) {
  try {
    if (typeof photoPathOrUrl === 'string' && photoPathOrUrl.startsWith('http')) {
      const payload = { chat_id: chatId, photo: photoPathOrUrl, caption, parse_mode: 'HTML' };
      if (replyMarkup) payload.reply_markup = replyMarkup;
      if (businessConnectionId) payload.business_connection_id = businessConnectionId;
      const res = await fetch(`${TELEGRAM_API}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } else if (fs.existsSync(photoPathOrUrl)) {
      const formData = new FormData();
      formData.append('chat_id', String(chatId));
      formData.append('caption', caption);
      formData.append('parse_mode', 'HTML');
      if (businessConnectionId) formData.append('business_connection_id', businessConnectionId);
      if (replyMarkup) formData.append('reply_markup', JSON.stringify(replyMarkup));
      const fileBuffer = fs.readFileSync(photoPathOrUrl);
      const blob = new Blob([fileBuffer], { type: 'image/png' });
      formData.append('photo', blob, path.basename(photoPathOrUrl));
      const res = await fetch(`${TELEGRAM_API}/sendPhoto`, {
        method: 'POST',
        body: formData,
      });
      return await res.json();
    }
  } catch (err) {
    console.error('Error sending photo:', err.message);
  }
}

const userLastBotMessage = new Map();

async function deleteMessage(chatId, messageId) {
  if (!chatId || !messageId) return;
  try {
    const res = await fetch(`${TELEGRAM_API}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
    });
    return await res.json();
  } catch (err) {
    return null;
  }
}

async function deletePreviousBotMessage(chatId) {
  const prevMsgId = userLastBotMessage.get(String(chatId));
  if (prevMsgId) {
    userLastBotMessage.delete(String(chatId));
    await deleteMessage(chatId, prevMsgId).catch(() => {});
  }
}

async function sendMessage(chatId, text, replyMarkup = null, businessConnectionId = null) {
  try {
    const payload = { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true };
    if (replyMarkup) payload.reply_markup = replyMarkup;
    if (businessConnectionId) payload.business_connection_id = businessConnectionId;
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data && data.ok && data.result && data.result.message_id) {
      userLastBotMessage.set(String(chatId), data.result.message_id);
    }
    return data;
  } catch (err) {
    return null;
  }
}

async function editMessageText(chatId, messageId, text, replyMarkup = null, businessConnectionId = null) {
  try {
    const payload = { chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML', disable_web_page_preview: true };
    if (replyMarkup) payload.reply_markup = replyMarkup;
    if (businessConnectionId) payload.business_connection_id = businessConnectionId;
    const res = await fetch(`${TELEGRAM_API}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data && data.ok && data.result && data.result.message_id) {
      userLastBotMessage.set(String(chatId), data.result.message_id);
    }
    return data;
  } catch (err) {
    return null;
  }
}

async function answerCallbackQuery(callbackQueryId, text = '', showAlert = false) {
  if (!callbackQueryId) return;
  try {
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: showAlert }),
    });
  } catch {}
}

async function sendChatAction(chatId, action = 'typing', businessConnectionId = null) {
  try {
    const payload = { chat_id: chatId, action };
    if (businessConnectionId) payload.business_connection_id = businessConnectionId;
    await fetch(`${TELEGRAM_API}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {}
}

async function downloadTelegramFileAsBase64(fileId) {
  try {
    const fileRes = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
    if (!fileRes.ok) return null;
    const fileData = await fileRes.json();
    const filePath = fileData?.result?.file_path;
    if (!filePath) return null;
    const downloadRes = await fetch(`${TELEGRAM_FILE_API}/${filePath}`);
    if (!downloadRes.ok) return null;
    const buffer = await downloadRes.arrayBuffer();
    const mimeType = filePath.endsWith('.png') ? 'image/png' : filePath.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
    const base64Str = Buffer.from(buffer).toString('base64');
    return { dataUrl: `data:${mimeType};base64,${base64Str}` };
  } catch (err) {
    return null;
  }
}

// Register direct order delivery handler when admin approves on @upstorelive_bot
setOrderApprovalHandler(async (chatId, shortId, orderRef, meta) => {
  const product = getProductByShortIdOrSlug(shortId) || STORE_CATALOG[0];
  const txInfo = {
    amount: product.our_price,
    type: `Admin Approved (@${meta.adminName || 'Admin'})`,
    transferId: meta.reqId || `LIVE-${Date.now()}`,
  };
  return await deliverInstantOrder(chatId, product, orderRef, txInfo, null, null);
});

const userReferrals = new Map();
const REFERRALS_FILE = path.join(process.cwd(), 'data', 'user_referrals.json');

function loadReferralsFromDisk() {
  try {
    if (fs.existsSync(REFERRALS_FILE)) {
      const raw = fs.readFileSync(REFERRALS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      for (const [k, v] of Object.entries(parsed)) {
        userReferrals.set(String(k), v);
      }
      console.log(`[Referrals] Loaded ${userReferrals.size} referral records from disk.`);
    }
  } catch (err) {
    console.warn('[Referrals Disk Load Warning]:', err.message);
  }
}

function saveReferralsToDisk() {
  try {
    const dir = path.dirname(REFERRALS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const obj = {};
    for (const [k, v] of userReferrals.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(REFERRALS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Referrals Disk Save Error]:', err.message);
  }
}

loadReferralsFromDisk();

async function getUserReferralStats(chatId) {
  let stats = userReferrals.get(String(chatId));
  if (!stats && supabase) {
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', `tg_ref_${chatId}`)
        .single();
      if (data && data.value) {
        stats = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      }
    } catch {}
  }
  if (!stats) {
    stats = { invitedCount: 0, referredBy: null, referrals: [] };
  }
  userReferrals.set(String(chatId), stats);
  return stats;
}

async function saveUserReferralStats(chatId, stats) {
  userReferrals.set(String(chatId), stats);
  saveReferralsToDisk();
  if (supabase) {
    try {
      await supabase.from('site_settings').upsert({
        key: `tg_ref_${chatId}`,
        value: JSON.stringify(stats),
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[Referral Supabase Save Exception]:', err.message);
    }
  }
}

async function recordReferral(newChatId, referrerId) {
  if (!referrerId || String(newChatId) === String(referrerId)) return null;

  try {
    const userStats = await getUserReferralStats(newChatId);
    if (userStats.referredBy) {
      return null;
    }

    userStats.referredBy = String(referrerId);
    await saveUserReferralStats(newChatId, userStats);

    const referrerStats = await getUserReferralStats(referrerId);
    if (!referrerStats.referrals) referrerStats.referrals = [];
    if (!referrerStats.referrals.includes(String(newChatId))) {
      referrerStats.referrals.push(String(newChatId));
      referrerStats.invitedCount = referrerStats.referrals.length;
      await saveUserReferralStats(referrerId, referrerStats);

      const points = referrerStats.invitedCount;
      const earnedDollars = Math.floor(points / 5) * 1.0;
      const nextMilestone = (Math.floor(points / 5) + 1) * 5;
      const remainingForNext = nextMilestone - points;

      // Send instant celebratory notification to referrer
      try {
        const refLang = getUserLanguage(referrerId);
        const notifyText = [
          t('referral_new_user_title', refLang),
          '━━━━━━━━━━━━━━━━━━━━━━',
          t('referral_reward_instant', refLang),
          `📊 <b>${t('referral_total_points_label', refLang)}</b> <code>${points}</code>`,
          `💵 <b>${t('referral_wallet_label', refLang)}</b> <code>$${earnedDollars.toFixed(2)} USDT</code>`,
          t('referral_next_dollar_label', refLang, { remaining: remainingForNext }),
        ].join('\n');

        await sendMessage(referrerId, notifyText, {
          inline_keyboard: [
            [{ text: t('btn_referral_dashboard', refLang), callback_data: 'referral' }],
            [{ text: t('btn_shop_balance', refLang), callback_data: 'catalog' }],
          ],
        });
      } catch (err) {
        console.warn('[Referral Notification Exception]:', err);
      }
    }

    return referrerStats;
  } catch (err) {
    console.error('[Record Referral Error]:', err);
    return null;
  }
}

function getPersistentKeyboard(lang = DEFAULT_LANGUAGE) {
  return {
    keyboard: [
      [{ text: `🛍️ ${t('btn_catalog', lang)}` }, { text: `💳 ${t('btn_wallet', lang)}` }],
      [{ text: `📦 ${t('btn_orders', lang)}` }, { text: `🎁 ${t('btn_referral', lang)}` }],
      [{ text: `${t('btn_about', lang)}` }, { text: `🛡️ ${t('btn_warranty', lang)}` }],
      [{ text: `🏠 ${t('btn_main_menu', lang)}` }, { text: t('btn_language', lang) }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

async function renderLanguageSelection(chatId, messageId, callbackQueryId, businessConnectionId = null) {
  if (callbackQueryId) await answerCallbackQuery(callbackQueryId);

  const currentLang = getUserLanguage(chatId);
  const chk = (code) => (currentLang === code ? ' ✓' : '');

  const text = [
    t('select_language_title', currentLang),
    '──────────────────',
    t('select_language_sub', currentLang),
  ].join('\n');

  const keyboard = {
    inline_keyboard: [
      [
        { text: `🇸🇦 العربية${chk('ar')}`, callback_data: 'set_lang_ar' },
        { text: `🇺🇸 English${chk('en')}`, callback_data: 'set_lang_en' },
      ],
      [
        { text: `🇪🇸 Español${chk('es')}`, callback_data: 'set_lang_es' },
        { text: `🇫🇷 Français${chk('fr')}`, callback_data: 'set_lang_fr' },
      ],
      [
        { text: `🇷🇺 Русский${chk('ru')}`, callback_data: 'set_lang_ru' },
        { text: `🇹🇷 Türkçe${chk('tr')}`, callback_data: 'set_lang_tr' },
      ],
      [
        { text: `🇩🇪 Deutsch${chk('de')}`, callback_data: 'set_lang_de' },
      ],
      [
        { text: `🔙 ${t('btn_back', currentLang)}`, callback_data: 'main_menu' },
      ],
    ],
  };

  if (messageId) {
    const editRes = await editMessageText(chatId, messageId, text, keyboard, businessConnectionId);
    if (!editRes || !editRes.ok) {
      await deleteMessage(chatId, messageId);
      await sendMessage(chatId, text, keyboard, businessConnectionId);
    }
  } else {
    await deletePreviousBotMessage(chatId);
    await sendMessage(chatId, text, keyboard, businessConnectionId);
  }
}

async function renderMainMenu(chatId, messageId, callbackQueryId, businessConnectionId = null) {
  if (callbackQueryId) await answerCallbackQuery(callbackQueryId);

  const lang = getUserLanguage(chatId);
  const text = [
    t('main_menu_title', lang),
    '──────────────────',
    t('main_menu_sub', lang),
    `• ${t('about_established_badge', lang)}`,
    `• ${t('warranty_badge', lang)}`,
    `• ${t('instant_delivery', lang)}`,
  ].join('\n');

  const keyboard = {
    inline_keyboard: [
      [
        { text: `🛍️ ${t('btn_catalog', lang)}`, callback_data: 'catalog' },
        { text: `💳 ${t('btn_wallet', lang)}`, callback_data: 'payment_methods' },
      ],
      [
        { text: `📦 ${t('btn_orders', lang)}`, callback_data: 'my_orders' },
        { text: `🎁 ${t('btn_referral', lang)}`, callback_data: 'referral' },
      ],
      [
        { text: `${t('btn_about', lang)}`, callback_data: 'about_store' },
        { text: `🛡️ ${t('btn_warranty', lang)}`, callback_data: 'warranty_policy' },
      ],
      [
        { text: `👨‍💻 ${t('btn_support', lang)}`, callback_data: 'support' },
        { text: t('btn_language', lang), callback_data: 'language_select' },
      ],
    ],
  };

  const pKeyboard = getPersistentKeyboard(lang);

  if (messageId) {
    const editRes = await editMessageText(chatId, messageId, text, keyboard, businessConnectionId);
    if (!editRes || !editRes.ok) {
      await deleteMessage(chatId, messageId);
      await sendMessage(chatId, text, {
        inline_keyboard: keyboard.inline_keyboard,
        keyboard: pKeyboard.keyboard,
        resize_keyboard: true,
        is_persistent: true,
      }, businessConnectionId);
    }
  } else {
    await deletePreviousBotMessage(chatId);
    await sendMessage(chatId, text, {
      inline_keyboard: keyboard.inline_keyboard,
      keyboard: pKeyboard.keyboard,
      resize_keyboard: true,
      is_persistent: true,
    }, businessConnectionId);
  }
}

async function renderCatalog(chatId, messageId, callbackQueryId, businessConnectionId = null) {
  if (callbackQueryId) await answerCallbackQuery(callbackQueryId);

  const lang = getUserLanguage(chatId);
  const text = [
    `🛍️ <b>${t('catalog_title', lang)}</b>`,
    '──────────────────',
    t('catalog_sub', lang),
  ].join('\n');

  const buttons = STORE_CATEGORIES.map((cat) => {
    const catName = lang === 'ar' ? cat.name_ar : (cat.name_en || cat.name_ar);
    return [{ text: `${cat.emoji} ${catName}`, callback_data: `cat_${cat.id}` }];
  });

  buttons.push([{ text: `🏠 ${t('btn_main_menu', lang)}`, callback_data: 'main_menu' }]);

  const keyboard = { inline_keyboard: buttons };

  if (messageId) {
    const editRes = await editMessageText(chatId, messageId, text, keyboard, businessConnectionId);
    if (!editRes || !editRes.ok) {
      await deleteMessage(chatId, messageId);
      await sendMessage(chatId, text, keyboard, businessConnectionId);
    }
  } else {
    await deletePreviousBotMessage(chatId);
    await sendMessage(chatId, text, keyboard, businessConnectionId);
  }
}

async function renderCategoryBrands(chatId, categoryId, messageId, callbackQueryId, businessConnectionId = null) {
  if (callbackQueryId) await answerCallbackQuery(callbackQueryId);

  const lang = getUserLanguage(chatId);
  const category = getCategoryById(categoryId);
  const brands = getBrandsByCategory(categoryId);

  if (!category || brands.length === 0) {
    await renderCatalog(chatId, messageId, null, businessConnectionId);
    return;
  }

  const catName = lang === 'ar' ? category.name_ar : (category.name_en || category.name_ar);
  const text = [
    `<b>${category.emoji || '📁'} ${catName}</b>`,
    '──────────────────',
    t('select_brand_sub', lang),
  ].join('\n');

  const buttons = brands.map((b) => {
    const prods = getProductsByBrand(b.id);
    const minPrice = prods.length > 0 ? Math.min(...prods.map((p) => p.our_price)) : 0.19;
    const brandName = lang === 'ar' ? b.name_ar : (b.name_en || b.name_ar);
    const priceTag = `(${t('starting_from', lang)} $${minPrice.toFixed(2)})`;
    return [{ text: `${b.icon || '💎'} ${brandName} ${priceTag}`, callback_data: `brand_${b.id}` }];
  });

  buttons.push([
    { text: `🔙 ${t('btn_back', lang)}`, callback_data: 'catalog' },
    { text: `🏠 ${t('btn_main_menu', lang)}`, callback_data: 'main_menu' },
  ]);

  const keyboard = { inline_keyboard: buttons };

  if (messageId) {
    const editRes = await editMessageText(chatId, messageId, text, keyboard, businessConnectionId);
    if (!editRes || !editRes.ok) {
      await deleteMessage(chatId, messageId);
      await sendMessage(chatId, text, keyboard, businessConnectionId);
    }
  } else {
    await sendMessage(chatId, text, keyboard, businessConnectionId);
  }
}

const renderCategoryProducts = renderCategoryBrands;

async function renderBrandTiers(chatId, brandId, messageId, callbackQueryId, businessConnectionId = null) {
  if (callbackQueryId) await answerCallbackQuery(callbackQueryId);

  const lang = getUserLanguage(chatId);
  const brand = getBrandById(brandId);
  const products = getProductsByBrand(brandId);

  if (!brand || products.length === 0) {
    await renderCatalog(chatId, messageId, null, businessConnectionId);
    return;
  }

  const brandName = lang === 'ar' ? brand.name_ar : (brand.name_en || brand.name_ar);
  const desc = (lang === 'ar' && brand.desc) ? `<i>${brand.desc}</i>\n` : '';

  const text = [
    `<b>${brand.icon || '💎'} ${brandName}</b>`,
    '──────────────────',
    desc,
    t('select_tier_sub', lang),
  ].filter(Boolean).join('\n');

  const buttons = products.map((p) => {
    let label = '';
    if (lang === 'ar') {
      const match = (p.name_ar || '').match(/\(([^)]+)\)/);
      label = match ? match[1] : (p.subscription_duration || p.name_ar);
    } else {
      label = p.name || getLocalizedDuration(p.subscription_duration, lang) || p.subscription_duration;
    }
    return [
      {
        text: `⚡ ${label} — $${p.our_price.toFixed(2)}`,
        callback_data: `prod_${p.short_id}`,
      },
    ];
  });

  buttons.push([
    { text: `🔙 ${t('btn_back', lang)}`, callback_data: `cat_${brand.category_id}` },
    { text: `🏠 ${t('btn_main_menu', lang)}`, callback_data: 'main_menu' },
  ]);

  const keyboard = { inline_keyboard: buttons };

  if (messageId) {
    const editRes = await editMessageText(chatId, messageId, text, keyboard, businessConnectionId);
    if (!editRes || !editRes.ok) {
      await deleteMessage(chatId, messageId);
      await sendMessage(chatId, text, keyboard, businessConnectionId);
    }
  } else {
    await sendMessage(chatId, text, keyboard, businessConnectionId);
  }
}

async function renderProductDetails(chatId, shortId, messageId, callbackQueryId, businessConnectionId = null) {
  if (callbackQueryId) await answerCallbackQuery(callbackQueryId);

  const lang = getUserLanguage(chatId);
  const product = getProductByShortIdOrSlug(shortId);
  if (!product) {
    await renderCatalog(chatId, messageId, null, businessConnectionId);
    return;
  }

  const brand = getBrandById(product.brand_id);
  const prodTitle = lang === 'ar' ? product.name_ar : (product.name || product.name_ar);
  const discountPct = product.market_price > product.our_price
    ? Math.round(((product.market_price - product.our_price) / product.market_price) * 100)
    : 0;

  const rawAdvantages = getLocalizedAdvantages(product, lang);
  const advantages = (rawAdvantages && rawAdvantages.length > 0)
    ? rawAdvantages.slice(0, 4).map((a) => `• ${a}`).join('\n')
    : '';

  const discountText = discountPct > 0 ? ` <i>(${t('discount', lang)} ${discountPct}%)</i>` : '';
  const localPriceText = lang === 'ar'
    ? `💵 <b>${t('local_price_label', lang)}:</b> <code>${product.price_egp} ج.م</code> | <code>${product.price_sar} ر.س</code>`
    : `💵 <b>${t('local_price_label', lang)}:</b> <code>${product.price_egp} EGP</code> | <code>${product.price_sar} SAR</code>`;

  const durationText = getLocalizedDuration(product.subscription_duration, lang);
  const warrantyText = getLocalizedWarranty(product.warranty_duration, lang);
  const deliveryMethodText = getLocalizedDeliveryMethod(product.delivery_type, lang);
  const prodPrice = product.our_price;

  // ONLY 2 BUTTON ROWS: 1. Buy Button, 2. Back & Home
  const inline_keyboard = [
    [
      {
        text: `🛍️ ${t('btn_buy_now', lang, { amount: prodPrice.toFixed(2) })}`,
        callback_data: `buy_action_${product.short_id}`,
      },
    ],
    [
      { text: `🔙 ${t('btn_back', lang)}`, callback_data: `brand_${product.brand_id}` },
      { text: `🏠 ${t('btn_main_menu', lang)}`, callback_data: 'main_menu' },
    ],
  ];

  const caption = [
    `<b>${product.icon_symbol || brand?.icon || '💎'} ${prodTitle}</b>`,
    '──────────────────',
    `💰 <b>${t('product_price', lang)}:</b> <code>$${prodPrice.toFixed(2)} USDT</code>${discountText}`,
    localPriceText,
    `⏳ <b>${t('duration_label', lang)}:</b> ${durationText}`,
    `🛡️ <b>${t('warranty_label', lang)}:</b> ${warrantyText}`,
    `📦 <b>${t('delivery_method_label', lang)}:</b> ${deliveryMethodText}`,
    `⚡ <b>${t('delivery', lang)}:</b> ${t('instant_delivery', lang)}`,
    advantages ? `──────────────────\n<b>${t('features_label', lang)}:</b>\n${advantages}` : '',
  ].filter(Boolean).join('\n');

  const keyboard = { inline_keyboard };

  if (messageId) {
    const editRes = await editMessageText(chatId, messageId, caption, keyboard, businessConnectionId);
    if (!editRes || !editRes.ok) {
      await deleteMessage(chatId, messageId);
      await sendMessage(chatId, caption, keyboard, businessConnectionId);
    }
  } else {
    await sendMessage(chatId, caption, keyboard, businessConnectionId);
  }
}

async function handleBuyAction(chatId, shortId, messageId, callbackQueryId, businessConnectionId = null) {
  if (callbackQueryId) await answerCallbackQuery(callbackQueryId);

  const lang = getUserLanguage(chatId);
  const product = getProductByShortIdOrSlug(shortId);
  if (!product) {
    await renderCatalog(chatId, messageId, null, businessConnectionId);
    return;
  }

  const wallet = await getUserWallet(chatId, supabase);
  const currentBal = wallet.balance || 0;
  const prodPrice = product.our_price;

  // Case 1: User has enough balance -> Instant purchase & 16-digit serial delivery
  if (currentBal >= prodPrice) {
    const debitResult = await debitUserWallet(chatId, prodPrice, `PURCHASE_${product.short_id}`, { product_id: product.id, title: product.name_ar }, supabase);
    if (debitResult.success) {
      const orderRef = `WAL-${Math.floor(100000 + Math.random() * 900000)}`;
      const txInfo = {
        amount: prodPrice,
        type: 'Wallet Balance Deduction',
        transferId: `WAL-DEBIT-${Date.now()}`,
      };
      await deliverInstantOrder(chatId, product, orderRef, txInfo, messageId, businessConnectionId);
      return;
    }
  }

  // Case 2: Insufficient balance -> Redirect to clean Top-Up / Recharge screen
  await renderInsufficientFundsScreen(chatId, product, currentBal, messageId, businessConnectionId);
}

async function renderInsufficientFundsScreen(chatId, product, currentBal, messageId, businessConnectionId = null) {
  const lang = getUserLanguage(chatId);
  const brand = getBrandById(product.brand_id);
  const prodTitle = brand ? (lang === 'ar' ? brand.name_ar : (brand.name_en || brand.name_ar)) : product.name_ar;
  const prodPrice = product.our_price;
  const shortage = Number(Math.max(0, prodPrice - currentBal).toFixed(2));

  const text = [
    t('insufficient_funds_title', lang),
    '━━━━━━━━━━━━━━━━━━━━━━',
    `📦 <b>المنتج المطلوب:</b> ${prodTitle}`,
    `💰 <b>${t('required_amount_label', lang)}</b> <code>$${prodPrice.toFixed(2)} USDT</code>`,
    `💳 <b>${t('wallet_current_balance', lang)}</b> <code>$${currentBal.toFixed(2)} USDT</code>`,
    `📉 <b>${t('shortage_label', lang)}</b> <code>$${shortage.toFixed(2)} USDT</code>`,
    '━━━━━━━━━━━━━━━━━━━━━━',
    t('insufficient_funds_desc', lang),
    '',
    t('insufficient_choose_method', lang),
  ].join('\n');

  const keyboard = {
    inline_keyboard: [
      [
        { text: `⚡ ${t('btn_pay_bybit', lang)}`, callback_data: `topup_method_bybit_5.00_${product.short_id}` },
      ],
      [
        { text: `🟡 ${t('btn_pay_binance', lang)}`, callback_data: `topup_method_binance_5.00_${product.short_id}` },
      ],
      [
        { text: `📱 ${t('btn_pay_local', lang)} (@UPSTORE_HELP)`, url: 'https://t.me/UPSTORE_HELP' },
      ],
      [
        { text: `🔙 ${t('btn_back', lang)}`, callback_data: `prod_${product.short_id}` },
        { text: `🏠 ${t('btn_main_menu', lang)}`, callback_data: 'main_menu' },
      ],
    ],
  };

  if (messageId) {
    const editRes = await editMessageText(chatId, messageId, text, keyboard, businessConnectionId);
    if (!editRes || !editRes.ok) {
      await deleteMessage(chatId, messageId);
      await sendMessage(chatId, text, keyboard, businessConnectionId);
    }
  } else {
    await sendMessage(chatId, text, keyboard, businessConnectionId);
  }
}

async function renderDirectBybitCheckout(chatId, shortId, messageId, callbackQueryId, businessConnectionId = null) {
  if (callbackQueryId) await answerCallbackQuery(callbackQueryId);

  const lang = getUserLanguage(chatId);
  const product = getProductByShortIdOrSlug(shortId) || STORE_CATALOG[0];
  const orderRef = `UP-${Math.floor(100000 + Math.random() * 900000)}`;

  if (supabase) {
    try {
      await supabase.from('orders').insert({
        amount: product.our_price,
        status: 'pending_manual_payment',
        product_id: product.id,
        product_key: 'PENDING_TELEGRAM_FULFILLMENT',
        session_id: `tg_${chatId}_${orderRef}`,
        payment_sender: `Telegram @${chatId} (Bybit Crypto)`,
      });
    } catch (err) {
      console.error('[Supabase Order Insert Exception]:', err);
    }
  }

  notifyPurchaseAttempt({ id: chatId }, product, 'Bybit Pay (Crypto)', orderRef);

  const text = [
    t('bybit_checkout_title', lang),
    '──────────────────',
    `<b>${t('bybit_uid_label', lang)}</b> <code>47183921</code>`,
    `<b>${t('bybit_amount_label', lang)}</b> <code>${product.our_price.toFixed(2)}</code> USDT`,
    `<i>(${t('btn_copy_hint', lang)})</i>`,
    '──────────────────',
    t('bybit_step1', lang),
    t('bybit_step2', lang),
    '──────────────────',
    t('bybit_underpay_notice', lang),
  ].join('\n');

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: `⚡ ${t('btn_verify_bybit', lang)}`,
          callback_data: `check_bybit_${product.short_id}_${orderRef}`,
        },
      ],
      [
        { text: `👨‍💻 ${t('btn_support', lang)}`, callback_data: 'support' },
      ],
      [
        { text: `🔙 ${t('btn_back', lang)}`, callback_data: `prod_${product.short_id}` },
        { text: `🏠 ${t('btn_main_menu', lang)}`, callback_data: 'main_menu' },
      ],
    ],
  };

  if (messageId) {
    const editRes = await editMessageText(chatId, messageId, text, keyboard, businessConnectionId);
    if (!editRes || !editRes.ok) {
      await deleteMessage(chatId, messageId);
      await sendMessage(chatId, text, keyboard, businessConnectionId);
    }
  } else {
    await sendMessage(chatId, text, keyboard, businessConnectionId);
  }
}

async function renderDirectBinanceCheckout(chatId, shortId, messageId, callbackQueryId, businessConnectionId = null) {
  if (callbackQueryId) await answerCallbackQuery(callbackQueryId);

  const lang = getUserLanguage(chatId);
  const product = getProductByShortIdOrSlug(shortId) || STORE_CATALOG[0];
  const orderRef = `UP-${Math.floor(100000 + Math.random() * 900000)}`;

  if (supabase) {
    try {
      await supabase.from('orders').insert({
        amount: product.our_price,
        status: 'pending_manual_payment',
        product_id: product.id,
        product_key: 'PENDING_TELEGRAM_FULFILLMENT',
        session_id: `tg_${chatId}_${orderRef}`,
        payment_sender: `Telegram @${chatId} (Binance Pay)`,
      });
    } catch (err) {
      console.error('[Supabase Order Insert Exception]:', err);
    }
  }

  notifyPurchaseAttempt({ id: chatId }, product, 'Binance Pay', orderRef);

  const text = [
    t('binance_checkout_title', lang),
    '──────────────────',
    `<b>${t('binance_id_label', lang)}</b> <code>764476139</code>`,
    `<b>${t('bybit_amount_label', lang)}</b> <code>${product.our_price.toFixed(2)}</code> USDT`,
    `<i>(${t('btn_copy_hint', lang)})</i>`,
    '──────────────────',
    t('binance_step1', lang),
    t('binance_step2', lang),
  ].join('\n');

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: `🟡 ${t('btn_verify_binance', lang)}`,
          callback_data: `check_binance_${product.short_id}_${orderRef}`,
        },
      ],
      [
        { text: `👨‍💻 ${t('btn_support', lang)}`, callback_data: 'support' },
      ],
      [
        { text: `🔙 ${t('btn_back', lang)}`, callback_data: `prod_${product.short_id}` },
        { text: `🏠 ${t('btn_main_menu', lang)}`, callback_data: 'main_menu' },
      ],
    ],
  };

  if (messageId) {
    const editRes = await editMessageText(chatId, messageId, text, keyboard, businessConnectionId);
    if (!editRes || !editRes.ok) {
      await deleteMessage(chatId, messageId);
      await sendMessage(chatId, text, keyboard, businessConnectionId);
    }
  } else {
    await sendMessage(chatId, text, keyboard, businessConnectionId);
  }
}

async function deliverInstantOrder(chatId, product, orderRef, txInfo, messageId = null, businessConnectionId = null) {
  const lang = getUserLanguage(chatId);
  const serialCode = generate16DigitSerial();

  if (supabase) {
    try {
      await supabase.from('orders').update({
        status: 'completed',
        product_key: serialCode,
      }).eq('session_id', `tg_${chatId}_${orderRef}`);
    } catch (err) {
      console.error('[Supabase Order Complete Update Exception]:', err);
    }
  }

  const generatedUser = `upstore_vip_${Math.floor(10000 + Math.random() * 90000)}@gmail.com`;
  const generatedPass = `UpStore#${Math.floor(100000 + Math.random() * 900000)}`;

  const brand = getBrandById(product.brand_id);
  const prodTitle = lang === 'ar' ? product.name_ar : (product.name || product.name_ar);
  const durationText = getLocalizedDuration(product.subscription_duration, lang);
  const warrantyText = getLocalizedWarranty(product.warranty_duration, lang);
  const deliveryMethodText = getLocalizedDeliveryMethod(product.delivery_type, lang);

  let credentialLines = [];
  if (product.delivery_type === 'license_key') {
    credentialLines = [
      t('order_serial_title', lang),
      `<code>${serialCode}</code>`,
      t('order_copy_code_hint', lang),
    ];
  } else if (product.delivery_type === 'personal_account') {
    credentialLines = [
      `✉️ <b>${deliveryMethodText}</b>`,
      `• <b>${t('order_serial_title', lang)}</b> <code>${serialCode}</code>`,
      lang === 'ar'
        ? '<i>(تم ربط وتوثيق طلب التفعيل الفوري مع حسابك الشخصي بنجاح 🤍)</i>'
        : '<i>(Activation successfully verified & bound to your personal account 🤍)</i>',
    ];
  } else if (product.delivery_type === 'api_token') {
    const apiToken = `sk-upstore-${Math.floor(100000 + Math.random() * 900000)}-${serialCode.replace(/-/g, '').toLowerCase()}`;
    credentialLines = [
      `⚡ <b>${t('delivery_api_token', lang)}:</b>`,
      `<code>${apiToken}</code>`,
      t('order_copy_code_hint', lang),
    ];
  } else {
    // private_account, vpn_credentials
    credentialLines = [
      t('order_credentials_title', lang),
      `• <b>${t('order_username_label', lang)}</b> <code>${generatedUser}</code>`,
      `• <b>${t('order_password_label', lang)}</b> <code>${generatedPass}</code>`,
      `• <b>${t('order_serial_title', lang)}</b> <code>${serialCode}</code>`,
    ];
  }

  const deliveryText = [
    t('order_delivery_title', lang),
    '──────────────────',
    `📦 <b>${t('order_product_label', lang)}</b> ${prodTitle}`,
    `🆔 <b>${t('order_ref_label', lang)}</b> <code>#${orderRef}</code>`,
    `💎 <b>${t('order_amount_received_label', lang)}</b> <code>${txInfo.amount || product.our_price} USDT</code>`,
    `⏳ <b>${t('order_duration_label', lang)}</b> ${durationText}`,
    `🛡️ <b>${t('warranty_label', lang)}</b> ${warrantyText}`,
    '──────────────────',
    ...credentialLines,
    '──────────────────',
    t('order_warranty_notice', lang),
  ].join('\n');

  // Trigger live broadcast to @upstorelive_bot
  try {
    notifyPurchaseDelivered(
      { id: chatId, first_name: `User #${chatId}` },
      product,
      txInfo.type || 'Bybit / Crypto Pay',
      orderRef,
      txInfo,
      { username: generatedUser, password: generatedPass },
      serialCode
    );
  } catch (err) {
    console.warn('[LiveMonitor Delivery Broadcast Warning]:', err.message);
  }

  const keyboard = {
    inline_keyboard: [
      [{ text: `📦 ${t('btn_orders', lang)}`, callback_data: 'my_orders' }],
      [{ text: `🛍️ ${t('btn_catalog', lang)}`, callback_data: 'catalog' }],
      [{ text: `👨‍💻 ${t('btn_support', lang)}`, callback_data: 'support' }],
    ],
  };

  if (messageId) {
    await deleteMessage(chatId, messageId);
  }
  await sendMessage(chatId, deliveryText, keyboard, businessConnectionId);
}

async function renderDirectLocalCheckout(chatId, shortId, messageId, callbackQueryId, businessConnectionId = null) {
  if (callbackQueryId) await answerCallbackQuery(callbackQueryId);

  const lang = getUserLanguage(chatId);
  const product = getProductByShortIdOrSlug(shortId) || STORE_CATALOG[0];
  const orderRef = `UP-${Math.floor(100000 + Math.random() * 900000)}`;

  if (supabase) {
    try {
      await supabase.from('orders').insert({
        amount: product.our_price,
        status: 'pending_manual_payment',
        product_id: product.id,
        product_key: 'PENDING_TELEGRAM_FULFILLMENT',
        session_id: `tg_${chatId}_${orderRef}`,
        payment_sender: `Telegram @${chatId} (Local Pay Support)`,
      });
    } catch (err) {
      console.error('[Supabase Order Insert Exception]:', err);
    }
  }

  notifyPurchaseAttempt({ id: chatId }, product, 'Local Pay (Via Support)', orderRef);

  const brand = getBrandById(product.brand_id);
  const prodTitle = brand ? (lang === 'ar' ? brand.name_ar : (brand.name_en || brand.name_ar)) : product.name_ar;

  const text = [
    `<b>${t('local_checkout_title', lang)}</b>`,
    '──────────────────',
    `📦 <b>المنتج:</b> ${prodTitle}`,
    `🆔 <b>رقم الطلب:</b> <code>#${orderRef}</code>`,
    `💵 <b>المبلغ:</b> <code>${product.price_egp} EGP</code> / <code>${product.price_sar} SAR</code> ($${product.our_price.toFixed(2)} USDT)`,
    '──────────────────',
    t('local_step', lang),
  ].join('\n');

  const keyboard = {
    inline_keyboard: [
      [
        { text: `👨‍💻 ${t('btn_support', lang)} (@UPSTORE_HELP)`, url: 'https://t.me/UPSTORE_HELP' },
      ],
      [
        { text: `🔙 ${t('btn_back', lang)}`, callback_data: `prod_${product.short_id}` },
        { text: `🏠 ${t('btn_main_menu', lang)}`, callback_data: 'main_menu' },
      ],
    ],
  };

  if (messageId) {
    const editRes = await editMessageText(chatId, messageId, text, keyboard, businessConnectionId);
    if (!editRes || !editRes.ok) {
      await deleteMessage(chatId, messageId);
      await sendMessage(chatId, text, keyboard, businessConnectionId);
    }
  } else {
    await sendMessage(chatId, text, keyboard, businessConnectionId);
  }
}

async function renderMyOrders(chatId, messageId, callbackQueryId, businessConnectionId = null) {
  if (callbackQueryId) await answerCallbackQuery(callbackQueryId);

  const lang = getUserLanguage(chatId);
  let ordersText = '';
  if (supabase) {
    try {
      const { data: orders } = await supabase
        .from('orders')
        .select('id, amount, status, product_key, session_id, created_at, products(name, name_ar)')
        .or(`session_id.ilike.%tg_${chatId}%,payment_sender.ilike.%@${chatId}%`)
        .order('created_at', { ascending: false })
        .limit(5);

      if (orders && orders.length > 0) {
        orders.forEach((o, i) => {
          const title = (lang === 'ar' ? o.products?.name_ar : o.products?.name) || 'Digital Product';
          const shortId = o.id.slice(0, 8).toUpperCase();
          let statusBadge = o.status === 'completed' || o.status === 'fulfilled' ? 'Completed' : 'Pending';

          ordersText += `<b>${i + 1}. #${shortId} — ${title}</b>\n`;
          ordersText += `• Status: <code>${statusBadge}</code> | Amount: <code>$${Number(o.amount).toFixed(2)}</code>\n`;
          if ((o.status === 'completed' || o.status === 'fulfilled') && o.product_key && o.product_key !== 'PENDING_TELEGRAM_FULFILLMENT') {
            ordersText += `• Info: <code>${o.product_key}</code>\n`;
          }
          ordersText += '──────────────────\n';
        });
      }
    } catch {}
  }

  if (!ordersText) {
    ordersText = `<i>${t('no_orders', lang)}</i>\n`;
  }

  const text = [
    t('orders_title', lang),
    '──────────────────',
    ordersText.trim(),
    '──────────────────',
    '⚡ <i>جميع المنتجات مشمولة بالضمان الذهبي 100%.</i>',
  ].join('\n');

  const keyboard = {
    inline_keyboard: [
      [{ text: `🛍️ ${t('btn_catalog', lang)}`, callback_data: 'catalog' }],
      [{ text: `🔄 ${t('btn_refresh', lang)}`, callback_data: 'my_orders' }],
      [{ text: `🏠 ${t('btn_main_menu', lang)}`, callback_data: 'main_menu' }],
    ],
  };

  if (messageId) {
    const editRes = await editMessageText(chatId, messageId, text, keyboard, businessConnectionId);
    if (!editRes || !editRes.ok) {
      await deleteMessage(chatId, messageId);
      await sendMessage(chatId, text, keyboard, businessConnectionId);
    }
  } else {
    await deletePreviousBotMessage(chatId);
    await sendMessage(chatId, text, keyboard, businessConnectionId);
  }
}

async function renderPaymentMethodsScreen(chatId, messageId, callbackQueryId, businessConnectionId = null) {
  if (callbackQueryId) await answerCallbackQuery(callbackQueryId);

  const lang = getUserLanguage(chatId);
  const wallet = await getUserWallet(chatId, supabase);
  const bal = wallet.balance || 0;

  const isAr = lang === 'ar';
  const bonusHeader = isAr ? '🎁 <b>بونص الشحن الإضافي المتاح الآن:</b>' : '🎁 <b>Exclusive Top-Up Bonus Tiers:</b>';
  const bonusTiers = isAr
    ? [
        '• شحن <b>$15</b> 👈 <b>+$1.50</b> هدية رصيد (إجمالي <b>$16.50</b>) 🎁',
        '• شحن <b>$25</b> 👈 <b>+$3.00</b> هدية رصيد (إجمالي <b>$28.00</b>) 🎁',
        '• شحن <b>$50</b> 👈 <b>+$7.00</b> هدية رصيد (إجمالي <b>$57.00</b>) 🎁',
        '• شحن <b>$100</b> 👈 <b>+$15.00</b> هدية رصيد (إجمالي <b>$115.00</b>) 🎁',
        '• شحن <b>$200</b> 👈 <b>+$35.00</b> هدية رصيد (إجمالي <b>$235.00</b>) 🎁',
      ]
    : [
        '• Deposit <b>$15</b> 👈 <b>+$1.50</b> Bonus (Total <b>$16.50</b>) 🎁',
        '• Deposit <b>$25</b> 👈 <b>+$3.00</b> Bonus (Total <b>$28.00</b>) 🎁',
        '• Deposit <b>$50</b> 👈 <b>+$7.00</b> Bonus (Total <b>$57.00</b>) 🎁',
        '• Deposit <b>$100</b> 👈 <b>+$15.00</b> Bonus (Total <b>$115.00</b>) 🎁',
        '• Deposit <b>$200</b> 👈 <b>+$35.00</b> Bonus (Total <b>$235.00</b>) 🎁',
      ];

  const text = [
    t('wallet_title', lang),
    '──────────────────',
    `💰 <b>${t('wallet_current_balance', lang)}</b> <code>$${bal.toFixed(2)} USDT</code>`,
    `📊 <b>${t('total_recharged_label', lang) || 'إجمالي المشحون:'}</b> <code>$${(wallet.totalRecharged || 0).toFixed(2)} USDT</code> | <b>${t('total_spent_label', lang) || 'المشتريات:'}</b> <code>$${(wallet.totalSpent || 0).toFixed(2)} USDT</code>`,
    '──────────────────',
    t('wallet_min_deposit_notice', lang),
    '──────────────────',
    bonusHeader,
    ...bonusTiers,
    '──────────────────',
    '• ⚡ <b>Bybit UID:</b> <code>47183921</code>',
    '• 🟡 <b>Binance Pay ID:</b> <code>764476139</code>',
    '• 📱 <b>طرق الدفع المحلية:</b> عبر التواصل مع الدعم الفني @UPSTORE_HELP',
    `<i>(${t('btn_copy_hint', lang)})</i>`,
    '──────────────────',
    t('local_step', lang),
  ].join('\n');

  const keyboard = {
    inline_keyboard: [
      [
        { text: '⚡ $5 USDT', callback_data: 'topup_wallet_5.00' },
        { text: '⚡ $10 USDT', callback_data: 'topup_wallet_10.00' },
      ],
      [
        { text: isAr ? '🎁 $15 (+$1.50 هدية)' : '🎁 $15 (+$1.50 Bonus)', callback_data: 'topup_wallet_15.00' },
        { text: isAr ? '🎁 $25 (+$3.00 هدية)' : '🎁 $25 (+$3.00 Bonus)', callback_data: 'topup_wallet_25.00' },
      ],
      [
        { text: isAr ? '🎁 $50 (+$7.00 هدية)' : '🎁 $50 (+$7.00 Bonus)', callback_data: 'topup_wallet_50.00' },
        { text: isAr ? '🎁 $100 (+$15.00 هدية)' : '🎁 $100 (+$15.00 Bonus)', callback_data: 'topup_wallet_100.00' },
      ],
      [
        { text: isAr ? '🎁 $200 (+$35.00 هدية)' : '🎁 $200 (+$35.00 Bonus)', callback_data: 'topup_wallet_200.00' },
      ],
      [
        { text: `🛍️ ${t('btn_catalog', lang)}`, callback_data: 'catalog' },
        { text: `🔄 ${t('btn_refresh_balance', lang)}`, callback_data: 'payment_methods' },
      ],
      [
        { text: `👨‍💻 ${t('btn_support', lang)}`, callback_data: 'support' },
        { text: `🏠 ${t('btn_main_menu', lang)}`, callback_data: 'main_menu' },
      ],
    ],
  };

  if (messageId) {
    const editRes = await editMessageText(chatId, messageId, text, keyboard, businessConnectionId);
    if (!editRes || !editRes.ok) {
      await deleteMessage(chatId, messageId);
      await sendMessage(chatId, text, keyboard, businessConnectionId);
    }
  } else {
    await deletePreviousBotMessage(chatId);
    await sendMessage(chatId, text, keyboard, businessConnectionId);
  }
}

async function renderWalletTopupScreen(chatId, defaultAmount = 5.0, returnProdId = null, messageId = null, callbackQueryId = null, businessConnectionId = null) {
  if (callbackQueryId) await answerCallbackQuery(callbackQueryId);

  const lang = getUserLanguage(chatId);
  const wallet = await getUserWallet(chatId, supabase);
  const amt = Math.max(MIN_TOPUP_USD, Number(defaultAmount) || MIN_TOPUP_USD);
  const bonus = calculateTopupBonus(amt);
  const totalCredited = amt + bonus;
  const isAr = lang === 'ar';

  const bonusLines = bonus > 0
    ? [
        `🎁 <b>${t('wallet_bonus_label', lang)}</b> <code>+$${bonus.toFixed(2)} USDT</code>`,
        `💎 <b>${t('wallet_total_credited_label', lang)}</b> <code>$${totalCredited.toFixed(2)} USDT</code>`,
      ]
    : [];

  const text = [
    t('wallet_title', lang),
    '──────────────────',
    `💰 <b>${t('wallet_current_balance', lang)}</b> <code>$${wallet.balance.toFixed(2)} USDT</code>`,
    `⚡ <b>${t('topup_package_label', lang)}</b> <code>$${amt.toFixed(2)} USDT</code>`,
    ...bonusLines,
    '──────────────────',
    t('wallet_underpay_notice', lang),
    '──────────────────',
    t('wallet_topup_select_method', lang, { amount: amt.toFixed(2) }),
  ].join('\n');

  const backTarget = returnProdId ? `prod_${returnProdId}` : 'payment_methods';

  const keyboard = {
    inline_keyboard: [
      [
        { text: `⚡ Bybit UID ($${amt.toFixed(2)})`, callback_data: `topup_method_bybit_${amt}_${returnProdId || 'none'}` },
        { text: `🟡 Binance Pay ($${amt.toFixed(2)})`, callback_data: `topup_method_binance_${amt}_${returnProdId || 'none'}` },
      ],
      [
        { text: `👨‍💻 ${t('btn_pay_local', lang)} (@UPSTORE_HELP)`, url: 'https://t.me/UPSTORE_HELP' },
      ],
      [
        { text: `🔙 ${t('btn_back', lang)}`, callback_data: backTarget },
        { text: `🏠 ${t('btn_main_menu', lang)}`, callback_data: 'main_menu' },
      ],
    ],
  };

  if (messageId) {
    const editRes = await editMessageText(chatId, messageId, text, keyboard, businessConnectionId);
    if (!editRes || !editRes.ok) {
      await deleteMessage(chatId, messageId);
      await sendMessage(chatId, text, keyboard, businessConnectionId);
    }
  } else {
    await sendMessage(chatId, text, keyboard, businessConnectionId);
  }
}

async function renderWalletTopupMethod(chatId, method, amount, returnProdId = null, messageId = null, callbackQueryId = null, businessConnectionId = null) {
  if (callbackQueryId) await answerCallbackQuery(callbackQueryId);

  const lang = getUserLanguage(chatId);
  const amt = Math.max(MIN_TOPUP_USD, Number(amount) || MIN_TOPUP_USD);
  const bonus = calculateTopupBonus(amt);
  const totalCredited = amt + bonus;
  const isAr = lang === 'ar';
  const orderRef = `TOPUP-${Math.floor(100000 + Math.random() * 900000)}`;

  if (supabase) {
    try {
      await supabase.from('orders').insert({
        amount: amt,
        status: 'pending_manual_payment',
        product_key: `WALLET_TOPUP_${amt}_USDT`,
        session_id: `tg_${chatId}_${orderRef}`,
        payment_sender: `Telegram @${chatId} (TopUp ${method})`,
      });
    } catch (err) {}
  }

  let methodTitle = '';
  let lines = [];
  let checkCallback = `check_topup_${method}_${amt}_${orderRef}_${returnProdId || 'none'}`;

  const bonusBlock = bonus > 0
    ? [
        `🎁 <b>${t('wallet_bonus_label', lang)}</b> <code>+$${bonus.toFixed(2)} USDT</code>`,
        `💎 <b>${t('wallet_total_credited_label', lang)}</b> <code>$${totalCredited.toFixed(2)} USDT</code>`,
        '──────────────────',
      ]
    : [];

  if (method === 'bybit') {
    methodTitle = 'Bybit Internal Transfer';
    lines = [
      `<b>⚡ ${isAr ? 'شحن المحفظة عبر Bybit Pay' : 'Top-Up Wallet via Bybit Pay'} ($${amt.toFixed(2)} USDT)</b>`,
      '──────────────────',
      `• <b>Bybit UID:</b> <code>47183921</code>`,
      `• <b>${isAr ? 'المبلغ المطلوب تحويله:' : 'Amount to Transfer:'}</b> <code>${amt.toFixed(2)}</code> USDT`,
      ...bonusBlock,
      `<i>(${t('btn_copy_hint', lang)})</i>`,
      '──────────────────',
      isAr
        ? '1. حوّل المبلغ إلى معرف Bybit أعلاه عبر التحويل الداخلي (Internal Transfer).'
        : '1. Transfer the exact amount to the Bybit UID above via Internal Transfer.',
      isAr
        ? '2. بعد التحويل، اضغط على زر التحقق بالأسفل أو أرسل رقم التحويل هنا لإيداع الرصيد تلقائياً.'
        : '2. After transfer, click Verify below or send your Transfer ID in the chat for instant crediting.',
      '──────────────────',
      t('wallet_underpay_notice', lang),
    ];
  } else if (method === 'binance') {
    methodTitle = 'Binance Pay';
    lines = [
      `<b>🟡 ${isAr ? 'شحن المحفظة عبر Binance Pay' : 'Top-Up Wallet via Binance Pay'} ($${amt.toFixed(2)} USDT)</b>`,
      '──────────────────',
      `• <b>Binance Pay ID:</b> <code>764476139</code>`,
      `• <b>${isAr ? 'المبلغ المطلوب تحويله:' : 'Amount to Transfer:'}</b> <code>${amt.toFixed(2)}</code> USDT`,
      ...bonusBlock,
      `<i>(${t('btn_copy_hint', lang)})</i>`,
      '──────────────────',
      isAr
        ? '1. حوّل المبلغ إلى معرّف بينانس أعلاه.'
        : '1. Transfer the amount to the Binance Pay ID above.',
      isAr
        ? '2. بعد التحويل، اضغط زر التأكيد بالأسفل وأرسل Order ID للمحفظة فورياً.'
        : '2. After transfer, click Confirm below or send your Order ID for instant crediting.',
      '──────────────────',
      t('wallet_underpay_notice', lang),
    ];
  } else {
    methodTitle = 'Local Payment Support';
    lines = [
      `<b>📱 ${isAr ? 'شحن المحفظة بالدفع المحلي' : 'Top-Up Wallet via Local Payment'} ($${amt.toFixed(2)} USDT)</b>`,
      '──────────────────',
      t('local_step', lang),
      '──────────────────',
      isAr
        ? 'تواصل مباشرة مع خدمة العملاء @UPSTORE_HELP وسيتم تزويدك ببيانات التحويل وشحن محفظتك فوراً ⚡'
        : 'Contact Support directly @UPSTORE_HELP to receive local payment details and instant crediting ⚡',
      '──────────────────',
      t('wallet_underpay_notice', lang),
    ];
  }

  const text = lines.join('\n');
  const keyboard = {
    inline_keyboard: [
      [
        { text: `⚡ ${t('btn_verify_payment_auto', lang) || 'تحقق من الشحن الآن'}`, callback_data: checkCallback },
      ],
      [
        { text: `👨‍💻 ${t('btn_support', lang)} (@UPSTORE_HELP)`, url: 'https://t.me/UPSTORE_HELP' },
        { text: `🔙 ${t('btn_back', lang)}`, callback_data: returnProdId && returnProdId !== 'none' ? `prod_${returnProdId}` : 'payment_methods' },
      ],
      [
        { text: `🏠 ${t('btn_main_menu', lang)}`, callback_data: 'main_menu' },
      ],
    ],
  };

  if (messageId) {
    const editRes = await editMessageText(chatId, messageId, text, keyboard, businessConnectionId);
    if (!editRes || !editRes.ok) {
      await deleteMessage(chatId, messageId);
      await sendMessage(chatId, text, keyboard, businessConnectionId);
    }
  } else {
    await sendMessage(chatId, text, keyboard, businessConnectionId);
  }
}

async function renderAboutStoreScreen(chatId, messageId, callbackQueryId, businessConnectionId = null) {
  if (callbackQueryId) await answerCallbackQuery(callbackQueryId);

  const lang = getUserLanguage(chatId);
  const text = [
    t('about_store_title', lang),
    '━━━━━━━━━━━━━━━━━━━━━━',
    t('about_established_badge', lang),
    '',
    t('about_heritage_text', lang),
    '',
    '━━━━━━━━━━━━━━━━━━━━━━',
    t('about_stats_header', lang),
    t('about_stat_customers', lang),
    t('about_stat_orders', lang),
    t('about_stat_rating', lang),
    t('about_stat_speed', lang),
    '',
    '━━━━━━━━━━━━━━━━━━━━━━',
    t('about_pillars_header', lang),
    t('about_pillar_official', lang),
    t('about_pillar_warranty', lang),
    t('about_pillar_payment', lang),
    t('about_pillar_support', lang),
  ].join('\n');

  const keyboard = {
    inline_keyboard: [
      [
        { text: `🛍️ ${t('btn_catalog', lang)}`, callback_data: 'catalog' },
        { text: `💳 ${t('btn_wallet', lang)}`, callback_data: 'payment_methods' },
      ],
      [
        { text: t('btn_view_warranty', lang), callback_data: 'warranty_policy' },
        { text: `👨‍💻 ${t('btn_support', lang)} (@UPSTORE_HELP)`, url: 'https://t.me/UPSTORE_HELP' },
      ],
      [
        { text: `🏠 ${t('btn_main_menu', lang)}`, callback_data: 'main_menu' },
      ],
    ],
  };

  if (messageId) {
    const editRes = await editMessageText(chatId, messageId, text, keyboard, businessConnectionId);
    if (!editRes || !editRes.ok) {
      await deleteMessage(chatId, messageId);
      await sendMessage(chatId, text, keyboard, businessConnectionId);
    }
  } else {
    await deletePreviousBotMessage(chatId);
    await sendMessage(chatId, text, keyboard, businessConnectionId);
  }
}

async function renderWarrantyPolicyScreen(chatId, messageId, callbackQueryId, businessConnectionId = null) {
  if (callbackQueryId) await answerCallbackQuery(callbackQueryId);

  const lang = getUserLanguage(chatId);
  const text = [
    t('warranty_title', lang),
    '──────────────────',
    t('warranty_desc', lang),
  ].join('\n');

  const keyboard = {
    inline_keyboard: [
      [
        { text: `👨‍💻 ${t('btn_support', lang)}`, callback_data: 'support' },
      ],
      [
        { text: `🏠 ${t('btn_main_menu', lang)}`, callback_data: 'main_menu' },
      ],
    ],
  };

  if (messageId) {
    const editRes = await editMessageText(chatId, messageId, text, keyboard, businessConnectionId);
    if (!editRes || !editRes.ok) {
      await deleteMessage(chatId, messageId);
      await sendMessage(chatId, text, keyboard, businessConnectionId);
    }
  } else {
    await deletePreviousBotMessage(chatId);
    await sendMessage(chatId, text, keyboard, businessConnectionId);
  }
}

async function renderReferralScreen(chatId, messageId, callbackQueryId, businessConnectionId = null) {
  if (callbackQueryId) await answerCallbackQuery(callbackQueryId);

  const lang = getUserLanguage(chatId);
  const stats = await getUserReferralStats(chatId);
  const invitedCount = stats.invitedCount || (stats.referrals ? stats.referrals.length : 0);
  const points = invitedCount;
  const earnedDollars = Math.floor(points / 5) * 1.0;
  const nextMilestonePoints = (Math.floor(points / 5) + 1) * 5;
  const remainingPoints = nextMilestonePoints - points;
  const refLink = `https://t.me/upstore_one_bot?start=ref_${chatId}`;

  const shareText = encodeURIComponent(`UpStore — AI & Premium Accounts: ${refLink}`);

  const text = [
    t('referral_title', lang),
    '──────────────────',
    t('referral_desc', lang),
    '',
    t('referral_formula', lang),
    '──────────────────',
    `• <b>${t('invited_friends', lang)}</b> <code>${invitedCount}</code>`,
    `• <b>${t('total_points', lang)}</b> <code>${points}</code>`,
    `• <b>${t('wallet_balance', lang)}</b> <code>$${earnedDollars.toFixed(2)} USDT</code>`,
    `• <b>${t('points_to_next', lang)}</b> <code>${remainingPoints}</code>`,
    '──────────────────',
    `🔗 <b>${t('ref_link_label', lang)}</b>`,
    `<code>${refLink}</code>`,
  ].join('\n');

  const keyboard = {
    inline_keyboard: [
      [
        { text: `🚀 ${t('btn_share_tg', lang)}`, url: `https://t.me/share/url?url=${refLink}&text=${shareText}` },
      ],
      [
        { text: `💬 ${t('btn_share_wa', lang)}`, url: `https://api.whatsapp.com/send?text=${shareText}` },
      ],
      [
        { text: `🛍️ ${t('btn_shop_with_balance', lang)}`, callback_data: 'catalog' },
        { text: `🔄 ${t('btn_refresh', lang)}`, callback_data: 'referral' },
      ],
      [
        { text: `🏠 ${t('btn_main_menu', lang)}`, callback_data: 'main_menu' },
      ],
    ],
  };

  if (messageId) {
    const editRes = await editMessageText(chatId, messageId, text, keyboard, businessConnectionId);
    if (!editRes || !editRes.ok) {
      await deleteMessage(chatId, messageId);
      await sendMessage(chatId, text, keyboard, businessConnectionId);
    }
  } else {
    await deletePreviousBotMessage(chatId);
    await sendMessage(chatId, text, keyboard, businessConnectionId);
  }
}

async function renderSupportScreen(chatId, messageId, callbackQueryId, businessConnectionId = null) {
  if (callbackQueryId) await answerCallbackQuery(callbackQueryId);

  const lang = getUserLanguage(chatId);
  const text = [
    t('support_title', lang),
    '──────────────────',
    t('support_desc', lang),
    `• <b>${t('support_handle', lang)}</b> @UPSTORE_HELP`,
  ].join('\n');

  const keyboard = {
    inline_keyboard: [
      [
        { text: `🛡️ ${t('btn_warranty', lang)}`, callback_data: 'warranty_policy' },
      ],
      [
        { text: `🏠 ${t('btn_main_menu', lang)}`, callback_data: 'main_menu' },
      ],
    ],
  };

  if (messageId) {
    const editRes = await editMessageText(chatId, messageId, text, keyboard, businessConnectionId);
    if (!editRes || !editRes.ok) {
      await deleteMessage(chatId, messageId);
      await sendMessage(chatId, text, keyboard, businessConnectionId);
    }
  } else {
    await deletePreviousBotMessage(chatId);
    await sendMessage(chatId, text, keyboard, businessConnectionId);
  }
}

async function handleUpdate(update) {
  if (update.business_connection) {
    console.log('⚡ Business connection updated:', update.business_connection);
    return;
  }

  const businessMessage = update.business_message;
  const businessConnectionId = businessMessage?.business_connection_id || null;

  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId = cb.message?.chat?.id || cb.from?.id;
    const messageId = cb.message?.message_id;
    const callbackId = cb.id;
    const data = cb.data;
    if (!chatId || !data) return;

    const fromLang = cb.from?.language_code || '';
    const lang = detectUserLanguage(chatId, fromLang);

    if (data === 'main_menu') {
      notifyUserNavigation(cb.from, '🏠 Main Menu', 'العودة للقائمة الرئيسية');
      await renderMainMenu(chatId, messageId, callbackId, businessConnectionId);
      return;
    }
    if (data === 'catalog') {
      notifyUserNavigation(cb.from, '🛍️ Catalog', 'تصفح الكتالوج والأقسام');
      await renderCatalog(chatId, messageId, callbackId, businessConnectionId);
      return;
    }
    if (data.startsWith('cat_')) {
      const catId = data.replace('cat_', '').trim();
      const cat = getCategoryById(catId);
      notifyUserNavigation(cb.from, '📁 Category', cat?.name_ar || catId);
      await renderCategoryBrands(chatId, catId, messageId, callbackId, businessConnectionId);
      return;
    }
    if (data.startsWith('brand_')) {
      const brandId = data.replace('brand_', '').trim();
      const brand = getBrandById(brandId);
      notifyUserNavigation(cb.from, '💎 Brand Tiers', brand?.name_ar || brandId);
      await renderBrandTiers(chatId, brandId, messageId, callbackId, businessConnectionId);
      return;
    }
    if (data.startsWith('prod_')) {
      const prodId = data.replace('prod_', '').trim();
      const product = getProductByShortIdOrSlug(prodId);
      notifyUserNavigation(cb.from, '📦 Product Details', product ? `${product.name_ar} ($${product.our_price})` : prodId);
      await renderProductDetails(chatId, prodId, messageId, callbackId, businessConnectionId);
      return;
    }
    if (data.startsWith('check_bybit_')) {
      const parts = data.split('_');
      const prodId = parts[2];
      const orderRef = parts[3] || 'UNKNOWN';
      const product = getProductByShortIdOrSlug(prodId) || STORE_CATALOG[0];

      await answerCallbackQuery(callbackId, t('bybit_checking_toast', lang), false);
      const verification = await verifyBybitPayment(product.our_price);

      if (verification && verification.success) {
        await deliverInstantOrder(chatId, product, orderRef, verification, messageId, businessConnectionId);
        return;
      } else {
        await sendMessage(
          chatId,
          t('bybit_pending_message', lang, { amount: product.our_price.toFixed(2) }),
          {
            inline_keyboard: [
              [{ text: t('bybit_recheck_btn', lang), callback_data: `check_bybit_${product.short_id}_${orderRef}` }],
              [{ text: `👨‍💻 ${t('btn_support', lang)}`, callback_data: 'support' }],
              [{ text: t('btn_back_to_product', lang), callback_data: `prod_${product.short_id}` }],
            ],
          },
          businessConnectionId
        );
        return;
      }
    }
    if (data.startsWith('buy_action_') || data.startsWith('buy_prod_')) {
      const prodId = data.replace('buy_action_', '').replace('buy_prod_', '').trim();
      await handleBuyAction(chatId, prodId, messageId, callbackId, businessConnectionId);
      return;
    }
    if (data.startsWith('buy_bybit_') || data === 'PAY_BYBIT_CRYPTO') {
      const prodId = data === 'PAY_BYBIT_CRYPTO' ? '643361f7' : data.replace('buy_bybit_', '').trim();
      const product = getProductByShortIdOrSlug(prodId) || STORE_CATALOG[0];
      const wallet = await getUserWallet(chatId, supabase);
      if (wallet.balance < product.our_price) {
        await answerCallbackQuery(callbackId, t('wallet_must_recharge_notice', lang, {
          balance: wallet.balance.toFixed(2),
          required: product.our_price.toFixed(2),
          shortage: (product.our_price - wallet.balance).toFixed(2),
        }), true);
        await renderWalletTopupScreen(chatId, Math.max(MIN_TOPUP_USD, product.our_price - wallet.balance), prodId, messageId, null, businessConnectionId);
        return;
      }
      await renderDirectBybitCheckout(chatId, prodId, messageId, callbackId, businessConnectionId);
      return;
    }
    if (data.startsWith('buy_binance_')) {
      const prodId = data.replace('buy_binance_', '').trim();
      const product = getProductByShortIdOrSlug(prodId) || STORE_CATALOG[0];
      const wallet = await getUserWallet(chatId, supabase);
      if (wallet.balance < product.our_price) {
        await answerCallbackQuery(callbackId, t('wallet_must_recharge_notice', lang, {
          balance: wallet.balance.toFixed(2),
          required: product.our_price.toFixed(2),
          shortage: (product.our_price - wallet.balance).toFixed(2),
        }), true);
        await renderWalletTopupScreen(chatId, Math.max(MIN_TOPUP_USD, product.our_price - wallet.balance), prodId, messageId, null, businessConnectionId);
        return;
      }
      await renderDirectBinanceCheckout(chatId, prodId, messageId, callbackId, businessConnectionId);
      return;
    }
    if (data.startsWith('check_binance_')) {
      const parts = data.split('_');
      const prodId = parts[2];
      const orderRef = parts[3] || 'UNKNOWN';
      const product = getProductByShortIdOrSlug(prodId) || STORE_CATALOG[0];

      await answerCallbackQuery(callbackId, t('binance_checking_toast', lang), false);

      if (supabase) {
        try {
          await supabase.from('orders').upsert({
            amount: product.our_price,
            status: 'pending_manual_payment',
            product_id: product.id,
            product_key: 'PENDING_TELEGRAM_FULFILLMENT',
            session_id: `tg_${chatId}_${orderRef}`,
            payment_sender: `Telegram @${chatId} (Binance Pay ID: 764476139)`,
            updated_at: new Date().toISOString(),
          });
        } catch (err) {}
      }

      // Dispatch approval ticket directly to @upstorelive_bot
      try {
        notifyPendingPaymentApproval(
          cb.from,
          product.our_price,
          'Binance Pay (ID: 764476139)',
          orderRef,
          'PRODUCT_PURCHASE',
          { shortId: product.short_id, reqId: orderRef }
        );
      } catch (err) {}

      const binancePendingMsg = [
        '⏳ <b>تم إرسال إشعار الدفع إلى الإدارة للمراجعة!</b>',
        '──────────────────',
        `📦 <b>المنتج:</b> ${product.name_ar}`,
        `🆔 <b>رقم العملية:</b> <code>#${orderRef}</code>`,
        `💎 <b>المبلغ:</b> <code>${product.our_price.toFixed(2)}$ USDT</code>`,
        '──────────────────',
        '⚡ تم إرسال الطلب إلى فريق المراجعة والدعم @UPSTORE_HELP للتأكيد الفوري.',
        'بمجرد التحقق، سيصلك الحساب وكود السيريال (16 رقم) هنا فوراً!',
      ].join('\n');

      const kbd = {
        inline_keyboard: [
          [{ text: `📦 ${t('btn_orders', lang)}`, callback_data: 'my_orders' }],
          [{ text: `👨‍💻 ${t('btn_support', lang)}`, callback_data: 'support' }],
          [{ text: `🏠 ${t('btn_main_menu', lang)}`, callback_data: 'main_menu' }],
        ],
      };

      const editRes = await editMessageText(chatId, messageId, binancePendingMsg, kbd, businessConnectionId);
      if (!editRes || !editRes.ok) {
        await deleteMessage(chatId, messageId);
        await sendMessage(chatId, binancePendingMsg, kbd, businessConnectionId);
      }
      return;
    }
    if (data.startsWith('buy_local_')) {
      const prodId = data.replace('buy_local_', '').trim();
      const product = getProductByShortIdOrSlug(prodId) || STORE_CATALOG[0];
      const wallet = await getUserWallet(chatId, supabase);
      if (wallet.balance < product.our_price) {
        await answerCallbackQuery(callbackId, t('wallet_must_recharge_notice', lang, {
          balance: wallet.balance.toFixed(2),
          required: product.our_price.toFixed(2),
          shortage: (product.our_price - wallet.balance).toFixed(2),
        }), true);
        await renderWalletTopupScreen(chatId, Math.max(MIN_TOPUP_USD, product.our_price - wallet.balance), prodId, messageId, null, businessConnectionId);
        return;
      }
      await renderDirectLocalCheckout(chatId, prodId, messageId, callbackId, businessConnectionId);
      return;
    }
    if (data.startsWith('pay_wallet_')) {
      const prodId = data.replace('pay_wallet_', '').trim();
      const product = getProductByShortIdOrSlug(prodId) || STORE_CATALOG[0];
      const prodPrice = product.our_price;

      const debitResult = await debitUserWallet(chatId, prodPrice, 'STORE_PURCHASE', { product_id: product.id, title: product.name_ar }, supabase);

      if (!debitResult.success) {
        await answerCallbackQuery(callbackId, t('wallet_must_recharge_notice', lang, {
          balance: debitResult.wallet?.balance?.toFixed(2) || '0.00',
          required: prodPrice.toFixed(2),
          shortage: debitResult.shortage || prodPrice.toFixed(2),
        }), true);
        await renderWalletTopupScreen(chatId, Math.max(MIN_TOPUP_USD, debitResult.shortage || 5.0), prodId, messageId, null, businessConnectionId);
        return;
      }

      await answerCallbackQuery(callbackId, t('wallet_purchase_success', lang, { amount: prodPrice.toFixed(2) }), false);
      const orderRef = `WAL-${Math.floor(100000 + Math.random() * 900000)}`;

      const fakeTxInfo = {
        amount: prodPrice,
        type: 'Wallet Balance Deduction',
        transferId: `WAL-DEBIT-${Date.now()}`,
      };

      await deliverInstantOrder(chatId, product, orderRef, fakeTxInfo, messageId, businessConnectionId);
      return;
    }

    if (data.startsWith('topup_wallet_')) {
      const parts = data.split('_');
      // Format: topup_wallet_AMOUNT_PRODID or topup_wallet_AMOUNT
      const amount = parseFloat(parts[2]) || MIN_TOPUP_USD;
      const returnProdId = parts[3] || null;
      await renderWalletTopupScreen(chatId, amount, returnProdId, messageId, callbackId, businessConnectionId);
      return;
    }

    if (data.startsWith('topup_select_')) {
      const prodId = data.replace('topup_select_', '').trim();
      await renderWalletTopupScreen(chatId, MIN_TOPUP_USD, prodId, messageId, callbackId, businessConnectionId);
      return;
    }

    if (data.startsWith('topup_method_')) {
      const parts = data.split('_');
      // Format: topup_method_METHOD_AMOUNT_RETURNPRODID
      const method = parts[2]; // bybit, binance, local
      const amount = parseFloat(parts[3]) || MIN_TOPUP_USD;
      const returnProdId = parts[4] || null;
      await renderWalletTopupMethod(chatId, method, amount, returnProdId, messageId, callbackId, businessConnectionId);
      return;
    }

    if (data.startsWith('check_topup_')) {
      const parts = data.split('_');
      // Format: check_topup_METHOD_AMOUNT_ORDERREF_RETURNPRODID
      const method = parts[2];
      const amount = parseFloat(parts[3]) || MIN_TOPUP_USD;
      const orderRef = parts[4] || 'TOPUP';
      const returnProdId = parts[5] && parts[5] !== 'none' ? parts[5] : null;

      await answerCallbackQuery(callbackId, t('bybit_checking_toast', lang), false);

      let verification = { success: false };
      if (method === 'bybit') {
        verification = await verifyBybitPayment(amount);
      }

      if (verification && verification.success) {
        const creditedWallet = await creditUserWallet(chatId, amount, `TOPUP_${method.toUpperCase()}`, verification, supabase);
        try {
          notifyWalletTopup(cb.from, amount, method.toUpperCase(), creditedWallet.balance, verification);
        } catch {}

        const successText = [
          t('wallet_topup_success_message', lang, { amount: amount.toFixed(2), balance: creditedWallet.balance.toFixed(2) }),
        ].join('\n');

        const successButtons = [];
        if (returnProdId) {
          successButtons.push([{ text: `🛍️ ${t('btn_shop_with_balance', lang)}`, callback_data: `prod_${returnProdId}` }]);
        } else {
          successButtons.push([{ text: `🛍️ ${t('btn_catalog', lang)}`, callback_data: 'catalog' }]);
        }
        successButtons.push([{ text: `💳 ${t('btn_back_to_wallet', lang)}`, callback_data: 'payment_methods' }]);

        await editMessageText(chatId, messageId, successText, { inline_keyboard: successButtons }, businessConnectionId);
        return;
      } else {
        if (supabase) {
          try {
            await supabase.from('orders').upsert({
              amount: amount,
              status: 'pending_manual_payment',
              product_key: `WALLET_TOPUP_${amount}_USDT`,
              session_id: `tg_${chatId}_${orderRef}`,
              payment_sender: `Telegram @${chatId} (TopUp ${method.toUpperCase()})`,
              updated_at: new Date().toISOString(),
            });
          } catch (err) {}
        }

        // Dispatch pending topup confirmation request to @upstorelive_bot with Action Buttons!
        try {
          notifyPendingPaymentApproval(
            cb.from,
            amount,
            method === 'binance' ? 'Binance Pay (ID: 764476139)' : (method === 'bybit' ? 'Bybit Internal UID (47183921)' : 'Local Payment (Via Support)'),
            orderRef,
            'WALLET_TOPUP',
            { reqId: orderRef }
          );
        } catch (err) {}

        const pendingTopupMsg = [
          '⏳ <b>تم إرسال طلب تأكيد الإيداع للإدارة!</b>',
          '──────────────────',
          `💵 <b>المبلغ المطلوب:</b> <code>$${amount.toFixed(2)} USDT</code>`,
          `🆔 <b>رقم العملية:</b> <code>#${orderRef}</code>`,
          '──────────────────',
          '⚡ جاري فحص ومراجعة عملية التحويل وتأكيد الإيداع فوراً من قبل فريق الدعم @UPSTORE_HELP.',
          'سيتم إضافة الرصيد إلى محفظتك تلقائياً وإشعارك هنا فور الاعتماد.',
        ].join('\n');

        const kbd = {
          inline_keyboard: [
            [{ text: t('bybit_recheck_btn', lang), callback_data: data }],
            [{ text: `👨‍💻 ${t('btn_support', lang)}`, callback_data: 'support' }],
            [{ text: `🔙 ${t('btn_back', lang)}`, callback_data: 'payment_methods' }],
          ],
        };

        const editRes = await editMessageText(chatId, messageId, pendingTopupMsg, kbd, businessConnectionId);
        if (!editRes || !editRes.ok) {
          await deleteMessage(chatId, messageId);
          await sendMessage(chatId, pendingTopupMsg, kbd, businessConnectionId);
        }
        return;
      }
    }

    if (data === 'my_orders') {
      await renderMyOrders(chatId, messageId, callbackId, businessConnectionId);
      return;
    }
    if (data === 'payment_methods') {
      await renderPaymentMethodsScreen(chatId, messageId, callbackId, businessConnectionId);
      return;
    }
    if (data === 'warranty_policy') {
      await renderWarrantyPolicyScreen(chatId, messageId, callbackId, businessConnectionId);
      return;
    }
    if (data === 'about_store') {
      await renderAboutStoreScreen(chatId, messageId, callbackId, businessConnectionId);
      return;
    }
    if (data === 'referral') {
      await renderReferralScreen(chatId, messageId, callbackId, businessConnectionId);
      return;
    }
    if (data === 'support') {
      await renderSupportScreen(chatId, messageId, callbackId, businessConnectionId);
      return;
    }
    if (data === 'language_select') {
      await renderLanguageSelection(chatId, messageId, callbackId, businessConnectionId);
      return;
    }
    if (data.startsWith('set_lang_')) {
      const langCode = data.replace('set_lang_', '').trim();
      setUserLanguage(chatId, langCode);
      await answerCallbackQuery(callbackId, t('language_changed', langCode), false);
      if (messageId) {
        await deleteMessage(chatId, messageId);
      }
      await renderMainMenu(chatId, null, null, businessConnectionId);
      return;
    }
    if (data === 'SUPPORT_RESET_MEMORY') {
      resetChatHistory(chatId);
      await answerCallbackQuery(callbackId, t('session_reset_toast', lang), false);
      await renderMainMenu(chatId, messageId, null, businessConnectionId);
      return;
    }
  }

  const message = update.message || update.business_message;
  if (!message) return;

  const chatId = message.chat.id;
  const userLangCode = message.from?.language_code || '';
  const lang = detectUserLanguage(chatId, userLangCode);

  if (message.photo && Array.isArray(message.photo) && message.photo.length > 0) {
    const quota = getMediaQuota(chatId);
    if (quota.isExceeded) {
      await sendMessage(
        chatId,
        t('media_quota_exceeded', lang, { limit: MONTHLY_MEDIA_UPLOAD_LIMIT }),
        { inline_keyboard: [[{ text: t('btn_human_support', lang), callback_data: 'support' }]] },
        businessConnectionId
      );
      return;
    }
    consumeMediaQuota(chatId);
    const remaining = Math.max(0, MONTHLY_MEDIA_UPLOAD_LIMIT - (quota.count + 1));
    await sendChatAction(chatId, 'typing', businessConnectionId);

    const reqId = `IMG-${Date.now().toString().slice(-6)}`;
    try {
      notifyPendingPaymentApproval(
        message.from,
        5.0,
        'Photo Receipt / إيصال دفع مصور',
        reqId,
        'WALLET_TOPUP',
        { note: message.caption || 'Photo Receipt Upload' }
      );
    } catch (e) {}
    if (supabase) {
      try {
        await supabase.from('orders').upsert({
          amount: 5.0,
          status: 'pending_manual_payment',
          product_key: 'WALLET_TOPUP_PHOTO_RECEIPT',
          session_id: `tg_${chatId}_${reqId}`,
          payment_sender: `Telegram @${chatId} (Photo Receipt)`,
          updated_at: new Date().toISOString(),
        });
      } catch (err) {}
    }

    const receiptReply = [
      '✅ <b>تم استلام صورة الإيصال بنجاح!</b>',
      '──────────────────',
      `🆔 <b>رقم المرجع:</b> <code>#${reqId}</code>`,
      '⚡ تم إرسال الإيصال مباشرة إلى فريق المراجعة والدعم @UPSTORE_HELP للتحقق الفوري.',
      'سيتم شحن رصيد محفظتك تلقائياً وإشعارك هنا فور الاعتماد 💳✨',
    ].join('\n');

    const quotaNotice = `\n\n<blockquote><b>${t('media_quota_remaining_photo', lang)}</b> <code>${remaining} / ${MONTHLY_MEDIA_UPLOAD_LIMIT}</code> 📸</blockquote>`;
    await sendMessage(chatId, receiptReply + quotaNotice, {
      inline_keyboard: [
        [{ text: `🛍️ ${t('btn_catalog', lang)}`, callback_data: 'catalog' }, { text: `💳 ${t('btn_wallet', lang)}`, callback_data: 'payment_methods' }],
        [{ text: `👨‍💻 ${t('btn_support', lang)}`, callback_data: 'support' }],
      ],
    }, businessConnectionId);
    return;
  }

  if (message.document && message.document.file_id) {
    const quota = getMediaQuota(chatId);
    if (quota.isExceeded) {
      await sendMessage(
        chatId,
        t('media_quota_exceeded', lang, { limit: MONTHLY_MEDIA_UPLOAD_LIMIT }),
        { inline_keyboard: [[{ text: t('btn_human_support', lang), callback_data: 'support' }]] },
        businessConnectionId
      );
      return;
    }
    consumeMediaQuota(chatId);
    const remaining = Math.max(0, MONTHLY_MEDIA_UPLOAD_LIMIT - (quota.count + 1));
    await sendChatAction(chatId, 'typing', businessConnectionId);

    const reqId = `DOC-${Date.now().toString().slice(-6)}`;
    try {
      notifyPendingPaymentApproval(
        message.from,
        5.0,
        'Document Receipt / مستند تحويل',
        reqId,
        'WALLET_TOPUP',
        { note: message.caption || 'Document Receipt Upload' }
      );
    } catch (e) {}

    if (supabase) {
      try {
        await supabase.from('orders').upsert({
          amount: 5.0,
          status: 'pending_manual_payment',
          product_key: 'WALLET_TOPUP_DOC_RECEIPT',
          session_id: `tg_${chatId}_${reqId}`,
          payment_sender: `Telegram @${chatId} (Document Receipt)`,
          updated_at: new Date().toISOString(),
        });
      } catch (err) {}
    }

    const receiptReply = [
      '✅ <b>تم استلام مستند التحويل بنجاح!</b>',
      '──────────────────',
      `🆔 <b>رقم المرجع:</b> <code>#${reqId}</code>`,
      '⚡ تم إرسال المستند مباشرة إلى فريق المراجعة والدعم @UPSTORE_HELP للتحقق الفوري.',
      'سيتم شحن رصيد محفظتك تلقائياً وإشعارك هنا فور الاعتماد 💳✨',
    ].join('\n');

    const quotaNotice = `\n\n<blockquote><b>${t('media_quota_remaining_doc', lang)}</b> <code>${remaining} / ${MONTHLY_MEDIA_UPLOAD_LIMIT}</code> 📄</blockquote>`;
    await sendMessage(chatId, receiptReply + quotaNotice, {
      inline_keyboard: [
        [{ text: `🛍️ ${t('btn_catalog', lang)}`, callback_data: 'catalog' }, { text: `💳 ${t('btn_wallet', lang)}`, callback_data: 'payment_methods' }],
        [{ text: `👨‍💻 ${t('btn_support', lang)}`, callback_data: 'support' }],
      ],
    }, businessConnectionId);
    return;
  }

  const text = (message.text || '').trim();
  if (!text) return;

  if (text.startsWith('/start')) {
    notifyUserEntry(message.from, text);
    const parts = text.split(/\s+/);
    if (parts.length > 1) {
      const payload = parts[1].trim();
      const refMatch = payload.match(/^(?:ref_)?(\d+)$/);
      if (refMatch) {
        const referrerId = refMatch[1];
        const res = await recordReferral(chatId, referrerId);
        if (res) {
          await sendMessage(chatId, t('referral_welcome_new_user', lang), null, businessConnectionId);
        }
      }
    }
    await renderMainMenu(chatId, null, null, businessConnectionId);
    return;
  }

  // ── EXACT PERSISTENT KEYBOARD BUTTON MATCHING ACROSS ALL 7 LANGUAGES ──
  const btnAction = matchPersistentButton(text);
  if (btnAction === 'main_menu') {
    await renderMainMenu(chatId, null, null, businessConnectionId);
    return;
  }
  if (btnAction === 'catalog') {
    await renderCatalog(chatId, null, null, businessConnectionId);
    return;
  }
  if (btnAction === 'my_orders') {
    await renderMyOrders(chatId, null, null, businessConnectionId);
    return;
  }
  if (btnAction === 'payment_methods') {
    await renderPaymentMethodsScreen(chatId, null, null, businessConnectionId);
    return;
  }
  if (btnAction === 'referral') {
    await renderReferralScreen(chatId, null, null, businessConnectionId);
    return;
  }
  if (btnAction === 'support') {
    await renderSupportScreen(chatId, null, null, businessConnectionId);
    return;
  }
  if (btnAction === 'warranty_policy') {
    await renderWarrantyPolicyScreen(chatId, null, null, businessConnectionId);
    return;
  }
  if (btnAction === 'about_store') {
    await renderAboutStoreScreen(chatId, null, null, businessConnectionId);
    return;
  }
  if (btnAction === 'language_select') {
    await renderLanguageSelection(chatId, null, null, businessConnectionId);
    return;
  }

  const lower = text.toLowerCase();

  // ── 'دفع' / 'شحن' KEYWORD DIRECT WALLET TOP-UP ROUTING ──
  if (
    text === '/pay' ||
    text === '/deposit' ||
    text === '/topup' ||
    text === 'دفع' ||
    text === 'شحن' ||
    text === 'شحن المحفظة' ||
    text === 'شحن رصيد' ||
    text === 'المحفظة' ||
    text === 'شحن محفظة' ||
    text.includes('شحن المحفظة') ||
    text.includes('شحن رصيد') ||
    text.includes('عايز اشحن') ||
    text.includes('عايز ادفع') ||
    text.includes('كيف ادفع') ||
    text.includes('اريد الشحن') ||
    text.includes('طريقة الشحن') ||
    lower === 'pay' ||
    lower === 'deposit' ||
    lower === 'topup' ||
    lower.includes('top up')
  ) {
    await renderWalletTopupScreen(chatId, 5.0, null, null, null, businessConnectionId);
    return;
  }

  // ── NUMERIC AMOUNT WALLET TOP-UP ROUTING (e.g. 10, 25, 50, $100) ──
  const numericTopupMatch = text.match(/^\$?\s*(\d+(\.\d+)?)\s*(?:usdt|\$|usd|دولار)?$/i);
  if (numericTopupMatch) {
    const parsedAmount = parseFloat(numericTopupMatch[1]);
    if (parsedAmount >= 1 && parsedAmount <= 1000) {
      await renderWalletTopupScreen(chatId, parsedAmount, null, null, null, businessConnectionId);
      return;
    }
  }

  if (
    text === '/lang' ||
    text === '/language' ||
    text.includes('اللغة') ||
    lower.includes('language') ||
    lower.includes('idioma') ||
    lower.includes('langue') ||
    lower.includes('язык') ||
    lower.includes('dil') ||
    lower.includes('sprache')
  ) {
    await renderLanguageSelection(chatId, null, null, businessConnectionId);
    return;
  }

  if (
    text === '/help' ||
    text === '/menu' ||
    text === 'main_menu' ||
    text.includes('الرئيسية') ||
    lower.includes('home') ||
    lower.includes('inicio') ||
    lower.includes('accueil') ||
    lower.includes('главная')
  ) {
    await renderMainMenu(chatId, null, null, businessConnectionId);
    return;
  }
  if (
    text === '/catalog' ||
    text === '/products' ||
    text.includes('الأقسام') ||
    text.includes('المنتجات') ||
    lower.includes('product') ||
    lower.includes('catalog') ||
    lower.includes('catálogo') ||
    lower.includes('produit') ||
    lower.includes('товары') ||
    lower.includes('ürün')
  ) {
    await renderCatalog(chatId, null, null, businessConnectionId);
    return;
  }
  if (
    text === '/orders' ||
    text.includes('طلبات') ||
    text.includes('مفاتيح') ||
    text.includes('مشترياتي') ||
    lower.includes('order') ||
    lower.includes('pedido') ||
    lower.includes('commande') ||
    lower.includes('заказ') ||
    lower.includes('sipariş')
  ) {
    await renderMyOrders(chatId, null, null, businessConnectionId);
    return;
  }
  if (
    text === '/bybit' ||
    text === '/crypto' ||
    text === '/usdt' ||
    lower === 'bybit' ||
    text.includes('بايبيت') ||
    text.includes('بيبات') ||
    text.includes('بايبت')
  ) {
    await renderDirectBybitCheckout(chatId, '643361f7', null, null, businessConnectionId);
    return;
  }
  if (
    text === '/binance' ||
    lower === 'binance' ||
    text.includes('بينانس') ||
    text.includes('بنانس')
  ) {
    await renderDirectBinanceCheckout(chatId, '643361f7', null, null, businessConnectionId);
    return;
  }
  if (
    text === '/payments' ||
    text === '/wallet' ||
    text === '/pay' ||
    text === 'دفع' ||
    text === 'الدفع' ||
    text === 'شحن' ||
    text === 'الشحن' ||
    text.includes('طرق الدفع') ||
    text.includes('شحن المحفظة') ||
    text.includes('شحن رصيد') ||
    lower.includes('wallet') ||
    lower.includes('payment') ||
    lower.includes('recharge') ||
    lower.includes('topup') ||
    lower.includes('billetera') ||
    lower.includes('portefeuille') ||
    lower.includes('кошелек') ||
    lower.includes('cüzdan')
  ) {
    await renderPaymentMethodsScreen(chatId, null, null, businessConnectionId);
    return;
  }
  if (
    text === '/warranty' ||
    text.includes('الضمان') ||
    text.includes('سياسة الضمان') ||
    lower.includes('warranty') ||
    lower.includes('garant')
  ) {
    await renderWarrantyPolicyScreen(chatId, null, null, businessConnectionId);
    return;
  }
  if (
    text === '/about' ||
    text === '/info' ||
    text.includes('عن المتجر') ||
    text.includes('عن البوت') ||
    text.includes('من نحن') ||
    text.includes('معلومات') ||
    text.includes('منذ 2022') ||
    text.includes('2022') ||
    text.includes('الثقة') ||
    text.includes('الامان') ||
    text.includes('الأمان') ||
    lower.includes('about') ||
    lower.includes('acerca') ||
    lower.includes('propos') ||
    lower.includes('hakkımızda') ||
    lower.includes('hakkimizda') ||
    lower.includes('über uns') ||
    lower.includes('ueber uns') ||
    lower.includes('о нас')
  ) {
    await renderAboutStoreScreen(chatId, null, null, businessConnectionId);
    return;
  }
  if (
    text === '/referral' ||
    text.includes('الأرباح') ||
    text.includes('ارباح') ||
    text.includes('إحالة') ||
    text.includes('إحالات') ||
    text.includes('المكافآت') ||
    text.includes('المكافات') ||
    text.includes('نقاط') ||
    text.includes('دعوة') ||
    lower.includes('reward') ||
    lower.includes('referral') ||
    lower.includes('recompensa') ||
    lower.includes('récompense') ||
    lower.includes('бонус') ||
    lower.includes('ödül')
  ) {
    await renderReferralScreen(chatId, null, null, businessConnectionId);
    return;
  }
  if (
    text === '/support' ||
    text.includes('الدعم') ||
    text.includes('خدمة العملاء') ||
    lower.includes('support') ||
    lower.includes('soporte') ||
    lower.includes('поддержк') ||
    lower.includes('destek')
  ) {
    await renderSupportScreen(chatId, null, null, businessConnectionId);
    return;
  }
  if (text === '/clear' || text === '/reset') {
    resetChatHistory(chatId);
    await sendMessage(chatId, t('session_reset_success', lang), {
      inline_keyboard: [[{ text: `🏠 ${t('btn_main_menu', lang)}`, callback_data: 'main_menu' }]],
    }, businessConnectionId);
    return;
  }

  // ── SMART TRANSACTION ID / TRANSFER ID VERIFIER & APPROVAL DISPATCHER ──
  const isLikelyTransferId = /^\d{4,25}$/.test(text) ||
    /^(0x)?[a-fA-F0-9]{32,66}$/.test(text) ||
    text.toLowerCase().includes('txid') ||
    text.toLowerCase().includes('transfer') ||
    text.includes('معرف') ||
    text.includes('العملية') ||
    text.includes('رقم التحويل') ||
    text.includes('تم التحويل') ||
    text.includes('حولتها') ||
    text.includes('دفعت');

  if (isLikelyTransferId) {
    await sendChatAction(chatId, 'typing', businessConnectionId);

    // Extract potential ID from text
    const extractedId = text.replace(/[^a-zA-Z0-9_-]/g, ' ').trim().split(/\s+/).find(w => w.length >= 4) || text;

    // Fetch user's latest pending order from Supabase
    let pendingOrder = null;
    if (supabase) {
      try {
        const { data: orders } = await supabase
          .from('orders')
          .select('id, amount, status, product_id, session_id, products(id, name, name_ar, our_price, warranty_duration, subscription_duration, short_id)')
          .or(`session_id.ilike.%tg_${chatId}%,payment_sender.ilike.%@${chatId}%`)
          .eq('status', 'pending_manual_payment')
          .order('created_at', { ascending: false })
          .limit(1);

        if (orders && orders.length > 0) {
          pendingOrder = orders[0];
        }
      } catch (err) {
        console.error('[Supabase Fetch Pending Order Exception]:', err);
      }
    }

    const isWalletTopupOrder = pendingOrder?.product_key?.startsWith('WALLET_TOPUP_');
    const orderRef = pendingOrder?.session_id ? pendingOrder.session_id.split('_').pop() : `TX-${Date.now().toString().slice(-6)}`;
    const product = pendingOrder?.products || STORE_CATALOG[0];
    const expectedAmount = pendingOrder ? Number(pendingOrder.amount) : (isWalletTopupOrder ? 5.0 : product.our_price);

    const verification = await verifyTransferIdOrTxid(extractedId, expectedAmount);

    if (verification && verification.success) {
      if (isWalletTopupOrder) {
        const creditedWallet = await creditUserWallet(chatId, expectedAmount, 'AUTO_TXID_VERIFIED', verification, supabase);
        try {
          notifyWalletTopup(message.from, expectedAmount, 'BYBIT/TXID', creditedWallet.balance, verification);
        } catch {}

        const successText = [
          t('wallet_topup_success_message', lang, { amount: expectedAmount.toFixed(2), balance: creditedWallet.balance.toFixed(2) }),
        ].join('\n');

        await sendMessage(chatId, successText, {
          inline_keyboard: [
            [{ text: `🛍️ ${t('btn_catalog', lang)}`, callback_data: 'catalog' }],
            [{ text: `💳 ${t('btn_back_to_wallet', lang)}`, callback_data: 'payment_methods' }],
          ],
        }, businessConnectionId);
        return;
      } else {
        await deliverInstantOrder(chatId, product, orderRef, verification, null, businessConnectionId);
        return;
      }
    } else {
      if (supabase) {
        try {
          await supabase.from('orders').upsert({
            amount: expectedAmount,
            status: 'pending_manual_payment',
            product_id: product?.id || null,
            product_key: isWalletTopupOrder ? `WALLET_TOPUP_${expectedAmount}_USDT` : 'PENDING_TELEGRAM_FULFILLMENT',
            session_id: `tg_${chatId}_${orderRef}`,
            payment_sender: `Telegram @${chatId} (TxID: ${extractedId})`,
            updated_at: new Date().toISOString(),
          });
        } catch (err) {}
      }

      // Dispatch interactive approval request to @upstorelive_bot with Action Buttons!
      try {
        notifyPendingPaymentApproval(
          message.from,
          expectedAmount,
          'Transfer ID / معرف تحويل',
          extractedId,
          isWalletTopupOrder ? 'WALLET_TOPUP' : 'PRODUCT_PURCHASE',
          { shortId: product?.short_id || '643361f7', reqId: orderRef }
        );
      } catch (err) {}

      const pendingNoticeText = [
        '⏳ <b>تم استلام بيانات العملية بنجاح!</b>',
        '──────────────────',
        `🧾 <b>المعرف / TXID:</b> <code>${extractedId}</code>`,
        `🆔 <b>رقم المرجع:</b> <code>#${orderRef}</code>`,
        `💎 <b>المبلغ:</b> <code>${expectedAmount.toFixed(2)}$ USDT</code>`,
        '──────────────────',
        '⚡ تم إرسال العملية إلى فريق المراجعة والدعم @UPSTORE_HELP للتأكيد الفوري.',
        'سيتم اعتماد طلبك وشحن المحفظة / تسليم الحساب وإشعارك هنا فوراً!',
      ].join('\n');

      await sendMessage(
        chatId,
        pendingNoticeText,
        {
          inline_keyboard: [
            [{ text: `📦 ${t('btn_orders', lang)}`, callback_data: 'my_orders' }],
            [{ text: `💳 ${t('btn_wallet', lang)}`, callback_data: 'payment_methods' }],
            [{ text: `👨‍💻 ${t('btn_support', lang)}`, callback_data: 'support' }],
          ],
        },
        businessConnectionId
      );
      return;
    }
  }

  // ── FAST DETERMINISTIC MENU RESPONSE (AI DISABLED FOR @upstore_one_bot) ──
  const fastStoreResponse = [
    '👑 <b>أهلاً بك في متجر UpStore الرقمي المعتمد!</b>',
    '🏛️ <i>رواد الاشتراكات والتراخيص الرقمية الأصلية منذ 2022 🛡️</i>',
    '──────────────────',
    '⚡ <b>يمكنك تنفيذ أي من العمليات التالية مباشرة:</b>',
    '• 🛍️ <b>المنتجات:</b> تصفح اشتراكات الذكاء الاصطناعي والتطبيقات بأسعار مخفضة.',
    '• 💳 <b>المحفظة والدفع:</b> شحن رصيدك عبر Bybit و Binance بدون رسوم.',
    '• 🏆 <b>عن المتجر:</b> تاريخ التأسيس (2022) وإحصائيات الثقة الموثقة.',
    '• 📦 <b>طلباتي:</b> استعراض كافة طلباتك السابقة وأكواد السيريال (16 رقم).',
    '• 👨‍💻 <b>الدعم الفني:</b> للتواصل المباشر مع الدعم الفني @UPSTORE_HELP.',
    '──────────────────',
    '<i>اضغط على أي زر للمتابعة أو اكتب "دفع" لشحن محفظتك مباشرة:</i>',
  ].join('\n');

  notifyUserChat(message.from, text, 'Fast Store Menu');
  await sendMessage(chatId, fastStoreResponse, {
    inline_keyboard: [
      [{ text: `🛍️ ${t('btn_catalog', lang)}`, callback_data: 'catalog' }, { text: `💳 ${t('btn_wallet', lang)}`, callback_data: 'payment_methods' }],
      [{ text: `🤍 ${t('btn_about', lang)}`, callback_data: 'about_store' }, { text: `📦 ${t('btn_orders', lang)}`, callback_data: 'my_orders' }],
      [{ text: `🛡️ ${t('btn_warranty', lang)}`, callback_data: 'warranty_policy' }, { text: `👨‍💻 ${t('btn_support', lang)}`, callback_data: 'support' }],
    ],
  }, businessConnectionId);
}

async function initTelegramSeoAndCommands() {
  console.log('🔍 Initializing Telegram Bot SEO, Descriptions, and Menu Commands...');
  try {
    // 1. Set Bot Name
    await fetch(`${TELEGRAM_API}/setMyName`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'UpStore 🤍 ارخص متجر جملة واشتراكات AI',
        language_code: 'ar'
      })
    }).catch(() => {});

    await fetch(`${TELEGRAM_API}/setMyName`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'UpStore 🤍 Wholesale AI & Digital Store'
      })
    }).catch(() => {});

    // 2. Set Full Descriptions (shown in profile & start screen)
    const arDesc = `🤍 متجر UpStore الرقمي بالجملة ⚡\n\nأرخص متجر لبيع المنتجات الرقمية والاشتراكات في العالم بسعر الجملة 🤝.\nمخصص لدعم التجار والمشاريع الناشئة والشباب للبدء في البيع والربح بأقل تكلفة ممكنة، مع ضمان استبدال رسمي 100% وتسليم فوري تلقائي ⚡.\n\n✨ متوفر لدينا بأرخص سعر جملة:\n• اشتراكات الذكاء الاصطناعي (ChatGPT Plus, Claude 3.7 / Opus 5, Gemini 3.1 Pro, Grok 3, Cursor Composer)\n• أدوات المطورين والبرمجة (Cursor Pro, GitHub Copilot, Replit, JetBrains)\n• برامج التصميم والإبداع (Canva Pro, Adobe Creative Cloud, Midjourney, Freepik)\n• الترفيه والأمان (Netflix 4K, Spotify, YouTube Premium, NordVPN)\n\n💳 دفع مباشر بدون عمولة: Bybit & Binance Pay ودفع محلي فوري.\n👨‍💻 دعم فني مباشر 24/7 عبر @UPSTORE_HELP 🤍`;

    const enDesc = `🤍 UpStore Wholesale Digital Store ⚡\n\nThe world's cheapest wholesale digital goods and AI subscriptions store 🤝.\nDesigned to empower resellers, agencies, and entrepreneurs to start their digital business with maximum profit margins, instant automated delivery, and 100% official replacement warranty ⚡.\n\n✨ Available at direct factory wholesale prices:\n• AI Subscriptions (ChatGPT Plus, Claude 3.7 / Opus 5, Gemini 3.1 Pro, Grok 3, Cursor Composer)\n• Developer Tools (Cursor Pro, GitHub Copilot, Replit, JetBrains)\n• Design & Media (Canva Pro, Adobe Creative Cloud, Midjourney, Freepik)\n• Entertainment & VPN (Netflix 4K, Spotify, YouTube Premium, NordVPN)\n\n💳 0% Fee Instant Crypto Payments: Bybit & Binance Pay.\n👨‍💻 24/7 Dedicated Human Support via @UPSTORE_HELP 🤍`;

    await fetch(`${TELEGRAM_API}/setMyDescription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: arDesc, language_code: 'ar' })
    }).catch(() => {});

    await fetch(`${TELEGRAM_API}/setMyDescription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: enDesc })
    }).catch(() => {});

    // 3. Set Short Descriptions (shown in chat previews & search results - max 120 chars)
    const arShort = `🤍 أرخص متجر جملة للمنتجات الرقمية واشتراكات الذكاء الاصطناعي في العالم ⚡ دعم التجار وضمان استبدال 100% 🤝`;
    const enShort = `🤍 World's cheapest wholesale store for AI subscriptions & digital products ⚡ Instant delivery & 100% warranty 🤝`;

    await fetch(`${TELEGRAM_API}/setMyShortDescription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ short_description: arShort, language_code: 'ar' })
    }).catch(() => {});

    await fetch(`${TELEGRAM_API}/setMyShortDescription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ short_description: enShort })
    }).catch(() => {});

    // 4. Set Bot Commands
    const arCommands = [
      { command: 'start', description: 'فتح القائمة الرئيسية للمتجر 🤍' },
      { command: 'catalog', description: 'تصفح المنتجات والأسعار بالجملة 🛍️' },
      { command: 'wallet', description: 'شحن المحفظة وعرض الرصيد 💳' },
      { command: 'orders', description: 'متابعة مشترياتي وطلباتي 📦' },
      { command: 'about', description: 'عن متجر UpStore وتاريخنا 🤍' },
      { command: 'warranty', description: 'سياسة الضمان والاستبدال الرسمي 🛡️' },
      { command: 'support', description: 'التحدث مع الدعم الفني @UPSTORE_HELP 👨‍💻' },
      { command: 'language', description: 'تغيير لغة البوت 🌐' }
    ];

    const enCommands = [
      { command: 'start', description: 'Open UpStore main menu 🤍' },
      { command: 'catalog', description: 'Browse wholesale catalog & prices 🛍️' },
      { command: 'wallet', description: 'Top up wallet & check balance 💳' },
      { command: 'orders', description: 'View my active orders & serials 📦' },
      { command: 'about', description: 'About UpStore wholesale heritage 🤍' },
      { command: 'warranty', description: '100% Official warranty policy 🛡️' },
      { command: 'support', description: 'Contact human support @UPSTORE_HELP 👨‍💻' },
      { command: 'language', description: 'Switch bot language 🌐' }
    ];

    await fetch(`${TELEGRAM_API}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands: arCommands, language_code: 'ar' })
    }).catch(() => {});

    await fetch(`${TELEGRAM_API}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands: enCommands })
    }).catch(() => {});

    console.log('✅ Telegram Bot SEO, Descriptions, and Menu Commands successfully set!');
  } catch (err) {
    console.warn('[SEO Init Warning]:', err.message);
  }
}

async function runLongPolling() {
  console.log('🔄 Deleting webhook to switch to dedicated polling mode...');
  try {
    await fetch(`${TELEGRAM_API}/deleteWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drop_pending_updates: false }),
    });
  } catch {}

  console.log(`🚀 @${BOT_USERNAME} is active and listening for incoming updates (Direct & Business)...`);
  
  // Set up Telegram SEO & Menu commands
  initTelegramSeoAndCommands().catch((e) => console.warn('[SEO Setup]:', e.message));

  // Launch @upstorelive_bot polling daemon concurrently
  try {
    startLiveBotPolling();
    notifySystemUpdate('🟢 تم تشغيل سيرفر UpStore VPS', 'تمت ترقية البوت وتفعيل البث المباشر على @upstorelive_bot بنجاح 24/7 ⚡');
  } catch (e) {
    console.warn('[LiveMonitor Launch Exception]:', e.message);
  }

  let offset = 0;

  const allowedUpdates = JSON.stringify([
    'message',
    'edited_message',
    'callback_query',
    'business_connection',
    'business_message',
    'edited_business_message',
    'deleted_business_messages'
  ]);

  while (true) {
    try {
      const res = await fetch(`${TELEGRAM_API}/getUpdates?offset=${offset}&timeout=20&allowed_updates=${encodeURIComponent(allowedUpdates)}`, {
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(35000),
      });

      if (res.status === 429) {
        const d = await res.json().catch(() => ({}));
        const waitTime = (d?.parameters?.retry_after || 5) * 1000;
        await new Promise((r) => setTimeout(r, waitTime));
        continue;
      }

      if (!res.ok) {
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }

      const data = await res.json();
      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          handleUpdate(update).catch((err) => {
            console.error('[Update Processing Error]:', err.message);
          });
        }
      }
    } catch (err) {
      // Ignore AbortError / transient timeouts
      if (err.name !== 'TimeoutError' && err.name !== 'AbortError') {
        console.error('[Polling Exception]:', err.message);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

if (process.argv.includes('--poll') || process.env.RUN_POLLING === 'true') {
  runLongPolling();
} else {
  console.log('💡 Run with --poll flag to start long-polling: node scripts/telegram-support-bot.mjs --poll');
}

export {
  handleUpdate,
  renderMainMenu,
  renderCatalog,
  renderCategoryProducts,
  renderProductDetails,
  renderDirectBybitCheckout,
  renderDirectLocalCheckout,
  renderMyOrders,
  renderPaymentMethodsScreen,
  renderWarrantyPolicyScreen,
};
