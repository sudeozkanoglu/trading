import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ success: true });
  res.cookies.set('auth_token', '', {
    httpOnly: true,
    path: '/',
    expires: new Date(0),
  });
  return res;
}