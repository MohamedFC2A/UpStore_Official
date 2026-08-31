import 'server-only'

import crypto from 'node:crypto';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const APP_ORIGIN_ENV_KEYS = [
  'APP_ORIGIN',
  'NEXT_PUBLIC_SITE_URL',
  'SITE_URL',
  'NEXT_PUBLIC_APP_URL',
  'APP_URL',
] as const;

function normalizeOrigin(origin: string) {
  return origin.replace(/\/+$/, '');
}

export function getConfiguredAppOrigin(request?: Request | string | URL) {
  if (request) {
    try {
      if (typeof request === 'string') {
        return normalizeOrigin(new URL(request).origin);
      }
      if (request instanceof URL) {
        return normalizeOrigin(request.origin);
      }
      if (typeof (request as Request).url === 'string') {
        const forwardedHost = request.headers.get('x-forwarded-host');
        const host = forwardedHost || request.headers.get('host');
        if (host) {
          const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
          return normalizeOrigin(`${proto}://${host}`);
        }
        return normalizeOrigin(new URL(request.url).origin);
      }
    } catch {
      // fallback
    }
  }

  for (const key of APP_ORIGIN_ENV_KEYS) {
    let raw = process.env[key];
    if (raw) {
      try {
        return normalizeOrigin(new URL(raw).origin);
      } catch {
        continue;
      }
    }
  }

  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV || '';
  const isVercelProduction = vercelEnv === 'production';

  if (!isVercelProduction) {
    const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
    if (vercelUrl) {
      const raw = vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
      try {
        return normalizeOrigin(new URL(raw).origin);
      } catch {
        // ignore
      }
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:3000';
  }

  return 'https://upstore.one';
}

export function getConfiguredAppOriginOrNull(request?: Request | string | URL) {
  try {
    return getConfiguredAppOrigin(request);
  } catch {
    return null;
  }
}

export function buildInternalUrl(path: string, baseRequestOrOrigin?: Request | string | URL) {
  const origin = baseRequestOrOrigin ? getConfiguredAppOrigin(baseRequestOrOrigin) : getConfiguredAppOrigin();
  return new URL(path, origin).toString();
}

export async function enforceSameOriginRequest(request: Request) {
  const headerOrigin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // Determine dynamic expected origin from request headers (highly resilient)
  const forwardedHost = request.headers.get('x-forwarded-host');
  const directHost = request.headers.get('host') || '';
  const host = forwardedHost || directHost;
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const protocol = isLocal ? 'http' : (request.headers.get('x-forwarded-proto') || 'https');
  const dynamicExpectedOrigin = normalizeOrigin(`${protocol}://${host}`);

  // Resolve statically configured origin
  const staticExpectedOrigin = getConfiguredAppOrigin();

  const allowedOrigins = new Set<string>();
  allowedOrigins.add(dynamicExpectedOrigin);
  allowedOrigins.add(staticExpectedOrigin);
  allowedOrigins.add('https://upstore.one');
  allowedOrigins.add('https://www.upstore.one');

  // Add all other fallback domains
  const configured = getConfiguredAppOriginOrNull();
  if (configured) {
    allowedOrigins.add(normalizeOrigin(configured));
  }

  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
  if (vercelUrl) {
    allowedOrigins.add(normalizeOrigin(vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`));
  }

  if (directHost) {
    allowedOrigins.add(normalizeOrigin(`${protocol}://${directHost}`));
  }
  if (forwardedHost) {
    allowedOrigins.add(normalizeOrigin(`${protocol}://${forwardedHost}`));
  }

  const isAllowed = (origin: string) => {
    const normalized = normalizeOrigin(origin);
    if (allowedOrigins.has(normalized)) return true;

    // Always allow localhost in development
    if (process.env.NODE_ENV !== 'production') {
      if (normalized === 'http://localhost:3000' || normalized === 'http://127.0.0.1:3000') {
        return true;
      }
    }

    // Dynamic fallback checking of host/protocol matching to avoid environment/custom domain mismatches
    try {
      const originUrl = new URL(normalized);
      const originHost = originUrl.host.toLowerCase();
      const originProto = originUrl.protocol.replace(':', '').toLowerCase();

      const reqHost = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').toLowerCase();
      const reqProto = (request.headers.get('x-forwarded-proto') || 'https').toLowerCase();
      const isReqLocal = reqHost.startsWith('localhost') || reqHost.startsWith('127.0.0.1');

      if (originHost === reqHost && (originProto === reqProto || isReqLocal)) {
        return true;
      }
    } catch {
      // ignore parsing errors
    }

    return false;
  };

  if (headerOrigin) {
    if (!isAllowed(headerOrigin)) {
      console.warn(`[SameOriginCheck Failed] Forbidden Origin: "${headerOrigin}". Allowed origins:`, Array.from(allowedOrigins), `Request host: "${request.headers.get('host')}", x-forwarded-host: "${request.headers.get('x-forwarded-host')}"`);
      return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
    }
    return null;
  }

  if (referer) {
    try {
      const refererOrigin = normalizeOrigin(new URL(referer).origin);
      if (!isAllowed(refererOrigin)) {
        console.warn(`[SameOriginCheck Failed] Forbidden Referer: "${referer}". Allowed origins:`, Array.from(allowedOrigins));
        return NextResponse.json({ error: 'Forbidden referer' }, { status: 403 });
      }
      return null;
    } catch {
      return NextResponse.json({ error: 'Invalid referer' }, { status: 403 });
    }
  }

  return NextResponse.json({ error: 'Missing origin' }, { status: 403 });
}

export async function requireAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      supabase,
      user: null,
      profile: null,
    };
  }

  // Check if account is banned and retrieve role in a single DB query
  let profile: { role?: string; is_banned?: boolean; ban_reason?: string | null } | null = null;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('role, is_banned, ban_reason')
      .eq('id', user.id)
      .maybeSingle();

    profile = data;
    if (profile?.is_banned) {
      return {
        error: NextResponse.json(
          {
            error: 'ACCOUNT_BANNED',
            banned: true,
            message:
              profile.ban_reason ||
              'تم حظر حسابك نهائياً من استخدام منصة UpStore بسبب مخالفات متكررة ومحاولات احتيال.',
          },
          { status: 403 }
        ),
        supabase,
        user: null,
        profile: null,
      };
    }
  } catch {
    // Non-blocking fallback
  }

  return {
    error: null,
    supabase,
    user,
    profile,
  };
}

