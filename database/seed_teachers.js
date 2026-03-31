#!/usr/bin/env node
/**
 * Seed sample teachers for a school (subjects + class assignments).
 * Usage: SCHOOL_ID=<uuid> node database/seed_teachers.js
 * Or: node database/seed_teachers.js <schoolId>
 * Requires: DATABASE_URL, and either SCHOOL_ID env or first argument.
 * Teachers get default password: Teacher@1
 */
import 'dotenv/config';
import { getClient } from './db.js';

const DEFAULT_LEAVE_ALLOWED = { sick: 10, casual: 5, loss_of_pay: 5 };

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

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

async function main() {
    const schoolId = process.env.SCHOOL_ID || process.argv[2];
    if (!schoolId) {
        console.error('Usage: SCHOOL_ID=<uuid> node database/seed_teachers.js');
        console.error('   or: node database/seed_teachers.js <schoolId>');
        process.exit(1);
    }

    const client = await getClient();
    try {
        const subResult = await client.query(`
            SELECT id, name FROM subjects WHERE school_id IS NULL OR school_id = $1 ORDER BY is_default DESC, name
        `, [schoolId]);
        const subjectIds = subResult.rows.map(r => r.id);
        if (subjectIds.length === 0) {
            console.error('No subjects found. Run migration_teacher_parent_roles.sql first.');
            process.exit(1);
        }

        const year = new Date().getFullYear();
        const prefix = schoolId.replace(/-/g, '').slice(0, 8);
        await client.query('BEGIN');
        let created = 0;

        for (let i = 0; i < seedTeachers.length; i++) {
            const st = seedTeachers[i];
            const username = `seed_teacher_${prefix}_${i + 1}`;
            const password = 'Teacher@1';
            const userResult = await client.query(`
                INSERT INTO users (username, password, role, name, email, phone_number, status)
                VALUES ($1, $2, 'teacher', $3, NULL, NULL, 'active')
                ON CONFLICT (username) DO NOTHING
                RETURNING id
            `, [username, password, st.name]);
            if (userResult.rowCount === 0) {
                console.log('Skip (exists):', username);
                continue;
            }
            const userId = userResult.rows[0].id;
            const teacherId = generateUUID();
            await client.query(`
                INSERT INTO teachers (id, user_id, school_id, salary, join_date, status)
                VALUES ($1, $2, $3, NULL, CURRENT_DATE, 'active')
            `, [teacherId, userId, schoolId]);

            for (const idx of st.subjects) {
                const subId = subjectIds[idx % subjectIds.length];
                await client.query(`
                    INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES ($1, $2) ON CONFLICT (teacher_id, subject_id) DO NOTHING
                `, [teacherId, subId]);
            }
            for (let ci = 0; ci < st.classes.length; ci++) {
                const cls = st.classes[ci];
                const subId = subjectIds[st.subjects[ci % st.subjects.length] % subjectIds.length];
                await client.query(`
                    INSERT INTO class_section_subject_teacher (school_id, class_name, section, subject_id, teacher_id)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (school_id, class_name, section, subject_id) DO UPDATE SET teacher_id = EXCLUDED.teacher_id, updated_at = CURRENT_TIMESTAMP
                `, [schoolId, cls.name, cls.section, subId, teacherId]);
            }
            for (const cls of st.classes) {
                await client.query(`
                    INSERT INTO teacher_classes (teacher_id, class_name, section, school_id, is_incharge)
                    VALUES ($1, $2, $3, $4, false)
                    ON CONFLICT (teacher_id, school_id, class_name, section) DO NOTHING
                `, [teacherId, cls.name, cls.section, schoolId]);
            }
            for (const [leaveType, allowed] of Object.entries(DEFAULT_LEAVE_ALLOWED)) {
                await client.query(`
                    INSERT INTO teacher_leave_balance (teacher_id, leave_type, year, allowed, used)
                    VALUES ($1, $2, $3, $4, 0) ON CONFLICT (teacher_id, leave_type, year) DO NOTHING
                `, [teacherId, leaveType, year, allowed]);
            }
            created++;
            console.log('Created:', st.name, username);
        }

        await client.query('COMMIT');
        console.log('Done. Seeded', created, 'teachers. Default password: Teacher@1');
    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        console.error(err);
        process.exit(1);
    } finally {
        client.release();
    }
}

main();
