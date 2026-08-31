import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/utils/security';
import { getZelenkaBalance } from '@/utils/zelenka';

export async function GET() {
  try {
    const auth = await requireAdminUser();
    if (auth.error) {
      return auth.error;
    }

    const apiKey = process.env.ZELENKA_API_KEY || '';
    if (!apiKey) {
      return NextResponse.json({ error: 'ZELENKA_API_KEY is not configured on the server.' }, { status: 400 });
    }

    const balanceData = await getZelenkaBalance(apiKey);
    if (!balanceData) {
      return NextResponse.json({ error: 'Failed to fetch balance from Zelenka API.' }, { status: 500 });
    }

    return NextResponse.json(balanceData);
  } catch (error: any) {
    console.error('[Admin Zelenka Balance Error]:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
