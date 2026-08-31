'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, ShoppingBag, ArrowRight, Loader2, Zap, CheckCircle2, Flame, Users } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { useCartStore } from '@/store/useCartStore';
import { useToastStore } from '@/store/useToastStore';
import { ProductImage } from '@/components/ProductImage';
import { Product } from '@/components/ProductCard';
import { getActiveFlashDealSlugFromProducts, formatLocalizedDuration } from '@/utils/products';

interface FlashDealsCornerProps {
  products: Product[];
}

function FlashDealsCornerComponent({ products }: FlashDealsCornerProps) {
  const router = useRouter();
  const { language, formatPrice, mounted } = useLocale();
  const addToCart = useCartStore((state) => state.addToCart);
  
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [activeDeal, setActiveDeal] = useState<Product | null>(() => {
    if (!products || products.length === 0) return null;
    const activeSlug = getActiveFlashDealSlugFromProducts(products);
    const currentDeal = products.find(
      (p) => 
        (p.slug || '').toLowerCase() === activeSlug.toLowerCase() ||
        (p.slug === 'chatgpt-plus-full-access' && activeSlug === 'chatgpt-plus-shared-1-month') ||
        (p.slug === 'chatgpt-plus-shared-1-month' && activeSlug === 'chatgpt-plus-full-access')
    );
    const resolved = (currentDeal && currentDeal.stock > 0) 
      ? currentDeal 
      : products.find(p => p.stock > 0) || currentDeal || products[0];
    return resolved || null;
  });

  // Sync active deal when products array updates or loads
  useEffect(() => {
    if (!products || products.length === 0) return;
    const activeSlug = getActiveFlashDealSlugFromProducts(products);
    const currentDeal = products.find(
      (p) => 
        (p.slug || '').toLowerCase() === activeSlug.toLowerCase() ||
        (p.slug === 'chatgpt-plus-full-access' && activeSlug === 'chatgpt-plus-shared-1-month') ||
        (p.slug === 'chatgpt-plus-shared-1-month' && activeSlug === 'chatgpt-plus-full-access') ||
        (p.slug === 'netflix' && activeSlug === 'netflix-premium-4k-1-month') ||
        (p.slug === 'netflix-premium-4k-1-month' && activeSlug === 'netflix')
    );
    const resolved = (currentDeal && currentDeal.stock > 0) 
      ? currentDeal 
      : products.find(p => p.stock > 0) || currentDeal || products[0];
    if (resolved) {
      setActiveDeal(resolved);
    }
  }, [products]);

  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 28, seconds: 45 });
  // Realistic live shoppers count (fluctuates naturally between 4 to 8 viewers)
  const [viewersCount, setViewersCount] = useState(() => Math.floor(Math.random() * 4) + 4);

  const isAr = language === 'ar';

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 23, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const vInterval = setInterval(() => {
      // Natural subtle variation between 3 and 9 concurrent viewers
      setViewersCount(prev => Math.max(3, Math.min(9, prev + (Math.random() > 0.5 ? 1 : -1))));
    }, 15000);
    return () => clearInterval(vInterval);
  }, []);

  if (!activeDeal) return null;

  const translatedName = isAr && activeDeal.name_ar ? activeDeal.name_ar : activeDeal.name;
  const translatedDesc = isAr && activeDeal.description_ar 
    ? activeDeal.description_ar 
    : (activeDeal.description || (isAr ? 'عرض اليوم الحصري بأعلى خصم ممكن مع دفع عالمي معتمد وضمان شامل كامل المدة.' : 'Exclusive flash deal with maximum savings, global secure checkout and full-term warranty.'));

  const marketPrice = Number(activeDeal.marketPrice ?? activeDeal.market_price ?? 0);
  const ourPrice = Number(activeDeal.ourPrice ?? activeDeal.our_price ?? 0);
  
  // Flash Deal is ALWAYS 70% OFF the original real market price (secret psychological discount)
  const displayPrice = (activeDeal.is_flash_deal && activeDeal.flash_deal_price && Number(activeDeal.flash_deal_price) > 0)
    ? Number(activeDeal.flash_deal_price)
    : (marketPrice > 0 ? Math.round(marketPrice * 0.30 * 100) / 100 : (ourPrice > 0 ? ourPrice : 9.99));

  // The real original market price is aligned so it always represents a 70% discount
  const originalStrikePrice = marketPrice > displayPrice
    ? marketPrice
    : Math.round((displayPrice / 0.30) * 100) / 100;

  const savingsPct = 70;

  const handleAddToCart = async () => {
    if (isAdding) return;
    setIsAdding(true);
    try {
      await addToCart({ ...activeDeal, our_price: displayPrice, ourPrice: displayPrice }, 1);
      setIsAdded(true);
      useToastStore.getState().success(
        isAr ? 'تمت إضافة العرض إلى سلة المشتريات' : 'Flash deal added to your cart',
        translatedName
      );
      setTimeout(() => setIsAdded(false), 2000);
    } catch (err) {
      console.error('Failed to add to cart:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (isAdding) return;
    setIsAdding(true);
    try {
      await addToCart({ ...activeDeal, our_price: displayPrice, ourPrice: displayPrice }, 1);
      router.push('/cart');
    } catch (err) {
      console.error('Failed to buy now:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const maxStock = activeDeal.maxStock ?? activeDeal.max_stock ?? 100;
  const currentStock = activeDeal.stock ?? 12;
  const stockPct = Math.max(12, Math.min(94, Math.round((currentStock / maxStock) * 100)));

  return (
    <div 
      className="w-full relative overflow-hidden rounded-2xl sm:rounded-3xl border-[2.5px] border-black bg-[#FFE600] p-3.5 sm:p-7 shadow-[4px_4px_0px_0px_#000] sm:shadow-[6px_6px_0px_0px_#000] text-black select-none"
    >
      {/* ── Top Header Strip ── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 pb-3 sm:pb-4 mb-4 sm:mb-5 border-b-2 border-black">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border-2 border-black flex items-center justify-center text-black shadow-[2px_2px_0px_0px_#000]">
            <Flame className="w-5 h-5 text-red-600 fill-red-600" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-black uppercase tracking-wider flex items-center gap-2">
              <span>{isAr ? 'صيد اليوم • عروض الفلاش' : 'Today\'s Catch • Flash Deals'}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-lg bg-[#FF70A6] text-black border-2 border-black font-black shadow-[1.5px_1.5px_0px_0px_#000]">
                -{savingsPct}%
              </span>
            </h3>
          </div>
        </div>

        {/* Real-Time Countdown Strip & Live Viewers */}
        <div className="flex items-center gap-3">
          {/* Live Viewers Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_0px_#000] text-xs text-black font-black">
            <span className="w-2 h-2 rounded-full bg-[#06D6A0] border border-black" />
            <Users className="w-4 h-4 text-black stroke-[2.5]" />
            <span>{viewersCount} {isAr ? 'يشاهدون الآن' : 'watching now'}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 text-xs text-black font-black">
              <Clock className="w-4 h-4 text-black stroke-[2.5]" />
              <span className="hidden sm:inline">{isAr ? 'ينتهي خلال:' : 'Ends in:'}</span>
            </div>

            <div className="flex items-center gap-1 font-mono shrink-0" dir="ltr">
              <div className="flex items-center justify-center bg-white border-2 border-black rounded-lg px-2 py-1 min-w-[32px] shadow-[2px_2px_0px_0px_#000]">
                <span className="text-xs sm:text-sm font-black text-black">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
              </div>
              <span className="text-black font-black text-xs">:</span>

              <div className="flex items-center justify-center bg-white border-2 border-black rounded-lg px-2 py-1 min-w-[32px] shadow-[2px_2px_0px_0px_#000]">
                <span className="text-xs sm:text-sm font-black text-black">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
              </div>
              <span className="text-black font-black text-xs">:</span>

              <div className="flex items-center justify-center bg-[#FF70A6] border-2 border-black rounded-lg px-2 py-1 min-w-[32px] shadow-[2px_2px_0px_0px_#000]">
                <span className="text-xs sm:text-sm font-black text-black">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Structure ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-7 items-center">
        
        {/* Column 1: Artwork & Product Thumbnail (4 cols) */}
        <div className="md:col-span-4 flex items-center justify-center">
          <div className="w-full max-w-[240px] md:max-w-full h-36 sm:h-44 rounded-2xl border-2 border-black bg-white p-3 relative flex items-center justify-center shadow-[4px_4px_0px_0px_#000] overflow-hidden group">
            <ProductImage
              product={activeDeal}
              alt={translatedName}
              size="md"
            />
            <span className="absolute top-2 start-2 px-2.5 py-0.5 rounded-md bg-[#06D6A0] border-2 border-black text-black text-[10px] font-black uppercase shadow-[1.5px_1.5px_0px_0px_#000]">
              {activeDeal.category || (isAr ? 'اشتراك رقمي' : 'Subscription')}
            </span>
          </div>
        </div>

        {/* Column 2: Offer Details, Pricing & Actions (8 cols) */}
        <div className="md:col-span-8 flex flex-col justify-between space-y-4 text-start">
          
          <div>
            {/* Product Title */}
            <h2 className="text-lg sm:text-2xl font-black text-black mb-1.5 leading-tight">
              {translatedName}
            </h2>

            {/* Product Description */}
            <p className="text-xs sm:text-sm text-neutral-800 leading-relaxed font-bold line-clamp-2 max-w-xl">
              {translatedDesc}
            </p>
          </div>

          {/* Pricing & Stock Progress Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000]">
            
            {/* Price Box */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-black font-mono leading-none tracking-tight">
                {mounted ? formatPrice(displayPrice) : `$${displayPrice}`}
              </span>
              {originalStrikePrice > displayPrice && (
                <span className="text-xs sm:text-sm text-neutral-500 line-through font-mono font-bold">
                  {mounted ? formatPrice(originalStrikePrice) : `$${originalStrikePrice}`}
                </span>
              )}
              {activeDeal.subscription_duration && (
                <span className="text-xs text-neutral-800 font-black">
                  /{formatLocalizedDuration(activeDeal.subscription_duration, isAr ? 'ar' : 'en')}
                </span>
              )}
            </div>

            {/* Stock Progress Indicator */}
            <div className="flex items-center gap-2.5 text-xs text-black font-black">
              <span className="flex items-center gap-1">
                <Flame className="w-4 h-4 text-red-600 fill-red-600" />
                <span>{isAr ? `متبقي ${currentStock} فقط` : `Only ${currentStock} left`}</span>
              </span>
              <div className="w-24 sm:w-32 h-3 bg-white border-2 border-black rounded-full overflow-hidden p-[1px] shadow-[1px_1px_0px_0px_#000]">
                <div className="h-full bg-[#FF70A6] rounded-full transition-all duration-500" style={{ width: `${stockPct}%` }} />
              </div>
            </div>

          </div>

          {/* Action CTAs */}
          {activeDeal.stock === 0 ? (
            <div className="w-full py-3.5 bg-black text-white font-black text-xs uppercase tracking-wider rounded-xl text-center border-2 border-black">
              {isAr ? 'نفدت الكمية المخصصة لهذا العرض' : 'Sold out'}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-1">
              <button 
                onClick={handleBuyNow}
                disabled={isAdding}
                className="w-full sm:flex-1 py-3 sm:py-3.5 px-4 bg-[#06D6A0] hover:bg-[#05b385] text-black font-black text-xs sm:text-sm rounded-xl uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-80 transition-all"
              >
                <Zap className="w-4 h-4 stroke-[2.5]" />
                <span>{isAr ? 'شراء فوري وتفعيل آلي' : 'Instant Buy & Activate'}</span>
                <ArrowRight className={`w-4 h-4 stroke-[2.5] ${isAr ? 'rotate-180' : ''}`} />
              </button>
              
              <button 
                onClick={handleAddToCart}
                disabled={isAdding || isAdded}
                className="w-full sm:w-auto py-3 sm:py-3.5 px-5 sm:px-6 bg-white hover:bg-neutral-100 text-black border-2 border-black font-black text-xs sm:text-sm rounded-xl shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer disabled:opacity-80 flex items-center justify-center gap-2 transition-all"
              >
                {isAdding ? (
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                ) : isAdded ? (
                  <span className="text-black flex items-center justify-center gap-1 font-black">
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>{isAr ? 'تمت الإضافة' : 'Added'}</span>
                  </span>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
                    <span>{isAr ? 'أضف للسلة' : 'Add to Cart'}</span>
                  </>
                )}
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

export const FlashDealsCorner = React.memo(FlashDealsCornerComponent);
