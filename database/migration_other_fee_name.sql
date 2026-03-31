-- Fee structure student mapping: support multiple "other" fees per student.
-- Each (structure, student, fee_type, other_fee_name) is unique.
-- Run once; safe to re-run (idempotent).

-- 1. Add column if missing
ALTER TABLE fee_structure_student_mapping
ADD COLUMN IF NOT EXISTS other_fee_name VARCHAR(255) NOT NULL DEFAULT '';

-- 2. Drop ALL unique constraints on this table (avoids relying on truncated names)
DO $$
DECLARE
    conname text;
BEGIN
    FOR conname IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'fee_structure_student_mapping'
          AND c.contype = 'u'
    LOOP
        EXECUTE format('ALTER TABLE fee_structure_student_mapping DROP CONSTRAINT %I', conname);
    END LOOP;
END $$;

-- 3. Add the single unique constraint we need (drop first so re-run is safe)
ALTER TABLE fee_structure_student_mapping DROP CONSTRAINT IF EXISTS fee_structure_student_mapping_unique;
ALTER TABLE fee_structure_student_mapping
ADD CONSTRAINT fee_structure_student_mapping_unique
UNIQUE (fee_structure_id, student_id, fee_type, other_fee_name);
