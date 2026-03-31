import express from 'express';
import { query, getClient } from '../../database/db.js';
import { 
    stringToUUID, 
    optionalUUID, 
    rowToStudent, 
    generateUUID 
} from '../utils/helpers.js';
import { saveStudentWithUser } from './students.js';
import { saveAttendanceRecord } from './attendance.js';
import { saveExamRecord } from './exams.js';
import { saveExam } from './exams.js';
import { saveActivity } from './students.js';
import { cacheMiddleware, invalidateSchoolCache } from '../middleware/cache.js';

const router = express.Router();

/** Normalize date to YYYY-MM-DD string so calendar dates don't shift by timezone (same fix as attendance/holidays). */
function dateToYYYYMMDD(val) {
    if (val == null) return null;
    if (typeof val === 'string') {
        if (val.includes('T')) return val.split('T')[0];
        if (val.includes('Z') || val.includes('+')) return val.split('Z')[0].split('+')[0].split('T')[0];
        return val;
    }
    if (val instanceof Date) {
        const y = val.getUTCFullYear();
        const m = String(val.getUTCMonth() + 1).padStart(2, '0');
        const d = String(val.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    return null;
}

// Helper to save student activities (if not in students.js)
async function saveStudentActivity(client, activity) {
    const id = stringToUUID(activity.id);
    const studentId = stringToUUID(activity.studentId);
    const recordedBy = optionalUUID(activity.recordedBy); // only accept valid UUID; frontend may send name
    await client.query(`
        INSERT INTO student_activities (id, student_id, type, title, description, date, recorded_by, category)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
            type = EXCLUDED.type,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            date = EXCLUDED.date,
            recorded_by = EXCLUDED.recorded_by,
            category = EXCLUDED.category
    `, [id, studentId, activity.type, activity.title, activity.description, activity.date, recordedBy, activity.category]);
}

// Helper to save classes
async function saveClass(client, classData, schoolId) {
    await client.query(`
        INSERT INTO classes (school_id, name, sections, medium, class_teacher)
        VALUES ($1, $2, $3::jsonb, $4::jsonb, $5)
        ON CONFLICT (school_id, name) DO UPDATE SET
            sections = EXCLUDED.sections,
            medium = EXCLUDED.medium,
            class_teacher = EXCLUDED.class_teacher,
            updated_at = CURRENT_TIMESTAMP
    `, [schoolId, classData.name, JSON.stringify(classData.sections || []), JSON.stringify(classData.medium || []), classData.classTeacher]);
}

// Helper to save settings
async function saveSettings(client, settings, schoolId) {
    await client.query(`
        INSERT INTO settings (
            school_id, school_name, school_address, school_phone, school_email,
            current_academic_year, admission_number_prefix, admission_number_length,
            attendance_threshold, fee_reminder_days, backup_frequency,
            school_seal_image, principal_signature_image, subjects
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (school_id) DO UPDATE SET
            school_name = EXCLUDED.school_name,
            school_address = EXCLUDED.school_address,
            school_phone = EXCLUDED.school_phone,
            school_email = EXCLUDED.school_email,
            current_academic_year = EXCLUDED.current_academic_year,
            admission_number_prefix = EXCLUDED.admission_number_prefix,
            admission_number_length = EXCLUDED.admission_number_length,
            attendance_threshold = EXCLUDED.attendance_threshold,
            fee_reminder_days = EXCLUDED.fee_reminder_days,
            backup_frequency = EXCLUDED.backup_frequency,
            school_seal_image = EXCLUDED.school_seal_image,
            principal_signature_image = EXCLUDED.principal_signature_image,
            subjects = EXCLUDED.subjects,
            updated_at = CURRENT_TIMESTAMP
    `, [
        schoolId, settings.schoolName, settings.schoolAddress, settings.schoolPhone, settings.schoolEmail,
        settings.currentAcademicYear, settings.admissionNumberPrefix, settings.admissionNumberLength,
        settings.attendanceThreshold, settings.feeReminderDays, settings.backupFrequency,
        settings.schoolSealImage, settings.principalSignatureImage, settings.subjects || []
    ]);
}

// Normalize otherFees for fee structure save
function normalizeOtherFeesForSave(val) {
    if (val == null) return [];
    const raw = typeof val === 'string' ? (() => { try { return JSON.parse(val); } catch { return []; } })() : val;
    const arr = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && ('name' in raw || 'amount' in raw) ? [raw] : (raw && typeof raw === 'object' ? Object.values(raw) : []));
    return arr.filter(item => item && typeof item === 'object').map(item => ({ name: String(item.name ?? '').trim(), amount: Number(item.amount) || 0 }));
}

// Save fee structure (new schema)
async function saveFeeStructure(client, structure, schoolId) {
    const id = stringToUUID(structure.id);
    const sId = schoolId ? stringToUUID(schoolId) : (structure.schoolId ? stringToUUID(structure.schoolId) : null);
    if (!sId) return;
    const otherFeesArray = normalizeOtherFeesForSave(structure.otherFees);
    await client.query(`
        INSERT INTO fee_structures (id, school_id, class_name, academic_year, structure_type, tuition_fee, school_fee, exam_fee, van_fee, books_fee, uniform_fee, other_fees)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (class_name, academic_year, structure_type, school_id) DO UPDATE SET
            tuition_fee = EXCLUDED.tuition_fee, school_fee = EXCLUDED.school_fee, exam_fee = EXCLUDED.exam_fee,
            van_fee = EXCLUDED.van_fee, books_fee = EXCLUDED.books_fee, uniform_fee = EXCLUDED.uniform_fee,
            other_fees = EXCLUDED.other_fees, updated_at = CURRENT_TIMESTAMP
    `, [id, sId, structure.className, structure.academicYear, structure.structureType || 'curriculum', structure.tuitionFee || 0, structure.schoolFee || 0, structure.examFee || 0, structure.vanFee || 0, structure.booksFee || 0, structure.uniformFee || 0, JSON.stringify(otherFeesArray)]);
}

// Save fee structure student mapping
async function saveFeeStructureStudentMapping(client, mapping) {
    const mid = stringToUUID(mapping.id);
    const feeStructureId = stringToUUID(mapping.feeStructureId);
    const studentId = stringToUUID(mapping.studentId);
    const otherFeeName = mapping.feeType === 'other' && mapping.otherFeeName ? String(mapping.otherFeeName).trim() : '';
    await client.query(`
        INSERT INTO fee_structure_student_mapping (id, fee_structure_id, student_id, fee_type, other_fee_name, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (fee_structure_id, student_id, fee_type, other_fee_name) DO UPDATE SET created_at = EXCLUDED.created_at
    `, [mid, feeStructureId, studentId, mapping.feeType, otherFeeName, mapping.createdAt || new Date().toISOString()]);
}

// Save fee record; amount = structure/applied value (admin source of truth). Overpayment is allocated via fee structure update path.
async function saveFeeRecord(client, record) {
    const id = stringToUUID(record.id);
    const studentId = stringToUUID(record.studentId);
    const otherFeeName = record.feeType === 'other' ? String(record.otherFeeName ?? record.description ?? '').trim() : '';
    const description = record.feeType === 'other' ? otherFeeName : (record.description || '');
    const amount = parseFloat(record.amount || 0);
    const paidAmount = parseFloat(record.paidAmount ?? record.feePaid ?? 0);
    const collectedBy = record.collectedBy ? stringToUUID(record.collectedBy) : null;
    await client.query(`
        INSERT INTO fee_records (id, student_id, fee_type, other_fee_name, amount, paid_amount, due_date, paid_date, status, receipt_number, description, academic_year, collected_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (student_id, fee_type, academic_year, other_fee_name) DO UPDATE SET
            amount = EXCLUDED.amount,
            paid_amount = EXCLUDED.paid_amount,
            due_date = EXCLUDED.due_date, paid_date = EXCLUDED.paid_date, status = EXCLUDED.status,
            receipt_number = EXCLUDED.receipt_number, description = EXCLUDED.description, collected_by = EXCLUDED.collected_by,
            updated_at = CURRENT_TIMESTAMP
    `, [id, studentId, record.feeType, otherFeeName, amount, paidAmount, record.dueDate || null, record.paidDate || null, record.status || 'pending', record.receiptNumber || null, description, record.academicYear, collectedBy]);
}

// GET /api/data - Retrieve all school data with caching and pagination
router.get('/data', cacheMiddleware({ ttl: 300, prefix: 'api:data' }), async (req, res) => {
    try {
        console.log('GET /api/data - Retrieving data from PostgreSQL');
        const rawSchoolId = req.query.schoolId;
        const schoolId = rawSchoolId ? stringToUUID(rawSchoolId) : null;

        // Pagination parameters
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '0', 10); // 0 means no limit (backward compatibility)
        const offset = limit > 0 ? (page - 1) * limit : 0;

        const schoolFilter = schoolId ? 'WHERE s.school_id = $1' : '';
        const params = schoolId ? [schoolId] : [];

        // Get students with their user data (with pagination if limit is set)
        let studentsQuery = `
            SELECT s.*, u.password, u.username
            FROM students s
            JOIN users u ON s.user_id = u.id
            ${schoolFilter}
            ORDER BY s.created_at DESC
        `;
        if (limit > 0) {
            studentsQuery += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            params.push(limit, offset);
        }
        const studentsResult = await query(studentsQuery, params);
        const students = studentsResult.rows.map(row => {
            const student = rowToStudent(row);
            // Map fee fields from DB to frontend camelCase
            if (row.total_fee !== undefined) student.totalFee = parseFloat(row.total_fee || 0);
            if (row.fee_paid !== undefined) student.feePaid = parseFloat(row.fee_paid || 0);
            if (row.remaining_fee !== undefined) student.remainingFee = parseFloat(row.remaining_fee || 0);
            return student;
        });

        // Get attendance records (with pagination if limit is set)
        let attendanceParams = schoolId ? [schoolId] : [];
        let attendanceQuery = schoolId
            ? `SELECT ar.*, s.school_id
               FROM attendance_records ar
               JOIN students s ON ar.student_id = s.id
               WHERE s.school_id = $1
               ORDER BY ar.date DESC`
            : 'SELECT * FROM attendance_records ORDER BY date DESC';
        if (limit > 0) {
            attendanceQuery += ` LIMIT $${attendanceParams.length + 1} OFFSET $${attendanceParams.length + 2}`;
            attendanceParams.push(limit, offset);
        }
        const attendanceResult = await query(attendanceQuery, attendanceParams);
        const attendanceRecords = attendanceResult.rows.map(row => {
            let dateStr = row.date;
            if (dateStr) {
                if (dateStr instanceof Date) {
                    const year = dateStr.getFullYear();
                    const month = String(dateStr.getMonth() + 1).padStart(2, '0');
                    const day = String(dateStr.getDate()).padStart(2, '0');
                    dateStr = `${year}-${month}-${day}`;
                } else if (typeof dateStr === 'string') {
                    if (dateStr.includes('T')) dateStr = dateStr.split('T')[0];
                    if (dateStr.includes('+') || dateStr.includes('Z')) {
                        dateStr = dateStr.split('+')[0].split('Z')[0].split('T')[0];
                    }
                }
            }
            
            let timestampStr = row.timestamp;
            if (timestampStr && timestampStr instanceof Date) {
                timestampStr = timestampStr.toISOString();
            }
            
            return {
                id: row.id,
                studentId: row.student_id,
                date: dateStr,
                session: row.session || 'morning', // Default to 'morning' for backward compatibility
                status: row.status,
                markedBy: row.marked_by,
                timestamp: timestampStr
            };
        });

        // Get fee data from new fee tables (same camelCase shape for UI)
        let feeRecords = [];
        let feeStructures = [];
        let feeStructureStudentMappings = [];
        try {
            const feeStructureQuery = schoolId
                ? 'SELECT * FROM fee_structures WHERE school_id = $1 ORDER BY created_at DESC'
                : 'SELECT * FROM fee_structures ORDER BY created_at DESC';
            const feeStructureResult = await query(feeStructureQuery, schoolId ? [schoolId] : []);
            const normalizeOtherFees = (val) => {
                if (val == null) return [];
                const parsed = typeof val === 'string' ? (() => { try { return JSON.parse(val); } catch { return []; } })() : val;
                if (Array.isArray(parsed)) return parsed;
                if (parsed && typeof parsed === 'object') {
                    if ('name' in parsed || 'amount' in parsed) return [parsed];
                    const values = Object.values(parsed);
                    if (values.length > 0 && values.every(v => v && typeof v === 'object')) return values;
                }
                return [];
            };
            feeStructures = feeStructureResult.rows.map(row => ({
                id: row.id,
                className: row.class_name,
                academicYear: row.academic_year,
                structureType: row.structure_type || 'curriculum',
                tuitionFee: parseFloat(row.tuition_fee || 0),
                schoolFee: parseFloat(row.school_fee || 0),
                vanFee: parseFloat(row.van_fee || 0),
                booksFee: parseFloat(row.books_fee || 0),
                uniformFee: parseFloat(row.uniform_fee || 0),
                examFee: parseFloat(row.exam_fee || 0),
                otherFees: normalizeOtherFees(row.other_fees),
                schoolId: row.school_id
            }));

            const feeMappingQuery = schoolId
                ? `SELECT fsm.* FROM fee_structure_student_mapping fsm
                   JOIN fee_structures fs ON fsm.fee_structure_id = fs.id
                   WHERE fs.school_id = $1 ORDER BY fsm.created_at DESC`
                : 'SELECT * FROM fee_structure_student_mapping ORDER BY created_at DESC';
            const feeMappingResult = await query(feeMappingQuery, schoolId ? [schoolId] : []);
            feeStructureStudentMappings = feeMappingResult.rows.map(row => ({
                id: row.id,
                feeStructureId: row.fee_structure_id,
                studentId: row.student_id,
                feeType: row.fee_type,
                otherFeeName: row.other_fee_name != null ? String(row.other_fee_name) : '',
                createdAt: row.created_at
            }));

            let feeRecordQuery = schoolId
                ? `SELECT fr.* FROM fee_records fr
                   JOIN students s ON fr.student_id = s.id
                   WHERE s.school_id = $1 ORDER BY fr.created_at DESC`
                : 'SELECT * FROM fee_records ORDER BY created_at DESC';
            const feeRecordParams = schoolId ? [schoolId] : [];
            if (limit > 0) {
                feeRecordQuery += ` LIMIT $${feeRecordParams.length + 1} OFFSET $${feeRecordParams.length + 2}`;
                feeRecordParams.push(limit, offset);
            }
            const feeResult = await query(feeRecordQuery, feeRecordParams);
            const feeRecordIds = feeResult.rows.map(r => r.id);
            feeRecords = feeResult.rows.map(row => ({
                id: (row.id && row.id.toString) ? row.id.toString() : row.id,
                studentId: row.student_id,
                feeType: row.fee_type,
                amount: parseFloat(row.amount),
                paidAmount: parseFloat(row.paid_amount || 0),
                remainingFee: parseFloat(row.remaining_fee ?? (row.amount - (row.paid_amount || 0))),
                dueDate: row.due_date,
                paidDate: row.paid_date,
                status: row.status,
                receiptNumber: row.receipt_number,
                description: row.fee_type === 'other' ? (row.other_fee_name != null ? String(row.other_fee_name) : (row.description || '')) : (row.description || ''),
                academicYear: row.academic_year,
                collectedBy: row.collected_by,
                feeApplied: parseFloat(row.amount),
                feePaid: parseFloat(row.paid_amount || 0),
                allocationsFrom: [],
                allocationsTo: []
            }));
            if (feeRecordIds.length > 0) {
                try {
                    const allocQuery = `
                        SELECT a.from_fee_record_id, a.to_fee_record_id, a.amount,
                               f_from.fee_type AS from_fee_type, f_from.other_fee_name AS from_other_fee_name,
                               f_to.fee_type AS to_fee_type, f_to.other_fee_name AS to_other_fee_name
                        FROM fee_overpayment_allocations a
                        JOIN fee_records f_from ON a.from_fee_record_id = f_from.id
                        JOIN fee_records f_to ON a.to_fee_record_id = f_to.id
                        WHERE a.from_fee_record_id = ANY($1::uuid[]) OR a.to_fee_record_id = ANY($1::uuid[])
                    `;
                    const allocResult = await query(allocQuery, [feeRecordIds]);
                    const toFeeLabel = (feeType, otherFeeName) => {
                        const t = String(feeType || '').toLowerCase();
                        const name = (otherFeeName && String(otherFeeName).trim()) || '';
                        const cap = t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
                        return name ? `${cap}: ${name}` : cap;
                    };
                    for (const a of allocResult.rows) {
                        const fromLabel = toFeeLabel(a.from_fee_type, a.from_other_fee_name);
                        const toLabel = toFeeLabel(a.to_fee_type, a.to_other_fee_name);
                        const amt = parseFloat(a.amount);
                        const toId = a.to_fee_record_id?.toString?.() ?? a.to_fee_record_id;
                        const fromId = a.from_fee_record_id?.toString?.() ?? a.from_fee_record_id;
                        const recTo = feeRecords.find(r => String(r.id) === String(toId));
                        if (recTo) recTo.allocationsFrom.push({ fromFeeLabel: fromLabel, amount: amt });
                        const recFrom = feeRecords.find(r => String(r.id) === String(fromId));
                        if (recFrom) recFrom.allocationsTo.push({ toFeeLabel: toLabel, amount: amt });
                    }
                } catch (allocErr) {
                    console.warn('Fee overpayment allocations may not exist:', allocErr.message);
                }
            }
        } catch (e) {
            console.warn('Fee tables may not exist yet:', e.message);
        }

        // Get exam records (with pagination if limit is set)
        let examRecordParams = schoolId ? [schoolId] : [];
        let examRecordQuery = schoolId
            ? `SELECT er.*, s.school_id
               FROM exam_records er
               JOIN students s ON er.student_id = s.id
               WHERE s.school_id = $1
               ORDER BY er.date DESC`
            : 'SELECT * FROM exam_records ORDER BY date DESC';
        if (limit > 0) {
            examRecordQuery += ` LIMIT $${examRecordParams.length + 1} OFFSET $${examRecordParams.length + 2}`;
            examRecordParams.push(limit, offset);
        }
        const examRecordResult = await query(examRecordQuery, examRecordParams);
        const examRecords = examRecordResult.rows.map(row => ({
            id: row.id,
            studentId: row.student_id,
            examId: row.exam_id,
            examType: row.exam_type,
            subject: row.subject,
            subjectId: row.subject_id,
            maxMarks: row.max_marks,
            obtainedMarks: row.obtained_marks,
            grade: row.grade,
            date: row.date,
            academicYear: row.academic_year,
            remarks: row.remarks,
            status: row.status
        }));

        // Get exams
        const examQuery = schoolId
            ? 'SELECT * FROM exams WHERE school_id = $1 ORDER BY start_date DESC'
            : 'SELECT * FROM exams ORDER BY start_date DESC';
        const examResult = await query(examQuery, schoolId ? [schoolId] : []);
        const exams = examResult.rows.map(row => {
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
                totalMarks: row.total_marks,
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
        });

        // Get student activities
        const activityQuery = schoolId
            ? `SELECT sa.*, s.school_id
               FROM student_activities sa
               JOIN students s ON sa.student_id = s.id
               WHERE s.school_id = $1
               ORDER BY sa.date DESC`
            : 'SELECT * FROM student_activities ORDER BY date DESC';
        const activityResult = await query(activityQuery, schoolId ? [schoolId] : []);
        const studentActivities = activityResult.rows.map(row => ({
            id: row.id,
            studentId: row.student_id,
            type: row.type,
            title: row.title,
            description: row.description,
            date: row.date,
            recordedBy: row.recorded_by,
            category: row.category
        }));

        // Get classes (include class_incharge_teacher_id if column exists)
        const classQuery = schoolId
            ? 'SELECT * FROM classes WHERE school_id = $1 ORDER BY name'
            : 'SELECT * FROM classes ORDER BY name';
        const classResult = await query(classQuery, schoolId ? [schoolId] : []);
        const classes = classResult.rows.map(row => ({
            id: row.id,
            name: row.name,
            sections: row.sections || [],
            medium: row.medium || [],
            classTeacher: row.class_teacher,
            classInchargeTeacherId: row.class_incharge_teacher_id || null
        }));

        // Get settings
        const settingsQuery = schoolId
            ? 'SELECT * FROM settings WHERE school_id = $1 LIMIT 1'
            : 'SELECT * FROM settings LIMIT 1';
        const settingsResult = await query(settingsQuery, schoolId ? [schoolId] : []);
        const settings = settingsResult.rows[0] ? {
            schoolName: settingsResult.rows[0].school_name,
            schoolAddress: settingsResult.rows[0].school_address,
            schoolPhone: settingsResult.rows[0].school_phone,
            schoolEmail: settingsResult.rows[0].school_email,
            currentAcademicYear: settingsResult.rows[0].current_academic_year,
            admissionNumberPrefix: settingsResult.rows[0].admission_number_prefix,
            admissionNumberLength: settingsResult.rows[0].admission_number_length,
            attendanceThreshold: settingsResult.rows[0].attendance_threshold,
            feeReminderDays: settingsResult.rows[0].fee_reminder_days,
            backupFrequency: settingsResult.rows[0].backup_frequency,
            schoolSealImage: settingsResult.rows[0].school_seal_image,
            principalSignatureImage: settingsResult.rows[0].principal_signature_image,
            subjects: settingsResult.rows[0].subjects || []
        } : {};

        // Get conduct certificates
        const certificateQuery = schoolId
            ? `SELECT cc.*, s.school_id
               FROM conduct_certificates cc
               JOIN students s ON cc.student_id = s.id
               WHERE s.school_id = $1
               ORDER BY cc.issue_date DESC`
            : 'SELECT * FROM conduct_certificates ORDER BY issue_date DESC';
        const certificateResult = await query(certificateQuery, schoolId ? [schoolId] : []);
        const conductCertificates = certificateResult.rows.map(row => ({
            id: row.id,
            studentId: row.student_id,
            issueDate: row.issue_date,
            academicYear: row.academic_year,
            certificateNumber: row.certificate_number,
            characterRating: row.character_rating,
            attendance: row.attendance ? parseFloat(row.attendance) : undefined,
            remarks: row.remarks,
            status: row.status,
            downloadCount: row.download_count,
            lastDownloaded: row.last_downloaded
        }));

        // Get holiday events
        let holidayEvents = [];
        try {
            const holidayQuery = schoolId 
                ? 'SELECT * FROM holiday_events WHERE school_id = $1 ORDER BY start_date' 
                : 'SELECT * FROM holiday_events ORDER BY start_date';
            const holidayResult = await query(holidayQuery, schoolId ? [schoolId] : []);
            holidayEvents = holidayResult.rows.map(row => {
                // Convert start_date to YYYY-MM-DD string, handling Date objects and strings
                let startDateStr = row.start_date;
                if (startDateStr) {
                    if (startDateStr instanceof Date) {
                        const year = startDateStr.getFullYear();
                        const month = String(startDateStr.getMonth() + 1).padStart(2, '0');
                        const day = String(startDateStr.getDate()).padStart(2, '0');
                        startDateStr = `${year}-${month}-${day}`;
                    } else if (typeof startDateStr === 'string') {
                        if (startDateStr.includes('T')) startDateStr = startDateStr.split('T')[0];
                        if (startDateStr.includes('+') || startDateStr.includes('Z')) {
                            startDateStr = startDateStr.split('+')[0].split('Z')[0].split('T')[0];
                        }
                    }
                }
                
                // Convert end_date to YYYY-MM-DD string, handling Date objects and strings
                let endDateStr = row.end_date;
                if (endDateStr) {
                    if (endDateStr instanceof Date) {
                        const year = endDateStr.getFullYear();
                        const month = String(endDateStr.getMonth() + 1).padStart(2, '0');
                        const day = String(endDateStr.getDate()).padStart(2, '0');
                        endDateStr = `${year}-${month}-${day}`;
                    } else if (typeof endDateStr === 'string') {
                        if (endDateStr.includes('T')) endDateStr = endDateStr.split('T')[0];
                        if (endDateStr.includes('+') || endDateStr.includes('Z')) {
                            endDateStr = endDateStr.split('+')[0].split('Z')[0].split('T')[0];
                        }
                    }
                }
                
                return {
                    id: row.id,
                    type: row.type,
                    title: row.title,
                    startDate: startDateStr,
                    endDate: endDateStr,
                    reason: row.reason,
                    schoolId: row.school_id
                };
            });
        } catch (e) {
            console.error('Error fetching holiday events:', e);
            // Table might not exist or other error, fallback to empty array
        }

        // Optional: teachers, subjects, leave (tables from migration_teacher_parent_roles)
        let teachers = [];
        let subjects = [];
        let teacherLeaveBalances = [];
        let teacherLeaveApplications = [];
        let studentLeaveApplications = [];
        try {
            if (schoolId) {
                const [tRes, subRes, tlbRes, tlaRes, slaRes] = await Promise.all([
                    query('SELECT t.*, u.name AS user_name, u.username, u.email, u.phone_number FROM teachers t JOIN users u ON t.user_id = u.id WHERE t.school_id = $1 ORDER BY u.name', [schoolId]),
                    query('SELECT id, school_id, name, is_default FROM subjects WHERE school_id IS NULL OR school_id = $1', [schoolId]),
                    query('SELECT * FROM teacher_leave_balance WHERE teacher_id IN (SELECT id FROM teachers WHERE school_id = $1)', [schoolId]),
                    query('SELECT a.*, u.name AS teacher_name FROM teacher_leave_applications a JOIN teachers t ON a.teacher_id = t.id JOIN users u ON t.user_id = u.id WHERE t.school_id = $1 ORDER BY a.created_at DESC', [schoolId]),
                    query('SELECT a.*, s.first_name, s.last_name, s.student_class, s.section FROM student_leave_applications a JOIN students s ON a.student_id = s.id WHERE s.school_id = $1 ORDER BY a.created_at DESC', [schoolId])
                ]);
                // Enrich each teacher with subjects and classes (same shape as GET /api/teachers; classes from class_section_subject_teacher with is_incharge from teacher_classes)
                teachers = await Promise.all(tRes.rows.map(async (r) => {
                    const [subjectsRes, classesRes] = await Promise.all([
                        query('SELECT s.id, s.name FROM subjects s JOIN teacher_subjects ts ON s.id = ts.subject_id WHERE ts.teacher_id = $1', [r.id]),
                        query(`
                            SELECT csst.class_name AS "className", csst.section, csst.subject_id AS "subjectId", s.name AS "subjectName", COALESCE(tc.is_incharge, false) AS "isIncharge"
                            FROM class_section_subject_teacher csst
                            JOIN subjects s ON s.id = csst.subject_id
                            LEFT JOIN teacher_classes tc ON tc.teacher_id = csst.teacher_id AND tc.class_name = csst.class_name AND tc.section = csst.section
                            WHERE csst.teacher_id = $1
                        `, [r.id])
                    ]);
                    return {
                        id: r.id,
                        userId: r.user_id,
                        schoolId: r.school_id,
                        name: r.user_name,
                        username: r.username,
                        email: r.email,
                        phoneNumber: r.phone_number,
                        salary: r.salary != null ? parseFloat(r.salary) : null,
                        joinDate: r.join_date,
                        leftAt: r.left_at,
                        status: r.status,
                        subjects: subjectsRes.rows.map(s => ({ id: s.id, name: s.name })),
                        classes: classesRes.rows.map(c => ({ className: c.className, section: c.section, subjectId: c.subjectId, subjectName: c.subjectName, isIncharge: c.isIncharge }))
                    };
                }));
                subjects = subRes.rows.map(r => ({ id: r.id, schoolId: r.school_id, name: r.name, isDefault: r.is_default }));
                teacherLeaveBalances = tlbRes.rows.map(r => ({ id: r.id, teacherId: r.teacher_id, leaveType: r.leave_type, year: r.year, allowed: r.allowed, used: r.used }));
                teacherLeaveApplications = tlaRes.rows.map(r => ({ id: r.id, teacherId: r.teacher_id, teacherName: r.teacher_name, leaveType: r.leave_type, fromDate: r.from_date, toDate: r.to_date, reason: r.reason, status: r.status, reviewedAt: r.reviewed_at, createdAt: r.created_at }));
                studentLeaveApplications = slaRes.rows.map(r => ({ id: r.id, studentId: r.student_id, studentName: `${r.first_name || ''} ${r.last_name || ''}`.trim(), studentClass: r.student_class, section: r.section, leaveType: r.leave_type, fromDate: r.from_date, toDate: r.to_date, reason: r.reason, status: r.status, createdAt: r.created_at }));
            }
        } catch (e) {
            console.error('Error fetching teacher/parent role data:', e);
        }

        let enrollments = [];
        try {
            if (schoolId) {
                const enrollQuery = await query(`
                    SELECT se.id, se.school_id AS school_id, se.student_id AS student_id, se.academic_year AS academic_year,
                           se.class_name AS class_name, se.section AS section, se.enrollment_type AS enrollment_type,
                           se.enrolled_at AS enrolled_at, se.left_at AS left_at, se.created_at, se.updated_at,
                           s.first_name, s.last_name, s.admission_number, s.status AS student_status
                    FROM student_enrollments se
                    JOIN students s ON s.id = se.student_id
                    WHERE se.school_id = $1
                    ORDER BY se.academic_year DESC, se.class_name, se.section
                `, [schoolId]);
                enrollments = enrollQuery.rows.map(row => ({
                    id: row.id,
                    schoolId: row.school_id,
                    studentId: row.student_id,
                    academicYear: row.academic_year,
                    className: row.class_name,
                    section: row.section,
                    enrollmentType: row.enrollment_type,
                    enrolledAt: row.enrolled_at,
                    leftAt: row.left_at,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at,
                    studentName: [row.first_name, row.last_name].filter(Boolean).join(' ').trim(),
                    admissionNumber: row.admission_number,
                    studentStatus: row.student_status
                }));
            }
        } catch (e) {
            console.warn('Student enrollments table may not exist:', e.message);
        }

        const response = {
            students,
            attendanceRecords,
            feeRecords,
            feeStructures,
            feeStructureStudentMappings,
            examRecords,
            exams,
            studentActivities,
            classes,
            settings,
            conductCertificates,
            holidayEvents,
            teachers,
            subjects,
            teacherLeaveBalances,
            teacherLeaveApplications,
            studentLeaveApplications,
            enrollments,
            lastSaved: new Date().toISOString(),
            version: '2.0'
        };

        // Add pagination metadata if pagination is used
        if (limit > 0) {
            response.pagination = {
                page,
                limit,
                offset,
                hasMore: (students.length === limit || attendanceRecords.length === limit || feeRecords.length === limit || examRecords.length === limit)
            };
        }

        res.json(response);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Failed to fetch data', details: error.message });
    }
});

