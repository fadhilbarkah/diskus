ALTER TABLE `widget_users` ADD `is_verified` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `widget_users` ADD `verification_token` text;--> statement-breakpoint
ALTER TABLE `widget_users` ADD `reset_password_token` text;--> statement-breakpoint
ALTER TABLE `widget_users` ADD `reset_password_expires` integer;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `resend_api_key`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `resend_sender_email`;