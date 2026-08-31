/**
 * auth-cookies.ts — UpStore Smart Auth & Cookie Lifecycle Utility
 * Enterprise-grade cookie, storage, and PKCE state manager.
 */

import { NextResponse } from 'next/server';

export const AUTH_COOKIE_PATTERNS = [
  /^sb-.*-auth-token/i,
  /^sb-.*-code-verifier/i,
  /^supabase-auth-token/i,
  /^device_signature$/i,
  /^oauth_state$/i,
  /^pkce_/i,
];

/**
 * Intelligent client-side cookie and local storage purger.
 * Deletes all Supabase auth cookies, PKCE verifiers, chunked auth cookies, and local session tokens.
 */
export function cleanAllAuthCookiesAndStorage(): void {
  if (typeof window === 'undefined') return;

  try {
    // 1. Parse and purge matching document cookies across all possible domain and path scopes
    const cookies = document.cookie.split(';');
    const hostname = window.location.hostname;
    const domainParts = hostname.split('.');
    const rootDomain = domainParts.length > 1 ? `.${domainParts.slice(-2).join('.')}` : hostname;
    const baseDomain = hostname.replace(/^www\./, '');

    const domainsToTest = [
      '', // default / host-only
      hostname,
      `.${hostname}`,
      rootDomain,
      `.${rootDomain}`,
      baseDomain,
      `.${baseDomain}`,
    ];

    const pathsToTest = ['/', '/auth', '/auth/callback', ''];

    for (const cookieStr of cookies) {
      const eqPos = cookieStr.indexOf('=');
      const rawName = eqPos > -1 ? cookieStr.substring(0, eqPos) : cookieStr;
      const name = rawName.trim();

      const isAuthCookie = AUTH_COOKIE_PATTERNS.some((pattern) => pattern.test(name));

      if (isAuthCookie) {
        for (const domain of domainsToTest) {
          for (const path of pathsToTest) {
            const domainAttr = domain ? `; domain=${domain}` : '';
            const pathAttr = path ? `; path=${path}` : '; path=/';
            
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT${pathAttr}${domainAttr}; SameSite=Lax`;
            document.cookie = `${name}=; max-age=0${pathAttr}${domainAttr}; SameSite=Lax`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT${pathAttr}${domainAttr}; SameSite=Lax; Secure`;
            document.cookie = `${name}=; max-age=0${pathAttr}${domainAttr}; SameSite=Lax; Secure`;
          }
        }
      }
    }

    // 2. Purge Supabase Auth keys from localStorage
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token') || key.startsWith('oauth_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore storage access restrictions
    }

    // 3. Purge Supabase Auth keys from sessionStorage
    try {
      const sessionKeysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token') || key.startsWith('oauth_'))) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach((k) => sessionStorage.removeItem(k));
    } catch {
      // ignore
    }
  } catch (err) {
    console.warn('[auth-cookies] Notice during client cookie cleanup:', err);
  }
}

/**
 * Server-side helper to wipe all Supabase cookies directly on a NextResponse.
 */
export function cleanServerResponseCookies(
  response: NextResponse,
  requestCookies?: { name: string; value: string }[] | ReadonlyArray<{ name: string; value: string }>
): void {
  const expiredCookieOptions = {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };

  // 1. Wipe all known names from request cookies
  if (requestCookies && Array.isArray(requestCookies)) {
    for (const c of requestCookies) {
      if (AUTH_COOKIE_PATTERNS.some((p) => p.test(c.name))) {
        response.cookies.set(c.name, '', expiredCookieOptions);
      }
    }
  }

  // 2. Wipe standard Supabase project cookie names as safety fallback
  const knownPrefixes = [
    'sb-nkjutiglgywdfxfqkhzp-auth-token',
    'sb-nkjutiglgywdfxfqkhzp-auth-token-code-verifier',
    'supabase-auth-token',
    'device_signature',
  ];

  for (const prefix of knownPrefixes) {
    response.cookies.set(prefix, '', expiredCookieOptions);
    for (let chunk = 0; chunk <= 10; chunk++) {
      response.cookies.set(`${prefix}.${chunk}`, '', expiredCookieOptions);
    }
  }
}

/**
 * Strips error parameters from the current window location without triggering a full page reload.
 */
export function cleanUrlAuthErrors(): void {
  if (typeof window === 'undefined') return;

  try {
    const url = new URL(window.location.href);
    const errorParams = ['error', 'error_code', 'error_description', 'error_subtype'];
    let changed = false;

    for (const param of errorParams) {
      if (url.searchParams.has(param)) {
        url.searchParams.delete(param);
        changed = true;
      }
    }

    if (url.hash && (url.hash.includes('error=') || url.hash.includes('error_code='))) {
      url.hash = '';
      changed = true;
    }

    if (changed) {
      const newRelativePath = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '') + url.hash;
      window.history.replaceState({}, document.title, newRelativePath || '/');
    }
  } catch (err) {
    console.warn('[auth-cookies] Notice during URL cleanup:', err);
  }
}
