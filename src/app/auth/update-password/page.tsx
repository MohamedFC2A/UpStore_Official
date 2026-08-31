'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useLocale } from '@/context/LocaleContext';
import { BrandLogo } from '@/components/ui/BrandLogo';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const { language, mounted } = useLocale();
  const isAr = mounted && language === 'ar';

  useEffect(() => {
    const checkSession = async () => {
      try {
        const supabase = createClient();
        await supabase.auth.getUser();
      } catch {
        // ignore
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) return;

    if (password.length < 6) {
      setError(isAr ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.' : 'Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError(isAr ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError('');
    
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });

    setIsLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2500);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] flex flex-col items-center justify-center p-4 text-black select-none">
      <div className="w-full max-w-md bg-white border-2 border-black rounded-3xl p-6 sm:p-8 shadow-[6px_6px_0px_0px_#000] relative overflow-hidden">
        
        {/* Logo */}
        <div className="mb-6">
          <BrandLogo size="sm" />
        </div>

        <div className="mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#06D6A0] border-2 border-black flex items-center justify-center mb-3 shadow-[2px_2px_0px_0px_#000]">
            <ShieldCheck className="w-6 h-6 stroke-[2.5] text-black" />
          </div>
          <h1 className="text-2xl font-black text-black mb-1">
            {isAr ? 'تعيين كلمة مرور جديدة' : 'Set New Password'}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 font-bold leading-relaxed">
            {isAr 
              ? 'يرجى كتابة وتأكيد كلمة المرور الجديدة لحسابك.'
              : "Please enter and confirm your new account password."}
          </p>
        </div>

        {error && (
          <div role="alert" className="p-3.5 bg-rose-100 border-2 border-black shadow-[2px_2px_0px_0px_#000] rounded-xl flex items-center gap-2.5 mb-5 animate-scale-in">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 stroke-[2.5]" />
            <span className="text-xs text-black font-black">{error}</span>
          </div>
        )}

        {isSuccess ? (
          <div className="text-center p-6 bg-emerald-50 border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_#000] space-y-3">
            <div className="w-12 h-12 bg-[#06D6A0] border-2 border-black rounded-2xl flex items-center justify-center mx-auto shadow-[2px_2px_0px_0px_#000]">
              <CheckCircle2 className="w-6 h-6 text-black stroke-[2.5]" />
            </div>
            <h3 className="text-base font-black text-black">
              {isAr ? 'تم تحديث كلمة المرور بنجاح!' : 'Password Updated!'}
            </h3>
            <p className="text-xs text-neutral-700 font-bold">
              {isAr 
                ? 'جاري توجيهك إلى لوحة التحكم الخاصة بك...'
                : 'Redirecting you to your dashboard...'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="new-pass" className="text-xs font-black text-black uppercase tracking-wider block">
                {isAr ? 'كلمة المرور الجديدة' : 'New Password'}
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-black transition-colors">
                  <Lock className="w-4 h-4 stroke-[2.5]" />
                </span>
                <input
                  id="new-pass"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full ps-10 pe-12 py-3 bg-[#FFFDF9] border-2 border-black rounded-xl text-sm font-bold text-black placeholder-neutral-400 shadow-[2.5px_2.5px_0px_0px_#000] outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 end-0 pe-3.5 flex items-center text-xs font-black text-black hover:opacity-70 cursor-pointer"
                >
                  {showPassword ? (isAr ? 'إخفاء' : 'Hide') : (isAr ? 'إظهار' : 'Show')}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm-new-pass" className="text-xs font-black text-black uppercase tracking-wider block">
                {isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'}
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-black transition-colors">
                  <Lock className="w-4 h-4 stroke-[2.5]" />
                </span>
                <input
                  id="confirm-new-pass"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full ps-10 pe-12 py-3 bg-[#FFFDF9] border-2 border-black rounded-xl text-sm font-bold text-black placeholder-neutral-400 shadow-[2.5px_2.5px_0px_0px_#000] outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !password || !confirmPassword}
              className="w-full py-3.5 bg-[#06D6A0] hover:bg-[#05b385] text-black font-black text-sm rounded-xl border-2 border-black shadow-[3.5px_3.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 select-none cursor-pointer"
            >
              {isLoading ? (
                <>
                  <svg width="16" height="16" className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {isAr ? 'جاري الحفظ...' : 'Saving...'}
                </>
              ) : (
                isAr ? 'حفظ كلمة المرور الجديدة ←' : 'Save New Password →'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
