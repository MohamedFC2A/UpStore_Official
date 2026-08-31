import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  buildSafeStorageObjectName,
  enforceSameOriginRequest,
  requireAuthenticatedUser,
} from '@/utils/security';
import { analyzeReceiptWithOcr } from '@/utils/receiptOcr';

export async function POST(request: NextRequest) {
  try {
    const originError = await enforceSameOriginRequest(request);
    if (originError) {
      return originError;
    }

    const auth = await requireAuthenticatedUser().catch(() => ({ user: null, error: null }));
    const user = auth?.user || null;
    const supabaseAdmin = createAdminClient();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const sessionId = (formData.get('sessionId') as string) || '';

    // If neither authenticated nor valid sessionId provided:
    if (!user && !sessionId) {
      return NextResponse.json({ error: 'Unauthorized: Session or login required' }, { status: 401 });
    }

    // Check if valid orders exist for this session
    let sessionOrders: any[] = [];
    if (sessionId) {
      const { data: dbOrders } = await supabaseAdmin
        .from('orders')
        .select('id, user_id, status, amount, currency')
        .eq('session_id', sessionId);
      sessionOrders = dbOrders || [];
    }

    if (!user && sessionOrders.length === 0) {
      return NextResponse.json({ error: 'Unauthorized: Invalid checkout session' }, { status: 401 });
    }

    // ─── 1. CHECK IF USER IS ALREADY BANNED ───
    const effectiveUserId = user?.id || sessionOrders[0]?.user_id;
    let profile: any = null;
    if (effectiveUserId) {
      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('id, role, fraud_strikes, is_banned, ban_reason, email')
        .eq('id', effectiveUserId)
        .maybeSingle();
      profile = prof;
    }

    const isAdmin = profile?.role === 'admin' || user?.email === 'mo.matany@gmail.com' || profile?.email === 'mo.matany@gmail.com';
    const maxStrikes = isAdmin ? 15 : 3;

    if (profile?.is_banned) {
      return NextResponse.json(
        {
          error: 'ACCOUNT_BANNED',
          banned: true,
          message:
            profile.ban_reason ||
            'تم حظر حسابك نهائياً من استخدام UpStore بسبب تكرار رفع إيصالات مزيفة أو محاولات احتيال.',
        },
        { status: 403 }
      );
    }

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'نوع الملف غير مدعوم. الصيغ المسموحة: PNG, JPG, WebP' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'حجم الصورة كبير جداً. الحد الأقصى: 5 ميجابايت' },
        { status: 400 }
      );
    }

    // Generate a unique filename
    const ext = file.name.split('.').pop() || 'png';
    const fileName = buildSafeStorageObjectName('receipt', ext);
    const filePath = `${fileName}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage receipts bucket
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('receipts')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('[Receipt Upload Storage Error]:', uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get the public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('receipts')
      .getPublicUrl(uploadData.path);

    const publicUrl = publicUrlData.publicUrl;

    // Optional expected amount from formData
    const rawExpectedAmount = formData.get('expectedAmount');
    const expectedAmount = rawExpectedAmount ? parseFloat(String(rawExpectedAmount)) : undefined;

    // ─── 2. RUN FORENSIC AI OCR FRAUD INSPECTION ───
    let ocrResult = null;
    try {
      ocrResult = await analyzeReceiptWithOcr(buffer, file.type, expectedAmount);
    } catch (ocrErr) {
      console.warn('[Receipt Upload] OCR processing error:', ocrErr);
    }

    const isFraud = Boolean(ocrResult?.isFraud);
    const fraudType = ocrResult?.fraudType || 'unspecified_fraud';
    const fraudReason = ocrResult?.fraudReason || 'تم رصد إيصال غير قانوني أو محول لشخص آخر';

    // ─── 3. HANDLE FRAUD DETECTION & AUTOMATED STRIKE / BAN LOGIC ───
    if (isFraud) {
      const currentStrikes = Number(profile?.fraud_strikes || 0);
      const newStrikes = currentStrikes + 1;

      // Log incident into receipt_fraud_logs
      await supabaseAdmin.from('receipt_fraud_logs').insert({
        user_id: effectiveUserId || null,
        session_id: sessionId || null,
        receipt_url: publicUrl,
        detected_recipient: ocrResult?.recipient || null,
        expected_recipient: 'mo_matany / 01041140422',
        fraud_type: fraudType,
        reason: fraudReason,
        strike_number: newStrikes,
        raw_analysis: ocrResult,
      });

      // Send Instant Telegram Security Alert
      try {
        const { sendPaymentBotMessage } = await import('@/utils/telegramPaymentBot');
        const adminChatId = process.env.TELEGRAM_PAYMENT_CHAT_ID || process.env.TELEGRAM_CHAT_ID || '8982469612';
        const userDisplay = user?.email || profile?.email || user?.id || effectiveUserId || 'Guest';
        const alertMsg = `
