'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Search, 
  ShoppingBag, 
  Film, 
  Bot, 
  Lock, 
  Laptop, 
  Gamepad2, 
  ShieldCheck, 
  ArrowRight, 
  Flame,
  Tag,
  Coins,
  X,
  Sparkles,
  Star,
  Gift
} from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';

export interface ModernMarketplaceHeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  productCount?: number;
  products?: any[];
}

function ModernMarketplaceHeroComponent({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  products = [],
}: ModernMarketplaceHeroProps) {
  const { language, formatPrice } = useLocale();
  const isAr = language === 'ar';
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalSearch(val);
    onSearchChange(val);
  };

  const handleClear = () => {
    setLocalSearch('');
    onSearchChange('');
  };

  // Pure Neubrutalist Category Blocks with Vivid Pastel Colors & Solid Borders
  const FEATURED_CATEGORIES = [
    {
      id: 'Subscriptions',
      label_en: 'Streaming & Subs',
      label_ar: 'اشتراكات وبث',
      icon: Film,
      bgColor: 'bg-[#FF70A6]', // Vibrant Pink
      iconBg: 'bg-white text-black',
    },
    {
      id: 'Accounts',
      label_en: 'AI & Accounts',
      label_ar: 'ذكاء اصطناعي وحسابات',
      icon: Bot,
      bgColor: 'bg-[#B892FF]', // Vibrant Purple
      iconBg: 'bg-white text-black',
    },
    {
      id: 'Software',
      label_en: 'Software & Tools',
      label_ar: 'برامج وأدوات',
      icon: Laptop,
      bgColor: 'bg-[#4CC9F0]', // Vibrant Cyan
      iconBg: 'bg-white text-black',
    },
    {
      id: 'Game Keys',
      label_en: 'Game Keys',
      label_ar: 'مفاتيح ألعاب',
      icon: Gamepad2,
      bgColor: 'bg-[#06D6A0]', // Vibrant Green
      iconBg: 'bg-white text-black',
    },
    {
      id: 'VPNs & Security',
      label_en: 'VPN & Security',
      label_ar: 'حماية وVPN',
      icon: Lock,
      bgColor: 'bg-[#FFD166]', // Vibrant Yellow
      iconBg: 'bg-white text-black',
    },
  ];

  // Dynamically derive top popular & best-selling items from real products
  const popularItems = React.useMemo(() => {
    if (products && products.length > 0) {
      // Sort by popularity (sold_count > reviews > rating)
      const sorted = [...products].sort((a, b) => {
        const soldA = Number(a.sold_count ?? a.soldCount ?? 0);
        const soldB = Number(b.sold_count ?? b.soldCount ?? 0);
        if (soldB !== soldA) return soldB - soldA;
        const revA = Number(a.reviews ?? 0);
        const revB = Number(b.reviews ?? 0);
        if (revB !== revA) return revB - revA;
        const ratingA = Number(a.rating ?? 0);
        const ratingB = Number(b.rating ?? 0);
        return ratingB - ratingA;
      });

      const bgPalette = ['bg-[#FF70A6]', 'bg-[#06D6A0]', 'bg-[#4CC9F0]', 'bg-[#B892FF]', 'bg-[#FFD166]', 'bg-[#FFE600]'];

      return sorted.slice(0, 5).map((p, idx) => {
        const pName = isAr ? (p.name_ar || p.name) : p.name;
        const rawPrice = p.our_price ?? p.ourPrice ?? p.price ?? 0;
        const formattedPrice = formatPrice(rawPrice);
        const rating = (Number(p.rating) || 4.9).toFixed(1);
        const firstChar = pName ? pName.trim()[0] : 'U';

        return {
          id: p.id,
          slug: p.slug,
          name: p.name,
          name_ar: p.name_ar,
          displayName: pName,
          price: formattedPrice,
          rating,
          avatarBg: bgPalette[idx % bgPalette.length],
          firstChar,
        };
      });
    }

    // Default realistic fallback if products are still loading
    return [
      { slug: 'gemini-advanced-18-months', name: 'Gemini 3.7 Flash & Antigravity (18M)', name_ar: 'جيمناي 3.7 فلاش & أنتي جرافيتي (18 شهر)', displayName: isAr ? 'جيمناي أدفانسد 18 شهر' : 'Gemini 3.7 Flash (18M)', price: formatPrice(5.64), rating: '4.8', avatarBg: 'bg-[#B892FF]', firstChar: isAr ? 'ج' : 'G' },
    ];
  }, [products, isAr, formatPrice]);

  return (
    <section className="relative w-full pt-8 pb-14 sm:pt-12 sm:pb-18 bg-[#FFFDF9] border-b-[3px] border-black select-none overflow-x-clip">
      
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        
        {/* ── Top Micro Trust Pill (Brutal Badge) ── */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFE600] border-2 border-black shadow-[3px_3px_0px_0px_#000] mb-8 transform -rotate-1 hover:rotate-0 transition-transform">
          <ShieldCheck className="w-4 h-4 text-black stroke-[2.5]" />
          <span className="text-xs sm:text-sm font-black text-black tracking-wide">
            {isAr 
              ? 'تراخيص واشتراكات رسمية 100% • ضمان استبدال 30 يوماً' 
              : '100% Official Subscriptions • 30-Day Replacement Warranty'}
          </span>
        </div>

        {/* ── Floating Illustrated Doodles / Stickers Container (Stitch / Gumroad Reference) ── */}
        <div className="relative w-full max-w-3xl">
          
          {/* Top Left Floating Sticker (Pink Tag) */}
          <div className="hidden lg:flex absolute -left-20 -top-2 rotate-[-12deg] flex-col items-center justify-center p-3 rounded-2xl bg-[#FF70A6] border-[2.5px] border-black shadow-[5px_5px_0px_0px_#000] text-black hover:scale-110 hover:rotate-[-6deg] active:translate-x-1 active:translate-y-1 active:shadow-[2px_2px_0px_0px_#000] transition-all cursor-pointer">
            <Tag className="w-7 h-7 stroke-[2.5]" />
            <span className="text-[11px] font-black tracking-wider uppercase mt-1">90% OFF</span>
          </div>

          {/* Top Right Floating Sticker (Gold Coin) */}
          <div className="hidden lg:flex absolute -right-16 -top-4 rotate-[15deg] items-center gap-1.5 px-4 py-3 rounded-2xl bg-[#FFE600] border-[2.5px] border-black shadow-[5px_5px_0px_0px_#000] text-black hover:scale-110 hover:rotate-[8deg] active:translate-x-1 active:translate-y-1 active:shadow-[2px_2px_0px_0px_#000] transition-all cursor-pointer">
            <Coins className="w-7 h-7 stroke-[2.5]" />
            <span className="text-xs font-black tracking-wider">CHEAPEST</span>
          </div>

          {/* Mid Left Floating Sticker (Gaming Badge) */}
          <div className="hidden lg:flex absolute -left-16 bottom-10 rotate-[8deg] items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-[#06D6A0] border-[2.5px] border-black shadow-[4px_4px_0px_0px_#000] text-black hover:scale-110 hover:rotate-[0deg] active:translate-x-1 active:translate-y-1 transition-all cursor-pointer">
            <Gamepad2 className="w-5 h-5 stroke-[2.5]" />
            <span className="text-xs font-black">GAMING</span>
          </div>

          {/* Mid Right Floating Sticker (AI Apps Badge) */}
          <div className="hidden lg:flex absolute -right-20 bottom-12 rotate-[-15deg] items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-[#B892FF] border-[2.5px] border-black shadow-[4px_4px_0px_0px_#000] text-black hover:scale-110 hover:rotate-[-5deg] active:translate-x-1 active:translate-y-1 transition-all cursor-pointer">
            <Bot className="w-5 h-5 stroke-[2.5]" />
            <span className="text-xs font-black">AI APPS</span>
          </div>

          {/* ── Main Punchy Neubrutalist Headline ── */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-black tracking-tight leading-[1.12] mb-6">
            {isAr ? (
              <>
                اشتراكاتك الرقمية وبرامجك المفضلة <br className="hidden sm:inline" />
                <span className="inline-block bg-[#FFE600] text-black px-3 py-0.5 sm:px-4 sm:py-1 border-2 sm:border-[3px] border-black rounded-xl sm:rounded-2xl shadow-[3.5px_3.5px_0px_0px_#000] -rotate-1 mt-2">
                  بأرخص سعر رسمي مضمون
                </span>
              </>
            ) : (
              <>
                Your Favorite Digital Subscriptions <br className="hidden sm:inline" />
                <span className="inline-block bg-[#FFE600] text-black px-3 py-0.5 sm:px-4 sm:py-1 border-2 sm:border-[3px] border-black rounded-xl sm:rounded-2xl shadow-[3.5px_3.5px_0px_0px_#000] -rotate-1 mt-2">
                  At The Lowest Global Price
                </span>
              </>
            )}
          </h1>

          {/* ── Subtitle ── */}
          <p className="text-sm sm:text-lg md:text-xl text-neutral-800 max-w-2xl mx-auto font-bold mb-8 leading-relaxed">
            {isAr
              ? 'وفر حتى 90% على نتفلكس، شات جي بي تي، سبوتيفاي، برامج مايكروسوفت ومفاتيح الألعاب مع تفعيل فوري وضمان شامل.'
              : 'Save up to 90% on Netflix, ChatGPT Plus, Spotify, Microsoft licenses, and games with instant automated delivery.'}
          </p>

          {/* ── Primary Action Button (Solid Black Brutalist Pill) ── */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-8 w-full max-w-md sm:max-w-none">
            <a
              href="#grid"
              className="w-full sm:w-auto px-7 py-3.5 sm:px-9 sm:py-4 rounded-2xl bg-black text-white text-base sm:text-lg font-black border-2 border-black shadow-[5px_5px_0px_0px_#FFE600] hover:shadow-[3px_3px_0px_0px_#FFE600] hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <ShoppingBag className="w-5 h-5 text-[#FFE600]" />
              <span>{isAr ? 'تصفح وابدأ الشراء' : 'Explore & Shop Now'}</span>
              <ArrowRight className={`w-5 h-5 ${isAr ? 'rotate-180' : ''}`} />
            </a>

            <a
              href="#deals"
              className="w-full sm:w-auto px-6 py-3.5 sm:px-7 sm:py-4 rounded-2xl bg-[#FFE600] text-black text-base sm:text-lg font-black border-2 border-black shadow-[5px_5px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Flame className="w-5 h-5 text-red-600 fill-red-600" />
              <span>{isAr ? 'عروض الفلاش' : 'Flash Deals'}</span>
            </a>
          </div>

          {/* ── Rewards & Referral Banner (Placed directly in hero in place of search/categories) ── */}
          <div className="w-full max-w-2xl mx-auto text-start">
            <div className="rounded-2xl border-[2.5px] border-black bg-[#C4B5FD] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[5px_5px_0px_0px_#000]">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-white border-2 border-black flex items-center justify-center text-black shrink-0 shadow-[2px_2px_0px_0px_#000]">
                  <Gift className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-sm sm:text-base font-black text-black block">
                    {isAr ? 'برنامج مكافآت UpStore: اربح رصيد كاش حقيقي في محفظتك!' : 'UpStore Rewards: Earn Real Cash in Your Wallet!'}
                  </span>
                  <span className="text-xs text-neutral-900 font-bold block">
                    {isAr ? 'ادعُ أصدقاءك وافتح خزائن المكافآت التراكمية مع إيداع سريع للأرباح.' : 'Invite your friends and unlock progressive cash vaults with quick wallet credit.'}
                  </span>
                </div>
              </div>

              <Link
                href="/referral"
                className="px-5 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs sm:text-sm font-black border-2 border-black shadow-[3px_3px_0px_0px_#FFE600] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1.5 shrink-0 cursor-pointer self-end sm:self-center"
              >
                <span>{isAr ? 'صفحة برنامج المكافآت' : 'Go to Rewards Hub'}</span>
                <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
              </Link>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}

export const ModernMarketplaceHero = React.memo(ModernMarketplaceHeroComponent);
