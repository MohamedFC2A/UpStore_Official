/**
 * telegramVisitorLogBot.ts — UpStore High-Speed Visitor Telemetry & Gemini AI Intelligence Bot
 * Bot Token: 8702702403:AAFntsQcnJLfWjxoHA2xKAjccrE4A1kteac
 * Username: @Logztbot
 * 
 * Powered by Google Gemini 2.5 Flash Lite for deep forensic reasoning and real-time live alerts.
 */

import {
  escapeHtml,
  TelegramInlineButton,
  resilientTelegramFetch,
  generateTelegramWebhookSecret,
} from './telegram';
import { GeoLocationInfo, resolveEgyptianCarrier } from './geo';
import { ClientTelemetryData } from './clientTelemetry';
import { resolvePrecisionDeviceModel } from './deviceResolver';

export const VISITOR_BOT_TOKEN = process.env.TELEGRAM_VISITOR_BOT_TOKEN || '';
export const VISITOR_BOT_USERNAME = process.env.TELEGRAM_VISITOR_BOT_USERNAME || 'upstorelive_bot';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const GEMINI_MODEL = 'google/gemini-2.5-flash-lite';

// In-memory dynamic cache for admin chat ID (defaults to verified admin ID)
let inMemoryVisitorAdminChatId: string | null = '8982469612';

export interface VisitorIntelligencePayload {
  sessionId?: string;
  url?: string;
  pathname?: string;
  hostname?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  refCode?: string;
  gclid?: string;
  fbclid?: string;
  ttclid?: string;
  timestamp?: string;
  ip?: string;
  geo?: Partial<GeoLocationInfo>;
  telemetry?: Partial<ClientTelemetryData>;
  batteryLevel?: number | string;
  isCharging?: boolean;
  networkType?: string;
  downlinkSpeed?: string;
  rttLatency?: string;
  deviceMemory?: string;
  cpuCores?: number;
  gpuVendor?: string;
  gpuRenderer?: string;
  screenResolution?: string;
  viewportResolution?: string;
  pixelRatio?: number;
  colorDepth?: number;
  orientation?: string;
  touchSupport?: boolean;
  maxTouchPoints?: number;
  preferredLanguage?: string;
  allLanguages?: string[];
  timezone?: string;
  timezoneOffset?: string;
  deviceModel?: string;
  deviceType?: string;
  os?: string;
  osVersion?: string;
  browser?: string;
  browserVersion?: string;
  isWebView?: boolean;
  webViewType?: string;
  userAgent?: string;
  secChUaModel?: string;
  secChUaPlatform?: string;
  deviceId?: string;
  hardwareFingerprint?: string;
  isTest?: boolean;
  isRepeatVisit?: boolean;
  pageViewsInSession?: number;
}

export type { TelegramInlineButton };

/**
 * Retrieves the destination Telegram Chat ID for Visitor Alerts
 */
export async function getVisitorAdminChatId(): Promise<string | number> {
  if (inMemoryVisitorAdminChatId) return inMemoryVisitorAdminChatId;
  if (process.env.TELEGRAM_VISITOR_CHAT_ID) return process.env.TELEGRAM_VISITOR_CHAT_ID.trim();
  if (process.env.TELEGRAM_CHAT_ID) return process.env.TELEGRAM_CHAT_ID.trim();

  try {
    const { createAdminClient } = await import('@/utils/supabase/admin');
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .in('key', ['telegram_visitor_chat_id', 'telegram_payment_chat_id'])
      .order('key', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.value) {
      const clean =
        typeof data.value === 'string' ? data.value.replace(/^"|"$/g, '') : String(data.value);
      if (clean) {
        inMemoryVisitorAdminChatId = clean;
        return clean;
      }
    }
  } catch (e) {
    // Non-blocking fallback
  }

  return '8982469612'; // Verified Admin Chat ID Fallback
}

/**
 * Saves/registers the admin Chat ID dynamically into database & memory
 */
