/**
 * scripts/storeI18n.mjs
 * 
 * High-Performance Multi-Language Localization Engine for UpStore Telegram Bot
 * Supports the Top 7 Global Languages:
 *  1. ar - العربية (Arabic) 🇸🇦
 *  2. en - English (English) 🇺🇸
 *  3. es - Español (Spanish) 🇪🇸
 *  4. fr - Français (French) 🇫🇷
 *  5. ru - Русский (Russian) 🇷🇺
 *  6. tr - Türkçe (Turkish) 🇹🇷
 *  7. de - Deutsch (German) 🇩🇪
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

export const SUPPORTED_LANGUAGES = {
  ar: { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  en: { code: 'en', name: 'English', flag: '🇺🇸' },
  es: { code: 'es', name: 'Español', flag: '🇪🇸' },
  fr: { code: 'fr', name: 'Français', flag: '🇫🇷' },
  ru: { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  tr: { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  de: { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
};

export const DEFAULT_LANGUAGE = 'ar';

// Comprehensive Locale to Supported Language Mapping
const LOCALE_TO_LANG = {
  // Arabic (Middle East & North Africa)
  ar: 'ar', fa: 'ar', ur: 'ar', ps: 'ar',

  // Spanish & Portuguese / Latin America
  es: 'es', pt: 'es', ca: 'es', gl: 'es',

  // French & Romance
  fr: 'fr', it: 'fr', ro: 'fr',

  // Russian & CIS Countries
  ru: 'ru', uk: 'ru', be: 'ru', kk: 'ru', uz: 'ru', az: 'ru', hy: 'ru', ka: 'ru', tg: 'ru', ky: 'ru',

  // Turkish & Turkic
  tr: 'tr', tk: 'tr', tt: 'tr',

  // German & Central/Northern Europe
  de: 'de', nl: 'de', sv: 'de', no: 'de', da: 'de', fi: 'de', pl: 'de', cs: 'de',

  // English & Global
  en: 'en', ja: 'en', ko: 'en', zh: 'en', hi: 'en', id: 'en', vi: 'en', th: 'en',
};

// Persistent storage path
const DATA_DIR = path.join(process.cwd(), 'data');
const LANG_FILE = path.join(DATA_DIR, 'user_languages.json');

// In-Memory user language cache: Map<chatId, langCode>
const userLanguageMap = new Map();

// Cloud Supabase client for multi-server synchronization
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://nkjutiglgywdfxfqkhzp.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
let supabase = null;
try {
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
} catch (err) {
  console.warn('[i18n Supabase Warning]:', err.message);
}

// Load persisted user languages from disk on startup
try {
  if (fs.existsSync(LANG_FILE)) {
    const raw = fs.readFileSync(LANG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    for (const [k, v] of Object.entries(parsed)) {
      if (SUPPORTED_LANGUAGES[v]) {
        userLanguageMap.set(String(k), v);
      }
    }
  }
} catch (err) {
  console.warn('[i18n Disk Load Warning]:', err.message);
}

function saveLanguagesToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const obj = {};
    for (const [k, v] of userLanguageMap.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(LANG_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.error('[i18n Disk Save Error]:', err.message);
  }
}

/**
 * Get user language or fallback to default
 */
export function getUserLanguage(chatId) {
  const cid = String(chatId);
  return userLanguageMap.get(cid) || DEFAULT_LANGUAGE;
}

/**
 * Smart Auto-Detect: Detect or initialize user language from Telegram's language_code
 */
export function detectUserLanguage(chatId, telegramLangCode = '') {
  const cid = String(chatId);
  if (userLanguageMap.has(cid)) {
    return userLanguageMap.get(cid);
  }

  let matchedLang = DEFAULT_LANGUAGE;

  if (telegramLangCode) {
    const clean = telegramLangCode.toLowerCase().split(/[-_]/)[0].trim();
    if (LOCALE_TO_LANG[clean]) {
      matchedLang = LOCALE_TO_LANG[clean];
    } else if (SUPPORTED_LANGUAGES[clean]) {
      matchedLang = clean;
    } else {
      matchedLang = 'en'; // Global fallback for international users
    }
  }

  userLanguageMap.set(cid, matchedLang);
  saveLanguagesToDisk();

  if (supabase) {
    supabase.from('site_settings').upsert({
      key: `tg_lang_${cid}`,
      value: matchedLang,
      updated_at: new Date().toISOString(),
    }).catch(() => {});
  }

  return matchedLang;
}

/**
 * Set user language explicitly (User manually selects language)
 */
export function setUserLanguage(chatId, langCode) {
  const cid = String(chatId);
  if (SUPPORTED_LANGUAGES[langCode]) {
    userLanguageMap.set(cid, langCode);
    saveLanguagesToDisk();

    if (supabase) {
      supabase.from('site_settings').upsert({
        key: `tg_lang_${cid}`,
        value: langCode,
        updated_at: new Date().toISOString(),
      }).catch(() => {});
    }
    return true;
  }
  return false;
}

