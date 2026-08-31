import type { SupabaseClient } from '@supabase/supabase-js';

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  name_ar?: string;
  image_url?: string;
  market_price: number;
  our_price: number;
  price_egp: number;
  price_sar: number;
  subscription_duration: string;
  quality?: string;
  stock: number;
  max_stock: number;
  status: 'active' | 'draft';
  sort_order: number;
  zelenka_product_id?: string;
  created_at?: string;
}

export interface LiveProductRecord {
  id: string;
  slug: string;
  name: string;
  name_ar?: string;
  description_ar?: string;
  advantages_ar?: string[];
  category: string;
  market_price: number;
  our_price: number;
  price_egp: number;
  price_sar: number;
  rating: number;
  reviews: number;
  stock: number;
  max_stock: number;
  brand_color: string;
  icon_name: string;
  image_url: string;
  description: string;
  advantages: string[];
  sale_ends_in: number;
  sold_count: number;
  warranty_duration: string;
  delivery_time: string;
  subscription_duration: string;
  created_at: string | null;
  delivery_mode?: 'key' | 'pre_assigned' | 'zelenka_api' | 'telegram';
  zelenka_api_key?: string;
  zelenka_product_id?: string;
  variants?: ProductVariant[];
  is_flash_deal?: boolean;
  flash_deal_price?: number;
  flash_deal_duration_hours?: number;
  updated_at?: string | null;
  attributes?: any[];
}

export const DEFAULT_PRODUCT_BRAND_COLOR =
  'hover:border-cyber-green/30 hover:shadow-md';

function toText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string');
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((item: unknown) => typeof item === 'string');
      }
    } catch {
      // not valid JSON
    }
  }
  return [];
}

export const ELIGIBLE_FLASH_DEALS = [
  'gemini-advanced-18-months'
];

export function getActiveFlashDealSlug(): string {
  const rotationPeriod = 12 * 60 * 60 * 1000; // 12 hours
  const intervalIndex = Math.floor(Date.now() / rotationPeriod);
  const activeIndex = intervalIndex % ELIGIBLE_FLASH_DEALS.length;
  return ELIGIBLE_FLASH_DEALS[activeIndex];
}

export function getActiveFlashDealSlugFromProducts(products: any[]): string {
  const inStockProducts = products.filter((p) => (p.stock ?? 1) > 0);
  const pool = inStockProducts.length > 0 ? inStockProducts : products;

  const activeManually = pool
    .filter(
      (p) =>
        p.is_flash_deal &&
        p.updated_at &&
        Date.now() <
          new Date(p.updated_at).getTime() +
            (p.flash_deal_duration_hours || 12) * 60 * 60 * 1000
    )
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )[0];

  if (activeManually) {
    return activeManually.slug;
  }

  // Fallback to active rotation from in-stock items
  const inStockEligible = ELIGIBLE_FLASH_DEALS.filter((slug) =>
    pool.some((p) => p.slug === slug)
  );
  if (inStockEligible.length > 0) {
    const rotationPeriod = 12 * 60 * 60 * 1000;
    const intervalIndex = Math.floor(Date.now() / rotationPeriod);
    return inStockEligible[intervalIndex % inStockEligible.length];
  }

  return getActiveFlashDealSlug();
}

export async function getActiveFlashDealSlugFromDb(
  supabase: SupabaseClient<any, any, any>
): Promise<string> {
  try {
    const { data: activeDeals } = await supabase
      .from('products')
      .select('slug, updated_at, flash_deal_duration_hours, is_flash_deal')
      .eq('is_flash_deal', true);

    if (activeDeals && activeDeals.length > 0) {
      const activeManually = activeDeals
        .filter(
          (p) =>
            p.updated_at &&
            Date.now() <
              new Date(p.updated_at).getTime() +
                (p.flash_deal_duration_hours || 12) * 60 * 60 * 1000
        )
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )[0];
      if (activeManually) {
        return activeManually.slug;
      }
    }
  } catch (err) {
    console.error('Error fetching active flash deal from DB:', err);
  }
  return getActiveFlashDealSlug();
}

export function normalizeProductRecord(
  input: Partial<LiveProductRecord> | null | undefined,
  activeFlashDealSlugOverride?: string
): LiveProductRecord {
  const id = toText(input?.id);
  const slug = toText(input?.slug);
  const raw_market_price = toNumber(input?.market_price);
  let our_price = toNumber(input?.our_price);
  let price_egp = toNumber(input?.price_egp);
  let price_sar = toNumber(input?.price_sar);

  let market_price = raw_market_price > 0 
    ? raw_market_price 
    : (our_price > 0 ? Math.round(our_price * 3.33 * 100) / 100 : 0);

  const activeFlashDealSlug = activeFlashDealSlugOverride || getActiveFlashDealSlug();
  const isFlashDeal = Boolean(input?.is_flash_deal) || 
                      (slug && activeFlashDealSlug && slug.toLowerCase() === activeFlashDealSlug.toLowerCase()) || 
                      (slug === 'chatgpt-plus-full-access' && activeFlashDealSlug === 'chatgpt-plus-shared-1-month') ||
                      (slug === 'chatgpt-plus-shared-1-month' && activeFlashDealSlug === 'chatgpt-plus-full-access') ||
                      (slug && slug.toLowerCase() === 'netflix' && activeFlashDealSlug === 'netflix-premium-4k-1-month') ||
                      (slug === 'netflix-premium-4k-1-month' && activeFlashDealSlug === 'netflix');

  if (isFlashDeal) {
    const flashPrice = toNumber(input?.flash_deal_price, 0);
    if (flashPrice > 0) {
      our_price = flashPrice;
      if (market_price <= our_price) {
        market_price = Math.round((our_price / 0.30) * 100) / 100;
      }
      
      const dbOurPrice = toNumber(input?.our_price, 1);
      const dbEgp = toNumber(input?.price_egp, 0);
      const dbSar = toNumber(input?.price_sar, 0);
      
      const egpRatio = dbEgp > 0 && dbOurPrice > 0 ? (dbEgp / dbOurPrice) : 53;
      const sarRatio = dbSar > 0 && dbOurPrice > 0 ? (dbSar / dbOurPrice) : 3.75;
      
      price_egp = Math.round(our_price * egpRatio * 100) / 100;
      price_sar = Math.round(our_price * sarRatio * 100) / 100;
    }
  }

  return {
    id,
    slug,
    name: toText(input?.name, 'Untitled Product'),
    name_ar: toText(input?.name_ar),
    description_ar: toText(input?.description_ar),
    advantages_ar: toStringArray(input?.advantages_ar),
    category: toText(input?.category, 'Uncategorized'),
    market_price,
    our_price,
    price_egp,
    price_sar,
    rating: toNumber(input?.rating, 0),
    reviews: toNumber(input?.reviews, 0),
    stock: toNumber(input?.stock, 0),
    max_stock: Math.max(toNumber(input?.max_stock, 100), 0),
    brand_color: toText(input?.brand_color, DEFAULT_PRODUCT_BRAND_COLOR),
    icon_name: toText(input?.icon_name),
    image_url: toText(input?.image_url),
    description: toText(input?.description),
    advantages: toStringArray(input?.advantages),
    sale_ends_in: Math.max(toNumber(input?.sale_ends_in, 0), 0),
    sold_count: Math.max(toNumber(input?.sold_count, 0), 0),
    subscription_duration: toText(input?.subscription_duration, '1 Month'),
    warranty_duration: toText(
      input?.warranty_duration,
      toText(input?.subscription_duration, '1 Month')
    ),
    delivery_time: toText(input?.delivery_time, 'بعد مراجعة الدفع'),
    created_at: typeof input?.created_at === 'string' ? input.created_at : null,
    delivery_mode: (input as any)?.delivery_mode || 'key',
    zelenka_api_key: toText((input as any)?.zelenka_api_key),
    zelenka_product_id: toText((input as any)?.zelenka_product_id),
    is_flash_deal: !!input?.is_flash_deal,
    flash_deal_price: input?.flash_deal_price !== undefined ? toNumber(input?.flash_deal_price) : undefined,
    flash_deal_duration_hours: input?.flash_deal_duration_hours !== undefined ? toNumber(input?.flash_deal_duration_hours) : undefined,
    updated_at: typeof input?.updated_at === 'string' ? input.updated_at : null,
    attributes: Array.isArray(input?.attributes) ? input.attributes : [],
  };
}

/**
 * Format localized subscription duration (e.g. '18 Months' -> '18 شهر', '1 Year' -> 'سنة واحدة')
 */
