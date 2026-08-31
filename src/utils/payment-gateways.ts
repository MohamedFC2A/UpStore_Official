import { createAdminClient } from '@/utils/supabase/admin';

export type PaymentRegion = 'egypt' | 'saudi' | 'global';

export interface PaymentMethodDefinition {
  id: string;
  nameEn: string;
  nameAr: string;
  category: PaymentRegion;
  badgeEn: string;
  badgeAr: string;
  badgeBg: string;
  type: 'instant_gateway' | 'crypto_smart' | 'p2p_manual';
  currency: 'egp' | 'sar' | 'usd';
  instructionsEn: string;
  instructionsAr: string;
  accountLabelEn: string;
  accountLabelAr: string;
  accountValue: string;
  qrValue?: string;
  ussdCode?: string;
  iconType: 'instapay' | 'vodafone' | 'orange' | 'etisalat' | 'fawry' | 'stc' | 'urpay' | 'alrajhi' | 'snb' | 'mada' | 'paypal' | 'arab' | 'stripe' | 'lemonsqueezy' | 'applepay' | 'card';
  enabled: boolean;
}

export interface PaymentGatewaysConfig {
  // Egypt
  instapayAddress: string;
  instapayUrl: string;
  vodafoneCashNumber: string;
  vodafoneCashUrl: string;
  orangeCashNumber: string;
  etisalatCashNumber: string;
  wePayNumber: string;
  fawryMerchantCode: string;
  
  // Saudi Arabia
  stcPayNumber: string;
  urpayNumber: string;
  mobilyPayNumber: string;
  alrajhiIban: string;
  alrajhiAccountName: string;
  snbIban: string;
  snbAccountName: string;

  // PayPal
  paypalUrl: string;
  paypalUsername: string;
  paypalQrImage: string;

  // Legacy / Disabled fields
  bybitUid?: string;
  bybitUsdtTrc20?: string;
  bybitUsdtBep20?: string;
  bybitUsdtTon?: string;
  binancePayId?: string;
  nowpaymentsApiKey?: string;
  nowpaymentsIpnSecret?: string;
  lemonsqueezyApiKey?: string;
  lemonsqueezyStoreId?: string;
  lemonsqueezyVariantId?: string;
  lemonsqueezyWebhookSecret?: string;

  // Gateways
  enablePaypal: boolean;
  enableArabLocal: boolean;
  enableStripe: boolean;
  enableLemonSqueezy: boolean;
  enableBtcPay: boolean;
  enableBybit: boolean;
  enableNowPayments: boolean;
  enableCryptomus: boolean;
  enableEgyptManual: boolean;
  enableSaudiManual: boolean;
}

export const DEFAULT_PAYMENT_CONFIG: PaymentGatewaysConfig = {
  instapayAddress: 'mo_matany@instapay',
  instapayUrl: 'https://ipn.eg/S/mo_matany/instapay/30M8Zj',
  vodafoneCashNumber: '01041140422',
  vodafoneCashUrl: 'https://vf.eg/vfcash?id=mt&qrId=qPfWzP',
  orangeCashNumber: '01234567890',
  etisalatCashNumber: '01123456789',
  wePayNumber: '01512345678',
  fawryMerchantCode: '984120',
  
  stcPayNumber: '0551234567',
  urpayNumber: '0551234567',
  mobilyPayNumber: '0561234567',
  alrajhiIban: 'SA0380000000608010167519',
  alrajhiAccountName: 'UpStore Digital Trading',
  snbIban: 'SA4410000001234567890123',
  snbAccountName: 'UpStore Digital Trading',

  paypalUrl: 'https://www.paypal.com/qrcodes/p2pqrc/N7AD8WM43LYVA',
  paypalUsername: 'MOHAMED MATANY',
  paypalQrImage: '/images/payment/paypal-qr.jpg',

  enablePaypal: true,
  enableArabLocal: true,
  enableStripe: true,
  enableLemonSqueezy: true,
  enableBtcPay: false,
  enableBybit: false,
  enableNowPayments: false,
  enableCryptomus: false,
  enableEgyptManual: true,
  enableSaudiManual: true,
};

