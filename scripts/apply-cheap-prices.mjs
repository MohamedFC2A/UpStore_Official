import fs from 'fs';
import { STORE_CATEGORIES, STORE_BRANDS, STORE_CATALOG } from './storeCatalog.mjs';

const PRICE_OVERRIDE = {
  // Gemini
  'gemini_1m': 0.25,
  'gemini_3m': 0.50,
  'gemini_12m': 1.49,
  'gemini_18m': 0.25,

  // ChatGPT
  'chatgpt_1m': 1.49,
  'chatgpt_3m': 2.49,
  'chatgpt_12m': 2.99,
  'chatgpt_pro_1m': 2.99,

  // Claude
  'claude_1m': 1.49,
  'claude_3m': 2.49,
  'claude_12m': 2.99,

  // Perplexity
  'perplexity_1m': 0.89,
  'perplexity_12m': 2.49,

  // Midjourney
  'midjourney_basic_1m': 1.19,
  'midjourney_std_1m': 1.99,
  'midjourney_12m': 2.99,

  // ElevenLabs
  'elevenlabs_starter_1m': 0.79,
  'elevenlabs_creator_1m': 1.99,

  // Grok & Runway
  'grok_1m': 1.49,
  'runway_1m': 1.99,

  // Dev Tools
  'cursor_1m': 1.29,
  'cursor_12m': 2.89,
  'copilot_1m': 0.89,
  'copilot_12m': 2.29,
  'v0dev_1m': 1.49,
  'jetbrains_12m': 2.49,
  'replit_1m': 1.69,

  // Design
  'canva_12m': 0.99,
  'canva_life': 1.99,
  'capcut_1m': 0.99,
  'capcut_12m': 2.49,
  'adobe_1m': 1.89,
  'adobe_12m': 2.99,
  'figma_1m': 1.49,
  'freepik_1m': 0.89,
  'freepik_12m': 2.49,
  'envato_1m': 1.49,

  // Streaming
  'netflix_1m': 0.99,
  'netflix_3m': 1.89,
  'netflix_6m': 2.49,
  'netflix_12m': 2.99,
  'spotify_1m': 0.49,
  'spotify_3m': 0.99,
  'spotify_6m': 1.69,
  'spotify_12m': 2.49,
  'youtube_1m': 0.49,
  'youtube_3m': 0.99,
  'youtube_6m': 1.69,
  'youtube_12m': 2.49,
  'disney_1m': 0.89,
  'disney_12m': 2.49,

  // VPN
  'nordvpn_12m': 1.89,
  'nordvpn_24m': 2.89,
  'surfshark_12m': 1.69,
  'surfshark_24m': 2.69,
  'expressvpn_12m': 2.79,

  // Productivity
  'office365_12m': 1.29,
  'office365_life': 2.49,
  'notion_12m': 2.49,
  'tradingview_1m': 1.99,
  'grammarly_12m': 1.99,
  'duolingo_12m': 1.49,
  'win11pro_life': 1.99,
  'win10pro_life': 1.49,
};

