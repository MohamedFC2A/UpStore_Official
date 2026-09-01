import fs from 'fs';

const I18N_FILE = 'scripts/storeI18n.mjs';
let content = fs.readFileSync(I18N_FILE, 'utf-8');

const WALLET_NOTICE_KEYS = {
  ar: {
    topup_package_label: "باقة الشحن المختارة:",
    wallet_bonus_label: "بونص إضافي هدية:",
    wallet_total_credited_label: "إجمالي ما سيضاف لمحفظتك:",
    wallet_underpay_notice: "💡 <b>ملاحظة هامة:</b> في حال قمت بتحويل مبلغ مختلف/أقل أو حدث أي خطأ بالتحويل، يُرجى مراسلة الدعم الفني فوراً @UPSTORE_HELP وزودهم بالإيصال وسيقومون بإيداع الرصيد في محفظتك فوراً 🤍",
    bybit_underpay_notice: "💡 <b>تنبيه:</b> في حال تحويل مبلغ أقل أو مختلف، راسل الدعم الفني @UPSTORE_HELP مع إيصال التحويل لإكمال طلبك فوراً.",
  },
  en: {
    topup_package_label: "Selected Top-Up Package:",
    wallet_bonus_label: "Bonus Credit:",
    wallet_total_credited_label: "Total Wallet Credit:",
    wallet_underpay_notice: "💡 <b>Important Notice:</b> If you transferred a different/lower amount or made any transfer error, please contact Support immediately @UPSTORE_HELP with your receipt for instant resolution and crediting 🤍",
    bybit_underpay_notice: "💡 <b>Notice:</b> In case of transferring a lower or different amount, contact Support @UPSTORE_HELP with your transfer receipt.",
  },
  es: {
    topup_package_label: "Paquete de recarga seleccionado:",
    wallet_bonus_label: "Crédito de bonificación:",
    wallet_total_credited_label: "Total a acreditar en billetera:",
    wallet_underpay_notice: "💡 <b>Aviso importante:</b> Si transfirió un monto menor o diferente o tuvo algún error, comuníquese de inmediato con Soporte @UPSTORE_HELP con su comprobante para acreditar su saldo 🤍",
    bybit_underpay_notice: "💡 <b>Aviso:</b> En caso de transferir un monto menor o diferente, comuníquese con Soporte @UPSTORE_HELP.",
  },
  fr: {
    topup_package_label: "Forfait de recharge sélectionné :",
    wallet_bonus_label: "Crédit bonus :",
    wallet_total_credited_label: "Total crédité au portefeuille :",
    wallet_underpay_notice: "💡 <b>Avis important :</b> Si vous avez transféré un montant inférieur ou différent, veuillez contacter immédiatement l'assistance @UPSTORE_HELP avec votre reçu pour créditer votre solde 🤍",
    bybit_underpay_notice: "💡 <b>Avis :</b> En cas de transfert d'un montant inférieur ou différent, contactez le support @UPSTORE_HELP.",
  },
  ru: {
    topup_package_label: "Выбранный пакет пополнения:",
    wallet_bonus_label: "Бонусный баланс:",
    wallet_total_credited_label: "Всего будет начислено:",
    wallet_underpay_notice: "💡 <b>Важное примечание:</b> Если вы перевели меньшую или другую сумму или возникла ошибка, свяжитесь со службой поддержки @UPSTORE_HELP с чеком перевода для зачисления баланса 🤍",
    bybit_underpay_notice: "💡 <b>Примечание:</b> При переводе меньшей суммы свяжитесь с поддержкой @UPSTORE_HELP с чеком перевода.",
  },
  tr: {
    topup_package_label: "Seçilen Yükleme Paketi:",
    wallet_bonus_label: "Hediye Bonus:",
    wallet_total_credited_label: "Toplam Cüzdana Eklenecek:",
    wallet_underpay_notice: "💡 <b>Önemli Not:</b> Daha düşük veya farklı bir tutar transfer ettiyseniz, lütfen dekontunuzla birlikte hemen Destek @UPSTORE_HELP ile iletişime geçin, bakiyeniz anında yüklenecektir 🤍",
    bybit_underpay_notice: "💡 <b>Not:</b> Daha düşük veya farklı bir tutar transfer ettiyseniz @UPSTORE_HELP ile iletişime geçin.",
  },
  de: {
    topup_package_label: "Ausgewähltes Aufladepaket:",
    wallet_bonus_label: "Bonusguthaben:",
    wallet_total_credited_label: "Gesamtgutschrift Wallet:",
    wallet_underpay_notice: "💡 <b>Wichtiger Hinweis:</b> Falls Sie einen abweichenden oder geringeren Betrag überwiesen haben, wenden Sie sich bitte mit dem Beleg an den Support @UPSTORE_HELP zur schnellen Gutschrift 🤍",
    bybit_underpay_notice: "💡 <b>Hinweis:</b> Bei Überweisung eines geringeren Betrags wenden Sie sich bitte mit dem Beleg an @UPSTORE_HELP.",
  },
};

for (const [lang, keys] of Object.entries(WALLET_NOTICE_KEYS)) {
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
console.log('✅ Injected wallet notice keys into scripts/storeI18n.mjs');
