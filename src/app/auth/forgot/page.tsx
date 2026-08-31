'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useLocale } from '@/context/LocaleContext';
import { normalizeEmail } from '@/utils/auth';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { SmartEmailInput } from '@/components/auth/SmartEmailInput';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const { language, mounted } = useLocale();
  const isAr = mounted && language === 'ar';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) {
      setError(isAr ? 'يرجى إدخال البريد الإلكتروني.' : 'Please enter your email.');
      return;
    }

    setIsLoading(true);
    setError('');
    
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });

    setIsLoading(false);

    if (resetError) {
      setError(resetError.message);
    } else {
      setIsSuccess(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] flex flex-col items-center justify-center p-4 text-black select-none">
      <div className="w-full max-w-md bg-white border-2 border-black rounded-3xl p-6 sm:p-8 shadow-[6px_6px_0px_0px_#000] relative overflow-hidden">
        
        {/* Top Header */}
        <div className="flex items-center justify-between mb-6">
          <BrandLogo size="sm" />
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1.5 text-xs font-black text-black underline hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            {isAr ? 'العودة لتسجيل الدخول' : 'Back to login'}
          </Link>
        </div>

        <div className="mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#FFE600] border-2 border-black flex items-center justify-center mb-3 shadow-[2px_2px_0px_0px_#000]">
            <KeyRound className="w-6 h-6 stroke-[2.5] text-black" />
          </div>
          <h1 className="text-2xl font-black text-black mb-1">
            {isAr ? 'استعادة كلمة المرور' : 'Forgot Password?'}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 font-bold leading-relaxed">
            {isAr 
              ? 'أدخل بريدك الإلكتروني وسنرسل لك رابطاً آمناً لتعيين كلمة مرور جديدة لحسابك.'
              : "Enter your email address and we'll send you a secure link to reset your password."}
          </p>
        </div>

        {error && (
          <div role="alert" className="p-3.5 bg-rose-100 border-2 border-black shadow-[2px_2px_0px_0px_#000] rounded-xl flex items-center gap-2.5 mb-5 animate-scale-in">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 stroke-[2.5]" />
            <span className="text-xs text-black font-black">{error}</span>
          </div>
        )}

        {isSuccess ? (
          <div className="text-center p-6 bg-emerald-50 border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_#000] space-y-4">
            <div className="w-12 h-12 bg-[#06D6A0] border-2 border-black rounded-2xl flex items-center justify-center mx-auto shadow-[2px_2px_0px_0px_#000]">
              <CheckCircle2 className="w-6 h-6 text-black stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black text-black mb-1">
                {isAr ? 'تم إرسال الرابط بنجاح!' : 'Check your email'}
              </h3>
              <p className="text-xs text-neutral-700 font-bold">
                {isAr 
                  ? 'يرجى مراجعة صندوق الوارد (أو مجلد الرسائل غير المرغوب فيها) والضغط على الرابط لإعادة تعيين كلمة المرور.'
                  : 'We have sent a password reset link to your email address.'}
              </p>
            </div>
            <Link
              href="/auth/login"
              className="inline-block w-full py-3 bg-black hover:bg-neutral-800 text-white font-black text-xs rounded-xl transition-all cursor-pointer"
            >
              {isAr ? 'العودة لتسجيل الدخول' : 'Return to Sign In'}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="forgot-email" className="text-xs font-black text-black uppercase tracking-wider block">
                {isAr ? 'البريد الإلكتروني' : 'Email Address'}
              </label>
              <SmartEmailInput
                id="forgot-email"
                value={email}
                onChange={setEmail}
                placeholder="username"
                required
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full py-3.5 bg-[#06D6A0] hover:bg-[#05b385] text-black font-black text-sm rounded-xl border-2 border-black shadow-[3.5px_3.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 select-none cursor-pointer"
            >
              {isLoading ? (
                <>
                  <svg width="16" height="16" className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {isAr ? 'جاري الإرسال...' : 'Sending Link...'}
                </>
              ) : (
                isAr ? 'إرسال رابط إعادة التعيين ←' : 'Send Reset Link →'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
