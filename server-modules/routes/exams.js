import express from 'express';
import { query, getClient } from '../../database/db.js';
import { stringToUUID, generateUUID } from '../utils/helpers.js';

const router = express.Router();

/** Normalize DATE column value to YYYY-MM-DD string (DB now returns strings via type parser; keep fallback for null/other). */
function dateToYYYYMMDD(val) {
    if (val == null) return null;
    if (typeof val === 'string') return String(val).split('T')[0];
    return String(val).split('T')[0];
}

function rowToExam(row) {
    if (!row) return null;
    const schedule = row.schedule != null
        ? (Array.isArray(row.schedule) ? row.schedule : (typeof row.schedule === 'string' ? JSON.parse(row.schedule || '[]') : []))
        : [];
    return {
        id: row.id,
        name: row.name,
        type: row.type,
        className: row.class_name,
        subjects: row.subjects || [],
        subject: row.subjects?.[0],
        startDate: dateToYYYYMMDD(row.start_date),
        endDate: dateToYYYYMMDD(row.end_date),
        academicYear: row.academic_year,
        totalMarks: row.total_marks != null ? parseInt(row.total_marks, 10) : null,
        status: row.status,
        schoolId: row.school_id,
        schedule: schedule.map((e) => ({
            id: e.id,
            date: e.date,
            subject: e.subject ?? '',
            timeSlot: e.timeSlot === 'afternoon' ? 'afternoon' : 'morning',
            maxMarks: e.maxMarks != null ? Number(e.maxMarks) : 100
        }))
    };
}

function rowToExamRecord(row) {
    if (!row) return null;
    const dateStr = dateToYYYYMMDD(row.date);
    return {
        id: row.id,
        studentId: row.student_id,
        examId: row.exam_id,
        examType: row.exam_type,
        subject: row.subject,
        subjectId: row.subject_id,
        maxMarks: row.max_marks != null ? parseInt(row.max_marks, 10) : 0,
        obtainedMarks: row.obtained_marks != null ? parseInt(row.obtained_marks, 10) : 0,
        grade: row.grade,
        date: dateStr,
        academicYear: row.academic_year,
        remarks: row.remarks,
        status: row.status
    };
}

async function saveExam(client, exam) {
    const id = exam.id ? stringToUUID(exam.id) : generateUUID();
    const schoolId = exam.schoolId ? stringToUUID(exam.schoolId) : null;
    const scheduleJson = exam.schedule != null ? JSON.stringify(exam.schedule) : null;
    await client.query(`
        INSERT INTO exams (id, name, type, class_name, subjects, start_date, end_date, academic_year, total_marks, status, school_id, schedule)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            type = EXCLUDED.type,
            class_name = EXCLUDED.class_name,
            subjects = EXCLUDED.subjects,
            start_date = EXCLUDED.start_date,
            end_date = EXCLUDED.end_date,
            academic_year = EXCLUDED.academic_year,
            total_marks = EXCLUDED.total_marks,
            status = EXCLUDED.status,
            schedule = EXCLUDED.schedule,
            updated_at = CURRENT_TIMESTAMP
    `, [id, exam.name, exam.type, exam.className, JSON.stringify(exam.subjects || []), exam.startDate, exam.endDate, exam.academicYear, exam.totalMarks ?? null, exam.status || 'scheduled', schoolId, scheduleJson]);
    return id;
}

async function saveExamRecord(client, record) {
    const id = record.id ? stringToUUID(record.id) : generateUUID();
    const studentId = stringToUUID(record.studentId);
    const examId = record.examId ? stringToUUID(record.examId) : null;
    await client.query(`
        INSERT INTO exam_records (id, student_id, exam_id, exam_type, subject, subject_id, max_marks, obtained_marks, grade, date, academic_year, remarks, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
            obtained_marks = EXCLUDED.obtained_marks,
            grade = EXCLUDED.grade,
            remarks = EXCLUDED.remarks,
            status = EXCLUDED.status,
            updated_at = CURRENT_TIMESTAMP
    `, [id, studentId, examId, record.examType, record.subject, record.subjectId ?? null, record.maxMarks, record.obtainedMarks, record.grade ?? null, record.date, record.academicYear ?? null, record.remarks ?? null, record.status || 'pending']);
    return id;
}

