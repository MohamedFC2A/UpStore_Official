import { create } from 'zustand';
import { createClient } from '@/utils/supabase/client';
import { normalizeProductRecord } from '@/utils/products';

export interface CartItem {
  id: string;
  user_id?: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  product?: any; // To store joined product data
  variant?: any; // To store joined variant data
}

interface CartStore {
  items: CartItem[];
  loading: boolean;
  fetchCart: () => Promise<void>;
  addToCart: (product: any, quantity: number, variant?: any) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
}

const GUEST_CART_STORAGE_KEY = 'upstore_guest_cart';

// Safe helper to obtain guest cart from localStorage
const getLocalGuestCart = (): CartItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GUEST_CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// Safe helper to save guest cart to localStorage
const saveLocalGuestCart = (items: CartItem[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(items));
  } catch {}
};

// Safe helper to obtain authenticated user without throwing network errors
const getSafeUser = async () => {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
};

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  loading: false,

  fetchCart: async () => {
    set({ loading: true });
    try {
      const user = await getSafeUser();

      if (!user) {
        // Load guest cart from local storage
        const guestItems = getLocalGuestCart();
        set({ items: guestItems, loading: false });
        return;
      }

      // If user is authenticated, check if there are guest items to merge into DB
      const guestItems = getLocalGuestCart();
      const supabase = createClient();

      if (guestItems.length > 0) {
        try {
          for (const item of guestItems) {
            await supabase.from('cart_items').upsert(
              {
                user_id: user.id,
                product_id: item.product_id,
                variant_id: item.variant_id || null,
                quantity: item.quantity || 1,
              },
              { onConflict: 'user_id,product_id,variant_id' }
            );
          }
          if (typeof window !== 'undefined') {
            localStorage.removeItem(GUEST_CART_STORAGE_KEY);
          }
        } catch {
          // Merge failover
        }
      }

      // Fetch latest from database for authenticated user
      try {
        const { data, error } = await supabase
          .from('cart_items')
          .select(`
            id,
            product_id,
            variant_id,
            quantity,
            products (*),
            product_variants (*)
          `)
          .eq('user_id', user.id);

        if (!error && data && Array.isArray(data)) {
          const formattedItems = data
            .filter((item: any) => item.products && item.quantity > 0)
            .map((item: any) => ({
              id: item.id,
              user_id: user.id,
              product_id: item.product_id,
              variant_id: item.variant_id || undefined,
              quantity: Math.max(1, Number(item.quantity) || 1),
              product: normalizeProductRecord(item.products),
              variant: item.product_variants || undefined,
            }));
          set({ items: formattedItems, loading: false });
          return;
        }
      } catch {
        // Fallback
      }

      set({ items: [], loading: false });
    } catch {
      set({ items: getLocalGuestCart(), loading: false });
    }
  },

  addToCart: async (product: any, quantity: number, variant?: any) => {
    if (!product || (!product.id && !product.slug) || quantity <= 0) return;
    const productId = String(product.id || product.slug);
    const variantId = variant?.id ? String(variant.id) : undefined;
    const normalizedProduct = normalizeProductRecord(product);

    // 1. INSTANT 0ms OPTIMISTIC LOCAL STATE UPDATE (Flash Speed)
    const currentItems = get().items;
    const existingIndex = currentItems.findIndex(
      (i) => String(i.product_id) === productId && (i.variant_id || undefined) === variantId
    );

    let newItems: CartItem[];
    if (existingIndex >= 0) {
      newItems = currentItems.map((item, idx) =>
        idx === existingIndex
          ? { ...item, quantity: item.quantity + quantity, product: normalizedProduct, variant: variant || item.variant }
          : item
      );
    } else {
      const newItem: CartItem = {
        id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        product_id: productId,
        variant_id: variantId,
        quantity,
        product: normalizedProduct,
        variant,
      };
      newItems = [...currentItems, newItem];
    }

    // Save to memory + local storage immediately
    saveLocalGuestCart(newItems);
    set({ items: newItems });

    // 2. Non-blocking asynchronous background DB synchronization
    (async () => {
      try {
        const user = await getSafeUser();
        if (!user) return;

        const supabase = createClient();
        const existing = currentItems.find(
          (i) => String(i.product_id) === productId && (i.variant_id || undefined) === variantId
        );

        if (existing && existing.id && !existing.id.startsWith('local_') && !existing.id.startsWith('guest_')) {
          await supabase
            .from('cart_items')
            .update({ quantity: existing.quantity + quantity })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('cart_items')
            .upsert(
              {
                user_id: user.id,
                product_id: productId,
                variant_id: variantId || null,
                quantity: (existing ? existing.quantity : 0) + quantity,
              },
              { onConflict: 'user_id,product_id,variant_id' }
            );
        }
      } catch {
        // Silent fallback — optimistic state remains intact
      }
    })();
  },

  removeFromCart: async (cartItemId: string) => {
    // 1. INSTANT 0ms OPTIMISTIC UPDATE
    const currentItems = get().items;
    const newItems = currentItems.filter((i) => i.id !== cartItemId);
    saveLocalGuestCart(newItems);
    set({ items: newItems });

    // 2. Non-blocking background DB sync
    (async () => {
      try {
        const user = await getSafeUser();
        if (!user) return;
        const supabase = createClient();
        await supabase.from('cart_items').delete().eq('id', cartItemId);
      } catch {}
    })();
  },

  updateQuantity: async (cartItemId: string, quantity: number) => {
    if (quantity < 1) return;
    // 1. INSTANT 0ms OPTIMISTIC UPDATE
    const currentItems = get().items;
    const newItems = currentItems.map((i) => (i.id === cartItemId ? { ...i, quantity } : i));
    saveLocalGuestCart(newItems);
    set({ items: newItems });

    // 2. Non-blocking background DB sync
    (async () => {
      try {
        const user = await getSafeUser();
        if (!user) return;
        const supabase = createClient();
        await supabase.from('cart_items').update({ quantity }).eq('id', cartItemId);
      } catch {}
    })();
  },

  clearCart: async () => {
    // 1. INSTANT 0ms OPTIMISTIC UPDATE
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(GUEST_CART_STORAGE_KEY);
      } catch {}
    }
    set({ items: [] });

    // 2. Non-blocking background DB sync
    (async () => {
      try {
        const user = await getSafeUser();
        if (!user) return;
        const supabase = createClient();
        await supabase.from('cart_items').delete().eq('user_id', user.id);
      } catch {}
    })();
  },
}));
