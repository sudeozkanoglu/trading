import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'change-me');

export type JwtUserPayload = {
  sub: string;           // user id
  username: string;
  email: string;
  role: "user" | "admin";
};

export async function signAuthToken(payload: JwtUserPayload, expires = process.env.JWT_EXPIRES || '7d') {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(secret);
}

export async function verifyAuthToken(token: string) {
  const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
  return payload as JwtUserPayload & { iat: number; exp: number };
}