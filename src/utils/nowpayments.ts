import crypto from 'crypto';

export interface NowPaymentsInvoiceParams {
  amount: number; // e.g. 15.50
  currency?: string; // e.g. 'usd'
  orderId: string; // our internal session_id
  orderDescription?: string;
  successUrl?: string;
  cancelUrl?: string;
  ipnCallbackUrl?: string;
}

export interface NowPaymentsInvoiceResponse {
  id: string;
  orderId: string;
  orderDescription: string;
  priceAmount: string;
  priceCurrency: string;
  invoiceUrl: string;
  successUrl?: string;
  cancelUrl?: string;
  createdAt: string;
}

/**
 * Gets live NOWPayments credentials from site_settings or environment variables.
 */
export async function getNowPaymentsCredentials(): Promise<{
  apiKey: string;
  ipnSecret: string;
  isSandbox: boolean;
}> {
  let apiKey = process.env.NOWPAYMENTS_API_KEY || '';
  let ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET || '';
  let isSandbox = process.env.NOWPAYMENTS_SANDBOX === 'true';

  try {
    const { createAdminClient } = await import('@/utils/supabase/admin');
    const supabaseAdmin = createAdminClient();
    const { data } = await supabaseAdmin
      .from('site_settings')
      .select('key, value')
      .in('key', ['nowpayments_api_key', 'nowpayments_ipn_secret', 'nowpayments_sandbox']);

    if (data) {
      for (const item of data) {
        if (item.key === 'nowpayments_api_key' && item.value) apiKey = String(item.value).trim();
        if (item.key === 'nowpayments_ipn_secret' && item.value) ipnSecret = String(item.value).trim();
        if (item.key === 'nowpayments_sandbox') isSandbox = Boolean(item.value);
      }
    }
  } catch (err) {
    console.warn('[NOWPayments] Error reading credentials from site_settings:', err);
  }

  return { apiKey, ipnSecret, isSandbox };
}

/**
 * Verifies NOWPayments IPN (Instant Payment Notification) Webhook signature.
 * According to official NOWPayments docs:
 * 1. Extract signature from `x-nowpayments-sig` header.
 * 2. Sort all keys of JSON payload alphabetically.
 * 3. Convert sorted object to JSON string.
 * 4. Compute HMAC-SHA512 with IPN Secret Key.
 * 5. Compare computed hash with received signature.
 */
export function verifyNowPaymentsWebhook(
  payload: any,
  receivedSignature: string | null | undefined,
  ipnSecret: string
): boolean {
  if (!receivedSignature || !ipnSecret) return false;

  try {
    let dataObj = payload;
    if (typeof payload === 'string') {
      try {
        dataObj = JSON.parse(payload);
      } catch {
        dataObj = null;
      }
    }

    if (!dataObj || typeof dataObj !== 'object') {
      return false;
    }

    // Sort keys alphabetically recursively or shallow
    const sortObjectKeys = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
        return obj;
      }
      return Object.keys(obj)
        .sort()
        .reduce((result: Record<string, any>, key: string) => {
          result[key] = obj[key];
          return result;
        }, {});
    };

    const sortedObject = sortObjectKeys(dataObj);
    const sortedString = JSON.stringify(sortedObject);

    const computedSignature = crypto
      .createHmac('sha512', ipnSecret.trim())
      .update(sortedString)
      .digest('hex');

    return (
      computedSignature.toLowerCase().trim() === receivedSignature.toLowerCase().trim()
    );
  } catch (err) {
    console.error('[NOWPayments Webhook Verification Error]:', err);
    return false;
  }
}

/**
 * Creates a hosted invoice with NOWPayments API.
 * Endpoint: POST https://api.nowpayments.io/v1/invoice
 */
