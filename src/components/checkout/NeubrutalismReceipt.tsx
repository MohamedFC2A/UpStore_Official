'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  Package, 
  Copy, 
  Check, 
  Printer, 
  Share2, 
  ShieldCheck, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  Loader2, 
  ArrowRight, 
  Sparkles,
  Calendar,
  CreditCard,
  Hash,
  AlertCircle,
  Headphones,
  FileCheck2,
  Tv,
  Terminal,
  Compass,
  QrCode,
  Lock,
  Unlock,
  Receipt,
  ChevronDown,
  ShoppingBag,
  Cpu,
  PackageCheck,
  Zap,
  Smartphone
} from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { useToastStore } from '@/store/useToastStore';
import { parseDeliveryPayload } from '@/utils/auth';

// Brand icons
const YoutubeIcon = (props: React.ComponentPropsWithoutRef<'svg'>) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    stroke="currentColor"
    strokeWidth="2.5"
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
    strokeWidth="2.5"
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

export interface NeubrutalismReceiptProps {
  orders: any[];
  sessionId?: string | null;
  paymentMethod?: string;
  totalAmount?: number;
  date?: string;
  isPendingFulfillment?: boolean;
  onTrackOrder?: (orderId: string) => void;
  showActions?: boolean;
  isModal?: boolean;
  onClose?: () => void;
}

