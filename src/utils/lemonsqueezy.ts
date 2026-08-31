import crypto from 'crypto';

export interface LemonSqueezyCredentials {
  apiKey: string;
  storeId: string;
  variantId?: string;
  webhookSecret?: string;
}

/**
 * Retrieve Lemon Squeezy credentials from site_settings with fallback to process.env
 */
export async function getLemonSqueezyCredentials(): Promise<LemonSqueezyCredentials | null> {
  try {
    const { createAdminClient } = await import('@/utils/supabase/admin');
    const supabase = createAdminClient();
    const { data: settings } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', [
        'lemonsqueezy_api_key',
        'lemonsqueezy_store_id',
        'lemonsqueezy_variant_id',
        'lemonsqueezy_webhook_secret',
      ]);

    const configMap: Record<string, string> = {};
    if (settings) {
      for (const s of settings) {
        if (s.value) configMap[s.key] = String(s.value);
      }
    }

    const apiKey = configMap.lemonsqueezy_api_key || process.env.LEMONSQUEEZY_API_KEY;
    const storeId = configMap.lemonsqueezy_store_id || process.env.LEMONSQUEEZY_STORE_ID || '457660';
    const variantId = configMap.lemonsqueezy_variant_id || process.env.LEMONSQUEEZY_VARIANT_ID;
    const webhookSecret = configMap.lemonsqueezy_webhook_secret || process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

    if (!apiKey) return null;

    return {
      apiKey,
      storeId,
      variantId,
      webhookSecret,
    };
  } catch (err) {
    console.error('Error fetching Lemon Squeezy credentials:', err);
    return null;
  }
}

/**
 * Test Lemon Squeezy API connectivity and retrieve store and variants info
 */
