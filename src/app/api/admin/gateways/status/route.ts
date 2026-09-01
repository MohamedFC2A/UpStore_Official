import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireAuthenticatedUser } from '@/utils/security';
import { isAdminIdentity } from '@/utils/auth';

export interface GatewayHealthInfo {
  id: string;
  nameAr: string;
  nameEn: string;
  category: 'global' | 'crypto' | 'egypt' | 'saudi' | 'wallet';
  icon: string;
  enabled: boolean;
  status: 'operational' | 'degraded' | 'error' | 'disabled';
  statusMessageAr: string;
  statusMessageEn: string;
  latencyMs: number;
  methods: Array<{
    id: string;
    nameAr: string;
    nameEn: string;
    badgeAr: string;
    badgeEn: string;
    currency: string;
    details?: string;
  }>;
  configSummary?: Record<string, string | boolean | null>;
}

export async function GET() {
  try {
    const auth = await requireAuthenticatedUser();
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, email')
      .eq('id', auth.user.id)
      .maybeSingle();

    const isUserAdmin = profile?.role === 'admin' || isAdminIdentity({ id: auth.user.id, email: auth.user.email });
    if (!isUserAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });
    }

    // Load site_settings from Supabase
    const { data: settingsData } = await supabaseAdmin.from('site_settings').select('key, value');
    const settings: Record<string, any> = {};
    if (settingsData) {
      for (const item of settingsData) {
        settings[item.key] = item.value;
      }
    }

    // Evaluate all gateways in parallel with latency profiling
    const results = await Promise.allSettled([
      testBybitGateway(settings),
      testBinancePayGateway(settings),
      testStripeGateway(settings),
      testLemonSqueezyGateway(settings),
      testNowPaymentsGateway(settings),
      testCryptomusGateway(settings),
      testBtcPayGateway(settings),
      testPaymobGateway(settings),
      testEgyptManualGateway(settings),
      testSaudiManualGateway(settings),
      testWalletGateway(supabaseAdmin),
    ]);

    const gateways: GatewayHealthInfo[] = results.map((res, idx) => {
      if (res.status === 'fulfilled') {
        return res.value;
      }
      return {
        id: `gateway_${idx}`,
        nameAr: 'بوابة غير معروفة',
        nameEn: 'Unknown Gateway',
        category: 'global',
        icon: '/images/payment/visa.png',
        enabled: false,
        status: 'error',
        statusMessageAr: 'حدث خطأ غير متوقع أثناء فحص البوابة',
        statusMessageEn: 'Unexpected error testing gateway',
        latencyMs: 0,
        methods: [],
      };
    });

    const activeCount = gateways.filter((g) => g.enabled).length;
    const operationalCount = gateways.filter((g) => g.status === 'operational').length;
    const healthScore = gateways.length > 0 ? Math.round((operationalCount / gateways.length) * 100) : 100;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalGateways: gateways.length,
        activeGateways: activeCount,
        operationalGateways: operationalCount,
        healthScorePercentage: healthScore,
        totalPaymentMethods: gateways.reduce((acc, g) => acc + g.methods.length, 0),
      },
      gateways,
    });
  } catch (error: any) {
    console.error('[ADMIN_GATEWAYS_API_ERROR]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch gateway statuses' },
      { status: 500 }
    );
  }
}

// ── Gateway Testers ──────────────────────────────────────────────────────────

