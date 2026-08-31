import { NextResponse } from 'next/server';
import { requireAdminUser, enforceSameOriginRequest, buildSafeStorageObjectName } from '@/utils/security';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(req: Request) {
  try {
    const originError = await enforceSameOriginRequest(req);
    if (originError) return originError;

    const auth = await requireAdminUser();
    if (auth.error) {
      return auth.error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { imageUrl, productId }: { imageUrl: string; productId?: string } = await req.json();

    if (!imageUrl || !imageUrl.trim()) {
      return NextResponse.json({ error: 'Image URL is required.' }, { status: 400 });
    }

    const cleanImgUrl = imageUrl.trim();

    // 1. If it's already a Supabase Storage URL or local URL, update DB directly if productId is set
    if (cleanImgUrl.includes('supabase.co') || cleanImgUrl.startsWith('/')) {
      if (productId) {
        await supabase
          .from('products')
          .update({ image_url: cleanImgUrl, updated_at: new Date().toISOString() })
          .eq('id', productId);
      }
      return NextResponse.json({ success: true, url: cleanImgUrl, storedLocally: true });
    }

    // 2. Fetch remote image with robust headers and 8-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let imageRes: Response;
    try {
      imageRes = await fetch(cleanImgUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Referer': new URL(cleanImgUrl).origin,
        },
      });
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn('[Import Image] Fetch error, updating direct URL:', err.message);
      if (productId) {
        await supabase
          .from('products')
          .update({ image_url: cleanImgUrl, updated_at: new Date().toISOString() })
          .eq('id', productId);
      }
      return NextResponse.json({
        success: true,
        url: cleanImgUrl,
        storedLocally: false,
        warning: 'Fallback to direct URL due to fetch timeout.',
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!imageRes.ok) {
      if (productId) {
        await supabase
          .from('products')
          .update({ image_url: cleanImgUrl, updated_at: new Date().toISOString() })
          .eq('id', productId);
      }
      return NextResponse.json({
        success: true,
        url: cleanImgUrl,
        storedLocally: false,
        warning: `Remote server returned HTTP ${imageRes.status}`,
      });
    }

    const contentType = imageRes.headers.get('content-type') || 'image/png';
    const arrayBuffer = await imageRes.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Determine extension (force PNG/WebP if possible)
    let ext = 'png';
    if (contentType.includes('webp')) ext = 'webp';
    else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg';

    const fileName = buildSafeStorageObjectName(productId || 'product-img', ext);
    const filePath = `products/${fileName}`;

    // 3. Upload buffer directly into Supabase Storage 'product-images' bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, buffer, {
        contentType: ext === 'png' ? 'image/png' : contentType,
        cacheControl: '31536000, public, immutable',
        upsert: true,
      });

    if (uploadError) {
      console.warn('[Import Image] Storage upload error:', uploadError.message);
      if (productId) {
        await supabase
          .from('products')
          .update({ image_url: cleanImgUrl, updated_at: new Date().toISOString() })
          .eq('id', productId);
      }
      return NextResponse.json({
        success: true,
        url: cleanImgUrl,
        storedLocally: false,
        warning: uploadError.message,
      });
    }

    // 4. Retrieve permanent public URL from Supabase Storage
    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(uploadData.path);

    const publicUrl = publicUrlData.publicUrl;

    // 5. Update product in DB immediately
    if (productId) {
      await supabase
        .from('products')
        .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', productId);
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      storedLocally: true,
      originalUrl: cleanImgUrl,
    });
  } catch (error: any) {
    console.error('[Import Image Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import image to store storage.' },
      { status: 500 }
    );
  }
}
