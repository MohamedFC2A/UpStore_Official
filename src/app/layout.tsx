import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Suspense } from 'react';
import { Plus_Jakarta_Sans, Cairo } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { LocaleProvider } from '@/context/LocaleContext';
import { HyperAdaptiveProvider } from '@/context/HyperAdaptiveContext';
import { AdaptiveInterventions } from '@/components/hyper-adaptive/AdaptiveInterventions';
import { HyperAdaptiveHUD } from '@/components/hyper-adaptive/HyperAdaptiveHUD';
import { LiveActivityPopups } from '@/components/LiveActivityPopups';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { AuthErrorWatcher } from '@/components/auth/AuthErrorWatcher';
import { ActiveArabOrderTracker } from '@/components/checkout/ActiveArabOrderTracker';
import { VisitorIntelligenceTracker } from '@/components/analytics/VisitorIntelligenceTracker';
import { StoreSleepOverlay } from '@/components/layout/StoreSleepOverlay';
import { getStoreMaintenanceStatus } from '@/utils/telegramSwitchBot';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#FFFDF9',
};

// ─── Fonts ────────────────────────────────────────────────────────────────────

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '600', '700', '800'],
});

const cairo = Cairo({
  variable: '--font-cairo',
  subsets: ['arabic', 'latin'],
  display: 'swap',
  weight: ['400', '600', '700', '800', '900'],
});

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  metadataBase: new URL('https://upstore.one'),
  applicationName: 'UpStore',
  authors: [
    { name: 'Matany Labs', url: 'https://www.tiktok.com/@matany_labs' },
    { name: 'UpStore Team', url: 'https://upstore.one' },
  ],
  generator: 'Next.js',
  creator: 'Matany Labs',
  publisher: 'UpStore',
  keywords: [
    // Brand & Main Domain
    'UpStore',
    'upstore.one',
    'UpStore Marketplace',
    'Matany Labs',
    'متجر اب ستور',
    'متجر upstore',
    'اب ستور ون',
    // High Volume English Keywords
    'digital marketplace',
    'buy digital accounts online',
    'cheap premium subscriptions',
    'buy netflix premium cheap',
    'spotify premium discount',
    'cheap chatgpt plus subscription',
    'claude pro subscription cheap',
    'gemini advanced subscription cheap',
    'buy steam keys cheap',
    'xbox game pass ultimate code',
    'playstation plus discount code',
    'nordvpn premium 1 year discount',
    'surfshark vpn cheap account',
    'youtube premium cheap account',
    'canva pro lifetime subscription',
    'discord nitro cheap code',
    'microsoft office 365 license key',
    'windows 11 pro retail key',
    'instant delivery digital accounts',
    'lowest price software licenses',
    'cheap vpn subscriptions',
    'instant key delivery marketplace',
    'buy ai accounts cheap',
    'zelenka automated marketplace',
    // High Volume Arabic Keywords
    'متجر رقمي',
    'متجر اشتراكات رقمية',
    'اشتراكات رخيصة',
    'اشتراكات نتفليكس رخيصة',
    'شراء نتفلكس 4k',
    'سبوتيفاي بريميوم رخيص',
    'حسابات شات جي بي تي بلس',
    'اشتراك كلاود برو رخيص',
    'اشتراك جيمناي ادفانسد',
    'مفاتيح ألعاب ستيم',
    'اشتراك يوتيوب بريميوم رخيص',
    'اشتراك vpn سنوي',
    'نورد في بي ان مخفض',
    'تفعيل كانفا برو',
    'دسكورد نيترو رخيص',
    'تفعيل مايكروسوفت اوفيس 365',
    'شراء سيريال ويندوز 11 برو',
    'اكواد العاب اكس بوكس',
    'بطاقات بلايستيشن بلس',
    'متجر العاب رقمية',
    'حسابات ذكاء اصطناعي',
    'دفع عالمي وضمان كامل المدة',
    'ارخص متجر اشتراكات في الوطن العربي',
    'شراء اشتراكات بالفيزا وفودافون كاش واست باي',
    'شراء حسابات بالكريبتو والبتكوين',
    'متجر شحن وتفعيل اشتراكات فوري'
  ],
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  verification: {
    google: 'zecg2tBYBT5K66e0KcxF6naFU9fGpNBj-FzRxaSEiMM',
    yandex: 'upstore-verification',
    other: {
      'msvalidate.01': 'D6FE9A2846A34F5C0485906A8C7F0450',
    },
  },
  other: {
    google: 'notranslate',
    'rating': 'general',
    'distribution': 'global',
    'revisit-after': '1 days',
    'geo.region': 'US, EG, SA, AE, GB, CA, AU',
    'geo.position': '30.0444;31.2357',
    'ICBM': '30.0444, 31.2357',
  },
  alternates: {
    canonical: 'https://upstore.one',
  },
  title: {
    default: "UpStore — World's Lowest-Priced Digital Marketplace | Cheap Premium Accounts & Subscriptions",
    template: "%s | UpStore Digital Marketplace"
  },
  description:
    "Buy premium accounts, Netflix 4K, Spotify Premium, NordVPN, ChatGPT Plus, game keys, and software licenses at the absolute lowest prices online. Instant automated delivery, 30-day warranty, and 24/7 priority support.",
  openGraph: {
    title: "UpStore — World's Lowest-Priced Digital Marketplace",
    description:
      "Get Netflix, Spotify Premium, ChatGPT Plus, NordVPN, and gaming keys at the lowest prices online. Instant automated delivery in seconds with 30-day full replacement warranty.",
    type: 'website',
    siteName: 'UpStore',
    locale: 'en_US',
    alternateLocale: ['ar_AR', 'ar_EG', 'ar_SA'],
    url: 'https://upstore.one',
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
    site: '@UpStore_one',
    creator: '@UpStore_one',
    images: ['/api/og']
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'ecommerce',
};

