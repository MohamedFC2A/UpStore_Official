import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ai/hyper-adaptive/preferences
 * Retrieves the logged-in user's stored Hyper-Adaptive AI preferences.
 */
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) {
      return NextResponse.json({
        enabled: true,
        detectedPersona: 'balanced',
        isLoggedIn: false,
      });
    }

    const supabaseAdmin = createAdminClient();
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, display_name, hyper_adaptive_state')
      .eq('id', user.id)
      .maybeSingle();

    const state = profile?.hyper_adaptive_state || {};

    return NextResponse.json({
      enabled: state.enabled !== false,
      detectedPersona: state.detectedPersona || 'balanced',
      topCategory: state.topCategory || 'Subscriptions',
      healedIssuesCount: state.healedIssuesCount || 0,
      isLoggedIn: true,
      lastSyncedAt: state.lastSyncedAt || null,
    });
  } catch (err: any) {
    console.warn('[Hyper-Adaptive Preferences GET Error]:', err);
    return NextResponse.json({ enabled: true, fallback: true });
  }
}

/**
 * POST /api/ai/hyper-adaptive/preferences
 * Persists the user's Hyper-Adaptive AI preferences & state in Supabase.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { enabled, detectedPersona, topCategory, healedIssuesCount } = body;

    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) {
      return NextResponse.json({ success: true, localOnly: true });
    }

    const supabaseAdmin = createAdminClient();
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('hyper_adaptive_state')
      .eq('id', user.id)
      .maybeSingle();

    const existingState = profile?.hyper_adaptive_state || {};
    const updatedState = {
      ...existingState,
      enabled: enabled !== undefined ? enabled : existingState.enabled !== false,
      detectedPersona: detectedPersona || existingState.detectedPersona || 'balanced',
      topCategory: topCategory || existingState.topCategory || 'Subscriptions',
      healedIssuesCount: healedIssuesCount !== undefined ? healedIssuesCount : existingState.healedIssuesCount || 0,
      lastSyncedAt: new Date().toISOString(),
    };

    const { error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update({ hyper_adaptive_state: updatedState })
      .eq('id', user.id);

    if (updateErr) {
      console.warn('[Hyper-Adaptive Preferences DB Update Warning]:', updateErr.message);
    }

    return NextResponse.json({ success: true, updatedState });
  } catch (err: any) {
    console.error('[Hyper-Adaptive Preferences POST Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
