CREATE TABLE `widget_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
ALTER TABLE `sites` ADD `require_login` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `sites` ADD `enable_email` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `sites` ADD `resend_api_key` text;--> statement-breakpoint
ALTER TABLE `users` ADD `name` text;--> statement-breakpoint
ALTER TABLE `users` ADD `role` text DEFAULT 'user' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `widget_users_email_unique` ON `widget_users` (`email`);