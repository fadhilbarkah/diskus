import { SignJWT, jwtVerify } from 'jose';

const jwtSecret = Bun.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required. Set it in your .env file.');
}
const JWT_SECRET = new TextEncoder().encode(jwtSecret);

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
