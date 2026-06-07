import { Context } from 'hono';
import { AuthService } from '../services/auth.service';
import { signToken } from '../utils/jwt';

export class AuthController {
  static async register(c: Context) {
    // Check if registration is allowed
    const allowRegistration = Bun.env.ALLOW_REGISTRATION === 'true';
    const userCount = await AuthService.getUserCount();

    // Allow first user to register (initial setup), block after that unless ALLOW_REGISTRATION=true
    if (userCount > 0 && !allowRegistration) {
      return c.json({ error: 'Registration is currently disabled' }, 403);
    }

    const { email, password } = (c.req as any).valid('json');
    const existing = await AuthService.getUserByEmail(email);
    if (existing) {
      // Generic error message to prevent email enumeration
      return c.json({ error: 'Registration failed. Please try again or contact support.' }, 400);
    }
    const passwordHash = await AuthService.hashPassword(password);
    const newUser = await AuthService.registerUser(email, passwordHash);
    
    const token = await signToken({ userId: newUser.id, email: newUser.email, role: newUser.role, tokenVersion: newUser.tokenVersion });
    return c.json({ token, user: { id: newUser.id, email: newUser.email, role: newUser.role } });
  }

  static async login(c: Context) {
    const { email, password } = (c.req as any).valid('json');
    const user = await AuthService.getUserByEmail(email);
    
    if (!user || !(await AuthService.verifyPassword(password, user.passwordHash))) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }
    
    const token = await signToken({ userId: user.id, email: user.email, role: user.role, tokenVersion: user.tokenVersion });

    return c.json({
      token,
      user: {
        id: user.id,
        name: user.name || '',
        email: user.email,
        role: user.role,
      },
    });
  }
}
