'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';

function PaymentPartnersRowComponent() {
  const { language } = useLocale();
  const isAr = language === 'ar';

  const paymentMethods = [
    { name: 'InstaPay', badge: isAr ? 'مصر P2P' : 'Egypt P2P', bg: 'bg-[#FFE600]' },
    { name: 'Vodafone Cash', badge: isAr ? 'محفظة كاش' : 'Cash Wallet', bg: 'bg-[#FF70A6]' },
    { name: 'STC Pay', badge: isAr ? 'السعودية' : 'Saudi Wallet', bg: 'bg-[#B892FF]' },
    { name: 'Al Rajhi & SNB', badge: isAr ? 'تحويل بنكي' : 'Bank IBAN', bg: 'bg-[#06D6A0]' },
    { name: 'Bybit P2P', badge: isAr ? '0% رسوم بايبت' : 'Bybit V5 0%', bg: 'bg-[#FFE600]' },
    { name: 'Binance Pay', badge: isAr ? 'بينانس' : 'Instant Pay', bg: 'bg-[#FFE600]' },
    { name: 'Visa & Mastercard', badge: isAr ? 'عالمي' : 'Global 3DS', bg: 'bg-[#4CC9F0]' },
    { name: 'Lemon Squeezy', badge: isAr ? 'بطاقات + بايبال' : 'Cards & Apple Pay', bg: 'bg-[#FFC800]' },
    { name: 'NOWPayments', badge: isAr ? '300+ كريبتو' : '300+ Coins', bg: 'bg-[#00E599]' },
    { name: 'Apple Pay', badge: isAr ? 'لمسة واحدة' : '1-Touch', bg: 'bg-[#06D6A0]' },
    { name: 'USDT & Crypto', badge: isAr ? 'TRC20/BEP20' : 'TRC20/TON', bg: 'bg-[#4CC9F0]' },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 select-none">
      <div className="rounded-2xl sm:rounded-3xl border-2 sm:border-[2.5px] border-black bg-white p-4 sm:p-6 shadow-[3px_3px_0px_0px_#000] sm:shadow-[5px_5px_0px_0px_#000]">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-5">
          
          <div className="flex items-center gap-3.5 shrink-0 text-center sm:text-start">
            <div className="w-11 h-11 rounded-xl bg-[#06D6A0] border-2 border-black flex items-center justify-center text-black shadow-[2px_2px_0px_0px_#000]">
              <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-black">
                {isAr ? 'بوابات الدفع الرسمية والمعتمدة' : 'Accepted Secure Payment Gateways'}
              </h3>
              <p className="text-xs text-neutral-700 font-bold">
                {isAr ? 'دعم كامل لطرق الدفع في مصر، السعودية، بايبت، والبطاقات العالمية' : 'Zero hidden fees with instant automated verification.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {paymentMethods.map((pm, idx) => (
              <div 
                key={idx}
                className="px-3 py-1.5 rounded-xl bg-[#FFFDF9] border-2 border-black flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
              >
                <span className="text-xs font-black text-black">{pm.name}</span>
                <span className={`text-[10px] font-black text-black ${pm.bg} border border-black px-1.5 py-0.2 rounded shadow-[1px_1px_0px_0px_#000]`}>
                  {pm.badge}
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}

export const PaymentPartnersRow = React.memo(PaymentPartnersRowComponent);
