CREATE TABLE `oauth_accounts` (
	`provider_id` text NOT NULL,
	`provider_user_id` text NOT NULL,
	`widget_user_id` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	PRIMARY KEY(`provider_id`, `provider_user_id`),
	FOREIGN KEY (`widget_user_id`) REFERENCES `widget_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `oauth_accounts_widget_user_id_idx` ON `oauth_accounts` (`widget_user_id`);--> statement-breakpoint
ALTER TABLE `sites` ADD `enabled_social_logins` text DEFAULT '[]' NOT NULL;