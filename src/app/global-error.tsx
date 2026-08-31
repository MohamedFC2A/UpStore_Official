'use client';

import React, { useEffect } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Global App Crash Error Caught]:', error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-[#030308] text-white flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full text-center space-y-6 bg-white/[0.03] border border-white/10 p-8 rounded-3xl backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500">
            <AlertOctagon className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-black text-white">حدث خطأ غير متوقع في النظام</h1>
            <p className="text-xs text-gray-400 leading-relaxed">
              نعتذر عن هذا الخطأ المؤقت. تم تسجيل التقرير الأمني لحل المشكلة فوراً. يرجى محاولة إعادة التحميل.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl bg-[#00ff66] text-black font-extrabold text-sm hover:bg-[#00ff66]/90 transition-all shadow-[0_0_25px_rgba(0,255,102,0.2)] active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة المحاولة (Reload Application)</span>
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
