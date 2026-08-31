import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/utils/security';
import axios from 'axios';

export async function GET(request: Request) {
  try {
    const auth = await requireAdminUser();
    if (auth.error) {
      return auth.error;
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.trim() || '';

    if (!query) {
      return NextResponse.json({ error: 'Missing query parameter.' }, { status: 400 });
    }

    const apiKey = process.env.ZELENKA_API_KEY || '';
    if (!apiKey) {
      return NextResponse.json({ error: 'ZELENKA_API_KEY is not configured on the server.' }, { status: 400 });
    }

    // Determine if query is an item ID
    const isItemId = /^\d+$/.test(query) || (query.includes('market/') && !query.includes('?'));
    const itemId = isItemId ? query.match(/\d+/)?.[0] : null;

    // Fetch exchange rate USD -> RUB
    let rubToUsdRate = 0.011; // Fallback rate
    try {
      const rateRes = await axios.get('https://open.er-api.com/v6/latest/USD', { timeout: 3000 });
      if (rateRes.data && rateRes.data.rates && rateRes.data.rates.RUB) {
        rubToUsdRate = 1 / rateRes.data.rates.RUB;
      }
    } catch (err) {
      console.warn('[Zelenka Product API] Failed to fetch exchange rate, using fallback:', err);
    }

    const apiHost = 'https://api.lzt.market';

    if (itemId) {
      // Fetch details of single item
      const res = await axios.get(`${apiHost}/${itemId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (res.data && res.data.item) {
        const item = res.data.item;
        const rawPrice = Number(item.price || 0);
        const itemCurrency = (item.currency || 'rub').toLowerCase();
        
        let priceRub = 0;
        let priceUsd = 0;

        if (itemCurrency === 'usd') {
          priceUsd = rawPrice;
          priceRub = Number((priceUsd / rubToUsdRate).toFixed(2));
        } else {
          priceRub = rawPrice;
          priceUsd = Number((priceRub * rubToUsdRate).toFixed(2));
        }

        const active = item.active || item.item_state === 'active';

        return NextResponse.json({
          type: 'single',
          id: itemId,
          title: item.title || `Zelenka Item #${itemId}`,
          priceRub,
          priceUsd,
          stock: active ? 1 : 0,
          category: item.category_name || '',
          details: {
            login: item.login || '',
            description: item.description || '',
            seller: item.user_name || '',
            views: item.view_count || 0
          },
          raw: item
        });
      }

      return NextResponse.json({ error: 'Item not found on LZT Market.' }, { status: 404 });
    } else {
      // Parse search link or query
      let searchPath = '/';
      if (query.startsWith('http')) {
        try {
          const url = new URL(query);
          searchPath = url.pathname + url.search;
        } catch (e) {
          searchPath = '/';
        }
      } else {
        searchPath = `/${query}`;
      }

      const res = await axios.get(`${apiHost}${searchPath}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      const items = res.data?.items || [];
      const total = res.data?.totalItems ?? res.data?.total ?? items.length;
      
      let priceRub = 0;
      let priceUsd = 0;
      let title = `Market Search: "${query}"`;
      let firstItemRaw = null;

      if (items.length > 0) {
        const cheapest = items[0];
        firstItemRaw = cheapest;
        const rawPrice = Number(cheapest.price || 0);
        const cheapestCurrency = (cheapest.currency || 'rub').toLowerCase();

        if (cheapestCurrency === 'usd') {
          priceUsd = rawPrice;
          priceRub = Number((priceUsd / rubToUsdRate).toFixed(2));
        } else {
          priceRub = rawPrice;
          priceUsd = Number((priceRub * rubToUsdRate).toFixed(2));
        }

        title = cheapest.category_name 
          ? `Zelenka Market: ${cheapest.category_name} Listings` 
          : `Zelenka Market: "${query}"`;
      }

      return NextResponse.json({
        type: 'search',
        query,
        title,
        priceRub,
        priceUsd,
        stock: total,
        itemsCount: items.length,
        raw: firstItemRaw
      });
    }

  } catch (error: any) {
    console.error('[Admin Zelenka Product Preview Error]:', error.response?.data || error.message);
    return NextResponse.json({ 
      error: 'Failed to fetch product from Zelenka API.',
      details: error.response?.data || error.message 
    }, { status: 500 });
  }
}
