-- School Management System - PostgreSQL Database Schema
-- Single users table for all user types with role-specific tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE USER MANAGEMENT
-- ============================================

-- Single users table - source of truth for all users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('developer', 'admin', 'student', 'teacher', 'parent')),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone_number VARCHAR(20),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Indexes for users table
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- ============================================
-- SCHOOLS
-- ============================================

CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    contact_number VARCHAR(20),
    email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
    student_user_id_prefix VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_schools_status ON schools(status);

-- ============================================
-- DEVELOPERS (references users)
-- ============================================

CREATE TABLE developers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ADMINS (references users and schools)
-- ============================================

CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admins_user_id ON admins(user_id);
CREATE INDEX idx_admins_school_id ON admins(school_id);

-- ============================================
-- STUDENTS (references users and schools)
-- ============================================

CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    admission_number VARCHAR(100) NOT NULL,
    admission_date DATE,
    first_name VARCHAR(255) NOT NULL,
    middle_name VARCHAR(255),
    last_name VARCHAR(255),
    student_aadhar VARCHAR(20),
    father_name VARCHAR(255),
    father_aadhar VARCHAR(20),
    mother_name VARCHAR(255),
    mother_aadhar VARCHAR(20),
    student_class VARCHAR(50),
    section VARCHAR(50),
    medium VARCHAR(50),
    date_of_birth DATE,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
    location TEXT,
    address TEXT,
    admission_class VARCHAR(50),
    mobile_number VARCHAR(20),
    parent_mobile VARCHAR(20),
    pen_number VARCHAR(50),
    caste VARCHAR(100),
    sub_caste VARCHAR(100),
    religion VARCHAR(100),
    mother_tongue VARCHAR(100),
    profile_photo TEXT,
    email_address VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'transferred', 'graduated')),
    parent_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, admission_number)
);

CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_parent_user_id ON students(parent_user_id);
CREATE INDEX idx_students_school_id ON students(school_id);
CREATE INDEX idx_students_admission_number ON students(admission_number);
CREATE INDEX idx_students_class ON students(student_class);
CREATE INDEX idx_students_status ON students(status);

-- ============================================
-- STUDENT ENROLLMENTS (academic-year-scoped)
-- ============================================

CREATE TABLE student_enrollments (
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

CREATE INDEX idx_student_enrollments_school_year ON student_enrollments(school_id, academic_year);
CREATE INDEX idx_student_enrollments_student ON student_enrollments(student_id);
CREATE INDEX idx_student_enrollments_academic_year ON student_enrollments(academic_year);

-- ============================================
-- ATTENDANCE
-- ============================================

CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    session VARCHAR(20) NOT NULL DEFAULT 'morning' CHECK (session IN ('morning', 'afternoon')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent')),
    marked_by UUID REFERENCES users(id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, date, session)
);

CREATE INDEX idx_attendance_student_id ON attendance_records(student_id);
CREATE INDEX idx_attendance_date ON attendance_records(date);
CREATE INDEX idx_attendance_session ON attendance_records(session);
CREATE INDEX idx_attendance_student_date_session ON attendance_records(student_id, date, session);

-- ============================================
-- FEES (new schema: curriculum + semi-curriculum, fee records with overpayment-safe rules)
-- ============================================

CREATE TABLE fee_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    class_name VARCHAR(50) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    structure_type VARCHAR(20) NOT NULL DEFAULT 'curriculum' CHECK (structure_type IN ('curriculum', 'semi_curriculum')),
    tuition_fee DECIMAL(10, 2) DEFAULT 0,
    school_fee DECIMAL(10, 2) DEFAULT 0,
    exam_fee DECIMAL(10, 2) DEFAULT 0,
    van_fee DECIMAL(10, 2) DEFAULT 0,
    books_fee DECIMAL(10, 2) DEFAULT 0,
    uniform_fee DECIMAL(10, 2) DEFAULT 0,
    other_fees JSONB DEFAULT '[]', -- array of { name, amount }
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(class_name, academic_year, structure_type, school_id)
);

CREATE INDEX idx_fee_structures_class ON fee_structures(class_name, academic_year);
CREATE INDEX idx_fee_structures_school ON fee_structures(school_id);
CREATE INDEX idx_fee_structures_type ON fee_structures(structure_type);

CREATE TABLE fee_structure_student_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fee_structure_id UUID NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    fee_type VARCHAR(50) NOT NULL CHECK (fee_type IN ('books', 'uniform', 'van', 'other')),
    other_fee_name VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fee_structure_id, student_id, fee_type, other_fee_name)
);

CREATE INDEX idx_fee_mapping_structure ON fee_structure_student_mapping(fee_structure_id);
CREATE INDEX idx_fee_mapping_student ON fee_structure_student_mapping(student_id);
CREATE INDEX idx_fee_mapping_fee_type ON fee_structure_student_mapping(fee_type);

