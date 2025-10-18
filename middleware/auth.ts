import { verifyAuthToken } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const protectedPaths = ['/home', '/dashboard'];
  const { pathname } = req.nextUrl;

  const needsAuth = protectedPaths.some((p) => pathname.startsWith(p));
  if (!needsAuth) return NextResponse.next();

  const token = req.cookies.get('auth_token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    await verifyAuthToken(token);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = {
  matcher: ['/home/:path*', '/dashboard/:path*'],
};