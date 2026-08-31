'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Star, Zap, Loader2, Check, ShoppingBag, Sparkles, Flame
} from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { useCartStore } from '@/store/useCartStore';
import { useToastStore } from '@/store/useToastStore';
import { useHyperAdaptiveStore } from '@/store/useHyperAdaptiveStore';
import { ProductImage } from '@/components/ProductImage';
import { ProductAmbientGlow } from '@/components/ui/ProductAmbientGlow';
import { formatLocalizedDuration } from '@/utils/products';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Product {
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
  price?: number;
  price_egp?: number;
  price_sar?: number;
  priceEgp?: number;
  priceSar?: number;
  rating: number;
  reviews: number;
  stock: number;
  maxStock?: number;
  max_stock?: number;
  brandColor?: string;
  brand_color?: string;
  image_url?: string;
  imageUrl?: string;
  subscription_duration?: string;
  subscriptionDuration?: string;
  warranty_duration?: string;
  warrantyDuration?: string;
  advantages?: string[];
  advantages_ar?: string[];
  description?: string;
  description_ar?: string;
  name_ar?: string;
  attributes?: any[];
  is_flash_deal?: boolean;
  isFlashDeal?: boolean;
  flash_deal_price?: number;
  flash_deal_duration_hours?: number;
}

interface ProductCardProps {
  product: Product;
  variant?: 'grid' | 'carousel' | 'related';
  compact?: boolean;
  onQuickView?: (product: Product) => void;
}

function getSavingsPct(market: number, ours: number) {
  if (!market || market <= ours) return 0;
  return Math.round(((market - ours) / market) * 100);
}

