import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://upstore.one';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/browse',
          '/terms',
          '/privacy',
          '/refund',
          '/worldcup',
          '/product/',
          '/api/og',
          '/api/seo/',
          '/_next/static/',
          '/_next/image',
          '/icon.png',
          '/apple-touch-icon.png',
          '/favicon.ico',
          '/manifest.webmanifest',
          '/sitemap.xml',
        ],
        disallow: [
          '/admin/',
          '/api/admin/',
          '/api/checkout/',
          '/api/wallet/',
          '/api/orders/',
          '/auth/',
          '/cart',
          '/checkout/',
          '/dashboard/',
          '/notifications/',
          '/ref/',
        ],
      },
      {
        userAgent: ['Googlebot', 'Googlebot-Image', 'Google-InspectionTool', 'Storebot-Google'],
        allow: ['/', '/browse', '/product/', '/terms', '/privacy', '/refund', '/worldcup', '/sitemap.xml', '/api/og', '/icon.png', '/favicon.ico', '/manifest.webmanifest', '/*.txt'],
        disallow: ['/admin/', '/api/admin/', '/api/checkout/', '/api/wallet/', '/api/orders/', '/auth/', '/cart', '/checkout/', '/dashboard/', '/notifications/', '/pin', '/referral', '/ref/'],
      },
      {
        userAgent: ['Bingbot', 'msnbot', 'BingPreview'],
        allow: ['/', '/browse', '/product/', '/terms', '/privacy', '/refund', '/worldcup', '/sitemap.xml', '/api/og', '/icon.png', '/favicon.ico', '/manifest.webmanifest', '/*.txt'],
        disallow: ['/admin/', '/api/admin/', '/api/checkout/', '/api/wallet/', '/api/orders/', '/auth/', '/cart', '/checkout/', '/dashboard/', '/notifications/', '/pin', '/referral', '/ref/'],
      },
      {
        userAgent: ['Yandex', 'YandexBot', 'YandexDirect'],
        allow: ['/', '/browse', '/product/', '/terms', '/privacy', '/refund', '/worldcup', '/sitemap.xml', '/api/og', '/icon.png', '/favicon.ico', '/manifest.webmanifest', '/*.txt'],
        disallow: ['/admin/', '/api/admin/', '/api/checkout/', '/api/wallet/', '/api/orders/', '/auth/', '/cart', '/checkout/', '/dashboard/', '/notifications/', '/pin', '/referral', '/ref/'],
      },
      {
        userAgent: ['Baiduspider', 'DuckDuckBot', 'Sogou', 'Yahoo! Slurp'],
        allow: ['/', '/browse', '/product/', '/terms', '/privacy', '/refund', '/worldcup', '/sitemap.xml', '/api/og', '/icon.png', '/favicon.ico', '/manifest.webmanifest', '/*.txt'],
        disallow: ['/admin/', '/api/admin/', '/api/checkout/', '/api/wallet/', '/api/orders/', '/auth/', '/cart', '/checkout/', '/dashboard/', '/notifications/', '/pin', '/referral', '/ref/'],
      },
      {
        userAgent: 'Applebot',
        allow: ['/', '/browse', '/product/', '/terms', '/privacy', '/refund', '/worldcup', '/api/og', '/icon.png', '/favicon.ico', '/manifest.webmanifest', '/*.txt'],
        disallow: ['/admin/', '/api/admin/', '/api/checkout/', '/api/wallet/', '/api/orders/', '/auth/', '/cart', '/checkout/', '/dashboard/', '/notifications/', '/pin', '/referral', '/ref/'],
      },
      // Next-Gen AI Search Engines and LLM Crawlers
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'PerplexityBot',
          'ClaudeBot',
          'Claude-Web',
          'anthropic-ai',
          'cohere-ai',
          'Google-Extended',
          'Bytespider',
          'CCBot',
          'Diffbot',
          'FacebookBot',
          'LinkedInBot',
        ],
        allow: ['/', '/browse', '/product/', '/terms', '/privacy', '/refund', '/worldcup', '/api/og', '/sitemap.xml', '/*.txt'],
        disallow: ['/admin/', '/api/admin/', '/api/checkout/', '/api/wallet/', '/api/orders/', '/auth/', '/cart', '/checkout/', '/dashboard/', '/notifications/', '/pin', '/referral', '/ref/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
