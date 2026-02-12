import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_key_change_me');

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Paths that require authentication
  const isDashboard = path.startsWith('/dashboard');

  if (isDashboard) {
    const token = request.cookies.get('session_token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      // Verify JWT
      const { payload } = await jwtVerify(token, SECRET_KEY);

      // Enforce Admin Role for Dashboard
      if (payload.role !== 'admin') {
        return NextResponse.redirect(new URL('/attendance', request.url));
      }

      return NextResponse.next();
    } catch (err) {
      // If token invalid/expired, redirect to login
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Allow other routes (public, login, api, etc)
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
