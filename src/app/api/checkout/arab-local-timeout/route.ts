import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireAuthenticatedUser, enforceSameOriginRequest } from '@/utils/security';
import { LOCAL_PAY_BOT_USERNAME } from '@/utils/telegramLocalPayBot';

export async function POST(req: NextRequest) {
  try {
    const originError = await enforceSameOriginRequest(req);
    if (originError) {
      return originError;
    }

    const auth = await requireAuthenticatedUser();
    if (auth.error || !auth.user) {
      return auth.error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = auth.user;
    const body = await req.json().catch(() => ({}));
    const { orderId, sessionId } = body;

    const rawRef = String(orderId || sessionId || '').trim().replace(/^#/, '');
    if (!rawRef) {
      return NextResponse.json({ error: 'Order reference is required' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Find matching order in pending_manual_payment state
    const { data: matchedOrders } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, amount, status, session_id, payment_sender, created_at, product_key')
      .or(`session_id.eq.arab_${rawRef},session_id.eq.${rawRef},session_id.ilike.%${rawRef}%,id.ilike.%${rawRef}%`);

    const primaryOrder = matchedOrders && matchedOrders.length > 0 ? matchedOrders[0] : null;
    const targetUserId = primaryOrder?.user_id || user.id;
    const targetSessionId = primaryOrder?.session_id || `arab_${rawRef}`;

    // If order was already completed or verified, do not issue a strike
    if (
      primaryOrder &&
      (primaryOrder.status === 'completed' ||
        primaryOrder.status === 'pending_fulfillment' ||
        primaryOrder.product_key === 'CONFIRMED_AWAITING_KEY')
    ) {
      return NextResponse.json({ success: true, message: 'Order already fulfilled or confirmed' });
    }

    // 2. Mark order as cancelled due to timeout
    if (matchedOrders && matchedOrders.length > 0) {
      const orderIds = matchedOrders.map((o) => o.id);
      await supabaseAdmin
        .from('orders')
        .update({
          status: 'cancelled',
          product_key: 'TIMEOUT_EXPIRED',
        })
        .in('id', orderIds);
    } else {
      await supabaseAdmin
        .from('orders')
        .update({
          status: 'cancelled',
          product_key: 'TIMEOUT_EXPIRED',
        })
        .eq('session_id', targetSessionId);
    }

    // 3. Issue Strike to Customer Profile
    let newStrikes = 1;
    let isBanned = false;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, display_name, phone, strike_count, strikes_history, is_banned, ban_reason, is_phone_blacklisted')
      .eq('id', targetUserId)
      .maybeSingle();

    if (profile) {
      const currentStrikes = Number(profile.strike_count || 0);
      newStrikes = currentStrikes + 1;
      const existingHistory = Array.isArray(profile.strikes_history) ? profile.strikes_history : [];
      isBanned = newStrikes >= 2;

      const strikeEntry = {
        id: crypto.randomUUID(),
        strike_number: newStrikes,
        reason: `انتهاء مهلة السداد (60 دقيقة) لطلب Arabi Pay (#${rawRef}) دون إتمام التحويل`,
        order_id: rawRef,
        created_at: new Date().toISOString(),
        issued_by: 'Auto Expiry System',
      };

      const updatedFields: Record<string, any> = {
        strike_count: newStrikes,
        strikes_history: [...existingHistory, strikeEntry],
        is_banned: isBanned ? true : Boolean(profile.is_banned),
        ban_reason: isBanned
          ? `تم حظر الحساب نهائياً لتكرار عدم الالتزام بسداد طلبات Arabi Pay (الوصول للإنذار الثاني ${newStrikes}/2).`
          : profile.ban_reason,
        is_phone_blacklisted: isBanned ? true : Boolean(profile.is_phone_blacklisted),
      };

      await supabaseAdmin.from('profiles').update(updatedFields).eq('id', targetUserId);

      // 4. Insert Warning Notification for Customer
      try {
        await supabaseAdmin.from('notifications').insert({
          user_id: targetUserId,
          title: isBanned
            ? `تم حظر الحساب نهائياً (الإنذار الثاني ${newStrikes}/2)`
            : `انتهت مهلة السداد: تسجيل إنذار (${newStrikes}/2) على طلب #${rawRef}`,
          message: isBanned
            ? `تم حظر حسابك ورقم هاتفك نهائياً بعد انتهاء مهلة سداد طلب Arabi Pay (#${rawRef}) وتسجيل الإنذار الثاني. يرجى التواصل مع الدعم الفني للاستئناف.`
            : `انتهت مهلة الـ 60 دقيقة المخصصة لسداد طلب Arabi Pay (#${rawRef}). تم إلغاء الطلب وتسجيل الإنذار (${newStrikes}/2) على حسابك. تذكر أن تكرار المخالفة سيؤدي للحظر التلقائي.`,
          type: isBanned ? 'warning' : 'alert',
          is_read: false,
        });
      } catch (notifErr) {
        console.warn('[Arab Local Timeout] Notification error:', notifErr);
      }
    }

    return NextResponse.json({
      success: true,
      strikeCount: newStrikes,
      isBanned,
      message: `تم إلغاء الطلب لانتهاء الوقت وتسجيل الإنذار (${newStrikes}/2)`,
    });
  } catch (err: any) {
    console.error('[Arab Local Timeout Route Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 });
  }
}
