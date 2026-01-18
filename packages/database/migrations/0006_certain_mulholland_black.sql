CREATE TYPE "public"."domain_purchase_status" AS ENUM('pending_payment', 'payment_completed', 'purchasing', 'completed', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."file_status_build" AS ENUM('pristine', 'modified', 'error', 'building', 'ready');--> statement-breakpoint
CREATE TYPE "public"."preview_engine" AS ENUM('esbuild', 'sandpack', 'webcontainer', 'pyodide', 'reactflow', 'mermaid', 'markdown', 'json', 'iframe', 'terminal', 'none');--> statement-breakpoint
CREATE TYPE "public"."project_file_type" AS ENUM('component', 'page', 'style', 'config', 'script', 'python', 'data', 'asset', 'test', 'agent', 'workflow', 'documentation', 'other');--> statement-breakpoint
CREATE TYPE "public"."project_framework" AS ENUM('react', 'vue', 'svelte', 'nextjs', 'python', 'node', 'agent', 'workflow', 'static', 'custom');--> statement-breakpoint
CREATE TYPE "public"."seo_asset_type" AS ENUM('sitemap', 'robots_txt', 'schema_json');--> statement-breakpoint
CREATE TYPE "public"."seo_issue_category" AS ENUM('technical', 'content', 'on_page', 'ux', 'schema');--> statement-breakpoint
CREATE TYPE "public"."seo_issue_severity" AS ENUM('critical', 'warning', 'info', 'success');--> statement-breakpoint
CREATE TYPE "public"."seo_score_grade" AS ENUM('A+', 'A', 'B', 'C', 'D', 'F');--> statement-breakpoint
CREATE TYPE "public"."video_format" AS ENUM('tiktok_vertical', 'instagram_reel', 'instagram_square', 'youtube_short', 'youtube_standard', 'twitter_video', 'custom');--> statement-breakpoint
CREATE TYPE "public"."video_job_status" AS ENUM('pending', 'script_polish', 'voice_generation', 'video_generation', 'sound_design', 'caption_generation', 'final_render', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."video_quality" AS ENUM('draft', 'standard', 'premium', 'cinematic');--> statement-breakpoint
CREATE TABLE "alfred_project_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alfred_project_id" uuid NOT NULL,
	"path" varchar(500) NOT NULL,
	"name" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"language" varchar(50) NOT NULL,
	"file_type" "project_file_type" DEFAULT 'component' NOT NULL,
	"size" integer DEFAULT 0 NOT NULL,
	"line_count" integer DEFAULT 0 NOT NULL,
	"status" "file_status_build" DEFAULT 'pristine' NOT NULL,
	"errors" jsonb,
	"is_entry_point" boolean DEFAULT false NOT NULL,
	"preview_engine" "preview_engine",
	"preview_config" jsonb,
	"exports" jsonb,
	"imports" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"generated_by" varchar(50),
	"generation_prompt" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "alfred_project_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alfred_project_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"name" varchar(255),
	"description" text,
	"files" jsonb NOT NULL,
	"dependencies" jsonb,
	"dev_dependencies" jsonb,
	"build_config" jsonb,
	"file_count" integer NOT NULL,
	"total_size" integer NOT NULL,
	"triggered_by" varchar(50) NOT NULL,
	"message_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alfred_project_templates" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(50) NOT NULL,
	"framework" "project_framework" NOT NULL,
	"preview_engine" "preview_engine" NOT NULL,
	"files" jsonb NOT NULL,
	"dependencies" jsonb NOT NULL,
	"dev_dependencies" jsonb NOT NULL,
	"build_config" jsonb,
	"thumbnail_url" text,
	"showcase_url" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"star_count" integer DEFAULT 0 NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"version" varchar(50) DEFAULT '1.0.0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alfred_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"conversation_id" uuid,
	"project_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"framework" "project_framework" DEFAULT 'react' NOT NULL,
	"entry_point" varchar(255) DEFAULT '/src/App.tsx' NOT NULL,
	"preview_engine" "preview_engine" DEFAULT 'esbuild' NOT NULL,
	"dependencies" jsonb DEFAULT '{}'::jsonb,
	"dev_dependencies" jsonb DEFAULT '{}'::jsonb,
	"build_config" jsonb,
	"preview_config" jsonb,
	"template_id" varchar(100),
	"template_version" varchar(50),
	"file_count" integer DEFAULT 0 NOT NULL,
	"total_size" integer DEFAULT 0 NOT NULL,
	"last_build_at" timestamp with time zone,
	"last_build_status" varchar(20),
	"last_build_error" text,
	"version" integer DEFAULT 1 NOT NULL,
	"snapshot_count" integer DEFAULT 0 NOT NULL,
	"deployed_url" varchar(500),
	"last_deployed_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "domain_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"domain" varchar(255) NOT NULL,
	"tld" varchar(50) NOT NULL,
	"vercel_price_cents" integer NOT NULL,
	"alfred_fee_cents" integer DEFAULT 0 NOT NULL,
	"total_price_cents" integer NOT NULL,
	"years" integer DEFAULT 1 NOT NULL,
	"status" "domain_purchase_status" DEFAULT 'pending_payment' NOT NULL,
	"status_message" text,
	"stripe_checkout_session_id" varchar(255),
	"stripe_payment_intent_id" varchar(255),
	"stripe_paid_at" timestamp with time zone,
	"vercel_order_id" varchar(255),
	"vercel_purchased_at" timestamp with time zone,
	"project_id" uuid,
	"vercel_project_id" varchar(255),
	"auto_renew" boolean DEFAULT true NOT NULL,
	"last_error" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "seo_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"seo_config_id" uuid,
	"asset_type" "seo_asset_type" NOT NULL,
	"content" text NOT NULL,
	"content_hash" varchar(64),
	"file_name" varchar(255) NOT NULL,
	"mime_type" varchar(100),
	"file_size" integer,
	"is_active" boolean DEFAULT true,
	"last_deployed_at" timestamp with time zone,
	"generated_by" varchar(50) DEFAULT 'system',
	"generation_prompt" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"alfred_project_id" uuid,
	"site_title" varchar(70),
	"site_description" varchar(160),
	"canonical_url" varchar(500),
	"og_image" text,
	"og_title" varchar(70),
	"og_description" varchar(200),
	"og_type" varchar(50) DEFAULT 'website',
	"og_site_name" varchar(100),
	"twitter_card" varchar(50) DEFAULT 'summary_large_image',
	"twitter_site" varchar(50),
	"twitter_creator" varchar(50),
	"focus_keywords" jsonb DEFAULT '[]'::jsonb,
	"secondary_keywords" jsonb DEFAULT '[]'::jsonb,
	"auto_generate_meta" boolean DEFAULT true,
	"auto_generate_alt_text" boolean DEFAULT true,
	"auto_generate_schema" boolean DEFAULT true,
	"auto_fix_issues" boolean DEFAULT false,
	"include_sitemap" boolean DEFAULT true,
	"include_robots_txt" boolean DEFAULT true,
	"robots_txt_content" text,
	"schema_type" varchar(50) DEFAULT 'WebSite',
	"schema_data" jsonb,
	"favicon_url" text,
	"apple_touch_icon_url" text,
	"language" varchar(10) DEFAULT 'en',
	"locale" varchar(10) DEFAULT 'en_US',
	"allow_indexing" boolean DEFAULT true,
	"allow_following" boolean DEFAULT true,
	"last_score" integer,
	"last_grade" "seo_score_grade",
	"last_analyzed_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"rule_id" varchar(100) NOT NULL,
	"rule_name" varchar(255) NOT NULL,
	"category" "seo_issue_category" NOT NULL,
	"severity" "seo_issue_severity" NOT NULL,
	"message" text NOT NULL,
	"description" text,
	"suggestion" text,
	"file_path" varchar(500),
	"line_number" integer,
	"selector" varchar(255),
	"element" text,
	"current_value" text,
	"expected_value" text,
	"is_auto_fixable" boolean DEFAULT false,
	"auto_fix_code" text,
	"was_auto_fixed" boolean DEFAULT false,
	"score_impact" integer DEFAULT 0,
	"weight" real DEFAULT 1,
	"learn_more_url" varchar(500),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"seo_config_id" uuid,
	"overall_score" integer NOT NULL,
	"grade" "seo_score_grade" NOT NULL,
	"technical_score" integer NOT NULL,
	"content_score" integer NOT NULL,
	"on_page_score" integer NOT NULL,
	"ux_score" integer NOT NULL,
	"schema_score" integer NOT NULL,
	"total_issues" integer DEFAULT 0 NOT NULL,
	"critical_count" integer DEFAULT 0 NOT NULL,
	"warning_count" integer DEFAULT 0 NOT NULL,
	"info_count" integer DEFAULT 0 NOT NULL,
	"passed_count" integer DEFAULT 0 NOT NULL,
	"analyzed_url" varchar(500),
	"analyzed_files" jsonb,
	"analysis_version" varchar(20) DEFAULT '1.0.0',
	"analysis_time" integer,
	"auto_fixes_applied" integer DEFAULT 0,
	"auto_fixes_available" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"persona_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255),
	"description" text,
	"status" "video_job_status" DEFAULT 'pending' NOT NULL,
	"current_step" varchar(50),
	"progress" real DEFAULT 0,
	"error" text,
	"format" "video_format" DEFAULT 'tiktok_vertical' NOT NULL,
	"quality" "video_quality" DEFAULT 'standard' NOT NULL,
	"duration_target" integer,
	"raw_script" text,
	"polished_script" text,
	"script_emotion" varchar(50),
	"script_metadata" jsonb,
	"voice_audio_url" text,
	"voice_audio_duration" real,
	"voice_metadata" jsonb,
	"talking_video_url" text,
	"talking_video_metadata" jsonb,
	"background_music_url" text,
	"background_music_volume" real DEFAULT 0.15,
	"ambience_url" text,
	"ambience_volume" real DEFAULT 0.1,
	"sfx_tracks" jsonb,
	"sound_design_metadata" jsonb,
	"captions" jsonb,
	"caption_style" varchar(50) DEFAULT 'tiktok',
	"caption_metadata" jsonb,
	"final_video_url" text,
	"thumbnail_url" text,
	"preview_gif_url" text,
	"final_metadata" jsonb,
	"script_cost_usd" real DEFAULT 0,
	"voice_cost_usd" real DEFAULT 0,
	"video_cost_usd" real DEFAULT 0,
	"sound_cost_usd" real DEFAULT 0,
	"render_cost_usd" real DEFAULT 0,
	"total_cost_usd" real DEFAULT 0,
	"estimated_duration_ms" integer,
	"actual_duration_ms" integer,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "personas" ADD COLUMN "idle_video_url" text;--> statement-breakpoint
ALTER TABLE "alfred_project_files" ADD CONSTRAINT "alfred_project_files_alfred_project_id_alfred_projects_id_fk" FOREIGN KEY ("alfred_project_id") REFERENCES "public"."alfred_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alfred_project_snapshots" ADD CONSTRAINT "alfred_project_snapshots_alfred_project_id_alfred_projects_id_fk" FOREIGN KEY ("alfred_project_id") REFERENCES "public"."alfred_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alfred_projects" ADD CONSTRAINT "alfred_projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alfred_projects" ADD CONSTRAINT "alfred_projects_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alfred_projects" ADD CONSTRAINT "alfred_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_purchases" ADD CONSTRAINT "domain_purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_purchases" ADD CONSTRAINT "domain_purchases_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_assets" ADD CONSTRAINT "seo_assets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_assets" ADD CONSTRAINT "seo_assets_seo_config_id_seo_configs_id_fk" FOREIGN KEY ("seo_config_id") REFERENCES "public"."seo_configs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_configs" ADD CONSTRAINT "seo_configs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_configs" ADD CONSTRAINT "seo_configs_alfred_project_id_alfred_projects_id_fk" FOREIGN KEY ("alfred_project_id") REFERENCES "public"."alfred_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_issues" ADD CONSTRAINT "seo_issues_report_id_seo_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."seo_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_issues" ADD CONSTRAINT "seo_issues_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_reports" ADD CONSTRAINT "seo_reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_reports" ADD CONSTRAINT "seo_reports_seo_config_id_seo_configs_id_fk" FOREIGN KEY ("seo_config_id") REFERENCES "public"."seo_configs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD CONSTRAINT "video_jobs_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD CONSTRAINT "video_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alfred_project_files_project_id_idx" ON "alfred_project_files" USING btree ("alfred_project_id");--> statement-breakpoint
CREATE INDEX "alfred_project_files_path_idx" ON "alfred_project_files" USING btree ("path");--> statement-breakpoint
CREATE INDEX "alfred_project_files_file_type_idx" ON "alfred_project_files" USING btree ("file_type");--> statement-breakpoint
CREATE INDEX "alfred_project_files_status_idx" ON "alfred_project_files" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "alfred_project_files_unique_path" ON "alfred_project_files" USING btree ("alfred_project_id","path");--> statement-breakpoint
CREATE INDEX "alfred_project_snapshots_project_id_idx" ON "alfred_project_snapshots" USING btree ("alfred_project_id");--> statement-breakpoint
CREATE INDEX "alfred_project_snapshots_version_idx" ON "alfred_project_snapshots" USING btree ("version");--> statement-breakpoint
CREATE INDEX "alfred_project_snapshots_created_at_idx" ON "alfred_project_snapshots" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "alfred_project_snapshots_unique_version" ON "alfred_project_snapshots" USING btree ("alfred_project_id","version");--> statement-breakpoint
CREATE INDEX "alfred_project_templates_framework_idx" ON "alfred_project_templates" USING btree ("framework");--> statement-breakpoint
CREATE INDEX "alfred_project_templates_category_idx" ON "alfred_project_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "alfred_project_templates_is_public_idx" ON "alfred_project_templates" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "alfred_project_templates_is_featured_idx" ON "alfred_project_templates" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "alfred_projects_user_id_idx" ON "alfred_projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "alfred_projects_conversation_id_idx" ON "alfred_projects" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "alfred_projects_framework_idx" ON "alfred_projects" USING btree ("framework");--> statement-breakpoint
CREATE INDEX "alfred_projects_created_at_idx" ON "alfred_projects" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "alfred_projects_name_idx" ON "alfred_projects" USING btree ("name");--> statement-breakpoint
CREATE INDEX "domain_purchases_user_id_idx" ON "domain_purchases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "domain_purchases_domain_idx" ON "domain_purchases" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "domain_purchases_status_idx" ON "domain_purchases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "domain_purchases_stripe_session_idx" ON "domain_purchases" USING btree ("stripe_checkout_session_id");--> statement-breakpoint
CREATE INDEX "domain_purchases_project_id_idx" ON "domain_purchases" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "domain_purchases_created_at_idx" ON "domain_purchases" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "seo_assets_project_id_idx" ON "seo_assets" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "seo_assets_type_idx" ON "seo_assets" USING btree ("asset_type");--> statement-breakpoint
CREATE UNIQUE INDEX "seo_assets_project_type_unique_idx" ON "seo_assets" USING btree ("project_id","asset_type");--> statement-breakpoint
CREATE INDEX "seo_configs_project_id_idx" ON "seo_configs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "seo_configs_alfred_project_id_idx" ON "seo_configs" USING btree ("alfred_project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seo_configs_project_unique_idx" ON "seo_configs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "seo_issues_report_id_idx" ON "seo_issues" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "seo_issues_project_id_idx" ON "seo_issues" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "seo_issues_category_idx" ON "seo_issues" USING btree ("category");--> statement-breakpoint
CREATE INDEX "seo_issues_severity_idx" ON "seo_issues" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "seo_issues_rule_id_idx" ON "seo_issues" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "seo_issues_report_severity_idx" ON "seo_issues" USING btree ("report_id","severity");--> statement-breakpoint
CREATE INDEX "seo_reports_project_id_idx" ON "seo_reports" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "seo_reports_created_at_idx" ON "seo_reports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "seo_reports_grade_idx" ON "seo_reports" USING btree ("grade");--> statement-breakpoint
CREATE INDEX "seo_reports_project_created_idx" ON "seo_reports" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "video_jobs_persona_id_idx" ON "video_jobs" USING btree ("persona_id");--> statement-breakpoint
CREATE INDEX "video_jobs_user_id_idx" ON "video_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "video_jobs_status_idx" ON "video_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "video_jobs_created_at_idx" ON "video_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "video_jobs_persona_status_idx" ON "video_jobs" USING btree ("persona_id","status","created_at");--> statement-breakpoint
CREATE INDEX "artifacts_conversation_created_idx" ON "artifacts" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "conversations_user_updated_idx" ON "conversations" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "files_user_created_idx" ON "files" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_conversation_created_idx" ON "messages" USING btree ("conversation_id","created_at");