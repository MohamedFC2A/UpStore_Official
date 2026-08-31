'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Lock,
  Copy,
  Check,
  Send,
  ShieldCheck,
  ArrowRight,
  LayoutDashboard,
  KeyRound,
  Headphones,
  Search,
  UserCheck,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { generateSupportCode } from '@/utils/supportCode';
import { useLocale } from '@/context/LocaleContext';

export default function PinPage() {
  const { language } = useLocale();
  const isAr = language === 'ar';

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [supportCode, setSupportCode] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Admin Inspector State
  const [adminQuery, setAdminQuery] = useState('');
  const [adminSearching, setAdminSearching] = useState(false);
  const [adminResult, setAdminResult] = useState<any>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  const supabase = createClient();
  const telegramBotUrl = 'https://t.me/UpStore_Support_bot';
  const humanSupportUrl = 'https://t.me/UPSTORE_HELP';

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
          setLoading(false);
          return;
        }

        setUser(currentUser);

        const { data: userProfile } = await supabase
          .from('profiles')
          .select('id, email, display_name, role, wallet_balance, country, device_fingerprint, created_at')
          .eq('id', currentUser.id)
          .maybeSingle();

        setProfile(userProfile);

        const code = generateSupportCode(currentUser.id, {
          deviceFingerprint: userProfile?.device_fingerprint,
        });

        setSupportCode(code);
        setLoading(false);

        // Auto-copy to clipboard
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
          } catch {
            // fallback
          }
        }
      } catch (err) {
        console.error('Error in PinPage init:', err);
        setLoading(false);
      }
    };

    init();
  }, []);

  const handleManualCopy = () => {
    if (!supportCode) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(supportCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleAdminLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminQuery.trim()) return;

    setAdminSearching(true);
    setAdminError(null);
    setAdminResult(null);

    try {
      const res = await fetch('/api/admin/support-code/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: adminQuery.trim() }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setAdminError(data.error || 'فشل في جلب البيانات');
      } else if (!data.found) {
        setAdminError(isAr ? 'لم يتم العثور على أي حساب أو طلب بهذا الكود / البريد.' : 'No user or order found for this query.');
      } else {
        setAdminResult(data);
      }
    } catch (err: any) {
      setAdminError(err.message || 'حدث خطأ في الاتصال');
    } finally {
      setAdminSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 border-4 border-black border-t-[#FFE600] rounded-full animate-spin"></div>
          <p className="text-sm font-black text-black">
            {isAr ? 'جاري استخراج وتهيئة كود الدعم السري المشفر...' : 'Generating & preparing your secure Support PIN...'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center p-4 select-none">
        <div className="max-w-md w-full rounded-3xl border-2 border-black bg-white p-6 sm:p-8 shadow-[6px_6px_0px_0px_#000] text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-[#FFE600] border-2 border-black flex items-center justify-center mx-auto text-black shadow-[3px_3px_0px_0px_#000]">
            <KeyRound className="w-8 h-8 stroke-[2.5]" />
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-black">
            {isAr ? 'كود الدعم الفني السري' : 'Secret Support PIN'}
          </h1>

          <p className="text-xs sm:text-sm text-neutral-700 font-bold leading-relaxed">
            {isAr
              ? 'يرجى تسجيل الدخول إلى حسابك في المتجر لعرض ونسخ كود الدعم السري الخاص بك، وتوثيق هويتك مع بوت الدعم الفني في تيليجرام.'
              : 'Please log in to your UpStore account to copy your secret support PIN and authenticate with Telegram support.'}
          </p>

          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              href="/auth/login?next=/pin"
              className="w-full py-3.5 bg-[#06D6A0] hover:bg-[#05b385] text-black font-black text-sm rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isAr ? 'تسجيل الدخول الآن' : 'Log In Now'}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </Link>

            <Link
              href="/"
              className="w-full py-3 bg-white hover:bg-neutral-100 text-black font-black text-xs rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center"
            >
              {isAr ? 'العودة للصفحة الرئيسية' : 'Return to Home'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="min-h-screen bg-[#FFFDF9] py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Main Customer PIN Card */}
        <div className="w-full rounded-3xl border-2 border-black bg-white p-6 sm:p-8 shadow-[8px_8px_0px_0px_#000] space-y-6 text-start">
          
          {/* Header Badges */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#06D6A0] border-2 border-black text-black text-xs font-black uppercase tracking-wider shadow-[1.5px_1.5px_0px_0px_#000]">
              <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
              <span>{isAr ? 'تم التحقق وتوليد الكود' : 'VERIFIED & GENERATED'}</span>
            </span>

            <div className="flex items-center gap-2">
              {isAdmin && (
                <span className="text-[11px] font-black bg-[#FFE600] text-black border-2 border-black px-2.5 py-0.5 rounded-lg shadow-[1px_1px_0px_0px_#000]">
                  {isAr ? 'حساب إدارة' : 'ADMIN'}
                </span>
              )}
              <span className="text-xs font-mono font-black text-black bg-neutral-100 border border-black/40 px-2.5 py-0.5 rounded-lg">
                {user.email?.split('@')[0]}
              </span>
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-black leading-tight mb-1.5 flex items-center gap-2">
              <span>{isAr ? 'كود الدعم الفني السري' : 'Your Secret Support PIN'}</span>
              <Lock className="w-6 h-6 text-black stroke-[2.5]" />
            </h1>
            <p className="text-xs sm:text-sm text-neutral-800 font-bold leading-relaxed">
              {isAr
                ? 'استخدم هذا الكود عند التحدث مع بوت الدعم الفني في تيليجرام (@UpStore_Support_bot) ليتمكن من جلب بيانات طلباتك والتأكد من هويتك فوراً.'
                : 'Use this code with the Telegram Support Bot (@UpStore_Support_bot) to instantly verify your identity and view order details.'}
            </p>
          </div>

          {/* Code Showcase Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF0] border-2 border-black shadow-[4px_4px_0px_0px_#000] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-[#FFE600] border-2 border-black flex items-center justify-center text-black shrink-0 shadow-[2px_2px_0px_0px_#000]">
                <Lock className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-neutral-700 font-bold block uppercase tracking-wider">
                  {isAr ? 'كود الدعم المخصص لجهازك وحسابك:' : 'Your Dedicated Support Code:'}
                </span>
                <span className="text-sm sm:text-lg font-mono font-black text-black tracking-wider select-all block truncate">
                  {supportCode}
                </span>
              </div>
            </div>

            <button
              onClick={handleManualCopy}
              className="px-4 py-2.5 bg-white hover:bg-neutral-100 text-black font-black text-xs rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              {copied ? <Check className="w-4 h-4 stroke-[3] text-emerald-600" /> : <Copy className="w-4 h-4 stroke-[2.5]" />}
              <span>{copied ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الكود' : 'Copy Code')}</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            <a
              href={telegramBotUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 bg-[#06D6A0] hover:bg-[#05b385] text-black font-black text-sm rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4 stroke-[2.5]" />
              <span>{isAr ? 'فتح بوت الدعم الفني الذكي (@UpStore_Support_bot)' : 'Open Support Bot (@UpStore_Support_bot)'}</span>
            </a>

            <a
              href={humanSupportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-[#FFE600] hover:bg-[#ffd700] text-black font-black text-xs rounded-xl border-2 border-black shadow-[2.5px_2.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Headphones className="w-4 h-4 stroke-[2.5]" />
              <span>{isAr ? 'التحدث مع الدعم الفني البشري في الأعطال (@UPSTORE_HELP)' : 'Human Technical Escalation (@UPSTORE_HELP)'}</span>
            </a>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                href="/dashboard?tab=orders"
                className="py-3 bg-white hover:bg-neutral-100 text-black font-black text-xs rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>{isAr ? 'لوحة التحكم والطلبات' : 'Dashboard'}</span>
              </Link>

              <Link
                href="/"
                className="py-3 bg-white hover:bg-neutral-100 text-black font-black text-xs rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5"
              >
                <span>{isAr ? 'تصفح المتجر' : 'Browse Store'}</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </Link>
            </div>
          </div>

          {/* Educational Security & Privacy Guide */}
          <div className="p-4 bg-[#F8F9FA] border-2 border-black rounded-2xl space-y-3">
            <h4 className="text-xs font-black text-black flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-black stroke-[2.5]" />
              <span>{isAr ? 'كيف يعمل كود الدعم الفني؟' : 'How does Support Code work?'}</span>
            </h4>
            <div className="space-y-2 text-xs text-neutral-700 font-bold leading-relaxed">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-md bg-[#FFE600] border border-black flex items-center justify-center font-black text-[10px] text-black shrink-0 mt-0.5">
                  1
                </div>
                <p>
                  {isAr
                    ? 'كود الدعم هو معرّف مشفر يربط محادثتك بالبوت مع حسابك بالمتجر بشكل آمن دون كشف كلمة مرورك.'
                    : 'The Support Code securely links your Telegram chat to your UpStore account without exposing passwords.'}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-md bg-[#06D6A0] border border-black flex items-center justify-center font-black text-[10px] text-black shrink-0 mt-0.5">
                  2
                </div>
                <p>
                  {isAr
                    ? 'عند إرسال الكود للبوت، يتم التعرف فوراً على طلباتك ومفاتيحك لتسريع الاستبدال والدعم الفني 100%.'
                    : 'Sending your code enables the bot to review your order status and issue instant warranty replacements.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── ADMIN SUPPORT CODE INSPECTOR (EXCLUSIVE FOR ADMINS) ─── */}
        {isAdmin && (
          <div className="w-full rounded-3xl border-2 border-black bg-white p-6 sm:p-8 shadow-[8px_8px_0px_0px_#000] space-y-5 text-start animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between pb-3 border-b-2 border-black/10">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#FFE600] border-2 border-black flex items-center justify-center text-black shrink-0 shadow-[1.5px_1.5px_0px_0px_#000]">
                  <Search className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-black leading-tight">
                    {isAr ? 'أداة فحص كود الدعم (خاص بالإدارة)' : 'Admin Support Code Inspector'}
                  </h3>
                  <p className="text-[11px] text-neutral-600 font-bold">
                    {isAr ? 'البحث عن أي عميل ومراجعة بياناته وطلباته مباشرة عبر كود الدعم أو البريد' : 'Lookup any customer profile and live orders via PIN, Email, or Order ID'}
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-black text-[#FFE600] rounded-lg text-[10px] font-black uppercase tracking-wider">
                Admin Tool
              </span>
            </div>

            {/* Search Input Form */}
            <form onSubmit={handleAdminLookup} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={adminQuery}
                onChange={(e) => setAdminQuery(e.target.value)}
                placeholder={isAr ? 'أدخل كود الدعم (مثال: UP-SEC-...) أو البريد أو رقم الطلب...' : 'Enter Support Code, Email, or Order ID...'}
                className="flex-1 px-3.5 py-2.5 bg-[#FFFDF9] border-2 border-black rounded-xl text-xs font-black text-black outline-none focus:bg-white shadow-[2px_2px_0px_0px_#000]"
              />
              <button
                type="submit"
                disabled={adminSearching || !adminQuery.trim()}
                className="px-5 py-2.5 bg-[#FFE600] hover:bg-[#ffd700] disabled:opacity-60 text-black border-2 border-black rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer shrink-0"
              >
                {adminSearching ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{isAr ? 'فحص البيانات' : 'Inspect'}</span>
                  </>
                )}
              </button>
            </form>

            {/* Error Message */}
            {adminError && (
              <div className="p-3 bg-red-50 border-2 border-black rounded-xl flex items-center gap-2 text-xs font-bold text-red-950 shadow-[2px_2px_0px_0px_#000]">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{adminError}</span>
              </div>
            )}

            {/* Live Result Display */}
            {adminResult && (
              <div className="space-y-4 pt-2">
                {/* Profile Card */}
                {adminResult.profile && (
                  <div className="p-4 bg-[#F0FDF4] border-2 border-black rounded-2xl space-y-3 shadow-[3px_3px_0px_0px_#000]">
                    <div className="flex items-center justify-between pb-2 border-b border-black/10">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-emerald-700 stroke-[2.5]" />
                        <span className="text-xs font-black text-black">
                          {adminResult.profile.display_name || 'UpStore Member'}
                        </span>
                        <span className="text-[10px] text-neutral-600 font-bold">
                          ({adminResult.profile.email})
                        </span>
                      </div>
                      <span className="px-2 py-0.5 bg-[#06D6A0] text-black border border-black rounded text-[10px] font-black">
                        ${Number(adminResult.profile.wallet_balance || 0).toFixed(2)} USD
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-bold text-neutral-800">
                      <div>
                        <span className="text-neutral-500 block text-[9px]">{isAr ? 'كود الدعم:' : 'Support Code:'}</span>
                        <span className="font-mono font-black select-all">{adminResult.profile.support_code}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[9px]">{isAr ? 'الدولة:' : 'Country:'}</span>
                        <span>{adminResult.profile.country || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[9px]">{isAr ? 'تاريخ التسجيل:' : 'Registered:'}</span>
                        <span>{new Date(adminResult.profile.created_at).toLocaleDateString('ar-EG')}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Orders List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-black flex items-center justify-between">
                    <span>{isAr ? 'طلبات العميل (' : 'User Orders ('}{adminResult.orders?.length || 0}{')'}</span>
                    <span className="text-[10px] text-neutral-500 font-bold">{isAr ? 'أحدث 15 طلب' : 'Latest 15'}</span>
                  </h4>

                  {adminResult.orders?.length > 0 ? (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {adminResult.orders.map((ord: any) => {
                        const prodName = ord.products?.name_ar || ord.products?.name || 'منتج رقمي';
                        const isDelivered = ord.status === 'completed' || ord.status === 'fulfilled' || !!ord.delivery_payload;
                        return (
                          <div
                            key={ord.id}
                            className="p-3 bg-white border-2 border-black rounded-xl text-xs space-y-1 shadow-[2px_2px_0px_0px_#000]"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-black text-black">
                                #{ord.id.slice(0, 8).toUpperCase()} • {prodName}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black border border-black ${
                                  isDelivered ? 'bg-[#DCFCE7] text-emerald-950' : 'bg-[#FFFBEB] text-amber-950'
                                }`}
                              >
                                {isDelivered ? (isAr ? 'مسلّم ومكتمل' : 'Delivered') : (isAr ? 'قيد المعالجة' : 'Pending')}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-neutral-600 font-bold">
                              <span>${ord.amount} USD • {new Date(ord.created_at).toLocaleDateString('ar-EG')}</span>
                              {ord.delivery_payload && (
                                <span className="font-mono text-emerald-700 font-black">
                                  {isAr ? 'بيانات التسليم متوفرة ✓' : 'Payload Available ✓'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-600 font-bold italic">
                      {isAr ? 'لا توجد طلبات مسجلة لهذا الحساب حتى الآن.' : 'No orders found for this account.'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
