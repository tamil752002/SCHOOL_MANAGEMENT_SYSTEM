import { query, getClient } from '../../database/db.js';
import { stringToUUID } from '../utils/helpers.js';
import { getStudents } from '../services/students.service'


export const getAllData = async (req: any) => {
   return getStudents(req.query.schoolId, req);


};



// router.get('/data', cacheMiddleware({ ttl: 300, prefix: 'api:data' }), async (req, res) => {
//     try {
//         console.log('GET /api/data - Retrieving data from PostgreSQL');
//         const rawSchoolId = req.query.schoolId;
//         const schoolId = rawSchoolId ? stringToUUID(rawSchoolId) : null;

//         // Pagination parameters
//         const page = parseInt(req.query.page || '1', 10);
//         const limit = parseInt(req.query.limit || '0', 10); // 0 means no limit (backward compatibility)
//         const offset = limit > 0 ? (page - 1) * limit : 0;

//         const schoolFilter = schoolId ? 'WHERE s.school_id = $1' : '';
//         const params = schoolId ? [schoolId] : [];

//         // Get students with their user data (with pagination if limit is set)
//         let studentsQuery = `
//             SELECT s.*, u.password, u.username
//             FROM students s
//             JOIN users u ON s.user_id = u.id
//             ${schoolFilter}
//             ORDER BY s.created_at DESC
//         `;
//         if (limit > 0) {
//             studentsQuery += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
//             params.push(limit, offset);
//         }
//         const studentsResult = await query(studentsQuery, params);
//         const students = studentsResult.rows.map(row => {
//             const student = rowToStudent(row);
//             // Map fee fields from DB to frontend camelCase
//             if (row.total_fee !== undefined) student.totalFee = parseFloat(row.total_fee || 0);
//             if (row.fee_paid !== undefined) student.feePaid = parseFloat(row.fee_paid || 0);
//             if (row.remaining_fee !== undefined) student.remainingFee = parseFloat(row.remaining_fee || 0);
//             return student;
//         });

//         // Get attendance records (with pagination if limit is set)
//         let attendanceParams = schoolId ? [schoolId] : [];
//         let attendanceQuery = schoolId
//             ? `SELECT ar.*, s.school_id
//                FROM attendance_records ar
//                JOIN students s ON ar.student_id = s.id
//                WHERE s.school_id = $1
//                ORDER BY ar.date DESC`
//             : 'SELECT * FROM attendance_records ORDER BY date DESC';
//         if (limit > 0) {
//             attendanceQuery += ` LIMIT $${attendanceParams.length + 1} OFFSET $${attendanceParams.length + 2}`;
//             attendanceParams.push(limit, offset);
//         }
//         const attendanceResult = await query(attendanceQuery, attendanceParams);
//         const attendanceRecords = attendanceResult.rows.map(row => {
//             let dateStr = row.date;
//             if (dateStr) {
//                 if (dateStr instanceof Date) {
//                     const year = dateStr.getFullYear();
//                     const month = String(dateStr.getMonth() + 1).padStart(2, '0');
//                     const day = String(dateStr.getDate()).padStart(2, '0');
//                     dateStr = `${year}-${month}-${day}`;
//                 } else if (typeof dateStr === 'string') {
//                     if (dateStr.includes('T')) dateStr = dateStr.split('T')[0];
//                     if (dateStr.includes('+') || dateStr.includes('Z')) {
//                         dateStr = dateStr.split('+')[0].split('Z')[0].split('T')[0];
//                     }
//                 }
//             }
            
//             let timestampStr = row.timestamp;
//             if (timestampStr && timestampStr instanceof Date) {
//                 timestampStr = timestampStr.toISOString();
//             }
            
//             return {
//                 id: row.id,
//                 studentId: row.student_id,
//                 date: dateStr,
//                 session: row.session || 'morning', // Default to 'morning' for backward compatibility
//                 status: row.status,
//                 markedBy: row.marked_by,
//                 timestamp: timestampStr
//             };
//         });

