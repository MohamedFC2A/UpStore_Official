import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  buildSafeStorageObjectName,
  enforceSameOriginRequest,
  requireAdminUser,
} from '@/utils/security';

export async function POST(request: NextRequest) {
  try {
    const originError = await enforceSameOriginRequest(request);
    if (originError) {
      return originError;
    }

    const auth = await requireAdminUser();
    if (auth.error) {
      return auth.error;
    }
    const supabase = auth.supabase ?? await createClient();

    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const productId = formData.get('productId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PNG, JPG, WebP, GIF' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size: 5MB' },
        { status: 400 }
      );
    }

    // Generate a unique filename
    const ext = file.name.split('.').pop() || 'png';
    const fileName = buildSafeStorageObjectName(productId || 'product', ext);
    const filePath = `products/${fileName}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '31536000, public, immutable',
        upsert: true,
      });

    if (uploadError) {
      // If bucket doesn't exist, try to create it
      if (uploadError.message?.includes('not found') || uploadError.message?.includes('Bucket')) {
        return NextResponse.json(
          { 
            error: 'Storage bucket "product-images" not found. Please create it in Supabase Dashboard.',
            details: 'Bucket configuration error' 
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: `Upload failed due to a server error.` },
        { status: 500 }
      );
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(uploadData.path);

    const publicUrl = publicUrlData.publicUrl;

    // If productId is provided, update the product record
    if (productId) {
      await supabase
        .from('products')
        .update({ image_url: publicUrl })
        .eq('id', productId);
    }

    return NextResponse.json({ url: publicUrl });
  } catch (error: any) {
    console.error('Image upload error');
    return NextResponse.json(
      { error: `An internal server error occurred.` },
      { status: 500 }
    );
  }
}
