import crypto from "node:crypto";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import type { Context } from "hono";
import { db } from "../db";
import {
  commentLikes,
  comments,
  oauthAccounts,
  sites,
  threads,
  users,
  widgetUsers,
} from "../db/schema";
import {
  extractHostnameFromOrigin,
  isHostnameAllowed,
  isOriginAllowedForSite,
} from "../utils/domain";
import { signEmbedToken, verifyEmbedToken } from "../utils/embed-token";
import { sanitizeHtml, simpleMarkdownToHtml } from "../utils/html";
import { getParentOriginFromRequest } from "../utils/request-origin";

function getEmbedTokenFromRequest(c: Context): string | undefined {
  return c.req.header("X-Diskus-Embed-Token") || c.req.query("embed_token") || undefined;
}

interface CreateCommentData {
  threadId: string;
  authorName: string;
  authorEmail: string;
  content: string;
  parentId?: string | null;
  status: "pending" | "approved" | "spam" | "trash";
}

export type VerifyApiKeyFailure =
  | "invalid_key"
  | "missing_embed_token"
  | "invalid_embed_token"
  | "domain_mismatch";

export class WidgetService {
  static async verifyApiKey(apiKey: string, c?: Context) {
    const site = await db.select().from(sites).where(eq(sites.publicApiKey, apiKey)).get();
    if (!site) return { site: null, failure: "invalid_key" as const };

    if (!c) return { site, failure: null };

    const embedToken = getEmbedTokenFromRequest(c);
    if (!embedToken) return { site: null, failure: "missing_embed_token" as const };

    const payload = await verifyEmbedToken(embedToken);
    if (!payload || payload.apiKey !== apiKey || payload.siteId !== site.id) {
      return { site: null, failure: "invalid_embed_token" as const };
    }
    if (!isHostnameAllowed(payload.parentHost, site.domain)) {
      return { site: null, failure: "domain_mismatch" as const };
    }

    return { site, failure: null };
  }

  static async issueEmbedToken(apiKey: string, c: Context) {
    const site = await db.select().from(sites).where(eq(sites.publicApiKey, apiKey)).get();
    if (!site) return { error: "invalid_key" as const };

    const parentOrigin = getParentOriginFromRequest(c);
    if (!isOriginAllowedForSite(parentOrigin, site.domain)) {
      return {
        error: "unauthorized_domain" as const,
        hostname: parentOrigin ? extractHostnameFromOrigin(parentOrigin) : null,
        registeredDomain: site.domain,
      };
    }

    const parentHost = parentOrigin
      ? (extractHostnameFromOrigin(parentOrigin) ?? "localhost")
      : "localhost";
    const token = await signEmbedToken({
      siteId: site.id,
      apiKey,
      parentHost,
    });

    return { token, site };
  }

  static async hashPassword(password: string) {
    return await Bun.password.hash(password);
  }
  static async verifyPassword(password: string, hash: string) {
    return await Bun.password.verify(password, hash);
  }

  static async findDashboardUser(email: string) {
    return await db.select().from(users).where(eq(users.email, email)).get();
  }

  static async findWidgetUser(email: string) {
    return await db.select().from(widgetUsers).where(eq(widgetUsers.email, email)).get();
  }

  static async findWidgetUserById(id: string) {
    return await db.select().from(widgetUsers).where(eq(widgetUsers.id, id)).get();
  }

  static async registerWidgetUser(email: string, name: string, passwordHash: string) {
    const [newUser] = await db
      .insert(widgetUsers)
      .values({
        id: crypto.randomUUID(),
        email,
        name,
        passwordHash,
      })
      .returning();
    return newUser;
  }

  static async findOAuthAccount(providerId: string, providerUserId: string) {
    return await db
      .select()
      .from(oauthAccounts)
      .where(
        and(
          eq(oauthAccounts.providerId, providerId),
          eq(oauthAccounts.providerUserId, providerUserId),
        ),
      )
      .get();
  }

  static async linkOAuthAccount(providerId: string, providerUserId: string, widgetUserId: string) {
    await db.insert(oauthAccounts).values({
      providerId,
      providerUserId,
      widgetUserId,
    });
  }

