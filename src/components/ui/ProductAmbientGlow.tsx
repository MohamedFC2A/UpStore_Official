'use client';

import React, { useState, useEffect, useMemo } from 'react';

// ─── Color Helper Utilities ──────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    return {
      r: parseInt(cleanHex[0] + cleanHex[0], 16),
      g: parseInt(cleanHex[1] + cleanHex[1], 16),
      b: parseInt(cleanHex[2] + cleanHex[2], 16),
    };
  }
  if (cleanHex.length === 6) {
    return {
      r: parseInt(cleanHex.slice(0, 2), 16),
      g: parseInt(cleanHex.slice(2, 4), 16),
      b: parseInt(cleanHex.slice(4, 6), 16),
    };
  }
  return null;
}

// ─── High-Saturation, Luminous Brand Aura Palette ────────────────────────────
// STRICT ZERO DULL/DARK COLORS: Pure vibrant, saturated, glowing brand hues.

interface BrandColorConfig {
  primary: string;
  secondary: string;
  accent?: string;
}

const BRAND_AURA_CONFIGS: Record<string, BrandColorConfig> = {
  // ChatGPT Pro (Ultra Gold & Electric Amber Glow)
  'chatgpt-pro': {
    primary: '#F59E0B',
    secondary: '#D97706',
    accent: '#FDE68A',
  },
  // ChatGPT Plus & Standard (Vibrant Electric Emerald Glow)
  chatgpt: {
    primary: '#10B981',
    secondary: '#059669',
    accent: '#6EE7B7',
  },
  openai: {
    primary: '#10B981',
    secondary: '#059669',
    accent: '#6EE7B7',
  },
  // Cursor AI (Electric Indigo & Cyber Neon Cyan Glow)
  cursor: {
    primary: '#6366F1',
    secondary: '#00D2FF',
    accent: '#A5B4FC',
  },
  // CapCut Pro (High-Saturation Neon Cyan & Turquoise Glow)
  capcut: {
    primary: '#00F0FF',
    secondary: '#06B6D4',
    accent: '#67E8F9',
  },
  // Canva Pro (Electric Cyan into Vivid Royal Purple Glow)
  canva: {
    primary: '#7033FF',
    secondary: '#00D8D6',
    accent: '#C084FC',
  },
  // Google Gemini (Vivid Amethyst & Electric Royal Blue Glow)
  gemini: {
    primary: '#9D4EDF',
    secondary: '#3B82F6',
    accent: '#E879F9',
  },
  // Claude AI (Saturated Sunset Coral & Warm Amber Glow)
  claude: {
    primary: '#F97316',
    secondary: '#EA580C',
    accent: '#FDBA74',
  },
  // Netflix (Vibrant Pure Crimson Glow)
  netflix: {
    primary: '#E50914',
    secondary: '#B91C1C',
    accent: '#F87171',
  },
  // YouTube (Saturated Scarlet Glow)
  youtube: {
    primary: '#FF0000',
    secondary: '#DC2626',
    accent: '#FCA5A5',
  },
  // Spotify (Vivid Neon Green Glow)
  spotify: {
    primary: '#1DB954',
    secondary: '#16A34A',
    accent: '#86EFAC',
  },
  // Shahid VIP (Saturated Emerald Cyan Glow)
  shahid: {
    primary: '#06D6A0',
    secondary: '#0D9488',
    accent: '#5EEAD4',
  },
  // Xbox & Game Pass (Vibrant Neon Xbox Green Glow)
  xbox: {
    primary: '#107C10',
    secondary: '#15803D',
    accent: '#4ADE80',
  },
  // PlayStation (Electric Cobalt Blue Glow)
  playstation: {
    primary: '#006FCD',
    secondary: '#1D4ED8',
    accent: '#60A5FA',
  },
  // Discord Nitro (Vivid Blurple Glow)
  discord: {
    primary: '#5865F2',
    secondary: '#4F46E5',
    accent: '#A5B4FC',
  },
  // Microsoft & Windows (Electric Sky Blue & Amber Glow)
  microsoft: {
    primary: '#00A4EF',
    secondary: '#2563EB',
    accent: '#7DD3FC',
  },
  // NordVPN (Electric Sapphire Blue Glow)
  nordvpn: {
    primary: '#4687FF',
    secondary: '#2563EB',
    accent: '#93C5FD',
  },
  // World Cup / FIFA (Cyber Gold Glow)
  worldcup: {
    primary: '#FFE600',
    secondary: '#F59E0B',
    accent: '#FEF08A',
  },
  // Default UpStore Luminous Cyber Glow
  default: {
    primary: '#06D6A0',
    secondary: '#FFE600',
    accent: '#6EE7B7',
  },
};