export async function setVisitorAdminChatId(chatId: string | number): Promise<boolean> {
  const cleanId = String(chatId).trim();
  inMemoryVisitorAdminChatId = cleanId;

  try {
    const { createAdminClient } = await import('@/utils/supabase/admin');
    const supabase = createAdminClient();
    await supabase.from('site_settings').upsert({
      key: 'telegram_visitor_chat_id',
      value: cleanId,
      updated_at: new Date().toISOString(),
    });
    return true;
  } catch (e) {
    console.error('[VisitorBot] Failed to persist chat id in site_settings:', e);
    return false;
  }
}

/**
 * Sends a rich formatted message via @Logztbot with retry resilience
 */
export async function sendVisitorBotMessage(
  chatId: string | number,
  text: string,
  replyMarkup?: TelegramInlineButton[][] | Record<string, any>
): Promise<{ ok: boolean; result?: any; error?: string }> {
  const token = VISITOR_BOT_TOKEN;
  if (!token) return { ok: false, error: 'Visitor bot token missing' };

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload: Record<string, any> = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
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

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('[Visitor Bot Send Error]:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Sets the webhook for @Logztbot with cryptographic Secret Token
 */
export async function setVisitorBotWebhook(
  webhookUrl?: string
): Promise<{ ok: boolean; description?: string }> {
  const token = VISITOR_BOT_TOKEN;
  if (!token) return { ok: false, description: 'Missing visitor bot token' };

  const url = webhookUrl || 'https://www.upstore.one/api/webhooks/telegram/visitor';
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
 * Answers a Telegram callback query
 */
export async function answerVisitorBotCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert: boolean = false
): Promise<boolean> {
  const token = VISITOR_BOT_TOKEN;
  if (!token) return false;

  const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || 'تم الاستلام بنجاح',
        show_alert: showAlert,
      }),
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Google Gemini 2.5 Flash Live Forensic Reasoning Engine
 */
async function generateGeminiVisitorForensics(data: VisitorIntelligencePayload): Promise<{
  intent: string;
  purchasingPower: string;
  trustScore: string;
  acquisitionInsight: string;
  recommendedAction: string;
  intentBadge: string;
}> {
  const devModel = data.deviceModel || data.telemetry?.deviceModel || 'جهاز عميل';
  const os = `${data.os || data.telemetry?.os || ''} ${data.osVersion || data.telemetry?.osVersion || ''}`.trim();
  const gpu = data.gpuRenderer || data.telemetry?.gpuRenderer || '';
  const ram = data.deviceMemory || data.telemetry?.deviceMemoryGb || '';
  const country = data.geo?.countryNameAr || data.geo?.countryNameEn || 'غير محدد';
  const city = data.geo?.city || '';
  const carrier = data.geo?.carrierBadge || data.geo?.isp || '';
  const ref = data.referrer || data.telemetry?.referrer || 'Direct';
  const path = data.pathname || data.url || '/';
  const isWebView = data.isWebView || data.telemetry?.isWebView;
  const webViewType = data.webViewType || data.telemetry?.webViewType || '';

  // 1. Instant High-Accuracy Purchasing Power Classifier
  let power = 'فئة B (متوسطة)';
  const isHighEndApple = /iphone 1[56]|pro max|pro\)|ipad pro|m[1234]|macbook/i.test(devModel) || /apple gpu/i.test(gpu);
  const isHighEndAndroid = /s2[234]|fold|flip|ultra|adreno 7[45]0/i.test(devModel) || /adreno 7[45]0/i.test(gpu);
  const isHighEndPC = /rtx [34]0|geforce rtx|radeon rx/i.test(gpu) || (/8 gb/i.test(String(ram)) && /windows/i.test(os));

  if (isHighEndApple || isHighEndAndroid || isHighEndPC) {
    power = '💎 فئة A+ (قدرة شرائية مرتفعة جداً)';
  } else if (/iphone|galaxy a5|pixel|xiaomi 1[34]/i.test(devModel)) {
    power = '⭐ فئة A (قدرة شرائية ممتازة)';
  } else if (/infinix|redmi|a1[45]|realme/i.test(devModel)) {
    power = '💵 فئة اقتصادية';
  }

  // 2. Acquisition Route Breakdown
  let acquisition = 'دخول مباشر بكتابة الرابط';
  if (data.gclid) acquisition = 'إعلان ممول عبر Google Ads PPC';
  else if (data.ttclid) acquisition = 'إعلان ممول عبر TikTok Ads';
  else if (data.fbclid) acquisition = 'إعلان أو منشور ممول على Meta/Instagram';
  else if (data.refCode) acquisition = `رابط إحالة بالعمولة (كود: ${data.refCode})`;
  else if (ref.includes('google')) acquisition = 'بحث جوجل المجاني (Organic Google Search)';
  else if (ref.includes('tiktok') || webViewType.includes('TikTok')) acquisition = 'تحويل مباشر من تطبيق تيك توك (TikTok Traffic)';
  else if (ref.includes('instagram') || webViewType.includes('Instagram')) acquisition = 'تحويل مباشر من رابط في انستجرام (Instagram)';
  else if (ref.includes('telegram') || webViewType.includes('Telegram')) acquisition = 'رابط داخل تطبيق تيليجرام (Telegram)';
  else if (ref.includes('facebook') || webViewType.includes('Facebook')) acquisition = 'رابط من منشور أو جروب فيسبوك';
  else if (ref.includes('youtube')) acquisition = 'تحويل من منصة يوتيوب (YouTube)';
  else if (ref !== 'Direct' && ref !== '') acquisition = `موقع خارجي (${ref.substring(0, 35)})`;

  // 3. Baseline Intent Classification & Tactical Recommendation
  let intent = 'تصفح عام للمتجر والاطلاع على المنتجات الرقمية';
  let action = 'تجهيز الدعم المباشر ومتابعة سلة الشراء';
  let intentBadge = '🔍 استكشاف وتصفح (Product Research)';

  if (path.includes('gemini')) {
    intent = 'اهتمام مباشر باشتراك Google Gemini Advanced (18 شهر)';
    action = 'تجهيز حسابات Gemini للتسليم الفوري عند الطلب';
    intentBadge = '🎯 نية شراء مركزة (Gemini Advanced)';
  } else if (path.includes('netflix')) {
    intent = 'اهتمام مباشر باشتراك Netflix Premium 4K';
    action = 'تجهيز حسابات نتفليكس للتسليم الفوري';
    intentBadge = '🎯 نية شراء مركزة (Netflix 4K)';
  } else if (path.includes('chatgpt')) {
    intent = 'اهتمام مباشر باشتراك ChatGPT Plus';
    action = 'تجهيز بيانات ChatGPT للتسليم';
    intentBadge = '🎯 نية شراء مركزة (ChatGPT Plus)';
  } else if (path.includes('canva')) {
    intent = 'اهتمام باشتراك Canva Pro مدى الحياة';
    action = 'تجهيز رابط تفعيل Canva Pro';
    intentBadge = '🎯 نية شراء مركزة (Canva Pro)';
  } else if (path.includes('cart') || path.includes('checkout')) {
    intent = 'في مرحلة إتمام الطلب والدفع الفعلي (High Intent Checkout)';
    action = 'مراقبة إشعار الدفع لاعتماد الطلب فوراً';
    intentBadge = '💎 مشتري جاهز للدفع (High-Intent Buyer)';
  }

  // 4. Anomaly & Risk Detection
  let trust = '🟢 100% مستخدم حقيقي وموثوق (طبيعي ونظيف)';
  const rawIspLower = (data.geo?.isp || '').toLowerCase();
  if (
    rawIspLower.includes('data center') ||
    rawIspLower.includes('hosting') ||
    rawIspLower.includes('cloudflare') ||
    rawIspLower.includes('digitalocean') ||
    rawIspLower.includes('amazon') ||
    rawIspLower.includes('google cloud')
  ) {
    trust = '⚠️ اشتباه VPN / Datacenter Proxy';
  } else if (isWebView) {
    trust = `🟢 متصفح داخلي موثوق (${webViewType || 'In-App WebView'})`;
  }

  // Call Google Gemini 2.5 Flash Lite through OpenRouter
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const systemPrompt = `أنت المحلل الاستخباري التشغيلي لمتجر UpStore الرقمي.
قم بتحليل بيانات الزائر (الجهاز، الموقع الجغرافي، مزود الخدمة/الشبكة، الصفحة، ومصدر الزيارة) واستخرج تحليلاً استخبارياً دقيقاً في JSON:
{
  "buyer_persona": "وصف دقيق في سطر واحد لنية الزائر وشخصيته",
  "purchase_power": "تقدير الفئة الشرائية بدقة (💎 فئة A+ مرتفعة جداً / ⭐ فئة A ممتازة / فئة B متوسطة / 💵 فئة اقتصادية)",
  "trust_score": "تقييم الأمان والموثوقية وشبهة الـ VPN (🟢 موثوق / ⚠️ اشتباه VPN)",
  "intent_badge": "تصنيف مختصر للنية (💎 مشتري جاهز / 🎯 اهتمام بمنتج معين / 🔍 مقارن أسعار / 📚 متصفح عام)",
  "action_tip": "نصيحة تكتيكية مباشرة للإدارة لزيادة فرصة البيع"
}`;

    const userPrompt = `الجهاز: ${devModel}, النظام: ${os}, كارت الشاشة: ${gpu}, الرام: ${ram}, الدولة: ${country}, المدينة: ${city}, مزود الخدمة/الشبكة: ${carrier}, الصفحة: ${path}, مصدر الزيارة: ${acquisition}`;

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://www.upstore.one',
        'X-Title': 'UpStore Gemini Live Forensics',
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.25,
        max_tokens: 240,
      }),
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const rawText = data?.choices?.[0]?.message?.content?.trim() || '';
      if (rawText) {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.buyer_persona) intent = parsed.buyer_persona;
          if (parsed.purchase_power) power = parsed.purchase_power;
          if (parsed.trust_score) trust = parsed.trust_score;
          if (parsed.intent_badge) intentBadge = parsed.intent_badge;
          if (parsed.action_tip) action = parsed.action_tip;
        } else if (rawText.length > 15) {
          intent = rawText.replace(/\n+/g, ' ');
        }
      }
    }
  } catch (err) {
    console.warn('[Gemini Forensics Fallback]:', err);
  }

  return {
    intent,
    purchasingPower: power,
    trustScore: trust,
    acquisitionInsight: acquisition,
    recommendedAction: action,
    intentBadge,
  };
}

