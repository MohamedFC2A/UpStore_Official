import { NextResponse } from 'next/server';
import { generateChatCompletion, type AIMessage } from '@/utils/ai';
import { requireAuthenticatedUser, enforceSameOriginRequest } from '@/utils/security';
import { generateSupportCode } from '@/utils/supportCode';

const UPSTORE_SUPPORT_SYSTEM_PROMPT = `
أنت "المساعد الذكي للدعم الفني" لمنصة UpStore (UpStore AI Support Bot).
أنت وكيل دعم فني خبير وودود وذكي جداً، تقدم حلولاً فورية ودقيقة وتوجيهات واضحة لعملاء المتجر.

══ معلومات متجر UpStore الأساسية ══
- UpStore هو المتجر الرقمي الأول بأقل الأسعار العالمية للاشتراكات الرقمية، الحسابات الترفيهية (Netflix, Spotify, YouTube Premium, Shahid VIP, OSN)، أدوات الذكاء الاصطناعي (ChatGPT Plus, Gemini Advanced, Claude Pro)، وأدوات المطورين والتصميم.
- التسليم: يتم تسليم الحسابات والتراخيص الرقمية مباشرة في المحادثة وعبر مسؤول التسليم في تيليجرام.
- الضمان: جميع المنتجات والاشتراكات مغطاة بضمان كامل وشامل طوال فترة الاشتراك. في حال حدوث أي توقف أو مشكلة، يتم استبدال الحساب فوراً دون أي تعقيد.
- الدعم المباشر على تيليجرام: @UPSTORE_HELP
- طرق الدفع المدعومة:
  * Bybit Pay (UID: 47183921)
  * Binance Pay (ID: 764476139)
  * المحافظ المصرية (InstaPay: mo_matany@instapay، فودافون كاش: 01041140422).

══ أسلوب الرد والتعليمات ══
1. أجب بلغة عربية فصحى راقية وودية، واضحة ومباشرة (أو بالإنجليزية إذا سأل العميل بالإنجليزية).
2. قدم حلولاً عملية خطوة بخطوة لأي مشكلة يطرحها العميل (تفعيل الحساب، تغيير كلمة السر، شحن المحفظة، استبدال اشتراك).
3. إذا احتاجت المشكلة تدخلاً بشرياً (مثل استبدال يدوي أو استفسار مالي معقد)، أرشد العميل للتواصل المباشر مع فريق الدعم الفني على تيليجرام @UPSTORE_HELP.
4. نسّق ردك بنقاط واضحة وتنسيق Markdown أنيق.
`.trim();

export async function POST(req: Request) {
  try {
    const originError = await enforceSameOriginRequest(req);
    if (originError) return originError;

    const auth = await requireAuthenticatedUser();
    const user = auth.user;

    const body = await req.json().catch(() => ({}));
    const { messages, userMessage, topic, orderId } = body;

    let conversation: AIMessage[] = [];

    if (Array.isArray(messages) && messages.length > 0) {
      conversation = messages.slice(-8); // Keep last 8 turns for efficiency
    } else if (typeof userMessage === 'string' && userMessage.trim()) {
      conversation = [{ role: 'user', content: userMessage.trim() }];
    } else {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Append context metadata if available
    let contextNote = '';
    if (user) {
      const supportPin = generateSupportCode(user.id);
      contextNote += `\n[معلومات العميل الحالي: بريد: ${user.email || 'N/A'} | كود الدعم: ${supportPin}]`;
    }
    if (orderId) {
      contextNote += `\n[رقم الطلب المتعلق بالاستفسار: #${orderId}]`;
    }
    if (topic) {
      contextNote += `\n[موضوع المحادثة المختار: ${topic}]`;
    }

    const fullSystemPrompt = `${UPSTORE_SUPPORT_SYSTEM_PROMPT}${contextNote}`;

    const formattedMessages: AIMessage[] = [
      { role: 'system', content: fullSystemPrompt },
      ...conversation,
    ];

    const result = await generateChatCompletion(formattedMessages, {
      temperature: 0.6,
      max_tokens: 800,
    });

    return NextResponse.json({
      reply: result.text,
      modelUsed: result.modelUsed,
      telegramSupport: '@UPSTORE_HELP',
      suggestedActions: [
        { labelAr: 'محادثة تيليجرام المباشرة (@UPSTORE_HELP)', labelEn: 'Telegram Chat', action: 'open_telegram' },
        { labelAr: 'عرض بيانات طلباتي', labelEn: 'My Orders', action: 'view_orders' },
      ],
    });
  } catch (error: any) {
    console.error('[AI Support API Error]:', error);
    return NextResponse.json(
      {
        reply: 'أهلاً بك! يمكنك دائماً التواصل المباشر مع فريق الدعم الفني عبر تيليجرام @UPSTORE_HELP لحل أي مشكلة فوراً.',
        error: error.message,
      },
      { status: 200 } // Graceful fallback
    );
  }
}
