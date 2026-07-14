-- ============================================================
-- Unblock Focus — Add payment & subscription fields to profiles
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS polar_customer_id text,
  ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status text,
  ADD COLUMN IF NOT EXISTS subscription_id text,
  ADD COLUMN IF NOT EXISTS credits integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS credits_reset_at timestamptz;

-- Backfill existing profiles with default 3 credits
UPDATE public.profiles
SET credits = 3
WHERE credits IS NULL;

-- Index for Polar customer lookup during webhook processing
CREATE INDEX IF NOT EXISTS idx_profiles_polar_customer_id
  ON public.profiles(polar_customer_id);

-- ============================================================
-- RPC functions for atomic credit deduction and refund
-- ============================================================

-- Atomically deduct 1 credit if the user has credits remaining.
-- Returns TRUE if deduction succeeded, FALSE if no credits left.
CREATE OR REPLACE FUNCTION public.deduct_credit(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rows_affected integer;
BEGIN
  UPDATE public.profiles
  SET credits = credits - 1
  WHERE id = user_uuid AND credits > 0;

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$;

-- Refund 1 credit (used when generation fails after deduction).
CREATE OR REPLACE FUNCTION public.refund_credit(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET credits = credits + 1
  WHERE id = user_uuid;
END;
$$;

