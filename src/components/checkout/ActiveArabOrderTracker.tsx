'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Zap,
  Check,
  Copy,
  ExternalLink,
  Timer,
  Sparkles,
  Send,
  Radio,
  ChevronUp,
  ChevronDown,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { useToastStore } from '@/store/useToastStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useActiveArabOrderStore, ActiveArabOrder } from '@/store/useActiveArabOrderStore';
import { buildArabTelegramHelpUrl, ARAB_COUNTRIES_PAYMENT_DATA } from '@/utils/arabPaymentMethods';

export function ActiveArabOrderTracker() {
  const { language, mounted } = useLocale();
  const isAr = mounted ? language === 'ar' : true;

  const activeOrder = useActiveArabOrderStore((s) => s.activeOrder);
  const isModalOpen = useActiveArabOrderStore((s) => s.isModalOpen);
  const isDismissedFloating = useActiveArabOrderStore((s) => s.isDismissedFloating);
  const initStore = useActiveArabOrderStore((s) => s.init);
  const updateFulfillment = useActiveArabOrderStore((s) => s.updateFulfillment);
  const clearActiveOrder = useActiveArabOrderStore((s) => s.clearActiveOrder);
  const openModal = useActiveArabOrderStore((s) => s.openModal);
  const closeModal = useActiveArabOrderStore((s) => s.closeModal);
  const dismissFloating = useActiveArabOrderStore((s) => s.dismissFloating);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);

  const [countdownSeconds, setCountdownSeconds] = useState(3600);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    initStore();
  }, [initStore]);

  // 1-second countdown ticker with auto-dismiss on expiry (Strike & cleanup)
  useEffect(() => {
    if (!activeOrder || activeOrder.isFulfilled) return;

    const checkAndTick = async () => {
      const elapsed = Math.floor((Date.now() - activeOrder.startedAt) / 1000);
      const remaining = 3600 - elapsed;

      if (remaining <= 0) {
        // Countdown reached zero: call timeout API, clear active order, dismiss UI, and issue strike
        try {
          fetch('/api/checkout/arab-local-timeout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: activeOrder.orderId,
              sessionId: activeOrder.sessionId,
            }),
          }).catch(() => {});
        } catch (e) {}

        clearActiveOrder();
        fetchNotifications();
        useToastStore.getState().error(
          isAr
            ? 'انتهت مهلة السداد (60 دقيقة). تم إلغاء الطلب وتسجيل إنذار عدم السداد على حسابك.'
            : 'Payment window (60m) expired. Order cancelled and strike recorded.',
          isAr ? 'انتهاء مهلة السداد' : 'Payment Timed Out'
        );
        return;
      }

      setCountdownSeconds(remaining);
    };

    checkAndTick();
    const interval = setInterval(checkAndTick, 1000);
    return () => clearInterval(interval);
  }, [activeOrder, clearActiveOrder, fetchNotifications, isAr]);

  // 3.5-second real-time polling to check order fulfillment & live payment verification
  useEffect(() => {
    // Stop polling only if no active order, or order has final delivered key (completed)
    if (!activeOrder) return;
    if (activeOrder.isFulfilled && activeOrder.deliveredKey && activeOrder.deliveredKey !== 'CONFIRMED_AWAITING_KEY') {
      return;
    }

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/orders/track?session_id=${encodeURIComponent(activeOrder.sessionId)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        const ord = data.order || (Array.isArray(data.orders) ? data.orders[0] : null);

        if (ord) {
          // 1. Fully delivered with final license key / account credentials
          if (
            ord.status === 'completed' ||
            (ord.product_key &&
              ord.product_key !== 'PENDING_SUPPORT_DISPATCH' &&
              ord.product_key !== 'PENDING_FULFILLMENT' &&
              ord.product_key !== 'CONFIRMED_AWAITING_KEY' &&
              ord.product_key !== 'UNPAID_CANCELLED' &&
              ord.product_key !== 'TIMEOUT_EXPIRED')
          ) {
            updateFulfillment(ord.product_key);
            fetchNotifications();
            try {
              const audio = new Audio('/audio/aebc2eb9-52ae-4757-a976-f32b60c0db10.mp3');
              audio.volume = 0.5;
              audio.play().catch(() => {});
            } catch (e) {}

            useToastStore.getState().success(
              isAr
                ? 'تم استلام وتفعيل طلبك بنجاح! بيانات التفعيل جاهزة للاستخدام الآن.'
                : 'Your order has been fulfilled! Your product credentials are ready.',
              isAr ? 'تم تسليم الطلب' : 'Order Delivered'
            );
          }
          // 2. Admin clicked YES in @UpStore_Local_pay_bot (Payment verified, countdown stopped)
          else if (
            ord.status === 'pending_fulfillment' ||
            ord.product_key === 'CONFIRMED_AWAITING_KEY'
          ) {
            if (!activeOrder.isFulfilled || activeOrder.deliveredKey !== 'CONFIRMED_AWAITING_KEY') {
              updateFulfillment('CONFIRMED_AWAITING_KEY');
              fetchNotifications();
              try {
                const audio = new Audio('/audio/aebc2eb9-52ae-4757-a976-f32b60c0db10.mp3');
                audio.volume = 0.5;
                audio.play().catch(() => {});
              } catch (e) {}

              useToastStore.getState().success(
                isAr
                  ? 'تم تأكيد استلام السداد بنجاح وإلغاء الموقت! جاري رفع وتجهيز المفتاح لحسابك.'
                  : 'Delivered on time! Payment verified and credentials are being prepared.',
                isAr ? 'تم تأكيد السداد وإلغاء الموقت' : 'Payment Confirmed'
              );
            }
          }
          // 3. Admin clicked NO or order timed out (Cancelled, Strike issued, countdown cleared immediately)
          else if (
            ord.status === 'cancelled' ||
            ord.product_key === 'UNPAID_CANCELLED' ||
            ord.product_key === 'TIMEOUT_EXPIRED'
          ) {
            clearActiveOrder();
            fetchNotifications();
            useToastStore.getState().error(
              isAr
                ? 'تم إلغاء الطلب وتسجيل الإنذار على حسابك لعدم إتمام السداد.'
                : 'Order was cancelled and a strike was recorded due to non-payment.',
              isAr ? 'إنذار لعدم السداد' : 'Non-Payment Strike'
            );
          }
        }
      } catch (err) {
        // silent polling
      }
    };

    const pollInterval = setInterval(poll, 3500);
    return () => clearInterval(pollInterval);
  }, [activeOrder, updateFulfillment, clearActiveOrder, fetchNotifications, isAr]);


  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    useToastStore.getState().success(
      isAr ? 'تم النسخ إلى الحافظة بنجاح' : 'Copied to clipboard'
    );
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const getTelegramHref = () => {
    if (!activeOrder) return 'https://t.me/UpStore_help';
    if (activeOrder.telegramUrl) return activeOrder.telegramUrl;

    const matchedCountry =
      ARAB_COUNTRIES_PAYMENT_DATA.find(
        (c) =>
          c.nameAr === activeOrder.countryName ||
          c.nameEn === activeOrder.countryName ||
          (activeOrder.countryCode && c.code === activeOrder.countryCode)
      ) || ARAB_COUNTRIES_PAYMENT_DATA[0];

    return buildArabTelegramHelpUrl({
      country: matchedCountry,
      selectedMethod: {
        id: activeOrder.methodId || 'custom',
        nameAr: activeOrder.methodName,
        nameEn: activeOrder.methodName,
        type: 'wallet',
      },
      items: (activeOrder.items || []).map((it) => ({
        name: it.name || 'طلب رقمي',
        quantity: it.quantity || 1,
      })),
      displayPrice: activeOrder.displayPrice,
      isArabic: isAr,
      orderRef: activeOrder.orderId,
    });
  };

  if (!activeOrder) return null;

  const formattedTimer = `${String(Math.floor(countdownSeconds / 60)).padStart(2, '0')}:${String(
    countdownSeconds % 60
  ).padStart(2, '0')}`;

  return (
    <>
      {/* ─── 1. GLOBAL FLOATING TRACKER PILL (When Modal is Closed) ─── */}
      <AnimatePresence>
        {!isModalOpen && (
          <motion.div
            initial={{ y: 50, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`fixed z-40 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:bottom-6 ${
              isAr ? 'left-3 sm:left-6' : 'right-3 sm:right-6'
            } max-w-[calc(100vw-24px)] pointer-events-auto select-none`}
          >
            {isDismissedFloating ? (
              /* Minimized Floating Beacon */
              <button
                type="button"
                onClick={() => dismissFloating(false)}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-[#FFE600] hover:bg-[#ffea33] text-black border-2 border-black rounded-xl sm:rounded-2xl shadow-[2.5px_2.5px_0px_0px_#000] sm:shadow-[4px_4px_0px_0px_#000] flex items-center gap-2 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-all text-xs font-black"
                title={isAr ? 'عرض شريط المتابعة' : 'Expand Order Tracker'}
              >
                <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-600"></span>
                </span>
                <span>#{activeOrder.orderId}</span>
                <span className="font-mono bg-black text-[#FFE600] px-1.5 py-0.5 rounded text-[10px]">
                  {activeOrder.isFulfilled ? (isAr ? 'مكتمل' : 'Done') : formattedTimer}
                </span>
                <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            ) : (
              /* Expanded Rich Floating Card */
              <div className="bg-[#FFFDF9] border-2 sm:border-[2.5px] border-black rounded-xl sm:rounded-3xl p-2 sm:p-3 shadow-[3px_3px_0px_0px_#000] sm:shadow-[5px_5px_0px_0px_#000] flex items-center gap-1.5 sm:gap-3">
                {/* Live Pulse Beacon */}
                <div className="flex items-center gap-1.5 sm:gap-2 bg-[#064E3B] text-white px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl border border-black shadow-[1px_1px_0px_0px_#000]">
                  <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-black font-mono">
                    #{activeOrder.orderId}
                  </span>
                </div>

                {/* Country & Method / Status */}
                <div className="hidden md:flex flex-col text-start leading-tight min-w-0 max-w-[170px]">
                  <div className="flex items-center gap-1 text-xs font-black truncate">
                    {activeOrder.flagUrl && (
                      <img
                        src={activeOrder.flagUrl}
                        alt="Flag"
                        className="w-4 h-3 object-cover rounded border border-black/30 shrink-0"
                      />
                    )}
                    <span className="truncate">{activeOrder.methodName}</span>
                  </div>
                  <span className="text-[10px] text-neutral-600 font-bold truncate">
                    {activeOrder.isFulfilled
                      ? (isAr ? 'تم التسليم بنجاح' : 'Fulfilled')
                      : (isAr ? 'جاري تجهيز التحويل' : 'Support Bridge Active')}
                  </span>
                </div>

                {/* Timer Clock / Fulfilled Badge */}
                {!activeOrder.isFulfilled ? (
                  <div className="px-2.5 py-1 bg-black text-[#FFE600] border border-black rounded-xl font-mono text-xs sm:text-sm font-black shadow-[1px_1px_0px_0px_#000] flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
                    <span>{formattedTimer}</span>
                  </div>
                ) : (
                  <span className="px-2.5 py-1 bg-[#06D6A0] text-black border border-black rounded-xl font-black text-xs shadow-[1px_1px_0px_0px_#000] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isAr ? 'جاهز للتسليم' : 'Ready'}</span>
                  </span>
                )}

                {/* Main Action Button */}
                <button
                  type="button"
                  onClick={() => openModal()}
                  className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-[#FFE600] hover:bg-[#ffea33] text-black border-2 border-black rounded-xl font-black text-xs flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                >
                  <span>{activeOrder.isFulfilled ? (isAr ? 'عرض البيانات' : 'View Key') : (isAr ? 'متابعة الطلب' : 'Track Order')}</span>
                  <ExternalLink className="w-3 h-3 stroke-[2.5]" />
                </button>

                {/* Minimize Button */}
                <button
                  type="button"
                  onClick={() => dismissFloating(true)}
                  className="p-1 sm:p-1.5 hover:bg-neutral-100 border border-black rounded-lg text-neutral-600 hover:text-black cursor-pointer transition-all shadow-[1px_1px_0px_0px_#000]"
                  title={isAr ? 'تصغير' : 'Minimize'}
                >
                  <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── 2. LIVE SUPPORT BRIDGE MODAL (Exact match to requested UI) ─── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              className="bg-[#FFFDF9] border-[2.5px] sm:border-[3px] border-black max-w-lg w-full rounded-2xl sm:rounded-3xl shadow-[6px_6px_0px_0px_#000] sm:shadow-[10px_10px_0px_0px_#000] text-black my-auto max-h-[94dvh] sm:max-h-[88vh] flex flex-col font-sans select-none overflow-hidden"
            >
              {/* ─── Sticky Header ─── */}
              <div className="shrink-0 bg-white border-b-2 sm:border-b-[3px] border-black p-3.5 sm:p-4 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-[#FFE600] border-2 border-black rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black shadow-[1.5px_1.5px_0px_0px_#000] flex items-center gap-1.5 shrink-0">
                    <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{isAr ? 'بوابة الدفع الإلكتروني' : 'Secure Checkout'}</span>
                  </span>
                  <h2 className="text-xs sm:text-sm font-black text-black truncate">
                    {isAr ? 'متابعة الطلب مع الدعم' : 'Support Live Bridge'}
                  </h2>
                </div>

                {/* Close Button with exit toast notification */}
                <button
                  type="button"
                  onClick={() => closeModal(true, isAr)}
                  className="p-1.5 sm:p-2 bg-white hover:bg-neutral-100 border-2 border-black rounded-xl text-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer shrink-0"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                </button>
              </div>

              {/* ─── Scrollable Modal Body ─── */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-5 space-y-3.5 sm:space-y-4 overscroll-contain scrollbar-thin scrollbar-thumb-black scrollbar-track-neutral-100">
                
                {/* Live Pulsing Radar Bar */}
                <div className="p-3 sm:p-3.5 bg-[#064E3B] text-white border-2 border-black rounded-xl sm:rounded-2xl flex items-center justify-between shadow-[3px_3px_0px_0px_#000]">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-white">
                        {activeOrder.isFulfilled
                          ? (isAr ? 'تم اعتماد وتسليم طلبك بنجاح!' : 'Order Fulfilled Successfully!')
                          : (isAr ? 'جاري المتابعة مع مسؤول الدعم المباشر' : 'Live Support Dispatch In Progress')}
                      </h4>
                      <p className="text-[10px] text-emerald-200 font-bold">
                        {activeOrder.isFulfilled
                          ? (isAr ? 'بيانات التفعيل جاهزة للاستخدام الآن' : 'Your digital key is ready')
                          : (isAr ? 'تم إشعار الفريق وتجهيز حساب التحويل لدولتك' : 'Team alerted, preparing payment info')}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-[#FFE600] text-black border border-black rounded-lg text-[11px] sm:text-xs font-mono font-black shadow-[1px_1px_0px_0px_#000] shrink-0">
                    #{activeOrder.orderId}
                  </span>
                </div>

                {/* 60-Minute Countdown Clock & Live Progress Bar (Stops when fulfilled) */}
                {!activeOrder.isFulfilled ? (
                  <div className="p-4 sm:p-5 bg-[#FFF9E6] border-2 border-black rounded-2xl shadow-[3.5px_3.5px_0px_0px_#000] text-center space-y-3">
                    <div className="flex items-center justify-center gap-2 text-xs font-black text-neutral-800">
                      <Timer className="w-4 h-4 text-amber-600 animate-spin" style={{ animationDuration: '6s' }} />
                      <span>{isAr ? 'العداد المباشر لتسليم وتأكيد الطلب:' : 'Live Support Response Countdown:'}</span>
                    </div>

                    {/* Big Neon Digital Clock */}
                    <div className="inline-flex items-center justify-center px-6 py-2 bg-black text-[#FFE600] border-2 border-black rounded-2xl shadow-[2.5px_2.5px_0px_0px_#000]">
                      <span className="font-mono text-3xl sm:text-4xl font-black tracking-widest">
                        {formattedTimer}
                      </span>
                    </div>

                    {/* Dynamic Progress Bar */}
                    <div className="w-full h-2.5 bg-neutral-200 border border-black rounded-full overflow-hidden p-0.5 shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-[#06D6A0] rounded-full transition-all duration-1000"
                        style={{ width: `${Math.max(3, ((3600 - countdownSeconds) / 3600) * 100)}%` }}
                      />
                    </div>

                    <p className="text-[11px] text-neutral-700 font-bold leading-tight">
                      {isAr
                        ? 'بمجرد رد مسؤول الدعم واعتماد التحويل، سيتوقف العداد تلقائياً ويتم تسليم وتفعيل طلبك فوراً هنا وفي المحادثة.'
                        : 'As soon as the support team verifies the transfer, this timer will complete and your order will activate automatically.'}
                    </p>
                  </div>
                ) : (
                  /* Fulfilled Showcase Banner */
                  <div className="p-4 bg-[#D1FADF] border-2 border-black rounded-2xl shadow-[3.5px_3.5px_0px_0px_#000] space-y-3">
                    <div className="flex items-center gap-2 text-emerald-950 font-black text-sm">
                      <Sparkles className="w-5 h-5 text-emerald-600" />
                      <span>
                        {activeOrder.deliveredKey === 'CONFIRMED_AWAITING_KEY'
                          ? (isAr ? 'تم تسليم في الوقت المناسب وتم تأكيد السداد!' : 'Delivered on Time! Payment Confirmed')
                          : (isAr ? 'تم استلام وتفعيل طلبك بنجاح!' : 'Order Activated Successfully!')}
                      </span>
                    </div>
                    {activeOrder.deliveredKey && activeOrder.deliveredKey !== 'CONFIRMED_AWAITING_KEY' ? (
                      <div className="p-3 bg-white border-2 border-black rounded-xl text-start">
                        <span className="text-[10px] text-neutral-600 font-bold block mb-1">
                          {isAr ? 'بيانات التفعيل والحساب:' : 'Delivered Credentials:'}
                        </span>
                        <div className="flex items-center justify-between gap-2 font-mono text-xs font-black bg-neutral-100 p-2.5 rounded border border-black select-all break-all">
                          <span>{activeOrder.deliveredKey}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(activeOrder.deliveredKey!, 'delivered_key')}
                            className="p-1 bg-white hover:bg-neutral-200 border border-black rounded text-black shadow-[1px_1px_0px_0px_#000] cursor-pointer shrink-0"
                            title="Copy Key"
                          >
                            {copiedKey === 'delivered_key' ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> : <Copy className="w-3.5 h-3.5 stroke-[2.5]" />}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-white border-2 border-black rounded-xl text-start">
                        <span className="text-[11px] text-neutral-800 font-bold block">
                          {isAr ? 'تم تأكيد استلام سداد طلبك بنجاح! جاري رفع وتجهيز بيانات المفتاح/الحساب لحسابك الآن.' : 'Payment confirmed! Your product credentials are being generated and delivered.'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Order Details Breakdown Card */}
                <div className="p-3.5 bg-white border-2 border-black rounded-xl sm:rounded-2xl shadow-[2.5px_2.5px_0px_0px_#000] space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                    <span className="text-xs font-bold text-neutral-600">{isAr ? 'رقم الطلب الرسمي:' : 'Official Order Ref:'}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-xs sm:text-sm text-black">#{activeOrder.orderId}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(activeOrder.orderId, 'live_order_id')}
                        className="p-1 hover:bg-neutral-100 border border-black rounded text-black shadow-[1px_1px_0px_0px_#000] cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-all"
                        title="Copy"
                      >
                        {copiedKey === 'live_order_id' ? <Check className="w-3 h-3 text-emerald-600 stroke-[3]" /> : <Copy className="w-3 h-3 stroke-[2.5]" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-neutral-200 text-xs font-black">
                    <span className="text-neutral-600">{isAr ? 'الدولة ووسيلة الدفع:' : 'Country & Method:'}</span>
                    <div className="flex items-center gap-1.5">
                      {activeOrder.flagUrl && (
                        <img
                          src={activeOrder.flagUrl}
                          alt="Country"
                          className="w-5 h-3.5 object-cover rounded border border-black/30 shrink-0"
                        />
                      )}
                      <span>{activeOrder.countryName} • {activeOrder.methodName}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-black">
                    <span className="text-neutral-600">{isAr ? 'المبلغ المطلوب:' : 'Amount:'}</span>
                    <span className="text-sm font-mono text-black font-black">{activeOrder.displayPrice}</span>
                  </div>
                </div>

                {/* Direct Re-Open Telegram Action Button */}
                <a
                  href={getTelegramHref()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full p-3.5 bg-[#229ED9] hover:bg-[#1b8ec5] border-2 border-black text-white rounded-xl sm:rounded-2xl flex items-center justify-between gap-2.5 shadow-[3.5px_3.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white border border-black flex items-center justify-center p-1 shrink-0 shadow-[1px_1px_0px_0px_#000]">
                      <Send className="w-4 h-4 text-[#229ED9] stroke-[2.5]" />
                    </div>
                    <div className="text-start min-w-0">
                      <span className="text-xs sm:text-sm font-black text-white block truncate">
                        {isAr ? 'فتح محادثة الدعم @UpStore_help مجدداً' : 'Open Support Chat @UpStore_help'}
                      </span>
                      <span className="text-[10px] text-blue-100 font-bold block truncate">
                        {isAr ? 'البيانات ورقم الطلب جاهزة في الرسالة' : 'Prefilled order ref & data ready'}
                      </span>
                    </div>
                  </div>
                  <div className="px-2.5 py-1.5 bg-[#FFE600] text-black rounded-lg border border-black font-black text-xs flex items-center gap-1 shadow-[1px_1px_0px_0px_#000] group-hover:scale-105 transition-transform shrink-0">
                    <span>{isAr ? 'فتح' : 'Open'}</span>
                    <ExternalLink className="w-3 h-3 stroke-[2.5]" />
                  </div>
                </a>

                {/* Clear / Dismiss Action */}
                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(isAr ? 'هل تريد إنهاء متابعة هذا الطلب وبدء طلب جديد؟' : 'Do you want to dismiss tracking for this order?')) {
                        clearActiveOrder();
                      }
                    }}
                    className="text-xs font-bold text-neutral-600 hover:text-black underline cursor-pointer"
                  >
                    {isAr ? '← إنهاء المتابعة واختيار وسيلة دفع أخرى' : '← Dismiss & return to payment methods'}
                  </button>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
