import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import {
  getDashboardPath,
  getSafeRedirectTarget,
  REFERRAL_COOKIE_NAME,
} from '@/utils/auth'
import { bootstrapProfileForUser } from '@/utils/supabase/bootstrap'
import { buildInternalUrl } from '@/utils/security'
import { cleanServerResponseCookies } from '@/utils/auth-cookies'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next')
  const errorParam = url.searchParams.get('error')
  const errorCode = url.searchParams.get('error_code')
  const errorDescription = url.searchParams.get('error_description')

  console.log('[AUTH_CALLBACK_DEBUG] Incoming OAuth Request:', {
    timestamp: new Date().toISOString(),
    fullUrl: request.url,
    hasCode: Boolean(code),
    codePrefix: code ? code.substring(0, 10) + '...' : null,
    next,
    errorParam,
    errorCode,
    errorDescription,
  })

  const cookieStore = await cookies()

  if (errorParam || errorCode || errorDescription || !code) {
    console.error('[AUTH_CALLBACK_DEBUG] OAuth Callback failure encountered:', {
      errorParam,
      errorCode,
      errorDescription,
      hasCode: Boolean(code),
    })
    const errorRedirectResponse = NextResponse.redirect(buildInternalUrl('/auth/login?error=oauth_failed', request))
    cleanServerResponseCookies(errorRedirectResponse, cookieStore.getAll())
    return errorRedirectResponse
  }

  const cookiesToSetLater: { name: string; value: string; options: Record<string, unknown> }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const opt = {
              ...options,
              path: '/',
              maxAge: 60 * 60 * 24 * 365,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
            } as Record<string, unknown>
            try {
              cookieStore.set(name, value, opt as Parameters<typeof cookieStore.set>[2])
            } catch {
              // Ignore: called from a context where cookies cannot be set
            }
            cookiesToSetLater.push({ name, value, options: opt })
          })
        },
      },
      cookieOptions: {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    }
  )

  console.log('[AUTH_CALLBACK_DEBUG] Exchanging authorization code for session...')
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data?.user) {
    console.error('[AUTH_CALLBACK_DEBUG] exchangeCodeForSession failed:', {
      message: error?.message,
      status: error?.status,
      name: error?.name,
    })
    const failureRedirectResponse = NextResponse.redirect(buildInternalUrl('/auth/login?error=oauth_failed', request))
    cleanServerResponseCookies(failureRedirectResponse, cookieStore.getAll())
    return failureRedirectResponse
  }

  console.log('[AUTH_CALLBACK_DEBUG] Exchange successful! Authenticated User:', {
    userId: data.user.id,
    email: data.user.email,
    provider: data.user.app_metadata?.provider,
  })

  let userRole: string | null = null;
  try {
    const referralCode = cookieStore.get(REFERRAL_COOKIE_NAME)?.value ?? null
    const deviceFingerprint = cookieStore.get('device_signature')?.value ?? null
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const cfCountry = request.headers.get('cf-ipcountry') || request.headers.get('x-vercel-ip-country') || null;

    const bootstrap = await bootstrapProfileForUser(
      supabase,
      data.user,
      referralCode,
      deviceFingerprint,
      { ip, userAgent, country: cfCountry, location: cfCountry }
    )
    userRole = bootstrap.profile.role;
    console.log('[AUTH_CALLBACK_DEBUG] User profile bootstrapped successfully:', {
      role: userRole,
      displayName: bootstrap.profile.display_name,
    })
  } catch (err: unknown) {
    console.warn(
      '[AUTH_CALLBACK_DEBUG] Profile bootstrap non-fatal notice:',
      err instanceof Error ? err.message : err
    )
  }

  const targetPath = getSafeRedirectTarget(
    next,
    getDashboardPath({
      id: data.user.id,
      email: data.user.email,
      role: userRole,
    })
  )

  console.log('[AUTH_CALLBACK_DEBUG] Redirecting authenticated user to target:', targetPath)

  const redirectUrl = buildInternalUrl(targetPath, request);
  const response = NextResponse.redirect(redirectUrl)

  // Ensure Supabase session cookies are set on the final response with 1-year lifetime
  cookiesToSetLater.forEach(({ name, value, options }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cookieOptions: Record<string, any> = {
      ...options,
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response.cookies.set(name, value, cookieOptions as any)
  })

  // Clear the referral cookie
  response.cookies.set(REFERRAL_COOKIE_NAME, '', { path: '/', maxAge: 0 })

  return response
}
