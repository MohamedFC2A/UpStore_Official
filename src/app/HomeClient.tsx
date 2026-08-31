'use client';

/**
 * HomeClient.tsx — UpStore Official Digital Marketplace
 * Premium E-Commerce Storefront with High-Converting UX & Mobile-First Architecture.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Film, 
  PlayCircle, 
  Music, 
  Lock, 
  Laptop, 
  Bot, 
  Gamepad2, 
  Palette, 
  Code, 
  Gift, 
  Zap, 
  ShoppingBag, 
  Sparkles, 
  ArrowRight, 
  ChevronDown, 
  Search, 
  X 
} from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { ProductCard } from '@/components/ProductCard';
import { FlashDealsCorner } from '@/components/FlashDealsCorner';
import { ModernMarketplaceHero } from '@/components/ui/ModernMarketplaceHero';
import { createClient } from '@/utils/supabase/client';
import {
  DEFAULT_PRODUCT_BRAND_COLOR,
  fetchLiveProducts,
  MASTER_UPSTORE_CATALOG,
} from '@/utils/products';
import { searchProducts } from '@/utils/searchEngine';
import { useHyperAdaptiveStore } from '@/store/useHyperAdaptiveStore';
import { PaymentPartnersRow } from '@/components/ui/PaymentPartnersRow';

const HomeReviewsSection = dynamic(
  () => import('@/components/HomeReviewsSection').then((mod) => mod.HomeReviewsSection),
  { ssr: false }
);

const ProductQuickViewModal = dynamic(
  () => import('@/components/ui/ProductQuickViewModal').then((mod) => mod.ProductQuickViewModal),
  { ssr: false }
);
// ─── Types & Mock Data ────────────────────────────────────────────────────────

interface Product {
  id: string | number;
  slug: string;
  name: string;
  Icon?: any;
  icon_name?: string;
  category: string;
  marketPrice?: number;
  market_price?: number;
  ourPrice?: number;
  our_price?: number;
  price_egp?: number;
  priceEgp?: number;
  price_sar?: number;
  priceSar?: number;
  rating: number;
  reviews: number;
  stock: number;
  maxStock?: number;
  max_stock?: number;
  brandColor?: string;
  brand_color?: string;
  image_url?: string;
  subscription_duration?: string;
  description?: string;
  description_ar?: string;
  name_ar?: string;
}

const ICON_MAP: Record<string, any> = {
  netflix: Film,
  youtube: PlayCircle,
  spotify: Music,
  vpn: Lock,
  microsoft: Laptop,
  gemini: Sparkles,
  chatgpt: Bot,
  xbox: Gamepad2,
  canva: Palette,
  capcut: Film,
  cursor: Code,
  film: Film,
  bot: Bot,
  worldcup: PlayCircle,
  Tv: Film,
  Bot: Bot,
  ShieldCheck: Lock,
  Gamepad2: Gamepad2,
  Palette: Palette,
  Laptop: Laptop,
  Sparkles: Sparkles,
};

const PRODUCTS: Product[] = [
  { 
    id: '643361f7-7475-48ee-af69-20bf655da73a', 
    slug: 'gemini-advanced-18-months', 
    name: 'Google Gemini Advanced & Antigravity Suite - 18 Months (Gemini 3.7 Flash)', 
    name_ar: 'جوجل جيمناي أدفانسد & أنتي جرافيتي - اشتراك 18 شهر (Gemini 3.7 Flash)', 
    Icon: Sparkles, 
    image_url: '/images/products/gemini-advanced.png',
    category: 'Accounts', 
    marketPrice: 18.99, 
    ourPrice: 5.64, 
    price_egp: 299.00, 
    price_sar: 23.00, 
    rating: 4.85, 
    reviews: 28, 
    stock: 45, 
    maxStock: 80, 
    brandColor: 'hover:border-[#9D4EDF]/40' 
  },
  {
    id: 'a1b2c3d4-1111-4444-8888-canvapro1year',
    slug: 'canva-pro-1-year',
    name: 'Canva Pro — 1 Year Full Access',
    name_ar: 'اشتراك كانفا برو - سنة كاملة (Canva Pro 1 Year)',
    Icon: Palette,
    image_url: '/images/products/canva-pro.png',
    category: 'Subscriptions',
    marketPrice: 54.99,
    ourPrice: 4.99,
    price_egp: 265.00,
    price_sar: 19.00,
    rating: 4.88,
    reviews: 36,
    stock: 50,
    maxStock: 80,
    brandColor: 'hover:border-[#00C4CC]/40'
  },
  {
    id: 'a1b2c3d4-2222-4444-8888-canvaprolifetime',
    slug: 'canva-pro-lifetime',
    name: 'Canva Pro — Lifetime Access VIP',
    name_ar: 'اشتراك كانفا برو - مدى الحياة دائم (Canva Pro Lifetime)',
    Icon: Palette,
    image_url: '/images/products/canva-pro.png',
    category: 'Subscriptions',
    marketPrice: 119.99,
    ourPrice: 8.99,
    price_egp: 475.00,
    price_sar: 35.00,
    rating: 4.87,
    reviews: 26,
    stock: 30,
    maxStock: 50,
    brandColor: 'hover:border-[#00C4CC]/40'
  },
  {
    id: 'b2c3d4e5-1111-4444-8888-chatgptplus1m',
    slug: 'chatgpt-plus-1-month',
    name: 'ChatGPT Plus — 1 Month Private Access (GPT-4o & o1)',
    name_ar: 'اشتراك شات جي بي تي بلس - شهر كامل (ChatGPT Plus)',
    Icon: Bot,
    image_url: '/images/products/chatgpt-plus.png',
    category: 'Accounts',
    marketPrice: 20.00,
    ourPrice: 4.49,
    price_egp: 239.00,
    price_sar: 17.50,
    rating: 4.89,
    reviews: 42,
    stock: 55,
    maxStock: 90,
    brandColor: 'hover:border-[#10A37F]/40'
  },
  {
    id: 'b2c3d4e5-2222-4444-8888-chatgptpro1m',
    slug: 'chatgpt-pro-1-month',
    name: 'ChatGPT Pro — 1 Month Ultra Access (o1 Pro Mode & Unlimited GPT-4o)',
    name_ar: 'اشتراك شات جي بي تي برو - شهر كامل فئة Pro الخارقة (ChatGPT Pro)',
    Icon: Bot,
    image_url: '/images/products/chatgpt-pro.png',
    category: 'Accounts',
    marketPrice: 200.00,
    ourPrice: 24.99,
    price_egp: 1325.00,
    price_sar: 95.00,
    rating: 4.92,
    reviews: 18,
    stock: 15,
    maxStock: 25,
    brandColor: 'hover:border-[#818CF8]/40'
  },
  {
    id: 'c3d4e5f6-1111-4444-8888-capcutpro1m',
    slug: 'capcut-pro-1-month',
    name: 'CapCut Pro — 1 Month Personal Account',
    name_ar: 'اشتراك كاب كات برو - شهر على إيميلك الشخصي (CapCut Pro 1 Month)',
    Icon: Film,
    image_url: '/images/products/capcut-pro.png',
    category: 'Subscriptions',
    marketPrice: 19.99,
    ourPrice: 4.49,
    price_egp: 239.00,
    price_sar: 17.50,
    rating: 4.84,
    reviews: 32,
    stock: 40,
    maxStock: 65,
    brandColor: 'hover:border-[#00F0FF]/40'
  },
  {
    id: 'c3d4e5f6-2222-4444-8888-capcutpro1year',
    slug: 'capcut-pro-1-year',
    name: 'CapCut Pro — 1 Year Full Gold Warranty',
    name_ar: 'اشتراك كاب كات برو - سنة كاملة بضمان شامل (CapCut Pro 1 Year)',
    Icon: Film,
    image_url: '/images/products/capcut-pro.png',
    category: 'Subscriptions',
    marketPrice: 119.99,
    ourPrice: 29.99,
    price_egp: 1590.00,
    price_sar: 115.00,
    rating: 4.86,
    reviews: 21,
    stock: 22,
    maxStock: 40,
    brandColor: 'hover:border-[#00F0FF]/40'
  },
  {
    id: 'd4e5f6a7-1111-4444-8888-cursorpro1m',
    slug: 'cursor-pro-1-month',
    name: 'Cursor AI Pro — 1 Month Developer Suite (Claude 3.7 & GPT-4o)',
    name_ar: 'اشتراك كورسور الذكي للمبرمجين - شهر كامل (Cursor AI Pro 1 Month)',
    Icon: Code,
    image_url: '/images/products/cursor-pro.png',
    category: 'Accounts',
    marketPrice: 40.00,
    ourPrice: 16.99,
    price_egp: 899.00,
    price_sar: 65.00,
    rating: 4.88,
    reviews: 25,
    stock: 28,
    maxStock: 50,
    brandColor: 'hover:border-[#6366F1]/40'
  },
  {
    id: 'd4e5f6a7-2222-4444-8888-cursorpro1year',
    slug: 'cursor-pro-1-year',
    name: 'Cursor AI Pro — 1 Year Full Developer Access',
    name_ar: 'اشتراك كورسور برو للمبرمجين - سنة كاملة (Cursor AI Pro 1 Year)',
    Icon: Code,
    image_url: '/images/products/cursor-pro.png',
    category: 'Accounts',
    marketPrice: 240.00,
    ourPrice: 89.99,
    price_egp: 4750.00,
    price_sar: 345.00,
    rating: 4.91,
    reviews: 14,
    stock: 12,
    maxStock: 20,
    brandColor: 'hover:border-[#6366F1]/40'
  }
];

const SORT_OPTIONS  = ['Newest First', 'Price: Low to High', 'Price: High to Low', 'Best Rated', 'Most Popular'];

// ─── Main Store Page ──────────────────────────────────────────────────────────

export default function HomePage() {
  const [activeSort, setActiveSort] = useState('Newest First');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [faqSearch, setFaqSearch] = useState('');
  
  // Initialize with Master Catalog immediately for 0ms instant display without empty states
  const [dbProducts, setDbProducts] = useState<Product[]>(() => {
    return MASTER_UPSTORE_CATALOG.map((product: any) => {
      const fallback = PRODUCTS.find((item) => item.slug === product.slug);
      return {
        ...product,
        Icon: ICON_MAP[product.icon_name] ?? fallback?.Icon ?? Zap,
        brandColor: product.brand_color || fallback?.brandColor || DEFAULT_PRODUCT_BRAND_COLOR,
        brand_color: product.brand_color || fallback?.brandColor || DEFAULT_PRODUCT_BRAND_COLOR,
        marketPrice: typeof product.market_price === 'number' && product.market_price > 0 ? product.market_price : (fallback?.marketPrice || 0),
        ourPrice: typeof product.our_price === 'number' ? product.our_price : (fallback?.ourPrice || 0),
        priceEgp: Number(product.price_egp) || (fallback ? Math.ceil((fallback.ourPrice || 3.49) * 53) : 0),
        priceSar: Number(product.price_sar) || (fallback ? Math.ceil((fallback.ourPrice || 3.49) * 4) : 0),
        maxStock: Number(product.max_stock) || fallback?.maxStock || 100,
      };
    });
  });
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  
  const { t, language, mounted } = useLocale();
  const isAr = language === 'ar';
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams ? searchParams.get('q') || '' : '';
  const [searchVal, setSearchVal] = useState(searchQuery);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [aiMatchedSlugs, setAiMatchedSlugs] = useState<string[]>([]);
  const [isAiSearching, setIsAiSearching] = useState<boolean>(false);

  const [user, setUser] = useState<any>(null);

  const topCategory = useHyperAdaptiveStore((s) => s.topCategory);
  const recommendedSlugs = useHyperAdaptiveStore((s) => s.recommendedSlugs);
  const viewedSlugs = useHyperAdaptiveStore((s) => s.viewedSlugs);
  const priceSensitivity = useHyperAdaptiveStore((s) => s.priceSensitivity);
  const detectedPersona = useHyperAdaptiveStore((s) => s.detectedPersona);
  const recordCategoryDwell = useHyperAdaptiveStore((s) => s.recordCategoryDwell);
  const recordSearchQuery = useHyperAdaptiveStore((s) => s.recordSearchQuery);

  // Sync auth state
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then((res: any) => setUser(res?.data?.user || null)).catch(() => {});
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Sync searchVal with URL search query
  useEffect(() => {
    setSearchVal(searchQuery);
  }, [searchQuery]);

  // AI Semantic Search for Homepage Catalog (Requires Logged-In User)
  useEffect(() => {
    const q = searchVal.trim();
    if (!q || !user) {
      setAiInsight('');
      setAiMatchedSlugs([]);
      setIsAiSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsAiSearching(true);
      try {
        const res = await fetch('/api/search/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query: q, 
            language,
            session: {
              topCategory,
              viewedSlugs,
              priceSensitivity,
              detectedPersona,
            }
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setAiInsight(data.aiInsight || '');
          setAiMatchedSlugs(data.matchedSlugs || []);
        }
      } catch {
        // keep local results
      } finally {
        setIsAiSearching(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [searchVal, language, topCategory, viewedSlugs, priceSensitivity, detectedPersona, user]);

  const handleSearchChange = (val: string) => {
    setSearchVal(val);
    if (val.trim()) {
      recordSearchQuery(val);
    }
    const params = new URLSearchParams(window.location.search);
    if (val) {
      params.set('q', val);
    } else {
      params.delete('q');
    }
    router.replace(`/?${params.toString()}`, { scroll: false });
  };

  // Fetch products with multi-tier resilience and background synchronization
  useEffect(() => {
    let isMounted = true;
    const fetchProducts = async () => {
      try {
        const supabase = createClient();
        const { data } = await fetchLiveProducts(supabase);

        if (!isMounted) return;

        const catalogToUse = (data && data.length > 0) ? data : MASTER_UPSTORE_CATALOG;

        setDbProducts(
          catalogToUse.map((product: any) => {
            const fallback = PRODUCTS.find((item) => item.slug === product.slug) ||
                             MASTER_UPSTORE_CATALOG.find((item) => item.slug === product.slug);
            const stockVal = typeof product.stock === 'number' && product.stock > 0 
              ? product.stock 
              : (fallback?.stock ?? 85);

            return {
              ...product,
              stock: stockVal,
              Icon: ICON_MAP[product.icon_name] ?? (fallback as any)?.Icon ?? Zap,
              brand_color:
                product.brand_color ||
                (fallback as any)?.brandColor ||
                (fallback as any)?.brand_color ||
                DEFAULT_PRODUCT_BRAND_COLOR,
              brandColor:
                product.brand_color ||
                (fallback as any)?.brandColor ||
                (fallback as any)?.brand_color ||
                DEFAULT_PRODUCT_BRAND_COLOR,
              marketPrice:
                typeof product.market_price === 'number' && product.market_price > 0 ? product.market_price : (product.our_price === 0 ? 0 : (fallback?.market_price || (fallback as any)?.marketPrice || 0)),
              ourPrice: typeof product.our_price === 'number' ? product.our_price : (fallback?.our_price || (fallback as any)?.ourPrice || 0),
              priceEgp: Number(product.price_egp) || ((fallback as any)?.price_egp ?? (fallback ? Math.ceil(((fallback as any).ourPrice || 3.49) * 53) : 0)),
              priceSar: Number(product.price_sar) || ((fallback as any)?.price_sar ?? (fallback ? Math.ceil(((fallback as any).ourPrice || 3.49) * 4) : 0)),
              maxStock: Number(product.max_stock) || (fallback as any)?.maxStock || (fallback as any)?.max_stock || 100,
            };
          })
        );
        setProductsError('');
      } catch (err: unknown) {
        console.warn('Live products fetch notice:', err);
      } finally {
        if (isMounted) setProductsLoading(false);
      }
    };
    fetchProducts();
    return () => { isMounted = false; };
  }, []);

  // Category definitions with localized names
  const CATEGORIES = useMemo(() => [
    { id: 'ALL', label_en: 'All Products', label_ar: 'جميع المنتجات', Icon: ShoppingBag },
    { id: 'Subscriptions', label_en: 'Subscriptions', label_ar: 'الاشتراكات', Icon: Film },
    { id: 'Accounts', label_en: 'AI & Accounts', label_ar: 'حسابات وذكاء اصطناعي', Icon: Bot },
    { id: 'VPNs & Security', label_en: 'VPN & Security', label_ar: 'شبكات VPN وأمان', Icon: Lock },
    { id: 'Software', label_en: 'Software', label_ar: 'برامج وأنظمة', Icon: Laptop },
    { id: 'Game Keys', label_en: 'Game Keys', label_ar: 'مفاتيح ألعاب', Icon: Gamepad2 },
  ], []);

  // Category counts lookup table (O(N) computed once instead of on every tab)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: dbProducts.length };
    dbProducts.forEach((p) => {
      const cat = p.category || '';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [dbProducts]);

  const getCategoryCount = useCallback((catId: string) => {
    return categoryCounts[catId] ?? (catId === 'ALL' ? dbProducts.length : 0);
  }, [categoryCounts, dbProducts.length]);

  // Intelligent Multilingual Filtering & AI Semantic Ranking
  const effectiveQuery = (searchVal || searchQuery).trim();

  const productsToShow = useMemo(() => {
    const searchResults = searchProducts(dbProducts, effectiveQuery, {
      category: selectedCategory,
      limit: 100,
    });

    // If AI matched slugs are returned, prioritize them from the full database
    if (aiMatchedSlugs.length > 0) {
      const aiRanked: Product[] = [];
      const seenSlugs = new Set<string>();
      const localMatches = searchResults.map(r => r.item);

      aiMatchedSlugs.forEach((slug) => {
        const match = dbProducts.find((p) => p.slug === slug && (selectedCategory === 'ALL' || p.category === selectedCategory));
        if (match && !seenSlugs.has(match.slug)) {
          seenSlugs.add(match.slug);
          aiRanked.push(match);
        }
      });

      localMatches.forEach((prod) => {
        if (!seenSlugs.has(prod.slug)) {
          seenSlugs.add(prod.slug);
          aiRanked.push(prod);
        }
      });

      return aiRanked;
    } else if (!effectiveQuery && selectedCategory === 'ALL' && recommendedSlugs.length > 0) {
      const recommendedSet = new Set(recommendedSlugs);
      const recs: Product[] = [];
      const others: Product[] = [];

      searchResults.forEach((res) => {
        if (recommendedSet.has(res.item.slug)) {
          recs.push(res.item);
        } else {
          others.push(res.item);
        }
      });

      return [...recs, ...others];
    } else {
      return searchResults.map(r => r.item);
    }
  }, [dbProducts, effectiveQuery, selectedCategory, aiMatchedSlugs, recommendedSlugs]);

  // Sort products with memoization
  const sortedProducts = useMemo(() => {
    return [...productsToShow].sort((a, b) => {
      const priceA = a.ourPrice ?? a.our_price ?? 0;
      const priceB = b.ourPrice ?? b.our_price ?? 0;
      const ratingA = a.rating ?? 0;
      const ratingB = b.rating ?? 0;
      const reviewsA = a.reviews ?? 0;
      const reviewsB = b.reviews ?? 0;

      if (activeSort === 'Price: Low to High') return priceA - priceB;
      if (activeSort === 'Price: High to Low') return priceB - priceA;
      if (activeSort === 'Best Rated') return ratingB - ratingA;
      if (activeSort === 'Most Popular') return reviewsB - reviewsA;
      return 0;
    });
  }, [productsToShow, activeSort]);

  const getSortOptionLabel = useCallback((opt: string) => {
    if (opt === 'Newest First') return t('newestFirst');
    if (opt === 'Price: Low to High') return t('priceLowHigh');
    if (opt === 'Price: High to Low') return t('priceHighToLow');
    if (opt === 'Best Rated') return t('bestRated');
    if (opt === 'Most Popular') return t('mostPopular');
    return opt;
  }, [t]);

  const rawFaqData = isAr ? [
    {
      q: "كيف يتم تسليم المنتجات والاشتراكات بعد الدفع؟",
      a: "يتم تسليم الحسابات والتراخيص الرقمية مباشرة في لوحة تحكم حسابك وإرسال نسخة كاملة إلى بريدك الإلكتروني بعد مراجعة وتأكيد عملية الدفع."
    },
    {
      q: "ما هي طبيعة الضمان وسياسة الاستبدال؟",
      a: "نقدم ضماناً ذهبياً شاملاً يغطي كامل مدة الاشتراك. في حال حدوث أي خلل، يتم استبدال المنتج أو حل المشكلة فوراً عبر الدعم الفني."
    },
    {
      q: "هل الحسابات والاشتراكات رسمية وقانونية؟",
      a: "نعم، 100% من الاشتراكات والتراخيص معتمدة ورسمية وتعمل باستقرار تام بدون أي مخاطر حظر."
    },
    {
      q: "ما هي بوابات الدفع المدعومة؟",
      a: "نقبل بطاقات Visa و MasterCard، الدفع عبر Apple Pay، والمحافظ المحلية (فودافون كاش، إنستاباي) والعملات الرقمية المشفرة بتشفير 256-Bit."
    }
  ] : [
    {
      q: "How are digital subscriptions delivered?",
      a: "Account credentials or activation keys appear directly in your dashboard and are emailed after payment review and verification."
    },
    {
      q: "What is your warranty policy?",
      a: "We provide a 30-day Gold Replacement Warranty. Any unexpected issue is resolved or replaced immediately by our dedicated support team."
    },
    {
      q: "Are the accounts official and secure?",
      a: "Yes, 100% of licenses and accounts are official and stable, ensuring full security and zero interruption."
    },
    {
      q: "Which payment methods are accepted?",
      a: "We accept Visa, MasterCard, Apple Pay, local wallet transfers (Vodafone Cash, InstaPay), and cryptocurrencies via 256-bit SSL encryption."
    }
  ];

  const faqData = faqSearch
    ? rawFaqData.filter(f => f.q.toLowerCase().includes(faqSearch.toLowerCase()) || f.a.toLowerCase().includes(faqSearch.toLowerCase()))
    : rawFaqData;

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: rawFaqData.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  };

  return (
    <main className="min-h-screen bg-[#FFFDF9] text-black pb-20 md:pb-0 relative">
      
      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 · MODERN CREATOR MARKETPLACE HERO (STITCH / GUMROAD STYLE)
      ══════════════════════════════════════════════════════════════════════ */}
      <ModernMarketplaceHero
        searchQuery={searchVal}
        onSearchChange={handleSearchChange}
        selectedCategory={selectedCategory}
        onSelectCategory={(catId) => {
          setSelectedCategory(catId);
          const el = document.getElementById('grid');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        productCount={productsToShow.length}
        products={dbProducts}
      />


      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 · FLASH DEALS ARENA (صيد اليوم)
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="deals" className="py-3 sm:py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {productsLoading ? (
          <div className="w-full h-36 rounded-2xl border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] animate-pulse flex items-center justify-center text-xs font-bold text-black">
            {isAr ? 'جاري تحميل عرض اليوم الفلاش...' : 'Loading live flash deal...'}
          </div>
        ) : productsError ? (
          <div className="w-full rounded-2xl border-2 border-black bg-[#FF70A6] px-6 py-6 text-center text-xs font-black text-black shadow-[4px_4px_0px_0px_#000]">
            Failed to load live products: {productsError}
          </div>
        ) : dbProducts.length > 0 ? (
          <FlashDealsCorner products={dbProducts} />
        ) : null}
      </section>


      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4 · STORE CATALOG (PRODUCTS FRONT AND CENTER)
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="grid" className="pb-16 lg:pb-24 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4">

        {/* ── Compact Store Toolbar (matches Browse page style) ── */}
        <div className="sticky top-0 z-30 bg-[#FFFDF9] pt-2 pb-3 space-y-2 select-none">

          {/* Row 1: Title + Search + Sort */}
          <div className="flex items-center gap-2">
            {/* Title (hidden on xs, visible on sm+) */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-[#06D6A0] border-2 border-black flex items-center justify-center text-black shadow-[1.5px_1.5px_0px_0px_#000]">
                <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-sm font-black text-black leading-tight">
                  {mounted ? t('allProducts') : (isAr ? 'جميع المنتجات' : 'All Products')}
                </h2>
                <p className="text-[10px] text-neutral-500 font-bold leading-none">
                  {productsToShow.length} {isAr ? 'منتج' : 'items'}
                </p>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                <Search className="w-3.5 h-3.5 text-black stroke-[2.5]" />
              </div>
              <input
                type="search"
                inputMode="search"
                enterKeyHint="search"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={searchVal}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') {
                    (e.target as HTMLInputElement).blur();
                    if (e.key === 'Escape') handleSearchChange('');
                  }
                }}
                placeholder={isAr ? 'ابحث عن اشتراكك...' : 'Search subscriptions...'}
                className="w-full ps-8.5 pe-7 py-2 bg-white border-2 border-black rounded-xl text-xs text-black font-bold placeholder-neutral-400 outline-none shadow-[2px_2px_0px_0px_#000] focus:shadow-[3px_3px_0px_0px_#000] transition-all"
              />
              {searchVal && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute inset-y-0 end-0 pe-2.5 flex items-center text-black hover:opacity-70 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative shrink-0">
              <select
                value={activeSort}
                onChange={(e) => setActiveSort(e.target.value)}
                aria-label={isAr ? 'ترتيب المنتجات' : 'Sort products'}
                className="bg-white border-2 border-black text-black font-black rounded-xl px-2.5 py-2 text-xs outline-none cursor-pointer shadow-[2px_2px_0px_0px_#000] transition-all appearance-none pe-6"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === 'Newest First' ? (isAr ? 'الأحدث' : 'Newest') :
                     opt === 'Price: Low to High' ? (isAr ? 'الأقل سعراً' : 'Price: Low') :
                     opt === 'Price: High to Low' ? (isAr ? 'الأعلى سعراً' : 'Price: High') :
                     opt === 'Best Rated' ? (isAr ? 'الأعلى تقييماً' : 'Best Rated') :
                     opt === 'Most Popular' ? (isAr ? 'الأكثر طلباً' : 'Popular') : opt}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 end-0 pe-1.5 flex items-center pointer-events-none">
                <ChevronDown className="w-3.5 h-3.5 text-black stroke-[2.5]" />
              </div>
            </div>
          </div>

          {/* Row 2: Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none px-0.5">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              const count = getCategoryCount(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    if (cat.id !== 'ALL') recordCategoryDwell(cat.id, 5);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all duration-150 cursor-pointer border-2 border-black shrink-0 ${
                    isActive
                      ? 'bg-[#FFE600] text-black shadow-[2.5px_2.5px_0px_0px_#000] -translate-y-0.5'
                      : 'bg-white text-neutral-800 hover:bg-neutral-100 shadow-[1px_1px_0px_0px_#000]'
                  }`}
                >
                  <cat.Icon className={`w-3.5 h-3.5 ${isActive ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
                  <span>{isAr ? cat.label_ar : cat.label_en}</span>
                  <span className={`text-[10px] font-black px-1 rounded ${isActive ? 'text-black' : 'text-neutral-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* AI Insight Strip (only when searching) */}
          {searchVal && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_0px_#000] text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-black text-black bg-[#FFE600] px-1.5 py-0.5 rounded border border-black text-[10px] shrink-0">
                  {isAr ? 'AI' : 'AI'}
                </span>
                <span className="text-black font-bold truncate text-[11px]">
                  {user
                    ? isAiSearching
                      ? (isAr ? 'جاري التحليل...' : 'Analyzing...')
                      : (aiInsight || (isAr ? 'تم ترتيب النتائج ذكياً' : 'Results ranked by AI'))
                    : (isAr ? 'سجّل دخولك لـ AI Search' : 'Sign in for AI Search')}
                </span>
              </div>
              {user ? (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#06D6A0] text-black shrink-0 border border-black">
                  AI
                </span>
              ) : (
                <Link href="/auth/login" className="px-2 py-1 bg-black text-white text-[10px] font-black rounded-lg shrink-0">
                  {isAr ? 'دخول' : 'Sign In'}
                </Link>
              )}
            </div>
          )}

        </div>

        {/* Product Grid Panel (Mobile 2-column, Desktop 4-column) */}
        <div>
          {productsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-64 bg-white border-2 border-black rounded-2xl animate-pulse shadow-[3px_3px_0px_0px_#000]" />
              ))}
            </div>
          ) : productsError ? (
            <div className="rounded-3xl border-2 border-black bg-[#FF70A6] px-6 py-10 text-center text-sm font-black text-black shadow-[5px_5px_0px_0px_#000]">
              Failed to load live products: {productsError}
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="p-8 sm:p-12 text-center bg-white border-2 border-black rounded-3xl shadow-[5px_5px_0px_0px_#000] space-y-3 my-4">
              <div className="w-14 h-14 rounded-2xl bg-[#FFE600] border-2 border-black flex items-center justify-center mx-auto shadow-[2px_2px_0px_0px_#000]">
                <ShoppingBag className="w-7 h-7 text-black stroke-[2.5]" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-black">
                {isAr ? 'لم يتم العثور على منتجات مطابقة' : 'No products found'}
              </h3>
              <p className="text-xs text-neutral-600 font-bold max-w-sm mx-auto">
                {isAr ? 'جرب البحث بكلمات أخرى أو اختر قسماً مختلفاً من القائمة.' : 'Try adjusting your search query or select another category.'}
              </p>
              <button
                onClick={() => { setSelectedCategory('ALL'); handleSearchChange(''); }}
                className="px-5 py-2 rounded-xl bg-[#FFE600] text-black text-xs font-black border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
              >
                {isAr ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {sortedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onQuickView={(prod) => setQuickViewProduct(prod)}
                />
              ))}
            </div>
          )}
        </div>

      </section>



      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 5 · VERIFIED BUYER EXPERIENCES (INTERACTIVE LIVE REVIEWS)
      ══════════════════════════════════════════════════════════════════════ */}
      <HomeReviewsSection products={dbProducts} />

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 6 · OFFICIAL PAYMENT NETWORKS & SECURITY PARTNERS ROW
      ══════════════════════════════════════════════════════════════════════ */}
      <PaymentPartnersRow />

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 7 · FAQ — SEARCHABLE ACCORDION
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-16 lg:py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 border-t-2 border-black select-none">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />

        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-4xl font-black text-black mb-3">
            {isAr ? 'الأسئلة الأكثر شيوعاً' : 'Frequently Asked Questions'}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-700 max-w-md mx-auto leading-relaxed mb-6 font-bold">
            {isAr 
              ? 'كل ما تود معرفته حول التسليم السريع والضمان الذهبي وبوابات الدفع المشفرة.' 
              : 'Everything you need to know about fast delivery, gold warranty, and secured payments.'}
          </p>

          {/* Quick FAQ Search Filter */}
          <div className="relative max-w-md mx-auto">
            <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-black stroke-[2.5]" />
            </div>
            <input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                  (e.target as HTMLInputElement).blur();
                  if (e.key === 'Escape') setFaqSearch('');
                }
              }}
              placeholder={isAr ? 'ابحث في الأسئلة الشائعة...' : 'Search questions...'}
              className="w-full ps-10 pe-10 py-3 bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000] focus:shadow-[5px_5px_0px_0px_#000] rounded-xl text-xs sm:text-sm text-black font-bold placeholder-neutral-500 outline-none transition-all"
            />
            {faqSearch && (
              <button
                onClick={() => setFaqSearch('')}
                className="absolute inset-y-0 end-0 pe-3 flex items-center text-black hover:opacity-70 cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3.5">
          {faqData.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div 
                key={idx} 
                className={`rounded-2xl border-2 border-black bg-white overflow-hidden transition-all ${isOpen ? 'shadow-[5px_5px_0px_0px_#000]' : 'shadow-[3px_3px_0px_0px_#000] hover:shadow-[4px_4px_0px_0px_#000]'}`}
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-start font-black text-xs sm:text-sm text-black transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <span className={`shrink-0 w-7 h-7 rounded-lg border-2 border-black flex items-center justify-center transition-all duration-200 shadow-[1px_1px_0px_0px_#000] ${isOpen ? 'rotate-180 bg-[#FFE600] text-black' : 'bg-neutral-100 text-black'}`}>
                    <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                  </span>
                </button>
                
                {isOpen && (
                  <div className="border-t-2 border-dashed border-neutral-300 py-4 px-5 bg-[#FFFDF9]">
                    <p className="text-xs sm:text-sm text-neutral-800 leading-relaxed font-bold">
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Telegram Direct Support Box */}
        <div className="mt-10 p-5 sm:p-6 rounded-2xl border-2 border-black bg-[#FFE600] shadow-[5px_5px_0px_0px_#000] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-start">
          <div>
            <h3 className="text-base font-black text-black mb-1">
              {isAr ? 'هل لديك أي استفسار آخر ترغب في معرفته؟' : 'Have another question?'}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-800 font-bold">
              {isAr ? 'فريق الدعم الفني المباشر متواجد على تليجرام لمساعدتك فوراً.' : 'Our customer support team is available 24/7 on Telegram.'}
            </p>
          </div>
          <a
            href="https://t.me/UpStore_Support_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs sm:text-sm font-black border-2 border-black shadow-[3px_3px_0px_0px_#06D6A0] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <span>{isAr ? 'تحدث مع الدعم الفني على تليجرام' : 'Chat on Telegram'}</span>
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </a>
        </div>

      </section>

      {/* ── Product Quick View Spec Modal (21st Pattern) ── */}
      {quickViewProduct && (
        <ProductQuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}

    </main>
  );
}
