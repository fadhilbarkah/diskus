import { Context } from 'hono';
import { WidgetService } from '../services/widget.service';
import { AdminService } from '../services/admin.service';
import { NotificationService } from '../services/notification.service';
import { signToken, verifyToken } from '../utils/jwt';
import { AuthVariables } from '../middlewares/auth';
import { hashEmail } from '../utils/hash';
import { EmailService } from '../services/email.service';

function widgetAuthError(failure: string | null) {
  switch (failure) {
    case 'missing_embed_token':
      return 'Missing embed token — please hard-refresh the page (Ctrl+Shift+R)';
    case 'invalid_embed_token':
      return 'Invalid or expired embed token — please refresh the page';
    case 'domain_mismatch':
      return 'Domain mismatch for embed token';
    default:
      return 'Invalid API Key or unauthorized domain';
  }
}



export class WidgetController {
  static async register(c: Context) {
    try {
      const data = (c.req as any).valid('json');
      if (data._diskus_trap) {
        // Honeypot triggered, silently pretend it was successful to trick bots
        return c.json({ token: 'dummy_token_for_bots', user: { id: 'dummy', email: data.email, name: data.name } });
      }

      const { email, name, password, origin_url } = data;
      const existing = await WidgetService.findWidgetUser(email);
      if (existing) return c.json({ error: 'Email already registered' }, 400);
      
      const passwordHash = await WidgetService.hashPassword(password);
      const newUser = await WidgetService.registerWidgetUser(email, name, passwordHash);
      
      const tokenPayload = { type: 'verify', userId: newUser.id, origin_url: origin_url || '' };
      const verificationToken = await signToken(tokenPayload);
      await WidgetService.updateVerificationToken(newUser.id, verificationToken);
      
      Promise.resolve().then(() => {
        EmailService.sendVerificationEmail(newUser.email, newUser.name, verificationToken);
      }).catch(err => console.error('Failed to send verification email:', err));
      
      const token = await signToken({ userId: newUser.id, email: newUser.email, name: newUser.name, role: 'commenter' });
      return c.json({ token, user: { id: newUser.id, email: newUser.email, name: newUser.name, role: 'commenter', avatarSeed: hashEmail(newUser.email), isVerified: false } });
    } catch (error: any) {
      if (error.message && error.message.includes('UNIQUE constraint failed')) {
        return c.json({ error: 'Email already registered' }, 400);
      }
      console.error('Registration error:', error);
      return c.json({ error: 'Failed to register user' }, 500);
    }
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
      return c.json({ token, user: { id: user.id, email: user.email, name: user.name, role: 'commenter', avatarSeed: hashEmail(user.email), isVerified: user.isVerified } });
    }
    
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  static async resendVerification(c: Context) {
    const user = c.get('user');
    const { origin_url } = (c.req as any).valid('json');
    if (!user || user.role !== 'commenter') return c.json({ error: 'Unauthorized' }, 401);

    const dbUser = await WidgetService.findWidgetUser(user.email);
    if (!dbUser) return c.json({ error: 'User not found' }, 404);
    if (dbUser.isVerified) return c.json({ error: 'Already verified' }, 400);

    const verificationToken = await signToken({ type: 'verify', userId: dbUser.id, origin_url });
    await WidgetService.updateVerificationToken(dbUser.id, verificationToken);

    Promise.resolve().then(() => {
      EmailService.sendVerificationEmail(dbUser.email, dbUser.name, verificationToken);
    });

    return c.json({ success: true });
  }

  static async verifyEmail(c: Context) {
    const token = c.req.query('token');
    if (!token) return c.text('Missing token', 400);

    const success = await WidgetService.verifyEmailToken(token);
    if (!success) {
      return c.html('<h1>Verification failed</h1><p>The token is invalid or has already been used.</p>', 400);
    }

    try {
      const payload = await verifyToken(token) as any;
      if (payload && payload.origin_url) {
        return c.redirect(payload.origin_url);
      }
    } catch (e) {
      // Decode failed, but verifyEmailToken succeeded (should not happen with valid JWT, but fallback)
    }

    return c.html('<h1 style="font-family: sans-serif;">Email Verified</h1><p style="font-family: sans-serif;">You can now close this window and continue commenting.</p>');
  }

  static async forgotPassword(c: Context) {
    const { email, origin_url } = (c.req as any).valid('json');
    const result = await WidgetService.generatePasswordResetToken(email);
    
    if (result) {
      Promise.resolve().then(() => {
        EmailService.sendPasswordResetEmail(result.user.email, result.user.name, result.resetToken, origin_url);
      });
    }

    // Always return success to prevent email enumeration
    return c.json({ success: true });
  }

  static async resetPassword(c: Context) {
    const { token, newPassword } = (c.req as any).valid('json');
    
    const passwordHash = await WidgetService.hashPassword(newPassword);
    const success = await WidgetService.resetPasswordWithToken(token, passwordHash);
    
    if (!success) {
      return c.json({ error: 'Invalid or expired token' }, 400);
    }

    return c.json({ success: true });
  }

