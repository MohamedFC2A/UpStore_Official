import { create } from 'zustand';
import { createClient } from '@/utils/supabase/client';
import { useToastStore } from './useToastStore';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationStore {
  notifications: Notification[];
  loading: boolean;
  unreadCount: number;
  activeChannel: RealtimeChannel | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  initRealtimeSubscription: () => void;
  cleanupRealtimeSubscription: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  loading: false,
  unreadCount: 0,
  activeChannel: null,

  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (user) {
        // 1. Direct Supabase query
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const unread = data.filter((n: Notification) => !n.is_read).length;
          set({
            notifications: data,
            loading: false,
            unreadCount: unread
          });
          // Ensure realtime subscription is active
          get().initRealtimeSubscription();
          return;
        }

        // 2. Server API fallback if direct query had any issue
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const apiData = await res.json();
          if (apiData && Array.isArray(apiData.notifications)) {
            set({
              notifications: apiData.notifications,
              loading: false,
              unreadCount: apiData.unreadCount ?? apiData.notifications.filter((n: Notification) => !n.is_read).length
            });
            get().initRealtimeSubscription();
            return;
          }
        }
      }

      set({ notifications: [], loading: false, unreadCount: 0 });
    } catch (err) {
      console.warn('[useNotificationStore] fetchNotifications error:', err);
      set({ loading: false });
    }
  },

  markAsRead: async (id: string) => {
    // 1. Instant Optimistic update
    const prev = get().notifications;
    const newNotifs = prev.map(n => n.id === id ? { ...n, is_read: true } : n);
    const newUnread = newNotifs.filter(n => !n.is_read).length;
    set({ notifications: newNotifs, unreadCount: newUnread });

    try {
      // 2. Call Supabase direct update
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', id)
          .eq('user_id', session.user.id);
      }

      // 3. API call to guarantee server-side persistence
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      }).catch(() => null);
    } catch (err) {
      console.warn('[useNotificationStore] markAsRead sync error:', err);
    }
  },

  markAllAsRead: async () => {
    // 1. Instant Optimistic update (Zero lag)
    const prev = get().notifications;
    const newNotifs = prev.map(n => ({ ...n, is_read: true }));
    set({ notifications: newNotifs, unreadCount: 0 });

    try {
      // 2. Supabase direct update for all user notifications
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', session.user.id);
      }

      // 3. API endpoint guarantee
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      }).catch(() => null);
    } catch (err) {
      console.warn('[useNotificationStore] markAllAsRead sync error:', err);
    }
  },

  initRealtimeSubscription: async () => {
    if (get().activeChannel) return; // already active

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const channelName = `user-notifs-${user.id}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload: any) => {
            const current = get().notifications;
            if (payload.eventType === 'INSERT') {
              const newNotif = payload.new as Notification;
              if (newNotif && !current.some(n => n.id === newNotif.id)) {
                const updated = [newNotif, ...current];
                set({
                  notifications: updated,
                  unreadCount: updated.filter(n => !n.is_read).length
                });

                // Show toast for new alert
                useToastStore.getState().info(
                  newNotif.message || 'لديك إشعار جديد في حسابك',
                  newNotif.title || 'إشعار جديد'
                );
              }
            } else if (payload.eventType === 'UPDATE') {
              const updatedNotif = payload.new as Notification;
              if (updatedNotif) {
                const updated = current.map(n => n.id === updatedNotif.id ? updatedNotif : n);
                set({
                  notifications: updated,
                  unreadCount: updated.filter(n => !n.is_read).length
                });
              }
            } else if (payload.eventType === 'DELETE') {
              const oldId = payload.old?.id;
              if (oldId) {
                const updated = current.filter(n => n.id !== oldId);
                set({
                  notifications: updated,
                  unreadCount: updated.filter(n => !n.is_read).length
                });
              }
            }
          }
        )
        .subscribe();

      set({ activeChannel: channel });
    } catch (err) {
      console.warn('[useNotificationStore] Realtime subscription init error:', err);
    }
  },

  cleanupRealtimeSubscription: () => {
    const channel = get().activeChannel;
    if (channel) {
      const supabase = createClient();
      supabase.removeChannel(channel);
      set({ activeChannel: null });
    }
  }
}));