  static async registerOAuthUser(
    email: string,
    name: string,
    providerId: string,
    providerUserId: string,
  ) {
    const userId = crypto.randomUUID();
    const [newUser] = await db
      .insert(widgetUsers)
      .values({
        id: userId,
        email,
        name,
        passwordHash: "[OAUTH_ACCOUNT]",
        isVerified: true,
      })
      .returning();

    await db.insert(oauthAccounts).values({
      providerId,
      providerUserId,
      widgetUserId: userId,
    });

    return newUser;
  }

  static async updateVerificationToken(userId: string, token: string) {
    await db
      .update(widgetUsers)
      .set({ verificationToken: token })
      .where(eq(widgetUsers.id, userId));
  }

  static async verifyEmailToken(token: string) {
    const user = await db
      .select()
      .from(widgetUsers)
      .where(eq(widgetUsers.verificationToken, token))
      .get();
    if (!user) return false;

    await db
      .update(widgetUsers)
      .set({ isVerified: true, verificationToken: null })
      .where(eq(widgetUsers.id, user.id));
    return true;
  }

  static async markUserAsVerified(userId: string) {
    await db
      .update(widgetUsers)
      .set({ isVerified: true, verificationToken: null })
      .where(eq(widgetUsers.id, userId));
  }

  static async generatePasswordResetToken(email: string) {
    const user = await WidgetService.findWidgetUser(email);
    if (!user) return null;

    const resetToken = crypto.randomBytes(32).toString("hex");
    // 1 hour expiry
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await db
      .update(widgetUsers)
      .set({ resetPasswordToken: resetToken, resetPasswordExpires: expires })
      .where(eq(widgetUsers.id, user.id));

    return { user, resetToken };
  }

  static async validateResetToken(token: string) {
    const user = await db
      .select()
      .from(widgetUsers)
      .where(
        and(eq(widgetUsers.resetPasswordToken, token), isNotNull(widgetUsers.resetPasswordExpires)),
      )
      .get();

    if (!user?.resetPasswordExpires || new Date() > new Date(user.resetPasswordExpires)) {
      return false;
    }
    return true;
  }

  static async resetPasswordWithToken(token: string, newPasswordHash: string) {
    const user = await db
      .select()
      .from(widgetUsers)
      .where(
        and(eq(widgetUsers.resetPasswordToken, token), isNotNull(widgetUsers.resetPasswordExpires)),
      )
      .get();

    if (!user?.resetPasswordExpires || new Date() > new Date(user.resetPasswordExpires)) {
      return false; // Invalid or expired token
    }

    await db
      .update(widgetUsers)
      .set({
        passwordHash: newPasswordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      })
      .where(eq(widgetUsers.id, user.id));

    return true;
  }

