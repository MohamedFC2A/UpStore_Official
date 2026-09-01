import { NextResponse } from 'next/server';
import { generateChatCompletion, AIMessage } from '@/utils/ai';
import { createClient } from '@/utils/supabase/server';

export interface CustomerChatRequest {
  messages: AIMessage[];
  currentProductSlug?: string;
  language?: 'ar' | 'en';
}

export async function POST(req: Request) {
  try {
    const { messages = [], currentProductSlug, language = 'ar' }: Partial<CustomerChatRequest> = await req.json().catch(() => ({}));

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required.' }, { status: 400 });
    }

    // Enforce Authentication for AI features
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: language === 'ar'
            ? 'يرجى تسجيل الدخول أولاً للوصول إلى المساعد الذكي AI.'
            : 'Please sign in to chat with the AI Assistant.',
          requireAuth: true,
        },
        { status: 401 }
      );
    }

    // Optional: Fetch live products summary from database for up-to-date recommendations
    let liveCatalogContext = '';
    try {
      const { data: products } = await supabase
        .from('products')
        .select('name, name_ar, our_price, market_price, category, slug')
        .limit(20);

      if (products && products.length > 0) {
        liveCatalogContext = `Featured Catalog Products:\n` +
          products.map(p => `- ${p.name} (${p.name_ar || ''}) | Price: $${p.our_price} (Retail: $${p.market_price}) | Category: ${p.category} | Slug: /product/${p.slug}`).join('\n');
      }
    } catch {
      // Use fallback static catalog
    }

    const systemPrompt = `
You are the official UpStore AI Shopping Assistant & Digital Concierge.
UpStore is the world's lowest-priced digital marketplace for premium subscriptions, digital accounts, gaming keys, VPNs, and AI licenses.

ABOUT UPSTORE:
1. Guarantee & Trust: Every single product comes with full warranty, 100% genuine guarantees, and instant automated delivery right after payment.
2. Payment Methods Supported:
   - Binance Pay (ID: 764476139)
   - Bybit Pay (UID: 47183921)
   - Local Payments (Egypt / Arab Countries): Available via contacting official support @UPSTORE_HELP.
3. Delivery Speed: Instant automated delivery inside the chat.
4. Support: 24/7 dedicated human and AI support + Telegram support @UPSTORE_HELP.

${liveCatalogContext}

GUIDELINES FOR YOUR RESPONSES:
- Respond in the user's preferred language (Arabic or English). If the user writes in Arabic, respond in fluent, enthusiastic, and modern Arabic suitable for gamers and digital buyers.
- Keep answers concise, clear, and focused on helping the buyer make the best decision.
- You can recommend specific products, explain warranty terms, guide them on how to activate keys, or clarify payment options.
- If recommending a product, mention its approximate price and link if relevant (/product/slug).
- If unsure about order status, guide them to their Dashboard (/dashboard) or Orders page.
`.trim();

    const formattedMessages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-8), // Keep last 8 messages for context window efficiency
    ];

    const { text, modelUsed } = await generateChatCompletion(formattedMessages, {
      temperature: 0.7,
      max_tokens: 800,
    });

    return NextResponse.json({
      reply: text,
      modelUsed,
    });
  } catch (error: any) {
    console.error('[Customer Chat API Error]:', error);
    return NextResponse.json(
      { error: error.message || 'AI Assistant is currently busy. Please try again shortly.' },
      { status: 500 }
    );
  }
}
