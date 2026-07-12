-- ============================================================
-- Add UPDATE policy for sessions (was missing from initial schema)
-- Required for toggling is_favorite
-- ============================================================

CREATE POLICY "Users can update own sessions"
  ON public.sessions FOR UPDATE
  USING (auth.uid() = user_id);