const gemini18mProduct = {
  id: 'gemini_18m_prod',
  short_id: 'gemini_18m',
  brand_id: 'gemini',
  category_id: 'ai',
  name: 'Gemini Pro / Advanced 18m',
  name_ar: 'Google Gemini Pro / Advanced (18 شهر كامل)',
  button_title: '✦ Gemini Pro (18 شهر) — $0.25 🔥',
  icon_symbol: '✦',
  market_price: 360.00,
  our_price: 0.25,
  price_egp: 15,
  price_sar: 1,
  subscription_duration: '18 شهر كامل (سنة ونصف)',
  warranty_duration: '18 شهر كامل ضمان استبدال رسمي',
  delivery_type: 'personal_account',
  advantages_ar: [
    'أحدث نماذج Gemini 3.1 Pro و Gemini 3.7 Flash',
    'مساحة تخزين سحابية ضخمة 2TB على Google One لمدة 18 شهر',
    'تكامل كامل مع Google Workspace والبحث المعمق Deep Research',
    'ضمان استبدال رسمي 100% طوال 18 شهر كاملة'
  ],
  advantages_en: [
    'Latest Gemini 3.1 Pro & Gemini 3.7 Flash AI models',
    'Massive 2TB Google One cloud storage for 18 full months',
    'Full Google Workspace & Deep Research integration',
    '100% official replacement warranty for 18 months'
  ],
  advantages_es: [
    'Modelos de IA más recientes: Gemini 3.1 Pro y 3.7 Flash',
    '2TB de almacenamiento en la nube en Google One durante 18 meses',
    'Integración total con Google Workspace y Deep Research',
    'Garantía oficial de reemplazo del 100% por 18 meses'
  ],
  advantages_fr: [
    'Derniers modèles d\'IA Gemini 3.1 Pro et 3.7 Flash',
    'Stockage cloud massif de 2 To sur Google One pour 18 mois',
    'Intégration complète Google Workspace et Deep Research',
    'Garantie de remplacement officielle 100% pendant 18 mois'
  ],
  advantages_ru: [
    'Новейшие модели ИИ Gemini 3.1 Pro и 3.7 Flash',
    '2 ТБ облачного хранилища Google One на 18 месяцев',
    'Полная интеграция с Google Workspace и Deep Research',
    '100% официальная гарантия замены на 18 месяцев'
  ],
  advantages_tr: [
    'En yeni Gemini 3.1 Pro ve 3.7 Flash yapay zeka modelleri',
    '18 ay boyunca 2TB Google One bulut depolama alanı',
    'Tam Google Workspace ve Deep Research entegrasyonu',
    '18 ay boyunca %100 resmi değişim garantisi'
  ],
  advantages_de: [
    'Neueste Gemini 3.1 Pro & 3.7 Flash KI-Modelle',
    '2TB Google One Cloud-Speicher für 18 Monate inklusive',
    'Vollständige Google Workspace & Deep Research Integration',
    '100% offizielle Ersatzgarantie für 18 Monate'
  ]
};

// Update existing items and insert gemini18m
const catalog = [];
let gemini18Added = false;

for (const p of STORE_CATALOG) {
  if (p.brand_id === 'gemini' && !gemini18Added) {
    catalog.push(gemini18mProduct);
    gemini18Added = true;
  }
  if (p.short_id === 'gemini_18m') continue;

  const newPrice = PRICE_OVERRIDE[p.short_id] !== undefined ? PRICE_OVERRIDE[p.short_id] : p.our_price;
  
  // Clean button title
  let btnPrefix = p.button_title.split('—')[0].trim();
  if (!btnPrefix) btnPrefix = `${p.icon_symbol || '⚡'} ${p.name}`;
  const newBtnTitle = `${btnPrefix} — $${newPrice.toFixed(2)} ⚡`;

  catalog.push({
    ...p,
    our_price: newPrice,
    price_egp: Math.max(10, Math.round(newPrice * 50)),
    price_sar: Math.max(1, Math.round(newPrice * 3.75)),
    button_title: newBtnTitle,
  });
}

// Generate the storeCatalog.mjs file
const output = `/**
 * storeCatalog.mjs — High-Performance Multilingual Wholesale Catalog Engine
 * Supports 64 Curated Products with Wholesale Pricing (Max $3.00),
 * Gemini Pro 18m at $0.25, Real-world Durations, Precise Delivery Types, and Rich Multilingual Advantages.
 */

export const STORE_CATEGORIES = ${JSON.stringify(STORE_CATEGORIES, null, 2)};

export const STORE_BRANDS = ${JSON.stringify(STORE_BRANDS, null, 2)};

export const STORE_CATALOG = ${JSON.stringify(catalog, null, 2)};

export function getProductById(id) {
  return STORE_CATALOG.find((p) => p.id === id) || null;
}

export function getProductByShortIdOrSlug(identifier) {
  if (!identifier) return null;
  const clean = identifier.toLowerCase().trim();
  return (
    STORE_CATALOG.find((p) => p.short_id === clean || p.id === clean || p.id === clean + '_prod') || null
  );
}

export function getProductsByBrand(brandId) {
  return STORE_CATALOG.filter((p) => p.brand_id === brandId);
}

export function getProductsByCategory(categoryId) {
  return STORE_CATALOG.filter((p) => p.category_id === categoryId);
}

export function getBrandById(brandId) {
  return STORE_BRANDS.find((b) => b.id === brandId) || null;
}

export function getBrandsByCategory(categoryId) {
  return STORE_BRANDS.filter((b) => b.category_id === categoryId);
}
`;

fs.writeFileSync('scripts/storeCatalog.mjs', output, 'utf-8');
console.log('✅ Successfully rewritten storeCatalog.mjs with 64 products, max $3.00, and Gemini Pro 18m ($0.25)!');
