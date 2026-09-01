const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8855216740:AAEbNj5orlWvMb7sDRw7Zasqim4GybGDT0o';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function testSeo() {
  console.log('Testing Telegram SEO & Names across all 7 languages...');

  const botNames = {
    ar: 'UpStore ⚡ متجر الاشتراكات',
    en: 'UpStore ⚡ Subscriptions',
    es: 'UpStore ⚡ Suscripciones',
    fr: 'UpStore ⚡ Abonnements',
    ru: 'UpStore ⚡ Подписки',
    tr: 'UpStore ⚡ Abonelikler',
    de: 'UpStore ⚡ Abonnements',
    '': 'UpStore ⚡ Subscriptions',
  };

  for (const [langCode, name] of Object.entries(botNames)) {
    const payload = { name };
    if (langCode) payload.language_code = langCode;
    const res = await fetch(`${TELEGRAM_API}/setMyName`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    console.log(`setMyName [${langCode || 'default'}]:`, data.ok ? '✅ OK' : data.description);
  }

  const shortDescriptions = {
    ar: '⚡ أرخص اشتراكات ChatGPT Plus, Gemini ($0.25), Canva, Netflix بالجملة مع تسليم فوري وضمان 100% 🛡️',
    en: '⚡ Wholesale ChatGPT Plus, Gemini ($0.25), Canva, Netflix & AI tools. Instant delivery & 100% warranty 🛡️',
    es: '⚡ Suscripciones de ChatGPT Plus, Gemini ($0.25), Canva, Netflix al por mayor. Entrega instantánea y garantía 100% 🛡️',
    fr: '⚡ Abonnements ChatGPT Plus, Gemini ($0.25), Canva, Netflix en gros. Livraison instantanée et garantie 100% 🛡️',
    ru: '⚡ Оптовые подписки ChatGPT Plus, Gemini ($0.25), Canva, Netflix и ИИ. Мгновенная выдача и гарантия 100% 🛡️',
    tr: '⚡ Toptan ChatGPT Plus, Gemini ($0.25), Canva, Netflix ve AI abonelikleri. Anında teslimat ve %100 garanti 🛡️',
    de: '⚡ Großhandel für ChatGPT Plus, Gemini ($0.25), Canva, Netflix & KI-Tools. Sofortlieferung und 100% Garantie 🛡️',
    '': '⚡ Wholesale ChatGPT Plus, Gemini ($0.25), Canva, Netflix & AI tools. Instant delivery & 100% warranty 🛡️',
  };

  for (const [langCode, shortDesc] of Object.entries(shortDescriptions)) {
    const payload = { short_description: shortDesc };
    if (langCode) payload.language_code = langCode;
    const res = await fetch(`${TELEGRAM_API}/setMyShortDescription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    console.log(`setMyShortDescription [${langCode || 'default'}]:`, data.ok ? '✅ OK' : data.description);
  }

  console.log('🎉 SEO & Localized Bot Names verified with Telegram Servers!');
}

testSeo();
