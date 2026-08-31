'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Gift, 
  Copy, 
  Check, 
  UserPlus, 
  Share2, 
  QrCode, 
  Coins, 
  Lock, 
  CheckCircle2, 
  ArrowRight, 
  TrendingUp, 
  ChevronDown, 
  Users, 
  ShoppingBag, 
  ShieldAlert, 
  Loader2 
} from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { createClient } from '@/utils/supabase/client';
import { useToastStore } from '@/store/useToastStore';
import { QRCodeModal } from '@/components/referral/QRCodeModal';

// ─── Progressive Smart Reward Milestone Vaults (3 Friends = Direct Cash Reward) ───
const SMART_VAULT_MILESTONES = [
  { count: 3, reward: 1, name_ar: 'الخزينة البرونزية', name_en: 'Bronze Vault', tag_ar: 'البداية', tag_en: 'STARTER' },
  { count: 6, reward: 2, name_ar: 'الخزينة الفضية', name_en: 'Silver Vault', tag_ar: 'فضي', tag_en: 'SILVER' },
  { count: 9, reward: 3, name_ar: 'الخزينة الذهبية', name_en: 'Gold Vault', tag_ar: 'ذهبي', tag_en: 'GOLD' },
  { count: 15, reward: 5, name_ar: 'الخزينة البلاتينية', name_en: 'Platinum Vault', tag_ar: 'بلاتيني', tag_en: 'PLATINUM' },
  { count: 30, reward: 10, name_ar: 'خزينة الماس VIP', name_en: 'Diamond VIP Vault', tag_ar: 'ماسي', tag_en: 'DIAMOND' },
  { count: 60, reward: 20, name_ar: 'خزينة النخبة الملكية', name_en: 'Royal Elite Vault', tag_ar: 'نخبة ملكية', tag_en: 'ROYAL' },
  { count: 150, reward: 50, name_ar: 'خزينة الأساطير VIP', name_en: 'Legends Master Vault', tag_ar: 'أسطوري', tag_en: 'LEGEND' },
  { count: 300, reward: 100, name_ar: 'خزينة الإمبراطورية الكبرى', name_en: 'Grand Empire Vault', tag_ar: 'إمبراطور', tag_en: 'EMPIRE' },
];

