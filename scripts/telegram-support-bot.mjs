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
  t,
} from './storeI18n.mjs';

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

async function verifyTransferIdOrTxid(txidInput, expectedAmount = null) {
  try {
    const cleanTx = (txidInput || '').trim();
    if (!cleanTx || cleanTx.length < 3) return { success: false };

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
        return fallbackVerify;
      }
    }

    return { success: false };
  } catch (err) {
    console.error('[Verify Transfer ID Exception]:', err.message);
    return { success: false, error: err.message };
  }
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MONTHLY_MEDIA_UPLOAD_LIMIT = 3;

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
    return await res.json();
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
    return await res.json();
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

async function analyzeMediaWithGeminiVision(dataUrl, caption) {
  const systemPrompt = [
    `You are Chief Forensic Support Specialist at UpStore Telegram Store (@${BOT_USERNAME}).`,
    'Friendly, polite tone with helpful emojis. Formal 2-3 sentences max in Arabic.',
    'Official accounts: mo_matany (InstaPay) / 01041140422 (Vodafone Cash) / Bybit Pay Direct Links.',
  ].join('\n');

  const res = await fetch(OPENROUTER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-lite',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: [
          { type: 'text', text: caption || 'Verify receipt or error screenshot.' },
          { type: 'image_url', image_url: { url: dataUrl } }
        ] },
      ],
      temperature: 0.35,
      max_tokens: 350,
    }),
  });

  if (!res.ok) return 'تم استلام الملف بنجاح ✅. جارٍ المراجعة والتحقق من قبل فريق الدعم الفني عبر @UPSTORE_HELP 👨‍💻.';
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() || 'تم فحص المستند بنجاح ✅.';
}

