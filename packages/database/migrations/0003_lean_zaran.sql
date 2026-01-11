CREATE TYPE "public"."persona_archetype" AS ENUM('sage', 'hero', 'creator', 'caregiver', 'ruler', 'jester', 'rebel', 'lover', 'explorer', 'innocent', 'magician', 'outlaw');--> statement-breakpoint
CREATE TYPE "public"."persona_asset_type" AS ENUM('image', 'video', 'audio', 'thumbnail', 'expression');--> statement-breakpoint
CREATE TYPE "public"."persona_interaction_mode" AS ENUM('chat', 'voice', 'video');--> statement-breakpoint
CREATE TYPE "public"."persona_memory_type" AS ENUM('fact', 'preference', 'event', 'belief', 'opinion');--> statement-breakpoint
CREATE TYPE "public"."persona_status" AS ENUM('creating', 'active', 'paused', 'archived', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."persona_visual_style" AS ENUM('pixar_3d', 'arcane_stylized', 'anime_premium', 'hyper_realistic', 'fantasy_epic', 'corporate_professional', 'custom');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid', 'paused');--> statement-breakpoint
CREATE TABLE "persona_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"persona_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"subtype" varchar(50),
	"url" text NOT NULL,
	"thumbnail_url" text,
	"mime_type" varchar(100),
	"size_bytes" integer,
	"width" integer,
	"height" integer,
	"duration_seconds" real,
	"seed" integer,
	"prompt" text,
	"generation_config" jsonb,
	"generation_cost_usd" real,
	"is_primary" boolean DEFAULT false,
	"is_generated" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "persona_embeds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"persona_id" uuid NOT NULL,
	"embed_key" varchar(100) NOT NULL,
	"name" varchar(255),
	"config" jsonb,
	"allowed_domains" jsonb,
	"is_active" boolean DEFAULT true,
	"total_loads" integer DEFAULT 0,
	"total_interactions" integer DEFAULT 0,
	"unique_users" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "persona_embeds_embed_key_unique" UNIQUE("embed_key")
);
--> statement-breakpoint
CREATE TABLE "persona_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"persona_id" uuid NOT NULL,
	"user_id" uuid,
	"session_id" uuid,
	"mode" varchar(20) NOT NULL,
	"user_message" text,
	"persona_response" text,
	"user_emotion_detected" varchar(50),
	"persona_emotion_expressed" varchar(50),
	"input_tokens" integer,
	"output_tokens" integer,
	"duration_seconds" real,
	"llm_cost_usd" real,
	"tts_cost_usd" real,
	"stt_cost_usd" real,
	"video_cost_usd" real,
	"total_cost_usd" real,
	"latency_ms" integer,
	"rating" integer,
	"feedback" text,
	"conversation_context" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "persona_memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"persona_id" uuid NOT NULL,
	"content" text NOT NULL,
	"summary" text,
	"type" varchar(50) NOT NULL,
	"category" varchar(100),
	"embedding" jsonb,
	"embedding_model" varchar(100),
	"importance" real DEFAULT 0.5,
	"confidence" real DEFAULT 0.8,
	"access_count" integer DEFAULT 1,
	"last_accessed_at" timestamp with time zone DEFAULT now(),
	"source_interaction_id" uuid,
	"source_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "persona_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"persona_id" uuid NOT NULL,
	"user_id" uuid,
	"embed_id" uuid,
	"is_active" boolean DEFAULT true,
	"mode" varchar(20),
	"conversation_history" jsonb,
	"message_count" integer DEFAULT 0,
	"current_emotion" varchar(50),
	"total_duration_seconds" real DEFAULT 0,
	"total_cost_usd" real DEFAULT 0,
	"user_agent" text,
	"ip_address" varchar(45),
	"referrer" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "persona_wizard_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"persona_id" uuid,
	"user_id" uuid NOT NULL,
	"current_step" varchar(50) DEFAULT 'spark' NOT NULL,
	"steps_status" jsonb,
	"spark_data" jsonb,
	"visual_data" jsonb,
	"voice_data" jsonb,
	"mind_data" jsonb,
	"motion_data" jsonb,
	"total_cost_usd" real DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "personas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"tagline" varchar(500),
	"description" text,
	"archetype" varchar(50),
	"backstory" text,
	"status" varchar(20) DEFAULT 'creating' NOT NULL,
	"traits" jsonb DEFAULT '[]'::jsonb,
	"temperament" varchar(50),
	"communication_style" varchar(50),
	"speaking_style" jsonb,
	"knowledge_domains" jsonb,
	"visual_style_preset" varchar(50),
	"primary_image_url" text,
	"thumbnail_url" text,
	"identity_embedding" jsonb,
	"style_embedding" jsonb,
	"reference_images" jsonb,
	"expression_grid" jsonb,
	"custom_lora_url" text,
	"visual_seed" integer,
	"voice_provider" varchar(50),
	"voice_id" varchar(100),
	"voice_is_cloned" boolean DEFAULT false,
	"voice_profile" jsonb,
	"motion_style_preset" varchar(50),
	"camera_angle" varchar(50),
	"idle_animation_url" text,
	"system_prompt_template" text,
	"personality_matrix" jsonb,
	"behavior_rules" jsonb,
	"genome" jsonb,
	"memory_enabled" boolean DEFAULT true,
	"memory_config" jsonb,
	"current_mood" varchar(50) DEFAULT 'neutral',
	"energy_level" real DEFAULT 0.5,
	"relationship_level" real DEFAULT 0,
	"last_interaction_at" timestamp with time zone,
	"is_public" boolean DEFAULT false,
	"allow_embed" boolean DEFAULT true,
	"allow_voice" boolean DEFAULT true,
	"allow_video" boolean DEFAULT true,
	"custom_greeting" text,
	"embed_config" jsonb,
	"total_interactions" integer DEFAULT 0,
	"total_chat_messages" integer DEFAULT 0,
	"total_voice_minutes" real DEFAULT 0,
	"total_video_minutes" real DEFAULT 0,
	"total_cost_usd" real DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "artifacts" DROP CONSTRAINT "artifacts_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "files" DROP CONSTRAINT "files_message_id_messages_id_fk";
