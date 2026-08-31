import { NextResponse } from 'next/server';
import { requireAdminUser, enforceSameOriginRequest } from '@/utils/security';
import { generateStructuredAIResponse } from '@/utils/ai';

export interface GenerateVariantsRequest {
  productId?: string;
  productName: string;
  category?: string;
  basePrice?: number;
  baseMarketPrice?: number;
  deliveryMode?: string;
}

export interface GeneratedVariant {
  name: string;
  name_ar: string;
  subscription_duration: string;
  quality: string;
  our_price: number;
  market_price: number;
  price_egp: number;
  price_sar: number;
  stock: number;
  max_stock: number;
  status: string;
  sort_order: number;
}

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
    const body: GenerateVariantsRequest = await req.json();
    const { productId, productName, category, basePrice = 4.99, baseMarketPrice, deliveryMode } = body;

    if (!productName || !productName.trim()) {
      return NextResponse.json({ error: 'Product name is required.' }, { status: 400 });
    }

    const systemPrompt = `
You are an expert E-Commerce Catalog & Pricing Architect for UpStore (an elite digital subscriptions & software store).
Your job is to generate realistic, high-converting product package tiers / variants for a given digital product.

RULES:
1. For subscription products (e.g. Netflix, ChatGPT, Gemini, Spotify, YouTube, Discord Nitro, Xbox, PlayStation, VPNs):
   - Generate 3 to 4 logical duration tiers (e.g. "1 Month", "3 Months", "6 Months", "12 Months (1 Year)" or Screen tiers like "1 Screen Private Profile", "Full Account 4 Screens").
   - Arabic translations must be natural and clear (e.g. "شهر كامل", "3 أشهر", "6 أشهر", "سنة كاملة (12 شهر)", "شاشة واحدة خاصة", "حساب كامل 4 شاشات").
2. For software / licenses (e.g. Windows, Office, Antivirus):
   - Generate tiers like "1 PC License", "3 PCs License", "Lifetime Activation".
3. Pricing & Discounts:
   - "our_price" for longer durations should offer progressive discounts (e.g., 1 Month = $5, 3 Months = $13.50, 6 Months = $24, 12 Months = $42).
   - "market_price" should reflect standard official retail without discounts.
   - "price_egp" = our_price * 52 (rounded nicely).
   - "price_sar" = our_price * 3.85 (rounded nicely).
   - "stock" should be realistic (between 15 and 60 units).
   - "max_stock" = 100.
4. "quality" should be appropriate (e.g. "4K Ultra HD", "Pro License", "Premium Audio", "Full Access").
5. "status" should always be "active".
6. "sort_order" should be 1, 2, 3, 4 sequentially.

Output strictly as a valid JSON object matching the schema:
{
  "variants": [
    {
      "name": "string",
      "name_ar": "string",
      "subscription_duration": "string",
      "quality": "string",
      "our_price": number,
      "market_price": number,
      "price_egp": number,
      "price_sar": number,
      "stock": number,
      "max_stock": number,
      "status": "active",
      "sort_order": number
    }
  ]
}
`.trim();

    const userPrompt = `
Product Name: "${productName}"
Category: "${category || 'Subscriptions'}"
Base Price Reference: $${basePrice} (Market: $${baseMarketPrice || basePrice * 2.5})
Delivery Mode: "${deliveryMode || 'pre_assigned'}"

Generate 3-4 structured package variants.
`.trim();

    let generatedVariants: GeneratedVariant[] = [];

    try {
      const aiResult = await generateStructuredAIResponse<{ variants: GeneratedVariant[] }>(
        systemPrompt,
        userPrompt
      );
      if (aiResult?.data?.variants && Array.isArray(aiResult.data.variants) && aiResult.data.variants.length > 0) {
        generatedVariants = aiResult.data.variants;
      }
    } catch (aiErr) {
      console.warn('[Variants AI Generator Fallback]:', aiErr);
    }

    // High Quality Fallback if AI is offline or format mismatch
    if (generatedVariants.length === 0) {
      const bPrice = Number(basePrice) || 4.99;
      generatedVariants = [
        {
          name: '1 Month UHD',
          name_ar: 'شهر كامل 4K UHD',
          subscription_duration: '1 Month',
          quality: '4K Ultra HD',
          our_price: bPrice,
          market_price: Number(baseMarketPrice) || bPrice * 2.5,
          price_egp: Math.ceil(bPrice * 53),
          price_sar: Math.ceil(bPrice * 4),
          stock: 50,
          max_stock: 100,
          status: 'active',
          sort_order: 1,
        },
        {
          name: '3 Months UHD',
          name_ar: '3 أشهر 4K UHD',
          subscription_duration: '3 Months',
          quality: '4K Ultra HD',
          our_price: Math.round(bPrice * 2.7 * 100) / 100,
          market_price: Math.round((Number(baseMarketPrice) || bPrice * 2.5) * 3),
          price_egp: Math.ceil(bPrice * 2.7 * 53),
          price_sar: Math.ceil(bPrice * 2.7 * 4),
          stock: 40,
          max_stock: 100,
          status: 'active',
          sort_order: 2,
        },
        {
          name: '6 Months UHD',
          name_ar: '6 أشهر 4K UHD',
          subscription_duration: '6 Months',
          quality: '4K Ultra HD',
          our_price: Math.round(bPrice * 5.0 * 100) / 100,
          market_price: Math.round((Number(baseMarketPrice) || bPrice * 2.5) * 6),
          price_egp: Math.ceil(bPrice * 5.0 * 53),
          price_sar: Math.ceil(bPrice * 5.0 * 4),
          stock: 30,
          max_stock: 100,
          status: 'active',
          sort_order: 3,
        },
        {
          name: '12 Months (1 Year)',
          name_ar: 'سنة كاملة (12 شهر)',
          subscription_duration: '12 Months',
          quality: '4K Ultra HD',
          our_price: Math.round(bPrice * 9.0 * 100) / 100,
          market_price: Math.round((Number(baseMarketPrice) || bPrice * 2.5) * 12),
          price_egp: Math.ceil(bPrice * 9.0 * 53),
          price_sar: Math.ceil(bPrice * 9.0 * 4),
          stock: 25,
          max_stock: 100,
          status: 'active',
          sort_order: 4,
        },
      ];
    }

    // If productId is provided, insert or sync variants into Supabase database
    let insertedCount = 0;
    if (productId) {
      const variantsToInsert = generatedVariants.map((v: GeneratedVariant, idx: number) => ({
        product_id: productId,
        name: v.name,
        name_ar: v.name_ar || null,
        our_price: Number(v.our_price) || basePrice,
        market_price: Number(v.market_price) || (Number(v.our_price) || basePrice) * 2,
        price_egp: Number(v.price_egp) || Math.ceil((Number(v.our_price) || basePrice) * 53),
        price_sar: Number(v.price_sar) || Math.ceil((Number(v.our_price) || basePrice) * 4),
        subscription_duration: v.subscription_duration || '1 Month',
        quality: v.quality || 'HD',
        stock: Number(v.stock) || 30,
        max_stock: Number(v.max_stock) || 100,
        status: 'active',
        sort_order: Number(v.sort_order) || idx + 1,
      }));

      const { data: insertedVariants, error: insertErr } = await supabase
        .from('product_variants')
        .insert(variantsToInsert)
        .select('*');

      if (insertErr) {
        console.error('Failed to insert AI variants to DB:', insertErr);
      } else if (insertedVariants) {
        insertedCount = insertedVariants.length;

        // Auto update product total stock & lowest price
        const totalStock = insertedVariants.reduce((sum: number, item: any) => sum + (item.stock || 0), 0);
        const minPrice = Math.min(...insertedVariants.map((item: any) => Number(item.our_price) || basePrice));

        await supabase
          .from('products')
          .update({
            stock: totalStock,
            our_price: minPrice,
            price_egp: Math.ceil(minPrice * 53),
            price_sar: Math.ceil(minPrice * 4),
          })
          .eq('id', productId);
      }
    }

    return NextResponse.json({
      success: true,
      variants: generatedVariants,
      insertedCount,
      productName,
    });
  } catch (error: any) {
    console.error('Error generating product variants with AI:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to auto-generate variants' },
      { status: 500 }
    );
  }
}