export const I18N_STRINGS = {
  ar: {
    // Navigation & General
    main_menu_title: '<b>UpStore الرقمي</b>',
    main_menu_sub: 'منصة الاشتراكات وتراخيص الذكاء الاصطناعي والتطبيقات الرسمية.',
    btn_catalog: 'المنتجات',
    btn_orders: 'طلباتي',
    btn_wallet: 'المحفظة والدفع',
    btn_referral: 'المكافآت',
    btn_support: 'الدعم الفني',
    btn_warranty: 'الضمان',
    btn_language: '🌐 Language / اللغة',
    btn_main_menu: 'الرئيسية',
    btn_back: 'رجوع',
    btn_refresh: 'تحديث',
    btn_copy_hint: 'اضغط على الرقم للنسخ',

    // Language Screen
    select_language_title: '<b>اختر لغة العرض / Select Language</b>',
    select_language_sub: 'اختر لغتك المفضلة لاستخدام البوت بكل سهولة:',
    language_changed: 'تم تغيير اللغة بنجاح ✅',

    // Catalog & Categories
    catalog_title: '<b>أقسام المتجر</b>',
    catalog_sub: 'اختر القسم لتصفح الاشتراكات المتاحة:',
    select_brand_sub: 'اختر الخدمة أو الماركة المطلوبة لعرض باقاتها والأسعار:',
    select_tier_sub: 'اختر فئة الاشتراك والمدة المناسبة لك للشراء الفوري:',
    starting_from: 'من',
    cat_ai: 'الذكاء الاصطناعي',
    cat_dev: 'أدوات المطورين',
    cat_design: 'التصميم والميديا',
    cat_stream: 'الترفيه والبث',
    cat_vpn: 'الحماية والـ VPN',
    cat_prod: 'الإنتاجية والأوفيس',

    // Product Details
    product_price: 'السعر',
    original_price: 'السعر الأصلي',
    discount: 'خصم',
    delivery: 'التسليم',
    duration_label: 'المدة',
    warranty_label: 'الضمان',
    local_price_label: 'محلي',
    features_label: 'المزايا',
    instant_delivery: 'فوري وتلقائي',
    warranty_badge: 'ضمان ذهبي كامل طوال المدة',
    choose_payment: 'اختر وسيلة الدفع المناسبة:',
    btn_pay_bybit: 'دفع Bybit (داخلي/سريع)',
    btn_pay_binance: 'دفع Binance Pay',
    btn_pay_local: 'فودافون كاش / إنستاباي',

    // Checkout Bybit
    bybit_checkout_title: '<b>دفع عبر Bybit (بدون رسوم)</b>',
    bybit_uid_label: 'معرف الحساب (UID):',
    bybit_amount_label: 'المبلغ المطلوب:',
    bybit_step1: '1. حوّل المبلغ إلى معرف Bybit أعلاه (Internal Transfer).',
    bybit_step2: '2. بعد التحويل، اضغط زر التحقق أدناه لتسليم الحساب فوراً.',
    btn_verify_bybit: 'تحقق من الدفع الآن',

    // Checkout Binance
    binance_checkout_title: '<b>دفع عبر Binance Pay (بدون رسوم)</b>',
    binance_id_label: 'معرف Binance Pay ID:',
    binance_step1: '1. افتح تطبيق بينانس وحوّل المبلغ المطلوب للمعرف أعلاه.',
    binance_step2: '2. بعد التحويل، أرسل رقم المعرف (Order ID) هنا لتأكيد الطلب.',
    btn_verify_binance: 'تم التحويل (تأكيد الطلب)',

    // Checkout Local
    local_checkout_title: '<b>الدفع المحلي (مصر / الدول العربية)</b>',
    instapay_label: 'إنستاباي (InstaPay):',
    vfcash_label: 'فودافون كاش:',
    local_amount_label: 'المبلغ:',
    local_step: 'حوّل المبلغ وأرسل صورة الإشعار هنا لتسليم حسابك فوراً.',

    // Referral & Wallet
    referral_title: '<b>رصيد المحفظة والمكافآت</b>',
    referral_desc: 'شارك رابط دعوتك واكسب رصيد محفظة مجاني لشراء الاشتراكات.',
    referral_formula: '• كل صديق ينضم = 1 نقطة\n• كل 5 نقاط = $1.00 دولار يضاف تلقائياً لمحفظتك',
    invited_friends: 'الأصدقاء المدعوون:',
    total_points: 'مجموع النقاط:',
    wallet_balance: 'رصيد المشتريات:',
    points_to_next: 'للدولار القادم:',
    ref_link_label: 'رابط دعوتك الخاص:',
    btn_share_tg: 'مشاركة عبر تليجرام',
    btn_share_wa: 'مشاركة عبر واتساب',
    btn_shop_with_balance: 'تصفح وشراء بالرصيد',

    // Support & Warranty
    support_title: '<b>خدمة العملاء والدعم الفني</b>',
    support_desc: 'فريق الدعم متواجد على مدار الساعة لخدمتك وحل أي استفسار:',
    support_handle: 'تواصل مع الدعم:',
    warranty_title: '<b>سياسة الضمان الذهبي</b>',
    warranty_desc: '• ضمان استبدال فوري طوال فترة الاشتراك.\n• حسابات وتراخيص رسمية 100% بدون انقطاع.\n• دعم فني مباشر واستجابة سريعة.',

    // My Orders
    orders_title: '<b>سجل طلباتي</b>',
    no_orders: 'لا توجد طلبات سابقة حتى الآن.',

    // Bot Meta
    bot_description: 'متجر UpStore الرسمي لاشتراكات الذكاء الاصطناعي وتطبيقات البرمجة والميديا بأرخص الأسعار العالمية مع تسليم فوري وضمان ذهبي 100% 👑.',
    bot_short_description: 'أقوى اشتراكات وتراخيص الذكاء الاصطناعي والتطبيقات بأرخص سعر وتسليم فوري ⚡',
  },

  en: {
    // Navigation & General
    main_menu_title: '<b>UpStore Digital</b>',
    main_menu_sub: 'Official AI subscriptions, developer tools, and premium apps.',
    btn_catalog: 'Products',
    btn_orders: 'My Orders',
    btn_wallet: 'Wallet & Pay',
    btn_referral: 'Rewards',
    btn_support: 'Support',
    btn_warranty: 'Warranty',
    btn_language: '🌐 Language',
    btn_main_menu: 'Home',
    btn_back: 'Back',
    btn_refresh: 'Refresh',
    btn_copy_hint: 'Tap number to copy',

    // Language Screen
    select_language_title: '<b>Select Language / اختر اللغة</b>',
    select_language_sub: 'Choose your preferred language:',
    language_changed: 'Language updated successfully ✅',

    // Catalog & Categories
    catalog_title: '<b>Store Categories</b>',
    catalog_sub: 'Select a category to explore available plans:',
    select_brand_sub: 'Select a brand or service to view available tiers & pricing:',
    select_tier_sub: 'Select your preferred subscription tier & duration for instant delivery:',
    starting_from: 'From',
    cat_ai: 'Artificial Intelligence',
    cat_dev: 'Developer Tools',
    cat_design: 'Design & Creative',
    cat_stream: 'Streaming & Media',
    cat_vpn: 'Security & VPN',
    cat_prod: 'Productivity & Office',

    // Product Details
    product_price: 'Price',
    original_price: 'Original',
    discount: 'Discount',
    delivery: 'Delivery',
    duration_label: 'Duration',
    warranty_label: 'Warranty',
    local_price_label: 'Local Equivalent',
    features_label: 'Key Features',
    instant_delivery: 'Instant & Automated',
    warranty_badge: '100% full-term replacement warranty',
    choose_payment: 'Choose your payment method:',
    btn_pay_bybit: 'Pay via Bybit (Zero fees)',
    btn_pay_binance: 'Pay via Binance Pay',
    btn_pay_local: 'Local Payment (InstaPay/Cash)',

    // Checkout Bybit
    bybit_checkout_title: '<b>Pay via Bybit (Zero Fees)</b>',
    bybit_uid_label: 'Bybit UID:',
    bybit_amount_label: 'Amount Required:',
    bybit_step1: '1. Transfer the exact amount to the Bybit UID above.',
    bybit_step2: '2. Click the button below to verify and receive your account instantly.',
    btn_verify_bybit: 'Verify Payment Now',

    // Checkout Binance
    binance_checkout_title: '<b>Pay via Binance Pay</b>',
    binance_id_label: 'Binance Pay ID:',
    binance_step1: '1. Transfer the exact amount to the Binance ID above.',
    binance_step2: '2. Send your Order/Pay ID here in chat for instant activation.',
    btn_verify_binance: 'Transfer Completed',

    // Checkout Local
    local_checkout_title: '<b>Local Payment</b>',
    instapay_label: 'InstaPay:',
    vfcash_label: 'Vodafone Cash:',
    local_amount_label: 'Amount:',
    local_step: 'Transfer the amount and send the receipt screenshot here.',

    // Referral & Wallet
    referral_title: '<b>Rewards & Store Wallet</b>',
    referral_desc: 'Share your invite link and earn free wallet credits for any plan.',
    referral_formula: '• 1 invite = 1 point\n• Every 5 points = $1.00 store credit',
    invited_friends: 'Invited Users:',
    total_points: 'Total Points:',
    wallet_balance: 'Wallet Credit:',
    points_to_next: 'Points for next $1:',
    ref_link_label: 'Your Invite Link:',
    btn_share_tg: 'Share on Telegram',
    btn_share_wa: 'Share on WhatsApp',
    btn_shop_with_balance: 'Browse & Buy with Balance',

    // Support & Warranty
    support_title: '<b>Customer Support</b>',
    support_desc: 'Our support team is available 24/7 to assist you:',
    support_handle: 'Direct Support:',
    warranty_title: '<b>Golden Warranty Policy</b>',
    warranty_desc: '• Instant replacement guarantee throughout the full term.\n• 100% official and uninterrupted subscriptions.\n• Dedicated 24/7 technical support.',

    // My Orders
    orders_title: '<b>My Orders</b>',
    no_orders: 'You have no order history yet.',

    // Bot Meta
    bot_description: 'Official UpStore for premium AI subscriptions (ChatGPT Plus, Gemini, Claude, Cursor, Canva, Netflix) at ultra-affordable prices with instant delivery and 100% replacement warranty.',
    bot_short_description: 'Official AI & developer subscriptions at wholesale prices with instant delivery ⚡',
  },

  es: {
    // Spanish
    main_menu_title: '<b>UpStore Digital</b>',
    main_menu_sub: 'Suscripciones oficiales de IA, herramientas de desarrollo y apps premium.',
    btn_catalog: 'Productos',
    btn_orders: 'Mis Pedidos',
    btn_wallet: 'Billetera y Pago',
    btn_referral: 'Recompensas',
    btn_support: 'Soporte',
    btn_warranty: 'Garantía',
    btn_language: '🌐 Idioma',
    btn_main_menu: 'Inicio',
    btn_back: 'Atrás',
    btn_refresh: 'Actualizar',
    btn_copy_hint: 'Toca el número para copiar',

    select_language_title: '<b>Selecciona tu idioma</b>',
    select_language_sub: 'Elige tu idioma preferido:',
    language_changed: 'Idioma cambiado con éxito ✅',

    catalog_title: '<b>Categorías de la Tienda</b>',
    catalog_sub: 'Selecciona una categoría:',
    select_brand_sub: 'Selecciona una marca o servicio para ver planes y precios:',
    select_tier_sub: 'Elige tu plan y duración preferidos para entrega inmediata:',
    starting_from: 'Desde',
    cat_ai: 'Inteligencia Artificial',
    cat_dev: 'Herramientas de Desarrollador',
    cat_design: 'Diseño y Creatividad',
    cat_stream: 'Streaming y Música',
    cat_vpn: 'Seguridad y VPN',
    cat_prod: 'Productividad y Oficina',

    product_price: 'Precio',
    original_price: 'Original',
    discount: 'Descuento',
    delivery: 'Entrega',
    duration_label: 'Duración',
    warranty_label: 'Garantía',
    local_price_label: 'Equivalente local',
    features_label: 'Características',
    instant_delivery: 'Instantánea y Automática',
    warranty_badge: 'Garantía de reemplazo 100% durante todo el período',
    choose_payment: 'Elige el método de pago:',
    btn_pay_bybit: 'Pagar con Bybit (Sin comisiones)',
    btn_pay_binance: 'Pagar con Binance Pay',
    btn_pay_local: 'Pago Local',

    bybit_checkout_title: '<b>Pago por Bybit (Sin comisiones)</b>',
    bybit_uid_label: 'UID de Bybit:',
    bybit_amount_label: 'Monto a transferir:',
    bybit_step1: '1. Transfiere el monto al UID de Bybit mostrado arriba.',
    bybit_step2: '2. Pulsa el botón para verificar y recibir tu cuenta al instante.',
    btn_verify_bybit: 'Verificar Pago Ahora',

    binance_checkout_title: '<b>Pago por Binance Pay</b>',
    binance_id_label: 'Binance Pay ID:',
    binance_step1: '1. Transfiere el monto al ID de Binance arriba.',
    binance_step2: '2. Envía el ID de tu transacción aquí en el chat.',
    btn_verify_binance: 'Transferencia Completada',

    local_checkout_title: '<b>Pago Local</b>',
    instapay_label: 'InstaPay:',
    vfcash_label: 'Vodafone Cash:',
    local_amount_label: 'Monto:',
    local_step: 'Transfiere el monto y envía el comprobante aquí.',

    referral_title: '<b>Recompensas y Saldo</b>',
    referral_desc: 'Comparte tu enlace y gana saldo para comprar cualquier suscripción gratis.',
    referral_formula: '• Cada amigo = 1 punto\n• Cada 5 puntos = $1.00 USD de saldo en tienda',
    invited_friends: 'Amigos invitados:',
    total_points: 'Puntos totales:',
    wallet_balance: 'Saldo de compras:',
    points_to_next: 'Puntos para el próximo $1:',
    ref_link_label: 'Tu enlace de invitación:',
    btn_share_tg: 'Compartir en Telegram',
    btn_share_wa: 'Compartir en WhatsApp',
    btn_shop_with_balance: 'Ver Productos y Comprar',

    support_title: '<b>Soporte al Cliente</b>',
    support_desc: 'Nuestro equipo de soporte está disponible 24/7:',
    support_handle: 'Contacto directo:',
    warranty_title: '<b>Política de Garantía Dorada</b>',
    warranty_desc: '• Garantía de reemplazo inmediato durante todo el período.\n• Cuentas 100% oficiales y sin interrupciones.',

    orders_title: '<b>Mis Pedidos</b>',
    no_orders: 'No tienes pedidos registrados todavía.',

    bot_description: 'Tienda oficial UpStore de suscripciones premium de IA (ChatGPT Plus, Gemini, Claude, Cursor, Canva, Netflix) al mejor precio con entrega instantánea y garantía 100%.',
    bot_short_description: 'Suscripciones oficiales de IA al mejor precio con entrega inmediata ⚡',
  },

  fr: {
    // French
    main_menu_title: '<b>UpStore Digital</b>',
    main_menu_sub: 'Abonnements officiels IA, outils de développement et applications premium.',
    btn_catalog: 'Produits',
    btn_orders: 'Mes Commandes',
    btn_wallet: 'Portefeuille & Paiement',
    btn_referral: 'Récompenses',
    btn_support: 'Support',
    btn_warranty: 'Garantie',
    btn_language: '🌐 Langue',
    btn_main_menu: 'Accueil',
    btn_back: 'Retour',
    btn_refresh: 'Actualiser',
    btn_copy_hint: 'Appuyez sur le numéro pour copier',

    select_language_title: '<b>Choisissez votre langue</b>',
    select_language_sub: 'Sélectionnez votre langue préférée:',
    language_changed: 'Langue mise à jour avec succès ✅',

    catalog_title: '<b>Catégories</b>',
    catalog_sub: 'Sélectionnez une catégorie:',
    select_brand_sub: 'Sélectionnez une marque ou un service pour voir les forfaits et tarifs:',
    select_tier_sub: 'Choisissez votre forfait et durée pour une livraison instantanée:',
    starting_from: 'À partir de',
    cat_ai: 'Intelligence Artificielle',
    cat_dev: 'Outils Développeur',
    cat_design: 'Design & Médias',
    cat_stream: 'Streaming & Musique',
    cat_vpn: 'Sécurité & VPN',
    cat_prod: 'Productivité & Bureau',

    product_price: 'Prix',
    original_price: 'Original',
    discount: 'Réduction',
    delivery: 'Livraison',
    duration_label: 'Durée',
    warranty_label: 'Garantie',
    local_price_label: 'Équivalent local',
    features_label: 'Avantages clés',
    instant_delivery: 'Instantanée et Automatique',
    warranty_badge: 'Garantie de remplacement 100% pendant toute la durée',
    choose_payment: 'Choisissez le moyen de paiement:',
    btn_pay_bybit: 'Payer via Bybit (Sans frais)',
    btn_pay_binance: 'Payer via Binance Pay',
    btn_pay_local: 'Paiement Local',

    bybit_checkout_title: '<b>Paiement via Bybit (Sans frais)</b>',
    bybit_uid_label: 'UID Bybit:',
    bybit_amount_label: 'Montant à transférer:',
    bybit_step1: '1. Transférez le montant à l’UID Bybit ci-dessus.',
    bybit_step2: '2. Cliquez sur le bouton pour vérifier et recevoir votre compte.',
    btn_verify_bybit: 'Vérifier le paiement',

    binance_checkout_title: '<b>Paiement via Binance Pay</b>',
    binance_id_label: 'Binance Pay ID:',
    binance_step1: '1. Transférez le montant à l’ID Binance ci-dessus.',
    binance_step2: '2. Envoyez l’ID de transaction ici pour activer votre commande.',
    btn_verify_binance: 'Transfert effectué',

    local_checkout_title: '<b>Paiement Local</b>',
    instapay_label: 'InstaPay:',
    vfcash_label: 'Vodafone Cash:',
    local_amount_label: 'Montant:',
    local_step: 'Transférez le montant et envoyez le reçu ici.',

    referral_title: '<b>Récompenses & Portefeuille</b>',
    referral_desc: 'Partagez votre lien et gagnez du crédit pour acheter n’importe quel abonnement.',
    referral_formula: '• 1 ami = 1 point\n• 5 points = 1.00$ de crédit magasin',
    invited_friends: 'Amis invités:',
    total_points: 'Points totaux:',
    wallet_balance: 'Crédit magasin:',
    points_to_next: 'Points pour le prochain 1$:',
    ref_link_label: 'Votre lien d’invitation:',
    btn_share_tg: 'Partager sur Telegram',
    btn_share_wa: 'Partager sur WhatsApp',
    btn_shop_with_balance: 'Voir les produits & Acheter',

    support_title: '<b>Support Client</b>',
    support_desc: 'Notre équipe de support est disponible 24/7:',
    support_handle: 'Contact direct:',
    warranty_title: '<b>Politique de Garantie</b>',
    warranty_desc: '• Garantie de remplacement immédiat sur toute la période.\n• Comptes 100% officiels sans interruption.',

    orders_title: '<b>Mes Commandes</b>',
    no_orders: 'Vous n’avez aucune commande pour le moment.',

    bot_description: 'Boutique officielle UpStore pour abonnements IA premium (ChatGPT Plus, Gemini, Claude, Cursor, Canva, Netflix) aux prix les plus bas avec livraison instantanée et garantie 100%.',
    bot_short_description: 'Abonnements IA officiels aux prix les plus bas avec livraison immédiate ⚡',
  },

  ru: {
    // Russian
    main_menu_title: '<b>UpStore Цифровой Магазин</b>',
    main_menu_sub: 'Официальные подписки на нейросети, инструменты для разработчиков и приложения.',
    btn_catalog: 'Товары',
    btn_orders: 'Мои заказы',
    btn_wallet: 'Кошелек и оплата',
    btn_referral: 'Бонусы',
    btn_support: 'Поддержка',
    btn_warranty: 'Гарантия',
    btn_language: '🌐 Язык',
    btn_main_menu: 'Главная',
    btn_back: 'Назад',
    btn_refresh: 'Обновить',
    btn_copy_hint: 'Нажмите на номер для копирования',

    select_language_title: '<b>Выберите язык / Select Language</b>',
    select_language_sub: 'Выберите удобный язык для работы с ботом:',
    language_changed: 'Язык успешно изменен ✅',

    catalog_title: '<b>Категории магазина</b>',
    catalog_sub: 'Выберите категорию товаров:',
    select_brand_sub: 'Выберите сервис или бренд, чтобы увидеть тарифы и цены:',
    select_tier_sub: 'Выберите подходящий тариф и срок для моментальной доставки:',
    starting_from: 'От',
    cat_ai: 'Искусственный интеллект',
    cat_dev: 'Инструменты разработчика',
    cat_design: 'Дизайн и креатив',
    cat_stream: 'Стриминг и музыка',
    cat_vpn: 'Безопасность и VPN',
    cat_prod: 'Продуктивность и офис',

    product_price: 'Цена',
    original_price: 'Официальная',
    discount: 'Скидка',
    delivery: 'Доставка',
    duration_label: 'Срок',
    warranty_label: 'Гарантия',
    local_price_label: 'В местной валюте',
    features_label: 'Преимущества',
    instant_delivery: 'Моментально и автоматически',
    warranty_badge: '100% гарантия замены на весь срок',
    choose_payment: 'Выберите способ оплаты:',
    btn_pay_bybit: 'Оплата через Bybit (0% комиссии)',
    btn_pay_binance: 'Оплата через Binance Pay',
    btn_pay_local: 'Местный перевод',

    bybit_checkout_title: '<b>Оплата через Bybit (Без комиссии)</b>',
    bybit_uid_label: 'Bybit UID:',
    bybit_amount_label: 'Сумма к переводу:',
    bybit_step1: '1. Переведите сумму на Bybit UID выше (внутренний перевод).',
    bybit_step2: '2. Нажмите кнопку проверки для мгновенного получения аккаунта.',
    btn_verify_bybit: 'Проверить оплату',

    binance_checkout_title: '<b>Оплата через Binance Pay</b>',
    binance_id_label: 'Binance Pay ID:',
    binance_step1: '1. Переведите точную сумму на Binance ID выше.',
    binance_step2: '2. Отправьте ID транзакции в этот чат для активации.',
    btn_verify_binance: 'Перевод выполнен',

    local_checkout_title: '<b>Локальная оплата</b>',
    instapay_label: 'InstaPay:',
    vfcash_label: 'Vodafone Cash:',
    local_amount_label: 'Сумма:',
    local_step: 'Переведите сумму и отправьте скриншот чека в чат.',

    referral_title: '<b>Бонусы и баланс кошелька</b>',
    referral_desc: 'Делитесь своей ссылкой и получайте баланс для бесплатных покупок.',
    referral_formula: '• 1 приглашенный = 1 балл\n• Каждые 5 баллов = $1.00 на баланс магазина',
    invited_friends: 'Приглашено друзей:',
    total_points: 'Всего баллов:',
    wallet_balance: 'Баланс кошелька:',
    points_to_next: 'Баллов до следующего $1:',
    ref_link_label: 'Ваша реферальная ссылка:',
    btn_share_tg: 'Поделиться в Telegram',
    btn_share_wa: 'Поделиться в WhatsApp',
    btn_shop_with_balance: 'Купить за баланс',

    support_title: '<b>Служба поддержки</b>',
    support_desc: 'Наша поддержка работает круглосуточно 24/7:',
    support_handle: 'Прямой контакт:',
    warranty_title: '<b>Золотая гарантия</b>',
    warranty_desc: '• Мгновенная замена аккаунта в течение всего срока.\n• 100% официальные подписки без сбоев.\n• Круглосуточная помощь.',

    orders_title: '<b>Мои заказы</b>',
    no_orders: 'У вас пока нет заказов.',

    bot_description: 'Официальный магазин UpStore для премиум подписок ИИ (ChatGPT Plus, Gemini, Claude, Cursor, Canva, Netflix) по лучшим ценам с мгновенной выдачей и 100% гарантией.',
    bot_short_description: 'Официальные подписки ИИ по выгодным ценам с мгновенной доставкой ⚡',
  },

  tr: {
    // Turkish
    main_menu_title: '<b>UpStore Dijital Mağaza</b>',
    main_menu_sub: 'Resmi yapay zeka abonelikleri, geliştirici araçları ve premium uygulamalar.',
    btn_catalog: 'Ürünler',
    btn_orders: 'Siparişlerim',
    btn_wallet: 'Cüzdan ve Ödeme',
    btn_referral: 'Ödüller',
    btn_support: 'Destek',
    btn_warranty: 'Garanti',
    btn_language: '🌐 Dil / Language',
    btn_main_menu: 'Ana Menü',
    btn_back: 'Geri',
    btn_refresh: 'Yenile',
    btn_copy_hint: 'Kopyalamak için numaraya dokunun',

    select_language_title: '<b>Dil Seçimi / Select Language</b>',
    select_language_sub: 'Lütfen kullanmak istediğiniz dili seçin:',
    language_changed: 'Dil başarıyla güncellendi ✅',

    catalog_title: '<b>Kategoriler</b>',
    catalog_sub: 'Bir kategori seçin:',
    select_brand_sub: 'Mevcut paketleri ve fiyatları görmek için bir marka veya servis seçin:',
    select_tier_sub: 'Anında teslimat için tercih ettiğiniz paket ve süreyi seçin:',
    starting_from: 'Başlangıç',
    cat_ai: 'Yapay Zeka (AI)',
    cat_dev: 'Geliştirici Araçları',
    cat_design: 'Tasarım ve Medya',
    cat_stream: 'Yayın ve Müzik',
    cat_vpn: 'Güvenlik ve VPN',
    cat_prod: 'Üretkenlik ve Ofis',

    product_price: 'Fiyat',
    original_price: 'Orijinal',
    discount: 'İndirim',
    delivery: 'Teslimat',
    duration_label: 'Süre',
    warranty_label: 'Garanti',
    local_price_label: 'Yerel Para Birimi',
    features_label: 'Özellikler',
    instant_delivery: 'Anında ve Otomatik',
    warranty_badge: 'Tüm süre boyunca %100 değişim garantisi',
    choose_payment: 'Ödeme yöntemini seçin:',
    btn_pay_bybit: 'Bybit ile Öde (Komisyonsuz)',
    btn_pay_binance: 'Binance Pay ile Öde',
    btn_pay_local: 'Yerel Ödeme',

    bybit_checkout_title: '<b>Bybit ile Ödeme (Sıfır Komisyon)</b>',
    bybit_uid_label: 'Bybit UID:',
    bybit_amount_label: 'Ödenecek Tutar:',
    bybit_step1: '1. Tutarı yukarıdaki Bybit UID numarasına gönderin.',
    bybit_step2: '2. Hesabınızı anında almak için aşağıdaki butona basın.',
    btn_verify_bybit: 'Ödemeyi Doğrula',

    binance_checkout_title: '<b>Binance Pay ile Ödeme</b>',
    binance_id_label: 'Binance Pay ID:',
    binance_step1: '1. Tutarı yukarıdaki Binance ID numarasına gönderin.',
    binance_step2: '2. Siparişinizi onaylamak için işlem ID numarasını buraya gönderin.',
    btn_verify_binance: 'Transfer Tamamlandı',

    local_checkout_title: '<b>Yerel Ödeme</b>',
    instapay_label: 'InstaPay:',
    vfcash_label: 'Vodafone Cash:',
    local_amount_label: 'Tutar:',
    local_step: 'Tutarı aktarın ve dekont ekran görüntüsünü buraya gönderin.',

    referral_title: '<b>Ödüller ve Cüzdan Bakiyesi</b>',
    referral_desc: 'Davet linkinizi paylaşın ve ücretsiz abonelik almak için bakiye kazanın.',
    referral_formula: '• Her davet = 1 puan\n• Her 5 puan = $1.00 mağaza bakiyesi',
    invited_friends: 'Davet Edilenler:',
    total_points: 'Toplam Puan:',
    wallet_balance: 'Cüzdan Bakiyesi:',
    points_to_next: 'Sonraki $1 için kalan:',
    ref_link_label: 'Davet Linkiniz:',
    btn_share_tg: 'Telegram’da Paylaş',
    btn_share_wa: 'WhatsApp’ta Paylaş',
    btn_shop_with_balance: 'Ürünleri Gör & Bakiyeyle Al',

    support_title: '<b>Müşteri Desteği</b>',
    support_desc: 'Destek ekibimiz 7/24 hizmetinizdedir:',
    support_handle: 'Doğrudan İletişim:',
    warranty_title: '<b>Altın Garanti Politikası</b>',
    warranty_desc: '• Süre boyunca anında birebir değişim garantisi.\n• %100 kesintisiz ve resmi hesaplar.',

    orders_title: '<b>Siparişlerim</b>',
    no_orders: 'Henüz bir siparişiniz bulunmuyor.',

    bot_description: 'Yapay zeka premium abonelikleri için resmi UpStore mağazası (ChatGPT Plus, Gemini, Claude, Cursor, Canva, Netflix). Anında teslimat ve %100 değişim garantisi.',
    bot_short_description: 'En uygun fiyatlarla resmi yapay zeka abonelikleri ve anında teslimat ⚡',
  },

  de: {
    // German
    main_menu_title: '<b>UpStore Digitaler Store</b>',
    main_menu_sub: 'Offizielle KI-Abonnements, Entwicklertools und Premium-Apps.',
    btn_catalog: 'Produkte',
    btn_orders: 'Meine Bestellungen',
    btn_wallet: 'Guthaben & Zahlung',
    btn_referral: 'Belohnungen',
    btn_support: 'Support',
    btn_warranty: 'Garantie',
    btn_language: '🌐 Sprache / Language',
    btn_main_menu: 'Startseite',
    btn_back: 'Zurück',
    btn_refresh: 'Aktualisieren',
    btn_copy_hint: 'Tippen Sie auf die Nummer zum Kopieren',

    select_language_title: '<b>Sprache wählen / Select Language</b>',
    select_language_sub: 'Wählen Sie Ihre bevorzugte Sprache:',
    language_changed: 'Sprache erfolgreich geändert ✅',

    catalog_title: '<b>Kategorien</b>',
    catalog_sub: 'Wählen Sie eine Kategorie:',
    select_brand_sub: 'Wählen Sie eine Marke oder einen Dienst, um Tarife und Preise anzuzeigen:',
    select_tier_sub: 'Wählen Sie Ihren bevorzugten Tarif und Zeitraum für sofortige Lieferung:',
    starting_from: 'Ab',
    cat_ai: 'Künstliche Intelligenz',
    cat_dev: 'Entwickler-Tools',
    cat_design: 'Design & Medien',
    cat_stream: 'Streaming & Musik',
    cat_vpn: 'Sicherheit & VPN',
    cat_prod: 'Produktivität & Office',

    product_price: 'Preis',
    original_price: 'Original',
    discount: 'Rabatt',
    delivery: 'Lieferung',
    duration_label: 'Laufzeit',
    warranty_label: 'Garantie',
    local_price_label: 'Lokaler Preis',
    features_label: 'Vorteile',
    instant_delivery: 'Sofort und automatisch',
    warranty_badge: '100% Ersatzgarantie über die gesamte Laufzeit',
    choose_payment: 'Zahlungsmethode wählen:',
    btn_pay_bybit: 'Mit Bybit bezahlen (0% Gebühren)',
    btn_pay_binance: 'Mit Binance Pay bezahlen',
    btn_pay_local: 'Lokale Zahlung',

    bybit_checkout_title: '<b>Zahlung per Bybit (Gebührenfrei)</b>',
    bybit_uid_label: 'Bybit UID:',
    bybit_amount_label: 'Zu zahlender Betrag:',
    bybit_step1: '1. Überweisen Sie den Betrag an die obige Bybit UID.',
    bybit_step2: '2. Klicken Sie auf Überprüfen, um Ihr Konto sofort zu erhalten.',
    btn_verify_bybit: 'Zahlung überprüfen',

    binance_checkout_title: '<b>Zahlung per Binance Pay</b>',
    binance_id_label: 'Binance Pay ID:',
    binance_step1: '1. Überweisen Sie den Betrag an die obige Binance ID.',
    binance_step2: '2. Senden Sie Ihre Transaktions-ID hier im Chat.',
    btn_verify_binance: 'Überweisung abgeschlossen',

    local_checkout_title: '<b>Lokale Zahlung</b>',
    instapay_label: 'InstaPay:',
    vfcash_label: 'Vodafone Cash:',
    local_amount_label: 'Betrag:',
    local_step: 'Überweisen Sie den Betrag und senden Sie den Beleg hier.',

    referral_title: '<b>Belohnungen & Guthaben</b>',
    referral_desc: 'Teilen Sie Ihren Link und erhalten Sie Guthaben für kostenlose Abonnements.',
    referral_formula: '• 1 Einladung = 1 Punkt\n• Alle 5 Punkte = $1.00 Shop-Guthaben',
    invited_friends: 'Eingeladene Freunde:',
    total_points: 'Gesamtpunkte:',
    wallet_balance: 'Guthaben:',
    points_to_next: 'Punkte bis zum nächsten $1:',
    ref_link_label: 'Ihr Einladungslink:',
    btn_share_tg: 'Auf Telegram teilen',
    btn_share_wa: 'Auf WhatsApp teilen',
    btn_shop_with_balance: 'Produkte ansehen & Kaufen',

    support_title: '<b>Kundenservice</b>',
    support_desc: 'Unser Support-Team ist rund um die Uhr 24/7 für Sie da:',
    support_handle: 'Direktkontakt:',
    warranty_title: '<b>Goldene Garantie</b>',
    warranty_desc: '• Sofortiger Ersatz bei Problemen während der gesamten Laufzeit.\n• 100% offizielle und stabile Konten.',

    orders_title: '<b>Meine Bestellungen</b>',
    no_orders: 'Sie haben noch keine Bestellungen.',

    bot_description: 'Offizieller UpStore für Premium-KI-Abonnements (ChatGPT Plus, Gemini, Claude, Cursor, Canva, Netflix) zu Bestpreisen mit Sofortlieferung und 100% Garantie.',
    bot_short_description: 'Offizielle KI-Abonnements zu Großhandelspreisen mit Sofortlieferung ⚡',
  },
};

/**
 * Translate helper
 */
export function t(key, lang = DEFAULT_LANGUAGE, params = {}) {
  const l = SUPPORTED_LANGUAGES[lang] ? lang : DEFAULT_LANGUAGE;
  const dict = I18N_STRINGS[l] || I18N_STRINGS[DEFAULT_LANGUAGE];
  let text = dict[key] || I18N_STRINGS[DEFAULT_LANGUAGE][key] || key;
  
  for (const [k, v] of Object.entries(params)) {
    text = text.replaceAll(`{${k}}`, String(v));
  }
  return text;
}