  static async getMe(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const dbUser = await WidgetService.findWidgetUser(user.email);
    if (!dbUser) return c.json({ error: 'User not found' }, 404);
    
    return c.json({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: 'commenter',
        avatarSeed: hashEmail(dbUser.email),
        isVerified: dbUser.isVerified
      }
    });
  }

  static async getEmbedToken(c: Context) {
    const apiKey = c.req.query('api_key');
    if (!apiKey) return c.json({ error: 'Missing api_key' }, 400);

    const result = await WidgetService.issueEmbedToken(apiKey, c);

    if ('error' in result) {
      if (result.error === 'invalid_key') return c.json({ error: 'Invalid API Key' }, 403);
      return c.json({
        error: 'This domain is not authorized to use this widget',
      }, 403);
    }

    return c.json({ token: result.token });
  }

  static async getComments(c: Context) {
    const apiKey = c.req.query('api_key');
    const threadKey = c.req.query('thread_key');
    const title = c.req.query('title');
    const page = parseInt(c.req.query('page') || '1', 10);

    if (!apiKey || !threadKey) return c.json({ error: 'Missing parameters' }, 400);
    const auth = await WidgetService.verifyApiKey(apiKey, c);
    if (!auth.site) return c.json({ error: widgetAuthError(auth.failure), reason: auth.failure }, 403);
    const site = auth.site;

    const initialLimit = site.commentsLimit || 10;
    const loadMoreLimit = 10;
    
    const limit = page === 1 ? initialLimit : loadMoreLimit;
    const offset = page === 1 ? 0 : initialLimit + (page - 2) * loadMoreLimit;

    const owner = await AdminService.getUserAccount(site.userId);
    const { comments, hasMore, total } = await WidgetService.getComments(site.id, threadKey, limit, offset, title);
    
    const enrichedComments = comments.map(comment => {
      const isAuthor = owner ? comment.authorEmail === owner.email : false;
      const avatarSeed = hashEmail(comment.authorEmail);
      const { authorEmail, ...safeComment } = comment as any;
      return { ...safeComment, isAuthor, avatarSeed };
    });

    return c.json({ comments: enrichedComments, hasMore, total, config: { requireLogin: site.requireLogin } });
  }

  static async postComment(c: Context<{ Variables: AuthVariables }>) {
    const data = (c.req as any).valid('json');

    // Honeypot check
    if (data._diskus_trap) {
      return c.json({ comment: { id: crypto.randomUUID(), status: 'pending', content: data.content, authorName: data.authorName || 'Guest' } }, 201);
    }

    const auth = await WidgetService.verifyApiKey(data.api_key, c);
    if (!auth.site) return c.json({ error: widgetAuthError(auth.failure), reason: auth.failure }, 403);
    const site = auth.site;

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

    if (site.enableEmail) {
      Promise.resolve().then(async () => {
        // Send email to site owner
        if (owner) {
          NotificationService.sendNewCommentEmail(
            owner.email,
            authorName,
            authorEmail,
            thread.title,
            newComment.content,
            data.origin_url
          );
        }

        // Send reply notification to parent comment author
        if (data.parentId && data.origin_url) {
          const parentComment = await WidgetService.getCommentById(data.parentId);
          if (parentComment && parentComment.authorEmail && parentComment.authorEmail !== authorEmail) {
            NotificationService.sendReplyEmail(
              parentComment.authorEmail,
              parentComment.authorName,
              authorName,
              authorEmail,
              thread.title,
              newComment.content,
              data.origin_url
            );
          }
        }
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
    const user = c.get('user');
    if (!user) return c.json({ error: 'You must be logged in to like a comment' }, 401);

    const apiKey = c.req.query('api_key');
    if (!apiKey) return c.json({ error: 'Missing api_key' }, 400);
    const auth = await WidgetService.verifyApiKey(apiKey, c);
    if (!auth.site) return c.json({ error: widgetAuthError(auth.failure), reason: auth.failure }, 403);

    const id = c.req.param('id') as string;
    const identifier = user.userId;
    const result = await WidgetService.likeComment(id, identifier);

    if (result.alreadyLiked) {
      return c.json({ error: 'Already liked' }, 409);
    }
    if (!result.success) {
      return c.json({ error: 'Comment not found' }, 404);
    }
    return c.json({ success: true });
  }

  static async unlikeComment(c: Context) {
    const user = c.get('user');
    if (!user) return c.json({ error: 'You must be logged in to unlike a comment' }, 401);

    const apiKey = c.req.query('api_key');
    if (!apiKey) return c.json({ error: 'Missing api_key' }, 400);
    const auth = await WidgetService.verifyApiKey(apiKey, c);
    if (!auth.site) return c.json({ error: widgetAuthError(auth.failure), reason: auth.failure }, 403);

    const id = c.req.param('id') as string;
    const identifier = user.userId;
    const result = await WidgetService.unlikeComment(id, identifier);

    if (!result.success) {
      return c.json({ error: 'Like not found or comment does not exist' }, 404);
    }
    return c.json({ success: true });
  }
}