-- One row per student per fee line per academic year. For fee_type = 'other', other_fee_name identifies the fee.
-- amount = current due from structure (admin value); paid_amount = total paid. When amount is reduced below paid_amount, excess is allocated to other pending fees via fee_overpayment_allocations.
CREATE TABLE fee_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    fee_type VARCHAR(50) NOT NULL CHECK (fee_type IN ('tuition', 'school', 'exam', 'van', 'uniform', 'books', 'other')),
    other_fee_name VARCHAR(255) NOT NULL DEFAULT '',
    amount DECIMAL(10, 2) NOT NULL,
    paid_amount DECIMAL(10, 2) DEFAULT 0,
    remaining_fee DECIMAL(10, 2) GENERATED ALWAYS AS (amount - paid_amount) STORED,
    due_date DATE,
    paid_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue', 'partial')),
    receipt_number VARCHAR(100),
    description TEXT,
    academic_year VARCHAR(20) NOT NULL,
    collected_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, fee_type, academic_year, other_fee_name)
);

CREATE INDEX idx_fee_records_student_id ON fee_records(student_id);
CREATE INDEX idx_fee_records_status ON fee_records(status);
CREATE INDEX idx_fee_records_academic_year ON fee_records(academic_year);
CREATE INDEX idx_fee_records_fee_type ON fee_records(fee_type);

-- Overpayment allocations: when admin reduces a fee and student had paid more, excess is applied to other pending fees
CREATE TABLE fee_overpayment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_fee_record_id UUID NOT NULL REFERENCES fee_records(id) ON DELETE CASCADE,
    to_fee_record_id UUID NOT NULL REFERENCES fee_records(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fee_overpayment_from ON fee_overpayment_allocations(from_fee_record_id);
CREATE INDEX idx_fee_overpayment_to ON fee_overpayment_allocations(to_fee_record_id);

-- ============================================
-- EXAMS
-- ============================================

CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    type VARCHAR(50),
    class_name VARCHAR(50) NOT NULL,
    subjects JSONB,
    start_date DATE,
    end_date DATE,
    academic_year VARCHAR(20),
    total_marks INTEGER,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    schedule JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_exams_class ON exams(class_name);
CREATE INDEX idx_exams_school ON exams(school_id);
CREATE INDEX idx_exams_academic_year ON exams(academic_year);

CREATE TABLE exam_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    exam_type VARCHAR(50),
    subject VARCHAR(100),
    subject_id VARCHAR(100),
    max_marks INTEGER NOT NULL,
    obtained_marks INTEGER NOT NULL,
    grade VARCHAR(10),
    date DATE,
    academic_year VARCHAR(20),
    remarks TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'scored', 'absent')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_exam_records_student_id ON exam_records(student_id);
CREATE INDEX idx_exam_records_exam_id ON exam_records(exam_id);
CREATE INDEX idx_exam_records_subject ON exam_records(subject);

-- ============================================
-- STUDENT ACTIVITIES
-- ============================================

CREATE TABLE student_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('positive', 'negative')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    recorded_by UUID REFERENCES users(id),
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activities_student_id ON student_activities(student_id);
CREATE INDEX idx_activities_type ON student_activities(type);
CREATE INDEX idx_activities_date ON student_activities(date);

-- ============================================
-- CLASSES
-- ============================================

CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    sections JSONB, -- Array of section names
    medium JSONB, -- Array of medium names
    class_teacher VARCHAR(255),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, school_id)
);

CREATE INDEX idx_classes_school ON classes(school_id);

-- ============================================
-- SUBJECTS (referenced by teachers and timetable)
-- ============================================

CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_subjects_school ON subjects(school_id);
CREATE INDEX idx_subjects_is_default ON subjects(is_default);

-- ============================================
-- TEACHERS (references users and schools)
-- ============================================

CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    salary DECIMAL(12, 2),
    join_date DATE,
    left_at DATE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'left')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_teachers_user_id ON teachers(user_id);
CREATE INDEX idx_teachers_school ON teachers(school_id);

CREATE TABLE teacher_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(teacher_id, subject_id)
);
CREATE INDEX idx_teacher_subjects_teacher ON teacher_subjects(teacher_id);
CREATE INDEX idx_teacher_subjects_subject ON teacher_subjects(subject_id);

