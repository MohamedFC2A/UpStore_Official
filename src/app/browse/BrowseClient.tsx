'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Search, Sparkles, SlidersHorizontal, 
  Grid, List, Zap, ShieldCheck, Star, ShoppingCart, 
  Check, X, Flame, Layers, Bot,
  Tv, Shield, Gamepad2, Laptop, Crown,
  RefreshCw, PackageCheck
} from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { useCartStore } from '@/store/useCartStore';
import { useToastStore } from '@/store/useToastStore';
import { createClient } from '@/utils/supabase/client';
import { ProductImage } from '@/components/ProductImage';
import { ProductAmbientGlow } from '@/components/ui/ProductAmbientGlow';
import { 
  fetchLiveProducts,
  formatLocalizedDuration, 
  formatLocalizedWarranty,
  MASTER_UPSTORE_CATALOG
} from '@/utils/products';
import { searchProducts } from '@/utils/searchEngine';

const SmartPaymentModal = dynamic(
  () => import('@/components/checkout/SmartPaymentModal').then((mod) => mod.SmartPaymentModal),
  { ssr: false }
);

const ProductQuickViewModal = dynamic(
  () => import('@/components/ui/ProductQuickViewModal').then((mod) => mod.ProductQuickViewModal),
  { ssr: false }
);

function getSavingsPct(marketPrice: number, ourPrice: number): number {
  if (!marketPrice || marketPrice <= ourPrice) return 0;
  return Math.max(0, Math.round(((marketPrice - ourPrice) / marketPrice) * 100));
}

// ─── Categories Definition ───────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'ALL', label_ar: 'الكل', label_en: 'All', icon: Layers },
  { id: 'FLASH', label_ar: 'عروض الفلاش', label_en: 'Flash Deals', icon: Flame },
  { id: 'Subscriptions', label_ar: 'اشتراكات ترفيه', label_en: 'Subscriptions', icon: Tv },
  { id: 'Accounts', label_ar: 'ذكاء اصطناعي وحسابات', label_en: 'AI & Accounts', icon: Bot },
  { id: 'Software', label_ar: 'برامج وتطبيقات', label_en: 'Software & Apps', icon: Laptop },
  { id: 'VPNs & Security', label_ar: 'حماية و VPN', label_en: 'VPN & Security', icon: Shield },
  { id: 'Game Keys', label_ar: 'ألعاب وجيمينج', label_en: 'Gaming & Keys', icon: Gamepad2 },
];

