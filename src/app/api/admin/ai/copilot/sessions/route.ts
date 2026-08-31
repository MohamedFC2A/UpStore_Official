import { NextResponse } from 'next/server';
import { requireAdminUser, enforceSameOriginRequest } from '@/utils/security';

export interface CopilotSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: any[];
}

/**
 * GET: Retrieve all Copilot chat sessions for the admin user.
 * Stores in site_settings under key `admin_copilot_sessions_${adminId}` with fallback.
 */
export async function GET(req: Request) {
  try {
    const originError = await enforceSameOriginRequest(req);
    if (originError) return originError;

    const auth = await requireAdminUser();
    if (auth.error || !auth.supabase || !auth.user) {
      return auth.error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = auth.supabase;
    const adminKey = `admin_copilot_sessions_${auth.user.id}`;

    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', adminKey)
      .single();

    let sessions: CopilotSession[] = [];
    if (data?.value) {
      try {
        sessions = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      } catch {}
    }

    return NextResponse.json({ sessions: Array.isArray(sessions) ? sessions : [] });
  } catch (err: any) {
    console.error('[Copilot Sessions GET Error]:', err);
    return NextResponse.json({ sessions: [] });
  }
}

/**
 * POST: Save or update sessions for the admin user.
 */
export async function POST(req: Request) {
  try {
    const originError = await enforceSameOriginRequest(req);
    if (originError) return originError;

    const auth = await requireAdminUser();
    if (auth.error || !auth.supabase || !auth.user) {
      return auth.error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = auth.supabase;
    const adminKey = `admin_copilot_sessions_${auth.user.id}`;
    const { sessions } = await req.json();

    if (!Array.isArray(sessions)) {
      return NextResponse.json({ error: 'Sessions must be an array' }, { status: 400 });
    }

    // Keep up to 30 most recent sessions to stay lean and fast
    const trimmedSessions = sessions.slice(0, 30);

    const { error: upsertErr } = await supabase.from('site_settings').upsert({
      key: adminKey,
      value: JSON.stringify(trimmedSessions),
    });

    if (upsertErr) {
      console.warn('[Copilot Sessions POST Upsert Warning]:', upsertErr);
    }

    return NextResponse.json({ success: true, count: trimmedSessions.length });
  } catch (err: any) {
    console.error('[Copilot Sessions POST Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to save sessions' }, { status: 500 });
  }
}
