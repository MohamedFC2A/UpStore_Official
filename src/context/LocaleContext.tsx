'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'ar' | 'en';
export type Country = 'EG' | 'SA' | 'US';

interface LocaleContextProps {
  language: Language;
  country: Country;
  setLanguage: (lang: Language) => void;
  setCountry: (country: Country) => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
  formatPrice: (usdPrice: number) => string;
  mounted: boolean;
  reviews: Array<{ name: string; text: string; rating: number }>;
  translateProduct: (slug: string, defaultName: string, localizedName?: string) => { name: string; duration: string | null };
}

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    // Navbar
    searchPlaceholder: "Search subscriptions, tools, games, AI...",
    account: "My Account",
    dashboard: "Dashboard",
    login: "Login",
    register: "Create Account",
    cartItems: "Cart ({count})",
    notifications: "Notifications",
    toggleMenu: "Toggle Navigation",
    
    // Bottom Nav
    home: "Home",
    search: "Search",
    cart: "Cart",
    
    // Hero
    flashSaleActive: "256-Bit SSL Protected • Global Pay & Full-Term Warranty",
    payLess: "True Wholesale Prices.",
    getMore: "Global Pay & Full Warranty.",
    heroSubheadline: "The world's lowest-priced & most trusted digital marketplace. Enjoy global secure checkout on official subscriptions, gaming keys, and software with full-term replacement warranty.",
    dealsExpiring: "Live Flash Deals Expiring in:",
    hours: "Hours",
    mins: "Mins",
    secs: "Secs",
    browseDeals: "Explore Hot Deals",
    joinReferralBtn: "Refer Friends & Earn Cash Vaults",
    statOrders: "50K+ Completed Orders",
    statRating: "4.9 / 5 Customer Rating",
    statSupport: "24/7 VIP Client Support",
    
    // Deals Section
    liveDeals: "Live Flash Deals",
    limitedStock: "Limited Stock",
    seeAllDeals: "View All Hot Deals",
    savePct: "SAVE {pct}%",
    lowestPrice: "Lowest Price Guaranteed",
    customerSat: "Customer Satisfaction",
    addToCart: "Add to Cart",
    buyNow: "Instant Buy",
    
    // Referral
    earn: "Earn",
    referralBody: "Invite friends to join UpStore and unlock progressive cash vaults directly into your wallet!",
    startReferring: "Unlock Rewards Now",
    
    // Grid Section
    allProducts: "All Digital Products",
    sortBy: "Sort By:",
    newestFirst: "Newest First",
    priceLowHigh: "Price: Low to High",
    priceHighToLow: "Price: High to Low",
    bestRated: "Highest Rated",
    mostPopular: "Most Popular",
    
    // Trust Section
    whyShop: "Why Shoppers Trust UpStore",
    trust1Title: "256-Bit Bank Encryption",
    trust1Desc: "Military-grade SSL/TLS encryption securing all transactions & credentials",
    trust2Title: "Instant Automated Delivery",
    trust2Desc: "Digital credentials delivered to your dashboard & inbox within 0-30 seconds",
    trust3Title: "100% Replacement Warranty",
    trust3Desc: "Hassle-free 30-day warranty with instant replacement or full credit",
    trust4Title: "100% Official & Verified",
    trust4Desc: "Genuine subscriptions and game keys with zero downtime or ban risks",
    trust5Title: "Certified Global Payments",
    trust5Desc: "Safe checkout via Visa, MasterCard, Apple Pay, InstaPay & Crypto",
    
    // Footer
    footerDesc: "The World's Lowest-Priced Digital Marketplace. Official subscriptions, game keys, and accounts delivered instantly with a 100% gold warranty.",
    customers: "Customers",
    products: "Products",
    newsletterTitle: "Unlock Secret VIP Drops",
    newsletterPlaceholder: "Enter your email address...",
    newsletterJoin: "Join VIP Club",
    connectUs: "Direct Channels:",
    weAccept: "Accepted Payment Gateways:",
    privacyPolicy: "Privacy Policy",
    termsAndConditions: "Terms & Conditions",
    cookiePolicy: "Cookie Policy",
    gdprCompliance: "GDPR Compliance",
    sitemap: "Sitemap",
    safe100: "100% Secure & Encrypted",
    copyright: "© {year} UpStore Digital Marketplace. All rights reserved.",
    
    // Categories
    cat_Subscriptions: "Subscriptions",
    cat_VPNs: "VPN & Security",
    cat_Software: "Software & OS",
    cat_Accounts: "AI & Accounts",
    cat_GameKeys: "Game Keys",
    noProductsFound: "No products matched your search. Adjust your filter or explore our top categories.",
  },
  ar: {
    // Navbar
    searchPlaceholder: "ابحث عن الاشتراكات، البرامج، الألعاب، الذكاء الاصطناعي...",
    account: "حسابي الشخصي",
    dashboard: "لوحة التحكم",
    login: "تسجيل الدخول",
    register: "إنشاء حساب جديد",
    cartItems: "السلة ({count})",
    notifications: "الإشعارات والتنبيهات",
    toggleMenu: "القائمة الرئيسية",
    
    // Bottom Nav
    home: "الرئيسية",
    search: "بحث فوري",
    cart: "سلة المشتريات",
    
    // Hero
    flashSaleActive: "تشفير بنكي 256-Bit • دفع عالمي وضمان كامل المدة",
    payLess: "أرخص الأسعار العالمية.",
    getMore: "دفع عالمي وضمان شامل.",
    heroSubheadline: "المتجر الرقمي الأرخص سعراً والأعلى موثوقية في العالم. امتلك أفضل الاشتراكات والبرامج ومفاتيح الألعاب الأصلية مع دفع عالمي معتمد وضمان شامل كامل المدة.",
    dealsExpiring: "عروض الفلاش تنتهي خلال:",
    hours: "ساعات",
    mins: "دقائق",
    secs: "ثواني",
    browseDeals: "استكشف عروض اليوم",
    joinReferralBtn: "برنامج الأرباح والمكافآت التراكمية",
    statOrders: "+50 ألف طلب مكتمل بنجاح",
    statRating: "تقييم 4.9 من 5 من العملاء",
    statSupport: "دعم فني متواصل 24/7",
    
    // Deals Section
    liveDeals: "صيد اليوم (عروض فلاش)",
    limitedStock: "كمية محدودة جداً",
    seeAllDeals: "عرض جميع التخفيضات",
    savePct: "وفر {pct}%",
    lowStock: "مخزون وشيك النفاد",
    lowestPrice: "أقل سعر مضمون",
    customerSat: "رضا العملاء 100%",
    addToCart: "أضف إلى السلة",
    buyNow: "شراء فوري",
    
    // Referral
    earn: "اربح كاش",
    referralBody: "ادعُ أصدقاءك للانضمام إلى UpStore وافتح خزائن المكافآت التراكمية كاش في محفظتك فوراً!",
    startReferring: "ابدأ جني الأرباح الآن",
    
    // Grid Section
    allProducts: "جميع المنتجات والاشتراكات الرقمية",
    sortBy: "ترتيب حسب:",
    newestFirst: "الأحدث وصولاً",
    priceLowHigh: "السعر: من الأقل للأعلى",
    priceHighToLow: "السعر: من الأعلى للأقل",
    bestRated: "الأعلى تقييماً",
    mostPopular: "الأكثر طلباً وشعبية",
    
    // Trust Section
    whyShop: "لماذا يثق آلاف العملاء بمتجر UpStore",
    trust1Title: "تشفير بنكي مشدد 256-Bit",
    trust1Desc: "جميع المعاملات والبيانات محمية بأعلى بروتوكولات الأمان المالي العالمي SSL/TLS",
    trust2Title: "تسليم رقمي فوري مشفر (0-30 ثانية)",
    trust2Desc: "تصلك بيانات الحساب أو كود التفعيل في لوحة تحكمك وبريدك فور إتمام الدفع آلياً",
    trust3Title: "الضمان الذهبي للاستبدال والاسترداد",
    trust3Desc: "ضمان استبدال فوري شامل لمدة 30 يوماً مع دعم فني مخصص لحل أي استفسار",
    trust4Title: "تراخيص وحسابات رسمية 100%",
    trust4Desc: "حسابات مستقرة ومفاتيح أصلية تماماً تعمل بكفاءة تامة بدون أي حظر أو انقطاع",
    trust5Title: "بوابات دفع آمنة ومعتمدة",
    trust5Desc: "ادفع بأمان عبر فيزا، ماستركارد، أبل باي، إنستاباي، فودافون كاش، والعملات المشفرة",
    
    // Footer
    footerDesc: "المتجر الرقمي الأرخص سعراً والأعلى موثوقية في العالم. اشتراكات مميزة، مفاتيح ألعاب، وتراخيص برامج تسلم فورياً مع ضمان ذهبي كامل.",
    customers: "عميل نشط",
    products: "منتج متوفر",
    newsletterTitle: "انضم لنادي عروض VIP السرية",
    newsletterPlaceholder: "أدخل بريدك الإلكتروني...",
    newsletterJoin: "اشتراك VIP",
    connectUs: "قنوات التواصل المباشر:",
    weAccept: "بوابات الدفع المعتمدة:",
    privacyPolicy: "سياسة الخصوصية والأمان",
    termsAndConditions: "الشروط والأحكام",
    cookiePolicy: "سياسة ملفات الارتباط",
    gdprCompliance: "الامتثال لمعايير GDPR",
    sitemap: "خريطة الموقع",
    safe100: "100% مشفر ومحمي بنكياً",
    copyright: "© {year} متجر UpStore الرقمي. جميع الحقوق محفوظة.",
    
    // Categories
    cat_Subscriptions: "الاشتراكات المميزة",
    cat_VPNs: "شبكات VPN والأمان",
    cat_Software: "البرامج وأنظمة التشغيل",
    cat_Accounts: "الذكاء الاصطناعي والحسابات",
    cat_GameKeys: "مفاتيح وكروت الألعاب",
    noProductsFound: "لم يتم العثور على منتجات مطابقة لبحثك. جرب تعديل كلمات البحث أو اختر قسماً آخر.",
  }
};

