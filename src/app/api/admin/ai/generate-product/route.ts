import { NextResponse } from 'next/server';
import { requireAdminUser, enforceSameOriginRequest } from '@/utils/security';
import { generateStructuredAIResponse } from '@/utils/ai';

export interface GenerateProductRequest {
  prompt: string;
  category?: string;
  targetPrice?: number;
}

export interface GeneratedProductResponse {
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  advantages: string[];
  advantages_ar: string[];
  category: string;
  market_price: number;
  our_price: number;
  subscription_duration: string;
  warranty_duration: string;
  delivery_time: string;
  brand_hex_color: string;
  icon_name: string;
  suggested_slug: string;
  seo_keywords: string[];
  attributes: Array<{
    label_en: string;
    label_ar: string;
    icon: string;
    color: string;
  }>;
  image_url?: string;
  suggested_images?: Array<{
    title: string;
    imageUrl: string;
    thumbnailUrl?: string;
    source?: string;
    domain?: string;
  }>;
}

const DEFAULT_SERPER_KEY = 'dc82cdef2e35868541939cf3616311cca0e758e6';

export async function POST(req: Request) {
  try {
    const originError = await enforceSameOriginRequest(req);
    if (originError) {
      return originError;
    }

    const auth = await requireAdminUser();
    if (auth.error || !auth.supabase) {
      return auth.error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = auth.supabase;
    const { prompt, category, targetPrice }: GenerateProductRequest = await req.json();

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'A prompt or product name is required.' }, { status: 400 });
    }

    const systemPrompt = `
You are the Chief Product Officer, AI Architect, and Master Copywriter for UpStore (an elite digital goods marketplace).
UpStore sells premium subscriptions, AI tools, accounts, software licenses, gaming keys, and VPNs at the lowest prices online with instant automated delivery and comprehensive warranty matching subscription duration.

Your task is to generate complete, high-converting product listings based on a user's prompt or title, including intelligent, specific features (advantages), external badges (attributes), and matching warranty.

CRITICAL GUIDELINES FOR DESCRIPTIONS:
1. Category must be one of: "Subscriptions", "Accounts", "Software", "VPNs & Security", "Game Keys".
2. Descriptions must be well structured in clean Markdown with distinct sections (NO raw emojis, as the frontend renders modern vector badges):
   - Lead Intro paragraph introducing the service and its key selling point.
   - Section 1: "### ماذا يشمل الاشتراك؟" / "### What's Included?" containing 4-5 bullet points formatted as "- **عنوان الميزة:** شرح دقيق ومفصل للميزة التقنية"
   - Section 2: "### التفعيل والتسليم:" / "### Instant Activation & Delivery:" with 2-3 step-by-step lines explaining automated delivery via email/dashboard without complex steps.
   - Section 3: "### ضمان UpStore:" / "### UpStore Warranty & Support:" highlighting comprehensive full-term replacement warranty and 24/7 dedicated assistance.
3. Advantages (المميزات): Generate 5-6 deeply detailed, technical & promotional value points specific to this exact service (e.g. models, server count, storage space, resolutions, devices, integrations). NEVER use generic placeholders.
4. Warranty Duration: Must ALWAYS match the subscription_duration by default (e.g., if subscription is "18 Months", warranty must be "18 Months"; if "1 Year", warranty is "1 Year" or "365 Days"; if "Lifetime", warranty is "Lifetime").
5. Pricing: Market price must reflect standard retail (e.g. Netflix $22.99, ChatGPT Plus $20.00), and our_price must be discounted by 50%-85% (UpStore's ultra-competitive pricing model).
6. Brand Colors: Pick a vibrant hexadecimal hex code matching the service (e.g. Netflix: #E50914, Spotify: #1DB954, Discord: #5865F2, ChatGPT: #10A37F, Gemini: #00D2FF, NordVPN: #4687FF, Microsoft: #00A4EF, Steam: #171A21).
7. Icon Name: Choose one of standard lucide icons (e.g. 'Film', 'PlayCircle', 'Music', 'Lock', 'Laptop', 'Gamepad2', 'Gift', 'Bot', 'Zap', 'ShieldCheck', 'Sparkles', 'Cpu', 'Globe').
8. Arabic Localization: Must be persuasive, natural, and modern for gamers and Arab tech shoppers.
9. Attributes / Badges (السمات الخارجية): Generate 3-5 smart feature badges with label_en, label_ar, matching Lucide icon ('Sparkles', 'ShieldCheck', 'Lock', 'Crown', 'Cpu', 'Globe', 'Award', 'Flame', 'Zap', 'Tv', 'Headphones'), and hex color matching the brand. Note: Do NOT include "Auto-Delivery", it will be prepended automatically.

Output strictly as a valid JSON object matching the required schema.
`.trim();

    const userPrompt = `
Generate a complete digital product for UpStore:
Prompt/Idea: "${prompt}"
Preferred Category: ${category || 'Auto-detect'}
Target Price Suggestion: ${targetPrice ? `$${targetPrice}` : 'Auto-calculate best discount'}

Required JSON Schema:
{
  "name": "English Product Title (e.g. Google Gemini Advanced — 18 Months Full Access)",
  "name_ar": "Arabic Product Title (e.g. جيمناي أدفانسد من جوجل — اشتراك 18 شهر رسمي)",
  "description": "Comprehensive English markdown description with sections (### What's Included?, ### Instant Activation & Delivery:, ### UpStore Warranty:), clean professional text without raw emojis, and bullet points",
  "description_ar": "Comprehensive Arabic markdown description with sections (### ماذا يشمل الاشتراك؟, ### التفعيل والتسليم:, ### ضمان UpStore:), clean professional text without raw emojis, and bullet points",
  "advantages": [
    "Advantage 1 with specific features/specs",
    "Advantage 2 with cloud storage / capacity",
    "Advantage 3 with multi-device compatibility",
    "Advantage 4 with instant automated delivery",
    "Advantage 5 with full replacement warranty guarantee"
  ],
  "advantages_ar": [
    "ميزة 1 مفصلة بنماذج وقدرات الخدمة",
    "ميزة 2 بالسعة والتخزين السحابي أو المواصفات",
    "ميزة 3 بالتوافق مع الشاشات والهواتف",
    "ميزة 4 بالتسليم الآلي الفوري",
    "ميزة 5 بضمان الاستبدال الشامل طوال المدة"
  ],
  "category": "Subscriptions | Accounts | Software | VPNs & Security | Game Keys",
  "market_price": 49.99,
  "our_price": 9.99,
  "subscription_duration": "18 Months",
  "warranty_duration": "18 Months",
  "delivery_time": "Instant",
  "brand_hex_color": "#00D2FF",
  "icon_name": "Sparkles",
  "suggested_slug": "gemini-advanced-18-months",
  "seo_keywords": ["gemini advanced", "google gemini", "اشتراك جيمناي", "اشتراك ai"],
  "attributes": [
    { "label_en": "2M Context", "label_ar": "سياق 2M", "icon": "Cpu", "color": "#9D4EDF" },
    { "label_en": "2TB Cloud Storage", "label_ar": "2TB سحابي", "icon": "Globe", "color": "#00D2FF" },
    { "label_en": "Google Workspace", "label_ar": "تكامل جوجل", "icon": "Sparkles", "color": "#FFB900" }
  ]
}
`.trim();

    const { data: generatedProduct, modelUsed } = await generateStructuredAIResponse<GeneratedProductResponse>(
      systemPrompt,
      userPrompt,
      { temperature: 0.4 }
    );

    // Ensure warranty matches subscription duration if missing
    if (!generatedProduct.warranty_duration || generatedProduct.warranty_duration === '30 Days') {
      generatedProduct.warranty_duration = generatedProduct.subscription_duration || '1 Month';
    }

    // Prepend Global Pay & Warranty badge and Warranty badge
    const globalPayBadge = {
      label_en: 'Global Pay & Full Warranty',
      label_ar: 'دفع عالمي وضمان كامل المدة',
      icon: 'ShieldCheck',
      color: '#10B981',
    };

    const warrantyBadge = {
      label_en: `${generatedProduct.warranty_duration} Warranty`,
      label_ar: `ضمان ${generatedProduct.warranty_duration.replace('Months', 'شهر').replace('Month', 'شهر').replace('Years', 'سنة').replace('Year', 'سنة').replace('Days', 'يوم')}`,
      icon: 'Award',
      color: '#00f0ff',
    };

    let finalAttributes = Array.isArray(generatedProduct.attributes) ? generatedProduct.attributes : [];
    finalAttributes = [
      globalPayBadge,
      warrantyBadge,
      ...finalAttributes.filter((a) => !a.label_en.toLowerCase().includes('delivery') && !a.label_en.toLowerCase().includes('warranty') && !a.label_en.toLowerCase().includes('global pay')),
    ];
    generatedProduct.attributes = finalAttributes;

    // ─── SEARCH SERPER FOR TOP PNG PRODUCT IMAGES ───
    let serperApiKey = process.env.SERPER_API_KEY || DEFAULT_SERPER_KEY;
    try {
      const { data: setting } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'serper_api_key')
        .single();
      if (setting?.value && typeof setting.value === 'string') {
        serperApiKey = setting.value.trim();
      }
    } catch {
      // continue
    }

    try {
      const cleanName = generatedProduct.name
        .replace(/\b(1|3|6|12)\s*(month|months|year|years)\b/gi, '')
        .replace(/[—–\-:()]/g, ' ')
        .trim();

      const serperRes = await fetch('https://google.serper.dev/images', {
        method: 'POST',
        headers: {
          'X-API-KEY': serperApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: `${cleanName} 3d icon transparent png pinterest`,
          gl: 'us',
          hl: 'en',
          num: 8,
        }),
      });

      if (serperRes.ok) {
        const serperData = await serperRes.json();
        if (Array.isArray(serperData.images) && serperData.images.length > 0) {
          generatedProduct.suggested_images = serperData.images.map((img: any) => ({
            title: img.title,
            imageUrl: img.imageUrl,
            thumbnailUrl: img.thumbnailUrl,
            source: img.source || img.domain,
            domain: img.domain,
          }));
          generatedProduct.image_url = serperData.images[0].imageUrl;
        }
      }
    } catch (serperErr: any) {
      console.warn('[Generate Product] Serper image search skipped:', serperErr.message);
    }

    // Save attributes into saved_attributes table
    for (const attr of finalAttributes) {
      try {
        await supabase.from('saved_attributes').upsert(
          {
            label_en: attr.label_en,
            label_ar: attr.label_ar,
            icon: attr.icon || 'Sparkles',
            color: attr.color || '#10B981',
          },
          { onConflict: 'label_en' }
        );
      } catch {
        // continue
      }
    }

    return NextResponse.json({
      product: generatedProduct,
      modelUsed,
    });
  } catch (error: any) {
    console.error('[Generate Product API Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate product details.' },
      { status: 500 }
    );
  }
}