  static async getComments(
    siteId: string,
    threadKey: string,
    limit: number,
    offset: number,
    title?: string,
  ) {
    let thread = await db
      .select()
      .from(threads)
      .where(and(eq(threads.siteId, siteId), eq(threads.threadKey, threadKey)))
      .get();

    if (!thread) {
      const [newThread] = await db
        .insert(threads)
        .values({
          id: crypto.randomUUID(),
          siteId,
          threadKey,
          title: (title || threadKey).substring(0, 500),
        })
        .returning();
      thread = newThread;
    } else if (title && thread.title !== title) {
      // Always sync the thread title to the latest page title if it has changed
      await db
        .update(threads)
        .set({ title: title.substring(0, 500) })
        .where(eq(threads.id, thread.id));
      thread.title = title.substring(0, 500);
    }

    const allComments = await db
      .select()
      .from(comments)
      .where(and(eq(comments.threadId, thread.id), eq(comments.status, "approved")))
      .all();

    const roots = allComments.filter((c) => !c.parentId);
    const repliesMap = new Map<string, typeof allComments>();

    for (const c of allComments) {
      if (c.parentId) {
        if (!repliesMap.has(c.parentId)) repliesMap.set(c.parentId, []);
        repliesMap.get(c.parentId)?.push(c);
      }
    }

    roots.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
    });

    repliesMap.forEach((replies) => {
      replies.sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
    });

    const flattened: typeof allComments = [];
    const traverse = (comment: (typeof allComments)[0]) => {
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
      hasMore: offset + limit < flattened.length,
      total: flattened.length,
    };
  }

  static async createComment(data: CreateCommentData) {
    const rawHtml = simpleMarkdownToHtml(data.content);
    const safeHtml = sanitizeHtml(rawHtml);

    const [newComment] = await db
      .insert(comments)
      .values({
        id: crypto.randomUUID(),
        threadId: data.threadId,
        authorName: data.authorName,
        authorEmail: data.authorEmail,
        content: data.content,
        htmlContent: safeHtml,
        parentId: data.parentId || null,
        status: data.status,
      })
      .returning();
    return newComment;
  }

  static async getThread(siteId: string, threadKey: string) {
    return await db
      .select()
      .from(threads)
      .where(and(eq(threads.siteId, siteId), eq(threads.threadKey, threadKey)))
      .get();
  }

  static async getCommentById(id: string) {
    return await db.select().from(comments).where(eq(comments.id, id)).get();
  }

  static async deleteComment(id: string, authorEmail?: string) {
    if (authorEmail) {
      // Tombstone / Soft delete for regular users
      const comment = await db
        .select({ id: comments.id })
        .from(comments)
        .where(and(eq(comments.id, id), eq(comments.authorEmail, authorEmail)))
        .get();
      if (!comment) return;

      const deletedHtml =
        '<p class="italic text-gray-500 dark:text-gray-400">[Comment deleted]</p>';
      await db
        .update(comments)
        .set({
          authorName: "[deleted]",
          content: "[Comment deleted]",
          htmlContent: deletedHtml,
        })
        .where(eq(comments.id, id));
    } else {
      // Cascade / Hard delete for Admins and Blog Owners
      const getAllDescendantIds = async (parentId: string): Promise<string[]> => {
        const children = await db
          .select({ id: comments.id })
          .from(comments)
          .where(eq(comments.parentId, parentId))
          .all();
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
   * Like a comment with userId tracking to prevent abuse.
   * Returns { success, alreadyLiked } to indicate the result.
   */
  static async likeComment(
    commentId: string,
    userId: string,
  ): Promise<{ success: boolean; alreadyLiked: boolean }> {
    // Verify comment exists
    const comment = await db
      .select({ id: comments.id })
      .from(comments)
      .where(eq(comments.id, commentId))
      .get();
    if (!comment) return { success: false, alreadyLiked: false };

    // Check if already liked by this user
    const existing = await db
      .select({ id: commentLikes.id })
      .from(commentLikes)
      .where(and(eq(commentLikes.commentId, commentId), eq(commentLikes.userId, userId)))
      .get();

    if (existing) return { success: false, alreadyLiked: true };

    // Record the like and increment count
    await db.insert(commentLikes).values({
      id: crypto.randomUUID(),
      commentId,
      userId,
    });

    await db
      .update(comments)
      .set({ likesCount: sql`${comments.likesCount} + 1` })
      .where(eq(comments.id, commentId));

    return { success: true, alreadyLiked: false };
  }

  /**
   * Unlike a comment.
   * Only allows unlike if the user previously liked.
   */
  static async unlikeComment(commentId: string, userId: string): Promise<{ success: boolean }> {
    // Verify comment exists
    const comment = await db
      .select({ id: comments.id })
      .from(comments)
      .where(eq(comments.id, commentId))
      .get();
    if (!comment) return { success: false };

    // Check if this user actually liked it
    const existing = await db
      .select({ id: commentLikes.id })
      .from(commentLikes)
      .where(and(eq(commentLikes.commentId, commentId), eq(commentLikes.userId, userId)))
      .get();

    if (!existing) return { success: false };

    // Remove the like record and decrement count
    await db
      .delete(commentLikes)
      .where(and(eq(commentLikes.commentId, commentId), eq(commentLikes.userId, userId)));

    await db
      .update(comments)
      .set({ likesCount: sql`MAX(0, ${comments.likesCount} - 1)` }) // Prevent negative likes
      .where(eq(comments.id, commentId));

    return { success: true };
  }

  static async verifyCommentOwnership(commentId: string, userId: string): Promise<boolean> {
    const result = await db
      .select({ id: comments.id })
      .from(comments)
      .innerJoin(threads, eq(comments.threadId, threads.id))
      .innerJoin(sites, eq(threads.siteId, sites.id))
      .where(and(eq(comments.id, commentId), eq(sites.userId, userId)))
      .get();
    return !!result;
  }
}
