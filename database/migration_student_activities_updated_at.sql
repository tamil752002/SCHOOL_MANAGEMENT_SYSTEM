-- Add updated_at to student_activities (fix for "column updated_at does not exist" on add/update activity)
ALTER TABLE student_activities
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Backfill existing rows
UPDATE student_activities SET updated_at = COALESCE(created_at, CURRENT_TIMESTAMP) WHERE updated_at IS NULL;

-- Trigger for updated_at (idempotent)
DROP TRIGGER IF EXISTS update_student_activities_updated_at ON student_activities;
CREATE TRIGGER update_student_activities_updated_at BEFORE UPDATE ON student_activities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
