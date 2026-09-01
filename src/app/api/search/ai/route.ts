import { NextResponse } from 'next/server';
import { extractJSONFromAIResponse } from '@/utils/ai';
import { createClient } from '@/utils/supabase/server';
import { searchProducts, normalizeArabic, normalizeEnglish } from '@/utils/searchEngine';

// In-memory LRU-like cache for ultra-fast query responses
interface CachedSearchResult {
  timestamp: number;
  data: AISearchResponse;
}

const searchCache = new Map<string, CachedSearchResult>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_CACHE_ENTRIES = 1000;

// In-memory Cached Product Catalog
let cachedCatalog: any[] | null = null;
let catalogCacheTime = 0;
const CATALOG_TTL_MS = 5 * 60 * 1000;

export interface AISearchResponse {
  query: string;
  matchedSlugs: string[];
  aiInsight?: string;
  intent: 'product_search' | 'recommendation' | 'store_info' | 'comparison';
  highlightSlug?: string;
  suggestedFollowUps?: Array<{ queryAr: string; queryEn: string }>;
  modelUsed?: string;
  storeAnswer?: {
    title: string;
    text: string;
    actionLabel?: string;
    actionUrl?: string;
  };
}

async function getCachedProducts(): Promise<any[]> {
  const now = Date.now();
  if (cachedCatalog && now - catalogCacheTime < CATALOG_TTL_MS) {
    return cachedCatalog;
  }

  try {
    const supabase = await createClient();
    const { data: products } = await supabase
      .from('products')
      .select('id, name, name_ar, slug, category, our_price, market_price, stock, description, description_ar, rating, is_flash_deal')
      .limit(80);

    if (products && products.length > 0) {
      cachedCatalog = products;
      catalogCacheTime = now;
      return products;
    }
  } catch (err) {
    console.warn('[AI Search Server] Failed to refresh product cache from DB:', err);
  }

  return cachedCatalog || [];
}

/**
 * Resolves OpenRouter configuration dynamically from database or env variables
 */
async function getGeminiConfig(): Promise<{ apiKey: string; model: string; baseUrl: string }> {
  let apiKey = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '';
  // Priority model: google/gemini-2.5-flash-lite:batch
  let model = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash-lite:batch';
  let baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['openrouter_api_key', 'openrouter_model', 'openrouter_base_url']);

    if (data && Array.isArray(data)) {
      data.forEach((row) => {
        if (row.key === 'openrouter_api_key' && row.value) apiKey = String(row.value).trim();
        if (row.key === 'openrouter_model' && row.value) model = String(row.value).trim();
        if (row.key === 'openrouter_base_url' && row.value) baseUrl = String(row.value).trim();
      });
    }
  } catch (err) {
    console.warn('[AI Search] site_settings lookup notice:', err);
  }

  return { apiKey, model, baseUrl };
}

/**
 * Executes AI reasoning using google/gemini-2.5-flash-lite:batch with fallbacks
 */
