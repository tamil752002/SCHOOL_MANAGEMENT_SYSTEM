import { query } from '../../database/db.js';
import { stringToUUID } from '../utils/helpers.js';
import { rowToStudent } from './students.mapper';
type ExamRow = {
    subject: string;
    subject_id: string;
    exam_type: string;
    max_marks: number;
    obtained_marks: number;
    date: string;
    academic_year: string;
};

export const movesBulkmovesdataStudent = async (data: any) => {
    const { schoolId, studentIds, targetClass, targetSection } = data;

    const sid = stringToUUID(schoolId);

    if (!sid || !Array.isArray(studentIds) || studentIds.length === 0) {
        throw new Error('schoolId and non-empty studentIds required');
    }

    const ids = studentIds
        .map((id: string) => stringToUUID(id))
        .filter(Boolean);

    if (ids.length === 0) {
        throw new Error('No valid student ids');
    }

    const placeholders = ids.map((_, i) => `$${i + 3}`).join(', ');

    const result = await query(
        `UPDATE students 
         SET student_class = $1, section = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id IN (${placeholders}) 
         AND school_id = $${ids.length + 3}`,
        [targetClass || '', targetSection || 'A', ...ids, sid]
    );

    return {
        message: 'Students moved',
        updated: result.rowCount
    };
};
export const examGrowthDtls = async (data: any) => {
    const { id, subjects } = data;

    const studentId = stringToUUID(id);

    const subjectFilter = subjects
        ? String(subjects)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : null;

    const result = await query(
        `
        SELECT 
          id,
          exam_type,
          subject,
          subject_id,
          max_marks,
          obtained_marks,
          date,
          academic_year
        FROM exam_records
        WHERE student_id = $1 
        AND status = 'scored'
        ORDER BY academic_year, date
        `,
        [studentId]
    );

    const rows = result.rows as unknown as ExamRow[];

    const byYear: Record<string, any[]> = {};

    for (const row of rows) {
        const subject = row.subject || '';

        if (subjectFilter && !subjectFilter.includes(subject)) continue;

        const year = row.academic_year || 'unknown';

        if (!byYear[year]) byYear[year] = [];

        byYear[year].push({
            subject,
            subjectId: row.subject_id,
            examType: row.exam_type,
            maxMarks: row.max_marks,
            obtainedMarks: row.obtained_marks,
            date: row.date,
            percentage:
                row.max_marks > 0
                    ? Math.round((row.obtained_marks / row.max_marks) * 100)
                    : 0,
        });
    }

    return { byYear };
};

export const getStudents = async (data: any) => {
  const { schoolId } = data;

  const sid = schoolId ? stringToUUID(schoolId) : null;

  const queryStr = sid
    ? 'SELECT * FROM students WHERE school_id = $1'
    : 'SELECT * FROM students';

  const result = await query(queryStr, sid ? [sid] : []);

  return result.rows.map(rowToStudent);
};