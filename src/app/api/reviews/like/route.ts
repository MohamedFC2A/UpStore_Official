import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { reviewId, action } = await request.json();

    if (!reviewId || typeof reviewId !== 'string') {
      return NextResponse.json({ error: 'Invalid reviewId' }, { status: 400 });
    }

    const increment = action === 'unlike' ? -1 : 1;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ success: true, count: 0, offline: true });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call RPC for atomic safe update
    const { data: rpcData, error: rpcError } = await supabase.rpc('toggle_review_helpful', {
      p_review_id: reviewId,
      p_increment: increment,
    });

    if (!rpcError && typeof rpcData === 'number') {
      return NextResponse.json({ success: true, count: rpcData });
    }

    // Fallback direct update if RPC fails
    const { data: review } = await supabase
      .from('product_reviews')
      .select('helpful_count')
      .eq('id', reviewId)
      .single();

    const currentCount = review?.helpful_count || 0;
    const nextCount = Math.max(0, currentCount + increment);

    await supabase
      .from('product_reviews')
      .update({ helpful_count: nextCount })
      .eq('id', reviewId);

    return NextResponse.json({ success: true, count: nextCount });
  } catch (err: any) {
    console.error('Error liking review:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
