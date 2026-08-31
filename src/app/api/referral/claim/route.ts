import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { claimReferralCodeForUser, getReferralStatusForUser } from '@/utils/referrals';
import { bootstrapProfileForUser } from '@/utils/supabase/bootstrap';
import { enforceSameOriginRequest, requireAuthenticatedUser } from '@/utils/security';

export async function POST(request: Request) {
  const originError = await enforceSameOriginRequest(request);
  if (originError) {
    return originError;
  }

  const auth = await requireAuthenticatedUser();
  if (auth.error || !auth.user) {
    return auth.error!;
  }
  const user = auth.user;

  let code: string | null = null;

  try {
    const body = await request.json();
    if (typeof body?.code === 'string') {
      code = body.code;
    }
  } catch {
    code = null;
  }

  const cookieStore = await cookies();
  const deviceFingerprint = cookieStore.get('device_signature')?.value ?? null;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || '127.0.0.1';

  try {
    await bootstrapProfileForUser(auth.supabase, user, null, deviceFingerprint, { ip });
    const claimResult = await claimReferralCodeForUser(user.id, code, auth.supabase, {
      ip,
      deviceFingerprint,
    });

    if (!claimResult.applied) {
      return NextResponse.json(
        { error: claimResult.reason || 'تعذر ربط كود الدعوة.' },
        { status: 400 }
      );
    }

    const status = await getReferralStatusForUser(user.id);

    return NextResponse.json({
      success: true,
      claimResult,
      status,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to save referral code.';

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
