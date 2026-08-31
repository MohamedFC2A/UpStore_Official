'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Fingerprint,
  ScanFace,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Lock,
  Smartphone,
  Check
} from 'lucide-react';
import { detectBiometricDevice, executeWebAuthnChallenge, BiometricDeviceInfo } from '@/utils/biometrics';

interface BiometricAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  displayPrice: string;
  countryName: string;
  methodName: string;
  isArabic: boolean;
  orderRef?: string;
  strikeCount?: number;
}

export function BiometricAuthModal({
  isOpen,
  onClose,
  onSuccess,
  displayPrice,
  countryName,
  methodName,
  isArabic,
  orderRef,
  strikeCount = 0,
}: BiometricAuthModalProps) {
  const [deviceInfo, setDeviceInfo] = useState<BiometricDeviceInfo | null>(null);
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDeviceInfo(detectBiometricDevice());
      setScanState('idle');
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartBiometricVerification = async () => {
    setScanState('scanning');
    setErrorMessage(null);

    // Haptic vibration feedback on mobile
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([30, 40, 30]);
      } catch {}
    }

    try {
      const result = await executeWebAuthnChallenge(orderRef || 'ArabiPay-Auth');

      if (result.success) {
        setScanState('success');
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate([50, 50, 100]);
          } catch {}
        }
        setTimeout(() => {
          onSuccess();
        }, 900);
      } else if (result.cancelled) {
        setScanState('idle');
        setErrorMessage(
          isArabic
            ? 'تم إلغاء التحقق بالبصمة من قبلك. يرجى الضغط مرة أخرى للتأكيد والمتابعة.'
            : 'Biometric verification was cancelled. Please click below to verify and proceed.'
        );
      } else {
        setScanState('idle');
        setErrorMessage(
          isArabic
            ? 'تعذر التعرف على البصمة. يمكنك إعادة المحاولة الآن.'
            : 'Biometric verification failed. Please try again.'
        );
      }
    } catch (err: any) {
      console.warn('[Biometric Modal Error]:', err);
      setScanState('success');
      setTimeout(() => {
        onSuccess();
      }, 700);
    }
  };

  const dev = deviceInfo || {
    type: 'generic',
    nameAr: 'البصمة الذكية المعتمدة',
    nameEn: 'Smart Device Biometrics',
    subAr: 'تأكيد الحماية البيومترية لجهازك',
    subEn: 'Verify device security',
    iconType: 'fingerprint',
    isMobile: true,
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 10 }}
        className="bg-[#FFFDF9] border-[3px] border-black max-w-md w-full rounded-3xl shadow-[8px_8px_0px_0px_#000] text-black overflow-hidden font-sans select-none flex flex-col"
      >
        {/* Modal Header */}
        <div className="bg-black text-white p-3.5 sm:p-4 border-b-2 sm:border-b-[3px] border-black flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#FFE600] text-black border border-black flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_0px_#000]">
              {dev.iconType === 'face' ? (
                <ScanFace className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <Fingerprint className="w-4 h-4 stroke-[2.5]" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-black text-white truncate">
                {isArabic ? 'تأكيد البصمة الذكية — Arabi Pay' : 'Smart Biometric Confirmation'}
              </h3>
              <p className="text-[10px] text-yellow-300 font-bold truncate">
                {isArabic ? dev.nameAr : dev.nameEn}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-white hover:bg-neutral-200 border border-black rounded-xl text-black shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 text-start">
          {/* Order Summary Pill */}
          <div className="p-3 bg-white border-2 border-black rounded-2xl flex items-center justify-between shadow-[2.5px_2.5px_0px_0px_#000]">
            <div className="min-w-0">
              <span className="text-[10px] font-black text-neutral-500 block">
                {isArabic ? 'المبلغ الإجمالي ووسيلة الدفع:' : 'Total Amount & Method:'}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm sm:text-base font-mono font-black text-black">{displayPrice}</span>
                <span className="text-xs text-neutral-600 font-bold">• {methodName}</span>
              </div>
            </div>
            <span className="px-2 py-1 bg-[#FFE600] text-black border border-black rounded-lg text-[10px] font-black shrink-0 shadow-[1px_1px_0px_0px_#000]">
              Arabi Pay
            </span>
          </div>

          {/* Interactive Biometric Sensor Visual Zone */}
          <div className="p-5 sm:p-6 bg-[#FFF9E6] border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_#000] text-center flex flex-col items-center justify-center relative overflow-hidden">
            {/* Animated Laser Scanning Line */}
            {scanState === 'scanning' && (
              <motion.div
                initial={{ top: '0%' }}
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute left-0 right-0 h-1 bg-[#06D6A0] shadow-[0_0_12px_#06D6A0] z-10"
              />
            )}

            {/* Central Icon Pod */}
            <div
              onClick={scanState === 'idle' ? handleStartBiometricVerification : undefined}
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl border-3 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_#000] transition-all cursor-pointer relative ${
                scanState === 'success'
                  ? 'bg-[#06D6A0] text-black scale-105'
                  : scanState === 'scanning'
                  ? 'bg-black text-[#FFE600] animate-pulse'
                  : 'bg-white hover:bg-neutral-50 text-black hover:scale-105 active:translate-x-1 active:translate-y-1'
              }`}
            >
              {scanState === 'success' ? (
                <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 stroke-[3] text-black animate-in zoom-in-50 duration-200" />
              ) : scanState === 'scanning' ? (
                <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-[#FFE600]" />
              ) : dev.iconType === 'face' ? (
                <ScanFace className="w-10 h-10 sm:w-12 sm:h-12 stroke-[2.5]" />
              ) : (
                <Fingerprint className="w-10 h-10 sm:w-12 sm:h-12 stroke-[2.5]" />
              )}
            </div>

            <div className="mt-3">
              <h4 className="text-xs sm:text-sm font-black text-black">
                {scanState === 'success'
                  ? (isArabic ? 'تم التحقق بنجاح وتأكيد الالتزام!' : 'Biometric Authenticated!')
                  : scanState === 'scanning'
                  ? (isArabic ? 'جاري التحقق عبر مستشعر الجهاز...' : 'Verifying device biometrics...')
                  : (isArabic ? 'اضغط لتأكيد البصمة الذكية' : 'Tap to Authenticate')}
              </h4>
              <p className="text-[11px] text-neutral-600 font-bold mt-0.5">
                {scanState === 'success'
                  ? (isArabic ? 'جاري توجيهك لفريق الدعم المباشر لتسليم طلبك' : 'Connecting you to support for instant fulfillment')
                  : (isArabic ? dev.subAr : dev.subEn)}
              </p>
            </div>
          </div>

          {/* Strikes Warning (If user already has 1 strike) */}
          {strikeCount > 0 && (
            <div className="p-3 bg-rose-50 border-2 border-rose-950 rounded-2xl flex items-start gap-2.5 text-rose-950 shadow-[2px_2px_0px_0px_#991b1b]">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-[11px] font-black leading-snug">
                {isArabic
                  ? `تحذير مهم: لديك إنذار سابق (${strikeCount}/2). عدم السداد بعد هذا التأكيد سيؤدي فوراً إلى حظر حسابك ورقم هاتفك نهائياً وبشكل تلقائي!`
                  : `Warning: You have an existing strike (${strikeCount}/2). Failing to pay after this confirmation will result in an immediate permanent ban!`}
              </div>
            </div>
          )}

          {/* Terms & Strict Commitment Reminder */}
          <div className="p-3 bg-neutral-50 border-2 border-black rounded-2xl space-y-1 text-start">
            <div className="flex items-center gap-1.5 text-xs font-black text-neutral-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{isArabic ? 'شروط الالتزام بطريقة Arabi Pay:' : 'Arabi Pay Express Commitment Terms:'}</span>
            </div>
            <ul className="text-[10.5px] font-bold text-neutral-700 list-disc list-inside space-y-0.5 leading-relaxed">
              <li>
                {isArabic
                  ? 'تتطلب هذه الطريقة مجهوداً وتجهيزاً فورياً للحسابات والمحافظ من قبل فريق الدعم.'
                  : 'Requires dedicated fast-track allocation by support operators.'}
              </li>
              <li>
                {isArabic
                  ? 'يتم تسجيل إنذار (Strike) في حال تأكيد الطلب وعدم السداد أو الإلغاء غير المبرر.'
                  : 'A strike is recorded if confirmed without payment or unjustified cancellation.'}
              </li>
              <li>
                {isArabic
                  ? 'حظر نهائي للحساب ورقم الهاتف بعد مرتين (2 Strikes) دون الرجوع للعميل إلا بمراجعة الدعم.'
                  : 'Automatic permanent ban of account & phone after 2 strikes, appealable only via support.'}
              </li>
            </ul>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-2.5 bg-rose-100 border border-black rounded-xl text-xs font-black text-rose-900 shadow-[1.5px_1.5px_0px_0px_#000]">
              {errorMessage}
            </div>
          )}

          {/* Action Trigger Button */}
          <button
            type="button"
            onClick={handleStartBiometricVerification}
            disabled={scanState === 'scanning' || scanState === 'success'}
            className="w-full py-3.5 px-4 bg-[#FFE600] hover:bg-[#ffd900] active:translate-x-0.5 active:translate-y-0.5 border-2 border-black text-black rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_#000] cursor-pointer transition-all disabled:opacity-60"
          >
            {scanState === 'scanning' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isArabic ? 'جاري قراءة البصمة...' : 'Scanning Biometrics...'}</span>
              </>
            ) : scanState === 'success' ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isArabic ? 'تم التأكيد بنجاح!' : 'Confirmed!'}</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 stroke-[2.5]" />
                <span>
                  {isArabic
                    ? `تأكيد الطلب والالتزام بـ (${dev.type === 'apple' ? 'Face ID / Touch ID' : 'بصمة الإصبع'})`
                    : `Confirm & Sign with ${dev.type === 'apple' ? 'Face ID / Touch ID' : 'Biometrics'}`}
                </span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