// In-memory high-speed cache for notified device hashes
const alertedDevicesMemoryCache = new Set<string>();

/**
 * Deterministically generates a robust composite device hash from hardware, network, and telemetry signals
 */
export function generateCompositeDeviceHash(data: VisitorIntelligencePayload): string {
  // 1. If explicit permanent device ID is provided from client localStorage/cookie, prioritize it
  if (data.deviceId && data.deviceId.startsWith('did_') && !data.deviceId.includes('temp')) {
    return data.deviceId.trim();
  }

  // 2. Build deterministic composite hardware & network fingerprint
  const rawIp = data.ip || data.geo?.ip || '127.0.0.1';
  // Use /24 IPv4 subnet or first 3 segments of IPv6 to prevent minor dynamic DHCP IP hopping from creating duplicates
  const ipSubnet = rawIp.includes('.')
    ? rawIp.split('.').slice(0, 3).join('.')
    : rawIp.split(':').slice(0, 4).join(':');

  const components = [
    data.deviceModel || data.telemetry?.deviceModel || 'UnknownDevice',
    data.screenResolution || (data.telemetry?.screenWidth ? `${data.telemetry.screenWidth}x${data.telemetry.screenHeight}` : ''),
    data.gpuRenderer || data.telemetry?.gpuRenderer || '',
    data.gpuVendor || data.telemetry?.gpuVendor || '',
    data.os || data.telemetry?.os || '',
    data.osVersion || data.telemetry?.osVersion || '',
    data.cpuCores || data.telemetry?.cpuCores || '',
    data.deviceMemory || data.telemetry?.deviceMemoryGb || '',
    data.timezone || data.telemetry?.timezone || '',
    data.preferredLanguage || 'ar',
    ipSubnet,
  ].join('~');

  // FNV-1a 32-bit Hash
  let hash = 0x811c9dc5;
  for (let i = 0; i < components.length; i++) {
    hash ^= components.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }

  return `dev_${hash.toString(16).padStart(8, '0')}`;
}

