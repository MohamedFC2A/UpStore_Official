import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/utils/supabase/admin';

const BYBIT_API_KEY = process.env.BYBIT_API_KEY || 'YSxK9ZT6tiYMUE8Fa7';
const BYBIT_API_SECRET = process.env.BYBIT_API_SECRET || 'Ckg1gXUjmmjbAO817O9o188b4RLTATKLX7cO';
const BYBIT_BASE_URL = 'https://api.bybit.com';

function signBybit(timestamp: string, paramsStr: string = '') {
  const recvWindow = '5000';
  const raw = `${timestamp}${BYBIT_API_KEY}${recvWindow}${paramsStr}`;
  return crypto.createHmac('sha256', BYBIT_API_SECRET).update(raw).digest('hex');
}

async function queryBybit(endpoint: string, params: Record<string, string> = {}) {
  try {
    const timestamp = Date.now().toString();
    const queryString = Object.keys(params).length > 0 ? new URLSearchParams(params).toString() : '';
    const fullPath = queryString ? `${endpoint}?${queryString}` : endpoint;
    const signature = signBybit(timestamp, queryString);

    const res = await fetch(`${BYBIT_BASE_URL}${fullPath}`, {
      method: 'GET',
      headers: {
        'X-BAPI-API-KEY': BYBIT_API_KEY,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': '5000',
        'X-BAPI-SIGN': signature,
      },
      cache: 'no-store',
    });

    return await res.json();
  } catch (err: any) {
    console.error('[Bybit API Route Error]:', err.message);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const amountStr = searchParams.get('amount') || '0';
  const orderRef = searchParams.get('order') || '';
  const expectedAmount = parseFloat(amountStr);

  if (!expectedAmount || expectedAmount <= 0) {
    return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 });
  }

  try {
    const now = Date.now();
    const THIRTY_MIN_MS = 30 * 60 * 1000;

    // 1. Check Internal Transfers
    const transfers = await queryBybit('/v5/asset/transfer/query-inter-transfer-list', {
      coin: 'USDT',
      limit: '10',
    });

    if (transfers?.result?.list) {
      for (const t of transfers.result.list) {
        const transferTime = parseInt(t.timestamp, 10);
        const amountNum = parseFloat(t.amount);
        if (
          t.status === 'SUCCESS' &&
          Math.abs(amountNum - expectedAmount) < 0.02 &&
          (now - transferTime) < THIRTY_MIN_MS
        ) {
          // If orderRef given, update database
          if (orderRef) {
            try {
              const supabase = createAdminClient();
              await supabase.from('orders').update({
                status: 'completed',
                product_key: `AUTO_BYBIT_${t.transferId}`,
              }).ilike('session_id', `%${orderRef}%`);
            } catch {}
          }

          return NextResponse.json({
            success: true,
            status: 'completed',
            type: 'internal_transfer',
            transferId: t.transferId,
            amount: amountNum,
            coin: t.coin,
          });
        }
      }
    }

    // 2. Check On-Chain Deposits
    const deposits = await queryBybit('/v5/asset/deposit/query-record', {
      coin: 'USDT',
      limit: '10',
    });

    if (deposits?.result?.rows) {
      for (const d of deposits.result.rows) {
        const depTime = parseInt(d.successAt || d.depositTime, 10);
        const amountNum = parseFloat(d.amount);
        if (
          (d.status === 3 || d.status === 1) &&
          Math.abs(amountNum - expectedAmount) < 0.02 &&
          (now - depTime) < THIRTY_MIN_MS
        ) {
          if (orderRef) {
            try {
              const supabase = createAdminClient();
              await supabase.from('orders').update({
                status: 'completed',
                product_key: `AUTO_BYBIT_${d.txID}`,
              }).ilike('session_id', `%${orderRef}%`);
            } catch {}
          }

          return NextResponse.json({
            success: true,
            status: 'completed',
            type: 'on_chain_deposit',
            txID: d.txID,
            amount: amountNum,
            coin: d.coin,
          });
        }
      }
    }

    return NextResponse.json({
      success: false,
      status: 'pending',
      message: 'Payment not yet detected. Please allow 15-30 seconds after transfer.',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
