import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

const BUYER_NAMES = [
  'أحمد م.', 'محمد ع.', 'عبد الرحمن ك.', 'يوسف خ.', 'عمر ح.', 'مصطفى ش.', 
  'خالد س.', 'علي ن.', 'إبراهيم ط.', 'حسن ف.', 'عبد الله ق.', 'سعود د.', 
  'فهد ر.', 'فيصل ع.', 'سلمان م.', 'كريم ش.', 'طارق ي.', 'ياسين ن.', 
  'هاني م.', 'شريف ع.', 'خليل ب.', 'محمود ص.', 'زياد ت.'
];

const BUYER_LOCATIONS_AR = [
  { city: 'الرياض', country: 'السعودية', flag: 'SA' },
  { city: 'جدة', country: 'السعودية', flag: 'SA' },
  { city: 'الدمام', country: 'السعودية', flag: 'SA' },
  { city: 'مكة المكرمة', country: 'السعودية', flag: 'SA' },
  { city: 'دبي', country: 'الإمارات', flag: 'AE' },
  { city: 'أبوظبي', country: 'الإمارات', flag: 'AE' },
  { city: 'الشارقة', country: 'الإمارات', flag: 'AE' },
  { city: 'الكويت', country: 'الكويت', flag: 'KW' },
  { city: 'الدوحة', country: 'قطر', flag: 'QA' },
  { city: 'المنامة', country: 'البحرين', flag: 'BH' },
  { city: 'مسقط', country: 'عمان', flag: 'OM' },
  { city: 'القاهرة', country: 'مصر', flag: 'EG' },
  { city: 'الإسكندرية', country: 'مصر', flag: 'EG' }
];

const BUYER_LOCATIONS_EN = [
  { city: 'Riyadh', country: 'Saudi Arabia', flag: 'SA' },
  { city: 'Jeddah', country: 'Saudi Arabia', flag: 'SA' },
  { city: 'Dammam', country: 'Saudi Arabia', flag: 'SA' },
  { city: 'Dubai', country: 'UAE', flag: 'AE' },
  { city: 'Abu Dhabi', country: 'UAE', flag: 'AE' },
  { city: 'Kuwait City', country: 'Kuwait', flag: 'KW' },
  { city: 'Doha', country: 'Qatar', flag: 'QA' },
  { city: 'Manama', country: 'Bahrain', flag: 'BH' },
  { city: 'Muscat', country: 'Oman', flag: 'OM' },
  { city: 'Cairo', country: 'Egypt', flag: 'EG' },
  { city: 'Alexandria', country: 'Egypt', flag: 'EG' }
];

async function executeTrigger() {
  const supabaseAdmin = createAdminClient();

  // 1. Minimum interval check (prevent flood — at least 45 seconds between triggers)
  const { data: lastSales } = await supabaseAdmin
    .from('live_sales')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1);

  if (lastSales && lastSales.length > 0) {
    const lastSaleTime = new Date(lastSales[0].created_at).getTime();
    const now = Date.now();
    if (now - lastSaleTime < 45000) {
      return { status: 'ignored', reason: 'Throttle active' };
    }
  }

  // 2. Fetch healthy in-stock products only
  const { data: products, error: prodError } = await supabaseAdmin
    .from('products')
    .select('id, name, name_ar, our_price, price_egp, price_sar, stock, reviews, sold_count, slug, image_url, category')
    .gt('stock', 0);

  if (prodError || !products || products.length === 0) {
    return { status: 'ignored', reason: 'No in-stock products' };
  }

  // 3. Intelligent selection: prioritize featured & high-stock products
  const scoredProducts = products.map((p) => {
    let weight = 1;
    if (p.stock > 10) weight += 2;
    if (p.image_url) weight += 2;
    const nameLower = (p.name || '').toLowerCase();
    if (nameLower.includes('netflix') || nameLower.includes('chatgpt') || nameLower.includes('spotify') || nameLower.includes('office') || nameLower.includes('nordvpn')) {
      weight += 3;
    }
    return { product: p, weight };
  });

  const totalWeight = scoredProducts.reduce((acc, sp) => acc + sp.weight, 0);
  let randomVal = Math.random() * totalWeight;
  let selected = scoredProducts[0].product;

  for (const sp of scoredProducts) {
    if (randomVal < sp.weight) {
      selected = sp.product;
      break;
    }
    randomVal -= sp.weight;
  }

  // 4. Generate realistic buyer and location
  const buyerName = BUYER_NAMES[Math.floor(Math.random() * BUYER_NAMES.length)];
  const locationIdx = Math.floor(Math.random() * BUYER_LOCATIONS_AR.length);
  const locAr = BUYER_LOCATIONS_AR[locationIdx];
  const locEn = BUYER_LOCATIONS_EN[Math.min(locationIdx, BUYER_LOCATIONS_EN.length - 1)];

  // 5. Insert activity record into live_sales table
  const { data: insertedSale, error: insertError } = await supabaseAdmin
    .from('live_sales')
    .insert({
      product_id: selected.id,
      buyer_name: buyerName,
      buyer_city_ar: locAr.city,
      buyer_country_ar: locAr.country,
      buyer_city_en: locEn.city,
      buyer_country_en: locEn.country
    })
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }

  // 6. SAFE UPDATE: ONLY increment sold_count/reviews — NEVER decrement real stock!
  // This guarantees stock is never depleted erroneously.
  const newSoldCount = Number(selected.sold_count || 0) + 1;

  await supabaseAdmin
    .from('products')
    .update({
      sold_count: newSoldCount
    })
    .eq('id', selected.id);

  return {
    status: 'triggered',
    sale: insertedSale,
    product: {
      id: selected.id,
      name: selected.name,
      name_ar: selected.name_ar,
      slug: selected.slug,
      image_url: selected.image_url,
      our_price: selected.our_price
    }
  };
}

export async function GET() {
  try {
    const result = await executeTrigger();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in live-sale trigger GET:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await executeTrigger();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in live-sale trigger POST:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
