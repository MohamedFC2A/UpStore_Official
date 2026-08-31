import crypto from 'node:crypto';
import { createAdminClient } from '@/utils/supabase/admin';

export interface PaymobConfig {
  apiKey: string;
  publicKey: string;
  secretKey: string;
  hmacSecret: string;
  integrationId: number;
}

const DEFAULT_PAYMOB_BASE_URL = 'https://accept.paymob.com';

/**
 * Fetches Paymob configuration from database (site_settings) with fallback to process.env.
 */
export async function getPaymobConfig(): Promise<PaymobConfig> {
  let dbSettings: Record<string, any> = {};
  try {
    const supabaseAdmin = createAdminClient();
    const { data } = await supabaseAdmin.from('site_settings').select('key, value');
    if (data) {
      for (const item of data) {
        dbSettings[item.key] = typeof item.value === 'string' ? item.value : item.value;
      }
    }
  } catch (err) {
    console.warn('[Paymob Config] Failed to load site_settings, using env fallback:', err);
  }

  const intIdRaw = dbSettings.paymob_integration_id || process.env.PAYMOB_INTEGRATION_ID || '5863364';

  return {
    apiKey: dbSettings.paymob_api_key || process.env.PAYMOB_API_KEY || '',
    publicKey: dbSettings.paymob_public_key || process.env.NEXT_PUBLIC_PAYMOB_PUBLIC_KEY || '',
    secretKey: dbSettings.paymob_secret_key || process.env.PAYMOB_SECRET_KEY || '',
    hmacSecret: dbSettings.paymob_hmac || process.env.PAYMOB_HMAC || '',
    integrationId: Number(intIdRaw) || 5863364,
  };
}

export interface CreatePaymobCheckoutParams {
  amountCents: number; // e.g. 10000 for 100.00 EGP
  currency?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  orderId: string;
  sessionId: string;
  paymentMethod?: string;
  items?: Array<{
    name: string;
    amount_cents: number;
    description?: string;
    quantity?: number;
  }>;
}

/**
 * Executes Paymob Checkout Flow:
 * 1. POST /api/auth/tokens (Auth Token)
 * 2. POST /api/ecommerce/orders (Order Registration)
 * 3. POST /api/acceptance/payment_keys (Payment Key Request)
 * 4. POST /api/acceptance/payments/pay (Wallet Payment Initialization for Vodafone Cash / InstaPay)
 * Returns direct, fully functional Checkout URL.
 */
