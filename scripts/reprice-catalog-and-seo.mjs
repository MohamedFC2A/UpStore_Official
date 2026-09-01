import fs from 'fs';

const NEW_PRICES = {
  // Gemini
  'gemini_1m': { our_price: 0.25, price_egp: 15, price_sar: 1, title_price: '$0.25' },
  'gemini_3m': { our_price: 0.50, price_egp: 25, price_sar: 2, title_price: '$0.50' },
  'gemini_12m': { our_price: 1.49, price_egp: 75, price_sar: 6, title_price: '$1.49' },
  'gemini_18m': { our_price: 0.25, price_egp: 15, price_sar: 1, title_price: '$0.25' },

  // ChatGPT
  'chatgpt_1m': { our_price: 1.49, price_egp: 75, price_sar: 6, title_price: '$1.49' },
  'chatgpt_3m': { our_price: 2.49, price_egp: 125, price_sar: 10, title_price: '$2.49' },
  'chatgpt_12m': { our_price: 2.99, price_egp: 150, price_sar: 12, title_price: '$2.99' },
  'chatgpt_pro_1m': { our_price: 2.99, price_egp: 150, price_sar: 12, title_price: '$2.99' },

  // Claude
  'claude_1m': { our_price: 1.49, price_egp: 75, price_sar: 6, title_price: '$1.49' },
  'claude_3m': { our_price: 2.49, price_egp: 125, price_sar: 10, title_price: '$2.49' },
  'claude_12m': { our_price: 2.99, price_egp: 150, price_sar: 12, title_price: '$2.99' },

  // Perplexity
  'perplexity_1m': { our_price: 0.89, price_egp: 45, price_sar: 4, title_price: '$0.89' },
  'perplexity_12m': { our_price: 2.49, price_egp: 125, price_sar: 10, title_price: '$2.49' },

  // Midjourney
  'midjourney_basic_1m': { our_price: 1.19, price_egp: 60, price_sar: 5, title_price: '$1.19' },
  'midjourney_std_1m': { our_price: 1.99, price_egp: 100, price_sar: 8, title_price: '$1.99' },
  'midjourney_12m': { our_price: 2.99, price_egp: 150, price_sar: 12, title_price: '$2.99' },

  // ElevenLabs
  'elevenlabs_starter_1m': { our_price: 0.79, price_egp: 40, price_sar: 3, title_price: '$0.79' },
  'elevenlabs_creator_1m': { our_price: 1.99, price_egp: 100, price_sar: 8, title_price: '$1.99' },

  // Grok & Runway
  'grok_1m': { our_price: 1.49, price_egp: 75, price_sar: 6, title_price: '$1.49' },
  'runway_1m': { our_price: 1.99, price_egp: 100, price_sar: 8, title_price: '$1.99' },

  // Dev Tools
  'cursor_1m': { our_price: 1.29, price_egp: 65, price_sar: 5, title_price: '$1.29' },
  'cursor_12m': { our_price: 2.89, price_egp: 145, price_sar: 11, title_price: '$2.89' },
  'copilot_1m': { our_price: 0.89, price_egp: 45, price_sar: 4, title_price: '$0.89' },
  'copilot_12m': { our_price: 2.29, price_egp: 115, price_sar: 9, title_price: '$2.29' },
  'v0dev_1m': { our_price: 1.49, price_egp: 75, price_sar: 6, title_price: '$1.49' },
  'jetbrains_12m': { our_price: 2.49, price_egp: 125, price_sar: 10, title_price: '$2.49' },
  'replit_1m': { our_price: 1.69, price_egp: 85, price_sar: 7, title_price: '$1.69' },

  // Design
  'canva_12m': { our_price: 0.99, price_egp: 50, price_sar: 4, title_price: '$0.99' },
  'canva_life': { our_price: 1.99, price_egp: 100, price_sar: 8, title_price: '$1.99' },
  'capcut_1m': { our_price: 0.99, price_egp: 50, price_sar: 4, title_price: '$0.99' },
  'capcut_12m': { our_price: 2.49, price_egp: 125, price_sar: 10, title_price: '$2.49' },
  'adobe_1m': { our_price: 1.89, price_egp: 95, price_sar: 7, title_price: '$1.89' },
  'adobe_12m': { our_price: 2.99, price_egp: 150, price_sar: 12, title_price: '$2.99' },
  'figma_1m': { our_price: 1.49, price_egp: 75, price_sar: 6, title_price: '$1.49' },
  'freepik_1m': { our_price: 0.89, price_egp: 45, price_sar: 4, title_price: '$0.89' },
  'freepik_12m': { our_price: 2.49, price_egp: 125, price_sar: 10, title_price: '$2.49' },
  'envato_1m': { our_price: 1.49, price_egp: 75, price_sar: 6, title_price: '$1.49' },

  // Streaming
  'netflix_1m': { our_price: 0.99, price_egp: 50, price_sar: 4, title_price: '$0.99' },
  'netflix_3m': { our_price: 1.89, price_egp: 95, price_sar: 7, title_price: '$1.89' },
  'netflix_6m': { our_price: 2.49, price_egp: 125, price_sar: 10, title_price: '$2.49' },
  'netflix_12m': { our_price: 2.99, price_egp: 150, price_sar: 12, title_price: '$2.99' },
  'spotify_1m': { our_price: 0.49, price_egp: 25, price_sar: 2, title_price: '$0.49' },
  'spotify_3m': { our_price: 0.99, price_egp: 50, price_sar: 4, title_price: '$0.99' },
  'spotify_6m': { our_price: 1.69, price_egp: 85, price_sar: 7, title_price: '$1.69' },
  'spotify_12m': { our_price: 2.49, price_egp: 125, price_sar: 10, title_price: '$2.49' },
  'youtube_1m': { our_price: 0.49, price_egp: 25, price_sar: 2, title_price: '$0.49' },
  'youtube_3m': { our_price: 0.99, price_egp: 50, price_sar: 4, title_price: '$0.99' },
  'youtube_6m': { our_price: 1.69, price_egp: 85, price_sar: 7, title_price: '$1.69' },
  'youtube_12m': { our_price: 2.49, price_egp: 125, price_sar: 10, title_price: '$2.49' },
  'disney_1m': { our_price: 0.89, price_egp: 45, price_sar: 4, title_price: '$0.89' },
  'disney_12m': { our_price: 2.49, price_egp: 125, price_sar: 10, title_price: '$2.49' },

  // VPN
  'nordvpn_12m': { our_price: 1.89, price_egp: 95, price_sar: 7, title_price: '$1.89' },
  'nordvpn_24m': { our_price: 2.89, price_egp: 145, price_sar: 11, title_price: '$2.89' },
  'surfshark_12m': { our_price: 1.69, price_egp: 85, price_sar: 7, title_price: '$1.69' },
  'surfshark_24m': { our_price: 2.69, price_egp: 135, price_sar: 10, title_price: '$2.69' },
  'expressvpn_12m': { our_price: 2.79, price_egp: 140, price_sar: 11, title_price: '$2.79' },

  // Productivity
  'office365_12m': { our_price: 1.29, price_egp: 65, price_sar: 5, title_price: '$1.29' },
  'office365_life': { our_price: 2.49, price_egp: 125, price_sar: 10, title_price: '$2.49' },
  'notion_12m': { our_price: 2.49, price_egp: 125, price_sar: 10, title_price: '$2.49' },
  'tradingview_1m': { our_price: 1.99, price_egp: 100, price_sar: 8, title_price: '$1.99' },
  'grammarly_12m': { our_price: 1.99, price_egp: 100, price_sar: 8, title_price: '$1.99' },
  'duolingo_12m': { our_price: 1.49, price_egp: 75, price_sar: 6, title_price: '$1.49' },
  'win11pro_life': { our_price: 1.99, price_egp: 100, price_sar: 8, title_price: '$1.99' },
  'win10pro_life': { our_price: 1.49, price_egp: 75, price_sar: 6, title_price: '$1.49' },
};