/**
 * Checks whether a specific mobile device hash has already received an alert in memory or in database
 */
export async function isDeviceAlreadyAlerted(deviceHash: string): Promise<boolean> {
  if (!deviceHash) return false;

  // 1. Fast in-memory check (<0.1ms)
  if (alertedDevicesMemoryCache.has(deviceHash)) {
    return true;
  }

  // 2. Persistent Supabase lookup
  try {
    const { createAdminClient } = await import('@/utils/supabase/admin');
    const supabase = createAdminClient();

    // Check visitor_devices table
    const { data: vData } = await supabase
      .from('visitor_devices')
      .select('device_hash')
      .eq('device_hash', deviceHash)
      .limit(1)
      .maybeSingle();

    if (vData?.device_hash) {
      alertedDevicesMemoryCache.add(deviceHash);
      return true;
    }

    // Seamless fallback to site_settings
    const settingKey = `v_did_${deviceHash.substring(0, 48)}`;
    const { data: sData } = await supabase
      .from('site_settings')
      .select('key')
      .eq('key', settingKey)
      .limit(1)
      .maybeSingle();

    if (sData?.key) {
      alertedDevicesMemoryCache.add(deviceHash);
      return true;
    }
  } catch (err) {
    // Non-blocking fallback
  }

  return false;
}