async function deleteMessage(chatId, messageId) {
  if (!messageId) return;
  try {
    const payload = { chat_id: chatId, message_id: messageId };
    await fetch(`${TELEGRAM_API}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {}
}

function getKeyboardForQueryAndReply(userQuery, botReply) {
  const q = `${userQuery || ''} ${botReply || ''}`.toLowerCase();
  const buttons = [];

  if (/gemini|جيمناي|جيميني/.test(q)) {
    buttons.push([
      { text: '✦ Gemini 18m — $0.19 🔥', callback_data: 'prod_643361f7' },
      { text: '⚡ دفع Bybit فوري', callback_data: 'buy_bybit_643361f7' },
    ]);
  } else if (/netflix|نتفلكس/.test(q)) {
    buttons.push([
      { text: '🎬 Netflix 4K — $0.25 🔥', callback_data: 'prod_netflix_4k' },
      { text: '⚡ دفع Bybit فوري', callback_data: 'buy_bybit_netflix_4k' },
    ]);
  } else if (/chatgpt|gpt|شات/.test(q)) {
    buttons.push([
      { text: '🟢 ChatGPT Plus — $0.49 🔥', callback_data: 'prod_b2c3d4e5' },
      { text: '🚀 ChatGPT Pro — $2.49 🔥', callback_data: 'prod_chatgpt_pro' },
    ]);
  } else if (/canva|كانفا/.test(q)) {
    buttons.push([
      { text: '🎨 Canva Pro (سنة) — $0.35 🔥', callback_data: 'prod_a1b2c3d4' },
      { text: '👑 Canva Pro (دائم) — $0.79 🔥', callback_data: 'prod_canvapro_life' },
    ]);
  }

  const isNoMoneyOrRecharge = /معيش|ليس لدي|ماعندي|ما عندي|رصيد غير كافي|شحن المحفظة|شحن رصيد|بونص|شحن|محفظة فاضية|فلوس/.test(q);
  if (isNoMoneyOrRecharge && buttons.length === 0) {
    buttons.push([
      { text: '💳 شحن المحفظة (+بونص إضافي)', callback_data: 'payment_methods' },
      { text: '👨‍💻 مساعدة من الدعم', callback_data: 'support' },
    ]);
  }

  if (/دفع|تحويل|إيصال|فودافون|انستاباي|bybit|usdt/.test(q) && buttons.length === 0) {
    buttons.push([
      { text: '⚡ شحن Bybit فوري', callback_data: 'buy_bybit_643361f7' },
      { text: '💳 طرق الدفع والمحافظ', callback_data: 'payment_methods' },
    ]);
  }

  if (/عطل|مشكلة|استبدال|ضمان|دعم|help|support/.test(q) && buttons.length === 0) {
    buttons.push([
      { text: '👨‍💻 الدعم الفني المباشر', callback_data: 'support' },
      { text: '🛡️ الضمان الذهبي 100%', callback_data: 'warranty_policy' },
    ]);
  }

  if (buttons.length === 0) {
    buttons.push([
      { text: '🛍️ تصفح الأقسام والمنتجات', callback_data: 'catalog' },
      { text: '💳 شحن المحفظة (+بونص)', callback_data: 'payment_methods' },
    ]);
  }

  return { inline_keyboard: buttons.slice(0, 3) };
}

async function generateDeepSeekReply(chatId, userQuery) {
  const history = getChatHistory(chatId);
  const systemPrompt = [
    `You are Lead Senior Technical Support Specialist at UpStore Telegram Store (@${BOT_USERNAME}).`,
    'Ultra-concise in 1-3 sentences in Arabic. Answer the exact inquiry directly without fluff.',
    'Fire 90% OFF Prices: Gemini 18m ($0.19 / 10 EGP), Netflix 4K ($0.25 / 12 EGP), Canva Pro ($0.35 / 18 EGP), Cursor Pro ($0.49 / 25 EGP), ChatGPT Plus ($0.49 / 25 EGP), Canva Lifetime ($0.79 / 40 EGP), ChatGPT Pro ($2.49 / 125 EGP).',
    'Deposit Bonus Tiers: $15 -> +$1.5 Free ($16.5) | $30 -> +$3.0 Free ($33.0) | $45 -> +$4.5 Free ($49.5) | $60 -> +$6.0 Free ($66.0). Direct users to wallet to recharge.',
    'Payment: Bybit Pay links, Binance Pay, InstaPay (mo_matany@instapay), Vodafone Cash (01041140422).',
    'Warranty: 100% Gold Replacement Warranty. Human help @UPSTORE_HELP.',
  ].join('\n');

  try {
    const res = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: userQuery }],
        temperature: 0.45,
        max_tokens: 250,
      }),
    });

    if (!res.ok) throw new Error(`API status ${res.status}`);
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || 'أهلاً بك في دعم UpStore ✨. تفضل بطرح استفسارك وسنساعدك فوراً، أو تواصل مع الدعم البشري @UPSTORE_HELP 👨‍💻.';
  } catch (err) {
    return 'أهلاً بك في دعم UpStore ✨. تفضل بطرح استفسارك وسنساعدك فوراً، أو تواصل مع الدعم البشري @UPSTORE_HELP 👨‍💻.';
  }
}

const userReferrals = new Map();

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
  if (supabase) {
    try {
      await supabase.from('site_settings').upsert({
        key: `tg_ref_${chatId}`,
        value: JSON.stringify(stats),
        updated_at: new Date().toISOString(),
      });
    } catch {}
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
        const notifyText = [
          '🎉 <b>مبروك! انضم مستخدم جديد عبر رابط دعوتك! 🔥</b>',
          '━━━━━━━━━━━━━━━━━━━━━━',
          '💎 <b>المكافأة:</b> <code>+1 نقطة فورية</code> ⭐',
          `📊 <b>إجمالي نقاطك:</b> <code>${points} نقطة</code>`,
          `💵 <b>رصيدك المكتسب للمشتريات:</b> <code>$${earnedDollars.toFixed(2)} USDT</code>`,
          `🎯 <i>متبقي لك <b>${remainingForNext} نقاط</b> للحصول على <b>+$1.00 دولار رصيد محفظة إضافي</b> لشراء أي اشتراك مجاناً! 🚀</i>`,
        ].join('\n');

        await sendMessage(referrerId, notifyText, {
          inline_keyboard: [
            [{ text: '🎁 عرض لوحة المكافآت', callback_data: 'referral' }],
            [{ text: '🛍️ تصفح المنتجات والشراء بالرصيد', callback_data: 'catalog' }],
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
      [{ text: `🏠 ${t('btn_main_menu', lang)}` }, { text: t('btn_language', lang) }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

async function renderLanguageSelection(chatId, messageId, callbackQueryId, businessConnectionId = null) {
  if (callbackQueryId) await answerCallbackQuery(callbackQueryId);

  const currentLang = getUserLanguage(chatId);
  const text = [
    t('select_language_title', currentLang),
    '──────────────────',
    t('select_language_sub', currentLang),
  ].join('\n');

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🇸🇦 العربية', callback_data: 'set_lang_ar' },
        { text: '🇺🇸 English', callback_data: 'set_lang_en' },
      ],
      [
        { text: '🇪🇸 Español', callback_data: 'set_lang_es' },
        { text: '🇫🇷 Français', callback_data: 'set_lang_fr' },
      ],
      [
        { text: '🇷🇺 Русский', callback_data: 'set_lang_ru' },
        { text: '🇹🇷 Türkçe', callback_data: 'set_lang_tr' },
      ],
      [
        { text: '🇩🇪 Deutsch', callback_data: 'set_lang_de' },
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
    `• ${t('warranty_badge', lang)}`,
    `• ${t('instant_delivery', lang)}`,
  ].join('\n');

  const keyboard = {
    inline_keyboard: [
      [
        { text: `🛍️ ${t('btn_catalog', lang)}`, callback_data: 'catalog' },
        { text: `🎁 ${t('btn_referral', lang)}`, callback_data: 'referral' },
      ],
      [
        { text: `💳 ${t('btn_wallet', lang)}`, callback_data: 'payment_methods' },
        { text: `📦 ${t('btn_orders', lang)}`, callback_data: 'my_orders' },
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
      await sendMessage(chatId, text, {
        inline_keyboard: keyboard.inline_keyboard,
        keyboard: pKeyboard.keyboard,
        resize_keyboard: true,
        is_persistent: true,
      }, businessConnectionId);
    }
  } else {
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
    t('catalog_title', lang),
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
    `<b>${catName}</b>`,
    '──────────────────',
    t('catalog_sub', lang),
  ].join('\n');

  const buttons = brands.map((b) => {
    const brandName = lang === 'ar' ? b.name_ar : (b.name_en || b.name_ar);
    return [{ text: `${b.icon} ${brandName}`, callback_data: `brand_${b.id}` }];
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
  const text = [
    `<b>${brandName}</b>`,
    '──────────────────',
    t('catalog_sub', lang),
  ].join('\n');

  const buttons = products.map((p) => [
    { text: `${p.tier_name} (${p.duration_months}M) — $${p.our_price.toFixed(2)}`, callback_data: `prod_${p.short_id}` },
  ]);

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
  const brandTitle = brand ? (lang === 'ar' ? brand.name_ar : (brand.name_en || brand.name_ar)) : product.name_ar;
  const prodTitle = `${brandTitle} — ${product.tier_name}`;

  const caption = [
    `<b>${prodTitle}</b>`,
    '──────────────────',
    `• <b>${t('product_price', lang)}</b> <code>$${product.our_price.toFixed(2)} USDT</code>`,
    `• <b>${t('delivery', lang)}</b> ${t('instant_delivery', lang)}`,
    `• <b>${t('warranty_badge', lang)}</b>`,
    '──────────────────',
    t('choose_payment', lang),
  ].join('\n');

  const keyboard = {
    inline_keyboard: [
      [{ text: `⚡ Bybit Pay ($${product.our_price.toFixed(2)})`, callback_data: `buy_bybit_${product.short_id}` }],
      [{ text: `🟡 Binance Pay ($${product.our_price.toFixed(2)})`, callback_data: `buy_binance_${product.short_id}` }],
      [{ text: `📱 InstaPay / Cash (${product.price_egp} EGP)`, callback_data: `buy_local_${product.short_id}` }],
      [
        { text: `🔙 ${t('btn_back', lang)}`, callback_data: `brand_${product.brand_id}` },
        { text: `🏠 ${t('btn_main_menu', lang)}`, callback_data: 'main_menu' },
      ],
    ],
  };

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

  const text = [
    t('bybit_checkout_title', lang),
    '──────────────────',
    `<b>${t('bybit_uid_label', lang)}</b> <code>47183921</code>`,
    `<b>${t('bybit_amount_label', lang)}</b> <code>${product.our_price.toFixed(2)}</code> USDT`,
    `<i>(${t('btn_copy_hint', lang)})</i>`,
    '──────────────────',
    t('bybit_step1', lang),
    t('bybit_step2', lang),
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
  if (supabase) {
    try {
      await supabase.from('orders').update({
        status: 'completed',
        product_key: `AUTO_PAY_${txInfo.transferId || txInfo.txID || 'VERIFIED'}`,
      }).eq('session_id', `tg_${chatId}_${orderRef}`);
    } catch (err) {
      console.error('[Supabase Order Complete Update Exception]:', err);
    }
  }

  const generatedUser = `upstore_vip_${Math.floor(10000 + Math.random() * 90000)}@gmail.com`;
  const generatedPass = `UpStore#${Math.floor(100000 + Math.random() * 900000)}`;

  const brand = getBrandById(product.brand_id);
  const prodTitle = brand ? (lang === 'ar' ? brand.name_ar : (brand.name_en || brand.name_ar)) : product.name_ar;

  const deliveryText = [
    '✅ <b>Payment Confirmed / تم تأكيد الدفع!</b>',
    '──────────────────',
    `📦 <b>Product:</b> ${prodTitle}`,
    `🆔 <b>Order:</b> <code>#${orderRef}</code>`,
    `💎 <b>Amount:</b> <code>${txInfo.amount} USDT</code>`,
    '──────────────────',
    '🔑 <b>Account Credentials / بيانات الحساب:</b>',
    `• <b>Username / Email:</b> <code>${generatedUser}</code>`,
    `• <b>Password:</b> <code>${generatedPass}</code>`,
    `• <b>Duration:</b> ${product.subscription_duration}`,
    '──────────────────',
    '✨ <i>Warranty active 100%. Support: @UPSTORE_HELP</i>',
  ].join('\n');

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
        payment_sender: `Telegram @${chatId} (Local Pay)`,
      });
    } catch (err) {
      console.error('[Supabase Order Insert Exception]:', err);
    }
  }

  const text = [
    t('local_checkout_title', lang),
    '──────────────────',
    `<b>${t('instapay_label', lang)}</b> <code>mo_matany@instapay</code>`,
    `<b>${t('vfcash_label', lang)}</b> <code>01041140422</code>`,
    `<b>${t('local_amount_label', lang)}</b> <code>${product.price_egp}</code> EGP / <code>${product.price_sar}</code> SAR`,
    `<i>(${t('btn_copy_hint', lang)})</i>`,
    '──────────────────',
    t('local_step', lang),
  ].join('\n');

  const keyboard = {
    inline_keyboard: [
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
    ordersText = t('no_orders', lang);
  }

  const text = [
    t('orders_title', lang),
    '──────────────────',
    ordersText,
  ].join('\n');

  const keyboard = {
    inline_keyboard: [
      [
        { text: `🔄 ${t('btn_refresh', lang)}`, callback_data: 'my_orders' },
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
    await sendMessage(chatId, text, keyboard, businessConnectionId);
  }
}

async function renderPaymentMethodsScreen(chatId, messageId, callbackQueryId, businessConnectionId = null) {
  if (callbackQueryId) await answerCallbackQuery(callbackQueryId);

  const lang = getUserLanguage(chatId);
  const text = [
    `<b>${t('btn_wallet', lang)} — UpStore</b>`,
    '──────────────────',
    '• <b>Bybit UID:</b> <code>47183921</code>',
    '• <b>Binance Pay ID:</b> <code>764476139</code>',
    '• <b>InstaPay:</b> <code>mo_matany@instapay</code>',
    '• <b>Cash (Vodafone/Orange/WE):</b> <code>01041140422</code>',
    `<i>(${t('btn_copy_hint', lang)})</i>`,
    '──────────────────',
    t('local_step', lang),
  ].join('\n');

  const keyboard = {
    inline_keyboard: [
      [{ text: '⚡ Bybit Pay', callback_data: 'buy_bybit_643361f7' }],
      [{ text: '🟡 Binance Pay', callback_data: 'buy_binance_643361f7' }],
      [{ text: `👨‍💻 ${t('btn_support', lang)}`, callback_data: 'support' }],
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
    const data = (cb.data || '').trim();

    if (!chatId || !data) return;

    if (data === 'main_menu') {
      await renderMainMenu(chatId, messageId, callbackId, businessConnectionId);
      return;
    }
    if (data === 'catalog') {
      await renderCatalog(chatId, messageId, callbackId, businessConnectionId);
      return;
    }
    if (data.startsWith('cat_')) {
      const catId = data.replace('cat_', '').trim();
      await renderCategoryBrands(chatId, catId, messageId, callbackId, businessConnectionId);
      return;
    }
    if (data.startsWith('brand_')) {
      const brandId = data.replace('brand_', '').trim();
      await renderBrandTiers(chatId, brandId, messageId, callbackId, businessConnectionId);
      return;
    }
    if (data.startsWith('prod_')) {
      const prodId = data.replace('prod_', '').trim();
      await renderProductDetails(chatId, prodId, messageId, callbackId, businessConnectionId);
      return;
    }
    if (data.startsWith('check_bybit_')) {
      const parts = data.split('_');
      const prodId = parts[2];
      const orderRef = parts[3] || 'UNKNOWN';
      const product = getProductByShortIdOrSlug(prodId) || STORE_CATALOG[0];

      await answerCallbackQuery(callbackId, '⚡ جارٍ فحص سجلات Bybit والتحقق التلقائي...', false);
      const verification = await verifyBybitPayment(product.our_price);

      if (verification && verification.success) {
        await deliverInstantOrder(chatId, product, orderRef, verification, messageId, businessConnectionId);
        return;
      } else {
        await sendMessage(
          chatId,
          `⏳ <b>لم يتم رصد التحويل بعد (${product.our_price.toFixed(2)} USDT) في حساب Bybit.</b>\n\n<blockquote>إذا كنت قد أتممت التحويل للتو، يُرجى الانتظار 15-30 ثانية لتأكيد الشبكة ثم الضغط على زر الفحص مجدداً، أو إرسال رقم المعاملة (TXID) / صورة الإشعار في الشات وسنتحقق منها فوراً ⚡.</blockquote>`,
          {
            inline_keyboard: [
              [{ text: '🔄 إعادة فحص سجلات Bybit ⚡', callback_data: `check_bybit_${product.short_id}_${orderRef}` }],
              [{ text: '👨‍💻 مساعدة من الدعم', callback_data: 'support' }],
              [{ text: '🔙 رجوع للمنتج', callback_data: `prod_${product.short_id}` }],
            ],
          },
          businessConnectionId
        );
        return;
      }
    }
    if (data.startsWith('buy_bybit_') || data === 'PAY_BYBIT_CRYPTO') {
      const prodId = data === 'PAY_BYBIT_CRYPTO' ? '643361f7' : data.replace('buy_bybit_', '').trim();
      await renderDirectBybitCheckout(chatId, prodId, messageId, callbackId, businessConnectionId);
      return;
    }
    if (data.startsWith('buy_binance_')) {
      const prodId = data.replace('buy_binance_', '').trim();
      await renderDirectBinanceCheckout(chatId, prodId, messageId, callbackId, businessConnectionId);
      return;
    }
    if (data.startsWith('check_binance_')) {
      const parts = data.split('_');
      const prodId = parts[2];
      const orderRef = parts[3] || 'UNKNOWN';
      const product = getProductByShortIdOrSlug(prodId) || STORE_CATALOG[0];

      await answerCallbackQuery(callbackId, '⚡ تم استلام طلب التحقق من Binance Pay...', false);
      await sendMessage(
        chatId,
        `⏳ <b>جاري التحقق من عملية الدفع عبر Binance Pay (${product.our_price.toFixed(2)} USDT)...</b>\n\n<blockquote>يُرجى إرسال <b>معرف العملية (Order ID / Pay ID)</b> أو صورة إشعار التحويل هنا في الشات وسيتم التفعيل والتسليم فوراً ⚡.</blockquote>`,
        {
          inline_keyboard: [
            [{ text: '👨‍💻 إرسال المعرف للدعم', callback_data: 'support' }],
            [{ text: '🔙 رجوع للدفع', callback_data: `buy_binance_${product.short_id}` }],
            [{ text: '🏠 الرئيسية', callback_data: 'main_menu' }],
          ],
        },
        businessConnectionId
      );
      return;
    }
    if (data.startsWith('buy_local_')) {
      const prodId = data.replace('buy_local_', '').trim();
      await renderDirectLocalCheckout(chatId, prodId, messageId, callbackId, businessConnectionId);
      return;
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
      await renderMainMenu(chatId, messageId, null, businessConnectionId);
      return;
    }
    if (data === 'SUPPORT_RESET_MEMORY') {
      resetChatHistory(chatId);
      await answerCallbackQuery(callbackId, 'تم بدء جلسة جديدة بنجاح ✅', false);
      await renderMainMenu(chatId, messageId, null, businessConnectionId);
      return;
    }
  }

  const message = update.message || update.business_message;
  if (!message) return;

  const chatId = message.chat.id;

  if (message.photo && Array.isArray(message.photo) && message.photo.length > 0) {
    const quota = getMediaQuota(chatId);
    if (quota.isExceeded) {
      await sendMessage(
        chatId,
        'لقد استنفدت الحد المسموح به لرفع الصور والمستندات لهذا الشهر (' + MONTHLY_MEDIA_UPLOAD_LIMIT + ' مرات شهرياً).\n\nيمكنك وصف مشكلتك نصياً أو التواصل مع الدعم الفني البشري عبر @UPSTORE_HELP 👨‍💻.',
        { inline_keyboard: [[{ text: '👨‍💻 الدعم الفني المباشر', callback_data: 'support' }]] },
        businessConnectionId
      );
      return;
    }
    consumeMediaQuota(chatId);
    const remaining = Math.max(0, MONTHLY_MEDIA_UPLOAD_LIMIT - (quota.count + 1));
    await sendChatAction(chatId, 'typing', businessConnectionId);
    const bestPhoto = message.photo[message.photo.length - 1];
    const file = await downloadTelegramFileAsBase64(bestPhoto.file_id);
    if (file) {
      const reply = await analyzeMediaWithGeminiVision(file.dataUrl, message.caption || '');
      const quotaNotice = '\n\n<blockquote><b>رصيد رفع الصور المتبقي لهذا الشهر:</b> <code>' + remaining + ' من ' + MONTHLY_MEDIA_UPLOAD_LIMIT + '</code> 📸</blockquote>';
      await sendMessage(chatId, reply + quotaNotice, getKeyboardForQueryAndReply(message.caption || '', reply), businessConnectionId);
    }
    return;
  }

  if (message.document && message.document.file_id) {
    const quota = getMediaQuota(chatId);
    if (quota.isExceeded) {
      await sendMessage(
        chatId,
        'لقد استنفدت الحد المسموح به لرفع الصور والمستندات لهذا الشهر (' + MONTHLY_MEDIA_UPLOAD_LIMIT + ' مرات شهرياً).\n\nيمكنك وصف مشكلتك نصياً أو التواصل مع الدعم الفني البشري عبر @UPSTORE_HELP 👨‍💻.',
        { inline_keyboard: [[{ text: '👨‍💻 الدعم الفني المباشر', callback_data: 'support' }]] },
        businessConnectionId
      );
      return;
    }
    consumeMediaQuota(chatId);
    const remaining = Math.max(0, MONTHLY_MEDIA_UPLOAD_LIMIT - (quota.count + 1));
    await sendChatAction(chatId, 'typing', businessConnectionId);
    const file = await downloadTelegramFileAsBase64(message.document.file_id);
    if (file) {
      const reply = await analyzeMediaWithGeminiVision(file.dataUrl, message.caption || '');
      const quotaNotice = '\n\n<blockquote><b>رصيد رفع الصور المتبقي لهذا الشهر:</b> <code>' + remaining + ' من ' + MONTHLY_MEDIA_UPLOAD_LIMIT + '</code> 📄</blockquote>';
      await sendMessage(chatId, reply + quotaNotice, getKeyboardForQueryAndReply(message.caption || '', reply), businessConnectionId);
    }
    return;
  }

  const text = (message.text || '').trim();
  if (!text) return;

  if (text.startsWith('/start')) {
    const parts = text.split(/\s+/);
    if (parts.length > 1) {
      const payload = parts[1].trim();
      const refMatch = payload.match(/^(?:ref_)?(\d+)$/);
      if (refMatch) {
        const referrerId = refMatch[1];
        const res = await recordReferral(chatId, referrerId);
        if (res) {
          const welcomeRefText = [
            '👋 <b>أهلاً بك في متجر UpStore الرقمي! 👑</b>',
            '━━━━━━━━━━━━━━━━━━━━━━',
            '🎁 <b>تم تسجيل انضمامك بنجاح عبر دعوة صديقك!</b>',
            '⚡ تصفح الآن أقوى اشتراكات وتراخيص الذكاء الاصطناعي العالمية بأرخص الأسعار مع تسليم فوري وضمان استبدال ذهبي 100% 🛡️.',
          ].join('\n');
          await sendMessage(chatId, welcomeRefText, null, businessConnectionId);
        }
      }
    }
    await renderMainMenu(chatId, null, null, businessConnectionId);
    return;
  }

  const lower = text.toLowerCase();

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
    text.includes('بايبيت')
  ) {
    await renderDirectBybitCheckout(chatId, '643361f7', null, null, businessConnectionId);
    return;
  }
  if (
    text === '/payments' ||
    text === '/wallet' ||
    text.includes('طرق الدفع') ||
    text.includes('المحفظة') ||
    text.includes('الرصيد') ||
    lower.includes('wallet') ||
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
    await sendMessage(chatId, '<b>[✓] تم مسح سجل المحادثة وبدء جلسة جديدة بنجاح ✅</b>', {
      inline_keyboard: [[{ text: '🏠 القائمة الرئيسية', callback_data: 'main_menu' }]],
    }, businessConnectionId);
    return;
  }

  // ── SMART BYBIT TRANSFER ID & TRANSACTION AUTO-VERIFIER ──
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

    const orderRef = pendingOrder?.session_id ? pendingOrder.session_id.split('_').pop() : 'DIRECT';
    const product = pendingOrder?.products || STORE_CATALOG[0];
    const expectedAmount = pendingOrder ? Number(pendingOrder.amount) : product.our_price;

    const verification = await verifyTransferIdOrTxid(extractedId, expectedAmount);

    if (verification && verification.success) {
      await deliverInstantOrder(chatId, product, orderRef, verification, null, businessConnectionId);
      return;
    } else {
      await sendMessage(
        chatId,
        `⏳ <b>جارٍ فحص معرف التحويل:</b> <code>${extractedId}</code>\n\n<blockquote>لم يتم رصد مطابقة لهذا المعرف حتى الآن على Bybit.\n\nإذا كنت قد أتممت التحويل للتو، يُرجى الانتظار 15-30 ثانية لتأكيد العملية في سيرفر Bybit ثم إرسال المعرف مجدداً، أو الضغط على زر الفحص بالأسفل ⚡.</blockquote>`,
        {
          inline_keyboard: [
            [{ text: '🔍 فحص وتأكيد الدفع التلقائي ⚡', callback_data: `check_bybit_${product.short_id || '643361f7'}_${orderRef}` }],
            [{ text: '👨‍💻 مساعدة من الدعم الفني', callback_data: 'support' }],
            [{ text: '🏠 القائمة الرئيسية', callback_data: 'main_menu' }],
          ],
        },
        businessConnectionId
      );
      return;
    }
  }

  await sendChatAction(chatId, 'typing', businessConnectionId);
  const aiReply = await generateDeepSeekReply(chatId, text);
  appendChatHistory(chatId, text, aiReply);
  await sendMessage(chatId, aiReply, getKeyboardForQueryAndReply(text, aiReply), businessConnectionId);
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
      const res = await fetch(`${TELEGRAM_API}/getUpdates?offset=${offset}&timeout=25&allowed_updates=${encodeURIComponent(allowedUpdates)}`, {
        headers: { 'Content-Type': 'application/json' },
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
      console.error('[Polling Exception]:', err.message);
      await new Promise((r) => setTimeout(r, 2500));
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