//         // Get fee data from new fee tables (same camelCase shape for UI)
//         let feeRecords = [];
//         let feeStructures = [];
//         let feeStructureStudentMappings = [];
//         try {
//             const feeStructureQuery = schoolId
//                 ? 'SELECT * FROM fee_structures WHERE school_id = $1 ORDER BY created_at DESC'
//                 : 'SELECT * FROM fee_structures ORDER BY created_at DESC';
//             const feeStructureResult = await query(feeStructureQuery, schoolId ? [schoolId] : []);
//             const normalizeOtherFees = (val) => {
//                 if (val == null) return [];
//                 const parsed = typeof val === 'string' ? (() => { try { return JSON.parse(val); } catch { return []; } })() : val;
//                 if (Array.isArray(parsed)) return parsed;
//                 if (parsed && typeof parsed === 'object') {
//                     if ('name' in parsed || 'amount' in parsed) return [parsed];
//                     const values = Object.values(parsed);
//                     if (values.length > 0 && values.every(v => v && typeof v === 'object')) return values;
//                 }
//                 return [];
//             };
//             feeStructures = feeStructureResult.rows.map(row => ({
//                 id: row.id,
//                 className: row.class_name,
//                 academicYear: row.academic_year,
//                 structureType: row.structure_type || 'curriculum',
//                 tuitionFee: parseFloat(row.tuition_fee || 0),
//                 schoolFee: parseFloat(row.school_fee || 0),
//                 vanFee: parseFloat(row.van_fee || 0),
//                 booksFee: parseFloat(row.books_fee || 0),
//                 uniformFee: parseFloat(row.uniform_fee || 0),
//                 examFee: parseFloat(row.exam_fee || 0),
//                 otherFees: normalizeOtherFees(row.other_fees),
//                 schoolId: row.school_id
//             }));

//             const feeMappingQuery = schoolId
//                 ? `SELECT fsm.* FROM fee_structure_student_mapping fsm
//                    JOIN fee_structures fs ON fsm.fee_structure_id = fs.id
//                    WHERE fs.school_id = $1 ORDER BY fsm.created_at DESC`
//                 : 'SELECT * FROM fee_structure_student_mapping ORDER BY created_at DESC';
//             const feeMappingResult = await query(feeMappingQuery, schoolId ? [schoolId] : []);
//             feeStructureStudentMappings = feeMappingResult.rows.map(row => ({
//                 id: row.id,
//                 feeStructureId: row.fee_structure_id,
//                 studentId: row.student_id,
//                 feeType: row.fee_type,
//                 otherFeeName: row.other_fee_name != null ? String(row.other_fee_name) : '',
//                 createdAt: row.created_at
//             }));

//             let feeRecordQuery = schoolId
//                 ? `SELECT fr.* FROM fee_records fr
//                    JOIN students s ON fr.student_id = s.id
//                    WHERE s.school_id = $1 ORDER BY fr.created_at DESC`
//                 : 'SELECT * FROM fee_records ORDER BY created_at DESC';
//             const feeRecordParams = schoolId ? [schoolId] : [];
//             if (limit > 0) {
//                 feeRecordQuery += ` LIMIT $${feeRecordParams.length + 1} OFFSET $${feeRecordParams.length + 2}`;
//                 feeRecordParams.push(limit, offset);
//             }
//             const feeResult = await query(feeRecordQuery, feeRecordParams);
//             const feeRecordIds = feeResult.rows.map(r => r.id);
//             feeRecords = feeResult.rows.map(row => ({
//                 id: (row.id && row.id.toString) ? row.id.toString() : row.id,
//                 studentId: row.student_id,
//                 feeType: row.fee_type,
//                 amount: parseFloat(row.amount),
//                 paidAmount: parseFloat(row.paid_amount || 0),
//                 remainingFee: parseFloat(row.remaining_fee ?? (row.amount - (row.paid_amount || 0))),
//                 dueDate: row.due_date,
//                 paidDate: row.paid_date,
//                 status: row.status,
//                 receiptNumber: row.receipt_number,
//                 description: row.fee_type === 'other' ? (row.other_fee_name != null ? String(row.other_fee_name) : (row.description || '')) : (row.description || ''),
//                 academicYear: row.academic_year,
//                 collectedBy: row.collected_by,
//                 feeApplied: parseFloat(row.amount),
//                 feePaid: parseFloat(row.paid_amount || 0),
//                 allocationsFrom: [],
//                 allocationsTo: []
//             }));
//             if (feeRecordIds.length > 0) {
//                 try {
//                     const allocQuery = `
//                         SELECT a.from_fee_record_id, a.to_fee_record_id, a.amount,
//                                f_from.fee_type AS from_fee_type, f_from.other_fee_name AS from_other_fee_name,
//                                f_to.fee_type AS to_fee_type, f_to.other_fee_name AS to_other_fee_name
//                         FROM fee_overpayment_allocations a
//                         JOIN fee_records f_from ON a.from_fee_record_id = f_from.id
//                         JOIN fee_records f_to ON a.to_fee_record_id = f_to.id
//                         WHERE a.from_fee_record_id = ANY($1::uuid[]) OR a.to_fee_record_id = ANY($1::uuid[])
//                     `;
//                     const allocResult = await query(allocQuery, [feeRecordIds]);
//                     const toFeeLabel = (feeType, otherFeeName) => {
//                         const t = String(feeType || '').toLowerCase();
//                         const name = (otherFeeName && String(otherFeeName).trim()) || '';
//                         const cap = t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
//                         return name ? `${cap}: ${name}` : cap;
//                     };
//                     for (const a of allocResult.rows) {
//                         const fromLabel = toFeeLabel(a.from_fee_type, a.from_other_fee_name);
//                         const toLabel = toFeeLabel(a.to_fee_type, a.to_other_fee_name);
//                         const amt = parseFloat(a.amount);
//                         const toId = a.to_fee_record_id?.toString?.() ?? a.to_fee_record_id;
//                         const fromId = a.from_fee_record_id?.toString?.() ?? a.from_fee_record_id;
//                         const recTo = feeRecords.find(r => String(r.id) === String(toId));
//                         if (recTo) recTo.allocationsFrom.push({ fromFeeLabel: fromLabel, amount: amt });
//                         const recFrom = feeRecords.find(r => String(r.id) === String(fromId));
//                         if (recFrom) recFrom.allocationsTo.push({ toFeeLabel: toLabel, amount: amt });
//                     }
//                 } catch (allocErr) {
//                     console.warn('Fee overpayment allocations may not exist:', allocErr.message);
//                 }
//             }
//         } catch (e) {
//             console.warn('Fee tables may not exist yet:', e.message);
//         }