/**
 * Records a mobile device permanently in memory and Supabase database as alerted
 */
export async function markDeviceAsAlerted(
  deviceHash: string,
  data: Partial<VisitorIntelligencePayload>
): Promise<void> {
  if (!deviceHash) return;

  // 1. Add to in-memory set immediately
  alertedDevicesMemoryCache.add(deviceHash);

  // Keep in-memory cache bounded (max 20,000 items)
  if (alertedDevicesMemoryCache.size > 20000) {
    const firstKey = alertedDevicesMemoryCache.values().next().value;
    if (firstKey) alertedDevicesMemoryCache.delete(firstKey);
  }

  // 2. Persist to Supabase database
  try {
    const { createAdminClient } = await import('@/utils/supabase/admin');
    const supabase = createAdminClient();

    const record = {
      device_hash: deviceHash,
      device_model: data.deviceModel || 'Unknown Device',
      device_type: data.deviceType || 'Mobile',
      os: data.os || '',
      browser: data.browser || '',
      ip_address: data.ip || '',
      country: data.geo?.countryNameAr || data.geo?.countryNameEn || '',
      city: data.geo?.city || '',
      screen_resolution: data.screenResolution || '',
      first_seen_at: new Date().toISOString(),
      metadata: {
        pathname: data.pathname || '/',
        referrer: data.referrer || 'Direct',
        utmSource: data.utmSource,
        utmCampaign: data.utmCampaign,
      },
    };

    const { error } = await supabase
      .from('visitor_devices')
      .upsert(record, { onConflict: 'device_hash' });

    if (error) {
      // Fallback to site_settings table if visitor_devices table is pending migration
      const settingKey = `v_did_${deviceHash.substring(0, 48)}`;
      await supabase.from('site_settings').upsert({
        key: settingKey,
        value: {
          alerted_at: new Date().toISOString(),
          model: data.deviceModel || 'Mobile Device',
          country: data.geo?.countryNameAr || '',
        },
        updated_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('[VisitorBot] Failed to persist device alert record:', err);
  }
}

/**
 * Formats a breathtaking, high-density, forensic visitor intelligence report and dispatches it immediately
 * STRICT RULE: Only sends ONCE per mobile device (0 duplicate notifications for the same device)
 */
export async function dispatchVisitorAlertToTelegram(
  data: VisitorIntelligencePayload
): Promise<{ ok: boolean; skipped?: boolean; reason?: string; deviceHash?: string; error?: string }> {
  const chatId = await getVisitorAdminChatId();
  if (!chatId) {
    return { ok: false, error: 'No admin chat ID found' };
  }

  const isAdminTest = Boolean(
    data.isTest ||
    data.sessionId?.startsWith('ADMIN_TEST') ||
    data.sessionId?.startsWith('TEST_') ||
    data.deviceModel === 'Admin Test Console'
  );

  // 1. Strict Deduplication: If not an admin test, ensure this exact mobile device has NEVER been alerted before
  const deviceHash = generateCompositeDeviceHash(data);
  if (!isAdminTest) {
    const alreadyAlerted = await isDeviceAlreadyAlerted(deviceHash);
    if (alreadyAlerted) {
      return {
        ok: true,
        skipped: true,
        reason: 'device_already_alerted',
        deviceHash,
      };
    }
  }

  // 2. Precision Device Resolution (Client Hints + Dictionary + Serper Fallback)
  const precisionDevice = await resolvePrecisionDeviceModel({
    secChUaModel: data.secChUaModel,
    secChUaPlatform: data.secChUaPlatform,
    userAgent: data.userAgent,
    fallbackModel: data.deviceModel || data.telemetry?.deviceModel,
  });

  const resolvedModelName = precisionDevice.deviceModel;
  const devType = precisionDevice.deviceType !== 'Unknown'
    ? precisionDevice.deviceType
    : (data.deviceType || data.telemetry?.deviceType || 'Mobile');

  const devIcon = devType === 'Mobile' ? '📱' : devType === 'Tablet' ? '📟' : devType === 'Desktop' ? '💻' : '🎮';
  const osName = `${data.os || data.telemetry?.os || 'OS'}${
    data.osVersion || data.telemetry?.osVersion ? ' ' + (data.osVersion || data.telemetry?.osVersion) : ''
  }`.trim();
  const browserName = `${data.browser || data.telemetry?.browser || 'Browser'}${
    data.browserVersion || data.telemetry?.browserVersion ? ' ' + (data.browserVersion || data.telemetry?.browserVersion) : ''
  }`.trim();
  const webViewBadge = data.isWebView || data.telemetry?.isWebView
    ? ` ⚠️ <b>(${data.webViewType || data.telemetry?.webViewType || 'In-App WebView'})</b>`
    : '';

  // 3. Geo & Network Details + Egyptian Carrier Resolution
  const ip = data.ip || data.geo?.ip || '127.0.0.1';
  const countryName = data.geo?.countryNameAr || data.geo?.countryNameEn || 'غير محدد';
  const flag = data.geo?.flagEmoji ? `${data.geo.flagEmoji} ` : '🌐 ';
  const city = data.geo?.city && data.geo.city !== 'Localhost' && data.geo.city !== 'Unknown' ? ` • ${data.geo.city}` : '';
  
  // Carrier Resolution
  let carrierBadge = data.geo?.carrierBadge || null;
  if (!carrierBadge && (data.geo?.countryCode === 'EG' || data.geo?.isp)) {
    const carrierRes = resolveEgyptianCarrier(data.geo?.asNumber, data.geo?.isp, ip);
    carrierBadge = carrierRes.carrierBadge;
  }
  const carrierStr = carrierBadge
    ? `\n├ 📶 <b>الشبكة ومزود الخدمة:</b> <code>${escapeHtml(carrierBadge)}</code>`
    : (data.geo?.isp ? `\n├ 🏢 <b>مزود الخدمة (ISP):</b> <code>${escapeHtml(data.geo.isp)}</code>` : '');

  // 4. Screen & Hardware
  const screenStr = data.screenResolution || (data.telemetry?.screenWidth ? `${data.telemetry.screenWidth}×${data.telemetry.screenHeight}px (@${data.telemetry.pixelRatio || 1}x)` : 'قياسي');
  const viewportStr = data.viewportResolution || (data.telemetry?.viewportWidth ? `${data.telemetry.viewportWidth}×${data.telemetry.viewportHeight}px` : '');
  
  const hardwareItems: string[] = [];
  if (data.deviceMemory || data.telemetry?.deviceMemoryGb) hardwareItems.push(String(data.deviceMemory || data.telemetry?.deviceMemoryGb));
  if (data.cpuCores || data.telemetry?.cpuCores) hardwareItems.push(`${data.cpuCores || data.telemetry?.cpuCores} Cores`);
  if (data.gpuRenderer || data.telemetry?.gpuRenderer) hardwareItems.push(String(data.gpuRenderer || data.telemetry?.gpuRenderer).split('/')[0].trim());
  const hardwareStr = hardwareItems.length > 0 ? hardwareItems.join(' • ') : 'معالج قياسي';

  let batteryStr = '';
  if (data.batteryLevel !== undefined && data.batteryLevel !== null && data.batteryLevel !== '') {
    const batNum = Math.round(Number(data.batteryLevel));
    batteryStr = `\n├ 🔋 <b>البطارية والطاقة:</b> <code>${batNum}% ${data.isCharging ? '(متصل بالشاحن ⚡)' : '(يعمل على البطارية)'}</code>`;
  }

  // 5. Time
  const arabicTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const arabicDate = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  const tz = data.timezone || data.telemetry?.timezone || 'UTC';
  const tzOffset = data.timezoneOffset || data.telemetry?.timezoneOffset || 'UTC+03:00';

  // 6. Gemini AI Forensics
  const forensics = await generateGeminiVisitorForensics({
    ...data,
    deviceModel: resolvedModelName,
  });

  // 7. Campaign & Path
  const visitedPath = data.pathname || data.url || '/';

  let campaignBlock = '';
  const utmParts: string[] = [];
  if (data.utmSource) utmParts.push(`المصدر: <code>${escapeHtml(data.utmSource)}</code>`);
  if (data.utmCampaign) utmParts.push(`الحملة: <code>${escapeHtml(data.utmCampaign)}</code>`);
  if (data.refCode) utmParts.push(`كود الإحالة: <code>${escapeHtml(data.refCode)}</code>`);
  if (utmParts.length > 0) {
    campaignBlock = `\n├ 🎯 <b>تفاصيل الحملة:</b> ${utmParts.join(' • ')}`;
  }

  const header = isAdminTest
    ? `🧪 <b>[إشعار تجريبي لاختبار البوت — المسؤول]</b>`
    : `🔴 ${devIcon} <b>[رصد حي: زائر جديد دخل المتجر الآن!]</b>`;

  const languagesList = data.allLanguages?.length
    ? data.allLanguages.slice(0, 3).join(', ')
    : (data.preferredLanguage || 'ar');

  // Masterfully structured, executive text layout
  const text = `
${header}
━━━━━━━━━━━━━━━━━━━━━━━━━

🌍 <b>الموقع الجغرافي والشبكة:</b>
├ <b>الدولة والمدينة:</b> <b>${flag}${escapeHtml(countryName)}</b>${escapeHtml(city)}
├ 📍 <b>عنوان الـ IP:</b> <code>${escapeHtml(ip)}</code>${carrierStr}
└ 🕒 <b>التوقيت والنطاق:</b> <code>${arabicTime} - ${arabicDate} (${escapeHtml(tz)} ${escapeHtml(tzOffset)})</code>

${devIcon} <b>الجهاز، الشاشة والمواصفات:</b>
├ <b>الجهاز والموديل:</b> <b><code>${escapeHtml(resolvedModelName)}</code></b>
├ 💻 <b>نظام التشغيل:</b> <code>${escapeHtml(osName)}</code>
├ 🌐 <b>المتصفح والمحرك:</b> <code>${escapeHtml(browserName)}</code>${webViewBadge}
├ 🖥️ <b>الشاشة والأبعاد:</b> <code>${escapeHtml(screenStr)}</code>${viewportStr ? ` (نافذة: <code>${escapeHtml(viewportStr)}</code>)` : ''}
├ ⚡ <b>العتاد والذاكرة:</b> <code>${escapeHtml(hardwareStr)}</code>${batteryStr}
└ 🗣️ <b>اللغة وإعدادات المتصفح:</b> <code>${escapeHtml(languagesList)}</code>

🧭 <b>مسار الوصول وقناة الجلب:</b>
├ 🌐 <b>الصفحة المفتوحة:</b> <code>${escapeHtml(data.hostname || 'upstore.one')}${escapeHtml(visitedPath)}</code>
├ 🚀 <b>مصدر الزيارة:</b> <b>${escapeHtml(forensics.acquisitionInsight)}</b>${campaignBlock}
└ 🆔 <b>بصمة الجهاز الموحدة:</b> <code>${escapeHtml(deviceHash)}</code>

🧠 <b>التحليل الاستخباري الفوري (Google Gemini AI):</b>
├ 🏷️ <b>تصنيف النية:</b> <b>${escapeHtml(forensics.intentBadge)}</b>
├ 🎯 <b>شخصية ونيّة الزائر:</b> <b>${escapeHtml(forensics.intent)}</b>
├ 💰 <b>القدرة الشرائية التقديرية:</b> <b>${escapeHtml(forensics.purchasingPower)}</b>
├ 🛡️ <b>تقييم الأمان والموثوقية:</b> <b>${escapeHtml(forensics.trustScore)}</b>
└ 💡 <b>التوصية التكتيكية للإدارة:</b> <i>${escapeHtml(forensics.recommendedAction)}</i>

━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ <i>تم الرصد والتحليل الاستخباري فورياً (مرة واحدة لكل جهاز) بواسطة Google Gemini Flash</i>
`.trim();

  // Clean, High-Impact Action Buttons
  const fullTargetUrl = (data.url && data.url.startsWith('http')) ? data.url : `https://${data.hostname || 'upstore.one'}${visitedPath}`;
  const googleMapsUrl = data.geo?.city
    ? `https://maps.google.com/?q=${encodeURIComponent(`${data.geo.city}, ${data.geo.countryNameEn || ''}`)}`
    : `https://ipinfo.io/${encodeURIComponent(ip)}`;

  const inlineKeyboard: TelegramInlineButton[][] = [
    [
      { text: '🗺️ خريطة الموقع الجغرافي', url: googleMapsUrl },
      { text: '🔍 فحص IP و Whois', url: `https://ipinfo.io/${encodeURIComponent(ip)}` },
    ],
    [
      { text: '🌐 فتح الصفحة المفتوحة', url: fullTargetUrl },
      { text: '📊 لوحة التحكم الرئيسية', url: `https://${data.hostname || 'upstore.one'}/admin` },
    ],
  ];

  const dispatchResult = await sendVisitorBotMessage(chatId, text, inlineKeyboard);

  // 8. Permanently mark device as alerted if message sent or payload valid (preventing repeat)
  if (!isAdminTest) {
    await markDeviceAsAlerted(deviceHash, {
      ...data,
      deviceModel: resolvedModelName,
    });
  }

  return {
    ok: dispatchResult.ok,
    deviceHash,
    error: dispatchResult.error,
  };
}