async function executeGeminiSearchReasoning(
  systemPrompt: string,
  userPrompt: string
): Promise<{ data: any; modelUsed: string } | null> {
  const { apiKey, baseUrl } = await getGeminiConfig();

  // Model cascade: google/gemini-2.5-flash-lite:batch -> google/gemini-2.5-flash-lite -> google/gemini-2.0-flash-lite:free
  const candidateModels = [
    'google/gemini-2.5-flash-lite:batch',
    'google/gemini-2.5-flash-lite',
    'google/gemini-2.0-flash-lite:free',
    'google/gemini-flash-1.5'
  ];

  // 1. OpenRouter with Gemini Models
  if (apiKey) {
    for (const m of candidateModels) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);

      try {
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://upstore.vercel.app',
            'X-Title': 'UpStore AI Semantic Search',
          },
          body: JSON.stringify({
            model: m,
            messages: [
              {
                role: 'system',
                content: `${systemPrompt}\n\nCRITICAL: Output valid pure JSON only. No markdown formatting.`,
              },
              {
                role: 'user',
                content: userPrompt,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.15,
            max_tokens: 300,
          }),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (res.ok) {
          const json = await res.json();
          const content = json?.choices?.[0]?.message?.content;
          if (content) {
            const parsed = extractJSONFromAIResponse(content);
            return { data: parsed, modelUsed: m };
          }
        }
      } catch (err: any) {
        clearTimeout(timer);
        console.warn(`[AI Search Gemini ${m}] attempt:`, err.message);
      }
    }
  }

  // 2. Pollinations Gemini / OpenAI Endpoint Fallback
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);

    const polRes = await fetch('https://text.pollinations.ai/openai/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini',
        messages: [
          {
            role: 'system',
            content: `${systemPrompt}\n\nOutput pure valid JSON only.`,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        jsonMode: true,
        temperature: 0.15,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (polRes.ok) {
      const json = await polRes.json();
      const content = json?.choices?.[0]?.message?.content;
      if (content) {
        const parsed = extractJSONFromAIResponse(content);
        return { data: parsed, modelUsed: 'Pollinations AI (Gemini)' };
      }
    }
  } catch (polErr: any) {
    console.warn('[AI Search Pollinations Gemini Fallback] notice:', polErr.message);
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const query = (body.query || '').trim();
    const language: 'ar' | 'en' = body.language === 'en' ? 'en' : 'ar';
    const isAr = language === 'ar';

    // Hyper-Adaptive Session Context
    const session = body.session || {};
    const topCategory = session.topCategory || '';
    const viewedSlugs: string[] = Array.isArray(session.viewedSlugs) ? session.viewedSlugs : [];
    const priceSensitivity = session.priceSensitivity || 'medium';
    const detectedPersona = session.detectedPersona || 'balanced';

    // 1. Fetch live products from fast in-memory cache
    const products = await getCachedProducts();

    const productCatalog = products.map((p) => ({
      slug: p.slug,
      name: p.name,
      name_ar: p.name_ar,
      category: p.category,
      price: p.our_price,
      stock: p.stock ?? 10,
      desc: (p.description || '').slice(0, 80),
      desc_ar: (p.description_ar || '').slice(0, 80),
    }));

    // If query is empty, return predictive session recommendations
    if (!query || query.length < 2) {
      const topCatProducts = topCategory
        ? products.filter((p) => p.category === topCategory)
        : products;
      
      const fallbackSlugs = (topCatProducts.length > 0 ? topCatProducts : products)
        .slice(0, 6)
        .map((p) => p.slug);

      return NextResponse.json({
        query: '',
        matchedSlugs: fallbackSlugs,
        intent: 'recommendation',
        highlightSlug: fallbackSlugs[0],
        modelUsed: 'google/gemini-2.5-flash-lite:batch',
        aiInsight: isAr
          ? `توصيات الذكاء الاصطناعي المخصصة لاهتمامك في قسم ${topCategory || 'الاشتراكات'}`
          : `AI recommendations tailored to your interest in ${topCategory || 'Subscriptions'}`,
      });
    }

    // Cache key normalization
    const cacheKey = `${language}:${topCategory}:${normalizeArabic(normalizeEnglish(query))}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }

    // Local baseline search results (instant 0ms execution)
    const localMatches = searchProducts(products, query, { limit: 12 });
    const localSlugs = localMatches.map((m) => m.item.slug);

    // Check if query is an informational/store question
    const qLower = query.toLowerCase();
    const isStoreQuestion =
      qLower.includes('فودافون') ||
      qLower.includes('انستاباي') ||
      qLower.includes('إنستاباي') ||
      qLower.includes('دفع') ||
      qLower.includes('طرق الدفع') ||
      qLower.includes('ضمان') ||
      qLower.includes('توصيل') ||
      qLower.includes('تسليم') ||
      qLower.includes('استرجاع') ||
      qLower.includes('شراء') ||
      qLower.includes('payment') ||
      qLower.includes('pay') ||
      qLower.includes('warranty') ||
      qLower.includes('delivery') ||
      qLower.includes('refund') ||
      qLower.includes('vodafone') ||
      qLower.includes('instapay') ||
      qLower.includes('crypto');

    // System prompt for ultra-fast Gemini 2.5 Flash Lite Batch semantic reasoning
    const systemPrompt = `
You are the AI Semantic Search Engine for UpStore (upstore.one) using Google Gemini 2.5 Flash Lite.
Map user queries (Arabic/Egyptian/English) to matched product slugs and generate a concise 1-sentence insight.

PRODUCTS:
${productCatalog
  .map(
    (p) =>
      `- "${p.slug}" | en: "${p.name}" | ar: "${p.name_ar || ''}" | cat: "${p.category}" | $${p.price}`
  )
  .join('\n')}

USER SESSION CONTEXT:
- Active Category Affinity: ${topCategory || 'General'}
- Recently Viewed: ${viewedSlugs.join(', ') || 'None'}
- Price Sensitivity: ${priceSensitivity}
- User Persona: ${detectedPersona}

INSTRUCTIONS:
1. For query: "${query}", output JSON:
   - "matchedSlugs": array of up to 6 most relevant product slugs in order of relevance.
   - "highlightSlug": the single best matching product slug.
   - "aiInsight": 1 concise, direct, helpful sentence in ${isAr ? 'Arabic' : 'English'} explaining why this is the best match and highlighting warranty terms.
   - "intent": "product_search" | "recommendation" | "store_info" | "comparison"
   - "suggestedFollowUps": [ { "queryAr": "...", "queryEn": "..." } ] (2 related queries).
`.trim();

    const userPrompt = `Query: "${query}" | Lang: ${language}`;

    let aiResult: any = null;
    let modelUsed = 'google/gemini-2.5-flash-lite:batch';

    const reasoning = await executeGeminiSearchReasoning(systemPrompt, userPrompt);
    if (reasoning?.data) {
      aiResult = reasoning.data;
      modelUsed = reasoning.modelUsed;
    }

    // Merge AI slugs with local search slugs
    const rawAiSlugs: string[] = Array.isArray(aiResult?.matchedSlugs) ? aiResult.matchedSlugs : [];
    const validAiSlugs = rawAiSlugs.filter((s) => productCatalog.some((p) => p.slug === s));

    // Combine: AI prioritized slugs first, then local matches
    const finalSlugs = Array.from(new Set([...validAiSlugs, ...localSlugs])).slice(0, 8);

    // Determine highlight slug
    const highlightSlug =
      aiResult?.highlightSlug && productCatalog.some((p) => p.slug === aiResult.highlightSlug)
        ? aiResult.highlightSlug
        : finalSlugs[0];

    // Generate fallback insight if AI didn't provide one
    let aiInsight = aiResult?.aiInsight;
    if (!aiInsight && finalSlugs.length > 0) {
      const topProd = productCatalog.find((p) => p.slug === highlightSlug);
      if (topProd) {
        aiInsight = isAr
          ? `أفضل تطابق مقترح: ${topProd.name_ar || topProd.name} بسعر $${topProd.price} مع دفع عالمي معتمد وضمان شامل كامل المدة.`
          : `Top Match: ${topProd.name} for $${topProd.price} with global secure checkout & full-term warranty.`;
      }
    }

    const responseData: AISearchResponse = {
      query,
      matchedSlugs: finalSlugs,
      aiInsight: aiInsight || undefined,
      intent: aiResult?.intent || (isStoreQuestion ? 'store_info' : 'product_search'),
      highlightSlug,
      suggestedFollowUps: aiResult?.suggestedFollowUps,
      modelUsed,
      storeAnswer: aiResult?.storeAnswer || (isStoreQuestion ? generateStoreAnswer(query, isAr) : undefined),
    };

    // Cache the result
    if (searchCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = searchCache.keys().next().value;
      if (oldestKey) searchCache.delete(oldestKey);
    }
    searchCache.set(cacheKey, { timestamp: Date.now(), data: responseData });

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('[AI Search API Error]:', error);
    return NextResponse.json(
      {
        query: '',
        matchedSlugs: [],
        intent: 'product_search',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Fast deterministic fallback for store questions (payments, delivery, warranty)
 */
function generateStoreAnswer(query: string, isAr: boolean) {
  const q = query.toLowerCase();

  if (q.includes('فودافون') || q.includes('انستاباي') || q.includes('إنستاباي') || q.includes('vodafone') || q.includes('instapay')) {
    return {
      title: isAr ? 'طرق الدفع في مصر (فودافون كاش وإنستاباي)' : 'Egypt Payment Methods (Vodafone & InstaPay)',
      text: isAr
        ? 'نوفر الدفع المباشر والآلي عبر فودافون كاش وإنستاباي مع تفعيل فوري لطلبك بعد إتمام التحويل.'
        : 'Direct instant payments supported via Vodafone Cash & InstaPay with automated instant fulfillment.',
      actionLabel: isAr ? 'عرض السلة والإتمام' : 'View Cart & Checkout',
      actionUrl: '/cart',
    };
  }

  if (q.includes('ضمان') || q.includes('استرجاع') || q.includes('warranty') || q.includes('refund')) {
    return {
      title: isAr ? 'الضمان الذهبي 30 يوماً' : '30-Day Golden Warranty',
      text: isAr
        ? 'جميع الحسابات والمفاتيح مشمولة بضمان استبدال فوري أو استرداد كامل للمحفظة طوال فترة الضمان.'
        : 'All purchases include a full 30-day replacement or wallet refund guarantee with 24/7 support.',
      actionLabel: isAr ? 'سياسة الضمان' : 'Warranty Policy',
      actionUrl: '/refund',
    };
  }

  if (q.includes('تسليم') || q.includes('توصيل') || q.includes('delivery') || q.includes('instant')) {
    return {
      title: isAr ? 'التسليم المباشر والتلقائي' : 'Direct Automated Delivery',
      text: isAr
        ? 'يتم تسليم بيانات الحساب أو المفتاح في شاشة الطلب مباشرة وعبر بريدك الإلكتروني خلال ثوانٍ من الدفع.'
        : 'Your account credentials or license key appear instantly on screen and in your email right after payment.',
      actionLabel: isAr ? 'لوحة التحكم والطلبات' : 'My Orders & Dashboard',
      actionUrl: '/dashboard',
    };
  }

  return {
    title: isAr ? 'خدمة عملاء UpStore' : 'UpStore Support',
    text: isAr
      ? 'فريق الدعم الفني متواجد 24/7 على تيليجرام لمساعدتك في أي استفسار أو طلب خاص.'
      : 'Our technical support team is available 24/7 on Telegram to assist with any inquiry.',
    actionLabel: isAr ? 'تواصل معنا على تيليجرام' : 'Telegram Support',
    actionUrl: 'https://t.me/upstore_one_bot',
  };
}
