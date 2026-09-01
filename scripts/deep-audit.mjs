import fs from 'fs';
import path from 'path';
import { STORE_CATALOG, STORE_CATEGORIES } from './storeCatalog.mjs';
import { t, I18N_STRINGS, SUPPORTED_LANGUAGES, getUserLanguage } from './storeI18n.mjs';
import { TOPUP_DENOMINATIONS, MIN_TOPUP_USD, calculateTopupBonus } from './storeWallet.mjs';

const issues = [];
const warnings = [];

console.log('🔍 Starting Deep Root Audit of UpStore Bot System...\n');

// 1. Audit Supported Languages and Translation Keys
console.log('─── 1. Auditing Translation Dictionaries ───');
const sampleLang = 'ar';
const allKeys = Object.keys(I18N_STRINGS[sampleLang] || {});
console.log(`Total Keys in Dictionary: ${allKeys.length}`);

const langCodes = Object.keys(SUPPORTED_LANGUAGES);
for (const lang of langCodes) {
  const langDict = I18N_STRINGS[lang];
  if (!langDict) {
    issues.push(`Missing complete language dictionary for: '${lang}'`);
    continue;
  }
  for (const key of allKeys) {
    if (langDict[key] === undefined || langDict[key] === null || langDict[key] === '') {
      issues.push(`Missing key '${key}' in language '${lang}'`);
    }
  }
}

// 2. Scan for t('...', ...) usage in bot scripts and check if any key is missing
console.log('\n─── 2. Auditing Translation Keys in Code ───');
const scriptsToScan = [
  'scripts/telegram-support-bot.mjs',
  'scripts/liveMonitor.mjs',
  'scripts/storeWallet.mjs',
  'scripts/storeCatalog.mjs',
];

const tKeyRegex = /(?:^|[^\w$.])t\(\s*['"]([a-zA-Z0-9_-]+)['"]/g;
const usedKeys = new Set();

for (const script of scriptsToScan) {
  if (fs.existsSync(script)) {
    const code = fs.readFileSync(script, 'utf8');
    let match;
    while ((match = tKeyRegex.exec(code)) !== null) {
      usedKeys.add(match[1]);
    }
  }
}

console.log(`Unique t() translation keys used across codebase: ${usedKeys.size}`);
for (const key of usedKeys) {
  for (const lang of langCodes) {
    const val = t(key, lang);
    if (!val || val === key) {
      issues.push(`Code uses key '${key}' which is MISSING or empty in '${lang}'!`);
    }
  }
}

// 3. Scan for Parameterized Translations {param}
console.log('\n─── 3. Auditing Parameter Placeholders {var} ───');
for (const key of allKeys) {
  const arVal = I18N_STRINGS.ar[key] || '';
  const arPlaceholders = (arVal.match(/\{([a-zA-Z0-9_]+)\}/g) || []).sort();
  for (const lang of langCodes) {
    const val = I18N_STRINGS[lang][key] || '';
    const placeholders = (val.match(/\{([a-zA-Z0-9_]+)\}/g) || []).sort();
    if (JSON.stringify(arPlaceholders) !== JSON.stringify(placeholders)) {
      warnings.push(`Placeholder mismatch in key '${key}': [${lang}] has ${JSON.stringify(placeholders)} vs [ar] ${JSON.stringify(arPlaceholders)}`);
    }
  }
}

// 4. Audit Catalog Products, Pricing, Durations, and Warranties
console.log('\n─── 4. Auditing Catalog & Pricing Integrity ───');
console.log(`Total Products in Catalog: ${STORE_CATALOG.length}`);
const seenIds = new Set();

const validDeliveryTypes = [
  'personal_account',
  'private_account',
  'vpn_credentials',
  'license_key',
  'shared_account',
  'invite_link',
  'api_key',
  'api_token',
  'auto_instant',
  'manual_private'
];

for (const prod of STORE_CATALOG) {
  if (!prod.id) issues.push(`Product missing ID: ${JSON.stringify(prod)}`);
  if (seenIds.has(prod.id)) issues.push(`Duplicate Product ID: ${prod.id}`);
  seenIds.add(prod.id);

  if (typeof prod.our_price !== 'number' || prod.our_price <= 0) {
    issues.push(`Invalid our_price for ${prod.id}: ${prod.our_price}`);
  }
  if (typeof prod.market_price !== 'number' || prod.market_price < prod.our_price) {
    warnings.push(`Market price ($${prod.market_price}) is less than wholesale price ($${prod.our_price}) for ${prod.id}`);
  }

  // Verify delivery_type
  if (!validDeliveryTypes.includes(prod.delivery_type)) {
    issues.push(`Invalid delivery_type '${prod.delivery_type}' in product ${prod.id}`);
  }

  // Verify advantages in all 7 languages
  for (const lang of langCodes) {
    const advKey = `advantages_${lang}`;
    if (!Array.isArray(prod[advKey]) || prod[advKey].length === 0) {
      issues.push(`Product ${prod.id} missing '${advKey}' array!`);
    }
  }
}

// 5. Audit Top-up Denominations and Bonus Math
console.log('\n─── 5. Auditing Top-up Denominations & Bonus Math ───');
console.log(`Minimum Top-up USD: $${MIN_TOPUP_USD}`);
for (const denom of TOPUP_DENOMINATIONS) {
  if (denom.amount < MIN_TOPUP_USD) {
    issues.push(`Topup denomination $${denom.amount} is below minimum $${MIN_TOPUP_USD}!`);
  }
  const calcBonus = calculateTopupBonus(denom.amount);
  if (calcBonus !== denom.bonus) {
    issues.push(`Bonus mismatch for denomination $${denom.amount}: denom.bonus=${denom.bonus}, calculated=${calcBonus}`);
  }
}

// 6. Report Summary
console.log('\n═══════════════════════════════════════════════');
console.log(`AUDIT RESULTS: ${issues.length} Issues, ${warnings.length} Warnings`);
console.log('═══════════════════════════════════════════════');

if (issues.length > 0) {
  console.log('\n❌ CRITICAL ISSUES FOUND:');
  issues.forEach((iss, i) => console.log(`  ${i + 1}. ${iss}`));
} else {
  console.log('\n✅ ZERO CRITICAL ISSUES FOUND! All core components verified.');
}

if (warnings.length > 0) {
  console.log('\n⚠️ WARNINGS:');
  warnings.forEach((warn, i) => console.log(`  ${i + 1}. ${warn}`));
} else {
  console.log('\n✅ ZERO WARNINGS! Clean system.');
}

if (issues.length > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 AUDIT PASSED 100% SUCCESSFULLY!\n');
}
