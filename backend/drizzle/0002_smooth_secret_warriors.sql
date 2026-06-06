ALTER TABLE `users` ADD `resend_api_key` text;--> statement-breakpoint
ALTER TABLE `sites` DROP COLUMN `resend_api_key`;