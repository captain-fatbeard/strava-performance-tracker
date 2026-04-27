-- Per-week plan-phase override. The auto-detect from TSB/ATL gets retro-
-- evaluated on every load (and can drift when late Strava syncs change the
-- fitness curve), so we persist the user's chosen phase per week. The Plan
-- History view reads this to score each past week against the right
-- template; everything else (adherence, totals, deltas) recomputes from
-- current activity data.

CREATE TABLE IF NOT EXISTS plan_week_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id BIGINT NOT NULL,
  week_start DATE NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('recovery', 'build')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(athlete_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_plan_week_history_athlete
  ON plan_week_history(athlete_id);

ALTER TABLE plan_week_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations" ON plan_week_history
  FOR ALL
  USING (true)
  WITH CHECK (true);
