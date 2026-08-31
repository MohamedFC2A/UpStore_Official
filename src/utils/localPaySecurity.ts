import { createAdminClient } from '@/utils/supabase/admin';

export interface ActiveLocalPaymentCheckResult {
  restricted: boolean;
  orderId?: string;
  sessionId?: string;
  amount?: number;
  createdAt?: string;
  methodName?: string;
}

/**
 * Checks if the user currently has an active, unfulfilled Arab Local Payment order
 * that is still within the 60-minute countdown window.
 */
export async function checkActiveLocalPaymentRestriction(userId: string): Promise<ActiveLocalPaymentCheckResult> {
  if (!userId) {
    return { restricted: false };
  }

  try {
    const supabaseAdmin = createAdminClient();
    const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: activeOrders, error } = await supabaseAdmin
      .from('orders')
      .select('id, session_id, amount, created_at, status, product_key, payment_sender')
      .eq('user_id', userId)
      .eq('status', 'pending_manual_payment')
      .eq('product_key', 'PENDING_SUPPORT_DISPATCH')
      .gte('created_at', sixtyMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.warn('[ActiveLocalPaymentCheck] DB query warning:', error);
      return { restricted: false };
    }

    if (activeOrders && activeOrders.length > 0) {
      const active = activeOrders[0];
      return {
        restricted: true,
        orderId: active.id,
        sessionId: active.session_id,
        amount: Number(active.amount || 0),
        createdAt: active.created_at,
        methodName: active.payment_sender,
      };
    }

    return { restricted: false };
  } catch (err) {
    console.error('[ActiveLocalPaymentCheck] Error:', err);
    return { restricted: false };
  }
}
