-- ============================================================
-- Add audio replay and favorites support to sessions table
-- ============================================================

-- audio_url: S3 URL of the generated audio file (null for focus/breathing sessions)
ALTER TABLE public.sessions
  ADD COLUMN audio_url text;

-- subtitles: JSONB array of {text, start_ms, end_ms} entries for synced display
ALTER TABLE public.sessions
  ADD COLUMN subtitles jsonb;

-- is_favorite: whether the user has bookmarked this session for quick replay
ALTER TABLE public.sessions
  ADD COLUMN is_favorite boolean NOT NULL DEFAULT false;

-- Partial index for fast favorite lookups
CREATE INDEX idx_sessions_favorite
  ON public.sessions(user_id, is_favorite)
  WHERE is_favorite = true;
