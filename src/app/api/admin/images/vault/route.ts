import { NextResponse } from 'next/server';
import { requireAdminUser, enforceSameOriginRequest } from '@/utils/security';
import { createAdminClient } from '@/utils/supabase/admin';
import fs from 'fs';
import path from 'path';

export interface VaultImageItem {
  id: string;
  name: string;
  url: string;
  size?: number;
  createdAt: string;
  updatedAt?: string | null;
  isLocalAsset?: boolean;
  linkedProducts: {
    id: string;
    name: string;
    name_ar?: string;
    slug?: string;
  }[];
}

function extractBaseFileName(urlOrPath: string): string {
  if (!urlOrPath) return '';
  const clean = urlOrPath.split('?')[0];
  const parts = clean.split('/');
  return parts[parts.length - 1].toLowerCase().trim();
}

// ─── GET: List all images in Supabase Storage & local assets with accurate usage mapping ─
export async function GET(req: Request) {
  try {
    const originError = await enforceSameOriginRequest(req);
    if (originError) return originError;

    const auth = await requireAdminUser();
    if (auth.error || !auth.supabase) {
      return auth.error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Fetch all products to track image usage
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, name, name_ar, slug, image_url');

    const productList = products || [];

    // Helper to accurately find linked products for an exact file
    const getLinkedProducts = (fileBaseName: string, fullUrl: string) => {
      const base = extractBaseFileName(fileBaseName);
      if (!base || base.length < 3 || base === 'products') return [];

      return productList
        .filter((p) => {
          if (!p.image_url) return false;
          const pBase = extractBaseFileName(p.image_url);
          return pBase === base || p.image_url === fullUrl;
        })
        .map((p) => ({
          id: p.id,
          name: p.name || 'Product',
          name_ar: p.name_ar,
          slug: p.slug,
        }));
    };

    const vaultImages: VaultImageItem[] = [];
    const addedUrls = new Set<string>();

    // 2. List all files from 'products' directory in 'product-images' bucket
    const { data: subFolderFiles } = await supabaseAdmin.storage
      .from('product-images')
      .list('products', {
        limit: 250,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (subFolderFiles && Array.isArray(subFolderFiles)) {
      for (const file of subFolderFiles) {
        if (!file.name || file.name === '.emptyFolderPlaceholder' || !file.name.includes('.')) continue;
        if (file.name.toLowerCase().endsWith('.svg')) continue;

        const storagePath = `products/${file.name}`;
        const { data: publicUrlData } = supabaseAdmin.storage
          .from('product-images')
          .getPublicUrl(storagePath);

        const publicUrl = publicUrlData.publicUrl;
        if (addedUrls.has(publicUrl)) continue;
        addedUrls.add(publicUrl);

        const linked = getLinkedProducts(file.name, publicUrl);

        vaultImages.push({
          id: file.id || storagePath,
          name: file.name,
          url: publicUrl,
          size: file.metadata?.size || 0,
          createdAt: file.created_at || new Date().toISOString(),
          updatedAt: file.updated_at || undefined,
          isLocalAsset: false,
          linkedProducts: linked,
        });
      }
    }

    // 3. List any root-level files in 'product-images' bucket
    const { data: rootFiles } = await supabaseAdmin.storage
      .from('product-images')
      .list('', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (rootFiles && Array.isArray(rootFiles)) {
      for (const file of rootFiles) {
        // Skip folders like 'products' or entries without a file extension
        if (!file.name || file.name === 'products' || file.name === '.emptyFolderPlaceholder' || !file.name.includes('.')) continue;
        if (file.name.toLowerCase().endsWith('.svg')) continue;

        const { data: publicUrlData } = supabaseAdmin.storage
          .from('product-images')
          .getPublicUrl(file.name);

        const publicUrl = publicUrlData.publicUrl;
        if (addedUrls.has(publicUrl)) continue;
        addedUrls.add(publicUrl);

        const linked = getLinkedProducts(file.name, publicUrl);

        vaultImages.push({
          id: file.id || file.name,
          name: file.name,
          url: publicUrl,
          size: file.metadata?.size || 0,
          createdAt: file.created_at || new Date().toISOString(),
          updatedAt: file.updated_at || undefined,
          isLocalAsset: false,
          linkedProducts: linked,
        });
      }
    }

    // 4. Include local PNG assets from public/images/products (PNG / WebP only)
    try {
      const localDir = path.join(process.cwd(), 'public', 'images', 'products');
      if (fs.existsSync(localDir)) {
        const localFiles = fs.readdirSync(localDir);
        for (const file of localFiles) {
          if (!file.toLowerCase().endsWith('.png') && !file.toLowerCase().endsWith('.webp')) continue;
          const localUrl = `/images/products/${file}`;
          if (addedUrls.has(localUrl)) continue;
          addedUrls.add(localUrl);

          const linked = getLinkedProducts(file, localUrl);
          let fileSize = 0;
          try {
            fileSize = fs.statSync(path.join(localDir, file)).size;
          } catch {}

          vaultImages.push({
            id: `local-${file}`,
            name: file,
            url: localUrl,
            size: fileSize,
            createdAt: new Date().toISOString(),
            isLocalAsset: true,
            linkedProducts: linked,
          });
        }
      }
    } catch (localErr) {
      console.warn('[Vault GET local assets notice]:', localErr);
    }

    return NextResponse.json({
      images: vaultImages,
      totalCount: vaultImages.length,
    });
  } catch (error: any) {
    console.error('[Vault Images GET Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list vault images.' },
      { status: 500 }
    );
  }
}

// ─── DELETE: Clean root-level deletion for both Supabase Storage & local assets ─
export async function DELETE(req: Request) {
  try {
    const originError = await enforceSameOriginRequest(req);
    if (originError) return originError;

    const auth = await requireAdminUser();
    if (auth.error || !auth.supabase) {
      return auth.error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileName, url, force }: { fileName?: string; url?: string; force?: boolean } =
      await req.json();

    const rawTarget = (fileName || url || '').trim();
    const cleanBaseName = extractBaseFileName(rawTarget);

    if (!cleanBaseName || cleanBaseName === 'products') {
      return NextResponse.json({ error: 'Valid file name is required for deletion.' }, { status: 400 });
    }

    const isLocal = rawTarget.startsWith('local-') || url?.startsWith('/images/products/');
    const supabaseAdmin = createAdminClient();

    // 1. Fetch all products to find exact links
    const { data: allProds } = await supabaseAdmin
      .from('products')
      .select('id, name, name_ar, image_url');

    const linkedProds = (allProds || []).filter((p) => {
      if (!p.image_url) return false;
      return extractBaseFileName(p.image_url) === cleanBaseName || p.image_url === url;
    });

    if (linkedProds.length > 0 && !force) {
      return NextResponse.json({
        warning: true,
        linkedCount: linkedProds.length,
        linkedProducts: linkedProds.map((p) => p.name_ar || p.name),
        message: `هذه الصورة مرتبطة بـ ${linkedProds.length} منتج (${linkedProds.map((p) => p.name_ar || p.name).join(', ')}). هل أنت متأكد من حذفها؟`,
      });
    }

    // 2. Perform deletion
    if (isLocal) {
      // Local asset deletion
      const localFilePath = path.join(process.cwd(), 'public', 'images', 'products', cleanBaseName);
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    } else {
      // Supabase Storage deletion
      const { error: delErr } = await supabaseAdmin.storage
        .from('product-images')
        .remove([
          `products/${cleanBaseName}`,
          cleanBaseName,
          rawTarget.replace('products/', ''),
        ]);

      if (delErr) {
        console.warn('[Storage Delete Notice]:', delErr.message);
      }
    }

    // 3. If products were using this URL and deletion is forced, reset their image_url
    if (linkedProds.length > 0 && force) {
      for (const prod of linkedProds) {
        await supabaseAdmin
          .from('products')
          .update({ image_url: null, updated_at: new Date().toISOString() })
          .eq('id', prod.id);
      }
    }

    return NextResponse.json({
      success: true,
      deletedFile: cleanBaseName,
      unlinkedProductsCount: linkedProds.length,
    });
  } catch (error: any) {
    console.error('[Vault Images DELETE Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete image from vault.' },
      { status: 500 }
    );
  }
}
