CREATE TYPE "public"."alfred_mode" AS ENUM('builder', 'mentor', 'reviewer');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('code', 'markdown', 'architecture', 'decision', 'pattern');--> statement-breakpoint
CREATE TYPE "public"."memory_type" AS ENUM('preference', 'project', 'decision', 'skill_signal', 'stack_preference');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'alfred');--> statement-breakpoint
CREATE TYPE "public"."project_type" AS ENUM('web_app', 'dashboard', 'api', 'library', 'other');--> statement-breakpoint
CREATE TYPE "public"."quality_tier" AS ENUM('gold', 'silver', 'bronze');--> statement-breakpoint
CREATE TYPE "public"."skill_level" AS ENUM('beginner', 'intermediate', 'experienced', 'inferred');--> statement-breakpoint
CREATE TYPE "public"."user_tier" AS ENUM('free', 'pro', 'enterprise');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"key_prefix" varchar(10) NOT NULL,
	"name" varchar(255) NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_used_at" timestamp with time zone,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"content" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"start_offset" integer NOT NULL,
	"end_offset" integer NOT NULL,
	"line_start" integer NOT NULL,
	"line_end" integer NOT NULL,
	"chunk_type" varchar(50) NOT NULL,
	"name" varchar(255),
	"embedding" jsonb,
	"embedding_model" varchar(100),
	"embedded_at" timestamp with time zone,
	"token_count" integer NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"mode" "alfred_mode" DEFAULT 'builder' NOT NULL,
	"title" varchar(255),
	"summary" text,
	"project_id" uuid,
	"message_count" integer DEFAULT 0 NOT NULL,
	"token_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "document_type" NOT NULL,
	"source" varchar(500),
	"file_path" varchar(500),
	"url" varchar(500),
	"title" varchar(255),
	"content" text NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"quality_tier" "quality_tier" DEFAULT 'bronze' NOT NULL,
	"language" varchar(50),
	"framework" jsonb,
	"tags" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "memory_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid,
	"type" "memory_type" NOT NULL,
	"content" text NOT NULL,
	"confidence" real DEFAULT 0.8 NOT NULL,
	"access_count" integer DEFAULT 1 NOT NULL,
	"last_accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_conversation_id" uuid,
	"source_message_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"mode" "alfred_mode",
	"mode_changed" boolean DEFAULT false NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"attachments" jsonb,
	"artifacts" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "project_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"conversation_id" uuid,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"rationale" text NOT NULL,
	"alternatives" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence" real DEFAULT 0.8 NOT NULL,
	"metadata" jsonb,
	"made_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" "project_type" DEFAULT 'web_app' NOT NULL,
	"stack" jsonb,
	"architecture" jsonb,
	"repository_url" varchar(500),
	"repository_branch" varchar(255),
	"last_synced_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "usage_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"period_type" varchar(20) NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"token_count" integer DEFAULT 0 NOT NULL,
	"conversation_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255),
	"external_id" varchar(255),
	"tier" "user_tier" DEFAULT 'free' NOT NULL,
	"default_mode" "alfred_mode" DEFAULT 'builder' NOT NULL,
	"optimize_for" varchar(50) DEFAULT 'clarity' NOT NULL,
	"verbosity" varchar(50) DEFAULT 'minimal' NOT NULL,
	"skill_level" "skill_level" DEFAULT 'inferred' NOT NULL,
	"skill_confidence" real DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_entries" ADD CONSTRAINT "memory_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_entries" ADD CONSTRAINT "memory_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_entries" ADD CONSTRAINT "memory_entries_source_conversation_id_conversations_id_fk" FOREIGN KEY ("source_conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_entries" ADD CONSTRAINT "memory_entries_source_message_id_messages_id_fk" FOREIGN KEY ("source_message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_decisions" ADD CONSTRAINT "project_decisions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_decisions" ADD CONSTRAINT "project_decisions_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_keys_user_id_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_key_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "chunks_document_id_idx" ON "chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "chunks_chunk_type_idx" ON "chunks" USING btree ("chunk_type");--> statement-breakpoint
CREATE INDEX "chunks_chunk_index_idx" ON "chunks" USING btree ("chunk_index");--> statement-breakpoint
CREATE INDEX "conversations_user_id_idx" ON "conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversations_project_id_idx" ON "conversations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "conversations_started_at_idx" ON "conversations" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "conversations_last_message_at_idx" ON "conversations" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "documents_type_idx" ON "documents" USING btree ("type");--> statement-breakpoint
CREATE INDEX "documents_quality_tier_idx" ON "documents" USING btree ("quality_tier");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_content_hash_idx" ON "documents" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "memory_entries_user_id_idx" ON "memory_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "memory_entries_project_id_idx" ON "memory_entries" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "memory_entries_type_idx" ON "memory_entries" USING btree ("type");--> statement-breakpoint
CREATE INDEX "memory_entries_confidence_idx" ON "memory_entries" USING btree ("confidence");--> statement-breakpoint
CREATE INDEX "memory_entries_last_accessed_at_idx" ON "memory_entries" USING btree ("last_accessed_at");--> statement-breakpoint
CREATE INDEX "messages_conversation_id_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "messages_role_idx" ON "messages" USING btree ("role");--> statement-breakpoint
CREATE INDEX "messages_created_at_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "project_decisions_project_id_idx" ON "project_decisions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_decisions_conversation_id_idx" ON "project_decisions" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "project_decisions_made_at_idx" ON "project_decisions" USING btree ("made_at");--> statement-breakpoint
CREATE INDEX "projects_user_id_idx" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "projects_type_idx" ON "projects" USING btree ("type");--> statement-breakpoint
CREATE INDEX "projects_created_at_idx" ON "projects" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_user_name_idx" ON "projects" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "usage_records_user_id_idx" ON "usage_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "usage_records_period_start_idx" ON "usage_records" USING btree ("period_start");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_records_user_period_idx" ON "usage_records" USING btree ("user_id","period_start","period_type");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_external_id_idx" ON "users" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "users_tier_idx" ON "users" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");