export async function createPaymobPaymentKey(params: CreatePaymobCheckoutParams): Promise<{
  success: boolean;
  checkoutUrl: string;
  paymentToken: string;
  paymobOrderId: number;
}> {
  const config = await getPaymobConfig();

  if (!config.apiKey) {
    throw new Error('PAYMOB_API_KEY is not configured.');
  }

  // 1. Get Auth Token
  const authRes = await fetch(`${DEFAULT_PAYMOB_BASE_URL}/api/auth/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: config.apiKey }),
  });

  const authData = await authRes.json();
  if (!authRes.ok || !authData.token) {
    throw new Error(authData.message || authData.detail || 'Failed to authenticate with Paymob API');
  }
  const authToken = authData.token;

  // 2. Register Order
  const orderRes = await fetch(`${DEFAULT_PAYMOB_BASE_URL}/api/ecommerce/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: authToken,
      delivery_needed: 'false',
      amount_cents: String(Math.round(params.amountCents)),
      currency: params.currency || 'EGP',
      merchant_order_id: params.sessionId,
      items: params.items?.map((it) => ({
        name: it.name || 'Digital Item',
        amount_cents: String(it.amount_cents || 100),
        description: it.description || 'Digital Subscription / Key',
        quantity: String(it.quantity || 1),
      })) || [],
    }),
  });

  const orderData = await orderRes.json();
  if (!orderRes.ok || !orderData.id) {
    throw new Error(orderData.message || orderData.detail || 'Failed to create Paymob order');
  }
  const paymobOrderId = orderData.id;

  // 3. Obtain Payment Key
  const customerPhone = params.phone || '+201012345678';
  const billingData = {
    apartment: 'NA',
    email: params.email || 'customer@upstore.one',
    floor: 'NA',
    first_name: params.firstName || 'UpStore',
    street: 'NA',
    building: 'NA',
    phone_number: customerPhone,
    shipping_method: 'PKG',
    postal_code: 'NA',
    city: 'Cairo',
    country: 'EG',
    last_name: params.lastName || 'Customer',
    state: 'Cairo',
  };

  const keyRes = await fetch(`${DEFAULT_PAYMOB_BASE_URL}/api/acceptance/payment_keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: authToken,
      amount_cents: String(Math.round(params.amountCents)),
      expiration: 3600,
      order_id: paymobOrderId,
      billing_data: billingData,
      currency: params.currency || 'EGP',
      integration_id: config.integrationId,
      lock_order_when_paid: 'false',
    }),
  });

  const keyData = await keyRes.json();
  if (!keyRes.ok || !keyData.token) {
    throw new Error(keyData.message || keyData.detail || 'Failed to generate Paymob payment key');
  }

  const paymentToken = keyData.token;
  let checkoutUrl = orderData.order_url || orderData.url || '';

  // 4. If Wallet method (Vodafone Cash, InstaPay, Orange Cash), initialize wallet session
  const isWallet =
    params.paymentMethod?.includes('vodafone') ||
    params.paymentMethod?.includes('instapay') ||
    params.paymentMethod?.includes('orange') ||
    params.paymentMethod?.includes('wallet');

  if (isWallet) {
    try {
      const walletRes = await fetch(`${DEFAULT_PAYMOB_BASE_URL}/api/acceptance/payments/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: {
            identifier: customerPhone.replace(/^\+2/, ''),
            subtype: 'WALLET',
          },
          payment_token: paymentToken,
        }),
      });

      const walletData = await walletRes.json();
      const redirect = walletData.redirect_url || walletData.iframe_redirection_url || walletData.data?.redirect_url;

      if (redirect) {
        checkoutUrl = redirect;
      } else if (walletData.data?.message?.includes('not registered') || walletData.message?.includes('not registered')) {
        throw new Error('رقم المحفظة غير مسجل في بيئة الاختبار (Test Mode). يرجى استخدام الرقم التجريبي 01010101010 لاختبار الدفع.');
      } else if (walletData.data?.message || walletData.message) {
        throw new Error(walletData.data?.message || walletData.message || 'فشلت عملية الدفع عبر المحفظة');
      }
    } catch (walletErr: any) {
      if (walletErr.message?.includes('01010101010') || walletErr.message?.includes('المحفظة')) {
        throw walletErr;
      }
      console.warn('[Paymob Wallet Init] Fallback to order url:', walletErr);
    }
  }

  if (!checkoutUrl) {
    throw new Error('تعذر إنشاء رابط الدفع للمحفظة. يرجى استخدام الرقم التجريبي 01010101010.');
  }

  return {
    success: true,
    checkoutUrl,
    paymentToken,
    paymobOrderId,
  };
}

/**
 * Verifies Paymob Webhook HMAC signature (SHA-512).
 */
export function verifyPaymobHmac(
  obj: Record<string, any>,
  receivedHmac: string,
  hmacSecret: string
): boolean {
  if (!receivedHmac || !hmacSecret) return false;

  try {
    const keys = [
      'amount_cents',
      'created_at',
      'currency',
      'error_occured',
      'has_parent_transaction',
      'id',
      'integration_id',
      'is_3d_secure',
      'is_auth',
      'is_capture',
      'is_refunded',
      'is_standalone_payment',
      'is_voided',
      'order',
      'owner',
      'pending',
      'source_data.pan',
      'source_data.sub_type',
      'source_data.type',
      'success',
    ];

    let concatenated = '';
    for (const key of keys) {
      if (key.includes('.')) {
        const [parent, child] = key.split('.');
        concatenated += obj[parent]?.[child] ?? '';
      } else {
        concatenated += obj[key] ?? '';
      }
    }

    const calculated = crypto.createHmac('sha512', hmacSecret).update(concatenated).digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(receivedHmac.toLowerCase(), 'hex'),
      Buffer.from(calculated.toLowerCase(), 'hex')
    );
  } catch (err) {
    console.error('[Paymob HMAC] Error verifying HMAC:', err);
    return false;
  }
}
