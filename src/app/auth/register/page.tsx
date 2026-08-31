'use client';

/**
 * page.tsx (Registration Page) — UpStore Premium Digital Marketplace
 * Fully redesigned using Neubrutalism Light Design System & Tailwind CSS v4.
 */

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLocale } from '@/context/LocaleContext';
import { useToastStore } from '@/store/useToastStore';
import { User, Lock, Shield, Gift, AlertCircle, CheckCircle2, ShieldCheck, Zap, Unlock } from 'lucide-react';
import {
  bootstrapCurrentSession,
  clearPendingReferralCookie,
  setPendingReferralCookie,
} from '@/utils/auth-client';
import { getSafeRedirectTarget, normalizeEmail, normalizeReferralCode } from '@/utils/auth';
import { cleanAllAuthCookiesAndStorage, cleanUrlAuthErrors } from '@/utils/auth-cookies';
import { createClient } from '@/utils/supabase/client';
import { syncDeviceFingerprintCookie } from '@/utils/hardwareFingerprint';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { SmartEmailInput } from '@/components/auth/SmartEmailInput';

// ─── Design configuration for password strength ─────────────────────────────

type PasswordStrength = 'empty' | 'weak' | 'fair' | 'strong' | 'very-strong';

function calcStrength(pass: string): PasswordStrength {
  if (!pass) return 'empty';
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass);
  const hasNumber = /[0-9]/.test(pass);
  if (pass.length < 6) return 'weak';
  if (pass.length < 10) return 'fair';
  if (pass.length < 14) return 'strong';
  if (pass.length >= 14 && hasSpecial && hasNumber) return 'very-strong';
  return 'strong';
}

// ─── Registration Form Inner Component ───────────────────────────────────────

