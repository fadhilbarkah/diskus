import { SignJWT, jwtVerify } from 'jose';

const jwtSecret = Bun.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required. Set it in your .env file.');
}

// Block startup if using the well-known default secret in production
const DANGEROUS_DEFAULTS = ['change-this-to-a-random-secret-key', 'super-secret-key-for-diskus-dev'];
if (Bun.env.NODE_ENV === 'production' && DANGEROUS_DEFAULTS.includes(jwtSecret)) {
  throw new Error(
    'FATAL: JWT_SECRET is set to a well-known default value. ' +
    'Generate a secure secret with: openssl rand -hex 32'
  );
}

export const JWT_SECRET = new TextEncoder().encode(jwtSecret);

export async function signToken(payload: { userId: string; email: string; role: string; name?: string; tokenVersion?: number }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: string; email: string; role: string; name?: string; tokenVersion?: number };
  } catch (err) {
    return null;
  }
}