// ─── Comprehensive JSON-LD Structured Data ──────────────────────────────────

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': ['Organization', 'OnlineStore', 'Store'],
  '@id': 'https://upstore.one/#organization',
  name: 'UpStore',
  alternateName: [
    'UpStore.one',
    'UpStore Digital Marketplace',
    'متجر اب ستور',
    'متجر أب ستور',
    'متجر اب ستور ون',
    'اب ستور',
  ],
  legalName: 'UpStore Digital Marketplace',
  url: 'https://upstore.one',
  logo: 'https://upstore.one/logo.png',
  image: 'https://upstore.one/api/og',
  description:
    "The world's lowest-priced official digital marketplace for premium subscription accounts (Netflix, Spotify, ChatGPT Plus, NordVPN), software licenses, and gaming keys with instant delivery.",
  disambiguatingDescription:
    "UpStore (upstore.one) is an official online digital marketplace for subscriptions and licenses, completely distinct from any file-hosting or cloud storage platforms.",
  knowsAbout: [
    'Digital Subscriptions',
    'Streaming Accounts',
    'AI Subscriptions',
    'Software Licenses',
    'Gaming Keys',
    'E-commerce',
  ],
  priceRange: '$',
  currenciesAccepted: 'USD, EUR, EGP, SAR, AED, BTC, USDT, LTC',
  paymentAccepted: 'Credit Card, Debit Card, Stripe, Bitcoin, Crypto, Binance Pay, Vodafone Cash, InstaPay',
  sameAs: [
    'https://t.me/UpStore_Support_bot',
    'https://www.tiktok.com/@matany_labs',
  ],
  areaServed: 'Global',
  hasMerchantReturnPolicy: {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'US',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnPeriod',
    merchantReturnDays: 30,
    returnMethod: 'https://schema.org/ReturnByMail',
    returnFees: 'https://schema.org/FreeReturn',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '2840',
    bestRating: '5',
    worstRating: '1',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'Customer Support',
    url: 'https://t.me/UpStore_Support_bot',
    availableLanguage: ['English', 'Arabic'],
  },
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': 'https://upstore.one/#website',
  name: 'UpStore',
  alternateName: ['UpStore.one', 'متجر اب ستور'],
  url: 'https://upstore.one',
  publisher: {
    '@id': 'https://upstore.one/#organization',
  },
  inLanguage: ['en', 'ar'],
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://upstore.one/?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
};

const breadcrumbsJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://upstore.one',
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Streaming Subscriptions',
      item: 'https://upstore.one/?category=STREAMING',
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'AI & Productivity',
      item: 'https://upstore.one/?category=AI',
    },
    {
      '@type': 'ListItem',
      position: 4,
      name: 'Security & VPN',
      item: 'https://upstore.one/?category=VPN',
    },
    {
      '@type': 'ListItem',
      position: 5,
      name: 'Gaming Keys & Pass',
      item: 'https://upstore.one/?category=GAMING',
    },
  ],
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How fast is product delivery on UpStore?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'All product deliveries on UpStore are 100% automated and instant. As soon as payment is confirmed, your activation credentials or key will appear directly on your screen, in your dashboard, and will be sent to your email within seconds.'
      }
    },
    {
      '@type': 'Question',
      name: 'Is there a warranty on purchased accounts and keys?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes! Every purchase comes with a full 30-day replacement warranty. If you experience any issue, our automated system or 24/7 support will instantly replace your account or refund your wallet.'
      }
    },
    {
      '@type': 'Question',
      name: 'What payment methods are supported?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'We accept global Credit/Debit Cards via Stripe, Cryptocurrency (Bitcoin, USDT, Binance Pay, BTCPay), as well as local Egyptian payment options including Vodafone Cash and InstaPay.'
      }
    },
    {
      '@type': 'Question',
      name: 'Why are prices on UpStore up to 90% cheaper than retail?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'UpStore leverages high-volume wholesale contracts, global regional pricing differences, and automated low-overhead infrastructure to deliver the lowest legitimate prices worldwide.'
      }
    },
    {
      '@type': 'Question',
      name: 'كم يستغرق استلام الحساب أو الكود بعد الدفع؟',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'نوفر دفعاً عالمياً ومحلياً معتمداً مع ضمان شامل كامل المدة. بمجرد مراجعة وتأكيد الدفع، تظهر بيانات الحساب أو المفتاح مباشرة في شاشة الطلب ولوحة التحكم وبريدك الإلكتروني.'
      }
    },
    {
      '@type': 'Question',
      name: 'هل يوجد ضمان على المنتجات والحسابات في UpStore؟',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'نعم، نوفر ضمان استبدال شامل لمدة 30 يوماً على جميع الاشتراكات والحسابات مع دعم فني متواصل 24/7 لضمان استقرار حسابك طوال فترة الاشتراك.'
      }
    }
  ]
};

