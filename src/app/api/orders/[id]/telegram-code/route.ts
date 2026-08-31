import { NextResponse } from 'next/server';
import axios from 'axios';
import { createAdminClient } from '@/utils/supabase/admin';
import { getRequiredEnv, requireAuthenticatedUser } from '@/utils/security';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // 1. Authenticate user
    const auth = await requireAuthenticatedUser();
    if (auth.error || !auth.user) {
      return auth.error!;
    }
    const user = auth.user;

    // 2. Initialize Supabase Admin to retrieve order securely
    const supabaseAdmin = createAdminClient();

    // 3. Fetch order
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('user_id, product_key, product_id')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 4. Check ownership
    if (order.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 5. Parse product_key to see if it is a Zelenka account JSON
    let itemId = null;
    try {
      const parsed = JSON.parse(order.product_key);
      if (parsed && parsed.type === 'zelenka_account') {
        itemId = parsed.data?.item_id;
      }
    } catch {
      // Not a JSON
    }

    if (!itemId) {
      return NextResponse.json({ error: 'This product does not support login codes.' }, { status: 400 });
    }

    // 6. Fetch the API key (from product settings or fallback to env)
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('zelenka_api_key')
      .eq('id', order.product_id)
      .single();

    const apiKey = product?.zelenka_api_key || getRequiredEnv('ZELENKA_API_KEY');
    if (!apiKey) {
      return NextResponse.json({ error: 'Zelenka API is not configured.' }, { status: 500 });
    }

    // 7. Request login code from Lolzteam Market API
    console.log(`[Zelenka Code Proxy] Fetching login code for item ${itemId}`);
    try {
      const res = await axios.get(`https://api.lzt.market/${itemId}/telegram-login-code`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (res.data) {
        return NextResponse.json(res.data);
      }
    } catch (apiErr: any) {
      const errorData = apiErr.response?.data || {};
      console.error('[Zelenka Code Proxy Error]:', errorData);
      return NextResponse.json({
        error: errorData.error_description || errorData.message || 'Failed to fetch code from Lolzteam API.',
      }, { status: apiErr.response?.status || 502 });
    }

    return NextResponse.json({ error: 'No response from Lolzteam API.' }, { status: 500 });
  } catch (err: any) {
    console.error('[Telegram Code Route Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
