import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, AuthVariables } from '../middlewares/auth';
import { AdminController } from '../controllers/admin.controller';

const adminRoutes = new Hono<{ Variables: AuthVariables }>();

adminRoutes.use('*', authMiddleware);

adminRoutes.get('/sites', AdminController.getSites);
adminRoutes.post('/sites', zValidator('json', z.object({ domain: z.string().min(3) })), AdminController.createSite);
adminRoutes.delete('/sites/:id', AdminController.deleteSite);
adminRoutes.patch('/sites/:id', zValidator('json', z.object({ 
  requireLogin: z.boolean().optional(), 
  enableEmail: z.boolean().optional(),
  commentsLimit: z.number().optional(),
  requireModeration: z.boolean().optional()
})), AdminController.updateSite);

adminRoutes.get('/analytics/summary', AdminController.getAnalyticsSummary);
adminRoutes.get('/comments', AdminController.getComments);

adminRoutes.patch('/comments/bulk', zValidator('json', z.object({ ids: z.array(z.string()), status: z.enum(['approved', 'pending', 'spam', 'trash']) })), AdminController.updateCommentsBulk);
adminRoutes.delete('/comments/bulk', zValidator('json', z.object({ ids: z.array(z.string()) })), AdminController.deleteCommentsBulk);

adminRoutes.get('/account', AdminController.getAccount);
adminRoutes.put('/account', zValidator('json', z.object({ name: z.string().optional(), email: z.string().email().optional(), currentPassword: z.string().optional(), newPassword: z.string().min(6).optional(), resendApiKey: z.string().optional(), resendSenderEmail: z.string().email().optional().or(z.literal('')) })), AdminController.updateAccount);

adminRoutes.get('/export/:siteId', AdminController.exportData);
adminRoutes.post('/import/:siteId', zValidator('json', z.object({ threads: z.array(z.any()).optional(), comments: z.array(z.any()).optional() })), AdminController.importData);

adminRoutes.get('/users', AdminController.getWidgetUsers);
adminRoutes.delete('/users/:id', AdminController.deleteWidgetUser);

export default adminRoutes;
