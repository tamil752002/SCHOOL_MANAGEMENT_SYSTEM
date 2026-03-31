-- Add schedule JSONB to exams so time slot and max marks per entry are persisted
ALTER TABLE exams ADD COLUMN IF NOT EXISTS schedule JSONB;
