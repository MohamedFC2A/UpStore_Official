'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Copy, 
  Check, 
  ExternalLink, 
  Zap, 
  RefreshCw, 
  Sparkles,
  ArrowRight,
  MessageCircle,
  QrCode
} from 'lucide-react';

function BybitPayContent() {
  const searchParams = useSearchParams();
  const order = searchParams.get('order') || 'UP-849201';
  const amount = searchParams.get('amount') || '0.19';
  const shortId = searchParams.get('product') || '643361f7';
  const chatId = searchParams.get('chat_id') || '';

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 mins countdown

  const BYBIT_UID = '47183921';
  const TRC20_ADDR = 'TW4z3c4PZ2Gk5YQ7nN9x8vK1mB5qP9R2e1';
  const BEP20_ADDR = '0x71C836e520023a1B3a0279612301A949826a7C10';
  const TON_ADDR = 'EQBvW8m53GoU_jPAIp7LwY8Gj044kX_613p_dc6lQ1_y9Z1X';

  const bybitAppUrl = 'https://i.bybit.com/abPtZHD';
  const binanceAppUrl = `https://app.binance.com/qr/dplk5517a2e482354784a955743b235?amt=${amount}&val=USDT`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Auto-polling verification against Bybit API
  const verifyPayment = async () => {
    setChecking(true);
    try {
      const res = await fetch(`/api/checkout/verify-bybit?order=${order}&amount=${amount}`);
      const data = await res.json();
      if (data && data.success) {
        setIsPaid(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPaid) {
        verifyPayment();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [order, amount, isPaid]);

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col items-center justify-center p-4 selection:bg-amber-500 selection:text-black">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-xl bg-[#0f131d]/90 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl">
        {/* Header Branding */}
        <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20 font-black text-black text-xl">
              UP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg tracking-wide">UpStore Pay</h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" /> موثق رسمياً
                </span>
              </div>
              <p className="text-xs text-white/50">بوابة الدفع التجاري الذكية المباشرة</p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-white/50">رقم الفاتورة</div>
            <div className="font-mono font-bold text-amber-400 text-sm">#{order}</div>
          </div>
        </div>

        {isPaid ? (
          /* Success Screen */
          <div className="py-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">تم تأكيد الدفع بنجاح! ⚡</h2>
            <p className="text-sm text-white/70 max-w-md mx-auto mb-6">
              تم استلام المبلغ وتأكيد العملية تلقائياً عبر Bybit API. تم تفعيل طلبك وتسليمه فوراً في الشات.
            </p>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 text-right">
              <div className="text-xs text-amber-400 font-semibold mb-2">بيانات الحساب / المفتاح:</div>
              <div className="font-mono bg-black/40 p-3 rounded-xl border border-white/5 text-sm text-emerald-300 select-all break-all">
                upstore_vip_{Math.floor(10000 + Math.random() * 90000)}@upstore.one
              </div>
            </div>

            <Link
              href="https://t.me/upstore_one_bot"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-bold hover:opacity-95 transition-all shadow-lg shadow-emerald-500/25"
            >
              <MessageCircle className="w-5 h-5" /> العودة للبوت في تيليجرام
            </Link>
          </div>
        ) : (
          /* Payment Interface */
          <div>
            {/* Amount Banner */}
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-5 mb-6 text-center">
              <div className="text-xs text-amber-300 font-medium mb-1">المبلغ الإجمالي المستحق</div>
              <div className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center justify-center gap-2">
                <span>{amount}</span>
                <span className="text-amber-400 text-2xl font-bold">USDT</span>
              </div>
              <div className="text-xs text-white/50 mt-1 flex items-center justify-center gap-2">
                <span>(خصم 90% ساري)</span>
                <span>•</span>
                <span>تنتهي الجلسة خلال: <b className="text-amber-300 font-mono">{formatTime(timeLeft)}</b></span>
              </div>
            </div>

            {/* Direct 1-Click Pay Buttons */}
            <div className="space-y-3 mb-6">
              <a
                href={bybitAppUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition-all shadow-lg shadow-amber-500/20 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-black/10 flex items-center justify-center">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black">فتح تطبيق Bybit للدفع الفوري ⚡</div>
                    <div className="text-[11px] font-medium opacity-80">تحويل داخلي 0% رسوم (UID: {BYBIT_UID})</div>
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>

              <a
                href={binanceAppUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center font-black text-xs">
                    BNB
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">الدفع عبر Binance Pay</div>
                    <div className="text-[11px] text-white/50">بوابة الدفع السريعة من بينانس</div>
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-white/50 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

            {/* Manual Deposit Details */}
            <div className="border border-white/10 rounded-2xl p-4 bg-black/20 space-y-3 mb-6">
              <div className="text-xs font-semibold text-white/70 mb-2">أو التحويل اليدوي عبر المعرف / العناوين:</div>

              {/* Bybit UID */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                <div className="text-right">
                  <div className="text-[11px] text-white/40">Bybit UID (تحويل داخلي مجاني)</div>
                  <div className="font-mono font-bold text-amber-300 text-sm">{BYBIT_UID}</div>
                </div>
                <button
                  onClick={() => copyToClipboard(BYBIT_UID, 'uid')}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  {copiedKey === 'uid' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'uid' ? 'تم النسخ' : 'نسخ'}</span>
                </button>
              </div>

              {/* USDT TRC20 */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                <div className="text-right max-w-[240px] sm:max-w-[320px]">
                  <div className="text-[11px] text-white/40">USDT (شبكة TRON - TRC20)</div>
                  <div className="font-mono text-xs text-white/80 truncate">{TRC20_ADDR}</div>
                </div>
                <button
                  onClick={() => copyToClipboard(TRC20_ADDR, 'trc20')}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  {copiedKey === 'trc20' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'trc20' ? 'تم النسخ' : 'نسخ'}</span>
                </button>
              </div>
            </div>

            {/* Auto Check Status Button */}
            <button
              onClick={verifyPayment}
              disabled={checking}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'جارٍ التحقق مع Bybit...' : 'فحص وتأكيد الدفع التلقائي ⚡'}</span>
            </button>

            {/* Live Indicator */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-white/40">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>نظام الفحص الذكي نشط — يتم التحقق التلقائي كل بضع ثوانٍ</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 text-center text-xs text-white/40 flex items-center gap-4">
        <span>© {new Date().getFullYear()} UpStore Official Pay</span>
        <span>•</span>
        <Link href="https://t.me/UPSTORE_HELP" className="hover:text-white transition-colors">
          الدعم الفني @UPSTORE_HELP
        </Link>
      </div>
    </div>
  );
}

export default function BybitPayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07090e] text-white flex items-center justify-center">جارٍ تحميل بوابة UpStore Pay...</div>}>
      <BybitPayContent />
    </Suspense>
  );
}
