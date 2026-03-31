import express from 'express';
import { query, getClient } from '../../database/db.js';
import { stringToUUID, optionalUUID, rowToStudent, studentToRow, generateUUID } from '../utils/helpers.js';

const router = express.Router();

// Helper: create parent user when requested; parent creds = p_<admission_number> / student password
async function ensureParentUser(client, student) {
    if (student.parentUserId) return student.parentUserId;
    if (!student.createParent && !student.parentUsername) return null;
    const parentUsername = student.parentUsername || student.parentEmail || `p_${student.admissionNumber}`;
    const parentPassword = student.parentPassword || student.password;
    const parentName = student.fatherName || student.motherName || `Parent of ${student.firstName || ''}`.trim() || 'Parent';
    const existing = await client.query('SELECT id FROM users WHERE username = $1 AND role = $2', [parentUsername, 'parent']);
    if (existing.rows.length > 0) return existing.rows[0].id;
    const userResult = await client.query(
        `INSERT INTO users (username, password, role, name, email, phone_number, status) VALUES ($1, $2, 'parent', $3, $4, $5, 'active') RETURNING id`,
        [parentUsername, parentPassword, parentName, student.parentEmail || null, student.parentMobile || student.mobileNumber || null]
    );
    return userResult.rows[0].id;
}

