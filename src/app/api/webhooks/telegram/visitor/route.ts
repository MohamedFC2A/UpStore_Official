import { NextResponse } from 'next/server';
import {
  VISITOR_BOT_TOKEN,
  VISITOR_BOT_USERNAME,
  setVisitorBotWebhook,
  sendVisitorBotMessage,
  answerVisitorBotCallbackQuery,
  setVisitorAdminChatId,
  getVisitorAdminChatId,
  dispatchVisitorAlertToTelegram,
} from '@/utils/telegramVisitorLogBot';
import {
  isAuthorizedTelegramAdmin,
  TELEGRAM_UNAUTHORIZED_MESSAGE,
  verifyTelegramWebhookSecret,
} from '@/utils/telegram';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function buildWelcomeAdminMessage(chatId: string | number, firstName: string) {
  return `👋 <b>أهلاً بك يا ${firstName}! في بوت استخبارات وزوار المتجر</b>
🤖 البوت: <b>@${VISITOR_BOT_USERNAME}</b>

✅ <b>تم تسجيل وتعيين معرّفك كمسؤول رئيسي بنجاح!</b>
🆔 <b>معرف المحادثة (Chat ID):</b> <code>${chatId}</code>

⚡ <b>وظيفة البوت:</b>
يقوم هذا البوت برصد أي زائر يدخل متجر UpStore فوراً وفي نفس اللحظة (بمجرد فتح الموقع ودون الحاجة لتسجيل دخول أو شراء)، ويرسل لك تقريراً تفصيلياً يشمل:
• 📍 الموقع الجغرافي، الـ IP، المدينة، والدولة.
• 📱 موديل الجهاز (iPhone, Samsung, Windows PC, Mac)، ونظام التشغيل.
• 🖥️ دقة الشاشة، كارت الشاشة (GPU)، والذاكرة (RAM).
• 🌐 المتصفح وإذا كان داخل تطبيق (تليجرام، انستجرام، تيك توك).
• 🔋 نسبة البطارية وسرعة الاتصال ونوع الشبكة.
• 🔗 مصدر الزيارة (بحث جوجل، تيك توك، مباشر، إلخ) والرابط المفتوح.

💡 <b>الأوامر المتاحة:</b>
• <code>/status</code> — فحص حالة البوت والسيرفر
• <code>/test</code> — إرسال إشعار تجريبي لاختبار التنسيق
• <code>/help</code> — دليل الأوامر`;
}