function ProductCardComponent({ product, variant = 'grid' }: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const router = useRouter();

  const { language, formatPrice, translateProduct, t, mounted } = useLocale();
  const addToCart = useCartStore((state) => state.addToCart);
  const isAiRecommended = useHyperAdaptiveStore(
    React.useCallback((state) => state.recommendedSlugs.includes(product.slug), [product.slug])
  );

  // Resolve prices
  const marketPrice = product.marketPrice ?? product.market_price ?? (product.price ? product.price * 1.5 : 0);
  const ourPrice = product.ourPrice ?? product.our_price ?? product.price ?? 0;
  const maxStock = product.maxStock ?? product.max_stock ?? 100;
  const currentStock = typeof product.stock === 'number' && product.stock > 0 ? product.stock : 85;
  const stockPct = Math.round((currentStock / maxStock) * 100);
  const isOutOfStock = product.stock === 0 && (product as any).is_archived;
  const isLowStock = !isOutOfStock && stockPct < 25;
  const isFlash = product.is_flash_deal || product.isFlashDeal;

  // Resolve titles and duration
  const { name: baseName, duration: fallbackDuration } = translateProduct(product.slug, product.name, product.name_ar);
  const duration = product.subscription_duration || fallbackDuration;
  const displayName = language === 'ar' ? (product.name_ar || baseName) : baseName;

  const pct = getSavingsPct(marketPrice, ourPrice);

  const isRelated = variant === 'related';
  const isCarousel = variant === 'carousel';
  const outerWidthClass = isCarousel ? 'min-w-[200px] max-w-[240px] flex-shrink-0' : 'w-full';

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAdding || isAdded || isOutOfStock) return;
    setIsAdding(true);
    try {
      await addToCart(product, 1);
      setIsAdded(true);
      useToastStore.getState().success(
        language === 'ar' ? 'تمت إضافة المنتج إلى السلة بنجاح!' : 'Product added to your cart!',
        displayName
      );
      setTimeout(() => setIsAdded(false), 2000);
    } catch (err) {
      console.error('Failed to add to cart:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleCardClick = () => {
    try {
      useHyperAdaptiveStore.getState().recordProductView(product.slug, product.category, ourPrice);
    } catch {}
    router.push(`/product/${product.slug || product.id}`);
  };

  const getCategoryLabel = (cat: string) => {
    if (!mounted) return cat;
    if (cat === 'Subscriptions') return t('cat_Subscriptions');
    if (cat === 'VPNs & Security') return t('cat_VPNs');
    if (cat === 'Software') return t('cat_Software');
    if (cat === 'Accounts') return t('cat_Accounts');
    if (cat === 'Game Keys') return t('cat_GameKeys');
    return cat;
  };

  return (
    <div
      data-product-slug={product.slug}
      data-product-category={product.category}
      onClick={handleCardClick}
      className={`group relative rounded-2xl p-2.5 sm:p-3.5 bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:shadow-[4.5px_4.5px_0px_0px_#000] hover:-translate-y-0.5 transition-all flex flex-col justify-between cursor-pointer overflow-hidden text-start ${outerWidthClass}`}
    >
      {/* ── Badges ── */}
      <div className="absolute top-2 end-2 z-20 flex flex-col items-end gap-1 select-none">
        {isAiRecommended && !isOutOfStock && (
          <span className="text-[9px] font-black text-black bg-[#FFE600] border border-black shadow-[1px_1px_0px_0px_#000] px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
            <Sparkles className="w-2.5 h-2.5 fill-black" />
            <span>AI</span>
          </span>
        )}
        {isOutOfStock ? (
          <span className="text-[9px] font-black text-white bg-black border border-black shadow-[1px_1px_0px_0px_#FF70A6] px-1.5 py-0.5 rounded-md">
            {language === 'ar' ? 'نفذت' : 'Out'}
          </span>
        ) : isLowStock ? (
          <span className="text-[9px] font-black text-black bg-[#FFE600] border border-black shadow-[1px_1px_0px_0px_#000] px-1.5 py-0.5 rounded-md animate-pulse">
            {language === 'ar' ? 'آخر قطع' : 'Few Left'}
          </span>
        ) : isFlash ? (
          <span className="text-[9px] font-black text-black bg-[#FFE600] border border-black shadow-[1px_1px_0px_0px_#000] px-1.5 py-0.5 rounded-md flex items-center gap-0.5 animate-pulse">
            <Flame className="w-2.5 h-2.5 fill-black" />
            <span>{pct > 0 ? `-${pct}%` : 'FLASH'}</span>
          </span>
        ) : pct > 0 ? (
          <span className="text-[9px] font-black text-black bg-[#FF70A6] border border-black shadow-[1px_1px_0px_0px_#000] px-1.5 py-0.5 rounded-md">
            -{pct}%
          </span>
        ) : null}
      </div>

      <div>
        {/* ── Product Image ── */}
        <div className="w-full h-24 sm:h-32 rounded-xl flex items-center justify-center relative overflow-hidden bg-gradient-to-b from-white to-[#F9F7F2] border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000] mb-2">
          <ProductAmbientGlow product={product} size="sm" />
          <div className="relative z-10 w-full h-full flex items-center justify-center p-2">
            <ProductImage product={product} alt={baseName} size="sm" />
          </div>
        </div>

        {/* ── Category & Rating Row ── */}
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <span className="text-[10px] font-black text-black bg-[#FFE600] border border-black px-2 py-0.5 rounded-md truncate">
            {getCategoryLabel(product.category)}
          </span>
          <div className="flex items-center gap-1 text-black font-black font-mono shrink-0 bg-neutral-100 border border-black/20 px-1.5 py-0.5 rounded-md">
            <Star className="w-3 h-3 fill-[#FFE600] text-black stroke-[1.5]" />
            <span className="text-[10px]">{product.rating ? Number(product.rating).toFixed(1) : '4.9'}</span>
          </div>
        </div>

        {/* ── Product Title ── */}
        <h3 className="text-xs sm:text-sm font-black text-black line-clamp-2 leading-tight mb-2 min-h-[32px] sm:min-h-[36px] group-hover:text-neutral-700 transition-colors">
          {displayName}
        </h3>
      </div>

      {/* ── Pricing & Actions ── */}
      <div className="pt-2 border-t border-black/15 mt-auto space-y-2">
        <div className="flex items-baseline justify-between gap-1">
          <div className="flex items-baseline gap-1 min-w-0">
            <span className="text-xs sm:text-sm font-black text-black font-mono">
              {mounted ? formatPrice(ourPrice) : `$${ourPrice}`}
            </span>
            {duration && (
              <span className="text-[9px] font-bold text-neutral-600 truncate shrink-0">
                /{formatLocalizedDuration(duration, language === 'ar' ? 'ar' : 'en')}
              </span>
            )}
          </div>
          {marketPrice > ourPrice && (
            <span className="text-[9px] font-bold text-neutral-400 line-through font-mono shrink-0">
              {mounted ? formatPrice(marketPrice) : `$${marketPrice}`}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        {isRelated ? (
          <Link
            href={`/product/${product.slug || product.id}`}
            onClick={(e) => e.stopPropagation()}
            className="w-full py-1.5 bg-black text-white font-black text-[11px] uppercase tracking-wider rounded-xl text-center border-2 border-black shadow-[1.5px_1.5px_0px_0px_#FFE600] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-1 transition-all"
          >
            {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
          </Link>
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            <Link
              href={`/product/${product.slug || product.id}`}
              onClick={(e) => e.stopPropagation()}
              className="col-span-3 py-2 sm:py-1.5 bg-[#06D6A0] hover:bg-[#05b888] text-black text-[11px] sm:text-xs font-black border-2 border-black rounded-xl shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-1"
            >
              <Zap className="w-3.5 h-3.5 fill-black stroke-[2]" />
              <span>{mounted ? (language === 'ar' ? 'شراء فوري' : 'Buy Now') : 'Buy Now'}</span>
            </Link>

            <button
              onClick={handleAddToCart}
              disabled={isAdding || isAdded || isOutOfStock}
              className={`col-span-1 py-2 sm:py-1.5 border-2 border-black rounded-xl shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center cursor-pointer disabled:opacity-70 ${
                isAdded ? 'bg-black text-[#FFE600]' : isOutOfStock ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed' : 'bg-white hover:bg-neutral-100 text-black'
              }`}
              aria-label={language === 'ar' ? 'إضافة إلى السلة' : 'Add to Cart'}
            >
              {isAdding ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
              ) : isAdded ? (
                <Check className="w-3.5 h-3.5 stroke-[3] text-[#FFE600]" />
              ) : (
                <ShoppingBag className="w-3.5 h-3.5 text-black stroke-[2.5]" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export const ProductCard = React.memo(ProductCardComponent);
