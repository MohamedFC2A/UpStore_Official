/**
 * telegram.ts — UpStore Telegram Bot & Notification Utilities
 * Supports: @upstore_one_bot (8855216740:AAEbNj5orlWvMb7sDRw7Zasqim4GybGDT0o)
 */

export const DEFAULT_TELEGRAM_BOT_TOKEN = '8855216740:AAEbNj5orlWvMb7sDRw7Zasqim4GybGDT0o';
export const DEFAULT_TELEGRAM_BOT_USERNAME = 'upstore_one_bot';

export function getTelegramBotToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || DEFAULT_TELEGRAM_BOT_TOKEN;
}

export function getTelegramBotUsername(): string {
  return process.env.TELEGRAM_BOT_USERNAME?.trim() || DEFAULT_TELEGRAM_BOT_USERNAME;
}

export const escapeHtml = (unsafe: string) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const escapeMarkdown = (text: string) => {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
};

export interface TelegramInlineButton {
  text: string;
  url?: string;
  callback_data?: string;
  web_app?: { url: string };
}

export type TelegramInlineKeyboardButton = TelegramInlineButton;

export interface SendTelegramMessageOptions {
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  reply_markup?: {
    inline_keyboard?: TelegramInlineKeyboardButton[][];
    keyboard?: { text: string; request_contact?: boolean; request_location?: boolean }[][];
    remove_keyboard?: boolean;
    resize_keyboard?: boolean;
    is_persistent?: boolean;
    one_time_keyboard?: boolean;
  };
  reply_to_message_id?: number;
  disable_web_page_preview?: boolean;
}

