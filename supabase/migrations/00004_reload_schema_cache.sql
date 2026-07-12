-- ============================================================
-- Force PostgREST to reload schema cache after column additions
-- This ensures audio_url, subtitles, is_favorite columns are
-- recognized by the API layer
-- ============================================================

NOTIFY pgrst, 'reload schema';
