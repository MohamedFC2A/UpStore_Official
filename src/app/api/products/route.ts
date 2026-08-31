import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { normalizeProductRecord, getActiveFlashDealSlugFromProducts, MASTER_UPSTORE_CATALOG } from '@/utils/products';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // 60 seconds edge cache

let memoryCache: any[] | null = null;
let memoryCacheExpiry = 0;

export async function GET(req: Request) {
  const now = Date.now();
  const { searchParams } = new URL(req.url);
  const forceRefresh = searchParams.get('refresh') === 'true';

  // 1. Instant Sub-Millisecond In-Memory Return (<0.1ms)
  if (!forceRefresh && memoryCache && memoryCache.length >= 1 && now < memoryCacheExpiry) {
    return NextResponse.json(
      {
        success: true,
        count: memoryCache.length,
        products: memoryCache,
        source: 'memory_cache'
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          'X-Cache-Status': 'HIT_MEMORY',
        }
      }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const isPlaceholder = !supabaseUrl || supabaseUrl.includes('placeholder-url.supabase.co');

  if (isPlaceholder) {
    return NextResponse.json(
      {
        success: true,
        count: MASTER_UPSTORE_CATALOG.length,
        products: MASTER_UPSTORE_CATALOG,
        source: 'master_catalog_default'
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        }
      }
    );
  }

  try {
    const supabase = createAdminClient();

    // 2. High-speed query with hard 2.0-second timeout guard
    const queryPromise = supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: new Error('DB_TIMEOUT_FALLBACK') }), 2000)
    );

    const { data: rawData, error } = await Promise.race([queryPromise, timeoutPromise]);

    if (error || !rawData || rawData.length === 0) {
      if (memoryCache && memoryCache.length > 0) {
        return NextResponse.json(
          {
            success: true,
            count: memoryCache.length,
            products: memoryCache,
            source: 'memory_cache_fallback'
          },
          {
            headers: {
              'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
            }
          }
        );
      }

      return NextResponse.json(
        {
          success: true,
          count: MASTER_UPSTORE_CATALOG.length,
          products: MASTER_UPSTORE_CATALOG,
          source: 'master_catalog_fallback'
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          }
        }
      );
    }

    const activeSlug = getActiveFlashDealSlugFromProducts(rawData);
    const normalized = rawData.map(p => normalizeProductRecord(p, activeSlug));

    memoryCache = normalized;
    memoryCacheExpiry = now + 180000; // 3 minutes server memory cache

    return NextResponse.json(
      {
        success: true,
        count: normalized.length,
        products: normalized,
        source: 'database_live'
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          'X-Cache-Status': 'MISS_DB_FETCHED',
        }
      }
    );
  } catch (err: any) {
    console.error('[API /api/products] Exception:', err?.message);
    return NextResponse.json({
      success: true,
      count: memoryCache?.length || MASTER_UPSTORE_CATALOG.length,
      products: memoryCache || MASTER_UPSTORE_CATALOG,
      source: 'master_catalog_exception_fallback'
    });
  }
}

