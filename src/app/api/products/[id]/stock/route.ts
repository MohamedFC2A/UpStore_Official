import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getZelenkaStock } from '@/utils/zelenka';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Fetch product delivery mode and configuration
    const { data: product, error: prodErr } = await supabaseAdmin
      .from('products')
      .select('id, stock, delivery_mode, zelenka_api_key, zelenka_product_id')
      .eq('id', productId)
      .single();

    if (prodErr || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    let currentStock = Number(product.stock || 0);

    // 2. Sync stock based on delivery mode
    if (product.delivery_mode === 'zelenka_api') {
      const apiKey = product.zelenka_api_key || process.env.ZELENKA_API_KEY;
      if (apiKey && product.zelenka_product_id) {
        currentStock = await getZelenkaStock(apiKey, product.zelenka_product_id);
        
        // Update stock in database
        await supabaseAdmin
          .from('products')
          .update({ stock: currentStock })
          .eq('id', productId);
      }
    } else if (product.delivery_mode === 'pre_assigned') {
      const { count, error: countErr } = await supabaseAdmin
        .from('product_credentials')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', productId)
        .eq('is_sold', false);
      
      if (!countErr && typeof count === 'number') {
        currentStock = count;
        
        // Update stock in database
        await supabaseAdmin
          .from('products')
          .update({ stock: currentStock })
          .eq('id', productId);
      }
    }

    return NextResponse.json({ stock: currentStock });
  } catch (error: any) {
    console.error('[Product Stock Sync Error]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
