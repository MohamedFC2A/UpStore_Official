import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { cleanServerResponseCookies } from '@/utils/auth-cookies'

async function handleSignOut(request: Request) {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()

  try {
    const supabase = await createClient()
    await supabase.auth.signOut().catch(() => {})
  } catch (error) {
    console.error('Signout error:', error)
  }

  const origin = new URL(request.url).origin
  const response = NextResponse.redirect(`${origin}/auth/login`, {
    status: 302,
  })

  cleanServerResponseCookies(response, allCookies)
  return response
}

export async function POST(request: Request) {
  return handleSignOut(request)
}

export async function GET(request: Request) {
  return handleSignOut(request)
}