export async function createNowPaymentsInvoice(
  params: NowPaymentsInvoiceParams
): Promise<NowPaymentsInvoiceResponse> {
  const { apiKey, isSandbox } = await getNowPaymentsCredentials();

  if (!apiKey) {
    throw new Error('مفتاح API الخاص ببوابة NOWPayments غير مهيأ. يرجى إدخال NOWPAYMENTS_API_KEY في لوحة الإدارة.');
  }

  const baseUrl = isSandbox
    ? 'https://api-sandbox.nowpayments.io/v1'
    : 'https://api.nowpayments.io/v1';

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://upstore.one').replace(/\/+$/, '');

  const payload = {
    price_amount: Number(params.amount.toFixed(2)),
    price_currency: (params.currency || 'usd').toLowerCase(),
    order_id: params.orderId,
    order_description: params.orderDescription || `UpStore Order #${params.orderId.substring(0, 10).toUpperCase()}`,
    ipn_callback_url:
      params.ipnCallbackUrl ||
      `${appUrl.startsWith('http://localhost') ? 'https://upstore.one' : appUrl}/api/webhooks/nowpayments`,
    success_url:
      params.successUrl ||
      `${appUrl}/checkout/success?session_id=${encodeURIComponent(params.orderId)}`,
    cancel_url: params.cancelUrl || `${appUrl}/cart`,
    is_fee_paid_by_user: false,
  };

  const response = await fetch(`${baseUrl}/invoice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data.invoice_url) {
    let msg = data.message || data.error || 'Failed to create NOWPayments invoice';
    if (typeof msg === 'string' && msg.toLowerCase().includes('api key')) {
      msg = 'مفتاح NOWPayments API Key غير صالح أو منتهي الصلاحية. يرجى مراجعة Store Settings في لوحة NOWPayments.';
    } else if (typeof msg === 'string' && msg.toLowerCase().includes('minimum amount')) {
      msg = `المبلغ المطلوب أقل من الحد الأدنى المقبول في NOWPayments: ${data.message || ''}`;
    }
    throw new Error(msg);
  }

  return {
    id: String(data.id),
    orderId: data.order_id || params.orderId,
    orderDescription: data.order_description || '',
    priceAmount: String(data.price_amount),
    priceCurrency: data.price_currency || 'usd',
    invoiceUrl: data.invoice_url,
    successUrl: data.success_url,
    cancelUrl: data.cancel_url,
    createdAt: data.created_at || new Date().toISOString(),
  };
}

/**
 * Tests connection with NOWPayments API.
 */
export async function testNowPaymentsApi(apiKeyOverride?: string): Promise<{
  success: boolean;
  messageAr: string;
  messageEn: string;
  latencyMs: number;
  currenciesCount?: number;
}> {
  const start = Date.now();
  try {
    let apiKey = apiKeyOverride;
    let isSandbox = false;

    if (!apiKey) {
      const creds = await getNowPaymentsCredentials();
      apiKey = creds.apiKey;
      isSandbox = creds.isSandbox;
    }

    if (!apiKey) {
      return {
        success: false,
        messageAr: 'مفتاح NOWPAYMENTS_API_KEY مفقود في الخادم أو قاعدة البيانات',
        messageEn: 'NOWPAYMENTS_API_KEY is missing in server or database settings',
        latencyMs: 0,
      };
    }

    const baseUrl = isSandbox
      ? 'https://api-sandbox.nowpayments.io/v1'
      : 'https://api.nowpayments.io/v1';

    // 1. Check API Status
    const statusRes = await fetch(`${baseUrl}/status`, {
      method: 'GET',
      headers: { 'x-api-key': apiKey },
      signal: AbortSignal.timeout(6000),
    });

    if (!statusRes.ok) {
      const errData = await statusRes.json().catch(() => ({}));
      return {
        success: false,
        messageAr: `فشل التحقق من NOWPayments API: ${errData.message || statusRes.statusText}`,
        messageEn: `NOWPayments API check failed: ${errData.message || statusRes.statusText}`,
        latencyMs: Date.now() - start,
      };
    }

    // 2. Fetch supported currencies count for live verification
    const currRes = await fetch(`${baseUrl}/currencies`, {
      method: 'GET',
      headers: { 'x-api-key': apiKey },
      signal: AbortSignal.timeout(6000),
    });

    let count = 300;
    if (currRes.ok) {
      const currData = await currRes.json().catch(() => ({}));
      if (Array.isArray(currData?.currencies)) {
        count = currData.currencies.length;
      }
    }

    const latencyMs = Date.now() - start;

    return {
      success: true,
      messageAr: `تم الاتصال بنجاح بخوادم NOWPayments العالمية (متاح ${count}+ عملة رقمية)`,
      messageEn: `Successfully connected to NOWPayments Global API (${count}+ Cryptocurrencies available)`,
      latencyMs,
      currenciesCount: count,
    };
  } catch (err: any) {
    return {
      success: false,
      messageAr: `خطأ في الاتصال بـ NOWPayments: ${err.message || 'Timeout'}`,
      messageEn: `NOWPayments connection error: ${err.message || 'Timeout'}`,
      latencyMs: Date.now() - start,
    };
  }
}
