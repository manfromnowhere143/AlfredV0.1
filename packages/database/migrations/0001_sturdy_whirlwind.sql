CREATE TYPE "public"."alfred_facet" AS ENUM('build', 'teach', 'review');--> statement-breakpoint
CREATE TABLE "artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"code" text NOT NULL,
	"language" varchar(50) DEFAULT 'jsx' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "conversations" ALTER COLUMN "mode" SET DATA TYPE alfred_facet;--> statement-breakpoint
ALTER TABLE "conversations" ALTER COLUMN "mode" SET DEFAULT 'build';--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "mode" SET DATA TYPE alfred_facet;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "default_mode" SET DATA TYPE alfred_facet;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "default_mode" SET DEFAULT 'build';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "skill_level" SET DEFAULT 'intermediate';--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artifacts_project_id_idx" ON "artifacts" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "artifacts_conversation_id_idx" ON "artifacts" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "artifacts_created_at_idx" ON "artifacts" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "public"."users" ALTER COLUMN "skill_level" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."skill_level";--> statement-breakpoint
CREATE TYPE "public"."skill_level" AS ENUM('beginner', 'intermediate', 'experienced', 'expert');--> statement-breakpoint
ALTER TABLE "public"."users" ALTER COLUMN "skill_level" SET DATA TYPE "public"."skill_level" USING "skill_level"::"public"."skill_level";--> statement-breakpoint
DROP TYPE "public"."alfred_mode";