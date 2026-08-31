'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ShoppingCart, Trash2, ArrowRight, Zap, ShieldCheck, X, Tag, Check, Sparkles, Loader2, Clock } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { useCartStore } from '@/store/useCartStore';
import { useToastStore } from '@/store/useToastStore';
import { ProductImage } from '@/components/ProductImage';
import { useActiveArabOrderStore } from '@/store/useActiveArabOrderStore';
import { calculateOrderTotals, evaluateCouponDiscount } from '@/utils/pricing';

const SmartPaymentModal = dynamic(
  () => import('@/components/checkout/SmartPaymentModal').then((mod) => mod.SmartPaymentModal),
  { ssr: false }
);

export default function CartPage() {
  const { language, country, formatPrice, mounted, translateProduct } = useLocale();

  const cartItems = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeFromCart);
  const clearCart = useCartStore((state) => state.clearCart);

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPct: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  
  // Calculate unified totals
  const orderPricing = calculateOrderTotals(cartItems, appliedCoupon?.code);
  const subtotal = orderPricing.subtotalUsd;
  const discountAmount = orderPricing.discountAmountUsd;
  const tax = orderPricing.taxUsd;
  const total = orderPricing.totalUsd;

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [hasWelcomeCashback, setHasWelcomeCashback] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const active = localStorage.getItem('upstore_reward_cashback_active') || localStorage.getItem('upstore_worldcup_cashback_active');
      if (active === 'true') {
        setHasWelcomeCashback(true);
      }
    }
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setUserEmail(user.email);
        }
      } catch (err) {
        console.error('Failed to get user email in cart page:', err);
      }
    };
    fetchUser();
  }, []);

  const handleApplyCoupon = () => {
    setCouponError('');
    const code = couponCode.trim().toUpperCase();
    if (!code) return;

    const evalResult = evaluateCouponDiscount(code, subtotal);
    if (!evalResult.isValid) {
      setCouponError(evalResult.errorMessage || (language === 'ar' ? 'كود الخصم غير صالح أو منتهي الصلاحية' : 'Invalid or expired coupon code'));
      return;
    }

    setAppliedCoupon({ code: evalResult.code, discountPct: evalResult.discountPct });
    useToastStore.getState().success(
      language === 'ar' ? `تم تطبيق كود الخصم ${evalResult.discountPct}% بنجاح!` : `${evalResult.discountPct}% discount coupon applied!`,
      evalResult.code
    );
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
    useToastStore.getState().info(
      language === 'ar' ? 'تمت إزالة كود الخصم' : 'Coupon code removed'
    );
  };

  const handleClearCart = () => {
    clearCart();
    useToastStore.getState().info(
      language === 'ar' ? 'تم إفراغ سلة المشتريات' : 'Cart has been cleared'
    );
  };

  const handleOpenCheckout = async () => {
    if (!userEmail) {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          useToastStore.getState().info(
            language === 'ar'
              ? 'يرجى تسجيل الدخول أو إنشاء حساب لإتمام عملية الشراء واستلام الكود فوراً.'
              : 'Please sign in or register to complete your purchase and receive your credentials.'
          );
          window.location.href = '/auth/login?next=/cart';
          return;
        } else {
          setUserEmail(user.email || '');
        }
      } catch {
        window.location.href = '/auth/login?next=/cart';
        return;
      }
    }

    const hasActiveCountdown = useActiveArabOrderStore.getState().hasActiveCountdown();
    const currentOrder = useActiveArabOrderStore.getState().activeOrder;
    if (hasActiveCountdown && currentOrder) {
      useToastStore.getState().error(
        language === 'ar'
          ? `لديك طلب دفع محلي قيد المتابعة والعد التنازلي حالياً (#${currentOrder.orderId}). لا يمكن بدء عملية شراء جديدة حتى إتمام الطلب الحالي أو انتهاء مهلة العداد.`
          : `You have an active local payment order counting down (#${currentOrder.orderId}). Please complete your current order before starting a new one.`,
        language === 'ar' ? 'يوجد طلب قيد المتابعة والعد' : 'Active Order In Progress'
      );
      useActiveArabOrderStore.getState().openModal();
      return;
    }
    setShowPaymentModal(true);
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-black pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        
        {/* Cart Header */}
        <div className="flex items-center justify-between gap-3 mb-8 select-none border-b-2 border-black pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FFE600] border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_#000]">
              <ShoppingCart className="w-6 h-6 text-black stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-black">{mounted && language === 'ar' ? 'سلة المشتريات' : 'Your Shopping Cart'}</h1>
              <p className="text-sm text-neutral-800 font-bold">{cartItems.length} {mounted && language === 'ar' ? 'عناصر في سلتك' : 'items in your cart'}</p>
            </div>
          </div>

          {cartItems.length > 0 && (
            <button
              onClick={handleClearCart}
              className="px-4 py-2 rounded-xl bg-white hover:bg-rose-50 border-2 border-black text-rose-600 text-xs font-black transition-all flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{language === 'ar' ? 'إفراغ السلة' : 'Clear Cart'}</span>
            </button>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div className="bg-white border-2 border-black rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[400px] shadow-[6px_6px_0px_0px_#000] text-black">
            <ShoppingCart className="w-16 h-16 text-black mb-6 stroke-[1.5]" />
            <h2 className="text-2xl font-black text-black mb-2">{mounted && language === 'ar' ? 'سلتك فارغة' : 'Your cart is empty'}</h2>
            <p className="text-neutral-800 font-bold mb-8 max-w-md mx-auto text-sm">
              {mounted && language === 'ar' 
                ? 'يبدو أنك لم تضف أي منتجات إلى سلتك بعد. استكشف متجرنا واكتشف أفضل العروض.' 
                : 'Looks like you haven\'t added any products to your cart yet. Explore our catalog and discover great deals.'}
            </p>
            <Link 
              href="/"
              className="px-8 py-3.5 bg-[#FFE600] text-black font-black uppercase tracking-wider rounded-2xl border-2 border-black hover:bg-[#ebd300] transition-all shadow-[4px_4px_0px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              {mounted && language === 'ar' ? 'تصفح المنتجات' : 'Browse Products'}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Cart Items List */}
            <div className="lg:col-span-8 space-y-4">
              {cartItems.map((item) => {
                const prod = item.product || {};
                const variant = item.variant || null;
                const variantPrice = variant ? (variant.our_price || variant.ourPrice) : null;
                const price = Number(variantPrice !== null && variantPrice !== undefined ? variantPrice : (prod.our_price || prod.ourPrice || 0));
                
                const { name: parentName } = translateProduct(prod.slug || '', prod.name || 'Product', prod.name_ar);
                const variantName = variant ? (language === 'ar' && variant.name_ar ? variant.name_ar : variant.name) : '';
                const name = variantName ? `${parentName} - ${variantName}` : parentName;
                const imageUrl = variant?.image_url || prod.image_url || prod.imageUrl;
                
                return (
                  <div key={item.id} className="bg-white border-2 border-black rounded-2xl p-3.5 sm:p-5 flex flex-col sm:flex-row gap-3 sm:gap-6 items-start sm:items-center relative group transition-all shadow-[3px_3px_0px_0px_#000] sm:shadow-[4px_4px_0px_0px_#000] hover:-translate-y-0.5">
                    
                    {/* Mobile Top Row: Image + Details / Desktop Image */}
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl bg-[#FFFDF9] border-2 border-black flex items-center justify-center flex-shrink-0 relative overflow-hidden shadow-[1.5px_1.5px_0px_0px_#000] sm:shadow-[2px_2px_0px_0px_#000] p-1">
                        <ProductImage 
                          product={{ 
                            ...prod, 
                            imageUrl: imageUrl || prod.image_url, 
                            image_url: imageUrl || prod.image_url, 
                            name 
                          }} 
                          alt={name} 
                          size="md" 
                        />
                      </div>

                      {/* Mobile Inline Details */}
                      <div className="flex-1 min-w-0 text-start sm:hidden">
                        <Link href={`/product/${prod.slug || item.product_id}`} className="text-sm font-black text-black hover:underline transition-colors line-clamp-2 leading-tight mb-1 block">
                          {name}
                        </Link>
                        <div className="text-black font-mono font-black text-base">
                          {mounted ? formatPrice(price) : `$${price}`}
                        </div>
                      </div>
                    </div>

                    {/* Desktop Details */}
                    <div className="hidden sm:block flex-1 w-full text-start">
                      <Link href={`/product/${prod.slug || item.product_id}`} className="text-base sm:text-lg font-black text-black hover:underline transition-colors mb-1 leading-tight inline-block">
                        {name}
                      </Link>
                      <div className="text-black font-mono font-black text-xl">
                        {mounted ? formatPrice(price) : `$${price}`}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                      <div className="flex items-center bg-white border-2 border-black rounded-xl overflow-hidden p-1 shadow-[2px_2px_0px_0px_#000]">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-8 h-8 flex items-center justify-center text-black font-black hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
                        >
                          −
                        </button>
                        <span className="w-10 text-center font-black text-sm text-black font-mono">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center text-black font-black hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                      
                      <button 
                        onClick={() => {
                          removeItem(item.id);
                          useToastStore.getState().info(
                            language === 'ar' ? 'تم حذف العنصر من السلة' : 'Item removed from cart',
                            name
                          );
                        }}
                        className="w-10 h-10 rounded-xl bg-white text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                        title={mounted && language === 'ar' ? 'إزالة' : 'Remove'}
                      >
                        <Trash2 className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Order Summary Column */}
            <div className="lg:col-span-4 sticky top-24">
              <div className="bg-white border-2 border-black rounded-3xl p-6 sm:p-8 shadow-[6px_6px_0px_0px_#000] text-black">
                <h2 className="text-lg sm:text-xl font-black text-black uppercase tracking-wider mb-6 border-b-2 border-black pb-3">
                  {mounted && language === 'ar' ? 'ملخص الطلب' : 'Order Summary'}
                </h2>
                
                {checkoutError && (
                  <div className="mb-6 p-4 rounded-2xl bg-rose-50 border-2 border-rose-600 text-rose-800 text-xs font-bold flex gap-3 items-start relative transition-all duration-200 shadow-[2px_2px_0px_0px_#000]">
                    <span className="flex-1 text-start">{checkoutError}</span>
                    <button 
                      onClick={() => setCheckoutError(null)}
                      className="text-rose-600 hover:text-rose-800 transition-colors p-0.5 -mt-0.5 cursor-pointer"
                    >
                      <X className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                )}

                {/* 3% Cashback Welcome Promo Banner */}
                {hasWelcomeCashback && (
                  <div className="mb-6 p-4 rounded-2xl bg-[#FFFDF9] border-2 border-black text-black text-xs flex gap-3 items-start relative transition-all duration-200 shadow-[2px_2px_0px_0px_#000]">
                    <Sparkles className="w-5 h-5 text-black fill-[#FFE600] flex-shrink-0 mt-0.5 stroke-[1.5]" />
                    <div className="flex-1 text-start">
                      <span className="font-black block uppercase tracking-wider mb-1">
                        {language === 'ar' ? 'تفعيل ميزة الكاش باك الترحيبية!' : 'Welcome Cashback Activated!'}
                      </span>
                      <p className="text-neutral-800 font-bold leading-relaxed">
                        {language === 'ar'
                          ? 'ميزة الكاش باك بنسبة 3% مفعلة حالياً على حسابك. سيتم إرجاع 3% من قيمة الطلب فوراً إلى محفظتك كأرصدة شراء بعد إتمام العملية.'
                          : '3% Welcome Cashback is active. 3% of your total order will be instantly credited to your wallet balance after checkout.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Promo Code Input Box */}
                <div className="mb-6">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Tag className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                    <span className="text-xs font-black text-black">
                      {language === 'ar' ? 'كود الخصم أو القسيمة' : 'Promo / Coupon Code'}
                    </span>
                  </div>

                  {appliedCoupon ? (
                    <div className="p-3 rounded-xl bg-[#FFFDF9] border-2 border-black flex items-center justify-between shadow-[2px_2px_0px_0px_#000]">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-black stroke-[3]" />
                        <div>
                          <span className="text-xs font-black text-black font-mono">{appliedCoupon.code}</span>
                          <span className="text-[10px] text-black font-black bg-[#06D6A0] px-1.5 py-0.5 rounded border border-black block mt-0.5">-{appliedCoupon.discountPct}% OFF</span>
                        </div>
                      </div>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-xs text-rose-600 hover:underline font-black transition-colors cursor-pointer px-2 py-1"
                      >
                        {language === 'ar' ? 'إلغاء' : 'Remove'}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          placeholder={language === 'ar' ? 'رمز الكوبون (مثال: UPSTORE10)' : 'Coupon (e.g. UPSTORE10)'}
                          className="flex-1 px-3.5 py-2.5 bg-[#FFFDF9] border-2 border-black rounded-xl text-xs text-black placeholder-neutral-500 font-bold outline-none uppercase font-mono shadow-[2px_2px_0px_0px_#000]"
                        />
                        <button
                          onClick={handleApplyCoupon}
                          disabled={!couponCode.trim()}
                          className="px-4 py-2.5 bg-[#FFE600] hover:bg-[#ebd300] border-2 border-black text-xs font-black text-black rounded-xl shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {language === 'ar' ? 'تطبيق' : 'Apply'}
                        </button>
                      </div>
                      {couponError && (
                        <p className="text-[11px] text-rose-600 mt-1.5 font-black">{couponError}</p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Cost Breakdown */}
                <div className="space-y-3.5 mb-6">
                  <div className="flex justify-between text-sm text-neutral-800 font-bold">
                    <span>{mounted && language === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</span>
                    <span className="text-black font-mono font-black">{mounted ? formatPrice(subtotal) : `$${subtotal.toFixed(2)}`}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-black font-black bg-[#06D6A0] px-2 py-1 rounded-lg border border-black">
                      <span>{language === 'ar' ? `الخصم (${appliedCoupon?.discountPct}%)` : `Discount (${appliedCoupon?.discountPct}%)`}</span>
                      <span className="font-mono">-{mounted ? formatPrice(discountAmount) : `$${discountAmount.toFixed(2)}`}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm text-neutral-800 font-bold">
                    <span>{mounted && language === 'ar' ? 'الضريبة (5%)' : 'Tax (5%)'}</span>
                    <span className="text-black font-mono font-black">{mounted ? formatPrice(tax) : `$${tax.toFixed(2)}`}</span>
                  </div>

                  <div className="h-0.5 w-full bg-black my-2" />

                  <div className="flex justify-between items-center">
                    <span className="text-base font-black text-black">{mounted && language === 'ar' ? 'الإجمالي' : 'Total'}</span>
                    <span className="text-3xl font-black text-black font-mono">{mounted ? formatPrice(total) : `$${total.toFixed(2)}`}</span>
                  </div>
                </div>

                <button 
                  onClick={handleOpenCheckout}
                  disabled={checkoutLoading || cartItems.length === 0}
                  className="w-full py-4 bg-[#06D6A0] hover:bg-[#05b385] border-2 border-black text-black font-black text-sm sm:text-base uppercase tracking-wider rounded-2xl shadow-[4px_4px_0px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 mb-4 group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {checkoutLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin h-5 w-5 text-black" />
                      {mounted && language === 'ar' ? 'جاري التحويل...' : 'Redirecting...'}
                    </span>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 stroke-[2.5]" />
                      {mounted && language === 'ar' ? 'إتمام الدفع' : 'Proceed to Checkout'}
                      <ArrowRight className="w-5 h-5 stroke-[2.5] group-hover:translate-x-1 transition-transform rtl:group-hover:-translate-x-1 rtl:rotate-180" />
                    </>
                  )}
                </button>

                {/* ── Visual Trust Badges Section ── */}
                <div className="mt-5 pt-5 border-t-2 border-black space-y-4 text-start select-none">
                  <h4 className="text-xs font-black text-black uppercase tracking-wider">
                    {mounted && language === 'ar' ? 'معايير الأمان والضمان للمشتري' : 'Buyer Protection & Trust Standards'}
                  </h4>
                  
                  <div className="grid grid-cols-1 gap-3.5">
                    {/* Warranty badge */}
                    <div className="flex gap-3 items-start">
                      <div className="w-8 h-8 rounded-xl bg-[#FFE600] border-2 border-black flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_0px_#000]">
                        <ShieldCheck className="w-4 h-4 text-black stroke-[2.5]" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-black">
                          {mounted && language === 'ar' ? 'ضمان استبدال حقيقي 100%' : '100% Replacement Warranty'}
                        </div>
                        <p className="text-[11px] text-neutral-800 leading-normal mt-0.5 font-bold">
                          {mounted && language === 'ar' 
                            ? 'جميع منتجاتنا مغطاة بضمان كامل للاستبدال الفوري في حال حدوث أي مشكلة.' 
                            : 'All digital assets are fully covered by a replacement warranty for the duration of the subscription.'}
                        </p>
                      </div>
                    </div>

                    {/* Delivery badge */}
                    <div className="flex gap-3 items-start">
                      <div className="w-8 h-8 rounded-xl bg-[#06D6A0] border-2 border-black flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_0px_#000]">
                        <Zap className="w-4 h-4 text-black stroke-[2.5]" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-black">
                          {mounted && language === 'ar' ? 'تسليم سريع بعد مراجعة الدفع' : 'Fulfillment After Payment Review'}
                        </div>
                        <p className="text-[11px] text-neutral-800 leading-normal mt-0.5 font-bold">
                          {mounted && language === 'ar' 
                            ? 'يتم مراجعة وتأكيد عملية الدفع وتسليم الحساب والتراخيص الرقمية مباشرة في حسابك.' 
                            : 'Digital credentials and licenses are dispatched directly to your dashboard right after payment review.'}
                        </p>
                      </div>
                    </div>

                    {/* Support badge */}
                    <div className="flex gap-3 items-start">
                      <div className="w-8 h-8 rounded-xl bg-[#4CC9F0] border-2 border-black flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_0px_#000]">
                        <Clock className="w-4 h-4 text-black stroke-[2.5]" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-black">
                          {mounted && language === 'ar' ? 'دعم فني متواصل 24/7' : '24/7 Priority Support & Replacement'}
                        </div>
                        <p className="text-[11px] text-neutral-800 leading-normal mt-0.5 font-bold">
                          {mounted && language === 'ar' 
                            ? 'فريق الدعم الفني متواجد دائماً لمساعدتك في تفعيل أو تشغيل المنتجات.' 
                            : 'Our technical agents are online around the clock to assist you with activation or immediate swap.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center text-xs text-neutral-800 font-bold flex flex-col items-center gap-2 mt-5 pt-5 border-t-2 border-black">
                  <div className="flex gap-2 font-black">
                    <span className="px-2.5 py-1 bg-[#FFFDF9] rounded-lg border-2 border-black shadow-[1px_1px_0px_0px_#000]">Visa</span>
                    <span className="px-2.5 py-1 bg-[#FFFDF9] rounded-lg border-2 border-black shadow-[1px_1px_0px_0px_#000]">Mastercard</span>
                    <span className="px-2.5 py-1 bg-[#FFFDF9] rounded-lg border-2 border-black shadow-[1px_1px_0px_0px_#000]">Apple Pay</span>
                    <span className="px-2.5 py-1 bg-[#FFFDF9] rounded-lg border-2 border-black shadow-[1px_1px_0px_0px_#000]">InstaPay</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 mt-2 text-black font-black">
                    <ShieldCheck className="w-4 h-4 text-black stroke-[2.5]" />
                    <span>{mounted && language === 'ar' ? 'دفع آمن ومحمي بنسبة 100%' : '100% Secure & Encrypted Checkout'}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Smart Multi-Gateway Payment Modal */}
      <SmartPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        items={cartItems}
        totalUsd={total}
        couponCode={appliedCoupon?.code}
      />
    </div>
  );
}
