'use client';

import { create } from 'zustand';
import { getClientTelemetry } from '@/utils/clientTelemetry';

export type DetectedPersonaType = 'rushed' | 'deliberate' | 'elderly' | 'power' | 'balanced';

export type InterventionType =
  | 'self_healed_notice'
  | 'network_recovery'
  | 'checkout_helper'
  | 'currency_match'
  | 'rage_relief'
  | 'confusion_guide'
  | 'hesitation_reassurance'
  | 'speed_shortcut'
  | 'eye_comfort'
  | 'payment_guide'
  | 'warranty_trust'
  | 'instant_discount'
  | 'comparison_helper'
  | 'quick_checkout';

export interface AdaptiveIntervention {
  id: string;
  type: InterventionType;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  actionLabelAr?: string;
  actionLabelEn?: string;
  actionUrl?: string;
  actionSlug?: string;
  onAction?: () => void;
  timestamp: number;
}

export interface SuggestedSearchQuery {
  queryAr: string;
  queryEn: string;
}

export interface TelemetryContext {
  userId?: string | null;
  userEmail?: string | null;
  displayName?: string | null;
  cartCount?: number;
  cartSlugs?: string[];
  currentPath?: string;
  language?: 'ar' | 'en';
}

export interface HyperAdaptiveState {
  // Master Switch
  enabled: boolean;

  // Real-time Autonomous AI Telemetry & Status
  detectedPersona: DetectedPersonaType;
  personaConfidence: number;
  aiActivityAr: string;
  aiActivityEn: string;
  isOptimalLocked: boolean;

  // Real-time Behavioral & Session Affinities
  topCategory: string;
  categoryScores: Record<string, number>;
  viewedSlugs: string[];
  searchHistory: string[];
  priceSensitivity: 'low' | 'medium' | 'high';
  
  // Cognitive & Emotional Telemetry
  rageClicksCount: number;
  confusionScore: number;
  hesitationLevel: 'none' | 'low' | 'moderate' | 'high';
  cognitiveLoad: number; // 0 - 100 (0 = 100% perfect flow)
  frustrationDetected: boolean;
  isReadingFocused: boolean;

  // Ambient & Hardware Telemetry
  networkSpeed: 'fast' | 'moderate' | 'slow';
  isLowBattery: boolean;
  tremorDetected: boolean;
  isLateNight: boolean;

  // Deep AI Intent & Next Step Predictions
  detectedIntentAr: string;
  detectedIntentEn: string;
  predictedNextStepAr: string;
  predictedNextStepEn: string;
  suggestedSearchQueries: SuggestedSearchQuery[];
  recommendedSlugs: string[];
  isAiThinking: boolean;
  lastAiSyncTime: number;

  // Anticipatory Prefetching & Micro-Targeting
  predictedTargetSlug: string | null;
  targetConfidence: number;

  // Session & User Identity
  sessionId: string;
  userId: string | null;
  userEmail: string | null;
  displayName: string | null;

  // Self-Healing Telemetry
  healedIssuesCount: number;

  // Active Interventions
  activeIntervention: AdaptiveIntervention | null;
  shownInterventionTypes: Set<string>;

  // Actions
  setEnabled: (enabled: boolean) => void;
  fetchCloudPreferences: () => Promise<void>;
  saveCloudPreferences: (enabledOverride?: boolean) => Promise<void>;
  recordHealedIssue: (_event?: unknown) => void;
  setUserInfo: (info: { userId?: string | null; userEmail?: string | null; displayName?: string | null }) => void;
  sendTelemetryBeacon: (context?: TelemetryContext) => Promise<void>;
  setDetectedPersona: (persona: DetectedPersonaType, confidence: number) => void;
  setAiActivity: (activityAr: string, activityEn: string) => void;
  lockOptimalState: () => void;
  decayCognitiveLoad: () => void;
  recordRageClick: () => void;
  recordConfusionScroll: (delta: number) => void;
  setHesitationLevel: (level: 'none' | 'low' | 'moderate' | 'high') => void;
  setCognitiveLoad: (load: number) => void;
  setIsReadingFocused: (isReading: boolean) => void;
  setAmbientState: (ambient: Partial<Pick<HyperAdaptiveState, 'networkSpeed' | 'isLowBattery' | 'tremorDetected' | 'isLateNight'>>) => void;
  