export default function BrowseClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || 'ALL';

  const { language, formatPrice, mounted } = useLocale();
  const isAr = language === 'ar';
  const toast = useToastStore();
  const addToCart = useCartStore((s) => s.addToCart);

  // States initialized with Master Catalog for zero-delay instant render
  const [products, setProducts] = useState<any[]>(() => MASTER_UPSTORE_CATALOG);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [priceFilter, setPriceFilter] = useState<'all' | 'under_5' | '5_to_15' | 'above_15'>('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [durationFilter, setDurationFilter] = useState<'all' | '1m' | '3m' | '1y' | 'lifetime'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'discount' | 'price_low' | 'price_high' | 'newest'>('popular');
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);

  // AI Search states
  const [aiInsight, setAiInsight] = useState<string>('');
  const [aiMatchedSlugs, setAiMatchedSlugs] = useState<string[]>([]);
  const [isAiSearching, setIsAiSearching] = useState<boolean>(false);

  // Interaction Modals
  const [addingId, setAddingId] = useState<string | number | null>(null);
  const [addedIds, setAddedIds] = useState<Record<string | number, boolean>>({});
  const [directCheckoutProduct, setDirectCheckoutProduct] = useState<any | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<any | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // 1. Load products reliably using fetchLiveProducts with background synchronization
  useEffect(() => {
    let isMounted = true;
    async function loadCatalog() {
      try {
        const supabase = createClient();
        const { data, error } = await fetchLiveProducts(supabase);

        if (!isMounted) return;

        if (!error && data && data.length > 0) {
          setProducts(data);
        } else {
          setProducts(MASTER_UPSTORE_CATALOG);
        }
      } catch (err) {
        console.warn('Browse catalog loading exception, applying master catalog:', err);
        if (isMounted) setProducts(MASTER_UPSTORE_CATALOG);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadCatalog();
    return () => { isMounted = false; };
  }, []);

  // 2. Sync with URL params
  useEffect(() => {
    if (initialQuery !== undefined && initialQuery !== searchTerm) {
      setSearchTerm(initialQuery);
    }
  }, [initialQuery]);

  // 3. AI Semantic Search Reasoning (powered by Google Gemini 2.5 Flash Lite Batch)
  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed || trimmed.length < 2) {
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
            query: trimmed,
            language: isAr ? 'ar' : 'en',
            session: { topCategory: selectedCategory !== 'ALL' ? selectedCategory : '' }
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.matchedSlugs && Array.isArray(json.matchedSlugs)) {
            setAiMatchedSlugs(json.matchedSlugs);
          }
          if (json.aiInsight) {
            setAiInsight(json.aiInsight);
          }
        }
      } catch (e) {
        console.warn('AI search non-blocking error:', e);
      } finally {
        setIsAiSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm, isAr, selectedCategory]);

  // Handle Direct Buy
  const handleDirectBuy = (e: React.MouseEvent, product: any) => {
    e.stopPropagation();
    setDirectCheckoutProduct(product);
  };

  // Handle Add to Cart
  const handleAddToCart = async (e: React.MouseEvent, product: any) => {
    e.stopPropagation();
    if (addingId === product.id) return;
    setAddingId(product.id);
    try {
      await addToCart(product, 1);
      setAddedIds((prev) => ({ ...prev, [product.id]: true }));
      toast.success(
        isAr ? 'تمت إضافة المنتج إلى السلة بنجاح!' : 'Added to cart successfully!',
        isAr ? product.name_ar || product.name : product.name
      );
      setTimeout(() => {
        setAddedIds((prev) => ({ ...prev, [product.id]: false }));
      }, 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setAddingId(null);
    }
  };

  // 4. Smart Multi-Faceted Filter & BM25 / AI Hybrid Ranking
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Category Filter
    if (selectedCategory === 'FLASH') {
      result = result.filter((p) => p.is_flash_deal || p.isFlashDeal);
    } else if (selectedCategory !== 'ALL') {
      const catTarget = selectedCategory.toLowerCase();
      result = result.filter((p) => {
        const pCat = (p.category || '').toLowerCase();
        if (catTarget === 'subscriptions') return pCat.includes('sub') || pCat.includes('اشتراك') || pCat.includes('ترفيه');
        if (catTarget === 'accounts') return pCat.includes('account') || pCat.includes('حساب') || pCat.includes('ai') || pCat.includes('ذكاء');
        if (catTarget === 'software') return pCat.includes('soft') || pCat.includes('برامج') || pCat.includes('app');
        if (catTarget === 'vpns & security') return pCat.includes('vpn') || pCat.includes('حماية') || pCat.includes('sec');
        if (catTarget === 'game keys') return pCat.includes('game') || pCat.includes('لعب') || pCat.includes('key');
        return pCat === catTarget;
      });
    }

    // In Stock Only Filter
    if (inStockOnly) {
      result = result.filter((p) => (p.stock ?? 1) > 0);
    }

    // Price Range Filter
    if (priceFilter === 'under_5') {
      result = result.filter((p) => (p.our_price ?? p.ourPrice ?? p.price ?? 0) < 5);
    } else if (priceFilter === '5_to_15') {
      result = result.filter((p) => {
        const pr = p.our_price ?? p.ourPrice ?? p.price ?? 0;
        return pr >= 5 && pr <= 15;
      });
    } else if (priceFilter === 'above_15') {
      result = result.filter((p) => (p.our_price ?? p.ourPrice ?? p.price ?? 0) > 15);
    }

    // Duration Filter
    if (durationFilter !== 'all') {
      result = result.filter((p) => {
        const dur = (p.subscription_duration || '').toLowerCase();
        if (durationFilter === '1m') return dur.includes('1 month') || dur.includes('1 شهر') || dur.includes('شهر');
        if (durationFilter === '3m') return dur.includes('3 month') || dur.includes('3 أشهر') || dur.includes('3 شهر');
        if (durationFilter === '1y') return dur.includes('1 year') || dur.includes('12 month') || dur.includes('سنة');
        if (durationFilter === 'lifetime') return dur.includes('lifetime') || dur.includes('مدى الحياة') || dur.includes('دائم');
        return true;
      });
    }

    // Search Filtering: Hybrid BM25 + AI Slugs
    if (searchTerm.trim()) {
      const searchMatches = searchProducts(result, searchTerm.trim(), { limit: 100 });
      const matchedMap = new Map<string, number>();
      
      searchMatches.forEach((m) => {
        matchedMap.set(m.item.slug, m.score);
      });

      // Boost AI matched slugs
      aiMatchedSlugs.forEach((slug, rank) => {
        const current = matchedMap.get(slug) || 0;
        matchedMap.set(slug, current + (100 - rank * 15));
      });

      result = result
        .filter((p) => matchedMap.has(p.slug))
        .sort((a, b) => (matchedMap.get(b.slug) || 0) - (matchedMap.get(a.slug) || 0));
    } else {
      // Sorting
      result.sort((a, b) => {
        const priceA = a.our_price ?? a.ourPrice ?? a.price ?? 0;
        const priceB = b.our_price ?? b.ourPrice ?? b.price ?? 0;
        const marketA = a.market_price ?? a.marketPrice ?? priceA;
        const marketB = b.market_price ?? b.marketPrice ?? priceB;
        const discA = getSavingsPct(marketA, priceA);
        const discB = getSavingsPct(marketB, priceB);

        if (sortBy === 'price_low') return priceA - priceB;
        if (sortBy === 'price_high') return priceB - priceA;
        if (sortBy === 'rating') return (b.rating || 5) - (a.rating || 5);
        if (sortBy === 'discount') return discB - discA;
        if (sortBy === 'newest') return (b.id || 0) - (a.id || 0);
        // Default: popular
        return (b.sold_count || b.reviews || 0) - (a.sold_count || a.reviews || 0);
      });
    }

    return result;
  }, [products, selectedCategory, inStockOnly, priceFilter, durationFilter, searchTerm, aiMatchedSlugs, sortBy]);

  // Active custom filters count (excluding category & query)
  const activeCustomFiltersCount = (priceFilter !== 'all' ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (durationFilter !== 'all' ? 1 : 0);

  const resetAllFilters = () => {
    setSelectedCategory('ALL');
    setPriceFilter('all');
    setInStockOnly(false);
    setDurationFilter('all');
    setSearchTerm('');
    setSortBy('popular');
  };

  return (
    <div 
      dir={isAr ? 'rtl' : 'ltr'} 
      className="min-h-screen bg-[#FDFBF7] pb-28 pt-2 sm:pt-4 text-black select-none"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-3">
        
        {/* ── 1. Compact Sleek Header ── */}
        <div className="flex items-center justify-between gap-2 pt-1 pb-1">
          <div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FFE600] border border-black rounded-md text-[10px] font-black shadow-[1px_1px_0px_0px_#000] mb-0.5">
              <Crown className="w-3 h-3 stroke-[2.5] fill-black" />
              <span>{isAr ? 'سوق الاشتراكات الرقمية الأصلي 100%' : '100% Genuine Digital Store'}</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-black tracking-tight leading-tight">
              {isAr ? 'سوق التراخيص والاشتراكات' : 'Digital Subscriptions & Licenses'}
            </h1>
          </div>

          <div className="shrink-0 text-end">
            <span className="text-xs font-mono font-black text-black bg-white border-2 border-black px-2.5 py-1 rounded-xl shadow-[2px_2px_0px_0px_#000]">
              {isAr ? `${filteredProducts.length} منتج` : `${filteredProducts.length} Items`}
            </span>
          </div>
        </div>

        {/* ── 2. Clean AI Search Bar ── */}
        <div className="relative">
          <div className={`absolute inset-y-0 ${isAr ? 'right-0 pr-3.5' : 'left-0 pl-3.5'} flex items-center pointer-events-none text-black`}>
            {isAiSearching ? (
              <RefreshCw className="w-4 h-4 text-black animate-spin stroke-[2.5]" />
            ) : (
              <Search className="w-4 h-4 stroke-[2.5]" />
            )}
          </div>
          
          <input
            ref={searchInputRef}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') setSearchTerm('');
              }
            }}
            placeholder={isAr ? 'بحث ذكي (نيتفلكس، شات GPT، أوفيس، VPN)...' : 'Smart search (Netflix, ChatGPT, Office, VPN)...'}
            className={`w-full ${isAr ? 'pr-10 pl-10' : 'pl-10 pr-10'} py-2.5 sm:py-3 bg-white border-2 border-black rounded-2xl text-xs sm:text-sm font-black text-black outline-none placeholder-neutral-500 shadow-[3px_3px_0px_0px_#000] focus:shadow-[4px_4px_0px_0px_#FFE600] transition-all`}
          />

          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className={`absolute inset-y-0 ${isAr ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center text-neutral-400 hover:text-black cursor-pointer`}
            >
              <X className="w-4 h-4 stroke-[3]" />
            </button>
          )}
        </div>

        {/* ── 3. AI Search Insight Card (Gemini 2.5 Flash Lite) ── */}
        {aiInsight && searchTerm.trim() && (
          <div className="bg-[#FFE600]/25 border-2 border-black rounded-2xl p-3 shadow-[2.5px_2.5px_0px_0px_#000] flex items-start gap-2.5 text-start animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="w-7 h-7 rounded-lg bg-[#FFE600] border-2 border-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000]">
              <Sparkles className="w-3.5 h-3.5 text-black fill-black" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="text-[9px] font-black uppercase text-black bg-[#FFE600] border border-black px-1 rounded shadow-[0.5px_0.5px_0px_0px_#000]">
                  {isAr ? 'تحليل الذكاء الاصطناعي (Gemini 2.5 Flash Lite)' : 'AI Semantic Match'}
                </span>
                <span className="text-[9px] font-mono font-bold text-neutral-600">
                  {isAr ? `${filteredProducts.length} نتائج` : `${filteredProducts.length} matches`}
                </span>
              </div>
              <p className="text-xs font-black text-black leading-snug">
                {aiInsight}
              </p>
            </div>
          </div>
        )}

        {/* ── 4. Sleek Category Pills (Horizontal Scroll) ── */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border-2 border-black transition-all shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#FFE600] text-black shadow-[2.5px_2.5px_0px_0px_#000] -translate-y-0.5'
                    : 'bg-white text-neutral-800 hover:bg-neutral-100 shadow-[1px_1px_0px_0px_#000]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
                <span>{isAr ? cat.label_ar : cat.label_en}</span>
              </button>
            );
          })}
        </div>

        {/* ── 5. Clean Single Controls Bar (Replaces Cluttered Stack) ── */}
        <div className="bg-white border-2 border-black rounded-2xl p-2 sm:p-2.5 shadow-[3px_3px_0px_0px_#000] flex items-center justify-between gap-2">
          
          {/* Filter Trigger Button */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowFiltersDrawer(!showFiltersDrawer)}
              className={`px-3 py-1.5 rounded-xl border-2 border-black text-xs font-black flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer ${
                showFiltersDrawer || activeCustomFiltersCount > 0
                  ? 'bg-[#FFE600] text-black'
                  : 'bg-neutral-50 hover:bg-neutral-100 text-black'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isAr ? 'تصفية الفلاتر' : 'Filters'}</span>
              {activeCustomFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-black text-white text-[10px] flex items-center justify-center font-mono">
                  {activeCustomFiltersCount}
                </span>
              )}
            </button>

            {/* Quick In-Stock Filter Toggle */}
            <button
              onClick={() => setInStockOnly(!inStockOnly)}
              className={`hidden sm:flex px-2.5 py-1.5 rounded-xl border-2 border-black text-xs font-black items-center gap-1 shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer ${
                inStockOnly ? 'bg-[#06D6A0] text-black' : 'bg-white text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isAr ? 'متوفر فوراً' : 'In Stock'}</span>
            </button>
          </div>

          {/* Sort Selector & View Toggle */}
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-8 sm:h-9 px-2 sm:px-2.5 bg-neutral-50 hover:bg-white border-2 border-black rounded-xl text-xs font-black text-black shadow-[1.5px_1.5px_0px_0px_#000] outline-none cursor-pointer"
              >
                <option value="popular">{isAr ? 'الأكثر مبيعاً' : 'Most Popular'}</option>
                <option value="rating">{isAr ? 'الأعلى تقييماً' : 'Best Rated'}</option>
                <option value="discount">{isAr ? 'أعلى خصم %' : 'Highest Discount'}</option>
                <option value="price_low">{isAr ? 'الأقل سعراً' : 'Price: Low'}</option>
                <option value="price_high">{isAr ? 'الأعلى سعراً' : 'Price: High'}</option>
                <option value="newest">{isAr ? 'الأحدث' : 'Newest'}</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-neutral-50 border-2 border-black rounded-xl p-0.5 shadow-[1.5px_1.5px_0px_0px_#000]">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-[#FFE600] text-black font-black' : 'text-neutral-500 hover:text-black'
                }`}
                aria-label="Grid View"
              >
                <Grid className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'list' ? 'bg-[#FFE600] text-black font-black' : 'text-neutral-500 hover:text-black'
                }`}
                aria-label="List View"
              >
                <List className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>

        </div>

        {/* ── 6. Expandable Filter Drawer (Clean, Tidy, Collapsible) ── */}
        {showFiltersDrawer && (
          <div className="bg-white border-2 border-black rounded-2xl p-3.5 sm:p-4 shadow-[3.5px_3.5px_0px_0px_#000] space-y-3 text-start animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <span className="text-xs font-black text-black flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isAr ? 'خيارات التصفية الدقيقة' : 'Advanced Filters'}</span>
              </span>
              <button
                onClick={() => setShowFiltersDrawer(false)}
                className="text-neutral-500 hover:text-black p-1 cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Price Range Pills */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-neutral-600 block">
                {isAr ? 'نطاق السعر:' : 'Price Range:'}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { id: 'all', label_ar: 'جميع الأسعار', label_en: 'All' },
                  { id: 'under_5', label_ar: 'اقتصادي (< $5)', label_en: 'Under $5' },
                  { id: '5_to_15', label_ar: 'متوسط ($5-$15)', label_en: '$5 - $15' },
                  { id: 'above_15', label_ar: 'بريميوم (> $15)', label_en: 'Above $15' },
                ].map((pr) => (
                  <button
                    key={pr.id}
                    onClick={() => setPriceFilter(pr.id as any)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-black border transition-all text-center cursor-pointer ${
                      priceFilter === pr.id
                        ? 'bg-[#FFE600] text-black border-black shadow-[1.5px_1.5px_0px_0px_#000]'
                        : 'bg-neutral-50 text-neutral-800 border-neutral-300 hover:border-black'
                    }`}
                  >
                    {isAr ? pr.label_ar : pr.label_en}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Pills */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-neutral-600 block">
                {isAr ? 'مدة الاشتراك:' : 'Duration:'}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'all', label_ar: 'الكل', label_en: 'All' },
                  { id: '1m', label_ar: '1 شهر', label_en: '1 Month' },
                  { id: '3m', label_ar: '3 أشهر', label_en: '3 Months' },
                  { id: '1y', label_ar: '1 سنة', label_en: '1 Year' },
                  { id: 'lifetime', label_ar: 'مدى الحياة', label_en: 'Lifetime' },
                ].map((dur) => (
                  <button
                    key={dur.id}
                    onClick={() => setDurationFilter(dur.id as any)}
                    className={`py-1 px-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                      durationFilter === dur.id
                        ? 'bg-black text-white border-black shadow-[1.5px_1.5px_0px_0px_#FFE600]'
                        : 'bg-neutral-50 text-neutral-800 border-neutral-300 hover:border-black'
                    }`}
                  >
                    {isAr ? dur.label_ar : dur.label_en}
                  </button>
                ))}
              </div>
            </div>

            {/* In-Stock Mobile Toggle & Actions */}
            <div className="pt-2 border-t border-neutral-200 flex items-center justify-between gap-2 flex-wrap">
              <button
                onClick={() => setInStockOnly(!inStockOnly)}
                className={`py-1.5 px-3 rounded-xl border-2 border-black text-xs font-black flex items-center gap-1.5 shadow-[1px_1px_0px_0px_#000] cursor-pointer ${
                  inStockOnly ? 'bg-[#06D6A0] text-black' : 'bg-neutral-50 text-neutral-700'
                }`}
              >
                <PackageCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isAr ? 'المتوفر في المخزون فقط' : 'In Stock Only'}</span>
              </button>

              <div className="flex items-center gap-2">
                {activeCustomFiltersCount > 0 && (
                  <button
                    onClick={() => {
                      setPriceFilter('all');
                      setInStockOnly(false);
                      setDurationFilter('all');
                    }}
                    className="text-xs font-bold text-neutral-600 hover:text-black underline cursor-pointer"
                  >
                    {isAr ? 'مسح الفلاتر' : 'Clear'}
                  </button>
                )}
                <button
                  onClick={() => setShowFiltersDrawer(false)}
                  className="px-4 py-1.5 bg-black text-white text-xs font-black rounded-xl border-2 border-black shadow-[1.5px_1.5px_0px_0px_#FFE600] cursor-pointer"
                >
                  {isAr ? 'تم وتطبيق' : 'Apply'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── 7. Slim Active Filters Bar (Chips) ── */}
        {activeCustomFiltersCount > 0 && !showFiltersDrawer && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
            <span className="text-[11px] font-bold text-neutral-600 shrink-0">
              {isAr ? 'الفلاتر النشطة:' : 'Active:'}
            </span>

            {priceFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FFE600] border border-black rounded-lg text-[11px] font-black shrink-0">
                <span>{priceFilter === 'under_5' ? '< $5' : priceFilter === '5_to_15' ? '$5-$15' : '> $15'}</span>
                <button onClick={() => setPriceFilter('all')} className="cursor-pointer">
                  <X className="w-3 h-3 stroke-[3]" />
                </button>
              </span>
            )}

            {durationFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FFE600] border border-black rounded-lg text-[11px] font-black shrink-0">
                <span>{durationFilter === '1m' ? '1 شهر' : durationFilter === '3m' ? '3 أشهر' : durationFilter === '1y' ? '1 سنة' : 'دائم'}</span>
                <button onClick={() => setDurationFilter('all')} className="cursor-pointer">
                  <X className="w-3 h-3 stroke-[3]" />
                </button>
              </span>
            )}

            {inStockOnly && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#06D6A0] border border-black rounded-lg text-[11px] font-black shrink-0">
                <span>{isAr ? 'متوفر فوراً' : 'In Stock'}</span>
                <button onClick={() => setInStockOnly(false)} className="cursor-pointer">
                  <X className="w-3 h-3 stroke-[3]" />
                </button>
              </span>
            )}

            <button
              onClick={resetAllFilters}
              className="text-[11px] font-black text-neutral-500 hover:text-black underline shrink-0 cursor-pointer ms-1"
            >
              {isAr ? 'مسح الكل' : 'Clear all'}
            </button>
          </div>
        )}

      </div>

      {/* ── 8. Products Catalog (Grid / List) ── */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-4">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sk) => (
              <div 
                key={sk} 
                className="h-64 bg-white border-2 border-black rounded-2xl animate-pulse shadow-[3px_3px_0px_0px_#000]" 
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          /* Empty State with Fast Reset */
          <div className="p-8 sm:p-12 text-center bg-white border-2 border-black rounded-3xl shadow-[5px_5px_0px_0px_#000] space-y-3 my-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FFE600] border-2 border-black flex items-center justify-center mx-auto shadow-[2px_2px_0px_0px_#000]">
              <Search className="w-7 h-7 text-black stroke-[2.5]" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-black">
              {isAr ? 'لم يتم العثور على أي منتج يطابق الفلاتر' : 'No matching products found'}
            </h3>
            <p className="text-xs text-neutral-600 font-bold max-w-sm mx-auto">
              {isAr ? 'جرب البحث بكلمات أخرى أو أعد ضبط الفلاتر لعرض المنتجات.' : 'Try adjusting your search terms or reset filters.'}
            </p>
            <button
              onClick={resetAllFilters}
              className="px-5 py-2 rounded-xl bg-[#FFE600] text-black text-xs font-black border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#edd600] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            >
              {isAr ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* ── Clean 2-Column Mobile / 4-Column Desktop Grid View ── */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {filteredProducts.map((p) => {
              const marketPrice = p.market_price ?? p.marketPrice ?? 0;
              const ourPrice = p.our_price ?? p.ourPrice ?? p.price ?? 0;
              const discountPct = getSavingsPct(marketPrice, ourPrice);
              const durationStr = formatLocalizedDuration(p.subscription_duration, language);
              const isAdded = addedIds[p.id];
              const isFlash = p.is_flash_deal || p.isFlashDeal;

              return (
                <div
                  key={p.id}
                  onClick={() => router.push(`/product/${p.slug}`)}
                  className="group relative rounded-2xl p-2.5 sm:p-3.5 bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:shadow-[4.5px_4.5px_0px_0px_#000] hover:-translate-y-0.5 transition-all flex flex-col justify-between cursor-pointer overflow-hidden text-start"
                >
                  {/* Top Badges */}
                  <div className="absolute top-2 end-2 z-20 flex flex-col items-end gap-1 select-none">
                    {isFlash ? (
                      <span className="text-[9px] font-black text-black bg-[#FFE600] border border-black shadow-[1px_1px_0px_0px_#000] px-1.5 py-0.5 rounded-md flex items-center gap-0.5 animate-pulse">
                        <Flame className="w-2.5 h-2.5 fill-black" />
                        <span>{discountPct > 0 ? `-${discountPct}%` : 'FLASH'}</span>
                      </span>
                    ) : discountPct > 0 ? (
                      <span className="text-[9px] font-black text-black bg-[#FF70A6] border border-black shadow-[1px_1px_0px_0px_#000] px-1.5 py-0.5 rounded-md">
                        {isAr ? `-${discountPct}%` : `-${discountPct}%`}
                      </span>
                    ) : null}
                  </div>

                  <div>
                    {/* Image Holder with Ambient Glow */}
                    <div className="w-full h-24 sm:h-32 rounded-xl flex items-center justify-center relative overflow-hidden bg-gradient-to-b from-white to-[#F9F7F2] border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000] mb-2">
                      <ProductAmbientGlow product={p} size="sm" />
                      <div className="relative z-10 w-full h-full flex items-center justify-center p-2">
                        <ProductImage product={p} alt={isAr ? p.name_ar || p.name : p.name} size="sm" />
                      </div>
                    </div>

                    {/* Category & Rating */}
                    <div className="flex items-center justify-between gap-1 mb-1 text-[10px] font-bold">
                      <span className="text-[9px] font-black text-black bg-[#FFE600] border border-black px-1.5 py-0.5 rounded truncate max-w-[85px]">
                        {p.category}
                      </span>
                      <div className="flex items-center gap-0.5 text-black font-black font-mono">
                        <Star className="w-3 h-3 fill-[#FFE600] text-black stroke-[1.5]" />
                        <span>{(p.rating || 5.0).toFixed(1)}</span>
                      </div>
                    </div>

                    {/* Product Title */}
                    <h3 className="text-xs sm:text-sm font-black text-black line-clamp-2 leading-tight mb-2 min-h-[30px] sm:min-h-[34px] group-hover:text-neutral-700 transition-colors">
                      {isAr ? p.name_ar || p.name : p.name}
                    </h3>
                  </div>

                  {/* Pricing & 1-Tap Actions */}
                  <div className="pt-2 border-t border-black/15 mt-auto space-y-2">
                    <div className="flex items-baseline justify-between gap-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm sm:text-base font-black text-black font-mono">
                          {mounted ? formatPrice(ourPrice) : `$${ourPrice}`}
                        </span>
                        {durationStr && (
                          <span className="text-[10px] font-bold text-neutral-600 truncate">
                            /{durationStr}
                          </span>
                        )}
                      </div>
                      {marketPrice > ourPrice && (
                        <span className="text-[10px] font-bold text-neutral-400 line-through font-mono">
                          {mounted ? formatPrice(marketPrice) : `$${marketPrice}`}
                        </span>
                      )}
                    </div>

                    {/* Action Buttons: 1-Tap Direct Buy + Add to Cart */}
                    <div className="grid grid-cols-4 gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleDirectBuy(e, p)}
                        className="col-span-3 py-1.5 bg-[#06D6A0] hover:bg-[#05b888] text-black text-[11px] font-black border-2 border-black rounded-xl shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Zap className="w-3 h-3 fill-black stroke-[2]" />
                        <span>{isAr ? 'شراء فوري' : 'Buy'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleAddToCart(e, p)}
                        className={`col-span-1 py-1.5 border-2 border-black rounded-xl shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center cursor-pointer ${
                          isAdded ? 'bg-black text-white' : 'bg-white text-black hover:bg-[#FFE600]'
                        }`}
                        aria-label="Add to cart"
                      >
                        {isAdded ? (
                          <Check className="w-3.5 h-3.5 stroke-[3] text-[#FFE600]" />
                        ) : (
                          <ShoppingCart className="w-3.5 h-3.5 stroke-[2.5]" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Detailed 1-Column List View ── */
          <div className="space-y-2.5 sm:space-y-3">
            {filteredProducts.map((p) => {
              const marketPrice = p.market_price ?? p.marketPrice ?? 0;
              const ourPrice = p.our_price ?? p.ourPrice ?? p.price ?? 0;
              const discountPct = getSavingsPct(marketPrice, ourPrice);
              const durationStr = formatLocalizedDuration(p.subscription_duration, language);
              const warrantyStr = formatLocalizedWarranty(p.warranty_duration || p.subscription_duration, language);
              const isAdded = addedIds[p.id];

              return (
                <div
                  key={p.id}
                  onClick={() => router.push(`/product/${p.slug}`)}
                  className="group rounded-2xl p-3 sm:p-3.5 bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:shadow-[4.5px_4.5px_0px_0px_#000] hover:-translate-y-0.5 transition-all flex flex-col sm:flex-row items-center gap-3 cursor-pointer text-start"
                >
                  {/* Thumbnail */}
                  <div className="w-full sm:w-28 h-24 rounded-xl flex items-center justify-center relative overflow-hidden bg-gradient-to-b from-white to-[#F9F7F2] border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000] shrink-0">
                    <ProductAmbientGlow product={p} size="sm" />
                    <div className="relative z-10 w-full h-full flex items-center justify-center p-2">
                      <ProductImage product={p} alt={isAr ? p.name_ar || p.name : p.name} size="sm" />
                    </div>
                  </div>

                  {/* Info Details */}
                  <div className="flex-1 w-full space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-black text-black bg-[#FFE600] border border-black px-1.5 py-0.5 rounded shadow-[1px_1px_0px_0px_#000]">
                        {p.category}
                      </span>
                      {warrantyStr && (
                        <span className="text-[9px] font-black text-black bg-[#FFFDF9] border border-black px-1.5 py-0.5 rounded flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                          <span>{warrantyStr}</span>
                        </span>
                      )}
                      {discountPct > 0 && (
                        <span className="text-[9px] font-black text-black bg-[#FF70A6] border border-black px-1.5 py-0.5 rounded">
                          {isAr ? `-${discountPct}%` : `-${discountPct}%`}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xs sm:text-sm font-black text-black group-hover:text-neutral-800 transition-colors">
                      {isAr ? p.name_ar || p.name : p.name}
                    </h3>
                  </div>

                  {/* Pricing & Actions */}
                  <div className="w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/10">
                    <div className="text-start sm:text-end">
                      <div className="text-sm sm:text-base font-black text-black font-mono leading-none">
                        {mounted ? formatPrice(ourPrice) : `$${ourPrice}`}
                        {durationStr && <span className="text-xs font-bold text-neutral-600 ms-1">/{durationStr}</span>}
                      </div>
                      {marketPrice > ourPrice && (
                        <div className="text-[10px] font-bold text-neutral-400 line-through font-mono mt-0.5">
                          {mounted ? formatPrice(marketPrice) : `$${marketPrice}`}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleDirectBuy(e, p)}
                        className="px-3.5 py-1.5 bg-[#06D6A0] hover:bg-[#05b888] text-black text-xs font-black border-2 border-black rounded-xl shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5 fill-black stroke-[2]" />
                        <span>{isAr ? 'شراء فوري' : 'Buy Now'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleAddToCart(e, p)}
                        className={`p-1.5 border-2 border-black rounded-xl shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center cursor-pointer ${
                          isAdded ? 'bg-black text-white' : 'bg-white text-black hover:bg-[#FFE600]'
                        }`}
                        aria-label="Add to cart"
                      >
                        {isAdded ? (
                          <Check className="w-4 h-4 stroke-[3] text-[#FFE600]" />
                        ) : (
                          <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 9. Quick View Modal ── */}
      {quickViewProduct && (
        <ProductQuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}

      {/* ── 10. 1-Tap Instant Checkout Modal ── */}
      {directCheckoutProduct && (
        <SmartPaymentModal
          isOpen={!!directCheckoutProduct}
          onClose={() => setDirectCheckoutProduct(null)}
          items={[
            {
              id: String(directCheckoutProduct.id),
              product_id: String(directCheckoutProduct.id),
              product: directCheckoutProduct,
              quantity: 1,
            },
          ]}
          totalUsd={Number(directCheckoutProduct.our_price ?? directCheckoutProduct.ourPrice ?? directCheckoutProduct.price ?? 0)}
        />
      )}
    </div>
  );
}

