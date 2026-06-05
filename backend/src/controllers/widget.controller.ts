import { Context } from 'hono';
import { WidgetService } from '../services/widget.service';
import { signToken } from '../utils/jwt';
import { AuthVariables } from '../middlewares/auth';

export class WidgetController {
  static async register(c: Context) {
    const { email, name, password } = (c.req as any).valid('json');
    const existing = await WidgetService.findWidgetUser(email);
    if (existing) return c.json({ error: 'Email already registered' }, 400);
    
    const passwordHash = await WidgetService.hashPassword(password);
    const newUser = await WidgetService.registerWidgetUser(email, name, passwordHash);
    
    const token = await signToken({ userId: newUser.id, email: newUser.email, name: newUser.name, role: 'commenter' });
    return c.json({ token, user: { id: newUser.id, email: newUser.email, name: newUser.name } });
  }

  static async login(c: Context) {
    const { email, password } = (c.req as any).valid('json');
    
    const dashboardUser = await WidgetService.findDashboardUser(email);
    if (dashboardUser && await WidgetService.verifyPassword(password, dashboardUser.passwordHash)) {
      const token = await signToken({ userId: dashboardUser.id, email: dashboardUser.email, name: dashboardUser.name || 'Admin', role: dashboardUser.role });
      return c.json({ token, user: { id: dashboardUser.id, email: dashboardUser.email, name: dashboardUser.name || 'Admin' } });
    }

    const user = await WidgetService.findWidgetUser(email);
    if (user && await WidgetService.verifyPassword(password, user.passwordHash)) {
      const token = await signToken({ userId: user.id, email: user.email, name: user.name, role: 'commenter' });
      return c.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    }
    
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  static async getComments(c: Context) {
    const apiKey = c.req.query('api_key');
    const threadKey = c.req.query('thread_key');
    const title = c.req.query('title');

    if (!apiKey || !threadKey) return c.json({ error: 'Missing parameters' }, 400);
    const site = await WidgetService.verifyApiKey(apiKey);
    if (!site) return c.json({ error: 'Invalid API Key' }, 403);

    const commentsList = await WidgetService.getComments(site.id, threadKey, title);
    return c.json({ comments: commentsList, config: { requireLogin: site.requireLogin } });
  }

  static async postComment(c: Context<{ Variables: AuthVariables }>) {
    const data = (c.req as any).valid('json');
    const site = await WidgetService.verifyApiKey(data.api_key);
    if (!site) return c.json({ error: 'Invalid API Key' }, 403);

    const thread = await WidgetService.getThread(site.id, data.thread_key);
    if (!thread) return c.json({ error: 'Thread not found' }, 404);

    let authorName = data.authorName || 'Anonymous';
    let authorEmail = data.authorEmail || 'anonymous@example.com';
    let initialStatus = 'pending';

    const user = c.get('user');
    let isAuthed = false;

    if (user) {
      authorName = user.name || 'Admin';
      authorEmail = user.email;
      isAuthed = true;
      if (user.role === 'admin' || user.role === 'user') {
        initialStatus = 'approved';
      }
    }
    
    if (!isAuthed) {
      if (site.requireLogin) {
        return c.json({ error: 'Login required to post comments' }, 401);
      }
      if (!data.authorName || !data.authorEmail) {
        return c.json({ error: 'Missing author details' }, 400);
      }
    }

    const newComment = await WidgetService.createComment({
      threadId: thread.id,
      authorName,
      authorEmail,
      content: data.content,
      parentId: data.parentId,
      status: initialStatus,
    });

    return c.json({ comment: newComment }, 201);
  }

  static async deleteComment(c: Context<{ Variables: AuthVariables }>) {
    const id = c.req.param('id') as string;
    const user = c.get('user');
    
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    if (user.role === 'admin' || user.role === 'user') {
      await WidgetService.deleteComment(id);
      return c.json({ success: true });
    }

    if (user.role === 'commenter') {
      await WidgetService.deleteComment(id, user.email);
      return c.json({ success: true });
    }

    return c.json({ error: 'Unauthorized' }, 403);
  }

  static async likeComment(c: Context) {
    const id = c.req.param('id') as string;
    await WidgetService.likeComment(id);
    return c.json({ success: true });
  }

  static async unlikeComment(c: Context) {
    const id = c.req.param('id') as string;
    await WidgetService.unlikeComment(id);
    return c.json({ success: true });
  }
}
