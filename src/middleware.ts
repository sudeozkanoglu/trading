import { verifyAuthToken } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const protectedPaths = ['/home', '/dashboard', "/admin"];
  const { pathname } = req.nextUrl;

  const needsAuth = protectedPaths.some((p) => pathname.startsWith(p));
  if (!needsAuth) return NextResponse.next();

  const token = req.cookies.get('auth_token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  try {
    const decoded = await verifyAuthToken(token);
    if (pathname.startsWith("/admin")) {
      if (decoded.role === "user") {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/', req.url));
  }
}

export const config = {
  matcher: ['/home/:path*', '/dashboard/:path*', '/admin/:path*'],
};