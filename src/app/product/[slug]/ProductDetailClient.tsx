'use client';

/**
 * ProductDetailClient.tsx (Product Detail Client Hydration Component) — UpStore Premium Digital Marketplace
 * Fully responsive client component with stateful logic and animations.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Package, Zap, ShoppingCart, ShieldCheck, Star, Check, X, Edit2, Trash2, RefreshCw, Lock, HelpCircle, Store, Palette, Film, Bot, Code, Play, Music, Gamepad2, Sparkles, Laptop, Sliders, ThumbsUp, Loader2, ShoppingBag } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { createClient } from '@/utils/supabase/client';
import { ProductCard } from '@/components/ProductCard';
import { ProductImage } from '@/components/ProductImage';
import { ProductAmbientGlow } from '@/components/ui/ProductAmbientGlow';
import { ProductDescriptionRenderer } from '@/components/ui/ProductDescriptionRenderer';
import {
  DEFAULT_PRODUCT_BRAND_COLOR,
  normalizeProductRecord,
  getActiveFlashDealSlug,
  formatLocalizedDuration,
  formatLocalizedWarranty,
  formatLocalizedDeliveryTime,
  generateSmartProductAdvantages,
  MASTER_UPSTORE_CATALOG,
} from '@/utils/products';
import { isAdminIdentity } from '@/utils/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/store/useCartStore';
import { useToastStore } from '@/store/useToastStore';
import { StarRating } from '@/components/ui/SmartProductFire';
import { useActiveArabOrderStore } from '@/store/useActiveArabOrderStore';

const SmartPaymentModal = dynamic(
  () => import('@/components/checkout/SmartPaymentModal').then((mod) => mod.SmartPaymentModal),
  { ssr: false }
);



const ICON_MAP: Record<string, any> = {
  netflix: Film,
  youtube: Play,
  spotify: Music,
  vpn: ShieldCheck,
  microsoft: Laptop,
  gemini: Sparkles,
  chatgpt: Bot,
  xbox: Gamepad2,
  canva: Palette,
  capcut: Film,
  cursor: Code,
};

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_PRODUCT = {
  name: 'Netflix Premium 4K — 1 Month',
  slug: 'netflix-premium-4k-1-month',
  category: 'Subscriptions',
  Icon: Film,
  description: `Unlock the full power of Netflix's premium tier with uncompromised 4K Ultra HD streaming quality. This is a shared private account with a dedicated, exclusively reserved screen slot — meaning you will never experience the frustration of another user bumping your session. Every title in Netflix's vast global library is immediately accessible, including new releases, originals, and licensed blockbusters.
  
Stream on any device you own — Smart TVs, gaming consoles, phones, tablets, laptops, and desktop browsers are all fully supported. HDR10, Dolby Vision, and spatial audio profiles are preserved in their highest quality formats, giving you a genuinely cinematic experience at a fraction of the retail cost. Language and subtitle options remain fully available, so you can watch exactly how you prefer.

After payment confirmation, your order is registered immediately inside your UpStore dashboard. Credentials or license details appear there as soon as the order is fulfilled. Each subscription is backed by a 30-day warranty — if any issue arises we replace your credentials at zero cost, guaranteed.`,
  advantages: [
    'Premium Quality Guaranteed',
    'Dedicated screen slot with exclusive profile',
    '30-day replacement warranty guarantee',
    'Compatible with all Smart TVs, mobiles & consoles',
    '4K Ultra HD resolution + Dolby Vision support',
    '24/7 client helpdesk & live ticket center',
  ],
  howItWorks: [
    'Complete your purchase through our secure payment gateway',
    'See the order appear in your UpStore dashboard immediately',
    'Instantly retrieve your account credentials or activation code',
    'Follow the provided instructions to activate and enjoy your service',
  ],
  marketPrice: 15.99,
  ourPrice: 3.49,
  saleEndsIn: 7200, // seconds (2 hours)
  stock: 847,
  maxStock: 1000,
  rating: 4.9,
  reviewCount: 2341,
  soldCount: 12450,
  deliveryType: 'reviewed',
  deliveryTime: 'بعد مراجعة الدفع',
  warrantyDuration: '18 Months',
  subscriptionDuration: '1 Month',
  paymentMethods: ['VISA', 'Mastercard', 'Crypto', 'PayPal', 'USDT'],
};

function getMockReviewsForSlug(slug: string, lang: string) {
  const isAr = lang === 'ar';
  const cleanSlug = (slug || '').toLowerCase();

  // ── Gemini & Antigravity (18 Months Suite) ───────────────────────────────
  if (cleanSlug.includes('gemini') || cleanSlug === '1' || cleanSlug === '6') {
    return [
      {
        id: 'mock-gemini-1',
        username: isAr ? 'عمر الشناوي' : 'Omar_Shennawy',
        avatar: 'OS',
        rating: 5,
        title: isAr ? 'شغال صاروخ مع Antigravity' : 'Flying fast with Antigravity',
        body: isAr
          ? 'والله ممتاز وسريع جداً، نموذج 3.7 فلاش فرق معاي بالبرمجة ومساحة الـ 2TB سحابي اتفعلت فوراً.'
          : 'Incredible speed with Gemini 3.7 Flash and Antigravity workspace. The 2TB Google One cloud storage activated immediately.',
        date: isAr ? 'منذ ساعتين' : '2 hours ago',
        verified: true,
        helpful_count: 8
      },
      {
        id: 'mock-gemini-2',
        username: isAr ? 'تركي القحطاني' : 'Turki_AlQahtani',
        avatar: 'TQ',
        rating: 5,
        title: isAr ? 'سياق 2 مليون رمز عملاق' : 'Massive 2M context window',
        body: isAr
          ? 'وصول كامل لـ Google Antigravity مع سياق 2 مليون رمز، دفعت بـ STC Pay والتسليم كان فوري بدون انتظار.'
          : 'Full unrestricted access to Antigravity and 2M token context. Fast checkout and instant delivery.',
        date: isAr ? 'منذ 4 ساعات' : '4 hours ago',
        verified: true,
        helpful_count: 7
      },
      {
        id: 'mock-gemini-3',
        username: isAr ? 'كريم عبد العزيز' : 'Karim_Abdelaziz',
        avatar: 'KA',
        rating: 5,
        title: isAr ? 'اشتراك 18 شهر رسمي وضمان كامل' : '18 months official guarantee',
        body: isAr
          ? 'أفضل عرض شفته، خصم 70% واشتراك 18 شهر رسمي شغال زي الطلقة في Docs و Gmail وأكواد البايثون.'
          : 'Best deal online. 18 months official suite working smoothly in Docs, Gmail and Python coding.',
        date: isAr ? 'أمس' : 'Yesterday',
        verified: true,
        helpful_count: 9
      },
      {
        id: 'mock-gemini-4',
        username: isAr ? 'سارة المنصور' : 'Sara_AlMansoor',
        avatar: 'SM',
        rating: 5,
        title: isAr ? 'ممتاز للأبحاث والترجمة' : 'Great for deep research',
        body: isAr
          ? 'ممتاز صراحة بالذات سياق المحادثة الطويل لتحليل ملفات PDF والأبحاث الضخمة.'
          : 'Exceptional for analyzing long PDFs, research papers, and translating long technical documents.',
        date: isAr ? 'منذ يومين' : '2 days ago',
        verified: true,
        helpful_count: 5
      },
      {
        id: 'mock-gemini-5',
        username: isAr ? 'فهد العتيبي' : 'Fahad_AlOtaibi',
        avatar: 'FO',
        rating: 5,
        title: isAr ? 'حساب شخصي ومفعل تماماً' : 'Private and fully active',
        body: isAr
          ? 'جيمناي أدفانسد وفر علي كثير بالدوام، حساب أصلي ومفعل وضمان 18 شهر كاملين الله يوفقكم.'
          : 'Saved me tons of work hours. Genuine private account backed by a solid 18-month warranty.',
        date: isAr ? 'منذ 3 أيام' : '3 days ago',
        verified: true,
        helpful_count: 6
      },
      {
        id: 'mock-gemini-6',
        username: isAr ? 'إسلام ممدوح' : 'Islam_Mamdouh',
        avatar: 'IM',
        rating: 4,
        title: isAr ? 'الدعم ساعدني فورا' : 'Support helped quickly',
        body: isAr
          ? 'خدمة ممتازة، واجهتني استفسار في البداية وكلمت الدعم تليجرام وحلوها في ثواني.'
          : 'Top tier service. Had a quick question regarding workspace setup and Telegram support resolved it in seconds.',
        date: isAr ? 'منذ 4 أيام' : '4 days ago',
        verified: true,
        helpful_count: 3
      }
    ];
  }

  // ── Canva Pro ────────────────────────────────────────────────────────────
  if (cleanSlug.includes('canva') || cleanSlug.includes('كانفا')) {
    return [
      {
        id: 'mock-canva-1',
        username: isAr ? 'سارة المهدي' : 'Sara_ElMahdy',
        avatar: 'SE',
        rating: 5,
        title: isAr ? 'حساب كانفا برو كامل القوالب' : 'Canva Pro full access',
        body: isAr
          ? 'حساب كانفا برو شغال ممتاز وكل القوالب والخطوط العربية مفتوحة وسعر رائع جداً.'
          : 'Canva Pro works perfectly. All premium templates, Arabic fonts and brand assets fully unlocked.',
        date: isAr ? 'منذ ساعتين' : '2 hours ago',
        verified: true,
        helpful_count: 6
      },
      {
        id: 'mock-canva-2',
        username: isAr ? 'محمد إبراهيم' : 'Mohamed_Ibrahim',
        avatar: 'MI',
        rating: 5,
        title: isAr ? 'إزالة الخلفيات بضغطة زر' : 'Magic eraser is instant',
        body: isAr
          ? 'أداة Magic Eraser وإزالة الخلفيات وتصدير SVG بدون حدود وفرت وقت كبير في شغلي كـ Graphic Designer.'
          : 'Magic background removal and unlimited high-res SVG downloads save me countless hours as a designer.',
        date: isAr ? 'أمس' : 'Yesterday',
        verified: true,
        helpful_count: 5
      },
      {
        id: 'mock-canva-3',
        username: isAr ? 'نورة القحطاني' : 'Noura_AlQahtani',
        avatar: 'NQ',
        rating: 5,
        title: isAr ? 'تفعيل على إيميلي الشخصي' : 'Activated on my personal email',
        body: isAr
          ? 'وصلتني الدعوة مباشرة على إيميلي وتفعل اشتراك سنة كاملة بدون أي خطوات معقدة شكراً UpStore.'
          : 'Received the invite link on my personal email and 1-year Pro was activated seamlessly.',
        date: isAr ? 'منذ 3 أيام' : '3 days ago',
        verified: true,
        helpful_count: 4
      },
      {
        id: 'mock-canva-4',
        username: isAr ? 'خالد الشريف' : 'Khaled_AlSharif',
        avatar: 'KS',
        rating: 5,
        title: isAr ? 'توفير حقيقي وأصلي 100%' : 'Massive savings & 100% official',
        body: isAr
          ? 'وفرت مبالغ ضخمة مقارنة بالسعر الرسمي، والتخزين السحابي 1TB شغال لحفظ كل التصاميم.'
          : 'Saved over 80% compared to retail pricing. 1TB cloud workspace is running flawlessly.',
        date: isAr ? 'منذ 5 أيام' : '5 days ago',
        verified: true,
        helpful_count: 3
      }
    ];
  }

  // ── CapCut Pro ───────────────────────────────────────────────────────────
  if (cleanSlug.includes('capcut') || cleanSlug.includes('كاب')) {
    return [
      {
        id: 'mock-capcut-1',
        username: isAr ? 'أحمد بدران' : 'Ahmed_Badran',
        avatar: 'AB',
        rating: 5,
        title: isAr ? 'تصدير 4K 60fps بدون علامة مائية' : 'Clean 4K 60fps export',
        body: isAr
          ? 'كاب كات برو اتفعل على إيميلي وتصدير 4K 60fps سريع وبدون علامة مائية، منتج 10/10.'
          : 'CapCut Pro activated on my email. 4K 60fps rendering without watermark is blazing fast. 10/10.',
        date: isAr ? 'منذ 3 ساعات' : '3 hours ago',
        verified: true,
        helpful_count: 7
      },
      {
        id: 'mock-capcut-2',
        username: isAr ? 'ماجد العلي' : 'Majed_AlAli',
        avatar: 'MA',
        rating: 5,
        title: isAr ? 'الترجمة التلقائية الذكية' : 'AI auto-captions & effects',
        body: isAr
          ? 'ميزة Auto-Captions والفلاتر الاحترافية وتأثيرات الجسم بالذكاء الاصطناعي شغالة بالكامل.'
          : 'Auto-captions, pro transitions and AI body effects work without any limits on reels and TikToks.',
        date: isAr ? 'أمس' : 'Yesterday',
        verified: true,
        helpful_count: 4
      },
      {
        id: 'mock-capcut-3',
        username: isAr ? 'مروان فتحي' : 'Marwan_Fathi',
        avatar: 'MF',
        rating: 5,
        title: isAr ? 'شغال على الكمبيوتر والموبايل' : 'Works on PC and iPhone',
        body: isAr
          ? 'الحساب متزامن على برنامج الكمبيوتر وتطبيق الآيفون ومساحة الـ 100GB السحابية ممتازة لحفظ المشاريع.'
          : 'Syncs smoothly across Desktop PC and iPhone apps with 100GB cloud storage for project drafts.',
        date: isAr ? 'منذ 4 أيام' : '4 days ago',
        verified: true,
        helpful_count: 5
      }
    ];
  }

  // ── Cursor AI Pro ────────────────────────────────────────────────────────
  if (cleanSlug.includes('cursor') || cleanSlug.includes('كورسور')) {
    return [
      {
        id: 'mock-cursor-1',
        username: isAr ? 'سعود الحربي' : 'Saud_AlHarbi',
        avatar: 'SH',
        rating: 5,
        title: isAr ? 'سحر البرمجة مع Claude 3.7 و GPT-4o' : 'Coding powerhouse with Claude 3.7',
        body: isAr
          ? 'كورسور برو مع Claude 3.7 و GPT-4o سرع شغلي في البرمجة أضعاف، والحساب أصلي ومضمون.'
          : 'Cursor Pro with Claude 3.7 and GPT-4o boosted my programming productivity tenfold. Genuine and reliable.',
        date: isAr ? 'منذ 5 ساعات' : '5 hours ago',
        verified: true,
        helpful_count: 8
      },
      {
        id: 'mock-cursor-2',
        username: isAr ? 'طارق منصور' : 'Tarek_Mansour',
        avatar: 'TM',
        rating: 5,
        title: isAr ? '500 Fast Requests والـ Composer شغالين تمام' : '500 fast requests & Composer',
        body: isAr
          ? 'الـ 500 Fast Premium Requests والـ Multi-file Composer شغالين في المحرر بكفاءة عالية جداً.'
          : 'All 500 Fast Premium requests and multi-file composer work smoothly inside VS Code environment.',
        date: isAr ? 'أمس' : 'Yesterday',
        verified: true,
        helpful_count: 6
      },
      {
        id: 'mock-cursor-3',
        username: isAr ? 'ياسر القاضي' : 'Yasser_AlQadi',
        avatar: 'YQ',
        rating: 5,
        title: isAr ? 'تفعيل فوري ودعم متجاوب' : 'Instant activation for devs',
        body: isAr
          ? 'تسليم سريع والـ Tab autocomplete فائق الدقة في قراءة مستودع الكود بالكامل، متجر ثقة.'
          : 'Instant credentials delivery and hyper-accurate codebase autocomplete. A must-have for developers.',
        date: isAr ? 'منذ 3 أيام' : '3 days ago',
        verified: true,
        helpful_count: 4
      }
    ];
  }

  // ── ChatGPT (Plus / Pro / Shared) ────────────────────────────────────────
  if (cleanSlug.includes('chatgpt') || cleanSlug.includes('gpt') || cleanSlug.includes('openai')) {
    const isPro = cleanSlug.includes('pro');
    return [
      {
        id: 'mock-gpt-1',
        username: isAr ? 'يوسف الهواري' : 'Youssef_ElHawary',
        avatar: 'YH',
        rating: 5,
        title: isAr ? (isPro ? 'o1 Pro Mode خارق بالتحليل' : 'GPT-4o و o1 بدون VPN') : 'Fast GPT-4o & o1 reasoning',
        body: isAr
          ? (isPro 
              ? 'نموذج o1 Pro Mode فائق الذكاء في حل المسائل الهندسية والبرمجية المعقدة، حساب رسمي ومستقر.' 
              : 'شغال معايا في البرمجة وكتابة المحتوى وسريع جداً بدون أي تعليق، تفعل فوراً وبدون الحاجة لـ VPN.')
          : 'Blazing fast responses with GPT-4o and o1 models. Zero downtime, activated instantly with full features.',
        date: isAr ? 'منذ 4 ساعات' : '4 hours ago',
        verified: true,
        helpful_count: 7
      },
      {
        id: 'mock-gpt-2',
        username: isAr ? 'فيصل الزهراني' : 'Faisal_AlZahrani',
        avatar: 'FZ',
        rating: 5,
        title: isAr ? 'حساب مستقر وتوفير كبير' : 'Stable account & huge savings',
        body: isAr
          ? 'شات جي بي تي ممتاز وسريع جداً في التحليل وتوليد الصور DALL-E 3، شكراً لكم على المصداقية.'
          : 'DALL-E 3 image generation and advanced data analysis work flawlessly. Reliable and cheap.',
        date: isAr ? 'أمس' : 'Yesterday',
        verified: true,
        helpful_count: 5
      },
      {
        id: 'mock-gpt-3',
        username: isAr ? 'Alex Miller' : 'Alex_Miller',
        avatar: 'AM',
        rating: 5,
        title: 'Instant delivery & reliable service',
        body: 'Instant account delivery as advertised. Works flawlessly with GPT-4o and custom GPTs.',
        date: isAr ? 'منذ يومين' : '2 days ago',
        verified: true,
        helpful_count: 4
      }
    ];
  }

  // ── Netflix 4K UHD ───────────────────────────────────────────────────────
  if (cleanSlug.includes('netflix') || cleanSlug.includes('نتفلكس') || cleanSlug.includes('نتفليكس')) {
    return [
      {
        id: 'mock-netflix-1',
        username: isAr ? 'مشعل الرويلي' : 'Meshal_AlRuwaili',
        avatar: 'MR',
        rating: 5,
        title: isAr ? 'شغال فور كي ومستقر تماماً' : '4K HDR crystal clear',
        body: isAr
          ? 'اشتراك نتفلكس شغال على التلفزيون بدقة 4K عالية وما يفصل أبداً، ملف خاص برمز سري وأنصح به.'
          : 'Netflix 4K Ultra HD runs perfectly on my smart TV. Dedicated private profile with PIN code.',
        date: isAr ? 'منذ ساعتين' : '2 hours ago',
        verified: true,
        helpful_count: 8
      },
      {
        id: 'mock-netflix-2',
        username: isAr ? 'حسام البدري' : 'Hossam_ElBadry',
        avatar: 'HB',
        rating: 5,
        title: isAr ? 'بدون أي تعارض في المشاهدة' : 'Zero session conflicts',
        body: isAr
          ? 'الشاشة مخصصة ومستقرة طوال الشهر، لا انقطاع ولا تعارض والدعم متجاوب في تليجرام.'
          : 'My dedicated profile has been rock solid. No interruptions, no session conflicts. Highly recommend.',
        date: isAr ? 'أمس' : 'Yesterday',
        verified: true,
        helpful_count: 6
      },
      {
        id: 'mock-netflix-3',
        username: isAr ? 'حمزة بن علي' : 'Hamza_BenAli',
        avatar: 'HA',
        rating: 5,
        title: isAr ? 'أفضل سعر لنتفليكس الأصلي' : 'Best Netflix value online',
        body: isAr
          ? 'قارنت الأسعار في كل مكان وهنا أرخص سعر وشغال على تلفزيون سامسونج واللابتوب ممتاز.'
          : 'Compared prices everywhere and UpStore is unmatched. Works flawlessly on Samsung TV & laptop.',
        date: isAr ? 'منذ يومين' : '2 days ago',
        verified: true,
        helpful_count: 4
      }
    ];
  }

  // ── Spotify Premium ──────────────────────────────────────────────────────
  if (cleanSlug.includes('spotify') || cleanSlug.includes('سبوتيفاي')) {
    return [
      {
        id: 'mock-spotify-1',
        username: isAr ? 'ناصر العامري' : 'Nasser_AlAmeri',
        avatar: 'NA',
        rating: 5,
        title: isAr ? 'تفعل على حسابي الشخصي' : 'Activated on my personal account',
        body: isAr
          ? 'الخدمة ممتازة واتحول حسابي لبريميوم ونزلت الأغاني كلها بأعلى جودة وبدون إعلانات.'
          : 'Great service. My personal account was upgraded to premium. No ads and highest quality downloads.',
        date: isAr ? 'منذ 3 ساعات' : '3 hours ago',
        verified: true,
        helpful_count: 5
      },
      {
        id: 'mock-spotify-2',
        username: isAr ? 'وليد الدوسري' : 'Waleed_AlDossary',
        avatar: 'WD',
        rating: 5,
        title: isAr ? 'استماع بدون إعلانات وجودة 320kbps' : 'Ad-free 320kbps audio',
        body: isAr
          ? 'اشتراك سبوتيفاي بدون إعلانات والتحميل شغال بجودة عالية، شكراً UpStore على السرعة.'
          : 'Ad-free streaming with 320kbps high fidelity sound. Fast and reliable service.',
        date: isAr ? 'أمس' : 'Yesterday',
        verified: true,
        helpful_count: 4
      }
    ];
  }

  // ── YouTube Premium ──────────────────────────────────────────────────────
  if (cleanSlug.includes('youtube') || cleanSlug.includes('يوتيوب')) {
    return [
      {
        id: 'mock-yt-1',
        username: isAr ? 'عبد الله الكواري' : 'Abdullah_AlKuwari',
        avatar: 'AK',
        rating: 5,
        title: isAr ? 'يوتيوب بدون إعلانات في السيارة والشاشات' : 'Ad-free across all screens',
        body: isAr
          ? 'يوتيوب بريميوم فك أزمة الإعلانات في السيارة والشاشات ويوتيوب ميوزك شغال بالخلفية ممتاز.'
          : 'Ad-free YouTube on car dashboard, TV and mobile. YouTube Music background play works great.',
        date: isAr ? 'منذ 4 ساعات' : '4 hours ago',
        verified: true,
        helpful_count: 6
      },
      {
        id: 'mock-yt-2',
        username: isAr ? 'طارق العوضي' : 'Tarek_ElAwady',
        avatar: 'TE',
        rating: 5,
        title: isAr ? 'تفعيل فوري على إيميلي الخاص' : 'Direct invite to my Google account',
        body: isAr
          ? 'وصلتني الدعوة الرسمية على إيميلي في جوجل وتفعل في دقائق بدون طلب الباسورد.'
          : 'Received the official family invite link on my Google email. Activated safely without sharing passwords.',
        date: isAr ? 'أمس' : 'Yesterday',
        verified: true,
        helpful_count: 5
      }
    ];
  }

  // ── Microsoft Office 365 ─────────────────────────────────────────────────
  if (cleanSlug.includes('office') || cleanSlug.includes('microsoft') || cleanSlug.includes('اوفيس') || cleanSlug.includes('ويندوز')) {
    return [
      {
        id: 'mock-office-1',
        username: isAr ? 'خالد عبد السلام' : 'Khaled_AbdelSalam',
        avatar: 'KA',
        rating: 5,
        title: isAr ? 'أوفيس أصلي ومساحة ون درايف 1TB' : 'Genuine Office & 1TB OneDrive',
        body: isAr
          ? 'مايكروسوفت أوفيس أصلي والـ OneDrive اشتغل 1 تيرابايت كاملين لحفظ ملفات الشغل، تسلم إيديكم.'
          : 'Genuine Microsoft Office license with a full 1TB OneDrive cloud storage. Word, Excel and PPT activated.',
        date: isAr ? 'منذ يومين' : '2 days ago',
        verified: true,
        helpful_count: 6
      },
      {
        id: 'mock-office-2',
        username: isAr ? 'مينا سمير' : 'Mina_Samir',
        avatar: 'MS',
        rating: 5,
        title: isAr ? 'شغال على اللابتوب والتليفون' : 'Active on Mac & Laptop',
        body: isAr
          ? 'أوفيس 365 أصلي وشغال على اللاب والتليفون مع بعض وتحديثات رسمية من مايكروسوفت.'
          : 'Installed on both my Windows desktop and MacBook. Direct updates from Microsoft servers.',
        date: isAr ? 'منذ 4 أيام' : '4 days ago',
        verified: true,
        helpful_count: 4
      }
    ];
  }

  // ── NordVPN / VPNs ───────────────────────────────────────────────────────
  if (cleanSlug.includes('nord') || cleanSlug.includes('vpn') || cleanSlug.includes('نورد')) {
    return [
      {
        id: 'mock-vpn-1',
        username: isAr ? 'أحمد كمال' : 'Ahmed_Kamal',
        avatar: 'AK',
        rating: 5,
        title: isAr ? 'سيرفرات سريعة وبدون تقطيع' : 'Fast ultra-stable servers',
        body: isAr
          ? 'نورد في بي ان سريع جداً ومستقر وبيفتح كل المواقع والبث المباشر والدفع سهل.'
          : 'NordVPN is ultra-fast and stable. Unblocks all geo-restricted streaming with low latency.',
        date: isAr ? 'منذ 3 ساعات' : '3 hours ago',
        verified: true,
        helpful_count: 5
      },
      {
        id: 'mock-vpn-2',
        username: isAr ? 'سارة طارق' : 'Sara_Tariq',
        avatar: 'ST',
        rating: 5,
        title: isAr ? 'حساب شغال سنة كاملة مع ضمان' : '1 Year full warranty',
        body: isAr
          ? 'الحساب شغال تمام على الموبايل واللابتوب والضمان مريح جداً وخدمة دعم ممتازة.'
          : 'Account is running smoothly on both phone and laptop. 1-year guarantee gives great peace of mind.',
        date: isAr ? 'منذ يومين' : '2 days ago',
        verified: true,
        helpful_count: 3
      }
    ];
  }

  // ── Steam & Xbox Gaming ──────────────────────────────────────────────────
  if (cleanSlug.includes('steam') || cleanSlug.includes('xbox') || cleanSlug.includes('game')) {
    return [
      {
        id: 'mock-game-1',
        username: isAr ? 'حمد المطيري' : 'Hamad_AlMutairi',
        avatar: 'HM',
        rating: 5,
        title: isAr ? 'كود أصلي وتفعيل فوري' : 'Genuine code redeemed instantly',
        body: isAr
          ? 'كود الألعاب تفعل مباشرة وشحنت الحساب بدون أي انتظار، خدمة وسرعة ولا غلطة.'
          : 'Redeemed instantly onto my gaming account. 100% official and super fast delivery.',
        date: isAr ? 'أمس' : 'Yesterday',
        verified: true,
        helpful_count: 5
      },
      {
        id: 'mock-game-2',
        username: isAr ? 'سعود الشريف' : 'Saud_AlSharif',
        avatar: 'SS',
        rating: 5,
        title: isAr ? 'مكتبة ألعاب ضخمة' : 'Huge game library & EA Play',
        body: isAr
          ? 'جيم باس التيميت شغال وكل ألعاب اليوم الأول و EA Play موجودة وتجربة ممتازة.'
          : 'Game Pass Ultimate is active with EA Play and hundreds of day-one game titles. Perfect experience.',
        date: isAr ? 'منذ 3 أيام' : '3 days ago',
        verified: true,
        helpful_count: 4
      }
    ];
  }

  // ── Generic Fallback Reviews (Polished & Professional) ───────────────────
  return [
    {
      id: 'mock-gen-1',
      username: isAr ? 'عبد العزيز السبيعي' : 'Abdulaziz_AlSubaie',
      avatar: 'AS',
      rating: 5,
      title: isAr ? 'خدمة ممتازة وتسليم فوري' : 'Excellent service and instant delivery',
      body: isAr 
        ? 'دفع عالمي آمن ومريح مع دعم فني متعاون للغاية. المنتج يعمل بشكل مثالي دون أي مشاكل وتجربة ممتازة سأكررها.'
        : 'Smooth global checkout and very helpful customer support. Product works perfectly with zero issues. Great experience.',
      date: isAr ? 'منذ يومين' : '2 days ago',
      verified: true,
      helpful_count: 4
    },
    {
      id: 'mock-gen-2',
      username: isAr ? 'مصطفى السعيد' : 'Mostafa_ElSaeed',
      avatar: 'MS',
      rating: 5,
      title: isAr ? 'أفضل سعر وجودة أصلية' : 'Best price and 100% genuine',
      body: isAr
        ? 'بالتأكيد أفضل سعر وجودة ممتازة. الحساب مستقر تماماً ومطابق للوصف بالكامل مع ضمان استبدال شامل.'
        : 'Definitely the best price and high quality. The account is stable, exactly as described, with full warranty.',
      date: isAr ? 'منذ 4 أيام' : '4 days ago',
      verified: true,
      helpful_count: 3
    }
  ];
}

const PRODUCT_MAP: Record<string, { Icon: any, image_url: string, name: string, brandColor: string, category: string, marketPrice: number, ourPrice: number, rating: number, reviews: number }> = {
  'gemini-advanced-18-months': { Icon: Sparkles, image_url: '/images/products/gemini-advanced.png', name: 'Google Gemini Advanced & Antigravity Suite - 18 Months (Gemini 3.7 Flash)', brandColor: 'hover:border-[#9D4EDF]/40 hover:bg-[#9D4EDF]/5', category: 'Accounts', marketPrice: 18.99, ourPrice: 5.64, rating: 4.8, reviews: 76 },
  'gemini-pro-18-months': { Icon: Sparkles, image_url: '/images/products/gemini-advanced.png', name: 'Google Gemini Advanced & Antigravity Suite - 18 Months (Gemini 3.7 Flash)', brandColor: 'hover:border-[#9D4EDF]/40 hover:bg-[#9D4EDF]/5', category: 'Accounts', marketPrice: 18.99, ourPrice: 5.64, rating: 4.8, reviews: 76 },
  'canva-pro-1-year': { Icon: Palette, image_url: '/images/products/canva-pro.png', name: 'Canva Pro — 1 Year Full Access', brandColor: 'hover:border-[#00C4CC]/40 hover:bg-[#00C4CC]/5', category: 'Subscriptions', marketPrice: 54.99, ourPrice: 4.99, rating: 4.9, reviews: 142 },
  'canva-pro-lifetime': { Icon: Palette, image_url: '/images/products/canva-pro.png', name: 'Canva Pro — Lifetime Access VIP', brandColor: 'hover:border-[#00C4CC]/40 hover:bg-[#00C4CC]/5', category: 'Subscriptions', marketPrice: 119.99, ourPrice: 8.99, rating: 4.9, reviews: 98 },
  'chatgpt-plus-1-month': { Icon: Bot, image_url: '/images/products/chatgpt-plus.png', name: 'ChatGPT Plus — 1 Month Private Access (GPT-4o & o1)', brandColor: 'hover:border-[#10A37F]/40 hover:bg-[#10A37F]/5', category: 'Accounts', marketPrice: 20.00, ourPrice: 4.49, rating: 4.9, reviews: 215 },
  'chatgpt-pro-1-month': { Icon: Bot, image_url: '/images/products/chatgpt-pro.png', name: 'ChatGPT Pro — 1 Month Ultra Access (o1 Pro Mode & Unlimited GPT-4o)', brandColor: 'hover:border-[#818CF8]/40 hover:bg-[#818CF8]/5', category: 'Accounts', marketPrice: 200.00, ourPrice: 24.99, rating: 5.0, reviews: 54 },
  'capcut-pro-1-month': { Icon: Film, image_url: '/images/products/capcut-pro.png', name: 'CapCut Pro — 1 Month Personal Account', brandColor: 'hover:border-[#00F0FF]/40 hover:bg-[#00F0FF]/5', category: 'Subscriptions', marketPrice: 19.99, ourPrice: 4.49, rating: 4.8, reviews: 118 },
  'capcut-pro-1-year': { Icon: Film, image_url: '/images/products/capcut-pro.png', name: 'CapCut Pro — 1 Year Full Gold Warranty', brandColor: 'hover:border-[#00F0FF]/40 hover:bg-[#00F0FF]/5', category: 'Subscriptions', marketPrice: 119.99, ourPrice: 29.99, rating: 4.9, reviews: 86 },
  'cursor-pro-1-month': { Icon: Code, image_url: '/images/products/cursor-pro.png', name: 'Cursor AI Pro — 1 Month Developer Suite (Claude 3.7 & GPT-4o)', brandColor: 'hover:border-[#6366F1]/40 hover:bg-[#6366F1]/5', category: 'Accounts', marketPrice: 40.00, ourPrice: 16.99, rating: 4.9, reviews: 62 },
  'cursor-pro-1-year': { Icon: Code, image_url: '/images/products/cursor-pro.png', name: 'Cursor AI Pro — 1 Year Full Developer Access', brandColor: 'hover:border-[#6366F1]/40 hover:bg-[#6366F1]/5', category: 'Accounts', marketPrice: 240.00, ourPrice: 89.99, rating: 5.0, reviews: 41 },
};

const getAvatarGradient = (initials: string) => {
  const char = (initials[0] || 'U').toUpperCase();
  const colors: Record<string, string> = {
    A: 'from-pink-500 via-rose-500 to-red-500',
    B: 'from-purple-600 via-indigo-600 to-blue-600',
    C: 'from-teal-400 via-emerald-500 to-green-500',
    D: 'from-amber-400 via-orange-500 to-yellow-500',
    E: 'from-cyan-400 via-blue-500 to-indigo-600',
    F: 'from-fuchsia-500 via-purple-600 to-violet-700',
    G: 'from-green-400 via-emerald-600 to-teal-700',
    H: 'from-rose-500 via-pink-600 to-purple-600',
    I: 'from-sky-400 via-blue-500 to-royal-600',
    J: 'from-amber-500 via-red-500 to-rose-600',
    K: 'from-violet-500 via-fuchsia-600 to-pink-600',
    L: 'from-emerald-400 via-teal-500 to-cyan-600',
    M: 'from-indigo-500 via-purple-500 to-pink-500',
    N: 'from-orange-400 via-amber-500 to-yellow-500',
    O: 'from-red-500 via-rose-600 to-pink-600',
    P: 'from-purple-500 via-violet-600 to-indigo-700',
    Q: 'from-teal-500 via-emerald-600 to-green-700',
    R: 'from-pink-400 via-rose-500 to-red-600',
    S: 'from-cyan-400 via-teal-500 to-emerald-600',
    T: 'from-blue-500 via-indigo-500 to-purple-600',
    U: 'from-violet-600 via-indigo-600 to-blue-700',
    V: 'from-fuchsia-600 via-pink-600 to-rose-700',
    W: 'from-yellow-400 via-amber-500 to-orange-600',
    X: 'from-red-600 via-orange-600 to-yellow-500',
    Y: 'from-emerald-500 via-teal-600 to-cyan-700',
    Z: 'from-purple-700 via-fuchsia-700 to-rose-700'
  };
  const grad = colors[char] || 'from-gray-500 to-slate-700';
  return `bg-gradient-to-br ${grad}`;
};

interface ProductDetailClientProps {
  initialProduct: any;
  slug: string;
}

export default function ProductDetailClient({ initialProduct, slug }: ProductDetailClientProps) {
  const router = useRouter();
  const { language, country, translateProduct, formatPrice, t, mounted } = useLocale();

  const slugToKey: Record<string, string> = {
    'gemini-advanced-18-months': 'gemini-advanced-18-months',
    'gemini-pro-18-months': 'gemini-advanced-18-months',
    'gemini': 'gemini-advanced-18-months',
    'gemini-advanced-pro': 'gemini-advanced-18-months',
    'gemini-pro-12-months': 'gemini-advanced-18-months',
    '1': 'gemini-advanced-18-months',
    '6': 'gemini-advanced-18-months',
  };
  const resolvedSlug = slugToKey[slug] || slug;
  const mapped = PRODUCT_MAP[resolvedSlug] || PRODUCT_MAP['gemini-advanced-18-months'] || PRODUCT_MAP[slug];

  const [dbProduct, setDbProduct] = useState<any>(() => {
    if (initialProduct) return initialProduct;
    const masterMatch = MASTER_UPSTORE_CATALOG.find(
      p => p.slug.toLowerCase() === slug.toLowerCase() || 
           p.slug.toLowerCase() === resolvedSlug.toLowerCase() ||
           p.slug.toLowerCase().includes(slug.toLowerCase()) ||
           slug.toLowerCase().includes(p.slug.toLowerCase())
    );
    if (masterMatch) return masterMatch;
    if (mapped) {
      return {
        id: 'fallback-' + slug,
        slug: slug,
        name: mapped.name,
        name_ar: mapped.name,
        category: mapped.category,
        market_price: mapped.marketPrice,
        our_price: mapped.ourPrice,
        price_egp: Math.round(mapped.ourPrice * 50),
        price_sar: Math.round(mapped.ourPrice * 3.75),
        rating: mapped.rating,
        reviews: mapped.reviews,
        stock: 85,
        max_stock: 100,
        brand_color: mapped.brandColor,
        description: 'Official premium subscription with instant automated delivery and 30-day warranty.',
        advantages: ['Instant automated delivery in 30s', '100% official and guaranteed', '30-Day gold warranty replacement', '24/7 priority customer support'],
      };
    }
    return null;
  });
  const [productLoading, setProductLoading] = useState(!initialProduct && !mapped);
  const [productError, setProductError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [variants, setVariants] = useState<any[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);

  const addToCart = useCartStore((state) => state.addToCart);
  const [cartAdding, setCartAdding] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [activeReviewFilter, setActiveReviewFilter] = useState('All');
  const [activeTab, setActiveTab] = useState<'overview' | 'features' | 'reviews'>('overview');

  const [realReviews, setRealReviews] = useState<any[]>([]);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [userReview, setUserReview] = useState<any>(null);

  const [newRating, setNewRating] = useState(5);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [newVerified, setNewVerified] = useState(true);
  const [newUsername, setNewUsername] = useState('');
  const [newHelpfulCount, setNewHelpfulCount] = useState(0);
  const [newDate, setNewDate] = useState('');

  // Admin and Direct review management states
  const [isAdmin, setIsAdmin] = useState(false);
  const [hiddenMockReviewIds, setHiddenMockReviewIds] = useState<string[]>([]);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [likedReviews, setLikedReviews] = useState<Record<string, { count: number; liked: boolean }>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem('upstore_liked_reviews');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed === 'object' && parsed !== null) {
          const formatted: Record<string, { count: number; liked: boolean }> = {};
          Object.keys(parsed).forEach((k) => {
            if (parsed[k]) {
              formatted[k] = { count: 0, liked: true };
            }
          });
          setLikedReviews(formatted);
        }
      }
    } catch (e) {
      console.warn('Failed to parse liked reviews from storage', e);
    }
  }, []);

  const handleToggleLike = async (reviewIdStr: string, initialCount: number) => {
    const curr = likedReviews[reviewIdStr] || { count: initialCount, liked: false };
    const nextLiked = !curr.liked;
    const baseCount = typeof curr.count === 'number' && curr.count >= 0 ? curr.count : initialCount;
    const nextCount = nextLiked ? baseCount + 1 : Math.max(0, baseCount - 1);

    // 1. Optimistic local UI update
    setLikedReviews((prev) => ({
      ...prev,
      [reviewIdStr]: {
        count: nextCount,
        liked: nextLiked
      }
    }));

    // 2. Persist to localStorage
    try {
      const stored = localStorage.getItem('upstore_liked_reviews');
      const parsed = stored ? JSON.parse(stored) : {};
      parsed[reviewIdStr] = nextLiked;
      localStorage.setItem('upstore_liked_reviews', JSON.stringify(parsed));
    } catch (e) {
      console.warn('Failed to save liked review state', e);
    }

    // 3. Persist securely to Supabase via API for real reviews
    if (!reviewIdStr.startsWith('mock-')) {
      try {
        const res = await fetch('/api/reviews/like', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reviewId: reviewIdStr,
            action: nextLiked ? 'like' : 'unlike'
          })
        });
        const data = await res.json();
        if (data && typeof data.count === 'number') {
          setLikedReviews((prev) => ({
            ...prev,
            [reviewIdStr]: {
              count: data.count,
              liked: nextLiked
            }
          }));
        }
      } catch (err) {
        console.error('Failed to sync review like to server:', err);
      }
    }
  };

  useEffect(() => {
    if (user && !newUsername) {
      setNewUsername(user.user_metadata?.display_name || user.email?.split('@')[0] || 'Customer');
    }
  }, [user, newUsername]);
  
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminOurPrice, setAdminOurPrice] = useState(0);
  const [adminMarketPrice, setAdminMarketPrice] = useState(0);
  const [adminRating, setAdminRating] = useState(5.0);
  const [adminReviews, setAdminReviews] = useState(0);
  const [adminSold, setAdminSold] = useState(0);
  const [adminStock, setAdminStock] = useState(0);
  const [adminMaxStock, setAdminMaxStock] = useState(100);
  const [adminSaving, setAdminSaving] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [sellerTooltipOpen, setSellerTooltipOpen] = useState(false);

  useEffect(() => {
    const fetchProductAndReviews = async () => {
      const supabase = createClient();
      
      // 1. Fetch product with flexible matching
      let { data: prodData, error: prodError } = await supabase
        .from('products')
        .select('*')
        .eq('slug', resolvedSlug)
        .maybeSingle();

      if (!prodData && slug !== resolvedSlug) {
        const fallbackRes = await supabase
          .from('products')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();
        prodData = fallbackRes.data;
      }

      if (!prodData) {
        const prefix = slug.split('-')[0];
        const partialRes = await supabase
          .from('products')
          .select('*')
          .ilike('slug', `%${prefix}%`)
          .maybeSingle();
        prodData = partialRes.data;
      }

      if (!prodData) {
        const masterMatch = MASTER_UPSTORE_CATALOG.find(
          p => p.slug.toLowerCase() === slug.toLowerCase() || 
               p.slug.toLowerCase() === resolvedSlug.toLowerCase() ||
               p.slug.toLowerCase().includes(slug.toLowerCase()) ||
               slug.toLowerCase().includes(p.slug.toLowerCase())
        );
        if (masterMatch) {
          prodData = masterMatch;
        }
      }

      if (!prodData && !mapped) {
        if (!initialProduct) {
          setProductError('This product is not available right now.');
          setProductLoading(false);
        }
        return;
      }

      // Fetch active flash deal from DB to resolve correct pricing
      const { data: activeDeals } = await supabase
        .from('products')
        .select('slug, updated_at, flash_deal_duration_hours, is_flash_deal')
        .eq('is_flash_deal', true);
      
      let activeFlashSlug = getActiveFlashDealSlug();
      if (activeDeals && activeDeals.length > 0) {
        const activeManually = activeDeals
          .filter(
            (p: any) =>
              p.updated_at &&
              Date.now() <
                new Date(p.updated_at).getTime() +
                  (p.flash_deal_duration_hours || 12) * 60 * 60 * 1000
          )
          .sort(
            (a: any, b: any) =>
              new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
          )[0];
        if (activeManually) {
          activeFlashSlug = activeManually.slug;
        }
      }

      const normalizedProduct = normalizeProductRecord(prodData, activeFlashSlug);
      setDbProduct(normalizedProduct);
      setProductLoading(false);

      // Fetch active variants
      const { data: variantsData } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', normalizedProduct.id)
        .eq('status', 'active')
        .order('sort_order', { ascending: true });

      if (variantsData) {
        setVariants(variantsData);
        if (variantsData.length > 0) {
          setSelectedVariant(variantsData[0]);
        }
      }

      // 2. Fetch real reviews
      const { data: dbReviews, error: dbRevError } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', normalizedProduct.id)
        .order('created_at', { ascending: false });

      if (!dbRevError && dbReviews) {
        setRealReviews(dbReviews);
      }

      // 2b. Fetch related products (live from Supabase DB only)
      let liveRelated: any[] = [];
      if (normalizedProduct.category) {
        const { data: relData } = await supabase
          .from('products')
          .select('id, slug, name, name_ar, our_price, rating, reviews, icon_name, image_url, brand_color, category, description, description_ar')
          .eq('category', normalizedProduct.category)
          .neq('slug', resolvedSlug)
          .order('reviews', { ascending: false })
          .limit(4);
        if (relData && relData.length > 0) {
          liveRelated = relData;
        }
      }

      // If category has fewer than 4 items, backfill with other live products from database
      if (liveRelated.length < 4) {
        const excludeSlugs = [resolvedSlug, ...liveRelated.map((p) => p.slug)];
        const { data: fallbackData } = await supabase
          .from('products')
          .select('id, slug, name, name_ar, our_price, rating, reviews, icon_name, image_url, brand_color, category, description, description_ar')
          .not('slug', 'in', `(${excludeSlugs.map((s) => `"${s}"`).join(',')})`)
          .order('reviews', { ascending: false })
          .limit(4 - liveRelated.length);
        if (fallbackData && fallbackData.length > 0) {
          liveRelated = [...liveRelated, ...fallbackData];
        }
      }

      setRelatedProducts(liveRelated.map((p: any) => normalizeProductRecord(p, activeFlashSlug)));

      // 3. Fetch user and check purchase status
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      if (currentUser) {
        // Fetch user profile to get role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentUser.id)
          .maybeSingle();

        const hasAdminRole = profile?.role === 'admin' || isAdminIdentity({ id: currentUser.id, email: currentUser.email, role: profile?.role });
        setIsAdmin(hasAdminRole);

        // Check if user purchased this product
        const { data: userOrders } = await supabase
          .from('orders')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('product_id', normalizedProduct.id)
          .in('status', ['completed', 'fulfilled']);
        
        setHasPurchased(!!(userOrders && userOrders.length > 0));

        // Check if they already reviewed it
        const { data: existingReview } = await supabase
          .from('product_reviews')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('product_id', normalizedProduct.id)
          .maybeSingle();

        setUserReview(existingReview);
        if (existingReview) {
          setEditingReviewId(existingReview.id);
          setNewRating(existingReview.rating);
          setNewTitle(existingReview.title || '');
          setNewBody(existingReview.body || '');
          setNewVerified(existingReview.verified);
          setNewUsername(existingReview.username || '');
          setNewHelpfulCount(existingReview.helpful_count || 0);
          setNewDate(existingReview.created_at ? new Date(existingReview.created_at).toISOString().slice(0, 16) : '');
        }
      }
    };

    fetchProductAndReviews();
  }, [resolvedSlug, initialProduct]);

  useEffect(() => {
    if (dbProduct) {
      setAdminRating(Number(dbProduct.rating));
      setAdminReviews(Number(dbProduct.reviews));
      setAdminSold(Number(dbProduct.sold_count));
      setAdminStock(Number(dbProduct.stock));
      setAdminMaxStock(Number(dbProduct.max_stock || 100));
      setAdminName(dbProduct.name || '');
      setAdminOurPrice(Number(dbProduct.our_price || 0));
      setAdminMarketPrice(Number(dbProduct.market_price || 0));
    }
  }, [dbProduct]);

  useEffect(() => {
    if (dbProduct?.id && (dbProduct.delivery_mode === 'zelenka_api' || dbProduct.delivery_mode === 'pre_assigned')) {
      const fetchRealTimeStock = async () => {
        try {
          const res = await fetch(`/api/products/${dbProduct.id}/stock`);
          const data = await res.json();
          if (typeof data.stock === 'number') {
            setAdminStock(data.stock);
            setDbProduct((prev: any) => prev ? { ...prev, stock: data.stock } : null);
          }
        } catch (err) {
          console.error('Error fetching real-time stock:', err);
        }
      };
      fetchRealTimeStock();
    }
  }, [dbProduct?.id]);

  // Listen to live simulated sale events to update stock & review stats in real time
  useEffect(() => {
    const handleLiveSale = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { productId } = customEvent.detail;
      setDbProduct((prev: any) => {
        if (prev && prev.id === productId) {
          return {
            ...prev,
            stock: Math.max(0, prev.stock - 1),
            reviews: prev.reviews + 1,
            sold_count: (prev.sold_count || 0) + 1
          };
        }
        return prev;
      });
      // Also update related products if they are shown
      setRelatedProducts((prevList) =>
        prevList.map((p) => {
          if (p.id === productId) {
            return {
              ...p,
              stock: Math.max(0, p.stock - 1),
              reviews: p.reviews + 1,
            };
          }
          return p;
        })
      );
    };

    window.addEventListener('live-sale', handleLiveSale);
    return () => window.removeEventListener('live-sale', handleLiveSale);
  }, []);

  const product = dbProduct ? {
    ...MOCK_PRODUCT,
    id: dbProduct.id,
    slug: dbProduct.slug,
    name: selectedVariant ? selectedVariant.name : dbProduct.name,
    name_ar: selectedVariant ? (selectedVariant.name_ar || dbProduct.name_ar) : (dbProduct.name_ar || ''),
    description_ar: dbProduct.description_ar || '',
    advantages_ar: dbProduct.advantages_ar || [],
    Icon: ICON_MAP[dbProduct.icon_name] || mapped?.Icon || Zap,
    imageUrl: (selectedVariant && selectedVariant.image_url) ? selectedVariant.image_url : (dbProduct.image_url || ''),
    image_url: (selectedVariant && selectedVariant.image_url) ? selectedVariant.image_url : (dbProduct.image_url || ''),
    category: dbProduct.category,
    marketPrice: selectedVariant 
      ? (typeof selectedVariant.market_price === 'number' && selectedVariant.market_price > 0 ? selectedVariant.market_price : selectedVariant.our_price * 1.5)
      : (typeof dbProduct.market_price === 'number' && dbProduct.market_price > 0 ? dbProduct.market_price : (dbProduct.our_price === 0 ? 0 : (mapped?.marketPrice || 0))),
    ourPrice: selectedVariant ? selectedVariant.our_price : (typeof dbProduct.our_price === 'number' ? dbProduct.our_price : (mapped?.ourPrice || 0)),
    priceEgp: selectedVariant ? Number(selectedVariant.price_egp || 0) : Number(dbProduct.price_egp || 0),
    priceSar: selectedVariant ? Number(selectedVariant.price_sar || 0) : Number(dbProduct.price_sar || 0),
    rating: Number(dbProduct.rating),
    reviewCount: Number(dbProduct.reviews),
    stock: selectedVariant ? Number(selectedVariant.stock) : Number(dbProduct.stock),
    maxStock: selectedVariant ? Number(selectedVariant.max_stock || 100) : Number(dbProduct.max_stock || 100),
    brandColor: dbProduct.brand_color || mapped?.brandColor || DEFAULT_PRODUCT_BRAND_COLOR,
    description: dbProduct.description || '',
    advantages: (dbProduct.advantages && dbProduct.advantages.length > 0) ? dbProduct.advantages : MOCK_PRODUCT.advantages,
    soldCount: dbProduct.sold_count || 0,
    warrantyDuration: dbProduct.warranty_duration || '30 Days',
    deliveryTime: dbProduct.delivery_time || 'Instant',
    subscriptionDuration: selectedVariant ? (selectedVariant.subscription_duration || '') : (dbProduct.subscription_duration || ''),
    seller: dbProduct.seller || null,
  } : null;

  const { name: baseName, duration } = product
    ? translateProduct(product.slug, product.name, (product as any).name_ar)
    : { name: '', duration: '' };

  const effectiveDuration = (selectedVariant && selectedVariant.subscription_duration)
    || (product && product.subscriptionDuration)
    || (dbProduct && dbProduct.subscription_duration)
    || duration
    || (resolvedSlug.includes('18') ? '18 Months' : '')
    || '';

  const durMatch = effectiveDuration ? effectiveDuration.match(/(\d+)/) : (resolvedSlug.includes('18') ? ['18', '18'] : null);
  const rawDurNum = durMatch ? Number(durMatch[1]) : (effectiveDuration && (effectiveDuration.toLowerCase().includes('life') || effectiveDuration.includes('حياة')) ? 999 : (resolvedSlug.includes('18') ? 18 : 1));
  
  let durNumStr = String(rawDurNum);
  let displayUnit = 'M';
  
  if (effectiveDuration) {
    const lowerDur = effectiveDuration.toLowerCase();
    if (lowerDur.includes('year') || lowerDur.includes('سنة') || lowerDur.includes('عام')) {
      durNumStr = String(rawDurNum * 12);
      displayUnit = 'M';
    } else if (lowerDur.includes('life') || lowerDur.includes('حياة')) {
      durNumStr = '∞';
      displayUnit = '';
    } else if (lowerDur.includes('day') || lowerDur.includes('يوم')) {
      durNumStr = String(rawDurNum);
      displayUnit = 'D';
    } else {
      durNumStr = String(rawDurNum);
      displayUnit = 'M';
    }
  } else {
    durNumStr = resolvedSlug.includes('18') ? '18' : '1';
    displayUnit = 'M';
  }

  const getLocalizedUnit = (unit: string, numStr: string) => {
    if (!unit) return '';
    const isArabic = language === 'ar';
    if (unit === 'M') {
      if (isArabic) return 'شهر';
      return numStr === '1' ? 'MONTH' : 'MONTHS';
    }
    if (unit === 'D') {
      if (isArabic) return 'يوم';
      return numStr === '1' ? 'DAY' : 'DAYS';
    }
    return unit;
  };

  const handleAddToCart = async () => {
    if (!dbProduct) return;
    setCartAdding(true);
    await addToCart(dbProduct, quantity, selectedVariant || undefined);
    setCartAdding(false);
    setCartAdded(true);
    useToastStore.getState().success(
      language === 'ar' ? 'تمت إضافة المنتج إلى السلة بنجاح!' : 'Product added to your cart!',
      language === 'ar' && dbProduct.name_ar ? dbProduct.name_ar : dbProduct.name
    );
    setTimeout(() => {
      setCartAdded(false);
    }, 2000);
  };

  const handleBuyNow = () => {
    if (!dbProduct || !product) {
      setCheckoutError(language === 'ar' ? 'هذا المنتج غير متوفر حالياً.' : 'This product is not available right now.');
      return;
    }

    const hasActiveCountdown = useActiveArabOrderStore.getState().hasActiveCountdown();
    const currentActiveOrder = useActiveArabOrderStore.getState().activeOrder;
    if (hasActiveCountdown && currentActiveOrder) {
      useToastStore.getState().error(
        language === 'ar'
          ? `لديك طلب دفع محلي قيد المتابعة والعد التنازلي حالياً (#${currentActiveOrder.orderId}). لا يمكن بدء عملية شراء جديدة حتى إتمام الطلب الحالي أو انتهاء مهلة العداد.`
          : `You have an active local payment order counting down (#${currentActiveOrder.orderId}). Please complete your current order before starting a new one.`,
        language === 'ar' ? 'يوجد طلب قيد المتابعة والعد' : 'Active Order In Progress'
      );
      useActiveArabOrderStore.getState().openModal();
      return;
    }

    if (!user) {
      // Add item to cart store and route to checkout/cart smoothly
      addToCart(dbProduct, quantity, selectedVariant || undefined);
      setShowPaymentModal(true);
      return;
    }

    setShowPaymentModal(true);
  };

  const handleSubmitReview = async () => {
    if (!product || !user) return;
    setReviewSubmitting(true);

    try {
      const supabase = createClient();
      
      // Verify purchase status from database (requires a completed/fulfilled order for this product)
      const { data: userOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .in('status', ['completed', 'fulfilled']);

      const isVerifiedPurchase = !!(userOrders && userOrders.length > 0);

      // If they are not an admin and haven't purchased, block submission
      if (!isVerifiedPurchase && !isAdmin) {
        useToastStore.getState().error(
          language === 'ar' ? 'عذراً، يجب شراء المنتج أولاً واستلامه لتتمكن من إضافة تقييم معتمد.' : 'Sorry, you must purchase this product first to submit a review.',
          language === 'ar' ? 'المراجعات للمشترين فقط' : 'Verified Buyers Only'
        );
        setReviewSubmitting(false);
        return;
      }
      
      if (editingReviewId && !editingReviewId.startsWith('mock-')) {
        // Edit existing DB review
        const updateData: any = {
          rating: newRating,
          title: newTitle,
          body: newBody,
        };

        if (isAdmin) {
          updateData.verified = newVerified;
          updateData.username = newUsername;
          updateData.helpful_count = newHelpfulCount;
          if (newDate) {
            updateData.created_at = new Date(newDate).toISOString();
          }
        } else {
          updateData.verified = isVerifiedPurchase;
        }

        const { data, error } = await supabase
          .from('product_reviews')
          .update(updateData)
          .eq('id', editingReviewId)
          .select()
          .single();

        if (error) throw error;
        useToastStore.getState().success(
          language === 'ar' ? 'تم تحديث التقييم بنجاح!' : 'Review updated successfully!',
          product.name
        );
        setEditingReviewId(null);
        setNewTitle('');
        setNewBody('');
        setNewRating(5);
        setNewVerified(true);
        setNewUsername(user ? (user.user_metadata?.display_name || user.email?.split('@')[0] || 'Customer') : '');
        setNewHelpfulCount(0);
        setNewDate('');
      } else {
        // Create new review (either new, or overriding a mock review)
        const reviewData: any = {
          product_id: product.id,
          user_id: user.id,
          rating: newRating,
          username: isAdmin && newUsername ? newUsername : (user.user_metadata?.display_name || user.email?.split('@')[0] || 'Customer'),
          title: newTitle,
          body: newBody,
          verified: isAdmin ? newVerified : isVerifiedPurchase,
          helpful_count: isAdmin ? newHelpfulCount : 0
        };

        if (isAdmin && newDate) {
          reviewData.created_at = new Date(newDate).toISOString();
        }

        const { data, error } = await supabase
          .from('product_reviews')
          .upsert(reviewData, { onConflict: 'product_id,user_id' })
          .select()
          .single();

        if (error) throw error;
        useToastStore.getState().success(
          language === 'ar' ? 'تم نشر تقييمك بنجاح وشكراً لمشاركتك تجربتك!' : 'Review published successfully! Thank you.',
          product.name
        );
        
        // If we were overriding a mock review, hide it
        if (editingReviewId && editingReviewId.startsWith('mock-')) {
          setHiddenMockReviewIds(prev => [...prev, editingReviewId]);
        }
        setEditingReviewId(null);
        setNewTitle('');
        setNewBody('');
        setNewRating(5);
        setNewVerified(true);
        setNewUsername(user ? (user.user_metadata?.display_name || user.email?.split('@')[0] || 'Customer') : '');
        setNewHelpfulCount(0);
        setNewDate('');
      }
      
      // Refresh reviews
      const { data: dbReviews } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', product.id)
        .order('created_at', { ascending: false });
      
      if (dbReviews) {
        setRealReviews(dbReviews);
      }

      const { data: updatedProduct } = await supabase
        .from('products')
        .select('rating, reviews')
        .eq('id', product.id)
        .single();
      
      if (updatedProduct) {
        setDbProduct((prev: any) => ({
          ...prev,
          rating: Number(updatedProduct.rating),
          reviews: Number(updatedProduct.reviews)
        }));
      }

    } catch (err: any) {
      console.error('Error submitting review:', err);
      useToastStore.getState().error(
        language === 'ar' ? `فشل حفظ التقييم: ${err.message}` : `Failed to save review: ${err.message}`,
        product.name
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!product) return;
    if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا التعليق؟' : 'Are you sure you want to delete this review?')) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('product_reviews')
        .delete()
        .eq('id', reviewId);
      
      if (error) throw error;
      useToastStore.getState().success(
        language === 'ar' ? 'تم حذف التعليق بنجاح!' : 'Review deleted successfully!',
        product.name
      );
      
      // Refresh reviews
      const { data: dbReviews } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', product.id)
        .order('created_at', { ascending: false });
      
      if (dbReviews) {
        setRealReviews(dbReviews);
      }

      // Update product rating and reviews count
      const { data: updatedProduct } = await supabase
        .from('products')
        .select('rating, reviews')
        .eq('id', product.id)
        .single();
      
      if (updatedProduct) {
        setDbProduct((prev: any) => ({
          ...prev,
          rating: Number(updatedProduct.rating),
          reviews: Number(updatedProduct.reviews)
        }));
      }
    } catch (err: any) {
      useToastStore.getState().error(err.message, product.name);
    }
  };

  const handleSaveAdminStats = async () => {
    if (!product) return;
    setAdminSaving(true);
    try {
      const supabase = createClient();
      const priceEgp = Math.ceil(adminOurPrice * 53);
      const priceSar = Math.ceil(adminOurPrice * 4);

      const { error } = await supabase
        .from('products')
        .update({
          name: adminName,
          our_price: adminOurPrice,
          market_price: adminMarketPrice,
          price_egp: priceEgp,
          price_sar: priceSar,
          rating: adminRating,
          reviews: adminReviews,
          sold_count: adminSold,
          stock: adminStock,
          max_stock: adminMaxStock
        })
        .eq('id', product.id);

      if (error) throw error;
      
      alert(language === 'ar' ? 'تم تحديث بيانات المنتج بنجاح!' : 'Product stats updated successfully!');
      
      // Update local state
      setDbProduct((prev: any) => ({
        ...prev,
        name: adminName,
        our_price: adminOurPrice,
        market_price: adminMarketPrice,
        price_egp: priceEgp,
        price_sar: priceSar,
        rating: adminRating,
        reviews: adminReviews,
        sold_count: adminSold,
        stock: adminStock,
        max_stock: adminMaxStock
      }));
      
      setIsAdminPanelOpen(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAdminSaving(false);
    }
  };

  const formatTime = (seconds: number) => {
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const getProductText = (key: string) => {
    const dicts: Record<string, Record<string, string>> = {
      ar: {
        'Home': 'الرئيسية',
        'About This Product': 'حول هذا المنتج',
        'Product Advantages': 'مميزات المنتج',
        'How It Works': 'كيف يعمل',
        'Customer Reviews': 'آراء العملاء',
        'Related Products': 'منتجات ذات صلة',
        'Lowest Price': 'أقل سعر',
        'Flash Sale Ends:': 'ينتهي عرض الفلاش:',
        'Inventory Status': 'حالة المخزون',
        ' Slots left': ' خانة متبقية',
        'Quantity': 'الكمية',
        'Grand Total': 'المجموع الكلي',
        'Add to Cart': 'أضف إلى السلة',
        'Buy Now — Create Order': 'اشترِ الآن — إنشاء الطلب',
        'Secure SSL Checkout • 100% Refund Guarantee': 'دفع آمن بـ SSL • ضمان استرداد 100%',
        'Based on ': 'بناءً على ',
        ' ratings': ' تقييم',
        ' reviews': ' تقييم',
        ' sold': ' تم بيعه',
        'All': 'الكل',
        'Verified Purchase': 'المشتريات الموثقة',
        'Verified Buy': 'شراء موثق',
        'View': 'عرض',
        'Save ': 'وفر ',
        ' instantly': ' فوراً',
        'insanely_fast_delivery': 'تسليم سريع بجنون - عمل خلال 30 ثانية',
        'insanely_fast_delivery_body': 'صدمت بصراحة بمدى سرعة وصول البيانات إلى بريدي الإلكتروني. سجلت الدخول، وكل شيء عمل بشكل مثالي. جودة الصورة 4K مذهلة حقاً. سأقوم بإعادة الشراء كل شهر.',
        'perfect_exactly_as_described': 'ممتاز - بالضبط كما هو موصوف',
        'perfect_exactly_as_described_body': 'الشاشة المخصصة لي كانت مستقرة تماماً طوال الشهر. لا انقطاع ولا تعارض في الجلسات. كما رد دعم UpStore في أقل من 5 دقائق عندما كان لدي سؤال إعداد. أوصي به بشدة.',
        'best_deal_on_net': 'أفضل صفقة على الإنترنت لنتفليكس',
        'best_deal_on_net_body': 'قارنت الأسعار في كل مكان. لا شيء يقترب من هذه القيمة. الحساب يعمل بشكل لا تشوبه شائبة على تلفزيون سامسونج وجهاز ماك بوك في نفس الوقت. صفر مشاكل في 3 أسابيع.',
        'great_value_confusion': 'قيمة رائعة، التباس بسيط في الإعداد',
        'great_value_confusion_body': 'كان تسليم البيانات فورياً كما وعدوا. واجهت التباساً بسيطاً بشأن إعداد الملف الشخصي، لكن الدعم قام بحله في دقائق. جودة البث 4K حقيقية - تم اختبارها بشاشة 4K.',
        'third_purchase_never_disappointed': 'شراء ثالث - لا يخيب الأمل أبداً',
        'third_purchase_never_disappointed_body': 'هذا هو شهري الثالث على التوالي الذي أشتري فيه من UpStore. إدارة الحساب سلسة ونظام التسليم التلقائي لا تشوبه شائبة في كل مرة. قمت بالفعل بالتوصية به لـ 4 أصدقاء.'
      },
      en: {}
    };
    return (mounted && dicts[language] && dicts[language][key]) || key;
  };

  const getLocalizedReviews = () => {
    const formattedReal = (realReviews || []).map((r) => ({
      id: r.id,
      username: r.username || (language === 'ar' ? 'مشترٍ معتمد' : 'Verified Buyer'),
      avatar: r.username ? r.username.slice(0, 2).toUpperCase() : 'UR',
      rating: Number(r.rating) || 5,
      title: r.title || (language === 'ar' ? 'تقييم معتمد' : 'Verified Review'),
      body: r.body || '',
      date: r.created_at ? new Date(r.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : (language === 'ar' ? 'مؤخراً' : 'Recently'),
      verified: r.verified !== false,
      user_id: r.user_id || '',
      helpful_count: typeof r.helpful_count === 'number' ? r.helpful_count : 0,
      created_at: r.created_at,
      isReal: true,
    }));

    const mockList = getMockReviewsForSlug(resolvedSlug, language)
      .map(m => ({
        ...m,
        user_id: '',
        helpful_count: typeof (m as any).helpful_count === 'number' ? (m as any).helpful_count : 0,
        created_at: undefined as string | undefined,
        isReal: false,
      }))
      .filter(m => !hiddenMockReviewIds.includes(m.id.toString()));

    const existingIds = new Set(formattedReal.map(r => String(r.id)));
    const combined = [...formattedReal, ...mockList.filter(m => !existingIds.has(String(m.id)))];
    return combined;
  };

  if (productLoading) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] text-black flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-black border-t-[#FFE600] rounded-full animate-spin mx-auto" />
          <p className="text-xs font-black text-black tracking-widest uppercase animate-pulse">
            Loading live product...
          </p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] text-black flex items-center justify-center px-4">
        <div className="max-w-lg w-full rounded-3xl border-[3px] border-black bg-white p-8 text-center space-y-4 shadow-[6px_6px_0px_0px_#000]">
          <Package className="w-10 h-10 text-rose-500 mx-auto" />
          <h1 className="text-2xl font-black text-black">Product unavailable</h1>
          <p className="text-sm text-neutral-600 font-bold">
            {productError || 'This product does not exist in the live catalog.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/"
              className="px-5 py-3 rounded-2xl bg-[#FFE600] border-2 border-black text-black font-black text-sm shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
            >
              Back to catalog
            </Link>
            <Link
              href="/admin"
              className="px-5 py-3 rounded-2xl bg-neutral-100 border-2 border-black text-black font-black text-sm shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
            >
              Open admin
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getLocalizedAdvantages = (): string[] => {
    const rawAr = (product as any).advantages_ar;
    const rawEn = product.advantages;

    const isGenericAr = Array.isArray(rawAr) && rawAr.length <= 3 && rawAr.some((a: string) => a.includes('تسليم سريع ومضمون') || a.includes('تسليم فوري وتلقائي') || a.includes('حساب أصلي'));
    const isGenericEn = Array.isArray(rawEn) && rawEn.length <= 3 && rawEn.some((a: string) => a.toLowerCase().includes('instant delivery') && a.toLowerCase().includes('verified account'));

    if (language === 'ar' && Array.isArray(rawAr) && rawAr.length > 0 && rawAr[0] !== '' && !isGenericAr) {
      return rawAr;
    }
    if (language === 'en' && Array.isArray(rawEn) && rawEn.length > 0 && rawEn[0] !== '' && !isGenericEn) {
      return rawEn;
    }

    const smart = generateSmartProductAdvantages({
      slug: product.slug,
      name: product.name,
      name_ar: (product as any).name_ar,
      category: product.category,
      description: (product as any).description,
      description_ar: (product as any).description_ar,
      subscription_duration: (product as any).subscription_duration || (product as any).subscriptionDuration,
      warranty_duration: (product as any).warranty_duration || (product as any).warrantyDuration,
    });

    return language === 'ar' ? smart.advantages_ar : smart.advantages;
  };

  const getLocalizedHowItWorks = (): string[] => {
    if (language === 'ar') {
      return [
        'أكمل عملية الشراء عبر بوابة الدفع الآمنة الخاصة بنا',
        'سيظهر الطلب مباشرة داخل لوحة تحكم UpStore في قسم الطلبات',
        'احصل فوراً على بيانات الحساب (الإيميل والباسورد) أو مفتاح التفعيل للمنتج',
        'اتبع إرشادات التفعيل المرفقة لتشغيل المنتج أو الحساب بنجاح والاستمتاع به'
      ];
    }
    return [
      'Complete your purchase through our secure payment gateway',
      'See the order appear in your UpStore dashboard immediately',
      'Instantly retrieve your account credentials or activation code',
      'Follow the provided instructions to activate and enjoy your service'
    ];
  };

  const getLocalizedDescription = (): string => {
    if (language === 'ar' && (product as any).description_ar && (product as any).description_ar.trim().length > 0) {
      return (product as any).description_ar;
    }
    if (product.description && product.description.trim().length > 0) {
      return product.description;
    }
    if (language === 'ar' && resolvedSlug === 'netflix-premium-4k-1-month') {
      return `افتخر بالبث فائق الجودة بدقة 4K Ultra HD مع نتفليكس بريميوم. هذا حساب مشترك خاص يحتوي على شاشة مخصصة لك بالكامل، مما يعني أنك لن تواجه مشكلة الخروج من الحساب بسبب مشاهدة الآخرين. جميع الأفلام والمسلسلات في مكتبة نتفليكس العالمية ستكون متاحة لك فوراً.
      
يدعم التشغيل على أي جهاز تملكه - أجهزة التلفاز الذكية، منصات الألعاب، الهواتف الذكية، الأجهزة اللوحية، والمتصفحات. يتم الحفاظ على ملفات HDR10 وDolby Vision والصوت ثلاثي الأبعاد بأعلى جودتها الأصلية لتمنحك تجربة سينمائية فريدة بجزء بسيط من السعر الأصلي. تتوفر جميع خيارات اللغات والترجمة حتى تشاهد بالطريقة التي تفضلها.

بعد تأكيد الدفع، يتم تسجيل طلبك فوراً داخل لوحة تحكم UpStore الخاصة بك. تظهر بيانات الحساب أو الترخيص هناك بمجرد تنفيذ الطلب وربطه بك. نضمن لك الاشتراك طوال فترة الخدمة مع ضمان استبدال مجاني في حال حدوث أي مشكلة.`;
    }
    return MOCK_PRODUCT.description;
  };

  const getCategoryLabel = (cat: string) => {
    if (cat === 'Subscriptions') return t('cat_Subscriptions');
    if (cat === 'VPNs & Security') return t('cat_VPNs');
    if (cat === 'Software') return t('cat_Software');
    if (cat === 'Accounts') return t('cat_Accounts');
    if (cat === 'Game Keys') return t('cat_GameKeys');
    return cat;
  };

  const savings = product.marketPrice - product.ourPrice;
  const savingsPct = Math.round((savings / product.marketPrice) * 100);
  const stockPct = (product.stock / product.maxStock) * 100;
  const isLowStock = stockPct < 30;

  const allLocalizedReviews = getLocalizedReviews();

  const filteredReviews = allLocalizedReviews.filter((r) => {
    if (activeReviewFilter === 'All') return true;
    if (activeReviewFilter === 'Verified' || activeReviewFilter === 'Verified Purchase') return r.verified;
    const starVal = parseInt(activeReviewFilter);
    return r.rating === starVal;
  });

  const totalRevLen = Math.max(allLocalizedReviews.length, 1);
  const count5 = allLocalizedReviews.filter(r => r.rating === 5).length;
  const count4 = allLocalizedReviews.filter(r => r.rating === 4).length;
  const count3 = allLocalizedReviews.filter(r => r.rating === 3).length;
  const count2 = allLocalizedReviews.filter(r => r.rating <= 2).length;

  const ratingBreakdown = [
    { star: 5, pct: Math.round((Math.max(count5, 1) / totalRevLen) * 100), count: count5 },
    { star: 4, pct: Math.round((count4 / totalRevLen) * 100), count: count4 },
    { star: 3, pct: Math.round((count3 / totalRevLen) * 100), count: count3 },
    { star: 2, pct: Math.round((count2 / totalRevLen) * 100), count: count2 },
  ];

  const tabVariants: any = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, y: -12, transition: { duration: 0.2, ease: 'easeIn' } },
  };

  const renderSellerInfoCard = () => {
    if (!product) return null;

    const seller = (product as any).seller || {
      name: language === 'ar' ? 'متجر UpStore الرسمي' : 'UpStore Official Store',
      type: 'official', // 'official' | 'merchant' | 'unverified'
      verificationStatus: 'verified' // 'verified' | 'pending' | 'unverified'
    };

    const isOfficial = seller.type === 'official';
    const isVerified = seller.verificationStatus === 'verified';

    const getSellerTooltipText = () => {
      if (isOfficial) {
        return language === 'ar'
          ? 'هذا المنتج تم رفعه بواسطة UpStore رسميًا، وتم التحقق منه داخليًا.'
          : 'This product is officially published and internally verified by UpStore.';
      }
      if (isVerified) {
        return language === 'ar'
          ? 'هذا التاجر موثق داخل المنصة بعد مراجعة حسابه وسجله.'
          : 'This merchant is verified on the platform after reviewing their account and track record.';
      }
      return language === 'ar'
        ? 'هذا التاجر قيد التحقق حالياً.'
        : 'This merchant is currently undergoing verification.';
    };

    return (
      <div className="bg-white border-2 border-black rounded-2xl p-4 space-y-3 relative overflow-visible select-none text-start shadow-[3px_3px_0px_0px_#000]">
        {/* Card Header */}
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-black text-black uppercase tracking-wider">
            {language === 'ar' ? 'البائع ومعلومات الثقة' : 'Seller Trust & Info'}
          </span>
          
          {/* Microcopy info icon */}
          <div className="relative group">
            <HelpCircle className="w-4 h-4 text-black hover:opacity-75 transition-colors cursor-help stroke-[2.5]" />
            <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-48 bg-white border-2 border-black rounded-xl p-2.5 text-[11px] text-black font-bold leading-normal shadow-[4px_4px_0px_0px_#000] z-30 pointer-events-none">
              {language === 'ar'
                ? 'نعرض معلومات البائع لمساعدتك على الشراء بثقة ومعرفة مصدر المنتج.'
                : 'We display seller information to help you buy with confidence and know the product source.'}
            </div>
          </div>
        </div>

        {/* Seller Profile Block */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#FFE600] border-2 border-black flex items-center justify-center font-black text-black text-xs shadow-[1.5px_1.5px_0px_0px_#000]">
            <Store className="w-4 h-4 text-black stroke-[2.5]" />
          </div>
          {/* Details */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-black text-black truncate max-w-[150px]">
                {seller.name}
              </span>
              {(isOfficial || isVerified) && (
                <div className="relative inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => setSellerTooltipOpen(!sellerTooltipOpen)}
                    className="focus:outline-none cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                    title={language === 'ar' ? 'تفاصيل التوثيق' : 'Verification Details'}
                  >
                    <svg 
                      viewBox="0 0 24 24" 
                      className="w-4 h-4 shrink-0"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path 
                        d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" 
                        fill="#06D6A0"
                        stroke="#000000"
                        strokeWidth="1.5"
                      />
                      <path 
                        d="m9 12 2 2 4-4" 
                        stroke="#000000" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  {/* Tooltip Popup */}
                  <AnimatePresence>
                    {sellerTooltipOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-30 cursor-default" 
                          onClick={() => setSellerTooltipOpen(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 5 }}
                          transition={{ duration: 0.15 }}
                          className={`absolute ${language === 'ar' ? 'right-0' : 'left-0'} top-full mt-2 w-64 bg-white border-2 border-black rounded-xl p-3 shadow-[5px_5px_0px_0px_#000] z-40 text-start`}
                        >
                          <div className="flex justify-between items-start gap-2 mb-1.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-black">
                              {isOfficial ? (language === 'ar' ? 'ضمان وثقة كاملة' : 'Absolute Trust Verified') : (language === 'ar' ? 'تحقق من الهوية والتاجر' : 'Merchant Vetting Details')}
                            </span>
                            <button 
                              onClick={() => setSellerTooltipOpen(false)}
                              className="text-black hover:opacity-60 text-xs cursor-pointer p-0.5"
                            >
                              <X className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                          </div>
                          <p className="text-xs text-neutral-800 leading-relaxed font-bold">
                            {getSellerTooltipText()}
                          </p>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Microcopy beneath seller info */}
        <p className="text-[10px] text-neutral-700 font-bold leading-normal pt-2 border-t-2 border-black">
          {language === 'ar'
            ? 'شريك بيع معتمد لضمان استلام طلبك بأمان ودون انقطاع.'
            : 'Accredited seller partner to ensure your order is delivered safely without interruption.'}
        </p>
      </div>
    );
  };

  const renderCheckoutPanel = () => (
    <div className="bg-white border-[2.5px] border-black rounded-3xl p-6 space-y-5 shadow-[6px_6px_0px_0px_#000] text-black">
      <div>
        <div className="flex justify-between items-center flex-wrap gap-2">
          <span className="text-xs font-black text-black uppercase tracking-wider bg-[#FFE600] border-2 border-black px-3 py-1 rounded-xl shadow-[2px_2px_0px_0px_#000] select-none">
            {getCategoryLabel(product.category)}
          </span>
          {isAdmin && (
            <button
              onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-black text-black bg-[#4CC9F0] hover:bg-[#38b2d8] border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_#000] transition-all cursor-pointer select-none uppercase tracking-wider active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <Sliders className="w-3 h-3 stroke-[2.5]" />
              {language === 'ar' ? 'التحكم السريع' : 'Quick Admin'}
            </button>
          )}
        </div>

        {/* Collapsible Admin Panel */}
        <AnimatePresence>
          {isAdminPanelOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-[#FFFDF9] border-2 border-black rounded-2xl p-4 mt-3 space-y-3 text-start shadow-[3px_3px_0px_0px_#000]">
                <h3 className="text-xs font-black text-black uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 stroke-[2.5]" />
                  {language === 'ar' ? 'تعديل السريع للإحصائيات' : 'Quick Stats Edit'}
                </h3>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5 col-span-2">
                    <label className="block text-[10px] text-black uppercase font-black">{language === 'ar' ? 'اسم المنتج' : 'Product Name'}</label>
                    <input 
                      type="text" 
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border-2 border-black rounded-lg text-xs font-bold text-black outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="block text-[10px] text-black uppercase font-black">{language === 'ar' ? 'سعرنا (USD)' : 'Our Price (USD)'}</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={adminOurPrice}
                      onChange={(e) => setAdminOurPrice(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border-2 border-black rounded-lg text-xs font-bold text-black outline-none shadow-[1.5px_1.5px_0px_0px_#000] font-mono"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="block text-[10px] text-black uppercase font-black">{language === 'ar' ? 'سعر السوق (USD)' : 'Market Price (USD)'}</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={adminMarketPrice}
                      onChange={(e) => setAdminMarketPrice(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border-2 border-black rounded-lg text-xs font-bold text-black outline-none shadow-[1.5px_1.5px_0px_0px_#000] font-mono"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="block text-[10px] text-black uppercase font-black">{language === 'ar' ? 'التقييم' : 'Rating'}</label>
                    <input 
                      type="number" 
                      step="0.1"
                      min="1.0"
                      max="5.0"
                      value={adminRating}
                      onChange={(e) => setAdminRating(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border-2 border-black rounded-lg text-xs font-bold text-black outline-none shadow-[1.5px_1.5px_0px_0px_#000] font-mono"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="block text-[10px] text-black uppercase font-black">{language === 'ar' ? 'التعليقات' : 'Reviews'}</label>
                    <input 
                      type="number" 
                      value={adminReviews}
                      onChange={(e) => setAdminReviews(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border-2 border-black rounded-lg text-xs font-bold text-black outline-none shadow-[1.5px_1.5px_0px_0px_#000] font-mono"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="block text-[10px] text-black uppercase font-black">{language === 'ar' ? 'المبيعات' : 'Sold'}</label>
                    <input 
                      type="number" 
                      value={adminSold}
                      onChange={(e) => setAdminSold(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border-2 border-black rounded-lg text-xs font-bold text-black outline-none shadow-[1.5px_1.5px_0px_0px_#000] font-mono"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="block text-[10px] text-black uppercase font-black">{language === 'ar' ? 'المخزون' : 'Stock'}</label>
                    <input 
                      type="number" 
                      value={adminStock}
                      onChange={(e) => setAdminStock(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border-2 border-black rounded-lg text-xs font-bold text-black outline-none shadow-[1.5px_1.5px_0px_0px_#000] font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setIsAdminPanelOpen(false)}
                    className="px-3 py-1 bg-white border-2 border-black text-black rounded-lg text-xs font-black shadow-[1.5px_1.5px_0px_0px_#000] cursor-pointer"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleSaveAdminStats}
                    disabled={adminSaving}
                    className="px-3 py-1 bg-[#06D6A0] border-2 border-black text-black rounded-lg text-xs font-black shadow-[1.5px_1.5px_0px_0px_#000] cursor-pointer"
                  >
                    {adminSaving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ' : 'Save')}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight mt-3">
          {baseName}
        </h1>
        <div className="flex items-center gap-2 select-none mt-2 flex-wrap text-xs">
          {/* Clean Star Rating and Score */}
          <div className="inline-flex items-center gap-1.5" dir="ltr">
            <StarRating rating={product.rating} size="sm" />
            <span className="font-black text-black font-mono text-xs">
              {product.rating.toFixed(1)}
            </span>
            <span className="text-[11px] text-neutral-600 font-bold font-mono">/ 5.0</span>
          </div>

          <span className="text-black font-black">•</span>

          {/* Review Count */}
          <span className="text-neutral-700 font-bold">
            <span className="font-mono text-black font-black">{product.reviewCount.toLocaleString()}</span>{' '}
            {language === 'ar' ? 'تقييم موثق' : 'verified reviews'}
          </span>
        </div>
      </div>

      {variants.length > 0 && (
        <div className="space-y-3 pt-1 text-start">
          <label className="text-xs font-black text-black uppercase tracking-wider flex items-center gap-1.5 select-none">
            <Package className="w-4 h-4 stroke-[2.5]" />
            {language === 'ar' ? 'اختر الباقة المناسبة' : 'Choose your plan'}
          </label>
          <div className="grid grid-cols-1 gap-2.5">
            {variants.map((v) => {
              const isSelected = selectedVariant?.id === v.id;
              const variantPrice = country === 'EG' 
                ? `${(v.price_egp || 0).toLocaleString()} EGP` 
                : country === 'SA' 
                  ? `${(v.price_sar || 0).toLocaleString()} SAR` 
                  : `$${(v.our_price || 0).toFixed(2)}`;

              return (
                <button
                  key={v.id}
                  onClick={() => setSelectedVariant(v)}
                  className={`w-full text-start p-3 rounded-2xl border-2 border-black transition-all duration-150 flex items-center justify-between gap-3 relative cursor-pointer active:translate-x-0.5 active:translate-y-0.5 ${
                    isSelected
                      ? 'bg-[#FFE600] shadow-[3.5px_3.5px_0px_0px_#000]'
                      : 'bg-white hover:bg-neutral-50 shadow-[2px_2px_0px_0px_#000]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-black flex items-center justify-center flex-shrink-0 bg-white shadow-[1px_1px_0px_0px_#000]">
                      <ProductImage 
                        product={{
                          ...product,
                          name: v.name,
                          name_ar: v.name_ar,
                          image_url: v.image_url || product?.imageUrl,
                          imageUrl: v.image_url || product?.imageUrl,
                        }} 
                        alt={v.name} 
                        size="sm" 
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black truncate text-black">
                        {language === 'ar' ? (v.name_ar || v.name) : v.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {v.subscription_duration && (
                          <span className="text-[9px] font-black text-black bg-white border border-black px-1.5 py-0.2 rounded font-mono">
                            {v.subscription_duration}
                          </span>
                        )}
                        {v.quality && (
                          <span className="text-[9px] font-black text-black bg-white border border-black px-1.5 py-0.2 rounded font-mono">
                            {v.quality}
                          </span>
                        )}
                        {v.stock === 0 && (
                          <span className="text-[9px] font-black text-black bg-[#FF70A6] border border-black px-1.5 py-0.2 rounded">
                            {language === 'ar' ? 'نفذت' : 'Out of Stock'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-black text-black font-mono">{variantPrice}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-[#FFFDF9] border-2 border-black rounded-2xl p-4 flex flex-col justify-center shadow-[3px_3px_0px_0px_#000]">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs text-neutral-600 line-through font-mono font-bold">{formatPrice(product.marketPrice)}</span>
          {savingsPct > 0 && (
            <span className="text-[10px] font-black text-black bg-[#FFE600] border border-black px-2 py-0.5 rounded-md font-mono shadow-[1px_1px_0px_0px_#000]">
              {language === 'ar' ? `وفر ${savingsPct}%` : `Save ${savingsPct}%`}
            </span>
          )}
        </div>
        <div className="text-3xl sm:text-4xl font-black text-black leading-none tracking-tight font-mono select-all">
          {formatPrice(product.ourPrice)}
        </div>

        {savings > 0 && (
          <div className="text-xs text-neutral-800 font-bold flex items-center gap-1.5 mt-2.5">
            <span>{language === 'ar' ? 'إجمالي التوفير:' : 'Total Savings:'}</span>
            <span className="text-black font-black font-mono bg-[#06D6A0] px-1.5 py-0.5 rounded border border-black" dir="ltr">{formatPrice(savings)}</span>
          </div>
        )}
      </div>

      <div className="space-y-2 select-none">
        <div className="flex justify-between items-center text-xs font-black">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${product.stock > 3 ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-ping'}`} />
            <span className="text-black font-bold">
              {product.stock >= 10
                ? (language === 'ar' ? `متوفر في المخزون (${product.stock} خانة جاهزة مع ضمان كامل المدة)` : `In Stock (${product.stock} Available • Full Warranty)`)
                : product.stock > 3
                ? (language === 'ar' ? `متبقي ${product.stock} خانات فقط - دفع عالمي وضمان كامل` : `${product.stock} slots left - Global Pay & Warranty`)
                : (language === 'ar' ? `كمية محدودة جداً (${product.stock} متبقية)` : `Limited Stock (${product.stock} left)`)}
            </span>
          </div>
        </div>
        <div className="h-3.5 bg-neutral-100 border-2 border-black rounded-full overflow-hidden shadow-[1.5px_1.5px_0px_0px_#000] p-0.5">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              product.stock >= 10
                ? 'bg-gradient-to-r from-emerald-400 to-teal-400'
                : product.stock > 3
                ? 'bg-gradient-to-r from-amber-400 to-yellow-400'
                : 'bg-gradient-to-r from-rose-400 to-pink-500'
            }`}
            style={{ width: `${product.stock >= 10 ? 96 : product.stock > 3 ? 70 : 35}%` }}
          />
        </div>
      </div>

      <div className="space-y-2 select-none">
        <label className="text-xs font-black text-black uppercase tracking-wider">{getProductText('Quantity')}</label>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center bg-white border-2 border-black rounded-xl overflow-hidden p-1 shadow-[2px_2px_0px_0px_#000]">
            <button 
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-lg hover:bg-[#FFE600] active:scale-90 transition-all text-sm font-black flex items-center justify-center text-black cursor-pointer"
            >
              −
            </button>
            <input 
              type="number" 
              min={1}
              max={10}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-10 text-center bg-transparent border-none text-black text-sm font-black outline-none"
            />
            <button 
              onClick={() => setQuantity(q => Math.min(10, q + 1))}
              className="w-8 h-8 rounded-lg hover:bg-[#FFE600] active:scale-90 transition-all text-sm font-black flex items-center justify-center text-black cursor-pointer"
            >
              +
            </button>
          </div>
          <div className="text-end">
            <span className="text-[10px] text-neutral-600 font-bold block">{getProductText('Grand Total')}</span>
            <span className="text-lg font-black text-black font-mono">
              {formatPrice(product.ourPrice * quantity)}
            </span>
          </div>
        </div>
      </div>

      {renderSellerInfoCard()}

      <div className="flex flex-col gap-3 select-none pt-2">
        {checkoutError && (
          <div className="p-3.5 rounded-xl bg-rose-100 border-2 border-black text-black text-xs font-bold flex gap-2 items-start shadow-[2px_2px_0px_0px_#000]">
            <span className="flex-1 text-start">{checkoutError}</span>
            <button 
              onClick={() => setCheckoutError(null)}
              className="text-black hover:opacity-60 cursor-pointer p-0.5"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        )}
        <button 
          onClick={handleAddToCart}
          disabled={cartAdding || cartAdded || product.stock === 0}
          className={`w-full py-3.5 border-2 border-black font-black text-sm rounded-2xl transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-[3.5px_3.5px_0px_0px_#000] hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none ${
            cartAdded 
              ? 'bg-[#FFE600] text-black' 
              : 'bg-white hover:bg-neutral-100 text-black'
          }`}
        >
          {cartAdding ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {language === 'ar' ? 'جاري الإضافة...' : 'Adding...'}
            </span>
          ) : cartAdded ? (
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 stroke-[3]" /> {language === 'ar' ? 'تمت الإضافة للسلة' : 'Added to Cart'}</span>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4 stroke-[2.5]" /> {getProductText('Add to Cart')}
            </>
          )}
        </button>
        <button 
          onClick={handleBuyNow}
          disabled={purchaseLoading || product.stock === 0}
          className="w-full py-3.5 bg-[#06D6A0] hover:bg-[#05b385] border-2 border-black text-black font-black text-sm rounded-2xl shadow-[4.5px_4.5px_0px_0px_#000] hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {purchaseLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {language === 'ar' ? 'جاري الدفع...' : 'Processing...'}
            </span>
          ) : product.stock === 0 ? (
            <span>{language === 'ar' ? 'نفذت الكمية' : 'Out of Stock'}</span>
          ) : (
            <>
              <Zap className="w-4 h-4" /> 
              <span>{getProductText('Buy Now — Create Order')}</span>
            </>
          )}
        </button>
      </div>

      {/* ── Visual Trust Badges Section ── */}
      <div className="pt-4 border-t-2 border-black space-y-3.5 text-start select-none">
        <h4 className="text-xs font-black text-black uppercase tracking-wider">
          {language === 'ar' ? 'معايير الأمان والضمان' : 'Trust & Protection Standards'}
        </h4>
        
        <div className="space-y-3">
          {/* Warranty */}
          <div className="flex gap-2.5 items-start">
            <div className="w-8 h-8 rounded-lg bg-[#FFE600] border-2 border-black flex items-center justify-center text-black flex-shrink-0 mt-0.5 shadow-[1px_1px_0px_0px_#000]">
              <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="text-xs font-black text-black">
                {language === 'ar' ? `ضمان كامل لمدة ${product.warrantyDuration}` : `${product.warrantyDuration} Full Warranty`}
              </div>
              <div className="text-[11px] text-neutral-800 font-bold leading-normal">
                {language === 'ar' 
                  ? 'حماية كاملة وتعويض فوري طوال فترة الضمان ضد أي خلل.' 
                  : 'Complete coverage and immediate replacement for any issues during the warranty period.'}
              </div>
            </div>
          </div>

          {/* Delivery */}
          <div className="flex gap-2.5 items-start">
            <div className="w-8 h-8 rounded-lg bg-[#06D6A0] border-2 border-black flex items-center justify-center text-black flex-shrink-0 mt-0.5 shadow-[1px_1px_0px_0px_#000]">
              <Zap className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="text-xs font-black text-black">
                {language === 'ar' ? 'تسليم فوري وآلي (0-30 ثانية)' : 'Instant Automated Delivery (0-30s)'}
              </div>
              <div className="text-[11px] text-neutral-800 font-bold leading-normal">
                {language === 'ar' 
                  ? 'يتم إصدار الحساب والتراخيص الرقمية مباشرة في لوحة تحكمك فور الدفع.' 
                  : 'Licenses and account credentials are automatically delivered directly to your dashboard.'}
              </div>
            </div>
          </div>

          {/* Replacement Policy */}
          <div className="flex gap-2.5 items-start">
            <div className="w-8 h-8 rounded-lg bg-[#FF70A6] border-2 border-black flex items-center justify-center text-black flex-shrink-0 mt-0.5 shadow-[1px_1px_0px_0px_#000]">
              <RefreshCw className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="text-xs font-black text-black">
                {language === 'ar' ? 'سياسة استبدال مرنة وسهلة' : 'Easy Replacement Policy'}
              </div>
              <div className="text-[11px] text-neutral-800 font-bold leading-normal">
                {language === 'ar' 
                  ? 'إن واجهت أي مشكلة، فريق الدعم الفني متواجد لاستبدال الحساب فوراً.' 
                  : 'If you encounter any issues, support is online to troubleshoot or swap the license.'}
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="flex gap-2.5 items-start">
            <div className="w-8 h-8 rounded-lg bg-[#4CC9F0] border-2 border-black flex items-center justify-center text-black flex-shrink-0 mt-0.5 shadow-[1px_1px_0px_0px_#000]">
              <Lock className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="text-xs font-black text-black">
                {language === 'ar' ? 'تشفير دفع SSL آمن 100%' : '100% Secure SSL Payment'}
              </div>
              <div className="text-[11px] text-neutral-800 font-bold leading-normal">
                {language === 'ar' 
                  ? 'تتم معالجة جميع المدفوعات من خلال بوابات مشفرة وآمنة بالكامل.' 
                  : 'All transaction details are encrypted and processed through fully certified payment gateways.'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center text-xs font-black text-neutral-800 select-none pt-3 border-t-2 border-black flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-4 h-4 text-emerald-600 stroke-[2.5] flex-shrink-0" />
        <span>{getProductText('Secure SSL Checkout • 100% Refund Guarantee')}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-black pb-28 sm:pb-16 lg:pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ── Breadcrumb ── */}
        <nav className="py-4 flex items-center gap-2 text-xs sm:text-sm text-neutral-700 font-bold select-none">
          <Link href="/" className="hover:text-black underline transition-colors">{getProductText('Home')}</Link>
          <span className="text-black font-black">{language === 'ar' ? '‹' : '›'}</span>
          <span className="hover:text-black transition-colors">{getCategoryLabel(product.category)}</span>
          <span className="text-black font-black">{language === 'ar' ? '‹' : '›'}</span>
          <span className="text-black font-black line-clamp-1">{baseName}</span>
        </nav>

        {/* ── Main Layout Split ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ════════════════ LEFT CONTAINER (8 cols) ════════════════ */}
          <div className="lg:col-span-8 space-y-5">

            {/* Mobile Header: Product Name + Rating + Price */}
            <div className="block lg:hidden bg-white border-2 border-black rounded-2xl p-4 shadow-[3.5px_3.5px_0px_0px_#000] select-none text-start">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-[10px] font-black text-black bg-[#FFE600] border border-black px-2 py-0.5 rounded-md">
                  {getCategoryLabel(product.category)}
                </span>
                <div className="flex items-center gap-1 text-black font-black text-xs font-mono" dir="ltr">
                  <StarRating rating={product.rating} size="sm" />
                  <span>{product.rating.toFixed(1)}</span>
                </div>
                <span className="text-neutral-600 text-xs font-bold font-mono">
                  ({product.reviewCount.toLocaleString()} {language === 'ar' ? 'تقييم' : 'reviews'})
                </span>
              </div>
              <h1 className="text-lg font-black text-black tracking-tight leading-snug">
                {baseName}
              </h1>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-black font-mono">
                  {formatPrice(product.ourPrice)}
                </span>
                {product.marketPrice > product.ourPrice && (
                  <span className="text-xs text-neutral-500 line-through font-mono">
                    {formatPrice(product.marketPrice)}
                  </span>
                )}
                {savingsPct > 0 && (
                  <span className="text-[10px] font-black text-black bg-[#06D6A0] border border-black px-1.5 py-0.5 rounded font-mono">
                    {language === 'ar' ? `وفر ${savingsPct}%` : `Save ${savingsPct}%`}
                  </span>
                )}
              </div>
            </div>
            
            {/* Product Image Hero Showcase */}
            <div className="bg-white border-[2.5px] border-black rounded-3xl p-4 sm:p-8 flex flex-col items-center select-none relative shadow-[6px_6px_0px_0px_#000]">
              <div className="w-full aspect-[16/10] sm:aspect-[16/9] md:aspect-[16/10] max-h-[380px] bg-gradient-to-b from-white to-[#F9F7F2] border-2 border-black rounded-2xl flex items-center justify-center relative transition-all duration-500 overflow-hidden shadow-[3px_3px_0px_0px_#000] group">
                
                {/* 1. Smart Animated Ambient Saturated Breathing Lighting */}
                <ProductAmbientGlow 
                  product={{
                    ...product,
                    image_url: (selectedVariant && selectedVariant.image_url) ? selectedVariant.image_url : (dbProduct?.image_url || product.imageUrl || product.image_url),
                    imageUrl: (selectedVariant && selectedVariant.image_url) ? selectedVariant.image_url : (dbProduct?.image_url || product.imageUrl || product.image_url),
                    name: selectedVariant ? selectedVariant.name : product.name,
                    name_ar: selectedVariant ? selectedVariant.name_ar : (product as any).name_ar,
                    slug: product.slug,
                  }} 
                  size="hero" 
                />

                {durNumStr && (
                  <div className={`absolute ${mounted && language === 'ar' ? 'left-5 items-start' : 'right-5 items-end'} bottom-3 flex flex-col justify-end leading-none pointer-events-none select-none z-[2]`}>
                    <span className="text-[7.0rem] font-black font-mono text-black/15 leading-none select-none tracking-tighter">
                      {durNumStr}
                    </span>
                    <span className={`font-sans text-black/20 leading-none select-none uppercase ${mounted && language === 'ar' ? 'text-[1.8rem] font-black mt-1' : 'text-[1.4rem] font-extrabold tracking-wider mt-0.5'}`}>
                      {mounted ? getLocalizedUnit(displayUnit, durNumStr) : displayUnit}
                    </span>
                  </div>
                )}
                
                {/* Foreground Floating Product Image */}
                <motion.div 
                  animate={{ y: [0, -8, 0] }}
                  transition={{
                    duration: 4.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="relative w-full h-full flex items-center justify-center z-[10] filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.22)] transition-transform duration-300 select-none px-6 group-hover:scale-105"
                >
                  <ProductImage
                    product={product}
                    alt={product.name}
                    size="hero"
                    className="w-full h-full max-h-[88%]"
                  />
                </motion.div>
              </div>

              <div className="flex gap-2 mt-5">
                {[0, 1, 2].map((dot) => (
                  <span 
                    key={dot} 
                    className={`h-2.5 rounded-full border border-black transition-all duration-300 ${dot === 0 ? 'w-8 bg-[#FFE600] shadow-[1px_1px_0px_0px_#000]' : 'w-2.5 bg-neutral-200'}`} 
                  />
                ))}
              </div>
            </div>

            {/* ── Key Specs Grid ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {[
                { 
                  icon: Zap, 
                  label: language === 'ar' ? 'سرعة التسليم' : 'Delivery', 
                  value: formatLocalizedDeliveryTime(product.deliveryTime, language === 'ar' ? 'ar' : 'en'), 
                  bg: 'bg-[#FFE600]' 
                },
                { 
                  icon: ShieldCheck, 
                  label: language === 'ar' ? 'فترة الضمان' : 'Warranty', 
                  value: formatLocalizedWarranty(product.warrantyDuration, product.subscriptionDuration, language === 'ar' ? 'ar' : 'en'), 
                  bg: 'bg-[#4CC9F0]' 
                },
                { 
                  icon: Star, 
                  label: language === 'ar' ? 'تقييم العملاء' : 'Rating', 
                  value: `${product.rating.toFixed(1)} / 5.0`, 
                  bg: 'bg-[#FF70A6]' 
                },
                { 
                  icon: Package, 
                  label: language === 'ar' ? 'مدة الاشتراك' : 'Duration', 
                  value: formatLocalizedDuration(product.subscriptionDuration, language === 'ar' ? 'ar' : 'en'), 
                  bg: 'bg-[#06D6A0]' 
                },
              ].map((spec, idx) => (
                <div key={idx} className="bg-white border-2 border-black rounded-2xl p-3.5 text-center select-none shadow-[3.5px_3.5px_0px_0px_#000] hover:-translate-y-0.5 transition-all">
                  <div className={`w-8 h-8 rounded-xl ${spec.bg} border-2 border-black flex items-center justify-center mx-auto mb-2 shadow-[1.5px_1.5px_0px_0px_#000]`}>
                    <spec.icon className="w-4 h-4 text-black stroke-[2.5]" />
                  </div>
                  <div className="text-xs font-black text-black font-mono" dir="ltr">{spec.value}</div>
                  <div className="text-[10px] text-neutral-700 font-black mt-0.5">{spec.label}</div>
                </div>
              ))}
            </div>

            {/* ── Mobile Checkout Panel ── */}
            <div className="block lg:hidden mb-6">
              {renderCheckoutPanel()}
            </div>

            {/* ── Tabbed Content Layout ── */}
            <div className="space-y-5">
              <div className="flex p-1.5 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] gap-2 select-none">
                {(['overview', 'features', 'reviews'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
                      activeTab === tab
                        ? 'bg-[#FFE600] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                        : 'text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    {tab === 'overview' ? getProductText('About This Product') : 
                     tab === 'features' ? getProductText('Product Advantages') :
                     getProductText('Customer Reviews')}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                  <motion.div
                    key="overview"
                    variants={tabVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <div className="bg-white border-2 border-black rounded-3xl p-6 sm:p-8 shadow-[5px_5px_0px_0px_#000]">
                      <h2 className="text-black text-xl font-black uppercase tracking-wider mb-6">
                        {getProductText('About This Product')}
                      </h2>
                      
                      <ProductDescriptionRenderer
                        content={getLocalizedDescription() as string}
                        isArabic={language === 'ar'}
                      />
                    </div>
                  </motion.div>
                )}

                {activeTab === 'features' && (
                  <motion.div
                    key="features"
                    variants={tabVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="space-y-6"
                  >
                    <div className="bg-white border-2 border-black rounded-3xl p-6 sm:p-8 shadow-[5px_5px_0px_0px_#000]">
                      <h2 className="text-black text-xl font-black uppercase tracking-wider border-b-2 border-black pb-4 mb-5">
                        {getProductText('Product Advantages')}
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {getLocalizedAdvantages().map((adv, idx) => (
                          <div key={idx} className="flex items-center gap-3 bg-[#FFFDF9] border-2 border-black p-4 rounded-2xl shadow-[2.5px_2.5px_0px_0px_#000]">
                            <div className="w-6 h-6 rounded-lg bg-[#06D6A0] border border-black flex items-center justify-center flex-shrink-0">
                              <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                            </div>
                            <span className="text-sm font-black text-black">{adv}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white border-2 border-black rounded-3xl p-6 sm:p-8 shadow-[5px_5px_0px_0px_#000]">
                      <h2 className="text-black text-xl font-black uppercase tracking-wider border-b-2 border-black pb-4 mb-6 select-none">
                        {getProductText('How It Works')}
                      </h2>
                      <div className="relative ps-6 space-y-6 select-none">
                        <div className="absolute start-[19px] top-4 bottom-4 w-1 bg-black pointer-events-none" />
                        {getLocalizedHowItWorks().map((step, idx) => (
                          <div key={idx} className="flex gap-4 relative items-start">
                            <div className="w-10 h-10 rounded-xl bg-[#FFE600] border-2 border-black flex items-center justify-center text-sm font-black flex-shrink-0 z-10 text-black shadow-[2px_2px_0px_0px_#000]">
                              {idx + 1}
                            </div>
                            <div className="pt-2">
                              <p className="text-sm font-black text-black">{step}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'reviews' && (
                  <motion.div
                    key="reviews"
                    variants={tabVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <div className="bg-white border-2 border-black rounded-3xl p-6 sm:p-8 shadow-[5px_5px_0px_0px_#000]">
                      <h2 className="text-black text-xl font-black uppercase tracking-wider mb-8 border-b-2 border-black pb-4">
                        {getProductText('Customer Reviews')}
                      </h2>

                      <div className="flex flex-col md:flex-row gap-8 items-start mb-8 select-none">
                        <div className="flex items-center gap-4 bg-[#FFFDF9] border-2 border-black p-6 rounded-2xl min-w-[200px] justify-center md:justify-start shadow-[3px_3px_0px_0px_#000]">
                          <div className="text-center">
                            <div className="text-5xl font-black text-black leading-none mb-2 font-mono">{product.rating.toFixed(1)}</div>
                            <div className="flex justify-center"><StarRating rating={product.rating} /></div>
                            <div className="text-xs text-neutral-700 font-bold mt-2">{getProductText('Based on ')}<span className="font-mono font-black text-black">{product.reviewCount.toLocaleString()}</span>{getProductText(' ratings')}</div>
                          </div>
                        </div>

                        <div className="flex-1 space-y-2.5 w-full">
                          {ratingBreakdown.map((row) => (
                            <div key={row.star} className="flex items-center gap-3 text-xs font-bold">
                              <span className="text-black w-8 font-mono flex items-center gap-1">
                                {row.star} <Star className="w-3 h-3 fill-amber-400 text-black stroke-[1.5]" />
                              </span>
                              <div className="flex-1 h-3 bg-white border border-black rounded-full overflow-hidden shadow-[1px_1px_0px_0px_#000]">
                                <div className="h-full bg-[#FFE600]" style={{ width: `${row.pct}%` }} />
                              </div>
                              <span className="text-neutral-700 w-12 text-end font-mono font-bold">{row.pct}%</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-6 select-none border-t-2 border-black pt-6">
                        {['All', '5 Stars', '4 Stars', '3 Stars', 'Verified Purchase'].map((chip) => {
                          const active = activeReviewFilter === chip;
                          const displayChip = chip === 'Verified Purchase' 
                            ? getProductText('Verified Purchase') 
                            : chip === 'All' 
                            ? getProductText('All') 
                            : chip === '5 Stars'
                            ? (language === 'ar' ? '5 نجوم' : '5 Stars')
                            : chip === '4 Stars'
                            ? (language === 'ar' ? '4 نجوم' : '4 Stars')
                            : (language === 'ar' ? '3 نجوم' : '3 Stars');
                          return (
                            <button
                              key={chip}
                              onClick={() => setActiveReviewFilter(chip)}
                              className={`px-3.5 py-2 rounded-xl text-xs font-black border-2 border-black transition-all cursor-pointer shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 ${
                                active 
                                  ? 'bg-[#FFE600] text-black shadow-[3px_3px_0px_0px_#000]' 
                                  : 'bg-white text-black hover:bg-neutral-100'
                              }`}
                            >
                              {displayChip}
                          </button>
                          );
                        })}
                      </div>

                      {/* Review Submission Form */}
                      {(hasPurchased || isAdmin) && user && (
                        <div id="review-form-section" className="bg-[#FFFDF9] border-2 border-black rounded-2xl p-5 mb-8 space-y-4 text-start shadow-[4px_4px_0px_0px_#000]">
                          <h3 className="text-sm font-black text-black flex items-center gap-2">
                            <Star className="w-4 h-4 text-black fill-[#FFE600] stroke-[2]" />
                            {editingReviewId 
                              ? (language === 'ar' ? 'تعديل التقييم والتعليق' : 'Edit Review & Rating')
                              : (language === 'ar' ? 'إضافة تقييمك ورأيك (مشتري موثق)' : 'Add Your Review & Rating (Verified Purchase)')}
                          </h3>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-neutral-800 font-bold">{language === 'ar' ? 'التقييم بالنجوم:' : 'Rating:'}</span>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setNewRating(star)}
                                  className="p-0.5 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                                >
                                  <Star 
                                    className={`w-5 h-5 ${star <= newRating ? 'fill-amber-400 text-black stroke-[1.5]' : 'text-neutral-300 fill-neutral-200'}`} 
                                    strokeWidth={1.5}
                                  />
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] text-black uppercase tracking-wider font-black">
                              {language === 'ar' ? 'عنوان التقييم' : 'Review Title'}
                            </label>
                            <input
                              type="text"
                              value={newTitle}
                              onChange={(e) => setNewTitle(e.target.value)}
                              placeholder={language === 'ar' ? 'مثال: خدمة سريعة وممتازة!' : 'e.g. Excellent and fast service!'}
                              className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-xs font-bold text-black outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] text-black uppercase tracking-wider font-black">
                              {language === 'ar' ? 'محتوى التقييم والتعليق' : 'Review Comment'}
                            </label>
                            <textarea
                              rows={3}
                              value={newBody}
                              onChange={(e) => setNewBody(e.target.value)}
                              placeholder={language === 'ar' ? 'اكتب رأيك الصادق هنا...' : 'Write your honest review here...'}
                              className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-xs font-bold text-black outline-none shadow-[1.5px_1.5px_0px_0px_#000] font-sans"
                            />
                          </div>

                          {/* Admin-only controls */}
                          {isAdmin && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border-2 border-black bg-white rounded-xl shadow-[2px_2px_0px_0px_#000]">
                              <div className="space-y-1.5 col-span-1 sm:col-span-2">
                                <span className="text-[10px] text-black font-black tracking-widest uppercase bg-[#FFE600] px-2 py-0.5 border border-black rounded">
                                  {language === 'ar' ? 'أدوات الإشراف (مسؤول)' : 'Moderator Settings (Admin)'}
                                </span>
                              </div>

                              {/* Username */}
                              <div className="space-y-1.5">
                                <label className="block text-[10px] text-black uppercase tracking-wider font-black">
                                  {language === 'ar' ? 'اسم المستخدم (الكاتب)' : 'Author Username'}
                                </label>
                                <input
                                  type="text"
                                  value={newUsername}
                                  onChange={(e) => setNewUsername(e.target.value)}
                                  placeholder={language === 'ar' ? 'مثال: Ahmed_99' : 'e.g. Ahmed_99'}
                                  className="w-full px-3 py-2 bg-[#FFFDF9] border-2 border-black rounded-xl text-xs font-bold text-black outline-none"
                                />
                              </div>

                              {/* Date */}
                              <div className="space-y-1.5">
                                <label className="block text-[10px] text-black uppercase tracking-wider font-black">
                                  {language === 'ar' ? 'تاريخ التقييم' : 'Review Date'}
                                </label>
                                <input
                                  type="datetime-local"
                                  value={newDate}
                                  onChange={(e) => setNewDate(e.target.value)}
                                  className="w-full px-3 py-2 bg-[#FFFDF9] border-2 border-black rounded-xl text-xs font-bold text-black outline-none"
                                />
                              </div>

                              {/* Likes Count */}
                              <div className="space-y-1.5">
                                <label className="block text-[10px] text-black uppercase tracking-wider font-black">
                                  {language === 'ar' ? 'عدد الإعجابات (مفيد)' : 'Helpful Likes Count'}
                                </label>
                                <input
                                  type="number"
                                  value={newHelpfulCount}
                                  onChange={(e) => setNewHelpfulCount(Number(e.target.value))}
                                  min={0}
                                  className="w-full px-3 py-2 bg-[#FFFDF9] border-2 border-black rounded-xl text-xs font-bold text-black outline-none font-mono"
                                />
                              </div>

                              {/* Verified Buy Checkbox */}
                              <div className="flex items-center gap-2 pt-4">
                                <input
                                  type="checkbox"
                                  id="newVerified"
                                  checked={newVerified}
                                  onChange={(e) => setNewVerified(e.target.checked)}
                                  className="w-4 h-4 rounded border-2 border-black bg-white text-black cursor-pointer"
                                />
                                <label htmlFor="newVerified" className="text-xs text-black font-black select-none cursor-pointer">
                                  {language === 'ar' ? 'شراء موثق ( Verified Buy )' : 'Verified Buy'}
                                </label>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button
                              onClick={handleSubmitReview}
                              disabled={reviewSubmitting || !newTitle.trim() || !newBody.trim()}
                              className="px-5 py-2.5 bg-[#06D6A0] hover:bg-[#05b385] border-2 border-black text-black font-black text-xs rounded-xl shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer disabled:opacity-50"
                            >
                              {reviewSubmitting ? (language === 'ar' ? 'جاري الإرسال...' : 'Submitting...') : (language === 'ar' ? 'إرسال التقييم' : 'Submit Review')}
                            </button>
                            {editingReviewId && (
                              <button
                                onClick={() => {
                                  setEditingReviewId(null);
                                  setNewTitle('');
                                  setNewBody('');
                                  setNewRating(5);
                                  setNewVerified(true);
                                  setNewUsername(user ? (user.user_metadata?.display_name || user.email?.split('@')[0] || 'Customer') : '');
                                  setNewHelpfulCount(0);
                                  setNewDate('');
                                }}
                                className="px-5 py-2.5 bg-white border-2 border-black text-black font-black text-xs rounded-xl shadow-[2px_2px_0px_0px_#000] transition-all cursor-pointer"
                              >
                                {language === 'ar' ? 'إلغاء التعديل' : 'Cancel Edit'}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      {!hasPurchased && !isAdmin && (
                        <div className="bg-[#FFFDF9] border-2 border-black p-5 rounded-2xl text-xs text-neutral-800 font-bold select-none text-center mb-8 shadow-[3px_3px_0px_0px_#000] flex flex-col items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#FF70A6] border-2 border-black flex items-center justify-center text-black shadow-[2px_2px_0px_0px_#000]">
                            <Lock className="w-5 h-5 stroke-[2.5]" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-black mb-1">
                              {language === 'ar' ? 'التقييمات متاحة للمشترين المعتمدين فقط' : 'Reviews Restricted to Verified Buyers'}
                            </h4>
                            <p className="text-xs text-neutral-700 max-w-md mx-auto">
                              {language === 'ar' 
                                ? 'لضمان المصداقية التامة، لا يمكن نشر أي تقييم أو تعليق إلا بعد إتمام شراء هذا المنتج واستلامه بنجاح عبر حسابك في UpStore.'
                                : 'To ensure 100% genuine feedback, reviews are only open to customers who have completed and received an order for this product.'}
                            </p>
                          </div>
                          {!user && (
                            <Link
                              href="/auth/login"
                              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#FFE600] hover:bg-[#edd600] border-2 border-black text-black font-black text-xs shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                            >
                              <span>{language === 'ar' ? 'تسجيل الدخول للتحقق من المشتريات' : 'Log in to Verify Purchase'}</span>
                            </Link>
                          )}
                        </div>
                      )}

                      <div className="space-y-4">
                        {filteredReviews.map((r) => {
                          const reviewIdStr = r.id.toString();
                          const initialHelpful = typeof r.helpful_count === 'number' ? r.helpful_count : 0;
                          const isLiked = likedReviews[reviewIdStr]?.liked ?? false;
                          const currentCount = likedReviews[reviewIdStr]?.count !== undefined 
                            ? likedReviews[reviewIdStr].count 
                            : (initialHelpful + (isLiked ? 1 : 0));
                          
                          return (
                            <div 
                              key={r.id} 
                              className="bg-[#FFFDF9] border-2 border-black p-6 rounded-2xl space-y-4 shadow-[4px_4px_0px_0px_#000] hover:-translate-y-0.5 transition-all duration-200"
                            >
                              <div className="flex justify-between items-start flex-wrap gap-3">
                                <div className="flex items-center gap-3">
                                  {/* Color Gradient Avatar */}
                                  <div className={`w-10 h-10 rounded-xl ${getAvatarGradient(r.avatar)} text-white text-sm font-black flex items-center justify-center uppercase select-none border-2 border-black shadow-[2px_2px_0px_0px_#000]`}>
                                    {r.avatar}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-sm font-black text-black">{r.username}</span>
                                      {r.verified && (
                                        <ShieldCheck className="w-4 h-4 text-black stroke-[2.5]" />
                                      )}
                                    </div>
                                    <div className="text-xs text-neutral-600 font-bold">{r.date}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 select-none">
                                  <StarRating rating={r.rating} />
                                  {r.verified && (
                                    <span className="text-[10px] font-black tracking-wider text-black bg-[#06D6A0] border border-black px-2 py-0.5 rounded-lg uppercase shadow-[1px_1px_0px_0px_#000]">
                                      {getProductText('Verified Buy')}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="space-y-1 text-start">
                                <h4 className="text-sm sm:text-base font-black text-black tracking-wide">{r.title}</h4>
                                <p className="text-xs sm:text-sm text-neutral-800 leading-relaxed font-bold">{r.body}</p>
                              </div>

                              <div className="flex items-center justify-between pt-3 border-t-2 border-black select-none">
                                {/* Thumbs Up Helpful Button */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleLike(reviewIdStr, initialHelpful)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-black text-xs font-black transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer shadow-[2px_2px_0px_0px_#000] ${
                                    isLiked
                                      ? 'bg-[#FFE600] text-black'
                                      : 'bg-white text-black hover:bg-neutral-100'
                                  }`}
                                  title={language === 'ar' ? 'تقييم التعليق كمفيد' : 'Mark as helpful'}
                                >
                                  <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'fill-black stroke-black' : 'stroke-black'}`} />
                                  <span>{language === 'ar' ? 'مفيد' : 'Helpful'}</span>
                                  {currentCount > 0 && (
                                    <span className="font-mono bg-neutral-100 border border-black/30 px-1.5 py-0.2 rounded-md text-[10px] font-black text-black">
                                      {currentCount}
                                    </span>
                                  )}
                                </button>

                                {/* Edit / Delete Actions (if Admin or Author) */}
                                {(isAdmin || (user && r.user_id === user.id)) && (
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => {
                                        setEditingReviewId(r.id);
                                        setNewRating(r.rating);
                                        setNewTitle(r.title);
                                        setNewBody(r.body);
                                        setNewVerified(r.verified);
                                        setNewUsername(r.username || '');
                                        setNewHelpfulCount(r.helpful_count ?? 0);
                                        setNewDate(r.created_at ? new Date(r.created_at).toISOString().slice(0, 16) : '');
                                        const formEl = document.getElementById('review-form-section');
                                        if (formEl) {
                                          formEl.scrollIntoView({ behavior: 'smooth' });
                                        }
                                      }}
                                      className="text-[11px] font-bold text-cyber-blue hover:text-cyan-300 transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                      {language === 'ar' ? 'تعديل' : 'Edit'}
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (r.id.toString().startsWith('mock-')) {
                                          if (window.confirm(language === 'ar' ? 'هل أنت متأكد من إخفاء هذا التعليق التجريبي؟' : 'Are you sure you want to hide this demo review?')) {
                                            setHiddenMockReviewIds(prev => [...prev, r.id.toString()]);
                                          }
                                        } else {
                                          handleDeleteReview(r.id);
                                        }
                                      }}
                                      className="text-[11px] font-bold text-rose-500 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      {language === 'ar' ? 'حذف' : 'Delete'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

          {/* Stick checkout panel on desktop */}
          <div className="hidden lg:block lg:col-span-4 sticky top-20 z-20 space-y-6">
            {renderCheckoutPanel()}
          </div>

        </div>

        {/* ── RELATED PRODUCTS (live from DB) ── */}
        {(() => {
          if (relatedProducts.length === 0) return null;

          return (
            <section className="mt-16">
              <h2 className="text-black text-lg sm:text-xl font-black uppercase tracking-wider mb-6 select-none">
                {getProductText('Related Products')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {relatedProducts.slice(0, 4).map((p: any) => (
                  <ProductCard
                    key={p.slug}
                    product={{
                      ...p,
                      Icon: ICON_MAP[p.icon_name] || Zap,
                      imageUrl: p.image_url || '',
                      price: typeof p.our_price === 'number' ? p.our_price : 0,
                      rating: Number(p.rating) || 0,
                      reviews: Number(p.reviews) || 0,
                    }}
                    variant="related"
                  />
                ))}
              </div>
            </section>
          );
        })()}

      </div>

      {/* ── Mobile Sticky Bottom Buy Bar (High-Converting 1-Tap Bar) ── */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t-2 border-black px-4 py-2.5 flex items-center justify-between gap-3 shadow-[0px_-4px_0px_0px_#000] safe-area-bottom select-none">
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-bold text-neutral-600 truncate">
            {language === 'ar' ? 'السعر الإجمالي' : 'Total Price'}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-black text-black font-mono">
              {formatPrice(product.ourPrice * quantity)}
            </span>
            {savingsPct > 0 && (
              <span className="text-[9px] font-black text-black bg-[#FFE600] border border-black px-1 rounded font-mono">
                -{savingsPct}%
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={cartAdding || product.stock === 0}
            className={`p-2.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center cursor-pointer ${
              cartAdded ? 'bg-black text-[#FFE600]' : product.stock === 0 ? 'bg-neutral-200 text-neutral-400' : 'bg-white hover:bg-neutral-100 text-black'
            }`}
            aria-label="Add to cart"
          >
            {cartAdding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : cartAdded ? (
              <Check className="w-4 h-4 text-[#FFE600] stroke-[3]" />
            ) : (
              <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            )}
          </button>

          <button
            type="button"
            onClick={handleBuyNow}
            disabled={product.stock === 0}
            className="px-5 py-2.5 bg-[#06D6A0] hover:bg-[#05b888] text-black text-xs font-black border-2 border-black rounded-xl shadow-[2.5px_2.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Zap className="w-4 h-4 fill-black stroke-[2]" />
            <span>{product.stock === 0 ? (language === 'ar' ? 'نفذت الكمية' : 'Out of Stock') : (language === 'ar' ? 'شراء فوري' : 'Buy Now')}</span>
          </button>
        </div>
      </div>

      {/* Smart Multi-Gateway Payment Modal */}
      {showPaymentModal && product && (
        <SmartPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          items={[{
            product_id: dbProduct?.id || product?.id,
            product: {
              id: dbProduct?.id || product?.id,
              name: product?.name,
              name_ar: (product as any)?.name_ar,
              our_price: Number(selectedVariant?.our_price ?? selectedVariant?.ourPrice ?? (product as any)?.our_price ?? product?.ourPrice ?? (product as any)?.price ?? 0),
              price_egp: Number(selectedVariant?.price_egp ?? (product as any)?.price_egp ?? (product as any)?.priceEgp ?? 0),
              price_sar: Number(selectedVariant?.price_sar ?? (product as any)?.price_sar ?? (product as any)?.priceSar ?? 0),
              image_url: product?.imageUrl || dbProduct?.image_url,
            },
            variant_id: selectedVariant?.id || null,
            variant: selectedVariant,
            quantity: quantity,
          }]}
          totalUsd={Number(selectedVariant?.our_price ?? selectedVariant?.ourPrice ?? (product as any)?.our_price ?? product?.ourPrice ?? (product as any)?.price ?? 0) * (quantity || 1)}
        />
      )}
    </div>
  );
}
