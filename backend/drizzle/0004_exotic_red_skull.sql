ALTER TABLE `comments` ADD `is_pinned` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `sites` ADD `comments_limit` integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `sites` ADD `require_moderation` integer DEFAULT true NOT NULL;