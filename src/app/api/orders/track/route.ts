import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireAuthenticatedUser } from '@/utils/security';
import { isAdminIdentity } from '@/utils/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawId = searchParams.get('id') || searchParams.get('order_id') || searchParams.get('session_id') || '';
    const cleanId = rawId.trim().replace(/^#/, '');

    if (!cleanId || cleanId.length < 6) {
      return NextResponse.json({ error: 'Valid Order ID or Session ID is required' }, { status: 400 });
    }

    const auth = await requireAuthenticatedUser().catch(() => ({ user: null, error: null }));
    const user = auth?.user || null;

    const supabaseAdmin = createAdminClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

    const selectQuery = `
      id,
      user_id,
      amount,
      status,
      created_at,
      updated_at,
      product_key,
      session_id,
      payment_sender,
      payment_transaction_id,
      payment_screenshot,
      variant_id,
      products (
        id,
        name,
        name_ar,
        slug,
        icon_name,
        brand_color,
        delivery_mode,
        subscription_duration,
        image_url,
        our_price
      ),
      product_variants (
        id,
        name,
        name_ar,
        our_price
      )
    `;

    let orderRecord: any = null;

    if (isUuid) {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select(selectQuery)
        .eq('id', cleanId)
        .maybeSingle();

      if (!error && data) {
        orderRecord = data;
      }
    }

    // If not found by UUID, try session_id or order reference match
    if (!orderRecord) {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select(selectQuery)
        .or(`session_id.eq.${cleanId},session_id.eq.arab_${cleanId},session_id.ilike.%${cleanId}%`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        orderRecord = data[0];
      }
    }

    if (!orderRecord) {
      return NextResponse.json({ error: 'Order not found', found: false }, { status: 404 });
    }

    // Check authorization to reveal sensitive product_key
    let isUserAdmin = false;
    if (user) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role, email')
        .eq('id', user.id)
        .maybeSingle();
      isUserAdmin = profile?.role === 'admin' || isAdminIdentity({ id: user.id, email: user.email });
    }

    const isOwner = Boolean(user && orderRecord.user_id === user.id);
    const providedFullSession = Boolean(cleanId === orderRecord.session_id);

    // If the caller is not the owner, not admin, and did not supply the full session_id, mask credentials
    if (!isOwner && !isUserAdmin && !providedFullSession) {
      if (orderRecord.product_key && orderRecord.product_key !== 'PENDING_FULFILLMENT') {
        orderRecord.product_key = 'PROTECTED_LOGIN_REQUIRED';
      }
    }

    return NextResponse.json({ found: true, order: orderRecord });
  } catch (e: any) {
    console.error('[Track Order Route Error]:', e);
    return NextResponse.json({ error: 'An internal error occurred while tracking order.' }, { status: 500 });
  }
}
