import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/utils/security';
import { fulfillOrderSession } from '@/utils/fulfillment';

export async function POST(req: Request) {
  try {
    const auth = await requireAdminUser();
    if (auth.error) {
      return auth.error;
    }

    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    console.log(`[Admin Manual Payment] Approving manual payment for session: ${sessionId}`);
    const success = await fulfillOrderSession(sessionId);

    if (!success) {
      return NextResponse.json({ error: 'Fulfillment process failed. Check server logs.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Admin Approve Manual Payment Error]:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
