-- Migration: Create new fee tables (Phase 2)
-- Run after migration_drop_fee_tables.sql on existing databases.
-- For fresh installs, schema.sql already contains these tables.

CREATE TABLE IF NOT EXISTS fee_structures (
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
    other_fees JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(class_name, academic_year, structure_type, school_id)
);

CREATE INDEX IF NOT EXISTS idx_fee_structures_class ON fee_structures(class_name, academic_year);
CREATE INDEX IF NOT EXISTS idx_fee_structures_school ON fee_structures(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_type ON fee_structures(structure_type);

CREATE TABLE IF NOT EXISTS fee_structure_student_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fee_structure_id UUID NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    fee_type VARCHAR(50) NOT NULL CHECK (fee_type IN ('books', 'uniform', 'van', 'other')),
    other_fee_name VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fee_structure_id, student_id, fee_type, other_fee_name)
);

CREATE INDEX IF NOT EXISTS idx_fee_mapping_structure ON fee_structure_student_mapping(fee_structure_id);
CREATE INDEX IF NOT EXISTS idx_fee_mapping_student ON fee_structure_student_mapping(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_mapping_fee_type ON fee_structure_student_mapping(fee_type);

CREATE TABLE IF NOT EXISTS fee_records (
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

CREATE INDEX IF NOT EXISTS idx_fee_records_student_id ON fee_records(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_records_status ON fee_records(status);
CREATE INDEX IF NOT EXISTS idx_fee_records_academic_year ON fee_records(academic_year);
CREATE INDEX IF NOT EXISTS idx_fee_records_fee_type ON fee_records(fee_type);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_fee_structures_updated_at ON fee_structures;
CREATE TRIGGER update_fee_structures_updated_at BEFORE UPDATE ON fee_structures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fee_records_updated_at ON fee_records;
CREATE TRIGGER update_fee_records_updated_at BEFORE UPDATE ON fee_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
