import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getReferrerByCode } from '@/utils/referrals';
import { normalizeReferralCode } from '@/utils/auth';
import { enforceSameOriginRequest } from '@/utils/security';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(request: Request) {
  const originError = await enforceSameOriginRequest(request);
  if (originError) {
    return originError;
  }

  let code: string | null = null;
  let clientFingerprint: string | null = null;

  try {
    const body = await request.json();
    if (typeof body?.code === 'string') {
      code = body.code;
    }
    if (typeof body?.deviceFingerprint === 'string') {
      clientFingerprint = body.deviceFingerprint;
    }
  } catch {
    code = null;
  }

  const normalizedCode = normalizeReferralCode(code);
  if (!normalizedCode) {
    return NextResponse.json(
      { valid: false, error: 'Referral code is required.' },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const deviceFingerprint = clientFingerprint || cookieStore.get('device_signature')?.value || null;

  const referrer = await getReferrerByCode(normalizedCode);
  if (!referrer) {
    return NextResponse.json(
      { valid: false, error: 'Referral code is invalid.' },
      { status: 404 }
    );
  }

  // Pre-check 1: Self-Referral on same physical device
  if (deviceFingerprint && referrer.device_fingerprint && deviceFingerprint === referrer.device_fingerprint) {
    return NextResponse.json(
      { valid: false, error: 'Self-referral on the same device is not allowed.' },
      { status: 400 }
    );
  }

  // Pre-check 2: 365-Day Single Referral Claim Limit on same physical device
  if (deviceFingerprint) {
    try {
      const supabaseAdmin = createAdminClient();
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

      const { data: pastLogs } = await supabaseAdmin
        .from('referral_logs')
        .select('id, created_at')
        .eq('device_fingerprint', deviceFingerprint)
        .in('status', ['verified', 'rewarded'])
        .gte('created_at', oneYearAgo)
        .limit(1);

      if (pastLogs && pastLogs.length > 0) {
        return NextResponse.json(
          {
            valid: false,
            error: 'This device has already claimed a referral bonus within the past 365 days.',
          },
          { status: 400 }
        );
      }
    } catch {
      // ignore check error and proceed
    }
  }

  return NextResponse.json({
    valid: true,
    referrer: {
      id: referrer.id,
      code: referrer.referral_code,
      displayName: referrer.display_name,
    },
  });
}
