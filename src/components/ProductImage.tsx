'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Zap, Check } from 'lucide-react';

const BRAND_KEYWORD_MAP: Record<string, string> = {
  // Gemini / Google AI
  'gemini-advanced': 'gemini',
  gemini: 'gemini',
  جيميني: 'gemini',
  جيمناي: 'gemini',
  // ChatGPT Pro & Plus (Pro first!)
  'chatgpt-pro': 'chatgpt-pro',
  'chatgpt pro': 'chatgpt-pro',
  'برو الخارقة': 'chatgpt-pro',
  'chatgpt-plus': 'chatgpt',
  'chatgpt plus': 'chatgpt',
  chatgpt: 'chatgpt',
  openai: 'chatgpt',
  gpt: 'chatgpt',
  شات: 'chatgpt',
  claude: 'chatgpt',
  كلود: 'chatgpt',
  // Cursor AI
  'cursor-pro': 'cursor',
  'cursor ai': 'cursor',
  cursor: 'cursor',
  كورسور: 'cursor',
  // CapCut Pro
  'capcut-pro': 'capcut',
  'capcut pro': 'capcut',
  'كاب كات': 'capcut',
  كابكات: 'capcut',
  capcut: 'capcut',
  // Canva Pro
  'canva-pro': 'canva',
  'canva pro': 'canva',
  canva: 'canva',
  كانفا: 'canva',
  // Netflix
  netflix: 'netflix',
  نتفلكس: 'netflix',
  نتفليكس: 'netflix',
  netflex: 'netflix',
  // YouTube
  youtube: 'youtube',
  يوتيوب: 'youtube',
  yt: 'youtube',
  // Spotify
  spotify: 'spotify',
  سبوتيفاي: 'spotify',
  سبوتفاي: 'spotify',
  // VPN
  nordvpn: 'nordvpn',
  vpn: 'nordvpn',
  نورد: 'nordvpn',
  // Microsoft
  microsoft: 'microsoft',
  office: 'microsoft',
  مايكروسوفت: 'microsoft',
  اوفيس: 'microsoft',
  windows: 'microsoft',
  // Gaming
  xbox: 'xbox',
  اكس: 'xbox',
  gamepass: 'xbox',
};

const BRAND_DEFAULT_PNG_MAP: Record<string, string> = {
  gemini: '/images/products/gemini-advanced.png',
  canva: '/images/products/canva-pro.png',
  chatgpt: '/images/products/chatgpt-plus.png',
  'chatgpt-pro': '/images/products/chatgpt-pro.png',
  capcut: '/images/products/capcut-pro.png',
  cursor: '/images/products/cursor-pro.png',
};

export interface ProductImageProps {
  product: {
    slug?: string;
    name?: string;
    name_ar?: string;
    category?: string;
    image_url?: string | null;
    imageUrl?: string | null;
    brandColor?: string | null;
    brand_color?: string | null;
    icon_name?: string | null;
    Icon?: any;
  };
  alt?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
}

function ProductImageComponent({
  product,
  alt,
  className = '',
  size = 'md',
}: ProductImageProps) {
  const [hasError, setHasError] = useState(false);

  // Resolve search tokens across slug, name, and arabic name
  const searchText = `${product.slug || ''} ${product.name || ''} ${product.name_ar || ''}`.toLowerCase();
  
  let resolvedBrandKey = '';
  for (const [kw, brand] of Object.entries(BRAND_KEYWORD_MAP)) {
    if (searchText.includes(kw)) {
      resolvedBrandKey = brand;
      break;
    }
  }

  // 1. Resolve effective image URL: prioritize direct URL, fix legacy .svg, fallback to crisp brand PNG
  let effectiveImageUrl = product.image_url || product.imageUrl;
  if (effectiveImageUrl && typeof effectiveImageUrl === 'string') {
    if (effectiveImageUrl.endsWith('.svg')) {
      effectiveImageUrl = effectiveImageUrl.replace(/\.svg$/, '.png');
    }
  } else if (resolvedBrandKey && BRAND_DEFAULT_PNG_MAP[resolvedBrandKey]) {
    effectiveImageUrl = BRAND_DEFAULT_PNG_MAP[resolvedBrandKey];
  }

  React.useEffect(() => {
    setHasError(false);
  }, [effectiveImageUrl]);

  const displayName = alt || product.name_ar || product.name || 'Digital Item';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'U';

  const padClass = size === 'sm' ? 'p-0.5' : 'p-2.5 sm:p-3';

  // Fallback to official brand PNG if remote image errored
  const finalImageToRender = hasError && resolvedBrandKey && BRAND_DEFAULT_PNG_MAP[resolvedBrandKey]
    ? BRAND_DEFAULT_PNG_MAP[resolvedBrandKey]
    : effectiveImageUrl;

  const showImage = !!finalImageToRender && (!hasError || finalImageToRender !== effectiveImageUrl);

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center overflow-hidden rounded-xl bg-transparent transition-all duration-200 ${className}`}
    >
      <div className="relative z-10 flex items-center justify-center w-full h-full">
        {showImage ? (
          <div className={`relative w-full h-full flex items-center justify-center ${padClass}`}>
            <Image
              src={finalImageToRender!}
              alt={displayName}
              width={size === 'hero' ? 140 : size === 'lg' ? 100 : size === 'md' ? 84 : 40}
              height={size === 'hero' ? 140 : size === 'lg' ? 100 : size === 'md' ? 84 : 40}
              sizes="(max-width: 640px) 120px, 200px"
              onError={() => setHasError(true)}
              loading="lazy"
              decoding="async"
              unoptimized
              className="max-h-full max-w-full object-contain transition-all duration-300 group-hover:scale-105 select-none aspect-square drop-shadow-[0_4px_10px_rgba(0,0,0,0.18)]"
            />
          </div>
        ) : size === 'sm' ? (
          // Compact Smart Neubrutalism Badge
          <div className="w-full h-full rounded-xl bg-[#FFE600] border-2 border-black flex items-center justify-center shadow-[1.5px_1.5px_0px_0px_#000] select-none">
            <span className="font-black text-black text-sm uppercase">{initial}</span>
          </div>
        ) : (
          // Full Neubrutalism Product Badge
          <div className="flex flex-col items-center justify-center text-center p-2 select-none">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-[#FFE600] border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_#000] relative mb-1.5 transition-all">
              <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-black fill-black stroke-black stroke-[2.5]" />
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#06D6A0] border border-black flex items-center justify-center text-[9px] text-black font-bold">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
            </div>
            <span className="text-[10px] sm:text-xs font-black text-black uppercase tracking-wider line-clamp-1 max-w-[180px]">
              {displayName}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export const ProductImage = React.memo(ProductImageComponent);
