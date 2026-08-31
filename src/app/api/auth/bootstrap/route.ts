import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { REFERRAL_COOKIE_NAME } from '@/utils/auth'
import { createClient } from '@/utils/supabase/server'
import { bootstrapProfileForUser } from '@/utils/supabase/bootstrap'
import { enforceSameOriginRequest } from '@/utils/security'

export async function POST(request: Request) {
  const originError = await enforceSameOriginRequest(request);
  if (originError) return originError;

  const supabase = await createClient()

  let referralCode: string | null = null
  let sessionData: { access_token: string; refresh_token: string } | null = null

  try {
    const body = await request.json()
    if (typeof body?.referralCode === 'string') {
      referralCode = body.referralCode
    }
    if (body?.session?.access_token && body?.session?.refresh_token) {
      sessionData = {
        access_token: body.session.access_token,
        refresh_token: body.session.refresh_token,
      }
    }
  } catch {
    // ignore parsing errors
  }

  if (sessionData) {
    await supabase.auth.setSession(sessionData)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'You need to sign in first.' },
      { status: 401 }
    )
  }

  const cookieStore = await cookies()
  const cookieReferral = cookieStore.get(REFERRAL_COOKIE_NAME)?.value ?? null
  const deviceFingerprint = cookieStore.get('device_signature')?.value ?? null

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || '127.0.0.1';
  const userAgent = request.headers.get('user-agent') || 'Unknown';

  try {
    const { detectSmartLocation } = await import('@/utils/geo');
    const geo = await detectSmartLocation(request);

    const result = await bootstrapProfileForUser(
      supabase,
      user,
      referralCode || cookieReferral,
      deviceFingerprint,
      { ip, userAgent, country: geo.countryNameAr, location: geo.formattedLocation }
    )
    const response = NextResponse.json(result)
    response.cookies.set(REFERRAL_COOKIE_NAME, '', {
      path: '/',
      maxAge: 0,
    })
    return response
  } catch (error) {
    console.warn('Bootstrap non-fatal notice:', error instanceof Error ? error.message : error);
    const fallback = {
      profile: {
        id: user.id,
        email: user.email || null,
        display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
        role: 'customer',
        wallet_balance: 0,
      },
      redirectTo: '/',
    };
    return NextResponse.json(fallback, { status: 200 });
  }
}
