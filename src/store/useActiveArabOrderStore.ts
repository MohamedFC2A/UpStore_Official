import { create } from 'zustand';
import { useToastStore } from './useToastStore';

export interface ActiveArabOrder {
  orderId: string;
  sessionId: string;
  countryName: string;
  countryCode?: string;
  flagUrl: string;
  methodName: string;
  methodId?: string;
  displayPrice: string;
  startedAt: number; // timestamp ms
  isFulfilled: boolean;
  deliveredKey?: string | null;
  telegramUrl?: string;
  items?: Array<{
    name: string;
    quantity: number;
    amount?: number;
  }>;
  totalUsd?: number;
}

interface ActiveArabOrderStore {
  activeOrder: ActiveArabOrder | null;
  isModalOpen: boolean;
  isDismissedFloating: boolean;
  hasShownExitToast: boolean;
  
  // Actions
  init: () => void;
  hasActiveCountdown: () => boolean;
  setActiveOrder: (order: ActiveArabOrder) => void;
  updateFulfillment: (deliveredKey: string | null) => void;
  clearActiveOrder: () => void;
  openModal: () => void;
  closeModal: (triggerAlert?: boolean, isArabic?: boolean) => void;
  dismissFloating: (dismissed: boolean) => void;
}

const STORAGE_KEY = 'upstore_active_arab_order';
const COUNTDOWN_WINDOW_MS = 60 * 60 * 1000; // 60 minutes max active countdown
const FULFILLED_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours retention for fulfilled orders

export const useActiveArabOrderStore = create<ActiveArabOrderStore>((set, get) => ({
  activeOrder: null,
  isModalOpen: false,
  isDismissedFloating: false,
  hasShownExitToast: false,

  hasActiveCountdown: () => {
    const order = get().activeOrder;
    if (!order) return false;
    if (order.isFulfilled) return false;
    const elapsed = Date.now() - order.startedAt;
    return elapsed < COUNTDOWN_WINDOW_MS;
  },

  init: () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: ActiveArabOrder = JSON.parse(raw);
      
      // Verify validity & expiration
      if (parsed && parsed.orderId && parsed.startedAt) {
        const age = Date.now() - parsed.startedAt;
        if (parsed.isFulfilled && age < FULFILLED_RETENTION_MS) {
          set({ activeOrder: parsed });
        } else if (!parsed.isFulfilled && age < COUNTDOWN_WINDOW_MS) {
          set({ activeOrder: parsed });
        } else {
          // Expired order: discard completely so zeroed timer never renders
          localStorage.removeItem(STORAGE_KEY);
          set({ activeOrder: null, isModalOpen: false });
        }
      }
    } catch (e) {
      console.warn('[useActiveArabOrderStore] init error:', e);
    }
  },

  setActiveOrder: (order: ActiveArabOrder) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
      } catch (e) {
        console.warn('[useActiveArabOrderStore] save error:', e);
      }
    }
    set({
      activeOrder: order,
      isModalOpen: true,
      isDismissedFloating: false,
      hasShownExitToast: false,
    });
  },

  updateFulfillment: (deliveredKey: string | null) => {
    const current = get().activeOrder;
    if (!current) return;
    const updated: ActiveArabOrder = {
      ...current,
      isFulfilled: true,
      deliveredKey: deliveredKey || current.deliveredKey,
    };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
    }
    set({ activeOrder: updated });
  },

  clearActiveOrder: () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
    set({
      activeOrder: null,
      isModalOpen: false,
      isDismissedFloating: false,
      hasShownExitToast: false,
    });
  },

  openModal: () => {
    set({ isModalOpen: true });
  },

  closeModal: (triggerAlert: boolean = true, isArabic: boolean = true) => {
    const { activeOrder, hasShownExitToast } = get();
    set({ isModalOpen: false });

    // If order is active, unfulfilled, and alert hasn't been shown yet in this session
    if (triggerAlert && activeOrder && !activeOrder.isFulfilled && !hasShownExitToast) {
      set({ hasShownExitToast: true });
      useToastStore.getState().info(
        isArabic
          ? `طلبك (#${activeOrder.orderId}) قيد المتابعة مع الدعم! العداد يعمل ويمكنك الرجوع للشاشة من الشريط العائم أسفل الشاشة أو صفحة الإشعارات.`
          : `Your order (#${activeOrder.orderId}) is being processed! You can return to live tracking from the floating bar below or the Notifications page.`,
        isArabic ? 'متابعة الطلب المباشرة' : 'Live Order Bridge'
      );
    }
  },

  dismissFloating: (dismissed: boolean) => {
    set({ isDismissedFloating: dismissed });
  },
}));