export default function ReferralClient() {
  const { language, mounted } = useLocale();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [appliedFriendCode, setAppliedFriendCode] = useState<string | null>(null);
  const [isReferralLocked, setIsReferralLocked] = useState(false);
  const [inputFriendCode, setInputFriendCode] = useState('');
  const [claimingCode, setClaimingCode] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [validReferralsCount, setValidReferralsCount] = useState<number>(0);
  const [totalEarnedCash, setTotalEarnedCash] = useState<number>(0);
  const [invitedUsers, setInvitedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const isAr = mounted && language === 'ar';
  const supabase = createClient();

  const loadReferralData = async (userId?: string) => {
    if (!userId) return;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code, referral_applied_code, referred_by, referral_locked_at')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        setReferralCode(profile.referral_code || null);
        setAppliedFriendCode(profile.referral_applied_code || null);
        setIsReferralLocked(Boolean(profile.referral_applied_code || profile.referred_by || profile.referral_locked_at));
      }

      const res = await fetch('/api/referral/status');
      if (res.ok) {
        const data = await res.json();
        setValidReferralsCount(data.validReferralsCount || 0);
        setTotalEarnedCash(data.totalEarnedCash || Math.floor((data.validReferralsCount || 0) / 3) * 1.00);
        setInvitedUsers(data.invitedUsers || []);
        if (data.profile?.referral_applied_code) {
          setAppliedFriendCode(data.profile.referral_applied_code);
          setIsReferralLocked(true);
        }
      }
    } catch (e) {
      console.error('[ReferralClient] Error loading status:', e);
    }
  };

  useEffect(() => {
    const fetchUserAndStatus = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        window.location.href = '/auth/login?next=/referral';
        return;
      }
      setUser(currentUser);
      await loadReferralData(currentUser.id);
      setLoading(false);
    };

    fetchUserAndStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) {
        await loadReferralData(sessionUser.id);
      } else {
        setReferralCode(null);
        setAppliedFriendCode(null);
        setIsReferralLocked(false);
        setValidReferralsCount(0);
        setTotalEarnedCash(0);
        setInvitedUsers([]);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const getReferralLink = () => {
    if (typeof window === 'undefined') return 'https://upstore.one/ref/YOUR_CODE';
    const origin = window.location.origin;
    if (referralCode) {
      return `${origin}/ref/${referralCode}`;
    }
    return `${origin}/ref/YOUR_CODE`;
  };

  const handleCopyLink = () => {
    if (!user) {
      window.location.href = '/auth/register';
      return;
    }
    const link = getReferralLink();
    navigator.clipboard.writeText(link).catch(() => {});
    setCopiedLink(true);
    useToastStore.getState().success(
      isAr ? 'تم نسخ رابط الإحالة بنجاح!' : 'Referral link copied!',
      isAr ? 'جاهز للمشاركة الفورية' : 'Ready to share'
    );
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    if (!user || !referralCode) {
      window.location.href = '/auth/register';
      return;
    }
    navigator.clipboard.writeText(referralCode).catch(() => {});
    setCopiedCode(true);
    useToastStore.getState().success(
      isAr ? `تم نسخ كود الدعوة: ${referralCode}` : `Referral code ${referralCode} copied!`,
      isAr ? 'كود الدعوة' : 'Invite Code'
    );
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleNativeShare = async () => {
    if (!user) {
      window.location.href = '/auth/register';
      return;
    }
    const link = getReferralLink();
    const shareData = {
      title: isAr ? 'انضم إلى متجر UpStore الرقمي' : 'Join UpStore Digital Marketplace',
      text: isAr 
        ? `سجل في UpStore عبر كود الدعوة الخاص بي (${referralCode || ''}) واستمتع بأرخص الاشتراكات والمنتجات الرقمية مع مكافآت فورية!`
        : `Join UpStore using my referral link and explore genuine digital subscriptions & keys at world's lowest prices!`,
      url: link,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // Fallback to copy
      }
    } else {
      handleCopyLink();
    }
  };

  const handleClaimFriendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputFriendCode.trim().toUpperCase();
    if (!clean || isReferralLocked || claimingCode) return;

    if (referralCode && clean === referralCode.toUpperCase()) {
      setClaimError(isAr ? 'لا يمكنك استخدام كود الدعوة الخاص بك.' : 'You cannot use your own referral code.');
      return;
    }

    setClaimingCode(true);
    setClaimError('');

    try {
      const res = await fetch('/api/referral/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: clean }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || (isAr ? 'تعذر ربط كود الدعوة.' : 'Failed to claim referral code.'));
      }

      setAppliedFriendCode(clean);
      setIsReferralLocked(true);
      setInputFriendCode('');

      useToastStore.getState().success(
        isAr ? 'تم ربط واعتماد كود الدعوة بنجاح!' : 'Referral code claimed successfully!',
        isAr ? 'تمت إضافة المكافأة لصديقك' : 'Referrer reward credited'
      );

      if (user?.id) {
        await loadReferralData(user.id);
      }
    } catch (err: any) {
      setClaimError(err.message || (isAr ? 'حدث خطأ أثناء ربط الكود' : 'Error linking code'));
    } finally {
      setClaimingCode(false);
    }
  };

  const shareLink = getReferralLink();

  const shareTextWhatsApp = encodeURIComponent(
    isAr 
      ? `سجل في متجر UpStore الرقمي عبر رابطي واستمتع بأرخص الأسعار والتسليم السريع: ${shareLink}`
      : `Check out UpStore for the lowest prices on digital subscriptions & games! Use my invite link: ${shareLink}`
  );

  const shareTextTelegram = encodeURIComponent(
    isAr 
      ? `UpStore — المتجر الرقمي الأرخص في العالم مع دفع عالمي معتمد وضمان كامل المدة: ${shareLink}`
      : `UpStore — World's Lowest-Priced Digital Marketplace with Global Secure Checkout: ${shareLink}`
  );

  const shareTextX = encodeURIComponent(
    isAr 
      ? `تسوق أرخص الاشتراكات الرقمية عبر @UpStore: ${shareLink}`
      : `Shop genuine digital subscriptions and games on @UpStore: ${shareLink}`
  );

  // 3-friend smart progress calculation
  const currentBatchFriends = validReferralsCount % 3;
  const invitesNeededForNextDollar = currentBatchFriends === 0 ? 3 : (3 - currentBatchFriends);
  const nextMilestone = SMART_VAULT_MILESTONES.find((m) => m.count > validReferralsCount) || SMART_VAULT_MILESTONES[SMART_VAULT_MILESTONES.length - 1];

  const REFERRAL_FAQS = isAr ? [
    {
      q: 'كيف يعمل برنامج مكافآت الإحالة الذكي في UpStore؟',
      a: 'شارك رابط إحالتك الفريد مع أصدقائك أو مجموعاتك. بمجرد قيام أي 3 أصدقاء بإنشاء حساب وتسجيلهم الذكي عبر رابطك، يتم إيداع رصيد نقدي كاش تلقائياً وفوراً في محفظتك بالموقع بدون أي شروط شراء!'
    },
    {
      q: 'كيف يتم احتساب المكافآت للأعداد الأكبر من الدعوات؟',
      a: 'يمشي النظام بنمط تصاعدي مستمر: كل 3 أصدقاء مسجلين = مكافأة نقدية فورية مودعة بالمحفظة (3 أصدقاء = $1، 6 أصدقاء = $2، 9 أصدقاء = $3، 15 صديق = $5، 30 صديق = $10، 60 صديق = $20، 150 صديق = $50، 300 صديق = $100).'
    },
    {
      q: 'ماذا لو سجلت في الموقع بدون رابط دعوة وأريد إدخال كود صديقي؟',
      a: 'بكل سهولة! يمكنك إدخال كود دعوة صديقك في خانة "ربط كود دعوة صديقك" بالأسفل وتأكيده، وسيتم احتسابك ضمن دعواته فوراً وبأمان كامل وفق معايير الحماية.'
    },
    {
      q: 'متى وكيف أستلم الأرباح النقدية؟',
      a: 'يتم إيداع الرصيد فوراً وبشكل أوتوماتيكي نظيف في رصيد محفظتك (Wallet Balance) مع إشعار فوري بحسابك، ويمكنك استخدام رصيد المحفظة لشراء أي اشتراك أو منتج رقمي في المتجر فوراً.'
    },
    {
      q: 'ما هي معايير الحماية والتسجيل الذكي ضد التحايل؟',
      a: 'يحتوي النظام على خوارزميات أمان عتادية متطورة تمنع الحسابات الوهمية وتمنع استخدام VPN أو تكرار التسجيل من نفس الجهاز خلال 365 يوماً، لضمان حماية النظام واحتساب المستخدمين الحقيقيين فقط.'
    }
  ] : [
    {
      q: 'How does the Smart Referral Rewards Program work?',
      a: 'Share your exclusive referral link. For every 3 friends who sign up through your link, cash rewards are automatically credited to your site wallet balance immediately — no purchase required!'
    },
    {
      q: 'How are rewards calculated for higher invite counts?',
      a: 'The system follows an automated progression: Every 3 qualified invites unlocks an instant cash milestone (3 invites = $1, 6 invites = $2, 9 invites = $3, 15 invites = $5, 30 invites = $10, 60 invites = $20, 150 invites = $50, 300 invites = $100).'
    },
    {
      q: 'What if I registered directly and want to link my friend\'s code?',
      a: 'You can easily link your friend\'s invite code in the "Claim Friend Referral Code" section below anytime post-registration.'
    },
    {
      q: 'When and how do I receive the money?',
      a: 'Cash rewards are deposited automatically and cleanly into your UpStore wallet balance with an instant notification, ready for immediate use on any digital subscriptions and keys.'
    },
    {
      q: 'What anti-fraud rules are enforced?',
      a: 'The platform employs enterprise anti-fraud and hardware fingerprint filters, blocking VPN abuse and restricting referral claims to 1 per device per 365 days.'
    }
  ];

  return (
    <main className="min-h-screen bg-[#FFFDF9] text-black pb-20 pt-6 sm:pt-10 select-none">
      
      {/* ── Breadcrumbs & Back to Store ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-6">
        <div className="flex items-center justify-between bg-white border-2 border-black rounded-2xl p-3.5 shadow-[3px_3px_0px_0px_#000]">
          <div className="flex items-center gap-2 text-xs font-black text-black">
            <Link href="/" className="hover:underline flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
              <span>{isAr ? 'المتجر الرئيسي' : 'Store Home'}</span>
            </Link>
            <span className="text-neutral-400 font-black">/</span>
            <span className="text-black font-black">{isAr ? 'برنامج المكافآت والأرباح النقدية' : 'Rewards & Referral Program'}</span>
          </div>

          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFE600] hover:bg-[#ffea33] border-2 border-black text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            <span>{isAr ? 'تصفح منتجات المتجر' : 'Browse Catalog'}</span>
            <ArrowRight className={`w-3.5 h-3.5 stroke-[2.5] ${isAr ? 'rotate-180' : ''}`} />
          </Link>
        </div>
      </div>

      {/* ── Hero Banner ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-10">
        <div className="relative overflow-hidden rounded-3xl border-2 border-black bg-white p-6 sm:p-10 lg:p-12 shadow-[6px_6px_0px_0px_#000]">
          <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center">
            
            {/* Top Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#FFE600] border-2 border-black text-black text-xs font-black mb-5 shadow-[2px_2px_0px_0px_#000] select-none">
              <Gift className="w-4 h-4 stroke-[2.5]" />
              <span>{isAr ? 'برنامج المكافآت والأرباح الذكية' : 'Official UpStore Referral Rewards'}</span>
            </div>

            {/* Headline */}
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-black leading-tight tracking-tight mb-4">
              {isAr ? (
                <>
                  اربح{' '}
                  <span className="bg-[#06D6A0] px-3 py-1 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] inline-block mx-1">
                    رصيد كاش حقيقي
                  </span>{' '}
                  في محفظتك مع كل{' '}
                  <span className="bg-[#FFE600] px-3 py-1 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] inline-block mx-1">
                    3 دعوات
                  </span>!
                </>
              ) : (
                <>
                  Earn{' '}
                  <span className="bg-[#06D6A0] px-3 py-1 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] inline-block mx-1">
                    Real Wallet Cash
                  </span>{' '}
                  for Every{' '}
                  <span className="bg-[#FFE600] px-3 py-1 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] inline-block mx-1">
                    3 Friends
                  </span>!
                </>
              )}
            </h1>

            {/* Description */}
            <p className="text-xs sm:text-sm text-neutral-800 max-w-xl leading-relaxed font-bold mb-8">
              {isAr 
                ? 'شارك رابطك الحصري مع أصدقائك. التسجيل فوري وبسيط وبدون أي إجبار على الشراء، ويودع الرصيد النقدي تلقائياً ونظيفاً في محفظتك لكل 3 تسجيلات حقيقية!'
                : 'Share your exclusive invite link. Verified signups automatically trigger clean cash deposits into your on-site wallet for every 3 friends!'}
            </p>

            {/* ── User Action & Link Hub ── */}
            <div className="w-full max-w-xl">
              {loading ? (
                <div className="p-8 rounded-2xl border-2 border-black bg-[#FFFDF9] shadow-[3px_3px_0px_0px_#000] flex items-center justify-center text-xs text-black font-black">
                  {isAr ? 'جاري تحميل بيانات الإحالة...' : 'Loading referral profile...'}
                </div>
              ) : user ? (
                <div className="flex flex-col gap-4">
                  {/* Share Link Row */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-2.5 rounded-2xl bg-[#FFFDF9] border-2 border-black shadow-[3px_3px_0px_0px_#000]">
                    <div className="flex-1 px-3.5 py-2 text-xs font-mono font-black text-black truncate select-all text-start" dir="ltr">
                      {shareLink}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 justify-end">
                      <button
                        onClick={handleCopyLink}
                        className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#06D6A0] hover:bg-[#05b385] text-black text-xs font-black border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {copiedLink ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4 stroke-[2.5]" />}
                        <span>{copiedLink ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الرابط' : 'Copy Link')}</span>
                      </button>

                      <button
                        onClick={() => setIsQRModalOpen(true)}
                        className="p-2.5 rounded-xl bg-white hover:bg-neutral-100 border-2 border-black text-black font-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                        title={isAr ? 'رمز QR' : 'QR Code'}
                      >
                        <QrCode className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>

                  {/* Secondary Code and Social Buttons */}
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={handleCopyCode}
                      className="px-3.5 py-2 rounded-xl bg-[#FFE600] hover:bg-[#ffea33] border-2 border-black text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="text-neutral-800 font-mono text-[11px]">{isAr ? 'كود الدعوة:' : 'Code:'}</span>
                      <span className="font-mono text-black font-black">{referralCode || 'UPSTORE'}</span>
                      {copiedCode ? <Check className="w-3.5 h-3.5 stroke-[3] text-black" /> : <Copy className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </button>

                    <a
                      href={`https://wa.me/?text=${shareTextWhatsApp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] border-2 border-black text-black text-xs font-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>WhatsApp</span>
                    </a>

                    <a
                      href={`https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${shareTextTelegram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-[#4CC9F0] hover:bg-[#3db6db] border-2 border-black text-black text-xs font-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Telegram</span>
                    </a>

                    <a
                      href={`https://twitter.com/intent/tweet?text=${shareTextX}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-neutral-100 border-2 border-black text-black text-xs font-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>X</span>
                    </a>

                    <button
                      onClick={handleNativeShare}
                      className="px-3.5 py-2 rounded-xl bg-[#FF70A6] hover:bg-[#ff5997] border-2 border-black text-black text-xs font-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{isAr ? 'مشاركة' : 'Share'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl border-2 border-black bg-[#FFFDF9] text-center flex flex-col items-center gap-4 shadow-[4px_4px_0px_0px_#000]">
                  <div className="w-12 h-12 rounded-2xl bg-[#FFE600] border-2 border-black flex items-center justify-center text-black shadow-[2px_2px_0px_0px_#000]">
                    <UserPlus className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-black mb-1">
                      {isAr ? 'سجل حسابك الآن لتفعيل رابط الإحالة الخاص بك' : 'Sign in to generate your exclusive referral link'}
                    </h3>
                    <p className="text-xs text-neutral-700 max-w-sm font-bold">
                      {isAr ? 'أنشئ حسابك خلال 15 ثانية فقط وابدأ في جني الأرباح الفورية بمجرد تسجيل أصدقائك.' : 'Takes only 15 seconds to start earning instant wallet rewards.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href="/auth/register"
                      className="px-5 py-2.5 rounded-xl bg-[#06D6A0] hover:bg-[#05b385] border-2 border-black text-black text-xs font-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                    >
                      {isAr ? 'إنشاء حساب جديد' : 'Create Free Account'}
                    </Link>
                    <Link
                      href="/auth/login"
                      className="px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-100 border-2 border-black text-black text-xs font-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                    >
                      {isAr ? 'تسجيل الدخول' : 'Sign In'}
                    </Link>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* ── Claim Friend Referral Code Section (If Logged In) ── */}
      {user && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-10">
          <div className="rounded-3xl border-2 border-black bg-white p-6 sm:p-8 shadow-[6px_6px_0px_0px_#000] text-start">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 mb-4 border-b-2 border-black">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FFE600] border-2 border-black flex items-center justify-center text-black shadow-[2px_2px_0px_0px_#000] shrink-0">
                  <Gift className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-black">
                    {isAr ? 'ربط كود دعوة صديقك' : 'Claim a Friend\'s Referral Code'}
                  </h3>
                  <p className="text-xs text-neutral-700 font-bold">
                    {isAr 
                      ? 'هل سجلت في الموقع مباشرة بدون رابط؟ يمكنك ربط كود صديقك الذي دعاك الآن لتوثيق المكافأة!'
                      : 'Registered without a referral link? Link your friend\'s code now so they receive referral credit!'}
                  </p>
                </div>
              </div>

              {isReferralLocked && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#06D6A0] border-2 border-black text-black text-xs font-black shadow-[2px_2px_0px_0px_#000]">
                  <Lock className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{isAr ? 'كود الدعوة معتمد ومقفل لحسابك' : 'Referral Code Linked & Locked'}</span>
                </div>
              )}
            </div>

            {isReferralLocked ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#06D6A0]/10 border-2 border-black flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[3px_3px_0px_0px_#000]">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#06D6A0] border-2 border-black flex items-center justify-center text-black shrink-0 shadow-[2px_2px_0px_0px_#000]">
                    <Lock className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-xs text-neutral-800 font-bold block mb-0.5">
                      {isAr ? 'كود الصديق المرتبط بحسابك:' : 'Your Linked Referral Code:'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-base sm:text-lg font-mono font-black text-black bg-white px-3 py-1 rounded-xl border-2 border-black tracking-wider shadow-[2px_2px_0px_0px_#000] inline-flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-neutral-800 stroke-[3]" />
                        <span>{appliedFriendCode || 'VERIFIED'}</span>
                      </span>
                      <span className="text-[10px] font-black bg-[#06D6A0] text-black px-2 py-0.5 rounded-md border border-black uppercase">
                        {isAr ? 'مقفل ومعتمد' : 'LOCKED'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-xs font-black text-neutral-900 bg-white px-3.5 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                  {isAr ? 'تم تثبيت هذا الكود في حسابك بنجاح ولا يمكن تغييره' : 'Fixed per security policy (1 code per user)'}
                </div>
              </div>
            ) : (
              <form onSubmit={handleClaimFriendCode} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={inputFriendCode}
                    onChange={(e) => {
                      setInputFriendCode(e.target.value.toUpperCase());
                      setClaimError('');
                    }}
                    placeholder={isAr ? 'أدخل كود دعوة صديقك هنا (مثال: ALEX884)...' : 'Enter friend\'s referral code (e.g. ALEX884)...'}
                    className="w-full px-4 py-3 bg-[#FFFDF9] border-2 border-black rounded-xl text-xs font-mono font-black text-black outline-none placeholder:text-neutral-500 shadow-[2px_2px_0px_0px_#000] uppercase tracking-wider"
                    disabled={claimingCode}
                  />
                </div>

                <button
                  type="submit"
                  disabled={claimingCode || !inputFriendCode.trim()}
                  className="px-6 py-3 bg-[#06D6A0] hover:bg-[#05b385] text-black font-black text-xs rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shrink-0"
                >
                  {claimingCode ? (
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                  ) : (
                    <Check className="w-4 h-4 stroke-[3]" />
                  )}
                  <span>{isAr ? 'تأكيد وربط الكود' : 'Claim Code'}</span>
                </button>
              </form>
            )}

            {claimError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border-2 border-rose-600 text-rose-700 text-xs font-black flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 stroke-[2.5]" />
                <span>{claimError}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── User Live Statistics Strip (If Logged In) ── */}
      {user && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-start">
            
            <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-black flex flex-col justify-between shadow-[4px_4px_0px_0px_#000]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-neutral-800 uppercase tracking-wide">{isAr ? 'الأصدقاء المسجلون' : 'Verified Invites'}</span>
                <div className="w-7 h-7 rounded-lg bg-[#06D6A0] border-2 border-black flex items-center justify-center shadow-[1px_1px_0px_0px_#000]">
                  <Users className="w-4 h-4 text-black stroke-[2.5]" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-black font-mono">
                {validReferralsCount} <span className="text-xs font-bold text-neutral-700">{isAr ? 'أفراد' : 'users'}</span>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-black flex flex-col justify-between shadow-[4px_4px_0px_0px_#000]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-neutral-800 uppercase tracking-wide">{isAr ? 'المكافآت المودعة بالمحفظة' : 'Total Cash Credited'}</span>
                <div className="w-7 h-7 rounded-lg bg-[#FFE600] border-2 border-black flex items-center justify-center shadow-[1px_1px_0px_0px_#000]">
                  <Coins className="w-4 h-4 text-black stroke-[2.5]" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-black font-mono">
                ${totalEarnedCash.toFixed(2)}
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-black flex flex-col justify-between shadow-[4px_4px_0px_0px_#000]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-neutral-800 uppercase tracking-wide">{isAr ? 'الدفعة الحالية' : 'Current Batch'}</span>
                <div className="w-7 h-7 rounded-lg bg-[#4CC9F0] border-2 border-black flex items-center justify-center shadow-[1px_1px_0px_0px_#000]">
                  <TrendingUp className="w-4 h-4 text-black stroke-[2.5]" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-black font-mono">
                {currentBatchFriends} / 3
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-black flex flex-col justify-between shadow-[4px_4px_0px_0px_#000]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-neutral-800 uppercase tracking-wide">{isAr ? 'متبقي للمكافأة القادمة' : 'For Next Reward'}</span>
                <div className="w-7 h-7 rounded-lg bg-[#FF70A6] border-2 border-black flex items-center justify-center shadow-[1px_1px_0px_0px_#000]">
                  <Lock className="w-4 h-4 text-black stroke-[2.5]" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-black font-mono">
                {invitesNeededForNextDollar} <span className="text-xs text-neutral-700 font-black">{isAr ? 'أصدقاء' : 'friends'}</span>
              </div>
            </div>

          </div>
        </section>
      )}

      {/* ── Progressive Milestone Vaults ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-16">
        <div className="rounded-3xl border-2 border-black bg-white p-5 sm:p-8 shadow-[6px_6px_0px_0px_#000]">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-5 border-b-2 border-black">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-neutral-800 block mb-1">
                {isAr ? 'خزائن المكافآت النقدية التراكمية' : 'SMART PROGRESSIVE MILESTONE VAULTS'}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-black">
                {isAr ? 'مسار الخزائن النقدية المفتوحة والمقفولة' : 'Unlocked & Locked Milestone Vaults'}
              </h3>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FFE600] border-2 border-black text-xs text-black font-black shadow-[2px_2px_0px_0px_#000]">
              <Coins className="w-4 h-4 stroke-[2.5]" />
              <span>{isAr ? 'لكل 3 أصدقاء = دفعة نقدية فورية بالمحفظة' : '3 Invites = Instant Cash Reward'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {SMART_VAULT_MILESTONES.slice(0, 6).map((milestone) => {
              const isUnlocked = validReferralsCount >= milestone.count;
              const isNextInLine = !isUnlocked && nextMilestone.count === milestone.count;

              return (
                <div
                  key={milestone.count}
                  className={`relative flex flex-col justify-between p-4 rounded-2xl border-2 border-black transition-all ${
                    isUnlocked
                      ? 'bg-[#06D6A0] text-black shadow-[4px_4px_0px_0px_#000]'
                      : isNextInLine
                      ? 'bg-[#FFE600] text-black shadow-[4px_4px_0px_0px_#000]'
                      : 'bg-[#FFFDF9] text-black shadow-[2px_2px_0px_0px_#000] opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white border border-black shadow-[1px_1px_0px_0px_#000] text-black">
                      {isAr ? milestone.tag_ar : milestone.tag_en}
                    </span>
                    
                    {isUnlocked ? (
                      <CheckCircle2 className="w-4 h-4 text-black stroke-[3] shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-neutral-700 stroke-[2.5] shrink-0" />
                    )}
                  </div>

                  <div className="my-2 text-center">
                    <div className="text-[11px] text-neutral-800 font-bold mb-0.5">
                      {isAr ? `${milestone.count} أصدقاء` : `${milestone.count} Friends`}
                    </div>
                    <div className="text-2xl font-black font-mono tracking-tight text-black">
                      ${milestone.reward}
                    </div>
                    <div className="text-[10px] text-neutral-700 font-black mt-0.5 truncate">
                      {isAr ? milestone.name_ar : milestone.name_en}
                    </div>
                  </div>

                  <div className="pt-3 border-t-2 border-black/20">
                    {isUnlocked ? (
                      <div className="text-[10px] text-center font-black text-black bg-white border border-black py-1 rounded-lg shadow-[1px_1px_0px_0px_#000]">
                        {isAr ? 'مفتوحة ومودعة' : 'Unlocked'}
                      </div>
                    ) : (
                      <div className="text-[10px] text-center font-bold text-neutral-800 bg-white/60 border border-black/30 py-1 rounded-lg">
                        {isAr ? `باقي ${Math.max(0, milestone.count - validReferralsCount)}` : `${Math.max(0, milestone.count - validReferralsCount)} left`}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ── Live Friends Registration Ledger Table (If Logged In) ── */}
      {user && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-16">
          <div className="rounded-3xl border-2 border-black bg-white p-5 sm:p-8 shadow-[6px_6px_0px_0px_#000]">
            
            <div className="flex items-center justify-between pb-4 mb-4 border-b-2 border-black">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-black stroke-[2.5]" />
                <div>
                  <h3 className="text-base sm:text-lg font-black text-black">
                    {isAr ? 'سجل الأصدقاء المسجلين عبر كودك' : 'Referred Friends Registration History'}
                  </h3>
                  <p className="text-xs text-neutral-700 font-bold">
                    {isAr ? 'يتم التحقق واحتساب كل صديق فور إتمام تسجيله الذكي' : 'Live verification tracking on every registration'}
                  </p>
                </div>
              </div>

              <span className="text-xs font-mono font-black bg-[#FFE600] border-2 border-black px-2.5 py-1 rounded-xl shadow-[1.5px_1.5px_0px_0px_#000]">
                {invitedUsers.length} {isAr ? 'صديق' : 'friends'}
              </span>
            </div>

            {invitedUsers.length === 0 ? (
              <div className="py-10 text-center text-neutral-700 font-bold">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-40 stroke-[1.5]" />
                <p className="text-xs sm:text-sm font-black mb-1">
                  {isAr ? 'لم يسجل أي صديق عبر كودك بعد.' : 'No invited friends registered yet.'}
                </p>
                <p className="text-xs text-neutral-600">
                  {isAr ? 'انسخ رابطك وشاركه الآن لتكسب رصيداً نقدياً في محفظتك لكل 3 تسجيلات!' : 'Share your link now to start earning cash rewards per 3 signups!'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-black bg-[#FFFDF9]">
                      <th className="py-2.5 px-3 font-black text-black uppercase">{isAr ? '#' : '#'}</th>
                      <th className="py-2.5 px-3 font-black text-black uppercase">{isAr ? 'الصديق' : 'Friend'}</th>
                      <th className="py-2.5 px-3 font-black text-black uppercase">{isAr ? 'البريد المقنع' : 'Masked Email'}</th>
                      <th className="py-2.5 px-3 font-black text-black uppercase">{isAr ? 'تاريخ التسجيل' : 'Date'}</th>
                      <th className="py-2.5 px-3 font-black text-black uppercase text-center">{isAr ? 'حالة الاحتساب' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {invitedUsers.map((friend, idx) => (
                      <tr key={friend.id || idx} className="hover:bg-neutral-50 transition-colors">
                        <td className="py-3 px-3 font-mono font-black text-neutral-600">{idx + 1}</td>
                        <td className="py-3 px-3 font-black text-black">{friend.displayName || 'صديق'}</td>
                        <td className="py-3 px-3 font-mono text-neutral-700">{friend.email}</td>
                        <td className="py-3 px-3 font-mono text-neutral-600">
                          {new Date(friend.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {friend.status === 'rewarded' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-[#06D6A0] text-black border border-black shadow-[1px_1px_0px_0px_#000]">
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>{isAr ? 'تم إيداع المكافأة' : 'Rewarded'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-[#FFE600] text-black border border-black shadow-[1px_1px_0px_0px_#000]">
                              <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                              <span>{isAr ? 'تسجيل مؤهل' : 'Verified Signup'}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </section>
      )}

      {/* ── 3 Steps "How It Works" ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-black mb-2">
            {isAr ? 'كيف تبدأ في جني الأرباح خلال 3 خطوات بسيطة؟' : 'How It Works in 3 Simple Steps'}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-700 font-bold max-w-md mx-auto">
            {isAr ? 'نظام أوتوماتيكي ذكي يضمن احتساب كل صديق مسجل فوراً بدون تعقيد.' : 'Automated tracking system ensuring instant credits on verified signups.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="p-6 rounded-2xl bg-white border-2 border-black text-center flex flex-col items-center shadow-[4px_4px_0px_0px_#000]">
            <div className="w-12 h-12 rounded-2xl bg-[#FFE600] border-2 border-black flex items-center justify-center text-black mb-4 font-black text-lg shadow-[2px_2px_0px_0px_#000]">
              1
            </div>
            <h3 className="text-base font-black text-black mb-2">
              {isAr ? 'انسخ وشارك رابطك الحصري' : 'Share Your Invite Link'}
            </h3>
            <p className="text-xs text-neutral-700 leading-relaxed font-bold">
              {isAr ? 'انسخ رابط الإحالة أو كود الدعوة وشاركه مع أصدقائك عبر واتساب، تليجرام، أو وسائل التواصل.' : 'Copy your unique referral link or code and share it with friends across WhatsApp, Telegram, or social media.'}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border-2 border-black text-center flex flex-col items-center shadow-[4px_4px_0px_0px_#000]">
            <div className="w-12 h-12 rounded-2xl bg-[#4CC9F0] border-2 border-black flex items-center justify-center text-black mb-4 font-black text-lg shadow-[2px_2px_0px_0px_#000]">
              2
            </div>
            <h3 className="text-base font-black text-black mb-2">
              {isAr ? 'صديقك يسجل حسابه' : 'Friend Signs Up'}
            </h3>
            <p className="text-xs text-neutral-700 leading-relaxed font-bold">
              {isAr ? 'عندما يسجل صديقك حسابه في UpStore بكل سلاسة وسرعة وبدون الحاجة الإجبارية لأي عملية شراء.' : 'When your friend creates an account on UpStore with smart authentication and zero purchase barriers.'}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border-2 border-black text-center flex flex-col items-center shadow-[4px_4px_0px_0px_#000]">
            <div className="w-12 h-12 rounded-2xl bg-[#06D6A0] border-2 border-black flex items-center justify-center text-black mb-4 font-black text-lg shadow-[2px_2px_0px_0px_#000]">
              3
            </div>
            <h3 className="text-base font-black text-black mb-2">
              {isAr ? 'تستلم مكافأة نقدية فورية بالمحفظة' : 'Receive Direct Wallet Rewards'}
            </h3>
            <p className="text-xs text-neutral-700 leading-relaxed font-bold">
              {isAr ? 'يودع الرصيد تلقائياً في محفظتك لكل 3 أصدقاء مسجلين، لتشتري بها أي اشتراك أو منتج في المتجر مجاناً!' : 'Receive cash directly into your wallet for every 3 friends to buy subscriptions instantly!'}
            </p>
          </div>

        </div>
      </section>

      {/* ── Referral FAQ Accordion ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 mb-16 select-none">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-black mb-2">
            {isAr ? 'الأسئلة الشائعة حول برنامج المكافآت الذكي' : 'Referral Program FAQ'}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-700 font-bold">
            {isAr ? 'إجابات واضحة حول طريقة احتساب الأرباح وشروط التسجيل الذكي.' : 'Clear answers about registration-based rewards and wallet deposits.'}
          </p>
        </div>

        <div className="space-y-3">
          {REFERRAL_FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div 
                key={idx} 
                className="rounded-2xl border-2 border-black bg-white overflow-hidden shadow-[4px_4px_0px_0px_#000] transition-all"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-start font-black text-xs sm:text-sm text-black hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <span className={`shrink-0 w-7 h-7 rounded-xl border-2 border-black flex items-center justify-center transition-all duration-300 shadow-[1.5px_1.5px_0px_0px_#000] ${isOpen ? 'rotate-180 bg-[#FFE600] text-black' : 'bg-white text-black'}`}>
                    <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                  </span>
                </button>
                
                {isOpen && (
                  <div className="border-t-2 border-black py-4 px-5 bg-[#FFFDF9]">
                    <p className="text-xs sm:text-sm text-neutral-800 leading-relaxed font-bold">
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── QR Code Modal ── */}
      {isQRModalOpen && (
        <QRCodeModal
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
          url={shareLink}
          code={referralCode || ''}
          isAr={isAr}
        />
      )}

    </main>
  );
}