const BRAND_KEYWORD_MAP: Record<string, string> = {
  // ChatGPT Pro vs Plus
  'chatgpt pro': 'chatgpt-pro',
  'chatgpt-pro': 'chatgpt-pro',
  'gpt pro': 'chatgpt-pro',
  'شات جي بي تي برو': 'chatgpt-pro',
  'chatgpt plus': 'chatgpt',
  'chatgpt-plus': 'chatgpt',
  'شات جي بي تي بلس': 'chatgpt',
  chatgpt: 'chatgpt',
  openai: 'chatgpt',
  'chat-gpt': 'chatgpt',
  gpt: 'chatgpt',
  شات: 'chatgpt',
  'جي بي تي': 'chatgpt',
  'أوبن إيه آي': 'chatgpt',
  'شات جي بي تي': 'chatgpt',

  // Cursor AI
  cursor: 'cursor',
  'cursor ai': 'cursor',
  'cursor-pro': 'cursor',
  كورسور: 'cursor',

  // CapCut
  capcut: 'capcut',
  'capcut pro': 'capcut',
  'كاب كات': 'capcut',
  كابكات: 'capcut',

  // Canva
  canva: 'canva',
  'canva pro': 'canva',
  كانفا: 'canva',

  // Gemini
  gemini: 'gemini',
  جيميني: 'gemini',
  جيمناي: 'gemini',
  جيمني: 'gemini',
  google: 'gemini',
  جوجل: 'gemini',

  // Claude
  claude: 'claude',
  كلود: 'claude',
  anthropic: 'claude',

  // Streaming & Media
  netflix: 'netflix',
  نتفلكس: 'netflix',
  نتفليكس: 'netflix',
  نيتفلكس: 'netflix',
  نيتفليكس: 'netflix',
  netflex: 'netflix',
  nf: 'netflix',
  youtube: 'youtube',
  يوتيوب: 'youtube',
  yt: 'youtube',
  spotify: 'spotify',
  سبوتيفاي: 'spotify',
  سبوتفاي: 'spotify',
  shahid: 'shahid',
  شاهد: 'shahid',

  // Gaming & Tech
  xbox: 'xbox',
  اكس: 'xbox',
  gamepass: 'xbox',
  playstation: 'playstation',
  بلايستيشن: 'playstation',
  psn: 'playstation',
  discord: 'discord',
  ديسكورد: 'discord',
  microsoft: 'microsoft',
  office: 'microsoft',
  مايكروسوفت: 'microsoft',
  اوفيس: 'microsoft',
  windows: 'microsoft',
  ويندوز: 'microsoft',
  nordvpn: 'nordvpn',
  vpn: 'nordvpn',
  نورد: 'nordvpn',
  worldcup: 'worldcup',
  fifa: 'worldcup',
  مونديال: 'worldcup',
  كاس: 'worldcup',
};

export function resolveBrandKey(product?: {
  slug?: string;
  name?: string;
  name_ar?: string;
  category?: string;
  icon_name?: string | null;
}): string {
  if (!product) return 'default';
  const text = `${product.slug || ''} ${product.name || ''} ${product.name_ar || ''} ${product.icon_name || ''} ${product.category || ''}`.toLowerCase();
  
  // Specific multi-word keywords first
  if (text.includes('chatgpt pro') || text.includes('chatgpt-pro') || text.includes('برو') && text.includes('شات')) {
    return 'chatgpt-pro';
  }

  for (const [kw, brand] of Object.entries(BRAND_KEYWORD_MAP)) {
    if (text.includes(kw)) {
      return brand;
    }
  }
  return 'default';
}

interface ProductAmbientGlowProps {
  product?: {
    slug?: string;
    name?: string;
    name_ar?: string;
    category?: string;
    image_url?: string | null;
    imageUrl?: string | null;
    icon_name?: string | null;
    Icon?: any;
    brandColor?: string | null;
    brand_color?: string | null;
  };
  size?: 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
}

