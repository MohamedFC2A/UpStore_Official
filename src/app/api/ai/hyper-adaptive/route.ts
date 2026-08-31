import { NextResponse } from 'next/server';
import { generateStructuredAIResponse } from '@/utils/ai';
import { createClient } from '@/utils/supabase/server';

export interface HyperAdaptiveSessionData {
  language?: 'ar' | 'en';
  currentPath?: string;
  viewedSlugs?: string[];
  topCategory?: string;
  categoryDwellTimes?: Record<string, number>;
  searchHistory?: string[];
  cartCount?: number;
  cartSlugs?: string[];
  hesitationLevel?: 'none' | 'low' | 'moderate' | 'high';
  priceSensitivity?: 'low' | 'medium' | 'high';
  detectedPersona?: string;
}

export interface HyperAdaptiveAIResponse {
  detectedIntentAr: string;
  detectedIntentEn: string;
  predictedNextStepAr: string;
  predictedNextStepEn: string;
  suggestedSearchQueries: Array<{ queryAr: string; queryEn: string }>;
  recommendedSlugs: string[];
  smartIntervention?: {
    type: 'payment_guide' | 'warranty_trust' | 'instant_discount' | 'comparison_helper' | 'quick_checkout' | 'currency_match' | 'self_healed_notice';
    titleAr: string;
    titleEn: string;
    descAr: string;
    descEn: string;
    actionLabelAr: string;
    actionLabelEn: string;
    actionUrl?: string;
    actionSlug?: string;
  };
}

// In-memory cache for session intent evaluations
const intentCache = new Map<string, { timestamp: number; data: HyperAdaptiveAIResponse }>();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes
const MAX_CACHE_SIZE = 500;

// In-memory Cached Product Catalog
let cachedCatalog: any[] | null = null;
let catalogCacheTime = 0;
const CATALOG_TTL_MS = 5 * 60 * 1000;

async function getCachedProducts(): Promise<any[]> {
  const now = Date.now();
  if (cachedCatalog && now - catalogCacheTime < CATALOG_TTL_MS) {
    return cachedCatalog;
  }

  try {
    const supabase = await createClient();
    const { data: products } = await supabase
      .from('products')
      .select('id, name, name_ar, slug, category, our_price, market_price, stock, description, description_ar, rating')
      .limit(60);

    if (products && products.length > 0) {
      cachedCatalog = products;
      catalogCacheTime = now;
      return products;
    }
  } catch (err) {
    console.warn('[Hyper-Adaptive AI Server] Catalog DB fetch warning:', err);
  }

  return cachedCatalog || [];
}

