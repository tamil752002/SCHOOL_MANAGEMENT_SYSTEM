import express from 'express';
import { query, getClient } from '../../database/db.js';
import { stringToUUID } from '../utils/helpers.js';

const router = express.Router();

// POST /api/attendance/teacher – teacher marks own attendance
router.post('/teacher', async (req, res) => {
    try {
        const { teacherId, date, session, status } = req.body;
        const tid = stringToUUID(teacherId);
        if (!tid || !date || !session || !status) return res.status(400).json({ error: 'teacherId, date, session, status required' });
        if (!['present', 'absent'].includes(status)) return res.status(400).json({ error: 'status must be present or absent' });
        const markedBy = req.body.markedBy ? stringToUUID(req.body.markedBy) : null;
        await query(`
            INSERT INTO teacher_attendance (teacher_id, date, session, status, marked_by)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (teacher_id, date, session) DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by, marked_at = CURRENT_TIMESTAMP
        `, [tid, date, session, status, markedBy]);
        res.json({ message: 'Teacher attendance recorded' });
    } catch (error) {
        console.error('Teacher attendance error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/attendance/teacher?teacherId=&from=&to=
router.get('/teacher', async (req, res) => {
    try {
        const teacherId = req.query.teacherId ? stringToUUID(req.query.teacherId) : null;
        const from = req.query.from || null;
        const to = req.query.to || null;
        if (!teacherId) return res.status(400).json({ error: 'teacherId required' });
        let sql = 'SELECT id, teacher_id, date, session, status, marked_at, marked_by FROM teacher_attendance WHERE teacher_id = $1';
        const params = [teacherId];
        if (from) { sql += ' AND date >= $2'; params.push(from); }
        if (to) { sql += ` AND date <= $${params.length + 1}`; params.push(to); }
        sql += ' ORDER BY date DESC, session';
        const result = await query(sql, params);
        res.json(result.rows.map(r => ({
            id: r.id,
            teacherId: r.teacher_id,
            date: r.date,
            session: r.session,
            status: r.status,
            markedAt: r.marked_at,
            markedBy: r.marked_by
        })));
    } catch (error) {
        console.error('Teacher attendance list error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/attendance/my-classes-today?teacherId= – classes where this teacher is class incharge (only incharge can take class attendance)
router.get('/my-classes-today', async (req, res) => {
    try {
        const teacherId = req.query.teacherId ? stringToUUID(req.query.teacherId) : null;
        if (!teacherId) return res.status(400).json({ error: 'teacherId required' });
        const result = await query(`
            SELECT id, class_name, section
            FROM teacher_classes
            WHERE teacher_id = $1 AND is_incharge = true
            ORDER BY class_name, section
        `, [teacherId]);
        res.json(result.rows.map(r => ({
            id: r.id,
            className: r.class_name,
            section: r.section,
            session: 'morning',
            subjectId: null,
            subjectName: 'Class Incharge'
        })));
    } catch (error) {
        console.error('My classes today error:', error);
        res.status(500).json({ error: error.message });
    }
});

async function saveAttendanceRecord(client, record) {
    const id = stringToUUID(record.id);
    const studentId = stringToUUID(record.studentId);
    const session = record.session || 'morning'; // Default to 'morning' for backward compatibility
    let markedBy = null;
    if (record.markedBy && record.markedBy !== 'admin') {
        markedBy = stringToUUID(record.markedBy);
    }
    
    await client.query(`
        INSERT INTO attendance_records (id, student_id, date, session, status, marked_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (student_id, date, session) DO UPDATE SET
            status = EXCLUDED.status,
            marked_by = EXCLUDED.marked_by
    `, [id, studentId, record.date, session, record.status, markedBy]);
}

router.post('/records', async (req, res) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const { studentId, date, session, status, markedBy } = req.body;
        const normalizedStudentId = stringToUUID(studentId);
        const normalizedMarkedBy = markedBy ? stringToUUID(markedBy) : null;
        const normalizedSession = session || 'morning'; // Default to 'morning' for backward compatibility
        
        await client.query(
            'INSERT INTO attendance_records (id, student_id, date, session, status, marked_by) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (student_id, date, session) DO UPDATE SET status = EXCLUDED.status',
            [crypto.randomUUID(), normalizedStudentId, date, normalizedSession, status, normalizedMarkedBy]
        );
        
        await client.query('COMMIT');
        res.json({ message: 'Attendance recorded' });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

export { saveAttendanceRecord };
export default router;
