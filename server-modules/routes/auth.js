import express from 'express';
import { query } from '../../database/db.js';
import { stringToUUID } from '../utils/helpers.js';

const router = express.Router();

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await query(
            'SELECT * FROM users WHERE username = $1 AND password = $2',
            [username, password]
        );
        if (result.rows.length > 0) {
            const user = result.rows[0];
            let schoolId = null;
            let teacherId = null;
            let studentIds = null;
            if (user.role === 'admin') {
                const adminResult = await query('SELECT school_id FROM admins WHERE user_id = $1', [user.id]);
                const raw = adminResult.rows[0]?.school_id;
                schoolId = raw != null ? String(raw) : null;
            } else if (user.role === 'student') {
                const studentResult = await query('SELECT id, school_id, status FROM students WHERE user_id = $1', [user.id]);
                const row = studentResult.rows[0];
                if (!row || row.status !== 'active') {
                    res.status(403).json({ error: 'Account is inactive or you have left the school. Please contact the school office.' });
                    return;
                }
                schoolId = String(row.school_id);
            } else if (user.role === 'teacher') {
                const teacherResult = await query('SELECT id, school_id, status, left_at FROM teachers WHERE user_id = $1', [user.id]);
                const row = teacherResult.rows[0];
                if (!row || row.status !== 'active' || row.left_at != null) {
                    res.status(403).json({ error: 'Account is inactive or you have left the school. Please contact the school office.' });
                    return;
                }
                teacherId = String(row.id);
                schoolId = String(row.school_id);
            } else if (user.role === 'parent') {
                const studentResult = await query('SELECT id, school_id FROM students WHERE parent_user_id = $1', [user.id]);
                if (studentResult.rows.length > 0) {
                    studentIds = studentResult.rows.map(r => String(r.id));
                    schoolId = String(studentResult.rows[0].school_id);
                }
            }
            res.json({
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    name: user.name,
                    email: user.email,
                    schoolId,
                    ...(teacherId != null && { teacherId }),
                    ...(studentIds != null && { studentIds })
                }
            });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
