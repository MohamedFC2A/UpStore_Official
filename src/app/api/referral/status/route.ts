import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getReferralStatusForUser } from '@/utils/referrals';
import { bootstrapProfileForUser } from '@/utils/supabase/bootstrap';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await bootstrapProfileForUser(supabase, user);
    const status = await getReferralStatusForUser(user.id);
    return NextResponse.json(status);
  } catch (error) {
    console.error('Referral status error:', error);
    return NextResponse.json({ error: 'Failed to load referral status.' }, { status: 500 });
  }
}
