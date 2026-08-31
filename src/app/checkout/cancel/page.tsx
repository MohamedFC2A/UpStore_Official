'use client';

import React from 'react';
import Link from 'next/link';
import { XCircle, ShoppingCart, ArrowLeft } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';

export default function CheckoutCancelPage() {
  const { language, mounted } = useLocale();
  const isAr = mounted && language === 'ar';

  return (
    <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center p-4 sm:p-6 select-none">
      <div className="bg-white border-2 border-black rounded-3xl p-6 sm:p-10 max-w-md w-full text-center shadow-[6px_6px_0px_0px_#000] space-y-6 relative overflow-hidden">
        
        {/* Top Accent Strip */}
        <div className="absolute top-0 left-0 right-0 h-3 bg-[#FF70A6] border-b-2 border-black" />

        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#FF70A6] rounded-2xl border-2 border-black flex items-center justify-center mx-auto shadow-[3px_3px_0px_0px_#000] pt-1">
          <XCircle className="w-10 h-10 text-black stroke-[2.5]" />
        </div>
        
        <div className="space-y-1.5">
          <div className="inline-block bg-neutral-100 border border-black px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
            {isAr ? 'حالة المعاملة: ملغية' : 'Transaction: Canceled'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
            {isAr ? 'تم إلغاء عملية الدفع' : 'Payment Canceled'}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-700 font-bold leading-relaxed">
            {isAr 
              ? 'لم يتم خصم أي مبالغ من حسابك. تم حفظ جميع منتجاتك بأمان داخل سلة التسوق الخاصة بك.'
              : 'No funds were deducted. Your items have been safely preserved in your shopping cart.'}
          </p>
        </div>
        
        <div className="space-y-3 pt-2">
          <Link 
            href="/cart" 
            className="w-full py-4 bg-[#FFE600] hover:bg-[#edd600] text-black font-black uppercase tracking-wider rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
          >
            <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
            <span>{isAr ? 'العودة إلى سلة التسوق' : 'Return to Cart'}</span>
          </Link>
          
          <Link 
            href="/" 
            className="w-full py-4 bg-white hover:bg-neutral-100 text-black font-black uppercase tracking-wider rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5] rtl:rotate-180" />
            <span>{isAr ? 'متابعة تصفح المتجر' : 'Continue Shopping'}</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