export async function requireAdminUser() {
  const auth = await requireAuthenticatedUser();
  if (auth.error || !auth.user) {
    return auth;
  }

  const { isAdminIdentity } = await import('@/utils/auth');

  if (!isAdminIdentity({ id: auth.user.id, email: auth.user.email, role: auth.profile?.role })) {
    return {
      ...auth,
      error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }),
    };
  }

  return auth;
}

export function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function buildSafeStorageObjectName(prefix: string, extension: string) {
  const cleanExtension = extension.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
  return `${prefix}-${crypto.randomUUID()}.${cleanExtension}`;
}

export async function getRequestHost() {
  const headerStore = await headers();
  const host = headerStore.get('host') || '';
  const expectedOrigin = new URL(getConfiguredAppOrigin());

  if (!host) {
    return expectedOrigin.host;
  }

  return host === expectedOrigin.host ? host : expectedOrigin.host;
}

export async function checkStoreMaintenanceMode(): Promise<NextResponse | null> {
  try {
    const { createAdminClient } = await import('@/utils/supabase/admin');
    const supabase = createAdminClient();
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'maintenance_mode').single();
    if (data?.value === true || data?.value === 'true') {
      return NextResponse.json({
        error: 'STORE_SLEEP_MODE',
        message: 'المتجر في وضع الاستراحة المؤقت حالياً. يرجى المحاولة لاحقاً فور فتح المتجر أو التواصل مع الدعم الفني.',
      }, { status: 503 });
    }
  } catch {
    // Ignore
  }
  return null;
}
