-- Add image column to inventory table if it doesn't exist
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS image TEXT;

-- Reload schema cache to ensure PostgREST picks up the new column
NOTIFY pgrst, 'reload schema';