export function formatLocalizedDuration(durationStr?: string | null, lang: 'ar' | 'en' = 'ar'): string {
  if (!durationStr || !durationStr.trim()) {
    return lang === 'ar' ? '1 شهر' : '1 Month';
  }
  const clean = durationStr.trim();
  if (lang === 'en') {
    if (/مدى الحياة|دائم|lifetime/i.test(clean)) return 'Lifetime';
    const numMatch = clean.match(/(\d+)/);
    const num = numMatch ? numMatch[1] : '';
    if (/سنة|سنوات|year/i.test(clean)) return num ? `${num} Year${num === '1' ? '' : 's'}` : '1 Year';
    if (/شهر|أشهر|month/i.test(clean)) return num ? `${num} Month${num === '1' ? '' : 's'}` : '1 Month';
    if (/يوم|أيام|day/i.test(clean)) return num ? `${num} Day${num === '1' ? '' : 's'}` : '30 Days';
    return clean;
  }

  // Arabic localization
  if (/مدى الحياة|دائم|lifetime/i.test(clean)) {
    return 'مدى الحياة';
  }
  if (/طوال المدة|full duration/i.test(clean)) {
    return 'طوال مدة الاشتراك';
  }

  // Extract number and unit
  const numMatch = clean.match(/(\d+)/);
  const num = numMatch ? parseInt(numMatch[1], 10) : null;

  if (num !== null) {
    if (/year|سنة|سنوات/i.test(clean)) {
      if (num === 1) return 'سنة واحدة';
      if (num === 2) return 'سنتين';
      if (num >= 3 && num <= 10) return `${num} سنوات`;
      return `${num} سنة`;
    }
    if (/month|شهر|أشهر/i.test(clean)) {
      if (num === 1) return '1 شهر';
      if (num === 2) return 'شهرين (2 شهر)';
      if (num >= 3 && num <= 10) return `${num} أشهر`;
      return `${num} شهر`;
    }
    if (/day|يوم|أيام/i.test(clean)) {
      if (num === 1) return 'يوم واحد';
      if (num === 2) return 'يومين';
      if (num >= 3 && num <= 10) return `${num} أيام`;
      return `${num} يوم`;
    }
    return `${num} شهر`;
  }

  return clean;
}

/**
 * Format localized warranty duration
 */
export function formatLocalizedWarranty(
  warrantyStr?: string | null,
  subscriptionStr?: string | null,
  lang: 'ar' | 'en' = 'ar'
): string {
  const effective = warrantyStr && warrantyStr.trim() !== '' && warrantyStr !== '30 Days'
    ? warrantyStr
    : (subscriptionStr || warrantyStr || '30 Days');

  return formatLocalizedDuration(effective, lang);
}

/**
 * Format localized delivery time
 */
export function formatLocalizedDeliveryTime(
  deliveryStr?: string | null,
  lang: 'ar' | 'en' = 'ar'
): string {
  if (!deliveryStr || !deliveryStr.trim()) {
    return lang === 'ar' ? 'تسليم فوري (0-30ث)' : 'Instant (0-30s)';
  }
  const clean = deliveryStr.trim();
  if (/instant|فوري|آلي|30s|30 ثانية/i.test(clean)) {
    return lang === 'ar' ? 'تسليم فوري (0-30ث)' : 'Instant (0-30s)';
  }
  if (/after payment review|بعد مراجعة الدفع|مراجعة الدفع/i.test(clean)) {
    return lang === 'ar' ? 'تسليم فوري ومباشر' : 'Instant Fulfillment';
  }
  return clean;
}

/**
 * Generate intelligent, deeply customized features/advantages based on product name, category and description
 */
