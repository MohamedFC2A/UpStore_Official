import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/utils/security';
import {
  getTelegramBotInfo,
  getTelegramWebhookInfo,
  setTelegramWebhook,
  deleteTelegramWebhook,
  getTelegramBotToken,
  getTelegramBotUsername,
} from '@/utils/telegram';
import {
  PAYMENT_BOT_TOKEN,
  PAYMENT_BOT_USERNAME,
  setPaymentBotWebhook,
} from '@/utils/telegramPaymentBot';
import {
  LOCAL_PAY_BOT_TOKEN,
  LOCAL_PAY_BOT_USERNAME,
  setLocalPayBotWebhook,
} from '@/utils/telegramLocalPayBot';

export const dynamic = 'force-dynamic';

/**
 * GET: Inspect Telegram bot profile and current webhook status
 */
export async function GET(req: Request) {
  try {
    const auth = await requireAdminUser();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const botType = searchParams.get('bot');

    if (botType === 'local_pay' || botType === 'local') {
      const infoRes = await fetch(`https://api.telegram.org/bot${LOCAL_PAY_BOT_TOKEN}/getMe`).then((r) => r.json()).catch(() => null);
      const webhookRes = await fetch(`https://api.telegram.org/bot${LOCAL_PAY_BOT_TOKEN}/getWebhookInfo`).then((r) => r.json()).catch(() => null);

      return NextResponse.json({
        success: true,
        bot_type: 'local_pay',
        configured_token: LOCAL_PAY_BOT_TOKEN ? 'Configured' : 'Missing',
        configured_username: LOCAL_PAY_BOT_USERNAME,
        bot: infoRes?.result || null,
        webhook: webhookRes?.result || null,
      });
    }

    if (botType === 'payment') {
      const infoRes = await fetch(`https://api.telegram.org/bot${PAYMENT_BOT_TOKEN}/getMe`).then((r) => r.json()).catch(() => null);
      const webhookRes = await fetch(`https://api.telegram.org/bot${PAYMENT_BOT_TOKEN}/getWebhookInfo`).then((r) => r.json()).catch(() => null);

      return NextResponse.json({
        success: true,
        bot_type: 'payment',
        configured_token: PAYMENT_BOT_TOKEN ? 'Configured' : 'Missing',
        configured_username: PAYMENT_BOT_USERNAME,
        bot: infoRes?.result || null,
        webhook: webhookRes?.result || null,
      });
    }

    const [botInfo, webhookInfo] = await Promise.all([
      getTelegramBotInfo(),
      getTelegramWebhookInfo(),
    ]);

    return NextResponse.json({
      success: true,
      bot_type: 'main',
      configured_token: getTelegramBotToken() ? 'Configured' : 'Missing',
      configured_username: getTelegramBotUsername(),
      bot: botInfo,
      webhook: webhookInfo,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST: Set or update Telegram Webhook
 */
export async function POST(req: Request) {
  try {
    const auth = await requireAdminUser();
    if (auth.error) return auth.error;

    const body = await req.json().catch(() => ({}));
    const { bot, webhookUrl, secretToken } = body;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://upstore.one';

    if (bot === 'local_pay' || bot === 'local') {
      const targetUrl = webhookUrl || `${appUrl.replace(/\/$/, '')}/api/webhooks/telegram/local-pay`;
      const result = await setLocalPayBotWebhook(targetUrl);
      return NextResponse.json({
        success: result.ok,
        bot: 'local_pay',
        webhook_url: targetUrl,
        result,
      });
    }

    if (bot === 'payment') {
      const targetUrl = webhookUrl || `${appUrl.replace(/\/$/, '')}/api/webhooks/telegram/payment`;
      const result = await setPaymentBotWebhook(targetUrl);
      return NextResponse.json({
        success: result.ok,
        bot: 'payment',
        webhook_url: targetUrl,
        result,
      });
    }

    let targetUrl = webhookUrl;
    if (!targetUrl) {
      targetUrl = `${appUrl.replace(/\/$/, '')}/api/webhooks/telegram`;
    }

    const result = await setTelegramWebhook(targetUrl, secretToken);
    return NextResponse.json({
      success: result.ok,
      bot: 'main',
      webhook_url: targetUrl,
      result,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE: Remove Telegram Webhook (allows long-polling)
 */
export async function DELETE() {
  try {
    const auth = await requireAdminUser();
    if (auth.error) return auth.error;

    const result = await deleteTelegramWebhook();
    return NextResponse.json({
      success: result.ok,
      result,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

