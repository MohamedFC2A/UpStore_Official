import fs from 'fs';

const I18N_FILE = 'scripts/storeI18n.mjs';
let content = fs.readFileSync(I18N_FILE, 'utf-8');

const VERIFICATION_KEYS = {
  ar: {
    verification_in_progress_title: "🔍 <b>طلب التحقق قيد المراجعة الفورية ⚡</b>",
    verification_eta_label: "الوقت المتوقع للفحص:",
    verification_eta_value: "5 - 15 دقيقة كحد أقصى ⏳",
    verification_status_label: "حالة الطلب:",
    verification_pending_desc: "جاري مطابقة التحويل وتأكيد الإيداع في محفظتك فوراً.",
    verification_guarantee_notice: "💡 <b>ملاحظة:</b> لا تقلق، يستغرق الفحص والاعتماد عادة من <b>5 إلى 15 دقيقة فقط</b>، ورصيدك وطلبك مضمون 100%. إذا احتجت لأي مساعدة راسل الدعم: @UPSTORE_HELP 🤍",
    receipt_received_title: "✅ <b>تم استلام الإيصال بنجاح وجاري الفحص!</b>",
    receipt_doc_title: "✅ <b>تم استلام مستند التحويل وجاري الفحص!</b>",
  },
  en: {
    verification_in_progress_title: "🔍 <b>Verification Request Under Instant Review ⚡</b>",
    verification_eta_label: "Estimated Verification Time:",
    verification_eta_value: "5 - 15 Minutes Maximum ⏳",
    verification_status_label: "Order Status:",
    verification_pending_desc: "Matching your transfer and crediting your wallet automatically upon confirmation.",
    verification_guarantee_notice: "💡 <b>Notice:</b> Don't worry, verification takes only <b>5 to 15 minutes</b>, and your order is 100% guaranteed. For support, contact: @UPSTORE_HELP 🤍",
    receipt_received_title: "✅ <b>Receipt Received Successfully & Under Verification!</b>",
    receipt_doc_title: "✅ <b>Transfer Document Received & Under Verification!</b>",
  },
  es: {
    verification_in_progress_title: "🔍 <b>Solicitud de verificación en revisión instantánea ⚡</b>",
    verification_eta_label: "Tiempo estimado de verificación:",
    verification_eta_value: "5 - 15 minutos como máximo ⏳",
    verification_status_label: "Estado del pedido:",
    verification_pending_desc: "Verificando su transferencia y acreditando su saldo automáticamente.",
    verification_guarantee_notice: "💡 <b>Aviso:</b> No se preocupe, la verificación toma solo de <b>5 a 15 minutos</b> y su pedido está 100% garantizado: @UPSTORE_HELP 🤍",
    receipt_received_title: "✅ <b>¡Comprobante recibido con éxito y en verificación!</b>",
    receipt_doc_title: "✅ <b>¡Documento de transferencia recibido y en verificación!</b>",
  },
  fr: {
    verification_in_progress_title: "🔍 <b>Demande de vérification en cours d'examen instantané ⚡</b>",
    verification_eta_label: "Temps estimé de vérification :",
    verification_eta_value: "5 - 15 minutes maximum ⏳",
    verification_status_label: "Statut de la commande :",
    verification_pending_desc: "Correspondance de votre virement et crédit automatique sur votre portefeuille.",
    verification_guarantee_notice: "💡 <b>Avis :</b> Ne vous inquiétez pas, la vérification ne prend que <b>5 à 15 minutes</b> et votre commande est garantie à 100 % : @UPSTORE_HELP 🤍",
    receipt_received_title: "✅ <b>Reçu bien reçu et en cours de vérification !</b>",
    receipt_doc_title: "✅ <b>Document de transfert reçu et en cours de vérification !</b>",
  },
  ru: {
    verification_in_progress_title: "🔍 <b>Запрос на проверку на мгновенном рассмотрении ⚡</b>",
    verification_eta_label: "Ориентировочное время проверки:",
    verification_eta_value: "5 - 15 минут максимум ⏳",
    verification_status_label: "Статус заказа:",
    verification_pending_desc: "Сверка перевода и автоматическое зачисление баланса на ваш кошелек.",
    verification_guarantee_notice: "💡 <b>Примечание:</b> Не переживайте, проверка занимает всего <b>5–15 минут</b>, баланс и заказ гарантированы на 100%: @UPSTORE_HELP 🤍",
    receipt_received_title: "✅ <b>Чек успешно получен и находится на проверке!</b>",
    receipt_doc_title: "✅ <b>Документ перевода получен и находится на проверке!</b>",
  },
  tr: {
    verification_in_progress_title: "🔍 <b>Doğrulama Talebi Anında İncelemede ⚡</b>",
    verification_eta_label: "Tahmini Doğrulama Süresi:",
    verification_eta_value: "Maksimum 5 - 15 Dakika ⏳",
    verification_status_label: "Sipariş Durumu:",
    verification_pending_desc: "Transferiniz eşleştiriliyor ve onaylandığında bakiyeniz cüzdanınıza yüklenecektir.",
    verification_guarantee_notice: "💡 <b>Not:</b> Endişelenmeyin, doğrulama genellikle yalnızca <b>5 ila 15 dakika</b> sürer ve siparişiniz %100 garantilidir: @UPSTORE_HELP 🤍",
    receipt_received_title: "✅ <b>Dekont Başarıyla Alındı ve İnceleniyor!</b>",
    receipt_doc_title: "✅ <b>Transfer Belgesi Alındı ve İnceleniyor!</b>",
  },
  de: {
    verification_in_progress_title: "🔍 <b>Verifizierungsanfrage in sofortiger Prüfung ⚡</b>",
    verification_eta_label: "Voraussichtliche Prüfzeit:",
    verification_eta_value: "Maximal 5 - 15 Minuten ⏳",
    verification_status_label: "Bestellstatus:",
    verification_pending_desc: "Überweisung wird abgeglichen und Guthaben nach Freigabe automatisch gutgeschrieben.",
    verification_guarantee_notice: "💡 <b>Hinweis:</b> Keine Sorge, die Prüfung dauert nur <b>5 bis 15 Minuten</b> und Ihre Bestellung ist zu 100 % garantiert: @UPSTORE_HELP 🤍",
    receipt_received_title: "✅ <b>Beleg erfolgreich erhalten und in Prüfung!</b>",
    receipt_doc_title: "✅ <b>Überweisungsdokument erhalten und in Prüfung!</b>",
  },
};

for (const [lang, keys] of Object.entries(VERIFICATION_KEYS)) {
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
console.log('✅ Injected verification UI keys into scripts/storeI18n.mjs');