export function generateSmartProductAdvantages(product: {
  slug?: string | null;
  name?: string | null;
  name_ar?: string | null;
  category?: string | null;
  description?: string | null;
  description_ar?: string | null;
  subscription_duration?: string | null;
  warranty_duration?: string | null;
}): { advantages: string[]; advantages_ar: string[] } {
  const text = `${product.slug || ''} ${product.name || ''} ${product.name_ar || ''} ${product.category || ''} ${product.description || ''} ${product.description_ar || ''}`.toLowerCase();
  const durAr = formatLocalizedDuration(product.subscription_duration, 'ar');
  const durEn = formatLocalizedDuration(product.subscription_duration, 'en');

  // Gemini / Google AI / Antigravity
  if (text.includes('gemini') || text.includes('جيمناي') || text.includes('جيميني') || text.includes('antigravity') || text.includes('انتي')) {
    return {
      advantages: [
        'Full unrestricted access to Gemini 3.7 Flash & 2.5 Pro reasoning models',
        'Exclusive full access to the revolutionary Google Antigravity platform',
        'Massive 2 Million tokens context window for processing large codebases & files',
        'Includes 2TB Google One secure high-speed cloud storage',
        'Native seamless AI integration with Gmail, Docs, Sheets & Workspace',
        `Official private activation backed by a full ${durEn} gold warranty`,
      ],
      advantages_ar: [
        'الوصول الكامل وغير المحدود لأحدث نماذج الذكاء الاصطناعي Gemini 3.7 Flash و 2.5 Pro',
        'الوصول الحصري والمباشر لمحرك ومنصة Google Antigravity للبرمجة والأتمتة الذكية',
        'نافذة سياق عملاقة 2M Context Window لتحليل مشاريع وأكواد برمجية كاملة وفيديوهات طويلة',
        'سعة تخزين سحابية ضخمة 2 تيرابايت (2TB) عبر Google One لنسخ وتأمين ملفاتك',
        'تكامل ذكي ومباشر مع تطبيقات Google Workspace (Gmail, Docs, Sheets, Drive)',
        `تفعيل رسمي مباشر مع ضمان ذهبي شامل للاستبدال والدعم طوال ${durAr}`,
      ],
    };
  }

  // ChatGPT / OpenAI
  if (text.includes('chatgpt') || text.includes('openai') || text.includes('gpt') || text.includes('شات') || text.includes('claude') || text.includes('كلود')) {
    return {
      advantages: [
        'Full access to GPT-4o, GPT-4, DALL-E 3 & Voice Mode',
        'Ultra-fast response speeds even during peak server times',
        'Create and explore custom GPTs & Advanced Data Analysis',
        'Automated instant delivery to your email/dashboard',
        `Official private access backed by a full ${durEn} warranty`,
        'Works flawlessly on Web, iOS, Android and MacOS apps',
      ],
      advantages_ar: [
        'الوصول الكامل لنماذج GPT-4o و GPT-4 وتوليد الصور DALL-E 3',
        'سرعة استجابة فائقة وأولوية قصوى أثناء أوقات الذروة',
        'إمكانية استخدام وصناعة نماذج GPTs المخصصة وتحليل البيانات',
        'دفع عالمي آمن وموثوق مع تفعيل مباشر',
        `حساب رسمي مضمون بالكامل مع تغطية ضمان لمدة ${durAr}`,
        'متوافق مع الويب وتطبيقات iPhone و Android و Mac',
      ],
    };
  }

  // Netflix
  if (text.includes('netflix') || text.includes('نتفلكس') || text.includes('نتفليكس')) {
    return {
      advantages: [
        'Ultra HD 4K Streaming resolution + Dolby Vision & Atmos',
        'Private dedicated profile with personal PIN lock',
        'Watch on Smart TVs, Laptops, Mobile phones and Consoles',
        'Zero session conflicts — uninterrupted streaming',
        `Global verified checkout with full ${durEn} replacement warranty`,
        'All global movies, series and anime catalog unlocked',
      ],
      advantages_ar: [
        'بث فائق الجودة بدقة 4K Ultra HD ودعم تقنيات Dolby Vision',
        'ملف شخصي خاص بالكامل محمي برمز PIN سري خاص بك',
        'يعمل على الشاشات الذكية، الهواتف، اللابتوب وأجهزة الألعاب',
        'بدون أي تعارض في المشاهدة أو انقطاع نهائياً',
        `دفع عالمي معتمد مع ضمان استبدال شامل كامل مدة ${durAr}`,
        'مكتبة عالمية شاملة لكافة الأفلام والمسلسلات والأنمي',
      ],
    };
  }

  // YouTube Premium
  if (text.includes('youtube') || text.includes('يوتيوب')) {
    return {
      advantages: [
        '100% Ad-free video streaming across all devices',
        'Includes YouTube Music Premium with background playback',
        'Download videos & playlists for offline viewing',
        'Activate on your own personal Google/YouTube account',
        `Official activation guaranteed for ${durEn}`,
        '24/7 dedicated support & global secure checkout',
      ],
      advantages_ar: [
        'مشاهدة خالية تماماً من الإعلانات على جميع أجهزتك',
        'يشمل اشتراك YouTube Music Premium مع ميزة التشغيل بالخلفية',
        'إمكانية تحميل الفيديوهات وقوائم التشغيل للمشاهدة بدون إنترنت',
        'تفعيل رسمي وآمن على إيميلك وحسابك الشخصي في جوجل',
        `ضمان رسمي شامل ومستمر طوال مدة ${durAr}`,
        'دعم فني متخصص على مدار الساعة مع دفع عالمي ومحلي معتمد',
      ],
    };
  }

  // Spotify
  if (text.includes('spotify') || text.includes('سبوتيفاي') || text.includes('سبوتفاي')) {
    return {
      advantages: [
        'Unlimited ad-free music listening & podcast streaming',
        'High-Fidelity (320kbps) crystal clear audio quality',
        'Unlimited skips and offline downloads on all devices',
        'Activate directly on your own personal account',
        `Full replacement warranty covering the entire ${durEn}`,
        'Compatible with iOS, Android, Desktop and Smart Speakers',
      ],
      advantages_ar: [
        'استماع لا محدود للموسيقى والبودكاست بدون أي إعلانات',
        'أعلى جودة صوتية نقية فائقة الوضوح (320kbps)',
        'تخطي غير محدود للأغاني وتحميل مباشر بدون إنترنت',
        'تفعيل مباشر على حسابك الشخصي مع الاحتفاظ بجميع قوائمك',
        `ضمان ذهبي للاستبدال طوال مدة الاشتراك (${durAr})`,
        'متوافق مع الآيفون، الأندرويد، الكمبيوتر والمكبرات الذكية',
      ],
    };
  }

  // NordVPN / VPN
  if (text.includes('vpn') || text.includes('nord') || text.includes('نورد')) {
    return {
      advantages: [
        'Ultra-fast servers across 110+ countries worldwide',
        'Military-grade AES-256 encryption & strict No-Logs policy',
        'Unlock geo-restricted streaming and bypass network blocks',
        'Connect up to 6 to 10 devices simultaneously',
        `Global secure checkout with full ${durEn} replacement warranty`,
        'Built-in Threat Protection against malware and trackers',
      ],
      advantages_ar: [
        'سيرفرات فائقة السرعة موزعة في أكثر من 110 دولة حول العالم',
        'تشفير عسكري من الدرجة الأولى AES-256 وسياسة صارمة لعدم حفظ السجلات',
        'فتح المواقع المحجوبة وخدمات البث العالمية بكل حرية وأمان',
        'إمكانية تشغيل الحساب على عدة أجهزة في نفس الوقت',
        `دفع عالمي آمن مع ضمان استبدال رسمي طوال ${durAr}`,
        'ميزة الحماية المدمجة ضد البرمجيات الخبيثة والإعلانات المزعجة',
      ],
    };
  }

  // Microsoft Office 365 / Windows
  if (text.includes('microsoft') || text.includes('office') || text.includes('اوفيس') || text.includes('ويندوز') || text.includes('windows')) {
    return {
      advantages: [
        'Official genuine Microsoft license key & direct activation',
        'Full suite: Word, Excel, PowerPoint, Outlook, OneNote',
        'Includes 1TB - 5TB OneDrive cloud storage capacity',
        'Install on up to 5 PCs/Macs, tablets, and smartphones',
        `Lifetime/Guaranteed validity for ${durEn} with full support`,
        'Automatic updates directly from Microsoft servers',
      ],
      advantages_ar: [
        'ترخيص أصلي ورسمي 100% مع تفعيل مباشر من مايكروسوفت',
        'الحزمة الكاملة: Word و Excel و PowerPoint و Outlook و OneNote',
        'يتضمن مساحة تخزين سحابية ضخمة عبر OneDrive',
        'إمكانية التثبيت على ما يصل إلى 5 أجهزة كمبيوتر وماك وهواتف',
        `تفعيل رسمي مضمون مع دعم فني مستمر لمدة ${durAr}`,
        'تحديثات تلقائية ورسمية مباشرة من خوادم مايكروسوفت',
      ],
    };
  }

  // Xbox / Game Pass
  if (text.includes('xbox') || text.includes('game pass') || text.includes('اكس بوكس') || text.includes('العاب') || text.includes('steam')) {
    return {
      advantages: [
        'Instant access to hundreds of high-quality PC and Xbox games',
        'Day-one releases of top blockbuster gaming titles',
        'Includes EA Play membership and online multiplayer access',
        'Cloud Gaming support on PC, Mobile and Smart TVs',
        `100% safe official subscription with ${durEn} full warranty`,
        'Global secure checkout right after payment',
      ],
      advantages_ar: [
        'وصول فوري لمئات الألعاب العالمية الضخمة على الـ PC و Xbox',
        'لعب أحدث الألعاب الحصرية فور صدورها من اليوم الأول',
        'يشمل اشتراك EA Play المجاني واللعب الجماعي عبر الإنترنت',
        'دعم خاصية اللعب السحابي Cloud Gaming على الهاتف والكمبيوتر',
        `اشتراك رسمي وآمن 100% مع ضمان استبدال لمدة ${durAr}`,
        'دفع عالمي معتمد مع استلام فوري للبيانات بعد مراجعة الطلب',
      ],
    };
  }

  // Canva Pro
  if (text.includes('canva') || text.includes('كانفا')) {
    return {
      advantages: [
        'Unlimited access to 100+ million premium photos, videos & graphics',
        'One-click Magic Background Remover & Magic Resize tools',
        'Brand Kit setup with custom fonts, colors and logos',
        '1TB cloud storage for all your creative design assets',
        `Official private activation with a full ${durEn} warranty`,
        'Invitation sent directly to your personal email',
      ],
      advantages_ar: [
        'وصول غير محدود لأكثر من 100 مليون صورة وفيديو وعنصر تصميم مدفوع',
        'أداة إزالة خلفيات الصور والفيديوهات بضغطة زر واحدة (Magic Eraser)',
        'إنشاء الهوية البصرية وإضافة خطوطك وألوانك وشعاراتك الخاصة',
        'سعة تخزين سحابية 1 تيرابايت لحفظ كافة تصاميمك بجودة أصلية',
        `تفعيل رسمي خاص على إيميلك الشخصي مع ضمان شامل لمدة ${durAr}`,
        'دفع عالمي آمن ودعوة مباشرة لحسابك',
      ],
    };
  }

  // CapCut Pro
  if (text.includes('capcut') || text.includes('كاب كات') || text.includes('كابكات')) {
    return {
      advantages: [
        'Full access to all CapCut Pro effects, transitions & AI tools',
        'Export videos in Ultra HD 4K 60fps & HDR with zero watermark',
        'AI auto-captions, smart background removal & body effects',
        'Includes 100GB secure cloud storage for your video drafts',
        `Official activation with a comprehensive ${durEn} warranty`,
        'Works seamlessly on PC, Mac, iPhone, iPad and Android',
      ],
      advantages_ar: [
        'وصول كامل لكافة تأثيرات وفلاتر وانتقالات CapCut Pro المدفوعة',
        'تصدير الفيديوهات بأعلى جودة Ultra HD 4K 60fps و HDR بدون علامة مائية',
        'توليد الترجمة التلقائية الذكية وإزالة الخلفيات وتأثيرات الجسم بالذكاء الاصطناعي',
        'مساحة تخزين سحابية 100GB لحفظ وتعديل مسودات مشاريعك بأمان',
        `تفعيل رسمي مضمون مع تغطية ضمان شاملة طوال مدة ${durAr}`,
        'يعمل بكفاءة وسلاسة على الكمبيوتر، الماك، الآيفون والأندرويد',
      ],
    };
  }

  // Cursor AI / Developer Suite
  if (text.includes('cursor') || text.includes('كورسور')) {
    return {
      advantages: [
        '500 Fast Premium monthly requests powered by Claude 3.7 & GPT-4o',
        'Unlimited intelligent tab autocomplete with full codebase awareness',
        'In-editor agentic multi-file code editing & refactoring suite',
        'Full codebase indexing and contextual semantic repository search',
        `Official developer subscription backed by a full ${durEn} warranty`,
        'Works on Windows, MacOS, and Linux with full VS Code extension support',
      ],
      advantages_ar: [
        '500 طلب فائق السرعة شهرياً مدعوم بنماذج Claude 3.7 Sonnet و GPT-4o',
        'إكمال تلقائي ذكي غير محدود لكتابة وتوقع الأكواد مع فهم بنية المشروع',
        'تعديل وتطوير متعدد الملفات داخل المحرر باستخدام الوكلاء الأذكياء (Agents)',
        'فهرسة شاملة للمشروع بالكامل والبحث الدلالي الذكي في مستودع الكود',
        `اشتراك مطورين رسمي مع ضمان ذهبي شامل للاستبدال طوال مدة ${durAr}`,
        'متوافق مع أنظمة Windows و Mac و Linux ويدعم جميع إضافات VS Code',
      ],
    };
  }

  // Default Fallback
  return {
    advantages: [
      'Official, verified and genuine digital license/account',
      'Global secure checkout immediately after order review',
      `Comprehensive replacement warranty covering full ${durEn}`,
      'Multi-device compatibility with smooth operation',
      '24/7 dedicated customer care and live support ticket center',
      '100% secure transaction with guaranteed performance',
    ],
    advantages_ar: [
      'حساب وترخيص رقمي أصلي ومفعل ومضمون 100%',
      'دفع عالمي ومحلي آمن مع استلام رسمي مباشر بعد إتمام الطلب',
      `ضمان استبدال ذهبي وشامل طوال مدة الاشتراك (${durAr})`,
      'متوافق مع مختلف الأجهزة مع استقرار وسرعة في الأداء',
      'دعم فني وتذاكر مساعدة متواصلة على مدار الساعة 24/7',
      'عملية شراء آمنة ومشفرة بالكامل بأفضل سعر متاح',
    ],
  };
}