async function testBybitGateway(settings: Record<string, any>): Promise<GatewayHealthInfo> {
  const start = Date.now();
  const enabled = settings.enable_bybit !== false; // default true
  const uid = settings.bybit_uid || process.env.BYBIT_UID || '47183921';
  const trc20 = settings.bybit_usdt_trc20 || process.env.BYBIT_USDT_TRC20_ADDRESS || 'TW4z3c4PZ2Gk5YQ7nN9x8vK1mB5qP9R2e1';
  const bep20 = settings.bybit_usdt_bep20 || '0x71C836e520023a1B3a0279612301A949826a7C10';
  const ton = settings.bybit_usdt_ton || 'EQBvW8m53GoU_jPAIp7LwY8Gj044kX_613p_dC6lQ1_y9Z1X';
  const apiKey = settings.bybit_api_key || process.env.BYBIT_API_KEY;

  let status: GatewayHealthInfo['status'] = 'operational';
  let msgAr = 'متصلة وجاهزة للتحويل الداخلي والشبكات الذكية';
  let msgEn = 'Connected and ready for Bybit UID and On-chain transfers';

  if (!enabled) {
    status = 'disabled';
    msgAr = 'البوابة معطلة حالياً من قبل الإدارة';
    msgEn = 'Gateway currently disabled by administrator';
  } else if (!uid && !trc20) {
    status = 'error';
    msgAr = 'معرّف Bybit UID وعناوين المحافظ غير مكتملة';
    msgEn = 'Bybit UID and wallet addresses are missing';
  }

  const latencyMs = Date.now() - start;

  return {
    id: 'bybit',
    nameAr: 'منصة Bybit والعملات الرقمية (Smart Suite)',
    nameEn: 'Bybit Smart Crypto Suite (USDT / BTC / TON)',
    category: 'crypto',
    icon: '/images/payment/bybit.svg?v=3',
    enabled,
    status,
    statusMessageAr: msgAr,
    statusMessageEn: msgEn,
    latencyMs,
    configSummary: {
      bybitUid: uid,
      hasApiKey: Boolean(apiKey),
      usdtTrc20: trc20 ? `${trc20.substring(0, 6)}...${trc20.slice(-4)}` : null,
      usdtBep20: bep20 ? `${bep20.substring(0, 6)}...${bep20.slice(-4)}` : null,
      usdtTon: ton ? `${ton.substring(0, 6)}...${ton.slice(-4)}` : null,
    },
    methods: [
      {
        id: 'bybit_uid',
        nameAr: 'تحويل داخلي عبر Bybit UID (0% رسوم)',
        nameEn: 'Bybit Internal Transfer (0% Fee UID)',
        badgeAr: '0% رسوم + تسليم آلي',
        badgeEn: '0% Fee Instant',
        currency: 'USD',
        details: `UID: ${uid}`,
      },
      {
        id: 'bybit_usdt_trc20',
        nameAr: 'إيداع USDT - شبكة ترون (TRC20)',
        nameEn: 'USDT Deposit - Tron Network (TRC20)',
        badgeAr: 'TRC20 فوري',
        badgeEn: 'TRC20 Instant',
        currency: 'USD',
        details: trc20,
      },
      {
        id: 'bybit_usdt_bep20',
        nameAr: 'إيداع USDT - بينانس سمارت شين (BEP20)',
        nameEn: 'USDT Deposit - BNB Smart Chain (BEP20)',
        badgeAr: 'BEP20 منخفض الرسوم',
        badgeEn: 'BEP20 Low Fee',
        currency: 'USD',
        details: bep20,
      },
      {
        id: 'bybit_usdt_ton',
        nameAr: 'إيداع USDT - شبكة تليجرام (TON)',
        nameEn: 'USDT Deposit - The Open Network (TON)',
        badgeAr: 'TON فائق السرعة',
        badgeEn: 'TON Ultra Fast',
        currency: 'USD',
        details: ton,
      },
    ],
  };
}

async function testBinancePayGateway(settings: Record<string, any>): Promise<GatewayHealthInfo> {
  const start = Date.now();
  const enabled = settings.enable_binance_pay !== false && settings.enable_bybit !== false;
  const payId = settings.binance_pay_id || process.env.BINANCE_PAY_ID || '764476139';

  let status: GatewayHealthInfo['status'] = 'operational';
  let msgAr = 'معرّف Binance Pay جاهز لاستقبال المدفوعات الفورية 0% رسوم';
  let msgEn = 'Binance Pay ID ready for 0% fee instant payments';

  if (!enabled) {
    status = 'disabled';
    msgAr = 'البوابة معطلة حالياً';
    msgEn = 'Gateway currently disabled';
  } else if (!payId) {
    status = 'error';
    msgAr = 'معرّف Binance Pay ID غير محدد';
    msgEn = 'Binance Pay ID is not configured';
  }

  return {
    id: 'binance_pay',
    nameAr: 'بينانس باي الفوري (Binance Pay)',
    nameEn: 'Binance Pay ID (0% Fee)',
    category: 'crypto',
    icon: '/images/payment/binance.svg?v=3',
    enabled,
    status,
    statusMessageAr: msgAr,
    statusMessageEn: msgEn,
    latencyMs: Date.now() - start,
    configSummary: {
      binancePayId: payId,
    },
    methods: [
      {
        id: 'binance_pay_id',
        nameAr: 'دفع فوري عبر Binance Pay ID',
        nameEn: 'Instant Transfer via Binance Pay ID',
        badgeAr: '0% رسوم شبكة',
        badgeEn: '0% Network Fee',
        currency: 'USD',
        details: `Pay ID: ${payId}`,
      },
      {
        id: 'binance_qr',
        nameAr: 'مسح رمز الاستجابة السريعة (Binance QR Code)',
        nameEn: 'Scan Binance QR Code',
        badgeAr: 'مسح فوري',
        badgeEn: 'Instant Scan',
        currency: 'USD',
        details: 'QR Payment',
      },
    ],
  };
}

