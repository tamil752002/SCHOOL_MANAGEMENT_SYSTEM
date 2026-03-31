import express from 'express';
import { query } from '../../database/db.js';
import { stringToUUID } from '../utils/helpers.js';

const router = express.Router();

// GET /api/subjects?schoolId= – list subjects (defaults + school-specific)
router.get('/', async (req, res) => {
    try {
        const schoolId = req.query.schoolId ? stringToUUID(req.query.schoolId) : null;
        const result = await query(`
            SELECT id, school_id, name, is_default, created_at, updated_at
            FROM subjects
            WHERE school_id IS NULL OR school_id = $1
            ORDER BY is_default DESC, name
        `, schoolId ? [schoolId] : [null]);
        res.json(result.rows.map(row => ({
            id: row.id,
            schoolId: row.school_id,
            name: row.name,
            isDefault: row.is_default,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        })));
    } catch (error) {
        console.error('Subjects list error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/subjects – add subject (school_id, name)
router.post('/', async (req, res) => {
    try {
        const { schoolId, name } = req.body;
        if (!name) return res.status(400).json({ error: 'name required' });
        const sid = schoolId ? stringToUUID(schoolId) : null;
        const result = await query(`
            INSERT INTO subjects (school_id, name, is_default)
            VALUES ($1, $2, false)
            RETURNING id, school_id, name, is_default, created_at, updated_at
        `, [sid, name.trim()]);
        const row = result.rows[0];
        res.status(201).json({
            id: row.id,
            schoolId: row.school_id,
            name: row.name,
            isDefault: row.is_default,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        });
    } catch (error) {
        console.error('Create subject error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/subjects/:id
router.put('/:id', async (req, res) => {
    try {
        const id = stringToUUID(req.params.id);
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'name required' });
        const result = await query('SELECT is_default FROM subjects WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Subject not found' });
        if (result.rows[0].is_default) return res.status(400).json({ error: 'Cannot edit default subject' });
        await query('UPDATE subjects SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [name.trim(), id]);
        res.json({ message: 'Subject updated' });
    } catch (error) {
        console.error('Update subject error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/subjects/:id – only non-default
router.delete('/:id', async (req, res) => {
    try {
        const id = stringToUUID(req.params.id);
        const result = await query('SELECT is_default FROM subjects WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Subject not found' });
        if (result.rows[0].is_default) return res.status(400).json({ error: 'Cannot delete default subject' });
        await query('DELETE FROM subjects WHERE id = $1', [id]);
        res.json({ message: 'Subject deleted' });
    } catch (error) {
        console.error('Delete subject error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
