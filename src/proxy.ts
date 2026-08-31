import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { generateDeviceFingerprint } from '@/utils/edge-security'
import { cleanServerResponseCookies } from '@/utils/auth-cookies'
import { isAdminIdentity, getSafeRedirectTarget, getDashboardPath } from '@/utils/auth'

// In-Memory Rate Limiting (Edge Isolates)
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 600; // Generous 600 requests per minute for public endpoints
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();

// Honeypot Ban List
const BANNED_IPS = new Set<string>();

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.pathname;
  const hostHeader = request.headers.get('host') || '';
  const isLocalhost = hostHeader.includes('localhost') || hostHeader.includes('127.0.0.1') || hostHeader.includes('192.168.') || process.env.NODE_ENV === 'development';

  // 0. Explicit Webhook, Internal UI & Callback Route Exemption (Zero Rate Limiting & Zero Blocking)
  const isExemptInternalApi = 
    url.startsWith('/api/webhooks/') ||
    url.startsWith('/api/visitor/') ||
    url.startsWith('/api/store/status') ||
    url.startsWith('/api/ai/') ||
    url.startsWith('/api/checkout/') ||
    url.startsWith('/api/products') ||
    url.startsWith('/api/notifications') ||
    url.startsWith('/api/changelogs') ||
    url.startsWith('/api/auth/') ||
    url.startsWith('/api/referral/') ||
    url.startsWith('/api/reviews/') ||
    url.startsWith('/api/support/') ||
    url.startsWith('/api/orders/') ||
    url.startsWith('/api/seo/') ||
    url.startsWith('/api/og');

  if (isExemptInternalApi || isLocalhost) {
    // Pass immediately without rate limiting
    if (url.startsWith('/api/webhooks/') || url.startsWith('/api/visitor/') || url.startsWith('/api/checkout/paymob/callback')) {
      return NextResponse.next();
    }
  }

  const supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
  const userAgent = request.headers.get('user-agent') || 'Unknown';

  // 1. Search Engine & Crawler Identification
  const isSearchEngineOrBot = /google|googlebot|google-inspectiontool|google-site-verification|feedfetcher|storebot-google|mediapartners|apis-google|adsbot|bingbot|bingpreview|msnbot|slurp|duckduckbot|baiduspider|yandex|applebot|twitterbot|facebookexternalhit|whatsapp|telegrambot|discordbot|linkedinbot|pinterestbot|gptbot|chatgpt-user|perplexitybot|claudebot|claude-web|anthropic|cohere|bytespider|indexnow|petalbot|seznambot|screaming frog/i.test(userAgent);

  const isPublicStaticOrSeo = 
    url === '/' ||
    url === '/browse' ||
    url === '/cart' ||
    url.startsWith('/checkout') ||
    url === '/track' ||
    url === '/worldcup' ||
    url === '/robots.txt' || 
    url === '/sitemap.xml' || 
    url.startsWith('/product/') ||
    url.startsWith('/terms') ||
    url.startsWith('/privacy') ||
    url.startsWith('/refund') ||
    url.startsWith('/api/og') || 
    url.startsWith('/api/seo/') || 
    url.startsWith('/icon') || 
    url.startsWith('/apple-touch-icon') || 
    url.startsWith('/favicon') || 
    url.startsWith('/manifest') ||
    url.endsWith('.txt') ||
    url.endsWith('.xml');

  // 2. Honeypot & Malicious Bot Defense (Strictly bypassed for all legitimate search engine bots, localhost, and public pages)
  if (!isSearchEngineOrBot && !isPublicStaticOrSeo && !isLocalhost) {
    if (BANNED_IPS.has(ip)) {
      return NextResponse.json({ error: 'IP blocked for security violations.' }, { status: 403 });
    }

    if (url.startsWith('/api/admin/system-status')) {
      BANNED_IPS.add(ip);
      return NextResponse.json({ error: 'Access Denied.' }, { status: 403 });
    }

    // Only block aggressive exploit tools on private APIs (HeadlessChrome is safely permitted for rendering)
    const isMaliciousExploitTool = /nikto|sqlmap|nmap|masscan|zgrab|acunetix|nessus/i.test(userAgent);
    if (isMaliciousExploitTool && url.startsWith('/api/')) {
      return NextResponse.json({ error: 'Automated vulnerability probing is forbidden.' }, { status: 403 });
    }
  }

  // 3. API Rate Limiting (Token Bucket per Isolate - Bypassed for Localhost & Essential APIs)
  if (url.startsWith('/api/') && !isLocalhost && !isExemptInternalApi) {
    const now = Date.now();
    const limitData = rateLimitMap.get(ip);
    if (limitData) {
      if (now > limitData.resetTime) {
        // Reset window
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
      } else {
        if (limitData.count >= MAX_REQUESTS_PER_WINDOW) {
          return NextResponse.json(
            { error: 'Rate limit exceeded. Please try again later.' },
            { 
              status: 429,
              headers: {
                'Retry-After': '60',
                'X-RateLimit-Limit': String(MAX_REQUESTS_PER_WINDOW),
                'X-RateLimit-Remaining': '0',
              }
            }
          );
        }
        limitData.count += 1;
        rateLimitMap.set(ip, limitData);
      }
    } else {
      rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    }

    // XSS / SQLi / Path Traversal Quick Scan on URL and search parameters
    const searchParamsStr = request.nextUrl.search;
    const maliciousPatterns = /<script>|javascript:|UNION\s+SELECT|DROP\s+TABLE|--|\.\.\/|\.\.\\|etc\/passwd|proc\/self/i;
    if (maliciousPatterns.test(decodeURIComponent(searchParamsStr)) || maliciousPatterns.test(url)) {
      BANNED_IPS.add(ip); // Instant ban for malicious injection attempts
      return NextResponse.json({ error: 'Malicious payload detected.' }, { status: 403 });
    }
  }

  // 4. Fast-Pass for Public Anonymous Visitors & Session Handling
  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(c => c.name.includes('sb-') || c.name.includes('auth-token'));
  
  const isProtectedRoute = 
    url.startsWith('/dashboard') || 
    url.startsWith('/admin') || 
    url.startsWith('/notifications') || 
    url.startsWith('/pin') || 
    url.startsWith('/referral') || 
    (url.startsWith('/ad') && !isLocalhost);
  const isAuthRoute = url.startsWith('/auth');
  const isAdminApi = url.startsWith('/api/admin/');

  // If public route with no auth cookies, pass immediately with 0ms edge delay
  if (!hasAuthCookie && !isProtectedRoute && !isAuthRoute && !isAdminApi) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return allCookies;
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              path: '/',
              maxAge: 60 * 60 * 24 * 365,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
            })
          )
        },
      },
      cookieOptions: {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    }
  );

  const createRedirectResponse = (targetUrl: string | URL) => {
    const redirectRes = NextResponse.redirect(targetUrl)
    supabaseResponse.cookies.getAll().forEach((c) => {
      redirectRes.cookies.set(c.name, c.value, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })
    })
    return redirectRes
  };

  const hasOAuthError = request.nextUrl.searchParams.has('error') || 
                        request.nextUrl.searchParams.has('error_code') || 
                        request.nextUrl.searchParams.has('error_description');

  if (hasOAuthError) {
    cleanServerResponseCookies(supabaseResponse, allCookies);
  }

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user || null;
  } catch (e) {
    // Graceful fallback on auth network failure
    user = null;
  }

  // 5. Global API Security: Origin Enforcement for state-changing methods
  if (url.startsWith('/api/')) {
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')
    const isLocalhost = host?.includes('localhost') || origin?.includes('localhost')
    
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      if (!isLocalhost) {
        if (!origin || !host) {
          return NextResponse.json({ error: 'Forbidden: Missing origin or host header' }, { status: 403 })
        }
        try {
          const originHost = new URL(origin).host.replace(/^www\./, '');
          const reqHost = host.replace(/^www\./, '');
          if (originHost !== reqHost && !origin.includes('upstore.one')) {
            return NextResponse.json({ error: 'Forbidden: Invalid origin (CSRF Prevented)' }, { status: 403 })
          }
        } catch {
          return NextResponse.json({ error: 'Forbidden: Malformed origin' }, { status: 403 })
        }
      }
    }
  }

  // 6. Device Session Fingerprinting (Prevent Hijacking)
  if (user) {
    const expectedFingerprint = await generateDeviceFingerprint(ip, userAgent);
    const existingSignature = request.cookies.get('device_signature')?.value;

    if (!existingSignature) {
      supabaseResponse.cookies.set('device_signature', expectedFingerprint, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365 // 1 year
      });
    } else if (existingSignature !== expectedFingerprint) {
      supabaseResponse.cookies.set('device_signature', expectedFingerprint, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365 // 1 year
      });
    }
  }

  let userRole: string | null = null
  if (user && (isProtectedRoute || isAuthRoute || url.startsWith('/api/admin/'))) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      userRole = profile?.role ?? null
    } catch {
      userRole = null;
    }
  }

  const userIsAdmin = Boolean(
    user &&
      isAdminIdentity({
        id: user.id,
        email: user.email,
        role: userRole,
      })
  )

  // Edge-level protection for /api/admin/* (Defense-in-depth before route handler execution)
  if (url.startsWith('/api/admin/') && url !== '/api/admin/system-status') {
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin authorization required' }, { status: 403 });
    }
  }

  // Protect /dashboard, /admin, and /ad routes
  if (isProtectedRoute) {
    if (!user) {
      if (isSearchEngineOrBot) {
        return new NextResponse(null, {
          status: 200,
          headers: {
            'X-Robots-Tag': 'noindex, nofollow, noarchive',
          },
        });
      }
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/auth/login'
      loginUrl.searchParams.set('next', url)
      return createRedirectResponse(loginUrl)
    }
  }

  if (
    url.startsWith('/dashboard') &&
    userIsAdmin &&
    request.nextUrl.searchParams.get('as') !== 'user'
  ) {
    const adminUrl = request.nextUrl.clone()
    adminUrl.pathname = '/admin'
    adminUrl.searchParams.delete('as')
    return createRedirectResponse(adminUrl)
  }

  // Protect /admin and /ad specifically - strictly admin only in production
  if ((url.startsWith('/admin') || (url.startsWith('/ad') && !isLocalhost)) && user) {
    if (!userIsAdmin) {
      const homeUrl = request.nextUrl.clone()
      homeUrl.pathname = '/'
      return createRedirectResponse(homeUrl)
    }
  }

  // Redirect to dashboard/admin if logged-in user tries to visit auth pages, except callback and signout
  if (isAuthRoute && 
      !url.startsWith('/auth/callback') && 
      !url.startsWith('/auth/signout') && 
      user) {
    const nextPath = getSafeRedirectTarget(
      request.nextUrl.searchParams.get('next'),
      getDashboardPath({
        id: user.id,
        email: user.email,
        role: userRole,
      })
    )
    return createRedirectResponse(new URL(nextPath, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/webhooks (all webhook providers)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
