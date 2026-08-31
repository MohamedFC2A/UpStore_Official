/**
 * telegramSwitchBot.ts — Store Power Switch & Management Bot for UpStore
 * Bot Token: 8658718703:AAGziyYO6mbO_6_J8uwfOmqykg9vmuzQ_IQ
 * Username: @On_Off_Wep_bot
 */

import {
  TelegramInlineButton,
  resilientTelegramFetch,
  generateTelegramWebhookSecret,
} from './telegram';
import { createAdminClient } from './supabase/admin';

export const SWITCH_BOT_TOKEN =
  process.env.TELEGRAM_SWITCH_BOT_TOKEN || '8658718703:AAGziyYO6mbO_6_J8uwfOmqykg9vmuzQ_IQ';
export const SWITCH_BOT_USERNAME =
  process.env.TELEGRAM_SWITCH_BOT_USERNAME || 'On_Off_Wep_bot';

export type { TelegramInlineButton };

export interface TelegramReplyButton {
  text: string;
}

export interface SendSwitchBotMessageOptions {
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  reply_markup?: {
    inline_keyboard?: TelegramInlineButton[][];
    keyboard?: TelegramReplyButton[][];
    resize_keyboard?: boolean;
    one_time_keyboard?: boolean;
    remove_keyboard?: boolean;
  };
  reply_to_message_id?: number;
  disable_web_page_preview?: boolean;
}

/**
 * Sets the webhook for @On_Off_Wep_bot with cryptographic Secret Token
 */
export async function setSwitchBotWebhook(
  webhookUrl?: string
): Promise<{ ok: boolean; description?: string }> {
  const token = SWITCH_BOT_TOKEN;
  if (!token) return { ok: false, description: 'Missing switch bot token' };

  const url = webhookUrl || 'https://www.upstore.one/api/webhooks/telegram/switch';
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
 * Sends a message via @On_Off_Wep_bot with retry resilience
 */
export async function sendSwitchBotMessage(
  chatId: string | number,
  text: string,
  options?: SendSwitchBotMessageOptions
): Promise<any> {
  const token = SWITCH_BOT_TOKEN;
  if (!token) {
    console.error('[SwitchBot] Missing TELEGRAM_SWITCH_BOT_TOKEN');
    return null;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const res = await resilientTelegramFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options?.parse_mode ?? 'HTML',
        reply_markup: options?.reply_markup,
        reply_to_message_id: options?.reply_to_message_id,
        disable_web_page_preview: options?.disable_web_page_preview ?? true,
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      console.error('[SwitchBot Error]:', data.description || data);
    }
    return data;
  } catch (error) {
    console.error('[SwitchBot Send Failed]:', error);
    return null;
  }
}

/**
 * Answers a callback query from inline buttons
 */
export async function answerSwitchBotCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert: boolean = false
): Promise<boolean> {
  const token = SWITCH_BOT_TOKEN;
  if (!token) return false;

  try {
    const res = await resilientTelegramFetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert,
      }),
    });
    const data = await res.json();
    return !!data.ok;
  } catch (err) {
    console.error('[SwitchBot Callback Answer Error]:', err);
    return false;
  }
}

/**
 * Edits a message sent by @On_Off_Wep_bot
 */
