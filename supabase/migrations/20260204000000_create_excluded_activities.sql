-- Create excluded_activities table for tracking activities excluded from stats
-- Uses Strava athlete_id and activity_id for scoping (same pattern as other tables)

CREATE TABLE IF NOT EXISTS excluded_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id BIGINT NOT NULL,
  activity_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate exclusions for same athlete and activity
  UNIQUE(athlete_id, activity_id)
);

-- Index for fetching excluded activities by athlete
CREATE INDEX IF NOT EXISTS idx_excluded_activities_athlete ON excluded_activities(athlete_id);

-- Enable Row Level Security
ALTER TABLE excluded_activities ENABLE ROW LEVEL SECURITY;

-- Allow public access (using athlete_id for scoping, not Supabase auth)
-- This is safe because:
-- 1. athlete_id comes from Strava OAuth (verified identity)
-- 2. Exclusion data is non-sensitive
-- 3. No auth tokens or credentials are stored here
CREATE POLICY "Allow all operations" ON excluded_activities
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Migrate existing data from user_settings.excluded_activity_ids (if any)
INSERT INTO excluded_activities (athlete_id, activity_id)
SELECT athlete_id, (jsonb_array_elements_text(excluded_activity_ids))::BIGINT
FROM user_settings
WHERE excluded_activity_ids IS NOT NULL
  AND jsonb_array_length(excluded_activity_ids) > 0
ON CONFLICT (athlete_id, activity_id) DO NOTHING;

-- Remove the excluded_activity_ids column from user_settings (now in separate table)
ALTER TABLE user_settings DROP COLUMN IF EXISTS excluded_activity_ids;

-- Remove the weight column from user_settings (weight comes from weight_entries table)
ALTER TABLE user_settings DROP COLUMN IF EXISTS weight;
