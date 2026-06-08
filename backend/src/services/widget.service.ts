import { db } from '../db';
import { sites, threads, comments, widgetUsers, users, commentLikes } from '../db/schema';
import { eq, and, desc, sql, isNull, isNotNull } from 'drizzle-orm';
import { simpleMarkdownToHtml, sanitizeHtml } from '../utils/html';
import { hashEmail } from '../utils/hash';
import { extractHostnameFromOrigin, isHostnameAllowed, isOriginAllowedForSite } from '../utils/domain';
import { getParentOriginFromRequest } from '../utils/request-origin';
import { signEmbedToken, verifyEmbedToken } from '../utils/embed-token';
import crypto from 'crypto';
import { Context } from 'hono';

function getEmbedTokenFromRequest(c: Context): string | undefined {
  return c.req.header('X-Diskus-Embed-Token') || c.req.query('embed_token') || undefined;
}

interface CreateCommentData {
  threadId: string;
  authorName: string;
  authorEmail: string;
  content: string;
  parentId?: string | null;
  status: 'pending' | 'approved' | 'spam' | 'trash';
}

export type VerifyApiKeyFailure =
  | 'invalid_key'
  | 'missing_embed_token'
  | 'invalid_embed_token'
  | 'domain_mismatch';

export class WidgetService {
  static async verifyApiKey(apiKey: string, c?: Context) {
    const site = await db.select().from(sites).where(eq(sites.publicApiKey, apiKey)).get();
    if (!site) return { site: null, failure: 'invalid_key' as const };

    if (!c) return { site, failure: null };

    const embedToken = getEmbedTokenFromRequest(c);
    if (!embedToken) return { site: null, failure: 'missing_embed_token' as const };

    const payload = await verifyEmbedToken(embedToken);
    if (!payload || payload.apiKey !== apiKey || payload.siteId !== site.id) {
      return { site: null, failure: 'invalid_embed_token' as const };
    }
    if (!isHostnameAllowed(payload.parentHost, site.domain)) {
      return { site: null, failure: 'domain_mismatch' as const };
    }

    return { site, failure: null };
  }

  static async issueEmbedToken(apiKey: string, c: Context) {
    const site = await db.select().from(sites).where(eq(sites.publicApiKey, apiKey)).get();
    if (!site) return { error: 'invalid_key' as const };

    const parentOrigin = getParentOriginFromRequest(c);
    if (!isOriginAllowedForSite(parentOrigin, site.domain)) {
      return { error: 'unauthorized_domain' as const, hostname: parentOrigin ? extractHostnameFromOrigin(parentOrigin) : null, registeredDomain: site.domain };
    }

    const parentHost = parentOrigin ? (extractHostnameFromOrigin(parentOrigin) ?? 'localhost') : 'localhost';
    const token = await signEmbedToken({
      siteId: site.id,
      apiKey,
      parentHost,
    });

    return { token, site };
  }

  static async hashPassword(password: string) { return await Bun.password.hash(password); }
  static async verifyPassword(password: string, hash: string) { return await Bun.password.verify(password, hash); }

  static async findDashboardUser(email: string) {
    return await db.select().from(users).where(eq(users.email, email)).get();
  }

  static async findWidgetUser(email: string) {
    return await db.select().from(widgetUsers).where(eq(widgetUsers.email, email)).get();
  }

  static async registerWidgetUser(email: string, name: string, passwordHash: string) {
    const [newUser] = await db.insert(widgetUsers).values({
      id: crypto.randomUUID(), email, name, passwordHash
    }).returning();
    return newUser;
  }

