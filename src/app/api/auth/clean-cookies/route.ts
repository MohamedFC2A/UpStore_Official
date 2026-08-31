import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { cleanServerResponseCookies } from '@/utils/auth-cookies';

export async function POST(request: Request) {
  return handleCleanCookies(request);
}

export async function GET(request: Request) {
  return handleCleanCookies(request);
}

async function handleCleanCookies(request: Request) {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  const response = NextResponse.json({
    success: true,
    cleanedAt: new Date().toISOString(),
    message: 'All auth cookies and sessions cleaned successfully',
  });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options as any);
              } catch {}
            });
          },
        },
      }
    );

    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  } catch (err) {
    console.warn('[clean-cookies] Error signing out Supabase instance:', err);
  }

  // Wipes all auth cookies from the response headers
  cleanServerResponseCookies(response, allCookies);

  return response;
}
