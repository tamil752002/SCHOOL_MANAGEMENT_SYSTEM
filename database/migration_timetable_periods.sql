-- Migration: Timetable 4+4 periods per day (Indian school: morning 4 periods, afternoon 4 periods)

ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS period SMALLINT NOT NULL DEFAULT 1 CHECK (period >= 1 AND period <= 4);

-- Drop old 5-column unique (PostgreSQL default name)
ALTER TABLE timetable_slots DROP CONSTRAINT IF EXISTS timetable_slots_school_id_class_name_section_day_of_week_session_key;

-- Add new unique on (school_id, class_name, section, day_of_week, session, period)
CREATE UNIQUE INDEX IF NOT EXISTS idx_timetable_slots_unique_slot
  ON timetable_slots (school_id, class_name, section, day_of_week, session, period);
