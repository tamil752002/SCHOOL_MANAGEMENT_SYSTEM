import express from 'express';
import { query, getClient } from '../../database/db.js';
import { stringToUUID } from '../utils/helpers.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const schoolId = req.query.schoolId ? stringToUUID(req.query.schoolId) : null;
        const q = schoolId
            ? query('SELECT * FROM settings WHERE school_id = $1 LIMIT 1', [schoolId])
            : query('SELECT * FROM settings LIMIT 1');
        const result = await q;
        const row = result.rows[0];
        if (!row) return res.json({});
        res.json({
            schoolId: row.school_id,
            currentAcademicYear: row.current_academic_year,
            schoolName: row.school_name,
            schoolAddress: row.school_address,
            schoolPhone: row.school_phone,
            schoolEmail: row.school_email,
            admissionNumberPrefix: row.admission_number_prefix,
            admissionNumberLength: row.admission_number_length,
            attendanceThreshold: row.attendance_threshold,
            feeReminderDays: row.fee_reminder_days,
            backupFrequency: row.backup_frequency,
            schoolSealImage: row.school_seal_image,
            principalSignatureImage: row.principal_signature_image,
            subjects: row.subjects || []
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/settings/academic-year – set current_academic_year and sync student class/section from enrollments
router.patch('/academic-year', async (req, res) => {
    const client = await getClient();
    try {
        const { schoolId, currentAcademicYear } = req.body;
        const sid = stringToUUID(schoolId);
        if (!sid || !currentAcademicYear) {
            return res.status(400).json({ error: 'schoolId and currentAcademicYear required' });
        }
        await client.query('BEGIN');

        await client.query(`
            UPDATE settings SET current_academic_year = $1, updated_at = CURRENT_TIMESTAMP WHERE school_id = $2
        `, [currentAcademicYear, sid]);

        const hasEnrollments = await client.query(`
            SELECT 1 FROM student_enrollments WHERE school_id = $1 AND academic_year = $2 LIMIT 1
        `, [sid, currentAcademicYear]);
        if (hasEnrollments.rows.length > 0) {
            await client.query(`
                UPDATE students s SET student_class = se.class_name, section = se.section, updated_at = CURRENT_TIMESTAMP
                FROM student_enrollments se
                WHERE se.student_id = s.id AND se.school_id = $1 AND se.academic_year = $2
            `, [sid, currentAcademicYear]);
        }

        await client.query('COMMIT');
        res.json({ message: 'Academic year updated', currentAcademicYear });
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

export default router;
