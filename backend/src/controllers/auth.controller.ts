import { Context } from 'hono';
import { AuthService } from '../services/auth.service';
import { signToken } from '../utils/jwt';

export class AuthController {
  static async register(c: Context) {
    const { email, password } = (c.req as any).valid('json');
    const existing = await AuthService.getUserByEmail(email);
    if (existing) {
      return c.json({ error: 'Email already registered' }, 400);
    }
    const passwordHash = await AuthService.hashPassword(password);
    const newUser = await AuthService.registerUser(email, passwordHash);
    
    const token = await signToken({ userId: newUser.id, email: newUser.email, role: newUser.role });
    return c.json({ token, user: { id: newUser.id, email: newUser.email, role: newUser.role } });
  }

  static async login(c: Context) {
    const { email, password } = (c.req as any).valid('json');
    const user = await AuthService.getUserByEmail(email);
    
    if (!user || !(await AuthService.verifyPassword(password, user.passwordHash))) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }
    
    const token = await signToken({ userId: user.id, email: user.email, role: user.role });

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
