import { Suspense } from 'react';
import type { Metadata } from 'next';
import ReferralClient from './ReferralClient';

export const metadata: Metadata = {
  title: "برنامج المكافآت والأرباح النقدية | UpStore Rewards & Referral Program",
  description: "شارك رابطك الحصري واكسب رصيد كاش حقيقي في محفظتك لكل 3 أصدقاء يسجلون في UpStore. افتح خزائن المكافآت التراكمية مع إيداع سريع للأرباح.",
  alternates: {
    canonical: 'https://upstore.one/referral',
    languages: {
      'en': 'https://upstore.one/referral?lang=en',
      'en-US': 'https://upstore.one/referral?lang=en',
      'ar': 'https://upstore.one/referral?lang=ar',
      'ar-EG': 'https://upstore.one/referral?lang=ar',
      'ar-SA': 'https://upstore.one/referral?lang=ar',
      'x-default': 'https://upstore.one/referral',
    },
  },
  openGraph: {
    title: "برنامج مكافآت UpStore — اربح رصيد كاش حقيقي في محفظتك",
    description: "ادعُ أصدقاءك وافتح خزائن المكافآت النقدية في أرخص متجر رقمي في العالم.",
    url: 'https://upstore.one/referral',
    siteName: 'UpStore',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "برنامج مكافآت UpStore — اربح رصيد كاش حقيقي في محفظتك",
    description: "ادعُ أصدقاءك وافتح خزائن المكافآت النقدية في UpStore.",
  }
};

export default function ReferralPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FFFDF9] text-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-black border-t-[#FFE600] rounded-full animate-spin"></div>
          <span className="text-xs font-black text-black tracking-widest uppercase">
            Loading Referral Program...
          </span>
        </div>
      </div>
    }>
      <ReferralClient />
    </Suspense>
  );
}
