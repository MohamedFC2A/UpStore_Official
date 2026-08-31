'use client';

import React from 'react';
import Link from 'next/link';
import { Zap } from 'lucide-react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  href?: string;
  className?: string;
}

export function BrandLogo({
  size = 'md',
  showText = true,
  href = '/',
  className = '',
}: BrandLogoProps) {
  const sizeMap = {
    sm: {
      box: 'w-7 h-7 rounded-lg border-[2px]',
      icon: 'w-4 h-4',
      text: 'text-base sm:text-lg',
      badge: 'text-[9px] px-1 py-0.2',
      shadow: 'shadow-[1.5px_1.5px_0px_0px_#000]',
    },
    md: {
      box: 'w-8 h-8 sm:w-9 sm:h-9 rounded-xl border-[2px] sm:border-[2.5px]',
      icon: 'w-4.5 h-4.5 sm:w-5 sm:h-5',
      text: 'text-lg sm:text-xl md:text-2xl',
      badge: 'text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5',
      shadow: 'shadow-[2px_2px_0px_0px_#000] sm:shadow-[2.5px_2.5px_0px_0px_#000]',
    },
    lg: {
      box: 'w-10 h-10 sm:w-11 sm:h-11 rounded-2xl border-[2.5px] sm:border-[3px]',
      icon: 'w-5.5 h-5.5 sm:w-6 sm:h-6',
      text: 'text-xl sm:text-2xl md:text-3xl',
      badge: 'text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5',
      shadow: 'shadow-[3px_3px_0px_0px_#000] sm:shadow-[3.5px_3.5px_0px_0px_#000]',
    },
    xl: {
      box: 'w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-[3px] sm:border-[3.5px]',
      icon: 'w-7 h-7 sm:w-8 sm:h-8',
      text: 'text-2xl sm:text-3xl md:text-4xl',
      badge: 'text-xs px-2 py-1',
      shadow: 'shadow-[3.5px_3.5px_0px_0px_#000] sm:shadow-[4px_4px_0px_0px_#000]',
    },
  };

  const current = sizeMap[size];

  const LogoContent = (
    <div 
      dir="ltr" 
      suppressHydrationWarning
      className={`inline-flex items-center gap-1.5 sm:gap-2.5 group select-none shrink-0 ${className}`}
    >
      {/* ── Iconic Neubrutal Brand Emblem ── */}
      <div 
        suppressHydrationWarning
        className={`${current.box} ${current.shadow} bg-[#FFE600] border-black flex items-center justify-center text-black shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:rotate-[-3deg] active:translate-y-0 active:rotate-0`}
      >
        <Zap className={`${current.icon} fill-black stroke-black stroke-[2.5]`} />
      </div>

      {/* ── Brand Typography Wordmark ── */}
      {showText && (
        <div className="flex items-center gap-1 sm:gap-1.5" dir="ltr">
          <span className={`${current.text} font-black tracking-tight text-black flex items-center leading-none`}>
            Up<span className="text-black">Store</span>
          </span>
          <span 
            className={`${current.badge} hidden min-[360px]:inline-flex rounded-md bg-[#06D6A0] text-black font-black border sm:border-2 border-black shadow-[1px_1px_0px_0px_#000] uppercase tracking-wider leading-none`}
          >
            .one
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center" aria-label="UpStore Home" dir="ltr">
        {LogoContent}
      </Link>
    );
  }

  return LogoContent;
}

export default BrandLogo;
