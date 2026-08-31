import type { Metadata } from 'next';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { normalizeProductRecord } from '@/utils/products';
import ProductDetailClient from './ProductDetailClient';

export const revalidate = 60;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const supabasePublic = createSupabaseClient(supabaseUrl, supabaseAnonKey);

export async function generateStaticParams() {
  const defaultSlugs = [
    { slug: 'gemini-advanced-18-months' },
    { slug: 'canva-pro-1-year' },
    { slug: 'canva-pro-lifetime' },
    { slug: 'chatgpt-plus-1-month' },
    { slug: 'chatgpt-pro-1-month' },
    { slug: 'capcut-pro-1-month' },
    { slug: 'capcut-pro-1-year' },
    { slug: 'cursor-pro-1-month' },
    { slug: 'cursor-pro-1-year' },
  ];
  try {
    const { data } = await supabasePublic
      .from('products')
      .select('slug');
    if (data && data.length > 0) {
      const set = new Set(defaultSlugs.map(s => s.slug));
      data.forEach(p => {
        if (p.slug) set.add(p.slug);
      });
      return Array.from(set).map(slug => ({ slug }));
    }
  } catch (e) {
    console.error('generateStaticParams error:', e);
  }
  return defaultSlugs;
}

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

// ─── Dynamic Metadata Generation ─────────────────────────────────────────────

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

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

  let title = "Premium Digital Product — UpStore";
  let description = "Buy premium accounts and software keys at the world's lowest prices on UpStore with instant delivery and 30-day warranty.";
  let ourPrice = 0;
  let marketPrice = 0;
  let category = "PREMIUM ACCOUNT";
  let imageUrl = "";

  const isPlaceholder = supabaseUrl.includes('placeholder-url.supabase.co');

  if (!isPlaceholder) {
    try {
      let { data } = await supabasePublic
        .from('products')
        .select('*')
        .eq('slug', resolvedSlug)
        .maybeSingle();

      if (!data && slug !== resolvedSlug) {
        const fallbackRes = await supabasePublic
          .from('products')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();
        data = fallbackRes.data;
      }

      if (!data) {
        const prefix = slug.split('-')[0];
        const partialRes = await supabasePublic
          .from('products')
          .select('*')
          .ilike('slug', `%${prefix}%`)
          .maybeSingle();
        data = partialRes.data;
      }

      if (data) {
        const { getActiveFlashDealSlugFromDb } = await import('@/utils/products');
        const activeFlashSlug = await getActiveFlashDealSlugFromDb(supabasePublic);
        const prod = normalizeProductRecord(data, activeFlashSlug);
        title = `${prod.name} — Buy Cheap at UpStore (${prod.our_price ? '$' + prod.our_price : 'Lowest Price'})`;
        description = prod.description
          ? prod.description.substring(0, 160) + "..."
          : `Buy ${prod.name} at the lowest price online. Instant automated delivery, 30-day warranty & 24/7 customer support.`;
        ourPrice = prod.our_price;
        marketPrice = prod.market_price;
        category = prod.category || 'DIGITAL PRODUCT';
        imageUrl = prod.image_url;
      }
    } catch (error) {
      console.error('Metadata generation error:', error);
    }
  }

  if (ourPrice === 0) {
    const { MASTER_UPSTORE_CATALOG } = await import('@/utils/products');
    const masterMatch = MASTER_UPSTORE_CATALOG.find(
      p => p.slug.toLowerCase() === slug.toLowerCase() || 
           p.slug.toLowerCase() === resolvedSlug.toLowerCase() ||
           p.slug.toLowerCase().includes(slug.toLowerCase()) ||
           slug.toLowerCase().includes(p.slug.toLowerCase())
    );
    if (masterMatch) {
      title = `${masterMatch.name} — Buy Cheap at UpStore (${masterMatch.our_price ? '$' + masterMatch.our_price : 'Lowest Price'})`;
      description = masterMatch.description
        ? masterMatch.description.substring(0, 160) + "..."
        : `Buy ${masterMatch.name} at the lowest price online. Instant automated delivery, 30-day warranty & 24/7 customer support.`;
      ourPrice = masterMatch.our_price;
      marketPrice = masterMatch.market_price;
      category = masterMatch.category || 'DIGITAL PRODUCT';
      imageUrl = masterMatch.image_url;
    }
  }

  // Dynamic OpenGraph image URL
  const ogParams = new URLSearchParams({
    title,
    category,
    price: ourPrice ? ourPrice.toString() : '2.99',
    marketPrice: marketPrice ? marketPrice.toString() : '19.99',
    badge: 'INSTANT AUTOMATED DELIVERY',
  });
  const ogImageUrl = `https://upstore.one/api/og?${ogParams.toString()}`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://upstore.one/product/${slug}`,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://upstore.one/product/${slug}`,
      siteName: 'UpStore',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${title} - UpStore Marketplace`,
        },
        ...(imageUrl ? [{ url: imageUrl, alt: title }] : [])
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      site: '@UpStore_one',
      images: [ogImageUrl],
    }
  };
}

// ─── Main Server Component ───────────────────────────────────────────────────

export default async function ProductPage({ params }: ProductPageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

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

  let product = null;
  const isPlaceholder = supabaseUrl.includes('placeholder-url.supabase.co');

  if (!isPlaceholder) {
    try {
      let { data } = await supabasePublic
        .from('products')
        .select('*')
        .eq('slug', resolvedSlug)
        .maybeSingle();

      if (!data && slug !== resolvedSlug) {
        const fallbackRes = await supabasePublic
          .from('products')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();
        data = fallbackRes.data;
      }

      if (!data) {
        const prefix = slug.split('-')[0];
        const partialRes = await supabasePublic
          .from('products')
          .select('*')
          .ilike('slug', `%${prefix}%`)
          .maybeSingle();
        data = partialRes.data;
      }

      if (data) {
        const { getActiveFlashDealSlugFromDb } = await import('@/utils/products');
        const activeFlashSlug = await getActiveFlashDealSlugFromDb(supabasePublic);
        product = normalizeProductRecord(data, activeFlashSlug);
      }
    } catch (error) {
      console.error('Error fetching product in Server Component:', error);
    }
  }

  if (!product) {
    const { MASTER_UPSTORE_CATALOG } = await import('@/utils/products');
    const masterMatch = MASTER_UPSTORE_CATALOG.find(
      p => p.slug.toLowerCase() === slug.toLowerCase() || 
           p.slug.toLowerCase() === resolvedSlug.toLowerCase() ||
           p.slug.toLowerCase().includes(slug.toLowerCase()) ||
           slug.toLowerCase().includes(p.slug.toLowerCase())
    );
    if (masterMatch) {
      product = masterMatch;
    }
  }

  // eslint-disable-next-line react-hooks/purity
  const expireDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().split('T')[0];

  // Breadcrumbs schema for this product
  const breadcrumbJsonLd = product ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://upstore.one',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: product.category || 'Products',
        item: `https://upstore.one/?category=${encodeURIComponent(product.category || 'ALL')}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.name,
        item: `https://upstore.one/product/${slug}`,
      },
    ],
  } : null;

  // Generate Product Schema JSON-LD structured data
  const productJsonLd = product ? {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.image_url || 'https://upstore.one/logo.png',
    description: product.description || `Buy ${product.name} at the world's lowest price. Instant delivery and 30-day replacement warranty.`,
    sku: product.id || product.slug,
    mpn: product.slug,
    category: product.category,
    brand: {
      '@type': 'Brand',
      name: 'UpStore',
    },
    offers: {
      '@type': 'Offer',
      url: `https://upstore.one/product/${slug}`,
      priceCurrency: 'USD',
      price: product.our_price,
      priceValidUntil: expireDate,
      itemCondition: 'https://schema.org/NewCondition',
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'UpStore',
        url: 'https://upstore.one'
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        'shippingRate': {
          '@type': 'MonetaryAmount',
          'value': 0,
          'currency': 'USD'
        },
        'shippingDestination': {
          '@type': 'DefinedRegion',
          'addressCountry': 'US'
        },
        'deliveryTime': {
          '@type': 'ShippingDeliveryTime',
          'handlingTime': {
            '@type': 'QuantitativeValue',
            'minValue': 0,
            'maxValue': 0,
            'unitCode': 'DAY'
          },
          'transitTime': {
            '@type': 'QuantitativeValue',
            'minValue': 0,
            'maxValue': 0,
            'unitCode': 'DAY'
          }
        }
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        'applicableCountry': 'US',
        'returnPolicyCategory': 'https://schema.org/MerchantReturnFiniteReturnPeriod',
        'merchantReturnDays': 30,
        'returnMethod': 'https://schema.org/ReturnByMail',
        'returnFees': 'https://schema.org/FreeReturn'
      }
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.rating || 4.9,
      reviewCount: product.reviews || 2341,
      bestRating: 5,
      worstRating: 1,
    },
    review: [
      {
        '@type': 'Review',
        'reviewRating': {
          '@type': 'Rating',
          'ratingValue': '5',
          'bestRating': '5'
        },
        'author': {
          '@type': 'Person',
          'name': 'Youssef_99'
        },
        'reviewBody': 'Got my activation details in literally 2 minutes. Crazy fast and works 100%.'
      },
      {
        '@type': 'Review',
        'reviewRating': {
          '@type': 'Rating',
          'ratingValue': '5',
          'bestRating': '5'
        },
        'author': {
          '@type': 'Person',
          'name': 'Sarah M.'
        },
        'reviewBody': 'Prices are unbeatable, instant automated delivery works perfectly.'
      },
      {
        '@type': 'Review',
        'reviewRating': {
          '@type': 'Rating',
          'ratingValue': '5',
          'bestRating': '5'
        },
        'author': {
          '@type': 'Person',
          'name': 'Ahmed.K'
        },
        'reviewBody': 'Had an issue with a key, contacted support and they replaced it right away.'
      }
    ]
  } : null;

  return (
    <>
      {breadcrumbJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
      )}
      {productJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        />
      )}
      <ProductDetailClient initialProduct={product} slug={slug} />
    </>
  );
}
