import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const supabasePublic = createClient(supabaseUrl, supabaseAnonKey);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://upstore.one';
  const now = new Date();

  // 1. Static Core Canonical Pages (Clean 200 OK URLs Only — No Query Strings)
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/browse`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/worldcup`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/refund`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // 2. Dynamic Product Canonical Pages from Database + Master Catalog
  const knownSlugs = new Set<string>([
    'gemini-advanced-18-months',
    'canva-pro-1-year',
    'canva-pro-lifetime',
    'chatgpt-plus-1-month',
    'chatgpt-pro-1-month',
    'capcut-pro-1-month',
    'capcut-pro-1-year',
    'cursor-pro-1-month',
    'cursor-pro-1-year',
  ]);

  const productDateMap = new Map<string, Date>();

  const isPlaceholder = supabaseUrl.includes('placeholder-url.supabase.co');

  if (!isPlaceholder) {
    try {
      const { data: products } = await supabasePublic
        .from('products')
        .select('slug, updated_at, created_at')
        .order('created_at', { ascending: false });

      if (products && products.length > 0) {
        products.forEach((p) => {
          if (p.slug) {
            knownSlugs.add(p.slug);
            const date = p.updated_at
              ? new Date(p.updated_at)
              : p.created_at
              ? new Date(p.created_at)
              : now;
            productDateMap.set(p.slug, date);
          }
        });
      }
    } catch (error) {
      console.error('Error fetching dynamic sitemap products:', error);
    }
  }

  const dynamicProductRoutes: MetadataRoute.Sitemap = Array.from(knownSlugs).map((slug) => {
    const lastMod = productDateMap.get(slug) || now;
    return {
      url: `${baseUrl}/product/${slug}`,
      lastModified: lastMod,
      changeFrequency: 'daily',
      priority: 0.95,
    };
  });

  return [...staticRoutes, ...dynamicProductRoutes];
}
