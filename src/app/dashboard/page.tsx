'use client';

/**
 * page.tsx (Dashboard Page) — UpStore Premium Digital Marketplace
 * Executive, High-Performance, Intuitive & Mobile-Optimized Dashboard.
 */

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from '@/context/LocaleContext';
import { useToastStore } from '@/store/useToastStore';
import { motion, AnimatePresence } from 'framer-motion';
import { bootstrapCurrentSession } from '@/utils/auth-client';
import dynamic from 'next/dynamic';
import { parseDeliveryPayload } from '@/utils/auth';
import { createClient } from '@/utils/supabase/client';
import { cleanAllAuthCookiesAndStorage } from '@/utils/auth-cookies';
import { 
  LayoutDashboard, 
  Package, 
  CreditCard, 
  Gift, 
  Settings, 
  Headset, 
  Lock, 
  Unlock, 
  Check, 
  Copy, 
  Ticket, 
  CheckCircle2, 
  LogOut, 
  User,
  Sliders,
  MessageSquare,
  ArrowUpRight,
  ArrowDownLeft,
  Tv,
  Terminal,
  UserPlus,
  Loader2,
  Share2,
  QrCode,
  Coins,
  Users,
  ShieldCheck,
  Zap,
  Eye,
  EyeOff,
  ExternalLink,
  ChevronRight,
  Search,
  Brain,
  Sparkles,
  Activity,
  RotateCcw,
  KeyRound,
  FileText,
  Compass,
  AlertCircle,
  Clock,
  Filter,
  Bot,
  Mail,
  HelpCircle,
  Send
} from 'lucide-react';
import { generateSupportCode } from '@/utils/supportCode';
import { useHyperAdaptiveStore } from '@/store/useHyperAdaptiveStore';

const QRCodeModal = dynamic(
  () => import('@/components/referral/QRCodeModal').then((mod) => mod.QRCodeModal),
  { ssr: false }
);

const AiSupportModal = dynamic(
  () => import('@/components/support/AiSupportModal').then((mod) => mod.AiSupportModal),
  { ssr: false }
);

const ReceiptModal = dynamic(
  () => import('@/components/checkout/ReceiptModal').then((mod) => mod.ReceiptModal),
  { ssr: false }
);

const OrderTrackingModal = dynamic(
  () => import('@/components/ui/OrderTrackingModal').then((mod) => mod.OrderTrackingModal),
  { ssr: false }
);

const SmartPaymentModal = dynamic(
  () => import('@/components/checkout/SmartPaymentModal').then((mod) => mod.SmartPaymentModal),
  { ssr: false }
);

// ─── Custom Brand SVG Icons ──────────────────────────────────────────────────

const YoutubeIcon = (props: React.ComponentPropsWithoutRef<'svg'>) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" />
  </svg>
);

const SpotifyIcon = (props: React.ComponentPropsWithoutRef<'svg'>) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
    <path d="M8 11.5c2.5-1.5 5.5-1.5 8 0" strokeWidth="2.5" />
    <path d="M7 14c3-2 7-2 10 0" strokeWidth="2" />
    <path d="M9 9c2-1 4-1 6 0" strokeWidth="3" />
  </svg>
);

// ─── Progressive Smart Reward Milestone Vaults (3 Friends = $1.00 Cash) ─────
const DASHBOARD_VAULT_MILESTONES = [
  { count: 3, reward: 1, name_ar: 'الخزينة البرونزية', name_en: 'Bronze Vault', tag_ar: 'البداية', tag_en: 'STARTER' },
  { count: 6, reward: 2, name_ar: 'الخزينة الفضية', name_en: 'Silver Vault', tag_ar: 'فضي', tag_en: 'SILVER' },
  { count: 9, reward: 3, name_ar: 'الخزينة الذهبية', name_en: 'Gold Vault', tag_ar: 'ذهبي', tag_en: 'GOLD' },
  { count: 15, reward: 5, name_ar: 'الخزينة البلاتينية', name_en: 'Platinum Vault', tag_ar: 'بلاتيني', tag_en: 'PLATINUM' },
  { count: 30, reward: 10, name_ar: 'خزينة الماس VIP', name_en: 'Diamond VIP Vault', tag_ar: 'ماسي', tag_en: 'DIAMOND' },
  { count: 60, reward: 20, name_ar: 'خزينة النخبة الملكية', name_en: 'Royal Elite Vault', tag_ar: 'نخبة ملكية', tag_en: 'ROYAL' },
];

type TabId = 'overview' | 'orders' | 'wallet' | 'referral' | 'settings' | 'support' | 'seller';