const REVIEWS_TRANSLATIONS: Record<Language, Array<{ name: string; text: string; rating: number }>> = {
  en: [
    { name: 'Mohammed_AlOtaibi', text: 'Received account within 2 mins, Netflix 4K is working smoothly without buffering.', rating: 5 },
    { name: 'Sarah_Mansour', text: 'ChatGPT Plus working fine and Telegram support helped right away. 10/10.', rating: 5 },
    { name: 'Karim_Shennawy', text: 'Paid smoothly and got credentials in seconds. Thanks guys.', rating: 5 },
    { name: 'David_R', text: 'Xbox code activated right away on my Microsoft account. Saved a lot!', rating: 5 },
    { name: 'Omar_H', text: 'Spotify Premium renewed on my email without any issues.', rating: 5 },
    { name: 'Youssef_K', text: 'Fast delivery, credentials showed up in dashboard immediately.', rating: 5 },
    { name: 'Nour_E', text: 'NordVPN works great on PC and phone, very reasonable price.', rating: 5 },
    { name: 'Chloe_S', text: 'Legit and cheap. Working completely fine.', rating: 5 },
  ],
  ar: [
    { name: 'سلطان العتيبي', text: 'استلمت الحساب في دقيقتين ونتفليكس شغال كويس وبدون تقطيع', rating: 5 },
    { name: 'سارة المنصور', text: 'شات جي بي تي شغال تمام والدعم تليجرام ساعدني علطول', rating: 5 },
    { name: 'كريم الشناوي', text: 'دفعت فودافون كاش ووصلني الحساب في ثواني، شكرا ليكم', rating: 5 },
    { name: 'يوسف بن خالد', text: 'كود اكس بوكس اشتغل على حسابي وفرت كتير الصراحه', rating: 5 },
    { name: 'عمر حسام', text: 'سبوتيفاي اتفعل على ايميلي بدون مشاكل', rating: 5 },
    { name: 'أحمد الكردي', text: 'تسليم سريع والبيانات ظهرت ف لوحة التحكم علطول', rating: 5 },
    { name: 'نور الإمام', text: 'نورد في بي ان شغال تمام ع اللابتوب والموبايل وسعر ممتاز', rating: 5 },
    { name: 'سلطان الدوسري', text: 'شغال زي الفل وسعر ممتاز', rating: 5 },
  ]
};

