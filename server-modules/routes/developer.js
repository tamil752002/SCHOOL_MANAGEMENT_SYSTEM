import express from 'express';
import { query, getClient } from '../../database/db.js';
import { stringToUUID, generateUUID } from '../utils/helpers.js';
import { cacheMiddleware, invalidateCache } from '../middleware/cache.js';

const router = express.Router();

router.get('/developer-data', cacheMiddleware({ ttl: 300, prefix: 'api:developer' }), async (req, res) => {
    try {
        const schoolsResult = await query('SELECT * FROM schools ORDER BY created_at DESC');
        const schools = schoolsResult.rows.map(row => ({
            id: row.id != null ? String(row.id) : row.id,
            name: row.name,
            address: row.address ?? '',
            contactNumber: row.contact_number ?? '',
            email: row.email ?? '',
            status: row.status,
            createdAt: row.created_at,
            studentUserIdPrefix: row.student_user_id_prefix || ''
        }));

        const adminsResult = await query(`
            SELECT a.*, u.username, u.password, u.name, u.email 
            FROM admins a
            JOIN users u ON a.user_id = u.id
            ORDER BY a.created_at DESC
        `);
        const admins = adminsResult.rows.map(row => ({
            id: row.id != null ? String(row.id) : row.id,
            schoolId: row.school_id != null ? String(row.school_id) : row.school_id,
            name: row.name,
            email: row.email,
            username: row.username,
            password: row.password,
            status: row.status,
            createdAt: row.created_at
        }));

        const contactsResult = await query('SELECT * FROM contacts ORDER BY created_at DESC');
        const contacts = contactsResult.rows.map(row => ({
            id: row.id,
            name: row.name,
            email: row.email,
            phone: row.phone,
            message: row.message,
            schoolName: row.school_name,
            status: row.status,
            createdAt: row.created_at
        }));

        res.json({
            schools,
            admins,
            contacts
        });
    } catch (error) {
        console.error('Error fetching developer data:', error);
        res.status(500).json({ error: 'Failed to fetch developer data', details: error.message });
    }
});

router.post('/developer-data', invalidateCache(['api:developer:*']), async (req, res) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const { schools, admins, contacts } = req.body;

        if (Array.isArray(schools)) {
            for (const school of schools) {
                const schoolId = stringToUUID(school.id);
                console.log(`Syncing school: ${school.name} (ID: ${school.id} -> UUID: ${schoolId})`);
                const result = await client.query(`
                    INSERT INTO schools (id, name, address, contact_number, email, status, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        address = EXCLUDED.address,
                        contact_number = EXCLUDED.contact_number,
                        email = EXCLUDED.email,
                        status = EXCLUDED.status,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING id
                `, [schoolId, school.name, school.address, school.contactNumber, school.email, school.status || 'active', school.createdAt || new Date()]);
                console.log(`Synced school result:`, result.rows[0]);
            }
        }

        if (Array.isArray(admins)) {
            for (const admin of admins) {
                const adminId = stringToUUID(admin.id);
                const schoolId = stringToUUID(admin.schoolId);
                
                let userId;
                const userResult = await client.query('SELECT id FROM users WHERE username = $1', [admin.username || admin.email]);
                if (userResult.rows.length > 0) {
                    userId = userResult.rows[0].id;
                    await client.query('UPDATE users SET password = $1, name = $2, email = $3 WHERE id = $4', [admin.password, admin.name, admin.email, userId]);
                } else {
                    const newUser = await client.query(
                        'INSERT INTO users (id, username, password, role, name, email) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
                        [generateUUID(), admin.username || admin.email, admin.password, 'admin', admin.name, admin.email]
                    );
                    userId = newUser.rows[0].id;
                }

                await client.query(`
                    INSERT INTO admins (id, user_id, school_id, created_at)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (id) DO UPDATE SET
                        updated_at = CURRENT_TIMESTAMP
                `, [adminId, userId, schoolId, admin.createdAt || new Date()]);
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'Developer data synced successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error syncing developer data:', error);
        res.status(500).json({ error: 'Failed to sync developer data', details: error.message });
    } finally {
        client.release();
    }
});

// GET /api/developer/school-stats - Get statistics for all schools
router.get('/developer/school-stats', cacheMiddleware({ ttl: 180, prefix: 'api:developer:stats' }), async (req, res) => {
    try {
        // Get all schools with admin and student counts
        const statsQuery = `
            SELECT 
                s.id as school_id,
                s.name as school_name,
                s.email as school_email,
                s.contact_number as school_contact,
                s.status as school_status,
                s.created_at,
                COUNT(DISTINCT a.id) as admin_count,
                COUNT(DISTINCT st.id) as student_count
            FROM schools s
            LEFT JOIN admins a ON s.id = a.school_id
            LEFT JOIN students st ON s.id = st.school_id
            GROUP BY s.id, s.name, s.email, s.contact_number, s.status, s.created_at
            ORDER BY s.created_at DESC
        `;
        
        const statsResult = await query(statsQuery);
        
        const schoolStatistics = statsResult.rows.map(row => ({
            schoolId: row.school_id,
            schoolName: row.school_name,
            schoolEmail: row.school_email,
            schoolContact: row.school_contact,
            schoolStatus: row.school_status,
            adminCount: parseInt(row.admin_count) || 0,
            studentCount: parseInt(row.student_count) || 0,
            createdAt: row.created_at
        }));

        // Calculate overall statistics
        const totalSchools = schoolStatistics.length;
        const activeSchools = schoolStatistics.filter(s => s.schoolStatus === 'active').length;
        const blockedSchools = schoolStatistics.filter(s => s.schoolStatus === 'blocked').length;
        const totalAdmins = schoolStatistics.reduce((sum, s) => sum + s.adminCount, 0);
        const totalStudents = schoolStatistics.reduce((sum, s) => sum + s.studentCount, 0);

        res.json({
            totalSchools,
            totalAdmins,
            totalStudents,
            activeSchools,
            blockedSchools,
            schoolStatistics
        });
    } catch (error) {
        console.error('Error fetching school statistics:', error);
        res.status(500).json({ error: 'Failed to fetch school statistics', details: error.message });
    }
});

export default router;
