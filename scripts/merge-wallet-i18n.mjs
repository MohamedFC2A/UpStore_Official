import fs from 'fs';
import { I18N_STRINGS } from 'file:///c:/Upstorebot/scripts/storeI18n.mjs';

const walletTranslations = {
  ar: {
    wallet_title: '💳 <b>محفظة UpStore الرقمية الموحدة 👑</b>',
    wallet_desc: 'رصيدك المشحون يُستخدم فورياً لشراء أي اشتراك في المتجر مع تفعيل فوري وضمان استبدال ذهبي 100% 🛡️.',
    wallet_current_balance: 'رصيدك الحالي:',
    wallet_min_deposit_notice: '⚠️ <b>تنبيه هام:</b> الحد الأدنى لشحن المحفظة هو <b>$5.00 دولار</b> (USDT / ما يعادله بالجنيه أو الريال).',
    wallet_must_recharge_notice: '⚠️ <b>تنبيه: يجب شحن المحفظة أولاً قبل إجراء أي عملية شراء!</b>\n\nرصيدك الحالي: <code>{balance} USDT</code>\nالمبلغ المطلوب للمنتج: <code>{required} USDT</code>\nالمبلغ المتبقي لإتمام الشراء: <code>{shortage} USDT</code>\n\n<blockquote>يُرجى شحن رصيدك بالأسفل لمتابعة الشراء الفوري (الحد الأدنى للشحن هو $5.00 دولار ⚡).</blockquote>',
    btn_topup_wallet: '💳 شحن رصيد المحفظة ($5+)',
    btn_topup_amount: '⚡ شحن {amount}$ USDT',
    btn_pay_with_balance: '🛍️ شراء فوري بالرصيد ({amount}$ USDT)',
    wallet_topup_select_method: '💳 <b>اختر وسيلة الدفع لشحن محفظتك بمبلغ {amount}$ USDT:</b>',
    wallet_topup_success_message: '🎉 <b>مبروك! تم شحن محفظتك بنجاح بمبلغ <code>+{amount} USDT</code>! 🔥</b>\n━━━━━━━━━━━━━━━━━━━━━━\n💰 <b>رصيدك الحالي المتاح:</b> <code>${balance} USDT</code>\n⚡ يمكنك الآن شراء أي اشتراك وتفعيله فورياً بالرصيد 🛍️.',
    wallet_topup_success_toast: 'تم شحن المحفظة بنجاح ✅',
    wallet_purchase_success: '✅ <b>تم خصم {amount}$ USDT من رصيد محفظتك وتأكيد الطلب بنجاح!</b>',
    btn_back_to_wallet: '🔙 رجوع للمحفظة',
    btn_refresh_balance: '🔄 تحديث الرصيد',
    btn_topup_custom: '💳 شحن مبلغ مخصص ($5+)',
    min_topup_error: '⚠️ عذراً، الحد الأدنى لشحن المحفظة هو 5.00 دولار أمريكي ($5.00 USDT) أو 250 جنيه مصري / 20 ريال سعودي.'
  },
  en: {
    wallet_title: '💳 <b>UpStore Unified Digital Wallet 👑</b>',
    wallet_desc: 'Your wallet balance is used for instant purchases across the store with immediate delivery and 100% replacement warranty 🛡️.',
    wallet_current_balance: 'Current Balance:',
    wallet_min_deposit_notice: '⚠️ <b>Important Notice:</b> Minimum wallet top-up is <b>$5.00 USD</b> (USDT / local equivalent).',
    wallet_must_recharge_notice: '⚠️ <b>Notice: You must top up your wallet before making any purchase!</b>\n\nCurrent Balance: <code>{balance} USDT</code>\nProduct Cost: <code>{required} USDT</code>\nRemaining needed: <code>{shortage} USDT</code>\n\n<blockquote>Please top up your wallet balance below to complete your instant order (minimum deposit is $5.00 ⚡).</blockquote>',
    btn_topup_wallet: '💳 Top-Up Wallet ($5+)',
    btn_topup_amount: '⚡ Top-Up ${amount} USDT',
    btn_pay_with_balance: '🛍️ Buy with Balance (${amount} USDT)',
    wallet_topup_select_method: '💳 <b>Choose payment gateway to top up ${amount} USDT:</b>',
    wallet_topup_success_message: '🎉 <b>Congratulations! Your wallet has been credited with <code>+{amount} USDT</code>! 🔥</b>\n━━━━━━━━━━━━━━━━━━━━━━\n💰 <b>Available Balance:</b> <code>${balance} USDT</code>\n⚡ You can now purchase any subscription instantly with your balance 🛍️.',
    wallet_topup_success_toast: 'Wallet credited successfully ✅',
    wallet_purchase_success: '✅ <b>Successfully deducted ${amount} USDT from wallet balance!</b>',
    btn_back_to_wallet: '🔙 Back to Wallet',
    btn_refresh_balance: '🔄 Refresh Balance',
    btn_topup_custom: '💳 Custom Top-Up ($5+)',
    min_topup_error: '⚠️ Minimum deposit amount is $5.00 USD.'
  },
  es: {
    wallet_title: '💳 <b>Billetera Digital UpStore 👑</b>',
    wallet_desc: 'Tu saldo se utiliza para compras inmediatas con garantía total del 100% 🛡️.',
    wallet_current_balance: 'Saldo Actual:',
    wallet_min_deposit_notice: '⚠️ <b>Aviso Importante:</b> La recarga mínima es de <b>$5.00 USD</b>.',
    wallet_must_recharge_notice: '⚠️ <b>¡Debes recargar tu billetera antes de comprar!</b>\n\nSaldo actual: <code>{balance} USDT</code>\nPrecio: <code>{required} USDT</code>\nFaltante: <code>{shortage} USDT</code>\n\n<blockquote>Recarga saldo abajo para continuar (recarga mínima $5.00 ⚡).</blockquote>',
    btn_topup_wallet: '💳 Recargar Saldo ($5+)',
    btn_topup_amount: '⚡ Recargar ${amount} USDT',
    btn_pay_with_balance: '🛍️ Comprar con Saldo (${amount} USDT)',
    wallet_topup_select_method: '💳 <b>Elige método para recargar ${amount} USDT:</b>',
    wallet_topup_success_message: '🎉 <b>¡Recarga exitosa de <code>+{amount} USDT</code>! 🔥</b>\n━━━━━━━━━━━━━━━━━━━━━━\n💰 <b>Saldo Disponible:</b> <code>${balance} USDT</code>\n⚡ Ya puedes comprar tus suscripciones con tu saldo 🛍️.',
    wallet_topup_success_toast: 'Billetera recargada con éxito ✅',
    wallet_purchase_success: '✅ <b>¡Se descontaron ${amount} USDT de tu billetera con éxito!</b>',
    btn_back_to_wallet: '🔙 Volver a Billetera',
    btn_refresh_balance: '🔄 Actualizar Saldo',
    btn_topup_custom: '💳 Recarga Personalizada ($5+)',
    min_topup_error: '⚠️ El monto mínimo de recarga es de $5.00 USD.'
  },
  fr: {
    wallet_title: '💳 <b>Portefeuille Numérique UpStore 👑</b>',
    wallet_desc: 'Votre solde est utilisé pour des achats immédiats avec garantie 100% 🛡️.',
    wallet_current_balance: 'Solde Actuel :',
    wallet_min_deposit_notice: '⚠️ <b>Avis Important :</b> La recharge minimum est de <b>$5.00 USD</b>.',
    wallet_must_recharge_notice: '⚠️ <b>Vous devez recharger votre portefeuille avant tout achat !</b>\n\nSolde actuel : <code>{balance} USDT</code>\nPrix : <code>{required} USDT</code>\nManquant : <code>{shortage} USDT</code>\n\n<blockquote>Rechargez votre solde ci-dessous (dépôt minimum 5.00$ ⚡).</blockquote>',
    btn_topup_wallet: '💳 Recharger ($5+)',
    btn_topup_amount: '⚡ Recharger ${amount} USDT',
    btn_pay_with_balance: '🛍️ Acheter avec Solde (${amount} USDT)',
    wallet_topup_select_method: '💳 <b>Choisissez le mode de paiement pour ${amount} USDT :</b>',
    wallet_topup_success_message: '🎉 <b>Recharge réussie de <code>+{amount} USDT</code> ! 🔥</b>\n━━━━━━━━━━━━━━━━━━━━━━\n💰 <b>Solde Disponible :</b> <code>${balance} USDT</code>\n⚡ Vous pouvez commander dès maintenant 🛍️.',
    wallet_topup_success_toast: 'Portefeuille rechargé avec succès ✅',
    wallet_purchase_success: '✅ <b>${amount} USDT déduits de votre portefeuille avec succès !</b>',
    btn_back_to_wallet: '🔙 Retour Portefeuille',
    btn_refresh_balance: '🔄 Actualiser Solde',
    btn_topup_custom: '💳 Montant Personnalisé ($5+)',
    min_topup_error: '⚠️ Le montant minimum de recharge est de 5.00$ USD.'
  },
  ru: {
    wallet_title: '💳 <b>Цифровой Кошелек UpStore 👑</b>',
    wallet_desc: 'Баланс используется для мгновенной оплаты с гарантией 100% 🛡️.',
    wallet_current_balance: 'Текущий баланс:',
    wallet_min_deposit_notice: '⚠️ <b>Важное уведомление:</b> Минимальное пополнение — <b>$5.00 USD</b>.',
    wallet_must_recharge_notice: '⚠️ <b>Перед покупкой необходимо пополнить кошелек!</b>\n\nБаланс: <code>{balance} USDT</code>\nСтоимость: <code>{required} USDT</code>\nНе хватает: <code>{shortage} USDT</code>\n\n<blockquote>Пополните баланс ниже для мгновенной покупки (минимум $5.00 ⚡).</blockquote>',
    btn_topup_wallet: '💳 Пополнить баланс ($5+)',
    btn_topup_amount: '⚡ Пополнить ${amount} USDT',
    btn_pay_with_balance: '🛍️ Купить за баланс (${amount} USDT)',
    wallet_topup_select_method: '💳 <b>Выберите способ пополнения на ${amount} USDT:</b>',
    wallet_topup_success_message: '🎉 <b>Кошелек успешно пополнен на <code>+{amount} USDT</code>! 🔥</b>\n━━━━━━━━━━━━━━━━━━━━━━\n💰 <b>Доступно:</b> <code>${balance} USDT</code>\n⚡ Теперь вы можете покупать любые подписки 🛍️.',
    wallet_topup_success_toast: 'Баланс успешно пополнен ✅',
    wallet_purchase_success: '✅ <b>${amount} USDT успешно списано с баланса!</b>',
    btn_back_to_wallet: '🔙 В кошелек',
    btn_refresh_balance: '🔄 Обновить баланс',
    btn_topup_custom: '💳 Другая сумма ($5+)',
    min_topup_error: '⚠️ Минимальная сумма пополнения — $5.00 USD.'
  },
  tr: {
    wallet_title: '💳 <b>UpStore Dijital Cüzdan 👑</b>',
    wallet_desc: 'Bakiyeniz anında satın alma ve %100 değişim garantisi için kullanılır 🛡️.',
    wallet_current_balance: 'Mevcut Bakiye:',
    wallet_min_deposit_notice: '⚠️ <b>Önemli Uyarı:</b> Minimum bakiye yükleme tutarı <b>$5.00 USD</b>\'dir.',
    wallet_must_recharge_notice: '⚠️ <b>Satın almadan önce cüzdanınıza bakiye yüklemelisiniz!</b>\n\nMevcut Bakiye: <code>{balance} USDT</code>\nÜrün Fiyatı: <code>{required} USDT</code>\nKalan Tutar: <code>{shortage} USDT</code>\n\n<blockquote>Lütfen siparişi tamamlamak için bakiye yükleyin (minimum $5.00 ⚡).</blockquote>',
    btn_topup_wallet: '💳 Bakiye Yükle ($5+)',
    btn_topup_amount: '⚡ ${amount} USDT Yükle',
    btn_pay_with_balance: '🛍️ Bakiyeyle Satın Al (${amount} USDT)',
    wallet_topup_select_method: '💳 <b>${amount} USDT yüklemek için ödeme yöntemi seçin:</b>',
    wallet_topup_success_message: '🎉 <b>Cüzdanınıza <code>+{amount} USDT</code> başarıyla yüklendi! 🔥</b>\n━━━━━━━━━━━━━━━━━━━━━━\n💰 <b>Kullanılabilir Bakiye:</b> <code>${balance} USDT</code>\n⚡ Artık bakiyenizle anında alışveriş yapabilirsiniz 🛍️.',
    wallet_topup_success_toast: 'Cüzdan başarıyla yüklendi ✅',
    wallet_purchase_success: '✅ <b>Cüzdanınızdan ${amount} USDT tahsil edildi!</b>',
    btn_back_to_wallet: '🔙 Cüzdana Dön',
    btn_refresh_balance: '🔄 Bakiyeyi Yenile',
    btn_topup_custom: '💳 Özel Tutar Yükle ($5+)',
    min_topup_error: '⚠️ Minimum yükleme tutarı $5.00 USD\'dir.'
  },
  de: {
    wallet_title: '💳 <b>UpStore Digitales Guthaben 👑</b>',
    wallet_desc: 'Ihr Guthaben wird für Sofortkäufe mit 100% Garantie verwendet 🛡️.',
    wallet_current_balance: 'Aktuelles Guthaben:',
    wallet_min_deposit_notice: '⚠️ <b>Wichtiger Hinweis:</b> Mindestaufladung beträgt <b>$5.00 USD</b>.',
    wallet_must_recharge_notice: '⚠️ <b>Vor dem Kauf müssen Sie Ihr Guthaben aufladen!</b>\n\nAktuelles Guthaben: <code>{balance} USDT</code>\nPreis: <code>{required} USDT</code>\nFehlend: <code>{shortage} USDT</code>\n\n<blockquote>Bitte laden Sie Ihr Guthaben unten auf (Mindestbetrag $5.00 ⚡).</blockquote>',
    btn_topup_wallet: '💳 Guthaben aufladen ($5+)',
    btn_topup_amount: '⚡ ${amount} USDT aufladen',
    btn_pay_with_balance: '🛍️ Mit Guthaben kaufen (${amount} USDT)',
    wallet_topup_select_method: '💳 <b>Zahlungsmethode für ${amount} USDT wählen:</b>',
    wallet_topup_success_message: '🎉 <b>Erfolgreich <code>+{amount} USDT</code> aufgeladen! 🔥</b>\n━━━━━━━━━━━━━━━━━━━━━━\n💰 <b>Verfügbares Guthaben:</b> <code>${balance} USDT</code>\n⚡ Sie können jetzt Abonnements kaufen 🛍️.',
    wallet_topup_success_toast: 'Guthaben erfolgreich aufgeladen ✅',
    wallet_purchase_success: '✅ <b>${amount} USDT wurden erfolgreich vom Guthaben abgebucht!</b>',
    btn_back_to_wallet: '🔙 Zum Guthaben',
    btn_refresh_balance: '🔄 Aktualisieren',
    btn_topup_custom: '💳 Individueller Betrag ($5+)',
    min_topup_error: '⚠️ Der Mindestaufladebetrag beträgt $5.00 USD.'
  }
};

const merged = {};
for (const lang of Object.keys(I18N_STRINGS)) {
  merged[lang] = {
    ...I18N_STRINGS[lang],
    ...(walletTranslations[lang] || {})
  };
}

let fileContent = fs.readFileSync('./scripts/storeI18n.mjs', 'utf8');

const startIdx = fileContent.indexOf('export const I18N_STRINGS = {');
const endIdx = fileContent.indexOf('export const DURATION_KEYS = {');

if (startIdx !== -1 && endIdx !== -1) {
  const newStringsCode = 'export const I18N_STRINGS = ' + JSON.stringify(merged, null, 2) + ';\n\n';
  const updatedFile = fileContent.substring(0, startIdx) + newStringsCode + fileContent.substring(endIdx);
  fs.writeFileSync('./scripts/storeI18n.mjs', updatedFile, 'utf8');
  console.log('WALLET I18N MERGE SUCCESS');
} else {
  console.error('Markers not found in storeI18n.mjs');
}