export function NeubrutalismReceipt({
  orders = [],
  sessionId,
  paymentMethod,
  totalAmount,
  date,
  isPendingFulfillment,
  onTrackOrder,
  showActions = true,
  isModal = false,
  onClose
}: NeubrutalismReceiptProps) {
  const { language, mounted, formatPrice, translateProduct } = useLocale();
  const isAr = mounted && language === 'ar';
  
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [telegramCodes, setTelegramCodes] = useState<Record<string, { code?: string; loading?: boolean; error?: string }>>({});

  const isAnyOrderPending = isPendingFulfillment === true || (orders.length > 0 && orders.some(
    (o) => o.status === 'pending' || !o.product_key || o.product_key === 'PENDING_FULFILLMENT' || (typeof o.product_key === 'string' && (o.product_key.includes('PENDING') || o.product_key.includes('OUT_OF_STOCK')))
  ));
  const isPending = isPendingFulfillment !== undefined ? isPendingFulfillment : isAnyOrderPending;
  const isFulfilled = !isPending && orders.length > 0;

  const primaryOrderId = orders[0]?.id || sessionId || 'UP-' + Math.random().toString(36).substring(2, 9).toUpperCase();
  const displayReceiptNumber = orders[0]?.id ? `UP-${orders[0].id.substring(0, 8).toUpperCase()}` : `UP-${(sessionId || 'REC').substring(0, 8).toUpperCase()}`;
  
  const calculatedTotal = totalAmount ?? orders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  
  const receiptDate = date || (orders[0]?.created_at ? new Date(orders[0].created_at).toLocaleString(isAr ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }) : new Date().toLocaleString(isAr ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }));

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(label);
      useToastStore.getState().success(
        isAr ? 'تم النسخ بنجاح' : 'Copied to clipboard',
        label
      );
      setTimeout(() => setCopiedText(null), 2000);
    });
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleCopySummary = () => {
    const summaryLines = [
      `UpStore Official Payment Receipt`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `رقم الإيصال: ${displayReceiptNumber}`,
      `التاريخ: ${receiptDate}`,
      `طريقة الدفع: ${inferredMethod}`,
      `المبلغ الإجمالي: $${calculatedTotal.toFixed(2)}`,
      `عدد المنتجات: ${orders.length}`,
      `حالة المعاملة: ${isFulfilled ? 'مدفوع ومؤكد بنجاح' : 'قيد المراجعة والاعتماد'}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `UpStore Verified Digital Receipt`
    ];
    navigator.clipboard.writeText(summaryLines.join('\n'));
    useToastStore.getState().success(
      isAr ? 'تم نسخ ملخص الإيصال بالكامل' : 'Receipt summary copied!',
      displayReceiptNumber
    );
  };

  const handleFetchTelegramCode = async (orderId: string) => {
    setTelegramCodes(prev => ({
      ...prev,
      [orderId]: { loading: true }
    }));

    try {
      const res = await fetch(`/api/orders/${orderId}/telegram-code`);
      const data = await res.json();

      if (!res.ok || data.error) {
        setTelegramCodes(prev => ({
          ...prev,
          [orderId]: { error: data.error || (isAr ? 'تعذر استدعاء الرمز حالياً' : 'Failed to fetch code') }
        }));
      } else {
        setTelegramCodes(prev => ({
          ...prev,
          [orderId]: { code: data.code || (data.today_codes && data.today_codes[0]?.code) || (isAr ? 'لا يوجد كود نشط بعد' : 'No code yet') }
        }));
      }
    } catch (err: any) {
      setTelegramCodes(prev => ({
        ...prev,
        [orderId]: { error: err.message || (isAr ? 'حدث خطأ أثناء الجلب' : 'Error occurred') }
      }));
    }
  };

  const getProductIcon = (iconName?: string) => {
    if (iconName === 'netflix') return Tv;
    if (iconName === 'spotify') return SpotifyIcon;
    if (iconName === 'youtube') return YoutubeIcon;
    if (iconName === 'gemini' || iconName === 'chatgpt') return Terminal;
    return Package;
  };

  const inferredMethod = paymentMethod || (orders[0]?.payment_method ? orders[0].payment_method.toUpperCase() : 'ONLINE / CARDS');

  return (
    <div className="w-full max-w-2xl mx-auto text-black select-none print:p-0">
      
      {/* ── Main Receipt Card (Responsive & Mobile-Optimized) ── */}
      <div className="bg-white border-[3px] border-black rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-9 shadow-[6px_6px_0px_0px_#000] sm:shadow-[8px_8px_0px_0px_#000] relative overflow-hidden space-y-5 sm:space-y-7 print:border-none print:shadow-none print:p-2">
        
        {/* Top Multi-Color Strip */}
        <div className="absolute top-0 left-0 right-0 h-3 sm:h-3.5 bg-gradient-to-r from-[#06D6A0] via-[#FFE600] to-[#4CC9F0] border-b-2 border-black" />

        {/* ── Official Receipt Header ── */}
        <div className="pt-2 text-center space-y-3 border-b-2 border-dashed border-neutral-300 pb-5 sm:pb-6">
          
          {/* Top Pill Seal */}
          <div className="inline-flex items-center gap-1.5 bg-[#FFE600] border-2 border-black px-3 py-1 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-[1.5px_1.5px_0px_0px_#000]">
            <Receipt className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>
              {isPending 
                ? (isAr ? 'إيصال ومعاملة قيد المراجعة والاعتماد' : 'Pending Verification Receipt') 
                : (isAr ? 'إيصال دفع إلكتروني معتمد' : 'Official Electronic Receipt')}
            </span>
          </div>

          {/* Big Check / Pending Icon Badge */}
          <div className={`w-14 h-14 sm:w-20 sm:h-20 rounded-2xl border-2 border-black flex items-center justify-center mx-auto shadow-[3px_3px_0px_0px_#000] transition-transform active:scale-95 ${
            isFulfilled ? 'bg-[#06D6A0]' : 'bg-[#FFE600] animate-pulse'
          }`}>
            {isFulfilled ? (
              <CheckCircle2 className="w-8 h-8 sm:w-12 sm:h-12 text-black stroke-[2.5]" />
            ) : (
              <Loader2 className="w-8 h-8 sm:w-12 sm:h-12 text-black stroke-[2.5] animate-spin" />
            )}
          </div>

          {/* Title & Subtitle */}
          <div className="space-y-1">
            <h1 className="text-xl sm:text-3xl font-black text-black tracking-tight leading-snug">
              {isFulfilled
                ? (isAr ? 'شكراً لك، تم الدفع والتسليم بنجاح!' : 'Payment Verified & Delivered!')
                : (isAr ? 'طلبك قيد المراجعة والتأكيد' : 'Order Under Review & Verification')}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-800 font-bold max-w-md mx-auto leading-relaxed">
              {isFulfilled 
                ? (isAr ? 'تمت معالجة معاملتك بنجاح واعتماد الفاتورة وحفظ التراخيص في حسابك.' : 'Your transaction has been processed and your licenses are securely saved.')
                : (isAr ? 'تم استلام إثبات التحويل بنجاح، ويقوم فريق الدعم بمراجعته وتجهيز التراخيص فوراً.' : 'Payment proof received. Our team is verifying and preparing your digital credentials.')}
            </p>
          </div>
        </div>

        {/* ── 4-Tile Metadata Grid (Ultra-Clean on Mobile) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          
          {/* Tile 1: Receipt Number */}
          <div className="bg-[#FFFDF9] border-2 border-black rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 space-y-1 shadow-[2px_2px_0px_0px_#000] text-start">
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-black text-neutral-700 uppercase tracking-wider">
              <Hash className="w-3 h-3 text-black stroke-[2.5]" />
              <span>{isAr ? 'رقم الإيصال' : 'Receipt No.'}</span>
            </div>
            <button 
              onClick={() => handleCopy(displayReceiptNumber, 'receipt-no')}
              className="font-mono text-xs sm:text-sm font-black text-black hover:text-emerald-700 flex items-center justify-between w-full transition-colors cursor-pointer"
              title="Copy"
            >
              <span className="truncate">{displayReceiptNumber}</span>
              {copiedText === 'receipt-no' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3] shrink-0" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
              )}
            </button>
          </div>

          {/* Tile 2: Date & Time */}
          <div className="bg-[#FFFDF9] border-2 border-black rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 space-y-1 shadow-[2px_2px_0px_0px_#000] text-start">
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-black text-neutral-700 uppercase tracking-wider">
              <Calendar className="w-3 h-3 text-black stroke-[2.5]" />
              <span>{isAr ? 'التاريخ' : 'Date'}</span>
            </div>
            <div className="font-mono text-[11px] sm:text-xs font-bold text-black truncate leading-snug">
              {receiptDate}
            </div>
          </div>

          {/* Tile 3: Payment Method */}
          <div className="bg-[#FFFDF9] border-2 border-black rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 space-y-1 shadow-[2px_2px_0px_0px_#000] text-start">
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-black text-neutral-700 uppercase tracking-wider">
              <CreditCard className="w-3 h-3 text-black stroke-[2.5]" />
              <span>{isAr ? 'وسيلة الدفع' : 'Payment'}</span>
            </div>
            <div className="text-[11px] sm:text-xs font-black text-black truncate leading-snug">
              {inferredMethod}
            </div>
          </div>

          {/* Tile 4: Status */}
          <div className="bg-[#FFFDF9] border-2 border-black rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 space-y-1 shadow-[2px_2px_0px_0px_#000] text-start">
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-black text-neutral-700 uppercase tracking-wider">
              <FileCheck2 className="w-3 h-3 text-black stroke-[2.5]" />
              <span>{isAr ? 'حالة السداد' : 'Status'}</span>
            </div>
            <div className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-black text-black px-2 py-0.5 rounded-md border border-black shadow-[1px_1px_0px_0px_#000] ${
              isFulfilled ? 'bg-[#06D6A0]' : 'bg-[#FFE600] animate-pulse'
            }`}>
              <span>
                {isFulfilled 
                  ? (isAr ? 'مدفوع ومؤكد' : 'Settled') 
                  : (isAr ? 'قيد المراجعة' : 'Under Review')}
              </span>
            </div>
          </div>

        </div>

        {/* ── Total Paid Banner (High Contrast Canary Yellow) ── */}
        <div className="bg-[#FFE600] border-2 border-black rounded-2xl p-3.5 sm:p-5 flex items-center justify-between shadow-[3.5px_3.5px_0px_0px_#000] sm:shadow-[4px_4px_0px_0px_#000]">
          <div className="text-start space-y-0.5">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-black block">
              {isAr ? 'المبلغ الإجمالي' : 'Total Amount'}
            </span>
            <span className="text-[10px] sm:text-xs text-neutral-900 font-bold block">
              {isAr ? 'شامل الضرائب وضمان UpStore الذهبي' : 'Includes all taxes & lifetime guarantee'}
            </span>
          </div>
          <div className="text-xl sm:text-4xl font-black font-mono text-black tracking-tight">
            {mounted ? formatPrice(calculatedTotal) : `$${calculatedTotal.toFixed(2)}`}
          </div>
        </div>

        {/* ── Integrated Order Fulfillment Journey (مسار تتبع واعتماد الطلب المدمج) ── */}
        <div className="bg-[#FFFDF9] border-2 border-black rounded-2xl p-4 sm:p-5 shadow-[3.5px_3.5px_0px_0px_#000] text-start space-y-4">
          
          {/* Header with 100% Completed / Active Progress Badge */}
          <div className="flex items-center justify-between border-b-2 border-black pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl border-2 border-black flex items-center justify-center shadow-[1.5px_1.5px_0px_0px_#000] text-black ${
                isFulfilled ? 'bg-[#06D6A0]' : 'bg-[#FFE600]'
              }`}>
                <Compass className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-black">
                  {isAr ? 'مسار تنفيذ واعتماد الطلب' : 'Order Fulfillment Journey'}
                </h3>
                <p className="text-[10px] sm:text-xs text-neutral-700 font-bold">
                  {isAr ? 'تتبع فوري ومباشر لكافة مراحل تسليم الخدمة' : 'Live step-by-step service delivery roadmap'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isFulfilled ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-black bg-[#06D6A0] text-black px-3 py-1.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 stroke-[3] text-black" />
                  <span>{isAr ? 'اكتملت كافة الخطوات 100%' : '100% Completed'}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-black bg-[#FFE600] text-black px-3 py-1.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin stroke-[3]" />
                  <span>{isAr ? 'المرحلة 2: قيد المراجعة والتحقق...' : 'Step 2: Under Review...'}</span>
                </span>
              )}
            </div>
          </div>

          {/* Visual Progress Bar Strip */}
          <div className="space-y-1.5">
            <div className="w-full bg-neutral-200 border-2 border-black h-3.5 rounded-full overflow-hidden p-0.5 shadow-[1px_1px_0px_0px_#000]">
              <div 
                className={`h-full rounded-full transition-all duration-700 border border-black ${
                  isFulfilled 
                    ? 'w-full bg-gradient-to-r from-[#06D6A0] via-[#FFE600] to-[#06D6A0]' 
                    : 'w-2/5 bg-gradient-to-r from-[#06D6A0] to-[#FFE600] animate-pulse'
                }`} 
              />
            </div>
          </div>

          {/* 4 Steps Milestones Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            
            {/* Step 1: Placed */}
            <div className="p-3 bg-white border-2 border-black rounded-xl shadow-[1.5px_1.5px_0px_0px_#000] flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#06D6A0] border border-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000] text-black">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-black text-black">{isAr ? '1. تسجيل وتأكيد الطلب' : '1. Order Registered'}</h4>
                  <span className="text-[9px] font-mono font-black text-emerald-900 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                </div>
                <p className="text-[10px] text-neutral-700 font-bold leading-tight mt-0.5">
                  {isAr ? 'تم استلام الطلب وحجز البيانات بالنظام' : 'Order received & items reserved'}
                </p>
              </div>
            </div>

            {/* Step 2: Payment */}
            <div className="p-3 bg-white border-2 border-black rounded-xl shadow-[1.5px_1.5px_0px_0px_#000] flex items-start gap-2.5">
              <div className={`w-7 h-7 rounded-lg border border-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000] text-black ${
                isFulfilled ? 'bg-[#06D6A0]' : 'bg-[#FFE600] animate-pulse'
              }`}>
                {isFulfilled ? <Check className="w-4 h-4 stroke-[3]" /> : <Loader2 className="w-3.5 h-3.5 stroke-[2.5] animate-spin" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-black text-black">
                    {isFulfilled ? (isAr ? '2. التحقق المالي والإيصال' : '2. Payment Verified') : (isAr ? '2. التحقق المالي ومراجعة الإيصال' : '2. Reviewing Payment Proof')}
                  </h4>
                  <span className={`text-[9px] font-mono font-black px-1.5 py-0.2 rounded border flex items-center justify-center ${
                    isFulfilled ? 'text-emerald-900 bg-emerald-100 border-emerald-300' : 'text-amber-900 bg-amber-100 border-amber-300 animate-pulse'
                  }`}>
                    {isFulfilled ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : '...'}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-700 font-bold leading-tight mt-0.5">
                  {isFulfilled 
                    ? (isAr ? 'تم تأكيد السداد وإصدار الفاتورة الرقمية' : 'Payment settled & receipt generated')
                    : (isAr ? 'جاري التحقق من إثبات التحويل المالي...' : 'Verifying payment transfer proof...')}
                </p>
              </div>
            </div>

            {/* Step 3: Key Generation / Credentials */}
            <div className="p-3 bg-white border-2 border-black rounded-xl shadow-[1.5px_1.5px_0px_0px_#000] flex items-start gap-2.5">
              <div className={`w-7 h-7 rounded-lg border border-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000] text-black ${
                isFulfilled ? 'bg-[#06D6A0]' : 'bg-neutral-100 opacity-60'
              }`}>
                {isFulfilled ? <Check className="w-4 h-4 stroke-[3]" /> : <Cpu className="w-3.5 h-3.5 stroke-[2]" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h4 className={`text-xs font-black ${isFulfilled ? 'text-black' : 'text-neutral-500'}`}>
                    {isAr ? '3. تجهيز وتشفير التراخيص' : '3. Key Generation'}
                  </h4>
                  <span className={`text-[9px] font-mono font-black px-1.5 py-0.2 rounded border flex items-center justify-center ${
                    isFulfilled ? 'text-emerald-900 bg-emerald-100 border-emerald-300' : 'text-neutral-500 bg-neutral-100 border-neutral-300'
                  }`}>
                    {isFulfilled ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : '...'}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-600 font-bold leading-tight mt-0.5">
                  {isFulfilled 
                    ? (isAr ? 'فحص المفاتيح وتجهيز بيانات الحساب' : 'Generating & validating credentials')
                    : (isAr ? 'بانتظار اعتماد الإيصال لتوليد البيانات' : 'Waiting for confirmation to issue key')}
                </p>
              </div>
            </div>

            {/* Step 4: Final Delivery & Warranty */}
            <div className="p-3 bg-white border-2 border-black rounded-xl shadow-[1.5px_1.5px_0px_0px_#000] flex items-start gap-2.5">
              <div className={`w-7 h-7 rounded-lg border border-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000] text-black ${
                isFulfilled ? 'bg-[#06D6A0]' : 'bg-neutral-100 opacity-60'
              }`}>
                {isFulfilled ? <Check className="w-4 h-4 stroke-[3]" /> : <PackageCheck className="w-3.5 h-3.5 stroke-[2]" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h4 className={`text-xs font-black ${isFulfilled ? 'text-black' : 'text-neutral-500'}`}>
                    {isAr ? '4. التسليم وتفعيل الضمان' : '4. Delivered & Active'}
                  </h4>
                  <span className={`text-[9px] font-mono font-black px-1.5 py-0.2 rounded border flex items-center justify-center ${
                    isFulfilled ? 'text-emerald-900 bg-emerald-100 border-emerald-300' : 'text-neutral-500 bg-neutral-100 border-neutral-300'
                  }`}>
                    {isFulfilled ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : '...'}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-600 font-bold leading-tight mt-0.5">
                  {isFulfilled 
                    ? (isAr ? 'البيانات جاهزة للاستخدام + ضمان UpStore' : 'Ready to use with lifetime warranty')
                    : (isAr ? 'سيتم تسليم وتفعيل الطلب فور الاعتماد' : 'Order delivery upon verification')}
                </p>
              </div>
            </div>

          </div>

          {/* Celebratory Completion or Pending Review Banner */}
          {isFulfilled ? (
            <div className="p-3.5 bg-[#06D6A0] border-2 border-black rounded-xl shadow-[2.5px_2.5px_0px_0px_#000] flex items-center gap-2.5 text-black animate-in fade-in">
              <Sparkles className="w-5 h-5 stroke-[2.5] shrink-0" />
              <p className="text-xs font-black leading-snug">
                {isAr 
                  ? 'تهانينا! تمت كافة خطوات الشراء والاعتماد والتسليم بنجاح تام، وأصبحت الخدمة جاهزة وفعلية في حسابك.'
                  : 'Congratulations! All order fulfillment steps have succeeded and your product is ready for instant use.'}
              </p>
            </div>
          ) : (
            <div className="p-3.5 bg-[#FFE600] border-2 border-black rounded-xl shadow-[2.5px_2.5px_0px_0px_#000] flex items-center gap-2.5 text-black animate-pulse">
              <Loader2 className="w-5 h-5 stroke-[2.5] shrink-0 animate-spin" />
              <p className="text-xs font-black leading-snug">
                {isAr 
                  ? 'طلبك وإثبات الدفع قيد المراجعة السريعة من قبل فريق UpStore. ستصلك إشعارات فورية وتظهر التراخيص هنا بمجرد الاعتماد.'
                  : 'Your payment proof is being verified by the UpStore team. You will receive instant notifications and credentials once approved.'}
              </p>
            </div>
          )}

        </div>

        {/* ── Purchased Products Section ── */}
        {orders.length > 0 && (
          <div className="space-y-2.5 text-start">
            <div className="flex items-center justify-between border-b-2 border-black pb-2 flex-wrap gap-1.5">
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-black flex items-center gap-2">
                <Package className="w-4 h-4 text-black stroke-[2.5]" />
                <span>{isAr ? 'المنتجات والخدمات المشتراة' : 'Purchased Products & Licenses'}</span>
              </h3>
              
              <div className="flex items-center gap-1.5">
                {orders.length > 2 && (
                  <span className="text-[10px] font-black text-black bg-[#FFE600] px-2 py-0.5 rounded-full border border-black sm:hidden">
                    {isAr ? 'مرر للأسفل ↓' : 'Scroll down ↓'}
                  </span>
                )}
                <span className="text-xs font-mono font-black text-black bg-neutral-100 border border-black px-2 py-0.5 rounded-md">
                  {orders.length} {isAr ? 'منتج' : 'item(s)'}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[260px] sm:max-h-[300px] overflow-y-auto pr-1 relative touch-pan-y">
              {orders.map((ord, idx) => {
                const prod = ord.products || {};
                const { name: productName, duration } = translateProduct(
                  prod.slug || '',
                  prod.name || (isAr ? 'منتج رقمي' : 'Digital Product'),
                  prod.name_ar
                );
                const IconComponent = getProductIcon(prod.icon_name);
                const isTelegram = prod.delivery_mode === 'telegram';

                return (
                  <div 
                    key={ord.id || idx}
                    className="bg-[#FFFDF9] border-2 border-black rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 shadow-[2.5px_2.5px_0px_0px_#000] sm:shadow-[3px_3px_0px_0px_#000]"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white border-2 border-black flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_0px_#000]">
                        <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-black stroke-[2]" />
                      </div>
                      <div className="min-w-0 space-y-0.5 sm:space-y-1">
                        <h4 className="text-xs sm:text-sm font-black text-black truncate leading-tight">
                          {productName}
                        </h4>
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          {duration && (
                            <span className="text-[9px] sm:text-[10px] font-black text-black bg-[#4CC9F0] px-1.5 py-0.5 rounded border border-black shadow-[0.5px_0.5px_0px_0px_#000]">
                              {duration}
                            </span>
                          )}
                          {isTelegram && (
                            <span className="text-[9px] sm:text-[10px] font-black text-black bg-[#FFE600] px-1.5 py-0.5 rounded border border-black shadow-[0.5px_0.5px_0px_0px_#000]">
                              {isAr ? 'تسليم تيليجرام' : 'Telegram Delivery'}
                            </span>
                          )}
                          <span className="text-[9px] sm:text-[10px] font-mono font-bold text-neutral-700">
                            #{ord.id ? ord.id.substring(0, 8).toUpperCase() : `ITEM-${idx + 1}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-end shrink-0">
                      <div className="text-xs sm:text-sm font-black font-mono text-black">
                        {mounted ? formatPrice(ord.amount || 0) : `$${ord.amount || 0}`}
                      </div>
                      <div className="text-[9px] sm:text-[10px] font-black text-emerald-800">
                        {isAr ? 'تم التسليم' : 'Delivered'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Delivered Credentials / Key Vault Section ── */}
        {orders.length > 0 && (
          <div className="space-y-2.5 text-start">
            <div className="flex items-center justify-between border-b-2 border-black pb-2 flex-wrap gap-1.5">
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-black flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-black stroke-[2.5]" />
                <span>{isAr ? 'بيانات التراخيص والحسابات المسلمة' : 'Delivered Account Credentials & Keys'}</span>
              </h3>
              {isPendingFulfillment && (
                <span className="text-[10px] font-black text-black bg-[#FFE600] px-2.5 py-0.5 rounded-full border border-black animate-pulse flex items-center gap-1 shadow-[1px_1px_0px_0px_#000]">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {isAr ? 'جاري تجهيز الحساب...' : 'Preparing...'}
                </span>
              )}
            </div>

            <div className="space-y-3 max-h-[300px] sm:max-h-[340px] overflow-y-auto pr-1 relative touch-pan-y">
              {orders.map((ord, idx) => {
                const prod = ord.products || {};
                const { name: productName } = translateProduct(
                  prod.slug || '',
                  prod.name || 'Digital Product',
                  prod.name_ar
                );
                const isTelegram = prod.delivery_mode === 'telegram';
                const hasKey = ord.product_key && ord.product_key !== 'PENDING_FULFILLMENT';
                const keyInfo = hasKey ? parseDeliveryPayload(ord.product_key) : null;
                const isZelenkaAccount = keyInfo && (keyInfo as any).zelenkaData;
                const isFormattedAccount = keyInfo && keyInfo.pass !== 'N/A';
                const isPasswordVisible = Boolean(showPasswordMap[ord.id || idx]);

                // 1. Telegram Mode
                if (isTelegram) {
                  const telegramMessage = isAr
                    ? `السلام عليكم، أود استلام طلبي لمنتج ${productName} رقم الطلب: #${(ord.id || primaryOrderId).substring(0, 8).toUpperCase()}`
                    : `Hello, I would like to claim my order for ${productName}. Order ID: #${(ord.id || primaryOrderId).substring(0, 8).toUpperCase()}`;
                  const telegramLink = `https://t.me/UpStore_Delivery?text=${encodeURIComponent(telegramMessage)}`;

                  return (
                    <div key={ord.id || idx} className="bg-[#FFFDF9] border-2 border-black rounded-xl sm:rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-[2.5px_2.5px_0px_0px_#000] sm:shadow-[3px_3px_0px_0px_#000]">
                      <div className="flex justify-between items-center border-b border-black/10 pb-2">
                        <h4 className="text-xs sm:text-sm font-black text-black">{productName}</h4>
                        <span className="text-[10px] font-mono font-bold text-neutral-700">
                          #{(ord.id || primaryOrderId).substring(0, 8).toUpperCase()}
                        </span>
                      </div>

                      <p className="text-xs text-neutral-900 font-bold leading-relaxed bg-white p-3 rounded-xl border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]">
                        {isAr
                          ? 'هذا المنتج يتم تسليمه مباشرة وفورياً من خلال مسؤول التسليم في تيليجرام. اضغط الزر أدناه للاستلام المباشر:'
                          : 'This product is delivered instantly via our dedicated Telegram fulfillment agent. Click below to claim:'}
                      </p>

                      <a
                        href={telegramLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3.5 bg-[#4CC9F0] hover:bg-[#3db6db] text-black font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-xs border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
                      >
                        <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                        <span>{isAr ? 'مراسلة مسؤول التسليم في تيليجرام للاستلام' : 'Claim on Telegram Now'}</span>
                      </a>
                    </div>
                  );
                }

                // 2. Pending Fulfillment
                if (isPendingFulfillment && !hasKey) {
                  return (
                    <div key={ord.id || idx} className="bg-[#FFFDF9] border-2 border-black rounded-xl sm:rounded-2xl p-5 text-center space-y-2 shadow-[2px_2px_0px_0px_#000]">
                      <Loader2 className="w-6 h-6 text-black animate-spin mx-auto" />
                      <p className="text-xs font-black text-black">
                        {isAr ? 'جاري تجهيز مفتاح التفعيل وبيانات الحساب آلياً...' : 'Generating your account credentials...'}
                      </p>
                    </div>
                  );
                }

                // 3. Zelenka / Rich Digital Account
                if (isZelenkaAccount) {
                  const zData = (keyInfo as any).zelenkaData;
                  return (
                    <div key={ord.id || idx} className="bg-[#FFFDF9] border-2 border-black rounded-xl sm:rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-[2.5px_2.5px_0px_0px_#000] sm:shadow-[3px_3px_0px_0px_#000]">
                      <div className="flex justify-between items-center border-b border-black/15 pb-2">
                        <h4 className="text-xs sm:text-sm font-black text-black">{productName}</h4>
                        <span className="text-[10px] font-mono font-bold text-neutral-700">
                          #{(ord.id || primaryOrderId).substring(0, 8).toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-xs">
                        {zData.login && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-black text-black uppercase tracking-wider block">
                              {isAr ? 'اسم المستخدم / البريد الإلكتروني' : 'Username / Email'}
                            </span>
                            <div className="flex items-center justify-between bg-white border-2 border-black rounded-xl px-3 py-2 shadow-[1.5px_1.5px_0px_0px_#000]">
                              <code className="font-mono font-black text-black break-all select-all text-xs">{zData.login}</code>
                              <button onClick={() => handleCopy(zData.login, `z-login-${idx}`)} className="cursor-pointer ml-2 text-black hover:text-emerald-700 transition-colors p-1">
                                {copiedText === `z-login-${idx}` ? <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> : <Copy className="w-4 h-4 stroke-[2.5]" />}
                              </button>
                            </div>
                          </div>
                        )}

                        {zData.password && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-black text-black uppercase tracking-wider block">
                              {isAr ? 'كلمة المرور' : 'Password'}
                            </span>
                            <div className="flex items-center justify-between bg-white border-2 border-black rounded-xl px-3 py-2 shadow-[1.5px_1.5px_0px_0px_#000]">
                              <code className="font-mono font-black text-black break-all select-all text-xs">
                                {isPasswordVisible ? zData.password : '••••••••••••'}
                              </code>
                              <div className="flex items-center gap-2">
                                <button onClick={() => setShowPasswordMap(prev => ({ ...prev, [ord.id || idx]: !prev[ord.id || idx] }))} className="cursor-pointer text-black hover:opacity-70 p-1">
                                  {isPasswordVisible ? <EyeOff className="w-4 h-4 stroke-[2.5]" /> : <Eye className="w-4 h-4 stroke-[2.5]" />}
                                </button>
                                <button onClick={() => handleCopy(zData.password, `z-pass-${idx}`)} className="cursor-pointer text-black hover:text-emerald-700 transition-colors p-1">
                                  {copiedText === `z-pass-${idx}` ? <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> : <Copy className="w-4 h-4 stroke-[2.5]" />}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Telegram Verification Code Helper */}
                      {(zData.phone || zData.auth_key) && (
                        <div className="pt-2.5 border-t border-black/10 flex items-center justify-between flex-wrap gap-2">
                          <span className="text-xs font-black text-black">
                            {isAr ? 'رمز التحقق (Telegram 2FA):' : 'Telegram 2FA Code:'}
                          </span>
                          <button
                            disabled={telegramCodes[ord.id]?.loading}
                            onClick={() => handleFetchTelegramCode(ord.id)}
                            className="bg-[#FFE600] hover:bg-[#edd600] border-2 border-black px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                          >
                            {telegramCodes[ord.id]?.loading && <Loader2 className="w-3 h-3 animate-spin" />}
                            <span>{isAr ? 'استدعاء رمز التحقق الآن' : 'Fetch Verification Code'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }

                // 4. Standard Formatted Account (Email + Password + PIN)
                if (isFormattedAccount) {
                  return (
                    <div key={ord.id || idx} className="bg-[#FFFDF9] border-2 border-black rounded-xl sm:rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-[2.5px_2.5px_0px_0px_#000] sm:shadow-[3px_3px_0px_0px_#000]">
                      <div className="flex justify-between items-center border-b border-black/15 pb-2">
                        <h4 className="text-xs sm:text-sm font-black text-black">{productName}</h4>
                        <span className="text-[10px] font-mono font-bold text-neutral-700">
                          #{(ord.id || primaryOrderId).substring(0, 8).toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-xs">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-black uppercase tracking-wider block">
                            {isAr ? 'البريد الإلكتروني / الحساب' : 'Email / Login'}
                          </span>
                          <div className="flex items-center justify-between bg-white border-2 border-black rounded-xl px-3 py-2 shadow-[1.5px_1.5px_0px_0px_#000]">
                            <code className="font-mono font-black text-black break-all select-all text-xs">{keyInfo.email}</code>
                            <button onClick={() => handleCopy(keyInfo.email, `email-${idx}`)} className="cursor-pointer ml-2 text-black hover:text-emerald-700 transition-colors p-1">
                              {copiedText === `email-${idx}` ? <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> : <Copy className="w-4 h-4 stroke-[2.5]" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-black uppercase tracking-wider block">
                            {isAr ? 'كلمة المرور' : 'Password'}
                          </span>
                          <div className="flex items-center justify-between bg-white border-2 border-black rounded-xl px-3 py-2 shadow-[1.5px_1.5px_0px_0px_#000]">
                            <code className="font-mono font-black text-black break-all select-all text-xs">
                              {isPasswordVisible ? keyInfo.pass : '••••••••••••'}
                            </code>
                            <div className="flex items-center gap-2">
                              <button onClick={() => setShowPasswordMap(prev => ({ ...prev, [ord.id || idx]: !prev[ord.id || idx] }))} className="cursor-pointer text-black hover:opacity-70 p-1">
                                {isPasswordVisible ? <EyeOff className="w-4 h-4 stroke-[2.5]" /> : <Eye className="w-4 h-4 stroke-[2.5]" />}
                              </button>
                              <button onClick={() => handleCopy(keyInfo.pass, `pass-${idx}`)} className="cursor-pointer text-black hover:text-emerald-700 transition-colors p-1">
                                {copiedText === `pass-${idx}` ? <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> : <Copy className="w-4 h-4 stroke-[2.5]" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Profile & PIN if applicable */}
                      {(keyInfo.profile !== 'N/A' || keyInfo.pin !== 'N/A') && (
                        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 text-xs">
                          {keyInfo.profile !== 'N/A' && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-black text-black uppercase tracking-wider block">
                                {isAr ? 'الملف الشخصي (Profile)' : 'Profile'}
                              </span>
                              <div className="bg-white border-2 border-black rounded-xl px-3 py-2 font-mono font-black text-black text-center shadow-[1.5px_1.5px_0px_0px_#000]">
                                {keyInfo.profile}
                              </div>
                            </div>
                          )}
                          {keyInfo.pin !== 'N/A' && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-black text-black uppercase tracking-wider block">
                                {isAr ? 'رمز الدخول (PIN)' : 'PIN Code'}
                              </span>
                              <div className="bg-white border-2 border-black rounded-xl px-3 py-2 font-mono font-black text-black text-center shadow-[1.5px_1.5px_0px_0px_#000]">
                                {keyInfo.pin}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Instructions */}
                      {(keyInfo.instructions || keyInfo.instructionsAr) && (
                        <div className="pt-2 border-t border-black/10">
                          <span className="text-[10px] font-black text-black uppercase tracking-wider block mb-1">
                            {isAr ? 'تعليمات التفعيل والاستخدام:' : 'Activation Instructions:'}
                          </span>
                          <p className="text-xs text-neutral-900 leading-relaxed font-bold bg-white p-3 rounded-xl border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000] whitespace-pre-line">
                            {isAr ? keyInfo.instructionsAr : keyInfo.instructions}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                }

                // 5. Standard License Key
                return (
                  <div key={ord.id || idx} className="bg-[#FFFDF9] border-2 border-black rounded-xl sm:rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-[2.5px_2.5px_0px_0px_#000] sm:shadow-[3px_3px_0px_0px_#000]">
                    <div className="flex justify-between items-center border-b border-black/15 pb-2">
                      <h4 className="text-xs sm:text-sm font-black text-black">{productName}</h4>
                      <span className="text-[10px] font-mono font-bold text-neutral-700">
                        #{(ord.id || primaryOrderId).substring(0, 8).toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-black uppercase tracking-wider block">
                        {isAr ? 'مفتاح التفعيل والترخيص الرقمي' : 'Digital License Key'}
                      </span>
                      <div className="flex items-center justify-between bg-white border-2 border-black rounded-xl px-3.5 py-2.5 shadow-[1.5px_1.5px_0px_0px_#000]">
                        <code className="font-mono font-black text-black break-all select-all text-xs sm:text-sm">{ord.product_key}</code>
                        <button onClick={() => handleCopy(ord.product_key, `raw-key-${idx}`)} className="cursor-pointer ml-2 text-black hover:text-emerald-700 transition-colors p-1">
                          {copiedText === `raw-key-${idx}` ? <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> : <Copy className="w-4 h-4 stroke-[2.5]" />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Action Buttons (Touch-Optimized for Mobile) ── */}
        {showActions && (
          <div className="space-y-2.5 pt-2 print:hidden border-t-2 border-dashed border-neutral-300">
            
            {/* WhatsApp Priority Delivery Dispatch */}
            <a
              href={`https://wa.me/201041140422?text=${encodeURIComponent(
                `مرحباً خدمة تسليم طلبات UpStore، أود تأكيد واستلام طلبي:\n- رقم الطلب: ${primaryOrderId || '#ORDER'}\n- الإجمالي: ${totalAmount || ''}\n- طريقة الدفع: ${paymentMethod || 'تحويل إلكتروني'}\n(مرفق صورة إيصال التحويل للاعتماد والتسليم)`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 sm:py-3.5 bg-[#25D366] hover:bg-[#20bd5a] border-2 border-black text-black font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl sm:rounded-2xl shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Smartphone className="w-4 h-4 stroke-[2.5]" />
              <span>{isAr ? 'تأكيد واستلام الطلب (واتساب: 01041140422)' : 'Confirm & Receive Order (01041140422)'}</span>
              <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
            </a>

            {/* Action Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
              
              {/* Track Order Button */}
              {onTrackOrder ? (
                <button
                  onClick={() => onTrackOrder(primaryOrderId)}
                  className={`w-full py-3 sm:py-3.5 border-2 border-black text-black font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl sm:rounded-2xl shadow-[2.5px_2.5px_0px_0px_#000] sm:shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isPending ? 'bg-[#FFE600] hover:bg-[#edd600] animate-pulse' : 'bg-[#4CC9F0] hover:bg-[#3db6db]'
                  }`}
                >
                  <Compass className="w-4 h-4 stroke-[2.5]" />
                  <span>{isAr ? 'تتبع الطلب' : 'Track'}</span>
                </button>
              ) : (
                <Link
                  href={`/track?order_id=${primaryOrderId}`}
                  className={`w-full py-3 sm:py-3.5 border-2 border-black text-black font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl sm:rounded-2xl shadow-[2.5px_2.5px_0px_0px_#000] sm:shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isPending ? 'bg-[#FFE600] hover:bg-[#edd600] animate-pulse' : 'bg-[#4CC9F0] hover:bg-[#3db6db]'
                  }`}
                >
                  <Compass className="w-4 h-4 stroke-[2.5]" />
                  <span>{isAr ? 'تتبع الطلب' : 'Track'}</span>
                </Link>
              )}

              {/* Print / Save Receipt */}
              <button
                onClick={handlePrint}
                className="w-full py-3 sm:py-3.5 bg-white hover:bg-neutral-100 border-2 border-black text-black font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl sm:rounded-2xl shadow-[2.5px_2.5px_0px_0px_#000] sm:shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 stroke-[2.5]" />
                <span>{isAr ? 'طباعة' : 'Print'}</span>
              </button>

              {/* Go to Orders List */}
              <Link 
                href="/dashboard?tab=orders" 
                className="w-full py-3 sm:py-3.5 bg-[#06D6A0] hover:bg-[#05b385] border-2 border-black text-black font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl sm:rounded-2xl shadow-[2.5px_2.5px_0px_0px_#000] sm:shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Package className="w-4 h-4 stroke-[2.5]" />
                <span>{isAr ? 'طلباتي' : 'Orders'}</span>
              </Link>
              
              {/* Continue Shopping */}
              <Link 
                href="/" 
                className="w-full py-3 sm:py-3.5 bg-[#FFE600] hover:bg-[#ebd300] border-2 border-black text-black font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl sm:rounded-2xl shadow-[2.5px_2.5px_0px_0px_#000] sm:shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{isAr ? 'تسوق' : 'Shop'}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5] rtl:rotate-180" />
              </Link>

            </div>

          </div>
        )}

        {/* ── Official Footer & Security Guarantee Seal ── */}
        <div className="pt-3 sm:pt-4 border-t-2 border-black flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 text-xs font-bold text-neutral-800">
          <div className="flex items-center gap-2 text-center sm:text-start">
            <ShieldCheck className="w-4 h-4 text-emerald-600 stroke-[2.5] shrink-0" />
            <span className="font-black text-[11px] sm:text-xs">{isAr ? 'تشفير آمن 256-Bit • ضمان UpStore الذهبي' : '256-Bit SSL Encrypted • UpStore Golden Warranty'}</span>
          </div>

          <button
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 text-black hover:opacity-75 transition-opacity font-black cursor-pointer bg-neutral-100 border border-black px-3 py-1.5 rounded-lg text-xs"
          >
            <Share2 className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{isAr ? 'مشاركة ملخص الإيصال' : 'Share Summary'}</span>
          </button>
        </div>

      </div>

    </div>
  );
}
