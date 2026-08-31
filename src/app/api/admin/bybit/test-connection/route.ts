import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/utils/security';
import { testBybitApiConnection } from '@/utils/bybit';

export async function POST(req: Request) {
  try {
    const auth = await requireAdminUser();
    if (auth.error) {
      return auth.error;
    }

    const result = await testBybitApiConnection();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Admin Bybit Test Connection Error]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error testing Bybit connection' },
      { status: 500 }
    );
  }
}
