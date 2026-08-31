import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getBtcPayInvoice } from '@/utils/btcpay';
import { enforceSameOriginRequest, requireAuthenticatedUser } from '@/utils/security';

export async function GET(req: Request) {
  try {
    const originError = await enforceSameOriginRequest(req);
    if (originError) return originError;

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Authenticate user
    const auth = await requireAuthenticatedUser();
    if (auth.error || !auth.user) {
      return auth.error!;
    }
    const user = auth.user;

    const supabaseAdmin = createAdminClient();

    // Fetch associated pending/completed orders from the database
    const { data: orders, error: ordersErr } = await supabaseAdmin
      .from('orders')
      .select('id, amount, user_id, products(id, name, name_ar, image_url), product_variants(id, name, name_ar)')
      .eq('session_id', sessionId);

    if (ordersErr) {
      console.error('[Invoice Details API] Database error fetching orders:', ordersErr);
      return NextResponse.json({ error: 'Database error fetching orders' }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Security check: Verify the user owns the orders
    if (orders[0].user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Group orders to present products cleanly
    const itemsMap = new Map<string, any>();
    let orderTotal = 0;
    for (const order of orders) {
      const product = order.products as any;
      const variant = order.product_variants as any;
      
      if (!product) {
        const price = Number(order.amount);
        orderTotal += price;
        const key = 'wallet_topup';
        if (itemsMap.has(key)) {
          itemsMap.get(key).quantity += 1;
        } else {
          itemsMap.set(key, {
            product_id: 'wallet_topup',
            name: 'UpStore Wallet Top-Up',
            name_ar: 'شحن رصيد محفظة UpStore',
            image_url: 'https://upstore.one/logo.png',
            variant_name: null,
            variant_name_ar: null,
            quantity: 1,
            unit_price: price
          });
        }
        continue;
      }
      
      const price = Number(order.amount);
      orderTotal += price;
      
      const key = `${product.id}-${variant?.id || 'none'}`;
      if (itemsMap.has(key)) {
        itemsMap.get(key).quantity += 1;
      } else {
        itemsMap.set(key, {
          product_id: product.id,
          name: product.name,
          name_ar: product.name_ar,
          image_url: product.image_url,
          variant_name: variant?.name || null,
          variant_name_ar: variant?.name_ar || null,
          quantity: 1,
          unit_price: price
        });
      }
    }

    const items = Array.from(itemsMap.values());

    // If it is a mock invoice, return simulated data
    if (sessionId.startsWith('btc_')) {
      return NextResponse.json({
        id: sessionId,
        amount: orderTotal,
        currency: 'USD',
        status: 'New',
        checkoutLink: `/checkout/success?session_id=${sessionId}`,
        mock: true,
        items
      });
    }

    // Live BTCPay Invoice Details
    try {
      const invoice = await getBtcPayInvoice(sessionId);

      // Verify invoice owner from metadata (if it exists)
      const metadataUserId = invoice.metadata?.userId;
      if (metadataUserId && metadataUserId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      return NextResponse.json({
        id: invoice.id,
        amount: invoice.amount || orderTotal,
        currency: invoice.currency || 'USD',
        status: invoice.status,
        checkoutLink: invoice.checkoutLink,
        mock: false,
        items
      });
    } catch (btcErr: any) {
      console.error('[Invoice Details API] Failed to fetch BTCPay invoice details:', btcErr);
      // Fallback: If BTCPay fails to respond, return database details with status Unknown
      return NextResponse.json({
        id: sessionId,
        amount: orderTotal,
        currency: 'USD',
        status: 'Unknown',
        checkoutLink: `https://mainnet.demo.btcpayserver.org/i/${sessionId}`,
        mock: false,
        items,
        error: btcErr.message
      });
    }
  } catch (err: any) {
    console.error('[Invoice Details API Error]:', err);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
