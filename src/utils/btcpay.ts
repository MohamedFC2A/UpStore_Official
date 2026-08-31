import crypto from 'node:crypto';

/**
 * Gets the configured BTCPay Server Greenfield API base URL.
 * Returns default demo URL if not set.
 */
export function getBtcPayServerUrl(): string {
  const url = process.env.BTCPAY_SERVER_URL || 'https://mainnet.demo.btcpayserver.org';
  return url.replace(/\/+$/, '');
}

/**
 * Gets the configured BTCPay Store ID.
 */
export function getBtcPayStoreId(): string {
  return process.env.BTCPAY_STORE_ID || 'demo-store';
}

/**
 * Gets the configured BTCPay API Key.
 */
export function getBtcPayApiKey(): string {
  return process.env.BTCPAY_API_KEY || '';
}

/**
 * Gets the configured BTCPay Webhook Secret.
 */
export function getBtcPayWebhookSecret(): string {
  return process.env.BTCPAY_WEBHOOK_SECRET || '';
}

interface CreateInvoiceParams {
  amount: number;
  currency: string;
  orderId?: string;
  buyerEmail?: string;
  redirectUrl: string;
  cancelUrl: string;
  metadata?: Record<string, any>;
}

/**
 * Creates an invoice in BTCPay Server.
 * If API Key is missing, returns a mock local sandbox payment URL for easy local testing.
 */
export async function createBtcPayInvoice(params: CreateInvoiceParams) {
  const apiKey = getBtcPayApiKey();
  const storeId = getBtcPayStoreId();
  const serverUrl = getBtcPayServerUrl();

  if (!apiKey) {
    console.warn('[BTCPay Server] BTCPAY_API_KEY is not configured. Falling back to Mock Payment flow.');
    // Generate a mock invoice ID starting with btc_
    const mockInvoiceId = `btc_${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
    const mockCheckoutLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/success?session_id=${mockInvoiceId}`;
    return {
      id: mockInvoiceId,
      checkoutLink: mockCheckoutLink,
      mock: true
    };
  }

  const response = await fetch(`${serverUrl}/api/v1/stores/${storeId}/invoices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `token ${apiKey}`
    },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency,
      metadata: {
        orderId: params.orderId,
        buyerEmail: params.buyerEmail,
        ...params.metadata
      },
      checkout: {
        redirectURL: params.redirectUrl,
        cancelURL: params.cancelUrl
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`BTCPay Server invoice creation failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    checkoutLink: data.checkoutLink,
    mock: false
  };
}

/**
 * Retrieves the invoice details from BTCPay Server.
 */
export async function getBtcPayInvoice(invoiceId: string) {
  // If it's a mock invoice, return standard success payload
  if (invoiceId.startsWith('btc_')) {
    return {
      id: invoiceId,
      status: 'Settled',
      mock: true
    };
  }

  const apiKey = getBtcPayApiKey();
  const storeId = getBtcPayStoreId();
  const serverUrl = getBtcPayServerUrl();

  if (!apiKey) {
    throw new Error('BTCPay Server is not configured (missing API Key).');
  }

  const response = await fetch(`${serverUrl}/api/v1/stores/${storeId}/invoices/${invoiceId}`, {
    method: 'GET',
    headers: {
      'Authorization': `token ${apiKey}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch BTCPay invoice ${invoiceId}: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Verifies the BTCPay Webhook Signature.
 */
export function verifyBtcPayWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = getBtcPayWebhookSecret();
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[BTCPay Webhook] BTCPAY_WEBHOOK_SECRET is not configured in production.');
      return false;
    }
    console.warn('[BTCPay Webhook] BTCPAY_WEBHOOK_SECRET is not set. Webhook signature verification is skipped in development.');
    return true;
  }

  if (!signatureHeader) {
    return false;
  }

  try {
    // Header format is: sha256=<hex_hmac>
    const parts = signatureHeader.split('=');
    const signature = (parts[1] || parts[0]).trim();

    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(rawBody).digest('hex');

    const digestBuf = Buffer.from(digest.toLowerCase(), 'utf8');
    const signatureBuf = Buffer.from(signature.toLowerCase(), 'utf8');

    if (digestBuf.length !== signatureBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(digestBuf, signatureBuf);
  } catch (err) {
    console.error('[BTCPay Webhook] Signature verification error:', err);
    return false;
  }
}
