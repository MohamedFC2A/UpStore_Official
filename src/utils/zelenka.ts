import axios from 'axios';

/**
 * Extracts credentials or session data from LZT Market item response.
 * Handles:
 * 1. Standard login:password
 * 2. Cookies (e.g. TikTok cookies)
 * 3. Session tokens (e.g. Discord tokens)
 * 4. General logins / tokens
 */
function extractCredentials(item: any): string | null {
  if (!item) return null;

  // Build a structured object representing all potential fields
  const accountData: any = {
    item_id: item.item_id || item.id || '',
    login: item.login || item.email || item.username || '',
    password: item.password || '',
    phone: item.phone || item.telegram_phone || '',
    auth_key: item.auth_key || item.telegram_auth_key || item.telegram_auth_key_hex || '',
    dc_id: item.dc || item.dc_id || item.telegram_dc_id || '',
    user_id: item.user_id || item.telegram_user_id || item.telegram_id || '',
    cookies: item.cookies || item.tiktok_cookies || '',
    token: item.token || item.discord_token || '',
  };

  // Find fallback session/cookie/token fields if not populated
  for (const [key, value] of Object.entries(item)) {
    if (typeof value === 'string' && value.trim().length > 0) {
      const lowerKey = key.toLowerCase();
      if (!accountData.cookies && (lowerKey.includes('cookie') || lowerKey.includes('session'))) {
        accountData.cookies = value.trim();
      }
      if (!accountData.token && lowerKey.includes('token')) {
        accountData.token = value.trim();
      }
    }
  }

  console.log('[Zelenka API] Extracted account structure:', {
    ...accountData,
    auth_key: accountData.auth_key ? '***' + accountData.auth_key.slice(-8) : '',
    cookies: accountData.cookies ? '***' : '',
    token: accountData.token ? '***' : '',
  });

  return JSON.stringify({
    type: 'zelenka_account',
    data: accountData
  });
}


/**
 * Fetches account credentials (email:password or cookies/token) from Zelenka Guru / Lolzteam Market API.
 * Supports:
 * 1. Fetching a specific purchased item by ID.
 * 2. Purchasing the cheapest item from a specific search/category query.
 * 
 * API reference: https://lzt-market.readme.io/
 */
export async function getZelenkaAccount(apiKey: string, queryOrId: string): Promise<string | null> {
  if (!apiKey || !queryOrId) {
    console.error('Zelenka API Key or Query is missing.');
    return null;
  }

  const cleanQuery = queryOrId.trim();

  // If the query is just a number (e.g. Item ID) or a link ending with a number (e.g. market/123456)
  const isItemId = /^\d+$/.test(cleanQuery) || (cleanQuery.includes('market/') && !cleanQuery.includes('?'));
  const itemId = isItemId ? cleanQuery.match(/\d+/)?.[0] : null;

  try {
    const apiHost = 'https://api.lzt.market';

    if (itemId) {
      console.log(`[Zelenka API] Fetching details for purchased item ID: ${itemId}`);
      // LZT Market API to get purchased item info
      const res = await axios.get(`${apiHost}/${itemId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (res.data && res.data.item) {
        return extractCredentials(res.data.item);
      }
      return null;
    } else {
      // It's a query or search URL. We will search for matching items, purchase the cheapest one.
      // E.g., queryOrId could be: "https://lzt.market/fortnite/?price_to=5" or "category=fortnite"
      console.log(`[Zelenka API] Searching items with query: ${cleanQuery}`);
      
      let searchPath = '/';
      // Simple parsing of URL to API path
      if (cleanQuery.startsWith('http')) {
        try {
          const url = new URL(cleanQuery);
          searchPath = url.pathname + url.search;
        } catch (e) {
          searchPath = '/';
        }
      } else {
        searchPath = `/${cleanQuery}`;
      }

      // 1. Search for available accounts
      const searchRes = await axios.get(`${apiHost}${searchPath}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      const items = searchRes.data?.items || [];
      if (items.length === 0) {
        console.warn('[Zelenka API] No accounts found matching search query.');
        return null;
      }

      // Take the first (cheapest / top) item
      const targetItem = items[0];
      const targetItemId = targetItem.item_id;
      const price = targetItem.price;

      console.log(`[Zelenka API] Found item ID ${targetItemId} for price ${price}. Reserving...`);

      // 2. Reserve the item
      const reserveRes = await axios.post(`${apiHost}/${targetItemId}/reserve`, {}, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (!reserveRes.data || reserveRes.data.error) {
        throw new Error(reserveRes.data?.error || 'Failed to reserve account');
      }

      console.log(`[Zelenka API] Item reserved. Confirming purchase...`);

      // 3. Confirm purchase
      const buyRes = await axios.post(`${apiHost}/${targetItemId}/confirm-buy`, {}, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (buyRes.data && buyRes.data.item) {
        console.log(`[Zelenka API] Purchase confirmed for item ID ${targetItemId}`);
        return extractCredentials(buyRes.data.item);
      }

      return null;
    }
  } catch (error: any) {
    console.error('[Zelenka API Error]:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Fetches the active balance from LZT Market API.
 */
export async function getZelenkaBalance(apiKey: string): Promise<{ balance: number; currency: string } | null> {
  if (!apiKey) return null;
  try {
    const res = await axios.get('https://api.lzt.market/me', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });
    if (res.data && res.data.user) {
      const user = res.data.user;
      const rawBalance = Number(user.balance || 0);
      const balanceCurrency = (user.currency || 'rub').toLowerCase();

      // Fetch exchange rate USD -> RUB
      let rubToUsdRate = 0.011; // Default fallback rate (approx. 90 RUB = 1 USD)
      try {
        const rateRes = await axios.get('https://open.er-api.com/v6/latest/USD', { timeout: 3000 });
        if (rateRes.data && rateRes.data.rates && rateRes.data.rates.RUB) {
          rubToUsdRate = 1 / rateRes.data.rates.RUB;
        }
      } catch (err) {
        console.warn('[Zelenka Balance] Failed to fetch live exchange rate, using fallback:', err);
      }

      let usdBalance = 0;
      if (balanceCurrency === 'usd') {
        usdBalance = rawBalance;
      } else {
        usdBalance = Number((rawBalance * rubToUsdRate).toFixed(2));
      }

      return {
        balance: usdBalance,
        currency: 'USD'
      };
    }
    return null;
  } catch (error: any) {
    console.error('[Zelenka API Balance Error]:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Fetches the actual number of available accounts for a given search query or product link on LZT Market.
 */
export async function getZelenkaStock(apiKey: string, query: string): Promise<number> {
  if (!apiKey || !query) return 0;
  const cleanQuery = query.trim();

  const isItemId = /^\d+$/.test(cleanQuery) || (cleanQuery.includes('market/') && !cleanQuery.includes('?'));
  if (isItemId) {
    return 1;
  }

  try {
    const apiHost = 'https://api.lzt.market';
    let searchPath = '/';
    if (cleanQuery.startsWith('http')) {
      try {
        const url = new URL(cleanQuery);
        searchPath = url.pathname + url.search;
      } catch (e) {
        searchPath = '/';
      }
    } else {
      searchPath = `/${cleanQuery}`;
    }

    const searchRes = await axios.get(`${apiHost}${searchPath}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    const total = searchRes.data?.totalItems ?? searchRes.data?.total ?? searchRes.data?.items?.length ?? 0;
    return total;
  } catch (error: any) {
    console.error('[Zelenka Stock Sync Error]:', error.response?.data || error.message);
    return 0;
  }
}