//         // Get exam records (with pagination if limit is set)
//         let examRecordParams = schoolId ? [schoolId] : [];
//         let examRecordQuery = schoolId
//             ? `SELECT er.*, s.school_id
//                FROM exam_records er
//                JOIN students s ON er.student_id = s.id
//                WHERE s.school_id = $1
//                ORDER BY er.date DESC`
//             : 'SELECT * FROM exam_records ORDER BY date DESC';
//         if (limit > 0) {
//             examRecordQuery += ` LIMIT $${examRecordParams.length + 1} OFFSET $${examRecordParams.length + 2}`;
//             examRecordParams.push(limit, offset);
//         }
//         const examRecordResult = await query(examRecordQuery, examRecordParams);
//         const examRecords = examRecordResult.rows.map(row => ({
//             id: row.id,
//             studentId: row.student_id,
//             examId: row.exam_id,
//             examType: row.exam_type,
//             subject: row.subject,
//             subjectId: row.subject_id,
//             maxMarks: row.max_marks,
//             obtainedMarks: row.obtained_marks,
//             grade: row.grade,
//             date: row.date,
//             academicYear: row.academic_year,
//             remarks: row.remarks,
//             status: row.status
//         }));

//         // Get exams
//         const examQuery = schoolId
//             ? 'SELECT * FROM exams WHERE school_id = $1 ORDER BY start_date DESC'
//             : 'SELECT * FROM exams ORDER BY start_date DESC';
//         const examResult = await query(examQuery, schoolId ? [schoolId] : []);
//         const exams = examResult.rows.map(row => {
//             const schedule = row.schedule != null
//                 ? (Array.isArray(row.schedule) ? row.schedule : (typeof row.schedule === 'string' ? JSON.parse(row.schedule || '[]') : []))
//                 : [];
//             return {
//                 id: row.id,
//                 name: row.name,
//                 type: row.type,
//                 className: row.class_name,
//                 subjects: row.subjects || [],
//                 subject: row.subjects?.[0],
//                 startDate: dateToYYYYMMDD(row.start_date),
//                 endDate: dateToYYYYMMDD(row.end_date),
//                 academicYear: row.academic_year,
//                 totalMarks: row.total_marks,
//                 status: row.status,
//                 schoolId: row.school_id,
//                 schedule: schedule.map((e) => ({
//                     id: e.id,
//                     date: e.date,
//                     subject: e.subject ?? '',
//                     timeSlot: e.timeSlot === 'afternoon' ? 'afternoon' : 'morning',
//                     maxMarks: e.maxMarks != null ? Number(e.maxMarks) : 100
//                 }))
//             };
//         });

