'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Moon,
  Sparkles,
  RefreshCw,
  Clock,
  ShieldCheck,
  Zap,
  Bot,
  PackageSearch,
  ExternalLink,
} from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';

interface StoreSleepOverlayProps {
  initialIsMaintenance?: boolean;
}

export function StoreSleepOverlay({ initialIsMaintenance = false }: StoreSleepOverlayProps) {
  const pathname = usePathname();
  const { language } = useLocale();
  const isAr = language === 'ar';

  const [isMaintenance, setIsMaintenance] = useState<boolean>(initialIsMaintenance);
  const [checking, setChecking] = useState<boolean>(false);
  const [lastCheckedText, setLastCheckedText] = useState<string>('');

  // Paths exempt from sleep mode (Admins, auth, policy, pin, order tracking)
  const isExemptPath =
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/auth') ||
    pathname?.startsWith('/pin') ||
    pathname?.startsWith('/track') ||
    pathname?.startsWith('/api');

  const checkStatus = useCallback(async (isManual = false) => {
    try {
      if (isManual) setChecking(true);
      const res = await fetch('/api/store/status', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const maintenanceActive = data.maintenance_mode === true;
        setIsMaintenance(maintenanceActive);
        if (isManual) {
          setLastCheckedText(
            isAr
              ? maintenanceActive
                ? 'المتجر ما زال نائماً، سيتم الفتح قريباً!'
                : 'تم فتح المتجر! جاري الدخول...'
              : maintenanceActive
              ? 'Store still sleeping, will open soon!'
              : 'Store is open! Entering...'
          );
          setTimeout(() => setLastCheckedText(''), 3500);
        }
      }
    } catch {
      // Ignore background network errors
    } finally {
      if (isManual) setChecking(false);
    }
  }, [isAr]);

  useEffect(() => {
    // Initial client check to guarantee latest status
    checkStatus(false);

    // Dynamic polling: only poll when tab is visible (10s if sleeping, 30s if open)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkStatus(false);
      }
    }, isMaintenance ? 8000 : 30000);

    // Check immediately when user switches back to this tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkStatus(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkStatus, isMaintenance]);

  // Lock body scrolling only while sleep overlay is actively displayed
  useEffect(() => {
    if (isMaintenance && !isExemptPath) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow || '';
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isMaintenance, isExemptPath]);

  if (!isMaintenance || isExemptPath) {
    return null;
  }

  const telegramBotUrl = 'https://t.me/upstore_one_bot';

  return (
    <aside
      aria-label={isAr ? 'حالة المتجر في وضع الاستراحة' : 'Store Sleep Mode'}
      className="fixed inset-0 z-[99999] bg-[#FFFDF9]/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto selection:bg-[#FFE600] selection:text-black"
    >
      {/* Subtle Retro Dot Matrix Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-15"
        style={{
          backgroundImage: 'radial-gradient(#000000 1.5px, transparent 1.5px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Decorative Ambient Floating Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 sm:w-96 sm:h-96 bg-[#FFE600]/20 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-[#B892FF]/25 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Main Responsive Compact Card */}
      <div className="relative w-full max-w-[460px] bg-[#FFFFFF] border-[3px] border-black rounded-[28px] p-5 sm:p-7 shadow-[6px_6px_0px_0px_#000] sm:shadow-[8px_8px_0px_0px_#000] text-center my-auto transition-all animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header Badge & Sleeping Mascot */}
        <div className="flex flex-col items-center justify-center gap-3">
          
          {/* Live Status Pill */}
          <div className="inline-flex items-center gap-2 bg-[#FFE600] border-2 border-black px-3.5 py-1 rounded-full shadow-[2px_2px_0px_0px_#000] text-xs font-black text-black tracking-wide">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-black"></span>
            </span>
            <span>{isAr ? 'المتجر في استراحة مؤقتة 🌙' : 'Store Resting Mode 🌙'}</span>
          </div>

          {/* Animated Sleeping Moon Mascot */}
          <div className="relative my-1">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#9B5DE5] border-[3px] border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] flex items-center justify-center -rotate-2 hover:rotate-0 transition-transform">
              <Moon className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-white" />
              <Sparkles className="w-4 h-4 text-[#FFE600] absolute -top-2 -right-2 animate-bounce" />
            </div>

            {/* Floating Animated Zzz particles */}
            <div className="absolute -top-3 -left-3 flex flex-col items-end pointer-events-none select-none font-black text-black">
              <span className="text-[13px] leading-none animate-pulse text-[#9B5DE5]">Z</span>
              <span className="text-[10px] leading-none opacity-80 -mr-1">z</span>
              <span className="text-[8px] leading-none opacity-60 -mr-2">z</span>
            </div>
          </div>
        </div>

        {/* Title & Short Friendly Subtext */}
        <div className="mt-3.5 space-y-1.5">
          <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight leading-snug">
            {isAr ? 'نأخذ قيلولة وسنعود قريباً جداً!' : 'Taking a Power Nap, Back Soon!'}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 font-bold leading-relaxed px-1">
            {isAr
              ? 'المتجر متوقف مؤقتاً لراحة الفريق وتجديد المخزون. سيتم فتح الموقع واستئناف التسليم الفوري فور استيقاظنا قريباً.'
              : 'The store is briefly resting to restock accounts. Instant delivery will resume immediately as soon as we wake up.'}
          </p>
        </div>

        {/* 2-Column Compact Reassurance Badges (Mobile-Optimized) */}
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 my-4 text-start">
          <div className="bg-[#FFFDF9] border-2 border-black rounded-xl p-2.5 shadow-[2px_2px_0px_0px_#000] flex flex-col justify-center">
            <div className="flex items-center gap-1.5 text-xs font-black text-black">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
              <span>{isAr ? 'التسليم الفوري' : 'Instant Delivery'}</span>
            </div>
            <p className="text-[11px] text-neutral-600 font-bold mt-0.5 leading-tight">
              {isAr ? 'يستأنف فور استيقاظنا' : 'Resumes upon wake'}
            </p>
          </div>

          <div className="bg-[#FFFDF9] border-2 border-black rounded-xl p-2.5 shadow-[2px_2px_0px_0px_#000] flex flex-col justify-center">
            <div className="flex items-center gap-1.5 text-xs font-black text-black">
              <ShieldCheck className="w-3.5 h-3.5 text-[#06D6A0] stroke-[2.5] shrink-0" />
              <span>{isAr ? 'حساباتك السابقة' : 'Past Orders'}</span>
            </div>
            <p className="text-[11px] text-neutral-600 font-bold mt-0.5 leading-tight">
              {isAr ? 'تعمل بكفاءة 100%' : '100% active & stable'}
            </p>
          </div>
        </div>

        {/* Main Action Buttons */}
        <div className="space-y-2.5">
          {/* Primary CTA: Telegram Bot Button */}
          <a
            href={telegramBotUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 bg-[#06D6A0] hover:bg-[#05b98a] active:bg-[#049a73] text-black font-black py-3 px-4 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all text-sm sm:text-base cursor-pointer group"
          >
            <Bot className="w-5 h-5 stroke-[2.5] group-hover:rotate-12 transition-transform" />
            <span className="flex-1 text-center">
              {isAr ? 'تواصل مع بوت UpStore على تليجرام' : 'Open UpStore Telegram Bot'}
            </span>
            <ExternalLink className="w-4 h-4 opacity-70 shrink-0" />
          </a>

          {/* Secondary Actions Row: Check Status & Track Previous Orders */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => checkStatus(true)}
              disabled={checking}
              className="inline-flex items-center justify-center gap-1.5 bg-[#FFF8E7] hover:bg-[#ffeec2] text-black font-black py-2.5 px-3 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all text-xs sm:text-sm cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 stroke-[2.5] ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? (isAr ? 'جاري الفحص...' : 'Checking...') : (isAr ? 'فحص الاستيقاظ' : 'Check Now')}</span>
            </button>

            <Link
              href="/track"
              className="inline-flex items-center justify-center gap-1.5 bg-[#F0F3F4] hover:bg-neutral-200 text-black font-black py-2.5 px-3 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all text-xs sm:text-sm cursor-pointer"
            >
              <PackageSearch className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isAr ? 'تتبع طلب سابق' : 'Track Order'}</span>
            </Link>
          </div>
        </div>

        {/* Feedback Message if manual check is clicked */}
        {lastCheckedText && (
          <div className="mt-2.5 py-1.5 px-2 bg-[#FFE600] border-2 border-black rounded-lg text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] animate-in fade-in zoom-in-95">
            {lastCheckedText}
          </div>
        )}

        {/* Footer Real-time Auto-Sync Pill */}
        <div className="mt-3.5 flex items-center justify-center gap-2 text-[11px] font-bold text-neutral-500 select-none">
          <span className="w-2 h-2 rounded-full bg-[#06D6A0] animate-ping shrink-0" />
          <span>
            {isAr
              ? 'يتم فحص فتح المتجر تلقائياً في الخلفية لحظياً...'
              : 'Auto-syncing store open status in real-time...'}
          </span>
        </div>
      </div>
    </aside>
  );
}
