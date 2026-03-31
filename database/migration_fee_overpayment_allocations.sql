-- Migration: Add fee_overpayment_allocations table for overpayment transfer audit
CREATE TABLE IF NOT EXISTS fee_overpayment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_fee_record_id UUID NOT NULL REFERENCES fee_records(id) ON DELETE CASCADE,
    to_fee_record_id UUID NOT NULL REFERENCES fee_records(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fee_overpayment_from ON fee_overpayment_allocations(from_fee_record_id);
CREATE INDEX IF NOT EXISTS idx_fee_overpayment_to ON fee_overpayment_allocations(to_fee_record_id);