  // Real-Time Behavioral Feed Actions
  recordProductView: (slug: string, category?: string, price?: number) => void;
  recordCategoryDwell: (category: string, deltaSeconds: number) => void;
  recordSearchQuery: (query: string) => void;
  setPredictedTarget: (slug: string | null, confidence?: number) => void;
  
  // AI Intent Sync Actions
  setAiPredictions: (predictions: {
    detectedIntentAr?: string;
    detectedIntentEn?: string;
    predictedNextStepAr?: string;
    predictedNextStepEn?: string;
    suggestedSearchQueries?: SuggestedSearchQuery[];
    recommendedSlugs?: string[];
  }) => void;
  setIsAiThinking: (thinking: boolean) => void;
  syncWithAiEngine: (sessionContext: {
    currentPath?: string;
    cartCount?: number;
    cartSlugs?: string[];
    language?: 'ar' | 'en';
  }) => Promise<void>;

  // Intervention Actions
  triggerIntervention: (intervention: Omit<AdaptiveIntervention, 'id' | 'timestamp'>) => void;
  dismissIntervention: () => void;
  resetMetrics: () => void;
}

const STORAGE_KEY = 'upstore_hyper_adaptive';
const SESSION_ID_KEY = 'upstore_ha_session_id';

const getSessionId = (): string => {
  if (typeof window === 'undefined') return 'server_session';
  let id = localStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = 'ha_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
};

const getInitialEnabled = (): boolean => {
  if (typeof window === 'undefined') return true;
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === null ? true : saved !== 'false';
};

let beaconTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleTelemetryBeacon(getFn: () => HyperAdaptiveState) {
  if (typeof window === 'undefined') return;
  if (beaconTimer) clearTimeout(beaconTimer);
  beaconTimer = setTimeout(() => {
    try {
      getFn().sendTelemetryBeacon().catch(() => {});
    } catch {}
  }, 1500);
}

