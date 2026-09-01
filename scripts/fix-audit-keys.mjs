import fs from 'fs';

const I18N_FILE = 'scripts/storeI18n.mjs';
let content = fs.readFileSync(I18N_FILE, 'utf-8');

const KEYS = {
  ar: {
    total_recharged_label: "إجمالي المشحون:",
    total_spent_label: "المشتريات:",
  },
  en: {
    total_recharged_label: "Total Recharged:",
    total_spent_label: "Purchases:",
  },
  es: {
    total_recharged_label: "Total recargado:",
    total_spent_label: "Compras:",
  },
  fr: {
    total_recharged_label: "Total rechargé :",
    total_spent_label: "Achats :",
  },
  ru: {
    total_recharged_label: "Всего пополнено:",
    total_spent_label: "Покупки:",
  },
  tr: {
    total_recharged_label: "Toplam Yüklenen:",
    total_spent_label: "Harcamalar:",
  },
  de: {
    total_recharged_label: "Insgesamt aufgeladen:",
    total_spent_label: "Einkäufe:",
  },
};

for (const [lang, keys] of Object.entries(KEYS)) {
  const marker = `"${lang}": {`;
  const idx = content.indexOf(marker);
  if (idx !== -1) {
    const keysEntries = Object.entries(keys)
      .map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
      .join('\n');
    content = content.slice(0, idx + marker.length) + '\n' + keysEntries + content.slice(idx + marker.length);
  }
}

fs.writeFileSync(I18N_FILE, content);
console.log('✅ Injected total_recharged_label & total_spent_label into storeI18n.mjs');
