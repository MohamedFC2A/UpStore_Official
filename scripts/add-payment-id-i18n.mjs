import fs from 'fs';

const I18N_FILE = 'scripts/storeI18n.mjs';
let content = fs.readFileSync(I18N_FILE, 'utf-8');

const KEYS = {
  ar: {
    btn_submit_txid: "✍️ إرسال معرّف الدفع (TXID / رقم التحويل)",
    submit_txid_prompt_title: "✍️ <b>يرجى إرسال معرّف أو تفاصيل عملية التحويل:</b>",
    submit_txid_prompt_desc: "📝 اكتب في رسالة هنا أي من البيانات التالية:\n• <b>معرف التحويل / Order ID / Bybit Transfer ID</b>\n• <b>رقم المحفظة أو الحساب الذي قمت بالتحويل منه</b>\n• <b>أو رمز المعاملة (TXID / Hash)</b>\n• <b>أو رقم الهاتف (في حال الدفع المحلي كفودافون كاش أو إنستاباي)</b>",
    submit_txid_prompt_hint: "💡 بمجرد إرسال المعرف، سيصل فوراً إلى شاشة الإدارة للمطابقة واعتماد رصيدك فوراً في غضون دقائق ⚡",
    txid_received_title: "✅ <b>تم استلام معرّف الدفع بنجاح! 🤍</b>",
    payment_id_label: "معرّف الدفع المرسل:",
    txid_forwarded_to_admin_desc: "تم إرسال معرّف وبيانات الدفع الخاصة بك مباشرة إلى إدارة المتجر في شاشة البث المباشر للتحقق الفوري ومطابقة العملية مع حسابنا واعتماد رصيدك ⚡",
  },
  en: {
    btn_submit_txid: "✍️ Submit Payment ID (TXID / Transfer No)",
    submit_txid_prompt_title: "✍️ <b>Please Send Your Payment ID or Transfer Details:</b>",
    submit_txid_prompt_desc: "📝 Type any of the following details in a message here:\n• <b>Transfer ID / Order ID / Bybit Internal Transfer ID</b>\n• <b>Sender Wallet Address or Account Name/Number</b>\n• <b>Transaction Hash (TXID / Ref Code)</b>\n• <b>Sender Phone Number (for local payment methods)</b>",
    submit_txid_prompt_hint: "💡 Once submitted, it will instantly reach our Admin live panel for verification and crediting within minutes ⚡",
    txid_received_title: "✅ <b>Payment ID Received Successfully! 🤍</b>",
    payment_id_label: "Submitted Payment ID:",
    txid_forwarded_to_admin_desc: "Your payment ID & transfer details have been dispatched directly to the live Admin monitor for immediate matching and crediting ⚡",
  },
  es: {
    btn_submit_txid: "✍️ Enviar ID de pago (TXID / Nº de transferencia)",
    submit_txid_prompt_title: "✍️ <b>Por favor envía tu ID de pago o detalles de la transferencia:</b>",
    submit_txid_prompt_desc: "📝 Escribe cualquiera de los siguientes datos en un mensaje aquí:\n• <b>ID de transferencia / Order ID / ID de Bybit</b>\n• <b>Dirección de billetera o cuenta remitente</b>\n• <b>Hash de transacción (TXID / Código de referencia)</b>\n• <b>Número de teléfono remitente (para pagos locales)</b>",
    submit_txid_prompt_hint: "💡 Una vez enviado, llegará al instante a nuestro panel de administración para acreditar tu saldo en minutos ⚡",
    txid_received_title: "✅ <b>¡ID de pago recibido con éxito! 🤍</b>",
    payment_id_label: "ID de pago enviado:",
    txid_forwarded_to_admin_desc: "Tus datos de pago han sido enviados directamente al monitor en vivo de administración para su verificación y acreditación inmediata ⚡",
  },
  fr: {
    btn_submit_txid: "✍️ Envoyer l'ID de paiement (TXID / Nº de virement)",
    submit_txid_prompt_title: "✍️ <b>Veuillez envoyer votre identifiant de paiement ou détails du virement :</b>",
    submit_txid_prompt_desc: "📝 Écrivez l'un des détails suivants dans un message ici :\n• <b>ID de transfert / Order ID / ID de virement Bybit</b>\n• <b>Adresse du portefeuille ou numéro de compte expéditeur</b>\n• <b>Hash de transaction (TXID / Code de référence)</b>\n• <b>Numéro de téléphone expéditeur (pour paiements locaux)</b>",
    submit_txid_prompt_hint: "💡 Une fois envoyé, il parviendra instantanément au panneau d'administration pour créditer votre solde en quelques minutes ⚡",
    txid_received_title: "✅ <b>Identifiant de paiement reçu avec succès ! 🤍</b>",
    payment_id_label: "ID de paiement soumis :",
    txid_forwarded_to_admin_desc: "Vos coordonnées de paiement ont été transmises directement au moniteur administrateur en direct pour vérification et crédit immédiat ⚡",
  },
  ru: {
    btn_submit_txid: "✍️ Отправить ID платежа (TXID / Номер перевода)",
    submit_txid_prompt_title: "✍️ <b>Пожалуйста, отправьте ID платежа или детали перевода:</b>",
    submit_txid_prompt_desc: "📝 Напишите любые из следующих данных в сообщении здесь:\n• <b>ID перевода / Номер заказа / Bybit Transfer ID</b>\n• <b>Адрес кошелька или номер счета отправителя</b>\n• <b>Хеш транзакции (TXID / Код операции)</b>\n• <b>Номер телефона отправителя (для локальных платежей)</b>",
    submit_txid_prompt_hint: "💡 После отправки данные мгновенно поступят администраторам для проверки и начисления баланса за считанные минуты ⚡",
    txid_received_title: "✅ <b>ID платежа успешно получен! 🤍</b>",
    payment_id_label: "Отправленный ID платежа:",
    txid_forwarded_to_admin_desc: "Ваши реквизиты платежа отправлены напрямую администраторам в панель мониторинга для сверки и начисления баланса ⚡",
  },
  tr: {
    btn_submit_txid: "✍️ Ödeme Kimliğini Gönder (TXID / Transfer No)",
    submit_txid_prompt_title: "✍️ <b>Lütfen Ödeme Kimliğinizi veya Transfer Bilgilerini Gönderin:</b>",
    submit_txid_prompt_desc: "📝 Buraya göndereceğiniz mesajda şunlardan birini belirtin:\n• <b>Transfer Kimliği / Sipariş No / Bybit Transfer ID</b>\n• <b>Gönderen cüzdan adresi veya hesap numarası</b>\n• <b>İşlem Kodu (TXID / Referans Kodu)</b>\n• <b>Gönderen telefon numarası (yerel ödemeler için)</b>",
    submit_txid_prompt_hint: "💡 Gönderildikten sonra, bakiyenizin dakikalar içinde yüklenmesi için canlı yönetim paneline anında iletilecektir ⚡",
    txid_received_title: "✅ <b>Ödeme Kimliği Başarıyla Alındı! 🤍</b>",
    payment_id_label: "Gönderilen Ödeme Kimliği:",
    txid_forwarded_to_admin_desc: "Ödeme bilgileriniz, anında eşleştirme ve bakiye yüklemesi için doğrudan canlı Yönetici paneline iletildi ⚡",
  },
  de: {
    btn_submit_txid: "✍️ Zahlungs-ID senden (TXID / Überweisungs-Nr.)",
    submit_txid_prompt_title: "✍️ <b>Bitte senden Sie Ihre Zahlungs-ID oder Überweisungsdetails:</b>",
    submit_txid_prompt_desc: "📝 Schreiben Sie eines der folgenden Details in einer Nachricht hier:\n• <b>Überweisungs-ID / Bestell-ID / Bybit Transfer ID</b>\n• <b>Absender-Wallet-Adresse oder Kontonummer</b>\n• <b>Transaktions-Hash (TXID / Referenzcode)</b>\n• <b>Telefonnummer des Absenders (für lokale Zahlungsmethoden)</b>",
    submit_txid_prompt_hint: "💡 Nach dem Absenden wird es sofort an unser Live-Admin-Panel zur schnellen Gutschrift innerhalb weniger Minuten weitergeleitet ⚡",
    txid_received_title: "✅ <b>Zahlungs-ID erfolgreich empfangen! 🤍</b>",
    payment_id_label: "Übermittelte Zahlungs-ID:",
    txid_forwarded_to_admin_desc: "Ihre Zahlungsdaten wurden direkt an das Live-Admin-Panel zur sofortigen Überprüfung und Gutschrift weitergeleitet ⚡",
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
console.log('✅ Injected Payment ID submission keys into storeI18n.mjs');
