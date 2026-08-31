'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Loader2, 
  Compass, 
  FileText 
} from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { useCartStore } from '@/store/useCartStore';
import { createClient } from '@/utils/supabase/client';
import { NeubrutalismReceipt } from '@/components/checkout/NeubrutalismReceipt';
import { OrderTracking } from '@/components/ui/order-tracking';

function CheckoutSuccessContent() {
  const { language, mounted } = useLocale();
  const isAr = mounted && language === 'ar';
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const orderIdParam = searchParams.get('order_id') || searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<'receipt' | 'tracking'>('receipt');
  const clearCart = useCartStore(state => state.clearCart);

  useEffect(() => {
    if (sessionId || orderIdParam) {
      clearCart();
      
      let retries = 0;
      let intervalId: any = null;

      const loadOrders = async () => {
        try {
          if (sessionId && retries === 0) {
            try {
              await fetch(`/api/checkout/verify?session_id=${sessionId}`);
            } catch (err) {
              console.error('Verify error:', err);
            }
          }

          const supabase = createClient();
          let query = supabase
            .from('orders')
            .select(`
              id, 
              product_key, 
              amount, 
              created_at, 
              status, 
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

          if (sessionId) {
            query = query.eq('session_id', sessionId);
          } else if (orderIdParam) {
            query = query.eq('id', orderIdParam);
          }
          
          const { data, error } = await query;

          if (!error && data && data.length > 0) {
            setOrders(data);
            
            // Check if any order is still pending fulfillment
            const isAnyPending = data.some(
              (ord: any) => !ord.product_key || ord.product_key === 'PENDING_FULFILLMENT'
            );
            
            if (!isAnyPending || retries > 12) {
              clearInterval(intervalId);
            }
          }
        } catch (err) {
          console.error('Error loading success page orders:', err);
        } finally {
          setLoading(false);
        }
      };

      loadOrders();
      
      // Poll every 2.5 seconds for up to 10 retries if pending
      intervalId = setInterval(() => {
        retries += 1;
        loadOrders();
      }, 2500);

      return () => {
        if (intervalId) clearInterval(intervalId);
      };
    } else {
      router.push('/');
    }
  }, [sessionId, orderIdParam, router, clearCart]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex flex-col items-center justify-center p-4">
        <div className="bg-white border-2 border-black rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-[6px_6px_0px_0px_#000] max-w-sm w-full">
          <Loader2 className="w-10 h-10 text-black animate-spin mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-black text-black">
              {isAr ? 'جاري التحقق من عملية الدفع...' : 'Verifying transaction...'}
            </h3>
            <p className="text-xs text-neutral-600 font-bold">
              {isAr ? 'يتم الآن إصدار الإيصال وتجهيز ترخيصك' : 'Generating official receipt & keys'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isPendingFulfillment = orders.some(
    ord => !ord.product_key || ord.product_key === 'PENDING_FULFILLMENT' || ord.products?.delivery_mode === 'telegram'
  );

  return (
    <div className="min-h-screen bg-[#FFFDF9] py-4 sm:py-10 px-2.5 sm:px-6 lg:px-8 select-none">
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
        
        {/* ── View Switcher Navigation Bar (Touch-Optimized) ── */}
        <div className="flex p-1.5 bg-white border-2 sm:border-[3px] border-black rounded-2xl shadow-[3px_3px_0px_0px_#000] sm:shadow-[4px_4px_0px_0px_#000] gap-1.5 sm:gap-2">
          
          <button
            onClick={() => setActiveView('receipt')}
            className={`flex-1 py-3 px-2.5 sm:px-4 rounded-xl text-xs sm:text-sm font-black tracking-wide transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer active:scale-[0.98] ${
              activeView === 'receipt'
                ? 'bg-[#06D6A0] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <FileText className="w-4 h-4 stroke-[2.5] shrink-0" />
            <span className="truncate">{isAr ? 'إيصال الدفع والبيانات' : 'Payment Receipt & Keys'}</span>
          </button>

          <button
            onClick={() => setActiveView('tracking')}
            className={`flex-1 py-3 px-2.5 sm:px-4 rounded-xl text-xs sm:text-sm font-black tracking-wide transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer active:scale-[0.98] ${
              activeView === 'tracking'
                ? 'bg-[#FFE600] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <Compass className="w-4 h-4 stroke-[2.5] shrink-0" />
            <span className="truncate">{isAr ? 'تتبع حالة الطلب' : 'Order Tracking'}</span>
            {isPendingFulfillment && (
              <span className="w-2 h-2 rounded-full bg-rose-500 border border-black animate-ping shrink-0" />
            )}
          </button>

        </div>

        {/* ── Active View Content ── */}
        {activeView === 'receipt' ? (
          <NeubrutalismReceipt
            orders={orders}
            sessionId={sessionId}
            isPendingFulfillment={isPendingFulfillment}
            onTrackOrder={() => setActiveView('tracking')}
          />
        ) : (
          <div className="space-y-4">
            <OrderTracking
              order={orders[0]}
              onViewReceipt={() => setActiveView('receipt')}
            />
          </div>
        )}

      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-black animate-spin" />
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
