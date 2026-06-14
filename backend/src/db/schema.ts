import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'user'] }).default('user').notNull(),
  tokenVersion: integer('token_version').default(0).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export const sites = sqliteTable('sites', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  domain: text('domain').notNull(),
  publicApiKey: text('public_api_key').notNull().unique(),
  requireLogin: integer('require_login', { mode: 'boolean' }).default(false).notNull(),
  enableEmail: integer('enable_email', { mode: 'boolean' }).default(false).notNull(),
  commentsLimit: integer('comments_limit').default(10).notNull(),
  requireModeration: integer('require_moderation', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
  userIdIdx: index('sites_user_id_idx').on(table.userId),
  domainIdx: index('sites_domain_idx').on(table.domain),
}));

export const threads = sqliteTable('threads', {
  id: text('id').primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  threadKey: text('thread_key').notNull(), // Unique per site, usually a path or slug
  title: text('title').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
  siteIdKeyIdx: index('threads_site_id_key_idx').on(table.siteId, table.threadKey),
}));

export const comments = sqliteTable('comments', {
  id: text('id').primaryKey(),
  threadId: text('thread_id').notNull().references(() => threads.id, { onDelete: 'cascade' }),
  parentId: text('parent_id'), // Self-referencing not directly supported with foreign key without careful setup, we handle via logic
  authorName: text('author_name').notNull(),
  authorEmail: text('author_email').notNull(),
  content: text('content').notNull(),
  htmlContent: text('html_content').notNull(),
  isPinned: integer('is_pinned', { mode: 'boolean' }).default(false).notNull(),
  status: text('status', { enum: ['pending', 'approved', 'spam', 'trash'] }).default('pending').notNull(),
  likesCount: integer('likes_count').default(0).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
  threadIdIdx: index('comments_thread_id_idx').on(table.threadId),
  parentIdIdx: index('comments_parent_id_idx').on(table.parentId),
  statusIdx: index('comments_status_idx').on(table.status),
}));

export const commentLikes = sqliteTable('comment_likes', {
  id: text('id').primaryKey(),
  commentId: text('comment_id').notNull().references(() => comments.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
  uniqueLike: uniqueIndex('comment_likes_unique_idx').on(table.commentId, table.userId),
  commentIdIdx: index('comment_likes_comment_id_idx').on(table.commentId),
  userIdIdx: index('comment_likes_user_id_idx').on(table.userId),
}));

export const widgetUsers = sqliteTable('widget_users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  isVerified: integer('is_verified', { mode: 'boolean' }).default(false).notNull(),
  verificationToken: text('verification_token'),
  resetPasswordToken: text('reset_password_token'),
  resetPasswordExpires: integer('reset_password_expires', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});
