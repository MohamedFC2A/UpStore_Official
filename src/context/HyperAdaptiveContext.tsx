'use client';

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useHyperAdaptiveStore, DetectedPersonaType } from '@/store/useHyperAdaptiveStore';
import { useCartStore } from '@/store/useCartStore';
import { useLocale } from '@/context/LocaleContext';
import { createClient } from '@/utils/supabase/client';
import { selfHealingEngine, SelfHealingEvent } from '@/utils/selfHealingEngine';

interface HyperAdaptiveContextProps {
  enabled: boolean;
  detectedPersona: DetectedPersonaType;
}

const HyperAdaptiveContext = createContext<HyperAdaptiveContextProps | undefined>(undefined);

export function HyperAdaptiveProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { language } = useLocale();
  const cartItems = useCartStore((s) => s.items);

  const {
    enabled,
    detectedPersona,
    recordRageClick,
    recordConfusionScroll,
    setIsReadingFocused,
    recordProductView,
    syncWithAiEngine,
    triggerIntervention,
    shownInterventionTypes,
    activeIntervention,
    setUserInfo,
    fetchCloudPreferences,
    recordHealedIssue,
  } = useHyperAdaptiveStore();

  // ── Initialize Self-Healing Engine & Load Cloud Database Preferences ───────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    selfHealingEngine.init();

    // Fetch user's persisted preferences from Supabase
    fetchCloudPreferences().catch(() => {});

    // Listen to autonomous healing events
    const unsubscribe = selfHealingEngine.subscribe((event: SelfHealingEvent) => {
      recordHealedIssue(event);

      // Trigger empathetic reassurance intervention for major self-healed incidents
      if (event.type === 'network' && !activeIntervention) {
        triggerIntervention({
          type: 'network_recovery',
          titleAr: event.titleAr,
          titleEn: event.titleEn,
          descAr: event.descriptionAr,
          descEn: event.descriptionEn,
          actionLabelAr: 'متابعة التصفح',
          actionLabelEn: 'Continue',
        });
      }
    });

    // Capture broken image errors globally and auto-heal them
    const handleCaptureError = (e: Event) => {
      const target = e.target;
      if (target instanceof HTMLImageElement) {
        selfHealingEngine.healImageElement(target);
      }
    };
    window.addEventListener('error', handleCaptureError, true);

    return () => {
      unsubscribe();
      window.removeEventListener('error', handleCaptureError, true);
    };
  }, [fetchCloudPreferences, recordHealedIssue, triggerIntervention, activeIntervention]);

  // ── Sync Logged-In User Profile ─────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const supabase = createClient();
      supabase.auth.getUser().then((res: any) => {
        const user = res?.data?.user;
        if (user) {
          setUserInfo({
            userId: user.id,
            userEmail: user.email,
            displayName: user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0],
          });
          // Re-fetch preferences with logged-in credentials
          fetchCloudPreferences().catch(() => {});
        }
      }).catch(() => {});
    } catch {}
  }, [setUserInfo, fetchCloudPreferences]);

  const clickHistoryRef = useRef<Array<{ x: number; y: number; time: number }>>([]);
  const scrollHistoryRef = useRef<Array<{ y: number; dir: 'up' | 'down'; time: number }>>([]);

  const hesitationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const readingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const exitIntentTriggeredRef = useRef(false);

  // ── 1. Root DOM & CSS Variable Synchronization ──────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;

    if (enabled) {
      root.setAttribute('data-hyper-adaptive', 'true');
      root.setAttribute('data-adaptive-persona', detectedPersona);

      if (detectedPersona === 'elderly') {
        root.classList.add('adaptive-elderly-mode');
      } else {
        root.classList.remove('adaptive-elderly-mode');
      }

      if (detectedPersona === 'rushed') {
        root.classList.add('adaptive-rushed-mode');
      } else {
        root.classList.remove('adaptive-rushed-mode');
      }
    } else {
      root.removeAttribute('data-hyper-adaptive');
      root.removeAttribute('data-adaptive-persona');
      root.classList.remove('adaptive-elderly-mode', 'adaptive-rushed-mode', 'adaptive-touch-enlarged', 'adaptive-reading-focus');
    }
  }, [enabled, detectedPersona]);

  // ── 2. Route Changes & Product Path Telemetry ───────────────────────────────
  useEffect(() => {
    if (!enabled || !pathname) return;

    if (pathname.startsWith('/product/')) {
      const slug = pathname.replace('/product/', '').split('?')[0].split('#')[0];
      if (slug) {
        let inferredCategory = 'Subscriptions';
        if (slug.includes('gpt') || slug.includes('gemini') || slug.includes('ai') || slug.includes('account')) {
          inferredCategory = 'Accounts';
        } else if (slug.includes('xbox') || slug.includes('steam') || slug.includes('game')) {
          inferredCategory = 'Game Keys';
        } else if (slug.includes('vpn') || slug.includes('nord') || slug.includes('security')) {
          inferredCategory = 'VPNs & Security';
        } else if (slug.includes('office') || slug.includes('windows') || slug.includes('software')) {
          inferredCategory = 'Software';
        }

        recordProductView(slug, inferredCategory);
      }
    }

    const timer = setTimeout(() => {
      syncWithAiEngine({
        currentPath: pathname,
        cartCount: cartItems.length,
        cartSlugs: cartItems.map((i) => i.product?.slug || i.product_id),
        language: language === 'en' ? 'en' : 'ar',
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [pathname, enabled, recordProductView, syncWithAiEngine, cartItems, language]);

  // ── 3. Optimized Event Listeners (Passive & rAF throttled) ──────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) return;

    // A. Rage Click Listener
    const handlePointerDown = (e: PointerEvent) => {
      const now = Date.now();
      const newHistory = [
        ...clickHistoryRef.current.filter((c) => now - c.time < 650),
        { x: e.clientX, y: e.clientY, time: now },
      ];
      clickHistoryRef.current = newHistory;

      if (newHistory.length >= 3) {
        const first = newHistory[0];
        const last = newHistory[newHistory.length - 1];
        const dist = Math.hypot(last.x - first.x, last.y - first.y);

        if (dist < 40) {
          recordRageClick();
          clickHistoryRef.current = [];
        }
      }
    };

    // B. Throttled Scroll Listener (Lightweight 200ms interval)
    let lastScrollCheck = Date.now();
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const now = Date.now();
      if (now - lastScrollCheck < 200) return;
      lastScrollCheck = now;

      const currentY = window.scrollY;
      const dy = currentY - lastScrollY;
      const dir: 'up' | 'down' = dy > 0 ? 'down' : 'up';
      lastScrollY = currentY;

      if (Math.abs(dy) > 150) {
        const recentScrolls = [
          ...scrollHistoryRef.current.filter((s) => now - s.time < 2200),
          { y: currentY, dir, time: now },
        ];
        scrollHistoryRef.current = recentScrolls;

        let reversals = 0;
        for (let i = 1; i < recentScrolls.length; i++) {
          if (recentScrolls[i].dir !== recentScrolls[i - 1].dir) {
            reversals++;
          }
        }

        if (reversals >= 3) {
          recordConfusionScroll(20);
          scrollHistoryRef.current = [];
        }
      }
    };

    // C. Ultra-Lightweight Document Exit Intent Listener (0% CPU overhead)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 10 && !exitIntentTriggeredRef.current) {
        exitIntentTriggeredRef.current = true;

        if (cartItems.length > 0 && !activeIntervention && !shownInterventionTypes.has('quick_checkout')) {
          triggerIntervention({
            type: 'quick_checkout',
            titleAr: 'طلبك في انتظارك — استبدال سريع وضمان 30 يوماً',
            titleEn: 'Your Cart is Waiting — Fast Activation & 30-Day Warranty',
            descAr: 'نوفر الدفع المباشر عبر فودافون كاش وإنستاباي والبطاقات مع دفع عالمي وضمان شامل كامل المدة.',
            descEn: 'Global secure payment via Vodafone Cash, InstaPay, Visa & Crypto with full warranty.',
            actionLabelAr: 'إتمام الطلب الآن',
            actionLabelEn: 'Checkout Now',
            actionUrl: '/cart',
          });
        }
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mouseleave', handleMouseLeave);
      const hTimer = hesitationTimerRef.current;
      const rTimer = readingTimerRef.current;
      if (hTimer) clearTimeout(hTimer);
      if (rTimer) clearTimeout(rTimer);
    };
  }, [
    enabled,
    recordRageClick,
    recordConfusionScroll,
    setIsReadingFocused,
    cartItems,
    activeIntervention,
    shownInterventionTypes,
    triggerIntervention,
  ]);

  return (
    <HyperAdaptiveContext.Provider value={{ enabled, detectedPersona }}>
      {children}
    </HyperAdaptiveContext.Provider>
  );
}

export function useHyperAdaptive() {
  const context = useContext(HyperAdaptiveContext);
  if (!context) {
    return { enabled: false, detectedPersona: 'normal' as DetectedPersonaType };
  }
  return context;
}