const PRODUCT_TRANSLATIONS: Record<Language, Record<string, { name: string; duration: string }>> = {
  en: {
    'gemini-advanced-18-months': { name: 'Gemini 3.7 Flash & Antigravity Suite', duration: '18 Months' },
    'gemini-pro-18-months': { name: 'Gemini 3.7 Flash & Antigravity Suite', duration: '18 Months' },
    'gemini-pro-12-months': { name: 'Gemini Advanced Pro', duration: '12 Months' },
    'canva-pro-1-year': { name: 'Canva Pro — 1 Year', duration: '1 Year' },
    'canva-pro-lifetime': { name: 'Canva Pro — Lifetime VIP', duration: 'Lifetime' },
    'chatgpt-plus-1-month': { name: 'ChatGPT Plus — 1 Month', duration: '1 Month' },
    'chatgpt-pro-1-month': { name: 'ChatGPT Pro — 1 Month Ultra', duration: '1 Month' },
    'capcut-pro-1-month': { name: 'CapCut Pro — 1 Month Personal', duration: '1 Month' },
    'capcut-pro-1-year': { name: 'CapCut Pro — 1 Year', duration: '1 Year' },
    'cursor-pro-1-month': { name: 'Cursor AI Pro — 1 Month', duration: '1 Month' },
    'cursor-pro-1-year': { name: 'Cursor AI Pro — 1 Year', duration: '1 Year' },
  },
  ar: {
    'gemini-advanced-18-months': { name: 'جوجل جيمناي 3.7 فلاش & أنتي جرافيتي', duration: '18 شهراً' },
    'gemini-pro-18-months': { name: 'جوجل جيمناي 3.7 فلاش & أنتي جرافيتي', duration: '18 شهراً' },
    'gemini-pro-12-months': { name: 'جيميني أدفانسد برو', duration: '12 شهراً' },
    'canva-pro-1-year': { name: 'كانفا برو — سنة كاملة', duration: 'سنة واحدة' },
    'canva-pro-lifetime': { name: 'كانفا برو — مدى الحياة دائم', duration: 'مدى الحياة' },
    'chatgpt-plus-1-month': { name: 'شات جي بي تي بلس — شهر كامل', duration: '1 شهر' },
    'chatgpt-pro-1-month': { name: 'شات جي بي تي برو — شهر فئة Pro', duration: '1 شهر' },
    'capcut-pro-1-month': { name: 'كاب كات برو — شهر إيميل خاص', duration: '1 شهر' },
    'capcut-pro-1-year': { name: 'كاب كات برو — سنة كاملة', duration: 'سنة واحدة' },
    'cursor-pro-1-month': { name: 'كورسور برو — شهر كامل للمطورين', duration: '1 شهر' },
    'cursor-pro-1-year': { name: 'كورسور برو — سنة كاملة للمطورين', duration: 'سنة واحدة' },
  }
};

