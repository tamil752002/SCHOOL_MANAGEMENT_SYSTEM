-- Optional: prevent duplicate mark entries per exam, student, and subject.
-- Only applies when exam_id is set (partial unique index).
-- Run after resolving any existing duplicates if present.

CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_records_unique_per_exam_student_subject
ON exam_records (exam_id, student_id, subject)
WHERE exam_id IS NOT NULL;