CREATE TABLE teacher_classes (
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
CREATE INDEX idx_teacher_classes_teacher ON teacher_classes(teacher_id);
CREATE INDEX idx_teacher_classes_school ON teacher_classes(school_id);

ALTER TABLE classes ADD COLUMN class_incharge_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL;
CREATE INDEX idx_classes_incharge ON classes(class_incharge_teacher_id);

-- ============================================
-- TIMETABLE SLOTS
-- ============================================

-- Indian school: 4 periods morning + 4 periods afternoon per day (period 1-4 per session)
CREATE TABLE timetable_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    class_name VARCHAR(50) NOT NULL,
    section VARCHAR(50) NOT NULL DEFAULT 'A',
    day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
    session VARCHAR(20) NOT NULL DEFAULT 'morning' CHECK (session IN ('morning', 'afternoon')),
    period SMALLINT NOT NULL DEFAULT 1 CHECK (period >= 1 AND period <= 4),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    start_time TIME,
    end_time TIME,
    academic_year VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, class_name, section, day_of_week, session, period)
);
CREATE INDEX idx_timetable_school ON timetable_slots(school_id);
CREATE INDEX idx_timetable_teacher ON timetable_slots(teacher_id);
CREATE INDEX idx_timetable_class ON timetable_slots(class_name, section, school_id);

-- ============================================
-- TEACHER LEAVE
-- ============================================

CREATE TABLE teacher_leave_balance (
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
CREATE INDEX idx_teacher_leave_balance_teacher ON teacher_leave_balance(teacher_id);

CREATE TABLE teacher_leave_applications (
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
CREATE INDEX idx_teacher_leave_app_teacher ON teacher_leave_applications(teacher_id);
CREATE INDEX idx_teacher_leave_app_status ON teacher_leave_applications(status);

CREATE TABLE student_leave_applications (
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
CREATE INDEX idx_student_leave_app_student ON student_leave_applications(student_id);
CREATE INDEX idx_student_leave_app_status ON student_leave_applications(status);

-- ============================================
-- TEACHER ATTENDANCE
-- ============================================

CREATE TABLE teacher_attendance (
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
CREATE INDEX idx_teacher_attendance_teacher ON teacher_attendance(teacher_id);
CREATE INDEX idx_teacher_attendance_date ON teacher_attendance(date);

-- ============================================
-- CLASS SECTION SUBJECT TEACHER (per class, per section: which teacher teaches which subject)
-- ============================================

CREATE TABLE class_section_subject_teacher (
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
CREATE INDEX idx_class_section_subject_teacher_school ON class_section_subject_teacher(school_id);
CREATE INDEX idx_class_section_subject_teacher_class_section ON class_section_subject_teacher(school_id, class_name, section);

-- ============================================
-- SETTINGS
-- ============================================

CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    school_name VARCHAR(255),
    school_address TEXT,
    school_phone VARCHAR(20),
    school_email VARCHAR(255),
    current_academic_year VARCHAR(20),
    admission_number_prefix VARCHAR(50),
    admission_number_length INTEGER,
    attendance_threshold INTEGER,
    fee_reminder_days INTEGER,
    backup_frequency VARCHAR(20) CHECK (backup_frequency IN ('daily', 'weekly', 'monthly')),
    school_seal_image TEXT,
    principal_signature_image TEXT,
    subjects TEXT[] DEFAULT '{}'::text[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id)
);

CREATE INDEX idx_settings_school ON settings(school_id);

-- ============================================
-- CONDUCT CERTIFICATES
-- ============================================

CREATE TABLE conduct_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    issue_date DATE NOT NULL,
    academic_year VARCHAR(20),
    certificate_number VARCHAR(100),
    character_rating VARCHAR(50),
    attendance DECIMAL(5, 2),
    remarks TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('issued', 'pending', 'rejected', 'completed')),
    download_count INTEGER DEFAULT 0,
    last_downloaded TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_certificates_student_id ON conduct_certificates(student_id);
CREATE INDEX idx_certificates_academic_year ON conduct_certificates(academic_year);

-- ============================================
-- DEVELOPER DATA (Contacts, Pricing Plans)
-- ============================================

CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    message TEXT,
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'resolved')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contacts_status ON contacts(status);

CREATE TABLE pricing_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    features JSONB, -- Array of feature strings
    recommended BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- HOLIDAY EVENTS
-- ============================================

CREATE TABLE holiday_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255),
    description TEXT,
    reason TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    type VARCHAR(50) DEFAULT 'holiday' CHECK (type IN ('holiday', 'event', 'exam_break')),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_holiday_events_school ON holiday_events(school_id);
CREATE INDEX idx_holiday_events_dates ON holiday_events(start_date, end_date);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fee_structures_updated_at BEFORE UPDATE ON fee_structures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fee_records_updated_at BEFORE UPDATE ON fee_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON exams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exam_records_updated_at BEFORE UPDATE ON exam_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conduct_certificates_updated_at BEFORE UPDATE ON conduct_certificates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_plans_updated_at BEFORE UPDATE ON pricing_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_holiday_events_updated_at BEFORE UPDATE ON holiday_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_activities_updated_at BEFORE UPDATE ON student_activities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
CREATE TRIGGER update_class_section_subject_teacher_updated_at BEFORE UPDATE ON class_section_subject_teacher
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();