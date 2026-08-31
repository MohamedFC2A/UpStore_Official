import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireAdminUser } from '@/utils/security';
import { extractSupportCode, generateSupportCode } from '@/utils/supportCode';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Authenticate and verify admin permissions
    const auth = await requireAdminUser();
    if (auth.error || !auth.user) {
      return auth.error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();

    // 3. Parse search query
    const body = await req.json().catch(() => ({}));
    const query = (body.query || '').trim();

    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const detectedCode = extractSupportCode(query);
    const emailMatch = query.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const orderIdMatch = query.match(/#?([a-f0-9]{8}(?:-[a-f0-9]{4}){0,4})/i) || query.match(/UP-([0-9]{8,15})/i);

    let targetProfile: any = null;
    let targetUserId: string | null = null;

    // A. Search by Support Code
    if (detectedCode) {
      const codeClean = detectedCode.replace(/^(?:UP-SEC|UP|SUP)-/i, '').trim().toUpperCase();
      const { data: profileList } = await supabaseAdmin
        .from('profiles')
        .select('id, email, display_name, role, wallet_balance, referral_code, referred_by, country, device_fingerprint, created_at')
        .limit(300);

      if (profileList) {
        targetProfile = profileList.find((p) => {
          const pCode1 = generateSupportCode(p.id).toUpperCase();
          const pCode2 = generateSupportCode(p.id, { deviceFingerprint: p.device_fingerprint }).toUpperCase();
          const pRef = (p.referral_code || '').toUpperCase();
          return (
            pCode1 === detectedCode ||
            pCode2 === detectedCode ||
            pCode1.endsWith(codeClean) ||
            pRef === codeClean ||
            p.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().startsWith(codeClean)
          );
        });
        if (targetProfile) targetUserId = targetProfile.id;
      }
    }

    // B. Search by Email
    if (!targetProfile && emailMatch) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, email, display_name, role, wallet_balance, referral_code, referred_by, country, device_fingerprint, created_at')
        .ilike('email', emailMatch[0].trim())
        .maybeSingle();

      if (profile) {
        targetProfile = profile;
        targetUserId = profile.id;
      }
    }

    // C. Search by Order ID
    let matchedOrders: any[] = [];
    if (orderIdMatch && orderIdMatch[1]) {
      const orderSearch = orderIdMatch[1].trim();
      const { data: orders } = await supabaseAdmin
        .from('orders')
        .select('id, user_id, amount, status, product_key, session_id, payment_sender, payment_transaction_id, payment_screenshot, created_at, products(id, name, name_ar, slug, subscription_duration, warranty_duration)')
        .or(`id.ilike.%${orderSearch}%,session_id.ilike.%${orderSearch}%`)
        .limit(5);

      if (orders && orders.length > 0) {
        matchedOrders = orders;
        if (!targetUserId && orders[0].user_id) {
          targetUserId = orders[0].user_id;
          const { data: p } = await supabaseAdmin
            .from('profiles')
            .select('id, email, display_name, role, wallet_balance, referral_code, referred_by, country, device_fingerprint, created_at')
            .eq('id', targetUserId)
            .maybeSingle();
          if (p) targetProfile = p;
        }
      }
    }

    // If we have a target user, fetch all their recent orders
    if (targetUserId) {
      const { data: allUserOrders } = await supabaseAdmin
        .from('orders')
        .select('id, amount, status, product_key, session_id, payment_sender, payment_transaction_id, payment_screenshot, created_at, products(id, name, name_ar, slug, subscription_duration, warranty_duration)')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(15);

      if (allUserOrders) {
        matchedOrders = allUserOrders;
      }
    }

    // Fetch user notifications
    let userNotifications: any[] = [];
    if (targetUserId) {
      const { data: notifs } = await supabaseAdmin
        .from('notifications')
        .select('id, title, message, type, is_read, created_at')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (notifs) {
        userNotifications = notifs;
      }
    }

    if (!targetProfile && matchedOrders.length === 0) {
      return NextResponse.json({ found: false, message: 'No records found for the given query.' });
    }

    const calculatedSupportCode = targetProfile
      ? generateSupportCode(targetProfile.id, { deviceFingerprint: targetProfile.device_fingerprint })
      : null;

    return NextResponse.json({
      found: true,
      profile: targetProfile
        ? {
            ...targetProfile,
            support_code: calculatedSupportCode,
          }
        : null,
      orders: matchedOrders,
      notifications: userNotifications,
    });
  } catch (err: any) {
    console.error('[Admin Support Code Lookup Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