export async function POST(req: Request) {
  try {
    const body: HyperAdaptiveSessionData = await req.json().catch(() => ({}));
    const language = body.language === 'en' ? 'en' : 'ar';

    const viewed = body.viewedSlugs || [];
    const searches = body.searchHistory || [];
    const topCat = body.topCategory || 'Subscriptions';
    const cartCount = body.cartCount || 0;
    const cartSlugs = body.cartSlugs || [];
    const hesitation = body.hesitationLevel || 'none';
    const persona = body.detectedPersona || 'balanced';

    // Generate unique session hash for caching
    const sessionKey = `${language}:${persona}:${topCat}:${viewed.slice(-3).join(',')}:${searches.slice(-2).join(',')}:${cartCount}:${hesitation}`;
    const cached = intentCache.get(sessionKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }

    const products = await getCachedProducts();
    const productCatalog = products.map((p) => ({
      slug: p.slug,
      name: p.name,
      name_ar: p.name_ar,
      category: p.category,
      price: p.our_price,
    }));

    const systemPrompt = `
You are the central Hyper-Adaptive AI Mind Engine for UpStore (upstore.one), the ultra-affordable digital accounts and licenses marketplace.
Your goal is to deeply analyze the user's active session behavior, understand their true emotional intent, predict their exact next move before they make it, and generate hyper-tailored search recommendations and empathetic proactive micro-interventions.

AVAILABLE STORE PRODUCTS:
${productCatalog.map((p) => `- slug: "${p.slug}" | en: "${p.name}" | ar: "${p.name_ar || ''}" | cat: "${p.category}" | price: $${p.price}`).join('\n')}

USER SESSION STATE:
- Primary Category Affinity: ${topCat}
- Recently Viewed Products: ${viewed.length ? viewed.join(', ') : 'None yet (Homepage / browsing)'}
- Recent Search Queries: ${searches.length ? searches.join(', ') : 'None yet'}
- Items in Cart: ${cartCount} (${cartSlugs.join(', ')})
- Hesitation / Decision Paralysis Level: ${hesitation}
- Behavioral Persona: ${persona}
- Current Page Path: ${body.currentPath || '/'}

OUTPUT INSTRUCTIONS:
Return a single JSON object strictly matching this schema:
{
  "detectedIntentAr": "جملة واحدة باللغة العربية توضح ما يريده المستخدم بدقة فائقة وبدون حشو مع لمسة تعاطف ذكية",
  "detectedIntentEn": "1 concise sentence in English summarizing the user's immediate intent with emotional intelligence",
  "predictedNextStepAr": "توقع الخطوة القادمة للمستخدم بالعربية (مثلاً: يبحث عن أرخص اشتراك، أو ينقر على زر الشراء)",
  "predictedNextStepEn": "Prediction of the user's next action in English",
  "suggestedSearchQueries": [
    { "queryAr": "استفسار بحث عربي مقترح", "queryEn": "Suggested search query in English" }
  ],
  "recommendedSlugs": ["slug-1", "slug-2", "slug-3"],
  "smartIntervention": {
    "type": "payment_guide" | "warranty_trust" | "instant_discount" | "comparison_helper" | "quick_checkout" | "currency_match" | "self_healed_notice",
    "titleAr": "عنوان التدخل الذكي",
    "titleEn": "Smart intervention title",
    "descAr": "شرح الفائدة والضمان المباشر والتعاطف مع العميل",
    "descEn": "Clear benefit description",
    "actionLabelAr": "نص الزر بالعربية",
    "actionLabelEn": "Button text in English",
    "actionUrl": "/cart or /refund or product link",
    "actionSlug": "target product slug if relevant"
  }
}
Note: "smartIntervention" should only be included if the user shows hesitation, has items in cart, or has viewed 2+ products. Otherwise, it can be null.
`.trim();

    const userPrompt = `Analyze user session and output hyper-adaptive predictions.`;

    let aiResult: HyperAdaptiveAIResponse | null = null;

    try {
      const { data } = await generateStructuredAIResponse<HyperAdaptiveAIResponse>(
        systemPrompt,
        userPrompt,
        {
          model: 'deepseek-v4-flash',
          temperature: 0.2,
          max_tokens: 350,
          timeoutMs: 4500,
        }
      );
      aiResult = data;
    } catch (aiErr: any) {
      console.warn('[Hyper-Adaptive AI Server] AI generation fallback:', aiErr.message);
    }

    // Fast deterministic fallback if AI timeout/fails
    const fallbackResponse: HyperAdaptiveAIResponse = generateDeterministicFallback(
      topCat,
      viewed,
      cartCount,
      hesitation,
      products
    );

    const finalResponse: HyperAdaptiveAIResponse = {
      detectedIntentAr: aiResult?.detectedIntentAr || fallbackResponse.detectedIntentAr,
      detectedIntentEn: aiResult?.detectedIntentEn || fallbackResponse.detectedIntentEn,
      predictedNextStepAr: aiResult?.predictedNextStepAr || fallbackResponse.predictedNextStepAr,
      predictedNextStepEn: aiResult?.predictedNextStepEn || fallbackResponse.predictedNextStepEn,
      suggestedSearchQueries: Array.isArray(aiResult?.suggestedSearchQueries) && aiResult.suggestedSearchQueries.length > 0
        ? aiResult.suggestedSearchQueries
        : fallbackResponse.suggestedSearchQueries,
      recommendedSlugs: Array.isArray(aiResult?.recommendedSlugs) && aiResult.recommendedSlugs.length > 0
        ? aiResult.recommendedSlugs.filter((s) => productCatalog.some((p) => p.slug === s))
        : fallbackResponse.recommendedSlugs,
      smartIntervention: aiResult?.smartIntervention || fallbackResponse.smartIntervention,
    };

    // Cache result
    if (intentCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = intentCache.keys().next().value;
      if (oldestKey) intentCache.delete(oldestKey);
    }
    intentCache.set(sessionKey, { timestamp: Date.now(), data: finalResponse });

    return NextResponse.json(finalResponse);
  } catch (err: any) {
    console.error('[Hyper-Adaptive AI Route Error]:', err);
    return NextResponse.json({
      detectedIntentAr: 'استكشاف أفضل العروض الرقمية المتوفرة',
      detectedIntentEn: 'Browsing top digital subscription deals',
      predictedNextStepAr: 'استعراض تفاصيل المنتج والخصم',
      predictedNextStepEn: 'Viewing product discount and specifications',
      suggestedSearchQueries: [
        { queryAr: 'نتفليكس 4K', queryEn: 'Netflix Premium 4K' },
        { queryAr: 'شات جي بي تي بلس', queryEn: 'ChatGPT Plus' },
      ],
      recommendedSlugs: ['netflix-premium-4k-1-month', 'chatgpt-plus-1-month'],
    });
  }
}

