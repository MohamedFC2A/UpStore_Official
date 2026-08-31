'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  HelpCircle, 
  ShieldCheck, 
  Zap, 
  X, 
  ArrowRight, 
  Search, 
  Headset, 
  Moon, 
  CheckCircle2,
  HeartHandshake,
  CreditCard,
  ShoppingBag,
  Percent,
  Compass
} from 'lucide-react';
import { useHyperAdaptiveStore } from '@/store/useHyperAdaptiveStore';
import { useLocale } from '@/context/LocaleContext';
import { useRouter, usePathname } from 'next/navigation';

export function AdaptiveInterventions() {
  const { activeIntervention, dismissIntervention, enabled } = useHyperAdaptiveStore();
  const { language, mounted } = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  if (!mounted || !enabled || !activeIntervention || pathname?.startsWith('/ad')) return null;

  const isAr = language === 'ar';
  const title = isAr ? activeIntervention.titleAr : activeIntervention.titleEn;
  const desc = isAr ? activeIntervention.descAr : activeIntervention.descEn;
  const actionLabel = isAr ? activeIntervention.actionLabelAr : activeIntervention.actionLabelEn;

  const getIcon = () => {
    switch (activeIntervention.type) {
      case 'self_healed_notice':
      case 'network_recovery':
        return <CheckCircle2 className="w-5 h-5 text-black stroke-[2.5]" />;
      case 'checkout_helper':
      case 'payment_guide':
        return <CreditCard className="w-5 h-5 text-black stroke-[2.5]" />;
      case 'currency_match':
        return <HeartHandshake className="w-5 h-5 text-black stroke-[2.5]" />;
      case 'rage_relief':
        return <Headset className="w-5 h-5 text-black stroke-[2.5]" />;
      case 'confusion_guide':
        return <Search className="w-5 h-5 text-black stroke-[2.5]" />;
      case 'hesitation_reassurance':
      case 'warranty_trust':
        return <ShieldCheck className="w-5 h-5 text-black stroke-[2.5]" />;
      case 'quick_checkout':
        return <ShoppingBag className="w-5 h-5 text-black stroke-[2.5]" />;
      case 'instant_discount':
        return <Percent className="w-5 h-5 text-black stroke-[2.5]" />;
      case 'comparison_helper':
        return <Compass className="w-5 h-5 text-black stroke-[2.5]" />;
      case 'speed_shortcut':
        return <Zap className="w-5 h-5 text-black stroke-[2.5]" />;
      case 'eye_comfort':
        return <Moon className="w-5 h-5 text-black stroke-[2.5]" />;
      default:
        return <Sparkles className="w-5 h-5 text-black stroke-[2.5]" />;
    }
  };

  const getBgColor = () => {
    switch (activeIntervention.type) {
      case 'self_healed_notice':
      case 'network_recovery':
      case 'hesitation_reassurance':
      case 'warranty_trust':
      case 'quick_checkout':
        return 'bg-[#06D6A0]';
      case 'rage_relief':
      case 'instant_discount':
        return 'bg-[#FFE600]';
      case 'confusion_guide':
      case 'comparison_helper':
      case 'currency_match':
        return 'bg-[#4CC9F0]';
      case 'checkout_helper':
      case 'payment_guide':
        return 'bg-[#FF70A6]';
      default:
        return 'bg-[#B892FF]';
    }
  };

  const handleAction = () => {
    if (activeIntervention.onAction) {
      activeIntervention.onAction();
    } else if (activeIntervention.actionUrl) {
      if (activeIntervention.actionUrl.startsWith('http')) {
        window.open(activeIntervention.actionUrl, '_blank');
      } else {
        router.push(activeIntervention.actionUrl);
      }
    } else if (activeIntervention.actionSlug) {
      router.push(`/product/${activeIntervention.actionSlug}`);
    } else if (activeIntervention.type === 'confusion_guide') {
      const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
    dismissIntervention();
  };

  return (
    <AnimatePresence>
      <motion.div
        key={activeIntervention.id}
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 450, damping: 28 }}
        className={`fixed bottom-20 sm:bottom-6 inset-x-3 sm:inset-x-auto ${isAr ? 'sm:start-8' : 'sm:end-8'} z-50 max-w-sm sm:max-w-md mx-auto sm:mx-0 w-auto`}
      >
        <div className="bg-white border-[2.5px] border-black rounded-2xl p-3.5 sm:p-5 shadow-[5px_5px_0px_0px_#000] text-black space-y-2.5 relative select-none">
          
          {/* Close button */}
          <button
            onClick={dismissIntervention}
            className="absolute top-2.5 end-2.5 p-1.5 text-black hover:bg-neutral-100 rounded-lg border-2 border-transparent hover:border-black transition-all cursor-pointer"
            aria-label="Close assistance"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Header & Icon */}
          <div className="flex items-start gap-2.5 pe-7">
            <div className={`p-2 rounded-xl border-2 border-black shrink-0 ${getBgColor()} shadow-[2px_2px_0px_0px_#000]`}>
              {getIcon()}
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black text-white">
                  Hyper-Adaptive AI
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-black text-black leading-tight">
                {title}
              </h4>
            </div>
          </div>

          {/* Body Description */}
          <p className="text-xs text-neutral-700 font-bold leading-relaxed">
            {desc}
          </p>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-1 gap-2">
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-neutral-600 font-bold">
              <HeartHandshake className="w-3.5 h-3.5 stroke-[2.5] text-black shrink-0" />
              <span className="truncate">{isAr ? 'مُكيّف ذاتياً لراحتك' : 'Tailored to you'}</span>
            </div>

            {actionLabel ? (
              <button
                onClick={handleAction}
                className="px-3 py-1.5 bg-[#06D6A0] hover:bg-[#05b385] active:translate-x-0.5 active:translate-y-0.5 border-2 border-black rounded-xl text-black font-black text-xs transition-all shadow-[2px_2px_0px_0px_#000] cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <span>{actionLabel}</span>
                <ArrowRight className={`w-3.5 h-3.5 stroke-[2.5] ${isAr ? 'rotate-180' : ''}`} />
              </button>
            ) : (
              <button
                onClick={dismissIntervention}
                className="px-3 py-1 bg-neutral-100 hover:bg-neutral-200 border-2 border-black rounded-lg text-black font-black text-xs transition-all cursor-pointer shrink-0"
              >
                {isAr ? 'حسناً، فهمت' : 'Got it'}
              </button>
            )}
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
