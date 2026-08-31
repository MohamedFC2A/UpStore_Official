'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Check, 
  Circle, 
  ShoppingBag, 
  CreditCard, 
  Cpu, 
  Send, 
  PackageCheck, 
  RefreshCw, 
  Copy, 
  ExternalLink, 
  ShieldCheck, 
  FileText, 
  HelpCircle, 
  Sparkles, 
  Key, 
  PartyPopper,
  Zap 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from '@/context/LocaleContext';
import { useToastStore } from '@/store/useToastStore';
import { createClient } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface OrderTrackingStep {
  id?: string;
  name?: string;
  title?: string;
  titleAr?: string;
  titleEn?: string;
  description?: string;
  descAr?: string;
  descEn?: string;
  icon?: React.ComponentType<any>;
  timestamp?: string;
  isCompleted: boolean;
  isActive?: boolean;
}

export type TrackingStep = OrderTrackingStep;

export interface OrderTrackingProps extends React.HTMLAttributes<HTMLDivElement> {
  order?: any;
  steps?: OrderTrackingStep[];
  currentStatus?: string;
  orderId?: string;
  orderDate?: string;
  productName?: string;
  deliveryMode?: string;
  amount?: number;
  isRtl?: boolean;
  onRefresh?: () => void;
  onViewReceipt?: () => void;
  onOrderUpdated?: (updatedOrder: any) => void;
}

// Crisp Synthesized Web Audio chime for celebratory notification
function playCelebrationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.09);
      
      gain.gain.setValueAtTime(0.001, ctx.currentTime + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + i * 0.09 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.09 + 0.35);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime + i * 0.09);
      osc.stop(ctx.currentTime + i * 0.09 + 0.4);
    });
  } catch {
    // ignore audio restriction if blocked
  }
}