/**
 * Generate smart external feature badges / attributes
 */
export function generateSmartProductAttributes(product: {
  slug?: string | null;
  name?: string | null;
  name_ar?: string | null;
  category?: string | null;
  description?: string | null;
  subscription_duration?: string | null;
  warranty_duration?: string | null;
}): Array<{ label_en: string; label_ar: string; icon: string; color: string }> {
  const text = `${product.slug || ''} ${product.name || ''} ${product.name_ar || ''} ${product.category || ''}`.toLowerCase();
  const warAr = formatLocalizedWarranty(product.warranty_duration, product.subscription_duration, 'ar');
  const warEn = formatLocalizedWarranty(product.warranty_duration, product.subscription_duration, 'en');

  const globalPayBadge = {
    label_en: 'Global Pay & Full Warranty',
    label_ar: 'دفع عالمي وضمان كامل المدة',
    icon: 'ShieldCheck',
    color: '#10B981',
  };

  const warrantyBadge = {
    label_en: `${warEn} Warranty`,
    label_ar: `ضمان ${warAr}`,
    icon: 'Award',
    color: '#00f0ff',
  };

  if (text.includes('gemini') || text.includes('جيمناي') || text.includes('antigravity')) {
    return [
      globalPayBadge,
      warrantyBadge,
      { label_en: 'Gemini 3.7 Flash', label_ar: 'نموذج 3.7 Flash', icon: 'Sparkles', color: '#9D4EDF' },
      { label_en: 'Antigravity Access', label_ar: 'وصول Antigravity', icon: 'Bot', color: '#00D2FF' },
      { label_en: '2TB Cloud', label_ar: '2TB سحابي', icon: 'Globe', color: '#FFB900' },
    ];
  }

  if (text.includes('canva') || text.includes('كانفا')) {
    return [
      globalPayBadge,
      warrantyBadge,
      { label_en: '100M+ Assets', label_ar: '+100M عنصر مدفوع', icon: 'Palette', color: '#00C4CC' },
      { label_en: 'Magic AI Tools', label_ar: 'أدوات Magic الذكية', icon: 'Sparkles', color: '#7D2AE8' },
      { label_en: '1TB Cloud Storage', label_ar: '1TB سحابي', icon: 'Globe', color: '#00C4CC' },
    ];
  }

  if (text.includes('chatgpt') || text.includes('openai') || text.includes('gpt') || text.includes('شات')) {
    const isPro = text.includes('pro') || text.includes('برو');
    return [
      globalPayBadge,
      warrantyBadge,
      { label_en: isPro ? 'o1 Pro Reasoning' : 'GPT-4o & o1 Models', label_ar: isPro ? 'نموذج o1 Pro فائق الذكاء' : 'نماذج GPT-4o و o1', icon: 'Sparkles', color: isPro ? '#FFE600' : '#10A37F' },
      { label_en: 'DALL-E 3 & Voice', label_ar: 'توليد صور ووضع صوتي', icon: 'Bot', color: '#00D2FF' },
      { label_en: isPro ? 'Max Compute Power' : 'Zero Queue Limits', label_ar: isPro ? 'معالجة حاسوبية قصوى' : 'أولوية بدون انتظار', icon: 'Cpu', color: isPro ? '#FF8A00' : '#10A37F' },
    ];
  }

  if (text.includes('capcut') || text.includes('كاب كات') || text.includes('كابكات')) {
    return [
      globalPayBadge,
      warrantyBadge,
      { label_en: '4K 60fps & HDR', label_ar: 'دقة 4K 60fps و HDR', icon: 'Tv', color: '#00F0FF' },
      { label_en: 'Pro AI Video Tools', label_ar: 'أدوات ومؤثرات الذكاء', icon: 'Sparkles', color: '#FF70A6' },
      { label_en: 'No Watermark', label_ar: 'بدون علامة مائية', icon: 'Award', color: '#06D6A0' },
    ];
  }

  if (text.includes('cursor') || text.includes('كورسور')) {
    return [
      globalPayBadge,
      warrantyBadge,
      { label_en: 'Claude 3.7 & GPT-4o', label_ar: 'نماذج Claude 3.7 و GPT-4o', icon: 'Sparkles', color: '#6366F1' },
      { label_en: 'Unlimited Autocomplete', label_ar: 'إكمال كود غير محدود', icon: 'Zap', color: '#00D2FF' },
      { label_en: 'Full Code Indexing', label_ar: 'فهرسة المشروع بالكامل', icon: 'Cpu', color: '#A855F7' },
    ];
  }

  return [
    globalPayBadge,
    warrantyBadge,
    { label_en: '100% Official', label_ar: 'حساب أصلي 100%', icon: 'Award', color: '#FFE600' },
  ];
}

