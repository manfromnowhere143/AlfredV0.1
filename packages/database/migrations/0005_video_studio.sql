-- Video Studio Migration: Add video_jobs table and related enums
-- This enables the Video Studio feature for premium video generation

-- Create video job status enum
DO $$ BEGIN
  CREATE TYPE video_job_status AS ENUM (
    'pending',
    'script_polish',
    'voice_generation',
    'video_generation',
    'sound_design',
    'caption_generation',
    'final_render',
    'completed',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create video format enum
DO $$ BEGIN
  CREATE TYPE video_format AS ENUM (
    'tiktok_vertical',
    'instagram_reel',
    'instagram_square',
    'youtube_short',
    'youtube_standard',
    'twitter_video',
    'custom'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create video quality enum
DO $$ BEGIN
  CREATE TYPE video_quality AS ENUM (
    'draft',
    'standard',
    'premium',
    'cinematic'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create video_jobs table
CREATE TABLE IF NOT EXISTS video_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Job identification
  title VARCHAR(255),
  description TEXT,

  -- Status tracking
  status video_job_status NOT NULL DEFAULT 'pending',
  current_step VARCHAR(50),
  progress REAL DEFAULT 0,
  error TEXT,

  -- Input configuration
  format video_format NOT NULL DEFAULT 'tiktok_vertical',
  quality video_quality NOT NULL DEFAULT 'standard',
  duration_target INTEGER,

  -- Script stage
  raw_script TEXT,
  polished_script TEXT,
  script_emotion VARCHAR(50),
  script_metadata JSONB,

  -- Voice stage
  voice_audio_url TEXT,
  voice_audio_duration REAL,
  voice_metadata JSONB,

  -- Video stage (talking head)
  talking_video_url TEXT,
  talking_video_metadata JSONB,

  -- Sound design stage
  background_music_url TEXT,
  background_music_volume REAL DEFAULT 0.15,
  ambience_url TEXT,
  ambience_volume REAL DEFAULT 0.1,
  sfx_tracks JSONB,
  sound_design_metadata JSONB,

  -- Caption stage
  captions JSONB,
  caption_style VARCHAR(50) DEFAULT 'tiktok',
  caption_metadata JSONB,

  -- Final render
  final_video_url TEXT,
  thumbnail_url TEXT,
  preview_gif_url TEXT,
  final_metadata JSONB,

  -- Cost tracking
  script_cost_usd REAL DEFAULT 0,
  voice_cost_usd REAL DEFAULT 0,
  video_cost_usd REAL DEFAULT 0,
  sound_cost_usd REAL DEFAULT 0,
  render_cost_usd REAL DEFAULT 0,
  total_cost_usd REAL DEFAULT 0,

  -- Timing
  estimated_duration_ms INTEGER,
  actual_duration_ms INTEGER,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for video_jobs
CREATE INDEX IF NOT EXISTS video_jobs_persona_id_idx ON video_jobs(persona_id);
CREATE INDEX IF NOT EXISTS video_jobs_user_id_idx ON video_jobs(user_id);
CREATE INDEX IF NOT EXISTS video_jobs_status_idx ON video_jobs(status);
CREATE INDEX IF NOT EXISTS video_jobs_created_at_idx ON video_jobs(created_at);

-- Add comment
COMMENT ON TABLE video_jobs IS 'Video Studio jobs for premium video generation with full pipeline tracking';
