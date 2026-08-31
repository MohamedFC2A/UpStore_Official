import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireAdminUser } from '@/utils/security';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminUser();
    if (auth.error || !auth.user) {
      return auth.error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, userId, reason, orderId, phone } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Fetch target profile
    const { data: profile, error: fetchErr } = await supabaseAdmin
      .from('profiles')
      .select('id, email, display_name, phone, strike_count, strikes_history, is_banned, ban_reason, is_phone_blacklisted')
      .eq('id', userId)
      .single();

    if (fetchErr || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const currentStrikes = Number(profile.strike_count || 0);
    const existingHistory = Array.isArray(profile.strikes_history) ? profile.strikes_history : [];

    let updatedFields: Record<string, any> = {};
    let notificationTitle = '';
    let notificationMessage = '';

    if (action === 'add_strike') {
      const newStrikeCount = currentStrikes + 1;
      const strikeEntry = {
        id: crypto.randomUUID(),
        strike_number: newStrikeCount,
        reason: reason || 'عدم الالتزام بسداد طلب Arabi Pay بعد التأكيد بالبصمة الذكية',
        order_id: orderId || null,
        created_at: new Date().toISOString(),
        issued_by: auth.user.email || 'Support Team',
      };

      const newHistory = [...existingHistory, strikeEntry];
      const shouldBan = newStrikeCount >= 2;

      updatedFields = {
        strike_count: newStrikeCount,
        strikes_history: newHistory,
        is_banned: shouldBan ? true : Boolean(profile.is_banned),
        ban_reason: shouldBan
          ? (reason || 'تم حظر الحساب نهائياً لتكرار عدم الالتزام بسداد طلبات Arabi Pay (الوصول للإنذار الثاني 2/2).')
          : profile.ban_reason,
        is_phone_blacklisted: shouldBan ? true : Boolean(profile.is_phone_blacklisted),
      };

      if (phone && !profile.phone) {
        updatedFields.phone = phone;
      }

      if (shouldBan) {
        notificationTitle = 'تم حظر الحساب نهائياً (2/2 Strikes)';
        notificationMessage = `تم حظر حسابك ورقم هاتفك نهائياً بعد تسجيل الإنذار الثاني بسبب مخالفة شروط Arabi Pay وعدم السداد. لاستئناف الخدمة يرجى التواصل مباشرة مع الدعم الفني.`;
      } else {
        notificationTitle = 'إنذار أول بشأن طلب Arabi Pay (1/2)';
        notificationMessage = `تم تسجيل إنذار رسمي (Strike 1/2) على حسابك بسبب عدم إتمام سداد طلب Arabi Pay بعد تأكيده بالبصمة. نود تذكيرك بأن تكرار المخالفة سيؤدي للحظر التلقائي النهائي لحسابك وهاتفك.`;
      }
    } else if (action === 'remove_strike') {
      const newStrikeCount = Math.max(0, currentStrikes - 1);
      const isUnbanned = newStrikeCount < 2;

      updatedFields = {
        strike_count: newStrikeCount,
        is_banned: isUnbanned ? false : profile.is_banned,
        ban_reason: isUnbanned ? null : profile.ban_reason,
        is_phone_blacklisted: isUnbanned ? false : profile.is_phone_blacklisted,
      };

      notificationTitle = 'تمت إزالة الإنذار من حسابك';
      notificationMessage = `قام فريق الدعم بإزالة الإنذار المسجل على حسابك. رصيد إنذاراتك الحالي: (${newStrikeCount}/2).`;
    } else if (action === 'ban_user') {
      updatedFields = {
        is_banned: true,
        ban_reason: reason || 'تم حظر الحساب بقرار إداري مباشر.',
        strike_count: Math.max(2, currentStrikes),
        is_phone_blacklisted: true,
      };
      if (phone) updatedFields.phone = phone;

      notificationTitle = 'تم حظر الحساب';
      notificationMessage = reason || 'تم حظر حسابك ورقم هاتفك من استخدام UpStore. يرجى مراجعة الدعم الفني.';
    } else if (action === 'unban_user') {
      updatedFields = {
        is_banned: false,
        ban_reason: null,
        strike_count: 0,
        is_phone_blacklisted: false,
      };

      notificationTitle = 'تم فك حظر حسابك بنجاح';
      notificationMessage = 'تمت مراجعة حسابك وفك الحظر بالكامل وإعادة تفعيل كافة الخدمات في متجر UpStore.';
    } else if (action === 'blacklist_phone') {
      updatedFields = {
        is_phone_blacklisted: true,
      };
      if (phone) updatedFields.phone = phone;
    } else if (action === 'unblacklist_phone') {
      updatedFields = {
        is_phone_blacklisted: false,
      };
    } else {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    // 2. Perform profile update in Supabase
    const { data: updatedProfile, error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update(updatedFields)
      .eq('id', userId)
      .select()
      .single();

    if (updateErr) {
      console.error('[Strike Admin Update Error]:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 3. Insert notification if applicable
    if (notificationTitle) {
      try {
        await supabaseAdmin.from('notifications').insert({
          user_id: userId,
          title: notificationTitle,
          message: notificationMessage,
          type: updatedFields.is_banned ? 'warning' : 'info',
          is_read: false,
        });
      } catch (notifErr) {
        console.warn('[Strike Notification Error]:', notifErr);
      }
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
    });
  } catch (err: any) {
    console.error('[Admin Strike API Exception]:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
