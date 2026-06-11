import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { AuthController } from '../controllers/auth.controller';
import { rateLimitMiddleware } from '../middlewares/ratelimit';

const authRoutes = new Hono();
authRoutes.get('/setup-status', AuthController.setupStatus);

authRoutes.post('/register',
  rateLimitMiddleware(5, 60 * 60 * 1000), // Max 5 registrations per IP per hour
  zValidator('json', z.object({ 
    email: z.string().email("Please enter a valid email address").max(255), 
    password: z.string().min(6, "Password must be at least 6 characters").max(128) 
  })),
  AuthController.register
);

authRoutes.post('/login',
  rateLimitMiddleware(10, 15 * 60 * 1000), // Max 10 login attempts per IP per 15 minutes
  zValidator('json', z.object({ 
    email: z.string().email("Please enter a valid email address").max(255), 
    password: z.string().min(1, "Password is required").max(128) 
  })),
  AuthController.login
);

export default authRoutes;
