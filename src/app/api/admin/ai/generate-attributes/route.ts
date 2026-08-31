import { NextResponse } from 'next/server';
import { requireAdminUser, enforceSameOriginRequest } from '@/utils/security';
import { generateStructuredAIResponse } from '@/utils/ai';

export interface ProductAttribute {
  id?: string;
  label_en: string;
  label_ar: string;
  icon: string;
  color: string;
}

export async function POST(req: Request) {
  try {
    const originError = await enforceSameOriginRequest(req);
    if (originError) return originError;

    const auth = await requireAdminUser();
    if (auth.error || !auth.supabase) {
      return auth.error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = auth.supabase;
    const {
      name,
      name_ar,
      category,
      description,
      deliveryTime,
    }: {
      name: string;
      name_ar?: string;
      category?: string;
      description?: string;
      deliveryTime?: string;
    } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Product name is required.' }, { status: 400 });
    }

    const systemPrompt = `
You are the Lead UX & Product Attribute Architect for UpStore (an elite digital gaming & software marketplace).
Your job is to analyze any digital product (e.g. Netflix, ChatGPT Plus, Spotify, NordVPN, Discord Nitro, Xbox Game Pass, Canva Pro, Steam, Office 365, etc.) and generate 2 to 4 ultra-relevant, high-converting feature badges/attributes.

CRITICAL RULES:
1. Each attribute MUST have:
   - "label_en": short 2-3 words punchy badge in English (e.g. "4K Ultra HD", "Private Account", "Official License", "All Devices", "1000+ Servers", "Anti-Ban Safe", "Global Region").
   - "label_ar": matching precise Arabic translation (e.g. "جودة 4K فائقة", "حساب خاص بالكامل", "ترخيص أصلي 100%", "يعمل على كل الأجهزة", "سيرفرات فائقة السرعة", "حماية ضد الحظر", "تفعيل عالمي").
   - "icon": A standard Lucide icon name matching the feature. Choose from:
     ["Sparkles", "ShieldCheck", "Lock", "Crown", "Cpu", "Globe", "Gamepad2", "CheckCircle2", "Award", "Flame", "Star", "Laptop", "Tv", "Headphones", "Wifi", "Zap", "Layers"]
   - "color": A vibrant hex color matching the service theme (e.g. Netflix/Gaming red: #E50914, Cyan/Tech: #00f0ff, Emerald/Trust: #10B981, Purple/AI: #a855f7, Gold: #FFB900, Blue: #4687FF, Pink: #EC4899).
2. DO NOT include "Instant Delivery" in the generated list, as it will be handled automatically.
3. Keep labels concise, accurate, and appealing for tech shoppers.

Output strictly as a valid JSON object matching the required schema:
{
  "attributes": [
    {
      "label_en": "4K Ultra HD",
      "label_ar": "جودة 4K فائقة",
      "icon": "Sparkles",
      "color": "#00f0ff"
    }
  ]
}
`.trim();

    const userPrompt = `
Product to analyze:
- English Name: "${name}"
- Arabic Name: "${name_ar || name}"
- Category: "${category || 'Subscriptions'}"
- Description: "${description || ''}"
- Delivery: "${deliveryTime || 'Instant'}"

Generate the optimal 2-4 badges/attributes for this product.
`.trim();

    const { data: aiResult } = await generateStructuredAIResponse<{ attributes: ProductAttribute[] }>(
      systemPrompt,
      userPrompt,
      { temperature: 0.3 }
    );

    let generatedAttributes: ProductAttribute[] = Array.isArray(aiResult?.attributes)
      ? aiResult.attributes
      : [];

    const globalPayBadge: ProductAttribute = {
      label_en: 'Global Pay & Full Warranty',
      label_ar: 'دفع عالمي وضمان كامل المدة',
      icon: 'ShieldCheck',
      color: '#10B981',
    };

    generatedAttributes = [
      globalPayBadge,
      ...generatedAttributes.filter((a) => !a.label_en.toLowerCase().includes('delivery') && !a.label_en.toLowerCase().includes('global pay')),
    ];

    // Save newly discovered attributes into saved_attributes table so they persist
    for (const attr of generatedAttributes) {
      try {
        await supabase
          .from('saved_attributes')
          .upsert(
            {
              label_en: attr.label_en,
              label_ar: attr.label_ar,
              icon: attr.icon || 'Sparkles',
              color: attr.color || '#10B981',
            },
            { onConflict: 'label_en' }
          );
      } catch {
        // continue if schema differs
      }
    }

    return NextResponse.json({
      attributes: generatedAttributes,
      productName: name,
    });
  } catch (error: any) {
    console.error('[Generate Attributes Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate product attributes.' },
      { status: 500 }
    );
  }
}