const LocaleContext = createContext<LocaleContextProps | undefined>(undefined);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [country, setCountryState] = useState<Country>('US');
  const [mounted, setMounted] = useState(false);

  // Set Language and store in localStorage
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('upstore_lang', lang);
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
  };

  // Set Country and store in localStorage & cookies
  const setCountry = (c: Country) => {
    setCountryState(c);
    if (typeof window !== 'undefined') {
      localStorage.setItem('upstore_country', c);
      localStorage.setItem('upstore_country_manual', 'true');
      document.cookie = `upstore_country=${c};path=/;max-age=31536000;SameSite=Lax`;
    }
  };

  // Geolocation and locale detection on mount
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      // 1. Detect language
      const savedLang = localStorage.getItem('upstore_lang') as Language | null;
      if (savedLang && (savedLang === 'ar' || savedLang === 'en')) {
        setLanguage(savedLang);
      } else {
        const browserLang = navigator.language || '';
        const detectedLang: Language = browserLang.toLowerCase().includes('ar') ? 'ar' : 'en';
        setLanguage(detectedLang);
      }

      // 2. Detect country (respect manual user choice permanently)
      const savedCountry = localStorage.getItem('upstore_country') as Country | null;
      const isManual = localStorage.getItem('upstore_country_manual') === 'true';

      if (savedCountry && (savedCountry === 'EG' || savedCountry === 'SA' || savedCountry === 'US')) {
        setCountryState(savedCountry);
        return;
      }

      const isBot = typeof navigator !== 'undefined' && /bot|googlebot|bingbot|crawler|spider|robot|crawling/i.test(navigator.userAgent || '');
      if (isBot) {
        setCountryState('US');
        return;
      }

      // Fetch geolocation with 3s timeout only if user has never manually chosen a country
      if (!isManual) {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = setTimeout(() => controller?.abort(), 3000);

        fetch('https://ipapi.co/json/', { signal: controller?.signal })
          .then((res) => {
            clearTimeout(timeoutId);
            if (res.ok) return res.json();
            throw new Error('Failed to fetch geoip');
          })
          .then((data) => {
            const code = data.country_code;
            if (code === 'EG') {
              setCountryState('EG');
              localStorage.setItem('upstore_country', 'EG');
            } else if (code === 'SA') {
              setCountryState('SA');
              localStorage.setItem('upstore_country', 'SA');
            } else {
              setCountryState('US');
              localStorage.setItem('upstore_country', 'US');
            }
          })
          .catch(() => {
            clearTimeout(timeoutId);
            setCountryState('US');
          });
      }
    }
  }, []);

  // Sync dir attribute on language change (client-side safety check)
  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = language;
    }
  }, [language, mounted]);

  // Translation function helper
  const t = (key: string, variables?: Record<string, string | number>): string => {
    const dict = TRANSLATIONS[language];
    let template = dict[key] || TRANSLATIONS['en'][key] || key;
    
    if (variables) {
      Object.entries(variables).forEach(([k, v]) => {
        template = template.replace(`{${k}}`, String(v));
      });
    }
    return template;
  };

  // Dynamic price formatting helper based on country and language
  const formatPrice = (usdPrice: number): string => {
    const raw = Number(usdPrice);
    const safeUsd = Number.isFinite(raw) ? Math.max(0, raw) : 0;
    let rate = 1;
    let format = 'US';
    
    if (country === 'EG') {
      rate = 53;
      format = 'EG';
    } else if (country === 'SA') {
      rate = 4;
      format = 'SA';
    }
    
    const converted = safeUsd * rate;
    
    if (format === 'EG') {
      const rounded = Math.ceil(converted);
      return language === 'ar' ? `${rounded} ج.م` : `EGP ${rounded}`;
    } else if (format === 'SA') {
      const rounded = Math.ceil(converted);
      return language === 'ar' ? `${rounded} ر.س` : `SAR ${rounded}`;
    } else {
      const formattedUsd = (Math.ceil(safeUsd * 100) / 100).toFixed(2);
      return `$${formattedUsd}`;
    }
  };

  // Dynamic product parser helper
  const translateProduct = (slug: string, defaultName: string, localizedName?: string): { name: string; duration: string | null } => {
    const localized = PRODUCT_TRANSLATIONS[language]?.[slug];
    if (localized) {
      return { 
        name: (language === 'ar' && localizedName) ? localizedName : localized.name, 
        duration: localized.duration 
      };
    }
    if (language === 'ar' && localizedName) {
      const match = localizedName.match(/(\d+)\s*(?:شهر|شهراً|اشهر|أشهر|سنة|سنوات|عام|يوم|ايام|أيام)/i);
      return { name: localizedName, duration: match ? match[0] : null };
    }
    // Fallback if not mapped
    const regex = /\s*[-–—]\s*(\d+\s*(?:Month|Months|Year|Years|Day|Days))\s*$/i;
    const match = defaultName.match(regex);
    if (match) {
      const baseName = defaultName.replace(regex, '');
      const duration = match[1];
      return { name: baseName, duration };
    }
    return { name: defaultName, duration: null };
  };

  const reviews = REVIEWS_TRANSLATIONS[language];

  return (
    <LocaleContext.Provider value={{
      language,
      country,
      setLanguage,
      setCountry,
      t,
      formatPrice,
      mounted,
      reviews,
      translateProduct
    }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
