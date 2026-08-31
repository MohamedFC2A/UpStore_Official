'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { 
  Bell, 
  PackageCheck, 
  Tag, 
  AlertCircle, 
  Sparkles, 
  ChevronRight, 
  ChevronDown, 
  Check, 
  Wrench, 
  TrendingUp, 
  Megaphone, 
  History, 
  Info, 
  FileText, 
  Compass, 
  CreditCard, 
  ArrowRight, 
  ShoppingBag, 
  Clock, 
  Zap, 
  CheckCheck, 
  Rocket, 
  Globe2, 
  Timer, 
  Bot, 
  Calendar, 
  ShieldCheck, 
  Gauge,
  Smartphone,
  KeyRound
} from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useToastStore } from '@/store/useToastStore';
import { useActiveArabOrderStore } from '@/store/useActiveArabOrderStore';
import { createClient } from '@/utils/supabase/client';
import { sortChangelogs } from '@/utils/semver';

const ReceiptModal = dynamic(
  () => import('@/components/checkout/ReceiptModal').then((mod) => mod.ReceiptModal),
  { ssr: false }
);

const OrderTrackingModal = dynamic(
  () => import('@/components/ui/OrderTrackingModal').then((mod) => mod.OrderTrackingModal),
  { ssr: false }
);
import staticChangelogs from '@/data/changelogs.json';

interface Changelog {
  id: string;
  version: string;
  title: string;
  description: string;
  category: 'feature' | 'fix' | 'improvement' | 'announcement';
  features: string[];
  fixes: string[];
  created_at: string;
}

