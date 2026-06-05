import { db } from '../db';
import { sites, threads, comments, widgetUsers, users } from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { simpleMarkdownToHtml, sanitizeHtml } from '../utils/html';

export class WidgetService {
  static async verifyApiKey(apiKey: string) {
    const site = await db.select().from(sites).where(eq(sites.publicApiKey, apiKey)).get();
    return site || null;
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

  static async getComments(siteId: string, threadKey: string, title?: string) {
    let thread = await db.select().from(threads)
      .where(and(eq(threads.siteId, siteId), eq(threads.threadKey, threadKey)))
      .get();

    if (!thread) {
      const [newThread] = await db.insert(threads).values({
        id: crypto.randomUUID(),
        siteId,
        threadKey,
        title: title || threadKey,
      }).returning();
      thread = newThread;
    }

    const allComments = await db.select().from(comments)
      .where(and(eq(comments.threadId, thread.id), eq(comments.status, 'approved')))
      .orderBy(desc(comments.createdAt))
      .all();

    return allComments;
  }

  static async createComment(data: any) {
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
      await db.delete(comments).where(and(eq(comments.id, id), eq(comments.authorEmail, authorEmail)));
    } else {
      await db.delete(comments).where(eq(comments.id, id));
    }
  }

  static async likeComment(id: string) {
    await db.update(comments)
      .set({ likesCount: sql`${comments.likesCount} + 1` })
      .where(eq(comments.id, id));
  }

  static async unlikeComment(id: string) {
    await db.update(comments)
      .set({ likesCount: sql`MAX(0, ${comments.likesCount} - 1)` }) // Prevent negative likes
      .where(eq(comments.id, id));
  }
}
