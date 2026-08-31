import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/utils/security';

export async function GET() {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const auth = await requireAdminUser();
    if (auth.error) {
      return auth.error;
    }

    return NextResponse.json({ message: 'Admin-only development test route.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
