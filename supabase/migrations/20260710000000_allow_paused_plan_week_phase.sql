-- Allow weeks to be marked as paused (plan on hold — no sessions scheduled,
-- nothing counts as missed).
ALTER TABLE plan_week_history DROP CONSTRAINT plan_week_history_phase_check;
ALTER TABLE plan_week_history ADD CONSTRAINT plan_week_history_phase_check
  CHECK (phase IN ('recovery', 'build', 'paused'));