//         // Get student activities
//         const activityQuery = schoolId
//             ? `SELECT sa.*, s.school_id
//                FROM student_activities sa
//                JOIN students s ON sa.student_id = s.id
//                WHERE s.school_id = $1
//                ORDER BY sa.date DESC`
//             : 'SELECT * FROM student_activities ORDER BY date DESC';
//         const activityResult = await query(activityQuery, schoolId ? [schoolId] : []);
//         const studentActivities = activityResult.rows.map(row => ({
//             id: row.id,
//             studentId: row.student_id,
//             type: row.type,
//             title: row.title,
//             description: row.description,
//             date: row.date,
//             recordedBy: row.recorded_by,
//             category: row.category
//         }));

//         // Get classes (include class_incharge_teacher_id if column exists)
//         const classQuery = schoolId
//             ? 'SELECT * FROM classes WHERE school_id = $1 ORDER BY name'
//             : 'SELECT * FROM classes ORDER BY name';
//         const classResult = await query(classQuery, schoolId ? [schoolId] : []);
//         const classes = classResult.rows.map(row => ({
//             id: row.id,
//             name: row.name,
//             sections: row.sections || [],
//             medium: row.medium || [],
//             classTeacher: row.class_teacher,
//             classInchargeTeacherId: row.class_incharge_teacher_id || null
//         }));

//         // Get settings
//         const settingsQuery = schoolId
//             ? 'SELECT * FROM settings WHERE school_id = $1 LIMIT 1'
//             : 'SELECT * FROM settings LIMIT 1';
//         const settingsResult = await query(settingsQuery, schoolId ? [schoolId] : []);
//         const settings = settingsResult.rows[0] ? {
//             schoolName: settingsResult.rows[0].school_name,
//             schoolAddress: settingsResult.rows[0].school_address,
//             schoolPhone: settingsResult.rows[0].school_phone,
//             schoolEmail: settingsResult.rows[0].school_email,
//             currentAcademicYear: settingsResult.rows[0].current_academic_year,
//             admissionNumberPrefix: settingsResult.rows[0].admission_number_prefix,
//             admissionNumberLength: settingsResult.rows[0].admission_number_length,
//             attendanceThreshold: settingsResult.rows[0].attendance_threshold,
//             feeReminderDays: settingsResult.rows[0].fee_reminder_days,
//             backupFrequency: settingsResult.rows[0].backup_frequency,
//             schoolSealImage: settingsResult.rows[0].school_seal_image,
//             principalSignatureImage: settingsResult.rows[0].principal_signature_image,
//             subjects: settingsResult.rows[0].subjects || []
//         } : {};

//         // Get conduct certificates
//         const certificateQuery = schoolId
//             ? `SELECT cc.*, s.school_id
//                FROM conduct_certificates cc
//                JOIN students s ON cc.student_id = s.id
//                WHERE s.school_id = $1
//                ORDER BY cc.issue_date DESC`
//             : 'SELECT * FROM conduct_certificates ORDER BY issue_date DESC';
//         const certificateResult = await query(certificateQuery, schoolId ? [schoolId] : []);
//         const conductCertificates = certificateResult.rows.map(row => ({
//             id: row.id,
//             studentId: row.student_id,
//             issueDate: row.issue_date,
//             academicYear: row.academic_year,
//             certificateNumber: row.certificate_number,
//             characterRating: row.character_rating,
//             attendance: row.attendance ? parseFloat(row.attendance) : undefined,
//             remarks: row.remarks,
//             status: row.status,
//             downloadCount: row.download_count,
//             lastDownloaded: row.last_downloaded
//         }));

//         // Get holiday events
//         let holidayEvents = [];
//         try {
//             const holidayQuery = schoolId 
//                 ? 'SELECT * FROM holiday_events WHERE school_id = $1 ORDER BY start_date' 
//                 : 'SELECT * FROM holiday_events ORDER BY start_date';
//             const holidayResult = await query(holidayQuery, schoolId ? [schoolId] : []);
//             holidayEvents = holidayResult.rows.map(row => {
//                 // Convert start_date to YYYY-MM-DD string, handling Date objects and strings
//                 let startDateStr = row.start_date;
//                 if (startDateStr) {
//                     if (startDateStr instanceof Date) {
//                         const year = startDateStr.getFullYear();
//                         const month = String(startDateStr.getMonth() + 1).padStart(2, '0');
//                         const day = String(startDateStr.getDate()).padStart(2, '0');
//                         startDateStr = `${year}-${month}-${day}`;
//                     } else if (typeof startDateStr === 'string') {
//                         if (startDateStr.includes('T')) startDateStr = startDateStr.split('T')[0];
//                         if (startDateStr.includes('+') || startDateStr.includes('Z')) {
//                             startDateStr = startDateStr.split('+')[0].split('Z')[0].split('T')[0];
//                         }
//                     }
//                 }
                