// POST /api/data - Bulk save data
router.post('/data', async (req, res) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const data = req.body;
        console.log('POST /api/data - Saving data to PostgreSQL');

        // Extract schoolId from data or fallback to what's available
        let schoolId = data.schoolId;
        
        if (!schoolId && data.students && data.students.length > 0) {
            schoolId = data.students[0].schoolId;
        } else if (!schoolId && data.settings && data.settings.schoolId) {
            schoolId = data.settings.schoolId;
        }
        
        const schoolUuid = schoolId ? stringToUUID(schoolId) : null;
        console.log(`Resolved schoolId: ${schoolId}, schoolUuid: ${schoolUuid}`);

        // If we have an empty students array but a schoolId, we might be overwriting valid data
        // We should check if the request is intentionally clearing data or just a partial update
        if (Array.isArray(data.students)) {
            // If schoolUuid is available, we could delete students for that school before re-adding
            // However, saveStudentWithUser uses ON CONFLICT, but it doesn't handle deletions
            // For now, let's just proceed with saving what's provided
            for (const student of data.students) {
                await saveStudentWithUser(client, student);
            }
        }

        // Save attendance
        if (Array.isArray(data.attendanceRecords)) {
            for (const record of data.attendanceRecords) {
                await saveAttendanceRecord(client, record);
            }
        }

        // Save fee structures
        if (Array.isArray(data.feeStructures)) {
            for (const structure of data.feeStructures) {
                await saveFeeStructure(client, structure, schoolId);
            }
        }

        // Save fee structure student mappings
        if (Array.isArray(data.feeStructureStudentMappings)) {
            for (const mapping of data.feeStructureStudentMappings) {
                await saveFeeStructureStudentMapping(client, mapping);
            }
        }

        // Save fee records (amount capped >= paid_amount in saveFeeRecord)
        if (Array.isArray(data.feeRecords)) {
            for (const record of data.feeRecords) {
                await saveFeeRecord(client, record);
            }
        }

        // Save exams
        if (Array.isArray(data.exams)) {
            for (const exam of data.exams) {
                await saveExam(client, exam);
            }
        }

        // Save exam records
        if (Array.isArray(data.examRecords)) {
            for (const record of data.examRecords) {
                await saveExamRecord(client, record);
            }
        }

        // Save activities
        if (Array.isArray(data.studentActivities)) {
            for (const activity of data.studentActivities) {
                await saveStudentActivity(client, activity);
            }
        }

        // Save classes
        if (Array.isArray(data.classes) && schoolUuid) {
            for (const classData of data.classes) {
                await saveClass(client, classData, schoolUuid);
            }
        }

        // Save settings
        if (data.settings && schoolUuid) {
            await saveSettings(client, data.settings, schoolUuid);
        }

        // Save holiday events
        if (Array.isArray(data.holidayEvents)) {
            console.log(`Saving ${data.holidayEvents.length} holiday events`);
            
            // First, get existing IDs from the incoming data
            const incomingIds = data.holidayEvents.map(e => stringToUUID(e.id)).filter(id => id);
            
            // Delete events that are not in the incoming data (if schoolUuid is provided)
            if (schoolUuid) {
                if (incomingIds.length > 0) {
                    await client.query('DELETE FROM holiday_events WHERE school_id = $1 AND id NOT IN (SELECT unnest($2::uuid[]))', [schoolUuid, incomingIds]);
                } else {
                    await client.query('DELETE FROM holiday_events WHERE school_id = $1', [schoolUuid]);
                }
            }

            for (const event of data.holidayEvents) {
                const id = stringToUUID(event.id);
                // Ensure we have a valid schoolId
                // If event.schoolId is missing, try to use the bulk schoolId
                const rawTargetId = event.schoolId || schoolId;
                
                if (!rawTargetId) {
                    console.warn(`Skipping event ${event.reason || 'unnamed'} due to missing schoolId`);
                    continue;
                }
                
                const sId = stringToUUID(rawTargetId);
                
                // Normalize startDate to YYYY-MM-DD format
                let startDate = null;
                if (event.startDate) {
                    if (event.startDate instanceof Date) {
                        const year = event.startDate.getFullYear();
                        const month = String(event.startDate.getMonth() + 1).padStart(2, '0');
                        const day = String(event.startDate.getDate()).padStart(2, '0');
                        startDate = `${year}-${month}-${day}`;
                    } else if (typeof event.startDate === 'string') {
                        startDate = event.startDate;
                        // Remove time and timezone info
                        if (startDate.includes('T')) startDate = startDate.split('T')[0];
                        if (startDate.includes('+') || startDate.includes('Z')) {
                            startDate = startDate.split('+')[0].split('Z')[0].split('T')[0];
                        }
                    }
                }
                
                // Normalize endDate to YYYY-MM-DD format
                let endDate = null;
                if (event.endDate) {
                    if (event.endDate instanceof Date) {
                        const year = event.endDate.getFullYear();
                        const month = String(event.endDate.getMonth() + 1).padStart(2, '0');
                        const day = String(event.endDate.getDate()).padStart(2, '0');
                        endDate = `${year}-${month}-${day}`;
                    } else if (typeof event.endDate === 'string') {
                        endDate = event.endDate;
                        // Remove time and timezone info
                        if (endDate.includes('T')) endDate = endDate.split('T')[0];
                        if (endDate.includes('+') || endDate.includes('Z')) {
                            endDate = endDate.split('+')[0].split('Z')[0].split('T')[0];
                        }
                    }
                }
                
                console.log(`Event: ${event.reason}, ID: ${id}, SchoolId: ${sId}, Dates: ${startDate} to ${endDate}`);
                
                if (!startDate || !endDate) {
                    console.warn(`Skipping event ${event.reason} due to missing dates`);
                    continue;
                }
                
                await client.query(`
                    INSERT INTO holiday_events (id, type, title, start_date, end_date, reason, school_id)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (id) DO UPDATE SET
                        type = EXCLUDED.type,
                        title = EXCLUDED.title,
                        start_date = EXCLUDED.start_date,
                        end_date = EXCLUDED.end_date,
                        reason = EXCLUDED.reason,
                        updated_at = CURRENT_TIMESTAMP
                `, [id, event.type, event.title || null, startDate, endDate, event.reason, sId]);
            }
        }
        
        await client.query('COMMIT');
        
        // Invalidate cache for this school
        if (schoolId) {
            await invalidateSchoolCache(schoolId);
        } else {
            // Invalidate all school data cache if no schoolId
            const { deleteCacheByPattern } = await import('../utils/redis.js');
            await deleteCacheByPattern('api:data:*');
        }
        
        res.json({ message: 'Data saved successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error saving data:', error);
        res.status(500).json({ error: 'Failed to save data', details: error.message });
    } finally {
        client.release();
    }
});

export default router;
