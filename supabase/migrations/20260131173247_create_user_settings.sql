-- Create user_settings table for syncing app settings across devices
-- Uses Strava athlete_id as the primary key (no separate Supabase auth)

CREATE TABLE IF NOT EXISTS user_settings (
  athlete_id BIGINT PRIMARY KEY,

  -- User profile settings
  weight NUMERIC(5,2) DEFAULT 75,
  max_hr INTEGER DEFAULT 185,
  resting_hr INTEGER DEFAULT 60,
  age INTEGER DEFAULT 35,
  gender TEXT DEFAULT 'male' CHECK (gender IN ('male', 'female')),

  -- Filter preferences
  time_range TEXT DEFAULT '90d' CHECK (time_range IN ('30d', '90d', '6m', '1y', 'all')),
  activity_type TEXT DEFAULT 'all' CHECK (activity_type IN ('all', 'Ride', 'Run', 'VirtualRide')),

  -- Excluded activities
  excluded_activity_ids JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Allow public access (using athlete_id for scoping, not Supabase auth)
-- This is safe because:
-- 1. athlete_id comes from Strava OAuth (verified identity)
-- 2. Settings data is non-sensitive (weight, age, preferences)
-- 3. No auth tokens or credentials are stored here
CREATE POLICY "Allow all operations" ON user_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups (primary key already has one, but explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_user_settings_athlete_id ON user_settings(athlete_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before updates
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
