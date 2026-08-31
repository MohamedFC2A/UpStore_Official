'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Package, 
  Loader2, 
  AlertCircle, 
  ShoppingBag, 
  Bell,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LogIn,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { createClient } from '@/utils/supabase/client';
import { OrderTracking } from '@/components/ui/order-tracking';
import { ProductImage } from '@/components/ProductImage';
import dynamic from 'next/dynamic';

const ReceiptModal = dynamic(
  () => import('@/components/checkout/ReceiptModal').then((mod) => mod.ReceiptModal),
  { ssr: false }
);

function TrackContent() {
  const { language, mounted, formatPrice } = useLocale();
  const isAr = mounted && language === 'ar';
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlOrderId = searchParams.get('order_id') || searchParams.get('session_id') || searchParams.get('id') || '';
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // User Recent Orders State for Sliding List
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [loadingUserOrders, setLoadingUserOrders] = useState(true);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Fetch current user's recent orders from Supabase
  const fetchUserRecentOrders = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('orders')
          .select(`
            id,
            amount,
            status,
            created_at,
            product_key,
            session_id,
            products (
              id,
              name,
              name_ar,
              slug,
              icon_name,
              brand_color,
              delivery_mode,
              subscription_duration,
              image_url
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(15);

        if (data && data.length > 0) {
          setUserOrders(data);
          
          // Auto-select active order:
          // 1. If URL has specific order ID, find it in userOrders or fetch it
          // 2. Otherwise default to first pending order or the newest order
          if (urlOrderId) {
            const match = data.find(
              (o: any) => o.id === urlOrderId || 
                          o.id?.toLowerCase().startsWith(urlOrderId.toLowerCase()) || 
                          o.session_id === urlOrderId ||
                          o.session_id?.toLowerCase().includes(urlOrderId.toLowerCase())
            );
            if (match) {
              setOrder(match);
              return;
            }
          } else if (!order) {
            const activePending = data.find((o: any) => o.status === 'pending') || data[0];
            setOrder(activePending);
          }
        }
      }
    } catch (e) {
      console.error('Error fetching user orders for track page:', e);
    } finally {
      setLoadingUserOrders(false);
    }
  };

  useEffect(() => {
    fetchUserRecentOrders();
  }, []);

  const fetchOrderById = async (idToSearch: string) => {
    if (!idToSearch.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const cleanId = idToSearch.trim().replace(/^#/, '');

      const res = await fetch(`/api/orders/track?id=${encodeURIComponent(cleanId)}`);
      const data = await res.json();

      if (!res.ok || !data.found || !data.order) {
        // Fallback: check local userOrders
        const localMatch = userOrders.find(
          (o: any) => o.id === cleanId || 
               o.id?.toLowerCase().startsWith(cleanId.toLowerCase()) || 
               o.session_id === cleanId ||
               o.session_id?.toLowerCase().includes(cleanId.toLowerCase())
        );
        if (localMatch) {
          setOrder(localMatch);
          return;
        }

        setError(isAr ? 'لم يتم العثور على أي طلب مطابق. تأكد من صحة الرابط أو اختر طلبك من القائمة.' : 'No order matching this ID was found.');
        setOrder(null);
      } else {
        setOrder(data.order);
      }
    } catch (e: any) {
      console.error('Track fetch error:', e);
      setError(e.message || (isAr ? 'تعذر تحميل بيانات الطلب' : 'Failed to load order'));
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (urlOrderId) {
      fetchOrderById(urlOrderId);
    }
  }, [urlOrderId]);

  // Fast 1-Tap select from the smart sliding list
  const handleSelectRecentOrder = (ord: any) => {
    setOrder(ord);
    setError(null);
    if (ord?.id) {
      router.replace(`/track?order_id=${encodeURIComponent(ord.id)}`, { scroll: false });
    }
  };

  const handleOrderLiveUpdate = (updatedOrder: any) => {
    setOrder(updatedOrder);
    setUserOrders(prev => prev.map(o => o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o));
  };

  // Scroll helpers for sliding list
  const scrollSlider = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const offset = direction === 'left' ? -280 : 280;
      sliderRef.current.scrollBy({ left: isAr ? -offset : offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-black py-6 sm:py-10 px-3.5 sm:px-6 lg:px-8 select-none">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-7">
        
        {/* ── 1. Top Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border-2 border-black rounded-3xl p-5 sm:p-6 shadow-[5px_5px_0px_0px_#000]">
          <div className="text-start">
            <div className="inline-flex items-center gap-2 bg-[#FFE600] border-2 border-black px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2 shadow-[1.5px_1.5px_0px_0px_#000]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>{isAr ? 'مركز المتابعة والتنفيذ المباشر (Live Sync)' : 'UpStore Live Order Tracker'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
              {isAr ? 'تتبع مسار وحالة الطلب' : 'Real-Time Order Tracking'}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-700 font-bold mt-0.5">
              {isAr ? 'تابع مراحل التنفيذ والتسليم لحظة بلحظة مع التحديث التلقائي المباشر' : 'Track fulfillment stages and instant delivery in real time'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/notifications"
              className="inline-flex items-center gap-2 bg-[#FFE600] hover:bg-[#edd600] border-2 border-black px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black shadow-[2.5px_2.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer shrink-0"
            >
              <Bell className="w-4 h-4 stroke-[2.5]" />
              <span>{isAr ? 'الإشعارات' : 'Notifications'}</span>
            </Link>

            <Link
              href="/dashboard?tab=orders"
              className="inline-flex items-center gap-2 bg-white hover:bg-neutral-100 border-2 border-black px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black shadow-[2.5px_2.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer shrink-0"
            >
              <Package className="w-4 h-4 stroke-[2.5]" />
              <span>{isAr ? 'لوحة طلباتي' : 'My Orders'}</span>
            </Link>
          </div>
        </div>

        {/* ── 2. Smart Sliding Orders Carousel (قائمة منزلقة ذكية للجوال والكمبيوتر) ── */}
        {userOrders.length > 0 && (
          <div className="bg-white border-2 border-black rounded-3xl p-4 sm:p-5 shadow-[4px_4px_0px_0px_#000] space-y-2.5 text-start">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#FFE600] border border-black flex items-center justify-center text-black shrink-0 shadow-[1px_1px_0px_0px_#000]">
                  <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-black text-black block leading-tight">
                    {isAr ? 'اختر الطلب للتتبع الفوري المباشر:' : 'Select Order for Instant Live Tracking:'}
                  </span>
                  <span className="text-[10px] text-neutral-600 font-bold block">
                    {isAr ? 'اسحب أفقياً لاختيار أي من طلباتك ومتابعة تسليمه' : 'Swipe horizontally to switch between your active orders'}
                  </span>
                </div>
              </div>

              {/* Slider Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-mono font-black text-neutral-800 bg-[#FFFDF9] border border-black px-2 py-0.5 rounded-md hidden sm:inline">
                  {userOrders.length} {isAr ? 'طلب' : 'orders'}
                </span>
                <button
                  type="button"
                  onClick={() => scrollSlider('left')}
                  className="w-7 h-7 bg-white hover:bg-neutral-100 border border-black rounded-lg flex items-center justify-center text-black shadow-[1px_1px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                  title="Previous"
                >
                  <ChevronLeft className="w-4 h-4 stroke-[2.5] rtl:rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollSlider('right')}
                  className="w-7 h-7 bg-white hover:bg-neutral-100 border border-black rounded-lg flex items-center justify-center text-black shadow-[1px_1px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                  title="Next"
                >
                  <ChevronRight className="w-4 h-4 stroke-[2.5] rtl:rotate-180" />
                </button>
              </div>
            </div>

            {/* Swipeable Horizontal Track */}
            <div 
              ref={sliderRef}
              className="flex items-center gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none py-2 px-1 -mx-2 px-2 sm:mx-0 sm:px-0"
            >
              {userOrders.map((ord) => {
                const isSelected = order?.id === ord.id;
                const isPending = ord.status === 'pending' || ord.product_key === 'PENDING_FULFILLMENT';
                const prodName = ord.products?.name_ar && isAr ? ord.products.name_ar : (ord.products?.name || 'Digital Item');
                const shortId = ord.id ? ord.id.substring(0, 8).toUpperCase() : 'ORDER';
                const createdDate = ord.created_at ? new Date(ord.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' }) : '';

                return (
                  <div
                    key={ord.id}
                    onClick={() => handleSelectRecentOrder(ord)}
                    className={`shrink-0 min-w-[240px] sm:min-w-[280px] max-w-[300px] p-3 rounded-2xl border-2 border-black flex items-center gap-3 cursor-pointer snap-start transition-all ${
                      isSelected
                        ? 'bg-[#FFE600] text-black shadow-[3.5px_3.5px_0px_0px_#000] scale-[1.02]'
                        : 'bg-white hover:bg-[#FFFDF9] text-black shadow-[2px_2px_0px_0px_#000]'
                    }`}
                  >
                    {/* Product Thumbnail */}
                    <div className="w-11 h-11 rounded-xl bg-white border border-black p-1 flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000] overflow-hidden">
                      {ord.products ? (
                        <ProductImage
                          product={ord.products}
                          alt={prodName}
                          size="sm"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-neutral-600 stroke-[2]" />
                      )}
                    </div>

                    {/* Order Details */}
                    <div className="min-w-0 flex-1 text-start">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono font-black text-xs text-black truncate">
                          #{shortId}
                        </span>
                        <span className="text-[10px] text-neutral-600 font-bold">
                          {createdDate}
                        </span>
                      </div>
                      
                      <p className="text-xs font-black text-black truncate leading-tight mt-0.5" title={prodName}>
                        {prodName}
                      </p>

                      <div className="flex items-center justify-between gap-1 mt-1.5">
                        <span className={`px-2 py-0.5 rounded-md border border-black text-[9.5px] font-black shrink-0 ${
                          isPending 
                            ? 'bg-[#FFF9E6] text-amber-950 animate-pulse' 
                            : 'bg-[#06D6A0] text-black'
                        }`}>
                          {isPending ? (isAr ? 'قيد التجهيز...' : 'Pending') : (isAr ? 'مكتمل ومفعل' : 'Fulfilled')}
                        </span>
                        
                        {isSelected && (
                          <span className="text-[10px] font-black text-black flex items-center gap-0.5">
                            <span>{isAr ? 'النشط الآن' : 'Active'}</span>
                            <CheckCircle2 className="w-3 h-3 stroke-[3] text-emerald-700" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 3. Live Order Tracking Status View ── */}
        {loading ? (
          <div className="bg-white border-2 border-black rounded-3xl p-14 sm:p-16 text-center space-y-4 shadow-[5px_5px_0px_0px_#000]">
            <Loader2 className="w-10 h-10 text-black animate-spin mx-auto" />
            <p className="text-sm font-black uppercase tracking-wider text-black">
              {isAr ? 'جاري فحص وتتبع بيانات الطلب بالبث الحي...' : 'Querying live order status...'}
            </p>
          </div>
        ) : error ? (
          <div className="bg-white border-2 border-black rounded-3xl p-8 text-center space-y-4 shadow-[5px_5px_0px_0px_#000]">
            <AlertCircle className="w-12 h-12 text-rose-600 mx-auto stroke-[2.5]" />
            <h3 className="text-lg font-black text-black">
              {isAr ? 'لم يتم العثور على طلب' : 'Order Not Found'}
            </h3>
            <p className="text-xs sm:text-sm font-bold text-neutral-700 max-w-md mx-auto">{error}</p>
            <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
              <Link
                href="/dashboard?tab=orders"
                className="inline-flex items-center gap-2 bg-[#FFE600] border-2 border-black px-6 py-2.5 rounded-xl font-black text-xs shadow-[2px_2px_0px_0px_#000] cursor-pointer"
              >
                <Package className="w-4 h-4 stroke-[2.5]" />
                <span>{isAr ? 'استعراض كافة طلباتي' : 'View All My Orders'}</span>
              </Link>
              <Link
                href="/notifications"
                className="inline-flex items-center gap-2 bg-white border-2 border-black px-6 py-2.5 rounded-xl font-black text-xs shadow-[2px_2px_0px_0px_#000] cursor-pointer"
              >
                <Bell className="w-4 h-4 stroke-[2.5]" />
                <span>{isAr ? 'مركز الإشعارات' : 'Notifications'}</span>
              </Link>
            </div>
          </div>
        ) : order ? (
          <div className="space-y-6">
            <OrderTracking
              order={order}
              onRefresh={() => fetchOrderById(order.id)}
              onViewReceipt={() => setShowReceiptModal(true)}
              onOrderUpdated={handleOrderLiveUpdate}
            />
          </div>
        ) : (
          /* Empty state when no orders and not logged in */
          <div className="bg-white border-2 border-black rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-[5px_5px_0px_0px_#000]">
            <div className="w-16 h-16 rounded-2xl bg-[#FFE600] border-2 border-black flex items-center justify-center mx-auto shadow-[3px_3px_0px_0px_#000]">
              <ShoppingBag className="w-8 h-8 text-black stroke-[2]" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-black">
              {isAr ? 'لم يتم العثور على طلبات لعرضها حالياً' : 'No Orders to Display'}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 font-bold max-w-sm mx-auto">
              {isAr 
                ? 'سجل دخولك لعرض قائمة طلباتك وتتبع مسارها المباشر بنقرة واحدة، أو تصفح المتجر لطلب منتجك الآن.'
                : 'Sign in to access your recent orders with 1-click live tracking, or browse our store.'}
            </p>
            <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
              <Link
                href="/auth/login?redirect=/track"
                className="inline-flex items-center gap-2 bg-[#FFE600] hover:bg-[#edd600] border-2 border-black px-6 py-3 rounded-xl font-black text-xs sm:text-sm shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all"
              >
                <LogIn className="w-4 h-4 stroke-[2.5]" />
                <span>{isAr ? 'تسجيل الدخول' : 'Sign In'}</span>
              </Link>
              <Link
                href="/browse"
                className="inline-flex items-center gap-2 bg-white hover:bg-neutral-100 border-2 border-black px-6 py-3 rounded-xl font-black text-xs sm:text-sm shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all"
              >
                <span>{isAr ? 'تصفح المنتجات' : 'Browse Products'}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5] rtl:rotate-180" />
              </Link>
            </div>
          </div>
        )}

      </div>

      {/* ── Receipt Modal if triggered from tracking ── */}
      {order && (
        <ReceiptModal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          initialOrders={[order]}
        />
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-black animate-spin" />
      </div>
    }>
      <TrackContent />
    </Suspense>
  );
}
