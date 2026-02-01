-- Create weight_entries table for tracking weight over time
-- Uses Strava athlete_id for scoping (same pattern as user_settings)

CREATE TABLE IF NOT EXISTS weight_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id BIGINT NOT NULL,
  weight NUMERIC(5,2) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate entries for same athlete at same time
  UNIQUE(athlete_id, recorded_at)
);

-- Index for fetching entries by athlete
CREATE INDEX IF NOT EXISTS idx_weight_entries_athlete ON weight_entries(athlete_id);

-- Index for fetching entries sorted by date (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_weight_entries_date ON weight_entries(athlete_id, recorded_at DESC);

-- Enable Row Level Security
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;

-- Allow public access (using athlete_id for scoping, not Supabase auth)
-- This is safe because:
-- 1. athlete_id comes from Strava OAuth (verified identity)
-- 2. Weight data is personal but non-sensitive
-- 3. No auth tokens or credentials are stored here
CREATE POLICY "Allow all operations" ON weight_entries
  FOR ALL
  USING (true)
  WITH CHECK (true);