//                 // Convert end_date to YYYY-MM-DD string, handling Date objects and strings
//                 let endDateStr = row.end_date;
//                 if (endDateStr) {
//                     if (endDateStr instanceof Date) {
//                         const year = endDateStr.getFullYear();
//                         const month = String(endDateStr.getMonth() + 1).padStart(2, '0');
//                         const day = String(endDateStr.getDate()).padStart(2, '0');
//                         endDateStr = `${year}-${month}-${day}`;
//                     } else if (typeof endDateStr === 'string') {
//                         if (endDateStr.includes('T')) endDateStr = endDateStr.split('T')[0];
//                         if (endDateStr.includes('+') || endDateStr.includes('Z')) {
//                             endDateStr = endDateStr.split('+')[0].split('Z')[0].split('T')[0];
//                         }
//                     }
//                 }
                
//                 return {
//                     id: row.id,
//                     type: row.type,
//                     title: row.title,
//                     startDate: startDateStr,
//                     endDate: endDateStr,
//                     reason: row.reason,
//                     schoolId: row.school_id
//                 };
//             });
//         } catch (e) {
//             console.error('Error fetching holiday events:', e);
//             // Table might not exist or other error, fallback to empty array
//         }

//         // Optional: teachers, subjects, leave (tables from migration_teacher_parent_roles)
//         let teachers = [];
//         let subjects = [];
//         let teacherLeaveBalances = [];
//         let teacherLeaveApplications = [];
//         let studentLeaveApplications = [];
//         try {
//             if (schoolId) {
//                 const [tRes, subRes, tlbRes, tlaRes, slaRes] = await Promise.all([
//                     query('SELECT t.*, u.name AS user_name, u.username, u.email, u.phone_number FROM teachers t JOIN users u ON t.user_id = u.id WHERE t.school_id = $1 ORDER BY u.name', [schoolId]),
//                     query('SELECT id, school_id, name, is_default FROM subjects WHERE school_id IS NULL OR school_id = $1', [schoolId]),
//                     query('SELECT * FROM teacher_leave_balance WHERE teacher_id IN (SELECT id FROM teachers WHERE school_id = $1)', [schoolId]),
//                     query('SELECT a.*, u.name AS teacher_name FROM teacher_leave_applications a JOIN teachers t ON a.teacher_id = t.id JOIN users u ON t.user_id = u.id WHERE t.school_id = $1 ORDER BY a.created_at DESC', [schoolId]),
//                     query('SELECT a.*, s.first_name, s.last_name, s.student_class, s.section FROM student_leave_applications a JOIN students s ON a.student_id = s.id WHERE s.school_id = $1 ORDER BY a.created_at DESC', [schoolId])
//                 ]);
//                 // Enrich each teacher with subjects and classes (same shape as GET /api/teachers; classes from class_section_subject_teacher with is_incharge from teacher_classes)
//                 teachers = await Promise.all(tRes.rows.map(async (r) => {
//                     const [subjectsRes, classesRes] = await Promise.all([
//                         query('SELECT s.id, s.name FROM subjects s JOIN teacher_subjects ts ON s.id = ts.subject_id WHERE ts.teacher_id = $1', [r.id]),
//                         query(`
//                             SELECT csst.class_name AS "className", csst.section, csst.subject_id AS "subjectId", s.name AS "subjectName", COALESCE(tc.is_incharge, false) AS "isIncharge"
//                             FROM class_section_subject_teacher csst
//                             JOIN subjects s ON s.id = csst.subject_id
//                             LEFT JOIN teacher_classes tc ON tc.teacher_id = csst.teacher_id AND tc.class_name = csst.class_name AND tc.section = csst.section
//                             WHERE csst.teacher_id = $1
//                         `, [r.id])
//                     ]);
//                     return {
//                         id: r.id,
//                         userId: r.user_id,
//                         schoolId: r.school_id,
//                         name: r.user_name,
//                         username: r.username,
//                         email: r.email,
//                         phoneNumber: r.phone_number,
//                         salary: r.salary != null ? parseFloat(r.salary) : null,
//                         joinDate: r.join_date,
//                         leftAt: r.left_at,
//                         status: r.status,
//                         subjects: subjectsRes.rows.map(s => ({ id: s.id, name: s.name })),
//                         classes: classesRes.rows.map(c => ({ className: c.className, section: c.section, subjectId: c.subjectId, subjectName: c.subjectName, isIncharge: c.isIncharge }))
//                     };
//                 }));
//                 subjects = subRes.rows.map(r => ({ id: r.id, schoolId: r.school_id, name: r.name, isDefault: r.is_default }));
//                 teacherLeaveBalances = tlbRes.rows.map(r => ({ id: r.id, teacherId: r.teacher_id, leaveType: r.leave_type, year: r.year, allowed: r.allowed, used: r.used }));
//                 teacherLeaveApplications = tlaRes.rows.map(r => ({ id: r.id, teacherId: r.teacher_id, teacherName: r.teacher_name, leaveType: r.leave_type, fromDate: r.from_date, toDate: r.to_date, reason: r.reason, status: r.status, reviewedAt: r.reviewed_at, createdAt: r.created_at }));
//                 studentLeaveApplications = slaRes.rows.map(r => ({ id: r.id, studentId: r.student_id, studentName: `${r.first_name || ''} ${r.last_name || ''}`.trim(), studentClass: r.student_class, section: r.section, leaveType: r.leave_type, fromDate: r.from_date, toDate: r.to_date, reason: r.reason, status: r.status, createdAt: r.created_at }));
//             }
//         } catch (e) {
//             console.error('Error fetching teacher/parent role data:', e);
//         }

