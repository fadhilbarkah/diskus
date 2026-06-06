import { db } from '../db';
import { users, comments, sites, threads } from '../db/schema';
import { eq, inArray, desc, and } from 'drizzle-orm';
import { widgetUsers } from '../db/schema';
import crypto from 'crypto';

export class AdminService {
  static async getUserSites(userId: string) {
    return await db.select().from(sites).where(eq(sites.userId, userId)).all();
  }

  static async createSite(userId: string, domain: string) {
    const id = crypto.randomUUID();
    const publicApiKey = crypto.randomBytes(24).toString('hex');
    
    await db.insert(sites).values({
      id,
      userId,
      domain,
      publicApiKey,
    });
    return { id, userId, domain, publicApiKey };
  }

  static async deleteSite(id: string, userId: string) {
    await db.delete(sites).where(and(eq(sites.id, id), eq(sites.userId, userId)));
  }

  static async updateSite(id: string, userId: string, updateData: any) {
    if (Object.keys(updateData).length > 0) {
      await db.update(sites)
        .set(updateData)
        .where(and(eq(sites.id, id), eq(sites.userId, userId)));
    }
  }

  static async getAnalyticsSummary(userId: string, role: string, siteId?: string) {
    let q = db.select({
      id: comments.id,
      status: comments.status,
    }).from(comments);
    
    if (role !== 'admin' || siteId) {
      let joinQ = db.select({
        id: comments.id,
        status: comments.status,
      }).from(comments)
      .innerJoin(threads, eq(comments.threadId, threads.id))
      .innerJoin(sites, eq(threads.siteId, sites.id));
      
      let conditions = [];
      if (role !== 'admin') conditions.push(eq(sites.userId, userId));
      if (siteId) conditions.push(eq(sites.id, siteId));
      
      q = joinQ.where(and(...conditions)) as any;
    }
    
    const allComments = await q.all();
    
    return {
      total: allComments.length,
      pending: allComments.filter(cm => cm.status === 'pending').length,
      approved: allComments.filter(cm => cm.status === 'approved').length,
      spam: allComments.filter(cm => cm.status === 'spam').length,
      trash: allComments.filter(cm => cm.status === 'trash').length
    };
  }

  static async getComments(userId: string, role: string, statusFilter?: string, siteId?: string) {
    let conditions = [];
    if (statusFilter && statusFilter !== 'all') conditions.push(eq(comments.status, statusFilter as any));
    if (role !== 'admin') conditions.push(eq(sites.userId, userId));
    if (siteId) conditions.push(eq(sites.id, siteId));
    
    let q = db.select({
      id: comments.id,
      authorName: comments.authorName,
      authorEmail: comments.authorEmail,
      content: comments.content,
      htmlContent: comments.htmlContent,
      status: comments.status,
      createdAt: comments.createdAt,
      parentId: comments.parentId,
      threadTitle: threads.title,
      threadKey: threads.threadKey,
    }).from(comments)
    .leftJoin(threads, eq(comments.threadId, threads.id))
    .leftJoin(sites, eq(threads.siteId, sites.id));

    if (conditions.length > 0) q = q.where(and(...conditions)) as any;
    return await q.orderBy(desc(comments.createdAt)).all();
  }

  static async updateCommentsStatus(ids: string[], status: any, userId: string, role: string) {
    if (ids.length === 0) return;
    if (role === 'admin') {
      await db.update(comments).set({ status }).where(inArray(comments.id, ids));
    } else {
      const userComments = await db.select({ id: comments.id })
        .from(comments)
        .innerJoin(threads, eq(comments.threadId, threads.id))
        .innerJoin(sites, eq(threads.siteId, sites.id))
        .where(and(inArray(comments.id, ids), eq(sites.userId, userId)))
        .all();
        
      const validIds = userComments.map(c => c.id);
      if (validIds.length > 0) {
        await db.update(comments).set({ status }).where(inArray(comments.id, validIds));
      }
    }
  }

