import fs from 'fs';
import path from 'path';

const I18N_FILE = 'scripts/storeI18n.mjs';
let content = fs.readFileSync(I18N_FILE, 'utf-8');

// The new delivery & order strings for all 7 languages
const EXTRA_KEYS = {
  ar: {
    delivery_method_label: "طريقة التسليم",
    delivery_personal_account: "تفعيل مباشر على إيميلك / حسابك الشخصي ✉️",
    delivery_private_account: "تسليم حساب خاص مفعل بالكامل ومخصص لك 👤",
    delivery_license_key: "مفتاح ترخيص رقمي أصلي ورسمي (فوري) 🔑",
    delivery_api_token: "مفتاح API / Token رسمي مع رصيد وصول ⚡",
    delivery_vpn_credentials: "بيانات حساب VPN مخصص ومشفر بالكامل 🔐",
    order_delivery_title: "🎉 <b>تم تأكيد الدفع وتسليم الطلب بنجاح! 🤍</b>",
    order_product_label: "المنتج:",
    order_ref_label: "رقم الطلب:",
    order_amount_received_label: "المبلغ المستلم:",
    order_serial_title: "🔑 <b>كود التفعيل / السيريال الرسمي (16 رقماً):</b>",
    order_credentials_title: "👤 <b>بيانات الدخول / الحساب المخصص:</b>",
    order_username_label: "اسم المستخدم / الإيميل:",
    order_password_label: "كلمة المرور:",
    order_duration_label: "مدة الاشتراك:",
    order_copy_code_hint: "<i>(اضغط على الكود للنسخ المباشر 👆)</i>",
    order_warranty_notice: "🛡️ <i>الضمان الذهبي مفعل 100% طوال مدة الاشتراك. للدعم: @UPSTORE_HELP</i>",
  },
  en: {
    delivery_method_label: "Delivery Method",
    delivery_personal_account: "Direct Activation on Personal Account / Email ✉️",
    delivery_private_account: "Dedicated Pre-activated Private Account 👤",
    delivery_license_key: "Official Digital License Key (Instant Delivery) 🔑",
    delivery_api_token: "Official API Key / Access Token ⚡",
    delivery_vpn_credentials: "Dedicated Secure VPN Credentials & Config 🔐",
    order_delivery_title: "🎉 <b>Payment Confirmed & Order Delivered! 🤍</b>",
    order_product_label: "Product:",
    order_ref_label: "Order ID:",
    order_amount_received_label: "Amount Paid:",
    order_serial_title: "🔑 <b>Official Serial / Activation Key (16 Digits):</b>",
    order_credentials_title: "👤 <b>Dedicated Account Credentials:</b>",
    order_username_label: "Username / Email:",
    order_password_label: "Password:",
    order_duration_label: "Subscription Duration:",
    order_copy_code_hint: "<i>(Tap the code above to copy directly 👆)</i>",
    order_warranty_notice: "🛡️ <i>100% Replacement Warranty active for the full period. Support: @UPSTORE_HELP</i>",
  },
  es: {
    delivery_method_label: "Método de entrega",
    delivery_personal_account: "Activación directa en tu cuenta / correo personal ✉️",
    delivery_private_account: "Cuenta privada preactivada y dedicada 👤",
    delivery_license_key: "Clave de licencia digital oficial (Instantánea) 🔑",
    delivery_api_token: "Clave API / Token de acceso oficial ⚡",
    delivery_vpn_credentials: "Credenciales y configuración de VPN dedicada 🔐",
    order_delivery_title: "🎉 <b>¡Pago confirmado y pedido entregado! 🤍</b>",
    order_product_label: "Producto:",
    order_ref_label: "ID del pedido:",
    order_amount_received_label: "Monto pagado:",
    order_serial_title: "🔑 <b>Código de activación / Serial oficial (16 dígitos):</b>",
    order_credentials_title: "👤 <b>Credenciales de la cuenta dedicada:</b>",
    order_username_label: "Usuario / Correo:",
    order_password_label: "Contraseña:",
    order_duration_label: "Duración de la suscripción:",
    order_copy_code_hint: "<i>(Toca el código para copiarlo directamente 👆)</i>",
    order_warranty_notice: "🛡️ <i>Garantía de reemplazo 100% activa durante todo el período. Soporte: @UPSTORE_HELP</i>",
  },
  fr: {
    delivery_method_label: "Mode de livraison",
    delivery_personal_account: "Activation directe sur votre compte / e-mail personnel ✉️",
    delivery_private_account: "Compte privé pré-activé et dédié 👤",
    delivery_license_key: "Clé de licence numérique officielle (Instantanée) 🔑",
    delivery_api_token: "Clé API / Jeton d'accès officiel ⚡",
    delivery_vpn_credentials: "Identifiants et configuration VPN dédiés 🔐",
    order_delivery_title: "🎉 <b>Paiement confirmé et commande livrée ! 🤍</b>",
    order_product_label: "Produit :",
    order_ref_label: "Réf commande :",
    order_amount_received_label: "Montant payé :",
    order_serial_title: "🔑 <b>Code d'activation / Clé officielle (16 chiffres) :</b>",
    order_credentials_title: "👤 <b>Identifiants du compte dédié :</b>",
    order_username_label: "Nom d'utilisateur / E-mail :",
    order_password_label: "Mot de passe :",
    order_duration_label: "Durée de l'abonnement :",
    order_copy_code_hint: "<i>(Appuyez sur le code pour le copier 👆)</i>",
    order_warranty_notice: "🛡️ <i>Garantie de remplacement 100% active pendant toute la durée. Support : @UPSTORE_HELP</i>",
  },
  ru: {
    delivery_method_label: "Способ доставки",
    delivery_personal_account: "Прямая активация на ваш личный аккаунт / почту ✉️",
    delivery_private_account: "Выделенный активированный приватный аккаунт 👤",
    delivery_license_key: "Официальный цифровой лицензионный ключ (Мгновенно) 🔑",
    delivery_api_token: "Официальный API ключ / Токен доступа ⚡",
    delivery_vpn_credentials: "Выделенные учетные данные VPN с шифрованием 🔐",
    order_delivery_title: "🎉 <b>Оплата подтверждена и заказ доставлен! 🤍</b>",
    order_product_label: "Товар:",
    order_ref_label: "Номер заказа:",
    order_amount_received_label: "Оплаченная сумма:",
    order_serial_title: "🔑 <b>Официальный серийный номер / Код активации (16 цифр):</b>",
    order_credentials_title: "👤 <b>Учетные данные выделенного аккаунта:</b>",
    order_username_label: "Логин / Email:",
    order_password_label: "Пароль:",
    order_duration_label: "Срок подписки:",
    order_copy_code_hint: "<i>(Нажмите на код выше, чтобы скопировать 👆)</i>",
    order_warranty_notice: "🛡️ <i>100% гарантия замены активна на весь срок подписки. Поддержка: @UPSTORE_HELP</i>",
  },
  tr: {
    delivery_method_label: "Teslimat Yöntemi",
    delivery_personal_account: "Kişisel hesabınıza / e-postanıza doğrudan aktivasyon ✉️",
    delivery_private_account: "Önceden etkinleştirilmiş özel tahsisli hesap 👤",
    delivery_license_key: "Resmi Dijital Lisans Anahtarı (Anında Teslimat) 🔑",
    delivery_api_token: "Resmi API Anahtarı / Erişim Belirteci ⚡",
    delivery_vpn_credentials: "Özel şifreli VPN kimlik bilgileri 🔐",
    order_delivery_title: "🎉 <b>Ödeme onaylandı ve sipariş teslim edildi! 🤍</b>",
    order_product_label: "Ürün:",
    order_ref_label: "Sipariş No:",
    order_amount_received_label: "Ödenen Tutar:",
    order_serial_title: "🔑 <b>Resmi Seri Numarası / Aktivasyon Kodu (16 Haneli):</b>",
    order_credentials_title: "👤 <b>Özel Hesap Giriş Bilgileri:</b>",
    order_username_label: "Kullanıcı Adı / E-posta:",
    order_password_label: "Şifre:",
    order_duration_label: "Abonelik Süresi:",
    order_copy_code_hint: "<i>(Kodu kopyalamak için üzerine dokunun 👆)</i>",
    order_warranty_notice: "🛡️ <i>Tüm abonelik süresi boyunca %100 değişim garantisi aktif. Destek: @UPSTORE_HELP</i>",
  },
  de: {
    delivery_method_label: "Liefermethode",
    delivery_personal_account: "Direkte Aktivierung auf Ihrem persönlichen Konto / E-Mail ✉️",
    delivery_private_account: "Voraktiviertes, dediziertes Privatkonto 👤",
    delivery_license_key: "Offizieller digitaler Lizenzschlüssel (Sofortige Lieferung) 🔑",
    delivery_api_token: "Offizieller API-Schlüssel / Zugangs-Token ⚡",
    delivery_vpn_credentials: "Dedizierte, verschlüsselte VPN-Zugangsdaten 🔐",
    order_delivery_title: "🎉 <b>Zahlung bestätigt & Bestellung geliefert! 🤍</b>",
    order_product_label: "Produkt:",
    order_ref_label: "Bestell-Nr.:",
    order_amount_received_label: "Gezahlter Betrag:",
    order_serial_title: "🔑 <b>Offizieller Lizenzschlüssel / Aktivierungscode (16 Ziffern):</b>",
    order_credentials_title: "👤 <b>Dedizierte Kontozugangsdaten:</b>",
    order_username_label: "Benutzername / E-Mail:",
    order_password_label: "Passwort:",
    order_duration_label: "Abonnementdauer:",
    order_copy_code_hint: "<i>(Tippen Sie auf den Code, um ihn zu kopieren 👆)</i>",
    order_warranty_notice: "🛡️ <i>100% Ersatzgarantie für die gesamte Laufzeit aktiv. Support: @UPSTORE_HELP</i>",
  },
};

