-- SEO Tables Migration
-- Adds SEO configuration, reports, issues, and assets tables

-- Create SEO-specific enums (if they don't exist)
DO $$ BEGIN
    CREATE TYPE "public"."seo_score_grade" AS ENUM('A+', 'A', 'B', 'C', 'D', 'F');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."seo_issue_severity" AS ENUM('critical', 'warning', 'info', 'success');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."seo_issue_category" AS ENUM('technical', 'content', 'on_page', 'ux', 'schema');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."seo_asset_type" AS ENUM('sitemap', 'robots_txt', 'schema_json');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create seo_configs table
CREATE TABLE IF NOT EXISTS "seo_configs" (
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

-- Create seo_reports table
CREATE TABLE IF NOT EXISTS "seo_reports" (
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

-- Create seo_issues table
CREATE TABLE IF NOT EXISTS "seo_issues" (
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

-- Create seo_assets table
CREATE TABLE IF NOT EXISTS "seo_assets" (
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

-- Add foreign keys (skip if they already exist)
DO $$ BEGIN
    ALTER TABLE "seo_configs" ADD CONSTRAINT "seo_configs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "seo_configs" ADD CONSTRAINT "seo_configs_alfred_project_id_alfred_projects_id_fk" FOREIGN KEY ("alfred_project_id") REFERENCES "public"."alfred_projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "seo_reports" ADD CONSTRAINT "seo_reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "seo_reports" ADD CONSTRAINT "seo_reports_seo_config_id_seo_configs_id_fk" FOREIGN KEY ("seo_config_id") REFERENCES "public"."seo_configs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "seo_issues" ADD CONSTRAINT "seo_issues_report_id_seo_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."seo_reports"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "seo_issues" ADD CONSTRAINT "seo_issues_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "seo_assets" ADD CONSTRAINT "seo_assets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "seo_assets" ADD CONSTRAINT "seo_assets_seo_config_id_seo_configs_id_fk" FOREIGN KEY ("seo_config_id") REFERENCES "public"."seo_configs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "seo_configs_project_id_idx" ON "seo_configs" USING btree ("project_id");
CREATE INDEX IF NOT EXISTS "seo_configs_alfred_project_id_idx" ON "seo_configs" USING btree ("alfred_project_id");
CREATE UNIQUE INDEX IF NOT EXISTS "seo_configs_project_unique_idx" ON "seo_configs" USING btree ("project_id");

CREATE INDEX IF NOT EXISTS "seo_reports_project_id_idx" ON "seo_reports" USING btree ("project_id");
CREATE INDEX IF NOT EXISTS "seo_reports_created_at_idx" ON "seo_reports" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "seo_reports_grade_idx" ON "seo_reports" USING btree ("grade");
CREATE INDEX IF NOT EXISTS "seo_reports_project_created_idx" ON "seo_reports" USING btree ("project_id","created_at");

CREATE INDEX IF NOT EXISTS "seo_issues_report_id_idx" ON "seo_issues" USING btree ("report_id");
CREATE INDEX IF NOT EXISTS "seo_issues_project_id_idx" ON "seo_issues" USING btree ("project_id");
CREATE INDEX IF NOT EXISTS "seo_issues_category_idx" ON "seo_issues" USING btree ("category");
CREATE INDEX IF NOT EXISTS "seo_issues_severity_idx" ON "seo_issues" USING btree ("severity");
CREATE INDEX IF NOT EXISTS "seo_issues_rule_id_idx" ON "seo_issues" USING btree ("rule_id");
CREATE INDEX IF NOT EXISTS "seo_issues_report_severity_idx" ON "seo_issues" USING btree ("report_id","severity");

CREATE INDEX IF NOT EXISTS "seo_assets_project_id_idx" ON "seo_assets" USING btree ("project_id");
CREATE INDEX IF NOT EXISTS "seo_assets_type_idx" ON "seo_assets" USING btree ("asset_type");
CREATE UNIQUE INDEX IF NOT EXISTS "seo_assets_project_type_unique_idx" ON "seo_assets" USING btree ("project_id","asset_type");
