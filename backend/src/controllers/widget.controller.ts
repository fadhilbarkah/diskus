import { Context } from 'hono';
import { WidgetService } from '../services/widget.service';
import { AdminService } from '../services/admin.service';
import { NotificationService } from '../services/notification.service';
import { signToken } from '../utils/jwt';
import { AuthVariables } from '../middlewares/auth';
import { hashEmail } from '../utils/hash';

/** Hash the client IP for privacy-preserving like tracking */
function getIpHash(c: Context): string {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'unknown-ip';
  return hashEmail(ip); // reuse SHA-256 hash utility
}

export class WidgetController {
  static async register(c: Context) {
    const data = (c.req as any).valid('json');
    if (data._diskus_trap) {
      // Honeypot triggered, silently pretend it was successful to trick bots
      return c.json({ token: 'dummy_token_for_bots', user: { id: 'dummy', email: data.email, name: data.name } });
    }

    const { email, name, password } = data;
    const existing = await WidgetService.findWidgetUser(email);
    if (existing) return c.json({ error: 'Email already registered' }, 400);
    
    const passwordHash = await WidgetService.hashPassword(password);
    const newUser = await WidgetService.registerWidgetUser(email, name, passwordHash);
    
    const token = await signToken({ userId: newUser.id, email: newUser.email, name: newUser.name, role: 'commenter' });
    return c.json({ token, user: { id: newUser.id, email: newUser.email, name: newUser.name, role: 'commenter', avatarSeed: hashEmail(newUser.email) } });
  }

