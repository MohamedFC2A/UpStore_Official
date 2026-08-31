'use client'

import {
  REFERRAL_COOKIE_NAME,
  normalizeReferralCode,
  type AuthBootstrapResult,
} from '@/utils/auth';

export async function bootstrapCurrentSession(
  referralCode?: string | null,
  session?: { access_token: string; refresh_token: string } | null
): Promise<AuthBootstrapResult> {
  let effectiveSession = session;
  if (!effectiveSession && typeof window !== 'undefined') {
    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        effectiveSession = {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        };
      }
    } catch {
      // ignore
    }
  }

  const response = await fetch('/api/auth/bootstrap', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      referralCode: normalizeReferralCode(referralCode),
      session: effectiveSession
        ? {
            access_token: effectiveSession.access_token,
            refresh_token: effectiveSession.refresh_token,
          }
        : null,
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to initialize your account.');
  }

  return payload as AuthBootstrapResult;
}

export function setPendingReferralCookie(referralCode?: string | null) {
  const normalized = normalizeReferralCode(referralCode);

  if (!normalized) {
    clearPendingReferralCookie();
    return;
  }

  document.cookie = `${REFERRAL_COOKIE_NAME}=${encodeURIComponent(normalized)}; Path=/; Max-Age=2592000; SameSite=Lax`;
}

export function clearPendingReferralCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = `${REFERRAL_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
    try {
      localStorage.removeItem('upstore_referral');
      sessionStorage.removeItem('upstore_referral');
    } catch {}
  }
}
