'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from '@/context/LocaleContext';
import { Bitcoin, ShieldCheck, Loader2, ExternalLink, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

function CheckoutPayContent() {
  const { language, formatPrice, mounted } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState<string>('idle'); // idle | checking | success | failed
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [iframeBlocked, setIframeBlocked] = useState(false);

  // Localization Dictionary
  const dict = {
    en: {
      title: "Secure Crypto Checkout",
      loading: "Retrieving invoice details...",
      errorNotFound: "Invoice not found or unauthorized.",
      orderSummary: "Order Summary",
      productName: "Item",
      quantity: "Qty",
      price: "Price",
      subtotal: "Subtotal",
      tax: "Tax & Fees (5%)",
      total: "Total",
      status: "Payment Status",
      statusNew: "Pending Payment",
      statusProcessing: "Processing Payment",
      statusSettled: "Settled & Completed",
      statusExpired: "Expired",
      statusInvalid: "Invalid / Canceled",
      statusUnknown: "Unknown",
      checkNow: "Verify Payment Now",
      checking: "Verifying...",
      successRedirect: "Payment Verified! Delivering your items...",
      expiredText: "This invoice has expired. Please go back and create a new order.",
      openNewTab: "Open Payment Page in New Tab",
      iframeTip: "If the payment form below doesn't load, please click the button above.",
      secureShield: "Encrypted SSL checkout powered by BTCPay Server.",
      backToCart: "Back to Cart",
      simulateSuccess: "Simulate Payment Success",
      simulating: "Simulating...",
    },
    ar: {
      title: "الدفع الآمن بالعملات المشفرة",
      loading: "جاري استيراد تفاصيل الفاتورة...",
      errorNotFound: "الفاتورة غير موجودة أو غير مصرح لك بعرضها.",
      orderSummary: "ملخص الطلب",
      productName: "المنتج",
      quantity: "الكمية",
      price: "السعر",
      subtotal: "المجموع الفرعي",
      tax: "الضرائب والرسوم (5%)",
      total: "المبلغ الإجمالي",
      status: "حالة الدفع",
      statusNew: "في انتظار الدفع",
      statusProcessing: "جاري معالجة الدفع",
      statusSettled: "تم الدفع والتحقق",
      statusExpired: "منتهية الصلاحية",
      statusInvalid: "ملغية أو غير صالحة",
      statusUnknown: "غير معروفة",
      checkNow: "التحقق من الدفع الآن",
      checking: "جاري التحقق...",
      successRedirect: "تم تأكيد الدفع بنجاح! جاري تسليم طلبك...",
      expiredText: "انتهت صلاحية هذه الفاتورة. يرجى العودة وإنشاء طلب جديد.",
      openNewTab: "افتح صفحة الدفع في علامة تبويب جديدة",
      iframeTip: "إذا لم يظهر نموذج الدفع بالأسفل، يرجى الضغط على الزر بالأعلى.",
      secureShield: "دفع آمن مشفر باتصال SSL وخادم BTCPay.",
      backToCart: "العودة إلى السلة",
      simulateSuccess: "محاكاة نجاح الدفع",
      simulating: "جاري المحاكاة...",
    }
  };

  const t = (key: keyof typeof dict['en']) => {
    const lang = (language === 'ar' || language === 'en') ? language : 'en';
    return dict[lang][key] || dict['en'][key] || '';
  };

  // Fetch invoice details on load
  const loadInvoiceDetails = async () => {
    if (!sessionId) return;
    setError(null);
    try {
      const res = await fetch(`/api/checkout/invoice-details?session_id=${sessionId}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || t('errorNotFound'));
      } else {
        setInvoice(data);
        if (data.status === 'Settled') {
          setPaymentSuccess(true);
          setTimeout(() => {
            router.push(`/checkout/success?session_id=${sessionId}`);
          }, 1500);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading invoice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      loadInvoiceDetails();
    } else {
      setError('Missing session_id');
      setLoading(false);
    }
  }, [sessionId]);

  // Polling for invoice status
  useEffect(() => {
    if (!sessionId || paymentSuccess || loading || error || invoice?.status === 'Expired' || invoice?.status === 'Invalid') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/checkout/verify?session_id=${sessionId}`);
        const data = await res.json();

        if (data.success || data.payment_status === 'paid' || data.payment_status === 'Settled') {
          clearInterval(interval);
          setPollingStatus('success');
          setPaymentSuccess(true);
          setTimeout(() => {
            router.push(`/checkout/success?session_id=${sessionId}`);
          }, 2000);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [sessionId, paymentSuccess, loading, error, invoice]);

  // Manual verify trigger
  const handleManualVerify = async () => {
    if (!sessionId || pollingStatus === 'checking') return;
    setPollingStatus('checking');

    try {
      const res = await fetch(`/api/checkout/verify?session_id=${sessionId}`);
      const data = await res.json();

      if (data.success || data.payment_status === 'paid' || data.payment_status === 'Settled') {
        setPollingStatus('success');
        setPaymentSuccess(true);
        setTimeout(() => {
          router.push(`/checkout/success?session_id=${sessionId}`);
        }, 1500);
      } else {
        // Refresh details
        await loadInvoiceDetails();
        setPollingStatus('failed');
        setTimeout(() => setPollingStatus('idle'), 3000);
      }
    } catch (err) {
      console.error('Manual verify error:', err);
      setPollingStatus('failed');
      setTimeout(() => setPollingStatus('idle'), 3000);
    }
  };

  // Simulate payment for mock invoice
  const handleSimulatePayment = async () => {
    if (!sessionId || pollingStatus === 'checking') return;
    setPollingStatus('checking');

    try {
      const res = await fetch(`/api/checkout/verify?session_id=${sessionId}`);
      const data = await res.json();

      if (data.success || data.payment_status === 'paid') {
        setPollingStatus('success');
        setPaymentSuccess(true);
        setTimeout(() => {
          router.push(`/checkout/success?session_id=${sessionId}`);
        }, 1500);
      }
    } catch (err) {
      console.error('Simulation error:', err);
      setPollingStatus('failed');
      setTimeout(() => setPollingStatus('idle'), 3000);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-black animate-spin" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] py-16 px-4 flex flex-col items-center justify-center text-black">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-black animate-spin mx-auto" />
          <p className="text-neutral-800 text-base font-black uppercase tracking-wider">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] py-16 px-4 flex flex-col items-center justify-center text-black">
        <div className="max-w-md w-full bg-white border-2 border-black p-8 rounded-3xl text-center space-y-6 shadow-[6px_6px_0px_0px_#000]">
          <AlertCircle className="w-16 h-16 text-rose-600 mx-auto stroke-[2.5]" />
          <h2 className="text-2xl font-black text-black">{language === 'ar' ? 'حدث خطأ ما' : 'An error occurred'}</h2>
          <p className="text-neutral-700 font-bold text-sm">{error || t('errorNotFound')}</p>
          <div className="pt-4">
            <Link 
              href="/cart"
              className="inline-flex items-center gap-2 bg-[#FFE600] border-2 border-black hover:bg-neutral-100 text-black py-3 px-6 rounded-xl font-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              {t('backToCart')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const subtotalPrice = invoice.items.reduce((acc: number, item: any) => acc + (item.unit_price * item.quantity), 0);
  const taxPrice = subtotalPrice * 0.05;
  const totalPrice = subtotalPrice + taxPrice;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Settled':
      case 'Complete':
        return 'text-black bg-[#06D6A0] border-2 border-black shadow-[2px_2px_0px_0px_#000]';
      case 'New':
        return 'text-black bg-[#FFE600] border-2 border-black shadow-[2px_2px_0px_0px_#000]';
      case 'Processing':
        return 'text-black bg-[#4CC9F0] border-2 border-black shadow-[2px_2px_0px_0px_#000]';
      case 'Expired':
      case 'Invalid':
        return 'text-white bg-rose-600 border-2 border-black shadow-[2px_2px_0px_0px_#000]';
      default:
        return 'text-black bg-neutral-200 border-2 border-black';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Settled': return t('statusSettled');
      case 'New': return t('statusNew');
      case 'Processing': return t('statusProcessing');
      case 'Expired': return t('statusExpired');
      case 'Invalid': return t('statusInvalid');
      default: return t('statusUnknown');
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-black py-10 px-4 md:px-8 relative overflow-hidden notranslate" translate="no">
      <div className="max-w-6xl mx-auto relative z-10 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-2 border-black pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-black flex items-center gap-3 notranslate" translate="no">
              <div className="w-10 h-10 rounded-2xl bg-[#FFE600] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_#000]">
                <Bitcoin className="w-6 h-6 text-black stroke-[2.5]" />
              </div>
              <span>{t('title')}</span>
            </h1>
            <p className="text-xs text-neutral-600 font-mono font-bold">Invoice ID: {invoice.id}</p>
          </div>
          <Link
            href="/cart"
            className="flex items-center gap-2 bg-white border-2 border-black px-4 py-2 rounded-xl text-black font-black text-xs sm:text-sm shadow-[2.5px_2.5px_0px_0px_#000] hover:bg-neutral-100 transition-all cursor-pointer notranslate"
            translate="no"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            {t('backToCart')}
          </Link>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Order Summary & Status Panel (Left - 5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Payment Success Alert */}
            {paymentSuccess && (
              <div className="bg-[#06D6A0] border-2 border-black p-6 rounded-3xl flex items-center gap-4 shadow-[5px_5px_0px_0px_#000]">
                <CheckCircle2 className="w-10 h-10 text-black shrink-0 stroke-[2.5]" />
                <div>
                  <h3 className="text-lg font-black text-black notranslate" translate="no">{language === 'ar' ? 'تم الدفع بنجاح!' : 'Payment Completed!'}</h3>
                  <p className="text-xs sm:text-sm text-neutral-900 font-bold mt-1 notranslate" translate="no">{t('successRedirect')}</p>
                </div>
              </div>
            )}

            {/* General Status Card */}
            <div className="bg-white border-2 border-black p-6 rounded-3xl space-y-6 shadow-[5px_5px_0px_0px_#000]">
              <div className="flex justify-between items-center">
                <span className="text-neutral-700 font-black text-xs uppercase tracking-wider notranslate" translate="no">{t('status')}</span>
                <span className={`px-3 py-1 rounded-xl text-xs font-black notranslate ${getStatusColor(invoice.status)}`} translate="no">
                  {getStatusLabel(invoice.status)}
                </span>
              </div>

              {invoice.status === 'Expired' && (
                <div className="bg-rose-100 border-2 border-black p-4 rounded-2xl text-xs font-bold text-black shadow-[2px_2px_0px_0px_#000]">
                  {t('expiredText')}
                </div>
              )}

              {/* Action Buttons for Verifying / Simulator */}
              <div className="space-y-3">
                {invoice.mock ? (
                  <button
                    onClick={handleSimulatePayment}
                    disabled={pollingStatus === 'checking' || paymentSuccess}
                    className="w-full bg-[#06D6A0] hover:bg-[#05b385] disabled:opacity-50 text-black py-3.5 px-6 rounded-2xl font-black border-2 border-black shadow-[4px_4px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {pollingStatus === 'checking' ? (
                      <Loader2 className="w-5 h-5 animate-spin text-black" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                    )}
                    <span>{pollingStatus === 'checking' ? t('simulating') : t('simulateSuccess')}</span>
                  </button>
                ) : (
                  <button
                    onClick={handleManualVerify}
                    disabled={pollingStatus === 'checking' || paymentSuccess || invoice.status === 'Expired' || invoice.status === 'Invalid'}
                    className="w-full bg-white hover:bg-neutral-100 border-2 border-black text-black disabled:opacity-50 py-3.5 px-6 rounded-2xl font-black shadow-[4px_4px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-5 h-5 text-black stroke-[2.5] ${pollingStatus === 'checking' ? 'animate-spin' : ''}`} />
                    <span>{pollingStatus === 'checking' ? t('checking') : t('checkNow')}</span>
                  </button>
                )}

              </div>
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-white border-2 border-black p-6 rounded-3xl space-y-6 shadow-[5px_5px_0px_0px_#000]">
              <h3 className="text-lg font-black text-black border-b-2 border-black pb-3 notranslate" translate="no">
                {t('orderSummary')}
              </h3>

              {/* Items List */}
              <div className="space-y-3.5 max-h-[240px] overflow-y-auto pr-1">
                {invoice.items.map((item: any, idx: number) => {
                  const displayName = language === 'ar' ? (item.name_ar || item.name) : item.name;
                  const displayVariantName = language === 'ar' ? (item.variant_name_ar || item.variant_name) : item.variant_name;

                  return (
                    <div key={idx} className="flex items-center gap-3 bg-[#FFFDF9] p-3 rounded-2xl border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          alt={displayName} 
                          className="w-11 h-11 object-contain rounded-xl bg-white shrink-0 border border-black"
                        />
                      ) : (
                        <div className="w-11 h-11 bg-[#FFE600] rounded-xl flex items-center justify-center shrink-0 border border-black">
                          <Bitcoin className="w-5 h-5 text-black stroke-[2.5]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-black truncate">{displayName}</p>
                        {displayVariantName && (
                          <p className="text-[10px] text-neutral-600 font-bold truncate mt-0.5">{displayVariantName}</p>
                        )}
                        <p className="text-[10px] text-neutral-700 mt-1 font-mono font-bold">
                          {formatPrice(item.unit_price)} × {item.quantity}
                        </p>
                      </div>
                      <div className="text-xs font-black text-black shrink-0 font-mono">
                        {formatPrice(item.unit_price * item.quantity)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total calculations */}
              <div className="border-t-2 border-dashed border-neutral-300 pt-4 space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-neutral-600 notranslate" translate="no">{t('subtotal')}</span>
                  <span className="text-black font-mono font-black">{formatPrice(subtotalPrice)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-neutral-600 notranslate" translate="no">{t('tax')}</span>
                  <span className="text-black font-mono font-black">{formatPrice(taxPrice)}</span>
                </div>
                <div className="flex justify-between border-t-2 border-black pt-3">
                  <span className="text-sm font-black text-black notranslate" translate="no">{t('total')}</span>
                  <span className="text-base font-black text-black font-mono bg-[#FFE600] border border-black px-2 py-0.5 rounded-lg shadow-[1.5px_1.5px_0px_0px_#000]">
                    {formatPrice(totalPrice)}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Trust Details */}
            <div className="flex items-center gap-3 bg-[#FFE600] p-4 rounded-2xl border-2 border-black shadow-[3px_3px_0px_0px_#000]">
              <ShieldCheck className="w-5 h-5 text-black shrink-0 stroke-[2.5]" />
              <p className="text-xs text-black font-black">
                {t('secureShield')}
              </p>
            </div>

          </div>

          {/* BTCPay Invoice Embed Panel (Right - 7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {invoice.status === 'Expired' || invoice.status === 'Invalid' ? (
              <div className="bg-white border-2 border-black rounded-3xl h-[500px] flex flex-col items-center justify-center p-8 text-center space-y-4 shadow-[6px_6px_0px_0px_#000]">
                <AlertCircle className="w-16 h-16 text-rose-600 stroke-[2.5]" />
                <h3 className="text-xl font-black text-black">{t('statusExpired')}</h3>
                <p className="text-neutral-700 font-bold text-xs max-w-sm">{t('expiredText')}</p>
              </div>
            ) : invoice.mock ? (
              /* Simulated Payment Form */
              <div className="bg-white border-2 border-black rounded-3xl h-[600px] flex flex-col items-center justify-center p-8 text-center space-y-6 shadow-[6px_6px_0px_0px_#000] relative overflow-hidden">
                
                <div className="space-y-3 relative z-10">
                  <div className="w-20 h-20 bg-[#FFE600] rounded-3xl flex items-center justify-center mx-auto border-2 border-black shadow-[3px_3px_0px_0px_#000]">
                    <Bitcoin className="w-10 h-10 text-black stroke-[2.5]" />
                  </div>
                  <h3 className="text-2xl font-black text-black">Mock Checkout Sandbox</h3>
                  <p className="text-xs sm:text-sm text-neutral-700 font-bold max-w-md mx-auto">
                    This is a local sandbox simulated checkout because no BTCPay API Key was configured.
                  </p>
                </div>

                <div className="bg-[#FFFDF9] border-2 border-black p-6 rounded-2xl w-full max-w-sm text-left font-mono text-xs space-y-2 relative z-10 shadow-[3px_3px_0px_0px_#000]">
                  <p className="text-black border-b-2 border-black pb-1 text-center font-black uppercase mb-2">SANDBOX INVOICE</p>
                  <p className="flex justify-between"><span className="text-neutral-600 font-bold">ID:</span> <span className="text-black font-black">{invoice.id}</span></p>
                  <p className="flex justify-between"><span className="text-neutral-600 font-bold">Amount:</span> <span className="font-black">{invoice.amount} USD</span></p>
                  <p className="flex justify-between"><span className="text-neutral-600 font-bold">Currency:</span> <span className="font-black">BTC / USDT</span></p>
                  <p className="flex justify-between"><span className="text-neutral-600 font-bold">Status:</span> <span className="text-black bg-[#FFE600] px-2 py-0.5 rounded border border-black font-black">New (Awaiting Simulation)</span></p>
                </div>

                <button
                  onClick={handleSimulatePayment}
                  disabled={pollingStatus === 'checking'}
                  className="w-full max-w-xs bg-[#06D6A0] hover:bg-[#05b385] text-black py-3.5 px-6 rounded-2xl font-black border-2 border-black shadow-[4px_4px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                  <span>{pollingStatus === 'checking' ? t('simulating') : t('simulateSuccess')}</span>
                </button>
              </div>
            ) : (
              /* Live BTCPay Invoice Iframe Wrapper */
              <div className="space-y-4">
                
                {/* Information Callout & Primary Button */}
                <div className="bg-white border-2 border-black p-6 rounded-3xl shadow-[5px_5px_0px_0px_#000] space-y-4">
                  <div className="flex items-start gap-3 text-xs sm:text-sm text-neutral-800 font-bold">
                    <AlertCircle className="w-5 h-5 text-black shrink-0 mt-0.5 stroke-[2.5]" />
                    <p className="leading-relaxed">{t('iframeTip')}</p>
                  </div>
                  
                  {invoice.checkoutLink && (
                    <a
                      href={invoice.checkoutLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-[#06D6A0] hover:bg-[#05b385] text-black py-3.5 px-6 rounded-2xl font-black border-2 border-black shadow-[4px_4px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-2.5 transition-all text-xs sm:text-sm cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4 text-black stroke-[2.5]" />
                      <span>{t('openNewTab')}</span>
                    </a>
                  )}
                </div>

                {/* BTCPay Server Iframe */}
                <div className="bg-white border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_#000] overflow-hidden relative min-h-[650px]">
                  {iframeBlocked ? (
                    <div className="h-[650px] flex flex-col items-center justify-center p-8 text-center space-y-4">
                      <AlertCircle className="w-12 h-12 text-black stroke-[2.5]" />
                      <h3 className="text-lg font-black text-black">Browser IFrame Restriction</h3>
                      <p className="text-neutral-700 text-xs font-bold max-w-sm">
                        Your browser security settings prevent embedding the payment gateway directly.
                      </p>
                      <a
                        href={invoice.checkoutLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#FFE600] hover:bg-neutral-100 text-black py-3 px-6 rounded-xl font-black border-2 border-black shadow-[3px_3px_0px_0px_#000] inline-flex items-center gap-2 transition cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                        <span>{t('openNewTab')}</span>
                      </a>
                    </div>
                  ) : (
                    <iframe
                      src={invoice.checkoutLink}
                      className="w-full h-[650px] border-0 bg-white"
                      allow="payment"
                      onError={() => setIframeBlocked(true)}
                    />
                  )}
                </div>

              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}

export default function CheckoutPayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-black animate-spin" />
      </div>
    }>
      <CheckoutPayContent />
    </Suspense>
  );
}
