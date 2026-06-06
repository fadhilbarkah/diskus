import { Context } from 'hono';
import { AdminService } from '../services/admin.service';
import { AuthVariables } from '../middlewares/auth';

export class AdminController {
  static async getSites(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user')!;
    const sites = await AdminService.getUserSites(user.userId);
    return c.json({ sites });
  }

  static async createSite(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user')!;
    const { domain } = (c.req as any).valid('json');
    const site = await AdminService.createSite(user.userId, domain);
    return c.json({ success: true, site });
  }

  static async deleteSite(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user')!;
    const id = c.req.param('id') as string;
    await AdminService.deleteSite(id, user.userId);
    return c.json({ success: true });
  }

  static async updateSite(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user')!;
    const id = c.req.param('id') as string;
    const { requireLogin } = (c.req as any).valid('json');
    
    const updateData: any = {};
    if (requireLogin !== undefined) updateData.requireLogin = requireLogin;

    await AdminService.updateSite(id, user.userId, updateData);
    return c.json({ success: true });
  }

  static async getAnalyticsSummary(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user')!;
    const siteId = c.req.query('siteId');
    const summary = await AdminService.getAnalyticsSummary(user.userId, user.role, siteId);
    return c.json(summary);
  }

  static async getComments(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user')!;
    const statusFilter = c.req.query('status');
    const siteId = c.req.query('siteId');
    
    const commentsList = await AdminService.getComments(user.userId, user.role, statusFilter, siteId);
    return c.json({ comments: commentsList });
  }

  static async updateCommentsBulk(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user')!;
    const { ids, status } = (c.req as any).valid('json');
    await AdminService.updateCommentsStatus(ids, status, user.userId, user.role);
    return c.json({ success: true });
  }

  static async deleteCommentsBulk(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user')!;
    const { ids } = (c.req as any).valid('json');
    await AdminService.deleteCommentsBulk(ids, user.userId, user.role);
    return c.json({ success: true });
  }

  static async getAccount(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user')!;
    const dbUser = await AdminService.getUserAccount(user.userId);
    if (!dbUser) return c.json({ error: 'User not found' }, 404);
    return c.json({ id: dbUser.id, name: dbUser.name || '', email: dbUser.email, resendApiKey: dbUser.resendApiKey || '', resendSenderEmail: dbUser.resendSenderEmail || '' });
  }

  static async updateAccount(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user')!;
    const { name, email, currentPassword, newPassword, resendApiKey, resendSenderEmail } = (c.req as any).valid('json');

    const dbUser = await AdminService.getUserAccount(user.userId);
    if (!dbUser) return c.json({ error: 'User not found' }, 404);

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (resendApiKey !== undefined) updateData.resendApiKey = resendApiKey;
    if (resendSenderEmail !== undefined) updateData.resendSenderEmail = resendSenderEmail;

    if (newPassword) {
      if (!currentPassword) return c.json({ error: 'Current password is required to set a new password' }, 400);
      if (dbUser.passwordHash !== currentPassword) return c.json({ error: 'Incorrect current password' }, 400);
      updateData.passwordHash = newPassword;
    }

    await AdminService.updateUserAccount(user.userId, dbUser, updateData);
    return c.json({ success: true });
  }

  static async exportData(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user')!;
    const siteId = c.req.param('siteId');
    if (!siteId) return c.json({ error: 'Site ID is required' }, 400);

    const data = await AdminService.exportData(user.userId, user.role, siteId);
    if (!data) return c.json({ error: 'Site not found' }, 404);
    
    c.header('Content-Type', 'application/json');
    c.header('Content-Disposition', `attachment; filename="diskus-export-${siteId}.json"`);
    return c.json(data);
  }

  static async importData(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user')!;
    const siteId = c.req.param('siteId');
    if (!siteId) return c.json({ error: 'Site ID is required' }, 400);

    const data = (c.req as any).valid('json');
    const success = await AdminService.importData(user.userId, user.role, siteId, data);
    if (!success) return c.json({ error: 'Failed to import' }, 400);
    return c.json({ success: true });
  }

  static async getWidgetUsers(c: Context<{ Variables: AuthVariables }>) {
    const users = await AdminService.getWidgetUsers();
    return c.json({ users });
  }

  static async deleteWidgetUser(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user')!;
    if (user.role !== 'admin') {
      return c.json({ error: 'Unauthorized. Only admins can delete users.' }, 403);
    }
    
    const id = c.req.param('id');
    if (!id) return c.json({ error: 'User ID is required' }, 400);

    await AdminService.deleteWidgetUser(id);
    return c.json({ success: true });
  }
}
