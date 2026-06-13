import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, AuthVariables } from '../middlewares/auth';
import { AdminController } from '../controllers/admin.controller';

const adminRoutes = new Hono<{ Variables: AuthVariables }>();

adminRoutes.use('*', authMiddleware);

adminRoutes.get('/sites', AdminController.getSites);
adminRoutes.post('/sites', zValidator('json', z.object({ domain: z.string().min(3).max(255) })), AdminController.createSite);
adminRoutes.delete('/sites/:id', AdminController.deleteSite);
adminRoutes.patch('/sites/:id', zValidator('json', z.object({ 
  requireLogin: z.boolean().optional(), 
  enableEmail: z.boolean().optional(),
  commentsLimit: z.number().min(1).max(100).optional(),
  requireModeration: z.boolean().optional()
})), AdminController.updateSite);

adminRoutes.get('/analytics/summary', AdminController.getAnalyticsSummary);
adminRoutes.get('/comments', AdminController.getComments);

adminRoutes.patch('/comments/bulk', zValidator('json', z.object({ 
  ids: z.array(z.string().max(100)).max(100), 
  status: z.enum(['approved', 'pending', 'spam', 'trash']) 
})), AdminController.updateCommentsBulk);
adminRoutes.patch('/comments/:id/pin', zValidator('json', z.object({ isPinned: z.boolean() })), AdminController.togglePinComment);
adminRoutes.delete('/comments/bulk', zValidator('json', z.object({ 
  ids: z.array(z.string().max(100)).max(100) 
})), AdminController.deleteCommentsBulk);

adminRoutes.get('/account', AdminController.getAccount);
adminRoutes.put('/account', zValidator('json', z.object({ 
  name: z.string().max(100).optional(), 
  email: z.string().email().max(255).optional(), 
  currentPassword: z.string().max(128).optional(), 
  newPassword: z.string().min(6).max(128).optional(), 
  resendApiKey: z.string().max(500).optional(), 
  resendSenderEmail: z.string().email().max(255).optional().or(z.literal('')) 
})), AdminController.updateAccount);

adminRoutes.get('/export/:siteId', AdminController.exportData);
adminRoutes.post('/import/:siteId', zValidator('json', z.object({ 
  threads: z.array(z.object({
    id: z.string().max(100),
    threadKey: z.string().max(500),
    title: z.string().max(500),
    createdAt: z.string(),
  })).max(1000).optional(), 
  comments: z.array(z.object({
    id: z.string().max(100),
    threadId: z.string().max(100),
    parentId: z.string().max(100).nullable().optional(),
    authorName: z.string().max(100),
    authorEmail: z.string().max(255),
    content: z.string().max(10000),
    htmlContent: z.string().max(50000),
    status: z.enum(['pending', 'approved', 'spam', 'trash']).optional(),
    likesCount: z.number().optional(),
    createdAt: z.string(),
  })).max(10000).optional() 
})), AdminController.importData);

adminRoutes.post('/import-disqus/:siteId', AdminController.importDisqusData);


adminRoutes.get('/users', AdminController.getWidgetUsers);
adminRoutes.delete('/users/:id', AdminController.deleteWidgetUser);

export default adminRoutes;
