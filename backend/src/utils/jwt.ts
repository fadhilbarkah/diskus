import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(Bun.env.JWT_SECRET || 'super-secret-key-for-diskus-dev');

export async function signToken(payload: { userId: string; email: string; role: string; name?: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: string; email: string; role: string; name?: string };
  } catch (err) {
    return null;
  }
}
