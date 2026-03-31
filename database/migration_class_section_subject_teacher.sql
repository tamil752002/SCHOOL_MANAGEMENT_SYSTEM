-- Migration: class_section_subject_teacher
-- For class X, section Y, subject Z is taught by teacher T (per school).

CREATE TABLE IF NOT EXISTS class_section_subject_teacher (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    class_name VARCHAR(50) NOT NULL,
    section VARCHAR(50) NOT NULL,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, class_name, section, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_class_section_subject_teacher_school ON class_section_subject_teacher(school_id);
CREATE INDEX IF NOT EXISTS idx_class_section_subject_teacher_class_section ON class_section_subject_teacher(school_id, class_name, section);

CREATE TRIGGER update_class_section_subject_teacher_updated_at
    BEFORE UPDATE ON class_section_subject_teacher
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
