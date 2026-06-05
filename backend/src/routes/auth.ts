import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { AuthController } from '../controllers/auth.controller';

const authRoutes = new Hono();

authRoutes.post('/register', zValidator('json', z.object({ email: z.string().email(), password: z.string().min(6) })), AuthController.register);
authRoutes.post('/login', zValidator('json', z.object({ email: z.string().email(), password: z.string() })), AuthController.login);

export default authRoutes;
