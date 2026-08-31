import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * IndexNow & Search Engine Notification API Route
 * Allows pinging Bing, Yandex, Google for immediate re-indexing of modified/added product URLs.
 */
async function handleIndexing(urlList?: string[], key?: string) {
  const host = 'upstore.one';
  const baseUrl = `https://${host}`;

  const defaultUrls = [
    baseUrl,
    `${baseUrl}/browse`,
    `${baseUrl}/worldcup`,
    `${baseUrl}/terms`,
    `${baseUrl}/privacy`,
    `${baseUrl}/refund`,
    `${baseUrl}/product/gemini-advanced-18-months`,
    `${baseUrl}/product/canva-pro-1-year`,
    `${baseUrl}/product/canva-pro-lifetime`,
    `${baseUrl}/product/chatgpt-plus-1-month`,
    `${baseUrl}/product/chatgpt-pro-1-month`,
    `${baseUrl}/product/capcut-pro-1-month`,
    `${baseUrl}/product/capcut-pro-1-year`,
    `${baseUrl}/product/cursor-pro-1-month`,
    `${baseUrl}/product/cursor-pro-1-year`,
  ];

  const targetUrls = Array.isArray(urlList) && urlList.length > 0 ? urlList : defaultUrls;
  const indexNowKey = key || 'd6fe9a2846a34f5c0485906a8c7f0450';

  // 1. Submit to IndexNow (Bing, Yandex, Seznam, Naver)
  const indexNowPayload = {
    host,
    key: indexNowKey,
    keyLocation: `https://${host}/${indexNowKey}.txt`,
    urlList: targetUrls,
  };

  let indexNowSuccess = false;
  let indexNowStatus = 0;

  try {
    const indexNowRes = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(indexNowPayload),
    });

    indexNowStatus = indexNowRes.status;
    indexNowSuccess = indexNowRes.ok || indexNowRes.status === 200 || indexNowRes.status === 202;
  } catch (indexNowErr) {
    console.warn('IndexNow ping warning:', indexNowErr);
  }

  // 2. Submit sitemap ping to Google
  try {
    await fetch(`https://www.google.com/ping?sitemap=https://${host}/sitemap.xml`, {
      method: 'GET',
    });
  } catch {
    // Ignore network timeout
  }

  return {
    success: true,
    message: 'Instant search engine indexing request submitted.',
    submittedUrls: targetUrls,
    indexNowStatus,
    indexNowSuccess,
    timestamp: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const result = await handleIndexing();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit indexing' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const result = await handleIndexing(body.urlList, body.key);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error submitting IndexNow ping:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit indexing request' },
      { status: 500 }
    );
  }
}