export function ProductAmbientGlow({
  product,
  size = 'md',
  className = '',
}: ProductAmbientGlowProps) {
  const brandKey = resolveBrandKey(product);
  const explicitColor = product?.brand_color || product?.brandColor;
  const imageUrl = product?.image_url || product?.imageUrl;

  const [sampledColor, setSampledColor] = useState<string | null>(null);

  useEffect(() => {
    if (!imageUrl || brandKey !== 'default') return;

    let isMounted = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
      if (!isMounted) return;
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = 16;
        canvas.height = 16;
        ctx.drawImage(img, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;

        let bestR = 6, bestG = 214, bestB = 160, found = false;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 100) continue;
          // Filter out black, dark grey, and pure white
          if (r < 50 && g < 50 && b < 50) continue;
          if (r > 230 && g > 230 && b > 230) continue;
          // Calculate saturation to prefer vivid colors
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;
          if (sat > 0.3) {
            bestR = r; bestG = g; bestB = b; found = true;
            break;
          }
        }

        if (found) {
          const hex = `#${bestR.toString(16).padStart(2, '0')}${bestG.toString(16).padStart(2, '0')}${bestB.toString(16).padStart(2, '0')}`;
          setSampledColor(hex);
        }
      } catch {
        // Fallback safely
      }
    };

    return () => {
      isMounted = false;
    };
  }, [imageUrl, brandKey]);

  const config = useMemo<BrandColorConfig>(() => {
    if (brandKey !== 'default' && BRAND_AURA_CONFIGS[brandKey]) {
      return BRAND_AURA_CONFIGS[brandKey];
    }
    if (explicitColor && /^#[0-9A-Fa-f]{6}$/.test(explicitColor)) {
      return {
        primary: explicitColor,
        secondary: explicitColor,
        accent: explicitColor,
      };
    }
    if (sampledColor) {
      return {
        primary: sampledColor,
        secondary: sampledColor,
        accent: sampledColor,
      };
    }
    return BRAND_AURA_CONFIGS.default;
  }, [brandKey, explicitColor, sampledColor]);

  const rgbPrimary = hexToRgb(config.primary) || { r: 6, g: 214, b: 160 };
  const rgbSecondary = hexToRgb(config.secondary) || { r: 255, g: 230, b: 0 };
  const isHero = size === 'hero';

  return (
    <div
      className={`absolute inset-0 pointer-events-none select-none overflow-hidden flex items-center justify-center transition-opacity duration-300 transform-gpu ${className}`}
      aria-hidden="true"
    >
      {/* ── 1. Smart Animated Ambient Saturated Breathing Aura ── */}
      <div
        style={{
          background: `radial-gradient(ellipse at 50% 50%, rgba(${rgbPrimary.r}, ${rgbPrimary.g}, ${rgbPrimary.b}, ${isHero ? 0.40 : 0.32}) 0%, rgba(${rgbSecondary.r}, ${rgbSecondary.g}, ${rgbSecondary.b}, ${isHero ? 0.18 : 0.12}) 45%, transparent 70%)`,
        }}
        className={`absolute inset-[-12%] rounded-full ${
          isHero ? 'blur-[65px] sm:blur-[90px] animate-ambient-hero' : 'blur-[28px] sm:blur-[38px] animate-ambient-breathe'
        }`}
      />

      {/* ── 2. Focused Center Luminescence Orb ── */}
      <div
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(${rgbPrimary.r}, ${rgbPrimary.g}, ${rgbPrimary.b}, ${isHero ? 0.30 : 0.22}) 0%, transparent 60%)`,
        }}
        className={`absolute inset-[15%] rounded-full ${
          isHero ? 'blur-[35px] sm:blur-[50px]' : 'blur-[18px] sm:blur-[24px]'
        } opacity-90 group-hover:opacity-100 transition-opacity duration-300`}
      />

      {/* ── 3. Subtle Floor Light Depth ── */}
      <div 
        style={{
          background: `radial-gradient(ellipse at 50% 100%, rgba(${rgbSecondary.r}, ${rgbSecondary.g}, ${rgbSecondary.b}, ${isHero ? 0.14 : 0.08}) 0%, transparent 60%)`,
        }}
        className="absolute inset-x-0 bottom-0 h-1/2 blur-[20px]"
      />
    </div>
  );
}

export default ProductAmbientGlow;
