'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { createClient } from '@/utils/supabase/client';
import { normalizeProductRecord, getActiveFlashDealSlugFromProducts, fetchLiveProducts } from '@/utils/products';
import { ProductImage } from '@/components/ProductImage';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

export function LiveActivityPopups() {
  const pathname = usePathname();
  const { language, formatPrice, mounted } = useLocale();
  const [products, setProducts] = useState<any[]>([]);
  const [activePopup, setActivePopup] = useState<any | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const isAr = language === 'ar';
  const isExcludedPage = pathname?.startsWith('/auth') || pathname?.startsWith('/ad');

  // 1. Fetch available in-stock products on mount using shared cache
  useEffect(() => {
    if (isExcludedPage) return;
    async function loadProducts() {
      try {
        const supabase = createClient();
        const { data, error } = await fetchLiveProducts(supabase);
        if (data && !error) {
          setProducts(data.filter((p: any) => (p.stock || 0) > 0));
        }
      } catch (err) {
        console.error('Failed to load products for live popups:', err);
      }
    }
    loadProducts();
  }, [isExcludedPage]);

  // 2. Subscribe to Supabase Realtime for 'live_sales' table INSERT events
  useEffect(() => {
    if (isExcludedPage) return;
    const supabase = createClient();

    const channel = supabase
      .channel('public:live_sales')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_sales' },
        async (payload: any) => {
          const newSale = payload.new;
          if (!newSale) return;

          const prodId = newSale.product_id;
          let targetProduct = products.find((p) => p.id === prodId);

          if (!targetProduct) {
            const { data } = await supabase
              .from('products')
              .select('*')
              .eq('id', prodId)
              .single();
            if (data) {
              targetProduct = normalizeProductRecord(data);
            }
          }

          if (!targetProduct) return;

          const activeSlug = getActiveFlashDealSlugFromProducts(products.length > 0 ? products : [targetProduct]);
          const normalized = normalizeProductRecord(targetProduct, activeSlug);
          const formattedPrice = formatPrice(normalized.our_price);

          const buyerLocation = isAr
            ? `${newSale.buyer_city_ar || 'الرياض'}`
            : `${newSale.buyer_city_en || 'Riyadh'}`;

          const productName = isAr
            ? (normalized.name_ar || normalized.name)
            : normalized.name;

          setActivePopup({
            id: newSale.id || String(Date.now()),
            buyerName: newSale.buyer_name || (isAr ? 'عميل موثق' : 'Verified Buyer'),
            buyerLocation,
            productName,
            timeAgo: isAr ? 'للتو' : 'Just now',
            priceText: formattedPrice,
            slug: normalized.slug,
            imageUrl: normalized.image_url,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [products, isAr, formatPrice, isExcludedPage]);

  // 3. Periodic safe trigger loop
  useEffect(() => {
    if (isExcludedPage) return;

    const triggerApi = async () => {
      try {
        await fetch('/api/live-sale/trigger', { method: 'POST' });
      } catch {
        // Ignored
      }
    };

    // First safe trigger after 18s, then relaxed intervals (80s - 120s)
    const initialTimer = setTimeout(() => {
      triggerApi();
      const interval = setInterval(() => {
        triggerApi();
      }, 85000 + Math.random() * 35000);

      return () => clearInterval(interval);
    }, 18000);

    return () => {
      clearTimeout(initialTimer);
    };
  }, [isExcludedPage]);

  // 4. Auto-dismiss popup after 6.5s unless hovered
  useEffect(() => {
    if (!activePopup || isHovered) return;
    const hideTimer = setTimeout(() => {
      setActivePopup(null);
    }, 6500);
    return () => clearTimeout(hideTimer);
  }, [activePopup, isHovered]);

  if (!mounted || isExcludedPage) return null;

  return (
    <AnimatePresence>
      {activePopup && (
        <motion.div
          key={activePopup.id}
          initial={{ opacity: 0, y: 15, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.94, transition: { duration: 0.15 } }}
          transition={{ type: 'spring', stiffness: 350, damping: 26 }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`hidden md:block fixed z-30 ${
            // In RTL (Arabic), end is left side, perfectly opposite from HyperAdaptiveHUD (start = right)
            'end-5 bottom-5'
          } w-auto max-w-[310px] rounded-xl border-2 border-black bg-white shadow-[3px_3px_0px_0px_#000] p-2.5 select-none`}
        >
          {/* Dismiss button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setActivePopup(null);
            }}
            className="absolute top-1.5 end-1.5 w-5 h-5 rounded-md bg-neutral-100 hover:bg-[#FF70A6] text-black border border-black flex items-center justify-center transition-all cursor-pointer z-20 shadow-[0.5px_0.5px_0px_0px_#000] active:scale-95"
            aria-label="Dismiss"
          >
            <X className="w-3 h-3 stroke-[2.5]" />
          </button>

          {/* Clickable link to product */}
          <Link
            href={`/product/${activePopup.slug}`}
            className="flex items-center gap-2.5 w-full text-start group cursor-pointer"
          >
            {/* Product Image Thumbnail */}
            <div className="w-9 h-9 rounded-lg bg-[#FFFDF9] border border-black p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-[1px_1px_0px_0px_#000]">
              <ProductImage
                product={{
                  slug: activePopup.slug,
                  name: activePopup.productName,
                  image_url: activePopup.imageUrl,
                  imageUrl: activePopup.imageUrl,
                }}
                alt={activePopup.productName || 'Product'}
                size="sm"
              />
            </div>

            {/* Content Details */}
            <div className="flex-1 min-w-0 pe-3.5">
              {/* Row 1: Buyer Name & Location + Time */}
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="text-[10px] font-black text-black truncate flex items-center gap-1">
                  <span>{activePopup.buyerName}</span>
                  <span className="text-neutral-500 text-[9px] font-bold truncate">• {activePopup.buyerLocation}</span>
                </span>
                <span className="text-[8px] font-black font-mono text-black bg-[#FFE600] border border-black px-1 py-0.1 rounded shadow-[0.5px_0.5px_0px_0px_#000] shrink-0">
                  {activePopup.timeAgo}
                </span>
              </div>

              {/* Row 2: Product Name & Price */}
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[11px] font-black text-black truncate group-hover:text-[#4361EE] transition-colors leading-tight">
                  {activePopup.productName}
                </span>
                <span className="text-[10px] font-black text-black font-mono bg-[#06D6A0] border border-black px-1.5 py-0.2 rounded shrink-0 shadow-[0.5px_0.5px_0px_0px_#000]" dir="ltr">
                  {activePopup.priceText}
                </span>
              </div>
            </div>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