export const STORE_PERSISTENT_KEYBOARD = {
  keyboard: [
    [{ text: '🛍️ المنتجات' }, { text: '💳 المحفظة' }],
    [{ text: '📦 طلباتي' }, { text: '🎁 الأرباح' }],
    [{ text: '🏆 عن المتجر (منذ 2022)' }, { text: '🛡️ الضمان' }],
    [{ text: '🏠 الرئيسية' }, { text: '💬 الدعم' }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

import crypto from 'node:crypto';

/**
 * Generates a deterministic, cryptographically secure Secret Token for a Telegram Bot Webhook
 */
export function generateTelegramWebhookSecret(botToken: string): string {
  const salt = process.env.ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'upstore-bot-secret-salt-2026';
  return crypto.createHmac('sha256', salt).update(botToken).digest('hex').substring(0, 32);
}

/**
 * Verifies the incoming X-Telegram-Bot-Api-Secret-Token against the expected bot secret
 */
export function verifyTelegramWebhookSecret(req: Request, botToken: string): boolean {
  const incomingSecret = req.headers.get('x-telegram-bot-api-secret-token');
  if (!incomingSecret) {
    // If Telegram webhook was registered without a secret token, allow gracefully or require header in production if enforced
    const isEnforced = process.env.ENFORCE_TELEGRAM_SECRET === 'true';
    return !isEnforced;
  }
  const expectedSecret = generateTelegramWebhookSecret(botToken);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(incomingSecret.padEnd(32, '0').slice(0, 32)),
      Buffer.from(expectedSecret.padEnd(32, '0').slice(0, 32))
    );
  } catch {
    return incomingSecret === expectedSecret;
  }
}

/**
 * PII & Credential Sanitization Engine — ZERO Data Leak Protection
 */
export function maskSensitiveCredentials<T = any>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;

  const SENSITIVE_KEYS = new Set([
    'password', 'pass', 'secret', 'token', 'key', 'auth', 'authorization',
    'private_key', 'privateKey', 'apiKey', 'api_key', 'cvv', 'card_number',
    'cardNumber', 'access_token', 'refreshToken', 'service_role'
  ]);

  if (Array.isArray(obj)) {
    return obj.map((item) => maskSensitiveCredentials(item)) as unknown as T;
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj as Record<string, any>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('secret') || lowerKey.includes('password')) {
      sanitized[key] = '[REDACTED_SECRET]';
    } else if (typeof value === 'string' && value.length > 50 && (/eyJ[a-zA-Z0-9_-]+\./.test(value) || /sk-[a-zA-Z0-9]{20,}/.test(value))) {
      sanitized[key] = '[REDACTED_TOKEN]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = maskSensitiveCredentials(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

export function maskEmail(email?: string | null): string {
  if (!email || !email.includes('@')) return email || 'N/A';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `*@${domain}`;
  const maskedLocal = `${local[0]}***${local[local.length - 1]}`;
  return `${maskedLocal}@${domain}`;
}

export function maskPhone(phone?: string | null): string {
  if (!phone || phone.length < 7) return phone || 'N/A';
  const clean = phone.trim();
  const start = clean.slice(0, 4);
  const end = clean.slice(-3);
  return `${start}****${end}`;
}

/**
 * Executes a resilient fetch to Telegram API with exponential backoff & rate-limit handling
 */
export async function resilientTelegramFetch(
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    try {
      const res = await fetch(url, options);
      if (res.status === 429) {
        const errorData = await res.clone().json().catch(() => ({}));
        const retryAfterSec = errorData?.parameters?.retry_after || Math.pow(2, attempt);
        console.warn(`[Telegram API 429 Rate Limit]: Retrying after ${retryAfterSec}s (Attempt ${attempt}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, retryAfterSec * 1000 + Math.random() * 200));
        continue;
      }
      return res;
    } catch (err: any) {
      if (attempt >= maxRetries) throw err;
      const delay = Math.pow(2, attempt) * 400 + Math.random() * 200;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  return fetch(url, options);
}

/**
 * Sends a chat action (such as 'typing', 'upload_photo', etc.) to Telegram chat
 */
export async function sendTelegramChatAction(
  chatId: string | number,
  action: 'typing' | 'upload_photo' | 'record_video' | 'upload_video' | 'record_voice' | 'upload_voice' | 'upload_document' | 'find_location' = 'typing'
): Promise<boolean> {
  const token = getTelegramBotToken();
  if (!token) return false;

  const url = `https://api.telegram.org/bot${token}/sendChatAction`;
  try {
    const res = await resilientTelegramFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        action,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('[Telegram ChatAction Error]:', err);
    return false;
  }
}

/**
 * Sends a rich message to a specific Telegram chat with formatting fallback & retry resilience
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options: SendTelegramMessageOptions = {}
): Promise<{ ok: boolean; result?: any; error?: string }> {
  const token = getTelegramBotToken();
  if (!token) {
    return { ok: false, error: 'Telegram bot token is not configured.' };
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const payload: Record<string, any> = {
    chat_id: chatId,
    text,
    disable_web_page_preview: options.disable_web_page_preview ?? false,
  };

  if (options.parse_mode) {
    payload.parse_mode = options.parse_mode;
  }

  if (options.reply_markup) {
    payload.reply_markup = options.reply_markup;
  }

  if (options.reply_to_message_id) {
    payload.reply_to_message_id = options.reply_to_message_id;
  }

  try {
    let response = await resilientTelegramFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok && options.parse_mode) {
      // Formatting error fallback: send as plain text without parse_mode
      console.warn(`[Telegram API Warning]: Send with parse_mode ${options.parse_mode} failed. Retrying without parse_mode...`);
      delete payload.parse_mode;
      response = await resilientTelegramFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    const data = await response.json();
    if (!response.ok) {
      console.error('[Telegram API Error]:', data);
      return { ok: false, error: data.description || 'Failed to send message.' };
    }

    return { ok: true, result: data.result };
  } catch (err: any) {
    console.error('[Telegram API Connection Error]:', err);
    return { ok: false, error: err.message || 'Connection error' };
  }
}

/**
 * Sends a photo to a Telegram chat with caption & inline keyboard
 */
export async function sendTelegramPhoto(
  chatId: string | number,
  photoPathOrUrl: string,
  caption: string,
  options: SendTelegramMessageOptions = {}
): Promise<{ ok: boolean; result?: any; error?: string }> {
  const token = getTelegramBotToken();
  if (!token) return { ok: false, error: 'Telegram bot token is not configured.' };

  const url = `https://api.telegram.org/bot${token}/sendPhoto`;

  try {
    if (photoPathOrUrl.startsWith('http://') || photoPathOrUrl.startsWith('https://')) {
      const payload: Record<string, any> = {
        chat_id: chatId,
        photo: photoPathOrUrl,
        caption,
        parse_mode: options.parse_mode || 'HTML',
      };
      if (options.reply_markup) payload.reply_markup = options.reply_markup;
      const res = await resilientTelegramFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return data;
    } else {
      // Dynamic import of fs/path for safe server-side execution
      const fs = await import('fs');
      const path = await import('path');
      let absolutePath = photoPathOrUrl;
      if (!path.isAbsolute(absolutePath)) {
        absolutePath = path.join(process.cwd(), photoPathOrUrl);
      }
      if (fs.existsSync(absolutePath)) {
        const formData = new FormData();
        formData.append('chat_id', String(chatId));
        formData.append('caption', caption);
        if (options.parse_mode) formData.append('parse_mode', options.parse_mode);
        if (options.reply_markup) formData.append('reply_markup', JSON.stringify(options.reply_markup));
        const fileBuffer = fs.readFileSync(absolutePath);
        const blob = new Blob([fileBuffer], { type: 'image/png' });
        formData.append('photo', blob, path.basename(absolutePath));

        const res = await fetch(url, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        return data;
      }
    }
  } catch (err: any) {
    console.error('[sendTelegramPhoto Error]:', err);
  }

  // Fallback to text message if photo fails
  return sendTelegramMessage(chatId, caption, options);
}

/**
 * Instantly answers a callback query to remove Telegram loading spinner
 */
export async function answerTelegramCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert: boolean = false
): Promise<boolean> {
  const token = getTelegramBotToken();
  if (!token || !callbackQueryId) return false;

  const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Deletes an existing Telegram message from chat
 */
export async function deleteTelegramMessage(
  chatId: string | number,
  messageId: number
): Promise<boolean> {
  const token = getTelegramBotToken();
  if (!token || !messageId) return false;

  const url = `https://api.telegram.org/bot${token}/deleteMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Edits an existing Telegram message in-place for ultra-fast seamless UI navigation
 */
export async function editTelegramMessageText(
  chatId: string | number,
  messageId: number,
  text: string,
  options: SendTelegramMessageOptions = {}
): Promise<{ ok: boolean; result?: any; error?: string }> {
  const token = getTelegramBotToken();
  if (!token) return { ok: false, error: 'No token' };

  const url = `https://api.telegram.org/bot${token}/editMessageText`;
  const payload: Record<string, any> = {
    chat_id: chatId,
    message_id: messageId,
    text,
    disable_web_page_preview: options.disable_web_page_preview ?? false,
  };

  if (options.parse_mode) payload.parse_mode = options.parse_mode;
  if (options.reply_markup) payload.reply_markup = options.reply_markup;

  try {
    let res = await resilientTelegramFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok && options.parse_mode) {
      delete payload.parse_mode;
      res = await resilientTelegramFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/**
 * Sends administrative broadcast notification (e.g. new orders, alerts) to configured TELEGRAM_CHAT_ID or default admin
 */
export const sendTelegramNotification = async (message: string) => {
  const token = getTelegramBotToken();
  const chatId = process.env.TELEGRAM_PAYMENT_CHAT_ID || process.env.TELEGRAM_CHAT_ID || '8982469612';

  if (!token) {
    console.warn('Telegram bot token is not set. Skipping admin notification.');
    return;
  }

  const safeMsg = message.length > 4000 ? message.substring(0, 3990) + '...' : message;
  return sendTelegramMessage(chatId, safeMsg, { parse_mode: 'HTML' });
};

/**
 * Retrieves bot profile information from Telegram API
 */
export async function getTelegramBotInfo(): Promise<{ ok: boolean; result?: any; error?: string }> {
  const token = getTelegramBotToken();
  if (!token) return { ok: false, error: 'No token' };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/**
 * Sets webhook URL on Telegram API
 */
export async function setTelegramWebhook(webhookUrl: string, secretToken?: string): Promise<{ ok: boolean; description?: string }> {
  const token = getTelegramBotToken();
  if (!token) return { ok: false, description: 'No token' };

  try {
    const sec = secretToken || generateTelegramWebhookSecret(token);
    const body: Record<string, any> = {
      url: webhookUrl,
      drop_pending_updates: false,
      allowed_updates: ['message', 'callback_query'],
      secret_token: sec,
    };

    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (err: any) {
    return { ok: false, description: err.message };
  }
}

/**
 * Deletes current webhook from Telegram API (used for switching to long-polling)
 */
export async function deleteTelegramWebhook(): Promise<{ ok: boolean; description?: string }> {
  const token = getTelegramBotToken();
  if (!token) return { ok: false, description: 'No token' };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drop_pending_updates: false }),
    });
    return await res.json();
  } catch (err: any) {
    return { ok: false, description: err.message };
  }
}

/**
 * Gets current webhook status
 */
export async function getTelegramWebhookInfo(): Promise<{ ok: boolean; result?: any; error?: string }> {
  const token = getTelegramBotToken();
  if (!token) return { ok: false, error: 'No token' };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    return await res.json();
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/**
 * Centralized list of known verified admin Telegram IDs
 */
const KNOWN_ADMIN_IDS = new Set<string>(['8982469612']);

/**
 * Validates whether a Telegram User or Chat ID belongs to an authorized Admin
 */
export async function isAuthorizedTelegramAdmin(
  userIdOrChatId?: string | number | null
): Promise<boolean> {
  if (!userIdOrChatId) return false;
  const idStr = String(userIdOrChatId).trim();

  if (KNOWN_ADMIN_IDS.has(idStr)) return true;

  // 1. Environment Variable Checks
  const envIds = [
    process.env.TELEGRAM_ADMIN_IDS,
    process.env.TELEGRAM_CHAT_ID,
    process.env.TELEGRAM_VISITOR_CHAT_ID,
    process.env.TELEGRAM_PAYMENT_CHAT_ID,
    process.env.TELEGRAM_LOCAL_PAY_CHAT_ID,
  ].filter(Boolean) as string[];

  for (const envVal of envIds) {
    const parts = envVal.split(',').map((s) => s.trim());
    if (parts.includes(idStr)) {
      KNOWN_ADMIN_IDS.add(idStr);
      return true;
    }
  }

  // 2. Supabase site_settings Check
  try {
    const { createAdminClient } = await import('@/utils/supabase/admin');
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .in('key', [
        'telegram_admin_ids',
        'telegram_visitor_chat_id',
        'telegram_payment_chat_id',
      ]);

    if (data && data.length > 0) {
      for (const row of data) {
        const val =
          typeof row.value === 'string' ? row.value.replace(/^"|"$/g, '') : String(row.value);
        const parts = val.split(',').map((s) => s.trim());
        if (parts.includes(idStr)) {
          KNOWN_ADMIN_IDS.add(idStr);
          return true;
        }
      }
    }
  } catch {}

  return false;
}

export const TELEGRAM_UNAUTHORIZED_MESSAGE = `⛔ <b>عذراً، هذا البوت مخصص للإدارة المركزية لمتجر UpStore فقط وغير متاح للعامة.</b>\n\nللحصول على المساعدة، يرجى التوجه إلى بوت المتجر المعتمد: @upstore_one_bot أو الدعم @UPSTORE_HELP`;