  static async getComments(siteId: string, threadKey: string, limit: number, offset: number, title?: string) {
    let thread = await db.select().from(threads)
      .where(and(eq(threads.siteId, siteId), eq(threads.threadKey, threadKey)))
      .get();

    if (!thread) {
      const [newThread] = await db.insert(threads).values({
        id: crypto.randomUUID(),
        siteId,
        threadKey,
        title: (title || threadKey).substring(0, 500),
      }).returning();
      thread = newThread;
    } else if (title && thread.title !== title) {
      // Always sync the thread title to the latest page title if it has changed
      await db.update(threads).set({ title: title.substring(0, 500) }).where(eq(threads.id, thread.id));
      thread.title = title.substring(0, 500);
    }

    const allComments = await db.select().from(comments)
      .where(and(eq(comments.threadId, thread.id), eq(comments.status, 'approved')))
      .all();

    const roots = allComments.filter(c => !c.parentId);
    const repliesMap = new Map<string, typeof allComments>();
    
    for (const c of allComments) {
      if (c.parentId) {
        if (!repliesMap.has(c.parentId)) repliesMap.set(c.parentId, []);
        repliesMap.get(c.parentId)!.push(c);
      }
    }

    roots.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
    });

    repliesMap.forEach(replies => {
      replies.sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
    });

    const flattened: typeof allComments = [];
    const traverse = (comment: typeof allComments[0]) => {
      flattened.push(comment);
      const replies = repliesMap.get(comment.id);
      if (replies) {
        for (const reply of replies) {
          traverse(reply);
        }
      }
    };

    for (const root of roots) {
      traverse(root);
    }

    const paginated = flattened.slice(offset, offset + limit);

    return {
      comments: paginated,
      hasMore: offset + limit < flattened.length
    };
  }

  static async createComment(data: CreateCommentData) {
    const rawHtml = simpleMarkdownToHtml(data.content);
    const safeHtml = sanitizeHtml(rawHtml);

    const [newComment] = await db.insert(comments).values({
      id: crypto.randomUUID(),
      threadId: data.threadId,
      authorName: data.authorName,
      authorEmail: data.authorEmail,
      content: data.content,
      htmlContent: safeHtml,
      parentId: data.parentId || null,
      status: data.status,
    }).returning();
    return newComment;
  }

  static async getThread(siteId: string, threadKey: string) {
    return await db.select().from(threads)
      .where(and(eq(threads.siteId, siteId), eq(threads.threadKey, threadKey)))
      .get();
  }

  static async deleteComment(id: string, authorEmail?: string) {
    if (authorEmail) {
      // Tombstone / Soft delete for regular users
      const comment = await db.select({ id: comments.id }).from(comments).where(and(eq(comments.id, id), eq(comments.authorEmail, authorEmail))).get();
      if (!comment) return;
      
      const deletedHtml = '<p class="italic text-gray-500 dark:text-gray-400">[Comment deleted]</p>';
      await db.update(comments)
        .set({
          authorName: '[deleted]',
          content: '[Comment deleted]',
          htmlContent: deletedHtml
        })
        .where(eq(comments.id, id));
    } else {
      // Cascade / Hard delete for Admins and Blog Owners
      const getAllDescendantIds = async (parentId: string): Promise<string[]> => {
        const children = await db.select({ id: comments.id }).from(comments).where(eq(comments.parentId, parentId)).all();
        let descendantIds: string[] = [];
        for (const child of children) {
          descendantIds.push(child.id);
          descendantIds = descendantIds.concat(await getAllDescendantIds(child.id));
        }
        return descendantIds;
      };

      const idsToDelete = [id, ...(await getAllDescendantIds(id))];
      
      for (const deleteId of idsToDelete) {
         await db.delete(comments).where(eq(comments.id, deleteId));
      }
    }
  }

  /**
   * Like a comment with IP-based tracking to prevent abuse.
   * Returns { success, alreadyLiked } to indicate the result.
   */
  static async likeComment(commentId: string, ipHash: string): Promise<{ success: boolean; alreadyLiked: boolean }> {
    // Verify comment exists
    const comment = await db.select({ id: comments.id }).from(comments).where(eq(comments.id, commentId)).get();
    if (!comment) return { success: false, alreadyLiked: false };

    // Check if already liked from this IP
    const existing = await db.select({ id: commentLikes.id }).from(commentLikes)
      .where(and(eq(commentLikes.commentId, commentId), eq(commentLikes.ipHash, ipHash)))
      .get();

    if (existing) return { success: false, alreadyLiked: true };

    // Record the like and increment count
    await db.insert(commentLikes).values({
      id: crypto.randomUUID(),
      commentId,
      ipHash,
    });

    await db.update(comments)
      .set({ likesCount: sql`${comments.likesCount} + 1` })
      .where(eq(comments.id, commentId));

    return { success: true, alreadyLiked: false };
  }

  /**
   * Unlike a comment with IP-based tracking.
   * Only allows unlike if the IP previously liked.
   */
  static async unlikeComment(commentId: string, ipHash: string): Promise<{ success: boolean }> {
    // Verify comment exists
    const comment = await db.select({ id: comments.id }).from(comments).where(eq(comments.id, commentId)).get();
    if (!comment) return { success: false };

    // Check if this IP actually liked it
    const existing = await db.select({ id: commentLikes.id }).from(commentLikes)
      .where(and(eq(commentLikes.commentId, commentId), eq(commentLikes.ipHash, ipHash)))
      .get();

    if (!existing) return { success: false };

    // Remove the like record and decrement count
    await db.delete(commentLikes)
      .where(and(eq(commentLikes.commentId, commentId), eq(commentLikes.ipHash, ipHash)));

    await db.update(comments)
      .set({ likesCount: sql`MAX(0, ${comments.likesCount} - 1)` }) // Prevent negative likes
      .where(eq(comments.id, commentId));

    return { success: true };
  }

  static async verifyCommentOwnership(commentId: string, userId: string): Promise<boolean> {
    const result = await db.select({ id: comments.id })
      .from(comments)
      .innerJoin(threads, eq(comments.threadId, threads.id))
      .innerJoin(sites, eq(threads.siteId, sites.id))
      .where(and(eq(comments.id, commentId), eq(sites.userId, userId)))
      .get();
    return !!result;
  }
}