// In-memory TTL cache (60 seconds) for payment gateways configuration
let cachedPaymentConfig: { config: PaymentGatewaysConfig; expiry: number } | null = null;

export function clearPaymentGatewaysConfigCache(): void {
  cachedPaymentConfig = null;
}

/**
 * Loads live payment gateway configuration from Supabase site_settings with fallback to env.
 * Cached in-memory with 60-second TTL to avoid redundant database reads.
 */
export async function getPaymentGatewaysConfig(options: { forceRefresh?: boolean } = {}): Promise<PaymentGatewaysConfig> {
  const now = Date.now();
  if (!options.forceRefresh && cachedPaymentConfig && cachedPaymentConfig.expiry > now) {
    return cachedPaymentConfig.config;
  }

  const config = { ...DEFAULT_PAYMENT_CONFIG };

  try {
    const supabaseAdmin = createAdminClient();
    const { data } = await supabaseAdmin.from('site_settings').select('key, value');
    
    if (data) {
      for (const item of data) {
        const val = typeof item.value === 'string' ? item.value : item.value;
        switch (item.key) {
          case 'instapay_address': config.instapayAddress = String(val); break;
          case 'instapay_url': config.instapayUrl = String(val); break;
          case 'vodafone_cash_number': config.vodafoneCashNumber = String(val); break;
          case 'vodafone_cash_url': config.vodafoneCashUrl = String(val); break;
          case 'orange_cash_number': config.orangeCashNumber = String(val); break;
          case 'etisalat_cash_number': config.etisalatCashNumber = String(val); break;
          case 'we_pay_number': config.wePayNumber = String(val); break;
          case 'fawry_merchant_code': config.fawryMerchantCode = String(val); break;
          
          case 'stc_pay_number': config.stcPayNumber = String(val); break;
          case 'urpay_number': config.urpayNumber = String(val); break;
          case 'mobily_pay_number': config.mobilyPayNumber = String(val); break;
          case 'alrajhi_iban': config.alrajhiIban = String(val); break;
          case 'alrajhi_account_name': config.alrajhiAccountName = String(val); break;
          case 'snb_iban': config.snbIban = String(val); break;
          case 'snb_account_name': config.snbAccountName = String(val); break;

          case 'bybit_uid': config.bybitUid = String(val); break;
          case 'bybit_usdt_trc20': config.bybitUsdtTrc20 = String(val); break;
          case 'bybit_usdt_bep20': config.bybitUsdtBep20 = String(val); break;
          case 'bybit_usdt_ton': config.bybitUsdtTon = String(val); break;
          case 'binance_pay_id': config.binancePayId = String(val); break;

          case 'nowpayments_api_key': config.nowpaymentsApiKey = String(val); break;
          case 'nowpayments_ipn_secret': config.nowpaymentsIpnSecret = String(val); break;
          case 'lemonsqueezy_api_key': config.lemonsqueezyApiKey = String(val); break;
          case 'lemonsqueezy_store_id': config.lemonsqueezyStoreId = String(val); break;
          case 'lemonsqueezy_variant_id': config.lemonsqueezyVariantId = String(val); break;
          case 'lemonsqueezy_webhook_secret': config.lemonsqueezyWebhookSecret = String(val); break;

          case 'enable_stripe': config.enableStripe = Boolean(val); break;
          case 'enable_lemonsqueezy': config.enableLemonSqueezy = Boolean(val); break;
          case 'enable_btcpay': config.enableBtcPay = Boolean(val); break;
          case 'enable_bybit': config.enableBybit = Boolean(val); break;
          case 'enable_nowpayments': config.enableNowPayments = Boolean(val); break;
          case 'enable_cryptomus': config.enableCryptomus = Boolean(val); break;
          case 'enable_egypt_manual': config.enableEgyptManual = Boolean(val); break;
          case 'enable_saudi_manual': config.enableSaudiManual = Boolean(val); break;
        }
      }
    }
  } catch (err) {
    console.warn('[Payment Config] Error reading site_settings:', err);
  }

  // Fallbacks to environment variables if provided
  if (process.env.INSTAPAY_ADDRESS) config.instapayAddress = process.env.INSTAPAY_ADDRESS;
  if (process.env.VODAFONE_CASH_NUMBER) config.vodafoneCashNumber = process.env.VODAFONE_CASH_NUMBER;
  if (process.env.STCPAY_NUMBER) config.stcPayNumber = process.env.STCPAY_NUMBER;
  if (process.env.ALRAJHI_IBAN) config.alrajhiIban = process.env.ALRAJHI_IBAN;
  if (process.env.BYBIT_UID) config.bybitUid = process.env.BYBIT_UID;
  if (process.env.BYBIT_USDT_TRC20_ADDRESS) config.bybitUsdtTrc20 = process.env.BYBIT_USDT_TRC20_ADDRESS;
  if (process.env.BINANCE_PAY_ID) config.binancePayId = process.env.BINANCE_PAY_ID;
  if (process.env.NOWPAYMENTS_API_KEY) config.nowpaymentsApiKey = process.env.NOWPAYMENTS_API_KEY;
  if (process.env.NOWPAYMENTS_IPN_SECRET) config.nowpaymentsIpnSecret = process.env.NOWPAYMENTS_IPN_SECRET;

  cachedPaymentConfig = { config, expiry: now + 60000 };
  return config;
}