// Helper functions for saving data (migrated from server.js)
async function saveStudentWithUser(client, student) {
    const studentId = stringToUUID(student.id);
    const schoolId = stringToUUID(student.schoolId);
    const studentName = student.studentName || `${student.firstName} ${student.lastName || ''}`.trim();
    let parentUserId = student.parentUserId ? stringToUUID(student.parentUserId) : null;
    const existingResult = await client.query('SELECT id, user_id, parent_user_id FROM students WHERE id = $1', [studentId]);
    const isNewStudent = existingResult.rows.length === 0;
    // Always create parent for new students: username p_<admission_number>, password = student password
    if (isNewStudent && !parentUserId) {
        const pid = await ensureParentUser(client, { ...student, createParent: true, parentUsername: `p_${student.admissionNumber}`, parentPassword: student.password });
        parentUserId = pid ? stringToUUID(pid) : null;
        if (pid) student.parentUserId = pid;
    } else if (!parentUserId && (student.createParent || student.parentUsername)) {
        const pid = await ensureParentUser(client, student);
        parentUserId = pid ? stringToUUID(pid) : null;
        if (pid) student.parentUserId = pid;
    } else if (!parentUserId && !isNewStudent && existingResult.rows[0].parent_user_id == null) {
        // Backfill parent for existing student when saving and no parent linked
        const pid = await ensureParentUser(client, { ...student, createParent: true, parentUsername: `p_${student.admissionNumber}`, parentPassword: student.password });
        parentUserId = pid ? stringToUUID(pid) : null;
        if (pid) student.parentUserId = pid;
    }
    let userId;
    if (existingResult.rows.length > 0) {
        userId = existingResult.rows[0].user_id;
        await client.query(`UPDATE users SET username = $1, password = $2, name = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
            [student.admissionNumber, student.password, studentName, userId]);
        const studentRow = studentToRow(student);
        studentRow.school_id = schoolId;
        if (parentUserId != null) studentRow.parent_user_id = parentUserId;

        // Add fee fields if they exist
        if (student.totalFee !== undefined) studentRow.total_fee = student.totalFee;
        if (student.feePaid !== undefined) studentRow.fee_paid = student.feePaid;
        if (student.remainingFee !== undefined) studentRow.remaining_fee = student.remainingFee;

        const setClause = Object.keys(studentRow).map((key, index) => `${key} = $${index + 1}`).join(', ');
        const values = Object.values(studentRow);
        values.push(studentId);
        await client.query(`UPDATE students SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}`, values);
    } else {
        const userResult = await client.query(
            `INSERT INTO users (username, password, role, name, email, phone_number, status) VALUES ($1, $2, 'student', $3, $4, $5, $6) RETURNING id`,
            [student.admissionNumber, student.password, studentName, student.emailAddress, student.mobileNumber, student.status || 'active']
        );
        userId = userResult.rows[0].id;
        const studentRow = studentToRow(student);
        studentRow.user_id = userId;
        studentRow.school_id = schoolId;
        if (parentUserId != null) studentRow.parent_user_id = parentUserId;

        // Add fee fields if they exist
        if (student.totalFee !== undefined) studentRow.total_fee = student.totalFee;
        if (student.feePaid !== undefined) studentRow.fee_paid = student.feePaid;
        if (student.remainingFee !== undefined) studentRow.remaining_fee = student.remainingFee;

        const studentKeys = Object.keys(studentRow);
        const studentValues = Object.values(studentRow);
        const studentPlaceholders = studentKeys.map((_, i) => `$${i + 1}`).join(', ');
        await client.query(`INSERT INTO students (${studentKeys.join(', ')}, id) VALUES (${studentPlaceholders}, $${studentKeys.length + 1})`, [...studentValues, studentId]);
    }
    return { ...student, id: student.id };
}

async function saveActivity(client, activity) {
    const id = stringToUUID(activity.id);
    const studentId = stringToUUID(activity.studentId);
    const recordedBy = optionalUUID(activity.recordedBy); // only accept valid UUID; frontend may send name
    await client.query(`
        INSERT INTO student_activities (id, student_id, type, title, description, date, recorded_by, category)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
            type = EXCLUDED.type,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            date = EXCLUDED.date,
            recorded_by = EXCLUDED.recorded_by,
            category = EXCLUDED.category
    `, [id, studentId, activity.type, activity.title, activity.description, activity.date, recordedBy, activity.category]);
}

// POST /api/students/bulk-move – move students to target class/section
router.post('/bulk-move', async (req, res) => {
    try {
        const { schoolId, studentIds, targetClass, targetSection } = req.body;
        const sid = stringToUUID(schoolId);
        if (!sid || !Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ error: 'schoolId and non-empty studentIds required' });
        }
        const ids = studentIds.map(id => stringToUUID(id)).filter(Boolean);
        if (ids.length === 0) return res.status(400).json({ error: 'No valid student ids' });
        const placeholders = ids.map((_, i) => `$${i + 3}`).join(', ');
        const result = await query(
            `UPDATE students SET student_class = $1, section = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id IN (${placeholders}) AND school_id = $${ids.length + 3}`,
            [targetClass || '', targetSection || 'A', ...ids, sid]
        );
        res.json({ message: 'Students moved', updated: result.rowCount });
    } catch (error) {
        console.error('Bulk move error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/students/:id/exam-growth?subjects=Math,Science – exam records by year for charts
router.get('/:id/exam-growth', async (req, res) => {
    try {
        const studentId = stringToUUID(req.params.id);
        const subjectsParam = req.query.subjects;
        const subjectFilter = subjectsParam
            ? subjectsParam.split(',').map(s => s.trim()).filter(Boolean)
            : null;

        const result = await query(`
            SELECT id, exam_type, subject, subject_id, max_marks, obtained_marks, date, academic_year
            FROM exam_records
            WHERE student_id = $1 AND status = 'scored'
            ORDER BY academic_year, date
        `, [studentId]);

        const byYear = {};
        for (const row of result.rows) {
            const subject = row.subject || '';
            if (subjectFilter && subjectFilter.length > 0 && !subjectFilter.includes(subject)) continue;
            const year = row.academic_year || 'unknown';
            if (!byYear[year]) byYear[year] = [];
            byYear[year].push({
                subject,
                subjectId: row.subject_id,
                examType: row.exam_type,
                maxMarks: row.max_marks,
                obtainedMarks: row.obtained_marks,
                date: row.date,
                percentage: row.max_marks > 0 ? Math.round((row.obtained_marks / row.max_marks) * 100) : 0
            });
        }
        res.json({ byYear });
    } catch (error) {
        console.error('Exam growth error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Route handlers
router.get('/', async (req, res) => {
    try {
        const schoolId = req.query.schoolId ? stringToUUID(req.query.schoolId) : null;
        const queryStr = schoolId ? 'SELECT * FROM students WHERE school_id = $1' : 'SELECT * FROM students';
        const result = await query(queryStr, schoolId ? [schoolId] : []);
        res.json(result.rows.map(rowToStudent));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export { saveStudentWithUser, saveActivity };
export default router;
