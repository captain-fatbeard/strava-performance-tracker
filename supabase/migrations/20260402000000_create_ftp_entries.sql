-- Create ftp_entries table for tracking FTP (Functional Threshold Power) over time
-- Uses Strava athlete_id for scoping (same pattern as weight_entries)

CREATE TABLE IF NOT EXISTS ftp_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id BIGINT NOT NULL,
  ftp INTEGER NOT NULL,
  effective_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One FTP per athlete per date
  UNIQUE(athlete_id, effective_date)
);

-- Index for fetching entries by athlete sorted by date
CREATE INDEX IF NOT EXISTS idx_ftp_entries_athlete_date ON ftp_entries(athlete_id, effective_date DESC);

-- Enable Row Level Security
ALTER TABLE ftp_entries ENABLE ROW LEVEL SECURITY;

-- Allow public access (using athlete_id for scoping, not Supabase auth)
CREATE POLICY "Allow all operations" ON ftp_entries
  FOR ALL
  USING (true)
  WITH CHECK (true);