/**
 * Returns complete list of available payment methods structured by region.
 */
export async function getAvailablePaymentMethods(): Promise<PaymentMethodDefinition[]> {
  const cfg = await getPaymentGatewaysConfig();

  return [
    // EGYPT PAYMENT METHODS
    {
      id: 'instapay',
      nameEn: 'InstaPay Egypt (IPA / Account / Card)',
      nameAr: 'إنستاباي مصر (عنوان الدفع IPA / الحساب البنكي)',
      category: 'egypt',
      badgeEn: 'Instant 0% Fee',
      badgeAr: 'لحظي 0% رسوم',
      badgeBg: 'bg-[#4F008C] text-white',
      type: 'p2p_manual',
      currency: 'egp',
      instructionsEn: 'Transfer the exact EGP amount via InstaPay application to the official IPA address below, then upload the receipt.',
      instructionsAr: 'قم بالتحويل عبر تطبيق إنستاباي إلى عنوان الدفع (IPA) الموضح أدناه، ثم أرسل إثبات التحويل.',
      accountLabelEn: 'InstaPay IPA / Address',
      accountLabelAr: 'عنوان الدفع إنستاباي (IPA)',
      accountValue: cfg.instapayAddress,
      qrValue: cfg.instapayUrl,
      iconType: 'instapay',
      enabled: cfg.enableEgyptManual,
    },
    {
      id: 'vodafone_cash',
      nameEn: 'Vodafone Cash (فودافون كاش)',
      nameAr: 'محفظة فودافون كاش (Vodafone Cash)',
      category: 'egypt',
      badgeEn: 'Vodafone Cash',
      badgeAr: 'فودافون كاش',
      badgeBg: 'bg-[#E60000] text-white',
      type: 'p2p_manual',
      currency: 'egp',
      instructionsEn: 'Transfer to the Vodafone Cash wallet number below (Code: *9*7#) and upload the transfer message.',
      instructionsAr: 'قم بالتحويل لرقم محفظة فودافون كاش (كود التحويل: *9*7#) وارفعه لتأكيد الطلب فوراً.',
      accountLabelEn: 'Vodafone Cash Number',
      accountLabelAr: 'رقم محفظة فودافون كاش',
      accountValue: cfg.vodafoneCashNumber,
      qrValue: cfg.vodafoneCashUrl || 'http://vf.eg/vfcash?id=mt&qrId=qPfWzP',
      ussdCode: `*9*7*${cfg.vodafoneCashNumber}*AMOUNT#`,
      iconType: 'vodafone',
      enabled: cfg.enableEgyptManual,
    },
    {
      id: 'orange_cash',
      nameEn: 'Orange Cash (أورنج كاش)',
      nameAr: 'محفظة أورنج كاش (Orange Cash)',
      category: 'egypt',
      badgeEn: 'Orange Cash',
      badgeAr: 'أورنج كاش',
      badgeBg: 'bg-[#FF7900] text-white',
      type: 'p2p_manual',
      currency: 'egp',
      instructionsEn: 'Transfer to the Orange Cash wallet number below (Code: #115#) and upload the transfer receipt.',
      instructionsAr: 'قم بالتحويل لرقم محفظة أورنج كاش (كود التحويل: #115#) ثم أرسل إشعار التحويل.',
      accountLabelEn: 'Orange Cash Number',
      accountLabelAr: 'رقم محفظة أورنج كاش',
      accountValue: cfg.orangeCashNumber,
      iconType: 'orange',
      enabled: cfg.enableEgyptManual,
    },
    {
      id: 'etisalat_cash',
      nameEn: 'Etisalat Cash (اتصالات كاش)',
      nameAr: 'محفظة اتصالات كاش (Etisalat Cash)',
      category: 'egypt',
      badgeEn: 'Wallet (كاش)',
      badgeAr: 'محفظة إلكترونية',
      badgeBg: 'bg-[#06D6A0]',
      type: 'p2p_manual',
      currency: 'egp',
      instructionsEn: 'Transfer to the Etisalat Cash wallet number below (Code: *777#) and confirm your order.',
      instructionsAr: 'قم بالتحويل لرقم محفظة اتصالات كاش (كود التحويل: *777#) لتأكيد وتفعيل طلبك.',
      accountLabelEn: 'Etisalat Cash Number',
      accountLabelAr: 'رقم محفظة اتصالات كاش',
      accountValue: cfg.etisalatCashNumber,
      iconType: 'etisalat',
      enabled: cfg.enableEgyptManual,
    },
    {
      id: 'fawry',
      nameEn: 'Fawry & Aman (فوري وأمان)',
      nameAr: 'فوري وأمان وخدماتي (Fawry / Aman)',
      category: 'egypt',
      badgeEn: 'Store Code',
      badgeAr: 'كود دفع فوري',
      badgeBg: 'bg-[#4CC9F0]',
      type: 'p2p_manual',
      currency: 'egp',
      instructionsEn: 'Pay via any Fawry machine or mobile app using the merchant reference code, then upload receipt.',
      instructionsAr: 'ادفع عبر أي ماكينة فوري أو تطبيق فوري باي باستخدام كود الخدمة الموضح، ثم ارفع إيصال السداد.',
      accountLabelEn: 'Fawry Service / Merchant Code',
      accountLabelAr: 'كود خدمة فوري للتحويل',
      accountValue: cfg.fawryMerchantCode,
      iconType: 'fawry',
      enabled: cfg.enableEgyptManual,
    },

    // SAUDI ARABIA PAYMENT METHODS
    {
      id: 'stc_pay',
      nameEn: 'STC Pay (إس تي سي باي)',
      nameAr: 'محفظة إس تي سي باي (STC Pay)',
      category: 'saudi',
      badgeEn: 'STC Pay',
      badgeAr: 'محفظة STC',
      badgeBg: 'bg-[#4F008C] text-white',
      type: 'p2p_manual',
      currency: 'sar',
      instructionsEn: 'Transfer the required SAR amount via STC Pay mobile transfer or QR, then submit the confirmation.',
      instructionsAr: 'قم بالتحويل عبر تطبيق STC Pay إلى رقم الجوال الموضح أدناه، ثم أرسل إيصال العملية.',
      accountLabelEn: 'STC Pay Mobile / Account',
      accountLabelAr: 'رقم جوال محفظة STC Pay',
      accountValue: cfg.stcPayNumber,
      iconType: 'stc',
      enabled: cfg.enableSaudiManual,
    },
    {
      id: 'urpay',
      nameEn: 'Urpay & Mobily Pay (يورباي وموبايلي باي)',
      nameAr: 'يورباي وموبايلي باي (Urpay / Mobily Pay)',
      category: 'saudi',
      badgeEn: 'Digital Wallet',
      badgeAr: 'محافظ رقمية',
      badgeBg: 'bg-[#4CC9F0] text-black',
      type: 'p2p_manual',
      currency: 'sar',
      instructionsEn: 'Transfer via Urpay, Mobily Pay or Tiqmo to the registered mobile number below.',
      instructionsAr: 'قم بالتحويل عبر تطبيق Urpay أو Mobily Pay لرقم الجوال الموضح أدناه.',
      accountLabelEn: 'Urpay / Mobily Pay Mobile',
      accountLabelAr: 'رقم المحفظة الرقمية',
      accountValue: cfg.urpayNumber,
      iconType: 'urpay',
      enabled: cfg.enableSaudiManual,
    },
    {
      id: 'alrajhi',
      nameEn: 'Al Rajhi Bank Transfer (مصرف الراجحي)',
      nameAr: 'تحويل بنكي فوري - مصرف الراجحي (Al Rajhi)',
      category: 'saudi',
      badgeEn: 'Al Rajhi Bank',
      badgeAr: 'مصرف الراجحي',
      badgeBg: 'bg-[#0077C8] text-white',
      type: 'p2p_manual',
      currency: 'sar',
      instructionsEn: 'Transfer directly to our Al Rajhi Bank account via IBAN, then upload the transaction receipt.',
      instructionsAr: 'قم بالتحويل المباشر لحسابنا في مصرف الراجحي عبر الآيبان، ثم ارفع إيصال العملية.',
      accountLabelEn: 'Al Rajhi IBAN',
      accountLabelAr: 'آيبان مصرف الراجحي (IBAN)',
      accountValue: cfg.alrajhiIban,
      iconType: 'alrajhi',
      enabled: cfg.enableSaudiManual,
    },
    {
      id: 'snb',
      nameEn: 'SNB Al Ahli Transfer (البنك الأهلي السعودي)',
      nameAr: 'تحويل بنكي فوري - البنك الأهلي السعودي (SNB)',
      category: 'saudi',
      badgeEn: 'SNB Al Ahli',
      badgeAr: 'البنك الأهلي',
      badgeBg: 'bg-[#06D6A0] text-black',
      type: 'p2p_manual',
      currency: 'sar',
      instructionsEn: 'Transfer directly to our SNB Al Ahli Bank account via IBAN, then submit the confirmation.',
      instructionsAr: 'قم بالتحويل المباشر لحسابنا في البنك الأهلي السعودي عبر الآيبان، ثم ارفع إيصال العملية.',
      accountLabelEn: 'SNB Al Ahli IBAN',
      accountLabelAr: 'آيبان البنك الأهلي (IBAN)',
      accountValue: cfg.snbIban,
      iconType: 'snb',
      enabled: cfg.enableSaudiManual,
    },

    // GLOBAL & INTERNATIONAL PAYMENT METHODS
    {
      id: 'paypal',
      nameEn: 'PayPal Direct Payment (بايبال)',
      nameAr: 'بايبال الدفع المباشر (PayPal Direct)',
      category: 'global',
      badgeEn: '0% Fees Direct',
      badgeAr: 'فوري 0% عمولة',
      badgeBg: 'bg-[#0079C1] text-white',
      type: 'p2p_manual',
      currency: 'usd',
      instructionsEn: 'Click the direct PayPal payment link to transfer the exact amount, then upload the receipt for instant automatic verification.',
      instructionsAr: 'اضغط على رابط بايبال المباشر للتحويل، ثم ارفع لقطة الشاشة أو رقم المعاملة لتأكيد طلبك فوراً وبشكل تلقائي.',
      accountLabelEn: 'PayPal Account / Direct Link',
      accountLabelAr: 'حساب ورابط الدفع عبر PayPal',
      accountValue: cfg.paypalUrl,
      iconType: 'paypal',
      enabled: cfg.enablePaypal,
    },
    {
      id: 'arab_local_methods',
      nameEn: 'Other Arab Payment Methods (Arabi pay)',
      nameAr: 'طرق دفع أخرى عربية (Arabi pay)',
      category: 'global',
      badgeEn: 'Arabi pay',
      badgeAr: 'طرق دفع عربية',
      badgeBg: 'bg-[#FFE600] text-black',
      type: 'p2p_manual',
      currency: 'usd',
      instructionsEn: 'Connect directly with VIP Telegram Support @UpStore_help to receive the dedicated local payment method in your country (Mobile Wallets, Instant Bank Transfers, CliQ, Zain Cash, BaridiMob, Bankak, etc.).',
      instructionsAr: 'تواصل مباشرة مع خدمة العملاء عبر تليجرام @UpStore_help لتزويدك بطريقة الدفع المحلية الأنسب في دولتك (تحويل بنكي محلي، محافظ رقمية، كليك الأردن، زين كاش العراق، بريدي موب الجزائر، بنكك السودان وغيرها).',
      accountLabelEn: 'Telegram VIP Support',
      accountLabelAr: 'الدعم المباشر عبر تليجرام @UpStore_help',
      accountValue: '@UpStore_help',
      iconType: 'arab',
      enabled: cfg.enableArabLocal,
    },
    {
      id: 'stripe_cards',
      nameEn: 'Bank Cards (Visa, MasterCard, Amex, Apple Pay)',
      nameAr: 'البطاقات البنكية العالمية (فيزا / ماستركارد / مدى / آبل باي)',
      category: 'global',
      badgeEn: 'Instant 3DS',
      badgeAr: 'دفع فوري مشفر',
      badgeBg: 'bg-[#06D6A0]',
      type: 'instant_gateway',
      currency: 'usd',
      instructionsEn: 'Pay securely using any credit, debit card, or Apple Pay with 256-bit bank encryption.',
      instructionsAr: 'ادفع بأمان عبر أي بطاقة بنكية عالمية أو آبل باي مع تشفير بنكي كامل 256-Bit.',
      accountLabelEn: 'Global Card Processing',
      accountLabelAr: 'معالجة البطاقات العالمية المباشرة',
      accountValue: 'Stripe Gateway Active',
      iconType: 'stripe',
      enabled: cfg.enableStripe,
    },
    {
      id: 'lemonsqueezy',
      nameEn: 'Lemon Squeezy (Visa, MasterCard, Apple Pay)',
      nameAr: 'بوابة Lemon Squeezy (فيزا، ماستركارد، آبل باي)',
      category: 'global',
      badgeEn: 'Cards & Apple Pay',
      badgeAr: 'بطاقات وآبل باي',
      badgeBg: 'bg-[#FFC800]',
      type: 'instant_gateway',
      currency: 'usd',
      instructionsEn: 'Instant secure 3D-Secure checkout with Visa, MasterCard, Apple Pay, and Google Pay.',
      instructionsAr: 'دفع فوري مشفر بالبطاقات البنكية العالمية (فيزا / ماستركارد)، آبل باي، وجوجل باي مع تسليم لحظي.',
      accountLabelEn: 'Lemon Squeezy Merchant Gateway',
      accountLabelAr: 'بوابة الدفع العالمية Lemon Squeezy',
      accountValue: 'Lemon Squeezy Active',
      iconType: 'lemonsqueezy',
      enabled: cfg.enableLemonSqueezy,
    },
  ];
}