function RegisterFormInner() {
  const searchParams = useSearchParams();
  const { language, mounted } = useLocale();
  const initialReferralValidationDone = useRef(false);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState(() => {
    const urlRef = searchParams.get('ref');
    return urlRef ? urlRef.trim() : '';
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [referralLocked, setReferralLocked] = useState(false);
  const [referralLockedFromLink, setReferralLockedFromLink] = useState(() => Boolean(searchParams.get('ref') || searchParams.get('locked') === 'true'));
  const [referralOwner, setReferralOwner] = useState('');
  const [referralValidating, setReferralValidating] = useState(false);

  useEffect(() => {
    void syncDeviceFingerprintCookie();
  }, []);

  const getRegisterText = (key: string) => {
    const dicts: Record<string, Record<string, string>> = {
      ar: {
        'Create Account': 'إنشاء حساب جديد',
        'Create your UpStore account and track your orders securely.': 'أنشئ حسابك الآمن في UpStore واستمتع بالتسليم الفوري وتتبع الطلبات.',
        'Please fill in all required fields.': 'يرجى ملء جميع الحقول المطلوبة.',
        'Passwords do not match. Please try again.': 'كلمتا المرور غير متطابقتين. يرجى إعادة المحاولة.',
        'You must agree to the Terms of Service to proceed.': 'يجب الموافقة على شروط الخدمة وسياسة الخصوصية للمتابعة.',
        'Sign up with Google': 'التسجيل باستخدام Google',
        'or email': 'أو بالبريد الإلكتروني',
        'Display Name': 'الاسم أو اللقب',
        'Email Address': 'عنوان البريد الإلكتروني',
        'Password': 'كلمة المرور',
        'Min. 8 characters': '6 أحرف كحد أدنى',
        'Hide': 'إخفاء',
        'Show': 'إظهار',
        'Confirm Password': 'تأكيد كلمة المرور',
        'Repeat your password': 'أعد كتابة كلمة المرور',
        'Referral Code (Optional)': 'كود الدعوة (اختياري)',
        'Enter code (e.g. ALEX884)': 'أدخل كود الدعوة (مثال: ALEX884)',
        'Validate Code': 'تأكيد الكود',
        'I agree to the ': 'أوافق على ',
        'Terms of Service': 'شروط الخدمة',
        ' and ': ' و ',
        'Privacy Policy': 'سياسة الخصوصية',
        'Creating Account...': 'جاري إنشاء الحساب...',
        'Register Account →': 'إنشاء الحساب الآن ←',
        'Already have an account? ': 'هل لديك حساب بالفعل؟ ',
        'Sign In →': 'تسجيل الدخول ←',
        'Continue to Sign In →': 'المتابعة إلى تسجيل الدخول ←',
        'Weak Password': 'كلمة مرور ضعيفة',
        'Fair Password': 'كلمة مرور مقبولة',
        'Strong Password': 'كلمة مرور قوية',
        'Very Strong Password': 'كلمة مرور قوية جداً'
      },
      en: {}
    };
    return (mounted && dicts[language] && dicts[language][key]) || key;
  };

  const STRENGTH_CONFIG = {
    empty: { label: '', color: 'text-transparent', barColor: 'bg-neutral-200', width: 'w-0' },
    weak: { label: getRegisterText('Weak Password'), color: 'text-rose-600', barColor: 'bg-rose-500', width: 'w-1/4' },
    fair: { label: getRegisterText('Fair Password'), color: 'text-orange-600', barColor: 'bg-orange-500', width: 'w-2/4' },
    strong: { label: getRegisterText('Strong Password'), color: 'text-emerald-600', barColor: 'bg-[#06D6A0]', width: 'w-3/4' },
    'very-strong': { label: getRegisterText('Very Strong Password'), color: 'text-sky-600', barColor: 'bg-[#118AB2]', width: 'w-full' },
  };

  const passwordStrength = calcStrength(password);
  const strengthCfg = STRENGTH_CONFIG[passwordStrength];

  useEffect(() => {
    const urlRef = searchParams.get('ref');
    const isLocked = searchParams.get('locked') === 'true' || Boolean(urlRef);
    if (urlRef) {
      setPendingReferralCookie(urlRef);
      setReferralCode(urlRef);
    }
    if (isLocked) {
      setReferralLockedFromLink(true);
    }
  }, [searchParams]);

  const validateReferralCode = useCallback(async (rawCode: string): Promise<boolean> => {
    const normalizedCode = normalizeReferralCode(rawCode);

    if (!normalizedCode) {
      if (!referralLockedFromLink) {
        setReferralLocked(false);
        setReferralOwner('');
        clearPendingReferralCookie();
      }
      return true;
    }

    setReferralValidating(true);

    try {
      const response = await fetch('/api/referral/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: normalizedCode }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.valid) {
        if (!referralLockedFromLink) {
          setReferralLocked(false);
          setReferralOwner('');
          clearPendingReferralCookie();
        }
        setIsError(true);
        setErrorMessage(
          payload?.error || (
            language === 'ar'
              ? 'كود الدعوة غير صحيح أو غير متاح.'
              : 'Referral code is invalid or unavailable.'
          )
        );
        return false;
      }

      setReferralCode(normalizedCode);
      setReferralLocked(true);
      setReferralOwner(payload?.referrer?.displayName || payload?.referrer?.email || 'UpStore User');
      setPendingReferralCookie(normalizedCode);
      setIsError(false);
      return true;
    } catch {
      if (!referralLockedFromLink) {
        setReferralLocked(false);
        setReferralOwner('');
      }
      setIsError(true);
      setErrorMessage(
        language === 'ar'
          ? 'تعذر التحقق من كود الدعوة حالياً.'
          : 'Could not validate the referral code right now.'
      );
      return false;
    } finally {
      setReferralValidating(false);
    }
  }, [language, referralLockedFromLink]);

  useEffect(() => {
    const initialCode = normalizeReferralCode(referralCode);
    if (!initialCode || referralLocked || initialReferralValidationDone.current) {
      return;
    }

    initialReferralValidationDone.current = true;
    void validateReferralCode(initialCode);
  }, [referralCode, referralLocked, validateReferralCode]);

  const nextPath = searchParams.get('next');

  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const targetPath = getSafeRedirectTarget(nextPath, '/');
          window.location.replace(targetPath);
        }
      } catch {
        // ignore
      }
    };
    checkActiveSession();
  }, [nextPath]);

  const handleGoogleOAuthRedirect = useCallback(async () => {
    setIsError(false);
    setIsLoading(true);
    try {
      cleanAllAuthCookiesAndStorage();

      const normalizedCode = normalizeReferralCode(referralCode);
      if (normalizedCode) {
        setPendingReferralCookie(normalizedCode);
      }

      const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath || '')}`;
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
        setIsError(true);
        setErrorMessage(error.message);
        setIsLoading(false);
      }
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err?.message || 'Google OAuth failed');
      setIsLoading(false);
    }
  }, [referralCode, nextPath]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timeoutId: NodeJS.Timeout;

    const initGoogle = () => {
      // @ts-ignore
      if (!window.google?.accounts?.id) {
        timeoutId = setTimeout(initGoogle, 300);
        return;
      }

      console.log('[CLIENT_REGISTER_DEBUG] Initializing Google Identity Services SDK...');
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '571500602809-lt7funa71reha23dau89p00sa8ecdl1i.apps.googleusercontent.com';

      // @ts-ignore
      window.google.accounts.id.initialize({
        client_id: clientId,
        auto_select: false,
        cancel_on_tap_outside: true,
        callback: async (response: any) => {
          console.log('[CLIENT_REGISTER_DEBUG] Google One-Tap/GSI callback received token length:', response?.credential?.length);
          setIsError(false);
          setIsLoading(true);

          try {
            const normalizedCode = normalizeReferralCode(referralCode);
            if (normalizedCode) {
              const isReferralValid = referralLocked || await validateReferralCode(normalizedCode);
              if (!isReferralValid) {
                setIsLoading(false);
                return;
              }
              setPendingReferralCookie(normalizedCode);
            }

            const supabase = createClient();
            const { data, error } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: response.credential,
            });

            if (error) {
              cleanUrlAuthErrors();
              await handleGoogleOAuthRedirect();
              return;
            }

            if (data?.session) {
              try {
                const bootstrap = await bootstrapCurrentSession(normalizedCode, data.session);
                const targetPath = getSafeRedirectTarget(nextPath, bootstrap?.redirectTo || '/');
                useToastStore.getState().success(
                  language === 'ar' ? 'تم إنشاء الحساب بنجاح! مرحباً بك في UpStore' : 'Welcome to UpStore! Account created.',
                  data?.user?.email || ''
                );
                window.location.replace(targetPath);
              } catch {
                const targetPath = getSafeRedirectTarget(nextPath, '/');
                window.location.replace(targetPath);
              }
            } else {
              const targetPath = getSafeRedirectTarget(nextPath, '/');
              window.location.replace(targetPath);
            }
          } catch (bootstrapError) {
            console.error('[CLIENT_REGISTER_DEBUG] Google Sign-Up Critical Error:', bootstrapError);
            cleanUrlAuthErrors();
            await handleGoogleOAuthRedirect();
          }
        },
      });

      try {
        // @ts-ignore
        window.google.accounts.id.prompt((notification: any) => {
          if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
            console.log('[CLIENT_REGISTER_DEBUG] One Tap skipped or dismissed gracefully.');
          }
        });
      } catch {
        // ignore prompt error
      }
    };

    initGoogle();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [language, referralCode, referralLocked, nextPath, validateReferralCode, handleGoogleOAuthRedirect]);

  const handleGoogleSignUpClick = async () => {
    setIsError(false);
    setIsLoading(true);
    cleanUrlAuthErrors();
    await handleGoogleOAuthRedirect();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsError(false);
    setIsSuccess(false);

    const cleanEmail = normalizeEmail(email);

    if (!displayName.trim() || !cleanEmail || !password || !confirmPassword) {
      setIsError(true);
      setErrorMessage(getRegisterText('Please fill in all required fields.'));
      return;
    }
    if (password.length < 6) {
      setIsError(true);
      setErrorMessage(language === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.' : 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setIsError(true);
      setErrorMessage(getRegisterText('Passwords do not match. Please try again.'));
      return;
    }
    if (!agreedToTerms) {
      setIsError(true);
      setErrorMessage(getRegisterText('You must agree to the Terms of Service to proceed.'));
      return;
    }

    const normalizedReferralCode = normalizeReferralCode(referralCode);
    if (normalizedReferralCode) {
      const isReferralValid = referralLocked || await validateReferralCode(normalizedReferralCode);
      if (!isReferralValid) {
        return;
      }
    }

    setIsLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          display_name: displayName.trim(),
          pending_referral_code: normalizedReferralCode,
        },
      },
    });

    if (error) {
      setIsError(true);
      if (error.message.includes('already registered') || error.message.includes('User already registered')) {
        setErrorMessage(
          language === 'ar'
            ? 'هذا البريد الإلكتروني مسجل بالفعل. يمكنك تسجيل الدخول مباشرة.'
            : 'This email is already registered. Please sign in instead.'
        );
      } else {
        setErrorMessage(error.message);
      }
      setIsLoading(false);
      return;
    }

    // Seamless auto-sign-in logic after account creation
    let activeSession = data?.session;

    if (!activeSession) {
      try {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (!signInError && signInData?.session) {
          activeSession = signInData.session;
        }
      } catch {
        // ignore fallback attempt
      }
    }

    if (activeSession) {
      try {
        const bootstrap = await bootstrapCurrentSession(normalizedReferralCode, activeSession);
        const targetPath = getSafeRedirectTarget(nextPath, bootstrap?.redirectTo || '/');
        useToastStore.getState().success(
          language === 'ar' ? 'تم إنشاء الحساب بنجاح! مرحباً بك في UpStore' : 'Welcome to UpStore! Account created.',
          cleanEmail
        );
        window.location.replace(targetPath);
        return;
      } catch {
        const targetPath = getSafeRedirectTarget(nextPath, '/');
        window.location.replace(targetPath);
        return;
      }
    } else {
      setIsLoading(false);
      setIsSuccess(true);
      setSuccessMessage(
        language === 'ar'
          ? 'تم إنشاء الحساب بنجاح! يرجى تأكيد بريدك الإلكتروني لتسجيل الدخول.'
          : 'Account created successfully! Please check your email to confirm your account before logging in.'
      );
      setDisplayName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setAgreedToTerms(false);
      clearPendingReferralCookie();
    }
  };

  return (
    <>
      {/* Headings */}
      <div className="mb-6 select-none">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-black mb-1.5">{getRegisterText('Create Account')}</h1>
        <p className="text-xs sm:text-sm text-neutral-600 font-bold">{getRegisterText('Create your UpStore account and track your orders securely.')}</p>
      </div>

      {/* Error Alert */}
      {isError && (
        <div role="alert" className="p-3.5 bg-rose-100 border-2 border-black shadow-[2px_2px_0px_0px_#000] rounded-xl flex items-center gap-2.5 mb-5 select-none animate-scale-in">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 stroke-[2.5]" />
          <span className="text-xs text-black font-black">{errorMessage}</span>
        </div>
      )}

      {isSuccess ? (
        <div className="space-y-4">
          <div className="rounded-2xl border-2 border-black bg-emerald-50 p-4 text-xs sm:text-sm font-bold text-black shadow-[3px_3px_0px_0px_#000]">
            {successMessage}
          </div>
          <Link
            href="/auth/login"
            className="flex w-full items-center justify-center rounded-xl bg-[#06D6A0] hover:bg-[#05b385] py-3.5 text-sm font-black text-black border-2 border-black shadow-[3.5px_3.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
          >
            {getRegisterText('Continue to Sign In →')}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate suppressHydrationWarning>
          
          {/* Google Direct Sign-Up Button */}
          <div className="w-full relative overflow-hidden rounded-2xl" suppressHydrationWarning>
            <button
              type="button"
              disabled={isLoading}
              onClick={handleGoogleSignUpClick}
              className="w-full h-12 flex items-center justify-center gap-3 px-5 rounded-2xl bg-white hover:bg-neutral-50 active:bg-neutral-100 border-2 border-black text-sm font-black text-black transition-all duration-200 cursor-pointer shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none group select-none disabled:opacity-50"
              suppressHydrationWarning
            >
              <span className="text-sm font-black text-black">
                {getRegisterText('Sign up with Google')}
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
            <span className="text-xs font-black text-black uppercase tracking-wider">{getRegisterText('or email')}</span>
            <span className="flex-1 h-[2px] bg-black" />
          </div>

          {/* Display Name Input */}
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-xs font-black text-black uppercase tracking-wider block select-none">
              {getRegisterText('Display Name')}
            </label>
            <div className="relative group">
              <span className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-black transition-colors select-none">
                <User className="w-4 h-4 stroke-[2.5]" />
              </span>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alex Larson"
                required
                className="w-full ps-10 pe-4 py-3 bg-[#FFFDF9] border-2 border-black rounded-xl text-sm font-bold text-black placeholder-neutral-400 shadow-[2.5px_2.5px_0px_0px_#000] outline-none transition-all"
              />
            </div>
          </div>

          {/* Smart Email Input with Domain Selector */}
          <div className="space-y-1.5">
            <label htmlFor="register-email" className="text-xs font-black text-black uppercase tracking-wider block select-none">
              {getRegisterText('Email Address')}
            </label>
            <SmartEmailInput
              id="register-email"
              value={email}
              onChange={setEmail}
              placeholder="username"
              required
              disabled={isLoading}
            />
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-black text-black uppercase tracking-wider block select-none">
              {getRegisterText('Password')}
            </label>
            <div className="relative group">
              <span className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-black transition-colors select-none">
                <Lock className="w-4 h-4 stroke-[2.5]" />
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={getRegisterText('Min. 8 characters')}
                required
                className="w-full ps-10 pe-12 py-3 bg-[#FFFDF9] border-2 border-black rounded-xl text-sm font-bold text-black placeholder-neutral-400 shadow-[2.5px_2.5px_0px_0px_#000] outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 end-0 pe-3.5 flex items-center text-xs font-black text-black hover:opacity-70 cursor-pointer select-none"
              >
                {showPassword ? getRegisterText('Hide') : getRegisterText('Show')}
              </button>
            </div>

            {/* Password Strength Meter */}
            {password && (
              <div className="pt-1 select-none animate-scale-in">
                <div className="h-1.5 bg-neutral-200 border border-black rounded-full overflow-hidden mb-1.5">
                  <div className={`h-full rounded-full transition-all duration-300 ${strengthCfg.barColor} ${strengthCfg.width}`} />
                </div>
                <div className="flex items-center gap-1.5">
                  {passwordStrength === 'weak' || passwordStrength === 'fair' ? (
                    <AlertCircle className={`w-3.5 h-3.5 ${strengthCfg.color}`} />
                  ) : passwordStrength === 'strong' ? (
                    <CheckCircle2 className={`w-3.5 h-3.5 ${strengthCfg.color}`} />
                  ) : passwordStrength === 'very-strong' ? (
                    <ShieldCheck className={`w-3.5 h-3.5 ${strengthCfg.color}`} />
                  ) : null}
                  <span className={`text-[10px] font-black tracking-wide ${strengthCfg.color}`}>
                    {strengthCfg.label}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password Input */}
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-xs font-black text-black uppercase tracking-wider block select-none">
              {getRegisterText('Confirm Password')}
            </label>
            <div className="relative group">
              <span className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-black transition-colors select-none">
                <Shield className="w-4 h-4 stroke-[2.5]" />
              </span>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={getRegisterText('Repeat your password')}
                required
                className="w-full ps-10 pe-12 py-3 bg-[#FFFDF9] border-2 border-black rounded-xl text-sm font-bold text-black placeholder-neutral-400 shadow-[2.5px_2.5px_0px_0px_#000] outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 end-0 pe-3.5 flex items-center text-xs font-black text-black hover:opacity-70 cursor-pointer select-none"
              >
                {showConfirmPassword ? getRegisterText('Hide') : getRegisterText('Show')}
              </button>
            </div>
          </div>

          {/* Referral Code (Optional) */}
          <div className="space-y-1.5">
            <label htmlFor="refCode" className="text-xs font-black text-black uppercase tracking-wider block select-none">
              {getRegisterText('Referral Code (Optional)')}
            </label>
            <div className="relative group">
              <span className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-black transition-colors select-none">
                <Gift className="w-4 h-4 stroke-[2.5]" />
              </span>
              <input
                id="refCode"
                type="text"
                value={referralCode}
                onChange={(e) => {
                  if (referralLocked) return;
                  setReferralCode(e.target.value);
                }}
                onBlur={() => {
                  if (!referralLocked && referralCode.trim()) {
                    void validateReferralCode(referralCode);
                  }
                }}
                placeholder={getRegisterText('Enter code (e.g. ALEX884)')}
                readOnly={referralLocked}
                className="w-full ps-10 pe-12 py-2.5 bg-[#FFFDF9] border-2 border-black rounded-xl text-sm font-black text-black placeholder-neutral-400 shadow-[2.5px_2.5px_0px_0px_#000] outline-none transition-all read-only:bg-neutral-100 read-only:cursor-not-allowed"
              />
              <span className="absolute inset-y-0 end-0 pe-3.5 flex items-center text-black">
                {referralValidating ? (
                  <svg width="14" height="14" className="animate-spin text-black" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                    <path d="M22 12A10 10 0 0012 2" stroke="currentColor" strokeWidth="3" className="opacity-90" />
                  </svg>
                ) : referralLocked ? (
                  referralLockedFromLink ? (
                    <span className="flex items-center text-black" title={language === 'ar' ? 'كود الدعوة معتمد من الرابط' : 'Invite code locked from link'}>
                      <Lock className="w-4 h-4 stroke-[2.5] text-black" />
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setReferralLocked(false);
                        setReferralOwner('');
                        setReferralCode('');
                        clearPendingReferralCookie();
                      }}
                      className="text-black hover:text-rose-600 font-bold transition-colors cursor-pointer"
                      title={language === 'ar' ? 'تعديل أو حذف الكود' : 'Change or delete code'}
                    >
                      <Unlock className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  )
                ) : null}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className={referralLocked ? 'text-black font-black flex items-center gap-1.5' : 'text-neutral-600 font-bold'}>
                {referralLocked
                  ? (
                      referralLockedFromLink
                        ? (
                            language === 'ar'
                              ? `كود الدعوة معتمد ومقفل من الرابط (${referralOwner || referralCode})`
                              : `Verified invite code locked from link (${referralOwner || referralCode})`
                          )
                        : (
                            language === 'ar'
                              ? `تم قفل الكود على ${referralOwner}`
                              : `Code locked to ${referralOwner}`
                          )
                    )
                  : (
                      language === 'ar'
                        ? 'يمكنك إدخال كود دعوة (اختياري).'
                        : 'You can enter a referral code (optional).'
                    )}
              </span>
              {!referralLocked && referralCode.trim() && (
                <button
                  type="button"
                  onClick={() => void validateReferralCode(referralCode)}
                  className="text-black underline hover:opacity-80 font-black transition-colors cursor-pointer"
                >
                  {getRegisterText('Validate Code')}
                </button>
              )}
            </div>
          </div>

          {/* Terms agreement checkbox */}
          <div className="flex items-start gap-2.5 py-1 select-none">
            <input
              id="terms"
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-2 border-black text-[#06D6A0] focus:ring-0 outline-none cursor-pointer accent-[#06D6A0]"
            />
            <label htmlFor="terms" className="text-xs text-neutral-800 font-bold leading-snug">
              {getRegisterText('I agree to the ')}
              <Link href="/terms" className="text-black font-black underline hover:opacity-80">{getRegisterText('Terms of Service')}</Link>
              {getRegisterText(' and ')}
              <Link href="/privacy" className="text-black font-black underline hover:opacity-80">{getRegisterText('Privacy Policy')}</Link>.
            </label>
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
                {getRegisterText('Creating Account...')}
              </>
            ) : (
              getRegisterText('Register Account →')
            )}
          </button>

        </form>
      )}

      {/* Footer link */}
      <p className="mt-6 text-center text-xs sm:text-sm text-neutral-700 font-bold select-none">
        {getRegisterText('Already have an account? ')}{' '}
        <Link href="/auth/login" className="text-black font-black underline hover:opacity-80 transition-colors">
          {getRegisterText('Sign In →')}
        </Link>
      </p>
    </>
  );
}

// ─── Wrapper to Suspend useSearchParams ──────────────────────────────────────

export default function RegisterPage() {
  const { language, mounted } = useLocale();

  const getPanelText = (key: string) => {
    const dicts: Record<string, Record<string, string>> = {
      ar: {
        'Referral Code Program': 'برنامج كود الدعوة والربح',
        'Use a valid referral code to open your account, then invite friends with your own code and track counted purchases inside your dashboard.': 'استخدم كود دعوة صالح عند فتح حسابك، وادعُ أصدقاءك بكودك الخاص لتحصل على مكافآت فورية على كل طلب.',
        'Zero Delivery Wait Time': 'دفع عالمي وضمان كامل المدة',
        'Our order system registers purchases immediately and updates credentials as soon as they are fulfilled.': 'يقوم نظام المتجر الذكي بتوفير بوابات دفع عالمية ومحلية معتمدة مع ضمان شامل وتفعيل رسمي مستقر.'
      },
      en: {}
    };
    return (mounted && dicts[language] && dicts[language][key]) || key;
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] flex items-stretch text-black">
      
      {/* ── Left Column: Form Panel (480px width) ── */}
      <div className="w-full lg:w-[480px] bg-white border-e-2 border-black px-4 sm:px-12 flex flex-col justify-center relative z-10 shadow-[6px_0px_0px_0px_#000] shrink-0 py-8">
        
        {/* Logo */}
        <div className="mb-6">
          <BrandLogo size="lg" />
        </div>

        {/* Wrap in Suspense to resolve searchParams pre-rendering */}
        <Suspense fallback={
          <div className="flex items-center justify-center py-20 select-none">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-black" />
          </div>
        }>
          <RegisterFormInner />
        </Suspense>

      </div>

      {/* ── Right Column: Decorative Panel (Hidden on mobile) ── */}
      <div className="hidden lg:flex flex-1 bg-[#FFFDF9] relative items-center justify-center p-12 overflow-hidden">
        
        {/* Value card overlays */}
        <div className="relative z-10 space-y-4 max-w-sm select-none">
          <div className="bg-[#FFE600] border-2 border-black rounded-3xl p-6 shadow-[5px_5px_0px_0px_#000] text-black">
            <Gift className="w-8 h-8 text-black mb-3 stroke-[2.5]" />
            <h3 className="text-base font-black text-black mb-1.5">{getPanelText('Referral Code Program')}</h3>
            <p className="text-xs text-neutral-800 leading-relaxed font-bold">
              {getPanelText('Use a valid referral code to open your account, then invite friends with your own code and track counted purchases inside your dashboard.')}
            </p>
          </div>
          
          <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-[5px_5px_0px_0px_#000] text-black">
            <Zap className="w-8 h-8 text-[#06D6A0] mb-3 stroke-[2.5]" />
            <h3 className="text-base font-black text-black mb-1.5">{getPanelText('Zero Delivery Wait Time')}</h3>
            <p className="text-xs text-neutral-700 leading-relaxed font-bold">
              {getPanelText('Our order system registers purchases immediately and updates credentials as soon as they are fulfilled.')}
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