  static async login(c: Context) {
    const { email, password } = (c.req as any).valid('json');
    
    const dashboardUser = await WidgetService.findDashboardUser(email);
    if (dashboardUser && await WidgetService.verifyPassword(password, dashboardUser.passwordHash)) {
      const token = await signToken({ userId: dashboardUser.id, email: dashboardUser.email, name: dashboardUser.name || 'Admin', role: dashboardUser.role, tokenVersion: dashboardUser.tokenVersion });
      return c.json({ token, user: { id: dashboardUser.id, email: dashboardUser.email, name: dashboardUser.name || 'Admin', role: dashboardUser.role, avatarSeed: hashEmail(dashboardUser.email) } });
    }

    const user = await WidgetService.findWidgetUser(email);
    if (user && await WidgetService.verifyPassword(password, user.passwordHash)) {
      const token = await signToken({ userId: user.id, email: user.email, name: user.name, role: 'commenter' });
      return c.json({ token, user: { id: user.id, email: user.email, name: user.name, role: 'commenter', avatarSeed: hashEmail(user.email) } });
    }
    
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  static async getComments(c: Context) {
    const apiKey = c.req.query('api_key');
    const threadKey = c.req.query('thread_key');
    const title = c.req.query('title');
    const page = parseInt(c.req.query('page') || '1', 10);

    if (!apiKey || !threadKey) return c.json({ error: 'Missing parameters' }, 400);
    const site = await WidgetService.verifyApiKey(apiKey, c);
    if (!site) return c.json({ error: 'Invalid API Key' }, 403);

    const initialLimit = site.commentsLimit || 10;
    const loadMoreLimit = 10;
    
    const limit = page === 1 ? initialLimit : loadMoreLimit;
    const offset = page === 1 ? 0 : initialLimit + (page - 2) * loadMoreLimit;

    const owner = await AdminService.getUserAccount(site.userId);
    const { comments, hasMore } = await WidgetService.getComments(site.id, threadKey, limit, offset, title);
    
    const enrichedComments = comments.map(comment => {
      const isAuthor = owner ? comment.authorEmail === owner.email : false;
      const avatarSeed = hashEmail(comment.authorEmail);
      const { authorEmail, ...safeComment } = comment as any;
      return { ...safeComment, isAuthor, avatarSeed };
    });

    return c.json({ comments: enrichedComments, hasMore, config: { requireLogin: site.requireLogin } });
  }

  static async postComment(c: Context<{ Variables: AuthVariables }>) {
    const data = (c.req as any).valid('json');

    // Honeypot check
    if (data._diskus_trap) {
      return c.json({ comment: { id: crypto.randomUUID(), status: 'pending', content: data.content, authorName: data.authorName || 'Guest' } }, 201);
    }

    const site = await WidgetService.verifyApiKey(data.api_key, c);
    if (!site) return c.json({ error: 'Invalid API Key or Unauthorized Domain' }, 403);

    const thread = await WidgetService.getThread(site.id, data.thread_key);
    if (!thread) return c.json({ error: 'Thread not found' }, 404);

    const owner = await AdminService.getUserAccount(site.userId);

    let authorName = data.authorName || 'Anonymous';
    let authorEmail = data.authorEmail || 'anonymous@example.com';
    let initialStatus: 'pending' | 'approved' | 'spam' | 'trash' = site.requireModeration ? 'pending' : 'approved';

    const user = c.get('user');
    let isAuthed = false;

    if (user) {
      authorName = user.name || 'Admin';
      authorEmail = user.email;
      isAuthed = true;
      // Auto-approve if they are admin, or if their email matches the site owner's email
      if (user.role === 'admin' || user.role === 'user' || (owner && user.email === owner.email)) {
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

    const returnedComment = {
      ...newComment,
      isAuthor: owner ? newComment.authorEmail === owner.email : false,
      avatarSeed: hashEmail(newComment.authorEmail)
    };
    delete (returnedComment as any).authorEmail;

    if (site.enableEmail && owner) {
      Promise.resolve().then(() => {
        NotificationService.sendNewCommentEmail(
          owner.resendApiKey,
          owner.resendSenderEmail,
          owner.email,
          authorName,
          authorEmail,
          thread.title,
          newComment.content
        );
      });
    }

    return c.json({ comment: returnedComment }, 201);
  }

  static async deleteComment(c: Context<{ Variables: AuthVariables }>) {
    const id = c.req.param('id') as string;
    const user = c.get('user');
    
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    if (user.role === 'admin') {
      await WidgetService.deleteComment(id);
      return c.json({ success: true });
    }

    if (user.role === 'user') {
      const isOwner = await WidgetService.verifyCommentOwnership(id, user.userId);
      if (!isOwner) return c.json({ error: 'Unauthorized' }, 403);
      await WidgetService.deleteComment(id);
      return c.json({ success: true });
    }

    if (user.role === 'commenter') {
      await WidgetService.deleteComment(id, user.email);
      return c.json({ success: true });
    }

    return c.json({ error: 'Unauthorized' }, 403);
  }

  static async togglePinComment(c: Context<{ Variables: AuthVariables }>) {
    const id = c.req.param('id') as string;
    const user = c.get('user');
    const { isPinned } = (c.req as any).valid('json');
    
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    if (user.role === 'admin') {
      await AdminService.togglePinComment(id, isPinned);
      return c.json({ success: true });
    }

    if (user.role === 'user') {
      const isOwner = await WidgetService.verifyCommentOwnership(id, user.userId);
      if (!isOwner) return c.json({ error: 'Unauthorized' }, 403);
      await AdminService.togglePinComment(id, isPinned);
      return c.json({ success: true });
    }

    return c.json({ error: 'Unauthorized' }, 403);
  }

  static async likeComment(c: Context) {
    const id = c.req.param('id') as string;
    const ipHash = getIpHash(c);
    const result = await WidgetService.likeComment(id, ipHash);

    if (result.alreadyLiked) {
      return c.json({ error: 'Already liked' }, 409);
    }
    if (!result.success) {
      return c.json({ error: 'Comment not found' }, 404);
    }
    return c.json({ success: true });
  }

  static async unlikeComment(c: Context) {
    const id = c.req.param('id') as string;
    const ipHash = getIpHash(c);
    const result = await WidgetService.unlikeComment(id, ipHash);

    if (!result.success) {
      return c.json({ error: 'Like not found or comment does not exist' }, 404);
    }
    return c.json({ success: true });
  }
}