// Inject into I18N_STRINGS for each language
for (const [lang, keys] of Object.entries(EXTRA_KEYS)) {
  const marker = `"${lang}": {`;
  const idx = content.indexOf(marker);
  if (idx !== -1) {
    const keysEntries = Object.entries(keys)
      .map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
      .join('\n');
    
    content = content.slice(0, idx + marker.length) + '\n' + keysEntries + content.slice(idx + marker.length);
  }
}

// Add helper functions before export
const helperFunctions = `
export function getLocalizedDeliveryMethod(deliveryType, lang = DEFAULT_LANGUAGE) {
  if (!deliveryType) return t('delivery_personal_account', lang);
  const key = \`delivery_\${deliveryType}\`;
  return t(key, lang) || t('delivery_personal_account', lang);
}

export function getLocalizedAdvantages(product, lang = DEFAULT_LANGUAGE) {
  if (!product) return [];
  const langKey = \`advantages_\${lang}\`;
  if (product[langKey] && Array.isArray(product[langKey]) && product[langKey].length > 0) {
    return product[langKey];
  }
  if (product.advantages_en && Array.isArray(product.advantages_en) && product.advantages_en.length > 0) {
    return product.advantages_en;
  }
  return product.advantages_ar || [];
}
`;

if (!content.includes('export function getLocalizedDeliveryMethod')) {
  const insertBefore = 'export function t(';
  const insertPos = content.indexOf(insertBefore);
  if (insertPos !== -1) {
    content = content.slice(0, insertPos) + helperFunctions + '\n' + content.slice(insertPos);
  }
}

fs.writeFileSync(I18N_FILE, content);
console.log('✅ Successfully updated scripts/storeI18n.mjs with delivery and order keys!');
