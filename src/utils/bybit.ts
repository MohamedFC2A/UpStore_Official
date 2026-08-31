import crypto from 'node:crypto';
import axios, { AxiosRequestConfig } from 'axios';
import { createAdminClient } from '@/utils/supabase/admin';

export interface BybitConfig {
  apiKey: string;
  apiSecret: string;
  uid?: string;
  proxyUrl?: string;
  usdtTrc20Address?: string;
  usdtBep20Address?: string;
  usdtTonAddress?: string;
  binancePayId?: string;
  testnet?: boolean;
}

const DEFAULT_BYBIT_BASE_URL = 'https://api.bybit.com';
const TESTNET_BYBIT_BASE_URL = 'https://api-testnet.bybit.com';

/**
 * Fetches Bybit configuration from database (site_settings) with fallback to process.env.
 */
export async function getBybitConfig(): Promise<BybitConfig> {
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
    console.warn('[Bybit Config] Failed to load site_settings, using env fallback:', err);
  }

  return {
    apiKey: dbSettings.bybit_api_key || process.env.BYBIT_API_KEY || '',
    apiSecret: dbSettings.bybit_api_secret || process.env.BYBIT_API_SECRET || '',
    uid: dbSettings.bybit_uid || process.env.BYBIT_UID || '47183921',
    proxyUrl: dbSettings.bybit_proxy_url || process.env.BYBIT_PROXY_URL || process.env.HTTP_PROXY || '',
    usdtTrc20Address: dbSettings.bybit_usdt_trc20 || process.env.BYBIT_USDT_TRC20_ADDRESS || 'TW4z3c4PZ2Gk5YQ7nN9x8vK1mB5qP9R2e1',
    usdtBep20Address: dbSettings.bybit_usdt_bep20 || process.env.BYBIT_USDT_BEP20_ADDRESS || '0x71C836e520023a1B3a0279612301A949826a7C10',
    usdtTonAddress: dbSettings.bybit_usdt_ton || process.env.BYBIT_USDT_TON_ADDRESS || 'EQBvW8m53GoU_jPAIp7LwY8Gj044kX_613p_dC6lQ1_y9Z1X',
    binancePayId: dbSettings.binance_pay_id || process.env.BINANCE_PAY_ID || '764476139',
    testnet: dbSettings.bybit_testnet === true || process.env.BYBIT_TESTNET === 'true',
  };
}

/**
 * Generates Bybit V5 HMAC-SHA256 signature.
 * Format:
 * GET: timestamp + apiKey + recvWindow + queryString
 * POST: timestamp + apiKey + recvWindow + JSONString(body)
 */
export function generateBybitSignature(
  timestamp: number,
  apiKey: string,
  apiSecret: string,
  recvWindow: string,
  paramStr: string
): string {
  const originString = `${timestamp}${apiKey}${recvWindow}${paramStr}`;
  return crypto.createHmac('sha256', apiSecret).update(originString).digest('hex');
}

/**
 * Executes an authenticated or public request to Bybit V5 API.
 * Supports routing through forward proxy (e.g. at 156.204.227.116) to satisfy IP whitelisting on Vercel.
 */
