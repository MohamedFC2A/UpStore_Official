import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/utils/security';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const auth = await requireAdminUser();
    if (auth.error || !auth.user) {
      return auth.error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, message, type = 'info', audience = 'all', userId } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    if (audience === 'single') {
      if (!userId) {
        return NextResponse.json({ error: 'userId is required for single audience' }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          message,
          type,
          is_read: false,
        })
        .select()
        .single();

      if (error) {
        console.error('[Admin Notification Single Error]:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, notification: data });
    }

    // Broadcast to all users
    const { data: profiles, error: profError } = await supabaseAdmin
      .from('profiles')
      .select('id');

    if (profError) {
      console.error('[Admin Notification All Fetch Profiles Error]:', profError);
      return NextResponse.json({ error: profError.message }, { status: 500 });
    }

    if (profiles && profiles.length > 0) {
      const records = profiles.map((p: any) => ({
        user_id: p.id,
        title,
        message,
        type,
        is_read: false,
      }));

      const { error: insertErr } = await supabaseAdmin
        .from('notifications')
        .insert(records);

      if (insertErr) {
        console.error('[Admin Notification Broadcast Error]:', insertErr);
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, count: records.length });
    }

    return NextResponse.json({ success: true, count: 0 });
  } catch (err: any) {
    console.error('[Admin Notifications Route Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
