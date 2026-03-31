import express from 'express';
import { query, getClient } from '../../database/db.js';
import { stringToUUID, generateUUID } from '../utils/helpers.js';

const router = express.Router();

// GET /api/classes?schoolId=
router.get('/', async (req, res) => {
    try {
        const schoolId = req.query.schoolId ? stringToUUID(req.query.schoolId) : null;
        if (!schoolId) return res.status(400).json({ error: 'schoolId required' });
        const result = await query(
            `SELECT id, name, sections, medium, class_teacher, class_incharge_teacher_id
             FROM classes WHERE school_id = $1 ORDER BY name`,
            [schoolId]
        );
        res.json(result.rows.map(row => ({
            id: row.id,
            name: row.name,
            sections: row.sections || [],
            medium: row.medium || [],
            classTeacher: row.class_teacher,
            classInchargeTeacherId: row.class_incharge_teacher_id || null
        })));
    } catch (error) {
        console.error('Classes list error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/classes/section-subject-teachers?schoolId=&className=&section=
router.get('/section-subject-teachers', async (req, res) => {
    try {
        const schoolId = req.query.schoolId ? stringToUUID(req.query.schoolId) : null;
        const className = req.query.className || '';
        const section = req.query.section || '';
        if (!schoolId || !className) return res.status(400).json({ error: 'schoolId and className required' });
        const result = await query(`
            SELECT csst.subject_id AS "subjectId", s.name AS "subjectName",
                   csst.teacher_id AS "teacherId", u.name AS "teacherName"
            FROM class_section_subject_teacher csst
            JOIN subjects s ON s.id = csst.subject_id
            JOIN teachers t ON t.id = csst.teacher_id
            JOIN users u ON u.id = t.user_id
            WHERE csst.school_id = $1 AND csst.class_name = $2 AND csst.section = $3
        `, [schoolId, className, section]);
        res.json(result.rows);
    } catch (error) {
        console.error('Section subject teachers list error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/classes/section-subject-teachers
router.put('/section-subject-teachers', async (req, res) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const { schoolId, className, section, assignments } = req.body;
        const sid = stringToUUID(schoolId);
        if (!sid || !className || !section) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'schoolId, className, section required' });
        }
        const assignList = Array.isArray(assignments) ? assignments : [];
        await client.query(
            `DELETE FROM class_section_subject_teacher WHERE school_id = $1 AND class_name = $2 AND section = $3`,
            [sid, className, section]
        );
        const teacherIds = new Set();
        for (const a of assignList) {
            const subjectId = stringToUUID(a.subjectId);
            const teacherId = stringToUUID(a.teacherId);
            if (!subjectId || !teacherId) continue;
            await client.query(`
                INSERT INTO class_section_subject_teacher (school_id, class_name, section, subject_id, teacher_id)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (school_id, class_name, section, subject_id) DO UPDATE SET teacher_id = EXCLUDED.teacher_id, updated_at = CURRENT_TIMESTAMP
            `, [sid, className, section, subjectId, teacherId]);
            teacherIds.add(teacherId);
        }
        await client.query(
            `DELETE FROM teacher_classes WHERE school_id = $1 AND class_name = $2 AND section = $3`,
            [sid, className, section]
        );
        for (const teacherId of teacherIds) {
            await client.query(`
                INSERT INTO teacher_classes (teacher_id, class_name, section, school_id, is_incharge)
                VALUES ($1, $2, $3, $4, FALSE)
            `, [teacherId, className, section, sid]);
        }
        await client.query('COMMIT');
        res.json({ message: 'Section subject teachers saved', count: assignList.length });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Section subject teachers save error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// POST /api/classes
router.post('/', async (req, res) => {
    try {
        const { schoolId, name, sections = [], medium = [] } = req.body;
        const sid = stringToUUID(schoolId);
        if (!sid || !name) return res.status(400).json({ error: 'schoolId and name required' });
        const id = generateUUID();
        await query(`
            INSERT INTO classes (id, school_id, name, sections, medium)
            VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
        `, [id, sid, name, JSON.stringify(sections), JSON.stringify(medium)]);
        res.status(201).json({ id, name, sections, medium, message: 'Class created' });
    } catch (error) {
        if (error.code === '23505') return res.status(409).json({ error: 'Class with this name already exists' });
        console.error('Create class error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/classes/:id
router.put('/:id', async (req, res) => {
    try {
        const id = stringToUUID(req.params.id);
        const { name, sections, medium, classInchargeTeacherId } = req.body;
        const updates = [];
        const values = [];
        let n = 1;
        if (name !== undefined) { updates.push(`name = $${n++}`); values.push(name); }
        if (sections !== undefined) { updates.push(`sections = $${n++}::jsonb`); values.push(JSON.stringify(sections)); }
        if (medium !== undefined) { updates.push(`medium = $${n++}::jsonb`); values.push(JSON.stringify(medium)); }
        if (classInchargeTeacherId !== undefined) {
            updates.push(`class_incharge_teacher_id = $${n++}`);
            values.push(classInchargeTeacherId ? stringToUUID(classInchargeTeacherId) : null);
        }
        if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
        values.push(id);
        await query(`UPDATE classes SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${n}`, values);
        res.json({ message: 'Class updated' });
    } catch (error) {
        if (error.code === '23505') return res.status(409).json({ error: 'Class with this name already exists' });
        console.error('Update class error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/classes/:id
router.delete('/:id', async (req, res) => {
    try {
        const id = stringToUUID(req.params.id);
        const row = await query('SELECT school_id, name FROM classes WHERE id = $1', [id]);
        if (row.rows.length === 0) return res.status(404).json({ error: 'Class not found' });
        const { school_id: schoolId, name: className } = row.rows[0];
        await query('DELETE FROM class_section_subject_teacher WHERE school_id = $1 AND class_name = $2', [schoolId, className]);
        await query('DELETE FROM teacher_classes WHERE school_id = $1 AND class_name = $2', [schoolId, className]);
        await query('DELETE FROM classes WHERE id = $1', [id]);
        res.json({ message: 'Class deleted' });
    } catch (error) {
        console.error('Delete class error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
