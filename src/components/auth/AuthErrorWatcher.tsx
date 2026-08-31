'use client';

/**
 * AuthErrorWatcher.tsx — UpStore Smart Auth Error & Cookie Self-Healing System
 * Continuously listens for OAuth exchange failures, server redirects, and expired/corrupted sessions.
 * Automatically purges broken cookies, cleans browser URL, and alerts the user gracefully.
 */

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale } from '@/context/LocaleContext';
import { useToastStore } from '@/store/useToastStore';
import { cleanAllAuthCookiesAndStorage, cleanUrlAuthErrors } from '@/utils/auth-cookies';
import { createClient } from '@/utils/supabase/client';

export function AuthErrorWatcher() {
  const searchParams = useSearchParams();
  const { language } = useLocale();
  const isHandled = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkAndHandleErrors = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash || '';
      
      const error = urlParams.get('error') || (hash.includes('error=') ? 'oauth_error' : null);
      const errorCode = urlParams.get('error_code');
      const errorDescription = urlParams.get('error_description');

      const isOAuthError = 
        Boolean(error) || 
        Boolean(errorCode) || 
        Boolean(errorDescription) ||
        hash.includes('error=server_error') ||
        hash.includes('error_description=');

      if (isOAuthError && !isHandled.current) {
        isHandled.current = true;
        console.warn('[AuthErrorWatcher] OAuth error detected in URL, executing smart cookie cleanup:', {
          error,
          errorCode,
          errorDescription,
        });

        // 1. Purge all client-side auth cookies, tokens, and storage
        cleanAllAuthCookiesAndStorage();

        // 2. Terminate any dirty Supabase client session
        try {
          const supabase = createClient();
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        } catch {
          // ignore
        }

        // 3. Server-side cookie cleanup endpoint to invalidate HTTP-only cookies
        try {
          await fetch('/api/auth/clean-cookies', { method: 'POST' }).catch(() => {});
        } catch {
          // ignore
        }

        // 4. Clean error parameters from URL address bar silently
        cleanUrlAuthErrors();

        // 5. Display a clear, user-friendly notification
        const isAr = language === 'ar';
        let friendlyMessage = isAr
          ? 'تعذر إكمال تسجيل الدخول بواسطة جوجل. تم تنظيف ملفات تعريف الارتباط والجلسة بنجاح لتجنب أي تعليق، يمكنك المحاولة مرة أخرى الآن.'
          : 'Google sign-in could not be completed. Corrupted auth cookies were safely cleaned. You can try signing in now.';

        let details = errorDescription 
          ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
          : (isAr ? 'تمت إعادة ضبط الجلسة بنجاح' : 'Session reset cleanly');

        if (isAr && details.includes('Unable to exchange external code')) {
          details = 'فشل تبادل رمز المصادقة بين مزود الخدمة و Google (يرجى مراجعة إعدادات الـ Redirect URI و Client Secret)';
        }

        useToastStore.getState().error(friendlyMessage, details);
      }
    };

    checkAndHandleErrors();
  }, [searchParams, language]);

  return null;
}
