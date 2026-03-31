-- Migration script to add session column to attendance_records table
-- Run this script to update existing database to support morning/afternoon attendance

-- Step 1: Add session column with default value 'morning'
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS session VARCHAR(20) DEFAULT 'morning' CHECK (session IN ('morning', 'afternoon'));

-- Step 2: Update existing records to have 'morning' session (if NULL)
UPDATE attendance_records 
SET session = 'morning' 
WHERE session IS NULL;

-- Step 3: Make session column NOT NULL
ALTER TABLE attendance_records 
ALTER COLUMN session SET NOT NULL;

-- Step 4: Drop old unique constraint
ALTER TABLE attendance_records 
DROP CONSTRAINT IF EXISTS attendance_records_student_id_date_key;

-- Step 5: Add new unique constraint with session
ALTER TABLE attendance_records 
ADD CONSTRAINT attendance_records_student_id_date_session_key UNIQUE (student_id, date, session);

-- Step 6: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance_records(session);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date_session ON attendance_records(student_id, date, session);

