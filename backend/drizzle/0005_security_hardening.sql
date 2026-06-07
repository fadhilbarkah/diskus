ALTER TABLE `users` ADD `token_version` integer DEFAULT 0 NOT NULL;-->statement-breakpoint
CREATE TABLE `comment_likes` (
	`id` text PRIMARY KEY NOT NULL,
	`comment_id` text NOT NULL,
	`ip_hash` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);-->statement-breakpoint
CREATE UNIQUE INDEX `comment_likes_unique_idx` ON `comment_likes` (`comment_id`,`ip_hash`);-->statement-breakpoint
CREATE INDEX `comment_likes_comment_id_idx` ON `comment_likes` (`comment_id`);
