'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Volume2, 
  ArrowLeft, 
  Sparkles, 
  ShoppingBag, 
  ShieldCheck, 
  Smartphone, 
  Tv, 
  Cast, 
  Activity, 
  Lock, 
  AlertCircle,
  Wifi, 
  HelpCircle, 
  Zap, 
  ArrowRight, 
  ChevronDown 
} from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { useCartStore } from '@/store/useCartStore';
import { useToastStore } from '@/store/useToastStore';
import { createClient } from '@/utils/supabase/client';
import { Product } from '@/components/ProductCard';

export default function WorldCupClient() {
  const router = useRouter();
  const { language } = useLocale();
  const addToCart = useCartStore((state) => state.addToCart);

  // States
  const [dbProduct, setDbProduct] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const isAr = language === 'ar';

  // Translations object specific to this page
  const translations = {
    // Hero
    allianceBadge: isAr ? 'التحالف الرياضي الأقوى لعام 2026' : 'THE ULTIMATE 2026 SPORTS ALLIANCE',
    heroTitle: isAr ? (
      <>
        باقة البث المباشر الفائقة لكأس العالم <br />
        <span className="text-black bg-[#FFE600] px-3 py-0.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] inline-block my-1">
          FIFA 26 × MTV × ANDROID
        </span>
      </>
    ) : (
      <>
        THE ULTIMATE LIVE STREAM PASS FOR <br />
        <span className="text-black bg-[#FFE600] px-3 py-0.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] inline-block my-1">
          FIFA 26 × MTV × ANDROID
        </span>
      </>
    ),
    heroDesc: isAr ? (
      'شاهد جميع مباريات كأس العالم الـ 104 مباشرة بدقة 4K HDR وبدون إعلانات أو تقطيع عبر تطبيق البث المخصص بنظام Android مع تعليق عربي وإنجليزي وتفعيل فوري.'
    ) : (
      'Stream all 104 FIFA World Cup 2026 matches live in 4K HDR with zero latency, zero ads, dual Arabic/English commentary, and instant automated delivery.'
    ),
    androidOnlyTag: isAr ? 'مخصص ومحسن لأجهزة الأندرويد والشاشات الذكية (Android TV / Tablets / Phones)' : 'Optimized for Android Mobile & Smart TVs Only',

    // CTA & Cards
    tournamentPassBadge: isAr ? 'باقة البطولة الكاملة' : 'TOURNAMENT PASS',
    reviewsCount: isAr ? '4.9 (5,840+ تقييم موثق)' : '4.9 (5,840+ reviews)',
    cardTitle: isAr ? 'اشتراك كأس العالم 2026 البث المباشر الفائق' : 'FIFA World Cup 2026 Ultimate Stream Pass',
    instantDelivery: isAr ? 'دفع عالمي وضمان كامل المدة' : 'Global Pay & Full Warranty',
    warrantyBadge: isAr ? 'ضمان شامل طوال فترة البطولة' : 'Full Tournament Coverage Warranty',
    pricingTitle: isAr ? 'سعر العرض الخاص للبطولة' : 'TOURNAMENT SPECIAL OFFER PRICING',
    save90: isAr ? 'وفر 90%' : 'SAVE 90%',
    egyptRate: isAr ? 'سعر مصر: 529 ج.م' : 'Egypt Rate: 529 EGP',
    saudiRate: isAr ? 'سعر السعودية: 40 ر.س' : 'Saudi Rate: 40 SAR',
    buyBtn: isAr ? 'اشترك الآن بـ 9.99$ فقط' : 'Subscribe Now for Only $9.99',
    adding: isAr ? 'جاري الإضافة للسلة...' : 'Adding to Cart...',
    backToStore: isAr ? 'العودة إلى المتجر' : 'Back to Store',

    // Tech Specs
    specsTitle: isAr ? 'المواصفات الفنية للباقة' : 'TECHNICAL SPECIFICATIONS',
    spec1Title: isAr ? 'دقة البث الفائقة' : 'UHD Resolution',
    spec1Desc: isAr ? '4K @ 60 FPS / دعم HDR10' : '4K @ 60 FPS / HDR',
    spec2Title: isAr ? 'قنوات التعليق الصوتي' : 'Audio Commentators',
    spec2Desc: isAr ? 'عربي (بي إن / SSC) وإنجليزي بضغطة زر' : 'Arabic & English Switchable',
    spec3Title: isAr ? 'زمن تأخير البث' : 'Stream Latency',
    spec3Desc: isAr ? 'أقل من 3 ثوانٍ (فائق السرعة والمباشرة)' : 'Sub 3-seconds delay (Ultra low latency)',
    spec4Title: isAr ? 'الأجهزة المتوافقة' : 'Device Compatibility',
    spec4Desc: isAr ? 'شاشات Android TV، هواتف، وأجهزة لوحية' : 'Smart TVs, Android Phones & Boxes',
    spec5Title: isAr ? 'رخصة التطبيق' : 'App License',
    spec5Desc: isAr ? 'كود تفعيل آلي لجهاز واحد مع دعم الاستبدال' : 'Automated 1-Device License Key',
    paymentNotice: isAr 
      ? 'طريقة الدفع الفعالة حالياً هي الدفع المحلي (InstaPay / فودافون كاش / التحويل البنكي) لضمان التوصيل الفوري لكود التفعيل ورابط الـ APK مباشرة.'
      : 'Local payment methods (InstaPay, Vodafone Cash, Bank Transfer) are active to ensure rapid automated credential generation and APK download.',

    // Why Android?
    whyTitle: isAr ? 'لماذا العرض حصري للأندرويد وبتكلفة 9.99$ فقط؟' : 'Why is this Android-only & priced at $9.99?',
    whyDesc: isAr ? (
      'تفرض الشبكات التلفزيونية اشتراكات شهرية باهظة وعقوداً معقدة. عبر إطلاق هذا التطبيق كملف تثبيت Android APK مباشر، تجاوزنا رسوم الوسطاء والمتاجر لنقدم لك البث الكامل لكافة المباريات الـ 104 بدفعة واحدة مخفضة قيمتها 9.99$ فقط للبطولة بأكملها.'
    ) : (
      'Traditional TV networks charge hundreds of dollars with restrictive lock-ins. By delivering this custom Android APK directly, we bypass third-party store margins to offer you the full 104-match tournament pass for a single one-time payment of $9.99.'
    ),

    // Features
    featTitle: isAr ? 'مزايا تطبيق البث المباشر (FIFA 26 APK)' : 'FIFA 26 Live APK App Features',
    featUhdTitle: isAr ? 'بث فائق الدقة 4K Ultra HD' : '4K Ultra HD Stream',
    featUhdDesc: isAr ? 'شاهد كل تفاصيل اللقاء بدقة متناهية وبدون بكسلة على الشاشات الكبيرة.' : 'Watch every kick, goal, and trophy lift in crisp 4K resolution on big screens.',
    featCommentaryTitle: isAr ? 'معلقين عرب وأجانب بضغطة زر' : 'Dual-Audio Commentary',
    featCommentaryDesc: isAr ? 'تنقل فوراً داخل التطبيق بين قنوات التعليق العربي (بي إن/SSC) والإنجليزي.' : 'Switch in real-time between high-energy Arabic and English commentators.',
    featNoLagTitle: isAr ? 'سيرفرات فائقة السرعة بدون تقطيع' : 'Ultra-Low Latency Servers',
    featNoLagDesc: isAr ? 'بث مباشر متزامن مع الملعب بزمن تأخير أقل من 3 ثوانٍ فقط.' : 'Live synchronized CDN with sub 3-second delay, matching live stadium timing.',
    featTvTitle: isAr ? 'دعم كامل للشاشات الذكية والأندرويد' : 'Smart TVs & Android Optimized',
    featTvDesc: isAr ? 'واجهة مخصصة بالكامل للتحكم بالريموت كونترول على شاشات الأندرويد والهواتف.' : 'Custom TV-remote interface optimized for Android TV, Mi Box, and mobile.',

    // FAQ
    faqTitle: isAr ? 'الأسئلة الأكثر شيوعاً عن باقة كأس العالم' : 'Frequently Asked Questions',
    faq1Q: isAr ? 'كيف يتم تثبيت التطبيق وتفعيله بعد الشراء؟' : 'How is the app installed and activated after purchase?',
    faq1A: isAr ? 'فور إتمام الدفع مباشرة، ستظهر لك بيانات التحميل (رابط ملف الـ APK المباشر + كود التفعيل المخصص لجهازك) في لوحة التحكم وتصلك نسخة فورية على بريدك الإلكتروني.' : 'Immediately after payment, your unique APK download link and 1-device activation key appear in your UpStore dashboard and are sent to your email.',
    faq2Q: isAr ? 'هل يعمل التطبيق على أجهزة iPhone أو Apple TV؟' : 'Does it work on iPhone or Apple TV?',
    faq2A: isAr ? 'هذا الإصدار مصمم حصرياً لنظام Android (هواتف أندرويد، أجهزة التابلت، شاشات Android TV، وأجهزة TV Box مثل Xiaomi Mi Box وغيرها).' : 'This edition is exclusively built for the Android ecosystem (Android phones, tablets, Android TV, Google TV, and Android TV streaming boxes).',
    faq3Q: isAr ? 'هل الدفع لمرة واحدة أم اشتراك شهري؟' : 'Is this a one-time payment or a monthly subscription?',
    faq3A: isAr ? 'دفعة واحدة فقط بقيمة 9.99$ (أو ما يعادلها بالعملة المحلية) تمنحك وصولاً كاملاً لجميع المباريات الـ 104 من ركلة البداية وحتى نهائي كأس العالم، شاملة الاستوديوهات التحليلية والتغطيات 24/7 دون أي تكاليف إضافية.' : 'It is a single, one-time payment of $9.99 (or local equivalent). There are no monthly subscriptions or hidden charges. It covers all 104 matches from the opening kickoff to the final trophy lift.',
    faq4Q: isAr ? 'ما هي طرق الدفع المتاحة حالياً؟' : 'What payment methods are currently active?',
    faq4A: isAr ? 'حفاظاً على سرعة معالجة الطلبات، قمنا بتنشيط طرق الدفع المحلية المباشرة (مثل إنستاباي InstaPay ومحفظة فودافون كاش Vodafone Cash في مصر، أو التحويل البنكي المباشر في السعودية وباقي الدول).' : 'To ensure the fastest checkout speed, we have activated local direct payments (such as InstaPay and Vodafone Cash in Egypt, and direct local bank transfers in Saudi Arabia).',
  };

  // Fetch product from Supabase or fallback
  useEffect(() => {
    async function getProduct() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .ilike('slug', '%fifa%')
          .maybeSingle();

        if (data && !error) {
          setDbProduct({
            id: data.id,
            slug: data.slug,
            name: data.name,
            name_ar: data.name_ar,
            our_price: Number(data.our_price) || 9.99,
            price_egp: Number(data.price_egp) || 529,
            price_sar: Number(data.price_sar) || 40,
            category: data.category || 'Sports Pass',
            rating: Number(data.rating) || 4.9,
            reviews: Number(data.reviews) || 5840,
            stock: Number(data.stock) || 100,
            image_url: data.image_url
          });
        }
      } catch (err) {
        console.error('Error fetching worldcup product details:', err);
      } finally {
        setLoadingProduct(false);
      }
    }
    getProduct();
  }, []);

  const handleAddToCart = async () => {
    const targetProduct: any = dbProduct || {
      id: '39623a83-73db-4bf9-8abf-e9dee7f2f8ee',
      slug: 'fifa-world-cup-2026-pass',
      name: 'FIFA 26 World Cup Live Pass - MTV & Android Edition',
      name_ar: 'اشتراك كأس العالم 2026 البث المباشر - نسخة MTV والـ Android',
      our_price: 9.99,
      price_egp: 529,
      price_sar: 40,
      category: 'Subscriptions'
    };

    setAddingToCart(true);
    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        useToastStore.getState().info(
          isAr ? 'يرجى تسجيل الدخول أولاً للمتابعة وشراء باقة كأس العالم' : 'Please sign in first to purchase the World Cup Pass',
          isAr ? 'كأس العالم 2026' : 'FIFA World Cup 2026'
        );
        router.push('/auth/login?next=/worldcup');
        return;
      }

      await addToCart(targetProduct, 1);
      useToastStore.getState().success(
        isAr ? 'تمت إضافة باقة كأس العالم إلى السلة!' : 'World Cup Pass added to cart!',
        isAr ? '9.99$ • دفع عالمي وضمان كامل المدة' : '$9.99 • Global Pay & Full Warranty'
      );
      router.push('/cart');
    } catch (err) {
      console.error(err);
    } finally {
      setAddingToCart(false);
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-black font-sans pb-16 md:pb-24 select-none">
      
      {/* ── Top Bar: Back Action & Branding ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2 flex items-center justify-between">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-neutral-100 border-2 border-black rounded-xl text-xs sm:text-sm font-black text-black transition-all shadow-[2.5px_2.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
        >
          <ArrowLeft className={`w-4 h-4 stroke-[2.5] ${isAr ? 'rotate-180' : ''}`} />
          <span>{translations.backToStore}</span>
        </Link>

        <span className="text-xs font-black text-black bg-[#FFE600] px-3 py-1 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_#000]">
          UPSTORE EXCLUSIVE
        </span>
      </div>

      {/* ── Section 1: Hero Header & Badges ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 text-center">
        
        {/* Partnership Badges Row (Pure Neubrutalism) */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-6">
          <span className="text-xs font-black tracking-wider text-black bg-[#FF70A6] border-2 border-black shadow-[2px_2px_0px_0px_#000] px-3.5 py-1 rounded-xl uppercase">
            FIFA 26 PARTNER
          </span>
          <span className="text-xs font-black tracking-wider text-black bg-[#FFE600] border-2 border-black shadow-[2px_2px_0px_0px_#000] px-3.5 py-1 rounded-xl uppercase">
            MTV SPORTS LIVE
          </span>
          <span className="text-xs font-black tracking-wider text-black bg-[#06D6A0] border-2 border-black shadow-[2px_2px_0px_0px_#000] px-3.5 py-1 rounded-xl uppercase">
            ANDROID APK ONLY
          </span>
          <span className="text-xs font-black tracking-wider text-black bg-[#4CC9F0] border-2 border-black shadow-[2px_2px_0px_0px_#000] px-3.5 py-1 rounded-xl uppercase">
            UPSTORE EXCLUSIVE
          </span>
        </div>

        {/* Main Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-black mb-6 leading-tight">
          {translations.heroTitle}
        </h1>

        {/* Alliance Subtitle Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#FFE600] border-2 border-black rounded-full text-xs sm:text-sm font-black text-black mb-6 shadow-[2.5px_2.5px_0px_0px_#000]">
          <Sparkles className="w-4 h-4 text-black fill-black" />
          <span>{translations.allianceBadge}</span>
        </div>

        {/* Description */}
        <p className="text-base sm:text-lg text-neutral-800 max-w-3xl mx-auto leading-relaxed font-bold mb-8">
          {translations.heroDesc}
        </p>

        {/* Android Spec Alert Box */}
        <div className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#06D6A0] border-2 border-black text-black rounded-2xl text-xs sm:text-sm font-black max-w-xl mx-auto mb-10 shadow-[3px_3px_0px_0px_#000]">
          <Smartphone className="w-5 h-5 flex-shrink-0 stroke-[2.5]" />
          <span>{translations.androidOnlyTag}</span>
        </div>

        {/* ── 2 Main Neubrutalist Cards (Pricing & Tech Specs) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch max-w-4xl mx-auto text-start">
          
          {/* Card 1: Pricing & Checkout Card (Left / Main) */}
          <div className="lg:col-span-7 bg-white border-[2.5px] border-black rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-[6px_6px_0px_0px_#000] relative">
            <div>
              {/* Product Badge & Rating */}
              <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                <span className="text-[11px] font-black text-black bg-[#FFE600] border-2 border-black px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-[1.5px_1.5px_0px_0px_#000]">
                  {translations.tournamentPassBadge}
                </span>
                <span className="text-xs font-black text-black bg-neutral-100 border-2 border-black px-2.5 py-1 rounded-lg shadow-[1.5px_1.5px_0px_0px_#000]">
                  {translations.reviewsCount}
                </span>
              </div>

              {/* Card Title */}
              <h2 className="text-xl sm:text-2xl font-black text-black leading-snug mb-3">
                {translations.cardTitle}
              </h2>

              {/* Guarantee Badges */}
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-black bg-[#06D6A0] border-2 border-black px-2.5 py-1 rounded-lg shadow-[1.5px_1.5px_0px_0px_#000]">
                  <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{translations.instantDelivery}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-black bg-[#FF70A6] border-2 border-black px-2.5 py-1 rounded-lg shadow-[1.5px_1.5px_0px_0px_#000]">
                  <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{translations.warrantyBadge}</span>
                </span>
              </div>

              {/* Pricing Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border-2 border-black shadow-[3px_3px_0px_0px_#000] mb-6">
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-600 block mb-1">
                  {translations.pricingTitle}
                </span>
                <div className="flex items-baseline gap-3">
                  <span className="text-sm font-bold text-neutral-500 line-through font-mono">
                    $99.99
                  </span>
                  <span className="text-3xl sm:text-4xl font-black text-black font-mono tracking-tight">
                    $9.99
                  </span>
                  <span className="text-xs font-black text-black bg-[#FF70A6] border-2 border-black px-2 py-0.5 rounded-md shadow-[1.5px_1.5px_0px_0px_#000]">
                    {translations.save90}
                  </span>
                </div>

                {/* Local Currency Rates */}
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t-2 border-dashed border-neutral-300">
                  <span className="text-xs font-black text-black bg-white border border-black px-2.5 py-1 rounded-lg shadow-[1px_1px_0px_0px_#000] font-mono">
                    {translations.egyptRate}
                  </span>
                  <span className="text-xs font-black text-black bg-white border border-black px-2.5 py-1 rounded-lg shadow-[1px_1px_0px_0px_#000] font-mono">
                    {translations.saudiRate}
                  </span>
                </div>
              </div>
            </div>

            {/* Subscribe Action Button */}
            <button
              onClick={handleAddToCart}
              disabled={addingToCart}
              className="w-full py-4 bg-[#06D6A0] hover:bg-[#05b385] text-black font-black text-sm sm:text-base uppercase tracking-wider rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {addingToCart ? (
                <span>{translations.adding}</span>
              ) : (
                <>
                  <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
                  <span>{translations.buyBtn}</span>
                  <ArrowRight className={`w-5 h-5 stroke-[2.5] ${isAr ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>
          </div>

          {/* Card 2: Technical Specifications Card (Right) */}
          <div className="lg:col-span-5 bg-white border-[2.5px] border-black rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-[6px_6px_0px_0px_#000]">
            <div>
              <h3 className="text-sm font-black text-black uppercase tracking-wider mb-5 flex items-center gap-2 border-b-2 border-black pb-3">
                <span className="w-2.5 h-4 bg-[#FFE600] border border-black rounded-sm inline-block" />
                <span>{translations.specsTitle}</span>
              </h3>

              <ul className="space-y-4">
                {[
                  { title: translations.spec1Title, desc: translations.spec1Desc, icon: Tv, bg: 'bg-[#FFE600]' },
                  { title: translations.spec2Title, desc: translations.spec2Desc, icon: Volume2, bg: 'bg-[#FF70A6]' },
                  { title: translations.spec3Title, desc: translations.spec3Desc, icon: Activity, bg: 'bg-[#06D6A0]' },
                  { title: translations.spec4Title, desc: translations.spec4Desc, icon: Cast, bg: 'bg-[#4CC9F0]' },
                  { title: translations.spec5Title, desc: translations.spec5Desc, icon: Lock, bg: 'bg-[#B892FF]' },
                ].map((spec, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <div className={`w-8 h-8 rounded-xl ${spec.bg} border-2 border-black flex items-center justify-center text-black shadow-[1.5px_1.5px_0px_0px_#000] shrink-0 mt-0.5`}>
                      <spec.icon className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-black">{spec.title}</h4>
                      <p className="text-[11px] text-neutral-700 font-bold leading-normal">{spec.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Local payment disclaimer */}
            <div className="mt-6 pt-4 border-t-2 border-dashed border-neutral-300">
              <div className="p-3 bg-[#FFE600] border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_#000] flex gap-2.5 items-start">
                <AlertCircle className="w-4 h-4 text-black flex-shrink-0 mt-0.5 stroke-[2.5]" />
                <p className="text-[11px] text-black font-black leading-relaxed">
                  {translations.paymentNotice}
                </p>
              </div>
            </div>

          </div>

        </div>

      </section>

      {/* ── Section 2: Why Android Section ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-[#FFE600] border-[2.5px] border-black rounded-3xl p-6 sm:p-10 shadow-[6px_6px_0px_0px_#000]">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-8 text-start">
              <span className="text-xs font-black text-black bg-white border border-black px-2.5 py-0.5 rounded-md uppercase tracking-wider mb-3 inline-block shadow-[1px_1px_0px_0px_#000]">
                {isAr ? 'الشفافية وقوة الـ APK' : 'APK Freedom & Fair Pricing'}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-black mb-3">
                {translations.whyTitle}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-900 leading-relaxed font-bold">
                {translations.whyDesc}
              </p>
            </div>
            <div className="md:col-span-4 flex justify-center">
              <div className="w-28 h-28 rounded-2xl bg-white border-[2.5px] border-black flex items-center justify-center shadow-[4px_4px_0px_0px_#000]">
                <Smartphone className="w-14 h-14 text-black stroke-[2]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Feature Details Grid ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-t-2 border-black">
        <div className="text-center mb-10">
          <span className="text-xs font-black text-black bg-[#FF70A6] border-2 border-black shadow-[2px_2px_0px_0px_#000] px-4 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">
            {isAr ? 'تقنيات البث الحديثة' : 'Advanced Streaming Features'}
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-black">
            {translations.featTitle}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[
            { title: translations.featUhdTitle, desc: translations.featUhdDesc, icon: Tv, bg: 'bg-[#FF70A6]' },
            { title: translations.featCommentaryTitle, desc: translations.featCommentaryDesc, icon: Volume2, bg: 'bg-[#FFE600]' },
            { title: translations.featNoLagTitle, desc: translations.featNoLagDesc, icon: Wifi, bg: 'bg-[#06D6A0]' },
            { title: translations.featTvTitle, desc: translations.featTvDesc, icon: Smartphone, bg: 'bg-[#4CC9F0]' },
          ].map((item, idx) => (
            <div 
              key={idx}
              className="bg-white border-[2.5px] border-black rounded-3xl p-6 shadow-[5px_5px_0px_0px_#000] hover:shadow-[7px_7px_0px_0px_#000] hover:-translate-y-1 transition-all text-start"
            >
              <div className={`w-12 h-12 rounded-2xl ${item.bg} border-2 border-black flex items-center justify-center text-black mb-4 shadow-[2px_2px_0px_0px_#000]`}>
                <item.icon className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-black mb-2">
                {item.title}
              </h3>
              <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed font-bold">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 4: FAQ Accordion ── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t-2 border-black text-start">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-4xl font-black text-black flex items-center justify-center gap-2">
            <HelpCircle className="w-7 h-7 sm:w-9 sm:h-9 text-black stroke-[2.5]" />
            <span>{translations.faqTitle}</span>
          </h2>
        </div>

        <div className="space-y-3.5">
          {[
            { q: translations.faq1Q, a: translations.faq1A },
            { q: translations.faq2Q, a: translations.faq2A },
            { q: translations.faq3Q, a: translations.faq3A },
            { q: translations.faq4Q, a: translations.faq4A },
          ].map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div 
                key={i} 
                className={`rounded-2xl border-2 border-black bg-white overflow-hidden transition-all ${
                  isOpen ? 'shadow-[5px_5px_0px_0px_#000]' : 'shadow-[3px_3px_0px_0px_#000] hover:shadow-[4px_4px_0px_0px_#000]'
                }`}
              >
                <button
                  onClick={() => toggleFaq(i)}
                  className="w-full px-5 py-4 flex items-center justify-between text-start gap-4 font-black text-xs sm:text-sm text-black cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <span className={`shrink-0 w-7 h-7 rounded-lg border-2 border-black flex items-center justify-center transition-all duration-200 shadow-[1px_1px_0px_0px_#000] ${
                    isOpen ? 'rotate-180 bg-[#FFE600] text-black' : 'bg-neutral-100 text-black'
                  }`}>
                    <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                  </span>
                </button>
                
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t-2 border-dashed border-neutral-300 bg-[#FFFDF9]"
                    >
                      <div className="px-5 py-4 text-xs sm:text-sm text-neutral-800 leading-relaxed font-bold">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA to subscribe */}
        <div className="mt-10 p-6 rounded-3xl bg-[#06D6A0] border-[2.5px] border-black shadow-[6px_6px_0px_0px_#000] text-center flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-start">
            <h4 className="text-base sm:text-lg font-black text-black mb-1">
              {isAr ? 'جاهز للاستمتاع بكأس العالم 2026؟' : 'Ready to Watch World Cup 2026?'}
            </h4>
            <p className="text-xs sm:text-sm text-neutral-900 font-bold">
              {isAr ? 'دفع عالمي آمن مع كود تفعيل فوري وضمان شامل طوال البطولة.' : 'Global secure checkout & full tournament warranty.'}
            </p>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={addingToCart}
            className="px-7 py-3.5 rounded-2xl bg-black hover:bg-neutral-800 text-white font-black text-xs sm:text-sm border-2 border-black shadow-[3px_3px_0px_0px_#FFE600] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <span>{translations.buyBtn}</span>
            <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
          </button>
        </div>

      </section>

    </div>
  );
}