export async function callBybitApi<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  params?: Record<string, any>,
  body?: Record<string, any>,
  customConfig?: Partial<BybitConfig>
): Promise<{ success: boolean; data?: T; retCode?: number; retMsg?: string; error?: string }> {
  try {
    const config = { ...(await getBybitConfig()), ...customConfig };
    const baseUrl = config.testnet ? TESTNET_BYBIT_BASE_URL : DEFAULT_BYBIT_BASE_URL;
    const url = `${baseUrl}${endpoint}`;

    const timestamp = Date.now();
    const recvWindow = '5000';

    let paramStr = '';
    let requestQuery = '';

    if (method === 'GET' && params && Object.keys(params).length > 0) {
      const sortedKeys = Object.keys(params).sort();
      const queryParts = sortedKeys.map((key) => `${key}=${params[key]}`);
      requestQuery = queryParts.join('&');
      paramStr = requestQuery;
    } else if (method === 'POST' && body) {
      paramStr = JSON.stringify(body);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-BAPI-RECV-WINDOW': recvWindow,
    };

    if (config.apiKey && config.apiSecret) {
      const signature = generateBybitSignature(
        timestamp,
        config.apiKey,
        config.apiSecret,
        recvWindow,
        paramStr
      );
      headers['X-BAPI-API-KEY'] = config.apiKey;
      headers['X-BAPI-TIMESTAMP'] = String(timestamp);
      headers['X-BAPI-SIGN'] = signature;
    }

    const axiosOptions: AxiosRequestConfig = {
      method,
      url: requestQuery ? `${url}?${requestQuery}` : url,
      headers,
      data: method === 'POST' ? body : undefined,
      timeout: 15000,
    };

    // If proxy URL is provided (e.g. for Vercel outbound IP 156.204.227.116)
    if (config.proxyUrl) {
      try {
        const parsedProxy = new URL(config.proxyUrl);
        axiosOptions.proxy = {
          protocol: parsedProxy.protocol.replace(':', ''),
          host: parsedProxy.hostname,
          port: Number(parsedProxy.port) || (parsedProxy.protocol === 'https:' ? 443 : 80),
          auth: parsedProxy.username
            ? {
                username: decodeURIComponent(parsedProxy.username),
                password: decodeURIComponent(parsedProxy.password),
              }
            : undefined,
        };
      } catch (proxyErr) {
        console.warn('[Bybit Proxy] Could not parse proxy URL, attempting direct connection:', proxyErr);
      }
    }

    const response = await axios(axiosOptions);
    const resData = response.data;

    if (resData.retCode === 0) {
      return {
        success: true,
        data: resData.result,
        retCode: resData.retCode,
        retMsg: resData.retMsg,
      };
    } else {
      console.warn(`[Bybit API Error] Code ${resData.retCode}: ${resData.retMsg}`);
      return {
        success: false,
        retCode: resData.retCode,
        retMsg: resData.retMsg,
        error: resData.retMsg || `Bybit error code ${resData.retCode}`,
      };
    }
  } catch (err: any) {
    const errorMsg = err.response?.data?.retMsg || err.message || 'Unknown Bybit API error';
    console.error('[Bybit Call Exception]:', errorMsg);
    return {
      success: false,
      error: errorMsg,
      retCode: err.response?.data?.retCode || -1,
    };
  }
}

/**
 * Checks Bybit server time for clock synchronization.
 */
export async function getBybitServerTime(): Promise<{ timeSecond: number; timeNano: string } | null> {
  const res = await callBybitApi('/v5/market/time', 'GET');
  if (res.success && res.data) {
    return res.data;
  }
  return null;
}

/**
 * Retrieves the master or sub-account deposit address for a given coin and chain.
 * (e.g. coin='USDT', chainType='TRX' or 'ETH' or 'BSC' or 'TON')
 */
export async function getBybitDepositAddress(
  coin: string = 'USDT',
  chainType?: string
): Promise<{ address: string; tag?: string; chain: string } | null> {
  const config = await getBybitConfig();

  if (!config.apiKey || !config.apiSecret) {
    // Return configured static address fallback
    if (chainType?.toUpperCase() === 'TRX' || chainType?.toUpperCase() === 'TRC20') {
      return { address: config.usdtTrc20Address || '', chain: 'TRC20' };
    }
    if (chainType?.toUpperCase() === 'BSC' || chainType?.toUpperCase() === 'BEP20') {
      return { address: config.usdtBep20Address || '', chain: 'BEP20' };
    }
    if (chainType?.toUpperCase() === 'TON') {
      return { address: config.usdtTonAddress || '', chain: 'TON' };
    }
    return { address: config.usdtTrc20Address || '', chain: 'TRC20' };
  }

  const params: Record<string, any> = { coin };
  if (chainType) params.chainType = chainType;

  const res = await callBybitApi('/v5/asset/deposit/query-address', 'GET', params);

  if (res.success && res.data?.chains && res.data.chains.length > 0) {
    const targetChain = chainType
      ? res.data.chains.find((c: any) => c.chainType?.toUpperCase() === chainType.toUpperCase() || c.chain?.toUpperCase() === chainType.toUpperCase()) || res.data.chains[0]
      : res.data.chains[0];

    return {
      address: targetChain.addressDeposit || targetChain.address,
      tag: targetChain.tagDeposit || targetChain.tag,
      chain: targetChain.chainType || targetChain.chain,
    };
  }

  // Fallback to static config
  return {
    address: config.usdtTrc20Address || '',
    chain: 'TRC20',
  };
}