export async function POST(req: Request) {
  try {
    // Cryptographic Secret Token Verification
    if (!verifyTelegramWebhookSecret(req, VISITOR_BOT_TOKEN)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized secret token' }, { status: 403 });
    }

    const update = await req.json().catch(() => null);
    if (!update) {
      return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });
    }

    // 1. Handle Inline Callback Queries
    if (update.callback_query) {
      const { id, from, message, data } = update.callback_query;
      const chatId = message?.chat?.id || from?.id;

      if (!chatId || !await isAuthorizedTelegramAdmin(chatId)) {
        await answerVisitorBotCallbackQuery(id, '⛔ غير مصرح لك بهذا الإجراء', true);
        return NextResponse.json({ ok: true });
      }

      if (data) {
        if (data === 'VISITOR_TEST_ALERT') {
          await answerVisitorBotCallbackQuery(id, 'جارٍ إرسال إشعار تجريبي...');
          await dispatchVisitorAlertToTelegram({
            sessionId: 'TEST_SESSION_99',
            pathname: '/',
            hostname: 'upstore.one',
            referrer: 'https://www.google.com',
            utmSource: 'google',
            utmCampaign: 'test_campaign',
            ip: '156.204.12.89',
            geo: {
              countryCode: 'EG',
              countryNameAr: 'مصر',
              countryNameEn: 'Egypt',
              flagEmoji: '🇪🇬',
              city: 'القاهرة (Cairo)',
              region: 'Cairo Governorate',
              isp: 'Telecom Egypt',
              ip: '156.204.12.89',
              formattedLocation: '🇪🇬 مصر (Cairo)',
            },
            deviceModel: 'Apple iPhone 15 Pro Max',
            deviceType: 'Mobile',
            os: 'iOS',
            osVersion: '18.2',
            browser: 'Apple Safari',
            browserVersion: '18.2',
            screenResolution: '430×932 (@3x Portrait)',
            viewportResolution: '393×852px',
            batteryLevel: 88,
            isCharging: true,
            networkType: '5G / WiFi',
            downlinkSpeed: '45 Mbps',
            rttLatency: '24 ms',
            deviceMemory: '8 GB+ RAM',
            cpuCores: 6,
            gpuRenderer: 'Apple GPU (A17 Pro)',
            preferredLanguage: 'ar-EG',
            allLanguages: ['ar-EG', 'ar', 'en-US'],
            timezone: 'Africa/Cairo',
            timezoneOffset: 'UTC+03:00',
            isRepeatVisit: false,
            pageViewsInSession: 1,
          });
        }
      }
      return NextResponse.json({ ok: true });
    }

    // 2. Handle Direct Messages & Commands
    if (update.message) {
      const { chat, text, from } = update.message;
      const chatId = chat?.id;
      const firstName = from?.first_name || 'Admin';

      if (!chatId || !text) {
        return NextResponse.json({ ok: true });
      }

      // Security Guard: Reject unauthorized users
      const isAuth = await isAuthorizedTelegramAdmin(chatId);
      if (!isAuth) {
        await sendVisitorBotMessage(chatId, TELEGRAM_UNAUTHORIZED_MESSAGE);
        return NextResponse.json({ ok: true, blocked: true });
      }

      const trimmed = text.trim();

      // Auto-register Chat ID for authorized admin
      await setVisitorAdminChatId(chatId);

      if (trimmed === '/start' || trimmed === '/register') {
        const welcomeMsg = buildWelcomeAdminMessage(chatId, firstName);
        await sendVisitorBotMessage(chatId, welcomeMsg, [
          [
            { text: '🧪 إرسال إشعار تجريبي الآن', callback_data: 'VISITOR_TEST_ALERT' },
            { text: '📊 لوحة التحكم', url: 'https://upstore.one/admin' },
          ],
          [
            { text: '🌐 زيارة المتجر', url: 'https://upstore.one' },
          ],
        ]);
        return NextResponse.json({ ok: true });
      }

      if (trimmed === '/test') {
        await sendVisitorBotMessage(chatId, '🚀 <b>جارٍ محاكاة زائر جديد وإرسال التنبيه الاستخباراتي...</b>');
        await dispatchVisitorAlertToTelegram({
          sessionId: 'TEST_MANUAL_100',
          pathname: '/product/netflix-premium-4k',
          hostname: 'upstore.one',
          referrer: 'https://www.tiktok.com',
          utmSource: 'tiktok_ad',
          utmCampaign: 'winter_sale',
          ip: '197.34.120.45',
          geo: {
            countryCode: 'SA',
            countryNameAr: 'السعودية',
            countryNameEn: 'Saudi Arabia',
            flagEmoji: '🇸🇦',
            city: 'الرياض (Riyadh)',
            region: 'Riyadh Region',
            isp: 'STC Saudi Telecom',
            ip: '197.34.120.45',
            formattedLocation: '🇸🇦 السعودية (Riyadh)',
          },
          deviceModel: 'Samsung Galaxy S24 Ultra',
          deviceType: 'Mobile',
          os: 'Android',
          osVersion: '14.0',
          browser: 'Chrome Mobile',
          browserVersion: '128.0',
          screenResolution: '1440×3120 (@3.5x Portrait)',
          viewportResolution: '412×915px',
          batteryLevel: 94,
          isCharging: false,
          networkType: '5G Mobile',
          downlinkSpeed: '85 Mbps',
          rttLatency: '18 ms',
          deviceMemory: '12 GB+ RAM',
          cpuCores: 8,
          gpuRenderer: 'Adreno 750 (Snapdragon 8 Gen 3)',
          preferredLanguage: 'ar-SA',
          allLanguages: ['ar-SA', 'ar', 'en-US'],
          timezone: 'Asia/Riyadh',
          timezoneOffset: 'UTC+03:00',
          isRepeatVisit: false,
          pageViewsInSession: 1,
        });
        return NextResponse.json({ ok: true });
      }

      if (trimmed === '/status' || trimmed === '/stats' || trimmed === '/ping') {
        const currentAdminId = await getVisitorAdminChatId();
        const statusMsg = `⚡ <b>حالة بوت استخبارات الزوار (@${VISITOR_BOT_USERNAME}):</b>
━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 <b>حالة البوت:</b> نشط ويعمل بأقصى سرعة
👤 <b>المسؤول المسجل:</b> <code>${currentAdminId}</code>
🌐 <b>السيرفر والاستضافة:</b> Vercel Edge Engine
🛡️ <b>نظام الحماية:</b> فلترة البوتات التلقائية وفصل السبام مفعل
⏱️ <b>زمن الاستجابة:</b> فوري (&lt; 100ms)`;

        await sendVisitorBotMessage(chatId, statusMsg, [
          [{ text: '🧪 إرسال إشعار تجريبي', callback_data: 'VISITOR_TEST_ALERT' }],
        ]);
        return NextResponse.json({ ok: true });
      }

      if (trimmed === '/help') {
        const helpMsg = `📖 <b>دليل أوامر بوت استخبارات الزوار:</b>
• <code>/start</code> — تفعيل البوت وتسجيل حسابك كمسؤول
• <code>/status</code> — فحص الاتصال وحالة السيرفر
• <code>/test</code> — إرسال نموذج إشعار زيارة تجريبي
• <code>/stats</code> — عرض معلومات الرصد اللحظي`;

        await sendVisitorBotMessage(chatId, helpMsg);
        return NextResponse.json({ ok: true });
      }

      // Default acknowledgement
      await sendVisitorBotMessage(
        chatId,
        `🤖 <b>أهلاً بك!</b> بوت رصد الزوار يعمل باستمرار. سيصلك إشعار فوري وتفصيلي في هذه المحادثة عند دخول أي زائر جديد للمتجر. استخدم <code>/test</code> للتجربة!`
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[Visitor Bot Webhook Error]:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  const webhookResult = await setVisitorBotWebhook();
  const currentAdmin = await getVisitorAdminChatId();

  return NextResponse.json({
    status: 'active',
    service: 'UpStore Visitor Intelligence Bot Webhook',
    bot: `@${VISITOR_BOT_USERNAME}`,
    token_present: !!VISITOR_BOT_TOKEN,
    webhook_registration: webhookResult,
    admin_chat_id: currentAdmin,
  });
}
