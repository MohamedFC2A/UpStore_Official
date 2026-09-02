import fs from 'fs';
import path from 'path';

const I18N_FILE = path.resolve('scripts/storeI18n.mjs');

async function main() {
  const mod = await import('./storeI18n.mjs');
  const I18N_STRINGS = mod.I18N_STRINGS;

  const NEW_KEYS = {
    ar: {
      submit_txid_binance_title: "✍️ <b>يرجى إرسال معرّف الدفع من Binance Pay:</b>",
      submit_txid_binance_desc: "📝 <b>خطوات الحصول على معرّف الدفع من Binance:</b>\n1️⃣ افتح تطبيق <b>Binance</b> 📱\n2️⃣ اذهب إلى <b>Pay (بينانس باي)</b> > سجل المعاملات > افتح تفاصيل التحويل الأخير.\n3️⃣ انسخ <b>Order ID (معرّف الطلب المكون من أرقام)</b> أو معرّف <b>Binance Pay ID / UID</b> لحسابك.\n4️⃣ 💬 <b>اكتب الرقم هنا في رسالة في الشات واضغط إرسال 📤</b>\n\n⛔ <b>تنبيه هام جداً:</b> لا ترسل رقم المرجع الداخلي للمتجر (#TOPUP-...) بل أرسل رقم العملية الفعلي المأخوذ من تطبيق Binance.",
      submit_txid_bybit_title: "✍️ <b>يرجى إرسال معرّف التحويل من Bybit:</b>",
      submit_txid_bybit_desc: "📝 <b>خطوات الحصول على معرّف التحويل من Bybit:</b>\n1️⃣ افتح تطبيق <b>Bybit</b> 📱\n2️⃣ اذهب إلى <b>الأصول (Assets)</b> > السحب أو التحويل الداخلي > تفاصيل المعاملة.\n3️⃣ انسخ <b>Transfer ID</b> أو معرّف حساب Bybit UID الخاص بك أو <b>TXID</b>.\n4️⃣ 💬 <b>اكتب الرقم هنا في رسالة في الشات واضغط إرسال 📤</b>\n\n⛔ <b>تنبيه هام جداً:</b> لا ترسل رقم المرجع الداخلي للمتجر (#TOPUP-...) بل أرسل رقم المعاملة الفعلي من تطبيق Bybit.",
      submit_txid_local_title: "✍️ <b>يرجى إرسال بيانات التحويل المحلي:</b>",
      submit_txid_local_desc: "📝 <b>خطوات تأكيد التحويل المحلي:</b>\n1️⃣ 💬 اكتب <b>رقم الهاتف أو معرّف الحساب</b> الذي قمت بالتحويل منه (مثال: 010xxxxxxxx أو username@instapay).\n2️⃣ اضغط على زر <b>إرسال 📤</b> في الشات.\n\n⚡ <i>سيتم مطابقة التحويل وشحن محفظتك فوراً بمجرد الإرسال 🤍</i>",
      txid_error_sent_order_ref: "⚠️ <b>تنبيه: لقد أرسلت رقم المرجع الداخلي للمتجر ({ref})!</b>\n\n📌 <b>رقم المرجع ليس هو معرّف الدفع المطلوب.</b>\n\n💡 <b>المطلوب منك الآن:</b>\n1️⃣ افتح تطبيق <b>{method}</b> الذي حولت منه.\n2️⃣ انسخ <b>رقم العملية الفعلي (Order ID / Transfer ID / TXID)</b> أو رقم حسابك المحول منه.\n3️⃣ 💬 الصق الرقم هنا في الشات واضغط <b>إرسال 📤</b>.\n\n⚡ <i>نحن بانتظارك فوراً لشحن رصيدك في غضون دقائق 🤍</i>",
      txid_error_invalid_text: "⚠️ <b>لم يتم العثور على معرّف عملية أو رقم تحويل صالح في رسالتك!</b>\n\n📝 لقد كتبت: <i>\"{text}\"</i>\n\n📌 <b>لاعتماد وإيداع رصيدك في المحفظة فوراً:</b>\nيرجى كتابة <b>رقم العملية الفعلي المكون من أرقام (Order ID / Transfer ID / TXID)</b> أو رقم المحفظة/الهاتف المحول منه من داخل تطبيق <b>{method}</b> ثم الضغط على <b>إرسال 📤</b>.\n\n💡 <i>إذا واجهت أي صعوبة، يمكنك التواصل مع الدعم الفني: @UPSTORE_HELP 🤍</i>",
      btn_cancel_topup: "🔙 إلغاء والعودة للمحفظة",
      txid_store_ref_label: "رقم المرجع بالمتجر:",
    },
    en: {
      submit_txid_binance_title: "✍️ <b>Please Send Your Binance Pay Order ID / UID:</b>",
      submit_txid_binance_desc: "📝 <b>How to get your Payment ID from Binance:</b>\n1️⃣ Open the <b>Binance app</b> 📱\n2️⃣ Go to <b>Pay</b> > Transaction History > Open the latest transfer.\n3️⃣ Copy the <b>Order ID</b> (numeric ID) or your <b>Binance Pay ID / UID</b>.\n4️⃣ 💬 <b>Type the number in a message here and tap Send 📤</b>\n\n⛔ <b>Important Notice:</b> Do NOT send the internal store reference (#TOPUP-...). Please send the actual Order ID from the Binance app.",
      submit_txid_bybit_title: "✍️ <b>Please Send Your Bybit Transfer ID / UID:</b>",
      submit_txid_bybit_desc: "📝 <b>How to get your Transfer ID from Bybit:</b>\n1️⃣ Open the <b>Bybit app</b> 📱\n2️⃣ Go to <b>Assets</b> > Internal Transfer > Open transaction details.\n3️⃣ Copy the <b>Transfer ID</b>, your <b>Bybit UID</b>, or <b>TXID</b>.\n4️⃣ 💬 <b>Type the ID in a message here and tap Send 📤</b>\n\n⛔ <b>Important Notice:</b> Do NOT send the internal store reference (#TOPUP-...). Please send the actual Transfer ID or Bybit UID.",
      submit_txid_local_title: "✍️ <b>Please Send Your Local Payment Details:</b>",
      submit_txid_local_desc: "📝 <b>Steps to confirm local payment:</b>\n1️⃣ 💬 Type the <b>Sender phone number or account handle</b> (e.g. 010xxxxxxxx or username@instapay).\n2️⃣ Tap <b>Send 📤</b> in chat.\n\n⚡ <i>Your balance will be verified and credited promptly 🤍</i>",
      txid_error_sent_order_ref: "⚠️ <b>Notice: You sent the store's internal reference code ({ref})!</b>\n\n📌 <b>The reference number is not your payment transaction ID.</b>\n\n💡 <b>What to do now:</b>\n1️⃣ Open the <b>{method}</b> app you paid with.\n2️⃣ Copy the <b>Transaction ID (Order ID / Transfer ID / TXID)</b> or your sender account/phone.\n3️⃣ 💬 Paste the number here in chat and tap <b>Send 📤</b>.\n\n⚡ <i>We are ready to credit your wallet within minutes 🤍</i>",
      txid_error_invalid_text: "⚠️ <b>No valid Transaction ID or Transfer Number found in your message!</b>\n\n📝 You wrote: <i>\"{text}\"</i>\n\n📌 <b>To verify and credit your balance immediately:</b>\nPlease type the <b>actual numeric Transaction ID (Order ID / Transfer ID / TXID)</b> or sender account/phone from your <b>{method}</b> app and tap <b>Send 📤</b>.\n\n💡 <i>If you need help, feel free to contact Support: @UPSTORE_HELP 🤍</i>",
      btn_cancel_topup: "🔙 Cancel & Back to Wallet",
      txid_store_ref_label: "Store Order Ref:",
    },
    es: {
      submit_txid_binance_title: "✍️ <b>Por favor envía tu Order ID o UID de Binance Pay:</b>",
      submit_txid_binance_desc: "📝 <b>Pasos para confirmar el pago y enviar tu ID:</b>\n1️⃣ Abre la app de <b>Binance</b> 📱\n2️⃣ Ve a <b>Pay</b> > Historial > Abre la última transferencia.\n3️⃣ Copia el <b>Order ID</b> (numérico) o tu <b>Binance Pay ID / UID</b>.\n4️⃣ 💬 <b>Escribe el número aquí en el chat y pulsa Enviar 📤</b>\n\n⛔ <b>Aviso importante:</b> NO envíes la referencia interna (#TOPUP-...). Envía el Order ID real de la app Binance.",
      submit_txid_bybit_title: "✍️ <b>Por favor envía tu Transfer ID o UID de Bybit:</b>",
      submit_txid_bybit_desc: "📝 <b>Pasos para confirmar la transferencia y enviar tu ID:</b>\n1️⃣ Abre la app de <b>Bybit</b> 📱\n2️⃣ Ve a <b>Activos</b> > Transferencia interna > Abre los detalles de la transacción.\n3️⃣ Copia el <b>Transfer ID</b>, tu <b>Bybit UID</b> o el <b>TXID</b>.\n4️⃣ 💬 <b>Escribe el ID aquí en el chat y pulsa Enviar 📤</b>\n\n⛔ <b>Aviso importante:</b> NO envíes la referencia interna (#TOPUP-...). Envía el Transfer ID real de Bybit.",
      submit_txid_local_title: "✍️ <b>Por favor envía los detalles del pago local:</b>",
      submit_txid_local_desc: "📝 <b>Pasos para confirmar el pago local:</b>\n1️⃣ 💬 Escribe el <b>número de teléfono o cuenta del remitente</b>.\n2️⃣ Pulsa <b>Enviar 📤</b> en el chat.\n\n⚡ <i>Tu saldo será acreditado puntualmente 🤍</i>",
      txid_error_sent_order_ref: "⚠️ <b>Aviso: ¡Has enviado el código de referencia interno de la tienda ({ref})!</b>\n\n📌 <b>El número de referencia no es el ID de la transacción.</b>\n\n💡 <b>Qué hacer ahora:</b>\n1️⃣ Abre la app de <b>{method}</b> con la que pagaste.\n2️⃣ Copia el <b>Order ID / Transfer ID / TXID</b> o tu cuenta remitente.\n3️⃣ 💬 Pega el número aquí en el chat y pulsa <b>Enviar 📤</b>.\n\n⚡ <i>Estamos listos para acreditar tu saldo en minutos 🤍</i>",
      txid_error_invalid_text: "⚠️ <b>¡No se encontró un ID de transacción o número de transferencia válido en tu mensaje!</b>\n\n📝 Escribiste: <i>\"{text}\"</i>\n\n📌 <b>Para verificar y acreditar tu saldo inmediatamente:</b>\nPor favor escribe el <b>ID de transacción numérico real (Order ID / Transfer ID / TXID)</b> o cuenta/teléfono remitente de tu app <b>{method}</b> y pulsa <b>Enviar 📤</b>.\n\n💡 <i>Si necesitas ayuda, contacta con Soporte: @UPSTORE_HELP 🤍</i>",
      btn_cancel_topup: "🔙 Cancelar y volver a la billetera",
      txid_store_ref_label: "Ref. de la tienda:",
    },
    fr: {
      submit_txid_binance_title: "✍️ <b>Veuillez envoyer votre Order ID ou UID Binance Pay :</b>",
      submit_txid_binance_desc: "📝 <b>Étapes pour confirmer le paiement et envoyer votre identifiant :</b>\n1️⃣ Ouvrez l'application <b>Binance</b> 📱\n2️⃣ Allez dans <b>Pay</b> > Historique > Ouvrez le dernier virement.\n3️⃣ Copiez l'<b>Order ID</b> (identifiant numérique) ou votre <b>Binance Pay ID / UID</b>.\n4️⃣ 💬 <b>Écrivez le numéro ici dans le chat et appuyez sur Envoyer 📤</b>\n\n⛔ <b>Avis important :</b> N'envoyez PAS la référence interne (#TOPUP-...). Envoyez le véritable Order ID de l'application Binance.",
      submit_txid_bybit_title: "✍️ <b>Veuillez envoyer votre Transfer ID ou UID Bybit :</b>",
      submit_txid_bybit_desc: "📝 <b>Étapes pour confirmer le virement et envoyer votre identifiant :</b>\n1️⃣ Ouvrez l'application <b>Bybit</b> 📱\n2️⃣ Allez dans <b>Actifs</b> > Transfert interne > Ouvrez les détails du virement.\n3️⃣ Copiez le <b>Transfer ID</b>, votre <b>Bybit UID</b> ou le <b>TXID</b>.\n4️⃣ 💬 <b>Écrivez l'identifiant ici et appuyez sur Envoyer 📤</b>\n\n⛔ <b>Avis important :</b> N'envoyez PAS la référence interne (#TOPUP-...). Envoyez le véritable Transfer ID de Bybit.",
      submit_txid_local_title: "✍️ <b>Veuillez envoyer les détails du paiement local :</b>",
      submit_txid_local_desc: "📝 <b>Étapes pour confirmer le paiement local :</b>\n1️⃣ 💬 Écrivez le <b>numéro de téléphone ou compte de l'expéditeur</b>.\n2️⃣ Appuyez sur <b>Envoyer 📤</b> dans le chat.\n\n⚡ <i>Votre solde sera crédité rapidement 🤍</i>",
      txid_error_sent_order_ref: "⚠️ <b>Avis : Vous avez envoyé le code de référence interne de la boutique ({ref}) !</b>\n\n📌 <b>Le numéro de référence n'est pas votre identifiant de transaction.</b>\n\n💡 <b>Que faire maintenant :</b>\n1️⃣ Ouvrez l'application <b>{method}</b> utilisée pour le paiement.\n2️⃣ Copiez l'<b>Order ID / Transfer ID / TXID</b> ou votre compte expéditeur.\n3️⃣ 💬 Collez le numéro ici dans le chat et appuyez sur <b>Envoyer 📤</b>.\n\n⚡ <i>Nous sommes prêts à créditer votre portefeuille en quelques minutes 🤍</i>",
      txid_error_invalid_text: "⚠️ <b>Aucun identifiant de transaction ou numéro de virement valide trouvé dans votre message !</b>\n\n📝 Vous avez écrit : <i>\"{text}\"</i>\n\n📌 <b>Pour vérifier et créditer votre solde immédiatement :</b>\nVeuillez écrire l'<b>identifiant de transaction numérique réel (Order ID / Transfer ID / TXID)</b> ou compte/téléphone expéditeur de votre application <b>{method}</b> et appuyez sur <b>Envoyer 📤</b>.\n\n💡 <i>En cas de besoin, contactez le Support : @UPSTORE_HELP 🤍</i>",
      btn_cancel_topup: "🔙 Annuler et retour au portefeuille",
      txid_store_ref_label: "Réf. de la boutique :",
    },
    ru: {
      submit_txid_binance_title: "✍️ <b>Пожалуйста, отправьте Order ID или UID из Binance Pay:</b>",
      submit_txid_binance_desc: "📝 <b>Инструкция по подтверждению платежа и отправке ID:</b>\n1️⃣ Откройте приложение <b>Binance</b> 📱\n2️⃣ Перейдите в <b>Pay</b> > История транзакций > Откройте детали последнего перевода.\n3️⃣ Скопируйте <b>Order ID</b> (числовой номер заказа) или ваш <b>Binance Pay ID / UID</b>.\n4️⃣ 💬 <b>Напишите номер в чат и нажмите Отправить 📤</b>\n\n⛔ <b>Важно:</b> НЕ отправляйте внутренний номер магазина (#TOPUP-...). Отправьте реальный Order ID из приложения Binance.",
      submit_txid_bybit_title: "✍️ <b>Пожалуйста, отправьте Transfer ID или UID из Bybit:</b>",
      submit_txid_bybit_desc: "📝 <b>Инструкция по подтверждению перевода и отправке ID:</b>\n1️⃣ Откройте приложение <b>Bybit</b> 📱\n2️⃣ Перейдите в <b>Активы</b> > Внутренний перевод > Откройте детали транзакции.\n3️⃣ Скопируйте <b>Transfer ID</b>, ваш <b>Bybit UID</b> или <b>TXID</b>.\n4️⃣ 💬 <b>Напишите номер в чат и нажмите Отправить 📤</b>\n\n⛔ <b>Важно:</b> НЕ отправляйте внутренний номер магазина (#TOPUP-...). Отправьте реальный Transfer ID из Bybit.",
      submit_txid_local_title: "✍️ <b>Пожалуйста, отправьте реквизиты локального платежа:</b>",
      submit_txid_local_desc: "📝 <b>Инструкция по подтверждению локального платежа:</b>\n1️⃣ 💬 Напишите <b>номер телефона или аккаунт отправителя</b>.\n2️⃣ Нажмите <b>Отправить 📤</b> в чате.\n\n⚡ <i>Баланс будет проверен и зачислен в кратчайшие сроки 🤍</i>",
      txid_error_sent_order_ref: "⚠️ <b>Внимание: Вы отправили внутренний номер заказа магазина ({ref})!</b>\n\n📌 <b>Номер заказа магазина не является ID транзакции перевода.</b>\n\n💡 <b>Что нужно сделать:</b>\n1️⃣ Откройте приложение <b>{method}</b>, через которое вы оплатили.\n2️⃣ Скопируйте <b>Order ID / Transfer ID / TXID</b> или номер вашего аккаунта.\n3️⃣ 💬 Вставьте номер сюда в чат и нажмите <b>Отправить 📤</b>.\n\n⚡ <i>Мы готовы начислить ваш баланс в течение нескольких минут 🤍</i>",
      txid_error_invalid_text: "⚠️ <b>В вашем сообщении не найден действительный ID транзакции или номер перевода!</b>\n\n📝 Вы написали: <i>\"{text}\"</i>\n\n📌 <b>Для мгновенного зачисления средств на баланс:</b>\nПожалуйста, введите <b>реальный числовой ID транзакции (Order ID / Transfer ID / TXID)</b> или номер счета/телефона из приложения <b>{method}</b> и нажмите <b>Отправить 📤</b>.\n\n💡 <i>Если вам нужна помощь, свяжитесь с поддержкой: @UPSTORE_HELP 🤍</i>",
      btn_cancel_topup: "🔙 Отмена и назад в кошелек",
      txid_store_ref_label: "Номер заказа магазина:",
    },
    tr: {
      submit_txid_binance_title: "✍️ <b>Lütfen Binance Pay Sipariş No (Order ID) veya UID'nizi Gönderin:</b>",
      submit_txid_binance_desc: "📝 <b>Ödemeyi onaylama ve kimlik gönderme adımları:</b>\n1️⃣ <b>Binance</b> uygulamasını açın 📱\n2️⃣ <b>Pay</b> > İşlem Geçmişi > Son transfer detayını açın.\n3️⃣ <b>Order ID (Sipariş No)</b> veya <b>Binance Pay ID / UID</b> numaranızı kopyalayın.\n4️⃣ 💬 <b>Numarayı buraya mesaja yazıp Gönder'e 📤 basın</b>\n\n⛔ <b>Önemli Uyarı:</b> Mağaza referans kodunu (#TOPUP-...) göndermeyin. Lütfen Binance uygulamasındaki gerçek Sipariş Numarasını gönderin.",
      submit_txid_bybit_title: "✍️ <b>Lütfen Bybit Transfer ID veya UID numaranızı gönderin:</b>",
      submit_txid_bybit_desc: "📝 <b>Transferi onaylama ve kimlik gönderme adımları:</b>\n1️⃣ <b>Bybit</b> uygulamasını açın 📱\n2️⃣ <b>Varlıklar</b> > Dahili Transfer > İşlem detaylarını açın.\n3️⃣ <b>Transfer ID</b>, <b>Bybit UID</b> veya <b>TXID</b> kodunuzu kopyalayın.\n4️⃣ 💬 <b>Kimliği buraya mesaja yazıp Gönder'e 📤 basın</b>\n\n⛔ <b>Önemli Uyarı:</b> Mağaza referans kodunu (#TOPUP-...) göndermeyin. Lütfen Bybit'teki gerçek Transfer ID'yi gönderin.",
      submit_txid_local_title: "✍️ <b>Lütfen Yerel Ödeme Bilgilerini Gönderin:</b>",
      submit_txid_local_desc: "📝 <b>Yerel ödeme onaylama adımları:</b>\n1️⃣ 💬 <b>Gönderen telefon veya hesap bilgisini</b> yazın.\n2️⃣ Sohbette <b>Gönder'e 📤</b> basın.\n\n⚡ <i>Bakiyeniz hemen doğrulanıp yüklenecektir 🤍</i>",
      txid_error_sent_order_ref: "⚠️ <b>Uyarı: Mağazanın dahili referans kodunu ({ref}) gönderdiniz!</b>\n\n📌 <b>Referans numarası ödeme işlem kimliğiniz değildir.</b>\n\n💡 <b>Şimdi yapmanız gereken:</b>\n1️⃣ Ödeme yaptığınız <b>{method}</b> uygulamasını açın.\n2️⃣ <b>Order ID / Transfer ID / TXID</b> veya gönderen hesap/telefon numaranızı kopyalayın.\n3️⃣ 💬 Numarayı buraya yapıştırıp <b>Gönder'e 📤</b> basın.\n\n⚡ <i>Bakiyenizi dakikalar içinde yüklemek için hazırız 🤍</i>",
      txid_error_invalid_text: "⚠️ <b>Mesajınızda geçerli bir İşlem Kimliği veya Transfer Numarası bulunamadı!</b>\n\n📝 Yazdığınız: <i>\"{text}\"</i>\n\n📌 <b>Bakiyenizi hemen doğrulamak ve yüklemek için:</b>\nLütfen <b>{method}</b> uygulamanızdaki <b>gerçek sayısal İşlem Numarasını (Order ID / Transfer ID / TXID)</b> veya gönderen hesap/telefon numarasını yazıp <b>Gönder'e 📤</b> basın.\n\n💡 <i>Yardıma ihtiyacınız olursa Destek ile iletişime geçebilirsiniz: @UPSTORE_HELP 🤍</i>",
      btn_cancel_topup: "🔙 İptal ve Cüzdana Dön",
      txid_store_ref_label: "Mağaza Sipariş No:",
    },
    de: {
      submit_txid_binance_title: "✍️ <b>Bitte senden Sie Ihre Binance Pay Order-ID oder UID:</b>",
      submit_txid_binance_desc: "📝 <b>Schritte zur Bestätigung und Übermittlung der Zahlungs-ID:</b>\n1️⃣ Öffnen Sie die <b>Binance-App</b> 📱\n2️⃣ Gehen Sie zu <b>Pay</b> > Transaktionsverlauf > Letzte Überweisung öffnen.\n3️⃣ Kopieren Sie die <b>Order ID</b> (Ziffernfolge) oder Ihre <b>Binance Pay ID / UID</b>.\n4️⃣ 💬 <b>Geben Sie die Nummer hier im Chat ein und tippen Sie auf Senden 📤</b>\n\n⛔ <b>Wichtiger Hinweis:</b> Senden Sie NICHT die interne Store-Referenz (#TOPUP-...). Senden Sie die echte Order ID aus der Binance-App.",
      submit_txid_bybit_title: "✍️ <b>Bitte senden Sie Ihre Bybit Transfer-ID oder UID:</b>",
      submit_txid_bybit_desc: "📝 <b>Schritte zur Bestätigung und Übermittlung der Überweisungs-ID:</b>\n1️⃣ Öffnen Sie die <b>Bybit-App</b> 📱\n2️⃣ Gehen Sie zu <b>Assets</b> > Interne Überweisung > Transaktionsdetails.\n3️⃣ Kopieren Sie die <b>Transfer ID</b>, Ihre <b>Bybit UID</b> oder die <b>TXID</b>.\n4️⃣ 💬 <b>Geben Sie die ID hier im Chat ein und tippen Sie auf Senden 📤</b>\n\n⛔ <b>Wichtiger Hinweis:</b> Senden Sie NICHT die interne Store-Referenz (#TOPUP-...). Senden Sie die echte Transfer ID aus Bybit.",
      submit_txid_local_title: "✍️ <b>Bitte senden Sie die lokalen Zahlungsdetails:</b>",
      submit_txid_local_desc: "📝 <b>Schritte zur Bestätigung der lokalen Zahlung:</b>\n1️⃣ 💬 Geben Sie die <b>Telefonnummer oder den Account des Absenders</b> ein.\n2️⃣ Tippen Sie im Chat auf <b>Senden 📤</b>.\n\n⚡ <i>Ihr Guthaben wird umgehend gutgeschrieben 🤍</i>",
      txid_error_sent_order_ref: "⚠️ <b>Hinweis: Sie haben die interne Referenznummer des Stores ({ref}) gesendet!</b>\n\n📌 <b>Die Referenznummer ist nicht die Transaktions-ID der Zahlung.</b>\n\n💡 <b>Was Sie jetzt tun müssen:</b>\n1️⃣ Öffnen Sie die <b>{method}</b>-App, mit der Sie bezahlt haben.\n2️⃣ Kopieren Sie die <b>Order ID / Transfer ID / TXID</b> oder Ihr Absenderkonto.\n3️⃣ 💬 Fügen Sie die Nummer hier im Chat ein und tippen Sie auf <b>Senden 📤</b>.\n\n⚡ <i>Wir sind bereit, Ihr Guthaben innerhalb von Minuten gutzuschreiben 🤍</i>",
      txid_error_invalid_text: "⚠️ <b>Keine gültige Transaktions-ID oder Überweisungsnummer in Ihrer Nachricht gefunden!</b>\n\n📝 Sie haben geschrieben: <i>\"{text}\"</i>\n\n📌 <b>Um Ihr Guthaben sofort zu verifizieren und gutzuschreiben:</b>\nBitte geben Sie die <b>echte numerische Transaktions-ID (Order ID / Transfer ID / TXID)</b> oder das Absenderkonto/Telefon aus Ihrer <b>{method}</b>-App ein und tippen Sie auf <b>Senden 📤</b>.\n\n💡 <i>Wenn Sie Hilfe benötigen, wenden Sie sich an den Support: @UPSTORE_HELP 🤍</i>",
      btn_cancel_topup: "🔙 Abbrechen und zurück zur Wallet",
      txid_store_ref_label: "Store-Bestellreferenz:",
    },
  };

  for (const lang of Object.keys(NEW_KEYS)) {
    if (!I18N_STRINGS[lang]) I18N_STRINGS[lang] = {};
    Object.assign(I18N_STRINGS[lang], NEW_KEYS[lang]);
  }

  let fileContent = fs.readFileSync(I18N_FILE, 'utf-8');
  const startMarker = 'export const I18N_STRINGS =';
  const endMarker = 'export const DURATION_KEYS =';
  
  const startIdx = fileContent.indexOf(startMarker);
  const endIdx = fileContent.indexOf(endMarker);

  if (startIdx !== -1 && endIdx !== -1) {
    const jsonExport = 'export const I18N_STRINGS = ' + JSON.stringify(I18N_STRINGS, null, 2) + ';\n\n';
    fileContent = fileContent.slice(0, startIdx) + jsonExport + fileContent.slice(endIdx);
    fs.writeFileSync(I18N_FILE, fileContent, 'utf-8');
    console.log('✅ storeI18n.mjs successfully updated preserving all functions!');
  } else {
    console.error('❌ Markers not found in storeI18n.mjs');
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
