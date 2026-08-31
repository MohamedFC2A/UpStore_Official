'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { X, ShoppingBag, ArrowRight, Check, Loader2 } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { useCartStore } from '@/store/useCartStore';
import { useToastStore } from '@/store/useToastStore';
import { ProductImage } from '@/components/ProductImage';
import { ProductAmbientGlow } from '@/components/ui/ProductAmbientGlow';
import { StarRating } from '@/components/ui/SmartProductFire';
import { Product } from '@/components/ProductCard';
import { formatLocalizedDuration } from '@/utils/products';

interface ProductQuickViewModalProps {
  product: Product | null;
  onClose: () => void;
}

export function ProductQuickViewModal({ product, onClose }: ProductQuickViewModalProps) {
  const { language, formatPrice, translateProduct, mounted } = useLocale();
  const isAr = language === 'ar';
  const addToCart = useCartStore((state) => state.addToCart);

  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  if (!product) return null;

  const { name: baseName, duration: fallbackDuration } = translateProduct(product.slug, product.name, product.name_ar);
  const duration = product.subscription_duration || fallbackDuration;
  const ourPrice = product.ourPrice ?? product.our_price ?? product.price ?? 0;
  const marketPrice = product.marketPrice ?? product.market_price ?? (product.price ? product.price * 1.5 : 0);
  const description = isAr && product.description_ar ? product.description_ar : (product.description || '');

  const handleAddToCart = async () => {
    if (isAdding || isAdded) return;
    setIsAdding(true);
    try {
      await addToCart(product, 1);
      setIsAdded(true);
      useToastStore.getState().success(
        isAr ? 'تمت إضافة المنتج إلى السلة بنجاح!' : 'Product added to your cart!',
        baseName
      );
      setTimeout(() => {
        setIsAdded(false);
      }, 1500);
    } catch (err) {
      console.error('Failed to add to cart:', err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-white border-[3px] border-black rounded-3xl p-5 sm:p-7 shadow-[8px_8px_0px_0px_#000] relative overflow-hidden text-black"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 end-4 p-2 rounded-xl bg-black text-white hover:bg-neutral-800 transition-all cursor-pointer z-10"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
          
          {/* Thumbnail */}
          <div className="sm:col-span-5 flex items-center justify-center">
            <div className="w-full h-36 sm:h-48 rounded-2xl bg-[#FFFDF9] border-2 border-black flex items-center justify-center p-3 relative shadow-[3px_3px_0px_0px_#000] overflow-hidden group">
              <ProductAmbientGlow product={product} size="md" />
              <div className="relative z-10 w-full h-full flex items-center justify-center filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
                <ProductImage product={product} alt={baseName} size="lg" />
              </div>
              <span className="absolute top-2 start-2 px-2.5 py-0.5 rounded-md bg-[#FFE600] border border-black text-black text-[10px] font-black uppercase shadow-[1px_1px_0px_0px_#000] z-20">
                {product.category}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="sm:col-span-7 flex flex-col justify-between space-y-3 text-start">
            <div>
              <h3 className="text-base sm:text-xl font-black text-black mb-1.5 leading-snug">
                {baseName}
              </h3>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-2 text-xs">
                <div className="flex items-center gap-1" dir="ltr">
                  <StarRating rating={product.rating} size="xs" />
                  <span className="font-black text-black font-mono">{product.rating.toFixed(1)}</span>
                </div>
                <span className="text-neutral-400">•</span>
                <span className="text-neutral-600 font-black text-[11px]">{product.reviews.toLocaleString()} {isAr ? 'تقييم' : 'reviews'}</span>
              </div>

              <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed line-clamp-3 mb-2 font-bold">
                {description || (isAr ? 'حساب رسمي عالي الجودة مع دفع عالمي معتمد وضمان شامل كامل المدة.' : 'Official high-quality digital subscription with global payment and full-term warranty.')}
              </p>
            </div>

            {/* Price Row */}
            <div className="flex items-baseline gap-2 p-3 rounded-xl bg-[#FFFDF9] border-2 border-black shadow-[2px_2px_0px_0px_#000]">
              <span className="text-2xl font-black text-black font-mono leading-none">
                {mounted ? formatPrice(ourPrice) : `$${ourPrice}`}
              </span>
              {marketPrice > ourPrice && (
                <span className="text-xs sm:text-sm text-neutral-500 line-through font-mono font-bold">
                  {mounted ? formatPrice(marketPrice) : `$${marketPrice}`}
                </span>
              )}
              {duration && (
                <span className="text-xs text-neutral-600 font-black">
                  /{formatLocalizedDuration(duration, isAr ? 'ar' : 'en')}
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-1">
              <button
                onClick={handleAddToCart}
                disabled={isAdding || isAdded}
                className="flex-1 py-3 px-4 bg-[#06D6A0] hover:bg-[#05b385] text-black font-black text-xs uppercase tracking-wider rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-80"
              >
                {isAdding ? (
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                ) : isAdded ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{isAr ? 'تمت الإضافة' : 'Added'}</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
                    <span>{isAr ? 'أضف للسلة' : 'Add to Cart'}</span>
                  </>
                )}
              </button>

              <Link
                href={`/product/${product.slug}`}
                onClick={onClose}
                className="py-3 px-4 bg-white hover:bg-neutral-100 border-2 border-black text-black font-black text-xs rounded-xl shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-1 transition-all"
              >
                <span>{isAr ? 'التفاصيل' : 'Details'}</span>
                <ArrowRight className={`w-4 h-4 stroke-[2.5] ${isAr ? 'rotate-180' : ''}`} />
              </Link>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