const CATALOG_PATH = 'scripts/storeCatalog.mjs';
let content = fs.readFileSync(CATALOG_PATH, 'utf-8');

// Insert gemini_18m if not present
if (!content.includes("'gemini_18m'")) {
  const gemini18mBlock = `  {
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
    advantages_ar: ['أحدث نماذج Gemini 3.1 Pro و Gemini 3.7 Flash', 'مساحة تخزين سحابية ضخمة 2TB على Google One لمدة 18 شهر', 'تكامل كامل مع Google Workspace والبحث المعمق Deep Research', 'ضمان استبدال رسمي 100% طوال 18 شهر كاملة'],
    advantages_en: ['Latest Gemini 3.1 Pro & Gemini 3.7 Flash AI models', 'Massive 2TB Google One cloud storage for 18 full months', 'Full Google Workspace & Deep Research integration', '100% official replacement warranty for 18 months'],
    advantages_es: ['Modelos de IA más recientes: Gemini 3.1 Pro y 3.7 Flash', '2TB de almacenamiento en la nube en Google One durante 18 meses', 'Integración total con Google Workspace y Deep Research', 'Garantía oficial de reemplazo del 100% por 18 meses'],
    advantages_fr: ['Derniers modèles d\\'IA Gemini 3.1 Pro et 3.7 Flash', 'Stockage cloud massif de 2 To sur Google One pour 18 mois', 'Intégration complète Google Workspace et Deep Research', 'Garantie de remplacement officielle 100% pendant 18 mois'],
    advantages_ru: ['Новейшие модели ИИ Gemini 3.1 Pro и 3.7 Flash', '2 ТБ облачного хранилища Google One на 18 месяцев', 'Полная интеграция с Google Workspace и Deep Research', '100% официальная гарантия замены на 18 месяцев'],
    advantages_tr: ['En yeni Gemini 3.1 Pro ve 3.7 Flash yapay zeka modelleri', '18 ay boyunca 2TB Google One bulut depolama alanı', 'Tam Google Workspace ve Deep Research entegrasyonu', '18 ay boyunca %100 resmi değişim garantisi'],
    advantages_de: ['Neueste Gemini 3.1 Pro & 3.7 Flash KI-Modelle', '2TB Google One Cloud-Speicher für 18 Monate inklusive', 'Vollständige Google Workspace & Deep Research Integration', '100% offizielle Ersatzgarantie für 18 Monate'],
  },
`;
  const insertMarker = "export const STORE_CATALOG = [\n  // ── 1. GOOGLE GEMINI ──\n";
  content = content.replace(insertMarker, insertMarker + gemini18mBlock);
}