export const MASTER_UPSTORE_CATALOG: LiveProductRecord[] = [
  {
    id: '643361f7-7475-48ee-af69-20bf655da73a',
    slug: 'gemini-advanced-18-months',
    name: 'Google Gemini Advanced & Antigravity Suite - 18 Months (Gemini 3.7 Flash)',
    name_ar: 'جوجل جيمناي أدفانسد & أنتي جرافيتي - اشتراك 18 شهر (Gemini 3.7 Flash)',
    category: 'Accounts',
    market_price: 18.99,
    our_price: 5.64,
    price_egp: 299.00,
    price_sar: 23.00,
    rating: 4.85,
    reviews: 28,
    stock: 45,
    max_stock: 80,
    brand_color: '#9D4EDF',
    icon_name: 'gemini',
    image_url: '/images/products/gemini-advanced.png',
    description: 'Official Google Gemini Advanced 18-Month Premium Access. Powered by the next-generation Gemini 3.7 Flash & 2.5 Pro reasoning models with full access to the groundbreaking Google Antigravity agentic coding platform. Includes 2 Million tokens ultra-large context window, 2TB Google One secure cloud storage, and seamless native integration across Gmail, Google Docs, Sheets, and Drive. Backed by a full 18-month gold replacement warranty and instant automated activation.',
    description_ar: 'اشتراك رسمي وحصري في Google Gemini Advanced لمدة 18 شهراً كاملاً بأعلى فئة ومزايا فائقة. يتضمن الوصول الكامل وغير المحدود لأحدث نماذج الذكاء الاصطناعي الثورية Gemini 3.7 Flash و 2.5 Pro، بالإضافة إلى الوصول الكامل لمحرك ومنصة Google Antigravity للبرمجة الذكية وتطوير التطبيقات. يشمل الحساب مساحة تخزين سحابية ضخمة 2 تيرابايت (2TB) عبر Google One ونافذة سياق عملاقة تتسع لـ 2 مليون رمز (2M Context Window) لمعالجة وتحليل أضخم الملفات والأكواد ومقاطع الفيديو، مع تكامل ذكي ومباشر مع كافة خدمات Google Workspace (Gmail, Docs, Sheets). الحساب رسمي ومفعل 100% مع ضمان ذهبي شامل للاستبدال والدعم الفني طوال مدة الـ 18 شهراً.',
    advantages: [
      'Full unrestricted access to Gemini 3.7 Flash & 2.5 Pro ultra-reasoning AI models',
      'Exclusive access to Google Antigravity agentic coding suite & advanced IDE tools',
      'Massive 2 Million tokens context window for analyzing full codebases and long videos',
      'Includes 2TB Google One high-speed cloud storage for files, backups & media',
      'Deep AI integration across Gmail, Google Docs, Sheets, Slides and Google Drive',
      'Official private activation with a full 18-month comprehensive gold warranty'
    ],
    advantages_ar: [
      'الوصول الكامل وغير المحدود لأحدث نماذج الذكاء الاصطناعي Gemini 3.7 Flash و 2.5 Pro',
      'الوصول الحصري والمباشر لمنصة وأدوات Google Antigravity للبرمجة الذكية المتقدمة',
      'نافذة سياق عملاقة 2M Context Window لتحليل مشاريع وأكواد برمجية كاملة وفيديوهات طويلة',
      'سعة تخزين سحابية ضخمة 2 تيرابايت (2TB) عبر Google One لنسخ وتأمين ملفاتك ومشاريعك',
      'تكامل ذكي ومباشر مع كافة تطبيقات جوجل (Gmail, Docs, Sheets, Slides, Drive)',
      'تفعيل رسمي مباشر مع ضمان ذهبي شامل للاستبدال والدعم طوال مدة الاشتراك (18 شهراً)'
    ],
    attributes: [
      { label_en: 'Gemini 3.7 Flash', label_ar: 'نموذج 3.7 Flash', icon: 'Sparkles', color: '#9D4EDF' },
      { label_en: 'Antigravity Access', label_ar: 'وصول Antigravity', icon: 'Bot', color: '#00D2FF' },
      { label_en: '18 Months Warranty', label_ar: 'ضمان 18 شهر', icon: 'ShieldCheck', color: '#10B981' },
      { label_en: '2TB Cloud Storage', label_ar: '2TB سحابي Google One', icon: 'Globe', color: '#FFB900' }
    ],
    subscription_duration: '18 Months',
    warranty_duration: '18 Months',
    delivery_time: 'بعد مراجعة الدفع',
    delivery_mode: 'key',
    is_flash_deal: true,
    flash_deal_price: 5.64,
    flash_deal_duration_hours: 48,
    sold_count: 72,
    sale_ends_in: 0,
    created_at: '2026-08-23T00:00:00Z',
    updated_at: '2026-08-23T00:00:00Z'
  },
  {
    id: 'a1b2c3d4-1111-4444-8888-canvapro1year',
    slug: 'canva-pro-1-year',
    name: 'Canva Pro — 1 Year Full Access',
    name_ar: 'اشتراك كانفا برو - سنة كاملة (Canva Pro 1 Year)',
    category: 'Subscriptions',
    market_price: 54.99,
    our_price: 4.99,
    price_egp: 265.00,
    price_sar: 19.00,
    rating: 4.88,
    reviews: 36,
    stock: 50,
    max_stock: 80,
    brand_color: '#00C4CC',
    icon_name: 'canva',
    image_url: '/images/products/canva-pro.png',
    description: 'Official Canva Pro 1-Year subscription. Unlock over 100+ million premium stock photos, videos, audio tracks, and graphics. Includes Magic Studio AI editing suite, instant Background Remover, Magic Resize, Brand Kit creation, premium fonts, vector SVG downloads, and 1TB cloud storage for all your creative projects. Private invitation sent directly to your personal email with a full 1-year gold replacement warranty.',
    description_ar: 'اشتراك كانفا برو (Canva Pro) رسمي لمدة سنة كاملة (1 Year) مفعل على إيميلك الشخصي مباشرة. يتيح لك الوصول غير المحدود لأكثر من 100 مليون صورة وفيديو وتصميم مدفوع بجودة فائقة، وأدوات الذكاء الاصطناعي السحرية Magic Studio، وميزة إزالة خلفيات الصور والفيديو بضغطة زر واحدة، وإنشاء الهوية البصرية Brand Kit، وتصدير الملفات بصيغة SVG و 4K، مع سعة تخزين سحابية ضخمة 1 تيرابايت (1TB). الحساب رسمي 100% ومضمون طوال مدة الـ 12 شهراً مع دعم فني متواصل.',
    advantages: [
      'Unlimited access to 100+ million premium photos, templates, videos & vectors',
      'One-click Magic Eraser Background Remover for images and video clips',
      'Magic Studio AI tools: Magic Expand, Magic Edit, Magic Morph & AI Writer',
      'Full Brand Kit management with custom color palettes, logos and uploaded fonts',
      '1TB cloud storage to organize, backup and collaborate on creative designs',
      'Official invite directly to your personal email with a 1-year gold warranty'
    ],
    advantages_ar: [
      'وصول كامل وغير محدود لأكثر من 100 مليون قالب وعنصر وتصميم مدفوع',
      'أداة إزالة خلفيات الصور ومقاطع الفيديو بنقرة واحدة (Magic Background Remover)',
      'استوديو أدوات الذكاء الاصطناعي Magic Studio لتعديل وتوليد التصاميم تلقائياً',
      'إنشاء الهوية البصرية المتكاملة وإضافة ألوان وخطوط وشعارات مشروعك',
      'سعة تخزين سحابية 1 تيرابايت (1TB) لحفظ وتنظيم مشاريعك بدقة أصلية',
      'دعوة رسمية مباشرة لحسابك الشخصي مع ضمان ذهبي شامل لمدة سنة كاملة'
    ],
    attributes: [
      { label_en: '100M+ Assets', label_ar: '+100M عنصر مدفوع', icon: 'Palette', color: '#00C4CC' },
      { label_en: 'Magic AI Tools', label_ar: 'أدوات Magic الذكية', icon: 'Sparkles', color: '#7D2AE8' },
      { label_en: '1 Year Warranty', label_ar: 'ضمان سنة كاملة', icon: 'ShieldCheck', color: '#10B981' },
      { label_en: '1TB Cloud Storage', label_ar: '1TB سحابي', icon: 'Globe', color: '#00C4CC' }
    ],
    subscription_duration: '1 Year',
    warranty_duration: '1 Year',
    delivery_time: 'بعد مراجعة الدفع',
    delivery_mode: 'key',
    sold_count: 64,
    sale_ends_in: 0,
    created_at: '2026-08-23T00:00:00Z',
    updated_at: '2026-08-23T00:00:00Z'
  },
  {
    id: 'a1b2c3d4-2222-4444-8888-canvaprolifetime',
    slug: 'canva-pro-lifetime',
    name: 'Canva Pro — Lifetime Access VIP',
    name_ar: 'اشتراك كانفا برو - مدى الحياة دائم (Canva Pro Lifetime)',
    category: 'Subscriptions',
    market_price: 119.99,
    our_price: 8.99,
    price_egp: 475.00,
    price_sar: 35.00,
    rating: 4.87,
    reviews: 26,
    stock: 30,
    max_stock: 50,
    brand_color: '#00C4CC',
    icon_name: 'canva',
    image_url: '/images/products/canva-pro.png',
    description: 'Exclusive Lifetime VIP Access to Canva Pro. Enjoy permanent unlimited access to all premium graphics, video templates, Magic AI tools, and Brand Kit features without recurring monthly or yearly fees. Official activation on your personal account with lifetime continuous support and warranty.',
    description_ar: 'اشتراك كانفا برو دائم مدى الحياة (Canva Pro Lifetime VIP) بدون أي رسوم تجديد شهرية أو سنوية. استمتع بوصول دائم لكافة عناصر وقوالب كانفا المدفوعة، وأدوات الذكاء الاصطناعي المتقدمة، وإزالة الخلفيات، وتصدير الفيديوهات والتصاميم بأعلى دقة، مع تفعيل آمن ورسمي على إيميلك الشخصي وضمان استبدال ذهبي مستمر.',
    advantages: [
      'Permanent Lifetime VIP access with zero recurring renewal fees',
      'Full access to 100M+ premium assets, fonts, graphics and video clips',
      'All Magic Studio AI tools and background removal unlocked permanently',
      'Personal account upgrade with uninterrupted cloud workspace access',
      'Lifetime gold replacement warranty and priority customer assistance'
    ],
    advantages_ar: [
      'صلاحية دائمة مدى الحياة بدون أي اشتراكات دورية أو تجديدات إضافية',
      'وصول كامل لمكتبة +100 مليون قالب وتصميم وعنصر جرافيك مدفوع',
      'فتح كافة مزايا وأدوات الذكاء الاصطناعي Magic Studio بشكل دائم',
      'ترقية رسمية آمنة على حسابك الشخصي مع مساحة سحابية خاصة',
      'ضمان ذهبي شامل ومستمر مدى الحياة مع دعم فني متواصل'
    ],
    attributes: [
      { label_en: 'Lifetime Access', label_ar: 'صلاحية مدى الحياة', icon: 'Crown', color: '#FFE600' },
      { label_en: 'Magic AI Suite', label_ar: 'استوديو Magic الكامل', icon: 'Sparkles', color: '#7D2AE8' },
      { label_en: 'Lifetime Warranty', label_ar: 'ضمان ذهبي دائم', icon: 'ShieldCheck', color: '#10B981' },
      { label_en: 'Personal Email', label_ar: 'تفعيل على إيميلك', icon: 'Award', color: '#00C4CC' }
    ],
    subscription_duration: 'Lifetime',
    warranty_duration: 'Lifetime',
    delivery_time: 'بعد مراجعة الدفع',
    delivery_mode: 'key',
    sold_count: 42,
    sale_ends_in: 0,
    created_at: '2026-08-23T00:00:00Z',
    updated_at: '2026-08-23T00:00:00Z'
  },
  {
    id: 'b2c3d4e5-1111-4444-8888-chatgptplus1m',
    slug: 'chatgpt-plus-1-month',
    name: 'ChatGPT Plus — 1 Month Private Access (GPT-4o & o1)',
    name_ar: 'اشتراك شات جي بي تي بلس - شهر كامل (ChatGPT Plus)',
    category: 'Accounts',
    market_price: 20.00,
    our_price: 4.49,
    price_egp: 239.00,
    price_sar: 17.50,
    rating: 4.89,
    reviews: 42,
    stock: 55,
    max_stock: 90,
    brand_color: '#10A37F',
    icon_name: 'chatgpt',
    image_url: '/images/products/chatgpt-plus.png',
    description: 'Official ChatGPT Plus 1-Month private account. Full unrestricted access to GPT-4o, GPT-4, OpenAI o1 reasoning model, DALL-E 3 image generator, Advanced Voice Mode, Canvas interactive editing, custom GPTs, and real-time internet browsing. Ultra-fast response speed during peak hours with a full 30-day replacement warranty.',
    description_ar: 'اشتراك شات جي بي تي بلس (ChatGPT Plus) رسمي لمدة شهر كامل (30 يوماً). يمنحك وصولاً كاملاً وغير مقيد لأحدث نماذج OpenAI: نموذج GPT-4o الذكي والسريع، ونموذج التفكير المعقد o1، وتوليد الصور الاحترافية عبر DALL-E 3، وميزة المحادثة الصوتية المتقدمة Advanced Voice Mode، واستخدام وصناعة روبوتات GPTs المخصصة، وتحليل المستندات والأكواد البرمجية بدقة فائقة وبدون قوائم انتظار. الحساب مفعل ومضمون بالكامل طوال الـ 30 يوماً.',
    advantages: [
      'Full unrestricted access to GPT-4o, GPT-4 and OpenAI o1 reasoning models',
      'DALL-E 3 ultra-high quality image generator integrated in chat',
      'Advanced Voice Mode with ultra-low latency real-time voice conversations',
      'Interactive Canvas editor for coding, writing and large document analysis',
      'Fastest response times and top priority during peak traffic hours',
      'Official private account backed by a full 30-day replacement warranty'
    ],
    advantages_ar: [
      'الوصول الكامل لنماذج GPT-4o و GPT-4 ونموذج التفكير العميق OpenAI o1',
      'توليد ورسم الصور بدقة فائقة عبر محرك DALL-E 3 المدمج داخل المحادثة',
      'الوضع الصوتي المتقدم Advanced Voice Mode للتحدث المباشر بالصوت بدون تأخير',
      'واجهة Canvas التفاعلية لكتابة الأكواد والمقالات ومراجعة الملفات الضخمة',
      'أولوية قصوى وسرعة استجابة فورية حتى في أوقات الذروة وازدحام الخوادم',
      'حساب رسمي خاص بالكامل مع ضمان استبدال ذهبي طوال مدة الشهر (30 يوماً)'
    ],
    attributes: [
      { label_en: 'GPT-4o & o1 Models', label_ar: 'نماذج GPT-4o و o1', icon: 'Sparkles', color: '#10A37F' },
      { label_en: 'DALL-E 3 & Voice', label_ar: 'توليد صور ووضع صوتي', icon: 'Bot', color: '#00D2FF' },
      { label_en: 'Zero Queue Limits', label_ar: 'أولوية بدون انتظار', icon: 'Zap', color: '#10A37F' },
      { label_en: '30 Days Warranty', label_ar: 'ضمان كامل 30 يوماً', icon: 'ShieldCheck', color: '#10B981' }
    ],
    subscription_duration: '1 Month',
    warranty_duration: '1 Month',
    delivery_time: 'بعد مراجعة الدفع',
    delivery_mode: 'key',
    sold_count: 85,
    sale_ends_in: 0,
    created_at: '2026-08-23T00:00:00Z',
    updated_at: '2026-08-23T00:00:00Z'
  },
  {
    id: 'b2c3d4e5-2222-4444-8888-chatgptpro1m',
    slug: 'chatgpt-pro-1-month',
    name: 'ChatGPT Pro — 1 Month Ultra Access (o1 Pro Mode & Unlimited GPT-4o)',
    name_ar: 'اشتراك شات جي بي تي برو - شهر كامل فئة Pro الخارقة (ChatGPT Pro)',
    category: 'Accounts',
    market_price: 200.00,
    our_price: 24.99,
    price_egp: 1325.00,
    price_sar: 95.00,
    rating: 4.92,
    reviews: 18,
    stock: 15,
    max_stock: 25,
    brand_color: '#0F172A',
    icon_name: 'chatgpt',
    image_url: '/images/products/chatgpt-pro.png',
    description: 'The pinnacle of OpenAI intelligence: ChatGPT Pro 1-Month Ultra Access. Official access to OpenAI o1 Pro Mode with extended chain-of-thought compute for solving the most challenging mathematics, coding, and scientific research benchmarks. Includes unlimited GPT-4o messages, advanced compute allocation, and maximum priority access. Backed by a full 30-day replacement warranty.',
    description_ar: 'الاشتراك الأقوى والأعلى فئة عالمياً من OpenAI: شات جي بي تي برو (ChatGPT Pro) لمدة شهر كامل. يمنحك الوصول الحصري لنموذج o1 Pro Mode الذي يستخدم أعلى قوة معالجة حاسوبية للتفكير والتعليل المنطقي العميق لحل أعقد المسائل الرياضية والأكواد البرمجية والأبحاث العلمية، مع استخدام غير محدود لنموذج GPT-4o بدون أي قيود على عدد الرسائل، وأعلى سرعة معالجة في العالم. حساب رسمي مع ضمان ذهبي شامل 30 يوماً.',
    advantages: [
      'Exclusive access to OpenAI o1 Pro Mode for supreme deep reasoning',
      'Unlimited messaging limits on GPT-4o with zero throttling',
      'Maximum dedicated compute power for hard coding & research problems',
      'Full suite: Advanced Voice, DALL-E 3, Canvas, Code Interpreter & Custom GPTs',
      'Official private Pro account with full 30-day warranty and priority support'
    ],
    advantages_ar: [
      'الوصول الحصري لنموذج o1 Pro Mode لأعلى دقة تفكير وحل مسائل معقدة عالمياً',
      'استخدام غير محدود نهائياً لرسائل نموذج GPT-4o بدون أي حدود يومية',
      'تخصيص قوة معالجة حاسوبية قصوى لأبحاث البرمجة والرياضيات والهندسة',
      'الحزمة الكاملة: الوضع الصوتي المتقدم، DALL-E 3، Canvas، وتحليل البيانات',
      'حساب Pro رسمي ومفعل مع ضمان استبدال ذهبي شامل طوال 30 يوماً'
    ],
    attributes: [
      { label_en: 'o1 Pro Reasoning', label_ar: 'نموذج o1 Pro الخارق', icon: 'Sparkles', color: '#FFE600' },
      { label_en: 'Unlimited GPT-4o', label_ar: 'استخدام غير محدود', icon: 'Zap', color: '#00D2FF' },
      { label_en: 'Max Compute Power', label_ar: 'قوة معالجة قصوى', icon: 'Cpu', color: '#FF8A00' },
      { label_en: '30 Days Warranty', label_ar: 'ضمان كامل 30 يوماً', icon: 'ShieldCheck', color: '#10B981' }
    ],
    subscription_duration: '1 Month',
    warranty_duration: '1 Month',
    delivery_time: 'بعد مراجعة الدفع',
    delivery_mode: 'key',
    sold_count: 24,
    sale_ends_in: 0,
    created_at: '2026-08-23T00:00:00Z',
    updated_at: '2026-08-23T00:00:00Z'
  },
  {
    id: 'c3d4e5f6-1111-4444-8888-capcutpro1m',
    slug: 'capcut-pro-1-month',
    name: 'CapCut Pro — 1 Month Personal Account',
    name_ar: 'اشتراك كاب كات برو - شهر على إيميلك الشخصي (CapCut Pro 1 Month)',
    category: 'Subscriptions',
    market_price: 19.99,
    our_price: 4.49,
    price_egp: 239.00,
    price_sar: 17.50,
    rating: 4.84,
    reviews: 32,
    stock: 40,
    max_stock: 65,
    brand_color: '#000000',
    icon_name: 'film',
    image_url: '/images/products/capcut-pro.png',
    description: 'Official CapCut Pro 1-Month subscription activated directly on your personal email. Unlock all VIP video transitions, effects, templates, AI auto-captions, 4K 60fps export without watermark, smart stabilization, and 100GB cloud storage. Fully compatible across PC, Mac, iOS, and Android with a full 30-day replacement warranty.',
    description_ar: 'اشتراك كاب كات برو (CapCut Pro) رسمي لمدة شهر كامل مفعل على إيميلك وحسابك الشخصي مباشرة. يفتح لك كافة مؤثرات وفلاتر وانتقالات Pro المقفلة، وتصدير الفيديوهات بدقة 4K فائقة الوضوح وبمعدل 60 إطار بالثانية بدون أي علامة مائية، وأداة توليد الترجمة التلقائية بالذكاء الاصطناعي (Auto Captions)، وإزالة خلفيات الفيديو الذكية، مع مساحة تخزين سحابية 100GB. يعمل على الموبايل والكمبيوتر والماك مع ضمان استبدال 30 يوماً.',
    advantages: [
      'Official activation on your own personal email with zero sharing',
      'Export in crystal clear Ultra HD 4K 60fps & HDR with zero watermark',
      'All VIP transitions, video effects, body filters and audio enhancers',
      'AI Auto-Captions with multilingual subtitles & smart voice changer',
      '100GB cloud storage to sync and continue editing across all devices',
      'Compatible with Windows PC, MacOS, iPhone, iPad and Android'
    ],
    advantages_ar: [
      'تفعيل رسمي خاص على إيميلك الشخصي بدون أي مشاركة للحساب',
      'تصدير الفيديوهات بدقة 4K 60fps و HDR بأعلى وضوح وبدون علامة مائية',
      'فتح كافة الفلاتر والمؤثرات والانتقالات وقوالب VIP الاحترافية',
      'الترجمة التلقائية الذكية Auto-Captions ومغير الأصوات بالذكاء الاصطناعي',
      'سعة تخزين سحابية 100GB لمزامنة ومتابعة المونتاج على كافة الأجهزة',
      'متوافق مع أجهزة الكمبيوتر (Windows/Mac) وهواتف الآيفون والأندرويد'
    ],
    attributes: [
      { label_en: '4K 60fps & HDR', label_ar: 'دقة 4K 60fps و HDR', icon: 'Tv', color: '#00F0FF' },
      { label_en: 'Pro AI Video Tools', label_ar: 'أدوات ومؤثرات الذكاء', icon: 'Sparkles', color: '#FF70A6' },
      { label_en: 'Personal Email', label_ar: 'تفعيل على إيميلك', icon: 'Award', color: '#06D6A0' },
      { label_en: '30 Days Warranty', label_ar: 'ضمان كامل 30 يوماً', icon: 'ShieldCheck', color: '#10B981' }
    ],
    subscription_duration: '1 Month',
    warranty_duration: '1 Month',
    delivery_time: 'بعد مراجعة الدفع',
    delivery_mode: 'key',
    sold_count: 56,
    sale_ends_in: 0,
    created_at: '2026-08-23T00:00:00Z',
    updated_at: '2026-08-23T00:00:00Z'
  },
  {
    id: 'c3d4e5f6-2222-4444-8888-capcutpro1year',
    slug: 'capcut-pro-1-year',
    name: 'CapCut Pro — 1 Year Full Gold Warranty',
    name_ar: 'اشتراك كاب كات برو - سنة كاملة بضمان شامل (CapCut Pro 1 Year)',
    category: 'Subscriptions',
    market_price: 119.99,
    our_price: 29.99,
    price_egp: 1590.00,
    price_sar: 115.00,
    rating: 4.86,
    reviews: 21,
    stock: 22,
    max_stock: 40,
    brand_color: '#000000',
    icon_name: 'film',
    image_url: '/images/products/capcut-pro.png',
    description: 'Official 1-Year CapCut Pro subscription backed by a full 365-day gold replacement warranty. Experience complete video editing power on Desktop and Mobile: unlimited Pro AI tools, 4K exports, optical flow motion blur, camera tracking, and sound enhancements throughout the entire year.',
    description_ar: 'اشتراك كاب كات برو (CapCut Pro) رسمي لمدة سنة كاملة (12 شهراً) مع ضمان ذهبي شامل للاستبدال والدعم طوال الـ 365 يوماً. يوفر لك القوة الكاملة لإنتاج ومونتاج الفيديوهات لصناع المحتوى واليوتيوبرز: تصدير 4K 60fps، إزالة العلامة المائية، مؤثرات صوتية وبصرية حصرية، وتتبع الحركة وتنعيم الإطارات الذكي طوال العام.',
    advantages: [
      'Comprehensive 1-year gold replacement warranty covering all 365 days',
      'Unrestricted 4K 60fps rendering with zero watermarks or export limits',
      'AI Smart Cutout, Motion Tracking, Curve Speed Ramping & Color Grading',
      'Thousands of VIP sound effects, royalty-free audio tracks and stickers',
      'Seamless multi-platform editing on PC, Mac, iPad, iPhone and Android'
    ],
    advantages_ar: [
      'ضمان ذهبي شامل للاستبدال والدعم الفني طوال مدة السنة كاملة (365 يوماً)',
      'تصدير غير محدود بأعلى دقة 4K 60fps وبدون أي علامة مائية نهائياً',
      'أدوات القص الذكي، تتبع الحركة بالذكاء الاصطناعي، ومنحنيات السرعة الاحترافية',
      'آلاف المؤثرات الصوتية والموسيقى المرخصة وفلاتر الألوان السينمائية',
      'يعمل بتوافق كامل على أجهزة الكمبيوتر (PC/Mac) والموبايل والتابلت'
    ],
    attributes: [
      { label_en: '1 Year Gold Warranty', label_ar: 'ضمان ذهبي سنة كاملة', icon: 'ShieldCheck', color: '#10B981' },
      { label_en: '4K 60fps HDR', label_ar: 'دقة 4K 60fps فائقة', icon: 'Tv', color: '#00F0FF' },
      { label_en: 'All Platforms', label_ar: 'كمبيوتر وموبايل', icon: 'Globe', color: '#FF70A6' },
      { label_en: 'Zero Watermark', label_ar: 'بدون علامة مائية', icon: 'Award', color: '#FFE600' }
    ],
    subscription_duration: '1 Year',
    warranty_duration: '1 Year',
    delivery_time: 'بعد مراجعة الدفع',
    delivery_mode: 'key',
    sold_count: 31,
    sale_ends_in: 0,
    created_at: '2026-08-23T00:00:00Z',
    updated_at: '2026-08-23T00:00:00Z'
  },
  {
    id: 'd4e5f6a7-1111-4444-8888-cursorpro1m',
    slug: 'cursor-pro-1-month',
    name: 'Cursor AI Pro — 1 Month Developer Suite (Claude 3.7 & GPT-4o)',
    name_ar: 'اشتراك كورسور الذكي للمبرمجين - شهر كامل (Cursor AI Pro 1 Month)',
    category: 'Accounts',
    market_price: 40.00,
    our_price: 16.99,
    price_egp: 899.00,
    price_sar: 65.00,
    rating: 4.88,
    reviews: 25,
    stock: 28,
    max_stock: 50,
    brand_color: '#6366F1',
    icon_name: 'bot',
    image_url: '/images/products/cursor-pro.png',
    description: 'Official Cursor AI Pro 1-Month Developer Subscription. Supercharge your software development workflow with 500 fast monthly premium requests powered by Claude 3.7 Sonnet, Claude 3.5 Sonnet, and GPT-4o. Includes unlimited multi-line tab autocomplete, agentic Composer multi-file editing, full repository indexing, and terminal debugging. Backed by a full 30-day replacement warranty.',
    description_ar: 'اشتراك رسمي في محرر الأكواد الذكي Cursor AI Pro لمدة شهر كامل للمطورين والمبرمجين. يضاعف سرعتك في بناء البرمجيات عبر 500 طلب فائق السرعة شهرياً مدعوماً بنماذج Claude 3.7 Sonnet و GPT-4o، مع إكمال تلقائي ذكي غير محدود للأكواد (Tab Autocomplete)، وتعديل متعدد الملفات في المشروع بالكامل عبر وضع Composer، وفهرسة ذكية لمستودع الكود، وحل أخطاء الطرفية (Terminal Debugging) فوراً. حساب رسمي مع ضمان ذهبي 30 يوماً.',
    advantages: [
      '500 Fast Premium requests per month using Claude 3.7 Sonnet & GPT-4o',
      'Unlimited intelligent multi-line Tab code autocomplete with repository context',
      'Agentic Composer suite for multi-file generation, refactoring and terminal fixes',
      'Full codebase indexing with semantic search across files, types and functions',
      'Full VS Code extension ecosystem compatibility on Windows, MacOS and Linux',
      'Official developer account backed by a 30-day gold replacement warranty'
    ],
    advantages_ar: [
      '500 طلب سريع شهرياً بأحدث نماذج الذكاء الاصطناعي Claude 3.7 Sonnet و GPT-4o',
      'إكمال تلقائي ذكي متواصل للأكواد Tab Autocomplete يفهم سياق المشروع بالكامل',
      'وضع Composer الذكي لتوليد وتعديل أكواد عدة ملفات في وقت واحد وحل المشاكل',
      'فهرسة شاملة للمشروع بالكامل للبحث الذكي واستدعاء الدوال والأنماط المعقدة',
      'دعم كامل لكافة إضافات وثيمات VS Code على أنظمة Windows و Mac و Linux',
      'اشتراك مطورين رسمي مع ضمان استبدال شامل طوال مدة الشهر (30 يوماً)'
    ],
    attributes: [
      { label_en: 'Claude 3.7 & GPT-4o', label_ar: 'نماذج Claude 3.7 و GPT-4o', icon: 'Sparkles', color: '#6366F1' },
      { label_en: '500 Fast Requests', label_ar: '500 طلب فائق السرعة', icon: 'Zap', color: '#00D2FF' },
      { label_en: 'Agentic Composer', label_ar: 'تعديل متعدد الملفات', icon: 'Cpu', color: '#A855F7' },
      { label_en: '30 Days Warranty', label_ar: 'ضمان كامل 30 يوماً', icon: 'ShieldCheck', color: '#10B981' }
    ],
    subscription_duration: '1 Month',
    warranty_duration: '1 Month',
    delivery_time: 'بعد مراجعة الدفع',
    delivery_mode: 'key',
    sold_count: 38,
    sale_ends_in: 0,
    created_at: '2026-08-23T00:00:00Z',
    updated_at: '2026-08-23T00:00:00Z'
  },
  {
    id: 'd4e5f6a7-2222-4444-8888-cursorpro1year',
    slug: 'cursor-pro-1-year',
    name: 'Cursor AI Pro — 1 Year Full Developer Access',
    name_ar: 'اشتراك كورسور برو للمبرمجين - سنة كاملة (Cursor AI Pro 1 Year)',
    category: 'Accounts',
    market_price: 240.00,
    our_price: 89.99,
    price_egp: 4750.00,
    price_sar: 345.00,
    rating: 4.91,
    reviews: 14,
    stock: 12,
    max_stock: 20,
    brand_color: '#6366F1',
    icon_name: 'bot',
    image_url: '/images/products/cursor-pro.png',
    description: 'Annual Pro Developer License for Cursor AI. Get uninterrupted, high-speed access to next-gen coding models Claude 3.7 Sonnet & GPT-4o for a full 365 days. Build software 10x faster with unlimited Tab completions, automated multi-file diffs, and codebase intelligence. Backed by a full 1-year gold replacement warranty.',
    description_ar: 'ترخيص سنوي متكامل للمطورين في Cursor AI Pro لمدة سنة كاملة (365 يوماً). يمنحك سرعة فائقة مستمرة بالذكاء الاصطناعي مع نماذج Claude 3.7 Sonnet و GPT-4o طوال العام لبناء وتطوير المشاريع البرمجية الضخمة بأقل جهد وأعلى كفاءة، مع إكمال تلقائي غير محدود، وتعديل ومزامنة الكود عبر الوكلاء الأذكياء. ترخيص رسمي مضمون 100% مع دعم فني مستمر طوال السنة.',
    advantages: [
      'Full 1-year comprehensive gold warranty covering 365 days of continuous coding',
      '6,000 Fast Premium AI requests per year with Claude 3.7 Sonnet & GPT-4o',
      'Unlimited intelligent multi-line code prediction and autocomplete',
      'Agentic Composer workflow for full repository codebase generation and testing',
      'Priority server access with zero interruption and dedicated support'
    ],
    advantages_ar: [
      'ضمان ذهبي شامل للاستبدال والدعم الفني طوال مدة السنة كاملة (365 يوماً)',
      '6,000 طلب فائق السرعة سنوياً بأحدث نماذج الذكاء الاصطناعي Claude 3.7 و GPT-4o',
      'إكمال وتوقع تلقائي ذكي غير محدود لكتابة الأكواد مع فهم ملفات المشروع',
      'بيئة Composer للوكلاء الأذكياء لبناء ميزات برمجية كاملة وتعديل الملفات',
      'أولوية قصوى على الخوادم بدون انقطاع مع دعم فني متواصل طوال العام'
    ],
    attributes: [
      { label_en: '1 Year Full Warranty', label_ar: 'ضمان ذهبي سنة كاملة', icon: 'ShieldCheck', color: '#10B981' },
      { label_en: 'Claude 3.7 Sonnet', label_ar: 'نموذج Claude 3.7 الأحدث', icon: 'Sparkles', color: '#6366F1' },
      { label_en: 'Unlimited Autocomplete', label_ar: 'إكمال ذكي غير محدود', icon: 'Zap', color: '#00D2FF' },
      { label_en: 'Full Codebase Indexing', label_ar: 'فهرسة المشروع بالكامل', icon: 'Cpu', color: '#FFE600' }
    ],
    subscription_duration: '1 Year',
    warranty_duration: '1 Year',
    delivery_time: 'بعد مراجعة الدفع',
    delivery_mode: 'key',
    sold_count: 17,
    sale_ends_in: 0,
    created_at: '2026-08-23T00:00:00Z',
    updated_at: '2026-08-23T00:00:00Z'
  }
];

