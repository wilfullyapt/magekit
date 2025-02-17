// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authToken = request.cookies.get('auth_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;
  const hasTokens = authToken || refreshToken;

  // Redirect root to appropriate page
  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(hasTokens ? '/protected/dashboard' : '/auth/login', request.url)
    );
  }

  // Don't handle non-auth/protected routes
  if (!pathname.startsWith('/auth') && !pathname.startsWith('/protected')) {
    return NextResponse.next();
  }

  // Handle auth routes (login/signup)
  if (pathname.startsWith('/auth')) {
    if (hasTokens) {
      return NextResponse.redirect(new URL('/protected/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Handle protected routes
  if (pathname.startsWith('/protected')) {
    if (!hasTokens) {
      const response = NextResponse.redirect(new URL('/auth/login', request.url));
      // Clean up any invalid tokens
      response.cookies.delete('auth_token');
      response.cookies.delete('refresh_token');
      return response;
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/protected/:path*',
    '/auth/:path*',
  ],
};
