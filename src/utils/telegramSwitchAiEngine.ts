/**
 * telegramSwitchAiEngine.ts — Gemini 2.5 Flash Operations & Intelligence Engine for @On_Off_Wep_bot
 */

import {
  getStoreMaintenanceStatus,
  setStoreMaintenanceStatus,
  getStoreLiveMetrics,
  sendSwitchBotChatAction,
} from './telegramSwitchBot';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const GEMINI_FLASH_MODEL = 'google/gemini-2.5-flash';
const FALLBACK_DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || '';

/**
 * Checks if text is an explicit command to close the store (Sleep Mode)
 */
function isCloseIntent(text: string): boolean {
  const t = text.toLowerCase().trim();
  return (
    t.includes('اقفل') ||
    t.includes('إقفل') ||
    t.includes('قفل الموقع') ||
    t.includes('قفل المتجر') ||
    t.includes('هروح انام') ||
    t.includes('رايح انام') ||
    t.includes('عايز انام') ||
    t.includes('وضع النوم') ||
    t.includes('طفي الموقع') ||
    t.includes('اطفي') ||
    t.includes('إغلاق') ||
    t.includes('اغلق') ||
    t === 'sleep' ||
    t === 'close' ||
    t === 'off' ||
    t.includes('sleep mode')
  );
}

/**
 * Checks if text is an explicit command to open the store (Live / Online)
 */
function isOpenIntent(text: string): boolean {
  const t = text.toLowerCase().trim();
  return (
    t.includes('افتح') ||
    t.includes('إفتح') ||
    t.includes('فتح الموقع') ||
    t.includes('فتح المتجر') ||
    t.includes('صحيت') ||
    t.includes('اصحي') ||
    t.includes('تشغيل الموقع') ||
    t.includes('شغل الموقع') ||
    t.includes('أونلاين') ||
    t.includes('اونلاين') ||
    t === 'open' ||
    t === 'on' ||
    t === 'live' ||
    t.includes('open store')
  );
}

/**
 * Calls Gemini 2.5 Flash via OpenRouter (with DeepSeek fallback)
 */
async function callGemini25Flash(messages: Array<{ role: string; content: string }>): Promise<string> {
  // 1. Try Gemini 2.5 Flash via OpenRouter
  if (OPENROUTER_API_KEY) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://upstore.one',
          'X-Title': 'UpStore Switch Control AI',
        },
        body: JSON.stringify({
          model: GEMINI_FLASH_MODEL,
          messages,
          temperature: 0.5,
          max_tokens: 1500,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content && typeof content === 'string' && content.trim().length > 0) {
          return content.trim();
        }
      }
    } catch (e) {
      console.warn('[Gemini 2.5 Flash OpenRouter Attempt Failed, trying fallback]:', e);
    }
  }

  // 2. Fallback: DeepSeek Chat API
  if (FALLBACK_DEEPSEEK_KEY) {
    try {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${FALLBACK_DEEPSEEK_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          temperature: 0.5,
          max_tokens: 1500,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content && typeof content === 'string') {
          return content.trim();
        }
      }
    } catch (e) {
      console.error('[DeepSeek Fallback Failed]:', e);
    }
  }

  return 'عذراً، حدث تأخير مؤقت في معالجة الذكاء الاصطناعي. يمكنك استخدام الأزرار في الأسفل للتحكم الفوري في فتح وإغلاق الموقع.';
}

/**
 * Main intelligence processor for incoming user messages in @On_Off_Wep_bot
 */
