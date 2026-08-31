'use client';

import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Lock, LogOut, Sliders, Globe, ShoppingBag, Bell,
  Search, Home, Menu, X, ChevronDown, ShieldCheck, LayoutDashboard,
  Sparkles, Bot, Zap, Check, ArrowRight, Gift, Brain, Package
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { isAdminIdentity } from '@/utils/auth';
import { useLocale } from '@/context/LocaleContext';
import { useCartStore } from '@/store/useCartStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useToastStore } from '@/store/useToastStore';
import { useHyperAdaptiveStore } from '@/store/useHyperAdaptiveStore';
import { useActiveArabOrderStore } from '@/store/useActiveArabOrderStore';
import { searchProducts, suggestCorrection } from '@/utils/searchEngine';
import { heuristicExtractFirstName } from '@/utils/nameUtils';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { ProductImage } from '@/components/ProductImage';
import { fetchLiveProducts } from '@/utils/products';
import { cleanAllAuthCookiesAndStorage } from '@/utils/auth-cookies';

// ─── Navbar Component ─────────────────────────────────────────────────────────

export default function Navbar() {
  const pathname = usePathname();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [localeMenuOpen, setLocaleMenuOpen] = useState(false);
  const [mobileLocaleModalOpen, setMobileLocaleModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isAppleDevice, setIsAppleDevice] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiData, setAiData] = useState<{
    insight?: string;
    highlightSlug?: string;
    storeAnswer?: { title: string; text: string; actionLabel?: string; actionUrl?: string };
    matchedSlugs: string[];
  }>({ matchedSlugs: [] });

  const searchRef = useRef<HTMLDivElement>(null);
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const aiAbortControllerRef = useRef<AbortController | null>(null);

  const toast = useToastStore();

  const cartItems = useCartStore((s) => s.items);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const unreadNotifications = useNotificationStore((s) => s.unreadCount);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const hyperAdaptiveEnabled = useHyperAdaptiveStore((s) => s.enabled);
  const topCategory = useHyperAdaptiveStore((s) => s.topCategory);
  const suggestedSearchQueries = useHyperAdaptiveStore((s) => s.suggestedSearchQueries);
  const viewedSlugs = useHyperAdaptiveStore((s) => s.viewedSlugs);
  const priceSensitivity = useHyperAdaptiveStore((s) => s.priceSensitivity);
  const detectedPersona = useHyperAdaptiveStore((s) => s.detectedPersona);
  const recordSearchQuery = useHyperAdaptiveStore((s) => s.recordSearchQuery);
  const setPredictedTarget = useHyperAdaptiveStore((s) => s.setPredictedTarget);
  const activeArabOrder = useActiveArabOrderStore((s) => s.activeOrder);
  const openArabModal = useActiveArabOrderStore((s) => s.openModal);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const { language, country, setLanguage, setCountry, t, mounted, formatPrice } = useLocale();
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const qParam = searchParams ? searchParams.get('q') || '' : '';

  // Detect Apple / Mac platform for custom keyboard shortcut display (⌘K vs Ctrl K)
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const isMac = /Mac|iPod|iPhone|iPad/i.test(navigator.userAgent || navigator.platform || '');
      setIsAppleDevice(isMac);
    }
  }, []);

  // Global keyboard shortcut: Cmd+K / Ctrl+K / '/'
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInputActive = activeTag === 'input' || activeTag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable;

      if (((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) || (!isInputActive && !e.ctrlKey && !e.metaKey && !e.altKey && e.key === '/')) {
        e.preventDefault();
        if (window.innerWidth < 768) {
          setMobileSearchOpen(true);
        } else {
          desktopSearchInputRef.current?.focus();
          desktopSearchInputRef.current?.select();
          setIsSearchFocused(true);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Sync local search term with URL search query
  useEffect(() => {
    setSearchTerm(qParam);
  }, [qParam]);

  // Open mobile search if focus=search is in URL
  useEffect(() => {
    if (searchParams && searchParams.get('focus') === 'search') {
      setMobileSearchOpen(true);
      setTimeout(() => {
        const input = document.querySelector('input[type="search"]') as HTMLInputElement;
        if (input) {
          input.focus();
        }
      }, 150);
    }
  }, [searchParams]);

  // Auto-close mobile hamburger menu on deliberate user scroll
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const initialY = typeof window !== 'undefined' ? window.scrollY : 0;
    let timer: any = null;

    const handleScroll = () => {
      if (Math.abs(window.scrollY - initialY) > 35) {
        setMobileMenuOpen(false);
      }
    };

    // Attach after 150ms to ignore initial mount layout shift
    timer = setTimeout(() => {
      window.addEventListener('scroll', handleScroll, { passive: true });
    }, 150);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [mobileMenuOpen]);

  const handleSearchInputChange = (val: string) => {
    setSearchTerm(val);
    setSelectedIndex(-1);
    if (val.trim()) {
      recordSearchQuery(val);
    }
    if (pathname === '/') {
      const params = new URLSearchParams(window.location.search);
      if (val) {
        params.set('q', val);
      } else {
        params.delete('q');
      }
      router.replace(`/?${params.toString()}`, { scroll: false });
    }
  };

  const isRTL = mounted ? language === 'ar' : false;

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      fetchCart();
      fetchNotifications();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        if (isMounted) {
          setUser(null);
          setIsAdmin(false);
        }
        return;
      }

      // Optimistically set the user from cached session immediately
      if (isMounted) {
        setUser(session.user);
        setIsAdmin(isAdminIdentity(session.user));
      }

      try {
        const { bootstrapCurrentSession } = await import('@/utils/auth-client');
        const b = await bootstrapCurrentSession(null, session);
        if (isMounted) {
          setUser({ 
            id: b.profile.id, 
            email: b.profile.email, 
            display_name: b.profile.display_name,
            user_metadata: { display_name: b.profile.display_name }
          });
          setIsAdmin(b.profile.role === 'admin' || isAdminIdentity(session.user));
        }
      } catch (err) {
        // Keep session.user so user remains logged in even during temporary network lag
        console.warn('[Navbar] Background profile bootstrap notice:', err);
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e: any, session: any) => {
      const u = session?.user ?? null;
      if (!u) {
        if (isMounted) {
          setUser(null);
          setIsAdmin(false);
        }
        useCartStore.getState().clearCart();
        return;
      }

      if (isMounted) {
        setUser(u);
        setIsAdmin(isAdminIdentity(u));
      }

      try {
        const { bootstrapCurrentSession } = await import('@/utils/auth-client');
        const b = await bootstrapCurrentSession(null, session);
        if (isMounted) {
          setUser({ 
            id: b.profile.id, 
            email: b.profile.email, 
            display_name: b.profile.display_name,
            user_metadata: { display_name: b.profile.display_name }
          });
          setIsAdmin(b.profile.role === 'admin' || isAdminIdentity(u));
        }
      } catch {
        // Keep user logged in
      }
      fetchCart();
      fetchNotifications();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── Products for search (Shared Cache) ──────────────────────────────────
  useEffect(() => {
    fetchLiveProducts(supabase).then(({ data }) => {
      if (data && data.length > 0) setAllProducts(data);
    });
  }, [supabase]);

  // ── Intelligent Multilingual Local + AI Semantic Search ────────────────────
  useEffect(() => {
    const query = searchTerm.trim();
    if (!query) {
      setSearchResults([]);
      setAiData({ matchedSlugs: [] });
      setIsAiLoading(false);
      setSelectedIndex(-1);
      return;
    }

    // 1. Instant client-side search (0ms)
    const localMatches = searchProducts(allProducts, query, { limit: 12 });
    let combinedResults = localMatches.map((r) => r.item);
    setSearchResults(combinedResults);
    setSelectedIndex(-1);

    // 2. Debounced AI Semantic Search for deeper intent understanding (Logged-In Users Only)
    if (!user) {
      setIsAiLoading(false);
      return;
    }

    if (aiAbortControllerRef.current) {
      aiAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    aiAbortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      setIsAiLoading(true);
      try {
        const res = await fetch('/api/search/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            language: isRTL ? 'ar' : 'en',
            session: {
              topCategory,
              viewedSlugs,
              priceSensitivity,
              detectedPersona,
            },
          }),
          signal: controller.signal,
        });

        if (res.ok) {
          const data = await res.json();
          setAiData({
            insight: data.aiInsight,
            highlightSlug: data.highlightSlug,
            storeAnswer: data.storeAnswer,
            matchedSlugs: data.matchedSlugs || [],
          });

          // Re-rank products by prioritizing AI matched slugs while keeping all found items
          if (Array.isArray(data.matchedSlugs) && data.matchedSlugs.length > 0 && allProducts.length > 0) {
            const aiRankedProducts: any[] = [];
            const remainingProducts = [...allProducts];

            data.matchedSlugs.forEach((slug: string) => {
              const idx = remainingProducts.findIndex((p) => p.slug === slug);
              if (idx !== -1) {
                aiRankedProducts.push(remainingProducts[idx]);
                remainingProducts.splice(idx, 1);
              }
            });

            // Also append any other local search matches not already in AI list
            localMatches.forEach((m) => {
              if (!aiRankedProducts.some((p) => p.slug === m.item.slug)) {
                aiRankedProducts.push(m.item);
              }
            });

            setSearchResults(aiRankedProducts.slice(0, 10));
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          // Keep local search results on error
        }
      } finally {
        setIsAiLoading(false);
      }
    }, 140);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchTerm, allProducts, isRTL]);

  // ── Click outside ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (searchRef.current && !searchRef.current.contains(t)) setIsSearchFocused(false);
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(t)) setMobileSearchOpen(false);
      if (!t.closest('.locale-menu')) setLocaleMenuOpen(false);
      if (!t.closest('.user-menu')) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && searchResults[selectedIndex]) {
        router.push(`/product/${searchResults[selectedIndex].slug}`);
        setSearchTerm('');
        setIsSearchFocused(false);
        setMobileSearchOpen(false);
      } else if (aiData.storeAnswer?.actionUrl) {
        router.push(aiData.storeAnswer.actionUrl);
        setSearchTerm('');
        setIsSearchFocused(false);
        setMobileSearchOpen(false);
      } else if (searchTerm.trim()) {
        router.push(`/?q=${encodeURIComponent(searchTerm.trim())}`);
        setIsSearchFocused(false);
        setMobileSearchOpen(false);
      }
      (e.target as HTMLInputElement)?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsSearchFocused(false);
      setMobileSearchOpen(false);
      (e.target as HTMLInputElement)?.blur();
    }
  };

  const handleSignOut = async () => {
    try {
      cleanAllAuthCookiesAndStorage();
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      try {
        await fetch('/api/auth/clean-cookies', { method: 'POST' }).catch(() => {});
      } catch {}
      setUser(null);
      setIsAdmin(false);
      useToastStore.getState().success(
        language === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Signed out successfully'
      );
    } catch {
      // ignore
    } finally {
      window.location.href = '/auth/login';
    }
  };

  const rawDisplayName = user?.user_metadata?.display_name || user?.display_name;
  const cleanFirstName = user ? heuristicExtractFirstName(rawDisplayName || user.email || '') : '';
  const userName = user ? cleanFirstName : (mounted ? t('account') : 'Account');
  const userInitial = userName ? userName.charAt(0).toUpperCase() : 'U';

  // ── Search Dropdown ───────────────────────────────────────────────────────
  const SearchDropdown = () => {
    if (!searchTerm.trim()) {
      return (
        <div className="absolute top-full inset-x-0 mt-2 bg-white border-[2.5px] border-black rounded-2xl p-4 shadow-[6px_6px_0px_0px_#000] z-[60] animate-[fadeIn_0.15s_ease-out]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-black fill-[#FFE600]" />
              <span className="text-xs font-black text-black uppercase tracking-wider">
                {isRTL ? 'توصيات الذكاء الاصطناعي التكيفي لجلسة تصفحك' : 'AI PREDICTIVE SEARCHES FOR YOUR SESSION'}
              </span>
            </div>
            <span className="text-[10px] text-neutral-600 font-mono font-bold">{isRTL ? 'ESC للإغلاق' : 'ESC to close'}</span>
          </div>

          {/* Dynamic Hyper-Adaptive Predictive Chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            {suggestedSearchQueries.map((tag) => (
              <button
                key={tag.queryEn}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSearchInputChange(isRTL ? tag.queryAr : tag.queryEn);
                  desktopSearchInputRef.current?.focus();
                }}
                className="px-3 py-1.5 bg-[#FFE600] border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 rounded-xl text-xs font-black text-black transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3 stroke-[2.5] text-black" />
                <span>{isRTL ? tag.queryAr : tag.queryEn}</span>
              </button>
            ))}
          </div>

          <div className="border-t-2 border-dashed border-neutral-300 pt-2.5 flex items-center justify-between text-xs text-neutral-700 font-bold">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#06D6A0] border border-black animate-pulse" />
              <span>
                {isRTL 
                  ? `مخصص لاهتمامك في: ${topCategory || 'الاشتراكات'}` 
                  : `Tailored to your focus: ${topCategory || 'Subscriptions'}`}
              </span>
            </span>
            <kbd className="px-1.5 py-0.5 bg-neutral-100 rounded border-2 border-black text-[10px] font-mono text-black font-black">{isRTL ? '↑↓ للتنقل' : '↑↓ to navigate'}</kbd>
          </div>
        </div>
      );
    }

    const hasStoreAnswer = !!aiData.storeAnswer;
    const hasResults = searchResults.length > 0;
    const spellSuggestion = suggestCorrection(searchTerm);

    if (!hasResults && !hasStoreAnswer && !isAiLoading) {
      return (
        <div className="absolute top-full inset-x-0 mt-2 bg-white border-2 border-black rounded-2xl p-6 text-center text-xs text-black font-bold z-[60] shadow-[6px_6px_0px_0px_#000] space-y-3">
          <Sparkles className="w-6 h-6 text-black fill-[#FFE600] mx-auto" />
          <p>{isRTL ? 'لم نعثر على نتيجة مطابقة مباشرة لبحثك.' : 'No direct matches found for your search.'}</p>
          {spellSuggestion && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFE600] border-2 border-black text-xs text-black font-black shadow-[2px_2px_0px_0px_#000]">
              <span>{isRTL ? 'هل تقصد:' : 'Did you mean:'}</span>
              <button
                type="button"
                onClick={() => handleSearchInputChange(spellSuggestion)}
                className="text-black font-black underline hover:opacity-80 cursor-pointer"
              >
                {spellSuggestion}
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="absolute top-full inset-x-0 mt-2 bg-white border-[2.5px] border-black rounded-2xl shadow-[6px_6px_0px_0px_#000] overflow-hidden z-[60] divide-y-2 divide-black">
        
        {/* Unauthenticated AI Notice */}
        {!user && (
          <div className="p-3 bg-[#FFE600] border-b-2 border-black flex items-center justify-between gap-3 text-start">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-black shrink-0 fill-black" />
              <span className="text-xs font-black text-black">
                {isRTL
                  ? 'سجّل دخولك لتفعيل البحث الدلالي الذكي وتحليل التوصيات بالذكاء الاصطناعي'
                  : 'Sign in to unlock AI Semantic Search & Smart Recommendations'}
              </span>
            </div>
            <Link
              href="/auth/login"
              onClick={() => { setIsSearchFocused(false); setMobileSearchOpen(false); }}
              className="px-3 py-1 bg-black text-white text-xs font-black rounded-lg shrink-0 hover:bg-neutral-800 transition-all shadow-[1.5px_1.5px_0px_0px_#000]"
            >
              {isRTL ? 'تسجيل الدخول' : 'Sign In'}
            </Link>
          </div>
        )}

        {/* Spellcheck / Did you mean banner if available */}
        {spellSuggestion && spellSuggestion.toLowerCase() !== searchTerm.toLowerCase().trim() && (
          <div className="px-4 py-2 bg-[#FFE600] border-b-2 border-black flex items-center justify-between text-xs text-black font-bold text-start">
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-800">{isRTL ? 'هل تقصد:' : 'Did you mean:'}</span>
              <button
                type="button"
                onClick={() => handleSearchInputChange(spellSuggestion)}
                className="text-black font-black underline hover:opacity-80 cursor-pointer"
              >
                {spellSuggestion}
              </button>
            </div>
          </div>
        )}

        {/* Live AI Thinking Status Bar */}
        {isAiLoading && (
          <div className="px-4 py-2.5 bg-[#06D6A0] border-b-2 border-black flex items-center justify-between text-start text-xs text-black font-black">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-spin text-black" />
              <span>
                {isRTL ? 'الذكاء الاصطناعي يحلل بحثك ويطابق أفضل المنتجات...' : 'AI is analyzing your query & matching products...'}
              </span>
            </div>
            <span className="text-[10px] font-mono font-black bg-black text-white px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_0px_#000]">
              AI ENGINE
            </span>
          </div>
        )}

        {/* Direct Store FAQ / Action Card */}
        {hasStoreAnswer && (
          <div className="p-3.5 bg-[#FFFDF9] border-b-2 border-black text-start">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-black text-black flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 fill-[#FFE600]" />
                {aiData.storeAnswer?.title}
              </span>
              <span className="text-[9px] font-mono font-black text-black bg-[#FFE600] border border-black px-1.5 py-0.5 rounded uppercase">
                {isRTL ? 'إجابة ذكية مباشرة' : 'Direct AI Answer'}
              </span>
            </div>
            <p className="text-xs text-neutral-800 font-bold leading-relaxed mb-2.5">
              {aiData.storeAnswer?.text}
            </p>
            {aiData.storeAnswer?.actionUrl && (
              <Link
                href={aiData.storeAnswer.actionUrl}
                onClick={() => { setSearchTerm(''); setIsSearchFocused(false); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#06D6A0] hover:bg-[#05b385] text-black text-xs font-black rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_#000] transition-all"
              >
                <span>{aiData.storeAnswer.actionLabel || (isRTL ? 'عرض التفاصيل' : 'View Details')}</span>
                <ArrowRight className={`w-3 h-3 stroke-[2.5] ${isRTL ? 'rotate-180' : ''}`} />
              </Link>
            )}
          </div>
        )}

        {/* AI Insight Bar */}
        {aiData.insight && !isAiLoading && (
          <div className="px-4 py-2.5 bg-[#FFFDF9] border-b-2 border-black flex items-center justify-between text-start text-xs text-black font-bold">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] font-black text-black bg-[#FFE600] border border-black px-2 py-0.5 rounded shrink-0">
                {isRTL ? 'توصية الذكاء الاصطناعي:' : 'AI Recommendation:'}
              </span>
              <span className="truncate text-xs font-bold text-neutral-900">
                {aiData.insight}
              </span>
            </div>
          </div>
        )}

        {/* Product Items List with Hover Prefetching */}
        {searchResults.map((p, i) => {
          const isHighlight = p.slug === aiData.highlightSlug;
          return (
            <Link
              key={p.id}
              href={`/product/${p.slug}`}
              onMouseEnter={() => setPredictedTarget(p.slug, 95)}
              onTouchStart={() => setPredictedTarget(p.slug, 95)}
              onClick={() => { setSearchTerm(''); setIsSearchFocused(false); setMobileSearchOpen(false); }}
              className={`flex items-center gap-3.5 px-4 py-3 transition-all text-start ${
                selectedIndex === i ? 'bg-[#FFE600]/40 border-s-4 border-black' : 'hover:bg-[#FFFDF9]'
              }`}
            >
              <div className="w-10 h-10 shrink-0">
                <ProductImage product={p} alt={isRTL ? p.name_ar || p.name : p.name} size="sm" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="block text-xs font-black text-black truncate">
                    {isRTL ? p.name_ar || p.name : p.name}
                  </span>
                  {isHighlight && (
                    <span className="px-2 py-0.5 bg-[#06D6A0] border border-black text-black text-[10px] font-black rounded-md shrink-0 select-none shadow-[1px_1px_0px_0px_#000]">
                      {isRTL ? 'أفضل مطابقة' : 'Top Match'}
                    </span>
                  )}
                </div>
                <span className="block text-[10px] text-neutral-600 uppercase tracking-wider mt-0.5 font-bold">{p.category}</span>
              </div>
              <span className="text-xs font-black font-mono text-black bg-[#FFE600] border border-black px-2 py-0.5 rounded-lg shadow-[1.5px_1.5px_0px_0px_#000] shrink-0">
                {formatPrice(p.our_price)}
              </span>
            </Link>
          );
        })}
      </div>
    );
  };

  if (pathname?.startsWith('/ad')) {
    return null;
  }

  return (
    <>
      {/* ── Promo Banner ── */}
      <div className="promo-banner w-full text-[10px] sm:text-xs font-extrabold py-1.5 sm:py-2 px-3 sm:px-4 text-center select-none z-50 relative overflow-hidden" suppressHydrationWarning>
        {/* shimmer sweep */}
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer will-change-transform" />
        
        <Link href="/#deals" className="inline-flex items-center justify-center gap-1.5 sm:gap-2 hover:opacity-90 cursor-pointer relative z-10 text-black max-w-full" suppressHydrationWarning>
          <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-black stroke-[2.5] fill-black shrink-0" />
          <span className="text-black tracking-wide font-black truncate sm:whitespace-normal" suppressHydrationWarning>
            <span className="sm:hidden">
              {isRTL ? 'عروض UpStore الحصرية: وفر حتى 90% مع دفع عالمي وضمان كامل المدة' : 'UpStore Deals: Save up to 90% + Full Warranty'}
            </span>
            <span className="hidden sm:inline">
              {isRTL
                ? 'عروض وتخفيضات UpStore الحصرية: وفر حتى 90% مع دفع عالمي معتمد وضمان شامل كامل المدة'
                : 'UpStore Exclusive Deals: Save up to 90% with Global Secure Checkout & Full-Term Warranty'}
            </span>
          </span>
          <span suppressHydrationWarning className={`${isRTL ? 'rotate-180' : ''} shrink-0 inline-flex`}>
            <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-black stroke-[2.5]" />
          </span>
        </Link>
      </div>

      <header
        dir="ltr"
        className="sticky top-0 z-50 w-full navbar-glass"
        role="banner"
        suppressHydrationWarning
      >
        <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-3 w-full">

          {/* ── Logo ── */}
          <div className="shrink-0">
            <BrandLogo size="md" />
          </div>

          {/* ── Search — Desktop ── */}
          <div ref={searchRef} className="hidden md:flex flex-1 relative max-w-xl mx-auto h-11 items-center" suppressHydrationWarning>
            <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3.5' : 'left-0 pl-3.5'} flex items-center gap-1.5 pointer-events-none z-10`} suppressHydrationWarning>
              <Search className={`w-4 h-4 ${isAiLoading ? 'text-black animate-spin' : 'text-neutral-600'}`} />
            </div>
            <input
              ref={desktopSearchInputRef}
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              dir="auto"
              value={searchTerm}
              onChange={e => handleSearchInputChange(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={handleKeyDown}
              placeholder={isRTL ? 'بحث ذكي بالذكاء الاصطناعي عن الاشتراكات، البرامج، طرق الدفع...' : 'Search with AI for subscriptions, games, payments...'}
              className={`w-full h-11 ${isRTL ? 'pr-10 pl-24 text-right' : 'pl-10 pr-24 text-left'} py-0 nav-search-input rounded-xl text-sm text-black font-bold outline-none placeholder-neutral-500`}
              autoComplete="off"
              suppressHydrationWarning
            />
            {/* AI badge & Keyboard shortcut indicator OR Quick Clear Button */}
            {searchTerm ? (
              <button
                type="button"
                onClick={() => {
                  handleSearchInputChange('');
                  desktopSearchInputRef.current?.focus();
                }}
                className={`absolute inset-y-0 ${isRTL ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center text-neutral-500 hover:text-black transition-colors cursor-pointer z-10`}
                title={isRTL ? 'مسح البحث' : 'Clear search'}
                aria-label="Clear search"
              >
                <span className="w-5 h-5 rounded-md bg-neutral-100 border border-black flex items-center justify-center text-xs font-black hover:bg-[#FFE600] shadow-[1px_1px_0px_0px_#000]">
                  ✕
                </span>
              </button>
            ) : (
              <div className={`absolute inset-y-0 ${isRTL ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center gap-2 pointer-events-none select-none z-10 transition-opacity duration-200`} suppressHydrationWarning>
                <span className="px-2 py-0.5 text-[10px] font-black tracking-wider text-black bg-[#FFE600] border-2 border-black rounded-md font-sans shadow-[1.5px_1.5px_0px_0px_#000]">
                  AI
                </span>
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-black text-black bg-neutral-100 border-2 border-black rounded shadow-[1.5px_1.5px_0px_0px_#000]">
                  {mounted && isAppleDevice ? '⌘K' : 'Ctrl K'}
                </kbd>
              </div>
            )}
            {isSearchFocused && <SearchDropdown />}
          </div>

          {/* ── Right Actions ── */}
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">

            {/* ── Search Icon Button — Mobile ── */}
            <button
              type="button"
              onClick={() => setMobileSearchOpen(true)}
              className="md:hidden h-9 w-9 bg-white border-2 border-black rounded-xl text-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#FFE600] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center cursor-pointer shrink-0"
              aria-label={isRTL ? 'بحث' : 'Search'}
            >
              <Search className="w-4 h-4 text-black stroke-[2.5]" />
            </button>

            {/* ── Unified Country, Currency & Language Selector (Desktop Only) ── */}
            <div className="hidden md:block relative locale-menu shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLocaleMenuOpen((v) => !v);
                  setUserMenuOpen(false);
                }}
                className="h-11 flex items-center justify-center gap-2 px-3 nav-icon-btn rounded-xl transition-all select-none text-xs font-black text-black cursor-pointer shrink-0"
                aria-label="Select Country & Language"
              >
                <div className="w-5 h-3.5 rounded overflow-hidden border border-black/30 shadow-xs flex items-center justify-center shrink-0">
                  <img
                    src={
                      mounted
                        ? country === 'EG'
                          ? 'https://flagcdn.com/w80/eg.png'
                          : country === 'SA'
                          ? 'https://flagcdn.com/w80/sa.png'
                          : 'https://flagcdn.com/w80/us.png'
                        : 'https://flagcdn.com/w80/us.png'
                    }
                    alt="Country"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="font-mono text-xs font-black uppercase">
                  {mounted ? language : 'en'}
                </span>
                <span className="text-neutral-400 font-black">•</span>
                <span className="font-mono text-xs font-black">
                  {mounted ? (country === 'EG' ? 'EGP' : country === 'SA' ? 'SAR' : 'US$') : 'US$'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-black stroke-[2.5] transition-transform shrink-0 ${localeMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Desktop-Only Locale Dropdown */}
              {localeMenuOpen && (
                <div
                  className="absolute right-0 end-0 top-full mt-2 w-80 rounded-2xl bg-white border-2 border-black shadow-[6px_6px_0px_0px_#000] p-4 z-[70] animate-[fadeIn_0.15s_ease-out]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex gap-4">
                    {/* Language */}
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-2">
                        {isRTL ? 'اللغة' : 'Language'}
                      </p>
                      {[
                        { v: 'ar', label: 'العربية' },
                        { v: 'en', label: 'English' },
                      ].map((opt) => {
                        const isSelected = mounted ? language === opt.v : opt.v === 'en';
                        return (
                          <button
                            key={opt.v}
                            onClick={() => {
                              setLanguage(opt.v as any);
                              setLocaleMenuOpen(false);
                              toast.success(opt.v === 'ar' ? 'تم تحويل لغة الموقع إلى العربية' : 'Language set to English');
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-black mb-1.5 transition-all cursor-pointer border-2 ${
                              isSelected
                                ? 'bg-[#FFE600] text-black border-black shadow-[2px_2px_0px_0px_#000]'
                                : 'text-neutral-700 hover:text-black hover:bg-neutral-100 border-transparent'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] text-black" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="w-0.5 bg-black/20" />

                    {/* Region / Currency */}
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-2">
                        {isRTL ? 'البلد والعملة' : 'Country'}
                      </p>
                      {[
                        { v: 'EG', label: isRTL ? 'مصر (EGP)' : 'Egypt (EGP)', flagUrl: 'https://flagcdn.com/w80/eg.png' },
                        { v: 'SA', label: isRTL ? 'السعودية (SAR)' : 'Saudi (SAR)', flagUrl: 'https://flagcdn.com/w80/sa.png' },
                        { v: 'US', label: isRTL ? 'عالمي (US$)' : 'Global (US$)', flagUrl: 'https://flagcdn.com/w80/us.png' },
                      ].map((opt) => {
                        const isSelected = mounted ? country === opt.v : opt.v === 'US';
                        return (
                          <button
                            key={opt.v}
                            onClick={() => {
                              setCountry(opt.v as any);
                              setLocaleMenuOpen(false);
                              toast.success(
                                opt.v === 'EG'
                                  ? (isRTL ? 'تم تحويل العملة إلى الجنيه المصري (EGP)' : 'Currency set to Egyptian Pound (EGP)')
                                  : opt.v === 'SA'
                                  ? (isRTL ? 'تم تحويل العملة إلى الريال السعودي (SAR)' : 'Currency set to Saudi Riyal (SAR)')
                                  : (isRTL ? 'تم تحويل العملة إلى الدولار الأمريكي (USD)' : 'Currency set to US Dollar (USD)')
                              );
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-[11px] font-black mb-1.5 transition-all cursor-pointer border-2 ${
                              isSelected
                                ? 'bg-[#FFE600] text-black border-black shadow-[2px_2px_0px_0px_#000]'
                                : 'text-neutral-700 hover:text-black hover:bg-neutral-100 border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-4 h-3 rounded overflow-hidden border border-black/30 shadow-xs shrink-0">
                                <img src={opt.flagUrl} alt={opt.label} className="w-full h-full object-cover" />
                              </div>
                              <span className="truncate">{opt.label}</span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] text-black shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Rewards / Referral Page — Desktop */}
            <Link
              href="/referral"
              className="hidden lg:inline-flex h-11 items-center justify-center gap-1.5 px-3.5 nav-icon-btn rounded-xl transition-all select-none text-xs font-black text-black cursor-pointer"
              title={isRTL ? 'برنامج المكافآت والأرباح' : 'Rewards & Referral Program'}
              suppressHydrationWarning
            >
              <Gift className="w-4 h-4 text-black stroke-[2.5]" />
              <span className="text-black font-black" suppressHydrationWarning>{isRTL ? 'المكافآت' : 'Rewards'}</span>
            </Link>

            {/* Cart — Mobile & Desktop */}
            <Link
              href="/cart"
              className="flex relative h-9 md:h-11 w-9 md:w-11 nav-icon-btn rounded-xl transition-all items-center justify-center select-none"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="w-4 h-4 md:w-4.5 md:h-4.5 text-black stroke-[2.5]" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 md:w-5 md:h-5 bg-[#FFE600] border-2 border-black text-black text-[9px] md:text-[10px] font-black rounded-full flex items-center justify-center shadow-[1px_1px_0px_0px_#000] animate-scale-in">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Active Arab Order Live Bridge Badge (Desktop) */}
            {activeArabOrder && (
              <button
                type="button"
                onClick={() => openArabModal()}
                className="hidden md:inline-flex h-11 items-center justify-center gap-1.5 px-3 bg-[#FFE600] hover:bg-[#ffea33] text-black border-2 border-black rounded-xl font-black text-xs shadow-[2.5px_2.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer select-none"
                title={isRTL ? 'متابعة الطلب مع الدعم المباشر' : 'Live Order Support Bridge'}
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                </span>
                <span>#{activeArabOrder.orderId}</span>
                <span className="bg-black text-[#FFE600] px-1.5 py-0.5 rounded font-mono text-[10px]">
                  {activeArabOrder.isFulfilled ? (isRTL ? 'مكتمل' : 'Done') : (isRTL ? 'متابعة' : 'Track')}
                </span>
              </button>
            )}

            {/* Notifications — Desktop Only */}
            <Link
              href="/notifications"
              className="hidden md:flex relative h-11 w-11 nav-icon-btn rounded-xl transition-all items-center justify-center select-none"
              aria-label="Notifications"
            >
              <Bell className="w-4.5 h-4.5 text-black stroke-[2.5]" />
              {(unreadNotifications > 0 || (activeArabOrder && !activeArabOrder.isFulfilled)) && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#FF70A6] border border-black rounded-full" />
              )}
            </Link>

            {/* Divider — Desktop */}
            <div className="hidden md:block h-7 w-0.5 bg-black/20" />

            {/* User Menu — Desktop Only */}
            <div className="hidden md:block relative user-menu shrink-0">
              <button
                onClick={e => { e.stopPropagation(); setUserMenuOpen(v => !v); setLocaleMenuOpen(false); }}
                className="h-11 flex items-center justify-center gap-2 px-3 nav-icon-btn rounded-xl transition-all select-none cursor-pointer shrink-0"
                suppressHydrationWarning
                aria-label="User Account Menu"
              >
                <span className="w-6.5 h-6.5 rounded-lg text-black font-black flex items-center justify-center text-xs shrink-0 bg-[#06D6A0] border-2 border-black shadow-[1px_1px_0px_0px_#000]">
                  {user ? userInitial : 'U'}
                </span>
                <span className="text-sm font-black text-black max-w-[100px] truncate hidden lg:block tracking-tight" suppressHydrationWarning>
                  {mounted ? userName : 'Account'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-black stroke-[2.5] transition-transform shrink-0 ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 end-0 top-full mt-2 w-56 rounded-2xl bg-white border-2 border-black shadow-[6px_6px_0px_0px_#000] p-2 z-[70] animate-[fadeIn_0.15s_ease-out]">
                  {user ? (
                    <>
                      {isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-black bg-[#FFE600] hover:bg-[#ffea33] rounded-xl transition-all font-black border-2 border-black shadow-[2px_2px_0px_0px_#000] mb-1.5"
                        >
                          <Sliders className="w-4 h-4 shrink-0 stroke-[2.5]" />
                          <span>{isRTL ? 'لوحة الأدمن' : 'Admin Panel'}</span>
                        </Link>
                      )}
                      <Link
                        href={isAdmin ? '/dashboard?as=user' : '/dashboard'}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-black hover:bg-neutral-100 rounded-xl transition-all font-bold border-2 border-transparent hover:border-black mb-1"
                      >
                        <LayoutDashboard className="w-4 h-4 shrink-0 stroke-[2.5]" />
                        <span>{isRTL ? 'لوحة التحكم' : 'Dashboard'}</span>
                      </Link>
                      <Link
                        href="/referral"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-black bg-[#06D6A0]/25 hover:bg-[#06D6A0] rounded-xl transition-all font-black border-2 border-black shadow-[2px_2px_0px_0px_#000] mb-1.5"
                      >
                        <Gift className="w-4 h-4 text-black shrink-0 stroke-[2.5]" />
                        <span>{isRTL ? 'برنامج المكافآت (1$ كاش)' : 'Refer & Earn ($1 Cash)'}</span>
                      </Link>
                      <Link
                        href="/dashboard?tab=settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-neutral-700 hover:text-black hover:bg-neutral-100 rounded-xl transition-all font-bold"
                      >
                        <Brain className="w-3.5 h-3.5 text-neutral-600 shrink-0 stroke-[2.5]" />
                        <span>{isRTL ? 'الإعدادات والتفضيلات' : 'Settings & Preferences'}</span>
                      </Link>
                    </>
                  ) : (
                    <Link
                      href="/auth/login"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-black hover:bg-[#FFE600] rounded-xl transition-colors font-black border-2 border-black shadow-[2px_2px_0px_0px_#000]"
                    >
                      <Lock className="w-4 h-4 shrink-0 stroke-[2.5]" />
                      <span>{isRTL ? 'دخول / تسجيل' : 'Sign In / Register'}</span>
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Hamburger — Mobile Only */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMobileMenuOpen(v => !v);
              }}
              className="md:hidden h-9 w-9 bg-white border-2 border-black rounded-xl text-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#FFE600] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center cursor-pointer shrink-0 select-none z-50"
              aria-label="Menu"
            >
              {mobileMenuOpen
                ? <X className="w-4 h-4 text-black stroke-[2.5]" />
                : <Menu className="w-4 h-4 text-black stroke-[2.5]" />
              }
            </button>
          </div>
        </div>

        {/* ── Mobile Fullscreen Search Overlay ── */}
        {mobileSearchOpen && (
          <div 
            ref={mobileSearchRef}
            className="md:hidden fixed inset-0 z-[100] bg-[#FFFDF9] px-4 pt-4 pb-24 flex flex-col gap-4 overflow-y-auto animate-[fadeIn_0.2s_ease-out] text-black"
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            {/* Input Row */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative flex-1">
                <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3.5' : 'left-0 pl-3.5'} flex items-center pointer-events-none`}>
                  <Search className="w-4.5 h-4.5 text-black stroke-[2.5]" />
                </div>
                <input
                  type="search"
                  inputMode="search"
                  enterKeyHint="search"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  dir="auto"
                  value={searchTerm}
                  onChange={e => handleSearchInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={mounted ? t('searchPlaceholder') : (isRTL ? 'ابحث عن منتج...' : 'Search products...')}
                  className={`w-full ${isRTL ? (searchTerm ? 'pr-11 pl-10' : 'pr-11 pl-4') : (searchTerm ? 'pl-11 pr-10' : 'pl-11 pr-4')} py-3 bg-white border-2 border-black rounded-2xl text-base text-black font-bold outline-none placeholder-neutral-500 shadow-[3px_3px_0px_0px_#000] focus:shadow-[5px_5px_0px_0px_#000]`}
                  autoFocus
                  autoComplete="off"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => handleSearchInputChange('')}
                    className={`absolute inset-y-0 ${isRTL ? 'left-0 pl-3.5' : 'right-0 pr-3.5'} flex items-center text-neutral-400 hover:text-black cursor-pointer`}
                    aria-label="Clear input"
                  >
                    <span className="w-5 h-5 rounded-full bg-neutral-200 border border-black flex items-center justify-center text-[10px] font-black text-black">✕</span>
                  </button>
                )}
              </div>
              
              {/* Close button */}
              <button
                onClick={() => { setMobileSearchOpen(false); setSearchTerm(''); }}
                className="p-3 bg-white border-2 border-black rounded-2xl shadow-[2px_2px_0px_0px_#000] hover:bg-[#FFE600] transition-all cursor-pointer shrink-0"
                aria-label="Close search"
              >
                <X className="w-5 h-5 text-black stroke-[2.5]" />
              </button>
            </div>

            {/* Suggestions & Results Panel */}
            <div
              className="flex-1 overflow-y-auto min-h-0 mt-1 hide-scrollbar"
              onScroll={() => {
                if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
              }}
              onTouchMove={() => {
                if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
              }}
            >
              {searchTerm.trim() ? (
                // Results list
                searchResults.length === 0 && !aiData.storeAnswer && !isAiLoading ? (
                  <div className="text-center py-12 text-sm text-neutral-800 font-bold bg-white border-2 border-black rounded-2xl p-6 shadow-[4px_4px_0px_0px_#000]">
                    <Sparkles className="w-6 h-6 text-black fill-[#FFE600] mx-auto mb-2" />
                    {isRTL ? 'لم نعثر على نتائج مطابقة لبحثك. جرب كلمات بحث أخرى.' : 'No matching results found.'}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    
                    {/* Unauthenticated AI Notice in Mobile */}
                    {!user && (
                      <div className="p-3 bg-[#FFE600] border-2 border-black rounded-xl flex items-center justify-between gap-2 text-start shadow-[2px_2px_0px_0px_#000]">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-black shrink-0 fill-black" />
                          <span className="text-xs font-black text-black">
                            {isRTL
                              ? 'سجّل دخولك لتفعيل البحث الدلالي وتحليل التوصيات بالذكاء الاصطناعي'
                              : 'Sign in to unlock AI Semantic Search & Recommendations'}
                          </span>
                        </div>
                        <Link
                          href="/auth/login"
                          onClick={() => { setMobileSearchOpen(false); setSearchTerm(''); }}
                          className="px-2.5 py-1 bg-black text-white text-xs font-black rounded-lg shrink-0 hover:bg-neutral-800 transition-all"
                        >
                          {isRTL ? 'دخول' : 'Sign In'}
                        </Link>
                      </div>
                    )}

                    {/* Live AI Thinking in Mobile */}
                    {isAiLoading && (
                      <div className="p-3 bg-[#06D6A0] border-2 border-black rounded-xl flex items-center justify-between text-start text-xs text-black font-black shadow-[2px_2px_0px_0px_#000]">
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4 animate-spin text-black" />
                          <span className="font-black text-xs">
                            {isRTL ? 'الذكاء الاصطناعي يحلل طلبك...' : 'AI is analyzing your intent...'}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono font-black bg-black text-white px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_0px_#000]">
                          AI LIVE
                        </span>
                      </div>
                    )}

                    {/* Direct Store Answer in Mobile */}
                    {aiData.storeAnswer && (
                      <div className="p-4 bg-white border-2 border-black rounded-2xl text-start shadow-[3px_3px_0px_0px_#000]">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-black text-black flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 fill-[#FFE600]" />
                            {aiData.storeAnswer.title}
                          </span>
                          <span className="text-[9px] font-mono font-black text-black bg-[#FFE600] border border-black px-1.5 py-0.5 rounded uppercase">
                            {isRTL ? 'إجابة ذكية' : 'Direct Answer'}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-800 leading-relaxed font-bold mb-3">
                          {aiData.storeAnswer.text}
                        </p>
                        {aiData.storeAnswer.actionUrl && (
                          <Link
                            href={aiData.storeAnswer.actionUrl}
                            onClick={() => { setMobileSearchOpen(false); setSearchTerm(''); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#06D6A0] text-black text-xs font-black rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_#000]"
                          >
                            <span>{aiData.storeAnswer.actionLabel || (isRTL ? 'عرض التفاصيل' : 'View Details')}</span>
                            <ArrowRight className={`w-3 h-3 stroke-[2.5] ${isRTL ? 'rotate-180' : ''}`} />
                          </Link>
                        )}
                      </div>
                    )}

                    {/* AI Insight in Mobile */}
                    {aiData.insight && !isAiLoading && (
                      <div className="p-3 bg-white border-2 border-black rounded-xl flex items-center justify-between text-start text-xs text-black font-bold shadow-[2px_2px_0px_0px_#000]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-black text-black bg-[#FFE600] border border-black px-1.5 py-0.5 rounded shrink-0">
                            {isRTL ? 'توصية الذكاء الاصطناعي:' : 'AI Recommendation:'}
                          </span>
                          <span className="truncate text-xs font-bold text-neutral-900">
                            {aiData.insight}
                          </span>
                        </div>
                      </div>
                    )}

                    <span className="text-[10px] font-black text-neutral-700 uppercase tracking-widest block mt-1">
                      {isRTL ? 'المنتجات المطابقة' : 'Matched Products'}
                    </span>

                    {searchResults.map((p, i) => {
                      const isHighlight = p.slug === aiData.highlightSlug;
                      return (
                        <Link
                          key={p.id}
                          href={`/product/${p.slug}`}
                          onTouchStart={() => setPredictedTarget(p.slug, 95)}
                          onClick={() => { setSearchTerm(''); setIsSearchFocused(false); setMobileSearchOpen(false); }}
                          className={`flex items-center gap-3.5 p-3 bg-white border-2 border-black rounded-2xl transition-all text-start shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 ${
                            selectedIndex === i ? 'bg-[#FFE600]/30' : ''
                          }`}
                        >
                          <div className="w-12 h-12 rounded-xl bg-[#FFFDF9] border-2 border-black flex items-center justify-center p-1 shrink-0 shadow-[1.5px_1.5px_0px_0px_#000]">
                            <ProductImage product={p} alt={isRTL ? p.name_ar || p.name : p.name} size="sm" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="block text-xs font-black text-black truncate">
                                {isRTL ? p.name_ar || p.name : p.name}
                              </span>
                              {isHighlight && (
                                <span className="px-2 py-0.5 bg-[#06D6A0] border border-black text-black text-[10px] font-black rounded-md shrink-0 select-none shadow-[1px_1px_0px_0px_#000]">
                                  {isRTL ? 'أفضل مطابقة' : 'Top Match'}
                                </span>
                              )}
                            </div>
                            <span className="block text-[9px] text-neutral-600 uppercase tracking-wider font-black mt-1">
                              {p.category}
                            </span>
                          </div>
                          <span className="text-xs font-black font-mono text-black bg-[#FFE600] border border-black px-2 py-0.5 rounded-lg shadow-[1.5px_1.5px_0px_0px_#000] shrink-0">
                            {formatPrice(p.our_price)}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )
              ) : (
                // Suggestions Panel in Mobile
                <div className="flex flex-col gap-5 pt-2">
                  {/* Dynamic Hyper-Adaptive Suggestions for Mobile Session */}
                  {suggestedSearchQueries.length > 0 && (
                    <div className="p-3.5 bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_#000] text-start">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[10px] font-black text-neutral-800 uppercase tracking-widest flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-black fill-[#FFE600]" />
                          {isRTL ? 'توصيات ذكية مخصصة لجلستك' : 'AI PREDICTIVE SEARCHES'}
                        </span>
                        <span className="text-[9px] font-mono font-black bg-[#06D6A0] text-black px-2 py-0.5 rounded border border-black animate-pulse">
                          {topCategory || 'Hyper-Adaptive AI'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {suggestedSearchQueries.map((chip, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
                                document.activeElement.blur();
                              }
                              handleSearchInputChange(isRTL ? chip.queryAr : chip.queryEn);
                            }}
                            className="flex items-center justify-between px-3.5 py-2.5 bg-[#FFFDF9] hover:bg-[#FFE600] border-2 border-black rounded-xl text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all text-start cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <Search className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                              <span>{isRTL ? chip.queryAr : chip.queryEn}</span>
                            </span>
                            <ArrowRight className={`w-3 h-3 stroke-[2.5] ${isRTL ? 'rotate-180' : ''}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-black text-neutral-700 uppercase tracking-widest block mb-2.5 text-start">
                      {isRTL ? 'الأقسام الشائعة' : 'POPULAR CATEGORIES'}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { name_en: 'Subscriptions', name_ar: 'الاشتراكات', bg: 'bg-[#FF70A6]' },
                        { name_en: 'VPNs & Security', name_ar: 'الشبكات والخصوصية', bg: 'bg-[#FFE600]' },
                        { name_en: 'Software', name_ar: 'البرامج والأنظمة', bg: 'bg-[#4CC9F0]' },
                        { name_en: 'Accounts', name_ar: 'الحسابات والذكاء الاصطناعي', bg: 'bg-[#06D6A0]' },
                      ].map((cat, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
                              document.activeElement.blur();
                            }
                            handleSearchInputChange(cat.name_en);
                          }}
                          className={`px-3 py-2.5 ${cat.bg} border-2 border-black text-xs text-black rounded-xl font-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer text-start flex items-center justify-between`}
                        >
                          <span>{isRTL ? cat.name_ar : cat.name_en}</span>
                          <ArrowRight className={`w-3 h-3 stroke-[2.5] ${isRTL ? 'rotate-180' : ''}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Mobile Dropdown Menu & Backdrop with Robotic Elevator Physics ── */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              {/* Full-screen solid dark backdrop overlay */}
              <motion.div
                key="mobile-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="md:hidden fixed inset-0 bg-black/60 z-40"
                onClick={() => setMobileMenuOpen(false)}
              />

              {/* Robotic Elevator Shutter Wrapper (Emerged directly from navbar bottom seam) */}
              <div className="md:hidden absolute top-full left-0 right-0 z-50 overflow-hidden pointer-events-none">
                <motion.div
                  key="mobile-drawer"
                  dir={isRTL ? 'rtl' : 'ltr'}
                  onClick={(e) => e.stopPropagation()}
                  initial={{ y: '-100%' }}
                  animate={{ y: '0%' }}
                  exit={{ y: '-100%' }}
                  transition={{ 
                    type: 'spring',
                    damping: 32,
                    stiffness: 380,
                    mass: 0.7
                  }}
                  className="pointer-events-auto w-full border-b-[3.5px] border-black bg-[#FFE600] p-4 sm:p-5 flex flex-col gap-2.5 rounded-b-[2rem] shadow-[0px_10px_0px_0px_#000]"
                >
                  {/* ── User Profile Header in Drawer ── */}
                  {user ? (
                    <div className="flex items-center justify-between p-3 bg-white border-2 border-black rounded-2xl shadow-[2.5px_2.5px_0px_0px_#000]">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-xl text-black font-black flex items-center justify-center text-sm shrink-0 bg-[#06D6A0] border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]">
                          {userInitial}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-black truncate">{userName}</p>
                          <p className="text-[10px] text-neutral-500 font-bold truncate">{user.email}</p>
                        </div>
                      </div>
                      <Link
                        href={isAdmin ? '/dashboard?as=user' : '/dashboard'}
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-3 py-1.5 bg-[#06D6A0] hover:bg-[#05b385] border-2 border-black rounded-xl text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 shrink-0 transition-all cursor-pointer"
                      >
                        {isRTL ? 'لوحة التحكم' : 'Dashboard'}
                      </Link>
                    </div>
                  ) : (
                    <Link
                      href="/auth/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between p-3 bg-white hover:bg-neutral-50 border-2 border-black rounded-2xl text-xs font-black text-black shadow-[2.5px_2.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#FFE600] border border-black flex items-center justify-center shadow-[1px_1px_0px_0px_#000]">
                          <Lock className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                        </div>
                        <span>{isRTL ? 'تسجيل الدخول / إنشاء حساب' : 'Sign In / Register'}</span>
                      </div>
                      <ArrowRight className={`w-4 h-4 text-black stroke-[2.5] ${isRTL ? 'rotate-180' : ''}`} />
                    </Link>
                  )}

                  {/* ── Admin Panel Bar (Only visible if Admin) ── */}
                  {user && isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between px-3.5 py-2.5 bg-white border-2 border-black rounded-xl text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 stroke-[2.5]" />
                        <span>{isRTL ? 'لوحة تحكم الأدمن' : 'Admin Panel'}</span>
                      </div>
                      <span className="text-[10px] font-mono bg-black text-[#FFE600] px-1.5 py-0.5 rounded font-black">
                        ADMIN
                      </span>
                    </Link>
                  )}

                  {/* ── Store Navigation 2x2 Grid ── */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <Link
                      href="/browse"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white hover:bg-neutral-50 border-2 border-black rounded-xl text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                    >
                      <Search className="w-4 h-4 text-black stroke-[2.5] shrink-0" />
                      <span>{isRTL ? 'تصفح المتجر' : 'Browse'}</span>
                    </Link>

                    <Link
                      href="/track"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white hover:bg-neutral-50 border-2 border-black rounded-xl text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                    >
                      <Package className="w-4 h-4 text-black stroke-[2.5] shrink-0" />
                      <span>{isRTL ? 'تتبع الطلبات' : 'Track Orders'}</span>
                    </Link>

                    <Link
                      href="/#deals"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white hover:bg-neutral-50 border-2 border-black rounded-xl text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                    >
                      <Zap className="w-4 h-4 text-black stroke-[2.5] fill-[#FFE600] shrink-0" />
                      <span>{isRTL ? 'عروض الفلاش' : 'Flash Deals'}</span>
                    </Link>

                    <Link
                      href="/referral"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#06D6A0] hover:bg-[#05b385] border-2 border-black rounded-xl text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                    >
                      <Gift className="w-4 h-4 text-black stroke-[2.5] shrink-0" />
                      <span>{isRTL ? 'اربح $1 كاش' : 'Earn $1'}</span>
                    </Link>

                    <Link
                      href="/notifications"
                      onClick={() => setMobileMenuOpen(false)}
                      className="col-span-2 flex items-center justify-between px-3.5 py-2.5 bg-white hover:bg-neutral-50 border-2 border-black rounded-xl text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Bell className="w-4 h-4 text-black stroke-[2.5] shrink-0" />
                        <span className="truncate">{isRTL ? 'الإشعارات' : 'Notifications'}</span>
                      </div>
                      {unreadNotifications > 0 ? (
                        <span className="px-2 py-0.5 text-[10px] font-black text-black bg-[#FF70A6] rounded-full border border-black shrink-0 animate-pulse">
                          {unreadNotifications} {isRTL ? 'جديد' : 'new'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-neutral-500 font-bold">0</span>
                      )}
                    </Link>
                  </div>

                  {/* ── Language & Currency Button ── */}
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setMobileLocaleModalOpen(true);
                    }}
                    className="flex items-center justify-between px-4 py-2.5 bg-white hover:bg-neutral-50 border-2 border-black rounded-xl text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Globe className="w-4 h-4 text-black stroke-[2.5]" />
                      <span>{isRTL ? 'اللغة والعملة' : 'Language & Currency'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[11px] bg-[#FFE600] border border-black px-2 py-0.5 rounded-lg shadow-xs">
                      <span>{mounted ? (language === 'ar' ? 'العربية' : 'EN') : 'EN'}</span>
                      <span>•</span>
                      <span>{mounted ? (country === 'EG' ? 'EGP' : country === 'SA' ? 'SAR' : 'USD') : 'USD'}</span>
                    </div>
                  </button>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>
      </header>

      {/* ── Mobile Dedicated Language & Currency Bottom Sheet Modal ── */}
      {mobileLocaleModalOpen && (
        <div 
          className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-[fadeIn_0.15s_ease-out]"
          onClick={() => setMobileLocaleModalOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-[#FFFDF9] border-t-4 sm:border-4 border-black rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-[0px_-6px_0px_0px_#000] sm:shadow-[8px_8px_0px_0px_#000] max-h-[85vh] overflow-y-auto"
            dir={isRTL ? 'rtl' : 'ltr'}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b-2 border-black mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FFE600] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_#000]">
                  <Globe className="w-5 h-5 text-black stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-black leading-none">
                    {isRTL ? 'اللغة والعملة' : 'Language & Currency'}
                  </h3>
                  <p className="text-[11px] text-neutral-600 font-bold mt-0.5">
                    {isRTL ? 'اختر الدولة واللغة المناسبة لك' : 'Select your preferred region & language'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileLocaleModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white border-2 border-black flex items-center justify-center text-black font-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer text-xs"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* 1. Language Section */}
            <div className="mb-6">
              <p className="text-xs font-black text-neutral-800 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                <span>{isRTL ? 'اللغة المفضلة' : 'Language'}</span>
                <span className="text-[10px] text-neutral-500 font-bold">{isRTL ? 'تطبيق فوري' : 'Instant apply'}</span>
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { v: 'ar', label: 'العربية (AR)' },
                  { v: 'en', label: 'English (EN)' },
                ].map((opt) => {
                  const isSelected = mounted ? language === opt.v : opt.v === 'ar';
                  return (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => {
                        setLanguage(opt.v as any);
                        setMobileLocaleModalOpen(false);
                        toast.success(opt.v === 'ar' ? 'تم ضبط اللغة إلى العربية' : 'Language set to English');
                      }}
                      className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-black border-2 transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-[#FFE600] text-black border-black shadow-[3px_3px_0px_0px_#000]'
                          : 'bg-white text-neutral-800 border-black/30 hover:border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check className="w-4 h-4 stroke-[3] text-black" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Country & Currency Section */}
            <div>
              <p className="text-xs font-black text-neutral-800 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                <span>{isRTL ? 'الدولة والعملة المعروضة' : 'Country & Currency'}</span>
                <span className="text-[10px] text-neutral-500 font-bold">{isRTL ? 'أسعار مخصصة' : 'Localized pricing'}</span>
              </p>
              <div className="flex flex-col gap-2.5">
                {[
                  { v: 'EG', label: isRTL ? 'مصر (EGP - الجنيه المصري)' : 'Egypt (EGP - Egyptian Pound)', flagUrl: 'https://flagcdn.com/w80/eg.png', code: 'EGP' },
                  { v: 'SA', label: isRTL ? 'المملكة العربية السعودية (SAR - الريال)' : 'Saudi Arabia (SAR - Saudi Riyal)', flagUrl: 'https://flagcdn.com/w80/sa.png', code: 'SAR' },
                  { v: 'US', label: isRTL ? 'عالمي وباقي الدول (USD - الدولار)' : 'Global & Other Countries (USD - US Dollar)', flagUrl: 'https://flagcdn.com/w80/us.png', code: 'USD' },
                ].map((opt) => {
                  const isSelected = mounted ? country === opt.v : opt.v === 'EG';
                  return (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => {
                        setCountry(opt.v as any);
                        setMobileLocaleModalOpen(false);
                        toast.success(
                          opt.v === 'EG'
                            ? (isRTL ? 'تم تحويل العملة إلى الجنيه المصري (EGP)' : 'Currency set to Egyptian Pound (EGP)')
                            : opt.v === 'SA'
                            ? (isRTL ? 'تم تحويل العملة إلى الريال السعودي (SAR)' : 'Currency set to Saudi Riyal (SAR)')
                            : (isRTL ? 'تم تحويل العملة إلى الدولار الأمريكي (USD)' : 'Currency set to US Dollar (USD)')
                        );
                      }}
                      className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-black border-2 transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-[#FFE600] text-black border-black shadow-[3px_3px_0px_0px_#000]'
                          : 'bg-white text-neutral-800 border-black/30 hover:border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-6 h-4.5 rounded overflow-hidden border border-black shadow-xs shrink-0">
                          <img src={opt.flagUrl} alt={opt.label} className="w-full h-full object-cover" />
                        </div>
                        <span className="truncate">{opt.label}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 stroke-[3] text-black shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

