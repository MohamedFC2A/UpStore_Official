import { NextResponse } from 'next/server';
import { fulfillOrderSession, fulfillOrderWithCustomKey } from '@/utils/fulfillment';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  answerPaymentBotCallbackQuery,
  editPaymentBotMessage,
  sendPaymentBotMessage,
  PAYMENT_BOT_TOKEN,
  setPaymentBotWebhook,
} from '@/utils/telegramPaymentBot';
import {
  escapeHtml,
  isAuthorizedTelegramAdmin,
  TELEGRAM_UNAUTHORIZED_MESSAGE,
  verifyTelegramWebhookSecret,
} from '@/utils/telegram';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Robust parser for admin account inputs (Email + Password)
 * Supports email:pass, multiline, or label-based inputs.
 */
function parseAccountInput(input: string): { email: string; pass: string; fullPayload: string } {
  const trimmed = input.trim();

  // Format 1: email:password (standard)
  if (trimmed.includes(':') && !trimmed.includes('\n')) {
    const parts = trimmed.split(':');
    const email = parts[0].trim();
    const pass = parts.slice(1).join(':').trim();
    return { email, pass, fullPayload: `${email}:${pass}` };
  }

  // Format 2: Multiline with labels (Email: ... \n Pass: ...)
  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
  let email = '';
  let pass = '';

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (
      lower.startsWith('email:') ||
      lower.startsWith('بريد:') ||
      lower.startsWith('ايميل:') ||
      lower.startsWith('mail:') ||
      lower.startsWith('user:') ||
      lower.startsWith('مستخدم:')
    ) {
      email = line.split(':')[1]?.trim() || '';
    } else if (
      lower.startsWith('pass:') ||
      lower.startsWith('password:') ||
      lower.startsWith('كلمة المرور:') ||
      lower.startsWith('رمز:') ||
      lower.startsWith('باسورد:')
    ) {
      pass = line.split(':')[1]?.trim() || '';
    }
  }

  if (email && pass) {
    return { email, pass, fullPayload: `${email}:${pass}` };
  }

  // Format 3: Two lines (Line 1: email, Line 2: password)
  if (lines.length >= 2) {
    return { email: lines[0], pass: lines[1], fullPayload: `${lines[0]}:${lines[1]}` };
  }

  // Format 4: Space-separated
  const spaceParts = trimmed.split(/\s+/);
  if (spaceParts.length === 2 && (spaceParts[0].includes('@') || spaceParts[1].length >= 4)) {
    return { email: spaceParts[0], pass: spaceParts[1], fullPayload: `${spaceParts[0]}:${spaceParts[1]}` };
  }

  // Fallback: single raw string
  return { email: trimmed, pass: 'N/A', fullPayload: trimmed };
}

