import { NextResponse } from 'next/server';

export async function GET() {
  // This is a honeypot endpoint.
  // Legitimate users and the admin dashboard never call this route.
  // Bots crawling for vulnerable endpoints (like `/api/admin/system-status`, `/api/admin/users`, etc.)
  // will hit this and instantly trigger the Edge Firewall ban in middleware.ts
  
  return NextResponse.json({
    status: 'online',
    version: '1.0.0',
    message: 'System is running normally.'
  });
}

export async function POST() {
  return NextResponse.json({
    status: 'online',
    version: '1.0.0',
    message: 'System is running normally.'
  });
}
