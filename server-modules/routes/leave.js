import express from 'express';
import { query, getClient } from '../../database/db.js';
import { stringToUUID, generateUUID } from '../utils/helpers.js';

const router = express.Router();

// Helper: get teacher_id from user id
async function getTeacherIdByUserId(userId) {
    const r = await query('SELECT id FROM teachers WHERE user_id = $1', [userId]);
    return r.rows[0]?.id || null;
}

// Helper: count business days between from_date and to_date (inclusive)
function countDays(fromDate, toDate) {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    let count = 0;
    const d = new Date(from);
    while (d <= to) {
        const day = d.getDay();
        if (day !== 0 && day !== 6) count++;
        d.setDate(d.getDate() + 1);
    }
    return count;
}

// ----- Teacher leave -----

// GET /api/leave/balance – my balances (teacher; teacherId from body or auth context – we use header/body)
router.get('/balance', async (req, res) => {
    try {
        const teacherId = req.query.teacherId ? stringToUUID(req.query.teacherId) : null;
        if (!teacherId) return res.status(400).json({ error: 'teacherId required' });
        const result = await query(
            'SELECT leave_type, year, allowed, used FROM teacher_leave_balance WHERE teacher_id = $1 ORDER BY leave_type',
            [teacherId]
        );
        res.json(result.rows.map(r => ({ leaveType: r.leave_type, year: r.year, allowed: r.allowed, used: r.used })));
    } catch (error) {
        console.error('Leave balance error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/leave/apply – teacher apply leave
router.post('/apply', async (req, res) => {
    try {
        const { teacherId, leaveType, fromDate, toDate, reason } = req.body;
        const tid = stringToUUID(teacherId);
        if (!tid || !leaveType || !fromDate || !toDate) return res.status(400).json({ error: 'teacherId, leaveType, fromDate, toDate required' });
        const id = generateUUID();
        await query(`
            INSERT INTO teacher_leave_applications (id, teacher_id, leave_type, from_date, to_date, reason, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'pending')
        `, [id, tid, leaveType, fromDate, toDate, reason || null]);
        res.status(201).json({ id, message: 'Leave application submitted' });
    } catch (error) {
        console.error('Apply leave error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/leave/my-applications?teacherId=
router.get('/my-applications', async (req, res) => {
    try {
        const teacherId = req.query.teacherId ? stringToUUID(req.query.teacherId) : null;
        if (!teacherId) return res.status(400).json({ error: 'teacherId required' });
        const result = await query(`
            SELECT id, teacher_id, leave_type, from_date, to_date, reason, status, reviewed_at, created_at
            FROM teacher_leave_applications WHERE teacher_id = $1 ORDER BY created_at DESC
        `, [teacherId]);
        res.json(result.rows.map(r => ({
            id: r.id,
            teacherId: r.teacher_id,
            leaveType: r.leave_type,
            fromDate: r.from_date,
            toDate: r.to_date,
            reason: r.reason,
            status: r.status,
            reviewedAt: r.reviewed_at,
            createdAt: r.created_at
        })));
    } catch (error) {
        console.error('My applications error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/leave/teacher-applications?schoolId=&status= – admin list (pending first)
router.get('/teacher-applications', async (req, res) => {
    try {
        const schoolId = req.query.schoolId ? stringToUUID(req.query.schoolId) : null;
        const status = req.query.status || null;
        let sql = `
            SELECT a.id, a.teacher_id, a.leave_type, a.from_date, a.to_date, a.reason, a.status, a.reviewed_at, a.created_at,
                   u.name AS teacher_name
            FROM teacher_leave_applications a
            JOIN teachers t ON a.teacher_id = t.id
            JOIN users u ON t.user_id = u.id
            WHERE 1=1
        `;
        const params = [];
        let n = 1;
        if (schoolId) { sql += ` AND t.school_id = $${n++}`; params.push(schoolId); }
        if (status) { sql += ` AND a.status = $${n++}`; params.push(status); }
        sql += ' ORDER BY a.status = \'pending\' DESC, a.created_at DESC';
        const result = await query(sql, params);
        res.json(result.rows.map(r => ({
            id: r.id,
            teacherId: r.teacher_id,
            teacherName: r.teacher_name,
            leaveType: r.leave_type,
            fromDate: r.from_date,
            toDate: r.to_date,
            reason: r.reason,
            status: r.status,
            reviewedAt: r.reviewed_at,
            createdAt: r.created_at
        })));
    } catch (error) {
        console.error('Teacher applications list error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/leave/teacher-applications/:id – admin approve/reject
router.put('/teacher-applications/:id', async (req, res) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const id = stringToUUID(req.params.id);
        const { status } = req.body; // 'approved' | 'rejected'
        if (!status || !['approved', 'rejected'].includes(status)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'status must be approved or rejected' });
        }
        const app = await client.query('SELECT teacher_id, leave_type, from_date, to_date FROM teacher_leave_applications WHERE id = $1', [id]);
        if (app.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Application not found' });
        }
        const { teacher_id, leave_type, from_date, to_date } = app.rows[0];
        const reviewedBy = req.body.reviewedBy ? stringToUUID(req.body.reviewedBy) : null;

        if (status === 'approved') {
            const days = countDays(from_date, to_date);
            await client.query(`
                UPDATE teacher_leave_balance SET used = used + $1, updated_at = CURRENT_TIMESTAMP
                WHERE teacher_id = $2 AND leave_type = $3 AND year = EXTRACT(YEAR FROM $4::date)::int
            `, [days, teacher_id, leave_type, from_date]);
        }

        await client.query(`
            UPDATE teacher_leave_applications SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $3
        `, [status, reviewedBy, id]);

        await client.query('COMMIT');
        res.json({ message: status === 'approved' ? 'Leave approved' : 'Leave rejected' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Review leave error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// ----- Student leave (parent apply, teacher/admin list and approve) -----

// POST /api/leave/student – parent apply for child
router.post('/student', async (req, res) => {
    try {
        const { studentId, leaveType, fromDate, toDate, reason, appliedBy } = req.body;
        const sid = stringToUUID(studentId);
        const appliedById = stringToUUID(appliedBy);
        if (!sid || !leaveType || !fromDate || !toDate || !appliedBy) return res.status(400).json({ error: 'studentId, leaveType, fromDate, toDate, appliedBy required' });
        const check = await query('SELECT id FROM students WHERE id = $1 AND parent_user_id = $2', [sid, appliedById]);
        if (check.rows.length === 0) return res.status(403).json({ error: 'Not authorized to apply leave for this student' });
        const id = generateUUID();
        await query(`
            INSERT INTO student_leave_applications (id, student_id, leave_type, from_date, to_date, reason, applied_by, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
        `, [id, sid, leaveType, fromDate, toDate, reason || null, appliedById]);
        res.status(201).json({ id, message: 'Student leave application submitted' });
    } catch (error) {
        console.error('Student leave apply error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/leave/student – list for my children (parent: pass appliedBy = userId) or all (admin: schoolId)
router.get('/student', async (req, res) => {
    try {
        const parentUserId = req.query.parentUserId ? stringToUUID(req.query.parentUserId) : null;
        const schoolId = req.query.schoolId ? stringToUUID(req.query.schoolId) : null;
        let sql = `
            SELECT a.id, a.student_id, a.leave_type, a.from_date, a.to_date, a.reason, a.status, a.reviewed_at, a.reviewed_by, a.created_at,
                   s.first_name, s.last_name, s.student_class, s.section,
                   reviewer.role AS reviewed_by_role
            FROM student_leave_applications a
            JOIN students s ON a.student_id = s.id
            LEFT JOIN users reviewer ON a.reviewed_by = reviewer.id
            WHERE 1=1
        `;
        const params = [];
        let n = 1;
        if (parentUserId) { sql += ` AND a.applied_by = $${n++}`; params.push(parentUserId); }
        if (schoolId) { sql += ` AND s.school_id = $${n++}`; params.push(schoolId); }
        sql += ' ORDER BY a.created_at DESC';
        const result = await query(sql, params);
        res.json(result.rows.map(r => ({
            id: r.id,
            studentId: r.student_id,
            studentName: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
            studentClass: r.student_class,
            section: r.section,
            leaveType: r.leave_type,
            fromDate: r.from_date,
            toDate: r.to_date,
            reason: r.reason,
            status: r.status,
            reviewedAt: r.reviewed_at,
            reviewedBy: r.reviewed_by,
            reviewedByRole: r.reviewed_by_role,
            createdAt: r.created_at
        })));
    } catch (error) {
        console.error('Student leave list error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/leave/student-applications?className=&section=&schoolId= – for class incharge teacher
router.get('/student-applications', async (req, res) => {
    try {
        const className = req.query.className || null;
        const section = req.query.section || null;
        const schoolId = req.query.schoolId ? stringToUUID(req.query.schoolId) : null;
        let sql = `
            SELECT a.id, a.student_id, a.leave_type, a.from_date, a.to_date, a.reason, a.status, a.reviewed_at, a.created_at,
                   s.first_name, s.last_name, s.student_class, s.section
            FROM student_leave_applications a
            JOIN students s ON a.student_id = s.id
            WHERE a.status = 'pending'
        `;
        const params = [];
        let n = 1;
        if (className) { sql += ` AND s.student_class = $${n++}`; params.push(className); }
        if (section) { sql += ` AND s.section = $${n++}`; params.push(section); }
        if (schoolId) { sql += ` AND s.school_id = $${n++}`; params.push(schoolId); }
        sql += ' ORDER BY a.created_at DESC';
        const result = await query(sql, params);
        res.json(result.rows.map(r => ({
            id: r.id,
            studentId: r.student_id,
            studentName: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
            studentClass: r.student_class,
            section: r.section,
            leaveType: r.leave_type,
            fromDate: r.from_date,
            toDate: r.to_date,
            reason: r.reason,
            status: r.status,
            reviewedAt: r.reviewed_at,
            createdAt: r.created_at
        })));
    } catch (error) {
        console.error('Student leave applications list error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/leave/student-applications/:id – approve/reject (admin or teacher)
router.put('/student-applications/:id', async (req, res) => {
    try {
        const id = stringToUUID(req.params.id);
        const { status } = req.body;
        if (!status || !['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'status must be approved or rejected' });
        const reviewedBy = req.body.reviewedBy ? stringToUUID(req.body.reviewedBy) : null;
        await query(`
            UPDATE student_leave_applications SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $3
        `, [status, reviewedBy, id]);
        res.json({ message: status === 'approved' ? 'Leave approved' : 'Leave rejected' });
    } catch (error) {
        console.error('Student leave review error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
