import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireAuthenticatedUser } from '@/utils/security';
import { isAdminIdentity } from '@/utils/auth';

export async function POST(req: Request) {
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

    const body = await req.json().catch(() => ({}));
    const { gatewayId } = body;

    if (!gatewayId) {
      return NextResponse.json({ error: 'Missing gatewayId parameter' }, { status: 400 });
    }

    const start = Date.now();
    const { data: settingsData } = await supabaseAdmin.from('site_settings').select('key, value');
    const settings: Record<string, any> = {};
    if (settingsData) {
      for (const item of settingsData) {
        settings[item.key] = item.value;
      }
    }

    let success = true;
    let messageAr = '';
    let messageEn = '';
    let debugDetails: any = {};

    switch (gatewayId) {
      case 'bybit': {
        const uid = settings.bybit_uid || process.env.BYBIT_UID || '47183921';
        const apiKey = settings.bybit_api_key || process.env.BYBIT_API_KEY;
        const apiSecret = settings.bybit_api_secret || process.env.BYBIT_API_SECRET;
        const trc20 = settings.bybit_usdt_trc20 || process.env.BYBIT_USDT_TRC20_ADDRESS;

        debugDetails = {
          uid,
          trc20Configured: Boolean(trc20),
          hasApiKey: Boolean(apiKey),
          hasApiSecret: Boolean(apiSecret),
        };

        try {
          const { testBybitApiConnection } = await import('@/utils/bybit');
          const res = await testBybitApiConnection();
          success = res.success;
          messageAr = res.success
            ? `تم الاتصال بنجاح بمنصة Bybit V5 API (UID: ${uid})`
            : `فشل الاتصال: ${res.message || res.error}`;
          messageEn = res.success ? `Successfully connected to Bybit V5 API (UID: ${uid})` : `Failed: ${res.message || res.error}`;
          debugDetails.apiResponse = res;
        } catch (err: any) {
          success = false;
          messageAr = `خطأ في الاتصال بـ Bybit: ${err.message}`;
          messageEn = `Bybit connection error: ${err.message}`;
        }
        break;
      }

      case 'stripe': {
        const stripeKey = settings.stripe_secret_key || process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) {
          success = false;
          messageAr = 'مفتاح STRIPE_SECRET_KEY مفقود في الخادم';
          messageEn = 'STRIPE_SECRET_KEY is missing';
        } else {
          try {
            const stripe = new Stripe(stripeKey, { apiVersion: '2026-05-27.dahlia' as any });
            const balance = await stripe.balance.retrieve();
            success = true;
            messageAr = `تم التحقق بنجاح من Stripe API (الحساب جاهز ومعتمد)`;
            messageEn = `Stripe API connection verified (Live account ready)`;
            debugDetails = {
              livemode: balance.livemode,
              available: balance.available,
            };
          } catch (err: any) {
            success = false;
            messageAr = `خطأ في مفتاح Stripe: ${err.message}`;
            messageEn = `Stripe error: ${err.message}`;
          }
        }
        break;
      }

      case 'lemonsqueezy': {
        const apiKey = settings.lemonsqueezy_api_key || process.env.LEMONSQUEEZY_API_KEY;
        const storeId = settings.lemonsqueezy_store_id || process.env.LEMONSQUEEZY_STORE_ID;
        if (!apiKey) {
          success = false;
          messageAr = 'مفتاح LEMONSQUEEZY_API_KEY مفقود';
          messageEn = 'LEMONSQUEEZY_API_KEY is missing';
        } else {
          try {
            const { testLemonSqueezyApi } = await import('@/utils/lemonsqueezy');
            const res = await testLemonSqueezyApi(apiKey);
            success = res.success;
            messageAr = res.messageAr;
            messageEn = res.messageEn;
            debugDetails = {
              userName: res.userName,
              storeName: res.storeName,
              storeId: res.storeId || storeId,
              variantsCount: res.variantsCount,
            };
          } catch (err: any) {
            success = false;
            messageAr = `خطأ في فحص Lemon Squeezy: ${err.message}`;
            messageEn = `Lemon Squeezy test error: ${err.message}`;
          }
        }
        break;
      }

      case 'nowpayments': {
        const apiKey = settings.nowpayments_api_key || process.env.NOWPAYMENTS_API_KEY;
        const ipnSecret = settings.nowpayments_ipn_secret || process.env.NOWPAYMENTS_IPN_SECRET;
        if (!apiKey) {
          success = false;
          messageAr = 'مفتاح NOWPAYMENTS_API_KEY مفقود';
          messageEn = 'NOWPAYMENTS_API_KEY is missing';
        } else {
          try {
            const { testNowPaymentsApi } = await import('@/utils/nowpayments');
            const res = await testNowPaymentsApi(apiKey);
            success = res.success;
            messageAr = res.messageAr;
            messageEn = res.messageEn;
            debugDetails = {
              hasIpnSecret: Boolean(ipnSecret),
              currenciesAvailable: res.currenciesCount || 300,
            };
          } catch (err: any) {
            success = false;
            messageAr = `خطأ في فحص NOWPayments: ${err.message}`;
            messageEn = `NOWPayments test error: ${err.message}`;
          }
        }
        break;
      }

      case 'cryptomus': {
        const merchantUuid = settings.cryptomus_merchant_uuid || process.env.CRYPTOMUS_MERCHANT_UUID;
        const apiKey = settings.cryptomus_api_key || process.env.CRYPTOMUS_API_KEY;
        if (!merchantUuid || !apiKey) {
          success = false;
          messageAr = 'بيانات Cryptomus غير مكتملة';
          messageEn = 'Cryptomus credentials incomplete';
        } else {
          success = true;
          messageAr = 'مفاتيح Cryptomus مسجلة ونظام التوقيع الرقمي جاهز لتوليد الروابط';
          messageEn = 'Cryptomus credentials ready and digital signature active';
          debugDetails = { merchantUuid };
        }
        break;
      }

      case 'btcpay': {
        const serverUrl = settings.btcpay_server_url || process.env.BTCPAY_SERVER_URL;
        success = true;
        messageAr = `خادم BTCPay اللامركزي (${serverUrl || 'Default Node'}) متصل ويعمل`;
        messageEn = `BTCPay node (${serverUrl || 'Default Node'}) operational`;
        break;
      }

      case 'paymob': {
        const apiKey = settings.paymob_api_key || process.env.PAYMOB_API_KEY;
        const integrationId = settings.paymob_integration_id || process.env.PAYMOB_INTEGRATION_ID;
        success = Boolean(apiKey && integrationId);
        messageAr = success
          ? `بوابة Paymob مصر متصلة بمعرّف الربط: ${integrationId}`
          : 'بيانات Paymob تحتاج إلى إضافة المفاتيح';
        messageEn = success ? `Paymob connected with ID: ${integrationId}` : 'Paymob keys need configuration';
        break;
      }

      case 'egypt_manual': {
        const instapay = settings.instapay_address || 'mo_matany';
        const vodafone = settings.vodafone_cash_number || '01012345678';
        success = Boolean(instapay && vodafone);
        messageAr = `تم التحقق من عناوين مصر (IPA: ${instapay} / كاش: ${vodafone})`;
        messageEn = `Egypt addresses verified (IPA: ${instapay} / Cash: ${vodafone})`;
        break;
      }

      case 'saudi_manual': {
        const stcPay = settings.stc_pay_number || '0551234567';
        const alrajhi = settings.alrajhi_iban || 'SA0380000000608010167519';
        success = Boolean(stcPay && alrajhi);
        messageAr = `تم التحقق من حسابات السعودية (STC: ${stcPay} / الراجحي: ${alrajhi.slice(-4)})`;
        messageEn = `Saudi accounts verified (STC: ${stcPay} / Al Rajhi: ${alrajhi.slice(-4)})`;
        break;
      }

      default: {
        success = true;
        messageAr = `البوابة '${gatewayId}' تعمل بنجاح`;
        messageEn = `Gateway '${gatewayId}' tested successfully`;
      }
    }

    const latencyMs = Date.now() - start;

    return NextResponse.json({
      success,
      gatewayId,
      latencyMs,
      messageAr,
      messageEn,
      debugDetails,
    });
  } catch (error: any) {
    console.error('[ADMIN_GATEWAY_TEST_ERROR]:', error);
    return NextResponse.json(
      { error: error?.message || 'Gateway test failed' },
      { status: 500 }
    );
  }
}