// Now replace prices and button titles for each item
for (const [shortId, p] of Object.entries(NEW_PRICES)) {
  // Regex to match the product block
  const reg = new RegExp(`(short_id:\\s*'${shortId}',[\\s\\S]*?button_title:\\s*')[^']+('[\\s\\S]*?our_price:\\s*)[0-9.]+(,[\\s\\S]*?price_egp:\\s*)[0-9]+(,[\\s\\S]*?price_sar:\\s*)[0-9]+`, 'g');
  
  content = content.replace(reg, (match, prefix, mid1, mid2, mid3) => {
    // extract current button title part before price
    const currentBtnTitle = match.match(/button_title:\s*'([^—]+)—/);
    const titlePrefix = currentBtnTitle ? currentBtnTitle[1].trim() : '';
    const newBtn = titlePrefix ? `${titlePrefix} — ${p.title_price} ⚡` : `Product — ${p.title_price} ⚡`;
    return `short_id: '${shortId}',\n    button_title: '${newBtn}',\n    our_price: ${p.our_price},\n    price_egp: ${p.price_egp},\n    price_sar: ${p.price_sar}`;
  });
}

fs.writeFileSync(CATALOG_PATH, content);
console.log('✅ Updated storeCatalog.mjs prices and added Gemini Pro 18m ($0.25)!');
