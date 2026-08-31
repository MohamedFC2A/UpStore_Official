import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Consumes one unsold credential for a product and links it to an order.
 * Decrements product stock count by 1 atomically.
 */
export async function consumeUnsoldCredential(
  productId: string,
  orderId: string,
  variantId?: string | null
): Promise<string | null> {
  const supabase = createAdminClient();

  // 1. Consume the credential atomically
  const { data: credText, error: consumeError } = await supabase.rpc('consume_product_credential', {
    p_product_id: productId,
    p_order_id: orderId,
    p_variant_id: variantId || null
  });

  if (consumeError || !credText) {
    console.error(`[Credentials DB] Failed to consume credential for product ${productId} (variant: ${variantId}):`, consumeError?.message);
    return null;
  }

  // 2. Decrement stock atomically
  if (variantId) {
    const { error: stockError } = await supabase.rpc('decrement_product_variant_stock', {
      p_variant_id: variantId,
      qty: 1
    });

    if (stockError) {
      console.error(`[Credentials DB] Error decrementing variant stock:`, stockError.message);
    }
  } else {
    const { error: stockError } = await supabase.rpc('decrement_product_stock', {
      p_product_id: productId,
      qty: 1
    });

    if (stockError) {
      console.error(`[Credentials DB] Error decrementing product stock:`, stockError.message);
    }
  }

  return credText;
}

/**
 * Gets the count of unsold credentials for a specific product.
 */
export async function getUnsoldCredentialsCount(productId: string): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from('product_credentials')
    .select('*', { count: 'exact', head: true })
    .eq('product_id', productId)
    .eq('is_sold', false);

  if (error) {
    console.error(`[Credentials DB] Error counting credentials:`, error.message);
    return 0;
  }

  return count || 0;
}

/**
 * Inserts a list of raw credentials (email:password) into the product credentials pool.
 * Increments the product stock by the number of added credentials.
 */
export async function addCredentialsPool(productId: string, rawCredentialsList: string[]): Promise<number> {
  const supabase = createAdminClient();
  const validCreds = rawCredentialsList
    .map(c => c.trim())
    .filter(c => c.length > 0);

  if (validCreds.length === 0) return 0;

  const insertData = validCreds.map(credText => ({
    product_id: productId,
    credentials_text: credText,
    is_sold: false
  }));

  // 1. Insert credentials
  const { error: insertError } = await supabase
    .from('product_credentials')
    .insert(insertData);

  if (insertError) {
    console.error(`[Credentials DB] Error inserting credentials pool:`, insertError.message);
    throw insertError;
  }

  // 2. Recalculate and update the product stock based on total unsold credentials
  const unsoldCount = await getUnsoldCredentialsCount(productId);

  const { error: updateError } = await supabase
    .from('products')
    .update({ stock: unsoldCount })
    .eq('id', productId);

  if (updateError) {
    console.error(`[Credentials DB] Error updating product stock:`, updateError.message);
  }

  return validCreds.length;
}
