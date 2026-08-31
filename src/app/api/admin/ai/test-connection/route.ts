import { NextResponse } from 'next/server';
import { requireAdminUser, enforceSameOriginRequest } from '@/utils/security';
import { generateChatCompletion } from '@/utils/ai';

export async function POST(req: Request) {
  try {
    const originError = await enforceSameOriginRequest(req);
    if (originError) {
      return originError;
    }

    const auth = await requireAdminUser();
    if (auth.error) {
      return auth.error;
    }

    const body = await req.json().catch(() => ({}));
    const apiKey = body.apiKey;
    const model = body.model;

    const startTime = Date.now();

    const result = await generateChatCompletion(
      [
        { role: 'system', content: 'Respond with exactly "PONG: UpStore DeepSeek AI Connected" and nothing else.' },
        { role: 'user', content: 'PING' },
      ],
      {
        apiKey,
        model,
        timeoutMs: 25000,
        temperature: 0.1,
      }
    );

    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'DeepSeek AI Connection Successful!',
      modelUsed: result.modelUsed,
      response: result.text,
      latencyMs,
    });
  } catch (error: any) {
    console.error('[DeepSeek Test Connection Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to connect to DeepSeek AI.',
      },
      { status: 500 }
    );
  }
}
