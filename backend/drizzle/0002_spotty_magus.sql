CREATE TABLE `groups` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `groups_user_id_idx` ON `groups` (`user_id`);--> statement-breakpoint
ALTER TABLE `clips` ADD `group_id` text REFERENCES groups(id) ON DELETE SET NULL;