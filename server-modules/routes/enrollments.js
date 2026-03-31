import express from 'express';
import { query, getClient } from '../../database/db.js';
import { stringToUUID, generateUUID } from '../utils/helpers.js';

const router = express.Router();

// Class order for promotion (same as sortClasses: Nursery, LKG, UKG, 1..12)
const CLASS_ORDER = ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

function getNextClass(currentClass) {
    const normalized = String(currentClass || '').trim();
    const idx = CLASS_ORDER.indexOf(normalized);
    if (idx === -1) {
        // Unknown class: try numeric
        const num = parseInt(normalized, 10);
        if (!isNaN(num) && num >= 1 && num <= 12) return String(num + 1);
        return 'Graduated';
    }
    if (idx === CLASS_ORDER.length - 1) return 'Graduated';
    return CLASS_ORDER[idx + 1];
}

// GET /api/enrollments?schoolId=&academicYear=
router.get('/', async (req, res) => {
    try {
        const schoolId = req.query.schoolId ? stringToUUID(req.query.schoolId) : null;
        const academicYear = req.query.academicYear || null;
        if (!schoolId) return res.status(400).json({ error: 'schoolId required' });

        let sql = `
            SELECT se.*, s.first_name, s.last_name, s.admission_number, s.status AS student_status
            FROM student_enrollments se
            JOIN students s ON s.id = se.student_id
            WHERE se.school_id = $1
        `;
        const params = [schoolId];
        if (academicYear) {
            params.push(academicYear);
            sql += ` AND se.academic_year = $${params.length}`;
        }
        sql += ' ORDER BY se.class_name, se.section, s.first_name, s.last_name';

        const result = await query(sql, params);
        const enrollments = result.rows.map(row => ({
            id: row.id,
            schoolId: row.school_id,
            studentId: row.student_id,
            academicYear: row.academic_year,
            className: row.class_name,
            section: row.section,
            enrollmentType: row.enrollment_type,
            enrolledAt: row.enrolled_at,
            leftAt: row.left_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            studentName: [row.first_name, row.last_name].filter(Boolean).join(' ').trim(),
            admissionNumber: row.admission_number,
            studentStatus: row.student_status
        }));
        res.json(enrollments);
    } catch (error) {
        console.error('Enrollments list error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/enrollments – create or update enrollment
router.post('/', async (req, res) => {
    try {
        const { id, schoolId, studentId, academicYear, className, section, enrollmentType, enrolledAt } = req.body;
        const sid = stringToUUID(schoolId);
        const stdId = stringToUUID(studentId);
        if (!sid || !stdId || !academicYear || !className) {
            return res.status(400).json({ error: 'schoolId, studentId, academicYear, className required' });
        }
        const enrollmentId = id ? stringToUUID(id) : generateUUID();
        const sectionVal = section || 'A';
        const typeVal = enrollmentType || 'new_admission';

        await query(`
            INSERT INTO student_enrollments (id, school_id, student_id, academic_year, class_name, section, enrollment_type, enrolled_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
            ON CONFLICT (school_id, student_id, academic_year) DO UPDATE SET
                class_name = EXCLUDED.class_name,
                section = EXCLUDED.section,
                enrollment_type = EXCLUDED.enrollment_type,
                enrolled_at = COALESCE(EXCLUDED.enrolled_at, student_enrollments.enrolled_at),
                updated_at = CURRENT_TIMESTAMP
        `, [enrollmentId, sid, stdId, academicYear, className, sectionVal, typeVal, enrolledAt || null]);

        res.status(201).json({ id: enrollmentId, message: 'Enrollment saved' });
    } catch (error) {
        console.error('Enrollment save error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/enrollments/promote – promote all active students to next academic year
router.post('/promote', async (req, res) => {
    const client = await getClient();
    try {
        const { schoolId, fromAcademicYear, toAcademicYear } = req.body;
        const sid = stringToUUID(schoolId);
        if (!sid || !fromAcademicYear || !toAcademicYear) {
            return res.status(400).json({ error: 'schoolId, fromAcademicYear, toAcademicYear required' });
        }

        await client.query('BEGIN');

        const enrollments = await client.query(`
            SELECT se.id, se.student_id, se.class_name, se.section, s.status AS student_status
            FROM student_enrollments se
            JOIN students s ON s.id = se.student_id
            WHERE se.school_id = $1 AND se.academic_year = $2
        `, [sid, fromAcademicYear]);

        const activeStatuses = ['active', 'inactive'];
        let created = 0;
        const graduatedStudentIds = [];

        for (const row of enrollments.rows) {
            if (!activeStatuses.includes(row.student_status)) continue;

            const nextClass = getNextClass(row.class_name);
            const isGraduated = nextClass === 'Graduated';
            const classForDb = isGraduated ? row.class_name : nextClass;
            const sectionForDb = row.section || 'A';

            await client.query(`
                INSERT INTO student_enrollments (id, school_id, student_id, academic_year, class_name, section, enrollment_type, enrolled_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, 'promoted', CURRENT_DATE, CURRENT_TIMESTAMP)
                ON CONFLICT (school_id, student_id, academic_year) DO NOTHING
            `, [generateUUID(), sid, row.student_id, toAcademicYear, classForDb, sectionForDb]);
            created++;

            if (!isGraduated) {
                await client.query(`
                    UPDATE students SET student_class = $1, section = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3
                `, [nextClass, sectionForDb, row.student_id]);
            } else {
                graduatedStudentIds.push(row.student_id);
            }
        }

        if (graduatedStudentIds.length > 0) {
            await client.query(`
                UPDATE students SET status = 'graduated', updated_at = CURRENT_TIMESTAMP WHERE id = ANY($1::uuid[])
            `, [graduatedStudentIds]);
        }

        await client.query('COMMIT');
        res.json({ message: 'Promotion complete', created, graduated: graduatedStudentIds.length });
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('Promote error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

export default router;
export { getNextClass };
