import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireAuthenticatedUser, enforceSameOriginRequest } from '@/utils/security';
import { dispatchArabLocalSupportAlert } from '@/utils/telegramPaymentBot';
import { dispatchLocalPayOrderAlert } from '@/utils/telegramLocalPayBot';

export async function POST(req: NextRequest) {
  try {
    const originError = await enforceSameOriginRequest(req);
    if (originError) {
      return originError;
    }

    // 1. Enforce authenticated user requirement
    const auth = await requireAuthenticatedUser();
    if (auth.error || !auth.user) {
      return auth.error || NextResponse.json({ error: 'Unauthorized: Please log in first.' }, { status: 401 });
    }
    const user = auth.user;
    const userId = user.id;

    const supabaseAdmin = createAdminClient();

    // Check user profile for Strikes or Ban
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, display_name, phone, is_banned, ban_reason, strike_count, is_phone_blacklisted')
      .eq('id', userId)
      .maybeSingle();

    if (profile?.is_banned || Number(profile?.strike_count || 0) >= 2 || profile?.is_phone_blacklisted) {
      return NextResponse.json(
        {
          error: 'ACCOUNT_BANNED',
          banned: true,
          message:
            profile?.ban_reason ||
            'تم حظر حسابك ورقم هاتفك نهائياً من استخدام Arabi Pay بسبب تكرار عدم السداد (2 Strikes). يرجى مراجعة الدعم الفني للاستئناف.',
        },
        { status: 403 }
      );
    }

    // Check active Arab local payment countdown restriction
    const { checkActiveLocalPaymentRestriction } = await import('@/utils/localPaySecurity');
    const localPayCheck = await checkActiveLocalPaymentRestriction(userId);
    if (localPayCheck.restricted) {
      return NextResponse.json({
        error: 'ACTIVE_LOCAL_PAYMENT_IN_PROGRESS',
        message: 'لديك طلب دفع محلي قيد المتابعة والعد التنازلي حالياً. لا يمكنك بدء طلب جديد حتى إتمام الطلب الحالي أو انتهاء مهلة العداد.',
        activeOrderId: localPayCheck.orderId,
      }, { status: 409 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      countryName,
      countryFlag,
      methodName,
      methodId,
      displayPrice,
      items,
      totalUsd,
      userNote,
      phone,
      biometricVerified,
      isWalletTopup,
      clientTelemetry,
    } = body;

    const isWalletTopupMode = Boolean(
      isWalletTopup ||
      (Array.isArray(items) && items.some((i: any) => i.product_id === 'wallet_topup' || i.id === 'wallet_topup' || i.product?.id === 'wallet_topup' || i.product?.delivery_mode === 'wallet_topup'))
    );

    // If phone is provided, ensure it is updated on profile if not set
    if (phone && !profile?.phone) {
      await supabaseAdmin.from('profiles').update({ phone }).eq('id', userId);
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'Unknown';

    // 2. Generate clean, authentic official Order Number
    const orderNumber = `${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;
    const orderRef = `UP-${orderNumber}`;
    const finalSessionId = `arab_${orderRef}`;

    // 3. Insert real order record into Supabase orders table
    if (Array.isArray(items) && items.length > 0) {
      const ordersToInsert = items.map((it: any) => ({
        user_id: userId,
        product_id: isWalletTopupMode ? null : (it.product_id || it.product?.id || null),
        variant_id: isWalletTopupMode ? null : (it.variant_id || it.variant?.id || null),
        amount: isWalletTopupMode ? Number(totalUsd || it.amount || 10) : (Number(it.amount || it.price || totalUsd || 0) / Math.max(1, items.length)),
        status: 'pending_manual_payment',
        product_key: isWalletTopupMode ? 'WALLET_TOPUP_PENDING' : 'PENDING_SUPPORT_DISPATCH',
        session_id: finalSessionId,
        payment_sender: `Arabi Pay • ${countryName || 'Arab State'} • ${methodName || 'Local Method'}${isWalletTopupMode ? ' • شحن محفظة' : ''}${phone ? ` • Tel: ${phone}` : ''}`,
        client_telemetry: clientTelemetry || {},
      }));

      // Ensure valid orders to insert (for wallet topup, product_id is allowed to be null)
      const validOrders = ordersToInsert.filter((o: any) => isWalletTopupMode || o.product_id);
      if (validOrders.length > 0) {
        try {
          const { error } = await supabaseAdmin.from('orders').insert(validOrders);
          if (error) {
            console.warn('[Arab Local Order DB Insert Warning]:', error);
          }
        } catch (dbErr) {
          console.warn('[Arab Local Order DB Insert Exception]:', dbErr);
        }
      }
    }

    // Insert user notification in Supabase if logged in
    if (userId) {
      try {
        await supabaseAdmin.from('notifications').insert({
          user_id: userId,
          title: `متابعة طلب Arabi Pay مع الدعم المباشر #${orderRef}`,
          message: `طلبك بقيمة ${displayPrice || '$0.00'} عبر Arabi Pay (${countryName || 'دولة عربية'} • ${methodName || 'تحويل محلي'}) تم تأكيده بالبصمة الذكية وهو قيد المتابعة مع الدعم المباشر. تذكر الالتزام بالسداد الفوري لتفادي تسجيل أي إنذار.`,
          type: 'order',
          is_read: false,
        });
      } catch (notifErr) {
        console.warn('[Arab Local Notification Insert Error]:', notifErr);
      }
    }

    // 4. Dispatch dedicated interactive verification alert to @UpStore_Local_pay_bot
    dispatchLocalPayOrderAlert({
      orderRef,
      sessionId: finalSessionId,
      customerName: profile?.display_name || user.email?.split('@')[0] || 'عميل UpStore',
      customerEmail: profile?.email || user.email || undefined,
      userId,
      phone: phone || profile?.phone,
      countryName: countryName || 'دولة عربية',
      countryFlag: countryFlag || '',
      methodName: methodName || 'تحويل محلي',
      displayPrice: displayPrice || 'غير محدد',
      totalUsd: totalUsd ? Number(totalUsd) : undefined,
      items: Array.isArray(items) ? items : [],
      userNote: userNote || undefined,
      customerIp: ip,
      biometricVerified: Boolean(biometricVerified),
      userStrikes: Number(profile?.strike_count || 0),
      clientTelemetry: clientTelemetry || undefined,
    }).catch((err) => {
      console.warn('[Local Pay Alert Background Error]:', err);
    });

    // Also dispatch legacy notice to @UpStore_payment_bot for audit logging
    dispatchArabLocalSupportAlert({
      sessionId: orderRef,
      countryName: countryName || 'دولة عربية',
      countryFlag: countryFlag || '',
      methodName: `Arabi Pay (${methodName || 'تحويل محلي'})`,
      displayPrice: displayPrice || 'غير محدد',
      items: Array.isArray(items) ? items : [],
      userNote: `${userNote ? `${userNote} • ` : ''}${biometricVerified ? 'تم تأكيد البصمة الذكية للجهاز ✅' : ''}${phone ? ` • هاتف: ${phone}` : ''}`,
      customerIp: ip,
    }).catch((err) => {
      console.warn('[Arab Local Alert Background Error]:', err);
    });

    return NextResponse.json({
      success: true,
      orderId: orderRef,
      sessionId: finalSessionId,
    });
  } catch (err: any) {
    console.error('[Arab Local Notify API Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 });
  }
}

