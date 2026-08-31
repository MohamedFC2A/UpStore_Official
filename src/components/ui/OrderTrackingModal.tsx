'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OrderTracking } from './order-tracking';
import { createClient } from '@/utils/supabase/client';
import { useLocale } from '@/context/LocaleContext';

export interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string | null;
  sessionId?: string | null;
  initialOrder?: any;
  onViewReceipt?: () => void;
}

export function OrderTrackingModal({
  isOpen,
  onClose,
  orderId,
  sessionId,
  initialOrder,
  onViewReceipt
}: OrderTrackingModalProps) {
  const { language, mounted } = useLocale();
  const isAr = mounted && language === 'ar';
  
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(initialOrder || null);
  const [error, setError] = useState<string | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const fetchOrder = async () => {
    if (!orderId && !sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const targetId = orderId || sessionId || '';
      const cleanId = targetId.trim().replace(/^#/, '');

      // 1. Try track API endpoint first (handles UUIDs, short 8-char IDs, and session IDs)
      const res = await fetch(`/api/orders/track?id=${encodeURIComponent(cleanId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.found && data.order) {
          setOrder(data.order);
          setLoading(false);
          return;
        }
      }

      // 2. Direct Supabase query fallback
      const supabase = createClient();
      let query = supabase
        .from('orders')
        .select(`
          id,
          amount,
          status,
          created_at,
          product_key,
          session_id,
          products (
            name,
            name_ar,
            slug,
            icon_name,
            brand_color,
            delivery_mode,
            subscription_duration,
            image_url
          )
        `);

      if (orderId) {
        query = query.eq('id', orderId);
      } else if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { data, error: fetchErr } = await query;
      if (!fetchErr && data && data.length > 0) {
        setOrder(data[0]);
      } else {
        // Fallback: fetch latest order
        const { data: latestData } = await supabase
          .from('orders')
          .select('id, amount, status, created_at, product_key, session_id, products(*)')
          .order('created_at', { ascending: false })
          .limit(1);
        if (latestData && latestData.length > 0) {
          setOrder(latestData[0]);
        } else {
          setError(isAr ? 'لم يتم العثور على معلومات هذا الطلب' : 'Order not found');
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || (isAr ? 'حدث خطأ غير متوقع' : 'Unexpected error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrder) {
      setOrder(initialOrder);
      return;
    }

    if (isOpen && (orderId || sessionId)) {
      fetchOrder();
    }
  }, [isOpen, orderId, sessionId, initialOrder]);

  // Handle scroll detection for mobile hint
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      if (scrollTop > 80 || scrollHeight - scrollTop - clientHeight < 60) {
        setShowScrollHint(false);
      } else {
        setShowScrollHint(true);
      }
    }
  };

  // Reset scroll hint when open
  useEffect(() => {
    if (isOpen) {
      setShowScrollHint(true);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-6 bg-black/65 backdrop-blur-sm select-none">
        
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 30 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="relative w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto z-10 my-auto rounded-3xl touch-pan-y"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          
          {/* Top Mobile Pull Handle */}
          <div className="w-14 h-1.5 bg-white/70 border border-black/40 rounded-full mx-auto mb-2.5 sm:hidden shadow-sm" />

          {/* Close Floating Button */}
          <button
            onClick={onClose}
            className="absolute top-3 end-3 sm:top-4 sm:end-4 z-30 w-10 h-10 bg-white hover:bg-neutral-100 border-2 border-black rounded-2xl flex items-center justify-center text-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            title={isAr ? 'إغلاق' : 'Close'}
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>

          {loading ? (
            <div className="bg-[#FFFDF9] border-[3px] border-black rounded-3xl p-12 text-center space-y-4 shadow-[8px_8px_0px_0px_#000]">
              <Loader2 className="w-10 h-10 text-black animate-spin mx-auto" />
              <p className="text-sm font-black text-black uppercase tracking-wider">
                {isAr ? 'جاري تحميل مسار تتبع الطلب بالبث المباشر...' : 'Loading live order tracking...'}
              </p>
            </div>
          ) : error ? (
            <div className="bg-[#FFFDF9] border-[3px] border-black rounded-3xl p-8 text-center space-y-4 shadow-[8px_8px_0px_0px_#000]">
              <AlertCircle className="w-12 h-12 text-rose-600 mx-auto stroke-[2.5]" />
              <h3 className="text-lg font-black text-black">
                {isAr ? 'تعذر جلب التتبع' : 'Unable to load tracking'}
              </h3>
              <p className="text-xs font-bold text-neutral-700">{error}</p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-[#FFE600] border-2 border-black text-black font-black text-xs rounded-xl shadow-[2px_2px_0px_0px_#000] cursor-pointer"
              >
                {isAr ? 'إغلاق النافذة' : 'Close Window'}
              </button>
            </div>
          ) : (
            <div className="relative">
              <OrderTracking
                order={order}
                onRefresh={fetchOrder}
                onViewReceipt={onViewReceipt}
                onOrderUpdated={(updated) => setOrder(updated)}
              />

              {/* ── Smart Mobile Scroll Indicator ── */}
              {showScrollHint && (
                <div className="sm:hidden sticky bottom-3 left-0 right-0 flex justify-center pointer-events-none z-40 px-4">
                  <button
                    onClick={() => {
                      scrollContainerRef.current?.scrollBy({ top: 260, behavior: 'smooth' });
                    }}
                    className="pointer-events-auto bg-[#FFE600] hover:bg-[#edd600] text-black border-2 border-black px-4 py-2 rounded-full text-xs font-black shadow-[3px_3px_0px_0px_#000] flex items-center gap-1.5 animate-bounce active:scale-95 transition-all cursor-pointer"
                  >
                    <span>{isAr ? 'مرر للأسفل لباقي المراحل' : 'Scroll for more stages'}</span>
                    <ChevronDown className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              )}
            </div>
          )}

        </motion.div>

      </div>
    </AnimatePresence>
  );
}
