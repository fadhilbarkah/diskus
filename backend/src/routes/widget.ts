import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { WidgetController } from '../controllers/widget.controller';
import { authMiddleware, optionalAuthMiddleware, AuthVariables } from '../middlewares/auth';
import { rateLimitMiddleware } from '../middlewares/ratelimit';

const widgetRoutes = new Hono<{ Variables: AuthVariables }>();

widgetRoutes.post(
  '/auth/register',
  rateLimitMiddleware(5, 60 * 60 * 1000), // Max 5 registrations per IP per hour
  zValidator('json', z.object({
    email: z.string().email().max(255),
    name: z.string().min(2).max(100),
    password: z.string().min(6).max(128),
    _diskus_trap: z.string().max(500).optional(),
  })),
  WidgetController.register
);

widgetRoutes.post(
  '/auth/login',
  rateLimitMiddleware(10, 15 * 60 * 1000), // Max 10 login attempts per IP per 15 minutes
  zValidator('json', z.object({
    email: z.string().email().max(255),
    password: z.string().max(128),
  })),
  WidgetController.login
);

widgetRoutes.get('/comments', WidgetController.getComments);

widgetRoutes.post(
  '/comments',
  rateLimitMiddleware(5, 60 * 1000), // Max 5 comments per IP per minute
  optionalAuthMiddleware,
  zValidator(
    'json',
    z.object({
      api_key: z.string().max(100),
      thread_key: z.string().max(500),
      authorName: z.string().max(100).optional(),
      authorEmail: z.string().email().max(255).optional(),
      content: z.string().min(1).max(10000),
      parentId: z.string().max(100).optional().nullable(),
      _diskus_trap: z.string().max(500).optional(),
    })
  ),
  WidgetController.postComment
);

widgetRoutes.delete('/comments/:id', authMiddleware, WidgetController.deleteComment);

widgetRoutes.patch(
  '/comments/:id/pin', 
  authMiddleware, 
  zValidator('json', z.object({ isPinned: z.boolean() })),
  WidgetController.togglePinComment
);

widgetRoutes.post('/comments/:id/like', rateLimitMiddleware(30, 60 * 1000), WidgetController.likeComment);

widgetRoutes.post('/comments/:id/unlike', rateLimitMiddleware(30, 60 * 1000), WidgetController.unlikeComment);

export default widgetRoutes;