export const useHyperAdaptiveStore = create<HyperAdaptiveState>((set, get) => ({
  enabled: getInitialEnabled(),

  detectedPersona: 'balanced',
  personaConfidence: 100,
  isOptimalLocked: true,
  aiActivityAr: 'الواجهة في أقصى درجات الاستقرار والانسيابية (100% Perfect Flow)',
  aiActivityEn: 'Optimal UX locked at 100% perfect flow',

  topCategory: 'Subscriptions',
  categoryScores: { Subscriptions: 1 },
  viewedSlugs: [],
  searchHistory: [],
  priceSensitivity: 'medium',

  rageClicksCount: 0,
  confusionScore: 0,
  hesitationLevel: 'none',
  cognitiveLoad: 0,
  frustrationDetected: false,
  isReadingFocused: false,

  networkSpeed: 'fast',
  isLowBattery: false,
  tremorDetected: false,
  isLateNight: false,

  detectedIntentAr: 'استكشاف أفضل العروض الرقمية والاشتراكات الموثوقة',
  detectedIntentEn: 'Exploring premium subscriptions and verified digital keys',
  predictedNextStepAr: 'مقارنة الأسعار وسرعة التفعيل الفوري',
  predictedNextStepEn: 'Comparing product pricing and instant delivery speed',
  suggestedSearchQueries: [
    { queryAr: 'نتفليكس 4K ضمان 30 يوم', queryEn: 'Netflix Premium 4K 30 Days' },
    { queryAr: 'شات جي بي تي بلس فوري', queryEn: 'ChatGPT Plus Instant' },
    { queryAr: 'يوتيوب بريميوم بدون إعلانات', queryEn: 'YouTube Premium No Ads' },
    { queryAr: 'سبوتيفاي بريميوم حساب خاص', queryEn: 'Spotify Premium Private' },
  ],
  recommendedSlugs: ['netflix-premium-4k-1-month', 'chatgpt-plus-1-month', 'youtube-premium-12-months'],
  isAiThinking: false,
  lastAiSyncTime: 0,

  // Session & User Identity
  sessionId: getSessionId(),
  userId: null,
  userEmail: null,
  displayName: null,

  predictedTargetSlug: null,
  targetConfidence: 0,

  // Self-Healing Telemetry
  healedIssuesCount: 0,

  activeIntervention: null,
  shownInterventionTypes: new Set<string>(),

  setEnabled: (enabled) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
      if (enabled) {
        document.documentElement.setAttribute('data-hyper-adaptive', 'true');
      } else {
        document.documentElement.removeAttribute('data-hyper-adaptive');
      }
    }
    set({ enabled });
    // Persist immediately to Supabase database
    get().saveCloudPreferences(enabled).catch(() => {});
  },

  fetchCloudPreferences: async () => {
    if (typeof window === 'undefined') return;
    try {
      const res = await fetch('/api/ai/hyper-adaptive/preferences');
      if (res.ok) {
        const data = await res.json();
        if (data && data.isLoggedIn) {
          const isEnabled = data.enabled !== false;
          localStorage.setItem(STORAGE_KEY, isEnabled ? 'true' : 'false');
          if (isEnabled) {
            document.documentElement.setAttribute('data-hyper-adaptive', 'true');
          } else {
            document.documentElement.removeAttribute('data-hyper-adaptive');
          }
          set({
            enabled: isEnabled,
            detectedPersona: data.detectedPersona || get().detectedPersona,
            topCategory: data.topCategory || get().topCategory,
            healedIssuesCount: data.healedIssuesCount || get().healedIssuesCount,
          });
        }
      }
    } catch {
      // Graceful fallback to localStorage
    }
  },

  saveCloudPreferences: async (enabledOverride?: boolean) => {
    if (typeof window === 'undefined') return;
    const state = get();
    try {
      await fetch('/api/ai/hyper-adaptive/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: enabledOverride !== undefined ? enabledOverride : state.enabled,
          detectedPersona: state.detectedPersona,
          topCategory: state.topCategory,
          healedIssuesCount: state.healedIssuesCount,
        }),
      });
    } catch {
      // Ignore background persistence errors
    }
  },

  recordHealedIssue: (_event?: unknown) => {
    const nextCount = get().healedIssuesCount + 1;
    set({ healedIssuesCount: nextCount });
    try {
      localStorage.setItem('upstore_ha_healed_count', nextCount.toString());
    } catch {}
    get().saveCloudPreferences().catch(() => {});
  },

  setUserInfo: (info) => {
    set((state) => ({
      ...state,
      userId: info.userId !== undefined ? info.userId : state.userId,
      userEmail: info.userEmail !== undefined ? info.userEmail : state.userEmail,
      displayName: info.displayName !== undefined ? info.displayName : state.displayName,
    }));
    scheduleTelemetryBeacon(get);
  },

  sendTelemetryBeacon: async (context?: TelemetryContext) => {
    if (typeof window === 'undefined') return;
    const state = get();
    try {
      const payload = {
        sessionId: state.sessionId || getSessionId(),
        userId: context?.userId || state.userId || null,
        userEmail: context?.userEmail || state.userEmail || null,
        displayName: context?.displayName || state.displayName || null,
        persona: state.detectedPersona,
        personaConfidence: state.personaConfidence,
        cognitiveLoad: state.cognitiveLoad,
        confusionScore: state.confusionScore,
        hesitationLevel: state.hesitationLevel,
        priceSensitivity: state.priceSensitivity,
        topCategory: state.topCategory,
        categoryScores: state.categoryScores,
        viewedSlugs: state.viewedSlugs,
        searchHistory: state.searchHistory,
        cartCount: context?.cartCount || 0,
        cartSlugs: context?.cartSlugs || [],
        rageClicksCount: state.rageClicksCount,
        deviceInfo: {
          ...getClientTelemetry(),
          networkSpeed: state.networkSpeed,
          isLowBattery: state.isLowBattery,
          tremorDetected: state.tremorDetected,
          isLateNight: state.isLateNight,
        },
      };

      await fetch('/api/ai/hyper-adaptive/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Ignore background telemetry errors
    }
  },

  lockOptimalState: () => {
    set({
      cognitiveLoad: 0,
      confusionScore: 0,
      isOptimalLocked: true,
      personaConfidence: 100,
      aiActivityAr: 'الواجهة في أقصى درجات الاستقرار والانسيابية (100% Perfect Flow)',
      aiActivityEn: 'Optimal UX locked at 100% perfect flow',
    });
  },

  decayCognitiveLoad: () => {
    const { cognitiveLoad, isOptimalLocked } = get();
    if (cognitiveLoad > 0) {
      const nextLoad = Math.max(0, cognitiveLoad - 5);
      set({
        cognitiveLoad: nextLoad,
        isOptimalLocked: nextLoad === 0 ? true : isOptimalLocked,
      });
    }
  },

  setDetectedPersona: (detectedPersona, personaConfidence) => {
    const { isOptimalLocked } = get();
    if (isOptimalLocked && personaConfidence < 95) return;

    let activityAr = 'تخصيص متوازن ومستقر 100%';
    let activityEn = 'Balanced smooth adaptation (100% Optimal)';

    if (detectedPersona === 'rushed') {
      activityAr = 'تسريع الاستجابة وتحميل المنتجات فورياً';
      activityEn = 'Accelerating speed & instant pre-loads';
    } else if (detectedPersona === 'deliberate') {
      activityAr = 'إبراز الضمانات والمواصفات الكاملة';
      activityEn = 'Surfacing warranties & comprehensive specs';
    } else if (detectedPersona === 'elderly') {
      activityAr = 'وضوح القراءة وثبات أزرار اللمس';
      activityEn = 'Optimizing readability & stable touch targets';
    } else if (detectedPersona === 'power') {
      activityAr = 'تفعيل اختصارات المحترفين السريعة';
      activityEn = 'Power mode active with instant shortcuts';
    }

    set({
      detectedPersona,
      personaConfidence: Math.max(90, personaConfidence),
      aiActivityAr: activityAr,
      aiActivityEn: activityEn,
    });
  },

  setAiActivity: (aiActivityAr, aiActivityEn) => {
    set({ aiActivityAr, aiActivityEn });
  },

  recordRageClick: () => {
    const { rageClicksCount, cognitiveLoad, enabled } = get();
    if (!enabled) return;

    const newCount = rageClicksCount + 1;
    const newLoad = Math.min(100, cognitiveLoad + 25);
    const frustration = newCount >= 3;

    set({
      rageClicksCount: newCount,
      cognitiveLoad: newLoad,
      isOptimalLocked: false,
      frustrationDetected: frustration,
      aiActivityAr: 'معالجة الانزعاج وتقديم المساعدة الفورية',
      aiActivityEn: 'Resolving friction & offering instant relief',
    });

    if (frustration && !get().activeIntervention && !get().shownInterventionTypes.has('rage_relief')) {
      get().triggerIntervention({
        type: 'rage_relief',
        titleAr: 'واجهت مشكلة أو تأخير؟ نساعدك فوراً!',
        titleEn: 'Need Instant Help? We Got You!',
        descAr: 'جميع المنتجات مضمونة باستبدال ذهبي فوري، ودعمنا متاح 24/7 عبر تيليجرام.',
        descEn: 'All products carry a 30-day replacement warranty with 24/7 live support.',
        actionLabelAr: 'تحدث مع الدعم الفني',
        actionLabelEn: 'Contact VIP Support',
        actionUrl: 'https://t.me/upstore_one_bot',
      });
    }
  },

  recordConfusionScroll: (delta) => {
    const { confusionScore, cognitiveLoad, enabled, isOptimalLocked } = get();
    if (!enabled || isOptimalLocked) return;

    const newScore = Math.min(100, confusionScore + delta);
    const newLoad = Math.min(100, cognitiveLoad + delta * 0.3);

    set({
      confusionScore: newScore,
      cognitiveLoad: newLoad,
    });
  },

  setHesitationLevel: (hesitationLevel) => {
    set({ hesitationLevel });
  },

  setCognitiveLoad: (cognitiveLoad) => {
    set({
      cognitiveLoad,
      isOptimalLocked: cognitiveLoad === 0,
    });
  },

  setIsReadingFocused: (isReadingFocused) => {
    set({ isReadingFocused });
    if (typeof document !== 'undefined') {
      if (isReadingFocused) {
        document.documentElement.classList.add('adaptive-reading-focus');
      } else {
        document.documentElement.classList.remove('adaptive-reading-focus');
      }
    }
  },

  setAmbientState: (ambient) => {
    set((state) => ({ ...state, ...ambient }));
  },

  // ── Real-time Behavioral Feed Tracking ────────────────────────────────────
  recordProductView: (slug, category, price) => {
    if (!slug) return;
    const { viewedSlugs, categoryScores, priceSensitivity } = get();
    
    // Add to viewed slugs history (deduped latest 10)
    const nextViewed = [slug, ...viewedSlugs.filter((s) => s !== slug)].slice(0, 10);
    
    // Update category scores
    const nextScores = { ...categoryScores };
    if (category) {
      nextScores[category] = (nextScores[category] || 0) + 3;
    }

    // Determine top category
    let topCat = 'Subscriptions';
    let maxScore = -1;
    for (const [cat, score] of Object.entries(nextScores)) {
      if (score > maxScore) {
        maxScore = score;
        topCat = cat;
      }
    }

    // Evaluate price sensitivity
    let nextPriceSensitivity = priceSensitivity;
    if (price !== undefined) {
      if (price < 10) nextPriceSensitivity = 'high';
      else if (price > 40) nextPriceSensitivity = 'low';
      else nextPriceSensitivity = 'medium';
    }

    set({
      viewedSlugs: nextViewed,
      categoryScores: nextScores,
      topCategory: topCat,
      priceSensitivity: nextPriceSensitivity,
    });
    scheduleTelemetryBeacon(get);
  },

  recordCategoryDwell: (category, deltaSeconds) => {
    if (!category || deltaSeconds <= 0) return;
    const { categoryScores } = get();
    const nextScores = { ...categoryScores };
    nextScores[category] = (nextScores[category] || 0) + deltaSeconds;

    let topCat = get().topCategory;
    let maxScore = -1;
    for (const [cat, score] of Object.entries(nextScores)) {
      if (score > maxScore) {
        maxScore = score;
        topCat = cat;
      }
    }

    set({ categoryScores: nextScores, topCategory: topCat });
  },

  recordSearchQuery: (query) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;
    const { searchHistory, categoryScores } = get();
    const nextSearches = [trimmed, ...searchHistory.filter((q) => q !== trimmed)].slice(0, 8);

    // Increment category affinity based on query content
    const qLower = trimmed.toLowerCase();
    const nextScores = { ...categoryScores };
    if (qLower.includes('netflix') || qLower.includes('نتفلكس') || qLower.includes('spotify') || qLower.includes('youtube') || qLower.includes('بث')) {
      nextScores['Subscriptions'] = (nextScores['Subscriptions'] || 0) + 4;
    } else if (qLower.includes('gpt') || qLower.includes('gemini') || qLower.includes('ai') || qLower.includes('ذكاء')) {
      nextScores['Accounts'] = (nextScores['Accounts'] || 0) + 4;
    } else if (qLower.includes('xbox') || qLower.includes('steam') || qLower.includes('game') || qLower.includes('لعبة')) {
      nextScores['Game Keys'] = (nextScores['Game Keys'] || 0) + 4;
    } else if (qLower.includes('vpn') || qLower.includes('nord') || qLower.includes('حماية')) {
      nextScores['VPNs & Security'] = (nextScores['VPNs & Security'] || 0) + 4;
    }

    set({ searchHistory: nextSearches, categoryScores: nextScores });
    scheduleTelemetryBeacon(get);
  },

  setPredictedTarget: (predictedTargetSlug, targetConfidence = 85) => {
    set({ predictedTargetSlug, targetConfidence });
  },

  setAiPredictions: (predictions) => {
    set((state) => ({
      ...state,
      ...predictions,
      lastAiSyncTime: Date.now(),
    }));
  },

  setIsAiThinking: (isAiThinking) => {
    set({ isAiThinking });
  },

  syncWithAiEngine: async (sessionContext) => {
    const state = get();
    if (!state.enabled || state.isAiThinking) return;

    // Limit sync frequency (at least 6s between calls)
    const now = Date.now();
    if (now - state.lastAiSyncTime < 6000) return;

    set({ isAiThinking: true });

    try {
      const payload = {
        language: sessionContext.language || 'ar',
        currentPath: sessionContext.currentPath || window.location.pathname,
        viewedSlugs: state.viewedSlugs,
        topCategory: state.topCategory,
        categoryDwellTimes: state.categoryScores,
        searchHistory: state.searchHistory,
        cartCount: sessionContext.cartCount || 0,
        cartSlugs: sessionContext.cartSlugs || [],
        hesitationLevel: state.hesitationLevel,
        priceSensitivity: state.priceSensitivity,
        detectedPersona: state.detectedPersona,
      };

      const res = await fetch('/api/ai/hyper-adaptive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        set({
          detectedIntentAr: data.detectedIntentAr || state.detectedIntentAr,
          detectedIntentEn: data.detectedIntentEn || state.detectedIntentEn,
          predictedNextStepAr: data.predictedNextStepAr || state.predictedNextStepAr,
          predictedNextStepEn: data.predictedNextStepEn || state.predictedNextStepEn,
          suggestedSearchQueries: Array.isArray(data.suggestedSearchQueries) && data.suggestedSearchQueries.length > 0
            ? data.suggestedSearchQueries
            : state.suggestedSearchQueries,
          recommendedSlugs: Array.isArray(data.recommendedSlugs) && data.recommendedSlugs.length > 0
            ? data.recommendedSlugs
            : state.recommendedSlugs,
          lastAiSyncTime: now,
        });

        // Trigger smart intervention if suggested by AI and not yet shown
        if (data.smartIntervention && !state.activeIntervention && !state.shownInterventionTypes.has(data.smartIntervention.type)) {
          get().triggerIntervention(data.smartIntervention);
        }

        // Also send telemetry beacon to persist user profile & behavior in Supabase
        get().sendTelemetryBeacon(sessionContext).catch(() => {});
      }
    } catch (err) {
      console.warn('[Hyper-Adaptive Store] AI sync error:', err);
    } finally {
      set({ isAiThinking: false });
    }
  },

  triggerIntervention: (intervention) => {
    const { shownInterventionTypes } = get();
    if (shownInterventionTypes.has(intervention.type)) return;

    const id = Math.random().toString(36).substring(2, 9);
    const fullIntervention: AdaptiveIntervention = {
      ...intervention,
      id,
      timestamp: Date.now(),
    };

    const nextShown = new Set(shownInterventionTypes);
    nextShown.add(intervention.type);

    set({
      activeIntervention: fullIntervention,
      shownInterventionTypes: nextShown,
    });

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {}
    }

    setTimeout(() => {
      if (get().activeIntervention?.id === id) {
        set({ activeIntervention: null });
      }
    }, 8000);
  },

  dismissIntervention: () => {
    set({ activeIntervention: null });
  },

  resetMetrics: () => {
    set({
      rageClicksCount: 0,
      confusionScore: 0,
      hesitationLevel: 'none',
      cognitiveLoad: 0,
      isOptimalLocked: true,
      frustrationDetected: false,
      isReadingFocused: false,
      activeIntervention: null,
      detectedPersona: 'balanced',
      personaConfidence: 100,
      aiActivityAr: 'الواجهة في أقصى درجات الاستقرار والانسيابية (100% Perfect Flow)',
      aiActivityEn: 'Optimal UX locked at 100% perfect flow',
      categoryScores: { Subscriptions: 1 },
      viewedSlugs: [],
      searchHistory: [],
    });
  },
}));