interface NavItem {
  id: TabId;
  labelAr: string;
  labelEn: string;
  icon: React.ComponentType<any>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', labelAr: 'نظرة عامة', labelEn: 'Overview', icon: LayoutDashboard },
  { id: 'orders', labelAr: 'طلباتي وتراخيصي', labelEn: 'My Orders & Keys', icon: Package },
  { id: 'wallet', labelAr: 'المحفظة والرصيد', labelEn: 'Wallet & Funds', icon: CreditCard },
  { id: 'referral', labelAr: 'برنامج المكافآت والأرباح', labelEn: 'Referrals & Rewards', icon: Gift },
  { id: 'support', labelAr: 'الدعم الفني الفوري والـ AI', labelEn: 'Support & AI Helpdesk', icon: Headset },
  { id: 'settings', labelAr: 'الإعدادات والأمان', labelEn: 'Settings & Security', icon: Settings },
  { id: 'seller', labelAr: 'بوابة التجار', labelEn: 'Merchant Portal', icon: UserPlus },
];

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center select-none text-black">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 text-black animate-spin mx-auto" />
            <p className="text-xs font-mono text-black font-black tracking-wider uppercase">
              Loading Dashboard...
            </p>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabId) || 'overview';
  
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [referredProfiles, setReferredProfiles] = useState<any[]>([]);
  const [referralsCount, setReferralsCount] = useState<number>(0);
  const [referralStatus, setReferralStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedSupportPin, setCopiedSupportPin] = useState(false);
  
  // AI Bot Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [ticketDraft, setTicketDraft] = useState<{ subject: string; message: string; category: string; orderId?: string } | null>(null);

  const { language, formatPrice, mounted } = useLocale();
  const isAr = language === 'ar';

  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabId;
    if (tabParam && ['overview', 'orders', 'wallet', 'referral', 'settings', 'support', 'seller'].includes(tabParam)) {
      setActiveTab(tabParam);
    }

    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const focusParam = searchParams.get('focus');
      if (hash === '#support-pin' || focusParam === 'support-pin') {
        setTimeout(() => {
          const el = document.getElementById('support-pin');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 500);
      }
    }
  }, [searchParams]);

  const fetchUserData = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    let user = session?.user;
    if (!user) {
      const { data: { user: verifiedUser } } = await supabase.auth.getUser();
      user = verifiedUser;
    }
    if (!user) {
      router.replace('/auth/login');
      return;
    }

    try {
      const bootstrap = await bootstrapCurrentSession(null, session);
      const viewAsUser =
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('as') === 'user';

      if (bootstrap.redirectTo === '/admin' && !viewAsUser) {
        router.replace('/admin');
        return;
      }

      setProfile(bootstrap.profile);

      // Fetch orders with products joined
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          *,
          products (
            name,
            name_ar,
            slug,
            icon_name,
            brand_color,
            delivery_mode,
            subscription_duration
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersData) {
        setOrders(ordersData);
      }

      // Fetch user transactions
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (txData) {
        setTransactions(txData);
      }

      // Fetch referral campaign status
      const referralResponse = await fetch('/api/referral/status', {
        method: 'GET',
        cache: 'no-store',
      });
      const referralPayload = await referralResponse.json().catch(() => null);

      if (referralResponse.ok && referralPayload) {
        setReferralStatus(referralPayload);
        setReferredProfiles(referralPayload.invitedUsers || []);
        setReferralsCount(Number(referralPayload.validReferralsCount || 0));
      }
    } catch (error) {
      console.error('Failed to initialize dashboard', error);
      router.replace('/auth/login?error=profile_setup_failed');
      return;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [router]);

  const handleSignOut = async () => {
    try {
      cleanAllAuthCookiesAndStorage();
      const supabase = createClient();
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      try {
        await fetch('/api/auth/clean-cookies', { method: 'POST' }).catch(() => {});
      } catch {}
      useToastStore.getState().success(
        language === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Signed out successfully'
      );
    } catch {
      // ignore
    } finally {
      window.location.href = '/auth/login';
    }
  };

  const handleOpenTicketWithDraft = (draft: { subject: string; message: string; category: string; orderId?: string }) => {
    setTicketDraft(draft);
    setActiveTab('support');
  };

  const handleSelectOrderForSupport = (order: any) => {
    const prodName = order.products?.name_ar || order.products?.name || 'طلب رقم #' + order.id.slice(0, 8);
    setTicketDraft({
      subject: `طلب مساعدة بخصوص طلب #${order.id.slice(0, 8).toUpperCase()} (${prodName})`,
      message: `أحتاج إلى مساعدة بخصوص طلبي:\n- رقم الطلب: #${order.id}\n- المنتج: ${prodName}\n- تفاصيل المشكلة:\n`,
      category: 'ضمان واستبدال المنتج',
      orderId: order.id,
    });
    setActiveTab('support');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center select-none text-black">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-black animate-spin mx-auto" />
          <p className="text-xs font-mono text-black font-black tracking-wider uppercase">
            {isAr ? 'جاري تجهيز لوحة التحكم...' : 'Loading Dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-black py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ── Top Executive User Header ── */}
        <div className="mb-6 sm:mb-8 rounded-3xl border-2 border-black bg-white p-5 sm:p-7 shadow-[6px_6px_0px_0px_#000] relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            
            {/* User Profile Badge */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#FFE600] border-2 border-black flex items-center justify-center font-black text-xl text-black font-mono shrink-0 shadow-[2px_2px_0px_0px_#000]">
                {profile?.display_name ? profile.display_name.slice(0, 2).toUpperCase() : 'UP'}
              </div>
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight">
                    {profile?.display_name || (isAr ? 'عميل UpStore' : 'UpStore Member')}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#06D6A0] border border-black text-black text-[10px] font-black shadow-[1px_1px_0px_0px_#000]">
                    <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{profile?.role === 'admin' ? 'ADMIN' : (isAr ? 'حساب موثق' : 'VERIFIED')}</span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <p className="text-xs text-neutral-700 font-bold font-mono">
                    {profile?.email || 'user@upstore.one'}
                  </p>
                  <span className="text-neutral-300 hidden sm:inline">•</span>
                  <button
                    onClick={() => {
                      const code = generateSupportCode(profile?.id || '', { deviceFingerprint: profile?.device_fingerprint });
                      navigator.clipboard.writeText(code);
                      setCopiedSupportPin(true);
                      useToastStore.getState().success(
                        isAr ? 'تم نسخ كود الدعم الفني بنجاح!' : 'Support PIN copied!',
                        code
                      );
                      setTimeout(() => setCopiedSupportPin(false), 2000);
                    }}
                    title={isAr ? "انقر لنسخ كود الدعم الفني المخصص" : "Click to copy your dedicated support PIN"}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FFE600] border border-black text-black text-[11px] font-black font-mono shadow-[1px_1px_0px_0px_#000] hover:brightness-95 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                  >
                    <KeyRound className="w-3 h-3 stroke-[2.5]" />
                    <span>{isAr ? `كود الدعم: ${generateSupportCode(profile?.id || '', { deviceFingerprint: profile?.device_fingerprint })}` : `PIN: ${generateSupportCode(profile?.id || '', { deviceFingerprint: profile?.device_fingerprint })}`}</span>
                    {copiedSupportPin ? (
                      <Check className="w-3 h-3 text-emerald-800 stroke-[3]" />
                    ) : (
                      <Copy className="w-3 h-3 stroke-[2]" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Top Snapshot Stats */}
            <div className="flex items-center gap-2.5 sm:gap-4 w-full md:w-auto">
              
              {/* Wallet Quick Balance */}
              <div 
                onClick={() => setActiveTab('wallet')}
                className="flex-1 md:flex-initial px-4 py-2.5 rounded-2xl bg-[#FFFDF9] border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer select-none"
              >
                <span className="text-[10px] text-neutral-800 font-bold block">
                  {isAr ? 'رصيد المحفظة' : 'Wallet Balance'}
                </span>
                <span className="text-base sm:text-lg font-black text-black font-mono leading-tight">
                  {mounted ? formatPrice(profile?.wallet_balance || 0) : `$${profile?.wallet_balance || 0}`}
                </span>
              </div>

              {/* Total Orders */}
              <div 
                onClick={() => setActiveTab('orders')}
                className="flex-1 md:flex-initial px-4 py-2.5 rounded-2xl bg-[#FFFDF9] border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer select-none"
              >
                <span className="text-[10px] text-neutral-800 font-bold block">
                  {isAr ? 'إجمالي الطلبات' : 'Total Orders'}
                </span>
                <span className="text-base sm:text-lg font-black text-black font-mono leading-tight">
                  {orders.length}
                </span>
              </div>

              {/* Referral Cash */}
              <div 
                onClick={() => setActiveTab('referral')}
                className="flex-1 md:flex-initial px-4 py-2.5 rounded-2xl bg-[#FFFDF9] border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer select-none"
              >
                <span className="text-[10px] text-neutral-800 font-bold block">
                  {isAr ? 'أرباح الدعوات' : 'Referral Cash'}
                </span>
                <span className="text-base sm:text-lg font-black text-black font-mono leading-tight">
                  ${(Math.floor(referralsCount / 3) * 1.00).toFixed(2)}
                </span>
              </div>

            </div>

          </div>
        </div>

        {/* ── Mobile Horizontal Tab Scrollbar ── */}
        <div className="lg:hidden mb-6 -mx-4 px-4 overflow-x-auto no-scrollbar flex items-center gap-2">
          {NAV_ITEMS.map((item) => {
            const active = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap flex items-center gap-2 transition-all shrink-0 cursor-pointer border-2 border-black ${
                  active
                    ? 'bg-[#FFE600] text-black shadow-[3px_3px_0px_0px_#000]'
                    : 'bg-white text-black shadow-[2px_2px_0px_0px_#000] hover:bg-neutral-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isAr ? item.labelAr : item.labelEn}</span>
                {item.badge && !active && (
                  <span className="px-1.5 py-0.2 bg-[#06D6A0] text-black text-[9px] rounded font-mono font-black border border-black">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Main Layout: Sidebar & Active Tab Content ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ═══ DESKTOP SIDEBAR (3 cols) ═══ */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-24">
            <div className="rounded-3xl border-2 border-black bg-white p-4 flex flex-col justify-between select-none shadow-[5px_5px_0px_0px_#000] space-y-6 text-black">
              
              {/* Navigation Items */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-800 px-3 block mb-2">
                  {isAr ? 'القائمة الرئيسية' : 'MAIN MENU'}
                </span>

                {NAV_ITEMS.map((item) => {
                  const active = activeTab === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-black transition-all border-2 border-black cursor-pointer ${
                        active
                          ? 'bg-[#FFE600] text-black shadow-[3.5px_3.5px_0px_0px_#000] font-black'
                          : 'bg-white text-black hover:bg-neutral-100 shadow-[2px_2px_0px_0px_#000]'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 stroke-[2.5]" />
                        <span>{isAr ? item.labelAr : item.labelEn}</span>
                      </span>
                      {item.badge && !active && (
                        <span className="px-2 py-0.5 bg-[#06D6A0] text-black text-[10px] rounded-md font-mono font-black border border-black">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Direct AI Support Button */}
                <button
                  onClick={() => setIsAiModalOpen(true)}
                  className="w-full flex items-center justify-between px-3.5 py-3 text-xs font-black text-black bg-[#4CC9F0] hover:bg-[#3db6db] rounded-2xl border-2 border-black shadow-[2px_2px_0px_0px_#000] transition-all mt-2 cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Bot className="w-4 h-4 stroke-[2.5]" />
                    <span>{isAr ? 'البوت الذكي للدعم' : 'AI Support Bot'}</span>
                  </span>
                  <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>

                {profile?.role === 'admin' && (
                  <Link 
                    href="/admin" 
                    className="w-full flex items-center gap-2.5 px-3.5 py-3 text-xs font-black text-black bg-[#06D6A0] hover:bg-[#05b385] rounded-2xl border-2 border-black shadow-[2px_2px_0px_0px_#000] transition-all mt-2"
                  >
                    <Sliders className="w-4 h-4 stroke-[2.5]" />
                    <span>{isAr ? 'لوحة تحكم المشرف (Admin)' : 'Admin Control Panel'}</span>
                  </Link>
                )}
              </div>

              {/* Logout Button */}
              <div className="pt-4 border-t-2 border-black">
                <button 
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-black text-rose-600 bg-white hover:bg-rose-50 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4 stroke-[2.5]" />
                  <span>{isAr ? 'تسجيل الخروج' : 'Sign Out'}</span>
                </button>
              </div>

            </div>
          </aside>

          {/* ═══ CONTENT AREA (9 cols) ═══ */}
          <main className="lg:col-span-9 w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {activeTab === 'overview' && (
                  <OverviewTab 
                    setActiveTab={setActiveTab} 
                    profile={profile} 
                    orders={orders} 
                    transactions={transactions}
                    referralsCount={referralsCount}
                    onOpenAiModal={() => setIsAiModalOpen(true)}
                  />
                )}
                {activeTab === 'orders' && (
                  <OrdersTab 
                    orders={orders} 
                    onRequestSupport={handleSelectOrderForSupport}
                  />
                )}
                {activeTab === 'wallet' && (
                  <WalletTab 
                    profile={profile}
                    transactions={transactions}
                    onBalanceUpdated={fetchUserData}
                  />
                )}
                {activeTab === 'referral' && (
                  <ReferralTab 
                    profile={profile}
                    referredProfiles={referredProfiles}
                    referralsCount={referralsCount}
                    referralStatus={referralStatus}
                    onReferralStatusChange={(nextStatus) => {
                      setReferralStatus(nextStatus);
                      setReferredProfiles(nextStatus?.invitedUsers || []);
                      setReferralsCount(Number(nextStatus?.validReferralsCount || 0));
                    }}
                  />
                )}
                {activeTab === 'support' && (
                  <SupportTab 
                    profile={profile} 
                    orders={orders}
                    initialDraft={ticketDraft}
                    onOpenAiModal={() => setIsAiModalOpen(true)}
                  />
                )}
                {activeTab === 'settings' && <SettingsTab profile={profile} />}
                {activeTab === 'seller' && <SellerTab />}
              </motion.div>
            </AnimatePresence>
          </main>

        </div>

      </div>

      {/* ── AI Support Bot Modal ── */}
      <AiSupportModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onOpenTicketWithDraft={handleOpenTicketWithDraft}
        userProfile={profile}
      />

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. OVERVIEW TAB
// ─────────────────────────────────────────────────────────────────────────────

function OverviewTab({ 
  setActiveTab, 
  profile, 
  orders, 
  referralsCount,
  onOpenAiModal
}: { 
  setActiveTab: (tab: TabId) => void; 
  profile: any; 
  orders: any[]; 
  transactions: any[]; 
  referralsCount: number; 
  onOpenAiModal: () => void;
}) {
  const { language, formatPrice, translateProduct, mounted } = useLocale();
  const isAr = language === 'ar';
  const [copiedSupportPin, setCopiedSupportPin] = useState(false);
  const recentOrders = orders.slice(0, 4);

  const getProductIcon = (iconName: string | undefined) => {
    if (iconName === 'netflix') return Tv;
    if (iconName === 'spotify') return SpotifyIcon;
    if (iconName === 'youtube') return YoutubeIcon;
    if (iconName === 'gemini' || iconName === 'chatgpt') return Terminal;
    return Package;
  };

  const getTranslatedProductName = (ord: any) => {
    const name = ord.products?.name || 'Digital License';
    const slug = ord.products?.slug || '';
    if (!mounted) return name;
    const p = translateProduct(slug, name, ord.products?.name_ar);
    return `${p.name}${p.duration ? ` - ${p.duration}` : ''}`;
  };

  return (
    <div className="space-y-6 text-black">
      
      {/* ── 4 Quick Action KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Orders Card */}
        <div 
          onClick={() => setActiveTab('orders')}
          className="rounded-3xl border-2 border-black bg-white p-5 flex flex-col justify-between h-36 hover:-translate-y-0.5 shadow-[4px_4px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-neutral-800 uppercase tracking-wider">
              {isAr ? 'طلباتي وتراخيصي' : 'My Orders'}
            </span>
            <div className="w-10 h-10 rounded-xl bg-[#FFE600] border-2 border-black flex items-center justify-center text-black shadow-[1.5px_1.5px_0px_0px_#000]">
              <Package className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-black font-mono leading-none mb-1">
              {orders.length}
            </div>
            <span className="text-xs font-black text-black group-hover:underline transition-colors">
              {isAr ? 'عرض بيانات التراخيص ←' : 'View all keys →'}
            </span>
          </div>
        </div>

        {/* Wallet Balance Card */}
        <div 
          onClick={() => setActiveTab('wallet')}
          className="rounded-3xl border-2 border-black bg-white p-5 flex flex-col justify-between h-36 hover:-translate-y-0.5 shadow-[4px_4px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-neutral-800 uppercase tracking-wider">
              {isAr ? 'رصيد المحفظة' : 'Available Balance'}
            </span>
            <div className="w-10 h-10 rounded-xl bg-[#06D6A0] border-2 border-black flex items-center justify-center text-black shadow-[1.5px_1.5px_0px_0px_#000]">
              <CreditCard className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-black font-mono leading-none mb-1">
              {mounted ? formatPrice(profile?.wallet_balance || 0) : `$${profile?.wallet_balance || 0}`}
            </div>
            <span className="text-xs font-black text-black group-hover:underline transition-colors">
              {isAr ? '+ شحن الرصيد الآن' : '+ Top up wallet'}
            </span>
          </div>
        </div>

        {/* Referral Earnings Card */}
        <div 
          onClick={() => setActiveTab('referral')}
          className="rounded-3xl border-2 border-black bg-white p-5 flex flex-col justify-between h-36 hover:-translate-y-0.5 shadow-[4px_4px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-neutral-800 uppercase tracking-wider">
              {isAr ? 'برنامج المكافآت' : 'Referral Rewards'}
            </span>
            <div className="w-10 h-10 rounded-xl bg-[#4CC9F0] border-2 border-black flex items-center justify-center text-black shadow-[1.5px_1.5px_0px_0px_#000]">
              <Gift className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-black font-mono leading-none mb-1">
              ${(Math.floor(referralsCount / 3) * 1.00).toFixed(2)}
            </div>
            <span className="text-xs font-black text-black group-hover:underline transition-colors">
              {isAr ? `${referralsCount} أصدقاء مسجلين` : `${referralsCount} Verified Signups`}
            </span>
          </div>
        </div>

        {/* Support Code / PIN Card */}
        <div 
          id="support-pin"
          onClick={() => {
            const code = generateSupportCode(profile?.id || '', { deviceFingerprint: profile?.device_fingerprint });
            navigator.clipboard.writeText(code);
            setCopiedSupportPin(true);
            setTimeout(() => setCopiedSupportPin(false), 2000);
          }}
          className="rounded-3xl border-2 border-black bg-[#FFFDF9] p-5 flex flex-col justify-between h-36 hover:-translate-y-0.5 shadow-[4px_4px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer group scroll-mt-24"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isAr ? 'كود الدعم السري' : 'Secret Support Code'}</span>
            </span>
            <div className="w-10 h-10 rounded-xl bg-[#FFE600] border-2 border-black flex items-center justify-center text-black shadow-[1.5px_1.5px_0px_0px_#000]">
              <KeyRound className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-xs sm:text-sm font-black text-black font-mono leading-none tracking-tight">
                {generateSupportCode(profile?.id || '', { deviceFingerprint: profile?.device_fingerprint })}
              </span>
              <span className="text-[10px] font-black bg-black text-white px-2 py-0.5 rounded-md shrink-0">
                {copiedSupportPin ? (isAr ? 'تم النسخ!' : 'COPIED') : (isAr ? 'نسخ' : 'COPY')}
              </span>
            </div>
            <span className="text-[10px] font-bold text-neutral-700 block truncate">
              {isAr ? 'مفتاح التحقق الشامل لدعم العملاء' : 'Universal auth key for customer support'}
            </span>
          </div>
        </div>

      </div>

      {/* ── Quick Action Assistant Banner ── */}
      <div className="rounded-3xl border-2 border-black bg-[#4CC9F0] p-5 sm:p-6 shadow-[5px_5px_0px_0px_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-start">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white border-2 border-black flex items-center justify-center text-black shrink-0 shadow-[2px_2px_0px_0px_#000]">
            <Bot className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-base font-black text-black">
              {isAr ? 'هل تواجه أي استفسار أو مشكلة في حسابك؟' : 'Need instant assistance with your licenses?'}
            </h3>
            <p className="text-xs text-neutral-900 font-bold mt-0.5">
              {isAr ? 'مساعد الذكاء الاصطناعي متاح 24/7 للرد الفوري، حل المشكلات، أو فتح تذكرة لـ support@upstore.one' : 'Our 24/7 AI Bot answers in seconds or routes your request to support@upstore.one'}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAiModal}
          className="px-5 py-3 bg-[#FFE600] hover:bg-[#ebd300] text-black font-black text-xs rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Sparkles className="w-4 h-4 stroke-[2.5]" />
          <span>{isAr ? 'تواصل مع البوت الذكي للدعم' : 'Chat with AI Support Bot'}</span>
        </button>
      </div>

      {/* ── Active Licenses & Recent Orders ── */}
      <div className="rounded-3xl border-2 border-black bg-white overflow-hidden shadow-[5px_5px_0px_0px_#000]">
        <div className="px-6 py-4 border-b-2 border-black flex items-center justify-between bg-[#FFFDF9]">
          <div>
            <h3 className="text-sm sm:text-base font-black text-black">
              {isAr ? 'أحدث المشتريات والتراخيص' : 'Recent Purchases & Licenses'}
            </h3>
            <p className="text-xs text-neutral-700 font-bold">
              {isAr ? 'جميع طلباتك وبيانات الدخول المسلمة آلياً' : 'All delivered orders with instant key access'}
            </p>
          </div>
          <button 
            onClick={() => setActiveTab('orders')}
            className="text-xs font-black text-black hover:underline transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>{isAr ? 'عرض الكل' : 'View All'}</span>
            <ChevronRight className={`w-3.5 h-3.5 stroke-[2.5] ${isAr ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="divide-y-2 divide-neutral-200">
          {recentOrders.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <Package className="w-10 h-10 text-neutral-400 mx-auto mb-2 stroke-[1.5]" />
              <p className="text-xs text-neutral-700 font-black mb-4">
                {isAr ? 'لم تقم بأي طلبات بعد في المتجر.' : 'No purchases yet.'}
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#FFE600] text-black text-xs font-black hover:bg-[#ebd300] border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
              >
                <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isAr ? 'تصفح العروض الآن' : 'Explore Store Deals'}</span>
              </Link>
            </div>
          ) : (
            recentOrders.map((ord) => {
              const ProductIcon = getProductIcon(ord.products?.icon_name);
              const isFulfilled = ord.status === 'fulfilled' || ord.status === 'completed';

              return (
                <div key={ord.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-50 transition-colors">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#FFFDF9] border-2 border-black flex items-center justify-center text-black shrink-0 shadow-[1.5px_1.5px_0px_0px_#000]">
                      <ProductIcon className="w-5 h-5 stroke-[2]" />
                    </div>
                    <div className="min-w-0 text-start">
                      <h4 className="text-xs sm:text-sm font-black text-black truncate">
                        {getTranslatedProductName(ord)}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-neutral-700 font-mono font-bold mt-0.5">
                        <span>#{ord.id.slice(0, 8).toUpperCase()}</span>
                        <span>•</span>
                        <span>{new Date(ord.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <span className="text-sm font-black text-black font-mono">
                      {mounted ? formatPrice(ord.amount) : `$${ord.amount}`}
                    </span>
                    
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border border-black shadow-[1px_1px_0px_0px_#000] ${
                      isFulfilled
                        ? 'bg-[#06D6A0] text-black'
                        : 'bg-[#FFE600] text-black'
                    }`}>
                      {isFulfilled ? (isAr ? 'مكتمل ومُسلم' : 'Fulfilled') : (isAr ? 'قيد المراجعة' : 'Pending')}
                    </span>

                    <button
                      onClick={() => setActiveTab('orders')}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-100 border-2 border-black text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                    >
                      {isAr ? 'فتح البيانات' : 'Open Key'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MY ORDERS TAB
// ─────────────────────────────────────────────────────────────────────────────

function OrdersTab({ 
  orders,
  onRequestSupport
}: { 
  orders: any[];
  onRequestSupport?: (order: any) => void;
}) {
  const { language, formatPrice, translateProduct, mounted } = useLocale();
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'fulfilled' | 'pending'>('all');
  
  // Modals for Receipt & Tracking
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<any | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [selectedTrackingOrderId, setSelectedTrackingOrderId] = useState<string | null>(null);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  
  const isAr = language === 'ar';

  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      const isFulfilled = ord.status === 'fulfilled' || ord.status === 'completed';
      if (statusFilter === 'fulfilled' && !isFulfilled) return false;
      if (statusFilter === 'pending' && isFulfilled) return false;

      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const name = (ord.products?.name || '').toLowerCase();
      const nameAr = (ord.products?.name_ar || '').toLowerCase();
      const id = (ord.id || '').toLowerCase();
      return name.includes(query) || nameAr.includes(query) || id.includes(query);
    });
  }, [orders, searchQuery, statusFilter]);

  const getProductIcon = (iconName: string | undefined) => {
    if (iconName === 'netflix') return Tv;
    if (iconName === 'spotify') return SpotifyIcon;
    if (iconName === 'youtube') return YoutubeIcon;
    if (iconName === 'gemini' || iconName === 'chatgpt') return Terminal;
    return Package;
  };

  const getTranslatedProductName = (ord: any) => {
    const name = ord.products?.name || 'Digital License';
    const slug = ord.products?.slug || '';
    if (!mounted) return name;
    const p = translateProduct(slug, name, ord.products?.name_ar);
    return `${p.name}${p.duration ? ` - ${p.duration}` : ''}`;
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(label);
      useToastStore.getState().success(
        isAr ? 'تم نسخ البيانات بنجاح' : 'Copied to clipboard',
        label
      );
      setTimeout(() => setCopiedText(null), 2000);
    });
  };

  const parseCredentials = (key: string | null) => {
    if (!key || key === 'PENDING_FULFILLMENT') return null;
    return parseDeliveryPayload(key);
  };

  return (
    <div className="space-y-6 text-black">
      
      {/* Search & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-black">
            {isAr ? 'طلباتي وتراخيص الحسابات' : 'My Orders & Deliveries'}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-700 font-bold">
            {isAr ? 'جميع التراخيص والمفاتيح الرقمية مع إمكانية النسخ وعرض الإيصالات وتتبع الطلب:' : 'Access your digital credentials, receipts, and order tracking:'}
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 text-black absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none stroke-[2.5]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث في الطلبات...' : 'Search orders...'}
              className="w-full ps-9 pe-3 py-2 bg-white border-2 border-black rounded-xl text-xs font-bold text-black shadow-[2px_2px_0px_0px_#000] outline-none"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000]">
            {(['all', 'fulfilled', 'pending'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setStatusFilter(mode)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-colors cursor-pointer ${
                  statusFilter === mode ? 'bg-[#FFE600] text-black' : 'text-neutral-600 hover:text-black'
                }`}
              >
                {mode === 'all' ? (isAr ? 'الكل' : 'All') : mode === 'fulfilled' ? (isAr ? 'مكتمل' : 'Fulfilled') : (isAr ? 'معلق' : 'Pending')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="rounded-3xl border-2 border-black bg-white overflow-hidden shadow-[6px_6px_0px_0px_#000] divide-y-2 divide-neutral-200">
        {filteredOrders.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <Package className="w-10 h-10 text-neutral-400 mx-auto mb-2 stroke-[1.5]" />
            <p className="text-xs text-neutral-700 font-black">
              {searchQuery ? (isAr ? 'لا توجد نتائج مطابقة لبحثك' : 'No matching orders') : (isAr ? 'لا توجد طلبات سابقة' : 'No orders found')}
            </p>
          </div>
        ) : (
          filteredOrders.map((ord) => {
            const ProductIcon = getProductIcon(ord.products?.icon_name);
            const creds = parseCredentials(ord.product_key);
            const isFulfilled = ord.status === 'fulfilled' || ord.status === 'completed';
            const isOpen = openOrderId === ord.id;
            const isPasswordVisible = Boolean(showPasswordMap[ord.id]);

            return (
              <div key={ord.id} className="p-4 sm:p-6 flex flex-col hover:bg-neutral-50 transition-colors">
                
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-[#FFFDF9] border-2 border-black flex items-center justify-center text-black shrink-0 shadow-[2px_2px_0px_0px_#000]">
                      <ProductIcon className="w-6 h-6 stroke-[2]" />
                    </div>
                    <div className="min-w-0 text-start">
                      <h4 className="text-sm sm:text-base font-black text-black truncate">
                        {getTranslatedProductName(ord)}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-neutral-700 font-mono font-bold mt-0.5">
                        <span>#{ord.id.slice(0, 8).toUpperCase()}</span>
                        <span>•</span>
                        <span>{new Date(ord.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 flex-wrap">
                    <span className="text-base font-black text-black font-mono">
                      {mounted ? formatPrice(ord.amount) : `$${ord.amount}`}
                    </span>

                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border border-black shadow-[1px_1px_0px_0px_#000] ${
                      isFulfilled
                        ? 'bg-[#06D6A0] text-black'
                        : 'bg-[#FFE600] text-black animate-pulse'
                    }`}>
                      {isFulfilled ? (isAr ? 'مكتمل ومُسلم' : 'Fulfilled') : (isAr ? 'قيد المراجعة' : 'Pending')}
                    </span>

                    {/* View Receipt Button */}
                    <button
                      onClick={() => {
                        setSelectedReceiptOrder(ord);
                        setIsReceiptOpen(true);
                      }}
                      className="px-3 py-2 bg-white hover:bg-neutral-100 border-2 border-black rounded-xl text-xs font-black text-black flex items-center gap-1 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                      title={isAr ? 'عرض إيصال الدفع' : 'View Receipt'}
                    >
                      <FileText className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{isAr ? 'الإيصال' : 'Receipt'}</span>
                    </button>

                    {/* Track Order Button */}
                    <button
                      onClick={() => {
                        setSelectedTrackingOrderId(ord.id);
                        setIsTrackingOpen(true);
                      }}
                      className="px-3 py-2 bg-[#4CC9F0] hover:bg-[#3db6db] border-2 border-black rounded-xl text-xs font-black text-black flex items-center gap-1 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                      title={isAr ? 'تتبع مسار الطلب' : 'Track Order'}
                    >
                      <Compass className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{isAr ? 'تتبع' : 'Track'}</span>
                    </button>

                    {/* Request Warranty / Support on this Order */}
                    {onRequestSupport && (
                      <button
                        onClick={() => onRequestSupport(ord)}
                        className="px-3 py-2 bg-[#FFE600] hover:bg-[#ebd300] border-2 border-black rounded-xl text-xs font-black text-black flex items-center gap-1 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                        title={isAr ? 'فتح تذكرة دعم لهذا الطلب' : 'Request Support for this order'}
                      >
                        <Headset className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{isAr ? 'دعم الطلب' : 'Help'}</span>
                      </button>
                    )}

                    {(creds || ord.products?.delivery_mode === 'telegram') && (
                      <button 
                        onClick={() => setOpenOrderId(isOpen ? null : ord.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 ${
                          isOpen
                            ? 'bg-black text-white'
                            : 'bg-white hover:bg-neutral-100 text-black'
                        }`}
                      >
                        {isOpen ? <Lock className="w-3.5 h-3.5 stroke-[2.5]" /> : <Unlock className="w-3.5 h-3.5 stroke-[2.5]" />}
                        <span>
                          {isOpen 
                            ? (isAr ? 'إخفاء' : 'Hide') 
                            : (isAr ? 'البيانات' : 'Credentials')}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Collapsible Credentials Box */}
                <AnimatePresence>
                  {isOpen && (creds || ord.products?.delivery_mode === 'telegram') && (
                    <motion.div
                      initial={{ height: 0, opacity: 0, marginTop: 0 }}
                      animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                      exit={{ height: 0, opacity: 0, marginTop: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border-2 border-black space-y-4 shadow-[3px_3px_0px_0px_#000]">
                        
                        {/* Telegram Delivery Mode */}
                        {ord.products?.delivery_mode === 'telegram' ? (
                          <div className="space-y-3">
                            <p className="text-xs text-neutral-800 font-bold leading-relaxed">
                              {isAr
                                ? 'تم تفعيل هذا الطلب بنمط التسليم المباشر عبر مسؤول التسليم في تيليجرام. اضغط الزر أدناه للاستلام الفوري:'
                                : 'This product uses direct Telegram fulfillment. Click below to claim your account instantly:'}
                            </p>
                            <a
                              href={`https://t.me/UpStore_Delivery?text=${encodeURIComponent(
                                isAr
                                  ? `السلام عليكم، أود استلام طلبي لمنتج ${getTranslatedProductName(ord)} رقم الطلب: #${ord.id.substring(0, 8).toUpperCase()}`
                                  : `Hello, I would like to claim my order for ${getTranslatedProductName(ord)}. Order ID: #${ord.id.substring(0, 8).toUpperCase()}`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-3 bg-[#4CC9F0] hover:bg-[#3db6db] text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
                            >
                              <span>{isAr ? 'مراسلة مسؤول التسليم في تيليجرام' : 'Message Delivery Agent on Telegram'}</span>
                              <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                            </a>
                          </div>
                        ) : (
                          <>
                            {/* Standard Email & Password Credentials */}
                            {creds && creds.pass !== 'N/A' ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-start">
                                
                                {/* Email / Login */}
                                <div className="space-y-1">
                                  <span className="text-[10px] font-black text-neutral-800 uppercase tracking-wider block">
                                    {isAr ? 'البريد الإلكتروني / الحساب' : 'Email / Login'}
                                  </span>
                                  <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border-2 border-black">
                                    <code className="text-xs text-black font-mono font-bold break-all pr-2">{creds.email}</code>
                                    <button 
                                      onClick={() => handleCopy(creds.email, `email-${ord.id}`)}
                                      className="text-black hover:opacity-60 transition-colors cursor-pointer"
                                      title="Copy"
                                    >
                                      {copiedText === `email-${ord.id}` ? <Check className="w-4 h-4 text-black stroke-[3]" /> : <Copy className="w-4 h-4 stroke-[2.5]" />}
                                    </button>
                                  </div>
                                </div>

                                {/* Password with Reveal Toggle */}
                                <div className="space-y-1">
                                  <span className="text-[10px] font-black text-neutral-800 uppercase tracking-wider block">
                                    {isAr ? 'كلمة المرور' : 'Password'}
                                  </span>
                                  <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border-2 border-black">
                                    <code className="text-xs text-black font-mono font-bold break-all pr-2">
                                      {isPasswordVisible ? creds.pass : '••••••••••••'}
                                    </code>
                                    <div className="flex items-center gap-2">
                                      <button 
                                        type="button"
                                        onClick={() => setShowPasswordMap(prev => ({ ...prev, [ord.id]: !prev[ord.id] }))}
                                        className="text-black hover:opacity-60 transition-colors cursor-pointer"
                                        title={isPasswordVisible ? 'Hide' : 'Show'}
                                      >
                                        {isPasswordVisible ? <EyeOff className="w-4 h-4 stroke-[2.5]" /> : <Eye className="w-4 h-4 stroke-[2.5]" />}
                                      </button>
                                      <button 
                                        onClick={() => handleCopy(creds.pass, `pass-${ord.id}`)}
                                        className="text-black hover:opacity-60 transition-colors cursor-pointer"
                                        title="Copy"
                                      >
                                        {copiedText === `pass-${ord.id}` ? <Check className="w-4 h-4 text-black stroke-[3]" /> : <Copy className="w-4 h-4 stroke-[2.5]" />}
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Assigned Profile & PIN if applicable */}
                                {creds.profile !== 'N/A' && (
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-black text-neutral-800 uppercase tracking-wider block">
                                      {isAr ? 'ملف التعريف (Profile)' : 'Assigned Profile'}
                                    </span>
                                    <div className="bg-white px-3.5 py-2.5 rounded-xl border-2 border-black text-xs font-mono text-black font-bold">
                                      {creds.profile}
                                    </div>
                                  </div>
                                )}
                                {creds.pin !== 'N/A' && (
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-black text-neutral-800 uppercase tracking-wider block">
                                      {isAr ? 'رمز الدخول (PIN)' : 'Profile PIN'}
                                    </span>
                                    <div className="bg-white px-3.5 py-2.5 rounded-xl border-2 border-black text-xs font-mono text-black font-bold">
                                      {creds.pin}
                                    </div>
                                  </div>
                                )}

                              </div>
                            ) : (
                              /* Digital Key / Code */
                              <div className="space-y-1 text-start">
                                <span className="text-[10px] font-black text-neutral-800 uppercase tracking-wider block">
                                  {isAr ? 'مفتاح التفعيل الرقمي' : 'Digital License Key'}
                                </span>
                                <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border-2 border-black">
                                  <code className="text-xs text-black font-mono font-black break-all pr-2">{ord.product_key}</code>
                                  <button 
                                    onClick={() => handleCopy(ord.product_key || '', `key-${ord.id}`)}
                                    className="text-black hover:opacity-60 transition-colors cursor-pointer"
                                    title="Copy Key"
                                  >
                                    {copiedText === `key-${ord.id}` ? <Check className="w-4 h-4 text-black stroke-[3]" /> : <Copy className="w-4 h-4 stroke-[2.5]" />}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Instructions */}
                            {(creds?.instructions || creds?.instructionsAr) && (
                              <div className="pt-2 border-t-2 border-black text-xs text-neutral-800 leading-relaxed font-bold text-start">
                                <span className="font-black text-black block mb-1">
                                  {isAr ? 'تعليمات التفعيل والضمان الشامل:' : 'Instructions & Warranty:'}
                                </span>
                                <p>{isAr ? creds.instructionsAr : creds.instructions}</p>
                              </div>
                            )}
                          </>
                        )}

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            );
          })
        )}
      </div>

      {/* ── Receipt Modal ── */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        initialOrders={selectedReceiptOrder ? [selectedReceiptOrder] : undefined}
        onTrackOrder={(ordId) => {
          setIsReceiptOpen(false);
          setSelectedTrackingOrderId(ordId);
          setIsTrackingOpen(true);
        }}
      />

      {/* ── Order Tracking Modal ── */}
      <OrderTrackingModal
        isOpen={isTrackingOpen}
        onClose={() => setIsTrackingOpen(false)}
        orderId={selectedTrackingOrderId}
        onViewReceipt={() => {
          setIsTrackingOpen(false);
          setIsReceiptOpen(true);
        }}
      />

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MY WALLET TAB
// ─────────────────────────────────────────────────────────────────────────────

function WalletTab({ 
  profile, 
  transactions,
  onBalanceUpdated
}: { 
  profile: any; 
  transactions: any[]; 
  onBalanceUpdated?: () => void;
}) {
  const { language, formatPrice } = useLocale();
  const [topupAmount, setTopupAmount] = useState<number | ''>(20);
  const [currency, setCurrency] = useState<'usd' | 'egp' | 'sar'>('usd');
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [txFilter, setTxFilter] = useState<'all' | 'topup' | 'purchase' | 'referral'>('all');
  const isAr = language === 'ar';

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (txFilter === 'topup' && tx.amount <= 0) return false;
      if (txFilter === 'purchase' && tx.type !== 'purchase') return false;
      if (txFilter === 'referral' && tx.type !== 'credit_referral') return false;
      return true;
    });
  }, [transactions, txFilter]);

  const topupItems = useMemo(() => {
    const amt = typeof topupAmount === 'number' && topupAmount > 0 ? topupAmount : 10;
    return [
      {
        id: 'wallet_topup',
        product_id: 'wallet_topup',
        product: {
          id: 'wallet_topup',
          name: 'UpStore Wallet Top-Up',
          name_ar: 'شحن رصيد محفظة UpStore',
          our_price: amt,
          ourPrice: amt,
          price: amt,
          delivery_mode: 'wallet_topup',
        },
        quantity: 1,
      },
    ];
  }, [topupAmount]);

  const handleTopUp = () => {
    if (!topupAmount || topupAmount < 1) {
      setError(isAr ? 'الحد الأدنى للشحن هو 1$' : 'Minimum top up is $1');
      return;
    }
    setError('');
    setIsTopupModalOpen(true);
  };

  return (
    <div className="space-y-6 text-black">
      
      {/* Wallet Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Wallet Balance Card */}
        <div className="rounded-3xl border-2 border-black bg-white p-6 sm:p-8 flex flex-col justify-between h-64 shadow-[6px_6px_0px_0px_#000] relative overflow-hidden text-black">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                {isAr ? 'محفظة UpStore الرقمية' : 'UPSTORE DIGITAL WALLET'}
              </span>
              <span className="text-xs text-neutral-700 font-bold">
                {isAr ? 'الرصيد المتاح للشراء الفوري بـ 0 ثانية' : 'Available balance for instant 0ms checkout'}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#06D6A0] border-2 border-black flex items-center justify-center text-black shadow-[2px_2px_0px_0px_#000]">
              <CreditCard className="w-6 h-6 stroke-[2.5]" />
            </div>
          </div>

          <div>
            <div className="text-4xl sm:text-5xl font-black text-black font-mono leading-none tracking-tight">
              {formatPrice(profile?.wallet_balance || 0)}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-black bg-[#FFE600] text-black px-2 py-0.5 rounded-md border border-black uppercase">
                5% VAT
              </span>
              <span className="text-[11px] text-neutral-800 font-bold">
                {isAr ? 'دفع عالمي ومحلي وضمان كامل المدة مباشرة من رصيدك' : 'Global & local checkout directly via wallet'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-700 font-mono font-bold border-t-2 border-black pt-3">
            <span className="truncate max-w-[180px]">{profile?.display_name || 'UpStore Member'}</span>
            <span className="text-black font-black bg-[#4CC9F0] px-2 py-0.5 rounded-md border border-black">
              256-BIT SECURE
            </span>
          </div>
        </div>

        {/* Add Funds Box */}
        <div className="rounded-3xl border-2 border-black bg-white p-6 sm:p-8 shadow-[6px_6px_0px_0px_#000] space-y-4 text-black text-start">
          <div>
            <h3 className="text-sm sm:text-base font-black text-black mb-1 flex items-center gap-2">
              <Zap className="w-4 h-4 text-black stroke-[2.5]" />
              <span>{isAr ? 'شحن رصيد المحفظة الفوري' : 'Top Up Wallet Balance'}</span>
            </h3>
            <p className="text-xs text-neutral-700 font-bold">
              {isAr ? 'اختر المبلغ للشحن بكافة بوابات الدفع (بايبال، عربي باي، فيزا، إنستاباي وغيرها):' : 'Choose amount to add funds via all gateways (PayPal, Arabi Pay, Cards, InstaPay & more):'}
            </p>
          </div>

          {/* Presets */}
          <div className="grid grid-cols-4 gap-2">
            {[10, 25, 50, 100].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => {
                  setTopupAmount(amt);
                  setError('');
                }}
                className={`py-2.5 rounded-xl font-mono text-xs font-black border-2 border-black transition-all cursor-pointer shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 ${
                  topupAmount === amt
                    ? 'bg-[#FFE600] text-black shadow-[3px_3px_0px_0px_#000]'
                    : 'bg-white text-black hover:bg-neutral-100'
                }`}
              >
                ${amt}
              </button>
            ))}
          </div>

          {/* Custom Input + Currency + Pay Button */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 start-0 ps-3.5 flex items-center text-black font-mono text-xs font-black">$</span>
              <input
                type="number"
                min="1"
                value={topupAmount}
                onChange={(e) => {
                  setTopupAmount(e.target.value === '' ? '' : Number(e.target.value));
                  setError('');
                }}
                placeholder={isAr ? 'مبلغ مخصص...' : 'Custom amount...'}
                className="w-full ps-7 pe-3 py-2.5 bg-white border-2 border-black rounded-xl text-xs font-mono font-black text-black outline-none shadow-[2px_2px_0px_0px_#000]"
              />
            </div>

            <button
              onClick={handleTopUp}
              disabled={!topupAmount || topupAmount < 1}
              className="px-5 py-2.5 bg-[#06D6A0] hover:bg-[#05b385] text-black font-black text-xs rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] transition-all active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isAr ? 'متابعة الشحن' : 'Top Up Now'}</span>
            </button>
          </div>

          {error && <p className="text-xs text-rose-600 font-black">{error}</p>}
        </div>

      </div>

      {/* Smart Payment Modal for Wallet Top-Up */}
      <SmartPaymentModal
        isOpen={isTopupModalOpen}
        onClose={() => setIsTopupModalOpen(false)}
        items={topupItems}
        totalUsd={typeof topupAmount === 'number' && topupAmount > 0 ? topupAmount : 10}
        isWalletTopup={true}
      />

      {/* Transaction History Table */}
      <div className="rounded-3xl border-2 border-black bg-white overflow-hidden shadow-[6px_6px_0px_0px_#000] text-black">
        <div className="px-6 py-4 border-b-2 border-black bg-[#FFFDF9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm sm:text-base font-black text-black text-start">
            {isAr ? 'سجل المعاملات والعمليات' : 'Transaction History'}
          </h3>

          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]">
            {(['all', 'topup', 'purchase', 'referral'] as const).map((filterMode) => (
              <button
                key={filterMode}
                onClick={() => setTxFilter(filterMode)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-colors cursor-pointer ${
                  txFilter === filterMode ? 'bg-[#FFE600] text-black' : 'text-neutral-600 hover:text-black'
                }`}
              >
                {filterMode === 'all'
                  ? (isAr ? 'الكل' : 'All')
                  : filterMode === 'topup'
                  ? (isAr ? 'شحن' : 'Top-Up')
                  : filterMode === 'purchase'
                  ? (isAr ? 'مشتريات' : 'Purchases')
                  : (isAr ? 'مكافآت' : 'Rewards')}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y-2 divide-neutral-200">
          {filteredTransactions.length === 0 ? (
            <div className="py-10 px-4 text-center text-xs text-neutral-700 font-bold">
              {isAr ? 'لا توجد معاملات مطابقة مسجلة حتى الآن.' : 'No matching transactions recorded.'}
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const isCredit = tx.amount > 0;
              return (
                <div key={tx.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-neutral-50 transition-colors">
                  <div className="flex items-center gap-3 text-start">
                    <div className={`w-9 h-9 rounded-xl border-2 border-black flex items-center justify-center select-none shrink-0 shadow-[1.5px_1.5px_0px_0px_#000] ${
                      isCredit 
                        ? 'bg-[#06D6A0] text-black' 
                        : 'bg-rose-100 text-rose-700'
                    }`}>
                      {isCredit ? <ArrowUpRight className="w-4 h-4 stroke-[2.5]" /> : <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-black leading-tight">
                        {tx.label || (isCredit ? (isAr ? 'شحن رصيد المحفظة' : 'Wallet Top-Up') : (isAr ? 'شراء منتج رقمي' : 'Order Payment'))}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-neutral-600 font-mono font-bold mt-0.5">
                        <span>{new Date(tx.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</span>
                        {tx.reference_id && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[120px]">#{tx.reference_id.slice(0, 10)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`text-sm font-black font-mono ${isCredit ? 'text-black' : 'text-rose-600'}`}>
                    {isCredit ? '+' : '-'}{formatPrice(Math.abs(tx.amount))}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. REFERRAL TAB
// ─────────────────────────────────────────────────────────────────────────────

function ReferralTab({ 
  profile, 
  referredProfiles, 
  referralsCount, 
  referralStatus, 
  onReferralStatusChange, 
}: { 
  profile: any; 
  referredProfiles: any[]; 
  referralsCount: number; 
  referralStatus: any; 
  onReferralStatusChange: (nextStatus: any) => void; 
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [claimCode, setClaimCode] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const { language, formatPrice } = useLocale();
  const isAr = language === 'ar';
  
  const inviteLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/ref/${profile?.referral_code || ''}` 
    : '';

  const isReferralLocked = Boolean(
    referralStatus?.appliedFriendCode ||
    referralStatus?.profile?.referral_applied_code || 
    referralStatus?.profile?.referred_by ||
    referralStatus?.profile?.referral_locked_at ||
    profile?.referral_applied_code ||
    profile?.referred_by
  );

  useEffect(() => {
    const activeCode = 
      referralStatus?.appliedFriendCode || 
      referralStatus?.profile?.referral_applied_code || 
      referralStatus?.referrer?.referral_code || 
      profile?.referral_applied_code || 
      '';
    if (activeCode) {
      setClaimCode(activeCode);
    }
  }, [
    referralStatus?.appliedFriendCode,
    referralStatus?.profile?.referral_applied_code,
    referralStatus?.referrer?.referral_code,
    profile?.referral_applied_code,
  ]);

  const handleCopyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopiedLink(true);
      useToastStore.getState().success(
        isAr ? 'تم نسخ رابط الإحالة بنجاح!' : 'Referral invite link copied!',
        isAr ? 'جاهز للمشاركة الفورية' : 'Ready to share'
      );
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const handleClaimReferral = async () => {
    const clean = claimCode.trim().toUpperCase();
    if (!clean || isReferralLocked) return;

    if (profile?.referral_code && clean === profile.referral_code.toUpperCase()) {
      setClaimError(isAr ? 'لا يمكنك استخدام كود الدعوة الخاص بك.' : 'You cannot use your own referral code.');
      return;
    }

    setClaimLoading(true);
    setClaimError('');

    try {
      const response = await fetch('/api/referral/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: clean }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.status) {
        throw new Error(payload?.error || (isAr ? 'تعذر حفظ كود الدعوة.' : 'Failed to save referral code.'));
      }

      onReferralStatusChange(payload.status);
      setClaimCode(payload.status?.profile?.referral_applied_code || clean);
      useToastStore.getState().success(
        isAr ? 'تم ربط كود الدعوة بنجاح!' : 'Referral code linked!',
        isAr ? 'تم الحفظ' : 'Saved'
      );
    } catch (error) {
      setClaimError(error instanceof Error ? error.message : (isAr ? 'تعذر ربط كود الدعوة.' : 'Failed to save code.'));
    } finally {
      setClaimLoading(false);
    }
  };

  const nextMilestone = DASHBOARD_VAULT_MILESTONES.find((m) => m.count > referralsCount) || DASHBOARD_VAULT_MILESTONES[DASHBOARD_VAULT_MILESTONES.length - 1];
  const nextTarget = nextMilestone.count;
  const milestoneProgress = Math.min((referralsCount / nextTarget) * 100, 100);
  const totalEarnedCash = Math.floor(referralsCount / 3) * 1.00;
  const currentBatchFriends = referralsCount % 3;
  const invitesNeededForNextDollar = currentBatchFriends === 0 ? 3 : (3 - currentBatchFriends);

  return (
    <div className="space-y-6 text-black">
      
      {/* Top Banner */}
      <div className="rounded-3xl border-2 border-black bg-white p-6 sm:p-8 shadow-[6px_6px_0px_0px_#000] text-start">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FFE600] border-2 border-black text-black text-xs font-black uppercase tracking-wider mb-2 shadow-[1.5px_1.5px_0px_0px_#000]">
              <Gift className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isAr ? 'برنامج المكافآت والأرباح الذكية' : 'SMART REFERRAL REWARDS'}</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-black mb-1">
              {isAr ? 'اربح رصيد كاش حقيقي في محفظتك مع كل 3 دعوات!' : 'Earn Real Cash in Your Wallet for Every 3 Friends!'}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-800 font-bold max-w-xl leading-relaxed">
              {isAr
                ? 'ينزل الرصيد النقدي تلقائياً وفوراً في محفظتك لكل 3 أصدقاء يسجلون في المتجر، لتشتري بها أي اشتراك أو منتج رقمي فوراً!'
                : 'Direct cash is automatically credited to your on-site wallet for every 3 friends who register via your link!'}
            </p>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#06D6A0] border-2 border-black text-black text-xs font-black font-mono shrink-0 shadow-[2px_2px_0px_0px_#000]">
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>${totalEarnedCash.toFixed(2)} {isAr ? 'مودعة بالمحفظة' : 'Credited'}</span>
          </div>
        </div>
      </div>

      {/* 4 KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-start">
        <div className="rounded-2xl border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#000]">
          <span className="text-xs text-neutral-700 font-black uppercase block mb-1">{isAr ? 'إجمالي الأصدقاء المسجلين' : 'Total Invited Friends'}</span>
          <div className="text-2xl font-black text-black font-mono">{referralsCount}</div>
        </div>
        <div className="rounded-2xl border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#000]">
          <span className="text-xs text-black font-black uppercase block mb-1">{isAr ? 'أرباح المحفظة المودعة' : 'Wallet Cash Earned'}</span>
          <div className="text-2xl font-black text-black font-mono">${totalEarnedCash.toFixed(2)}</div>
        </div>
        <div className="rounded-2xl border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#000]">
          <span className="text-xs text-black font-black uppercase block mb-1">{isAr ? 'الدفعة الحالية' : 'Current Batch'}</span>
          <div className="text-2xl font-black text-black font-mono">{currentBatchFriends} / 3</div>
        </div>
        <div className="rounded-2xl border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#000]">
          <span className="text-xs text-black font-black uppercase block mb-1">{isAr ? 'متبقي للمكافأة القادمة' : 'For Next Reward'}</span>
          <div className="text-2xl font-black text-black font-mono">{invitesNeededForNextDollar} {isAr ? 'أصدقاء' : 'friends'}</div>
        </div>
      </div>

      {/* 6 Progressive Milestone Vaults */}
      <div className="rounded-3xl border-2 border-black bg-white p-5 sm:p-6 shadow-[6px_6px_0px_0px_#000] space-y-4 text-start">
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-black flex items-center gap-2">
              <Coins className="w-4 h-4 text-black stroke-[2.5]" />
              <span>{isAr ? 'خزائن المكافآت النقدية التراكمية' : 'Milestone Cash Vaults'}</span>
            </h3>
            <p className="text-xs text-neutral-700 font-bold">
              {isAr ? 'لكل 3 أصدقاء مسجلين = دفعة نقدية فورية بالمحفظة • تفتح الخزائن تلقائياً:' : '3 Verified Signups = Instant Cash Reward • Progressive Unlocks:'}
            </p>
          </div>
          <span className="text-xs font-mono font-black text-black bg-[#FFE600] border-2 border-black px-2.5 py-1 rounded-lg shadow-[1.5px_1.5px_0px_0px_#000]">
            {referralsCount} / {nextTarget}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {DASHBOARD_VAULT_MILESTONES.map((milestone) => {
            const isUnlocked = referralsCount >= milestone.count;
            const isNext = !isUnlocked && nextTarget === milestone.count;

            return (
              <div
                key={milestone.count}
                className={`p-3 rounded-2xl border-2 border-black flex flex-col justify-between text-center transition-all shadow-[2px_2px_0px_0px_#000] ${
                  isUnlocked
                    ? 'bg-[#06D6A0] text-black'
                    : isNext
                    ? 'bg-[#FFE600] text-black'
                    : 'bg-[#FFFDF9] text-black'
                }`}
              >
                <div className="flex items-center justify-between text-[9px] font-mono font-black text-black mb-1">
                  <span>{isAr ? milestone.tag_ar : milestone.tag_en}</span>
                  {isUnlocked ? <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" /> : <Lock className="w-3.5 h-3.5 stroke-[2.5]" />}
                </div>

                <div className="my-1.5">
                  <div className="text-[10px] text-neutral-800 font-bold">{isAr ? `${milestone.count} أصدقاء` : `${milestone.count} Invites`}</div>
                  <div className="text-lg font-black font-mono text-black">
                    ${milestone.reward}
                  </div>
                </div>

                <div className="text-[9px] font-black pt-1.5 border-t border-black">
                  {isUnlocked ? (
                    <span className="text-black">{isAr ? 'تم الإيداع' : 'CREDITED'}</span>
                  ) : (
                    <span className="text-neutral-800">{isAr ? `مطلوب ${milestone.count}` : `Req: ${milestone.count}`}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="pt-2">
          <div className="w-full bg-[#FFFDF9] border-2 border-black h-3 rounded-full overflow-hidden shadow-[1px_1px_0px_0px_#000]">
            <div 
              className="h-full bg-[#06D6A0] transition-all duration-500"
              style={{ width: `${milestoneProgress}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-xs text-neutral-800 font-bold mt-1.5">
            <span>
              {isAr 
                ? `الدفعة الحالية: ${currentBatchFriends} / 3 • باقي ${invitesNeededForNextDollar} أصدقاء لإيداع المكافأة القادمة!`
                : `Current Batch: ${currentBatchFriends} / 3 • ${invitesNeededForNextDollar} friend(s) left for next reward!`}
            </span>
            <span className="font-mono font-black">{referralsCount} / {nextTarget}</span>
          </div>
        </div>
      </div>

      {/* Share Box */}
      <div className="rounded-3xl border-2 border-black bg-white p-5 sm:p-6 shadow-[6px_6px_0px_0px_#000] space-y-3 text-start">
        <h3 className="text-sm sm:text-base font-black text-black flex items-center gap-2">
          <Share2 className="w-4 h-4 text-black stroke-[2.5]" />
          <span>{isAr ? 'رابط الإحالة الخاص بك' : 'Your Invite Link'}</span>
        </h3>

        <div className="flex flex-col sm:flex-row gap-2">
          <input 
            type="text" 
            value={inviteLink}
            readOnly
            className="flex-1 px-3.5 py-2.5 bg-[#FFFDF9] border-2 border-black rounded-xl text-xs font-mono font-bold text-black outline-none select-all shadow-[2px_2px_0px_0px_#000]"
          />
          <div className="flex gap-2">
            <button 
              onClick={handleCopyLink}
              className="px-4 py-2.5 bg-[#FFE600] hover:bg-[#ebd300] text-black font-black text-xs rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-1.5"
            >
              {copiedLink ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4 stroke-[2.5]" />}
              <span>{copiedLink ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الرابط' : 'Copy')}</span>
            </button>

            <button 
              onClick={() => setIsQRModalOpen(true)}
              className="px-3 py-2.5 bg-white hover:bg-neutral-100 border-2 border-black text-black rounded-xl shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
              title="QR Code"
            >
              <QrCode className="w-4 h-4 text-black stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>

      {/* Claim Friend's Referral Code Box */}
      <div className="rounded-3xl border-2 border-black bg-white p-5 sm:p-6 shadow-[6px_6px_0px_0px_#000] space-y-3 text-start">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm sm:text-base font-black text-black flex items-center gap-2">
            <Gift className="w-4 h-4 text-black stroke-[2.5]" />
            <span>{isAr ? 'ربط كود دعوة صديقك' : 'Claim Friend Referral Code'}</span>
          </h3>
          {isReferralLocked && (
            <span className="text-[11px] font-black text-black bg-[#06D6A0] border border-black px-2.5 py-0.5 rounded-lg shadow-[1px_1px_0px_0px_#000] flex items-center gap-1">
              <Lock className="w-3 h-3 stroke-[3]" />
              <span>{isAr ? 'مقفل ومعتمد' : 'Locked'}</span>
            </span>
          )}
        </div>

        <p className="text-xs text-neutral-700 font-bold">
          {isAr 
            ? 'إذا قمت بالتسجيل في الموقع مباشرة بدون رابط دعوة، يمكنك إدخال كود صديقك الذي دعاك لتوثيق المكافأة له.'
            : 'If you registered directly without an invite link, enter your friend\'s code below to link your account.'}
        </p>

        {isReferralLocked ? (
          <div className="p-4 rounded-2xl bg-[#06D6A0]/10 border-2 border-black flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[3px_3px_0px_0px_#000]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#06D6A0] border-2 border-black flex items-center justify-center text-black shrink-0 shadow-[1.5px_1.5px_0px_0px_#000]">
                <Lock className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-xs text-neutral-800 font-bold block mb-0.5">
                  {isAr ? 'كود الصديق المرتبط بحسابك:' : 'Linked Referrer Code:'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-mono font-black text-black bg-white px-3 py-1 rounded-xl border-2 border-black tracking-wider shadow-[1.5px_1.5px_0px_0px_#000] inline-flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-neutral-800 stroke-[3]" />
                    <span>{claimCode || referralStatus?.appliedFriendCode || 'VERIFIED'}</span>
                  </span>
                  <span className="text-[10px] font-black bg-[#06D6A0] text-black px-2 py-0.5 rounded border border-black uppercase">
                    {isAr ? 'مقفل ومعتمد' : 'LOCKED'}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-xs font-black text-neutral-900 bg-white px-3 py-1.5 rounded-xl border border-black shadow-[1.5px_1.5px_0px_0px_#000]">
              {isAr ? 'تم تثبيت هذا الكود في حسابك بنجاح ولا يمكن تغييره' : 'Locked per security policy (1 code per user)'}
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <input 
              type="text" 
              value={claimCode}
              onChange={(e) => {
                setClaimCode(e.target.value.toUpperCase());
                setClaimError('');
              }}
              placeholder={isAr ? 'أدخل كود دعوة صديقك (مثال: ALEX884)...' : 'Enter friend\'s referral code...'}
              className="flex-1 px-3.5 py-2.5 bg-[#FFFDF9] border-2 border-black rounded-xl text-xs font-mono font-black text-black outline-none placeholder:text-neutral-500 shadow-[2px_2px_0px_0px_#000] uppercase tracking-wider"
              disabled={claimLoading}
            />
            <button 
              onClick={handleClaimReferral}
              disabled={claimLoading || !claimCode.trim()}
              className="px-5 py-2.5 bg-[#06D6A0] hover:bg-[#05b385] text-black font-black text-xs rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              {claimLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />}
              <span>{isAr ? 'تأكيد وربط الكود' : 'Claim Code'}</span>
            </button>
          </div>
        )}

        {claimError && (
          <p className="text-xs text-rose-600 font-black">{claimError}</p>
        )}
      </div>

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        url={inviteLink}
        code={profile?.referral_code || ''}
        isAr={isAr}
      />

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. SUPPORT & HELPDESK TAB (Smart Tickets + AI Assistant Integration)
// ─────────────────────────────────────────────────────────────────────────────

function SupportTab({ 
  profile,
  orders = [],
  initialDraft,
  onOpenAiModal
}: { 
  profile: any;
  orders?: any[];
  initialDraft?: { subject: string; message: string; category: string; orderId?: string } | null;
  onOpenAiModal: () => void;
}) {
  const { language } = useLocale();
  const isAr = language === 'ar';
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  
  // Ticket form state
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('ضمان واستبدال المنتج');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [priority, setPriority] = useState<'Normal' | 'High' | 'Urgent'>('Normal');
  const [message, setMessage] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  useEffect(() => {
    if (initialDraft) {
      if (initialDraft.subject) setSubject(initialDraft.subject);
      if (initialDraft.message) setMessage(initialDraft.message);
      if (initialDraft.category) setCategory(initialDraft.category);
      if (initialDraft.orderId) setSelectedOrderId(initialDraft.orderId);
    }
  }, [initialDraft]);

  const fetchTickets = async () => {
    setLoadingTickets(true);
    try {
      const res = await fetch('/api/support/tickets');
      const data = await res.json();
      if (res.ok && Array.isArray(data.tickets)) {
        setTickets(data.tickets);
      }
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setErrorMsg(isAr ? 'يرجى ملء كافة الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    setSubmitLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          category,
          message: message.trim(),
          order_id: selectedOrderId || undefined,
          priority,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit ticket');
      }

      setSuccessMsg(isAr ? `تم فتح التذكرة #${data.ticket?.ticket_id || ''} بنجاح! سيتم المتابعة عبر support@upstore.one` : 'Ticket created successfully!');
      setSubject('');
      setMessage('');
      setSelectedOrderId('');
      setPriority('Normal');
      
      // Refresh tickets list
      fetchTickets();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while creating ticket');
    } finally {
      setSubmitLoading(false);
    }
  };

  const CATEGORIES = [
    { ar: 'ضمان واستبدال المنتج', en: 'Product Warranty & Replacement' },
    { ar: 'مشكلة في كود التفعيل أو الحساب', en: 'Activation Key & License Issue' },
    { ar: 'المدفوعات وشحن المحفظة', en: 'Billing & Wallet Funds' },
    { ar: 'الوصول للحساب وتغيير البيانات', en: 'Account Access & Security' },
    { ar: 'استفسار عام أو طلب منتج جديد', en: 'General Inquiry & Requests' },
  ];

  return (
    <div className="space-y-6 text-black">
      
      {/* ── AI Bot Support Hero Banner ── */}
      <div className="rounded-3xl border-2 border-black bg-[#FFE600] p-6 sm:p-8 shadow-[6px_6px_0px_0px_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-start">
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black text-[#FFE600] text-xs font-black uppercase tracking-wider shadow-[1.5px_1.5px_0px_0px_#000]">
            <Bot className="w-4 h-4 stroke-[2.5]" />
            <span>{isAr ? 'الدعم الذكي الفوري بالـ AI' : '24/7 AI SMART SUPPORT'}</span>
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-black">
            {isAr ? 'تحدث مباشرة مع البوت الذكي للدعم الفني' : 'Instant AI Troubleshooting & Resolution'}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-900 font-bold max-w-xl leading-relaxed">
            {isAr
              ? 'يجيب على استفساراتك فوراً، يوضح خطوات التفعيل، ويشخص أي مشكلة ويحولها لتذكرة رسمية بضغطة واحدة.'
              : 'Get instant answers for warranty, activation, and wallet questions in seconds.'}
          </p>
        </div>

        <button
          onClick={onOpenAiModal}
          className="px-6 py-4 bg-white hover:bg-neutral-100 text-black font-black text-xs uppercase tracking-wider rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Sparkles className="w-4 h-4 stroke-[2.5]" />
          <span>{isAr ? 'تواصل مع البوت الذكي للدعم' : 'Launch AI Support Bot'}</span>
        </button>
      </div>

      {/* ── Multi-Channel Support Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-start">
        
        {/* Official Email Routing Box */}
        <div className="rounded-3xl border-2 border-black bg-white p-5 shadow-[4px_4px_0px_0px_#000] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#FFFDF9] border-2 border-black flex items-center justify-center text-black shrink-0 shadow-[1.5px_1.5px_0px_0px_#000]">
              <Mail className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-black text-neutral-700 uppercase tracking-wider block">
                {isAr ? 'البريد الرسمي المعتمد للمتجر' : 'Official Support Email'}
              </span>
              <code className="text-xs sm:text-sm font-black font-mono text-black select-all">
                support@upstore.one
              </code>
            </div>
          </div>
          <a
            href="mailto:support@upstore.one"
            className="px-3.5 py-2 bg-[#FFFDF9] hover:bg-[#FFE600] border-2 border-black rounded-xl text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] transition-colors shrink-0"
          >
            {isAr ? 'مراسلة' : 'Email'}
          </a>
        </div>

        {/* Telegram Direct Support Box */}
        <div className="rounded-3xl border-2 border-black bg-white p-5 shadow-[4px_4px_0px_0px_#000] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#4CC9F0] border-2 border-black flex items-center justify-center text-black shrink-0 shadow-[1.5px_1.5px_0px_0px_#000]">
              <Headset className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-black text-neutral-700 uppercase tracking-wider block">
                {isAr ? 'الدعم المباشر على تيليجرام (24/7)' : 'Live Telegram Helpdesk'}
              </span>
              <span className="text-xs sm:text-sm font-black text-black">
                @UpStore_Support_bot
              </span>
            </div>
          </div>
          <a
            href="https://t.me/UpStore_Support_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-[#4CC9F0] hover:bg-[#3db6db] border-2 border-black rounded-xl text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] transition-colors shrink-0 flex items-center gap-1"
          >
            <span>{isAr ? 'فتح المحادثة' : 'Chat'}</span>
            <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
          </a>
        </div>

      </div>

      {/* ── Create Smart Ticket Form ── */}
      <div className="rounded-3xl border-2 border-black bg-white p-6 sm:p-8 shadow-[6px_6px_0px_0px_#000] space-y-5 text-start">
        <div>
          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
            <h3 className="text-base sm:text-lg font-black text-black flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-black stroke-[2.5]" />
              <span>{isAr ? 'فتح تذكرة دعم فني ذكية' : 'Submit a Smart Support Ticket'}</span>
            </h3>
            <span className="text-[11px] font-black text-black bg-[#06D6A0] border border-black px-2.5 py-0.5 rounded-lg shadow-[1px_1px_0px_0px_#000]">
              {isAr ? 'مرتبطة بـ support@upstore.one' : 'Routed to support@upstore.one'}
            </span>
          </div>
          <p className="text-xs text-neutral-700 font-bold">
            {isAr
              ? 'املأ تفاصيل مشكلتك وسيقوم فريق الدعم الفني بمراجعتها فوراً وإرسال التحديثات على بريدك الإلكتروني ولوحة التحكم:'
              : 'Fill out your request details. Our technical team responds promptly via dashboard and support@upstore.one:'}
          </p>
        </div>

        {successMsg && (
          <div className="p-4 rounded-2xl bg-[#06D6A0] border-2 border-black text-black text-xs font-black flex items-center gap-2.5 shadow-[2px_2px_0px_0px_#000]">
            <CheckCircle2 className="w-5 h-5 stroke-[2.5] shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-600 text-rose-700 text-xs font-black shadow-[2px_2px_0px_0px_#000]">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmitTicket} className="space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Subject */}
            <div>
              <label className="text-[11px] font-black text-neutral-800 uppercase tracking-wider block mb-1.5">
                {isAr ? 'موضوع التذكرة' : 'Subject'}
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={isAr ? 'مثال: مشكلة في تفعيل اشتراك نتفلكس...' : 'e.g. Netflix activation assistance'}
                required
                className="w-full px-3.5 py-2.5 bg-[#FFFDF9] border-2 border-black rounded-xl text-xs font-bold text-black outline-none shadow-[2px_2px_0px_0px_#000]"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-[11px] font-black text-neutral-800 uppercase tracking-wider block mb-1.5">
                {isAr ? 'فئة التذكرة / المشكلة' : 'Category'}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FFFDF9] border-2 border-black rounded-xl text-xs font-black text-black outline-none shadow-[2px_2px_0px_0px_#000] cursor-pointer"
              >
                {CATEGORIES.map((c, i) => (
                  <option key={i} value={c.ar}>
                    {isAr ? c.ar : c.en}
                  </option>
                ))}
              </select>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Link Order ID if available */}
            <div>
              <label className="text-[11px] font-black text-neutral-800 uppercase tracking-wider block mb-1.5">
                {isAr ? 'ربط التذكرة بطلب سابق (اختياري)' : 'Link to Specific Order (Optional)'}
              </label>
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FFFDF9] border-2 border-black rounded-xl text-xs font-bold text-black outline-none shadow-[2px_2px_0px_0px_#000] cursor-pointer font-mono"
              >
                <option value="">{isAr ? '-- غير مرتبط بطلب محدد --' : '-- None / General --'}</option>
                {orders.map((ord) => {
                  const prodName = ord.products?.name_ar || ord.products?.name || 'Digital Item';
                  return (
                    <option key={ord.id} value={ord.id}>
                      #{ord.id.slice(0, 8).toUpperCase()} — {prodName} (${ord.amount})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Priority Level */}
            <div>
              <label className="text-[11px] font-black text-neutral-800 uppercase tracking-wider block mb-1.5">
                {isAr ? 'درجة الأهمية' : 'Priority Level'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Normal', labelAr: 'عادي', labelEn: 'Normal', color: 'bg-[#FFFDF9]' },
                  { id: 'High', labelAr: 'أولوية عالية', labelEn: 'High', color: 'bg-[#FFE600]' },
                  { id: 'Urgent', labelAr: 'عاجل جداً', labelEn: 'Urgent', color: 'bg-rose-100' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id as any)}
                    className={`py-2 rounded-xl text-xs font-black border-2 border-black transition-all cursor-pointer shadow-[1.5px_1.5px_0px_0px_#000] ${
                      priority === p.id ? `${p.color} text-black font-black shadow-[2.5px_2.5px_0px_0px_#000]` : 'bg-white text-neutral-700'
                    }`}
                  >
                    {isAr ? p.labelAr : p.labelEn}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Details */}
          <div>
            <label className="text-[11px] font-black text-neutral-800 uppercase tracking-wider block mb-1.5">
              {isAr ? 'تفاصيل المشكلة أو الاستفسار' : 'Detailed Message'}
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isAr ? 'اشرح ما حدث بالتفصيل لنتمكن من مساعدتك واستبدال الحساب إذا لزم الأمر...' : 'Describe your request or issue with full details...'}
              required
              className="w-full px-3.5 py-2.5 bg-[#FFFDF9] border-2 border-black rounded-xl text-xs font-bold text-black outline-none shadow-[2px_2px_0px_0px_#000] resize-none font-sans"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <p className="text-[11px] text-neutral-700 font-bold">
              {isAr ? '• سيتم إرسال إشعار فوري لـ support@upstore.one وفريق تيليجرام' : '• Instant alert forwarded to support@upstore.one'}
            </p>

            <button
              type="submit"
              disabled={submitLoading}
              className="px-6 py-3 bg-[#06D6A0] hover:bg-[#05b385] text-black font-black text-xs rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] transition-all active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shrink-0"
            >
              {submitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 stroke-[2.5]" />}
              <span>{submitLoading ? (isAr ? 'جاري الإرسال...' : 'Submitting...') : (isAr ? 'إرسال التذكرة الآن' : 'Submit Ticket')}</span>
            </button>
          </div>

        </form>
      </div>

      {/* ── My Tickets History ── */}
      <div className="rounded-3xl border-2 border-black bg-white overflow-hidden shadow-[6px_6px_0px_0px_#000] text-black">
        <div className="px-6 py-4 border-b-2 border-black bg-[#FFFDF9] flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-black text-black text-start">
              {isAr ? 'سجل تذاكر الدعم السابقة' : 'My Support Tickets'}
            </h3>
            <p className="text-xs text-neutral-700 font-bold">
              {isAr ? 'متابعة حالة التذاكر وردود فريق الدعم الفني' : 'Track resolution status of your submitted tickets'}
            </p>
          </div>
          <button
            onClick={fetchTickets}
            disabled={loadingTickets}
            className="p-2 rounded-xl bg-white hover:bg-neutral-100 border-2 border-black text-black shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            title="Refresh"
          >
            <RotateCcw className={`w-3.5 h-3.5 stroke-[2.5] ${loadingTickets ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="divide-y-2 divide-neutral-200">
          {loadingTickets ? (
            <div className="py-10 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-black" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="py-10 px-4 text-center text-xs text-neutral-700 font-bold">
              {isAr ? 'لا توجد تذاكر دعم مفتوحة حالياً.' : 'No support tickets recorded.'}
            </div>
          ) : (
            tickets.map((t) => {
              const isExpanded = expandedTicketId === t.id;
              const isOpen = t.status === 'Open';

              return (
                <div key={t.id} className="p-4 sm:p-5 hover:bg-neutral-50 transition-colors">
                  <div 
                    onClick={() => setExpandedTicketId(isExpanded ? null : t.id)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 text-start">
                      <div className="w-10 h-10 rounded-xl bg-[#FFFDF9] border-2 border-black flex items-center justify-center text-black shrink-0 shadow-[1.5px_1.5px_0px_0px_#000]">
                        <Ticket className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-black text-black leading-tight">
                            {t.subject}
                          </h4>
                          {t.priority === 'Urgent' && (
                            <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 text-[9px] font-black rounded border border-rose-600">
                              عاجل
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-neutral-600 font-mono font-bold mt-0.5">
                          <span>#{t.ticket_id}</span>
                          <span>•</span>
                          <span>{t.category}</span>
                          <span>•</span>
                          <span>{new Date(t.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-between sm:justify-end">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border border-black shadow-[1px_1px_0px_0px_#000] ${
                        isOpen
                          ? 'bg-[#FFE600] text-black'
                          : t.status === 'Resolved' || t.status === 'Closed'
                          ? 'bg-[#06D6A0] text-black'
                          : 'bg-[#4CC9F0] text-black'
                      }`}>
                        {isOpen ? (isAr ? 'مفتوحة وقيد المعالجة' : 'Open') : (isAr ? 'تم الحل' : t.status)}
                      </span>

                      <span className="text-xs font-black text-black">
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>

                  {/* Expandable Message */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                        animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 rounded-2xl bg-[#FFFDF9] border-2 border-black space-y-2 text-start text-xs font-bold text-neutral-800 leading-relaxed shadow-[2px_2px_0px_0px_#000]">
                          <div className="flex items-center justify-between border-b border-neutral-300 pb-2">
                            <span className="font-black text-black">
                              {isAr ? 'نص الرسالة المرسلة:' : 'Message Payload:'}
                            </span>
                            {t.order_id && (
                              <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-black">
                                Order: #{t.order_id.slice(0, 8)}
                              </span>
                            )}
                          </div>
                          <p className="whitespace-pre-wrap">{t.message}</p>
                          <div className="pt-2 border-t border-neutral-300 text-[11px] text-neutral-600 font-bold flex items-center justify-between">
                            <span>{isAr ? 'البريد المرتبط: support@upstore.one' : 'Email: support@upstore.one'}</span>
                            <span>{new Date(t.created_at).toLocaleString(isAr ? 'ar-EG' : 'en-US')}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. SETTINGS TAB (Profile + Direct Password Change)
// ─────────────────────────────────────────────────────────────────────────────

function SettingsTab({ profile }: { profile: any }) {
  const { language } = useLocale();
  const isAr = language === 'ar';

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [country, setCountry] = useState(profile?.country || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Password update state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ 
        display_name: displayName,
        phone: phone,
        country: country
      })
      .eq('id', profile.id);

    setIsSaving(false);
    if (!error) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordError(isAr ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordError('');
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    setIsUpdatingPassword(false);
    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    }
  };

  return (
    <div className="space-y-6 text-black">
      
      {/* Profile Form */}
      <div className="rounded-3xl border-2 border-black bg-white p-6 sm:p-8 shadow-[6px_6px_0px_0px_#000] space-y-6 text-start">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-black flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-black stroke-[2.5]" />
            <span>{isAr ? 'المعلومات الشخصية' : 'Personal Profile Information'}</span>
          </h2>
          <p className="text-xs text-neutral-700 font-bold">
            {isAr ? 'تحديث اسم العرض، رقم الهاتف، ومعلومات حسابك الأساسية:' : 'Update your display name, phone, and contact preferences:'}
          </p>
        </div>

        {saveSuccess && (
          <div className="p-3 rounded-xl bg-[#06D6A0] border-2 border-black text-black text-xs font-black flex items-center gap-2 shadow-[2px_2px_0px_0px_#000]">
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>{isAr ? 'تم حفظ التعديلات بنجاح!' : 'Profile updated successfully!'}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div>
              <label className="text-[11px] font-black text-neutral-800 uppercase tracking-wider block mb-1.5">
                {isAr ? 'الاسم المعروض' : 'Display Name'}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border-2 border-black rounded-xl text-xs font-bold text-black outline-none shadow-[2px_2px_0px_0px_#000]"
              />
            </div>

            <div>
              <label className="text-[11px] font-black text-neutral-800 uppercase tracking-wider block mb-1.5">
                {isAr ? 'البريد الإلكتروني (غير قابل للتعديل)' : 'Email (Fixed)'}
              </label>
              <input
                type="email"
                disabled
                value={profile?.email || ''}
                className="w-full px-3.5 py-2.5 bg-neutral-100 border-2 border-black rounded-xl text-xs font-mono text-neutral-700 cursor-not-allowed outline-none select-none font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-black text-neutral-800 uppercase tracking-wider block mb-1.5">
                {isAr ? 'رقم الهاتف' : 'Phone Number'}
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+20 100 000 0000"
                className="w-full px-3.5 py-2.5 bg-white border-2 border-black rounded-xl text-xs font-bold text-black outline-none shadow-[2px_2px_0px_0px_#000]"
              />
            </div>

            <div>
              <label className="text-[11px] font-black text-neutral-800 uppercase tracking-wider block mb-1.5">
                {isAr ? 'الدولة / المنطقة' : 'Country'}
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Egypt / Saudi Arabia / Global"
                className="w-full px-3.5 py-2.5 bg-white border-2 border-black rounded-xl text-xs font-bold text-black outline-none shadow-[2px_2px_0px_0px_#000]"
              />
            </div>

          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-[#06D6A0] hover:bg-[#05b385] text-black font-black text-xs rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] transition-all active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
              <span>{isSaving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ التعديلات' : 'Save Changes')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Box */}
      <div className="rounded-3xl border-2 border-black bg-white p-6 sm:p-8 shadow-[6px_6px_0px_0px_#000] space-y-6 text-start">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-black flex items-center gap-2 mb-1">
            <Lock className="w-4 h-4 text-black stroke-[2.5]" />
            <span>{isAr ? 'تغيير كلمة المرور' : 'Update Security Password'}</span>
          </h2>
          <p className="text-xs text-neutral-700 font-bold">
            {isAr ? 'عيّن كلمة مرور قوية لحماية مشترياتك ورصيد محفظتك الرقمية:' : 'Set a strong password to protect your digital licenses and funds:'}
          </p>
        </div>

        {passwordSuccess && (
          <div className="p-3 rounded-xl bg-[#06D6A0] border-2 border-black text-black text-xs font-black flex items-center gap-2 shadow-[2px_2px_0px_0px_#000]">
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>{isAr ? 'تم تحديث كلمة المرور بنجاح!' : 'Password updated successfully!'}</span>
          </div>
        )}

        {passwordError && (
          <div className="p-3 rounded-xl bg-rose-50 border-2 border-rose-600 text-rose-700 text-xs font-black shadow-[2px_2px_0px_0px_#000]">
            {passwordError}
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-black text-neutral-800 uppercase tracking-wider block mb-1.5">
                {isAr ? 'كلمة المرور الجديدة' : 'New Password'}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-white border-2 border-black rounded-xl text-xs font-bold text-black outline-none shadow-[2px_2px_0px_0px_#000]"
              />
            </div>

            <div>
              <label className="text-[11px] font-black text-neutral-800 uppercase tracking-wider block mb-1.5">
                {isAr ? 'تأكيد كلمة المرور' : 'Confirm New Password'}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-white border-2 border-black rounded-xl text-xs font-bold text-black outline-none shadow-[2px_2px_0px_0px_#000]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isUpdatingPassword || !newPassword}
              className="px-5 py-2.5 bg-[#FFE600] hover:bg-[#ebd300] text-black font-black text-xs rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] transition-all active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {isUpdatingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5 stroke-[2.5]" />}
              <span>{isUpdatingPassword ? (isAr ? 'جاري التحديث...' : 'Updating...') : (isAr ? 'تحديث كلمة المرور' : 'Update Password')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ─── HYPER-ADAPTIVE UX SETTINGS ─── */}
      <HyperAdaptiveSettingsCard isAr={isAr} />

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hyper-Adaptive AI Settings Card
// ─────────────────────────────────────────────────────────────────────────────

function HyperAdaptiveSettingsCard({ isAr }: { isAr: boolean }) {
  const {
    enabled,
    setEnabled,
    aiActivityAr,
    aiActivityEn,
    cognitiveLoad,
    healedIssuesCount,
    detectedPersona,
  } = useHyperAdaptiveStore();

  const flowScore = Math.max(10, 100 - cognitiveLoad);

  return (
    <div className="rounded-3xl border-2 border-black bg-white p-6 sm:p-8 shadow-[6px_6px_0px_0px_#000] space-y-6 text-start">
      
      {/* Header with Single Master Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-black pb-5">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#FFE600] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_#000] shrink-0">
            <Brain className="w-6 h-6 text-black stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-black">
                {isAr ? 'الذكاء الاصطناعي التكيفي الفائق (Hyper-Adaptive AI)' : 'Hyper-Adaptive AI Mind Engine'}
              </h2>
              <span className="px-2 py-0.5 bg-[#06D6A0] border border-black text-[10px] font-black text-black rounded-md flex items-center gap-1 shadow-[1px_1px_0px_0px_#000]">
                <Sparkles className="w-3 h-3 stroke-[2.5]" />
                <span>{isAr ? 'معالجة بالذكاء الاصطناعي 100%' : '100% Autonomous AI'}</span>
              </span>
              <span className="px-2 py-0.5 bg-[#4CC9F0] border border-black text-[10px] font-black text-black rounded-md flex items-center gap-1 shadow-[1px_1px_0px_0px_#000]">
                <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                <span>{isAr ? 'محفوظ سحابياً بحسابك' : 'Cloud DB Synced'}</span>
              </span>
            </div>
            <p className="text-xs text-neutral-700 font-bold mt-0.5 max-w-xl">
              {isAr
                ? 'يقرأ أسلوب تفاعلك وحالتك الإدراكية وسرعة حركتك في الخلفية، ويحل مشاكل الموقع تلقائياً قبل وقوعها ويهيئ المتجر بالكامل لراحتك النفسية وسرعتك.'
                : 'Autonomously senses your cognitive pace, device ergonomics, and self-heals technical glitches before they impact your shopping experience.'}
            </p>
          </div>
        </div>

        {/* Single Autonomous Master Toggle Button */}
        <button
          type="button"
          onClick={() => setEnabled(!enabled)}
          className={`px-5 py-3 rounded-2xl border-2 border-black font-black text-xs transition-all shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer flex items-center gap-2.5 shrink-0 ${
            enabled ? 'bg-[#06D6A0] text-black hover:bg-[#05b385]' : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'
          }`}
        >
          <span className={`w-3 h-3 rounded-full border border-black ${enabled ? 'bg-black animate-pulse' : 'bg-neutral-400'}`} />
          <span className="text-sm font-black uppercase tracking-wider">
            {enabled ? (isAr ? 'مُفعّل بالذكاء الاصطناعي' : 'AI Active (Enabled)') : (isAr ? 'معطل' : 'Disabled')}
          </span>
        </button>
      </div>

      {/* Live AI Status, Self-Healing & Insights */}
      {enabled ? (
        <div className="bg-[#FFFDF9] border-2 border-black rounded-2xl p-5 space-y-4 shadow-[3px_3px_0px_0px_#000]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#06D6A0] animate-ping shrink-0" />
              <span className="text-xs font-black text-black">
                {isAr ? 'ما يفعله الذكاء الاصطناعي الآن من أجلك:' : 'What the AI is doing for you right now:'}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-black rounded-lg text-xs font-black text-black shadow-[1px_1px_0px_0px_#000]">
                <Activity className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                <span>{isAr ? 'المشاكل المحلولة ذاتياً:' : 'Self-Healed:'}</span>
                <span className="font-mono font-black text-[#06D6A0]">{healedIssuesCount}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FFE600] border border-black rounded-lg text-xs font-mono font-black text-black shadow-[1px_1px_0px_0px_#000]">
                <span>{isAr ? 'الانسيابية:' : 'Flow:'} {flowScore}%</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-white border-2 border-black rounded-xl text-xs font-black text-black flex items-center gap-3 shadow-[1.5px_1.5px_0px_0px_#000]">
            <div className="p-2 bg-[#4CC9F0] border-2 border-black rounded-lg shrink-0">
              <Sparkles className="w-4 h-4 text-black stroke-[2.5]" />
            </div>
            <span className="leading-relaxed">
              {isAr ? aiActivityAr : aiActivityEn}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] font-bold text-neutral-700">
            <div className="p-2.5 bg-white border-2 border-black rounded-xl flex items-center gap-2">
              <Zap className="w-4 h-4 text-black fill-[#FFE600] shrink-0" />
              <span>{isAr ? 'التعافي الذاتي وحل المشاكل مسبقاً' : 'Preemptive Self-Healing & Fast Retries'}</span>
            </div>
            <div className="p-2.5 bg-white border-2 border-black rounded-xl flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-black shrink-0" />
              <span>{isAr ? 'تبديد التردد وإبراز الضمانات' : 'Friction & Hesitation Relief'}</span>
            </div>
            <div className="p-2.5 bg-white border-2 border-black rounded-xl flex items-center gap-2">
              <Eye className="w-4 h-4 text-black shrink-0" />
              <span>{isAr ? 'التكيف مع العين والبيئة وحركة اليد' : 'Ergonomic & Ocular Tuning'}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-neutral-100 border-2 border-dashed border-neutral-400 rounded-2xl text-xs text-neutral-600 font-bold text-center">
          {isAr
            ? 'نظام Hyper-Adaptive AI معطل حالياً. انقر على الزر أعلاه لتفعيله والاستمتاع بتجربة تتكيف تلقائياً مع عقلك وتحل أي عائق فوراً.'
            : 'Hyper-Adaptive AI is currently paused. Toggle the button above to resume autonomous mind-reading & self-healing optimization.'}
        </div>
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. SELLER TAB (Merchant Portal Info)
// ─────────────────────────────────────────────────────────────────────────────

function SellerTab() {
  const { language } = useLocale();
  const isAr = language === 'ar';

  return (
    <div className="space-y-6 text-black">
      <div className="rounded-3xl border-2 border-black bg-white p-6 sm:p-8 shadow-[6px_6px_0px_0px_#000] text-center max-w-xl mx-auto space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[#FFE600] border-2 border-black flex items-center justify-center text-black mx-auto shadow-[2px_2px_0px_0px_#000]">
          <UserPlus className="w-7 h-7 stroke-[2.5]" />
        </div>
        
        <div>
          <h2 className="text-lg sm:text-xl font-black text-black mb-1.5">
            {isAr ? 'بوابة التجار والمزودين' : 'Merchant & Vendor Portal'}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-800 font-bold leading-relaxed">
            {isAr
              ? 'تتيح بوابة التجار بيع التراخيص والمفاتيح الرقمية بنظام التسليم الآلي الفوري مع عمولات مخفضة وسحب أرباح سلس.'
              : 'Our vendor portal allows verified merchants to automate digital license delivery with competitive fee rates.'}
          </p>
        </div>

        <div className="pt-2">
          <a
            href="https://t.me/UpStore_Support_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#06D6A0] hover:bg-[#05b385] text-black font-black text-xs rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] transition-all active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
          >
            <span>{isAr ? 'تقديم طلب انضمام كتاجر عبر الدعم' : 'Apply as Merchant via Support'}</span>
            <ExternalLink className="w-4 h-4 stroke-[2.5]" />
          </a>
        </div>
      </div>
    </div>
  );
}
