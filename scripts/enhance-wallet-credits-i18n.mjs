import fs from 'fs';

const I18N_FILE = 'scripts/storeI18n.mjs';
let content = fs.readFileSync(I18N_FILE, 'utf-8');

const EXTRA_CREDIT_KEYS = {
  ar: {
    wallet_topup_success_title: "🎉 <b>تم تأكيد عملية الدفع وشحن المحفظة بنجاح! 🤍</b>",
    recharged_amount_label: "المبلغ المشحون:",
    total_credited_label: "إجمالي المضاف للمحفظة:",
    amount_credited_label: "المبلغ المضاف:",
    wallet_new_balance_label: "رصيد محفظتك الجديد:",
    wallet_topup_ready_hint: "🛍️ يمكنك الآن تصفح المنتجات والشراء الفوري بضغطة زر واحدة من رصيدك بسعر الجملة!",
  },
  en: {
    wallet_topup_success_title: "🎉 <b>Payment Confirmed & Wallet Credited Successfully! 🤍</b>",
    recharged_amount_label: "Recharged Amount:",
    total_credited_label: "Total Credited to Wallet:",
    amount_credited_label: "Credited Amount:",
    wallet_new_balance_label: "Your New Wallet Balance:",
    wallet_topup_ready_hint: "🛍️ You can now browse products and buy instantly with 1-click using your balance at wholesale rates!",
  },
  es: {
    wallet_topup_success_title: "🎉 <b>¡Pago confirmado y billetera recargada con éxito! 🤍</b>",
    recharged_amount_label: "Monto recargado:",
    total_credited_label: "Total acreditado en billetera:",
    amount_credited_label: "Monto acreditado:",
    wallet_new_balance_label: "Tu nuevo saldo de billetera:",
    wallet_topup_ready_hint: "🛍️ ¡Ahora puedes explorar productos y comprar al instante con 1 clic con tu saldo a precio mayorista!",
  },
  fr: {
    wallet_topup_success_title: "🎉 <b>Paiement confirmé et portefeuille crédité avec succès ! 🤍</b>",
    recharged_amount_label: "Montant rechargé :",
    total_credited_label: "Total crédité au portefeuille :",
    amount_credited_label: "Montant crédité :",
    wallet_new_balance_label: "Nouveau solde du portefeuille :",
    wallet_topup_ready_hint: "🛍️ Vous pouvez maintenant parcourir les produits et acheter en 1 clic avec votre solde au tarif de gros !",
  },
  ru: {
    wallet_topup_success_title: "🎉 <b>Оплата подтверждена, баланс кошелька успешно пополнен! 🤍</b>",
    recharged_amount_label: "Сумма пополнения:",
    total_credited_label: "Всего начислено на кошелек:",
    amount_credited_label: "Зачисленная сумма:",
    wallet_new_balance_label: "Новый баланс вашего кошелька:",
    wallet_topup_ready_hint: "🛍️ Теперь вы можете просматривать товары и покупать в 1 клик со своего баланса по оптовой цене!",
  },
  tr: {
    wallet_topup_success_title: "🎉 <b>Ödeme Onaylandı ve Cüzdan Başarıyla Yüklendi! 🤍</b>",
    recharged_amount_label: "Yüklenen Tutar:",
    total_credited_label: "Cüzdana Eklenen Toplam:",
    amount_credited_label: "Eklenen Tutar:",
    wallet_new_balance_label: "Yeni Cüzdan Bakiyeniz:",
    wallet_topup_ready_hint: "🛍️ Artık ürünlere göz atabilir ve bakiyenizle toptan fiyata tek tıkla anında satın alabilirsiniz!",
  },
  de: {
    wallet_topup_success_title: "🎉 <b>Zahlung bestätigt und Wallet erfolgreich aufgeladen! 🤍</b>",
    recharged_amount_label: "Aufgeladener Betrag:",
    total_credited_label: "Gesamtgutschrift Wallet:",
    amount_credited_label: "Gutgeschriebener Betrag:",
    wallet_new_balance_label: "Ihr neues Wallet-Guthaben:",
    wallet_topup_ready_hint: "🛍️ Sie können jetzt Produkte durchsuchen und sofort per 1-Klick mit Ihrem Guthaben zum Großhandelspreis kaufen!",
  },
};

for (const [lang, keys] of Object.entries(EXTRA_CREDIT_KEYS)) {
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
console.log('✅ Injected extra wallet credit keys into scripts/storeI18n.mjs');
