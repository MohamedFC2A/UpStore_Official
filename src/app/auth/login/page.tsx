'use client';

/**
 * page.tsx (Login Page) — UpStore Premium Digital Marketplace
 * Fully redesigned using Tailwind CSS v4.
 */import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useLocale } from '@/context/LocaleContext';
import { useToastStore } from '@/store/useToastStore';
import { Lock, AlertCircle, Zap } from 'lucide-react';
import { bootstrapCurrentSession, setPendingReferralCookie } from '@/utils/auth-client';
import { getSafeRedirectTarget, normalizeEmail } from '@/utils/auth';
import { cleanAllAuthCookiesAndStorage, cleanUrlAuthErrors } from '@/utils/auth-cookies';
import { createClient } from '@/utils/supabase/client';
import { syncDeviceFingerprintCookie } from '@/utils/hardwareFingerprint';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { SmartEmailInput } from '@/components/auth/SmartEmailInput';

// ─── Main Login Page Component ──────────────────────────────────────────────

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { language, mounted } = useLocale();

  const getLoginText = (key: string) => {
    const dicts: Record<string, Record<string, string>> = {
      ar: {
        'Welcome Back': 'مرحباً بعودتك',
        'Sign in to your secure UpStore account.': 'قم بتسجيل الدخول إلى حساب UpStore الآمن الخاص بك.',
        'Please enter both email and password.': 'يرجى إدخال البريد الإلكتروني وكلمة المرور.',
        'Continue with Google': 'المتابعة باستخدام جوجل',
        'or email': 'أو البريد الإلكتروني',
        'Email Address': 'عنوان البريد الإلكتروني',
        'Password': 'كلمة المرور',
        'Forgot?': 'نسيت كلمة المرور؟',
        'Hide': 'إخفاء',
        'Show': 'إظهار',
        'Signing In...': 'جاري تسجيل الدخول...',
        'Sign In →': 'تسجيل الدخول ←',
        "Don't have an account? ": 'ليس لديك حساب؟ ',
        'Create one →': 'إنشاء حساب جديد ←',
        'Buy Smarter. Stream Better.': 'شراء أذكى. بث أفضل.',
        'Track every order and receive fulfillment updates directly inside your secure dashboard.': 'تابع كل طلب واستقبل تحديثات التنفيذ مباشرة داخل لوحة التحكم الآمنة الخاصة بك.',
        'Trouble signing in? Smart Reset': 'واجهت مشكلة؟ تنظيف الجلسة والكوكيز',
        'Session and cookies cleaned successfully': 'تم تنظيف ملفات تعريف الارتباط وإعادة ضبط الجلسة بنجاح'
      },
      en: {}
    };
    return (mounted && dicts[language] && dicts[language][key]) || key;
  };

  const getNextPath = () => {
    if (typeof window === 'undefined') {
      return null;
    }

    return new URLSearchParams(window.location.search).get('next');
  };

  const getReferralPath = () => {
    if (typeof window === 'undefined') {
      return '/auth/register';
    }

    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    return ref ? `/auth/register?ref=${encodeURIComponent(ref)}` : '/auth/register';
  };

  useEffect(() => {
    void syncDeviceFingerprintCookie();
    // Proactively redirect already authenticated users to the home page (or next target)
    const checkActiveSession = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const targetPath = getSafeRedirectTarget(getNextPath(), '/');
          window.location.replace(targetPath);
        }
      } catch {
        // ignore
      }
    };
    checkActiveSession();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) {
      setPendingReferralCookie(ref);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const error = new URLSearchParams(window.location.search).get('error');
    if (!error) {
      return;
    }

    setIsError(true);
    if (error === 'profile_setup_failed') {
      setErrorMessage(
        language === 'ar'
          ? 'تم تسجيل الدخول لكن حدث تأخير بسيط في مزامنة البيانات. جارٍ نقلك إلى الموقع...'
          : 'Signed in successfully. Syncing your profile...'
      );
      const targetPath = getSafeRedirectTarget(getNextPath(), '/');
      window.location.replace(targetPath);
      return;
    }

    if (error === 'oauth_failed') {
      setErrorMessage(
        language === 'ar'
          ? 'فشل تسجيل الدخول بواسطة Google. حاول مرة أخرى.'
          : 'Google sign-in failed. Please try again.'
      );
    }
  }, [language]);

  const handleGoogleOAuthRedirect = useCallback(async () => {
    console.log('[CLIENT_AUTH_DEBUG] Initiating Google OAuth redirect via Supabase...');
    setIsError(false);
    setIsLoading(true);
    try {
      cleanAllAuthCookiesAndStorage();

      if (typeof window !== 'undefined') {
        const ref = new URLSearchParams(window.location.search).get('ref');
        if (ref) {
          setPendingReferralCookie(ref);
        }
      }

      const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(getNextPath() || '')}`;
      console.log('[CLIENT_AUTH_DEBUG] OAuth target redirectTo:', redirectUrl);

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        console.error('[CLIENT_AUTH_DEBUG] signInWithOAuth failed:', error.message);
        setIsError(true);
        setErrorMessage(error.message);
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('[CLIENT_AUTH_DEBUG] OAuth Exception:', err);
      setIsError(true);
      setErrorMessage(err?.message || 'Google OAuth failed');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timeoutId: NodeJS.Timeout;

    const initGoogle = () => {
      // @ts-ignore
      if (!window.google?.accounts?.id) {
        timeoutId = setTimeout(initGoogle, 300);
        return;
      }

      console.log('[CLIENT_AUTH_DEBUG] Initializing Google Identity Services SDK...');
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '571500602809-lt7funa71reha23dau89p00sa8ecdl1i.apps.googleusercontent.com';

      // @ts-ignore
      window.google.accounts.id.initialize({
        client_id: clientId,
        auto_select: false,
        cancel_on_tap_outside: true,
        callback: async (response: any) => {
          console.log('[CLIENT_AUTH_DEBUG] Google One-Tap/GSI callback triggered! Token length:', response?.credential?.length);
          setIsError(false);
          setIsLoading(true);
          try {
            if (typeof window !== 'undefined') {
              const ref = new URLSearchParams(window.location.search).get('ref');
              if (ref) {
                console.log('[CLIENT_AUTH_DEBUG] Storing referral cookie from URL:', ref);
                setPendingReferralCookie(ref);
              }
            }

            console.log('[CLIENT_AUTH_DEBUG] Calling supabase.auth.signInWithIdToken...');
            const supabase = createClient();
            const { data, error } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: response.credential,
            });

            if (error) {
              console.warn('[CLIENT_AUTH_DEBUG] signInWithIdToken failed, falling back to OAuth redirect:', error.message);
              cleanUrlAuthErrors();
              await handleGoogleOAuthRedirect();
              return;
            }

            console.log('[CLIENT_AUTH_DEBUG] signInWithIdToken SUCCESS!', {
              userId: data?.user?.id,
              email: data?.user?.email,
            });

            try {
              console.log('[CLIENT_AUTH_DEBUG] Bootstrapping session on backend...');
              const bootstrap = await bootstrapCurrentSession(null, data?.session);
              const targetPath = getSafeRedirectTarget(getNextPath(), bootstrap?.redirectTo || '/');
              console.log('[CLIENT_AUTH_DEBUG] Session bootstrapped! Redirecting to:', targetPath);
              useToastStore.getState().success(
                language === 'ar' ? 'تم تسجيل الدخول بنجاح! مرحباً بك' : 'Welcome back! Signed in successfully.',
                data?.user?.email || ''
              );
              window.location.replace(targetPath);
            } catch (err: any) {
              console.warn('[CLIENT_AUTH_DEBUG] Bootstrap fallback notice:', err);
              const targetPath = getSafeRedirectTarget(getNextPath(), '/');
              window.location.replace(targetPath);
            }
          } catch (bootstrapError) {
            console.error('[CLIENT_AUTH_DEBUG] Google Sign-In Critical Error:', bootstrapError);
            cleanUrlAuthErrors();
            await handleGoogleOAuthRedirect();
          }
        },
      });

      // Automatically display Google One Tap prompt for frictionless 1-tap sign-in
      try {
        console.log('[CLIENT_AUTH_DEBUG] Prompting Google One Tap...');
        // @ts-ignore
        window.google.accounts.id.prompt((notification: any) => {
          if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
            console.log('[CLIENT_AUTH_DEBUG] One Tap skipped or dismissed gracefully.');
          }
        });
      } catch {
        // ignore prompt error if blocked
      }
    };

    initGoogle();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [language, handleGoogleOAuthRedirect]);

  const handleGoogleSignInClick = async () => {
    console.log('[CLIENT_AUTH_DEBUG] User clicked Google Sign-In button');
    setIsError(false);
    setIsLoading(true);
    cleanUrlAuthErrors();
    await handleGoogleOAuthRedirect();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsError(false);
    
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail || !password) {
      setIsError(true);
      setErrorMessage(getLoginText('Please enter both email and password.'));
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      setIsError(true);
      if (error.message.includes('Invalid login credentials')) {
        setErrorMessage(
          language === 'ar'
            ? 'بيانات الدخول غير صحيحة. يرجى التأكد من البريد الإلكتروني وكلمة المرور.'
            : 'Invalid login credentials. Please check your email and password.'
        );
      } else if (error.message.includes('Email not confirmed')) {
        setErrorMessage(
          language === 'ar'
            ? 'يرجى تأكيد البريد الإلكتروني الخاص بك أولاً لتسجيل الدخول.'
            : 'Please confirm your email address before signing in.'
        );
      } else {
        setErrorMessage(error.message);
      }
      setIsLoading(false);
      return;
    }

    try {
      const bootstrap = await bootstrapCurrentSession(null, data?.session);
      const targetPath = getSafeRedirectTarget(getNextPath(), bootstrap?.redirectTo || '/');
      useToastStore.getState().success(
        language === 'ar' ? 'تم تسجيل الدخول بنجاح! مرحباً بك' : 'Welcome back! Signed in successfully.',
        cleanEmail
      );
      window.location.replace(targetPath);
    } catch {
      // User is authenticated in Supabase, proceed to home page safely
      const targetPath = getSafeRedirectTarget(getNextPath(), '/');
      window.location.replace(targetPath);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] flex items-stretch text-black">
      
      {/* ── Left Column: Form Panel (480px width) ── */}
      <div className="w-full lg:w-[480px] bg-white border-e-2 border-black px-4 sm:px-12 flex flex-col justify-center relative z-10 shadow-[6px_0px_0px_0px_#000] shrink-0 py-8">
        
        {/* Logo */}
        <div className="mb-8">
          <BrandLogo size="lg" />
        </div>

        {/* Headings */}
        <div className="mb-6 select-none">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-black mb-1.5">{getLoginText('Welcome Back')}</h1>
          <p className="text-xs sm:text-sm text-neutral-600 font-bold">{getLoginText('Sign in to your secure UpStore account.')}</p>
        </div>

        {/* Error Alert */}
        {isError && (
          <div role="alert" className="p-3.5 bg-rose-100 border-2 border-black shadow-[2px_2px_0px_0px_#000] rounded-xl flex items-center gap-2.5 mb-5 select-none animate-scale-in">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 stroke-[2.5]" />
            <span className="text-xs text-black font-black">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate suppressHydrationWarning>
          
          {/* Google Direct Sign-In Button */}
          <div className="w-full relative overflow-hidden rounded-2xl" suppressHydrationWarning>
            <button
              type="button"
              disabled={isLoading}
              onClick={handleGoogleSignInClick}
              className="w-full h-12 flex items-center justify-center gap-3 px-5 rounded-2xl bg-white hover:bg-neutral-50 active:bg-neutral-100 border-2 border-black text-sm font-black text-black transition-all duration-200 cursor-pointer shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none group select-none disabled:opacity-50"
              suppressHydrationWarning
            >
              <span className="text-sm font-black text-black">
                {getLoginText('Continue with Google')}
              </span>
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 py-1 select-none" suppressHydrationWarning>
            <span className="flex-1 h-[2px] bg-black" />
            <span className="text-xs font-black text-black uppercase tracking-wider">{getLoginText('or email')}</span>
            <span className="flex-1 h-[2px] bg-black" />
          </div>

          {/* Smart Email Input */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-black text-black uppercase tracking-wider block select-none">
              {getLoginText('Email Address')}
            </label>
            <SmartEmailInput
              id="email"
              value={email}
              onChange={setEmail}
              placeholder="username"
              required
              disabled={isLoading}
            />
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center select-none">
              <label htmlFor="password" className="text-xs font-black text-black uppercase tracking-wider block">{getLoginText('Password')}</label>
              <Link href="/auth/forgot" className="text-xs font-black text-black underline hover:text-neutral-700 transition-colors">{getLoginText('Forgot?')}</Link>
            </div>
            <div className="relative group">
              <span className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-black transition-colors select-none">
                <Lock className="w-4 h-4 stroke-[2.5]" />
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full ps-10 pe-12 py-3 bg-[#FFFDF9] border-2 border-black rounded-xl text-sm font-bold text-black placeholder-neutral-500 shadow-[2.5px_2.5px_0px_0px_#000] outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 end-0 pe-3.5 flex items-center text-xs font-black text-black hover:opacity-70 cursor-pointer select-none"
              >
                {showPassword ? getLoginText('Hide') : getLoginText('Show')}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-[#06D6A0] hover:bg-[#05b385] text-black font-black text-sm rounded-xl border-2 border-black shadow-[3.5px_3.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 select-none cursor-pointer"
          >
            {isLoading ? (
              <>
                <svg width="16" height="16" className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {getLoginText('Signing In...')}
              </>
            ) : (
              getLoginText('Sign In →')
            )}
          </button>

        </form>

        {/* Footer link */}
        <p className="mt-6 text-center text-xs sm:text-sm text-neutral-700 font-bold select-none">
          {getLoginText("Don't have an account? ")}{' '}
          <Link href={getReferralPath()} className="text-black font-black underline hover:opacity-80 transition-colors">
            {getLoginText('Create one →')}
          </Link>
        </p>

        {/* Smart Cookie Reset Helper */}
        <div className="mt-4 pt-4 border-t border-neutral-200 text-center">
          <button
            type="button"
            onClick={async () => {
              cleanAllAuthCookiesAndStorage();
              try {
                const supabase = createClient();
                await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
                await fetch('/api/auth/clean-cookies', { method: 'POST' }).catch(() => {});
              } catch {}
              useToastStore.getState().success(getLoginText('Session and cookies cleaned successfully'));
              setIsError(false);
              setErrorMessage('');
            }}
            className="text-[11px] font-bold text-neutral-500 hover:text-black underline transition-colors cursor-pointer"
          >
            {getLoginText('Trouble signing in? Smart Reset')}
          </button>
        </div>

      </div>

      {/* ── Right Column: Decorative Panel (Hidden on mobile) ── */}
      <div className="hidden lg:flex flex-1 bg-[#FFFDF9] relative items-center justify-center p-12 overflow-hidden">
        
        {/* Value card overlay */}
        <div className="relative z-10 bg-[#FFE600] border-2 border-black rounded-3xl p-8 max-w-sm select-none shadow-[6px_6px_0px_0px_#000] text-black">
          <div className="w-12 h-12 rounded-2xl bg-white border-2 border-black flex items-center justify-center mb-4 shadow-[2px_2px_0px_0px_#000]">
            <Zap className="w-6 h-6 stroke-[2.5] text-black fill-black" />
          </div>
          <h3 className="text-xl font-black text-black mb-2">{getLoginText('Buy Smarter. Stream Better.')}</h3>
          <p className="text-xs sm:text-sm text-neutral-800 leading-relaxed font-bold">
            {getLoginText('Track every order and receive fulfillment updates directly inside your secure dashboard.')}
          </p>
        </div>

      </div>

    </div>
  );
}
