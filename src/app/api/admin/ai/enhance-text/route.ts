import { NextResponse } from 'next/server';
import { requireAdminUser, enforceSameOriginRequest } from '@/utils/security';
import { generateChatCompletion } from '@/utils/ai';

export interface EnhanceTextRequest {
  text: string;
  mode: 'expand' | 'shorten' | 'urgency' | 'fix_grammar' | 'seo';
  language?: 'en' | 'ar' | 'both';
  productName?: string;
}

export async function POST(req: Request) {
  try {
    const originError = await enforceSameOriginRequest(req);
    if (originError) {
      return originError;
    }

    const auth = await requireAdminUser();
    if (auth.error) {
      return auth.error;
    }

    const { text, mode, language = 'en', productName }: EnhanceTextRequest = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text to enhance is required.' }, { status: 400 });
    }

    let instruction = '';
    switch (mode) {
      case 'expand':
        instruction = 'Expand the provided text into a comprehensive, beautifully structured e-commerce product description with bullet points, emojis, activation steps, and warranty assurance.';
        break;
      case 'shorten':
        instruction = 'Shorten the provided text into a punchy, crisp, high-impact overview highlighting only the most essential benefits and key features.';
        break;
      case 'urgency':
        instruction = 'Rewrite the text with high-converting e-commerce sales psychology, flash deal urgency, and compelling calls-to-action for gamers and digital buyers.';
        break;
      case 'fix_grammar':
        instruction = 'Fix all grammar, formatting, spelling, and tone issues while preserving the original meaning and structure.';
        break;
      case 'seo':
        instruction = 'Generate an SEO-optimized meta description and search keyword summary suitable for Google search snippets.';
        break;
      default:
        instruction = 'Enhance and polish the provided text for an elite e-commerce digital marketplace listing.';
    }

    const systemPrompt = `
You are an expert e-commerce copywriter for UpStore (a premium digital marketplace).
Language instruction: Respond in ${language === 'ar' ? 'Arabic' : language === 'both' ? 'both English and Arabic' : 'English'}.
${instruction}

Rules:
1. Return ONLY the enhanced text content. Do not include meta commentary, greeting, or explanations.
2. Maintain clean markdown format.
`.trim();

    const userPrompt = `
Product Context: ${productName || 'Digital Product'}
Source Text to enhance:
${text}
`.trim();

    const { text: enhancedText, modelUsed } = await generateChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { temperature: 0.6 });

    return NextResponse.json({
      enhancedText,
      modelUsed,
    });
  } catch (error: any) {
    console.error('[Enhance Text API Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to enhance text.' },
      { status: 500 }
    );
  }
}
