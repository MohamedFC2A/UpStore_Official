import { NextResponse } from 'next/server';
import { sendTelegramNotification } from '@/utils/telegram';
import { requireAdminUser } from '@/utils/security';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const auth = await requireAdminUser();
    if (auth.error) {
      return auth.error;
    }

    // testing HTML with special characters
    const orderSummary = "- Some Product & <Test> (Qty: 1)";
    const telegramMessage = `
<b>New Free Order!</b>
<b>Customer:</b> test@test.com
<b>Total:</b> $0.00
<b>Products:</b>
${orderSummary}
    `.trim();

    await sendTelegramNotification(telegramMessage);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
