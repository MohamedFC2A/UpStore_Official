import { NextResponse } from 'next/server';
import { processTelegramSupportMessage } from '@/utils/telegramSupportEngine';
import { processTelegramMediaMessage } from '@/utils/telegramMediaEngine';
import { sendTelegramMessage } from '@/utils/telegram';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow sufficient time for DeepSeek / Gemini reasoning and realistic human typing delay

export async function POST(req: Request) {
  try {
    const update = await req.json().catch(() => null);

    if (!update) {
      return NextResponse.json({ ok: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    // 1. Handle incoming standard messages
    if (update.message) {
      const { chat, text, photo, document, caption, from } = update.message;
      const chatId = chat?.id;
      const firstName = from?.first_name || '';

      if (!chatId) {
        return NextResponse.json({ ok: true });
      }

      // A. Handle Image / Photo Messages (with Gemini 2.5 Flash Lite Vision & Monthly Quota Check)
      if (photo && Array.isArray(photo) && photo.length > 0) {
        const bestPhoto = photo[photo.length - 1];
        if (bestPhoto?.file_id) {
          await processTelegramMediaMessage(chatId, bestPhoto.file_id, caption, firstName);
          return NextResponse.json({ ok: true });
        }
      }

      // B. Handle Document / PDF / File Messages (with Gemini 2.5 Flash Lite Vision & Monthly Quota Check)
      if (document && document.file_id) {
        await processTelegramMediaMessage(chatId, document.file_id, caption, firstName);
        return NextResponse.json({ ok: true });
      }

      // C. Handle Standard Text Messages & Commands (/start, /catalog, /bybit, etc.)
      if (text && typeof text === 'string') {
        await processTelegramSupportMessage(chatId, text, update.message.message_id, undefined, firstName);
      }
    }

    // 2. Handle Callback Queries (Inline Button Clicks — Instant In-Place Updates)
    if (update.callback_query) {
      const { id, from, message, data } = update.callback_query;
      const chatId = message?.chat?.id || from?.id;

      if (chatId && data) {
        await processTelegramSupportMessage(chatId, data, message?.message_id, id, from?.first_name);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[Telegram Webhook Error]:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    service: 'UpStore Telegram Intelligent Support Bot Webhook',
    bot: '@UpStore_Support_bot',
    escalation_help: '@UPSTORE_HELP',
    ai_engine: 'DeepSeek + Gemini Multimodal Vision',
    monthly_media_limit: 3,
  });
}
