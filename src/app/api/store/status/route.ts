import { NextResponse } from 'next/server';
import { getStoreMaintenanceStatus, setStoreMaintenanceStatus } from '@/utils/telegramSwitchBot';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const { isMaintenance, updatedAt } = await getStoreMaintenanceStatus();
    return NextResponse.json(
      {
        ok: true,
        maintenance_mode: isMaintenance,
        updated_at: updatedAt,
        timestamp: Date.now(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body.maintenance_mode !== 'boolean') {
      return NextResponse.json({ ok: false, error: 'maintenance_mode boolean required' }, { status: 400 });
    }

    const result = await setStoreMaintenanceStatus(body.maintenance_mode);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