// GET / – list exams (query: schoolId, class, academicYear)
router.get('/', async (req, res) => {
    try {
        const schoolId = req.query.schoolId ? stringToUUID(req.query.schoolId) : null;
        const className = req.query.class || null;
        const academicYear = req.query.academicYear || null;

        let sql = 'SELECT * FROM exams WHERE 1=1';
        const params = [];
        let idx = 1;
        if (schoolId) {
            sql += ` AND school_id = $${idx}`;
            params.push(schoolId);
            idx++;
        }
        if (className) {
            sql += ` AND class_name = $${idx}`;
            params.push(className);
            idx++;
        }
        if (academicYear) {
            sql += ` AND academic_year = $${idx}`;
            params.push(academicYear);
            idx++;
        }
        sql += ' ORDER BY start_date DESC';
        const result = await query(sql, params);
        res.json(result.rows.map(rowToExam));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST / – create exam
router.post('/', async (req, res) => {
    const client = await getClient();
    try {
        const body = req.body;
        const id = generateUUID();
        const schoolId = body.schoolId ? stringToUUID(body.schoolId) : null;
        const scheduleJson = body.schedule != null ? JSON.stringify(body.schedule) : null;
        await client.query(`
            INSERT INTO exams (id, name, type, class_name, subjects, start_date, end_date, academic_year, total_marks, status, school_id, schedule)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
            id,
            body.name ?? null,
            body.type ?? 'FA1',
            body.className,
            JSON.stringify(body.subjects || []),
            body.startDate ?? null,
            body.endDate ?? null,
            body.academicYear ?? null,
            body.totalMarks ?? null,
            body.status ?? 'scheduled',
            schoolId,
            scheduleJson
        ]);
        const row = (await client.query('SELECT * FROM exams WHERE id = $1', [id])).rows[0];
        res.status(201).json(rowToExam(row));
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// GET /records – list exam records (query: schoolId, examId, studentId, examType, limit, offset)
router.get('/records', async (req, res) => {
    try {
        const schoolId = req.query.schoolId ? stringToUUID(req.query.schoolId) : null;
        const examId = req.query.examId ? stringToUUID(req.query.examId) : null;
        const studentId = req.query.studentId ? stringToUUID(req.query.studentId) : null;
        const examType = req.query.examType || null;
        const limit = parseInt(req.query.limit || '0', 10);
        const offset = parseInt(req.query.offset || '0', 10);

        let sql;
        const params = [];
        let idx = 1;

        const prefix = schoolId ? 'er.' : '';
        if (schoolId) {
            sql = `SELECT er.* FROM exam_records er
                   JOIN students s ON er.student_id = s.id
                   WHERE s.school_id = $${idx}`;
            params.push(schoolId);
            idx++;
        } else {
            sql = 'SELECT * FROM exam_records WHERE 1=1';
        }
        if (examId) {
            sql += ` AND ${prefix}exam_id = $${idx}`;
            params.push(examId);
            idx++;
        }
        if (studentId) {
            sql += ` AND ${prefix}student_id = $${idx}`;
            params.push(studentId);
            idx++;
        }
        if (examType) {
            sql += ` AND ${prefix}exam_type = $${idx}`;
            params.push(examType);
            idx++;
        }
        sql += ` ORDER BY ${prefix}date DESC, ${prefix}created_at DESC`;
        if (limit > 0) {
            sql += ` LIMIT $${idx}`;
            params.push(limit);
            idx++;
        }
        if (offset > 0) {
            sql += ` OFFSET $${idx}`;
            params.push(offset);
        }

        const result = await query(sql, params);
        res.json(result.rows.map(rowToExamRecord));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /records – create one or bulk exam records
router.post('/records', async (req, res) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const body = req.body;
        const items = Array.isArray(body) ? body : [body];
        const ids = [];

        for (const record of items) {
            const studentId = stringToUUID(record.studentId);
            const examId = record.examId ? stringToUUID(record.examId) : null;
            if (record.examId) {
                const examCheck = await client.query('SELECT id FROM exams WHERE id = $1', [examId]);
                if (examCheck.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ error: 'Exam not found for examId' });
                }
            }
            const studentCheck = await client.query('SELECT id FROM students WHERE id = $1', [studentId]);
            if (studentCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Student not found for studentId' });
            }

            const id = record.id ? stringToUUID(record.id) : generateUUID();
            await client.query(`
                INSERT INTO exam_records (id, student_id, exam_id, exam_type, subject, subject_id, max_marks, obtained_marks, grade, date, academic_year, remarks, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                ON CONFLICT (id) DO UPDATE SET
                    obtained_marks = EXCLUDED.obtained_marks,
                    grade = EXCLUDED.grade,
                    remarks = EXCLUDED.remarks,
                    status = EXCLUDED.status,
                    updated_at = CURRENT_TIMESTAMP
            `, [
                id,
                studentId,
                examId,
                record.examType ?? null,
                record.subject ?? null,
                record.subjectId ?? null,
                record.maxMarks ?? 0,
                record.obtainedMarks ?? 0,
                record.grade ?? null,
                record.date ?? null,
                record.academicYear ?? null,
                record.remarks ?? null,
                record.status ?? 'pending'
            ]);
            ids.push(id);
        }

        await client.query('COMMIT');
        const rows = await query(
            'SELECT * FROM exam_records WHERE id = ANY($1)',
            [ids]
        );
        const created = rows.rows.map(rowToExamRecord);
        res.status(201).json(items.length === 1 ? created[0] : created);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// PUT /records/:id – update one exam record
router.put('/records/:id', async (req, res) => {
    const client = await getClient();
    try {
        const id = stringToUUID(req.params.id);
        const body = req.body;
        const updates = [];
        const values = [id];
        let idx = 2;
        if (body.obtainedMarks !== undefined) {
            updates.push(`obtained_marks = $${idx}`);
            values.push(body.obtainedMarks);
            idx++;
        }
        if (body.grade !== undefined) {
            updates.push(`grade = $${idx}`);
            values.push(body.grade);
            idx++;
        }
        if (body.remarks !== undefined) {
            updates.push(`remarks = $${idx}`);
            values.push(body.remarks);
            idx++;
        }
        if (body.status !== undefined) {
            updates.push(`status = $${idx}`);
            values.push(body.status);
            idx++;
        }
        if (updates.length === 0) {
            const row = (await client.query('SELECT * FROM exam_records WHERE id = $1', [id])).rows[0];
            if (!row) return res.status(404).json({ error: 'Exam record not found' });
            return res.json(rowToExamRecord(row));
        }
        const sql = `UPDATE exam_records SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`;
        const result = await client.query(sql, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Exam record not found' });
        }
        res.json(rowToExamRecord(result.rows[0]));
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// DELETE /records/:id – delete one exam record
router.delete('/records/:id', async (req, res) => {
    try {
        const id = stringToUUID(req.params.id);
        const result = await query('DELETE FROM exam_records WHERE id = $1 RETURNING id', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Exam record not found' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /:id – get one exam (must be after /records)
router.get('/:id', async (req, res) => {
    try {
        const id = stringToUUID(req.params.id);
        const result = await query('SELECT * FROM exams WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Exam not found' });
        }
        res.json(rowToExam(result.rows[0]));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /:id – update exam (must be after /records)
router.put('/:id', async (req, res) => {
    const client = await getClient();
    try {
        const id = stringToUUID(req.params.id);
        const body = req.body;
        const schoolId = body.schoolId != null ? stringToUUID(body.schoolId) : null;
        const scheduleJson = body.schedule !== undefined ? JSON.stringify(body.schedule) : null;
        await client.query(`
            UPDATE exams SET
                name = COALESCE($2, name),
                type = COALESCE($3, type),
                class_name = COALESCE($4, class_name),
                subjects = COALESCE($5, subjects),
                start_date = COALESCE($6, start_date),
                end_date = COALESCE($7, end_date),
                academic_year = COALESCE($8, academic_year),
                total_marks = COALESCE($9, total_marks),
                status = COALESCE($10, status),
                school_id = COALESCE($11, school_id),
                schedule = CASE WHEN $12::jsonb IS NOT NULL THEN $12::jsonb ELSE schedule END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [
            id,
            body.name,
            body.type,
            body.className,
            body.subjects != null ? JSON.stringify(body.subjects) : null,
            body.startDate,
            body.endDate,
            body.academicYear,
            body.totalMarks,
            body.status,
            schoolId,
            scheduleJson
        ]);
        const result = await client.query('SELECT * FROM exams WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Exam not found' });
        }
        res.json(rowToExam(result.rows[0]));
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// DELETE /:id – delete exam (cascade deletes exam_records; must be after /records)
router.delete('/:id', async (req, res) => {
    const client = await getClient();
    try {
        const id = stringToUUID(req.params.id);
        const result = await client.query('DELETE FROM exams WHERE id = $1 RETURNING id', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Exam not found' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

export { saveExam, saveExamRecord };
export default router;