export async function editSwitchBotMessage(
  chatId: string | number,
  messageId: number,
  text: string,
  options?: SendSwitchBotMessageOptions
): Promise<any> {
  const token = SWITCH_BOT_TOKEN;
  if (!token) return null;

  try {
    const res = await resilientTelegramFetch(`https://api.telegram.org/bot${token}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: options?.parse_mode ?? 'HTML',
        reply_markup: options?.reply_markup,
        disable_web_page_preview: options?.disable_web_page_preview ?? true,
      }),
    });
    return await res.json();
  } catch (err) {
    console.error('[SwitchBot Edit Error]:', err);
    return null;
  }
}

/**
 * Sends a typing/action indicator
 */
export async function sendSwitchBotChatAction(
  chatId: string | number,
  action: 'typing' | 'upload_document' = 'typing'
): Promise<boolean> {
  const token = SWITCH_BOT_TOKEN;
  if (!token) return false;

  try {
    const res = await resilientTelegramFetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        action,
      }),
    });
    const data = await res.json();
    return !!data.ok;
  } catch {
    return false;
  }
}

// In-memory micro-cache to ensure sub-millisecond SSR response times
let cachedMaintenanceStatus: { isMaintenance: boolean; updatedAt: string; expiry: number } | null = null;

/**
 * Reads current maintenance mode from site_settings with in-memory caching
 */
export async function getStoreMaintenanceStatus(forceRefresh = false): Promise<{
  isMaintenance: boolean;
  updatedAt: string;
}> {
  const now = Date.now();
  if (!forceRefresh && cachedMaintenanceStatus && cachedMaintenanceStatus.expiry > now) {
    return {
      isMaintenance: cachedMaintenanceStatus.isMaintenance,
      updatedAt: cachedMaintenanceStatus.updatedAt,
    };
  }

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('site_settings')
      .select('value, updated_at')
      .eq('key', 'maintenance_mode')
      .single();

    const isMaintenance = data?.value === true || data?.value === 'true';
    const updatedAt = data?.updated_at || new Date().toISOString();

    // Cache for 4 seconds in memory (instant SSR + fast refresh)
    cachedMaintenanceStatus = {
      isMaintenance,
      updatedAt,
      expiry: now + 4000,
    };

    return { isMaintenance, updatedAt };
  } catch (e) {
    console.error('[SwitchBot getStoreMaintenanceStatus Error]:', e);
    return { isMaintenance: false, updatedAt: new Date().toISOString() };
  }
}

/**
 * Sets maintenance mode in site_settings and immediately busts the in-memory cache
 */
export async function setStoreMaintenanceStatus(
  isMaintenance: boolean
): Promise<{ success: boolean; isMaintenance: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const updatedAt = new Date().toISOString();
    const { error } = await supabase
      .from('site_settings')
      .upsert({
        key: 'maintenance_mode',
        value: isMaintenance,
        updated_at: updatedAt,
      });

    if (error) throw error;

    // Immediately update the local cache
    cachedMaintenanceStatus = {
      isMaintenance,
      updatedAt,
      expiry: Date.now() + 4000,
    };

    return { success: true, isMaintenance };
  } catch (err: any) {
    console.error('[SwitchBot setStoreMaintenanceStatus Error]:', err);
    return { success: false, isMaintenance: !isMaintenance, error: err.message };
  }
}

export interface StoreLiveMetrics {
  totalOrdersToday: number;
  completedOrdersToday: number;
  pendingOrdersToday: number;
  revenueTodayUsd: number;
  revenueTodayEgp: number;
  totalProductsCount: number;
  outOfStockCount: number;
  lowStockCount: number;
  pendingManualList: Array<{
    id: string;
    productName: string;
    customerEmail: string;
    amount: number;
    currency: string;
    createdAt: string;
  }>;
}

/**
 * Computes live operational metrics from Supabase
 */
export async function getStoreLiveMetrics(): Promise<StoreLiveMetrics> {
  const supabase = createAdminClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  try {
    // 1. Fetch Orders Today
    const { data: todayOrders } = await supabase
      .from('orders')
      .select('id, product_name, customer_email, total_amount, currency, status, payment_status, created_at')
      .gte('created_at', todayStart.toISOString())
      .order('created_at', { ascending: false });

    const orders = todayOrders || [];
    const totalOrdersToday = orders.length;
    const completedOrdersToday = orders.filter((o) => o.status === 'completed' || o.payment_status === 'completed').length;
    const pendingOrdersToday = orders.filter((o) => o.status === 'pending' || o.payment_status === 'pending_manual').length;

    let revenueTodayUsd = 0;
    let revenueTodayEgp = 0;

    for (const o of orders) {
      if (o.status === 'completed' || o.payment_status === 'completed') {
        const amt = Number(o.total_amount) || 0;
        if (o.currency === 'EGP') {
          revenueTodayEgp += amt;
          revenueTodayUsd += amt / 50; // approximate
        } else {
          revenueTodayUsd += amt;
          revenueTodayEgp += amt * 50;
        }
      }
    }

    // 2. Fetch Pending Manual Orders (all-time pending)
    const { data: pendingManual } = await supabase
      .from('orders')
      .select('id, product_name, customer_email, total_amount, currency, created_at')
      .or('status.eq.pending,payment_status.eq.pending_manual')
      .order('created_at', { ascending: false })
      .limit(8);

    const pendingManualList = (pendingManual || []).map((p) => ({
      id: p.id,
      productName: p.product_name || 'UpStore Product',
      customerEmail: p.customer_email || 'No email',
      amount: Number(p.total_amount) || 0,
      currency: p.currency || 'USD',
      createdAt: p.created_at,
    }));

    // 3. Fetch Products stock
    const { data: products } = await supabase
      .from('products')
      .select('id, name, stock');

    const productList = products || [];
    const totalProductsCount = productList.length;
    const outOfStockCount = productList.filter((p) => (p.stock ?? 0) <= 0).length;
    const lowStockCount = productList.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 3).length;

    return {
      totalOrdersToday,
      completedOrdersToday,
      pendingOrdersToday,
      revenueTodayUsd: Math.round(revenueTodayUsd * 100) / 100,
      revenueTodayEgp: Math.round(revenueTodayEgp * 100) / 100,
      totalProductsCount,
      outOfStockCount,
      lowStockCount,
      pendingManualList,
    };
  } catch (err) {
    console.error('[SwitchBot getStoreLiveMetrics Error]:', err);
    return {
      totalOrdersToday: 0,
      completedOrdersToday: 0,
      pendingOrdersToday: 0,
      revenueTodayUsd: 0,
      revenueTodayEgp: 0,
      totalProductsCount: 0,
      outOfStockCount: 0,
      lowStockCount: 0,
      pendingManualList: [],
    };
  }
}

/**
 * Builds the default Persistent Reply Keyboard
 */
export function buildSwitchBotReplyKeyboard() {
  return {
    keyboard: [
      [
        { text: '🔴 إيقاف الموقع (وضع النوم 🌙)' },
        { text: '🟢 فتح الموقع (أونلاين ☀️)' },
      ],
      [
        { text: '📊 إحصائيات المبيعات' },
        { text: '📦 الطلبات المعلقة' },
      ],
      [
        { text: '🤖 المساعد الذكي (Gemini)' },
        { text: '⚡ فحص السيرفر والجاهزية' },
      ],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

/**
 * Builds the Interactive Inline Control Panel
 */
export function buildSwitchBotInlinePanel(isMaintenance: boolean) {
  return {
    inline_keyboard: [
      [
        {
          text: isMaintenance ? '🟢 اضغط هنا لفتح الموقع فوراً ☀️' : '🔴 اضغط هنا لقفل الموقع والنوم 🌙',
          callback_data: isMaintenance ? 'SWITCH_ACTION_OPEN' : 'SWITCH_ACTION_CLOSE',
        },
      ],
      [
        { text: '📊 ملخص المبيعات اليوم', callback_data: 'SWITCH_ACTION_STATS' },
        { text: '📦 الطلبات المعلقة', callback_data: 'SWITCH_ACTION_PENDING' },
      ],
      [
        { text: '🌐 زيارة الموقع الرسمي', url: 'https://www.upstore.one' },
        { text: '🛡️ لوحة تحكم الأدمن', url: 'https://www.upstore.one/admin' },
      ],
      [
        { text: '🔄 تحديث الحالة الآن', callback_data: 'SWITCH_ACTION_REFRESH' },
      ],
    ],
  };
}