  static async deleteCommentsBulk(ids: string[], userId: string, role: string) {
    if (ids.length === 0) return;
    if (role === 'admin') {
      await db.delete(comments).where(inArray(comments.id, ids));
    } else {
      const userComments = await db.select({ id: comments.id })
        .from(comments)
        .innerJoin(threads, eq(comments.threadId, threads.id))
        .innerJoin(sites, eq(threads.siteId, sites.id))
        .where(and(inArray(comments.id, ids), eq(sites.userId, userId)))
        .all();
        
      const validIds = userComments.map(c => c.id);
      if (validIds.length > 0) {
        await db.delete(comments).where(inArray(comments.id, validIds));
      }
    }
  }

  static async getUserAccount(userId: string) {
    return await db.select().from(users).where(eq(users.id, userId)).get();
  }

  static async updateUserAccount(userId: string, dbUser: any, updateData: any) {
    if (Object.keys(updateData).length > 0) {
      await db.update(users).set(updateData).where(eq(users.id, userId));
      if (updateData.name || updateData.email) {
        await db.update(comments)
          .set({ 
            ...(updateData.name ? { authorName: updateData.name } : {}),
            ...(updateData.email ? { authorEmail: updateData.email } : {})
          })
          .where(eq(comments.authorEmail, dbUser.email));
      }
    }
  }

  static async exportData(userId: string, role: string, siteId: string) {
    if (role !== 'admin') {
      const site = await db.select().from(sites).where(and(eq(sites.id, siteId), eq(sites.userId, userId))).get();
      if (!site) return null;
    }

    const siteThreads = await db.select().from(threads).where(eq(threads.siteId, siteId)).all();
    const threadIds = siteThreads.map(t => t.id);
    
    let siteComments: any[] = [];
    if (threadIds.length > 0) {
      siteComments = await db.select().from(comments).where(inArray(comments.threadId, threadIds)).all();
    }

    return { siteId, threads: siteThreads, comments: siteComments };
  }

  static async importData(userId: string, role: string, siteId: string, data: any) {
    if (role !== 'admin') {
      const site = await db.select().from(sites).where(and(eq(sites.id, siteId), eq(sites.userId, userId))).get();
      if (!site) return false;
    }

    const threadIdMap: Record<string, string> = {};
    const commentIdMap: Record<string, string> = {};

    if (data.threads && data.threads.length > 0) {
      for (const t of data.threads) {
        const existing = await db.select().from(threads).where(and(eq(threads.siteId, siteId), eq(threads.threadKey, t.threadKey))).get();
        if (!existing) {
          const newThreadId = crypto.randomUUID();
          await db.insert(threads).values({
            id: newThreadId,
            siteId: siteId,
            threadKey: t.threadKey,
            title: t.title,
            createdAt: new Date(t.createdAt)
          });
          threadIdMap[t.id] = newThreadId;
        } else {
          threadIdMap[t.id] = existing.id;
        }
      }
    }

    if (data.comments && data.comments.length > 0) {
      // Sort comments by createdAt so parents are inserted before children
      const sortedComments = [...data.comments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      for (const c of sortedComments) {
        const targetThreadId = threadIdMap[c.threadId] || c.threadId;
        
        // Prevent duplicate imports of the same comment by checking threadId + authorEmail + content
        const existing = await db.select().from(comments)
          .where(and(
            eq(comments.threadId, targetThreadId),
            eq(comments.authorEmail, c.authorEmail),
            eq(comments.content, c.content)
          )).get();

        if (!existing) {
          const newCommentId = crypto.randomUUID();
          commentIdMap[c.id] = newCommentId;
          
          await db.insert(comments).values({
            id: newCommentId,
            threadId: targetThreadId,
            parentId: c.parentId ? (commentIdMap[c.parentId] || c.parentId) : null,
            authorName: c.authorName,
            authorEmail: c.authorEmail,
            content: c.content,
            htmlContent: c.htmlContent,
            status: c.status || 'approved',
            likesCount: c.likesCount || 0,
            createdAt: new Date(c.createdAt)
          });
        } else {
          commentIdMap[c.id] = existing.id;
        }
      }
    }
    return true;
  }

  static async getWidgetUsers() {
    return await db.select({
      id: widgetUsers.id,
      name: widgetUsers.name,
      email: widgetUsers.email,
      createdAt: widgetUsers.createdAt
    }).from(widgetUsers).orderBy(desc(widgetUsers.createdAt)).all();
  }

  static async deleteWidgetUser(id: string) {
    await db.delete(widgetUsers).where(eq(widgetUsers.id, id));
  }
}