export async function testLemonSqueezyApi(apiKey: string): Promise<{
  success: boolean;
  messageAr: string;
  messageEn: string;
  userName?: string;
  storeName?: string;
  storeId?: string;
  variantsCount?: number;
}> {
  try {
    const userRes = await fetch('https://api.lemonsqueezy.com/v1/users/me', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/vnd.api+json',
      },
    });

    if (!userRes.ok) {
      const err = await userRes.json().catch(() => ({}));
      return {
        success: false,
        messageAr: `فشل الاتصال بـ Lemon Squeezy: ${err.message || userRes.statusText}`,
        messageEn: `Failed to connect to Lemon Squeezy: ${err.message || userRes.statusText}`,
      };
    }

    const userData = await userRes.json();
    const userName = userData.data?.attributes?.name || userData.data?.attributes?.email || 'Lemon Squeezy User';

    const storesRes = await fetch('https://api.lemonsqueezy.com/v1/stores', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/vnd.api+json',
      },
    });

    let storeName = 'Default Store';
    let storeId = '';
    if (storesRes.ok) {
      const storesData = await storesRes.json();
      if (storesData.data && storesData.data.length > 0) {
        storeName = storesData.data[0].attributes?.name || 'upstore';
        storeId = storesData.data[0].id;
      }
    }

    let variantsCount = 0;
    if (storeId) {
      const variantsRes = await fetch(`https://api.lemonsqueezy.com/v1/variants?filter[store_id]=${storeId}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/vnd.api+json',
        },
      });
      if (variantsRes.ok) {
        const variantsData = await variantsRes.json();
        variantsCount = variantsData.data?.length || 0;
      }
    }

    return {
      success: true,
      messageAr: `متصل بنجاح مع Lemon Squeezy باسم (${userName}) - متجر (${storeName})`,
      messageEn: `Connected to Lemon Squeezy as (${userName}) - store (${storeName})`,
      userName,
      storeName,
      storeId,
      variantsCount,
    };
  } catch (err: any) {
    return {
      success: false,
      messageAr: `خطأ في اتصال Lemon Squeezy: ${err.message}`,
      messageEn: `Lemon Squeezy connection error: ${err.message}`,
    };
  }
}

/**
 * Create Lemon Squeezy Hosted Checkout session
 */
export async function createLemonSqueezyCheckout(params: {
  amountCents?: number;
  amountUsd?: number;
  amountEgp?: number;
  amountSar?: number;
  productName: string;
  productDescription?: string;
  sessionId: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  returnUrl: string;
  apiKey: string;
  storeId: string;
  variantId?: string;
}): Promise<{ url: string; checkoutId: string }> {
  let targetVariantId = params.variantId;
  let storeCurrency = 'USD';

  // 1. Fetch store info to detect currency (e.g. EGP vs USD)
  try {
    const storeRes = await fetch(`https://api.lemonsqueezy.com/v1/stores/${params.storeId}`, {
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        Accept: 'application/vnd.api+json',
      },
    });
    if (storeRes.ok) {
      const sData = await storeRes.json();
      storeCurrency = (sData.data?.attributes?.currency || 'USD').toUpperCase();
    }
  } catch {}

  // 2. If no variantId provided, fetch first available variant from the store
  if (!targetVariantId) {
    try {
      const prodRes = await fetch(`https://api.lemonsqueezy.com/v1/products?filter[store_id]=${params.storeId}`, {
        headers: {
          Authorization: `Bearer ${params.apiKey}`,
          Accept: 'application/vnd.api+json',
        },
      });

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        const firstProdId = prodData.data?.[0]?.id;
        if (firstProdId) {
          const variantsRes = await fetch(`https://api.lemonsqueezy.com/v1/variants?filter[product_id]=${firstProdId}`, {
            headers: {
              Authorization: `Bearer ${params.apiKey}`,
              Accept: 'application/vnd.api+json',
            },
          });
          if (variantsRes.ok) {
            const vData = await variantsRes.json();
            if (vData.data && vData.data.length > 0) {
              targetVariantId = vData.data[0].id;
            }
          }
        }
      }
    } catch {}
  }

  // 3. Fallback: query variants endpoint directly
  if (!targetVariantId) {
    try {
      const allVariantsRes = await fetch(`https://api.lemonsqueezy.com/v1/variants`, {
        headers: {
          Authorization: `Bearer ${params.apiKey}`,
          Accept: 'application/vnd.api+json',
        },
      });
      if (allVariantsRes.ok) {
        const allVData = await allVariantsRes.json();
        if (allVData.data && allVData.data.length > 0) {
          targetVariantId = allVData.data[0].id;
        }
      }
    } catch {}
  }

  if (!targetVariantId) {
    throw new Error(
      'لم يتم العثور على أي منتج/Variant في متجرك بـ Lemon Squeezy. يرجى إنشاء منتج واحد على الأقل في لوحة Lemon Squeezy (Store > Products > New Product).'
    );
  }

  const rawUsd = params.amountUsd ?? (params.amountCents ? params.amountCents / 100 : 1);
  let customPriceCents = Math.ceil(rawUsd * 100);

  if (storeCurrency === 'EGP') {
    // If specific EGP amount is provided from cart, use it directly (1 EGP = 100 piastres)
    const egpTotal = params.amountEgp ?? Math.ceil(rawUsd * 53);
    customPriceCents = Math.max(Math.ceil(egpTotal * 100), 100);
  } else if (storeCurrency === 'SAR') {
    const sarTotal = params.amountSar ?? Math.ceil(rawUsd * 4);
    customPriceCents = Math.max(Math.ceil(sarTotal * 100), 100);
  } else {
    // USD or other global currency
    customPriceCents = Math.max(Math.ceil(rawUsd * 100), 50);
  }

  const payload = {
    data: {
      type: 'checkouts',
      attributes: {
        custom_price: customPriceCents,
        product_options: {
          name: params.productName,
          description: params.productDescription || 'UpStore Digital Order',
          receipt_button_text: 'Return to UpStore',
          receipt_link_url: params.returnUrl,
          redirect_url: params.returnUrl,
        },
        checkout_options: {
          embed: false,
          media: true,
          logo: true,
        },
        checkout_data: {
          email: params.userEmail,
          name: params.userName,
          custom: {
            session_id: String(params.sessionId),
            user_id: String(params.userId || 'guest'),
          },
        },
      },
      relationships: {
        store: {
          data: {
            type: 'stores',
            id: String(params.storeId),
          },
        },
        variant: {
          data: {
            type: 'variants',
            id: String(targetVariantId),
          },
        },
      },
    },
  };

  const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.data?.attributes?.url) {
    const errorMsg = data.errors?.[0]?.detail || data.message || `Lemon Squeezy error (${res.status})`;
    throw new Error(errorMsg);
  }

  return {
    url: data.data.attributes.url,
    checkoutId: data.data.id,
  };
}

/**
 * Verify Lemon Squeezy Webhook HMAC-SHA256 signature
 */
export function verifyLemonSqueezyWebhook(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;

  try {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(rawBody).digest('hex');
    const digestBuf = Buffer.from(digest, 'utf8');
    const signatureBuf = Buffer.from(signatureHeader, 'utf8');

    if (digestBuf.length !== signatureBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(digestBuf, signatureBuf);
  } catch (err) {
    console.error('Error verifying Lemon Squeezy webhook signature:', err);
    return false;
  }
}
