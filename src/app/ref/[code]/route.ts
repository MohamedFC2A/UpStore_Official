import { NextResponse } from 'next/server';
import { REFERRAL_COOKIE_NAME, normalizeReferralCode } from '@/utils/auth';
import { getConfiguredAppOrigin } from '@/utils/security';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const normalized = normalizeReferralCode(code);

  const appOrigin = getConfiguredAppOrigin();
  const redirectUrl = new URL('/auth/register', appOrigin);
  if (normalized) {
    redirectUrl.searchParams.set('ref', normalized);
    redirectUrl.searchParams.set('locked', 'true');
  }

  const response = NextResponse.redirect(redirectUrl);

  if (normalized) {
    const cookieOptions: Record<string, any> = {
      path: '/',
      maxAge: 31536000, // 365 days
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    };

    response.cookies.set(REFERRAL_COOKIE_NAME, normalized, cookieOptions);
  }

  return response;
}