export async function processSwitchAiQuery(
  chatId: string | number,
  userMessage: string,
  userName?: string
): Promise<{ text: string; triggeredAction?: 'OPEN' | 'CLOSE' | 'NONE' }> {
  // Show typing action
  await sendSwitchBotChatAction(chatId, 'typing');

  // 1. Direct Intent: Close Store / Sleep Mode
  if (isCloseIntent(userMessage)) {
    await setStoreMaintenanceStatus(true);
    const text = `🌙 <b>تم إغلاق الموقع وتفعيل وضع النوم بنجاح!</b>

🔴 <b>حالة المتجر الحالية:</b> مغلق ومحمي (Sleep Mode).
🛡️ <b>الحماية:</b> لن يتمكن أي زائر من إتمام عمليات شراء أو دفع معلق حتى تستيقظ وتفتح الموقع مجدداً.
🛌 <b>نوم هنيئاً وأحلاماً سعيدة!</b> يمكنك في أي وقت الضغط على زر <b>🟢 فتح الموقع</b> لاستئناف العمل فوراً.`;
    return { text, triggeredAction: 'CLOSE' };
  }

  // 2. Direct Intent: Open Store / Wake Up
  if (isOpenIntent(userMessage)) {
    await setStoreMaintenanceStatus(false);
    const metrics = await getStoreLiveMetrics();
    const text = `☀️ <b>صباح الخير والبركة! تم فتح الموقع بنجاح.</b>

🟢 <b>حالة المتجر الحالية:</b> أونلاين ومتاح لاستقبال الطلبات (ONLINE).
🚀 <b>حركة العمل:</b> التسليم التلقائي يعمل بكامل طاقته ومتاح لجميع الزوار.
📊 <b>طلبات اليوم الحالية:</b> ${metrics.totalOrdersToday} طلب (${metrics.completedOrdersToday} مكتمل).

نتمنى لك يوماً مليئاً بالمبيعات والأرباح! ✨`;
    return { text, triggeredAction: 'OPEN' };
  }

  // 3. Fetch Live Store Context for Gemini 2.5 Flash
  const { isMaintenance } = await getStoreMaintenanceStatus();
  const metrics = await getStoreLiveMetrics();

  const systemPrompt = `أنت المساعد الإداري والتشغيلي الذكي لمتجر UpStore (مدعوم بنموذج Google Gemini 2.5 Flash).
أنت تتحدث مباشرة مع مالك ومدير المتجر عبر بوت التحكم (@On_Off_Wep_bot).

سياق المتجر اللحظي والحي الآن:
- حالة الموقع الحالية: ${isMaintenance ? '🔴 مغلق مؤقتاً / وضع النوم (SLEEP MODE)' : '🟢 أونلاين ونشط ومتاح للشراء (ONLINE)'}
- إجمالي طلبات اليوم: ${metrics.totalOrdersToday} طلب
- الطلبات المكتملة اليوم: ${metrics.completedOrdersToday} طلب
- الطلبات المعلقة: ${metrics.pendingOrdersToday} طلب
- مبيعات اليوم بالدولار: $${metrics.revenueTodayUsd} USD
- مبيعات اليوم بالجنيه المصري: ${metrics.revenueTodayEgp} ج.م
- إجمالي المنتجات في المتجر: ${metrics.totalProductsCount} منتج
- المنتجات المنتهية من المخزون: ${metrics.outOfStockCount}
- المنتجات منخفضة المخزون: ${metrics.lowStockCount}

المنتج الأكثر مبيعاً حالياً:
- Gemini Advanced 18 Months (جيمناي أدڤانسد 18 شهر) بسعر 59.99$ (2,999 ج.م).

تعليمات الردود:
1. كن ذكياً، تنفيذياً، مباشراً وودوداً باللهجة العربية الفصيحة الواضحة أو المصرية الراقية المناسبة لرجال الأعمال.
2. إذا سأل المالك عن ملخص أو تقرير، قدّم له تقريراً جذاباً بالأرقام والإيموجي.
3. إذا طلب كتابة بوستات تسويقية أو إعلانات لوسائل التواصل (فيسبوك، تويتر، تليجرام)، اكتب له نصوصاً إعلانية قوية جداً ومقنعة مع خطافات جذابة (Hook) ودعوة لاتخاذ إجراء (CTA) والهاشتاجات المناسبة.
4. إذا سأل عن نصائح لزيادة المبيعات أو تحسين الأداء، قدّم نصائح تسويقية وتكتيكية دقيقة ومبهرة.
5. نسّق ردك بـ HTML نظيف ومناسب لتليجرام (استخدم <b> و <i> و <code> فقط ولا تستخدم Markdown العادي).`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  const aiReply = await callGemini25Flash(messages);
  return { text: aiReply, triggeredAction: 'NONE' };
}
