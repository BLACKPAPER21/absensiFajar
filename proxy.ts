import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_key_change_me')

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  const isDashboard = path.startsWith('/dashboard')

  if (isDashboard) {
    const token = request.cookies.get('session_token')?.value

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
      const { payload } = await jwtVerify(token, SECRET_KEY)

      if (payload.role !== 'admin') {
        return NextResponse.redirect(new URL('/attendance', request.url))
      }

      return NextResponse.next()
    } catch {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}