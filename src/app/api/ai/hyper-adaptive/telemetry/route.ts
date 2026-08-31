import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

export interface TelemetryPayload {
  sessionId: string;
  userId?: string | null;
  userEmail?: string | null;
  displayName?: string | null;
  persona?: string;
  personaConfidence?: number;
  cognitiveLoad?: number;
  confusionScore?: number;
  hesitationLevel?: string;
  priceSensitivity?: string;
  topCategory?: string;
  categoryScores?: Record<string, number>;
  viewedSlugs?: string[];
  searchHistory?: string[];
  cartCount?: number;
  cartSlugs?: string[];
  rageClicksCount?: number;
  deviceInfo?: Record<string, any>;
}

function calculateProfileCompleteness(payload: TelemetryPayload): number {
  // 1. Identity & Credentials (Max 20 pts)
  let identity = 5; // Base active session
  if (payload.userId || (payload.userEmail && payload.userEmail.includes('@'))) {
    identity += 10;
  }
  if (payload.displayName && payload.displayName !== 'Guest Visitor' && payload.displayName !== 'User') {
    identity += 5;
  }
  identity = Math.min(20, identity);

  // 2. Product Catalog Exploration (Max 25 pts)
  const viewed = payload.viewedSlugs || [];
  let exploration = 0;
  if (viewed.length >= 5) exploration = 25;
  else if (viewed.length >= 3) exploration = 18;
  else if (viewed.length >= 2) exploration = 12;
  else if (viewed.length >= 1) exploration = 6;

  // 3. Search & Intent Queries (Max 20 pts)
  const searches = payload.searchHistory || [];
  let search = 0;
  if (searches.length >= 3) search = 20;
  else if (searches.length >= 2) search = 14;
  else if (searches.length >= 1) search = 8;

  // 4. Category Dwell Times (Max 15 pts)
  const dwellCats = Object.keys(payload.categoryScores || {});
  let dwell = 0;
  if (dwellCats.length >= 3) dwell = 15;
  else if (dwellCats.length >= 2) dwell = 10;
  else if (dwellCats.length >= 1) dwell = 5;

  // 5. Behavioral Engagement & Cart Telemetry (Max 20 pts)
  let engagement = 0;
  if (payload.cartCount && payload.cartCount > 0) engagement += 10;
  if (payload.persona && payload.persona !== 'balanced') engagement += 5;
  if (payload.hesitationLevel && payload.hesitationLevel !== 'none') engagement += 5;
  engagement = Math.min(20, engagement);

  return Math.min(100, Math.max(10, identity + exploration + search + dwell + engagement));
}

export async function POST(req: Request) {
  try {
    const body: TelemetryPayload = await req.json().catch(() => ({ sessionId: '' }));
    if (!body.sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const completeness = calculateProfileCompleteness(body);

    const record = {
      session_id: body.sessionId,
      user_id: body.userId || null,
      user_email: body.userEmail || null,
      display_name: body.displayName || null,
      persona: body.persona || 'balanced',
      persona_confidence: body.personaConfidence ?? 100,
      profile_completeness: completeness,
      cognitive_load: body.cognitiveLoad ?? 0,
      confusion_score: body.confusionScore ?? 0,
      hesitation_level: body.hesitationLevel || 'none',
      price_sensitivity: body.priceSensitivity || 'medium',
      top_category: body.topCategory || 'Subscriptions',
      category_dwell_times: body.categoryScores || {},
      viewed_slugs: body.viewedSlugs || [],
      search_history: body.searchHistory || [],
      cart_actions: {
        cartCount: body.cartCount || 0,
        cartSlugs: body.cartSlugs || [],
      },
      rage_clicks_count: body.rageClicksCount ?? 0,
      device_info: body.deviceInfo || {},
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createClient();
    }

    const { data, error } = await supabase
      .from('user_behavioral_telemetry')
      .upsert(record, { onConflict: 'session_id' })
      .select('id, session_id, profile_completeness')
      .maybeSingle();

    if (body.userId) {
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('hyper_adaptive_state')
          .eq('id', body.userId)
          .maybeSingle();

        const existingState = prof?.hyper_adaptive_state || {};
        await supabase
          .from('profiles')
          .update({
            hyper_adaptive_state: {
              ...existingState,
              detectedPersona: body.persona || existingState.detectedPersona || 'balanced',
              topCategory: body.topCategory || existingState.topCategory || 'Subscriptions',
              profileCompleteness: completeness,
              lastSeenAt: new Date().toISOString(),
            },
          })
          .eq('id', body.userId);
      } catch (profErr) {
        console.warn('[Telemetry Profile Update Warning]:', profErr);
      }
    }

    return NextResponse.json({ success: true, completeness, id: data?.id });
  } catch (err: any) {
    console.error('[Telemetry API Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
