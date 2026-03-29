-- Activity Groups: allows users to merge/group activities so they appear as one
CREATE TABLE IF NOT EXISTS activity_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  activity_ids BIGINT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_groups_athlete ON activity_groups (athlete_id);

-- RLS
ALTER TABLE activity_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON activity_groups FOR ALL USING (true) WITH CHECK (true);
