import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/utils/security';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

// GET: Fetch user's notifications + verified unread count
export async function GET() {
  try {
    const auth = await requireAuthenticatedUser();
    if (auth.error || !auth.user) {
      return NextResponse.json({ notifications: [], unreadCount: 0 }, { status: 200 });
    }

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Notifications GET error]:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const notifications = data || [];
    const unreadCount = notifications.filter((n: any) => !n.is_read).length;

    return NextResponse.json({
      notifications,
      unreadCount
    });
  } catch (err: any) {
    console.error('[Notifications Route Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// POST: Mark notification(s) as read
export async function POST(req: Request) {
  try {
    const auth = await requireAuthenticatedUser();
    if (auth.error || !auth.user) {
      return auth.error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { id, all } = body;

    const supabaseAdmin = createAdminClient();

    if (all) {
      // Mark all notifications as read for this user
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', auth.user.id);

      if (error) {
        console.error('[Notifications Mark All Read Error]:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, all: true });
    }

    if (id) {
      // Mark single notification as read
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', auth.user.id);

      if (error) {
        console.error('[Notifications Mark Read Error]:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, id });
    }

    return NextResponse.json({ error: 'Missing parameters (id or all)' }, { status: 400 });
  } catch (err: any) {
    console.error('[Notifications POST Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
