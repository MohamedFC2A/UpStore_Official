import { NextResponse } from 'next/server';
import { requireAdminUser, enforceSameOriginRequest } from '@/utils/security';
import { createClient } from '@/utils/supabase/server';

export interface SerperImageItem {
  title: string;
  imageUrl: string;
  thumbnailUrl: string;
  previewUrl: string;
  imageWidth?: number;
  imageHeight?: number;
  source?: string;
  domain?: string;
  link?: string;
  isPng?: boolean;
}

const DEFAULT_SERPER_KEY = 'dc82cdef2e35868541939cf3616311cca0e758e6';

// Helper: Clean up noisy image titles
const cleanImageTitle = (raw: string, fallback: string): string => {
  if (!raw) return fallback;
  return (
    raw
      .replace(
        /\b(File:|Vector|Logo|Icon|Icons|3D|PNG|SVG|AI|Free Download|Transparent Background|Transparent|HD|HQ|Stock|Clipart|Image|Photo|Wallpaper|Graphics|Design)\b/gi,
        ''
      )
      .replace(/[—–\-:|_#0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || fallback
  );
};

/**
 * High-speed Gemini Flash keyword extraction & query generation
 */
async function generateGeminiFlashImageQueries(
  rawQuery: string
): Promise<{ brand: string; queries: string[] }> {
  // Fast rule-based baseline
  const basicClean = rawQuery
    .replace(
      /\b(1|3|6|12|18|24)\s*(month|months|year|years|شهر|أشهر|سنة|سنوات|حساب|اشتراك|بريميوم|اشتراكات|أدفانسد|برو|بلس|VIP|Ultra|Pro|Plus|Advanced|Lifetime|مدى الحياة|بضمان شامل)\b/gi,
      ''
    )
    .replace(/[—–\-:()\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let brand = basicClean || rawQuery;
  let queries = [
    `${brand} 3d app icon transparent png pinterest`,
    `${brand} official logo transparent background png`,
    `${brand} app icon badge transparent png`,
    `${brand} vector logo png transparent`,
  ];

  try {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '';
    const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

    if (apiKey) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1200); // 1.2s fast timeout for Gemini

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://upstore.vercel.app',
          'X-Title': 'UpStore Gemini Flash Image Search',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite:batch',
          messages: [
            {
              role: 'system',
              content:
                'You are an AI Search Optimizer. Given a product title in Arabic or English, extract the pure English brand/app name and output 4 laser-focused search queries targeting STRICTLY transparent PNG 3D icons, vector badges, and official logos with zero background. Return pure JSON: { "brand": string, "queries": string[] } with no markdown.',
            },
            {
              role: 'user',
              content: `Product: "${rawQuery}"`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 150,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (parsed.brand) brand = parsed.brand;
          if (Array.isArray(parsed.queries) && parsed.queries.length > 0) {
            queries = parsed.queries.map((q: string) =>
              q.toLowerCase().includes('png') ? q : `${q} transparent png`
            );
          }
        }
      }
    }
  } catch {
    // If Gemini fails or times out, fallback immediately to high-precision rule-based queries
  }

  return { brand, queries };
}

export async function POST(req: Request) {
  try {
    const originError = await enforceSameOriginRequest(req);
    if (originError) return originError;

    const auth = await requireAdminUser();
    if (auth.error || !auth.supabase) {
      return auth.error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query }: { query: string; category?: string } = await req.json();

    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'Search query is required.' }, { status: 400 });
    }

    // Resolve Serper API key
    let apiKey = process.env.SERPER_API_KEY || '';
    if (!apiKey) {
      try {
        const { data: setting } = await auth.supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'serper_api_key')
          .single();
        if (setting?.value && typeof setting.value === 'string') {
          apiKey = setting.value.trim();
        }
      } catch {
        // continue
      }
    }
    if (!apiKey) {
      apiKey = DEFAULT_SERPER_KEY;
    }

    // 1. Optimize queries with Gemini 2.5 Flash Lite
    const { brand, queries } = await generateGeminiFlashImageQueries(query);

    const resultsMap = new Map<string, SerperImageItem>();

    // 2. Execute parallel Serper queries requesting 20 images each (up to 80 candidate images)
    const searchPromises = queries.map(async (q) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      try {
        const res = await fetch('https://google.serper.dev/images', {
          method: 'POST',
          headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q,
            gl: 'us',
            hl: 'en',
            num: 20,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          return [];
        }

        const data = await res.json();
        return (data.images || []) as any[];
      } catch {
        return [];
      }
    });

    const settledResults = await Promise.all(searchPromises);

    for (const batch of settledResults) {
      for (const img of batch) {
        if (!img.imageUrl || resultsMap.has(img.imageUrl)) continue;

        const imgLower = img.imageUrl.toLowerCase();
        const titleLower = (img.title || '').toLowerCase();

        const isPng =
          imgLower.includes('.png') ||
          imgLower.includes('.webp') ||
          imgLower.includes('upload.wikimedia') ||
          titleLower.includes('png') ||
          titleLower.includes('transparent') ||
          titleLower.includes('vector') ||
          titleLower.includes('icon');

        const thumb = img.thumbnailUrl || img.imageUrl;
        const cleanedTitle = cleanImageTitle(img.title, brand);
        const proxyPreview = `/api/admin/ai/proxy-image?url=${encodeURIComponent(img.imageUrl)}`;

        resultsMap.set(img.imageUrl, {
          title: cleanedTitle || brand,
          imageUrl: img.imageUrl,
          thumbnailUrl: thumb,
          previewUrl: proxyPreview,
          imageWidth: img.imageWidth || 512,
          imageHeight: img.imageHeight || 512,
          source: img.source || img.domain || 'Web',
          domain: (img.domain || '').replace('www.', ''),
          link: img.link || '',
          isPng,
        });
      }
    }

    const allImages = Array.from(resultsMap.values());

    // Sort: High-res PNGs, Pinterest, IconScout, Dribbble, Wikimedia sources prioritized
    allImages.sort((a, b) => {
      const aDomain = a.domain?.toLowerCase() || '';
      const bDomain = b.domain?.toLowerCase() || '';

      const aScore =
        (a.isPng ? 8 : 0) +
        (aDomain.includes('wikimedia') ? 5 : 0) +
        (aDomain.includes('iconscout') || aDomain.includes('flaticon') ? 5 : 0) +
        (aDomain.includes('pinterest') ? 4 : 0) +
        (aDomain.includes('dribbble') || aDomain.includes('freelogovectors') ? 4 : 0) +
        ((a.imageWidth || 0) >= 400 ? 3 : 0);

      const bScore =
        (b.isPng ? 8 : 0) +
        (bDomain.includes('wikimedia') ? 5 : 0) +
        (bDomain.includes('iconscout') || bDomain.includes('flaticon') ? 5 : 0) +
        (bDomain.includes('pinterest') ? 4 : 0) +
        (bDomain.includes('dribbble') || bDomain.includes('freelogovectors') ? 4 : 0) +
        ((b.imageWidth || 0) >= 400 ? 3 : 0);

      return bScore - aScore;
    });

    return NextResponse.json({
      images: allImages.slice(0, 48), // Return up to 48 high-quality images
      brand,
      query,
      count: allImages.length,
    });
  } catch (error: any) {
    console.error('[Serper Search Images Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search product images.' },
      { status: 500 }
    );
  }
}
