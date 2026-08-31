import { NextResponse } from 'next/server';
import { requireAdminUser, enforceSameOriginRequest } from '@/utils/security';
import { createClient } from '@/utils/supabase/server';
import { generateStructuredAIResponse } from '@/utils/ai';

export async function POST(req: Request) {
  try {
    const originError = await enforceSameOriginRequest(req);
    if (originError) {
      return originError;
    }

    const auth = await requireAdminUser();
    if (auth.error) {
      return auth.error;
    }

    const body = await req.json().catch(() => ({}));
    const productIds: string[] | undefined = body.productIds;

    const supabase = await createClient();

    let query = supabase.from('products').select('*');

    if (Array.isArray(productIds) && productIds.length > 0) {
      query = query.in('id', productIds);
    } else {
      // Find products where name_ar is null, empty, or description_ar is null or empty
      query = query.or('name_ar.is.null,name_ar.eq.,description_ar.is.null,description_ar.eq.');
    }

    const { data: products, error: fetchErr } = await query;

    if (fetchErr) {
      throw new Error(`Failed to fetch products: ${fetchErr.message}`);
    }

    if (!products || products.length === 0) {
      return NextResponse.json({
        message: 'No products requiring translation were found.',
        translatedCount: 0,
        results: [],
      });
    }

    const results: Array<{ id: string; name: string; success: boolean; error?: string }> = [];

    const systemPrompt = `
You are an expert e-commerce copywriter and translator specialized in digital goods, gaming subscriptions, and software keys for Arab consumers.
Translate the provided product details into natural, high-converting Arabic for gamers and tech buyers. Preserve markdown formatting, emojis, and brand terms. Output strict JSON.
`.trim();

    for (const product of products) {
      try {
        const userPrompt = `
Translate this product to Arabic:
Name: ${product.name}
Category: ${product.category || 'General'}
Description: ${product.description || ''}
Advantages: ${JSON.stringify(product.advantages || [])}

Required JSON Schema:
{
  "name_ar": "Arabic translated product name",
  "description_ar": "Arabic translated description",
  "advantages_ar": ["Arabic advantage 1", "Arabic advantage 2"]
}
`.trim();

        const { data: translated } = await generateStructuredAIResponse<{
          name_ar: string;
          description_ar: string;
          advantages_ar: string[];
        }>(systemPrompt, userPrompt);

        const { error: updateErr } = await supabase
          .from('products')
          .update({
            name_ar: translated.name_ar || product.name,
            description_ar: translated.description_ar || product.description,
            advantages_ar: Array.isArray(translated.advantages_ar) ? translated.advantages_ar : [],
            updated_at: new Date().toISOString(),
          })
          .eq('id', product.id);

        if (updateErr) {
          throw updateErr;
        }

        results.push({ id: product.id, name: product.name, success: true });
      } catch (err: any) {
        console.error(`[Bulk Translate] Failed for product ${product.id} (${product.name}):`, err);
        results.push({ id: product.id, name: product.name, success: false, error: err.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      message: `Bulk translation complete. Translated ${successCount} of ${products.length} products.`,
      translatedCount: successCount,
      totalProcessed: products.length,
      results,
    });
  } catch (error: any) {
    console.error('[Bulk Translate API Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Bulk translation encountered a critical error.' },
      { status: 500 }
    );
  }
}
