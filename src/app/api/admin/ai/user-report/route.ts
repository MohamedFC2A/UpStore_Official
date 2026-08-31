import { NextResponse } from 'next/server';
import { generateStructuredAIResponse } from '@/utils/ai';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireAdminUser, enforceSameOriginRequest } from '@/utils/security';

export interface AIUserDossier {
  profileTitleAr: string;
  profileTitleEn: string;
  psychographicSummaryAr: string;
  psychographicSummaryEn: string;
  buyingIntentScore: number; // 0 - 100%
  conversionReadinessAr: string;
  conversionReadinessEn: string;
  priceSensitivityDiagnosticAr: string;
  priceSensitivityDiagnosticEn: string;
  dominantInterests: string[];
  frictionPoints: Array<{ issueAr: string; issueEn: string; severity: 'low' | 'medium' | 'high' }>;
  nextBestOffer: {
    productSlug: string;
    productNameAr: string;
    productNameEn: string;
    salesPitchAr: string;
    salesPitchEn: string;
    recommendedDiscount?: string;
  };
  adminActionPlan: Array<{ stepNumber: number; actionAr: string; actionEn: string }>;
  profileMaturityAnalysisAr: string;
  profileMaturityAnalysisEn: string;
  generatedAt: string;
}

export async function POST(req: Request) {
  try {
    const originError = await enforceSameOriginRequest(req);
    if (originError) return originError;

    const auth = await requireAdminUser();
    if (auth.error || !auth.user) {
      return auth.error || NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      sessionId,
      userId,
      userEmail,
      displayName,
      persona,
      personaConfidence,
      profileCompleteness,
      topCategory,
      categoryScores,
      viewedSlugs,
      searchHistory,
      cartCount,
      cartSlugs,
      ordersCount,
      totalSpent,
      hesitationLevel,
      cognitiveLoad,
      rageClicksCount,
      deviceInfo,
      forceRefresh,
    } = body;

    const supabase = createAdminClient();

    // 1. Check existing saved report if not forceRefresh
    if (!forceRefresh && sessionId) {
      try {
        const { data: existing } = await supabase
          .from('user_behavioral_telemetry')
          .select('ai_report')
          .eq('session_id', sessionId)
          .maybeSingle();

        if (existing?.ai_report && typeof existing.ai_report === 'object') {
          return NextResponse.json({
            success: true,
            report: existing.ai_report,
            cached: true,
          });
        }
      } catch {}
    }

    // 2. Static System Prompt (Prefix matched for DeepSeek KV cache hit)
    const systemPrompt = `You are the Chief Customer Intelligence & Psychographic Analyst for UpStore (upstore.one).
Construct a deep, professional behavioral dossier based on user telemetry.
Return strictly valid JSON matching this schema:
{
  "profileTitleAr": "عنوان دقيق وموجز لوصف نمط العميل",
  "profileTitleEn": "Concise archetypal title in English",
  "psychographicSummaryAr": "تحليل معمق وشامل لسلوك ونمط اتخاذ القرار وتفضيلاته الرقمية",
  "psychographicSummaryEn": "In-depth psychographic analysis in English",
  "buyingIntentScore": 85,
  "conversionReadinessAr": "تقييم جاهزية العميل للشراء فورا وكيفية دفعه للإتمام",
  "conversionReadinessEn": "Conversion readiness assessment in English",
  "priceSensitivityDiagnosticAr": "تحليل حساسية السعر وهل يبحث عن أرخص عرض أم أعلى جودة",
  "priceSensitivityDiagnosticEn": "Price sensitivity diagnosis in English",
  "dominantInterests": ["Subscriptions", "AI Tools"],
  "frictionPoints": [{ "issueAr": "نقطة الاحتكاك أو التردد", "issueEn": "Friction issue in English", "severity": "low"|"medium"|"high" }],
  "nextBestOffer": {
    "productSlug": "slug",
    "productNameAr": "اسم المنتج بالعربية",
    "productNameEn": "Product name in English",
    "salesPitchAr": "جملة إقناع تسويقية مخصصة",
    "salesPitchEn": "Tailored pitch in English",
    "recommendedDiscount": "10% OFF"
  },
  "adminActionPlan": [{ "stepNumber": 1, "actionAr": "إجراء مقترح لمدير المتجر", "actionEn": "Action in English" }],
  "profileMaturityAnalysisAr": "تقييم نضج البيانات المجمعة",
  "profileMaturityAnalysisEn": "Data maturity evaluation in English"
}`;

    const userPrompt = `USER TELEMETRY DATA:
- Identity: "${displayName || 'Guest User'}" (${userEmail || 'Anonymous'}), ID: "${userId || sessionId}"
- Persona: ${persona || 'balanced'} (${personaConfidence || 100}% confidence)
- Profile Completeness: ${profileCompleteness || 10}%
- Top Category: ${topCategory || 'Subscriptions'}
- Category Dwell: ${JSON.stringify(categoryScores || {})}
- Viewed Products: ${(viewedSlugs || []).join(', ') || 'None'}
- Search Queries: ${(searchHistory || []).join(' | ') || 'None'}
- Cart: ${cartCount || 0} items (${(cartSlugs || []).join(', ')})
- Orders: ${ordersCount || 0} orders ($${totalSpent || 0} spent)
- Hesitation: ${hesitationLevel || 'none'}, Cognitive Load: ${cognitiveLoad || 0}/100, Rage Clicks: ${rageClicksCount || 0}
- Device: ${JSON.stringify(deviceInfo || {})}

Generate the complete behavioral dossier in strictly valid JSON.`;

    const { data: aiDossier } = await generateStructuredAIResponse<AIUserDossier>(
      systemPrompt,
      userPrompt,
      {
        model: 'deepseek-v4-flash',
        temperature: 0.1,
        max_tokens: 550,
        timeoutMs: 8000,
      }
    );

    if (aiDossier && sessionId) {
      try {
        const supabaseAdmin = createAdminClient();

        await supabaseAdmin
          .from('user_behavioral_telemetry')
          .update({
            ai_report: aiDossier,
            updated_at: new Date().toISOString(),
          })
          .eq('session_id', sessionId);
      } catch (saveErr) {
        console.warn('[AI User Report Save Notice]:', saveErr);
      }
    }

    return NextResponse.json({
      success: true,
      report: aiDossier,
    });
  } catch (err: any) {
    console.error('[AI User Report Generation Error]:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to generate AI behavioral report',
      },
      { status: 500 }
    );
  }
}