/**
 * Queries on-chain deposit records by TXID or Coin to verify customer payment.
 */
export async function verifyBybitDepositRecord(
  txId: string,
  coin: string = 'USDT'
): Promise<{ verified: boolean; amount?: number; status?: number; record?: any }> {
  if (!txId) return { verified: false };

  const cleanTxId = txId.trim();
  const res = await callBybitApi('/v5/asset/deposit/query-record', 'GET', {
    coin,
    txID: cleanTxId,
  });

  if (res.success && res.data?.rows && res.data.rows.length > 0) {
    // Bybit deposit status: 1=Unknown, 2=Confirming, 3=Completed, 4=Failed
    const record = res.data.rows.find((r: any) => r.txID === cleanTxId) || res.data.rows[0];
    const isCompleted = Number(record.status) === 3;

    return {
      verified: isCompleted,
      amount: parseFloat(record.amount || '0'),
      status: Number(record.status),
      record,
    };
  }

  return { verified: false };
}

/**
 * Tests connection to Bybit API, validating API Key, Secret, and IP Whitelist status.
 */
export async function testBybitApiConnection(): Promise<{
  success: boolean;
  message: string;
  serverTime?: string;
  ipStatus?: string;
  uid?: string;
  error?: string;
}> {
  try {
    const config = await getBybitConfig();
    const timeRes = await getBybitServerTime();

    if (!timeRes) {
      return {
        success: false,
        message: 'Could not reach Bybit API servers. Check network or proxy settings.',
        error: 'Network unreachable',
      };
    }

    if (!config.apiKey || !config.apiSecret) {
      return {
        success: true,
        message: 'Bybit public API connection active (Static / P2P Mode active). Add API key for automated on-chain verification.',
        serverTime: new Date(timeRes.timeSecond * 1000).toISOString(),
        ipStatus: 'Public Endpoints Reachable',
      };
    }

    // Call authenticated endpoint to test key & IP whitelist
    const balanceRes = await callBybitApi('/v5/account/wallet-balance', 'GET', { accountType: 'UNIFIED' });

    if (balanceRes.success) {
      return {
        success: true,
        message: 'Bybit API authenticated successfully! IP whitelist and credentials are valid.',
        serverTime: new Date(timeRes.timeSecond * 1000).toISOString(),
        ipStatus: 'Whitelisted & Active',
        uid: config.uid,
      };
    } else {
      const isIpError = balanceRes.retCode === 10003 || balanceRes.retCode === 10004 || balanceRes.retMsg?.toLowerCase().includes('ip');
      return {
        success: false,
        message: isIpError
          ? `Bybit IP restriction error: The server IP is not in your Bybit API Key whitelist. If using IP 156.204.227.116, configure BYBIT_PROXY_URL.`
          : `Bybit authentication failed: [Code ${balanceRes.retCode}] ${balanceRes.retMsg}`,
        error: balanceRes.error,
        ipStatus: isIpError ? 'IP Not Whitelisted' : 'Auth Error',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Error testing Bybit connection',
      error: err.message,
    };
  }
}