--> statement-breakpoint
ALTER TABLE "memory_entries" DROP CONSTRAINT "memory_entries_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "project_decisions" DROP CONSTRAINT "project_decisions_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "artifacts" ALTER COLUMN "project_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "project_decisions" ALTER COLUMN "project_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "artifacts" ADD COLUMN "message_id" uuid;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "message_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "vercel_project_id" varchar(255);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "vercel_project_name" varchar(255);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "primary_domain" varchar(255);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "last_deployment_id" varchar(255);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "last_deployment_status" varchar(50);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "last_deployed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "screenshot_url" varchar(500);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_subscription_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_subscription_status" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_price_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_current_period_end" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "persona_assets" ADD CONSTRAINT "persona_assets_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_embeds" ADD CONSTRAINT "persona_embeds_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_interactions" ADD CONSTRAINT "persona_interactions_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_memories" ADD CONSTRAINT "persona_memories_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_sessions" ADD CONSTRAINT "persona_sessions_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_sessions" ADD CONSTRAINT "persona_sessions_embed_id_persona_embeds_id_fk" FOREIGN KEY ("embed_id") REFERENCES "public"."persona_embeds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_wizard_sessions" ADD CONSTRAINT "persona_wizard_sessions_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personas" ADD CONSTRAINT "personas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "persona_assets_persona_id_idx" ON "persona_assets" USING btree ("persona_id");--> statement-breakpoint
CREATE INDEX "persona_assets_type_idx" ON "persona_assets" USING btree ("type");--> statement-breakpoint
CREATE INDEX "persona_assets_subtype_idx" ON "persona_assets" USING btree ("subtype");--> statement-breakpoint
CREATE INDEX "persona_embeds_persona_id_idx" ON "persona_embeds" USING btree ("persona_id");--> statement-breakpoint
CREATE INDEX "persona_embeds_embed_key_idx" ON "persona_embeds" USING btree ("embed_key");--> statement-breakpoint
CREATE INDEX "persona_embeds_is_active_idx" ON "persona_embeds" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "persona_interactions_persona_id_idx" ON "persona_interactions" USING btree ("persona_id");--> statement-breakpoint
CREATE INDEX "persona_interactions_user_id_idx" ON "persona_interactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "persona_interactions_session_id_idx" ON "persona_interactions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "persona_interactions_mode_idx" ON "persona_interactions" USING btree ("mode");--> statement-breakpoint
CREATE INDEX "persona_interactions_created_at_idx" ON "persona_interactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "persona_memories_persona_id_idx" ON "persona_memories" USING btree ("persona_id");--> statement-breakpoint
CREATE INDEX "persona_memories_type_idx" ON "persona_memories" USING btree ("type");--> statement-breakpoint
CREATE INDEX "persona_memories_category_idx" ON "persona_memories" USING btree ("category");--> statement-breakpoint
CREATE INDEX "persona_memories_importance_idx" ON "persona_memories" USING btree ("importance");--> statement-breakpoint
CREATE INDEX "persona_memories_source_user_idx" ON "persona_memories" USING btree ("source_user_id");--> statement-breakpoint
CREATE INDEX "persona_sessions_persona_id_idx" ON "persona_sessions" USING btree ("persona_id");--> statement-breakpoint
CREATE INDEX "persona_sessions_user_id_idx" ON "persona_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "persona_sessions_embed_id_idx" ON "persona_sessions" USING btree ("embed_id");--> statement-breakpoint
CREATE INDEX "persona_sessions_is_active_idx" ON "persona_sessions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "persona_sessions_created_at_idx" ON "persona_sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "persona_wizard_sessions_user_id_idx" ON "persona_wizard_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "persona_wizard_sessions_persona_id_idx" ON "persona_wizard_sessions" USING btree ("persona_id");--> statement-breakpoint
CREATE INDEX "persona_wizard_sessions_current_step_idx" ON "persona_wizard_sessions" USING btree ("current_step");--> statement-breakpoint
CREATE INDEX "personas_user_id_idx" ON "personas" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "personas_slug_idx" ON "personas" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "personas_status_idx" ON "personas" USING btree ("status");--> statement-breakpoint
CREATE INDEX "personas_is_public_idx" ON "personas" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "personas_archetype_idx" ON "personas" USING btree ("archetype");--> statement-breakpoint
CREATE UNIQUE INDEX "personas_user_slug_unique" ON "personas" USING btree ("user_id","slug");--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_entries" ADD CONSTRAINT "memory_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_decisions" ADD CONSTRAINT "project_decisions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_stripe_customer_id_idx" ON "users" USING btree ("stripe_customer_id");