<b>تحذير أمني: رصد محاولة احتيال / إيصال غير مطابق!</b>
━━━━━━━━━━━━━━━━━━━━━━━━━
<b>المستخدم:</b> <code>${userDisplay}</code> ${isAdmin ? '(حساب إدارة تجريبي)' : ''}
<b>عدد المخالفات:</b> <code>${newStrikes} / ${maxStrikes}</code> ${newStrikes >= maxStrikes ? '(تم الحظر النهائي)' : ''}
<b>نوع المخالفة:</b> <code>${fraudType}</code>
<b>السبب:</b> ${fraudReason}
<b>المحول إليه المكتشف:</b> <code>${ocrResult?.recipient || 'غير معتمد / وهمي'}</code>
<b>المحول إليه المطلوب:</b> <code>mo_matany / 01041140422</code>
<b>الجلسة:</b> <code>${sessionId || 'N/A'}</code>
<b>رابط الإيصال:</b> <a href="${publicUrl}">اضغط للمعاينة</a>
        `.trim();
        await sendPaymentBotMessage(adminChatId, alertMsg);
      } catch (tgErr) {
        console.warn('[Telegram Fraud Alert Error]:', tgErr);
      }

      if (newStrikes >= maxStrikes) {
        // PERMANENT BAN TRIGGERED
        if (effectiveUserId) {
          await supabaseAdmin
            .from('profiles')
            .update({
              fraud_strikes: newStrikes,
              is_banned: true,
              ban_reason: `تم حظر الحساب نهائياً لتكرار محاولات رفع إيصالات مزيفة أو محولة لأشخاص آخرين (${maxStrikes} مخالفات رصدها الذكاء الاصطناعي). آخر سبب: ${fraudReason}`,
              banned_at: new Date().toISOString(),
            })
            .eq('id', effectiveUserId);
        }

        if (sessionId) {
          await supabaseAdmin
            .from('orders')
            .update({ status: 'cancelled' })
            .eq('session_id', sessionId);
        }

        return NextResponse.json(
          {
            error: 'PERMANENTLY_BANNED',
            banned: true,
            strikeCount: newStrikes,
            maxStrikes,
            message:
              `تم حظر حسابك نهائياً: لقد قمت بارتكاب ${maxStrikes} مخالفات برفع إيصالات غير مطابقة أو محولة لأشخاص آخرين غير الحساب المعتمد (mo_matany / 01041140422). تم إيقاف الحساب بشكل دائم.`,
          },
          { status: 403 }
        );
      } else {
        // INCREMENT STRIKE & RETURN STRICT WARNING
        if (effectiveUserId) {
          await supabaseAdmin
            .from('profiles')
            .update({
              fraud_strikes: newStrikes,
            })
            .eq('id', effectiveUserId);
        }

        const remainingStrikes = maxStrikes - newStrikes;
        const fierceWarning = `تحذير أمني صارم (المخالفة ${newStrikes} من ${maxStrikes}): تم اكتشاف أن الإيصال المرفوع ${
          fraudType === 'wrong_recipient'
            ? `محول لحساب آخر (${ocrResult?.recipient || 'غير معتمد'}) وليس للحساب الرسمي المعتمد (mo_matany / 01041140422).`
            : 'صورة غير صالحة أو وهمية وليست إيصال تحويل حقيقي.'
        } تم تسجيل هذه المخالفة في سجلك الأمني. متبقي لديك (${remainingStrikes}) محاولات قبل حظر الحساب نهائياً.${isAdmin ? ' (وضع الاختبار للإدارة: مسموح حتى 15 مخالفة)' : ''}`;

        return NextResponse.json(
          {
            error: 'FRAUD_DETECTED',
            isFraud: true,
            strikeCount: newStrikes,
            maxStrikes,
            remainingStrikes,
            isAdmin,
            detectedRecipient: ocrResult?.recipient || null,
            reason: fraudReason,
            message: fierceWarning,
          },
          { status: 400 }
        );
      }
    }

    // ─── 4. HANDLE MISSING RECIPIENT -> STRICT REVIEW STATUS ───
    const isStrictReview = ocrResult?.status === 'strict_review' || ocrResult?.recipientStatus === 'recipient_missing';

    // If sessionId is provided, save receipt and OCR results to orders table
    if (sessionId) {
      try {
        const fullSender =
          [ocrResult?.senderName, ocrResult?.senderAccount].filter(Boolean).join(' - ') ||
          ocrResult?.senderPhone ||
          null;

        await supabaseAdmin
          .from('orders')
          .update({
            payment_screenshot: publicUrl,
            payment_sender: fullSender,
            payment_transaction_id: ocrResult?.referenceNumber || null,
          })
          .eq('session_id', sessionId);

        // Fetch order details to notify Telegram Admin Payment Bot immediately
        const { data: orders } = await supabaseAdmin
          .from('orders')
          .select('id, amount, product_id, products(name)')
          .eq('session_id', sessionId);

        if (orders && orders.length > 0) {
          const isSaudi = sessionId.includes('_sar');
          const isUsd = sessionId.includes('_usd');
          const currency = isSaudi ? 'sar' : isUsd ? 'usd' : 'egp';
          const rate = currency === 'sar' ? 4 : currency === 'usd' ? 1 : 53;

          const totalAmount = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
          const displayTotalAmount = totalAmount * rate;

          const orderItems: Array<{ name: string; quantity: number; price: number }> = [];
          const counts: Record<string, { count: number; price: number }> = {};
          for (const ord of orders) {
            const pName = (ord as any).products?.name || 'Digital Product';
            if (!counts[pName]) {
              counts[pName] = { count: 0, price: ord.amount * rate };
            }
            counts[pName].count += 1;
          }

          for (const [pName, detail] of Object.entries(counts)) {
            orderItems.push({
              name: pName,
              quantity: detail.count,
              price: detail.price,
            });
          }

          const { dispatchPaymentAlertToAdmin } = await import('@/utils/telegramPaymentBot');
          await dispatchPaymentAlertToAdmin({
            sessionId,
            userId: effectiveUserId || 'guest',
            customerEmail: user?.email || profile?.email || 'Guest',
            paymentMethod: isSaudi ? 'saudi_bank' : isUsd ? 'crypto' : 'instapay',
            totalAmount: displayTotalAmount,
            currency,
            orderItems,
            paymentSender: fullSender || undefined,
            paymentTransactionId: ocrResult?.referenceNumber || undefined,
            paymentScreenshot: publicUrl,
            ocrResult: ocrResult || undefined,
          });
        }
      } catch (dbErr) {
        console.warn('[Receipt Upload] Auto-save & alert notice:', dbErr);
      }
    }

    if (isStrictReview) {
      return NextResponse.json({
        url: publicUrl,
        ocr: ocrResult,
        status: 'strict_review',
        message:
          'قيد المراجعة المشددة: تم استلام صورة الإيصال بنجاح. نظراً لعدم وضوح اسم المحول إليه الكامل في لقطة الشاشة، تم تحويل طلبك للمراجعة والتدقيق اليدوي من الإدارة قبل تسليم المنتج.',
      });
    }

    return NextResponse.json({
      url: publicUrl,
      ocr: ocrResult,
      status: 'successful',
      message: 'تم التحقق من الإيصال ومطابقة الحساب المعتمد (mo_matany) بنجاح.',
    });
  } catch (error: any) {
    console.error('Receipt upload error:', error);
    return NextResponse.json(
      { error: `An internal server error occurred.` },
      { status: 500 }
    );
  }
}