// In-memory product cache and request deduplication
let cachedProducts: LiveProductRecord[] | null = null;
let cacheExpiry = 0;
let inFlightFetchPromise: Promise<{ data: LiveProductRecord[]; error: any; warning: string | null }> | null = null;

const LOCAL_STORAGE_CACHE_KEY = 'upstore_products_cache_v4';
const CACHE_DURATION_MS = 60000; // 60 seconds cache

export async function fetchLiveProducts(
  supabase?: SupabaseClient<any, any, any> | null,
  options: { forceRefresh?: boolean } = {}
): Promise<{ data: LiveProductRecord[]; error: any; warning: string | null }> {
  const now = Date.now();
  
  // 1. Check in-memory cache
  if (!options.forceRefresh && cachedProducts && cachedProducts.length >= 1 && now < cacheExpiry) {
    return { data: cachedProducts, error: null, warning: null };
  }

  // 2. Check localStorage cache in browser for instant 0ms render
  if (!options.forceRefresh && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.data) && parsed.data.length >= 1 && parsed.expiry > now) {
          cachedProducts = parsed.data;
          cacheExpiry = parsed.expiry;
          return { data: parsed.data, error: null, warning: null };
        }
      }
    } catch {
      // Ignored
    }
  }

  if (inFlightFetchPromise) {
    return inFlightFetchPromise;
  }

  const fetchPromise = (async () => {
    // 3. Try fetching from first-party internal API endpoint (/api/products)
    if (typeof window !== 'undefined') {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch('/api/products', {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' },
          cache: 'no-store'
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.products) && json.products.length > 0) {
            const activeSlug = getActiveFlashDealSlugFromProducts(json.products);
            const normalized = json.products.map((p: any) => normalizeProductRecord(p, activeSlug));
            cachedProducts = normalized;
            cacheExpiry = Date.now() + CACHE_DURATION_MS;

            try {
              localStorage.setItem(
                LOCAL_STORAGE_CACHE_KEY,
                JSON.stringify({ data: normalized, expiry: cacheExpiry })
              );
            } catch {}

            return {
              data: normalized,
              error: null,
              warning: null,
            };
          }
        }
      } catch (apiErr) {
        // Fallback to direct Supabase or Master Catalog
        console.warn('[fetchLiveProducts] Internal API call notice, attempting Supabase/Master fallback:', apiErr);
      }
    }

    // 4. Try direct Supabase query if client is available
    if (supabase) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const orderedResult = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        clearTimeout(timeoutId);

        if (!orderedResult.error && orderedResult.data && orderedResult.data.length > 0) {
          const rawData = orderedResult.data;
          const activeSlug = getActiveFlashDealSlugFromProducts(rawData);
          const normalized = rawData.map(p => normalizeProductRecord(p, activeSlug));

          cachedProducts = normalized;
          cacheExpiry = Date.now() + CACHE_DURATION_MS;

          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(
                LOCAL_STORAGE_CACHE_KEY,
                JSON.stringify({ data: normalized, expiry: cacheExpiry })
              );
            } catch {}
          }

          return {
            data: normalized,
            error: null,
            warning: null,
          };
        }
      } catch (supErr) {
        console.warn('[fetchLiveProducts] Supabase direct query notice, applying master catalog:', supErr);
      }
    }

    // 5. Ultimate 100% resilient fallback to Master Catalog
    cachedProducts = MASTER_UPSTORE_CATALOG;
    cacheExpiry = Date.now() + CACHE_DURATION_MS;
    return {
      data: MASTER_UPSTORE_CATALOG,
      error: null,
      warning: 'Fallback master catalog active',
    };
  })();

  inFlightFetchPromise = fetchPromise;
  fetchPromise.finally(() => {
    inFlightFetchPromise = null;
  });
  return fetchPromise;
}
export function normalizeProductVariant(
  input: Partial<ProductVariant> | null | undefined
): ProductVariant {
  return {
    id: toText(input?.id),
    product_id: toText(input?.product_id),
    name: toText(input?.name, 'Untitled Option'),
    name_ar: toText(input?.name_ar),
    image_url: toText(input?.image_url),
    market_price: toNumber(input?.market_price),
    our_price: toNumber(input?.our_price),
    price_egp: toNumber(input?.price_egp),
    price_sar: toNumber(input?.price_sar),
    subscription_duration: toText(input?.subscription_duration, '1 Month'),
    quality: toText(input?.quality),
    stock: toNumber(input?.stock, 0),
    max_stock: Math.max(toNumber(input?.max_stock, 100), 0),
    status: (input?.status === 'draft' ? 'draft' : 'active') as 'active' | 'draft',
    sort_order: toNumber(input?.sort_order, 0),
    zelenka_product_id: toText(input?.zelenka_product_id),
    created_at: typeof input?.created_at === 'string' ? input.created_at : undefined,
  };
}
