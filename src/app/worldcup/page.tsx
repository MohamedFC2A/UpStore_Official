import type { Metadata } from 'next';
import WorldCupClient from './WorldCupClient';

export const metadata: Metadata = {
  title: "باقة البث المباشر لكأس العالم FIFA 26 | UpStore 4K Live Stream Pass",
  description: "احصل على باقة البث المباشر الفائقة لكأس العالم 2026 بدقة 4K HDR وبدون تقطيع أو إعلانات عبر تطبيق الأندرويد الحصري بخصم 90% مع دفع عالمي معتمد وضمان شامل كامل البطولة.",
  alternates: {
    canonical: 'https://upstore.one/worldcup',
  },
  openGraph: {
    title: "باقة البث المباشر لكأس العالم FIFA 26 — UpStore",
    description: "شاهد جميع مباريات كأس العالم الـ 104 بدقة 4K HDR مع تعليق عربي وإنجليزي بخصم 90%.",
    url: 'https://upstore.one/worldcup',
    siteName: 'UpStore',
    images: [{
      url: '/logo.png',
      width: 512,
      height: 512,
      alt: 'FIFA 26 World Cup Pass UpStore'
    }]
  },
  twitter: {
    card: 'summary_large_image',
    title: "FIFA 26 World Cup 4K Live Pass — UpStore",
    description: "Watch all 104 World Cup matches in 4K UHD with instant automated delivery.",
  }
};

export default function WorldCupPage() {
  return <WorldCupClient />;
}
