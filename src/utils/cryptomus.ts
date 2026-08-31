import crypto from 'crypto';

export interface CryptomusPaymentParams {
  amount: string; // e.g. "15.00"
  currency: string; // e.g. "USD"
  orderId: string;
  urlReturn?: string;
  urlCallback?: string;
  additionalData?: string;
}

export function generateCryptomusSignature(data: any, apiKey: string): string {
  const json = typeof data === 'string' ? data : JSON.stringify(data);
  const base64 = Buffer.from(json).toString('base64');
  return crypto.createHash('md5').update(base64 + apiKey).digest('hex');
}

export function verifyCryptomusWebhook(rawBodyOrObj: any, signature: string, apiKey: string): boolean {
  if (!signature || !apiKey) return false;

  let dataObj = rawBodyOrObj;
  if (typeof rawBodyOrObj === 'string') {
    try {
      dataObj = JSON.parse(rawBodyOrObj);
    } catch {
      dataObj = null;
    }
  }

  if (dataObj && typeof dataObj === 'object') {
    const { sign: _omitted, ...rest } = dataObj;
    const json1 = JSON.stringify(rest);
    const hash1 = crypto.createHash('md5').update(Buffer.from(json1).toString('base64') + apiKey).digest('hex');
    if (hash1.toLowerCase() === signature.toLowerCase()) return true;

    const json2 = json1.replace(/\//g, '\\/');
    const hash2 = crypto.createHash('md5').update(Buffer.from(json2).toString('base64') + apiKey).digest('hex');
    if (hash2.toLowerCase() === signature.toLowerCase()) return true;
  }

  const rawStr = typeof rawBodyOrObj === 'string' ? rawBodyOrObj : JSON.stringify(rawBodyOrObj);
  const calculated = generateCryptomusSignature(rawStr, apiKey);
  return calculated.toLowerCase() === signature.toLowerCase();
}

export async function createCryptomusPayment(params: CryptomusPaymentParams) {
  let apiKey = process.env.CRYPTOMUS_API_KEY || '';
  let merchantId = process.env.CRYPTOMUS_MERCHANT_UUID || '';

  if (!apiKey || !merchantId) {
    try {
      const { createAdminClient } = await import('@/utils/supabase/admin');
      const supabaseAdmin = createAdminClient();
      const { data } = await supabaseAdmin
        .from('site_settings')
        .select('key, value')
        .in('key', ['cryptomus_api_key', 'cryptomus_merchant_uuid']);
      
      if (data) {
        for (const item of data) {
          if (item.key === 'cryptomus_api_key' && item.value) apiKey = String(item.value);
          if (item.key === 'cryptomus_merchant_uuid' && item.value) merchantId = String(item.value);
        }
      }
    } catch {
      // ignore
    }
  }

  if (!apiKey || !merchantId) {
    throw new Error('بيانات بوابة Cryptomus (Merchant UUID أو API Key) غير مكتملة في الإعدادات.');
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://upstore.one';

  const payload = {
    amount: params.amount,
    currency: params.currency || 'USD',
    order_id: params.orderId,
    url_return: `${appUrl}/cart`,
    url_success: params.urlReturn || `${appUrl}/checkout/success?session_id=${encodeURIComponent(params.orderId)}`,
    url_callback: params.urlCallback || `${appUrl.startsWith('http://localhost') ? 'https://upstore.one' : appUrl}/api/webhooks/cryptomus`,
    is_payment_multiple: true,
    lifetime: 3600,
    accuracy_payment_percent: 1,
    additional_data: params.additionalData,
  };

  const sign = generateCryptomusSignature(payload, apiKey);

  const res = await fetch('https://api.cryptomus.com/v1/payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'merchant': merchantId,
      'sign': sign,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok || data.state === 1 || !data.result?.url) {
    let msg = data.message || 'Failed to create Cryptomus payment invoice';
    if (msg.toLowerCase().includes('invalid sign')) {
      msg = 'مفتاح API الخاص ببوابة Cryptomus غير متطابق مع معرّف التاجر (Merchant UUID). يرجى التأكد من نسخ Payment API Key من لوحة تحكم Cryptomus.';
    } else if (msg.toLowerCase().includes('api not active')) {
      msg = 'حساب التاجر في Cryptomus قيد المراجعة والموافقة حالياً. يرجى اختيار طريقة دفع أخرى مؤقتاً.';
    } else if (msg.toLowerCase().includes('invalid merchant uuid')) {
      msg = 'معرّف التاجر في Cryptomus غير صحيح، يرجى مراجعة إعدادات التاجر.';
    }
    throw new Error(msg);
  }

  return {
    url: data.result.url,
    uuid: data.result.uuid,
    orderId: data.result.order_id,
    amount: data.result.amount,
    currency: data.result.currency,
  };
}
