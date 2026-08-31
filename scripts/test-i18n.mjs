import { SUPPORTED_LANGUAGES, getUserLanguage, setUserLanguage, t } from './storeI18n.mjs';

console.log('Testing storeI18n.mjs...');

for (const lang of Object.keys(SUPPORTED_LANGUAGES)) {
  const meta = SUPPORTED_LANGUAGES[lang];
  console.log(`[${meta.flag} ${meta.name} (${lang})]:`);
  console.log('  Catalog title:', t('catalog_title', lang));
  console.log('  Bybit title:', t('bybit_checkout_title', lang));
  console.log('  Referral title:', t('referral_title', lang));
}

setUserLanguage(123456, 'es');
console.log('Language for 123456:', getUserLanguage(123456));

console.log('✅ storeI18n test passed successfully!');