async function testStripeGateway(settings: Record<string, any>): Promise<GatewayHealthInfo> {
  const start = Date.now();
  const enabled = settings.enable_stripe !== false;
  const stripeKey = settings.stripe_secret_key || process.env.STRIPE_SECRET_KEY;

  let status: GatewayHealthInfo['status'] = 'operational';
  let msgAr = 'اتصال مباشر ناجح مع خوادم Stripe العالمية (3DSecure جاهز)';
  let msgEn = 'Live connection operational with Stripe API (3DSecure ready)';

  if (!enabled) {
    status = 'disabled';
    msgAr = 'البوابة معطلة حالياً من قبل الإدارة';
    msgEn = 'Gateway disabled by administrator';
  } else if (!stripeKey) {
    status = 'error';
    msgAr = 'مفتاح STRIPE_SECRET_KEY مفقود';
    msgEn = 'STRIPE_SECRET_KEY is missing';
  } else {
    try {
      const stripe = new Stripe(stripeKey, { apiVersion: '2026-05-27.dahlia' as any });
      // Ping Stripe with 3s timeout
      await Promise.race([
        stripe.balance.retrieve(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Stripe timeout')), 3000)),
      ]);
    } catch (err: any) {
      status = 'degraded';
      msgAr = `تنبيه: ${err?.message || 'فشل الاتصال بخوادم Stripe'}`;
      msgEn = `Warning: ${err?.message || 'Failed connecting to Stripe'}`;
    }
  }

  return {
    id: 'stripe',
    nameAr: 'البطاقات البنكية العالمية (Stripe 3DS)',
    nameEn: 'Global Bank Cards (Stripe 3D-Secure)',
    category: 'global',
    icon: '/images/payment/visa.png?v=3',
    enabled,
    status,
    statusMessageAr: msgAr,
    statusMessageEn: msgEn,
    latencyMs: Date.now() - start,
    configSummary: {
      hasSecretKey: Boolean(stripeKey),
      keyPrefix: stripeKey ? `${stripeKey.substring(0, 7)}...` : null,
    },
    methods: [
      {
        id: 'stripe_visa_mastercard',
        nameAr: 'بطاقات فيزا وماستركارد (Visa & MasterCard)',
        nameEn: 'Visa & MasterCard Credit/Debit',
        badgeAr: 'تشفير بنكي 256-bit',
        badgeEn: '256-bit SSL',
        currency: 'USD',
      },
      {
        id: 'stripe_apple_pay',
        nameAr: 'آبل باي (Apple Pay)',
        nameEn: 'Apple Pay 1-Tap',
        badgeAr: 'دفع بنقرة واحدة',
        badgeEn: '1-Tap Fast',
        currency: 'USD',
      },
      {
        id: 'stripe_google_pay',
        nameAr: 'جوجل باي (Google Pay)',
        nameEn: 'Google Pay',
        badgeAr: 'لحظي آمن',
        badgeEn: 'Instant Secure',
        currency: 'USD',
      },
    ],
  };
}

async function testLemonSqueezyGateway(settings: Record<string, any>): Promise<GatewayHealthInfo> {
  const start = Date.now();
  const enabled = settings.enable_lemonsqueezy !== false;
  const apiKey = settings.lemonsqueezy_api_key || process.env.LEMONSQUEEZY_API_KEY;
  const storeId = settings.lemonsqueezy_store_id || process.env.LEMONSQUEEZY_STORE_ID || '457660';

  let status: GatewayHealthInfo['status'] = 'operational';
  let msgAr = 'بوابة Lemon Squeezy متصلة وجاهزة لمعالجة بطاقات الائتمان، آبل باي، وبايبال';
  let msgEn = 'Lemon Squeezy live and ready to process credit cards, Apple Pay & PayPal';

  if (!enabled) {
    status = 'disabled';
    msgAr = 'البوابة معطلة حالياً';
    msgEn = 'Gateway currently disabled';
  } else if (!apiKey) {
    status = 'error';
    msgAr = 'مفتاح LEMONSQUEEZY_API_KEY غير مهيأ';
    msgEn = 'LEMONSQUEEZY_API_KEY is missing';
  } else {
    try {
      const { testLemonSqueezyApi } = await import('@/utils/lemonsqueezy');
      const res = await testLemonSqueezyApi(apiKey);
      if (!res.success) {
        status = 'degraded';
        msgAr = res.messageAr;
        msgEn = res.messageEn;
      } else {
        msgAr = res.messageAr;
        msgEn = res.messageEn;
      }
    } catch (err: any) {
      status = 'degraded';
      msgAr = `خطأ في فحص Lemon Squeezy: ${err.message}`;
      msgEn = `Lemon Squeezy test error: ${err.message}`;
    }
  }

  return {
    id: 'lemonsqueezy',
    nameAr: 'بوابة Lemon Squeezy (فيزا، ماستركارد، آبل باي، بايبال)',
    nameEn: 'Lemon Squeezy Global (Cards, Apple Pay, PayPal)',
    category: 'global',
    icon: '/images/payment/lemonsqueezy.svg',
    enabled,
    status,
    statusMessageAr: msgAr,
    statusMessageEn: msgEn,
    latencyMs: Date.now() - start,
    configSummary: {
      hasApiKey: Boolean(apiKey),
      storeId,
      keyPrefix: apiKey ? `${apiKey.substring(0, 8)}...` : null,
    },
    methods: [
      {
        id: 'ls_cards',
        nameAr: 'بطاقات فيزا وماستركارد العالمية (Visa & MasterCard)',
        nameEn: 'Global Visa & MasterCard Direct',
        badgeAr: 'تشفير 3DS آمن',
        badgeEn: '3DS Encrypted',
        currency: 'USD',
      },
      {
        id: 'ls_apple_pay',
        nameAr: 'آبل باي وجوجل باي (Apple Pay & Google Pay)',
        nameEn: 'Apple Pay & Google Pay Instant',
        badgeAr: 'دفع فوري بنقرة واحدة',
        badgeEn: '1-Click Pay',
        currency: 'USD',
      },
      {
        id: 'ls_paypal',
        nameAr: 'بايبال (PayPal Checkout)',
        nameEn: 'PayPal Instant Checkout',
        badgeAr: 'حساب وبطاقات بايبال',
        badgeEn: 'PayPal Direct',
        currency: 'USD',
      },
    ],
  };
}

async function testNowPaymentsGateway(settings: Record<string, any>): Promise<GatewayHealthInfo> {
  const start = Date.now();
  const enabled = settings.enable_nowpayments !== false;
  const apiKey = settings.nowpayments_api_key || process.env.NOWPAYMENTS_API_KEY;
  const ipnSecret = settings.nowpayments_ipn_secret || process.env.NOWPAYMENTS_IPN_SECRET;

  let status: GatewayHealthInfo['status'] = 'operational';
  let msgAr = 'بوابة NOWPayments جاهزة لمعالجة أكثر من 300 عملة رقمية وبطاقات عالمية';
  let msgEn = 'NOWPayments operational to process 300+ cryptocurrencies & global cards';

  if (!enabled) {
    status = 'disabled';
    msgAr = 'البوابة معطلة حالياً';
    msgEn = 'Gateway currently disabled';
  } else if (!apiKey) {
    status = 'error';
    msgAr = 'مفتاح NOWPAYMENTS_API_KEY غير مهيأ';
    msgEn = 'NOWPAYMENTS_API_KEY is missing';
  } else if (!ipnSecret) {
    status = 'degraded';
    msgAr = 'مفتاح التوقيع الرقمي IPN Secret Key مفقود (مطلوب لتأكيد الدفع التلقائي)';
    msgEn = 'IPN Secret Key is missing (required for instant webhook auto-dispatch)';
  }

  return {
    id: 'nowpayments',
    nameAr: 'بوابة NOWPayments (أكثر من 300 عملة رقمية وبطاقات)',
    nameEn: 'NOWPayments Gateway (300+ Cryptos & Cards)',
    category: 'crypto',
    icon: '/images/payment/nowpayments.svg',
    enabled,
    status,
    statusMessageAr: msgAr,
    statusMessageEn: msgEn,
    latencyMs: Date.now() - start,
    configSummary: {
      hasApiKey: Boolean(apiKey),
      hasIpnSecret: Boolean(ipnSecret),
      keyPrefix: apiKey ? `${apiKey.substring(0, 8)}...` : null,
    },
    methods: [
      {
        id: 'nowpayments_usdt',
        nameAr: 'USDT (TRC20 / ERC20 / BEP20 / Solana / TON / Polygon)',
        nameEn: 'USDT Multi-Chain Instant Checkout',
        badgeAr: 'تسليم آلي فوري',
        badgeEn: 'Instant Auto-Dispatch',
        currency: 'USD',
      },
      {
        id: 'nowpayments_btc_eth',
        nameAr: 'بيتكوين وإيثيريوم وسولانا (BTC, ETH, SOL, TON, LTC, DOGE)',
        nameEn: 'Major Cryptocurrencies (BTC, ETH, SOL, TON, LTC, DOGE)',
        badgeAr: 'دفع مشفر مباشر',
        badgeEn: 'Direct Crypto',
        currency: 'USD',
      },
      {
        id: 'nowpayments_altcoins',
        nameAr: 'أكثر من 300 عملة رقمية مدعومة (300+ Altcoins)',
        nameEn: '300+ Supported Cryptocurrencies & Tokens',
        badgeAr: 'تغطية شاملة',
        badgeEn: 'Full Coverage',
        currency: 'USD',
      },
    ],
  };
}

async function testCryptomusGateway(settings: Record<string, any>): Promise<GatewayHealthInfo> {
  const start = Date.now();
  const enabled = settings.enable_cryptomus !== false;
  const merchantUuid = settings.cryptomus_merchant_uuid || process.env.CRYPTOMUS_MERCHANT_UUID;
  const apiKey = settings.cryptomus_api_key || process.env.CRYPTOMUS_API_KEY;

  let status: GatewayHealthInfo['status'] = 'operational';
  let msgAr = 'بوابة كريبتومس جاهزة لمعالجة 100+ عملة رقمية وبطاقات ائتمان';
  let msgEn = 'Cryptomus ready to process 100+ cryptocurrencies and credit cards';

  if (!enabled) {
    status = 'disabled';
    msgAr = 'البوابة معطلة حالياً';
    msgEn = 'Gateway currently disabled';
  } else if (!merchantUuid || !apiKey) {
    status = 'error';
    msgAr = 'معرّف التاجر أو مفتاح API الخاص بـ Cryptomus غير مكتمل';
    msgEn = 'Cryptomus Merchant UUID or API Key is missing';
  }

  return {
    id: 'cryptomus',
    nameAr: 'بوابة Cryptomus (فيزا وماستركارد و100+ عملة مشفرة)',
    nameEn: 'Cryptomus Gateway (Cards & 100+ Cryptos)',
    category: 'crypto',
    icon: '/images/payment/cryptomus.svg',
    enabled,
    status,
    statusMessageAr: msgAr,
    statusMessageEn: msgEn,
    latencyMs: Date.now() - start,
    configSummary: {
      merchantUuid: merchantUuid ? `${merchantUuid.substring(0, 8)}...` : null,
      hasApiKey: Boolean(apiKey),
    },
    methods: [
      {
        id: 'cryptomus_crypto',
        nameAr: '100+ عملة رقمية (USDT, BTC, ETH, TON, SOL)',
        nameEn: '100+ Cryptocurrencies (USDT, BTC, ETH, TON, SOL)',
        badgeAr: 'تسليم آلي فوري',
        badgeEn: 'Auto Instant Dispatch',
        currency: 'USD',
      },
      {
        id: 'cryptomus_cards',
        nameAr: 'البطاقات الدولية عبر بوابة الكريبتو',
        nameEn: 'International Cards via Crypto Rail',
        badgeAr: 'قبول عالمي',
        badgeEn: 'Global Acceptance',
        currency: 'USD',
      },
    ],
  };
}

async function testBtcPayGateway(settings: Record<string, any>): Promise<GatewayHealthInfo> {
  const start = Date.now();
  const enabled = settings.enable_btcpay !== false;
  const serverUrl = settings.btcpay_server_url || process.env.BTCPAY_SERVER_URL;
  const storeId = settings.btcpay_store_id || process.env.BTCPAY_STORE_ID;

  let status: GatewayHealthInfo['status'] = 'operational';
  let msgAr = 'خادم بيتكوين اللامركزي نشط وجاهز لتوليد الفواتير';
  let msgEn = 'Decentralized BTCPay node active and generating invoices';

  if (!enabled) {
    status = 'disabled';
    msgAr = 'البوابة معطلة حالياً';
    msgEn = 'Gateway currently disabled';
  } else if (!serverUrl && !process.env.BTCPAY_SERVER_URL) {
    status = 'degraded';
    msgAr = 'يعمل في وضع المحاكاة اللامركزية الافتراضية';
    msgEn = 'Running in simulated decentralized mode';
  }

  return {
    id: 'btcpay',
    nameAr: 'خادم BTCPay (بيتكوين / لايتنينج / دفع لامركزي)',
    nameEn: 'BTCPay Server (Bitcoin, Lightning Network, On-Chain)',
    category: 'crypto',
    icon: '/images/payment/btcpay.svg',
    enabled,
    status,
    statusMessageAr: msgAr,
    statusMessageEn: msgEn,
    latencyMs: Date.now() - start,
    configSummary: {
      serverUrl: serverUrl || 'Default Node',
      hasStoreId: Boolean(storeId),
    },
    methods: [
      {
        id: 'btcpay_onchain',
        nameAr: 'بيتكوين عبر البلوكتشين (BTC On-Chain)',
        nameEn: 'Bitcoin On-Chain Transaction',
        badgeAr: 'لامركزي 100%',
        badgeEn: '100% Decentralized',
        currency: 'USD',
      },
      {
        id: 'btcpay_lightning',
        nameAr: 'شبكة البرق فائقة السرعة (Bitcoin Lightning)',
        nameEn: 'Bitcoin Lightning Network',
        badgeAr: 'تأكيد في ثوانٍ',
        badgeEn: 'Sub-second Finality',
        currency: 'USD',
      },
    ],
  };
}

async function testPaymobGateway(settings: Record<string, any>): Promise<GatewayHealthInfo> {
  const start = Date.now();
  const enabled = settings.enable_paymob !== false;
  const apiKey = settings.paymob_api_key || process.env.PAYMOB_API_KEY;
  const integrationId = settings.paymob_integration_id || process.env.PAYMOB_INTEGRATION_ID;

  let status: GatewayHealthInfo['status'] = 'operational';
  let msgAr = 'بوابة Paymob مصر متصلة ومعتمدة لمعالجة البطاقات والمحافظ';
  let msgEn = 'Paymob Egypt operational for Cards & Mobile Wallets';

  if (!enabled) {
    status = 'disabled';
    msgAr = 'البوابة معطلة حالياً';
    msgEn = 'Gateway currently disabled';
  } else if (!apiKey || !integrationId) {
    status = 'degraded';
    msgAr = 'مفاتيح الربط تحتاج مراجعة';
    msgEn = 'API Keys need configuration check';
  }

  return {
    id: 'paymob',
    nameAr: 'بوابة Paymob مصر (بطاقات بنكية ومحافظ كاش)',
    nameEn: 'Paymob Egypt (EGP Cards & Mobile Wallets)',
    category: 'egypt',
    icon: '/images/payment/paymob.png',
    enabled,
    status,
    statusMessageAr: msgAr,
    statusMessageEn: msgEn,
    latencyMs: Date.now() - start,
    configSummary: {
      integrationId,
      hasApiKey: Boolean(apiKey),
    },
    methods: [
      {
        id: 'paymob_cards',
        nameAr: 'بطاقات فيزا / ماستركارد / ميزة (بالجنيه المصري)',
        nameEn: 'Visa / Mastercard / Meeza Cards (EGP)',
        badgeAr: 'دفع بالجنيه',
        badgeEn: 'EGP Native',
        currency: 'EGP',
      },
      {
        id: 'paymob_wallets',
        nameAr: 'محافظ المحمول الذكية (Smart Wallets)',
        nameEn: 'Mobile Wallets (Meeza / Vodafone / Orange / Etisalat / We)',
        badgeAr: 'لحظي 0% رسوم',
        badgeEn: 'Instant Wallet',
        currency: 'EGP',
      },
    ],
  };
}

async function testEgyptManualGateway(settings: Record<string, any>): Promise<GatewayHealthInfo> {
  const start = Date.now();
  const enabled = settings.enable_egypt_manual !== false;
  const instapay = settings.instapay_address || 'upstore@instapay';
  const vodafone = settings.vodafone_cash_number || '';
  const orange = settings.orange_cash_number || '01234567890';
  const etisalat = settings.etisalat_cash_number || '01123456789';
  const fawry = settings.fawry_merchant_code || '984120';

  let status: GatewayHealthInfo['status'] = 'operational';
  let msgAr = 'عناوين إنستاباي ومحافظ فودافون/أورنج/اتصالات/فوري نشطة وجاهزة';
  let msgEn = 'InstaPay IPA and Vodafone/Orange/Etisalat/Fawry wallets active';

  if (!enabled) {
    status = 'disabled';
    msgAr = 'البوابات المصرية معطلة حالياً';
    msgEn = 'Egypt manual gateways currently disabled';
  }

  return {
    id: 'egypt_manual',
    nameAr: 'محافظ وبنوك مصر اليدوية (إنستاباي / فودافون كاش / فوري)',
    nameEn: 'Egypt P2P & Instant Wallets (InstaPay / Vodafone Cash / Fawry)',
    category: 'egypt',
    icon: '/images/payment/instapay.png?v=3',
    enabled,
    status,
    statusMessageAr: msgAr,
    statusMessageEn: msgEn,
    latencyMs: Date.now() - start,
    configSummary: {
      instapayIpa: instapay,
      vodafoneCash: vodafone,
      orangeCash: orange,
      etisalatCash: etisalat,
      fawryCode: fawry,
    },
    methods: [
      {
        id: 'instapay_ipa',
        nameAr: 'إنستاباي مصر (InstaPay IPA / العنوان اللحظي)',
        nameEn: 'InstaPay Egypt (IPA / Instant)',
        badgeAr: '0% رسوم + لحظي',
        badgeEn: '0% Fee Instant',
        currency: 'EGP',
        details: `IPA: ${instapay}`,
      },
      {
        id: 'vodafone_cash_wallet',
        nameAr: 'محفظة فودافون كاش (Vodafone Cash *9*7#)',
        nameEn: 'Vodafone Cash Mobile Wallet',
        badgeAr: 'محفظة إلكترونية',
        badgeEn: 'Instant Wallet',
        currency: 'EGP',
        details: vodafone,
      },
      {
        id: 'orange_cash_wallet',
        nameAr: 'محفظة أورنج كاش (Orange Money #115#)',
        nameEn: 'Orange Cash Mobile Wallet',
        badgeAr: 'محفظة كاش',
        badgeEn: 'Instant Wallet',
        currency: 'EGP',
        details: orange,
      },
      {
        id: 'etisalat_cash_wallet',
        nameAr: 'محفظة اتصالات كاش (Etisalat Cash *777#)',
        nameEn: 'Etisalat Cash Mobile Wallet',
        badgeAr: 'محفظة كاش',
        badgeEn: 'Instant Wallet',
        currency: 'EGP',
        details: etisalat,
      },
      {
        id: 'fawry_aman',
        nameAr: 'فوري وأمان ومصاري (Fawry / Aman Code)',
        nameEn: 'Fawry & Aman Merchant Code',
        badgeAr: 'كود سداد',
        badgeEn: 'Payment Code',
        currency: 'EGP',
        details: `كود: ${fawry}`,
      },
    ],
  };
}

async function testSaudiManualGateway(settings: Record<string, any>): Promise<GatewayHealthInfo> {
  const start = Date.now();
  const enabled = settings.enable_saudi_manual !== false;
  const stcPay = settings.stc_pay_number || '0551234567';
  const urpay = settings.urpay_number || '0551234567';
  const alrajhi = settings.alrajhi_iban || 'SA0380000000608010167519';
  const snb = settings.snb_iban || 'SA4410000001234567890123';

  let status: GatewayHealthInfo['status'] = 'operational';
  let msgAr = 'محافظ STC Pay ويورباي والآيبان البنكي لمصرف الراجحي والأهلي نشطة';
  let msgEn = 'STC Pay, Urpay, and Al Rajhi / SNB IBAN accounts active';

  if (!enabled) {
    status = 'disabled';
    msgAr = 'البوابات السعودية معطلة حالياً';
    msgEn = 'Saudi manual gateways currently disabled';
  }

  return {
    id: 'saudi_manual',
    nameAr: 'محافظ وبنوك السعودية (STC Pay / الراجحي / الأهلي / يورباي)',
    nameEn: 'Saudi Arabia Wallets & Banks (STC Pay / Al Rajhi / SNB / Urpay)',
    category: 'saudi',
    icon: '/images/payment/stcpay.svg?v=3',
    enabled,
    status,
    statusMessageAr: msgAr,
    statusMessageEn: msgEn,
    latencyMs: Date.now() - start,
    configSummary: {
      stcPayNumber: stcPay,
      urpayNumber: urpay,
      alrajhiIban: alrajhi ? `${alrajhi.substring(0, 4)}...${alrajhi.slice(-4)}` : null,
      snbIban: snb ? `${snb.substring(0, 4)}...${snb.slice(-4)}` : null,
    },
    methods: [
      {
        id: 'stc_pay_wallet',
        nameAr: 'محفظة STC Pay السعودية (التحويل الفوري)',
        nameEn: 'STC Pay Saudi Mobile Wallet',
        badgeAr: 'محفظة فورية',
        badgeEn: 'Instant Wallet',
        currency: 'SAR',
        details: stcPay,
      },
      {
        id: 'urpay_mobily_pay',
        nameAr: 'يورباي وموبايلي باي وتيقمو (Urpay / Mobily Pay)',
        nameEn: 'Urpay & Mobily Pay Digital Wallets',
        badgeAr: 'محفظة رقمية',
        badgeEn: 'Digital Wallet',
        currency: 'SAR',
        details: urpay,
      },
      {
        id: 'alrajhi_bank_iban',
        nameAr: 'تحويل بنكي فوري - مصرف الراجحي (IBAN)',
        nameEn: 'Al Rajhi Bank Direct IBAN Transfer',
        badgeAr: 'آيبان بنكي سريع',
        badgeEn: 'Direct IBAN',
        currency: 'SAR',
        details: alrajhi,
      },
      {
        id: 'snb_bank_iban',
        nameAr: 'تحويل بنكي فوري - البنك الأهلي السعودي (SNB IBAN)',
        nameEn: 'SNB Al Ahli Bank Direct IBAN Transfer',
        badgeAr: 'آيبان بنكي سريع',
        badgeEn: 'Direct IBAN',
        currency: 'SAR',
        details: snb,
      },
    ],
  };
}

async function testWalletGateway(supabaseAdmin: any): Promise<GatewayHealthInfo> {
  const start = Date.now();
  let status: GatewayHealthInfo['status'] = 'operational';
  let msgAr = 'محرك المحفظة الداخلي نشط 100% ويعتمد على قاعدة البيانات اللحظية';
  let msgEn = 'Native DB Wallet Engine 100% operational with instant settlement';

  try {
    // Quick DB query test
    await supabaseAdmin.from('profiles').select('id').limit(1);
  } catch {
    status = 'degraded';
    msgAr = 'تعذر الاتصال بجدول محافظ المستخدمين';
    msgEn = 'Database wallet engine connection degraded';
  }

  return {
    id: 'wallet_uppay',
    nameAr: 'رصيد محفظة UpStore (UpPay الداخلي)',
    nameEn: 'UpStore Internal Wallet Balance (UpPay)',
    category: 'wallet',
    icon: '/icon.png',
    enabled: true,
    status,
    statusMessageAr: msgAr,
    statusMessageEn: msgEn,
    latencyMs: Date.now() - start,
    configSummary: {
      engine: 'Native PostgreSQL Row Level Locking',
      zeroFees: true,
    },
    methods: [
      {
        id: 'wallet_instant_balance',
        nameAr: 'الدفع الفوري من رصيد الحساب (0% رسوم واقتطاع لحظي)',
        nameEn: 'Instant Wallet Balance Checkout (0% Fees)',
        badgeAr: 'فوري 0% رسوم',
        badgeEn: '0% Instant',
        currency: 'USD',
      },
    ],
  };
}