//         let enrollments = [];
//         try {
//             if (schoolId) {
//                 const enrollQuery = await query(`
//                     SELECT se.id, se.school_id AS school_id, se.student_id AS student_id, se.academic_year AS academic_year,
//                            se.class_name AS class_name, se.section AS section, se.enrollment_type AS enrollment_type,
//                            se.enrolled_at AS enrolled_at, se.left_at AS left_at, se.created_at, se.updated_at,
//                            s.first_name, s.last_name, s.admission_number, s.status AS student_status
//                     FROM student_enrollments se
//                     JOIN students s ON s.id = se.student_id
//                     WHERE se.school_id = $1
//                     ORDER BY se.academic_year DESC, se.class_name, se.section
//                 `, [schoolId]);
//                 enrollments = enrollQuery.rows.map(row => ({
//                     id: row.id,
//                     schoolId: row.school_id,
//                     studentId: row.student_id,
//                     academicYear: row.academic_year,
//                     className: row.class_name,
//                     section: row.section,
//                     enrollmentType: row.enrollment_type,
//                     enrolledAt: row.enrolled_at,
//                     leftAt: row.left_at,
//                     createdAt: row.created_at,
//                     updatedAt: row.updated_at,
//                     studentName: [row.first_name, row.last_name].filter(Boolean).join(' ').trim(),
//                     admissionNumber: row.admission_number,
//                     studentStatus: row.student_status
//                 }));
//             }
//         } catch (e) {
//             console.warn('Student enrollments table may not exist:', e.message);
//         }

//         const response = {
//             students,
//             attendanceRecords,
//             feeRecords,
//             feeStructures,
//             feeStructureStudentMappings,
//             examRecords,
//             exams,
//             studentActivities,
//             classes,
//             settings,
//             conductCertificates,
//             holidayEvents,
//             teachers,
//             subjects,
//             teacherLeaveBalances,
//             teacherLeaveApplications,
//             studentLeaveApplications,
//             enrollments,
//             lastSaved: new Date().toISOString(),
//             version: '2.0'
//         };

//         // Add pagination metadata if pagination is used
//         if (limit > 0) {
//             response.pagination = {
//                 page,
//                 limit,
//                 offset,
//                 hasMore: (students.length === limit || attendanceRecords.length === limit || feeRecords.length === limit || examRecords.length === limit)
//             };
//         }

//         res.json(response);
//     } catch (error) {
//         console.error('Error fetching data:', error);
//         res.status(500).json({ error: 'Failed to fetch data', details: error.message });
//     }
// });