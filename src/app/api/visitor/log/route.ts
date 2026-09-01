import { NextResponse } from 'next/server';
import { detectSmartLocation, extractClientIp } from '@/utils/geo';
import {
  dispatchVisitorAlertToTelegram,
  generateCompositeDeviceHash,
  isDeviceAlreadyAlerted,
  VisitorIntelligencePayload,
} from '@/utils/telegramVisitorLogBot';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    let rawBody: VisitorIntelligencePayload = {};
    try {
      const text = await req.text();
      if (text) {
        rawBody = JSON.parse(text);
      }
    } catch {
      rawBody = {};
    }

    const headers = req.headers;
    const userAgent = rawBody.userAgent || headers.get('user-agent') || 'Unknown';

    // 1. Filter out search engine crawlers & automated ping bots
    const isBotOrCrawler =
      /googlebot|bingbot|yandexbot|duckduckbot|baiduspider|applebot|petalbot|bytespider|gptbot|chatgpt-user|claudebot|perplexitybot|crawler|spider|headlesschrome|lighthouse|pingdom|uptimerobot/i.test(
        userAgent
      );

    if (isBotOrCrawler) {
      return NextResponse.json({ ok: true, ignored: 'crawler' });
    }

    // 2. Extract Server-Verified IP & Geo Intelligence
    const clientIp = extractClientIp(headers);
    const geo = await detectSmartLocation({ headers, ip: clientIp });

    // 3. Extract Cookie-based Device Identifier if available
    const cookieHeader = headers.get('cookie') || '';
    let cookieDeviceId: string | undefined;
    const didMatch = cookieHeader.match(/(?:^|; )upstore_did=([^;]*)/);
    if (didMatch && didMatch[1]) {
      cookieDeviceId = decodeURIComponent(didMatch[1]);
    }
    const hasAlertedCookie = cookieHeader.includes('upstore_alerted=1');

    const isAdminTest = Boolean(
      rawBody.isTest ||
      rawBody.sessionId?.startsWith('ADMIN_TEST') ||
      rawBody.sessionId?.startsWith('TEST_') ||
      rawBody.deviceModel === 'Admin Test Console'
    );

    // Fast-exit if cookie indicates this device was already alerted and not admin test
    if (hasAlertedCookie && !isAdminTest) {
      return NextResponse.json({
        ok: true,
        status: 'already_notified_locally',
        skipped: true,
      });
    }

    const resolvedDeviceId = rawBody.deviceId || cookieDeviceId;

    // 4. Construct Complete Unified Visitor Intelligence Payload
    const hostHeader = headers.get('host') || 'upstore.one';
    const hostname = rawBody.hostname || hostHeader;
    const secChUaModel = rawBody.secChUaModel || headers.get('sec-ch-ua-model') || undefined;
    const secChUaPlatform = rawBody.secChUaPlatform || headers.get('sec-ch-ua-platform') || undefined;

    const fullPayload: VisitorIntelligencePayload = {
      ...rawBody,
      secChUaModel,
      secChUaPlatform,
      deviceId: resolvedDeviceId,
      ip: clientIp,
      geo,
      hostname,
      sessionId: rawBody.sessionId || `${clientIp}_${(rawBody.deviceModel || 'dev').substring(0, 10)}`,
      isRepeatVisit: false,
      pageViewsInSession: 1,
    };

    // 5. Check Server-Side Persistent Deduplication
    const deviceHash = generateCompositeDeviceHash(fullPayload);
    if (!isAdminTest) {
      const alreadyAlerted = await isDeviceAlreadyAlerted(deviceHash);
      if (alreadyAlerted) {
        return NextResponse.json({
          ok: true,
          status: 'already_notified_persistently',
          skipped: true,
          deviceHash,
        });
      }
    }

    // 6. Await Telegram Dispatch (Only 1 notification per unique mobile device)
    const telegramRes = await dispatchVisitorAlertToTelegram(fullPayload);

    return NextResponse.json({
      ok: true,
      telegramDispatched: telegramRes.ok,
      skipped: telegramRes.skipped ?? false,
      deviceHash,
      country: geo.countryNameAr,
    });
  } catch (error: any) {
    console.error('[Visitor API Route Error]:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    service: 'UpStore Visitor Intelligence & Telemetry Engine (Single-Alert Mobile Deduplication)',
    bot: '@upstorelive_bot',
    rule: 'Strict 1-Alert-Per-Mobile-Device (Zero Duplication)',
  });
}

