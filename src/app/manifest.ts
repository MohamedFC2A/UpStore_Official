import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "UpStore — World's Lowest-Priced Digital Marketplace",
    short_name: 'UpStore',
    description: "The world's lowest-priced premium digital marketplace for accounts, subscriptions, keys, and software licenses.",
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FFFDF9',
    theme_color: '#FFE600',
    lang: 'en',
    dir: 'ltr',
    categories: ['shopping', 'finance', 'entertainment', 'utilities'],
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
