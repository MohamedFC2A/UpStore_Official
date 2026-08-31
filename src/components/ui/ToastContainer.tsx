'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { useToastStore, ToastMessage } from '@/store/useToastStore';
import { useLocale } from '@/context/LocaleContext';

function ToastItem({ toast }: { toast: ToastMessage }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const { language } = useLocale();
  const isRTL = language === 'ar';

  const getToastConfig = () => {
    switch (toast.type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-black stroke-[3]" />,
          badgeBg: 'bg-[#06D6A0]',
          accentColor: '#06D6A0',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4 text-black stroke-[3]" />,
          badgeBg: 'bg-[#FF70A6]',
          accentColor: '#FF70A6',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-black stroke-[3]" />,
          badgeBg: 'bg-[#FFE600]',
          accentColor: '#FFE600',
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-4 h-4 text-black stroke-[3]" />,
          badgeBg: 'bg-[#4CC9F0]',
          accentColor: '#4CC9F0',
        };
    }
  };

  const config = getToastConfig();
  const durationSec = ((toast.duration || 4000) / 1000);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 420, scale: 0.88, filter: 'blur(4px)' }}
      animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, x: 420, scale: 0.88, filter: 'blur(4px)', transition: { duration: 0.2, ease: [0.32, 0.72, 0, 1] } }}
      transition={{ type: 'spring', stiffness: 450, damping: 28, mass: 0.65 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0.1, right: 0.85 }}
      onDragEnd={(_, info) => {
        if (info.offset.x > 25 || info.velocity.x > 150) {
          removeToast(toast.id);
        }
      }}
      dir={isRTL ? 'rtl' : 'ltr'}
      className="pointer-events-auto relative flex items-center gap-3 max-w-[92vw] sm:max-w-md w-fit rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 bg-[#FFFDF9] border-[2.5px] border-black shadow-[4px_4px_0px_0px_#000] text-black select-none cursor-grab active:cursor-grabbing overflow-hidden"
    >
      {/* Type badge icon */}
      <div className={`w-7.5 h-7.5 rounded-xl ${config.badgeBg} border-2 border-black flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_0px_#000]`}>
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-1 pl-1">
        {toast.title && (
          <h4 className="text-xs sm:text-sm font-black text-black leading-none mb-0.5 truncate tracking-tight">
            {toast.title}
          </h4>
        )}
        <p className="text-[11px] sm:text-xs text-neutral-900 font-extrabold leading-tight truncate sm:whitespace-normal">
          {toast.message}
        </p>
      </div>

      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          removeToast(toast.id);
        }}
        className="w-6 h-6 rounded-lg bg-neutral-100 hover:bg-[#FFE600] border border-black flex items-center justify-center text-black font-black transition-all shrink-0 cursor-pointer shadow-[1px_1px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 text-[10px]"
        aria-label="Close notification"
      >
        <X className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      {/* Auto-Dismiss Neon Indicator Bar at the bottom */}
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: durationSec, ease: 'linear' }}
        style={{ backgroundColor: config.accentColor }}
        className="absolute bottom-0 left-0 right-0 h-[2.5px] border-t border-black/15"
      />
    </motion.div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const { mounted } = useLocale();

  if (!mounted || toasts.length === 0) return null;

  // Display latest 3 toasts on side
  const visibleToasts = toasts.slice(-3);

  return (
    <div
      aria-live="polite"
      suppressHydrationWarning
      className="fixed z-[99999] top-3 right-3 sm:top-5 sm:right-6 flex flex-col items-end gap-2.5 pointer-events-none max-w-[92vw] sm:max-w-md"
    >
      <AnimatePresence mode="popLayout">
        {visibleToasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}