// ─── Root Layout ──────────────────────────────────────────────────────────────

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let initialIsMaintenance = false;
  try {
    const statusPromise = getStoreMaintenanceStatus();
    const timeoutPromise = new Promise<{ isMaintenance: boolean }>((resolve) =>
      setTimeout(() => resolve({ isMaintenance: false }), 400)
    );
    const status = await Promise.race([statusPromise, timeoutPromise]);
    initialIsMaintenance = Boolean(status.isMaintenance);
  } catch (err) {
    initialIsMaintenance = false;
  }
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${cairo.variable}`}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <head suppressHydrationWarning>
        {/* Prevent Browser Extension Errors & Hydration Mismatches */}
        <script
          id="anti-extension-shield"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  if (typeof window === 'undefined') return;
                  // 1. Safe Fallback for E-commerce Assistant Extensions
                  try {
                    if (typeof window.M_ID === 'undefined') {
                      window.M_ID = '';
                    }
                  } catch (e) {}

                  // 2. Suppress Uncaught Synchronous Errors Thrown by Third-Party Browser Extensions
                  window.addEventListener('error', function(event) {
                    var filename = (event && event.filename) || '';
                    var msg = (event && event.message) || '';
                    if (
                      filename.indexOf('chrome-extension://') !== -1 ||
                      filename.indexOf('moz-extension://') !== -1 ||
                      filename.indexOf('safari-extension://') !== -1 ||
                      filename.indexOf('200.js') !== -1 ||
                      msg.indexOf('M_ID') !== -1 ||
                      msg.indexOf('bis_') !== -1
                    ) {
                      event.stopImmediatePropagation();
                      event.preventDefault();
                      return true;
                    }
                  }, true);

                  // 3. Suppress Uncaught Asynchronous Promise Rejections from Third-Party Browser Extensions
                  window.addEventListener('unhandledrejection', function(event) {
                    var reason = (event && event.reason) || '';
                    var reasonStr = typeof reason === 'string' ? reason : (reason && reason.message) ? reason.message : (reason && reason.stack) ? reason.stack : '';
                    if (
                      reasonStr.indexOf('M_ID') !== -1 ||
                      reasonStr.indexOf('200.js') !== -1 ||
                      reasonStr.indexOf('chrome-extension://') !== -1 ||
                      reasonStr.indexOf('moz-extension://') !== -1 ||
                      reasonStr.indexOf('safari-extension://') !== -1 ||
                      reasonStr.indexOf('bis_') !== -1
                    ) {
                      event.stopImmediatePropagation();
                      event.preventDefault();
                      return true;
                    }
                  }, true);
                } catch (e) {}
              })();
            `,
          }}
        />
        {/* Organization Structured Data */}
        <script
          id="schema-organization"
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        {/* WebSite Search Structured Data */}
        <script
          id="schema-website"
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        {/* Breadcrumbs Structured Data */}
        <script
          id="schema-breadcrumbs"
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
        />
        {/* FAQ Structured Data for Google Rich Snippets */}
        <script
          id="schema-faq"
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-screen flex flex-col bg-[#FFFDF9] text-black font-sans antialiased selection:bg-[#FFE600] selection:text-black"
      >
        <LocaleProvider>
          <HyperAdaptiveProvider>
            <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" />

            {/* Store Sleep & Maintenance Screen */}
            <StoreSleepOverlay initialIsMaintenance={initialIsMaintenance} />

            {/* Top navigation */}
            <Suspense fallback={<div className="h-16 bg-[#FFFDF9] w-full border-b-2 border-black" />}>
              <Navbar />
            </Suspense>

            {/* Page content with mobile bottom nav safe clearance */}
            <main className="flex-1 flex flex-col bg-[#FFFDF9] text-black min-h-0 pb-20 sm:pb-0" suppressHydrationWarning>
              {children}
            </main>

            {/* Live activity popups */}
            <LiveActivityPopups />

            {/* Hyper-Adaptive Real-time Interventions & Floating Status HUD */}
            <AdaptiveInterventions />
            {/* <HyperAdaptiveHUD /> */}

            {/* Toast alerts */}
            <ToastContainer />

            {/* Persistent Active Arab Support Order Tracker & Modal */}
            <ActiveArabOrderTracker />

            {/* Smart Auth Error Watcher & Cookie Cleaner */}
            <Suspense fallback={null}>
              <AuthErrorWatcher />
            </Suspense>

            {/* Instant Real-Time Visitor Intelligence Sensor (@Logztbot) */}
            <Suspense fallback={null}>
              <VisitorIntelligenceTracker />
            </Suspense>

            {/* Footer */}
            <Footer />
          </HyperAdaptiveProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
