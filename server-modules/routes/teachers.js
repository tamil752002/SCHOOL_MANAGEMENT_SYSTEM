import express from 'express';
import { query, getClient } from '../../database/db.js';
import { stringToUUID, generateUUID } from '../utils/helpers.js';

const router = express.Router();

const DEFAULT_LEAVE_ALLOWED = { sick: 10, casual: 5, loss_of_pay: 5 };

// GET /api/teachers?schoolId= – list teachers with subjects, classes, leave balances
router.get('/', async (req, res) => {
    try {
        const schoolId = req.query.schoolId ? stringToUUID(req.query.schoolId) : null;
        const where = schoolId ? 'WHERE t.school_id = $1' : '';
        const params = schoolId ? [schoolId] : [];
        const teacherRows = await query(`
            SELECT t.*, u.name AS user_name, u.username, u.email, u.phone_number
            FROM teachers t
            JOIN users u ON t.user_id = u.id
            ${where}
            ORDER BY u.name
        `, params);

        const teachers = await Promise.all(teacherRows.rows.map(async (row) => {
            const teacherId = row.id;
            const [subjectsRes, classesRes, balanceRes] = await Promise.all([
                query('SELECT s.id, s.name FROM subjects s JOIN teacher_subjects ts ON s.id = ts.subject_id WHERE ts.teacher_id = $1', [teacherId]),
                query(`
                    SELECT csst.class_name AS "className", csst.section, csst.subject_id AS "subjectId", s.name AS "subjectName", COALESCE(tc.is_incharge, false) AS "isIncharge"
                    FROM class_section_subject_teacher csst
                    JOIN subjects s ON s.id = csst.subject_id
                    LEFT JOIN teacher_classes tc ON tc.teacher_id = csst.teacher_id AND tc.class_name = csst.class_name AND tc.section = csst.section
                    WHERE csst.teacher_id = $1
                `, [teacherId]),
                query('SELECT leave_type, year, allowed, used FROM teacher_leave_balance WHERE teacher_id = $1', [teacherId])
            ]);
            return {
                id: row.id,
                userId: row.user_id,
                schoolId: row.school_id,
                name: row.user_name,
                username: row.username,
                email: row.email,
                phoneNumber: row.phone_number,
                salary: row.salary != null ? parseFloat(row.salary) : null,
                joinDate: row.join_date,
                status: row.status,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                subjects: subjectsRes.rows.map(r => ({ id: r.id, name: r.name })),
                classes: classesRes.rows.map(r => ({ className: r.className, section: r.section, subjectId: r.subjectId, subjectName: r.subjectName, isIncharge: r.isIncharge })),
                leaveBalance: balanceRes.rows.map(r => ({ leaveType: r.leave_type, year: r.year, allowed: r.allowed, used: r.used })),
                leftAt: row.left_at
            };
        }));

        res.json(teachers);
    } catch (error) {
        console.error('Teachers list error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/teachers – create teacher (user + teachers + teacher_subjects + teacher_classes + leave balance)
router.post('/', async (req, res) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const { name, username, password, email, phoneNumber, salary, joinDate, subjectIds = [], classes = [], schoolId } = req.body;
        const sid = stringToUUID(schoolId);
        if (!name || !username || !password || !schoolId) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'name, username, password, schoolId required' });
        }
        const userResult = await client.query(`
            INSERT INTO users (username, password, role, name, email, phone_number, status)
            VALUES ($1, $2, 'teacher', $3, $4, $5, 'active')
            RETURNING id
        `, [username, password, name, email || null, phoneNumber || null]);
        const userId = userResult.rows[0].id;
        const teacherId = generateUUID();
        await client.query(`
            INSERT INTO teachers (id, user_id, school_id, salary, join_date, status)
            VALUES ($1, $2, $3, $4, $5, 'active')
        `, [teacherId, userId, sid, salary != null ? salary : null, joinDate || null]);

        for (const subjectId of subjectIds) {
            const subId = stringToUUID(subjectId);
            await client.query('INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES ($1, $2) ON CONFLICT (teacher_id, subject_id) DO NOTHING', [teacherId, subId]);
        }
        const singleSubjectId = subjectIds.length === 1 ? stringToUUID(subjectIds[0]) : null;
        for (const c of classes) {
            const className = c.className || c.class_name || '';
            const section = c.section || 'A';
            const isIncharge = !!c.isIncharge;
            const subjectId = c.subjectId ? stringToUUID(c.subjectId) : singleSubjectId;
            if (!subjectId) continue;
            await client.query(`
                INSERT INTO class_section_subject_teacher (school_id, class_name, section, subject_id, teacher_id)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (school_id, class_name, section, subject_id) DO UPDATE SET teacher_id = EXCLUDED.teacher_id, updated_at = CURRENT_TIMESTAMP
            `, [sid, className, section, subjectId, teacherId]);
        }
        const classSectionSet = new Set(classes.map(c => `${c.className || c.class_name || ''}\0${c.section || 'A'}`));
        for (const key of classSectionSet) {
            const [className, section] = key.split('\0');
            const isIncharge = classes.some(c => (c.className || c.class_name || '') === className && (c.section || 'A') === section && !!c.isIncharge);
            await client.query(`
                INSERT INTO teacher_classes (teacher_id, class_name, section, school_id, is_incharge)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (teacher_id, school_id, class_name, section) DO UPDATE SET is_incharge = EXCLUDED.is_incharge
            `, [teacherId, className, section, sid, isIncharge]);
        }

        const year = new Date().getFullYear();
        for (const [leaveType, allowed] of Object.entries(DEFAULT_LEAVE_ALLOWED)) {
            await client.query(`
                INSERT INTO teacher_leave_balance (teacher_id, leave_type, year, allowed, used)
                VALUES ($1, $2, $3, $4, 0)
                ON CONFLICT (teacher_id, leave_type, year) DO NOTHING
            `, [teacherId, leaveType, year, allowed]);
        }

        await client.query('COMMIT');
        res.status(201).json({ id: teacherId, userId, message: 'Teacher created' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create teacher error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// PATCH /api/teachers/:id/leave – set left_at and status = 'left'
router.patch('/:id/leave', async (req, res) => {
    try {
        const teacherId = stringToUUID(req.params.id);
        const today = new Date().toISOString().slice(0, 10);
        const result = await query(`
            UPDATE teachers SET left_at = $1, status = 'left', updated_at = CURRENT_TIMESTAMP WHERE id = $2
            RETURNING id
        `, [today, teacherId]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Teacher not found' });
        res.json({ message: 'Teacher marked as left', leftAt: today });
    } catch (error) {
        console.error('Teacher leave error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/teachers/:id/rejoin – clear left_at, set status = 'active', optional join_date
router.patch('/:id/rejoin', async (req, res) => {
    try {
        const teacherId = stringToUUID(req.params.id);
        const { joinDate } = req.body;
        const updates = ['left_at = NULL', "status = 'active'", 'updated_at = CURRENT_TIMESTAMP'];
        const values = [teacherId];
        if (joinDate) {
            updates.push('join_date = $2');
            values.push(joinDate);
        }
        const result = await query(
            `UPDATE teachers SET ${updates.join(', ')} WHERE id = $1 RETURNING id`,
            values
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Teacher not found' });
        res.json({ message: 'Teacher re-joined', status: 'active' });
    } catch (error) {
        console.error('Teacher rejoin error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/teachers/:id
router.put('/:id', async (req, res) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const teacherId = stringToUUID(req.params.id);
        const { name, username, email, phoneNumber, password, salary, joinDate, status, subjectIds = [], classes = [] } = req.body;

        const teacherRow = await client.query('SELECT user_id, school_id FROM teachers WHERE id = $1', [teacherId]);
        if (teacherRow.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Teacher not found' });
        }
        const { user_id: userId, school_id: schoolId } = teacherRow.rows[0];

        const updates = [];
        const values = [];
        let n = 1;
        if (name !== undefined) { updates.push(`name = $${n++}`); values.push(name); }
        if (username !== undefined) { updates.push(`username = $${n++}`); values.push(username); }
        if (email !== undefined) { updates.push(`email = $${n++}`); values.push(email); }
        if (phoneNumber !== undefined) { updates.push(`phone_number = $${n++}`); values.push(phoneNumber); }
        if (password !== undefined) { updates.push(`password = $${n++}`); values.push(password); }
        if (updates.length) {
            values.push(userId);
            await client.query(`UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${n}`, values);
        }

        const teacherUpdates = [];
        const tValues = [];
        let tn = 1;
        if (salary !== undefined) { teacherUpdates.push(`salary = $${tn++}`); tValues.push(salary); }
        if (joinDate !== undefined) { teacherUpdates.push(`join_date = $${tn++}`); tValues.push(joinDate); }
        if (status !== undefined) { teacherUpdates.push(`status = $${tn++}`); tValues.push(status); }
        if (teacherUpdates.length) {
            tValues.push(teacherId);
            await client.query(`UPDATE teachers SET ${teacherUpdates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${tn}`, tValues);
        }

        if (Array.isArray(subjectIds)) {
            await client.query('DELETE FROM teacher_subjects WHERE teacher_id = $1', [teacherId]);
            for (const subjectId of subjectIds) {
                await client.query('INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES ($1, $2)', [teacherId, stringToUUID(subjectId)]);
            }
        }
        if (Array.isArray(classes)) {
            const singleSubjectId = subjectIds.length === 1 ? subjectIds[0] : null;
            const normalized = classes.map(c => ({
                className: c.className || c.class_name || '',
                section: c.section || 'A',
                subjectId: c.subjectId || singleSubjectId,
                isIncharge: !!c.isIncharge
            })).filter(c => c.subjectId);
            await client.query('DELETE FROM class_section_subject_teacher WHERE teacher_id = $1', [teacherId]);
            for (const c of normalized) {
                const subId = stringToUUID(c.subjectId);
                await client.query(`
                    INSERT INTO class_section_subject_teacher (school_id, class_name, section, subject_id, teacher_id)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (school_id, class_name, section, subject_id) DO UPDATE SET teacher_id = EXCLUDED.teacher_id, updated_at = CURRENT_TIMESTAMP
                `, [schoolId, c.className, c.section, subId, teacherId]);
            }
            const classSectionSet = new Set(normalized.map(c => `${c.className}\0${c.section}`));
            await client.query('DELETE FROM teacher_classes WHERE teacher_id = $1', [teacherId]);
            for (const key of classSectionSet) {
                const [className, section] = key.split('\0');
                const isIncharge = normalized.some(c => c.className === className && c.section === section && c.isIncharge);
                await client.query(`
                    INSERT INTO teacher_classes (teacher_id, class_name, section, school_id, is_incharge)
                    VALUES ($1, $2, $3, $4, $5)
                `, [teacherId, className, section, schoolId, isIncharge]);
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'Teacher updated' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update teacher error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// DELETE /api/teachers/:id – deactivate (set status inactive) or hard delete
router.delete('/:id', async (req, res) => {
    try {
        const teacherId = stringToUUID(req.params.id);
        await query('UPDATE teachers SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['inactive', teacherId]);
        res.json({ message: 'Teacher deactivated' });
    } catch (error) {
        console.error('Delete teacher error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/teachers/seed – seed sample teachers with subjects and class assignments for a school
// Body: { schoolId }
router.post('/seed', async (req, res) => {
    const client = await getClient();
    try {
        const { schoolId } = req.body;
        const sid = stringToUUID(schoolId);
        if (!sid) return res.status(400).json({ error: 'schoolId required' });

        const subResult = await client.query(`
            SELECT id, name FROM subjects WHERE school_id IS NULL OR school_id = $1 ORDER BY is_default DESC, name
        `, [sid]);
        const subjectIds = subResult.rows.map(r => r.id);
        if (subjectIds.length === 0) return res.status(400).json({ error: 'No subjects found. Run migrations to create default subjects.' });

        const seedTeachers = [
            { name: 'Ramesh Kumar', subjects: [0, 1, 2], classes: [{ name: '1', section: 'A' }, { name: '2', section: 'A' }] },
            { name: 'Sunita Reddy', subjects: [1, 2, 3], classes: [{ name: '1', section: 'A' }, { name: '2', section: 'A' }] },
            { name: 'Vijay Singh', subjects: [3, 4], classes: [{ name: '3', section: 'A' }, { name: '4', section: 'A' }] },
            { name: 'Lakshmi Devi', subjects: [0, 5], classes: [{ name: '3', section: 'A' }, { name: '4', section: 'A' }] },
            { name: 'Rajesh Nair', subjects: [4, 5, 6], classes: [{ name: '5', section: 'A' }, { name: '6', section: 'A' }] },
            { name: 'Priya Sharma', subjects: [2, 6, 7], classes: [{ name: '5', section: 'A' }, { name: '6', section: 'A' }] },
            { name: 'Suresh Patel', subjects: [7, 8], classes: [{ name: '7', section: 'A' }, { name: '8', section: 'A' }] },
            { name: 'Anita Krishnan', subjects: [0, 2, 5], classes: [{ name: '7', section: 'A' }, { name: '8', section: 'A' }] }
        ];

        const year = new Date().getFullYear();
        const created = [];
        await client.query('BEGIN');

        for (let i = 0; i < seedTeachers.length; i++) {
            const st = seedTeachers[i];
            const username = `seed_teacher_${sid.replace(/-/g, '').slice(0, 8)}_${i + 1}`;
            const password = 'Teacher@1';
            const userResult = await client.query(`
                INSERT INTO users (username, password, role, name, email, phone_number, status)
                VALUES ($1, $2, 'teacher', $3, NULL, NULL, 'active')
                ON CONFLICT (username) DO NOTHING
                RETURNING id
            `, [username, password, st.name]);
            if (userResult.rowCount === 0) continue;
            const userId = userResult.rows[0].id;
            const teacherId = generateUUID();
            await client.query(`
                INSERT INTO teachers (id, user_id, school_id, salary, join_date, status)
                VALUES ($1, $2, $3, NULL, CURRENT_DATE, 'active')
            `, [teacherId, userId, sid]);

            const subs = st.subjects.map(idx => subjectIds[idx % subjectIds.length]);
            for (const subId of subs) {
                await client.query(`
                    INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES ($1, $2) ON CONFLICT (teacher_id, subject_id) DO NOTHING
                `, [teacherId, subId]);
            }
            for (let ci = 0; ci < st.classes.length; ci++) {
                const cls = st.classes[ci];
                const subId = subs[ci % subs.length];
                await client.query(`
                    INSERT INTO class_section_subject_teacher (school_id, class_name, section, subject_id, teacher_id)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (school_id, class_name, section, subject_id) DO UPDATE SET teacher_id = EXCLUDED.teacher_id, updated_at = CURRENT_TIMESTAMP
                `, [sid, cls.name, cls.section, subId, teacherId]);
            }
            for (const cls of st.classes) {
                await client.query(`
                    INSERT INTO teacher_classes (teacher_id, class_name, section, school_id, is_incharge)
                    VALUES ($1, $2, $3, $4, false)
                    ON CONFLICT (teacher_id, school_id, class_name, section) DO NOTHING
                `, [teacherId, cls.name, cls.section, sid]);
            }
            for (const [leaveType, allowed] of Object.entries(DEFAULT_LEAVE_ALLOWED)) {
                await client.query(`
                    INSERT INTO teacher_leave_balance (teacher_id, leave_type, year, allowed, used)
                    VALUES ($1, $2, $3, $4, 0) ON CONFLICT (teacher_id, leave_type, year) DO NOTHING
                `, [teacherId, leaveType, year, allowed]);
            }
            created.push({ id: teacherId, name: st.name, username });
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'Teachers seeded', count: created.length, teachers: created });
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('Seed teachers error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

export default router;