function generateDeterministicFallback(
  topCat: string,
  viewed: string[],
  cartCount: number,
  hesitation: string,
  products: any[]
): HyperAdaptiveAIResponse {
  const isStreaming = topCat.toLowerCase().includes('sub') || viewed.some((s) => s.includes('netflix') || s.includes('spotify') || s.includes('youtube'));
  const isAI = topCat.toLowerCase().includes('acc') || viewed.some((s) => s.includes('gpt') || s.includes('gemini') || s.includes('ai'));
  const isGaming = topCat.toLowerCase().includes('game') || viewed.some((s) => s.includes('xbox') || s.includes('steam'));

  let detectedIntentAr = 'استكشاف أفضل العروض الرقمية بأقل سعر';
  let detectedIntentEn = 'Exploring premium digital goods at lowest prices';
  let predictedNextStepAr = 'مقارنة الاشتراكات وسرعة تسليم الطلب';
  let predictedNextStepEn = 'Comparing subscription terms and delivery speed';
  let suggestedSearchQueries = [
    { queryAr: 'نتفليكس 4K ضمان 30 يوم', queryEn: 'Netflix Premium 4K 30 Days' },
    { queryAr: 'شات جي بي تي بلس', queryEn: 'ChatGPT Plus' },
    { queryAr: 'يوتيوب بريميوم بدون إعلانات', queryEn: 'YouTube Premium No Ads' },
  ];

  let recommendedSlugs = ['netflix-premium-4k-1-month', 'chatgpt-plus-1-month', 'spotify-premium-1-month'];

  if (isStreaming) {
    detectedIntentAr = 'البحث عن أفضل اشتراكات البث والأفلام بجودة 4K والتسليم المباشر';
    detectedIntentEn = 'Seeking top 4K streaming subscriptions with direct dispatch';
    predictedNextStepAr = 'مقارنة اشتراك نتفليكس مع يوتيوب وسبوتيفاي';
    predictedNextStepEn = 'Comparing Netflix with YouTube & Spotify';
    suggestedSearchQueries = [
      { queryAr: 'نتفليكس بريميوم 4K', queryEn: 'Netflix Premium 4K' },
      { queryAr: 'يوتيوب بريميوم 12 شهر', queryEn: 'YouTube Premium 12 Months' },
      { queryAr: 'سبوتيفاي بريميوم حساب خاص', queryEn: 'Spotify Premium Private' },
    ];
    recommendedSlugs = ['netflix-premium-4k-1-month', 'youtube-premium-12-months', 'spotify-premium-1-month'];
  } else if (isAI) {
    detectedIntentAr = 'الاهتمام بحسابات الذكاء الاصطناعي وأدوات الإنتاجية البرمجية';
    detectedIntentEn = 'Focusing on cutting-edge AI tools and developer subscriptions';
    predictedNextStepAr = 'اختيار اشتراك ChatGPT Plus أو Gemini Advanced';
    predictedNextStepEn = 'Choosing between ChatGPT Plus and Gemini Advanced';
    suggestedSearchQueries = [
      { queryAr: 'ChatGPT Plus تفعيل فوري', queryEn: 'ChatGPT Plus Instant Activation' },
      { queryAr: 'Gemini Advanced بريميوم', queryEn: 'Gemini Advanced Premium' },
    ];
    recommendedSlugs = ['chatgpt-plus-1-month', 'gemini-advanced-1-month'];
  } else if (isGaming) {
    detectedIntentAr = 'البحث عن مفاتيح ألعاب واشتراكات الجيمنج بأسعار مخفضة';
    detectedIntentEn = 'Looking for discounted gaming keys and game passes';
    predictedNextStepAr = 'التحقق من توافق كود اللعبة مع الحساب';
    predictedNextStepEn = 'Checking key regional compatibility and activation';
    suggestedSearchQueries = [
      { queryAr: 'Xbox Game Pass Ultimate', queryEn: 'Xbox Game Pass Ultimate' },
      { queryAr: 'مفاتيح ستيم الأصلية', queryEn: 'Original Steam Keys' },
    ];
    recommendedSlugs = ['xbox-game-pass-ultimate-1-month'];
  }

  let smartIntervention: any = undefined;

  if (cartCount > 0) {
    smartIntervention = {
      type: 'quick_checkout',
      titleAr: 'لديك منتجات في السلة — الدفع متاح بفودافون كاش وإنستاباي والبطاقات',
      titleEn: 'Ready for Instant Checkout with 30-Day Warranty!',
      descAr: 'تفعيل فوري خلال ثوانٍ مع ضمان استبدال ذهبي ودعم فني متاح 24/7.',
      descEn: 'Instant automated delivery to your screen and email with 24/7 support.',
      actionLabelAr: 'إتمام الطلب الآن',
      actionLabelEn: 'Complete Order Now',
      actionUrl: '/cart',
    };
  } else if (hesitation === 'high' || viewed.length >= 2) {
    smartIntervention = {
      type: 'warranty_trust',
      titleAr: 'محتار في الاختيار؟ جميع المنتجات مشمولة بضمان ذهبي 30 يوماً',
      titleEn: 'Need Guidance? All Products Backed by 30-Day Golden Warranty',
      descAr: 'استبدال فوري أو استرداد كامل إذا واجهتك أي مشكلة، مع تسليم آلي فوري.',
      descEn: 'Instant delivery, 100% genuine keys, and guaranteed replacement support.',
      actionLabelAr: 'تصفح الضمان والأسئلة الشائعة',
      actionLabelEn: 'View Warranty & FAQ',
      actionUrl: '/refund',
    };
  }

  return {
    detectedIntentAr,
    detectedIntentEn,
    predictedNextStepAr,
    predictedNextStepEn,
    suggestedSearchQueries,
    recommendedSlugs,
    smartIntervention,
  };
}
