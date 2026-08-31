import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import BrowseClient from './BrowseClient';

export const metadata: Metadata = {
  title: 'سوق التراخيص والاشتراكات الرقمية | UpStore Browse Marketplace',
  description: 'تصفح واكتشف أفضل الاشتراكات الرقمية الأصلية، أدوات الذكاء الاصطناعي، البرامج، وعروض الفلاش الحصرية بأقل الأسعار مع تسليم آلي فوري 100%.',
  alternates: {
    canonical: 'https://upstore.one/browse',
  },
  openGraph: {
    title: 'سوق التراخيص والاشتراكات الرقمية — UpStore',
    description: 'تصفح واكتشف أفضل الاشتراكات الرقمية وأدوات الذكاء الاصطناعي الأصلية بأقل الأسعار.',
    url: 'https://upstore.one/browse',
    siteName: 'UpStore',
    images: [{
      url: '/api/og?title=Browse%20Digital%20Marketplace&category=CATALOG',
      width: 1200,
      height: 630,
      alt: 'UpStore Browse Marketplace',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Browse Digital Marketplace — UpStore',
    description: 'Explore premium software, AI tools, and streaming accounts at the lowest prices online.',
    images: ['/api/og?title=Browse%20Digital%20Marketplace&category=CATALOG'],
  },
};

export default function BrowsePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6">
          <div className="w-10 h-10 border-3 border-black border-t-[#FFE600] rounded-full animate-spin" />
        </div>
      }
    >
      <BrowseClient />
    </Suspense>
  );
}
