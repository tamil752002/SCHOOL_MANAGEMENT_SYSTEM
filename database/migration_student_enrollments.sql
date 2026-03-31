-- Migration: student_enrollments table + teachers.left_at
-- Run after schema has students, schools, settings.

-- ============================================
-- STUDENT ENROLLMENTS (academic-year-scoped)
-- ============================================

CREATE TABLE IF NOT EXISTS student_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    academic_year VARCHAR(20) NOT NULL,
    class_name VARCHAR(50) NOT NULL,
    section VARCHAR(50) NOT NULL DEFAULT 'A',
    enrollment_type VARCHAR(30) NOT NULL DEFAULT 'promoted'
        CHECK (enrollment_type IN ('new_admission', 'promoted', 'readmission', 'transfer_in')),
    enrolled_at DATE DEFAULT CURRENT_DATE,
    left_at DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, student_id, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_school_year ON student_enrollments(school_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_student ON student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_academic_year ON student_enrollments(academic_year);

-- ============================================
-- TEACHERS: add left_at for leave/rejoin
-- ============================================

ALTER TABLE teachers ADD COLUMN IF NOT EXISTS left_at DATE;

-- ============================================
-- BACKFILL: one enrollment per student for current academic year
-- ============================================

INSERT INTO student_enrollments (id, school_id, student_id, academic_year, class_name, section, enrollment_type, enrolled_at)
SELECT
    uuid_generate_v4(),
    s.school_id,
    s.id,
    COALESCE(st.current_academic_year, '2024-25'),
    COALESCE(NULLIF(TRIM(s.student_class), ''), '1'),
    COALESCE(NULLIF(TRIM(s.section), ''), 'A'),
    'promoted',
    CURRENT_DATE
FROM students s
LEFT JOIN settings st ON st.school_id = s.school_id
WHERE s.school_id IS NOT NULL
  AND COALESCE(NULLIF(TRIM(s.student_class), ''), '1') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM student_enrollments se
    WHERE se.school_id = s.school_id AND se.student_id = s.id
      AND se.academic_year = COALESCE(st.current_academic_year, '2024-25')
  )
ON CONFLICT (school_id, student_id, academic_year) DO NOTHING;
