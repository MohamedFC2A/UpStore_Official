import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireAdminUser } from '@/utils/security';
import { generateSmartProductAdvantages, generateSmartProductAttributes } from '@/utils/products';

export async function POST(req: Request) {
  try {
    const auth = await requireAdminUser();
    if (auth.error) {
      return auth.error;
    }

    const body = await req.json();
    const {
      id,
      name,
      name_ar,
      slug,
      category,
      image_url,
      our_price,
      market_price,
      price_egp,
      price_sar,
      stock,
      max_stock,
      description,
      description_ar,
      advantages,
      advantages_ar,
      attributes,
      subscription_duration,
      warranty_duration,
      delivery_time,
      delivery_mode,
      is_flash_deal,
      flash_deal_price,
      flash_deal_duration_hours,
    } = body;

    const supabase = createAdminClient();

    // Quick Direct Image Auto-Save for existing product
    if (id && image_url !== undefined && !name_ar && !name && our_price === undefined) {
      const { data: updatedProd, error: updateErr } = await supabase
        .from('products')
        .update({ image_url: image_url || null, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (updateErr) throw new Error(updateErr.message);
      return NextResponse.json({ success: true, product: updatedProd, autoSavedImage: true });
    }

    const finalNameAr = (name_ar || name || '').trim();
    if (!finalNameAr) {
      return NextResponse.json({ error: 'اسم المنتج مطلوب (Product name is required)' }, { status: 400 });
    }

    // 1. Resolve English Name and Slug
    let enName = (name || '').trim();
    if (!enName) {
      const lower = finalNameAr.toLowerCase();
      if (lower.includes('جيمناي') || lower.includes('gemini')) enName = 'Google Gemini Advanced';
      else if (lower.includes('نتفليكس') || lower.includes('netflix')) enName = 'Netflix Premium 4K';
      else if (lower.includes('شات') || lower.includes('chatgpt')) enName = 'ChatGPT Plus';
      else if (lower.includes('كانفا') || lower.includes('canva')) enName = 'Canva Pro';
      else if (lower.includes('سبوتيفاي') || lower.includes('spotify')) enName = 'Spotify Premium';
      else if (lower.includes('ديسكورد') || lower.includes('discord')) enName = 'Discord Nitro';
      else if (lower.includes('ويندوز') || lower.includes('windows')) enName = 'Windows 11 Pro Retail';
      else if (lower.includes('يوتيوب') || lower.includes('youtube')) enName = 'YouTube Premium';
      else if (lower.includes('اوفيس') || lower.includes('office')) enName = 'Microsoft Office 365 Pro';
      else if (lower.includes('نورد') || lower.includes('nordvpn')) enName = 'NordVPN';
      else if (lower.includes('شاهد') || lower.includes('shahid')) enName = 'Shahid VIP';
      else if (lower.includes('بلايستيشن') || lower.includes('playstation') || lower.includes('psn')) enName = 'PlayStation Plus';
      else if (lower.includes('جيم باس') || lower.includes('game pass') || lower.includes('xbox')) enName = 'Xbox Game Pass Ultimate';
      else {
        const englishChars = finalNameAr.replace(/[\u0600-\u06FF]+/g, '').trim();
        enName = englishChars || `Product ${Date.now().toString().slice(-4)}`;
      }
    }

    let targetSlug = (slug || enName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `product-${Date.now().toString().slice(-4)}`;

    // Ensure unique slug for new products
    if (!id) {
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('slug', targetSlug)
        .maybeSingle();

      if (existing) {
        targetSlug = `${targetSlug}-${Date.now().toString().slice(-4)}`;
      }
    }

    // 2. Pricing & Currency calculations
    const validPrice = Number(our_price) || 9.99;
    const validMarketPrice = Number(market_price) || Math.round(validPrice * 3.5 * 100) / 100;
    const autoPriceEgp = price_egp !== undefined && price_egp !== null ? Number(price_egp) : Math.ceil(validPrice * 53);
    const autoPriceSar = price_sar !== undefined && price_sar !== null ? Number(price_sar) : Math.ceil(validPrice * 4);
    
    // Secret 70% discount from real market price for Flash Deals
    const isFlash = Boolean(is_flash_deal);
    const autoFlashPrice = isFlash
      ? (flash_deal_price ? Number(flash_deal_price) : Math.round(validMarketPrice * 0.30 * 100) / 100)
      : null;

    // 3. Brand Color and Icon determination
    const getBrandColor = (n: string, cat: string) => {
      const lower = (n || '').toLowerCase();
      if (lower.includes('chatgpt') || lower.includes('openai')) return '#10A37F';
      if (lower.includes('gemini') || lower.includes('google')) return '#4285F4';
      if (lower.includes('claude') || lower.includes('anthropic')) return '#D97706';
      if (lower.includes('netflix')) return '#E50914';
      if (lower.includes('spotify')) return '#1DB954';
      if (lower.includes('youtube')) return '#FF0000';
      if (lower.includes('canva')) return '#00C4CC';
      if (lower.includes('discord')) return '#5865F2';
      if (lower.includes('nordvpn') || lower.includes('vpn')) return '#4687FF';
      if (lower.includes('game') || lower.includes('xbox')) return '#107C10';
      if (cat === 'Software') return '#0078D4';
      return '#FFE600';
    };

    const getIconName = (n: string, cat: string) => {
      const lower = (n || '').toLowerCase();
      if (lower.includes('chatgpt') || lower.includes('gemini') || lower.includes('claude') || lower.includes('ai') || cat === 'Accounts') return 'Bot';
      if (lower.includes('netflix') || lower.includes('youtube') || lower.includes('tv') || lower.includes('stream')) return 'Tv';
      if (lower.includes('spotify') || lower.includes('music')) return 'Headphones';
      if (lower.includes('vpn') || lower.includes('security') || cat === 'VPNs & Security') return 'ShieldCheck';
      if (lower.includes('game') || lower.includes('xbox') || lower.includes('playstation') || cat === 'Game Keys') return 'Gamepad2';
      if (lower.includes('canva') || lower.includes('design')) return 'Palette';
      return 'Sparkles';
    };

    const brandColor = getBrandColor(enName, category || 'Subscriptions');
    const iconName = getIconName(enName, category || 'Subscriptions');

    // 4. Descriptions
    let finalDescEn = (description || '').trim();
    let finalDescAr = (description_ar || '').trim();
    if (!finalDescAr) {
      finalDescAr = `اشتراك ${finalNameAr} أصلي ومضمون مع دفع عالمي معتمد وضمان شامل طوال مدة الاشتراك.`;
    }
    if (!finalDescEn) {
      finalDescEn = `Official ${enName} subscription with global secure checkout and full warranty.`;
    }

    // 5. Smart Advantages and Attributes
    let finalAdv = {
      advantages: Array.isArray(advantages) && advantages.length > 0 ? advantages : [],
      advantages_ar: Array.isArray(advantages_ar) && advantages_ar.length > 0 ? advantages_ar : [],
    };

    if (finalAdv.advantages_ar.length === 0 || (finalAdv.advantages_ar.length <= 3 && finalAdv.advantages_ar.some((a: string) => a.includes('تسليم سريع') || a.includes('تسليم فوري وتلقائي')))) {
      finalAdv = generateSmartProductAdvantages({
        name: enName,
        name_ar: finalNameAr,
        category: category || 'Subscriptions',
        description: finalDescEn,
        description_ar: finalDescAr,
        subscription_duration: subscription_duration || '1 Month',
        warranty_duration: warranty_duration || subscription_duration || '1 Month',
      });
    }

    let finalAttrs = Array.isArray(attributes) && attributes.length > 0 ? attributes : [];
    if (finalAttrs.length === 0) {
      finalAttrs = generateSmartProductAttributes({
        name: enName,
        name_ar: finalNameAr,
        category: category || 'Subscriptions',
        description: finalDescEn,
        subscription_duration: subscription_duration || '1 Month',
        warranty_duration: warranty_duration || subscription_duration || '1 Month',
      });
    }

    const finalWarranty = warranty_duration && warranty_duration !== '30 Days'
      ? warranty_duration
      : (subscription_duration || warranty_duration || '1 Month');

    const productData: any = {
      name: enName,
      name_ar: finalNameAr,
      slug: targetSlug,
      category: category || 'Subscriptions',
      brand_color: brandColor,
      icon_name: iconName,
      image_url: image_url?.trim() || null,
      our_price: validPrice,
      market_price: validMarketPrice,
      price_egp: autoPriceEgp,
      price_sar: autoPriceSar,
      stock: Number(stock) ?? 50,
      max_stock: Number(max_stock) || 100,
      description: finalDescEn,
      description_ar: finalDescAr,
      advantages: finalAdv.advantages,
      advantages_ar: finalAdv.advantages_ar,
      attributes: finalAttrs,
      subscription_duration: subscription_duration || '1 Month',
      warranty_duration: finalWarranty,
      delivery_time: delivery_time || 'Instant',
      delivery_mode: delivery_mode || 'key',
      is_flash_deal: isFlash,
      flash_deal_price: autoFlashPrice,
      flash_deal_duration_hours: Number(flash_deal_duration_hours) || 12,
      updated_at: new Date().toISOString(),
    };

    let resultData;
    if (id) {
      const { data, error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      resultData = data;
    } else {
      productData.sold_count = 0;
      productData.rating = 5.0;
      productData.reviews = 0;

      const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();

      if (error) throw error;
      resultData = data;
    }

    return NextResponse.json({ success: true, product: resultData });
  } catch (error: any) {
    console.error('[Admin Product Save Error]:', error);
    return NextResponse.json(
      { error: error.message || 'حدث خطأ أثناء حفظ المنتج' },
      { status: 500 }
    );
  }
}
