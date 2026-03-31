-- Migration: Teacher and Parent roles, subjects, teachers, timetable, leave, teacher attendance
-- Run after schema.sql (or on existing DB)

-- 1.1 Extend users.role to include teacher and parent
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('developer', 'admin', 'student', 'teacher', 'parent'));

-- 1.2 Add parent_user_id to students (parent links to their children)
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_students_parent_user_id ON students(parent_user_id);

-- 1.4 Subjects table (before teachers - teachers reference subjects)
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_subjects_school ON subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_subjects_is_default ON subjects(is_default);

-- Seed default subjects (only if none exist)
INSERT INTO subjects (name, is_default, school_id)
SELECT v.name, true, NULL FROM (VALUES
  ('Telugu'), ('Hindi'), ('English'), ('Mathematics'), ('Science'),
  ('Social Studies'), ('Physics'), ('Chemistry'), ('Biology')
) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM subjects LIMIT 1);

-- 1.3 Teachers table
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    salary DECIMAL(12, 2),
    join_date DATE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'left')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_school ON teachers(school_id);

-- Teacher-Subject many-to-many
CREATE TABLE IF NOT EXISTS teacher_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(teacher_id, subject_id)
);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_teacher ON teacher_subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_subject ON teacher_subjects(subject_id);

-- Teacher-Classes (which classes teacher teaches; is_incharge for class incharge)
CREATE TABLE IF NOT EXISTS teacher_classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    class_name VARCHAR(50) NOT NULL,
    section VARCHAR(50) NOT NULL DEFAULT 'A',
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    is_incharge BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(teacher_id, school_id, class_name, section)
);
CREATE INDEX IF NOT EXISTS idx_teacher_classes_teacher ON teacher_classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_classes_school ON teacher_classes(school_id);

-- 1.6 Class incharge: add column to classes (nullable FK to teachers)
ALTER TABLE classes ADD COLUMN IF NOT EXISTS class_incharge_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_classes_incharge ON classes(class_incharge_teacher_id);

-- 1.5 Timetable slots
CREATE TABLE IF NOT EXISTS timetable_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    class_name VARCHAR(50) NOT NULL,
    section VARCHAR(50) NOT NULL DEFAULT 'A',
    day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
    session VARCHAR(20) NOT NULL DEFAULT 'morning' CHECK (session IN ('morning', 'afternoon')),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    start_time TIME,
    end_time TIME,
    academic_year VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, class_name, section, day_of_week, session)
);
CREATE INDEX IF NOT EXISTS idx_timetable_school ON timetable_slots(school_id);
CREATE INDEX IF NOT EXISTS idx_timetable_teacher ON timetable_slots(teacher_id);
CREATE INDEX IF NOT EXISTS idx_timetable_class ON timetable_slots(class_name, section, school_id);

-- 1.7 Teacher leave balance
CREATE TABLE IF NOT EXISTS teacher_leave_balance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    leave_type VARCHAR(30) NOT NULL CHECK (leave_type IN ('sick', 'casual', 'loss_of_pay')),
    year SMALLINT NOT NULL,
    allowed INTEGER NOT NULL DEFAULT 0,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(teacher_id, leave_type, year)
);
CREATE INDEX IF NOT EXISTS idx_teacher_leave_balance_teacher ON teacher_leave_balance(teacher_id);

-- Teacher leave applications
CREATE TABLE IF NOT EXISTS teacher_leave_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    leave_type VARCHAR(30) NOT NULL CHECK (leave_type IN ('sick', 'casual', 'loss_of_pay')),
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_teacher_leave_app_teacher ON teacher_leave_applications(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_leave_app_status ON teacher_leave_applications(status);

-- 1.8 Student leave applications (applied by parent)
CREATE TABLE IF NOT EXISTS student_leave_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    leave_type VARCHAR(30) NOT NULL CHECK (leave_type IN ('sick', 'casual')),
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    reason TEXT,
    applied_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_student_leave_app_student ON student_leave_applications(student_id);
CREATE INDEX IF NOT EXISTS idx_student_leave_app_status ON student_leave_applications(status);

-- 1.9 Teacher attendance
CREATE TABLE IF NOT EXISTS teacher_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    session VARCHAR(20) NOT NULL DEFAULT 'morning' CHECK (session IN ('morning', 'afternoon')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent')),
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    marked_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(teacher_id, date, session)
);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_teacher ON teacher_attendance(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_date ON teacher_attendance(date);

-- Triggers for updated_at on new tables
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teacher_classes_updated_at BEFORE UPDATE ON teacher_classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_timetable_slots_updated_at BEFORE UPDATE ON timetable_slots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teacher_leave_balance_updated_at BEFORE UPDATE ON teacher_leave_balance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teacher_leave_applications_updated_at BEFORE UPDATE ON teacher_leave_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_leave_applications_updated_at BEFORE UPDATE ON student_leave_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
