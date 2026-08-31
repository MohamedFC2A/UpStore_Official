import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireAuthenticatedUser, enforceSameOriginRequest } from '@/utils/security';
import { sendTelegramNotification, escapeHtml } from '@/utils/telegram';
import { generateSupportCode } from '@/utils/supportCode';

export async function GET(req: Request) {
  try {
    const auth = await requireAuthenticatedUser();
    if (auth.error || !auth.user) {
      return auth.error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: tickets, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Support Tickets GET Error]:', error);
      return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
    }

    return NextResponse.json({ tickets: tickets || [] });
  } catch (err: any) {
    console.error('[Support Tickets GET Exception]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const originError = await enforceSameOriginRequest(req);
    if (originError) return originError;

    const auth = await requireAuthenticatedUser();
    if (auth.error || !auth.user) {
      return auth.error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { subject, category, message, order_id, priority = 'Normal' } = body;

    if (!subject || typeof subject !== 'string' || subject.trim().length < 3) {
      return NextResponse.json(
        { error: 'يرجى كتابة موضوع واضح للتذكرة (3 أحرف على الأقل)' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || message.trim().length < 5) {
      return NextResponse.json(
        { error: 'يرجى كتابة تفاصيل المشكلة أو الاستفسار (5 أحرف على الأقل)' },
        { status: 400 }
      );
    }

    const cleanCategory = typeof category === 'string' && category.trim() ? category.trim() : 'استفسار عام';
    const cleanPriority = ['Normal', 'High', 'Urgent'].includes(priority) ? priority : 'Normal';
    const cleanOrderId = typeof order_id === 'string' && order_id.trim() ? order_id.trim() : null;

    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const ticketId = `TK-${randomSuffix}`;

    const supabaseAdmin = createAdminClient();

    // Fetch user profile for enriched context
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, display_name, role, device_fingerprint')
      .eq('id', auth.user.id)
      .maybeSingle();

    const userEmail = auth.user.email || profile?.email || 'N/A';
    const userName = profile?.display_name || 'عميل UpStore';
    const supportCode = generateSupportCode(auth.user.id, { deviceFingerprint: profile?.device_fingerprint });

    // Insert into support_tickets table
    const { data: ticketData, error: insertError } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        ticket_id: ticketId,
        user_id: auth.user.id,
        subject: subject.trim(),
        category: cleanCategory,
        message: message.trim(),
        status: 'Open',
        order_id: cleanOrderId,
        priority: cleanPriority,
        email: userEmail,
        support_code: supportCode,
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('[Support Ticket Insert Error]:', insertError);
      return NextResponse.json({ error: 'تعذر إنشاء التذكرة، يرجى المحاولة مرة أخرى.' }, { status: 500 });
    }

    // Insert user in-app notification
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: auth.user.id,
        title: `تم فتح التذكرة #${ticketId} بنجاح`,
        message: `تم استلام تذكرتك بخصوص "${subject.trim()}". سيقوم فريق الدعم بمراجعتها ومتابعتك عبر support@upstore.one ولوحة التحكم.`,
        type: 'support',
      });
    } catch {
      // ignore
    }

    // Send instant Telegram alert to admin/support team
    try {
      const priorityBadge = cleanPriority === 'Urgent' ? '🔴 عاجل جداً' : cleanPriority === 'High' ? '🟠 أولوية عالية' : '🟢 عادي';
      const telegramAlert = `
<b>🎫 تذكرة دعم فني جديدة (#${ticketId})</b>
━━━━━━━━━━━━━━━━━━
<b>العميل:</b> ${escapeHtml(userName)}
<b>البريد:</b> <code>${escapeHtml(userEmail)}</code>
<b>كود الدعم:</b> <code>${escapeHtml(supportCode)}</code>
<b>القسم / الفئة:</b> ${escapeHtml(cleanCategory)}
<b>الأولوية:</b> ${priorityBadge}
${cleanOrderId ? `<b>رقم الطلب المرتبط:</b> <code>${escapeHtml(cleanOrderId)}</code>\n` : ''}
<b>الموضوع:</b>
<b>${escapeHtml(subject.trim())}</b>

<b>تفاصيل الرسالة:</b>
${escapeHtml(message.trim())}

━━━━━━━━━━━━━━━━━━
<i>الرد والمتابعة متاحان عبر بوت تيليجرام أو البريد: support@upstore.one</i>
      `.trim();

      await sendTelegramNotification(telegramAlert);
    } catch (telegramErr) {
      console.warn('[Telegram Alert Warning]:', telegramErr);
    }

    return NextResponse.json({
      success: true,
      ticket: ticketData,
      supportEmail: 'support@upstore.one',
      message: 'تم فتح التذكرة بنجاح وتم إرسال نسخة لقسم الدعم الفني.',
    });
  } catch (err: any) {
    console.error('[Support Ticket Create Exception]:', err);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع أثناء معالجة التذكرة' }, { status: 500 });
  }
}
