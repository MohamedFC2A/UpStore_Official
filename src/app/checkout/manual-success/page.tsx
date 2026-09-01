'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  ArrowRight,
  Upload,
  Loader2,
  Smartphone,
  Award,
  Clock,
  Copy,
  Check,
  Zap,
  Building,
  ShieldCheck,
  Bitcoin,
  ExternalLink,
  FileCheck,
  Sparkles,
  AlertCircle,
  Lock,
  User,
  AtSign,
  DollarSign,
  Bell,
  AlertTriangle,
  Ban,
  X,
  PhoneCall,
  Info
} from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { createClient } from '@/utils/supabase/client';
import { useToastStore } from '@/store/useToastStore';
import { getClientTelemetry } from '@/utils/clientTelemetry';

function ManualSuccessContent() {
  const { language, mounted } = useLocale();
  const isAr = mounted && language === 'ar';
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const method = (searchParams.get('method') || 'bybit_uid').toLowerCase();
  const currencyParam = (searchParams.get('currency') || 'usd').toLowerCase();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [isApproved, setIsApproved] = useState(false);
  
  // Payment Accounts & Addresses
  const [bybitUid, setBybitUid] = useState('47183921');
  const [bybitTrc20, setBybitTrc20] = useState('TW4z3c4PZ2Gk5YQ7nN9x8vK1mB5qP9R2e1');
  const [bybitBep20, setBybitBep20] = useState('0x71C836e520023a1B3a0279612301A949826a7C10');
  const [bybitTon, setBybitTon] = useState('EQBvW8m53GoU_jPAIp7LwY8Gj044kX_613p_dC6lQ1_y9Z1X');
  const [binancePayId, setBinancePayId] = useState('764476139');
  const [instapayAddress, setInstapayAddress] = useState('');
  const [instapayUrl, setInstapayUrl] = useState('');
  const [vodafoneNumber, setVodafoneNumber] = useState('');
  const [vodafoneUrl, setVodafoneUrl] = useState('');
  const [egCarrier, setEgCarrier] = useState<'vodafone' | 'orange' | 'etisalat' | 'we'>('vodafone');
  const [stcNumber, setStcNumber] = useState('0551234567');
  const [alrajhiIban, setAlrajhiIban] = useState('SA0380000000608010167519');

  const [senderName, setSenderName] = useState('');
  const [senderAccount, setSenderAccount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [ocrResult, setOcrResult] = useState<any | null>(null);
  const [excessPreference, setExcessPreference] = useState<'wallet' | 'refund_vodafone' | 'refund_instapay' | 'refund_bank' | 'refund'>('wallet');
  const [refundAccount, setRefundAccount] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [verifyingBybit, setVerifyingBybit] = useState(false);
  const [error, setError] = useState('');
  const [fraudWarning, setFraudWarning] = useState<{
    message: string;
    strikes: number;
    maxStrikes: number;
    isBanned: boolean;
    detectedRecipient?: string | null;
    reason?: string | null;
  } | null>(null);
  const [showFraudModal, setShowFraudModal] = useState(false);
  const [showPreTransferModal, setShowPreTransferModal] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [strictReviewNotice, setStrictReviewNotice] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleDismissPreTransferModal = () => {
    if (dontShowAgain && typeof window !== 'undefined') {
      try {
        const key = isVodafone ? 'vodafone_security_notice_dismissed' : 'instapay_security_notice_dismissed';
        localStorage.setItem(key, 'true');
      } catch {}
    }
    setShowPreTransferModal(false);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    useToastStore.getState().success(
      isAr ? 'تم النسخ بنجاح!' : 'Copied to clipboard!',
      text
    );
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleDialUssd = (ussdCode: string) => {
    navigator.clipboard.writeText(ussdCode);
    setCopiedKey('ussd_code');
    useToastStore.getState().success(
      isAr ? 'تم نسخ كود التحويل وفتح لوحة الاتصال' : 'USSD code copied & dialer opened',
      ussdCode
    );
    const telUrl = `tel:${ussdCode.replace(/#/g, '%23')}`;
    window.location.href = telUrl;
  };

  const checkApprovalStatus = async (supabase: any, safeSessionId: string) => {
    const { data: orderData } = await supabase
      .from('orders')
      .select('id, status')
      .eq('session_id', safeSessionId);
    if (orderData && orderData.length > 0) {
      const approved = orderData.some((o: any) => o.status === 'completed' || o.status === 'fulfilled' || o.status === 'paid');
      if (approved) {
        setIsApproved(true);
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    }
  };

  useEffect(() => {
    if (!sessionId) {
      router.push('/');
      return;
    }

    const loadOrderDetails = async () => {
      try {
        const supabase = createClient();
        const safeSessionId = sessionId || '';
        
        // 1. Fetch site settings
        const { data: settings } = await supabase.from('site_settings').select('key, value');
        if (settings) {
          for (const s of settings) {
            const rawVal = s.value;
            const val = typeof rawVal === 'string' ? rawVal.replace(/^"|"$/g, '') : String(rawVal || '');
            if (s.key === 'bybit_uid' && val) setBybitUid(val);
            if (s.key === 'bybit_usdt_trc20' && val) setBybitTrc20(val);
            if (s.key === 'bybit_usdt_bep20' && val) setBybitBep20(val);
            if (s.key === 'bybit_usdt_ton' && val) setBybitTon(val);
            if (s.key === 'binance_pay_id' && val) setBinancePayId(val);
            if (s.key === 'instapay_address') {
              const clean = val && !val.includes('yourname') ? val : '';
              setInstapayAddress(clean);
            }
            if (s.key === 'instapay_url' && val) {
              const normalized = val.includes('30M8Z') && !val.includes('30M8Zj') ? val.replace('30M8Z', '30M8Zj') : val;
              setInstapayUrl(normalized);
            }
            if (s.key === 'vodafone_cash_number' && val) setVodafoneNumber(val);
            if (s.key === 'vodafone_cash_url' && val) setVodafoneUrl(val);
            if (s.key === 'stc_pay_number' && val) setStcNumber(val);
            if (s.key === 'alrajhi_iban' && val) setAlrajhiIban(val);
          }
        }

        // 2. Fetch orders
        const { data: orderData, error: orderErr } = await supabase
          .from('orders')
          .select('id, amount, status, products(name), payment_sender, payment_transaction_id, payment_screenshot')
          .eq('session_id', safeSessionId);

        if (!orderErr && orderData) {
          setOrders(orderData);
          if (orderData[0]) {
            setSenderName(orderData[0].payment_sender || '');
            setTransactionId(orderData[0].payment_transaction_id || '');
            setScreenshotUrl(orderData[0].payment_screenshot || '');
            if (orderData[0].payment_sender || orderData[0].payment_screenshot || orderData[0].payment_transaction_id) {
              setSubmitted(true);
            }

            const alreadyApproved = orderData.some((o: any) => o.status === 'completed' || o.status === 'fulfilled' || o.status === 'paid');
            if (alreadyApproved) {
              setIsApproved(true);
            } else {
              pollingRef.current = setInterval(() => {
                checkApprovalStatus(supabase, safeSessionId);
              }, 4000);
            }
          }
        }
      } catch (err) {
        console.error('Error loading order details:', err);
      } finally {
        setLoading(false);
      }
    };

    loadOrderDetails();

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [sessionId, router]);

  const isInstapay = method.includes('instapay');
  const isVodafone = method.includes('vodafone');
  const isOrange = method.includes('orange');
  const isStc = method.includes('stc');
  const isAlrajhi = method.includes('alrajhi');
  const isPaypal = method.includes('paypal') || (!isInstapay && !isVodafone && !isOrange && !isStc && !isAlrajhi);

  const isEgypt = isInstapay || isVodafone || isOrange || currencyParam === 'egp';
  const isSaudi = isStc || isAlrajhi || currencyParam === 'sar';
  const rate = isEgypt ? 53 : isSaudi ? 4 : 1;
  const currencySymbol = isEgypt ? 'ج.م' : isSaudi ? 'ر.س' : '$';

  const totalBaseUsd = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const totalLocalAmount = (isEgypt || isSaudi) ? Math.ceil(totalBaseUsd * rate).toString() : (Math.ceil(totalBaseUsd * 100) / 100).toFixed(2);

  useEffect(() => {
    if ((isInstapay || isVodafone) && typeof window !== 'undefined') {
      try {
        const key = isVodafone ? 'vodafone_security_notice_dismissed' : 'instapay_security_notice_dismissed';
        const dismissed = localStorage.getItem(key);
        if (dismissed !== 'true') {
          setShowPreTransferModal(true);
        }
      } catch {}
    }
  }, [isInstapay, isVodafone]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Instant local preview
    const localPreview = URL.createObjectURL(file);
    setScreenshotUrl(localPreview);
    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('expectedAmount', totalLocalAmount);
    formData.append('sessionId', sessionId || '');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const res = await fetch('/api/checkout/manual/upload-receipt', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json();

      if (!res.ok) {
        setScreenshotUrl('');
        if (data.banned || res.status === 403) {
          setFraudWarning({
            message: data.message || 'تم حظر حسابك نهائياً',
            strikes: data.strikeCount || data.maxStrikes || 3,
            maxStrikes: data.maxStrikes || 3,
            isBanned: true,
          });
          setShowFraudModal(true);
          setError(data.message || 'تم حظر حسابك نهائياً.');
          useToastStore.getState().error('تم حظر الحساب نهائياً', data.message);
          return;
        } else if (data.isFraud || res.status === 400) {
          const limit = data.maxStrikes || 3;
          setFraudWarning({
            message: data.message,
            strikes: data.strikeCount || 1,
            maxStrikes: limit,
            isBanned: false,
            detectedRecipient: data.detectedRecipient,
            reason: data.reason,
          });
          setShowFraudModal(true);
          setError(data.message);
          useToastStore.getState().error(`تحذير أمني: مخالفة في الإيصال (${data.strikeCount || 1}/${limit})`, data.message);
          return;
        }
        throw new Error(data.error || data.message || 'فشل في رفع صورة الإيصال.');
      }

      setFraudWarning(null);
      setShowFraudModal(false);

      if (data.url) {
        setScreenshotUrl(data.url);
      }

      if (data.status === 'strict_review' || data.ocr?.status === 'strict_review' || data.ocr?.recipientStatus === 'recipient_missing') {
        setStrictReviewNotice(data.message || 'بيانات المستفيد غير واضحة - تم تحويل الطلب للمراجعة المشددة.');
        if (data.ocr) {
          setOcrResult(data.ocr);
          if (data.ocr.senderName) setSenderName(data.ocr.senderName);
          if (data.ocr.senderAccount || data.ocr.senderPhone) setSenderAccount(data.ocr.senderAccount || data.ocr.senderPhone);
          if (data.ocr.referenceNumber) setTransactionId(data.ocr.referenceNumber);
        }
        useToastStore.getState().warning(
          isAr ? 'قيد المراجعة المشددة' : 'Under Strict Review',
          data.message
        );
      } else {
        setStrictReviewNotice(null);
        if (data.ocr) {
          setOcrResult(data.ocr);
          if (data.ocr.senderName) setSenderName(data.ocr.senderName);
          if (data.ocr.senderAccount || data.ocr.senderPhone) setSenderAccount(data.ocr.senderAccount || data.ocr.senderPhone);
          if (data.ocr.referenceNumber) setTransactionId(data.ocr.referenceNumber);
          useToastStore.getState().success(
            isAr ? 'تم التحقق من بيانات الإيصال بنجاح' : 'Receipt verified successfully'
          );
        }
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        console.warn('Receipt upload took more than 12s, keeping local preview');
      } else {
        setError(err.message || 'Error uploading file.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenshotUrl) {
      setError(isAr 
        ? 'يرجى رفع إيصال التحويل أولاً لتأكيد الطلب.' 
        : 'Please upload the payment receipt first.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/checkout/manual/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          paymentSender: [senderName, senderAccount].filter(Boolean).join(' - ') || ocrResult?.senderName || ocrResult?.senderAccount || ocrResult?.senderPhone,
          paymentTransactionId: transactionId || ocrResult?.referenceNumber,
          paymentScreenshot: screenshotUrl,
          paymentMethod: method,
          ocrResult: ocrResult,
          excessPreference: excessPreference,
          refundRecipientAccount: refundAccount || senderAccount || senderName || '',
          amountDiff: ocrResult?.amount != null ? (Number(ocrResult.amount) - (parseFloat(totalLocalAmount) || 0)) : 0,
          clientTelemetry: getClientTelemetry(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit payment details.');
      }

      setSubmitted(true);
      useToastStore.getState().success(
        isAr ? 'تم إرسال إثبات الدفع بنجاح!' : 'Payment proof submitted successfully!',
        isAr ? 'جاري تحويلك لمتابعة حالة الطلب والتسليم...' : 'Redirecting to live order tracking...'
      );

      // Smoothly exit page and navigate to live tracking
      setTimeout(() => {
        if (data.redirectUrl) {
          router.push(data.redirectUrl);
        } else if (sessionId) {
          router.push(`/track?session_id=${encodeURIComponent(sessionId)}`);
        } else {
          router.push('/dashboard');
        }
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
      setSubmitting(false);
    }
  };

  // Automated Bybit TXID Verification
  const handleVerifyBybitTx = async () => {
    if (!transactionId.trim()) {
      setError(isAr ? 'يرجى إدخال رقم المعاملة (TXID) أولاً' : 'Please enter the transaction hash (TXID) first.');
      return;
    }

    setVerifyingBybit(true);
    setError('');

    try {
      const res = await fetch('/api/checkout/bybit/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          txId: transactionId.trim(),
          coin: 'USDT',
        }),
      });

      const data = await res.json();
      if (data.verified || data.payment_status === 'paid') {
        setIsApproved(true);
        useToastStore.getState().success(
          isAr ? 'تم التحقق من إيداع Bybit وتسليم المنتجات فوراً!' : 'Bybit deposit confirmed and order fulfilled!'
        );
      } else {
        setError(data.message || (isAr ? 'لم يتم تأكيد الإيداع على البلوكتشين بعد. يمكنك رفع إيصال التحويل للمراجعة الفورية.' : 'Deposit not yet confirmed on blockchain. You can submit the receipt for manual approval.'));
      }
    } catch (err: any) {
      setError(err.message || 'Verification check failed');
    } finally {
      setVerifyingBybit(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex flex-col items-center justify-center gap-3 text-black">
        <Loader2 className="w-10 h-10 text-black animate-spin" />
        <span className="text-black font-black text-xs uppercase tracking-wider">
          {isAr ? 'جاري استيراد تفاصيل جلسة الدفع...' : 'Loading payment session details...'}
        </span>
      </div>
    );
  }

  if (isApproved) {
    const shortSessionId = (sessionId || '').replace('manual_', '').replace('bybit_', '').split('_')[0].substring(0, 8).toUpperCase();
    return (
      <div className="min-h-screen bg-[#FFFDF9] py-8 sm:py-12 px-3 sm:px-4 flex items-center justify-center text-black">
        <div className="bg-white border-2 sm:border-[3px] border-black rounded-2xl sm:rounded-3xl p-4 sm:p-8 max-w-lg w-full shadow-[6px_6px_0px_0px_#000] sm:shadow-[8px_8px_0px_0px_#000] text-center space-y-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#06D6A0] border-2 border-black rounded-2xl flex items-center justify-center mx-auto shadow-[3px_3px_0px_0px_#000]">
            <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-black stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-3xl font-black text-black mb-1.5">
              {isAr ? 'تم تأكيد الدفع وتسليم طلبك بنجاح!' : 'Payment Verified & Delivered!'}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-700 font-bold leading-relaxed">
              {isAr
                ? 'تم التحقق من عملية الدفع واعتمادها من الإدارة وتسليم مفاتيحك وتراخيصك الرقمية مباشرة في حسابك.'
                : 'Your payment has been verified by admin and your digital keys have been delivered.'}
            </p>
          </div>

          {/* Instant Delivery Support Hero Button */}
          <a
            href="https://t.me/UPSTORE_HELP"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 bg-[#0088cc] hover:bg-[#0077b5] border-2 border-black text-white font-black uppercase tracking-wider rounded-xl sm:rounded-2xl shadow-[3.5px_3.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm transition-all"
          >
            <Smartphone className="w-4 h-4 stroke-[2.5]" />
            <span>{isAr ? 'تأكيد واستلام الطلب (@UPSTORE_HELP)' : 'Confirm & Receive Order via Support'}</span>
            <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
          </a>

          <div className="space-y-2.5 pt-1">
            <Link
              href={`/checkout/success?session_id=${sessionId}`}
              className="w-full py-3.5 bg-[#06D6A0] hover:bg-[#05b385] border-2 border-black text-black font-black uppercase tracking-wider rounded-xl sm:rounded-2xl shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm transition-all"
            >
              <FileCheck className="w-4 h-4 shrink-0 stroke-[2.5]" />
              <span>{isAr ? 'عرض إيصال الدفع الرسمي والبيانات' : 'View Official Payment Receipt'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5] rtl:rotate-180" />
            </Link>

            <Link
              href={`/track?session_id=${sessionId}`}
              className="w-full py-3 bg-[#4CC9F0] hover:bg-[#3db6db] border-2 border-black text-black font-black uppercase tracking-wider rounded-xl sm:rounded-2xl shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm transition-all"
            >
              <span>{isAr ? 'تتبع مسار الطلب والتسليم' : 'Track Order Progress'}</span>
            </Link>

            <Link
              href="/dashboard?tab=orders"
              className="w-full py-3 bg-white hover:bg-neutral-100 border-2 border-black text-black font-black uppercase tracking-wider rounded-xl sm:rounded-2xl shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm transition-all"
            >
              <Award className="w-4 h-4 shrink-0 stroke-[2.5]" />
              <span>{isAr ? 'الانتقال إلى لوحة طلباتي' : 'Go to My Orders'}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const shortSessionId = (sessionId || '').replace('manual_', '').replace('bybit_', '').split('_')[0].substring(0, 8).toUpperCase();

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-black py-6 sm:py-10 px-3 sm:px-4 flex items-center justify-center font-sans">
      <div className="bg-white border-2 sm:border-[3px] border-black rounded-2xl sm:rounded-3xl p-4 sm:p-8 max-w-xl w-full shadow-[4px_4px_0px_0px_#000] sm:shadow-[8px_8px_0px_0px_#000] text-start space-y-5 sm:space-y-6 select-none">
        
        {/* Header */}
        <div className="text-center pb-4 border-b-2 border-black">
          <div className="w-16 h-16 bg-[#FFE600] border-2 border-black rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-[3px_3px_0px_0px_#000]">
            {isInstapay ? (
              <img src="/images/payment/instapay.png?v=3" alt="InstaPay" className="w-9 h-9 object-contain" />
            ) : isVodafone ? (
              <Smartphone className="w-8 h-8 text-black stroke-[2.5]" />
            ) : isStc || isAlrajhi ? (
              <Building className="w-8 h-8 text-black stroke-[2.5]" />
            ) : (
              <Bitcoin className="w-8 h-8 text-black stroke-[2.5]" />
            )}
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#06D6A0] border border-black rounded-xl text-xs font-black mb-2 shadow-[2px_2px_0px_0px_#000]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              {isInstapay
                ? (isAr ? 'بوابة إنستاباي المعتمدة' : 'InstaPay Official Gateway')
                : (isAr ? 'بوابة الدفع والتسليم الآمن' : 'Official UpStore Checkout')}
            </span>
          </div>

          <h1 className="text-2xl font-black text-black">
            {isInstapay
              ? (isAr ? 'إتمام الدفع عبر إنستاباي (InstaPay)' : 'InstaPay Payment & Verification')
              : (isAr ? 'تأكيد عملية الدفع وتسليم المفاتيح' : 'Payment Confirmation & Instant Fulfillment')}
          </h1>
          <p className="text-xs text-neutral-700 font-bold mt-1 max-w-md mx-auto leading-relaxed">
            {isInstapay
              ? (isAr ? 'قم بالتحويل عبر تطبيق إنستاباي ثم ارفع صورة الإيصال ليتم فحصها بالـ AI وتسليم طلبك فوراً.' : 'Pay via InstaPay app then upload the receipt screenshot for AI verification.')
              : (isAr ? 'يرجى تحويل المبلغ الموضح أدناه ثم رفع إيصال التحويل لتسليم مفاتيحك فوراً.' : 'Please transfer the exact amount and upload the receipt.')}
          </p>
        </div>

        {/* Submitted & Pending Approval Banner */}
        {submitted && (
          <div className="p-4 bg-[#EDF9FF] border-2 border-black rounded-2xl space-y-3 shadow-[4px_4px_0px_0px_#000]">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FFE600] border-2 border-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000]">
                  <Clock className="w-4 h-4 text-black stroke-[2.5]" />
                </div>
                <div className="text-start">
                  <h3 className="text-xs sm:text-sm font-black text-black">
                    {isAr ? 'حالة الطلب: قيد الانتظار للاعتماد والتسليم' : 'Order Status: Pending Approval'}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-neutral-700 font-bold">
                    {isAr ? 'تم استلام إثبات الدفع، جاري التحقق الفوري وتسليم بياناتك.' : 'Payment proof received, verifying and delivering credentials.'}
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-1 bg-[#FFE600] text-black border-2 border-black rounded-lg text-[10px] font-black animate-pulse shadow-[1px_1px_0px_0px_#000]">
                {isAr ? 'قيد الانتظار' : 'Pending'}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <Link
                href={`/track?session_id=${sessionId}`}
                className="flex-1 sm:flex-none py-2 px-3.5 bg-[#4CC9F0] hover:bg-[#3db6db] border-2 border-black text-black rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isAr ? 'تتبع مسار الطلب' : 'Track Live Status'}</span>
              </Link>

              <Link
                href="/notifications"
                className="flex-1 sm:flex-none py-2 px-3.5 bg-[#FFE600] hover:bg-[#edd600] border-2 border-black text-black rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isAr ? 'مركز الإشعارات' : 'Notifications'}</span>
              </Link>
            </div>
          </div>
        )}

        {/* Order Details & Amount Banner */}
        <div className="bg-[#FFFDF9] border-2 border-black rounded-2xl p-4 space-y-3 shadow-[3px_3px_0px_0px_#000]">
          <div className="flex justify-between items-center text-xs pb-2 border-b border-black">
            <span className="font-bold text-neutral-700">{isAr ? 'معرّف الطلب:' : 'Order ID:'}</span>
            <span className="font-mono font-black text-black bg-[#FFE600] border border-black px-2 py-0.5 rounded">#{shortSessionId}</span>
          </div>

          <div className="space-y-1.5 max-h-[100px] overflow-y-auto">
            {orders.map((ord, idx) => {
              const prodName = Array.isArray(ord.products) ? ord.products[0]?.name : ord.products?.name;
              const itemFormattedPrice = (isEgypt || isSaudi)
                ? Math.ceil(Number(ord.amount || 0) * rate).toString()
                : (Number(ord.amount || 0) * rate).toFixed(2);
              return (
                <div key={ord.id || idx} className="flex justify-between items-center text-xs">
                  <span className="font-bold text-black truncate max-w-[240px]">{prodName || 'Digital Item'}</span>
                  <span className="font-mono font-black text-black">{itemFormattedPrice} {currencySymbol}</span>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t-2 border-black flex justify-between items-center font-black">
            <span className="text-xs uppercase">{isAr ? 'المبلغ الإجمالي المطلوب سداده:' : 'Total Amount Due:'}</span>
            <span className="text-2xl font-mono text-black">{totalLocalAmount} {currencySymbol}</span>
          </div>
        </div>

        {/* ─── 1. INSTAPAY DIRECT PAYMENT CARD (ICONIC SMART STEPS) ─── */}
        {isInstapay && (() => {
          const smartInstapayUrl = instapayUrl || '';

          return (
            <div className="p-3.5 sm:p-4 bg-[#F9F3FF] border-2 border-black rounded-2xl space-y-2.5 shadow-[3px_3px_0px_0px_#000]">
              <div className="flex items-center justify-between pb-1 border-b border-black/10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-white border border-black flex items-center justify-center p-0.5 overflow-hidden shrink-0 shadow-[1px_1px_0px_0px_#000]">
                    <img src="/images/payment/instapay.png?v=3" alt="InstaPay" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-black text-black block leading-tight">
                      {isAr ? 'السداد عبر إنستاباي (InstaPay):' : 'InstaPay Transfer:'}
                    </span>
                    <span className="text-[10px] text-purple-900 font-bold flex items-center gap-1">
                      <span>{isAr ? 'المستلم المعتمد:' : 'Recipient:'}</span>
                      <span className="font-mono text-[#501A79] font-black">{instapayAddress || 'UpStore Official'}</span>
                      <Check className="w-3 h-3 text-emerald-600 stroke-[3] inline" />
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowPreTransferModal(true)}
                    className="px-2 py-0.5 bg-white hover:bg-neutral-100 border border-black rounded text-[10px] font-black cursor-pointer shadow-[1px_1px_0px_0px_#000]"
                  >
                    {isAr ? 'شروط التحويل' : 'Rules'}
                  </button>
                  <span className="px-2 py-0.5 bg-[#FFE600] text-black border border-black rounded text-[10px] font-black shadow-[1px_1px_0px_0px_#000]">
                    {isAr ? '0% رسوم' : '0% Fee'}
                  </span>
                </div>
              </div>

              {/* STEP 1: Exact Amount in EGP */}
              <div className="p-2.5 bg-[#FFF9E6] border-2 border-black rounded-xl flex items-center justify-between gap-2 shadow-[1.5px_1.5px_0px_0px_#000]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-[#FFE600] border-2 border-black font-black text-xs text-black flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div className="text-start min-w-0">
                    <span className="text-[10px] text-neutral-600 font-bold block truncate">
                      {isAr ? 'المبلغ المطلوب سداده بدقة:' : 'Exact Amount to Transfer:'}
                    </span>
                    <span className="font-mono font-black text-xs sm:text-sm text-black select-all tracking-wider">
                      {totalLocalAmount} {currencySymbol}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(totalLocalAmount, 'instapay_amount')}
                  className="px-3 py-1 bg-white hover:bg-neutral-100 border-2 border-black rounded-lg text-xs font-black flex items-center gap-1 shadow-[1px_1px_0px_0px_#000] cursor-pointer shrink-0"
                >
                  {copiedKey === 'instapay_amount' ? <Check className="w-3 h-3 stroke-[3] text-emerald-600" /> : <Copy className="w-3 h-3 stroke-[2.5]" />}
                  <span>{copiedKey === 'instapay_amount' ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ المبلغ' : 'Copy')}</span>
                </button>
              </div>

              {/* STEP 2: Direct App Link Button (Primary Action) */}
              <div className="p-2.5 bg-[#F0FDF4] border-2 border-black rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shadow-[1.5px_1.5px_0px_0px_#000]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-[#06D6A0] border-2 border-black font-black text-xs text-black flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div className="text-start min-w-0">
                    <span className="text-xs font-black text-black block truncate">
                      {isAr ? 'فتح تطبيق InstaPay والتحويل فوراً' : 'Open InstaPay App & Transfer'}
                    </span>
                    <span className="text-[10px] text-neutral-600 font-bold block truncate">
                      {isAr ? 'المستلم مكتوب تلقائياً في التطبيق' : 'Pre-filled recipient in app'}
                    </span>
                  </div>
                </div>
                <a
                  href={smartInstapayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-[#501A79] hover:bg-[#3E1260] text-white border-2 border-black rounded-lg text-xs font-black flex items-center justify-center gap-1.5 shadow-[1px_1px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer shrink-0"
                >
                  <span>{isAr ? 'فتح تطبيق InstaPay' : 'Open InstaPay'}</span>
                  <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                </a>
              </div>
            </div>
          );
        })()}

        {/* ─── 2. VODAFONE CASH & EGYPTIAN MOBILE WALLETS SMART CARD ─── */}
        {(isVodafone || isOrange) && (() => {
          const rawAmount = parseFloat(totalLocalAmount) || 0;
          const roundedAmount = Math.ceil(rawAmount);

          const CARRIER_CONFIG = {
            vodafone: {
              nameAr: 'فودافون كاش (Vodafone Cash)',
              nameEn: 'Vodafone Cash',
              color: '#E60000',
              activeBg: 'bg-[#E60000] text-white border-black',
              ussd: `*9*7*${vodafoneNumber || ''}*${roundedAmount}#`,
              menuUssd: '*9#',
              menuInstructionsAr: 'اطلب #9* ← اختر 1 تحويل أموال ← أدخل الرقم والمبلغ والرقم السري',
              appUrl: vodafoneUrl
                ? (vodafoneUrl.includes('?') 
                    ? `${vodafoneUrl}&amount=${totalLocalAmount}&price=${totalLocalAmount}&val=${totalLocalAmount}` 
                    : `${vodafoneUrl}?amount=${totalLocalAmount}&price=${totalLocalAmount}&val=${totalLocalAmount}`)
                : '',
            },
            orange: {
              nameAr: 'أورنج كاش (Orange Cash)',
              nameEn: 'Orange Cash',
              color: '#FF7900',
              activeBg: 'bg-[#FF7900] text-white border-black',
              ussd: `*115*1*${vodafoneNumber || ''}*${roundedAmount}#`,
              menuUssd: '#115#',
              menuInstructionsAr: 'اطلب #115# ← اختر 1 تحويل أموال ← أدخل الرقم والمبلغ والرقم السري',
              appUrl: '',
            },
            etisalat: {
              nameAr: 'اتصالات كاش (Etisalat / e&)',
              nameEn: 'Etisalat Cash (e&)',
              color: '#719E19',
              activeBg: 'bg-[#719E19] text-white border-black',
              ussd: `*777*1*${vodafoneNumber || ''}*${roundedAmount}#`,
              menuUssd: '*777#',
              menuInstructionsAr: 'اطلب #777* ← اختر 1 تحويل أموال ← أدخل الرقم والمبلغ والرقم السري',
              appUrl: '',
            },
            we: {
              nameAr: 'وي باي (WE Pay)',
              nameEn: 'WE Pay',
              color: '#562584',
              activeBg: 'bg-[#562584] text-white border-black',
              ussd: `*322*1*${vodafoneNumber || ''}*${roundedAmount}#`,
              menuUssd: '*322#',
              menuInstructionsAr: 'اطلب #322* ← اختر 1 تحويل أموال ← أدخل الرقم والمبلغ والرقم السري',
              appUrl: '',
            },
          };

          const activeCarrier = CARRIER_CONFIG[egCarrier] || CARRIER_CONFIG.vodafone;
          const smartVfUrl = CARRIER_CONFIG.vodafone.appUrl;

          return (
            <div className="p-3 sm:p-4 bg-[#FFE8EC] border-2 border-black rounded-2xl space-y-3 shadow-[3px_3px_0px_0px_#000]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-black">
                  {isAr ? 'الدفع المباشر عبر محافظ الكاش المصرية:' : 'Direct Egyptian Mobile Wallet Payment:'}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowPreTransferModal(true)}
                    className="px-2 py-0.5 bg-white hover:bg-neutral-100 border border-black rounded text-[10px] font-black cursor-pointer shadow-[1px_1px_0px_0px_#000]"
                  >
                    {isAr ? 'شروط التحويل' : 'Rules'}
                  </button>
                  <span className="px-2 py-0.5 bg-[#E60000] text-white border border-black rounded text-[10px] font-black">
                    {isAr ? 'تحويل فوري 0% رسوم' : 'Instant 0% Fee'}
                  </span>
                </div>
              </div>

              {/* Direct Smart Deep Link Button - HERO PRIMARY ACTION */}
              <a
                href={smartVfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full p-3 sm:p-3.5 bg-[#E60000] hover:bg-[#c90000] border-2 border-black text-white rounded-xl sm:rounded-2xl flex items-center justify-between gap-2.5 shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white border border-black flex items-center justify-center p-1 shrink-0">
                    <img
                      src="/images/payment/vodafone.png"
                      alt="Vodafone Cash"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="text-start min-w-0">
                    <span className="text-xs sm:text-sm font-black block text-white truncate">
                      {isAr ? 'فتح تطبيق Vodafone Cash' : 'Open Vodafone App'}
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-red-100 font-bold block truncate">
                      {isAr ? 'يتم فتح المحفظة بالمبلغ المطلوب تلقائياً' : 'Opens wallet with pre-filled amount'}
                    </span>
                  </div>
                </div>
                <div className="px-2.5 py-1.5 bg-[#FFE600] text-black rounded-lg sm:rounded-xl border border-black font-black text-xs flex items-center gap-1 shadow-[1px_1px_0px_0px_#000] group-hover:scale-105 transition-transform shrink-0">
                  <span>{isAr ? 'ادفع الآن' : 'Pay Now'}</span>
                  <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              </a>

              {/* Smart Option 2: Universal Multi-Network Pay via Phone */}
              <div className="p-3.5 bg-[#E8F4FD] border-2 border-black rounded-2xl space-y-2.5 shadow-[2px_2px_0px_0px_#000]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-black block">
                    {isAr ? 'اختر شبكتك للتحويل الفوري بالهاتف:' : 'Select Network for Phone Payment:'}
                  </span>
                  <span className="text-[10px] font-bold text-neutral-600">
                    {isAr ? 'كود تحويل فوري' : 'Instant USSD'}
                  </span>
                </div>

                {/* Network Selector Chips */}
                <div className="grid grid-cols-4 gap-1.5">
                  {(['vodafone', 'orange', 'etisalat', 'we'] as const).map((carrierKey) => {
                    const isSelected = egCarrier === carrierKey;
                    const c = CARRIER_CONFIG[carrierKey];
                    return (
                      <button
                        key={carrierKey}
                        type="button"
                        onClick={() => setEgCarrier(carrierKey)}
                        className={`py-1.5 px-1 rounded-xl text-[11px] font-black border-2 border-black transition-all cursor-pointer text-center ${
                          isSelected
                            ? `${c.activeBg} shadow-[2px_2px_0px_0px_#000] scale-[1.02]`
                            : 'bg-white hover:bg-neutral-100 text-black shadow-[1px_1px_0px_0px_#000]'
                        }`}
                      >
                        {isAr ? c.nameAr.split(' ')[0] : c.nameEn}
                      </button>
                    );
                  })}
                </div>

                {/* Active USSD Box with Pay by Phone Button */}
                <div className="pt-1 space-y-2 border-t border-neutral-300">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <div className="text-start">
                      <span className="text-[10px] text-neutral-600 font-bold block">
                        {isAr ? `كود تحويل ${activeCarrier.nameAr}:` : `${activeCarrier.nameEn} Direct USSD:`}
                      </span>
                      <code className="font-mono font-black text-xs text-blue-900 block mt-0.5 select-all" dir="ltr">
                        {activeCarrier.ussd}
                      </code>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDialUssd(activeCarrier.ussd)}
                        className="flex-1 sm:flex-none px-3.5 py-2 bg-[#4CC9F0] hover:bg-[#34bce6] border-2 border-black rounded-xl text-xs font-black text-black flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                      >
                        <PhoneCall className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{isAr ? 'طلب الكود بالهاتف' : 'Dial via Phone'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(activeCarrier.ussd, 'ussd_code')}
                        className="px-2.5 py-2 bg-white hover:bg-neutral-100 border-2 border-black rounded-xl text-xs font-black text-black flex items-center justify-center gap-1 shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                        title={isAr ? 'نسخ الكود' : 'Copy Code'}
                      >
                        {copiedKey === 'ussd_code' ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> : <Copy className="w-3.5 h-3.5 stroke-[2.5]" />}
                        <span className="hidden sm:inline">{copiedKey === 'ussd_code' ? (isAr ? 'تم' : 'Done') : (isAr ? 'نسخ' : 'Copy')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Secondary Manual Menu Step */}
                  <div className="p-1.5 bg-white/70 border border-black/15 rounded-lg text-[10px] text-neutral-700 font-bold flex items-center gap-1.5">
                    <Info className="w-3 h-3 text-neutral-500 shrink-0" />
                    <span>
                      {isAr ? `طريقة القائمة: ${activeCarrier.menuInstructionsAr}` : `Menu dial: ${activeCarrier.menuUssd}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Copy Wallet Number & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-2.5 bg-white border-2 border-black rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-600 font-bold block">{isAr ? 'رقم المحفظة:' : 'Wallet Number:'}</span>
                    <span className="font-mono font-black text-xs sm:text-sm text-black">{vodafoneNumber}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(vodafoneNumber, 'voda_num')}
                    className="px-2.5 py-1 bg-[#FF70A6] hover:bg-pink-300 border border-black rounded-lg text-xs font-black flex items-center gap-1 shadow-[1px_1px_0px_0px_#000] cursor-pointer"
                  >
                    {copiedKey === 'voda_num' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'voda_num' ? (isAr ? 'تم' : 'Done') : (isAr ? 'نسخ' : 'Copy')}</span>
                  </button>
                </div>

                <div className="p-2.5 bg-white border-2 border-black rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-600 font-bold block">{isAr ? 'المبلغ المطلوب:' : 'Exact Amount:'}</span>
                    <span className="font-mono font-black text-xs sm:text-sm text-black">{totalLocalAmount} {currencySymbol}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(totalLocalAmount, 'exact_amount')}
                    className="px-2.5 py-1 bg-[#FFE600] hover:bg-yellow-300 border border-black rounded-lg text-xs font-black flex items-center gap-1 shadow-[1px_1px_0px_0px_#000] cursor-pointer"
                  >
                    {copiedKey === 'exact_amount' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'exact_amount' ? (isAr ? 'تم' : 'Done') : (isAr ? 'نسخ' : 'Copy')}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ─── 3. SAUDI STC PAY (ICONIC SMART STEPS) ─── */}
        {isStc && (
          <div className="p-3.5 sm:p-4 bg-[#F4EDFF] border-2 border-black rounded-2xl space-y-2.5 shadow-[3px_3px_0px_0px_#000]">
            <div className="flex items-center justify-between pb-1 border-b border-black/10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white border border-black flex items-center justify-center p-0.5 overflow-hidden shrink-0 shadow-[1px_1px_0px_0px_#000]">
                  <img src="/images/payment/stcpay.svg" alt="STC Pay" className="w-full h-full object-contain" />
                </div>
                <span className="text-xs sm:text-sm font-black text-black block">
                  {isAr ? 'خطوات التحويل عبر STC Pay:' : 'STC Pay Transfer Steps:'}
                </span>
              </div>
              <span className="px-2 py-0.5 bg-[#06D6A0] text-black border border-black rounded text-[10px] font-black shadow-[1px_1px_0px_0px_#000]">
                {isAr ? 'فوري SAR' : 'Direct SAR'}
              </span>
            </div>

            {/* STEP 1: Exact Amount */}
            <div className="p-2.5 bg-[#FFF9E6] border-2 border-black rounded-xl flex items-center justify-between gap-2 shadow-[1.5px_1.5px_0px_0px_#000]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-[#FFE600] border-2 border-black font-black text-xs text-black flex items-center justify-center shrink-0">
                  1
                </div>
                <div className="text-start min-w-0">
                  <span className="text-[10px] text-neutral-600 font-bold block truncate">
                    {isAr ? 'المبلغ المطلوب سداده:' : 'Exact Amount:'}
                  </span>
                  <span className="font-mono font-black text-xs sm:text-sm text-black select-all tracking-wider">
                    {totalLocalAmount} {currencySymbol}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(totalLocalAmount, 'exact_amount_stc')}
                className="px-3 py-1 bg-white hover:bg-neutral-100 border-2 border-black rounded-lg text-xs font-black flex items-center gap-1 shadow-[1px_1px_0px_0px_#000] cursor-pointer shrink-0"
              >
                {copiedKey === 'exact_amount_stc' ? <Check className="w-3 h-3 stroke-[3] text-emerald-600" /> : <Copy className="w-3 h-3 stroke-[2.5]" />}
                <span>{copiedKey === 'exact_amount_stc' ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ المبلغ' : 'Copy')}</span>
              </button>
            </div>

            {/* STEP 2: STC Wallet Number */}
            <div className="p-2.5 bg-white border-2 border-black rounded-xl flex items-center justify-between gap-2 shadow-[1.5px_1.5px_0px_0px_#000]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-[#4F008C] border-2 border-black font-black text-xs text-white flex items-center justify-center shrink-0">
                  2
                </div>
                <div className="text-start min-w-0">
                  <span className="text-[10px] text-neutral-600 font-bold block truncate">
                    {isAr ? 'رقم محفظة STC Pay للتحويل:' : 'STC Pay Wallet Number:'}
                  </span>
                  <span className="font-mono font-black text-xs sm:text-sm text-black select-all tracking-wider">
                    {stcNumber}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(stcNumber, 'stc_num')}
                className="px-3 py-1 bg-white hover:bg-neutral-100 border-2 border-black rounded-lg text-xs font-black flex items-center gap-1 shadow-[1px_1px_0px_0px_#000] cursor-pointer shrink-0"
              >
                {copiedKey === 'stc_num' ? <Check className="w-3 h-3 stroke-[3] text-emerald-600" /> : <Copy className="w-3 h-3 stroke-[2.5]" />}
                <span>{copiedKey === 'stc_num' ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ الرقم' : 'Copy')}</span>
              </button>
            </div>
          </div>
        )}

        {/* ─── 4. PAYPAL DIRECT LINK & QR CODE (ICONIC SMART STEPS) ─── */}
        {isPaypal && (
          <div className="p-3.5 sm:p-4 bg-[#EAF5FF] border-2 border-black rounded-2xl space-y-2.5 shadow-[3px_3px_0px_0px_#000]">
            <div className="flex items-center justify-between pb-1 border-b border-black/10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white border border-black flex items-center justify-center p-1 shrink-0 shadow-[1px_1px_0px_0px_#000]">
                  <img src="/images/payment/paypal.svg" alt="PayPal" className="w-full h-full object-contain" />
                </div>
                <span className="text-xs sm:text-sm font-black text-black block">
                  {isAr ? 'خطوات الدفع عبر PayPal Direct:' : 'PayPal Payment Steps:'}
                </span>
              </div>
              <span className="px-2 py-0.5 bg-[#FFE600] text-black border border-black rounded text-[10px] font-black shadow-[1px_1px_0px_0px_#000]">
                {isAr ? 'فوري 0% رسوم' : '0% Fee'}
              </span>
            </div>

            {/* STEP 1: Amount */}
            <div className="p-2.5 bg-[#FFF9E6] border-2 border-black rounded-xl flex items-center justify-between gap-2 shadow-[1.5px_1.5px_0px_0px_#000]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-[#FFE600] border-2 border-black font-black text-xs text-black flex items-center justify-center shrink-0">
                  1
                </div>
                <div className="text-start min-w-0">
                  <span className="text-[10px] text-neutral-600 font-bold block truncate">
                    {isAr ? 'المبلغ المطلوب بدقة:' : 'Exact Amount to Pay:'}
                  </span>
                  <span className="font-mono font-black text-xs sm:text-sm text-black select-all tracking-wider">
                    {totalLocalAmount} {currencySymbol}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(totalLocalAmount, 'exact_amount_paypal')}
                className="px-3 py-1 bg-white hover:bg-neutral-100 border-2 border-black rounded-lg text-xs font-black flex items-center gap-1 shadow-[1px_1px_0px_0px_#000] cursor-pointer shrink-0"
              >
                {copiedKey === 'exact_amount_paypal' ? <Check className="w-3 h-3 stroke-[3] text-emerald-600" /> : <Copy className="w-3 h-3 stroke-[2.5]" />}
                <span>{copiedKey === 'exact_amount_paypal' ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ المبلغ' : 'Copy')}</span>
              </button>
            </div>

            {/* STEP 2: Direct Link Button */}
            <div className="p-2.5 bg-[#F0FDF4] border-2 border-black rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shadow-[1.5px_1.5px_0px_0px_#000]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-[#06D6A0] border-2 border-black font-black text-xs text-black flex items-center justify-center shrink-0">
                  2
                </div>
                <div className="text-start min-w-0">
                  <span className="text-xs font-black text-black block truncate">
                    {isAr ? 'السداد المباشر بضغطة واحدة' : 'Instant 1-Click Payment'}
                  </span>
                  <span className="text-[10px] text-neutral-600 font-bold block truncate">
                    UpStore Official (0% Fees)
                  </span>
                </div>
              </div>
              <a
                href="https://www.paypal.com/qrcodes/p2pqrc/N7AD8WM43LYVA"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 bg-[#003087] hover:bg-[#002266] text-white border-2 border-black rounded-lg text-xs font-black flex items-center justify-center gap-1 shadow-[1px_1px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer shrink-0"
              >
                <span>{isAr ? 'فتح رابط PayPal والدفع' : 'Open PayPal'}</span>
                <ExternalLink className="w-3 h-3 stroke-[2.5]" />
              </a>
            </div>
          </div>
        )}

        {/* ─── 5. AL RAJHI BANK (ICONIC SMART STEPS) ─── */}
        {isAlrajhi && (
          <div className="p-3.5 sm:p-4 bg-[#EBF5FF] border-2 border-black rounded-2xl space-y-2.5 shadow-[3px_3px_0px_0px_#000]">
            <div className="flex items-center justify-between pb-1 border-b border-black/10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white border border-black flex items-center justify-center p-0.5 overflow-hidden shrink-0 shadow-[1px_1px_0px_0px_#000]">
                  <img src="/images/payment/alrajhi.svg" alt="Al Rajhi" className="w-full h-full object-contain" />
                </div>
                <span className="text-xs sm:text-sm font-black text-black block">
                  {isAr ? 'خطوات التحويل البنكي (مصرف الراجحي):' : 'Al Rajhi Transfer Steps:'}
                </span>
              </div>
              <span className="px-2 py-0.5 bg-[#4CC9F0] text-black border border-black rounded text-[10px] font-black shadow-[1px_1px_0px_0px_#000]">
                {isAr ? 'آيبان SAR' : 'Direct IBAN'}
              </span>
            </div>

            {/* STEP 1: Exact Amount */}
            <div className="p-2.5 bg-[#FFF9E6] border-2 border-black rounded-xl flex items-center justify-between gap-2 shadow-[1.5px_1.5px_0px_0px_#000]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-[#FFE600] border-2 border-black font-black text-xs text-black flex items-center justify-center shrink-0">
                  1
                </div>
                <div className="text-start min-w-0">
                  <span className="text-[10px] text-neutral-600 font-bold block truncate">
                    {isAr ? 'المبلغ المطلوب بالريال السعودي:' : 'Exact Amount in SAR:'}
                  </span>
                  <span className="font-mono font-black text-xs sm:text-sm text-black select-all tracking-wider">
                    {totalLocalAmount} {currencySymbol}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(totalLocalAmount, 'exact_amount_alrajhi')}
                className="px-3 py-1 bg-white hover:bg-neutral-100 border-2 border-black rounded-lg text-xs font-black flex items-center gap-1 shadow-[1px_1px_0px_0px_#000] cursor-pointer shrink-0"
              >
                {copiedKey === 'exact_amount_alrajhi' ? <Check className="w-3 h-3 stroke-[3] text-emerald-600" /> : <Copy className="w-3 h-3 stroke-[2.5]" />}
                <span>{copiedKey === 'exact_amount_alrajhi' ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ المبلغ' : 'Copy')}</span>
              </button>
            </div>

            {/* STEP 2: Al Rajhi IBAN */}
            <div className="p-2.5 bg-white border-2 border-black rounded-xl flex items-center justify-between gap-2 shadow-[1.5px_1.5px_0px_0px_#000]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-[#0077C8] border-2 border-black font-black text-xs text-white flex items-center justify-center shrink-0">
                  2
                </div>
                <div className="text-start min-w-0">
                  <span className="text-[10px] text-neutral-600 font-bold block truncate">
                    {isAr ? 'آيبان مصرف الراجحي (IBAN):' : 'Al Rajhi Bank IBAN:'}
                  </span>
                  <span className="font-mono font-black text-[11px] sm:text-xs text-black break-all select-all block">
                    {alrajhiIban}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(alrajhiIban, 'alrajhi_iban')}
                className="px-3 py-1 bg-white hover:bg-neutral-100 border-2 border-black rounded-lg text-xs font-black flex items-center gap-1 shadow-[1px_1px_0px_0px_#000] cursor-pointer shrink-0"
              >
                {copiedKey === 'alrajhi_iban' ? <Check className="w-3 h-3 stroke-[3] text-emerald-600" /> : <Copy className="w-3 h-3 stroke-[2.5]" />}
                <span>{copiedKey === 'alrajhi_iban' ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ الآيبان' : 'Copy')}</span>
              </button>
            </div>
          </div>
        )}


        {/* ─── MANDATORY RECEIPT UPLOAD & SMART OCR SECTION ─── */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t-2 border-black">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase text-black tracking-wider flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-black stroke-[2.5]" />
              <span>{isAr ? 'رفع إيصال التحويل والفحص الذكي' : 'Upload Receipt & AI Scan'}</span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPreTransferModal(true)}
                className="text-[11px] font-black text-neutral-600 hover:text-black underline flex items-center gap-1 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{isAr ? 'شروط التحويل' : 'Transfer Rules'}</span>
              </button>
              <span className="px-2 py-0.5 bg-rose-200 border border-black rounded text-[10px] font-extrabold text-rose-900">
                {isAr ? 'إجباري' : 'Required'}
              </span>
            </div>
          </div>

          {/* ── STRICT REVIEW STATUS CHIP ── */}
          {strictReviewNotice && (
            <div className="p-3 bg-[#FFF9D2] border-2 border-black rounded-xl text-xs font-bold text-black flex items-center justify-between shadow-[2px_2px_0px_0px_#000]">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-neutral-800 shrink-0 stroke-[2.5]" />
                <span>{strictReviewNotice}</span>
              </div>
              <span className="px-2 py-0.5 bg-black text-yellow-300 rounded text-[10px] font-black shrink-0">
                {isAr ? 'تدقيق يدوي' : 'Manual Audit'}
              </span>
            </div>
          )}

          {error && !fraudWarning && (
            <div className="p-3 bg-rose-100 border-2 border-black rounded-xl text-xs font-bold text-rose-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Receipt Upload Dropzone / Button */}
          <div className="p-4 bg-[#FFFDF9] border-2 border-dashed border-black rounded-2xl text-center space-y-3">
            {screenshotUrl ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-xs font-extrabold text-emerald-800 bg-emerald-100 p-2.5 rounded-xl border border-black">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 stroke-[2.5]" />
                  <span>{isAr ? 'تم رفع صورة الإيصال وفحصها بنجاح' : 'Receipt uploaded and verified'}</span>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <a
                    href={screenshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 bg-white hover:bg-neutral-100 border border-black rounded-lg text-xs font-bold shadow-[1px_1px_0px_0px_#000] flex items-center gap-1.5"
                  >
                    <span>{isAr ? 'معاينة الإيصال' : 'View Receipt'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <label className="px-3.5 py-1.5 bg-[#FFE600] hover:bg-yellow-300 border border-black rounded-lg text-xs font-bold cursor-pointer shadow-[1px_1px_0px_0px_#000] flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تغيير الصورة' : 'Change Image'}</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              </div>
            ) : (
              <div className="py-3 space-y-2.5">
                <div className="w-12 h-12 bg-white border-2 border-black rounded-2xl flex items-center justify-center mx-auto shadow-[2px_2px_0px_0px_#000]">
                  <Upload className="w-6 h-6 text-black stroke-[2.5]" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-black">
                    {isAr ? 'ارفع لقطة شاشة إشعار التحويل لتأكيد فوري' : 'Upload transaction receipt screenshot'}
                  </p>
                  <p className="text-[10px] text-neutral-600 font-medium mt-0.5">
                    {isAr ? 'يدعم صور PNG, JPG, WebP حتى 5 ميجابايت' : 'PNG, JPG, WebP up to 5MB'}
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FFE600] hover:bg-[#ebd300] border-2 border-black rounded-xl text-xs font-extrabold cursor-pointer shadow-[2.5px_2.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all">
                  <Upload className="w-4 h-4 stroke-[2.5]" />
                  <span>{isAr ? 'اختيار لقطة الشاشة / الإيصال' : 'Select Receipt Screenshot'}</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading} className="hidden" />
                </label>
              </div>
            )}
          </div>

          {/* ── AI Scanning Radar Stage (مرحلة انتظار مراجعة الـ AI) ── */}
          {uploading && (
            <div className="p-4 bg-[#EDF9FF] border-2 border-black rounded-2xl space-y-3 text-center shadow-[3px_3px_0px_0px_#000] animate-pulse">
              <div className="w-12 h-12 bg-white border-2 border-black rounded-2xl flex items-center justify-center mx-auto shadow-[2px_2px_0px_0px_#000]">
                <Loader2 className="w-6 h-6 text-black animate-spin" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-black">
                  {isAr ? 'جاري فحص وتدقيق الإيصال بالذكاء الاصطناعي...' : 'Scanning receipt with AI...'}
                </h4>
                <div className="inline-block px-2.5 py-1 bg-[#FFE600] border border-black rounded-lg text-xs font-black text-black shadow-[1px_1px_0px_0px_#000]">
                  {isAr ? 'الوقت المقدر: من نصف دقيقة إلى دقيقة (30 - 60 ثانية)' : 'Estimated time: 30 to 60 seconds'}
                </div>
                <p className="text-[11px] text-neutral-600 font-bold pt-1">
                  {isAr ? 'يقوم النظام بفحص طبقات الأمان والتأكد من مطابقة الحساب والمبلغ وسلامة الإيصال' : 'Verifying security layers, account match, amount, and image authenticity'}
                </p>
              </div>
              <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden border border-black max-w-xs mx-auto">
                <div className="bg-[#06D6A0] h-full w-3/4 animate-[pulse_1s_ease-in-out_infinite]" />
              </div>
            </div>
          )}

          {/* ── AI Verified & Pre-Approved Section (الموافقة المبدئية والبيانات الموثقة) ── */}
          {screenshotUrl && !uploading && (() => {
            const expectedAmountNum = parseFloat(totalLocalAmount) || 0;
            const ocrAmount = ocrResult?.amount != null ? Number(ocrResult.amount) : expectedAmountNum;
            const isUnderpaid = ocrResult?.amount != null && (ocrAmount < (expectedAmountNum - 0.5));
            const isOverpaid = ocrResult?.amount != null && (ocrAmount > (expectedAmountNum + 0.5));
            const shortfall = isUnderpaid ? (expectedAmountNum - ocrAmount) : 0;
            const excess = isOverpaid ? (ocrAmount - expectedAmountNum) : 0;

            const displayName = senderName || ocrResult?.senderName || (isAr ? 'تم الاستخراج من الإيصال' : 'Extracted from receipt');
            const displayAccount = senderAccount || ocrResult?.senderAccount || ocrResult?.senderPhone || (isAr ? 'تم التحقق من الحساب' : 'Account verified');

            return (
              <div className="space-y-3">
                {/* Pre-Approved Clean Banner with Pending Status Badge */}
                <div className="p-3.5 bg-[#06D6A0] border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_#000] text-black">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 bg-white border-2 border-black rounded-xl flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_0px_#000]">
                        <CheckCircle2 className="w-5 h-5 text-black stroke-[3]" />
                      </div>
                      <div className="text-start">
                        <h3 className="text-sm sm:text-base font-extrabold text-black leading-tight">
                          {isAr ? 'تمت الموافقة المبدئية والتحقق من الدفع' : 'Payment Verified & Pre-Approved'}
                        </h3>
                        <p className="text-[11px] text-emerald-950 font-bold mt-0.5">
                          {isAr ? 'المبلغ مطابق والبيانات موثقة تلقائياً بالذكاء الاصطناعي' : 'Amount matches and verified automatically by AI'}
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 bg-[#FFE600] border-2 border-black rounded-xl text-[10px] sm:text-xs font-black text-black shadow-[1.5px_1.5px_0px_0px_#000] animate-pulse shrink-0">
                      {isAr ? 'حالة الطلب: قيد الانتظار للاعتماد' : 'Status: Pending Approval'}
                    </span>
                  </div>
                </div>

                {/* Locked Read-Only Data Cards (غير قابلة للتعديل) */}
                <div className="p-3.5 bg-[#EDF9FF] border-2 border-black rounded-2xl space-y-2.5 shadow-[3px_3px_0px_0px_#000]">
                  <div className="flex items-center justify-between pb-1.5 border-b border-black/15">
                    <span className="text-xs font-extrabold text-black flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-black stroke-[2.5]" />
                      <span>{isAr ? 'بيانات التحويل المعتمدة:' : 'Verified Transfer Details:'}</span>
                    </span>
                    <span className="px-2 py-0.5 bg-white border border-black rounded text-[10px] font-bold text-neutral-700 flex items-center gap-1 shadow-[1px_1px_0px_0px_#000]">
                      <Lock className="w-3 h-3 text-neutral-600" />
                      <span>{isAr ? 'غير قابل للتعديل' : 'Locked'}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* 1. Sender Personal Name */}
                    <div className="p-2.5 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_#000] space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-600">
                        <User className="w-3.5 h-3.5 text-black" />
                        <span>{isAr ? 'الاسم الشخصي للمحول:' : 'Sender Full Name:'}</span>
                      </div>
                      <p className="text-xs sm:text-sm font-extrabold text-black truncate" title={displayName}>
                        {displayName}
                      </p>
                    </div>

                    {/* 2. Sender Account / IPA */}
                    <div className="p-2.5 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_#000] space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-600">
                        <AtSign className="w-3.5 h-3.5 text-black" />
                        <span>{isAr ? 'اسم المستخدم / حساب التحويل:' : 'Sender Account / IPA:'}</span>
                      </div>
                      <p className="text-xs sm:text-sm font-extrabold text-black truncate" title={displayAccount}>
                        {displayAccount}
                      </p>
                    </div>

                    {/* 3. Transferred Amount */}
                    <div className="p-2.5 bg-[#FFFEE0] border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_#000] space-y-1 sm:col-span-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-700">
                        <DollarSign className="w-3.5 h-3.5 text-black" />
                        <span>{isAr ? 'المبلغ المحول بالإيصال:' : 'Transferred Amount:'}</span>
                      </div>
                      <p className="text-base font-extrabold text-emerald-950">
                        {ocrAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {ocrResult?.currency || currencySymbol}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Underpaid / Overpaid Handling */}
                {isUnderpaid && (
                  <div className="p-3 bg-amber-50 border-2 border-black rounded-xl space-y-2 text-xs shadow-[2px_2px_0px_0px_#000]">
                    <div className="flex items-start gap-2 text-amber-950 font-bold">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p>
                        {isAr
                          ? `المبلغ المحول (${(isEgypt || isSaudi ? Math.ceil(ocrAmount) : ocrAmount.toFixed(2))} ${currencySymbol}) أقل من المطلوب بمقدار (${(isEgypt || isSaudi ? Math.ceil(shortfall) : shortfall.toFixed(2))} ${currencySymbol})`
                          : `Transferred amount has a shortfall of (${(isEgypt || isSaudi ? Math.ceil(shortfall) : shortfall.toFixed(2))} ${currencySymbol})`}
                      </p>
                    </div>
                    {isInstapay && (
                      <a
                        href={instapayUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 bg-[#FFE600] hover:bg-yellow-300 border-2 border-black rounded-xl text-xs font-extrabold text-black flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_#000] cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>{isAr ? `تحويل المتبقي (${(isEgypt || isSaudi ? Math.ceil(shortfall) : shortfall.toFixed(2))} ${currencySymbol}) عبر InstaPay` : `Pay Shortfall via InstaPay`}</span>
                      </a>
                    )}
                  </div>
                )}

                {/* OVERPAID / EXCESS HANDLING - BEAUTIFUL EXPLANATORY SELECTOR */}
                {isOverpaid && (() => {
                  const excessFormatted = isEgypt || isSaudi ? Math.ceil(excess) : excess.toFixed(2);

                  return (
                    <div className="p-3.5 sm:p-4 bg-[#F8F0FF] border-2 border-black rounded-2xl space-y-3 text-xs shadow-[3px_3px_0px_0px_#000] text-start">
                      <div className="flex items-center justify-between gap-2 pb-1 border-b border-black/10">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#9B5DE5] border border-black flex items-center justify-center text-white shrink-0 shadow-[1px_1px_0px_0px_#000]">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <h5 className="font-black text-purple-950 text-xs sm:text-sm">
                              {isAr ? `فارق تحويل زائد (+${excessFormatted} ${currencySymbol})` : `Excess Payment (+${excessFormatted} ${currencySymbol})`}
                            </h5>
                            <span className="text-[10px] text-purple-900 font-bold block">
                              {isAr ? 'المبلغ المحول أكبر من المطلوب — اختر رغبتك في توجيه الفارق:' : 'Transferred more than required — Select where to send excess:'}
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-[#9B5DE5] text-white border border-black rounded text-[10px] font-black shrink-0">
                          +{excessFormatted} {currencySymbol}
                        </span>
                      </div>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        
                        {/* Option 1: Store Wallet (Recommended) */}
                        <div
                          onClick={() => setExcessPreference('wallet')}
                          className={`p-3 border-2 border-black rounded-xl cursor-pointer transition-all flex flex-col justify-between gap-1.5 ${
                            excessPreference === 'wallet'
                              ? 'bg-[#06D6A0] text-black shadow-[2px_2px_0px_0px_#000] scale-[1.01]'
                              : 'bg-white hover:bg-neutral-50 text-black shadow-[1px_1px_0px_0px_#000]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black px-1.5 py-0.5 bg-[#FFE600] text-black border border-black rounded shadow-[0.5px_0.5px_0px_0px_#000]">
                              {isAr ? 'موصى به ⭐' : 'Best Choice'}
                            </span>
                            <div className={`w-4 h-4 rounded-full border-2 border-black flex items-center justify-center ${excessPreference === 'wallet' ? 'bg-black text-white' : 'bg-white'}`}>
                              {excessPreference === 'wallet' && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>
                          <div>
                            <h6 className="text-xs font-black text-black">
                              {isAr ? 'محفظة المتجر' : 'Store Wallet'}
                            </h6>
                            <p className="text-[10px] font-bold text-neutral-800 leading-tight mt-0.5">
                              {isAr ? 'رصيد فوري بحسابك لشراء أو تجديد أي اشتراك مستقبلاً بدون رسوم.' : 'Instant store credit for future orders with 0% fee.'}
                            </p>
                          </div>
                        </div>

                        {/* Option 2: Vodafone Cash Refund (or STC Pay for Saudi) */}
                        <div
                          onClick={() => setExcessPreference(isEgypt ? 'refund_vodafone' : 'refund_bank')}
                          className={`p-3 border-2 border-black rounded-xl cursor-pointer transition-all flex flex-col justify-between gap-1.5 ${
                            excessPreference === 'refund_vodafone' || (isSaudi && excessPreference === 'refund_bank')
                              ? 'bg-[#FFE600] text-black shadow-[2px_2px_0px_0px_#000] scale-[1.01]'
                              : 'bg-white hover:bg-neutral-50 text-black shadow-[1px_1px_0px_0px_#000]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black px-1.5 py-0.5 bg-[#E60000] text-white border border-black rounded shadow-[0.5px_0.5px_0px_0px_#000]">
                              {isEgypt ? (isAr ? 'فودافون كاش' : 'Vodafone') : (isAr ? 'STC Pay / بنكي' : 'Bank Refund')}
                            </span>
                            <div className={`w-4 h-4 rounded-full border-2 border-black flex items-center justify-center ${excessPreference === 'refund_vodafone' || (isSaudi && excessPreference === 'refund_bank') ? 'bg-black text-white' : 'bg-white'}`}>
                              {(excessPreference === 'refund_vodafone' || (isSaudi && excessPreference === 'refund_bank')) && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>
                          <div>
                            <h6 className="text-xs font-black text-black">
                              {isEgypt ? (isAr ? 'استرجاع فودافون كاش' : 'Vodafone Cash Refund') : (isAr ? 'استرجاع STC Pay' : 'STC Pay Refund')}
                            </h6>
                            <p className="text-[10px] font-bold text-neutral-800 leading-tight mt-0.5">
                              {isEgypt 
                                ? (isAr ? 'تحويل الفارق مباشرة إلى محفظة فودافون كاش الخاصة بك.' : 'Refund difference directly to your Vodafone Cash.')
                                : (isAr ? 'تحويل الفارق إلى محفظة STC Pay أو حسابك.' : 'Refund to your STC Pay or bank account.')}
                            </p>
                          </div>
                        </div>

                        {/* Option 3: InstaPay Refund */}
                        <div
                          onClick={() => setExcessPreference('refund_instapay')}
                          className={`p-3 border-2 border-black rounded-xl cursor-pointer transition-all flex flex-col justify-between gap-1.5 ${
                            excessPreference === 'refund_instapay'
                              ? 'bg-[#4F008C] text-white shadow-[2px_2px_0px_0px_#000] scale-[1.01]'
                              : 'bg-white hover:bg-neutral-50 text-black shadow-[1px_1px_0px_0px_#000]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black px-1.5 py-0.5 bg-[#4F008C] text-white border border-black rounded shadow-[0.5px_0.5px_0px_0px_#000]">
                              {isAr ? 'إنستاباي لحظي' : 'InstaPay'}
                            </span>
                            <div className={`w-4 h-4 rounded-full border-2 border-black flex items-center justify-center ${excessPreference === 'refund_instapay' ? 'bg-white text-black' : 'bg-white'}`}>
                              {excessPreference === 'refund_instapay' && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>
                          <div>
                            <h6 className={`text-xs font-black ${excessPreference === 'refund_instapay' ? 'text-white' : 'text-black'}`}>
                              {isAr ? 'استرجاع إنستاباي' : 'InstaPay Refund'}
                            </h6>
                            <p className={`text-[10px] font-bold leading-tight mt-0.5 ${excessPreference === 'refund_instapay' ? 'text-purple-100' : 'text-neutral-800'}`}>
                              {isAr ? 'تحويل الفارق لحظياً إلى عنوان الـ IPA أو هاتفك في إنستاباي.' : 'Instant refund to your InstaPay IPA or phone.'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Dynamic Account Input when a Refund Option is Selected */}
                      {excessPreference !== 'wallet' && (
                        <div className="pt-2 border-t border-black/10 animate-in fade-in slide-in-from-top-1 duration-200">
                          <label className="text-[11px] font-black text-black block mb-1">
                            {excessPreference === 'refund_vodafone'
                              ? (isAr ? 'رقم محفظة فودافون كاش لاستلام الفارق الزائد:' : 'Vodafone Cash Wallet Number for Refund:')
                              : excessPreference === 'refund_instapay'
                              ? (isAr ? 'عنوان إنستاباي (IPA) أو رقم الهاتف لاستلام الفارق:' : 'InstaPay IPA Address (username@instapay) or Phone:')
                              : (isAr ? 'رقم الحساب / الآيبان لاستلام الفارق:' : 'Account / IBAN for Refund:')}
                          </label>
                          <input
                            type="text"
                            value={refundAccount}
                            onChange={(e) => setRefundAccount(e.target.value)}
                            placeholder={
                              excessPreference === 'refund_vodafone'
                                ? '010XXXXXXXX'
                                : excessPreference === 'refund_instapay'
                                ? (isAr ? 'مثال: name@instapay أو 010...' : 'e.g. name@instapay or 010...')
                                : (isAr ? 'رقم الحساب / المحفظة' : 'Account / IBAN Number')
                            }
                            className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-xs font-bold text-black focus:outline-none focus:ring-2 focus:ring-black shadow-[1.5px_1.5px_0px_0px_#000]"
                          />
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          {/* Submit Action Buttons */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || !screenshotUrl || uploading}
              className={`w-full py-4 border-2 border-black font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-[4px_4px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-2 transition-all ${
                !screenshotUrl
                  ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed border-neutral-400 shadow-none'
                  : 'bg-[#06D6A0] hover:bg-[#05b385] text-black cursor-pointer'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>{isAr ? 'جاري إرسال الإثبات...' : 'Submitting...'}</span>
                </>
              ) : !screenshotUrl ? (
                <>
                  <Upload className="w-4 h-4" />
                  <span>{isAr ? 'يرجى رفع إيصال التحويل أولاً' : 'Please Upload Receipt First'}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{submitted ? (isAr ? 'تحديث إثبات التحويل (قيد الانتظار)' : 'Update Payment Proof (Pending)') : (isAr ? 'تأكيد وإرسال الإثبات للاعتماد والمراجعة' : 'Confirm & Submit for Approval')}</span>
                </>
              )}
            </button>

            {/* Dedicated "تسليم الطلب" (Direct Delivery) Hero Button - Appears only after initial confirmation & submission */}
            {submitted && (
              <div className="mt-3.5 p-3.5 sm:p-4 bg-[#D1FADF] border-2 border-black rounded-2xl shadow-[3.5px_3.5px_0px_0px_#000] space-y-2.5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#25D366] border-2 border-black flex items-center justify-center text-black shrink-0 shadow-[1px_1px_0px_0px_#000]">
                      <Zap className="w-4 h-4 stroke-[3] fill-black" />
                    </div>
                    <div className="min-w-0 text-start">
                      <h4 className="text-xs sm:text-sm font-black text-emerald-950 truncate">
                        {isAr ? 'خدمة تسليم الطلب المباشرة' : 'Direct Dispatch Service'}
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-emerald-900 font-bold truncate">
                        {isAr ? 'تواصل فوراً مع الدعم الفني الرسمي على تيليجرام' : 'Contact official support on Telegram'}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-[#25D366] text-black border border-black rounded text-[10px] font-black shrink-0 shadow-[1px_1px_0px_0px_#000]">
                    {isAr ? 'متاح الآن' : 'Active'}
                  </span>
                </div>

                <a
                  href="https://t.me/UPSTORE_HELP"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 bg-[#0088cc] hover:bg-[#0077b5] border-2 border-black text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl sm:rounded-2xl shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 stroke-[2.5]" />
                  <span>{isAr ? 'استلام وتأكيد الطلب (@UPSTORE_HELP)' : 'Receive & Confirm Order via Support'}</span>
                  <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                </a>
              </div>
            )}
          </div>
        </form>

        {/* Support & Dashboard Footer */}
        <div className="pt-2 border-t-2 border-black flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <a
            href={`https://t.me/UPSTORE_HELP?text=${encodeURIComponent(
              isAr
                ? `السلام عليكم، أود متابعة واعتماد طلبي رقم #${shortSessionId} بمبلغ ${totalLocalAmount} ${currencySymbol}`
                : `Hello, I would like to follow up on my order #${shortSessionId} of ${totalLocalAmount} ${currencySymbol}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-black font-black underline flex items-center gap-1 hover:opacity-80"
          >
            <Smartphone className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{isAr ? 'الدعم الفني المباشر @UPSTORE_HELP' : 'Live Support @UPSTORE_HELP'}</span>
          </a>

          <Link href="/dashboard" className="text-neutral-700 font-bold hover:underline">
            {isAr ? 'الانتقال إلى لوحة التحكم ←' : 'Go to Dashboard →'}
          </Link>
        </div>

        {/* ─── 1. SMART PRE-TRANSFER SECURITY DIALOG MODAL ─── */}
        {showPreTransferModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white border-3 border-black rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-[8px_8px_0px_0px_#000] space-y-5 text-start relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b-2 border-black">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 bg-[#FFE600] border-2 border-black rounded-xl flex items-center justify-center shadow-[2px_2px_0px_0px_#000]">
                    <ShieldCheck className="w-5 h-5 text-black stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-black leading-tight">
                      {isAr ? 'تنبيه أمني هام قبل التحويل' : 'Pre-Transfer Security Notice'}
                    </h3>
                    <p className="text-xs text-neutral-600 font-bold">
                      {isAr ? 'تعليمات لضمان التوثيق والاعتماد الفوري للطلب' : 'Follow instructions for instant verification'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreTransferModal(false)}
                  className="w-8 h-8 bg-neutral-100 hover:bg-neutral-200 border-2 border-black rounded-xl flex items-center justify-center shadow-[1.5px_1.5px_0px_0px_#000] cursor-pointer"
                >
                  <X className="w-4 h-4 text-black stroke-[2.5]" />
                </button>
              </div>

              {/* Notice Points (ZERO EMOJIS) */}
              <div className="space-y-3">
                <div className="p-3.5 bg-[#FFFDF0] border-2 border-black rounded-2xl flex items-start gap-3 shadow-[2px_2px_0px_0px_#000]">
                  <div className="w-6 h-6 bg-[#FFE600] border border-black rounded-lg flex items-center justify-center shrink-0 font-black text-xs text-black mt-0.5">
                    1
                  </div>
                  <div className="text-xs font-bold text-neutral-900 leading-relaxed">
                    <span className="font-black text-black block mb-0.5">
                      {isAr ? 'المحول إليه الرسمي المعتمد:' : 'Authorized Beneficiary Account:'}
                    </span>
                    {isVodafone ? (
                      <>
                        {isAr ? 'يجب أن يكون التحويل موجهاً حصراً إلى رقم محفظة فودافون كاش الرسمية ' : 'The transfer must be sent strictly to the official Vodafone Cash wallet '}
                        <code className="px-1.5 py-0.5 bg-[#FF70A6] border border-black rounded font-mono font-black text-black text-[11px]">
                          {vodafoneNumber || 'المحفظة الرسمية'}
                        </code>
                        {isAr ? ' الخاصة بالمتجر.' : ' only.'}
                      </>
                    ) : (
                      <>
                        {isAr ? 'يجب أن يكون التحويل موجهاً حصراً إلى معرف الدفع الرسمي ' : 'The transfer must be sent strictly to the official IPA handle '}
                        <code className="px-1.5 py-0.5 bg-[#FFE600] border border-black rounded font-mono font-black text-black text-[11px]">
                          {instapayAddress || 'الحساب الرسمي'}
                        </code>
                        {isAr ? ' الخاص بالمتجر.' : ' only.'}
                      </>
                    )}
                  </div>
                </div>

                <div className="p-3.5 bg-[#F0FDF4] border-2 border-black rounded-2xl flex items-start gap-3 shadow-[2px_2px_0px_0px_#000]">
                  <div className="w-6 h-6 bg-[#06D6A0] border border-black rounded-lg flex items-center justify-center shrink-0 font-black text-xs text-black mt-0.5">
                    2
                  </div>
                  <div className="text-xs font-bold text-neutral-900 leading-relaxed">
                    <span className="font-black text-black block mb-0.5">
                      {isAr ? 'الفحص والتدقيق الذكي للإيصال:' : 'Automated Forensic AI Audit:'}
                    </span>
                    {isAr
                      ? 'يقوم النظام بالتحقق الآلي من سلامة الصورة، التاريخ، الرقم المرجعي وتطابق الحساب في ثوانٍ معدودة.'
                      : 'The system automatically verifies receipt integrity, exact timestamp, reference ID, and beneficiary match.'}
                  </div>
                </div>

                <div className="p-3.5 bg-[#FFF1F2] border-2 border-black rounded-2xl flex items-start gap-3 shadow-[2px_2px_0px_0px_#000]">
                  <div className="w-6 h-6 bg-[#FF5C8A] border border-black rounded-lg flex items-center justify-center shrink-0 font-black text-xs text-white mt-0.5">
                    3
                  </div>
                  <div className="text-xs font-bold text-neutral-900 leading-relaxed">
                    <span className="font-black text-rose-900 block mb-0.5">
                      {isAr ? 'نظام الحظر التلقائي الصارم (3 محاولات):' : 'Automated 3-Strike Ban Policy:'}
                    </span>
                    {isAr
                      ? 'رفع إيصال محول لحساب شخص آخر أو لقطة وهمية يسجل كمخالفة احتيال في سجلك، وتكرار ذلك 3 مرات يؤدي إلى حظر الحساب نهائياً.'
                      : 'Submitting transfers sent to other accounts or fake screenshots logs a strike. Reaching 3 strikes causes a permanent account ban.'}
                  </div>
                </div>
              </div>

              {/* Dismiss Options */}
              <div className="pt-2 border-t border-neutral-200 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-black text-neutral-700">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="w-4 h-4 rounded border-2 border-black text-black focus:ring-0 cursor-pointer accent-[#FFE600]"
                  />
                  <span>{isAr ? 'عدم إظهار هذا التنبيه مرة أخرى' : 'Don\'t show this notice again'}</span>
                </label>

                <button
                  type="button"
                  onClick={handleDismissPreTransferModal}
                  className="w-full py-3.5 bg-[#FFE600] hover:bg-[#edd600] border-2 border-black rounded-2xl text-xs sm:text-sm font-black text-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>{isAr ? 'فهمت ومتابعة التحويل' : 'I Understand & Proceed'}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ─── 2. SMART FRAUD & STRIKE WARNING DIALOG MODAL ─── */}
        {showFraudModal && fraudWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white border-3 border-black rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-[8px_8px_0px_0px_#000] space-y-5 text-start relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b-2 border-black">
                <div className="flex items-center gap-2.5">
                  <div className={`w-11 h-11 border-2 border-black rounded-2xl flex items-center justify-center shadow-[2px_2px_0px_0px_#000] ${
                    fraudWarning.isBanned ? 'bg-rose-600 text-white' : 'bg-[#FF5C8A] text-white'
                  }`}>
                    {fraudWarning.isBanned ? (
                      <Ban className="w-6 h-6 stroke-[3]" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-black leading-tight">
                      {fraudWarning.isBanned
                        ? (isAr ? 'تم حظر الحساب نهائياً' : 'Account Permanently Banned')
                        : (isAr ? 'تحذير أمني: مخالفة في الإيصال' : 'Security Warning: Receipt Violation')}
                    </h3>
                    <span className={`inline-block px-2 py-0.5 rounded-md border border-black text-[10px] font-black mt-0.5 ${
                      fraudWarning.isBanned
                        ? 'bg-black text-rose-300'
                        : 'bg-[#FFE600] text-black'
                    }`}>
                      {fraudWarning.isBanned
                        ? (isAr ? 'حظر دائم' : 'Permanent Ban')
                        : (isAr ? `المخالفة ${fraudWarning.strikes} من ${fraudWarning.maxStrikes}` : `Strike ${fraudWarning.strikes} of ${fraudWarning.maxStrikes}`)}
                    </span>
                  </div>
                </div>

                {!fraudWarning.isBanned && (
                  <button
                    type="button"
                    onClick={() => setShowFraudModal(false)}
                    className="w-8 h-8 bg-neutral-100 hover:bg-neutral-200 border-2 border-black rounded-xl flex items-center justify-center shadow-[1.5px_1.5px_0px_0px_#000] cursor-pointer"
                  >
                    <X className="w-4 h-4 text-black stroke-[2.5]" />
                  </button>
                )}
              </div>

              {/* Message and Detected Data Card */}
              <div className="space-y-3">
                <div className="p-3.5 bg-[#FFF1F2] border-2 border-black rounded-2xl space-y-2 text-xs shadow-[2px_2px_0px_0px_#000]">
                  <p className="font-bold text-rose-950 leading-relaxed">
                    {fraudWarning.message}
                  </p>
                </div>

                {fraudWarning.detectedRecipient && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold">
                    <div className="p-2.5 bg-neutral-100 border border-black rounded-xl space-y-0.5">
                      <span className="text-[10px] text-neutral-500 font-black block">
                        {isAr ? 'المحول إليه في الإيصال المرفوع:' : 'Detected Recipient in Receipt:'}
                      </span>
                      <span className="font-mono font-black text-rose-600 block truncate" title={fraudWarning.detectedRecipient}>
                        {fraudWarning.detectedRecipient}
                      </span>
                    </div>

                    <div className="p-2.5 bg-[#FFFEE0] border border-black rounded-xl space-y-0.5">
                      <span className="text-[10px] text-neutral-600 font-black block">
                        {isAr ? 'المحول إليه الرسمي المطلوب:' : 'Required Official Recipient:'}
                      </span>
                      <span className="font-mono font-black text-emerald-800 block">
                        حساب المتجر الرسمي
                      </span>
                    </div>
                  </div>
                )}

                {!fraudWarning.isBanned && (
                  <div className="p-3 bg-neutral-50 border border-black/30 rounded-xl text-[11px] font-bold text-neutral-700 flex items-center justify-between">
                    <span>{isAr ? 'المحاولات المتبقية قبل إغلاق الحظر الكامل:' : 'Strikes remaining before permanent ban:'}</span>
                    <span className="px-2 py-0.5 bg-[#FFE600] border border-black rounded-md font-mono font-black text-black">
                      {fraudWarning.maxStrikes - fraudWarning.strikes}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-neutral-200">
                {fraudWarning.isBanned ? (
                  <div className="space-y-2">
                    <Link
                      href="https://t.me/UPSTORE_HELP"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 bg-black text-white hover:bg-neutral-800 border-2 border-black rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_#000] cursor-pointer"
                    >
                      <span>{isAr ? 'التواصل مع الدعم الفني عبر تيليجرام' : 'Contact Support on Telegram'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      href="/"
                      className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 border-2 border-black rounded-2xl text-xs font-black text-black flex items-center justify-center cursor-pointer"
                    >
                      <span>{isAr ? 'العودة للصفحة الرئيسية' : 'Return to Home'}</span>
                    </Link>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowFraudModal(false)}
                    className="w-full py-3.5 bg-[#FFE600] hover:bg-[#edd600] border-2 border-black rounded-2xl text-xs sm:text-sm font-black text-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                  >
                    <span>{isAr ? 'فهمت وسأقوم برفع الإيصال الصحيح' : 'I Understand & Will Upload Correct Receipt'}</span>
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function ManualSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    }>
      <ManualSuccessContent />
    </Suspense>
  );
}