export async function POST(req: Request) {
  try {
    // Cryptographic Secret Token Verification
    if (!verifyTelegramWebhookSecret(req, PAYMENT_BOT_TOKEN)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized secret token' }, { status: 403 });
    }

    const update = await req.json().catch(() => null);
    if (!update) {
      return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // ──────────────────────────────────────────────────────────
    // 1. Handle Inline Button Clicks (Callback Queries)
    // ──────────────────────────────────────────────────────────
    if (update.callback_query) {
      const { id, from, message, data } = update.callback_query;
      const chatId = message?.chat?.id || from?.id;
      const messageId = message?.message_id;

      if (!chatId || !await isAuthorizedTelegramAdmin(chatId)) {
        await answerPaymentBotCallbackQuery(id, '⛔ غير مصرح لك بهذا الإجراء', true);
        return NextResponse.json({ ok: true });
      }

      if (!data) {
        await answerPaymentBotCallbackQuery(id, 'لا يوجد إجراء محدد');
        return NextResponse.json({ ok: true });
      }

      // ── A. Approve Auto (From Stock) ──
      if (data.startsWith('approve_auto:') || data.startsWith('approve_order:')) {
        const sessionId = data.replace('approve_auto:', '').replace('approve_order:', '').trim();
        console.log(`[Payment Bot] Admin ${from?.first_name} approved session auto: ${sessionId}`);

        const success = await fulfillOrderSession(sessionId);

        if (success) {
          await answerPaymentBotCallbackQuery(
            id,
            'تم اعتماد وتسليم الطلب من المخزون بنجاح!',
            true
          );

          if (chatId && messageId) {
            const shortId = sessionId.replace('manual_', '').replace('bybit_', '').split('_')[0].substring(0, 8).toUpperCase();
            const updatedText = `
<b>تم اعتماد وتسليم الطلب #${shortId} آلياً!</b>
━━━━━━━━━━━━━━━━━━━━━━━━━
<b>الجلسة:</b> <code>${sessionId}</code>
<b>المعتمد:</b> ${escapeHtml(from?.first_name || 'Admin')}
<b>الوقت:</b> ${new Date().toLocaleTimeString('ar-EG')}
<b>الحالة:</b> مكتمل وتم تخصيص التراخيص الرقمية من المخزون وإشعار العميل فوراً.
            `.trim();

            await editPaymentBotMessage(chatId, messageId, updatedText, [
              [{ text: 'فتح لوحة التحكم', url: 'https://upstore.one/admin' }],
            ]);
          }
        } else {
          await answerPaymentBotCallbackQuery(
            id,
            'المخزون غير متوفر أو يتطلب إدخال يدوي. اختر كتابة مفتاح أو حساب.',
            true
          );

          if (chatId) {
            const shortId = sessionId.replace('manual_', '').replace('bybit_', '').split('_')[0].substring(0, 8).toUpperCase();
            await sendPaymentBotMessage(
              chatId,
              `<b>تنبيه مخزون للطلب #${shortId}:</b>\nالمخزون الآلي غير متوفر لهذا المنتج. يرجى اختيار إدخال المفتاح أو بيانات الحساب يدوياً أدناه:`,
              [
                [
                  { text: 'إدخال مفتاح ترخيص', callback_data: `prompt_key:${sessionId}` },
                  { text: 'إدخال بيانات حساب', callback_data: `prompt_account:${sessionId}` },
                ],
              ]
            );
          }
        }

        return NextResponse.json({ ok: true });
      }

      // ── B. Prompt for License Key Entry ──
      if (data.startsWith('prompt_key:')) {
        const sessionId = data.replace('prompt_key:', '').trim();
        const shortId = sessionId.replace('manual_', '').replace('bybit_', '').split('_')[0].substring(0, 8).toUpperCase();

        if (chatId) {
          // Fetch order details for rich prompt
          const { data: ords } = await supabaseAdmin
            .from('orders')
            .select('id, user_id, amount, products(name, name_ar)')
            .or(`session_id.ilike.%${sessionId}%,id.ilike.${sessionId}%`);

          const prod = ords && ords[0]?.products as any;
          const prodName = prod?.name_ar || prod?.name || 'المنتج الرقمي';

          // Save pending admin state
          await supabaseAdmin.from('site_settings').upsert({
            key: `telegram_bot_pending_action_${chatId}`,
            value: JSON.stringify({
              action: 'awaiting_key',
              sessionId,
              messageId,
              timestamp: Date.now(),
            }),
          });

          await answerPaymentBotCallbackQuery(id, 'ضع مفتاح الترخيص أو كود التفعيل...');

          await sendPaymentBotMessage(
            chatId,
            `
<b>إدخال مفتاح ترخيص / اشتراك للطلب #${shortId}</b>
━━━━━━━━━━━━━━━━━━━━━━━━━
<b>المنتج:</b> ${escapeHtml(prodName)}
<b>معرف الجلسة:</b> <code>${sessionId}</code>

<b>ضع مفتاح الترخيص الآن:</b>
أرسل كود التفعيل أو المفتاح كرد مباشر على هذه الرسالة أو كرسالة في المحادثة.

<i>مثال:</i>
<code>XXXXX-XXXXX-XXXXX-XXXXX</code>

<i>لإلغاء العملية أرسل <code>/cancel</code></i>
            `.trim(),
            {
              force_reply: true,
              input_field_placeholder: 'أدخل مفتاح الترخيص أو كود التفعيل هنا...',
            }
          );
        }

        return NextResponse.json({ ok: true });
      }

      // ── C. Prompt for Account Entry (Email + Password) ──
      if (data.startsWith('prompt_account:')) {
        const sessionId = data.replace('prompt_account:', '').trim();
        const shortId = sessionId.replace('manual_', '').replace('bybit_', '').split('_')[0].substring(0, 8).toUpperCase();

        if (chatId) {
          // Fetch order details for rich prompt
          const { data: ords } = await supabaseAdmin
            .from('orders')
            .select('id, user_id, amount, products(name, name_ar)')
            .or(`session_id.ilike.%${sessionId}%,id.ilike.${sessionId}%`);

          const prod = ords && ords[0]?.products as any;
          const prodName = prod?.name_ar || prod?.name || 'حساب رقمي';

          // Save pending admin state
          await supabaseAdmin.from('site_settings').upsert({
            key: `telegram_bot_pending_action_${chatId}`,
            value: JSON.stringify({
              action: 'awaiting_account',
              sessionId,
              messageId,
              timestamp: Date.now(),
            }),
          });

          await answerPaymentBotCallbackQuery(id, 'ضع البريد وكلمة المرور...');

          await sendPaymentBotMessage(
            chatId,
            `
<b>إدخال بيانات حساب (البريد وكلمة المرور) للطلب #${shortId}</b>
━━━━━━━━━━━━━━━━━━━━━━━━━
<b>المنتج:</b> ${escapeHtml(prodName)}
<b>معرف الجلسة:</b> <code>${sessionId}</code>

<b>ضع بيانات الحساب كرد على هذه الرسالة كالتالي:</b>

<code>mojajfe@gmail.com</code>
<code>gool20003@3#</code>

<i>أو بتنسيق سطر واحد:</i>
<code>email@gmail.com:password123</code>

<i>لإلغاء العملية أرسل <code>/cancel</code></i>
            `.trim(),
            {
              force_reply: true,
              input_field_placeholder: 'ضع البريد والباسورد على سطرين أو مفصول بنقطتين...',
            }
          );
        }

        return NextResponse.json({ ok: true });
      }

      // ── D. Cancel Pending Action ──
      if (data.startsWith('cancel_action:')) {
        if (chatId) {
          await supabaseAdmin
            .from('site_settings')
            .delete()
            .eq('key', `telegram_bot_pending_action_${chatId}`);
          await answerPaymentBotCallbackQuery(id, 'تم إلغاء الإجراء بنجاح.');
          await sendPaymentBotMessage(chatId, 'تم إلغاء وضع إدخال البيانات للطلب.');
        }
        return NextResponse.json({ ok: true });
      }

      // ── E. Reject Order ──
      if (data.startsWith('reject_order:')) {
        const sessionId = data.replace('reject_order:', '').trim();
        console.log(`[Payment Bot] Admin ${from?.first_name} rejected session: ${sessionId}`);

        await supabaseAdmin
          .from('orders')
          .update({ status: 'cancelled', product_key: 'PAYMENT_REJECTED' })
          .eq('session_id', sessionId);

        await answerPaymentBotCallbackQuery(id, 'تم رفض الطلب وإلغاء المعاملة.', true);

        if (chatId && messageId) {
          const shortId = sessionId.replace('manual_', '').replace('bybit_', '').split('_')[0].substring(0, 8).toUpperCase();
          const updatedText = `
<b>تم رفض هذا الطلب #${shortId}</b>
━━━━━━━━━━━━━━━━━━━━━━━━━
<b>الجلسة:</b> <code>${sessionId}</code>
<b>بواسطة:</b> ${escapeHtml(from?.first_name || 'Admin')}
<b>الوقت:</b> ${new Date().toLocaleTimeString('ar-EG')}
<b>الحالة:</b> تم إلغاء الطلب ورفض الإيصال المرفق.
          `.trim();

          await editPaymentBotMessage(chatId, messageId, updatedText, [
            [{ text: 'لوحة التحكم', url: 'https://upstore.one/admin' }],
          ]);
        }

        return NextResponse.json({ ok: true });
      }
    }

    // ──────────────────────────────────────────────────────────
    // 2. Handle Incoming Text Messages & Direct Admin Inputs
    // ──────────────────────────────────────────────────────────
    if (update.message) {
      const { chat, text, from } = update.message;
      const chatId = chat?.id;

      if (!chatId || !text) {
        return NextResponse.json({ ok: true });
      }

      // Security Guard: Reject unauthorized users
      const isAuth = await isAuthorizedTelegramAdmin(chatId);
      if (!isAuth) {
        await sendPaymentBotMessage(chatId, TELEGRAM_UNAUTHORIZED_MESSAGE);
        return NextResponse.json({ ok: true, blocked: true });
      }

      const trimmedText = text.trim();

      // ── Start / Help Commands ──
      if (trimmedText === '/start' || trimmedText === '/help') {
        const welcome = `
أهلاً بك <b>${escapeHtml(from?.first_name || 'أدمن')}</b> في بوت إدارة المدفوعات والاعتماد الفوري لمتجر <b>UpStore</b>!
━━━━━━━━━━━━━━━━━━━━━━━━━

<b>مميزات البوت:</b>
1. استقبال إشعارات الدفع والتحويلات مع فحص الإيصالات بالذكاء الاصطناعي (AI OCR).
2. اعتماد وتسليم آلي من المخزون بنقرة واحدة.
3. <b>إدخال مفاتيح التراخيص والاشتراكات</b> يدوياً وإرسالها فوراً للعميل.
4. <b>إدخال بيانات الحسابات (Email:Pass)</b> لتسليم اشتراكات المنصات (Netflix, ChatGPT, Spotify...).

<b>أوامر سريعة:</b>
• <code>/key_رقم_الطلب المفتاح</code>
• <code>/account_رقم_الطلب email:password</code>
• <code>/cancel</code> لإلغاء أي إدخال معلق
        `.trim();

        await sendPaymentBotMessage(chatId, welcome, [
          [{ text: 'فتح لوحة التحكم الرئيسية', url: 'https://upstore.one/admin' }],
        ]);
        return NextResponse.json({ ok: true });
      }

      // ── Cancel Command ──
      if (trimmedText === '/cancel') {
        await supabaseAdmin
          .from('site_settings')
          .delete()
          .eq('key', `telegram_bot_pending_action_${chatId}`);
        await sendPaymentBotMessage(chatId, 'تم إلغاء أي إدخال معلق.');
        return NextResponse.json({ ok: true });
      }

      // ── Command: /key_<id> or /key <id> <the_key> ──
      if (trimmedText.startsWith('/key_') || trimmedText.startsWith('/key ')) {
        let targetId = '';
        let licenseKey = '';

        if (trimmedText.startsWith('/key_')) {
          const parts = trimmedText.replace('/key_', '').split(/\s+/);
          targetId = parts[0];
          licenseKey = parts.slice(1).join(' ').trim();
        } else {
          const parts = trimmedText.replace('/key ', '').split(/\s+/);
          targetId = parts[0];
          licenseKey = parts.slice(1).join(' ').trim();
        }

        if (!targetId || !licenseKey) {
          await sendPaymentBotMessage(
            chatId,
            'يرجى كتابة الأمر بالتنسيق الصحيح:\n<code>/key_رقم_الطلب المفتاح_الرقمي</code>'
          );
          return NextResponse.json({ ok: true });
        }

        const res = await fulfillOrderWithCustomKey(targetId, licenseKey);
        if (res.success) {
          await sendPaymentBotMessage(
            chatId,
            `
<b>تم تسليم مفتاح الترخيص بنجاح!</b>
━━━━━━━━━━━━━━━━━━━━━━━━━
<b>الطلب:</b> <code>#${res.orderId}</code>
<b>المنتج:</b> ${escapeHtml(res.productName || 'منتج رقمي')}
<b>العميل:</b> ${escapeHtml(res.customerEmail || 'العميل')}
<b>المفتاح المسلم:</b> <code>${escapeHtml(licenseKey)}</code>

<i>تم تحديث حالة الطلب إلى مكتمل، وحفظ المفتاح في إيصال الدفع وإشعار العميل فوراً.</i>
            `.trim(),
            [[{ text: 'لوحة التحكم', url: 'https://upstore.one/admin' }]]
          );
        } else {
          await sendPaymentBotMessage(
            chatId,
            `لم يتم العثور على طلب مطابق للمعرف: <code>${targetId}</code>`
          );
        }
        return NextResponse.json({ ok: true });
      }

      // ── Command: /account_<id> or /account <id> <email:pass> ──
      if (trimmedText.startsWith('/account_') || trimmedText.startsWith('/account ')) {
        let targetId = '';
        let accountPayload = '';

        if (trimmedText.startsWith('/account_')) {
          const parts = trimmedText.replace('/account_', '').split(/\s+/);
          targetId = parts[0];
          accountPayload = parts.slice(1).join(' ').trim();
        } else {
          const parts = trimmedText.replace('/account ', '').split(/\s+/);
          targetId = parts[0];
          accountPayload = parts.slice(1).join(' ').trim();
        }

        if (!targetId || !accountPayload) {
          await sendPaymentBotMessage(
            chatId,
            'يرجى كتابة الأمر بالتنسيق الصحيح:\n<code>/account_رقم_الطلب email@domain.com:password123</code>'
          );
          return NextResponse.json({ ok: true });
        }

        const parsed = parseAccountInput(accountPayload);
        const res = await fulfillOrderWithCustomKey(targetId, parsed.fullPayload);

        if (res.success) {
          await sendPaymentBotMessage(
            chatId,
            `
<b>تم تسليم بيانات الحساب بنجاح!</b>
━━━━━━━━━━━━━━━━━━━━━━━━━
<b>الطلب:</b> <code>#${res.orderId}</code>
<b>المنتج:</b> ${escapeHtml(res.productName || 'حساب رقمي')}
<b>العميل:</b> ${escapeHtml(res.customerEmail || 'العميل')}
<b>البريد:</b> <code>${escapeHtml(parsed.email)}</code>
<b>كلمة المرور:</b> <code>${escapeHtml(parsed.pass)}</code>

<i>تم تحديث حالة الطلب إلى مكتمل، وحفظ بيانات الحساب في إيصال الدفع وإشعار العميل فوراً.</i>
            `.trim(),
            [[{ text: 'لوحة التحكم', url: 'https://upstore.one/admin' }]]
          );
        } else {
          await sendPaymentBotMessage(
            chatId,
            `لم يتم العثور على طلب مطابق للمعرف: <code>${targetId}</code>`
          );
        }
        return NextResponse.json({ ok: true });
      }

      // ── Check Pending Interactive State ──
      const { data: pendingSetting } = await supabaseAdmin
        .from('site_settings')
        .select('value')
        .eq('key', `telegram_bot_pending_action_${chatId}`)
        .maybeSingle();

      if (pendingSetting?.value) {
        let state: any = null;
        try {
          state = typeof pendingSetting.value === 'string' ? JSON.parse(pendingSetting.value) : pendingSetting.value;
        } catch {}

        if (state && state.sessionId && state.action) {
          // Clear state first
          await supabaseAdmin
            .from('site_settings')
            .delete()
            .eq('key', `telegram_bot_pending_action_${chatId}`);

          if (state.action === 'awaiting_key') {
            const key = trimmedText;
            const res = await fulfillOrderWithCustomKey(state.sessionId, key);

            if (res.success) {
              await sendPaymentBotMessage(
                chatId,
                `
<b>تم تسليم مفتاح الترخيص بنجاح!</b>
━━━━━━━━━━━━━━━━━━━━━━━━━
<b>الطلب:</b> <code>#${res.orderId}</code>
<b>المنتج:</b> ${escapeHtml(res.productName || 'اشتراك / ترخيص')}
<b>العميل:</b> ${escapeHtml(res.customerEmail || 'العميل')}
<b>المفتاح المسلم:</b> <code>${escapeHtml(key)}</code>

<i>تم إرسال المفتاح للعميل وحفظه في حسابه وإيصال الدفع بنجاح.</i>
                `.trim(),
                [[{ text: 'لوحة التحكم', url: 'https://upstore.one/admin' }]]
              );

              if (state.messageId) {
                const shortId = state.sessionId.replace('manual_', '').replace('bybit_', '').split('_')[0].substring(0, 8).toUpperCase();
                await editPaymentBotMessage(chatId, state.messageId, `<b>تم تسليم مفتاح الترخيص للطلب #${shortId} بنجاح!</b>`, [
                  [{ text: 'لوحة التحكم', url: 'https://upstore.one/admin' }],
                ]);
              }
            } else {
              await sendPaymentBotMessage(chatId, `تعذر تسليم المفتاح للجلسة: <code>${state.sessionId}</code>`);
            }

            return NextResponse.json({ ok: true });
          }

          if (state.action === 'awaiting_account') {
            const parsed = parseAccountInput(trimmedText);
            const res = await fulfillOrderWithCustomKey(state.sessionId, parsed.fullPayload);

            if (res.success) {
              await sendPaymentBotMessage(
                chatId,
                `
<b>تم تسليم بيانات الحساب بنجاح!</b>
━━━━━━━━━━━━━━━━━━━━━━━━━
<b>الطلب:</b> <code>#${res.orderId}</code>
<b>المنتج:</b> ${escapeHtml(res.productName || 'حساب رقمي')}
<b>العميل:</b> ${escapeHtml(res.customerEmail || 'العميل')}
<b>البريد:</b> <code>${escapeHtml(parsed.email)}</code>
<b>كلمة المرور:</b> <code>${escapeHtml(parsed.pass)}</code>

<i>تم إرسال بيانات الحساب للعميل وحفظها في إيصال الدفع بنجاح.</i>
                `.trim(),
                [[{ text: 'لوحة التحكم', url: 'https://upstore.one/admin' }]]
              );

              if (state.messageId) {
                const shortId = state.sessionId.replace('manual_', '').replace('bybit_', '').split('_')[0].substring(0, 8).toUpperCase();
                await editPaymentBotMessage(chatId, state.messageId, `<b>تم تسليم بيانات الحساب للطلب #${shortId} بنجاح!</b>`, [
                  [{ text: 'لوحة التحكم', url: 'https://upstore.one/admin' }],
                ]);
              }
            } else {
              await sendPaymentBotMessage(chatId, `تعذر تسليم بيانات الحساب للجلسة: <code>${state.sessionId}</code>`);
            }

            return NextResponse.json({ ok: true });
          }
        }
      }

      // ── Smart Fallback: Admin replied directly to an Order Alert or Prompt Message ──
      const replyTo = update.message.reply_to_message;
      if (replyTo) {
        const replyText = replyTo.text || replyTo.caption || '';
        
        // Extract session ID or order ID from the replied message
        const sessionMatch = replyText.match(/(?:manual|bybit)_[0-9a-zA-Z_]+/) || replyText.match(/#([0-9a-zA-Z_]{6,12})/);
        const extractedId = sessionMatch ? sessionMatch[0].replace('#', '') : null;

        if (extractedId) {
          // Check if payload is an account (contains @ or multiple lines or :) or key
          const isAccountFormat = trimmedText.includes('@') || trimmedText.includes('\n') || (trimmedText.includes(':') && !trimmedText.startsWith('http'));

          if (isAccountFormat) {
            const parsed = parseAccountInput(trimmedText);
            const res = await fulfillOrderWithCustomKey(extractedId, parsed.fullPayload);

            if (res.success) {
              await sendPaymentBotMessage(
                chatId,
                `
<b>تم تسليم بيانات الحساب بنجاح!</b>
━━━━━━━━━━━━━━━━━━━━━━━━━
<b>الطلب:</b> <code>#${res.orderId}</code>
<b>المنتج:</b> ${escapeHtml(res.productName || 'حساب رقمي')}
<b>العميل:</b> ${escapeHtml(res.customerEmail || 'العميل')}
<b>البريد:</b> <code>${escapeHtml(parsed.email)}</code>
<b>كلمة المرور:</b> <code>${escapeHtml(parsed.pass)}</code>

<i>تم إرسال بيانات الحساب للعميل وتحديث إيصال الدفع بنجاح.</i>
                `.trim(),
                [[{ text: 'لوحة التحكم', url: 'https://upstore.one/admin' }]]
              );
              return NextResponse.json({ ok: true });
            }
          } else {
            const res = await fulfillOrderWithCustomKey(extractedId, trimmedText);

            if (res.success) {
              await sendPaymentBotMessage(
                chatId,
                `
<b>تم تسليم مفتاح الترخيص بنجاح!</b>
━━━━━━━━━━━━━━━━━━━━━━━━━
<b>الطلب:</b> <code>#${res.orderId}</code>
<b>المنتج:</b> ${escapeHtml(res.productName || 'اشتراك / ترخيص')}
<b>العميل:</b> ${escapeHtml(res.customerEmail || 'العميل')}
<b>المفتاح المسلم:</b> <code>${escapeHtml(trimmedText)}</code>

<i>تم إرسال المفتاح للعميل وحفظه في إيصال الدفع بنجاح.</i>
                `.trim(),
                [[{ text: 'لوحة التحكم', url: 'https://upstore.one/admin' }]]
              );
              return NextResponse.json({ ok: true });
            }
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[Payment Bot Webhook Handler Error]:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const webhookResult = await setPaymentBotWebhook();
  return NextResponse.json({
    status: 'active',
    bot: '@UpStore_payment_bot',
    service: 'UpStore Payment & Instant Fulfillment Bot Webhook',
    webhook_registration: webhookResult,
  });
}
