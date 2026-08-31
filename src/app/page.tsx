import { Suspense } from 'react';
import type { Metadata } from 'next';
import HomeClient from './HomeClient';

export const metadata: Metadata = {
  title: "UpStore — World's Lowest-Priced Digital Marketplace | Cheap Premium Accounts & Subscriptions",
  description: "Buy premium subscriptions (Netflix 4K, Spotify Premium, NordVPN, ChatGPT Plus, game keys) at the absolute lowest prices online. Instant automated delivery & 30-day warranty.",
  alternates: {
    canonical: 'https://upstore.one',
    languages: {
      'en': 'https://upstore.one/?lang=en',
      'en-US': 'https://upstore.one/?lang=en',
      'ar': 'https://upstore.one/?lang=ar',
      'ar-EG': 'https://upstore.one/?lang=ar',
      'ar-SA': 'https://upstore.one/?lang=ar',
      'x-default': 'https://upstore.one',
    },
  },
  openGraph: {
    title: "UpStore — World's Lowest-Priced Digital Marketplace",
    description: "Get Netflix, Spotify, ChatGPT Plus, NordVPN, and gaming keys at the lowest prices online. Instant automated delivery & 30-day warranty.",
    url: 'https://upstore.one',
    siteName: 'UpStore',
    type: 'website',
    images: [{
      url: '/api/og',
      width: 1200,
      height: 630,
      alt: 'UpStore — World\'s Lowest-Priced Digital Marketplace',
      type: 'image/png',
    }]
  },
  twitter: {
    card: 'summary_large_image',
    title: "UpStore — World's Lowest-Priced Digital Marketplace",
    description: "Get Netflix, Spotify, ChatGPT Plus, NordVPN, and gaming keys at the lowest prices online. Instant delivery & 30-day warranty.",
    images: ['/api/og']
  }
};

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FFFDF9] text-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-black border-t-[#FFE600] rounded-full animate-spin"></div>
          <span className="text-xs font-black text-black tracking-widest uppercase">Loading UpStore...</span>
        </div>
      </div>
    }>
      <HomeClient />
    </Suspense>
  );
}
