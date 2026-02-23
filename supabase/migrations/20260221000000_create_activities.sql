-- Create activities table for caching Strava activities locally
-- Uses Strava activity ID as primary key, scoped by athlete_id

CREATE TABLE IF NOT EXISTS activities (
  id BIGINT PRIMARY KEY,
  athlete_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  sport_type TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  start_date_local TIMESTAMPTZ NOT NULL,
  distance DOUBLE PRECISION NOT NULL DEFAULT 0,
  moving_time INTEGER NOT NULL DEFAULT 0,
  elapsed_time INTEGER NOT NULL DEFAULT 0,
  total_elevation_gain DOUBLE PRECISION NOT NULL DEFAULT 0,
  average_speed DOUBLE PRECISION NOT NULL DEFAULT 0,
  max_speed DOUBLE PRECISION NOT NULL DEFAULT 0,
  average_watts DOUBLE PRECISION,
  max_watts DOUBLE PRECISION,
  weighted_average_watts DOUBLE PRECISION,
  average_heartrate DOUBLE PRECISION,
  max_heartrate DOUBLE PRECISION,
  average_cadence DOUBLE PRECISION,
  suffer_score DOUBLE PRECISION,
  kilojoules DOUBLE PRECISION,

  -- Extended detail data (splits, laps, segments, polyline, etc.)
  details_json JSONB,
  details_fetched_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fetching activities by athlete, sorted by date
CREATE INDEX IF NOT EXISTS idx_activities_athlete_date ON activities(athlete_id, start_date DESC);

-- Enable Row Level Security
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Allow public access (using athlete_id for scoping, same pattern as other tables)
CREATE POLICY "Allow all operations" ON activities
  FOR ALL
  USING (true)
  WITH CHECK (true);
