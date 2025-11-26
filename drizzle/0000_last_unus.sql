CREATE TABLE "anime_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"anime_name" text NOT NULL,
	"total_views" integer DEFAULT 0 NOT NULL,
	"total_downloads" integer DEFAULT 0 NOT NULL,
	"last_viewed" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "anime_stats_anime_name_unique" UNIQUE("anime_name")
);
--> statement-breakpoint
CREATE TABLE "cache_metadata" (
	"id" serial PRIMARY KEY NOT NULL,
	"total_size" integer DEFAULT 0 NOT NULL,
	"max_size" integer DEFAULT 10737418240 NOT NULL,
	"last_cleanup" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "episodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"anime_name" text NOT NULL,
	"episode_number" integer DEFAULT 0 NOT NULL,
	"source_video_id" text NOT NULL,
	"page_url" text NOT NULL,
	"video_url" text,
	"telegram_file_id" text,
	"file_size" integer,
	"quality" text,
	"is_processing" boolean DEFAULT false NOT NULL,
	"has_error" boolean DEFAULT false NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_accessed_at" timestamp,
	"access_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "release_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"release_id" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"image_url" text,
	"description" text,
	"notified_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_id" bigint NOT NULL,
	"username" text,
	"first_name" text,
	"last_name" text,
	"language_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "unique_source_id_idx" ON "episodes" USING btree ("source_video_id");--> statement-breakpoint
CREATE INDEX "telegram_file_id_idx" ON "episodes" USING btree ("telegram_file_id");--> statement-breakpoint
CREATE INDEX "anime_name_idx" ON "episodes" USING btree ("anime_name");--> statement-breakpoint
CREATE INDEX "is_processing_idx" ON "episodes" USING btree ("is_processing");--> statement-breakpoint
CREATE INDEX "cache_idx" ON "episodes" USING btree ("telegram_file_id","last_accessed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "release_notifications_release_id_idx" ON "release_notifications" USING btree ("release_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscribers_chat_id_idx" ON "subscribers" USING btree ("chat_id");