-- Per-day session-type overrides for the weekly plan. Lets the user swap a
-- planned ride/rest for a different session type (e.g. swap a Z2 ride for
-- an easy run, or move rest from Wednesday to Tuesday). The week's overall
-- phase (recovery/build) still drives the template; this just customizes
-- individual day slots.

CREATE TABLE IF NOT EXISTS plan_day_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id BIGINT NOT NULL,
  week_start DATE NOT NULL,
  day_index SMALLINT NOT NULL CHECK (day_index BETWEEN 0 AND 6),
  session_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(athlete_id, week_start, day_index)
);

CREATE INDEX IF NOT EXISTS idx_plan_day_overrides_athlete_week
  ON plan_day_overrides(athlete_id, week_start);

ALTER TABLE plan_day_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations" ON plan_day_overrides
  FOR ALL USING (true) WITH CHECK (true);
