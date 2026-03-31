-- Migration: Drop existing fee-related tables and triggers (Phase 1)
-- Run this on existing databases before applying the new fee schema.

-- Drop triggers first (they depend on tables)
DROP TRIGGER IF EXISTS update_fee_structures_updated_at ON fee_structures;
DROP TRIGGER IF EXISTS update_fee_records_updated_at ON fee_records;

-- Drop tables in dependency order
DROP TABLE IF EXISTS fee_structure_student_mapping;
DROP TABLE IF EXISTS fee_records;
DROP TABLE IF EXISTS fee_structures;