export default function NotificationsPage() {
  const { language, mounted, formatPrice } = useLocale();
  const isAr = mounted && language === 'ar';

  const notifications = useNotificationStore((state) => state.notifications);
  const unreadAlertsCount = useNotificationStore((state) => state.unreadCount);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications);
  const activeArabOrder = useActiveArabOrderStore((state) => state.activeOrder);
  const openArabModal = useActiveArabOrderStore((state) => state.openModal);

  const [activeTab, setActiveTab] = useState<'upcoming' | 'updates' | 'alerts'>('upcoming');
  const [changelogs, setChangelogs] = useState<Changelog[]>(() => {
    try {
      return sortChangelogs((staticChangelogs as any) || []) as Changelog[];
    } catch {
      return [];
    }
  });
  const [changelogsLoading, setChangelogsLoading] = useState(false);
  const [readChangelogIds, setReadChangelogIds] = useState<string[]>([]);
  const [expandedChangelogIds, setExpandedChangelogIds] = useState<string[]>([]);
  const [isReminderSet, setIsReminderSet] = useState(false);

  // Live Countdown to August 25, 2026 (Upcoming Release V2.3.0)
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 2,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const targetDate = new Date('2026-08-25T00:00:00.000Z').getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Orders & Modals State
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<any | null>(null);
  const [selectedReceiptOrderId, setSelectedReceiptOrderId] = useState<string | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [selectedTrackingOrderId, setSelectedTrackingOrderId] = useState<string | null>(null);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);

  // Helper to dynamically translate notification content to Arabic
  // Helper to dynamically translate notification content
  const translateNotification = (title: string, message: string) => {
    let translatedTitle = title;
    let translatedMessage = message;

    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();

    if (language === 'ar') {
      // 1. Payment Successful!
      if (trimmedTitle.includes('Payment Successful')) {
        translatedTitle = 'تم الدفع بنجاح!';
        if (trimmedMessage.includes('free products')) {
          translatedMessage = 'تمت إضافة منتجاتك المجانية إلى طلباتك.';
        } else {
          const priceMatch = trimmedMessage.match(/\$(\d+(?:\.\d+)?)/);
          if (priceMatch) {
            const usdAmount = parseFloat(priceMatch[1]);
            const formattedPrice = formatPrice(usdAmount);
            translatedMessage = `تمت عملية الدفع بقيمة ${formattedPrice} بنجاح. منتجاتك الرقمية متاحة الآن في طلباتك.`;
          } else {
            translatedMessage = 'تمت عملية الدفع بنجاح. منتجاتك الرقمية متاحة الآن في طلباتك.';
          }
        }
      }
      // 2. Wallet Top-Up Successful!
      else if (trimmedTitle.includes('Wallet Top-Up Successful')) {
        translatedTitle = 'تم شحن المحفظة بنجاح!';
        const priceMatch = trimmedMessage.match(/\$(\d+(?:\.\d+)?)/);
        if (priceMatch) {
          const usdAmount = parseFloat(priceMatch[1]);
          const formattedPrice = formatPrice(usdAmount);
          translatedMessage = `لقد قمت بشحن ${formattedPrice} بنجاح إلى محفظتك.`;
        } else {
          translatedMessage = 'لقد قمت بشحن المحفظة بنجاح.';
        }
      }
      // 3. Referral Reward Unlocked!
      else if (trimmedTitle.includes('Referral Reward Unlocked')) {
        translatedTitle = 'تم فتح مكافأة الإحالة بنجاح!';
        const priceMatch = trimmedMessage.match(/\$(\d+(?:\.\d+)?)/);
        const friendMatch = trimmedMessage.match(/friend \(([^)]+)\)/) || trimmedMessage.match(/friend ([% \w.-]+)/);
        const friendName = friendMatch ? friendMatch[1] : 'صديقك';
        
        if (priceMatch) {
          const usdAmount = parseFloat(priceMatch[1]);
          const formattedPrice = formatPrice(usdAmount);
          translatedMessage = `أكمل صديقك المدعو (${friendName}) التسجيل بنجاح. تمت إضافة ${formattedPrice} إلى محفظتك.`;
        } else {
          translatedMessage = `أكمل صديقك المدعو (${friendName}) التسجيل بنجاح. تمت إضافة مكافأة إلى محفظتك.`;
        }
      }
    } else {
      // English mode translations if notification was stored in Arabic
      if (trimmedTitle.includes('صديق جديد انضم')) {
        translatedTitle = 'New Friend Joined via Your Code!';
      } else if (trimmedTitle.includes('تم إيداع 1.00$ في محفظتك')) {
        translatedTitle = '$1.00 Auto-Deposited to Your Wallet!';
      } else if (trimmedTitle.includes('تم الدفع بنجاح')) {
        translatedTitle = 'Payment Successful!';
      } else if (trimmedTitle.includes('تم شحن المحفظة')) {
        translatedTitle = 'Wallet Top-Up Successful!';
      }
    }

    return { title: translatedTitle, message: translatedMessage };
  };

  // Load read status of changelogs from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('read_changelog_ids');
      if (saved) {
        try {
          setReadChangelogIds(JSON.parse(saved));
        } catch {
          // ignore
        }
      }
    }
  }, []);

  // Fetch notifications & user orders on load
  useEffect(() => {
    const loadOrders = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = '/auth/login?next=/notifications';
          return;
        }
        fetchNotifications();
        const { data } = await supabase
          .from('orders')
          .select(`
            id,
            amount,
            status,
            created_at,
            product_key,
            session_id,
            products (
              name,
              name_ar,
              slug,
              icon_name,
              brand_color,
              delivery_mode,
              subscription_duration,
              image_url
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (data) {
          setUserOrders(data);
        }
      } catch (err) {
        console.error('Failed to load user orders for notifications:', err);
      }
    };

    loadOrders();
  }, [fetchNotifications]);

  // Fetch changelogs with Supabase + API fallback
  const fetchChangelogs = async () => {
    if (changelogs.length === 0) setChangelogsLoading(true);
    try {
      const res = await fetch('/api/changelogs');
      if (res.ok) {
        const data = await res.json();
        if (data.changelogs && Array.isArray(data.changelogs) && data.changelogs.length > 0) {
          setChangelogs(sortChangelogs(data.changelogs) as Changelog[]);
          return;
        }
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from('changelogs')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setChangelogs(sortChangelogs(data as any) as Changelog[]);
      }
    } catch (err) {
      console.error('Failed to fetch changelogs:', err);
    } finally {
      setChangelogsLoading(false);
    }
  };

  useEffect(() => {
    fetchChangelogs();
  }, []);

  const formatChangelogDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return isAr
        ? d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
        : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const markChangelogAsRead = (id: string) => {
    if (readChangelogIds.includes(id)) return;
    const updated = [...readChangelogIds, id];
    setReadChangelogIds(updated);
    localStorage.setItem('read_changelog_ids', JSON.stringify(updated));
  };

  const markAllChangelogsAsRead = () => {
    const allIds = changelogs.map((c) => c.id);
    setReadChangelogIds(allIds);
    localStorage.setItem('read_changelog_ids', JSON.stringify(allIds));
    useToastStore.getState().success(
      isAr ? 'تم تحديد كافة التحديثات كمقروءة' : 'All updates marked as read'
    );
  };

  const toggleChangelog = (id: string) => {
    markChangelogAsRead(id);
    if (expandedChangelogIds.includes(id)) {
      setExpandedChangelogIds(expandedChangelogIds.filter((x) => x !== id));
    } else {
      setExpandedChangelogIds([...expandedChangelogIds, id]);
    }
  };

  const unreadChangelogsCount = changelogs.filter(
    (c) => !readChangelogIds.includes(c.id)
  ).length;

  const getIconForAlert = (type: string) => {
    switch (type) {
      case 'order': return PackageCheck;
      case 'promo': return Tag;
      case 'alert': return AlertCircle;
      default: return Sparkles;
    }
  };

  const getColorForAlert = (type: string) => {
    switch (type) {
      case 'order': return 'text-black bg-[#06D6A0] border-black';
      case 'promo': return 'text-black bg-[#FFE600] border-black';
      case 'alert': return 'text-black bg-[#FF70A6] border-black';
      default: return 'text-black bg-[#4CC9F0] border-black';
    }
  };

  const getCategoryDetails = (category: string) => {
    switch (category) {
      case 'feature':
        return {
          label: isAr ? 'ميزة جديدة' : 'New Feature',
          icon: Sparkles,
          color: 'text-black bg-[#06D6A0] border-black'
        };
      case 'fix':
        return {
          label: isAr ? 'إصلاح خطأ' : 'Bug Fix',
          icon: Wrench,
          color: 'text-black bg-[#FF70A6] border-black'
        };
      case 'improvement':
        return {
          label: isAr ? 'تحسين' : 'Improvement',
          icon: TrendingUp,
          color: 'text-black bg-[#4CC9F0] border-black'
        };
      default:
        return {
          label: isAr ? 'تنويه' : 'Announcement',
          icon: Megaphone,
          color: 'text-black bg-[#B892FF] border-black'
        };
    }
  };

  // Find matching order for a notification
  const getMatchingOrderForNotification = (notification: any) => {
    if (userOrders.length === 0) return null;
    
    // Check if notification date closely matches an order
    const notifTime = new Date(notification.created_at).getTime();
    
    // 1. Try to match within 3 minutes of created_at
    const closeMatch = userOrders.find(ord => {
      const ordTime = new Date(ord.created_at).getTime();
      return Math.abs(notifTime - ordTime) < 180000;
    });

    if (closeMatch) return closeMatch;

    // 2. Return latest order
    return userOrders[0];
  };

  const handleOpenReceiptForNotification = (notification: any) => {
    if (!notification.is_read) markAsRead(notification.id);
    const matched = getMatchingOrderForNotification(notification);
    if (matched) {
      setSelectedReceiptOrder(matched);
      setSelectedReceiptOrderId(matched.id);
    } else {
      setSelectedReceiptOrderId(null);
    }
    setIsReceiptOpen(true);
  };

  const handleOpenTrackingForNotification = (notification: any) => {
    if (!notification.is_read) markAsRead(notification.id);
    
    // Check if notification is an Arab support order
    if (
      notification.title?.includes('متابعة الطلب مع الدعم') ||
      notification.title?.includes('Live Support Bridge') ||
      (activeArabOrder && notification.title?.includes(activeArabOrder.orderId))
    ) {
      openArabModal();
      return;
    }

    const matched = getMatchingOrderForNotification(notification);
    if (matched) {
      if (matched.session_id?.startsWith('arab_UP-') || matched.product_key === 'PENDING_SUPPORT_DISPATCH') {
        openArabModal();
        return;
      }
      setSelectedTrackingOrderId(matched.id);
    } else {
      setSelectedTrackingOrderId(null);
    }
    setIsTrackingOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-black pb-20 select-none">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-white border-2 border-black rounded-3xl p-6 shadow-[5px_5px_0px_0px_#000]">
          <div className="flex items-center gap-3.5">
            <div className="relative w-12 h-12 rounded-2xl bg-[#FFE600] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_#000]">
              <Bell className="w-6 h-6 text-black stroke-[2.5]" />
              {(unreadAlertsCount > 0 || unreadChangelogsCount > 0) && (
                <span className="absolute -top-1 -end-1 w-3.5 h-3.5 bg-[#FF70A6] border-2 border-black rounded-full shadow-sm animate-pulse" />
              )}
            </div>
            <div className="text-start">
              <h1 className="text-xl sm:text-2xl font-black text-black">
                {isAr ? 'مركز التنبيهات والتحديثات' : 'Notifications & Updates'}
              </h1>
              <p className="text-xs sm:text-sm text-neutral-800 font-bold mt-0.5">
                {isAr 
                  ? 'تابع إشعارات حسابك، إيصالات الدفع، وسجل التحديثات' 
                  : 'Track your account notifications, payment receipts and updates'}
              </p>
            </div>
          </div>
          
          {/* Action Header Button for Active Tab */}
          {activeTab === 'alerts' && unreadAlertsCount > 0 && (
            <button 
              onClick={() => {
                markAllAsRead();
                useToastStore.getState().success(
                  isAr ? 'تم تحديد كافة التنبيهات كمقروءة' : 'All alerts marked as read'
                );
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#06D6A0] hover:bg-[#05b385] border-2 border-black rounded-xl text-xs font-black text-black transition-all cursor-pointer shadow-[2.5px_2.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
            >
              <CheckCheck className="w-4 h-4 stroke-[2.5]" />
              <span>{isAr ? 'تحديد كافة التنبيهات كمقروءة' : 'Mark all alerts as read'}</span>
            </button>
          )}

          {activeTab === 'updates' && unreadChangelogsCount > 0 && (
            <button 
              onClick={markAllChangelogsAsRead}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FFE600] hover:bg-[#edd600] border-2 border-black rounded-xl text-xs font-black text-black transition-all cursor-pointer shadow-[2.5px_2.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
            >
              <CheckCheck className="w-4 h-4 stroke-[2.5]" />
              <span>{isAr ? 'تحديد كافة التحديثات كمقروءة' : 'Mark all updates as read'}</span>
            </button>
          )}
        </div>

        {/* Tab Switching Menu */}
        <div className="flex mb-8 p-1.5 bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_#000] sm:shadow-[4px_4px_0px_0px_#000] gap-2 overflow-x-auto no-scrollbar select-none">
          {/* TAB 1: UPCOMING (التحديث القادم) */}
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`flex-1 py-3 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-black tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'upcoming'
                ? 'bg-[#06D6A0] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                : 'text-neutral-800 hover:bg-neutral-100 font-black'
            }`}
          >
            <Rocket className="w-4 h-4 stroke-[2.5]" />
            <span>{isAr ? 'التحديث القادم' : 'Upcoming Update'}</span>
            <span className="px-2 py-0.5 text-[10px] font-black bg-[#FFE600] text-black border border-black rounded-full shadow-sm animate-pulse">
              {isAr ? 'خلال يومين' : 'In 2 days'}
            </span>
          </button>

          {/* TAB 2: UPDATES / CHANGELOGS (سجل التحديثات) */}
          <button
            onClick={() => setActiveTab('updates')}
            className={`flex-1 py-3 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-black tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'updates'
                ? 'bg-[#FFE600] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                : 'text-neutral-800 hover:bg-neutral-100 font-black'
            }`}
          >
            <History className="w-4 h-4 stroke-[2.5]" />
            <span>{isAr ? 'التحديثات والتحسينات' : 'Updates & Changelog'}</span>
            {unreadChangelogsCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-black bg-[#FF70A6] text-black border border-black rounded-full shadow-sm">
                {unreadChangelogsCount}
              </span>
            )}
          </button>

          {/* TAB 3: ALERTS (التنبيهات الشخصية) */}
          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex-1 py-3 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-black tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'alerts'
                ? 'bg-[#4CC9F0] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                : 'text-neutral-800 hover:bg-neutral-100 font-black'
            }`}
          >
            <Bell className="w-4 h-4 stroke-[2.5]" />
            <span>{isAr ? 'التنبيهات الشخصية' : 'Personal Alerts'}</span>
            {unreadAlertsCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-black bg-[#FF70A6] text-black border border-black rounded-full shadow-sm">
                {unreadAlertsCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab Contents */}
        <div className="space-y-4">
          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 1: UPCOMING UPDATE (التحديث القادم — 25 أغسطس 2026)      */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'upcoming' && (
            <div className="space-y-6 text-start">
              {/* Luxury Futuristic Hero Showcase Card */}
              <div className="rounded-3xl border-2 border-black bg-gradient-to-br from-[#0D1117] via-[#161B22] to-[#0A0D14] p-6 sm:p-8 shadow-[6px_6px_0px_0px_#000] relative overflow-hidden text-white">
                {/* Background Ambient Glow */}
                <div className="absolute -top-24 -end-24 w-72 h-72 bg-[#06D6A0]/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -start-24 w-72 h-72 bg-[#FFE600]/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                  {/* Left Info Column */}
                  <div className="space-y-4 max-w-2xl">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs font-mono font-black text-black bg-[#06D6A0] px-3 py-1.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] flex items-center gap-1.5">
                        <Rocket className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>V2.3.0 • UPSTORE NEXT-GEN</span>
                      </span>
                      <span className="text-xs font-black text-black bg-[#FFE600] px-3.5 py-1.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#06D6A0] flex items-center gap-1.5 animate-pulse">
                        <Calendar className="w-4 h-4 stroke-[2.5] text-black" />
                        <span>{isAr ? 'الثلاثاء 25 أغسطس 2026' : 'Tuesday, Aug 25, 2026'}</span>
                      </span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight tracking-tight">
                      {isAr
                        ? 'الجيل القادم من UpStore • أسرع تجربة شراء رقمية بلمسة واحدة وتسليم في أقل من ثانية'
                        : 'UpStore Next-Gen • 1-Tap Global Checkout & Instant <1s License Delivery'}
                    </h2>

                    <p className="text-xs sm:text-sm text-neutral-300 font-bold leading-relaxed">
                      {isAr
                        ? 'صممنا هذا التحديث ليختصر لك كل خطوة في شراء حساباتك واشتراكاتك الرقمية المفضلة: بوابات دفع عالمية فورية تشمل Apple Pay و Google Pay والبطاقات البنكية المباشرة، مع تسليم آلي فوري في أقل من ثانية واحدة، ومساعد ذكاء اصطناعي فائق الدقة لاختيار أفضل العروض.'
                        : 'Engineered from scratch to make your digital shopping lightning-fast: 1-tap Apple Pay, Google Pay & cards, sub-second instant key allocation, and AI copilot optimization.'}
                    </p>
                  </div>

                  {/* Right High-Tech Luxury Countdown Box */}
                  <div className="bg-[#161B22]/90 backdrop-blur-xl border-2 border-white/20 p-6 rounded-3xl shadow-[5px_5px_0px_0px_#06D6A0] shrink-0 lg:w-[320px] text-center space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <Timer className="w-4 h-4 text-[#06D6A0]" />
                        <span className="text-xs font-black text-white uppercase tracking-wider">
                          {isAr ? 'العداد التنازلي للإطلاق' : 'Launch Countdown'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-black text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md">
                        LIVE
                      </span>
                    </div>

                    {/* 4 Crisp Monospaced Flip Cards */}
                    <div className="grid grid-cols-4 gap-2 text-center font-mono">
                      {/* Days */}
                      <div className="bg-[#0D1117] border border-white/15 p-2.5 rounded-2xl flex flex-col items-center justify-center">
                        <span className="text-2xl sm:text-3xl font-black text-[#06D6A0] tracking-wider">
                          {String(timeLeft.days).padStart(2, '0')}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-bold mt-0.5">
                          {isAr ? 'يوم' : 'DAYS'}
                        </span>
                      </div>

                      {/* Hours */}
                      <div className="bg-[#0D1117] border border-white/15 p-2.5 rounded-2xl flex flex-col items-center justify-center">
                        <span className="text-2xl sm:text-3xl font-black text-[#FFE600] tracking-wider">
                          {String(timeLeft.hours).padStart(2, '0')}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-bold mt-0.5">
                          {isAr ? 'ساعة' : 'HOURS'}
                        </span>
                      </div>

                      {/* Minutes */}
                      <div className="bg-[#0D1117] border border-white/15 p-2.5 rounded-2xl flex flex-col items-center justify-center">
                        <span className="text-2xl sm:text-3xl font-black text-[#4CC9F0] tracking-wider">
                          {String(timeLeft.minutes).padStart(2, '0')}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-bold mt-0.5">
                          {isAr ? 'دقيقة' : 'MINS'}
                        </span>
                      </div>

                      {/* Seconds */}
                      <div className="bg-[#0D1117] border border-[#FF70A6]/40 p-2.5 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
                        <span className="text-2xl sm:text-3xl font-black text-[#FF70A6] tracking-wider animate-pulse">
                          {String(timeLeft.seconds).padStart(2, '0')}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-bold mt-0.5">
                          {isAr ? 'ثانية' : 'SECS'}
                        </span>
                      </div>
                    </div>

                    {/* High-Tech Pulse Bar */}
                    <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden border border-white/10 p-0.5">
                      <div className="h-full bg-gradient-to-r from-[#06D6A0] via-[#FFE600] to-[#FF70A6] rounded-full w-full animate-pulse" />
                    </div>

                    {/* VIP Notification Trigger Button */}
                    <button
                      onClick={() => {
                        setIsReminderSet(!isReminderSet);
                        if (!isReminderSet) {
                          useToastStore.getState().success(
                            isAr
                              ? '🔔 تم تفعيل إشعار VIP بنجاح! سننبهك فور تدشين التحديث في 25 أغسطس مع كود خصم الإطلاق.'
                              : '🔔 VIP Alert activated! We will notify you with launch discounts on August 25.'
                          );
                        } else {
                          useToastStore.getState().info(
                            isAr ? 'تم إلغاء التنبيه.' : 'Reminder cancelled.'
                          );
                        }
                      }}
                      className={`w-full py-3 rounded-2xl text-xs font-black transition-all border-2 border-black cursor-pointer flex items-center justify-center gap-2 ${
                        isReminderSet
                          ? 'bg-[#06D6A0] text-black shadow-[3px_3px_0px_0px_#FFF]'
                          : 'bg-[#FFE600] hover:bg-[#edd600] text-black shadow-[3px_3px_0px_0px_#FFF] active:translate-x-0.5 active:translate-y-0.5'
                      }`}
                    >
                      <Bell className="w-4 h-4 stroke-[2.5]" />
                      <span>
                        {isReminderSet
                          ? (isAr ? '✓ تم تفعيل إشعار VIP الحصري' : '✓ VIP Reminder Active')
                          : (isAr ? 'فعّل إشعار VIP مع كود خصم الإطلاق 15%' : 'Activate VIP Alert + 15% Off')}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 5 Smart & Appetizing Feature Showcase Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* 1. Global Payment Gateways */}
                <div className="bg-white border-2 border-black rounded-3xl p-5 shadow-[4px_4px_0px_0px_#000] space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#4CC9F0] border-2 border-black flex items-center justify-center text-black shadow-[2px_2px_0px_0px_#000]">
                      <Globe2 className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-black mb-1.5">
                        {isAr ? '١. بوابات دفع عالمية ومحلية كاملة' : '1. Full Global Payment Gateways'}
                      </h3>
                      <p className="text-xs text-neutral-700 font-bold leading-relaxed">
                        {isAr
                          ? 'ربط مباشر لجميع البطاقات البنكية الدولية والمحلية (Visa, Mastercard, Mada, Meeza) من أي مكان بالعالم مع تشفير مصرفي 256-bit بمعايير 3D Secure العالمية.'
                          : 'Comprehensive integration for international & local cards (Visa, Mastercard, Mada) across 190+ countries with 3DS banking protection.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-black/10">
                    <span className="text-[10px] font-black bg-neutral-100 border border-black px-2 py-1 rounded-lg flex items-center gap-1.5">
                      <CreditCard className="w-3 h-3 stroke-[2.5] text-blue-600" />
                      <span>Visa / Mastercard</span>
                    </span>
                    <span className="text-[10px] font-black bg-neutral-100 border border-black px-2 py-1 rounded-lg flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3 stroke-[2.5] text-emerald-600" />
                      <span>3DS Secure</span>
                    </span>
                    <span className="text-[10px] font-black bg-neutral-100 border border-black px-2 py-1 rounded-lg flex items-center gap-1.5">
                      <Globe2 className="w-3 h-3 stroke-[2.5] text-sky-600" />
                      <span>{isAr ? '190+ دولة حول العالم' : '190+ Countries'}</span>
                    </span>
                  </div>
                </div>

                {/* 2. Apple Pay, Google Pay */}
                <div className="bg-white border-2 border-black rounded-3xl p-5 shadow-[4px_4px_0px_0px_#000] space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#06D6A0] border-2 border-black flex items-center justify-center text-black shadow-[2px_2px_0px_0px_#000]">
                      <Smartphone className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-black mb-1.5">
                        {isAr ? '٢. الدفع الذكي بلمسة واحدة (Apple & Google Pay)' : '2. 1-Tap Apple Pay & Google Pay'}
                      </h3>
                      <p className="text-xs text-neutral-700 font-bold leading-relaxed">
                        {isAr
                          ? 'اشترِ اشتراكك المفضل وأنت تتصفح هاتفك بلمسة واحدة وبصمة الوجه (FaceID) دون الحاجة لكتابة أرقام بطاقتك أو ملء بيانات يدوية.'
                          : 'Instant 1-tap checkout with Apple Pay & Google Pay via FaceID / TouchID. Purchase in 3 seconds with zero tedious typing.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-black/10">
                    <span className="text-[10px] font-black bg-neutral-100 border border-black px-2 py-1 rounded-lg flex items-center gap-1.5">
                      <Smartphone className="w-3 h-3 stroke-[2.5] text-black" />
                      <span>Apple Pay</span>
                    </span>
                    <span className="text-[10px] font-black bg-neutral-100 border border-black px-2 py-1 rounded-lg flex items-center gap-1.5">
                      <Zap className="w-3 h-3 stroke-[2.5] text-amber-500 fill-amber-500" />
                      <span>Google Pay</span>
                    </span>
                    <span className="text-[10px] font-black bg-neutral-100 border border-black px-2 py-1 rounded-lg flex items-center gap-1.5">
                      <Timer className="w-3 h-3 stroke-[2.5] text-[#06D6A0]" />
                      <span>{isAr ? 'شراء فوري في 3 ثوانٍ' : '3s Instant Checkout'}</span>
                    </span>
                  </div>
                </div>

                {/* 3. Instant Sub-Second Delivery */}
                <div className="bg-white border-2 border-black rounded-3xl p-5 shadow-[4px_4px_0px_0px_#000] space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#FFE600] border-2 border-black flex items-center justify-center text-black shadow-[2px_2px_0px_0px_#000]">
                      <Zap className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-black mb-1.5">
                        {isAr ? '٣. دفع عالمي موثوق وتفعيل رسمي فوري' : '3. Global Checkout & Official Activation'}
                      </h3>
                      <p className="text-xs text-neutral-700 font-bold leading-relaxed">
                        {isAr
                          ? 'خوارزمية دفع عالمية مشفرة وتفعيل رسمي يخصص لك كود التفعيل وبيانات الحساب على شاشتك مع ضمان شامل كامل المدة.'
                          : 'Automated global checkout and official license dispatch with full-term warranty.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-black/10">
                    <span className="text-[10px] font-black bg-neutral-100 border border-black px-2 py-1 rounded-lg flex items-center gap-1.5">
                      <Zap className="w-3 h-3 stroke-[2.5] text-amber-500 fill-amber-500" />
                      <span>{isAr ? 'تسليم في أقل من ثانية' : '<1s Auto Dispatch'}</span>
                    </span>
                    <span className="text-[10px] font-black bg-neutral-100 border border-black px-2 py-1 rounded-lg flex items-center gap-1.5">
                      <KeyRound className="w-3 h-3 stroke-[2.5] text-emerald-600" />
                      <span>{isAr ? 'كود وحساب فوري' : 'Instant Credentials'}</span>
                    </span>
                    <span className="text-[10px] font-black bg-neutral-100 border border-black px-2 py-1 rounded-lg flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3 stroke-[2.5] text-blue-600" />
                      <span>{isAr ? 'ضمان تشغيلي كامل' : '100% Guaranteed'}</span>
                    </span>
                  </div>
                </div>

                {/* 4. AI Engine Upgrade */}
                <div className="bg-white border-2 border-black rounded-3xl p-5 shadow-[4px_4px_0px_0px_#000] space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#9D4EDF]/20 border-2 border-black flex items-center justify-center text-black shadow-[2px_2px_0px_0px_#000]">
                      <Bot className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-black mb-1.5">
                        {isAr ? '٤. ترقية محرك الذكاء الاصطناعي (AI Copilot v3)' : '4. AI Copilot v3.0 Upgrade'}
                      </h3>
                      <p className="text-xs text-neutral-700 font-bold leading-relaxed">
                        {isAr
                          ? 'مساعد ذكي فائق الفهم يحلل استفساراتك، يرشح لك أرخص وأنسب الباقات، ويحل أي استفسار تقني بلغة طبيعية وسرعة استجابة مذهلة.'
                          : 'Hyper-intelligent assistant for instant queries, smart product matching, and personalized money-saving recommendations.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-black/10">
                    <span className="text-[10px] font-black bg-neutral-100 border border-black px-2 py-1 rounded-lg flex items-center gap-1.5">
                      <Bot className="w-3 h-3 stroke-[2.5] text-purple-600" />
                      <span>AI Copilot v3</span>
                    </span>
                    <span className="text-[10px] font-black bg-neutral-100 border border-black px-2 py-1 rounded-lg flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 stroke-[2.5] text-pink-600" />
                      <span>{isAr ? 'ترشيحات وعروض ذكية' : 'Smart Product Matching'}</span>
                    </span>
                    <span className="text-[10px] font-black bg-neutral-100 border border-black px-2 py-1 rounded-lg flex items-center gap-1.5">
                      <Clock className="w-3 h-3 stroke-[2.5] text-emerald-600" />
                      <span>{isAr ? 'دعم فوري 24/7' : '24/7 Live Answers'}</span>
                    </span>
                  </div>
                </div>

                {/* 5. Zero-Lag Performance & Platform Speed */}
                <div className="bg-white border-2 border-black rounded-3xl p-5 shadow-[4px_4px_0px_0px_#000] space-y-3 flex flex-col justify-between md:col-span-2 lg:col-span-2">
                  <div className="space-y-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#FF70A6] border-2 border-black flex items-center justify-center text-black shadow-[2px_2px_0px_0px_#000]">
                      <TrendingUp className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-black mb-1.5">
                        {isAr ? '٥. أداء صاعق وخفة استثنائية للموقع (Zero-Lag Engine)' : '5. Zero-Lag Platform & 300% Speed Boost'}
                      </h3>
                      <p className="text-xs text-neutral-700 font-bold leading-relaxed">
                        {isAr
                          ? 'إعادة هيكلة شاملة لسيرفرات المتجر ونظام الذاكرة المؤقتة الذكي لتسريع تصفح المنتجات بنسبة 300%، مع تقليل استهلاك باقة الإنترنت وبطارية الجوال لأقصى درجة وتجربة تصفح فورية وسلسة.'
                          : '300% faster browsing via two-tier caching, 60% lighter data payloads, zero-lag transitions, and hardened verified buyer reviews.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-black/10">
                    <span className="text-[10px] font-black bg-neutral-100 border border-black px-2 py-1 rounded-lg flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3 stroke-[2.5] text-emerald-600" />
                      <span>{isAr ? 'تسريع بنسبة 300%' : '300% Speed Boost'}</span>
                    </span>
                    <span className="text-[10px] font-black bg-neutral-100 border border-black px-2 py-1 rounded-lg flex items-center gap-1.5">
                      <Smartphone className="w-3 h-3 stroke-[2.5] text-blue-600" />
                      <span>{isAr ? 'خفة فائقة وتوفير البطارية' : 'Mobile Ultra-Lite'}</span>
                    </span>
                    <span className="text-[10px] font-black bg-neutral-100 border border-black px-2 py-1 rounded-lg flex items-center gap-1.5">
                      <Gauge className="w-3 h-3 stroke-[2.5] text-amber-500" />
                      <span>{isAr ? 'زمن استجابة 0ms' : '0ms Latency'}</span>
                    </span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 2: COMPLETED UPDATES / CHANGELOGS (سجل التحديثات المكتملة) */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'updates' && (
            <>
              {changelogsLoading && changelogs.length === 0 ? (
                <div className="text-center py-20 text-neutral-800 font-bold">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4" />
                  <p>{isAr ? 'جاري تحميل التحديثات...' : 'Loading updates...'}</p>
                </div>
              ) : changelogs
                  .filter((changelog: any) => changelog.status !== 'upcoming' && changelog.version !== 'V2.3.0')
                  .map((changelog) => {
                const isExpanded = expandedChangelogIds.includes(changelog.id);
                const isUnread = !readChangelogIds.includes(changelog.id);
                const cat = getCategoryDetails(changelog.category);
                const CatIcon = cat.icon;

                return (
                  <div 
                    key={changelog.id}
                    className="rounded-2xl border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] overflow-hidden transition-all duration-200"
                  >
                    {/* Collapsed Header */}
                    <div 
                      onClick={() => toggleChangelog(changelog.id)}
                      className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-neutral-50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000] ${cat.color}`}>
                          <CatIcon className="w-5 h-5 stroke-[2.5]" />
                        </div>
                        <div className="min-w-0 text-start">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-mono font-black text-black bg-[#FFE600] px-2 py-0.5 rounded-md border border-black shadow-[1px_1px_0px_0px_#000]">
                              {changelog.version}
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border border-black shadow-[1px_1px_0px_0px_#000] ${cat.color}`}>
                              {cat.label}
                            </span>
                            {isUnread && (
                              <span className="w-2 h-2 bg-[#FF70A6] border border-black rounded-full animate-pulse" />
                            )}
                          </div>
                          <h3 className="text-sm sm:text-base font-black text-black truncate">
                            {changelog.title}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className="hidden sm:inline text-xs font-black text-neutral-700 font-mono whitespace-nowrap">
                          {formatChangelogDate(changelog.created_at)}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-black stroke-[2.5]" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-black stroke-[2.5] rtl:rotate-180" />
                        )}
                      </div>
                    </div>

                    {/* Expandable Content */}
                    {isExpanded && (
                      <div className="px-4 sm:px-5 pb-5 pt-3 border-t-2 border-black bg-[#FFFDF9] animate-slide-down text-start">
                        <p className="text-xs sm:text-sm text-neutral-800 font-bold leading-relaxed mb-4">
                          {changelog.description}
                        </p>

                        {/* Features checklist */}
                        {changelog.features && changelog.features.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-xs font-black text-black uppercase tracking-wider mb-2 flex items-center gap-1.5 select-none">
                              <Sparkles className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                              <span>{isAr ? 'الميزات والتحسينات المضافة' : 'Features & Improvements'}</span>
                            </h4>
                            <ul className="space-y-2">
                              {changelog.features.map((feature, i) => (
                                <li key={i} className="text-xs sm:text-sm text-neutral-800 font-bold flex items-start gap-2">
                                  <Check className="w-4 h-4 text-black stroke-[3] shrink-0 mt-0.5" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Fixes checklist */}
                        {changelog.fixes && changelog.fixes.length > 0 && (
                          <div>
                            <h4 className="text-xs font-black text-black uppercase tracking-wider mb-2 flex items-center gap-1.5 select-none">
                              <Wrench className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                              <span>{isAr ? 'المشاكل التي تم حلها' : 'Resolved Fixes'}</span>
                            </h4>
                            <ul className="space-y-2">
                              {changelog.fixes.map((fix, i) => (
                                <li key={i} className="text-xs sm:text-sm text-neutral-800 font-bold flex items-start gap-2">
                                  <Info className="w-4 h-4 text-black stroke-[2.5] shrink-0 mt-0.5" />
                                  <span>{fix}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <div className="sm:hidden mt-4 pt-3 border-t-2 border-black flex justify-end">
                          <span className="text-[10px] font-black text-neutral-700 font-mono">
                            {formatChangelogDate(changelog.created_at)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {changelogs.filter((c: any) => c.status !== 'upcoming' && c.version !== 'V2.3.0').length === 0 && !changelogsLoading && (
                <div className="text-center py-20 text-neutral-700 font-bold">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-40 stroke-[2]" />
                  <p>{isAr ? 'لا توجد تحديثات مسجلة حالياً' : 'No updates registered at the moment'}</p>
                </div>
              )}
            </>
          )}

          {/* TAB 2: ALERTS / NOTICES */}
          {activeTab === 'alerts' && (
            <>
              {/* ── 0. Active Arab Support Order Live Bridge Card ── */}
              {activeArabOrder && (
                <div className="bg-[#FFF9E6] border-2 border-black rounded-3xl p-4 sm:p-5 shadow-[5px_5px_0px_0px_#000] text-start mb-6 animate-in fade-in slide-in-from-top-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-black/10">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-[#064E3B] text-white border-2 border-black flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_0px_#000]">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-black bg-[#FFE600] text-black px-2.5 py-0.5 rounded-lg border border-black shadow-[1px_1px_0px_0px_#000]">
                            {isAr ? 'متابعة مباشرة مع الدعم' : 'Live Support Bridge'}
                          </span>
                          <span className="font-mono text-xs font-black text-black">
                            #{activeArabOrder.orderId}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-black rounded border border-black ${
                            activeArabOrder.isFulfilled ? 'bg-[#06D6A0] text-black' : 'bg-black text-[#FFE600]'
                          }`}>
                            {activeArabOrder.isFulfilled ? (isAr ? 'تم التسليم' : 'Fulfilled') : (isAr ? 'العداد شغال' : 'Timer Active')}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-black text-black mt-1">
                          {activeArabOrder.countryName} • {activeArabOrder.methodName} ({activeArabOrder.displayPrice})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openArabModal()}
                        className="px-4 py-2 bg-[#FFE600] hover:bg-[#ffea33] text-black border-2 border-black rounded-xl text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{activeArabOrder.isFulfilled ? (isAr ? 'عرض بيانات التفعيل' : 'View Credentials') : (isAr ? 'متابعة الطلب والعداد' : 'Open Live Bridge')}</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-neutral-700 font-bold mt-2.5">
                    {isAr
                      ? 'طلبك محفوظ ويتم تحديثه لحظياً. بمجرد تأكيد التحويل سيتم تفعيل حسابك وتسليم البيانات فوراً.'
                      : 'Your order is saved and updated in real-time. Once verified by support, your key will be activated here automatically.'}
                  </p>
                </div>
              )}

              {/* ── 1. Priority Pending Order Live Tracker (Sleek 1-Line Alert) ── */}
              {userOrders.some((o) => o.status === 'pending') && (
                <div className="bg-[#FFE600] border-2 border-black rounded-2xl p-3 sm:p-4 shadow-[3px_3px_0px_0px_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-start mb-4 animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-black text-[#FFE600] border border-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000] animate-pulse">
                      <Zap className="w-4 h-4 fill-[#FFE600] stroke-[2]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black bg-black text-white px-2 py-0.5 rounded-md">
                          {isAr ? 'طلب قيد التنفيذ' : 'Active Order'}
                        </span>
                        <span className="font-mono text-xs font-black text-black">
                          #{userOrders.find((o) => o.status === 'pending')?.id?.substring(0, 8).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs font-black text-black truncate mt-0.5">
                        {(() => {
                          const pOrd = userOrders.find((o) => o.status === 'pending');
                          return isAr ? pOrd?.products?.name_ar || pOrd?.products?.name : pOrd?.products?.name;
                        })()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        const pOrd = userOrders.find((o) => o.status === 'pending');
                        if (pOrd) {
                          setSelectedTrackingOrderId(pOrd.id);
                          setIsTrackingOpen(true);
                        }
                      }}
                      className="px-3 py-1.5 bg-black hover:bg-neutral-800 text-[#FFE600] border-2 border-black rounded-xl text-xs font-black flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                    >
                      <Compass className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{isAr ? 'تتبع فوري' : 'Live Track'}</span>
                    </button>

                    <button
                      onClick={() => {
                        const pOrd = userOrders.find((o) => o.status === 'pending');
                        if (pOrd) {
                          setSelectedReceiptOrder(pOrd);
                          setSelectedReceiptOrderId(pOrd.id);
                          setIsReceiptOpen(true);
                        }
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-black border-2 border-black rounded-xl text-xs font-black flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{isAr ? 'الإيصال' : 'Receipt'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ── 2. Compact Recent Orders Strip (Horizontal Clean Scroll) ── */}
              {userOrders.length > 0 && (
                <div className="bg-white border-2 border-black rounded-2xl p-3.5 sm:p-4 shadow-[3px_3px_0px_0px_#000] space-y-2.5 text-start mb-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-black stroke-[2.5]" />
                      <h3 className="text-xs sm:text-sm font-black text-black">
                        {isAr ? 'أحدث الطلبات' : 'Recent Orders'}
                      </h3>
                      <span className="text-[10px] font-mono font-black text-black bg-neutral-100 border border-black px-1.5 py-0.2 rounded-md">
                        {userOrders.length}
                      </span>
                    </div>

                    <Link
                      href="/track"
                      className="text-xs font-black text-neutral-600 hover:text-black hover:underline flex items-center gap-1"
                    >
                      <span>{isAr ? 'صفحة التتبع' : 'Track All'}</span>
                      <ArrowRight className={`w-3 h-3 ${isAr ? 'rotate-180' : ''}`} />
                    </Link>
                  </div>

                  {/* Horizontal Scrollable Mini Order Chips */}
                  <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1">
                    {userOrders.slice(0, 5).map((ord) => {
                      const isPending = ord.status === 'pending';
                      const prodName = ord.products?.name_ar && isAr ? ord.products.name_ar : (ord.products?.name || 'Digital Item');
                      const shortId = ord.id ? ord.id.substring(0, 8).toUpperCase() : 'ORDER';

                      return (
                        <div
                          key={ord.id}
                          className="min-w-[210px] max-w-[230px] p-2.5 bg-neutral-50 hover:bg-white border-2 border-black rounded-xl shadow-[1.5px_1.5px_0px_0px_#000] hover:shadow-[2.5px_2.5px_0px_0px_#000] hover:-translate-y-0.5 transition-all shrink-0 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-mono font-black text-[10px] text-neutral-600">#{shortId}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-black border border-black ${
                                isPending ? 'bg-[#FFE600] text-black animate-pulse' : 'bg-[#06D6A0] text-black'
                              }`}>
                                {isPending ? (isAr ? 'قيد الانتظار' : 'Pending') : (isAr ? 'مكتمل' : 'Done')}
                              </span>
                            </div>
                            <h4 className="text-xs font-black text-black truncate leading-tight mb-1">{prodName}</h4>
                          </div>

                          <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-neutral-200 mt-1">
                            <span className="text-xs font-black font-mono text-black">
                              {mounted ? formatPrice(ord.amount || 0) : `$${ord.amount || 0}`}
                            </span>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setSelectedTrackingOrderId(ord.id);
                                  setIsTrackingOpen(true);
                                }}
                                className="p-1 bg-[#FFE600] hover:bg-[#edd600] border border-black rounded-lg text-black transition-all cursor-pointer"
                                title={isAr ? 'تتبع الطلب' : 'Track'}
                              >
                                <Compass className="w-3 h-3 stroke-[2.5]" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedReceiptOrder(ord);
                                  setSelectedReceiptOrderId(ord.id);
                                  setIsReceiptOpen(true);
                                }}
                                className="p-1 bg-white hover:bg-neutral-100 border border-black rounded-lg text-black transition-all cursor-pointer"
                                title={isAr ? 'الإيصال' : 'Receipt'}
                              >
                                <FileText className="w-3 h-3 stroke-[2.5]" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Personal Notification List ── */}
              {notifications.map((notification) => {
                const Icon = getIconForAlert(notification.type);
                const colorClasses = getColorForAlert(notification.type);
                const { title, message } = translateNotification(notification.title, notification.message);
                const isOrderOrPayment = notification.type === 'order' || notification.title.includes('Payment Successful') || notification.title.includes('تم الدفع بنجاح') || notification.title.includes('إثبات الدفع');
                const matchedOrder = getMatchingOrderForNotification(notification);
                const isOrderPending = matchedOrder?.status === 'pending';
                const isUnread = !notification.is_read;

                return (
                  <div 
                    key={notification.id}
                    onClick={() => {
                      if (isUnread) markAsRead(notification.id);
                    }}
                    className={`rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-5 items-start relative border-2 border-black bg-white transition-all duration-200 text-start cursor-pointer hover:-translate-y-0.5 ${
                      isUnread 
                        ? 'bg-amber-50/50 shadow-[5px_5px_0px_0px_#000] border-black ring-1 ring-black/5' 
                        : 'opacity-95 shadow-[3px_3px_0px_0px_#000] hover:shadow-[4px_4px_0px_0px_#000]'
                    }`}
                  >
                    {/* Unread indicator strip */}
                    {isUnread && (
                      <div className="absolute top-1/2 -translate-y-1/2 -start-1.5 w-2 h-10 bg-[#FF70A6] border-2 border-black rounded-r-md" />
                    )}

                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_#000] ${colorClasses}`}>
                      <Icon className="w-6 h-6 stroke-[2.5]" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 mb-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-black text-black truncate pe-2">
                            {title}
                          </h3>
                          {isUnread && (
                            <span className="px-2 py-0.5 bg-[#FF70A6] text-black border border-black rounded-md text-[10px] font-black shadow-[1px_1px_0px_0px_#000]">
                              {isAr ? 'جديد' : 'NEW'}
                            </span>
                          )}
                          {isOrderOrPayment && isOrderPending && (
                            <span className="px-2 py-0.5 bg-[#FFE600] border border-black rounded text-[10px] font-black text-black animate-pulse shadow-[1px_1px_0px_0px_#000]">
                              {isAr ? 'قيد الانتظار' : 'Pending'}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-neutral-700 whitespace-nowrap">
                            {new Date(notification.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                          </span>

                          {/* Individual Mark As Read Quick Button */}
                          {isUnread && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="p-1 bg-[#06D6A0] hover:bg-[#05b385] text-black border border-black rounded-lg text-xs font-black shadow-[1px_1px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                              title={isAr ? 'تحديد كمقروء' : 'Mark as read'}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-xs sm:text-sm text-neutral-800 font-bold leading-relaxed mb-3">
                        {message}
                      </p>

                      {/* ── Action Buttons for Payment / Order Notifications (Neubrutalism) ── */}
                      {isOrderOrPayment && (
                        <div className="flex items-center gap-2.5 pt-2 border-t border-neutral-200 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          {/* Comprehensive Payment Receipt Button */}
                          <button
                            onClick={() => handleOpenReceiptForNotification(notification)}
                            className="px-3.5 py-1.5 bg-[#06D6A0] hover:bg-[#05b385] text-black border-2 border-black rounded-xl text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>{isAr ? 'عرض إيصال الدفع' : 'View Payment Receipt'}</span>
                          </button>

                          {/* Track Order Progress Button */}
                          <button
                            onClick={() => handleOpenTrackingForNotification(notification)}
                            className={`px-3.5 py-1.5 text-black border-2 border-black rounded-xl text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer ${
                              isOrderPending 
                                ? 'bg-[#FFE600] hover:bg-[#edd600] animate-pulse' 
                                : 'bg-white hover:bg-neutral-100'
                            }`}
                          >
                            <Compass className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>
                              {isOrderPending 
                                ? (isAr ? 'تتبع مسار الطلب (قيد الانتظار)' : 'Track Order (Pending)') 
                                : (isAr ? 'تتبع مسار الطلب' : 'Track Order Progress')}
                            </span>
                          </button>
                        </div>
                      )}

                    </div>

                  </div>
                );
              })}

              {notifications.length === 0 && userOrders.length === 0 && (
                <div className="text-center py-20 text-neutral-700 font-bold">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-40 stroke-[2]" />
                  <p>{isAr ? 'لا توجد تنبيهات أو طلبات حالياً' : 'No personal notifications or orders'}</p>
                </div>
              )}
            </>
          )}

        </div>

      </div>

      {/* ── Receipt Modal (Accessible directly from Notifications) ── */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        orderId={selectedReceiptOrderId}
        initialOrders={selectedReceiptOrder ? [selectedReceiptOrder] : undefined}
        onTrackOrder={(ordId) => {
          setIsReceiptOpen(false);
          setSelectedTrackingOrderId(ordId);
          setIsTrackingOpen(true);
        }}
      />

      {/* ── Order Tracking Modal (Accessible directly from Notifications) ── */}
      <OrderTrackingModal
        isOpen={isTrackingOpen}
        onClose={() => setIsTrackingOpen(false)}
        orderId={selectedTrackingOrderId}
        onViewReceipt={() => {
          setIsTrackingOpen(false);
          setSelectedReceiptOrderId(selectedTrackingOrderId);
          setIsReceiptOpen(true);
        }}
      />

    </div>
  );
}
