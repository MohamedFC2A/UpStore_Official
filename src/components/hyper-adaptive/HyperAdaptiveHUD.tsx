'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Brain, 
  ChevronUp, 
  ChevronDown, 
  X, 
  Activity, 
  Power,
  Compass,
  ArrowRight,
  Zap,
  Tag,
  Target
} from 'lucide-react';
import { useHyperAdaptiveStore } from '@/store/useHyperAdaptiveStore';
import { useLocale } from '@/context/LocaleContext';
import { useRouter, usePathname } from 'next/navigation';

export function HyperAdaptiveHUD() {
  const {
    enabled,
    setEnabled,
    aiActivityAr,
    aiActivityEn,
    detectedIntentAr,
    detectedIntentEn,
    predictedNextStepAr,
    predictedNextStepEn,
    topCategory,
    suggestedSearchQueries,
    cognitiveLoad,
    isOptimalLocked,
    lockOptimalState,
  } = useHyperAdaptiveStore();

  const { language, mounted } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Temporarily disabled by admin request
  return null;

  const isAr = language === 'ar';
  const flowScore = Math.max(0, Math.min(100, Math.round(100 - cognitiveLoad)));

  if (!enabled) {
    return (
      <div 
        suppressHydrationWarning 
        className={`hidden sm:block fixed bottom-5 ${isAr ? 'start-5' : 'end-5'} z-40 select-none`}
      >
        <button
          suppressHydrationWarning
          onClick={() => setEnabled(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-neutral-100 border-2 border-black rounded-xl text-black text-[11px] font-black shadow-[2px_2px_0px_0px_#000] transition-all cursor-pointer opacity-80 hover:opacity-100"
          title={isAr ? 'تفعيل التكيف الإدراكي التلقائي (Hyper-Adaptive AI)' : 'Enable Hyper-Adaptive AI'}
        >
          <Brain className="w-3.5 h-3.5 text-black stroke-[2.5]" />
          <span>{isAr ? 'تفعيل Auto AI' : 'Enable Auto AI'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`hidden sm:block fixed bottom-5 ${isAr ? 'start-5' : 'end-5'} z-40 select-none`}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            className="mb-2 w-[calc(100vw-1.5rem)] sm:w-96 max-w-sm bg-white border-2 border-black rounded-2xl shadow-[6px_6px_0px_0px_#000] p-4 text-black text-xs space-y-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-black pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#FFE600] border-2 border-black rounded-lg shadow-[1.5px_1.5px_0px_0px_#000]">
                  <Brain className="w-4 h-4 text-black stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-black flex items-center gap-1.5">
                    Hyper-Adaptive AI
                    <span className="w-2 h-2 rounded-full bg-[#06D6A0] animate-pulse" />
                  </h4>
                  <p className="text-[10px] text-neutral-600 font-bold">
                    {isAr ? 'نظام تكيفي ذاتي يستبق خطوتك ويحل المشاكل تلقائياً' : 'Autonomous Predictive UX & Self-Healing Engine'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-black hover:bg-neutral-100 rounded-lg border-2 border-transparent hover:border-black transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>

            {/* Live Intent & Next Step Predictions */}
            <div className="p-3 bg-[#FFFDF9] border-2 border-black rounded-xl space-y-2.5 shadow-[2px_2px_0px_0px_#000] text-start">
              {/* Intent */}
              <div>
                <div className="flex items-center justify-between text-[10px] font-black text-neutral-600 uppercase mb-1">
                  <span className="flex items-center gap-1">
                    <Compass className="w-3 h-3 text-black stroke-[2.5]" />
                    {isAr ? 'النية المكتشفة بالذكاء الاصطناعي' : 'Detected User Intent'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#FFE600] border border-black text-[9px] font-black text-black">
                    {topCategory || 'Subscriptions'}
                  </span>
                </div>
                <p className="text-xs font-black text-black leading-snug">
                  {isAr ? detectedIntentAr : detectedIntentEn}
                </p>
              </div>

              {/* Next Step Prediction */}
              <div className="border-t border-dashed border-neutral-300 pt-2">
                <div className="flex items-center gap-1 text-[10px] font-black text-emerald-800 uppercase mb-1">
                  <Target className="w-3 h-3 text-emerald-700 stroke-[2.5]" />
                  <span>{isAr ? 'الخطوة المتوقعة قبل فعلها' : 'Anticipated Next Step'}</span>
                </div>
                <p className="text-xs font-bold text-neutral-800 leading-snug">
                  {isAr ? predictedNextStepAr : predictedNextStepEn}
                </p>
              </div>
            </div>

            {/* Quick Session Suggestion Chips */}
            {suggestedSearchQueries.length > 0 && (
              <div className="space-y-1.5 text-start">
                <span className="text-[10px] font-black text-neutral-600 uppercase flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-black stroke-[2.5]" />
                  {isAr ? 'توصيات سريعة مقترحة لرحلتك:' : 'Proactive Suggestions for You:'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedSearchQueries.slice(0, 2).map((chip) => (
                    <button
                      key={chip.queryEn}
                      onClick={() => {
                        router.push(`/?q=${encodeURIComponent(isAr ? chip.queryAr : chip.queryEn)}`);
                        setIsOpen(false);
                      }}
                      className="px-2.5 py-1 bg-[#FFE600] hover:bg-[#ffe033] border-2 border-black rounded-lg text-[10px] font-black text-black shadow-[1px_1px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>{isAr ? chip.queryAr : chip.queryEn}</span>
                      <ArrowRight className={`w-2.5 h-2.5 stroke-[2.5] ${isAr ? 'rotate-180' : ''}`} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Psychological Flow Score */}
            <div className="p-2.5 bg-neutral-50 border-2 border-black rounded-xl space-y-1.5 shadow-[1.5px_1.5px_0px_0px_#000]">
              <div className="flex items-center justify-between text-xs font-black">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 stroke-[2.5]" />
                  {isAr ? 'مؤشر التكيف والاستقرار' : 'Adaptive Flow & Stability'}
                </span>
                <span className={`font-mono text-xs font-black px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_0px_#000] ${
                  flowScore === 100 ? 'bg-[#06D6A0] text-black' : 'bg-[#FFE600] text-black'
                }`}>
                  {flowScore}%
                </span>
              </div>
              <div className="w-full bg-neutral-200 border-2 border-black rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-[#06D6A0] transition-all duration-500 rounded-full"
                  style={{ width: `${flowScore}%` }}
                />
              </div>
            </div>

            {/* Footer with Pause / Reset Toggle */}
            <div className="pt-2 border-t-2 border-black/10 flex justify-between items-center text-[11px] font-black">
              <button
                onClick={lockOptimalState}
                className="text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer font-black"
                title={isAr ? 'تثبيت الوضع المثالي' : 'Lock Optimal State'}
              >
                <Sparkles className="w-3 h-3 stroke-[2.5]" />
                <span>{isAr ? 'تثبيت الحالة المثالية' : 'Lock Optimal'}</span>
              </button>

              <button
                onClick={() => { setEnabled(false); setIsOpen(false); }}
                className="text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer font-black"
              >
                <Power className="w-3 h-3 stroke-[2.5]" />
                <span>{isAr ? 'إيقاف مؤقت' : 'Pause Auto AI'}</span>
              </button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Pill Trigger */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-neutral-50 border-2 border-black rounded-2xl text-black font-black text-xs shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
        aria-label="Toggle Hyper-Adaptive AI HUD"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-[#06D6A0] animate-pulse shrink-0" />
        <Brain className="w-4 h-4 text-black stroke-[2.5]" />
        <span className="hidden sm:inline">
          {isAr ? 'Auto AI التكيفي' : 'Adaptive Auto AI'}
        </span>
        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-black ${
          flowScore === 100 ? 'bg-[#06D6A0] text-black' : 'bg-[#FFE600] text-black'
        }`}>
          {flowScore}%
        </span>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
        )}
      </button>
    </div>
  );
}