export function OrderTracking({
  order: initialOrder,
  steps: customSteps,
  currentStatus,
  orderId,
  orderDate,
  productName,
  deliveryMode,
  amount,
  isRtl,
  onRefresh,
  onViewReceipt,
  onOrderUpdated,
  className,
  ...props
}: OrderTrackingProps) {
  const { language, mounted, formatPrice } = useLocale();
  const isAr = isRtl ?? (mounted && language === 'ar');
  
  const [currentOrder, setCurrentOrder] = useState<any>(initialOrder);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [justFulfilled, setJustFulfilled] = useState(false);
  const prevStatusRef = useRef<string>(initialOrder?.status || currentStatus || 'pending');

  useEffect(() => {
    if (initialOrder) {
      setCurrentOrder(initialOrder);
    }
  }, [initialOrder]);

  const rawId = orderId || currentOrder?.id || 'UP-' + Math.random().toString(36).substring(2, 9).toUpperCase();
  const displayId = rawId.length > 8 ? rawId.substring(0, 8).toUpperCase() : rawId.toUpperCase();
  
  const rawDate = orderDate || (currentOrder?.created_at ? new Date(currentOrder.created_at).toLocaleString(isAr ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }) : new Date().toLocaleString(isAr ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }));

  const rawDeliveryMode = deliveryMode || currentOrder?.products?.delivery_mode || 'instant';
  const isTelegram = rawDeliveryMode === 'telegram';
  const status = currentStatus || currentOrder?.status || 'pending';
  const productKey = currentOrder?.product_key;
  const isFulfilled = status === 'completed' || status === 'fulfilled' || (productKey && productKey !== 'PENDING_FULFILLMENT' && !productKey.includes('PENDING'));
  const isPendingFulfillment = !isFulfilled && (status === 'pending' || productKey === 'PENDING_FULFILLMENT');

  // Trigger Strong Instant Notification & Audio on Status Change
  const triggerCelebration = (ord: any) => {
    setJustFulfilled(true);
    playCelebrationChime();
    
    // Impactful Toast Alert
    useToastStore.getState().success(
      isAr 
        ? 'تم إكمال وتنفيذ طلبك بنجاح! تم تجهيز المفاتيح وتفعيل الضمان.' 
        : 'Your order was fulfilled successfully! Your credentials are ready.',
      isAr ? 'تم تسليم الطلب الآن' : 'Order Fulfilled'
    );

    if (onOrderUpdated) {
      onOrderUpdated(ord);
    }
  };

  // ── 1. Smart Supabase Realtime Live Sync ──
  useEffect(() => {
    if (!currentOrder?.id && !rawId) return;
    const targetOrderId = currentOrder?.id || rawId;

    const supabase = createClient();
    let channel: RealtimeChannel | null = null;

    try {
      const channelName = `track-order-${targetOrderId}`;
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${targetOrderId}`,
          },
          (payload: any) => {
            const updated = payload.new;
            if (updated) {
              setCurrentOrder((prev: any) => ({ ...prev, ...updated }));
              
              if ((prevStatusRef.current === 'pending' || prevStatusRef.current === 'processing') && (updated.status === 'completed' || updated.status === 'fulfilled')) {
                triggerCelebration(updated);
              }
              prevStatusRef.current = updated.status;
            }
          }
        )
        .subscribe((state: any) => {
          if (state === 'SUBSCRIBED') {
            setIsLiveConnected(true);
          }
        });
    } catch (err) {
      console.warn('[OrderTracking] Realtime channel setup error:', err);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      setIsLiveConnected(false);
    };
  }, [currentOrder?.id, rawId]);

  // ── 2. Smart Adaptive Background Polling Fallback (Zero-Failure) ──
  useEffect(() => {
    // Only poll if order is pending/processing
    if (isFulfilled) return;
    const targetOrderId = currentOrder?.id || rawId;
    if (!targetOrderId || targetOrderId.startsWith('UP-')) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/track?id=${encodeURIComponent(targetOrderId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.found && data.order) {
            const newOrd = data.order;
            const wasPending = prevStatusRef.current === 'pending' || prevStatusRef.current === 'processing';
            const nowFulfilled = newOrd.status === 'completed' || newOrd.status === 'fulfilled';
            
            setCurrentOrder(newOrd);
            prevStatusRef.current = newOrd.status;

            if (wasPending && nowFulfilled) {
              triggerCelebration(newOrd);
            }
          }
        }
      } catch {
        // silent polling catch
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [currentOrder?.id, rawId, isFulfilled]);

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(rawId);
    setCopiedOrderId(true);
    useToastStore.getState().success(
      isAr ? 'تم نسخ رقم الطلب' : 'Order ID copied',
      `#${displayId}`
    );
    setTimeout(() => setCopiedOrderId(false), 2000);
  };

  const handleCopyKey = () => {
    if (!productKey) return;
    navigator.clipboard.writeText(productKey);
    setCopiedKey(true);
    useToastStore.getState().success(
      isAr ? 'تم نسخ بيانات المفتاح/الحساب بنجاح' : 'Credentials copied to clipboard',
      isAr ? 'نسخ فوري' : 'Copied'
    );
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleTriggerRefresh = async () => {
    setIsRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    } else if (currentOrder?.id) {
      try {
        const res = await fetch(`/api/orders/track?id=${encodeURIComponent(currentOrder.id)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.found && data.order) {
            setCurrentOrder(data.order);
          }
        }
      } catch {
        // ignore
      }
    }
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Standard tracking steps
  const defaultSteps: OrderTrackingStep[] = [
    {
      id: 'placed',
      titleAr: 'تم استلام وتأكيد الطلب بنجاح',
      titleEn: 'Order Placed & Confirmed',
      descAr: 'تم تسجيل طلبك وحجز المنتجات المحددة في النظام.',
      descEn: 'Your order was successfully recorded and items reserved.',
      icon: ShoppingBag,
      timestamp: rawDate,
      isCompleted: true,
      isActive: false
    },
    {
      id: 'paid',
      titleAr: 'تأكيد الدفع والتحقق المالي المعتمد',
      titleEn: 'Payment Confirmed & Verified',
      descAr: 'تم التحقق من عملية الدفع وإصدار الإيصال الإلكتروني المعتمد.',
      descEn: 'Payment verified securely and official digital receipt generated.',
      icon: CreditCard,
      timestamp: rawDate,
      isCompleted: true,
      isActive: false
    },
    {
      id: 'processing',
      titleAr: isTelegram ? 'توجيه الطلب لمسؤول التسليم في تيليجرام' : 'تجهيز وتوليد بيانات الحساب والتراخيص',
      titleEn: isTelegram ? 'Routed to Telegram Fulfillment Agent' : 'Generating Account Credentials',
      descAr: isTelegram 
        ? 'تم تحويل الطلب لمسؤول التسليم المباشر عبر تيليجرام للتسليم اليدوي الفوري.'
        : 'جاري تخصيص وتوليد المفاتيح والبيانات الخاصة باشتراكك.',
      descEn: isTelegram
        ? 'Order routed to dedicated Telegram fulfillment agent for direct setup.'
        : 'Allocating license key and preparing your personal digital credentials.',
      icon: Cpu,
      isCompleted: isFulfilled,
      isActive: isPendingFulfillment
    },
    {
      id: 'delivery',
      titleAr: isTelegram ? 'جاهز للاستلام المباشر عبر التيليجرام' : 'جاهز للتسليم والنسخ الفوري',
      titleEn: isTelegram ? 'Ready to Claim on Telegram' : 'Ready for Instant Fulfillment',
      descAr: isTelegram
        ? 'يمكنك الآن الضغط على زر التيليجرام بالأسفل واستلام حسابك فوراً.'
        : 'تم فحص الترخيص وهو جاهز ومتاح للنسخ والاستخدام في حسابك الآن.',
      descEn: isTelegram
        ? 'Click the Telegram button below to claim your credentials instantly.'
        : 'License verified and ready for instant copying and access.',
      icon: Send,
      isCompleted: isFulfilled,
      isActive: false
    },
    {
      id: 'completed',
      titleAr: 'تم التسليم بنجاح وتفعيل الضمان الذهبي',
      titleEn: 'Delivered & Golden Warranty Active',
      descAr: 'تم تسليم كافة البيانات بنجاح مع تغطية الضمان الشامل لـ UpStore.',
      descEn: 'Credentials delivered successfully with UpStore lifetime warranty.',
      icon: PackageCheck,
      isCompleted: isFulfilled,
      isActive: false
    }
  ];

  const stepsToRender = customSteps || defaultSteps;

  return (
    <div className={cn("w-full max-w-2xl mx-auto text-black select-none", className)} {...props}>
      
      {/* ── Main Outer Card ── */}
      <div className="bg-white border-[3px] border-black rounded-3xl p-6 sm:p-9 shadow-[8px_8px_0px_0px_#000] relative overflow-hidden space-y-7">
        
        {/* Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-3.5 bg-gradient-to-r from-[#4CC9F0] via-[#FFE600] to-[#06D6A0] border-b-2 border-black" />

        {/* ── Live Fulfilled Celebration Banner ── */}
        <AnimatePresence>
          {(isFulfilled || justFulfilled) && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="bg-[#06D6A0] border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_#000] flex items-center gap-3.5 text-start"
            >
              <div className="w-10 h-10 rounded-xl bg-white border-2 border-black flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_0px_#000]">
                <PartyPopper className="w-5 h-5 text-black stroke-[2.5]" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs sm:text-sm font-black text-black leading-snug">
                  {isAr ? 'اكتمل تنفيذ طلبك بنجاح وتم تسليم البيانات!' : 'Order Fulfilled Successfully! Credentials Ready.'}
                </h4>
                <p className="text-[11px] sm:text-xs text-black font-bold opacity-90 mt-0.5">
                  {isAr ? 'بياناتك ومفاتيحك الرقمية مفعلة الآن ومحمية بضمان UpStore الذهبي.' : 'Your digital license is activated and covered by UpStore warranty.'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Tracking Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-dashed border-neutral-300 pb-6 pt-2">
          <div className="text-start space-y-1.5">
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider bg-[#FFE600] px-3 py-1 rounded-full border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]">
                {isAr ? 'نظام التتبع الذكي' : 'Smart Live Tracker'}
              </span>

              {/* Live WebSocket / Polling Pulse Indicator */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-900 text-white rounded-full text-[10px] font-black border border-black shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#06D6A0] animate-ping" />
                <span>{isAr ? 'بث حي ومباشر' : 'Live Sync'}</span>
              </div>
              
              {isFulfilled ? (
                <span className="text-[11px] font-black bg-[#06D6A0] text-black px-3 py-1 rounded-full border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]">
                  {isAr ? 'مكتمل وتم التسليم' : 'Completed'}
                </span>
              ) : (
                <span className="text-[11px] font-black bg-[#FFE600] text-black px-3 py-1 rounded-full border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000] animate-pulse">
                  {isAr ? 'قيد المعالجة والتنفيذ...' : 'Processing...'}
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-black tracking-tight leading-snug">
              {isAr ? 'تتبع مسار طلبك خطوة بخطوة' : 'Track Your Order Progress'}
            </h2>
            
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-neutral-800">
              <span className="font-black">#{displayId}</span>
              <span>•</span>
              <span>{rawDate}</span>
            </div>
          </div>

          {/* Quick Header Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleCopyOrderId}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-neutral-100 border-2 border-black rounded-xl text-xs font-black shadow-[2.5px_2.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
              title={isAr ? 'نسخ رقم الطلب' : 'Copy Order ID'}
            >
              {copiedOrderId ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> : <Copy className="w-3.5 h-3.5 text-black stroke-[2.5]" />}
              <span>{copiedOrderId ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ الرقم' : 'Copy ID')}</span>
            </button>

            <button
              onClick={handleTriggerRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#FFE600] hover:bg-[#edd600] border-2 border-black rounded-xl text-xs font-black shadow-[2.5px_2.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
              title={isAr ? 'تحديث الحالة الآن' : 'Refresh Status'}
            >
              <RefreshCw className={cn("w-3.5 h-3.5 stroke-[2.5]", isRefreshing && "animate-spin")} />
              <span className="hidden sm:inline">{isAr ? 'تحديث' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* ── Delivered Product Key / Credentials Instant Display Box ── */}
        {isFulfilled && productKey && productKey !== 'PENDING_FULFILLMENT' && !productKey.includes('PENDING') && (
          <div className="bg-[#FFFDF9] border-[2.5px] border-black rounded-2xl p-4 sm:p-5 shadow-[4px_4px_0px_0px_#000] space-y-3 text-start animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#FFE600] border border-black flex items-center justify-center">
                  <Key className="w-4 h-4 text-black stroke-[2.5]" />
                </div>
                <h4 className="text-xs sm:text-sm font-black text-black">
                  {isAr ? 'بيانات الحساب / المفتاح الرقمي المسلم:' : 'Delivered License / Account Credentials:'}
                </h4>
              </div>
              <span className="text-[10px] font-black bg-[#06D6A0] text-black px-2 py-0.5 rounded-md border border-black">
                {isAr ? 'جاهز للاستخدام' : 'Active'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 p-3 bg-white border-2 border-black rounded-xl font-mono text-xs sm:text-sm font-black text-black break-all shadow-[1.5px_1.5px_0px_0px_#000] select-all">
                {productKey}
              </div>
              <button
                onClick={handleCopyKey}
                className="px-4 py-3 bg-[#FFE600] hover:bg-[#edd600] border-2 border-black rounded-xl text-xs font-black text-black flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer shrink-0 transition-all"
              >
                {copiedKey ? <Check className="w-4 h-4 text-emerald-700 stroke-[3]" /> : <Copy className="w-4 h-4 text-black stroke-[2.5]" />}
                <span>{copiedKey ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ البيانات' : 'Copy Key')}</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Vertical Connected Circles ProgressBar (دوائر رأسية واضحة ومباشرة) ── */}
        <div className="space-y-0 pt-2">
          {stepsToRender.map((step, index) => {
            const StepIcon = step.icon || (step.isCompleted ? Check : Sparkles);
            const isLast = index === stepsToRender.length - 1;
            const title = (step.titleAr && step.titleEn) 
              ? (isAr ? step.titleAr : step.titleEn) 
              : (step.name || step.title || (isAr ? step.titleAr : step.titleEn) || '');
            const desc = (step.descAr && step.descEn) 
              ? (isAr ? step.descAr : step.descEn) 
              : (step.description || (isAr ? step.descAr : step.descEn) || '');

            return (
              <div key={step.id || index} className="flex items-start group">
                
                {/* Vertical Circle & Connector */}
                <div className="flex flex-col items-center shrink-0">
                  
                  {/* Circle Badge */}
                  {step.isCompleted ? (
                    <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-[#06D6A0] border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_#000] transition-transform group-hover:scale-105">
                      <Check className="w-6 h-6 sm:w-7 sm:h-7 text-black stroke-[3.5]" />
                    </div>
                  ) : step.isActive ? (
                    <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-[#FFE600] border-2 border-black flex items-center justify-center shadow-[3.5px_3.5px_0px_0px_#000] relative">
                      <span className="absolute -top-1 -end-1 w-3 h-3 bg-rose-500 border-2 border-black rounded-full animate-ping" />
                      <StepIcon className="w-5 h-5 sm:w-6 sm:h-6 text-black stroke-[2.5] animate-pulse" />
                    </div>
                  ) : (
                    <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-neutral-100 border-2 border-neutral-300 flex items-center justify-center text-neutral-400">
                      <Circle className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" />
                    </div>
                  )}

                  {/* Vertical Connector Line */}
                  {!isLast && (
                    <div 
                      className={cn(
                        "w-1.5 min-h-[50px] sm:min-h-[58px] my-1 rounded-full transition-colors duration-300",
                        step.isCompleted ? "bg-black" : "bg-neutral-200 border-s-2 border-dashed border-neutral-300"
                      )}
                    />
                  )}
                </div>

                {/* Step Content Card */}
                <div className={cn("flex-1 pb-6 text-start", isAr ? "pr-4" : "pl-4")}>
                  
                  <div className={cn(
                    "border-2 border-black rounded-2xl p-4 sm:p-4.5 transition-all shadow-[3px_3px_0px_0px_#000] hover:shadow-[4px_4px_0px_0px_#000]",
                    step.isCompleted ? "bg-[#FFFDF9]" : step.isActive ? "bg-amber-50/40" : "bg-white opacity-85"
                  )}>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={cn(
                          "text-xs sm:text-sm font-black tracking-tight",
                          step.isCompleted ? "text-black" : step.isActive ? "text-black font-black" : "text-neutral-500"
                        )}>
                          {title}
                        </h4>

                        {step.isCompleted && (
                          <span className="text-[10px] font-black text-black bg-[#06D6A0] px-2.5 py-0.5 rounded-md border border-black shadow-[1px_1px_0px_0px_#000]">
                            {isAr ? 'مكتمل بنجاح' : 'Completed'}
                          </span>
                        )}

                        {step.isActive && (
                          <span className="text-[10px] font-black text-black bg-[#FFE600] px-2.5 py-0.5 rounded-md border border-black animate-pulse shadow-[1px_1px_0px_0px_#000]">
                            {isAr ? 'قيد الانتظار والتجهيز...' : 'Pending & Processing...'}
                          </span>
                        )}
                      </div>

                      {step.timestamp && (
                        <span className="text-[10px] sm:text-xs font-mono font-bold text-neutral-700">
                          {step.timestamp}
                        </span>
                      )}
                    </div>

                    <p className={cn(
                      "text-xs sm:text-xs leading-relaxed font-bold",
                      step.isCompleted ? "text-neutral-900" : step.isActive ? "text-black" : "text-neutral-500"
                    )}>
                      {desc}
                    </p>

                    {/* Step Specific Action Helpers */}
                    {step.isActive && isTelegram && (
                      <div className="mt-3.5 pt-2.5 border-t border-black/10">
                        <a
                          href={`https://wa.me/201041140422?text=${encodeURIComponent(
                            isAr 
                              ? `طلب رقم: #${displayId}`
                              : `Order ID: #${displayId}`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] border-2 border-black rounded-xl text-xs font-black text-black shadow-[2.5px_2.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5 stroke-[2.5] fill-black" />
                          <span>{isAr ? 'استلام فوري (واتساب)' : 'Instant Delivery (WhatsApp)'}</span>
                          <ExternalLink className="w-3 h-3 stroke-[2.5]" />
                        </a>
                      </div>
                    )}

                  </div>

                </div>

              </div>
            );
          })}
        </div>

        {/* ── Bottom Action Footer ── */}
        <div className="pt-3 border-t-2 border-dashed border-neutral-300 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
            <span className="font-black">{isAr ? 'ضمان التسليم الآمن والمكتمل' : 'Guaranteed Full Fulfillment'}</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onViewReceipt && (
              <button
                onClick={onViewReceipt}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#FFE600] hover:bg-[#edd600] border-2 border-black rounded-xl text-xs font-black text-black shadow-[2.5px_2.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isAr ? 'عرض إيصال الدفع' : 'View Payment Receipt'}</span>
              </button>
            )}

            <a
              href={`https://wa.me/201041140422?text=${encodeURIComponent(
                isAr ? `طلب رقم: #${displayId}` : `Order ID: #${displayId}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] border-2 border-black rounded-xl text-xs font-black text-black shadow-[2.5px_2.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
              title={isAr ? 'استلام فوري عبر واتساب' : 'Instant Delivery via WhatsApp'}
            >
              <Zap className="w-3.5 h-3.5 stroke-[2.5] fill-black" />
              <span>{isAr ? 'استلام فوري' : 'Instant Delivery'}</span>
              <ExternalLink className="w-3 h-3 stroke-[2.5]" />
            </a>
          </div>

        </div>

      </div>

    </div>
  );
}

export function OrderTrackingDemo() {
  return (
    <div className="p-4">
      <OrderTracking />
    </div>
  );
}
