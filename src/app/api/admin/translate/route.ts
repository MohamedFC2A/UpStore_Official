import { NextResponse } from 'next/server';
import { requireAdminUser, enforceSameOriginRequest } from '@/utils/security';
import { generateStructuredAIResponse } from '@/utils/ai';

export interface TranslateRequest {
  name?: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  advantages?: string[];
  advantages_ar?: string[];
  category?: string;
  direction?: 'en_to_ar' | 'ar_to_en' | 'auto';
  text?: string;
}

export interface TranslateResponse {
  name?: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  advantages?: string[];
  advantages_ar?: string[];
  suggested_slug?: string;
  translated_text?: string;
}

export async function POST(req: Request) {
  try {
    // 1. Enforce same-origin request
    const originError = await enforceSameOriginRequest(req);
    if (originError) {
      return originError;
    }

    // 2. Require admin user
    const auth = await requireAdminUser();
    if (auth.error) {
      return auth.error;
    }

    // 3. Parse input
    const body: TranslateRequest = await req.json();
    const {
      name,
      name_ar,
      description,
      description_ar,
      advantages,
      advantages_ar,
      category,
      direction = 'auto',
      text,
    } = body;

    // Direct single text translation
    if (text && text.trim()) {
      const isArabicInput = /[\u0600-\u06FF]/.test(text);
      const systemPrompt = `You are a professional e-commerce translator for digital products and gaming subscriptions. Translate the provided text accurately preserving markdown formatting and emojis. Return JSON: {"translated_text": "..."}`;
      const userPrompt = `Translate the following text ${isArabicInput ? 'from Arabic to English' : 'from English to Arabic'}:\n\n${text}`;
      
      try {
        const { data } = await generateStructuredAIResponse<{ translated_text: string }>(systemPrompt, userPrompt);
        return NextResponse.json({ translated_text: data?.translated_text || text });
      } catch {
        return NextResponse.json({ translated_text: text });
      }
    }

    // Check direction: if description_ar or name_ar is provided and description is empty or direction is ar_to_en
    const isArToEn = direction === 'ar_to_en' || (Boolean(name_ar || description_ar) && !name && !description);

    if (isArToEn) {
      const systemPrompt = `
You are an expert e-commerce copywriter for UpStore digital marketplace.
Your task is to translate and polish Arabic digital product listings into professional, high-converting English copy.
Ensure accurate tech terms (e.g. Gemini Advanced 18 Months, Netflix Premium 4K, 1-Year Warranty, Instant Delivery).
Generate a clean URL slug (e.g. gemini-advanced-18-months).
`.trim();

      const userPrompt = `
Translate this Arabic product listing to English:

Arabic Name: ${name_ar || 'اشتراك رقمي'}
Arabic Description:
${description_ar || ''}
Category: ${category || 'Subscriptions'}
Arabic Advantages: ${JSON.stringify(advantages_ar || [])}

Required Output JSON Schema:
{
  "name": "Professional English Product Name",
  "description": "Engaging English description with bullet points and emojis",
  "advantages": ["English feature 1", "English feature 2"],
  "suggested_slug": "clean-kebab-case-slug"
}
`.trim();

      try {
        const { data: translatedData, modelUsed } = await generateStructuredAIResponse<{
          name: string;
          description: string;
          advantages: string[];
          suggested_slug: string;
        }>(systemPrompt, userPrompt);

        const cleanSlug = (translatedData.suggested_slug || translatedData.name || 'product')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

        return NextResponse.json({
          name: translatedData.name || name_ar || '',
          name_ar: name_ar || '',
          description: translatedData.description || description_ar || '',
          description_ar: description_ar || '',
          advantages: Array.isArray(translatedData.advantages) ? translatedData.advantages : [],
          advantages_ar: advantages_ar || [],
          suggested_slug: cleanSlug,
          modelUsed,
        });
      } catch (err: any) {
        const fallbackSlug = (name_ar || 'product')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

        return NextResponse.json({
          name: name_ar || '',
          name_ar: name_ar || '',
          description: description_ar || '',
          description_ar: description_ar || '',
          advantages: advantages_ar || [],
          advantages_ar: advantages_ar || [],
          suggested_slug: fallbackSlug || 'digital-product',
        });
      }
    }

    // Default: English to Arabic
    const systemPrompt = `
You are an expert e-commerce copywriter and translator specialized in digital goods, gaming subscriptions, software keys, and VPNs for Arab consumers.
Your mission is to produce natural, engaging, and high-converting Arabic translations for product listings.

CRITICAL TRANSLATION GUIDELINES:
1. NEVER do literal word-for-word translation. Make the Arabic copy sound modern, exciting, and prestigious for Arab gamers and tech users.
2. Digital Brand & Product Nomenclature:
   - "ChatGPT Plus" -> "اشتراك شات جي بي تي بلس (ChatGPT Plus)"
   - "Google Gemini Advanced" -> "اشتراك جوجل جيمناي أدفانسد (Gemini Advanced)"
   - "Netflix 4K Ultra HD" -> "اشتراك نتفليكس بريميوم 4K"
   - "Spotify Premium" -> "اشتراك سبوتيفاي بريميوم"
   - "Discord Nitro" -> "اشتراك ديسكورد نيترو قيمنق"
   - "Canva Pro" -> "اشتراك كانفا برو احترافي"
   - "Instant Delivery" -> "تسليم سريع ومضمون"
   - "Full Warranty" -> "ضمان ذهبي شامل"
3. Preserve markdown formatting, line breaks, emojis, and bullet points in description.
`.trim();

    const userPrompt = `
Translate and localize this digital product into Arabic:

Product Name: ${name || 'Digital Product'}
Category: ${category || 'Subscriptions'}
Description:
${description || 'No description provided.'}

Advantages/Features:
${JSON.stringify(advantages || [])}

Required Output JSON Schema:
{
  "name_ar": "Arabic translated and localized product title",
  "description_ar": "Arabic translated description with formatting and emojis preserved",
  "advantages_ar": ["Arabic advantage 1", "Arabic advantage 2"]
}
`.trim();

    const { data: translatedData, modelUsed } = await generateStructuredAIResponse<{
      name_ar: string;
      description_ar: string;
      advantages_ar: string[];
    }>(systemPrompt, userPrompt);

    return NextResponse.json({
      name: name || '',
      name_ar: translatedData.name_ar || name || '',
      description: description || '',
      description_ar: translatedData.description_ar || description || '',
      advantages: advantages || [],
      advantages_ar: Array.isArray(translatedData.advantages_ar) ? translatedData.advantages_ar : [],
      modelUsed,
    });
  } catch (error: any) {
    console.error('[Translation API Error]:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during translation.' },
      { status: 500 }
    );
  }
}
