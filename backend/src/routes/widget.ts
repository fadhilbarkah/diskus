import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { WidgetController } from '../controllers/widget.controller';
import { authMiddleware, optionalAuthMiddleware, AuthVariables } from '../middlewares/auth';

const widgetRoutes = new Hono<{ Variables: AuthVariables }>();

widgetRoutes.post(
  '/auth/register',
  zValidator('json', z.object({
    email: z.string().email(),
    name: z.string().min(2),
    password: z.string().min(6),
  })),
  WidgetController.register
);

widgetRoutes.post(
  '/auth/login',
  zValidator('json', z.object({
    email: z.string().email(),
    password: z.string(),
  })),
  WidgetController.login
);

widgetRoutes.get('/comments', WidgetController.getComments);

widgetRoutes.post(
  '/comments',
  optionalAuthMiddleware,
  zValidator(
    'json',
    z.object({
      api_key: z.string(),
      thread_key: z.string(),
      authorName: z.string().optional(),
      authorEmail: z.string().email().optional(),
      content: z.string().min(1),
      parentId: z.string().optional().nullable(),
    })
  ),
  WidgetController.postComment
);

widgetRoutes.delete('/comments/:id', authMiddleware, WidgetController.deleteComment);

widgetRoutes.post('/comments/:id/like', WidgetController.likeComment);

widgetRoutes.post('/comments/:id/unlike', WidgetController.unlikeComment);

export default widgetRoutes;
