import {
  SUPPORTED_LANGUAGES,
  getUserLanguage,
  setUserLanguage,
  detectUserLanguage,
  getLocalizedDuration,
  getLocalizedWarranty,
  t,
  I18N_STRINGS,
} from './storeI18n.mjs';

console.log('🧪 Starting comprehensive storeI18n automated verification...\n');

const langCodes = Object.keys(SUPPORTED_LANGUAGES);
console.log(`Checking all ${langCodes.length} supported languages:`, langCodes);

// 1. Check all keys exist across all 7 languages
const arKeys = Object.keys(I18N_STRINGS.ar);
let missingKeyCount = 0;

for (const lang of langCodes) {
  const currentKeys = new Set(Object.keys(I18N_STRINGS[lang]));
  for (const k of arKeys) {
    if (!currentKeys.has(k)) {
      console.error(`❌ [${lang}] missing key: ${k}`);
      missingKeyCount++;
    }
  }
}

if (missingKeyCount === 0) {
  console.log(`✅ All ${arKeys.length} dictionary keys are 100% complete across all 7 languages!`);
} else {
  console.error(`❌ Found ${missingKeyCount} missing keys!`);
  process.exit(1);
}

// 2. Test Smart Auto-Detection: English Telegram client ('en') MUST detect 'en'
const testUserEn = `test_en_${Date.now()}`;
const detectedEn = detectUserLanguage(testUserEn, 'en');
console.log(`\nAuto-detection test (en): Telegram 'en' -> Detected: '${detectedEn}'`);
if (detectedEn !== 'en') {
  console.error(`❌ Expected 'en', got '${detectedEn}'`);
  process.exit(1);
}

// 3. Test Smart Auto-Detection for Russian, Turkish, German, French, Spanish
const locales = [
  { code: 'ru', expected: 'ru' },
  { code: 'tr', expected: 'tr' },
  { code: 'de', expected: 'de' },
  { code: 'fr', expected: 'fr' },
  { code: 'es', expected: 'es' },
  { code: 'ar', expected: 'ar' },
  { code: 'zh', expected: 'en' }, // unsupported falls back to 'en'
];

for (const loc of locales) {
  const cid = `test_${loc.code}_${Date.now()}`;
  const res = detectUserLanguage(cid, loc.code);
  if (res !== loc.expected) {
    console.error(`❌ Auto-detect failed for ${loc.code}: expected ${loc.expected}, got ${res}`);
    process.exit(1);
  }
}
console.log('✅ Smart Auto-Detection test passed for all locales and fallback!');

// 4. Test Manual Override Persistence
const testManualUser = `manual_${Date.now()}`;
detectUserLanguage(testManualUser, 'en'); // Initially auto-detected as 'en'
setUserLanguage(testManualUser, 'es'); // Manually switched to 'es'
const postOverride = detectUserLanguage(testManualUser, 'en'); // Subsequent message with Telegram 'en'
console.log(`Manual override test: Auto 'en' -> Switched 'es' -> New message 'en' -> Active: '${postOverride}'`);
if (postOverride !== 'es') {
  console.error(`❌ Manual preference was overridden by auto-detection!`);
  process.exit(1);
}
console.log('✅ Manual language override persistence verified!');

// 5. Test Localized Duration & Warranty
const durTest = getLocalizedDuration('18 شهراً كاملاً', 'en');
const warTest = getLocalizedWarranty('18 شهراً ضمان ذهبي', 'en');
console.log('\nDuration (en):', durTest);
console.log('Warranty (en):', warTest);
if (durTest !== '18 Full Months' || warTest !== '18 Months Replacement Warranty') {
  console.error('❌ Duration/Warranty localization failed for English!');
  process.exit(1);
}
// 6. Test matchPersistentButton across Arabic, English, Spanish, etc.
import { matchPersistentButton } from './storeI18n.mjs';

const buttonTests = [
  { input: '🛍️ المنتجات', expected: 'catalog' },
  { input: '🛍️ Products', expected: 'catalog' },
  { input: '💳 المحفظة والدفع', expected: 'payment_methods' },
  { input: '💳 Wallet & Pay', expected: 'payment_methods' },
  { input: '📦 طلباتي', expected: 'my_orders' },
  { input: '📦 My Orders', expected: 'my_orders' },
  { input: '🎁 المكافآت', expected: 'referral' },
  { input: '🎁 Rewards', expected: 'referral' },
  { input: '🏆 عن المتجر (منذ 2022)', expected: 'about_store' },
  { input: '🏆 About Us (Est. 2022)', expected: 'about_store' },
  { input: '🛡️ الضمان', expected: 'warranty_policy' },
  { input: '🛡️ Warranty', expected: 'warranty_policy' },
  { input: '🏠 الرئيسية', expected: 'main_menu' },
  { input: '🏠 Home', expected: 'main_menu' },
  { input: '🌐 Language / اللغة', expected: 'language_select' },
  { input: '👨‍💻 الدعم الفني', expected: 'support' },
];

for (const bt of buttonTests) {
  const res = matchPersistentButton(bt.input);
  if (res !== bt.expected) {
    console.error(`❌ matchPersistentButton failed for '${bt.input}': expected '${bt.expected}', got '${res}'`);
    process.exit(1);
  }
}
console.log(`✅ All ${buttonTests.length} persistent button matching tests passed!`);

console.log('\n🎉 ALL I18N AND MULTI-LANGUAGE TESTS PASSED WITH 100% SUCCESS!\n');
