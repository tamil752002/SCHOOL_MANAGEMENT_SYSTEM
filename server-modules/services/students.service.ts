

import { query, getClient } from '../../database/db.js';
export const getStudents = async (schoolId: any, req: any) => {

    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || '0');
    const offset = limit > 0 ? (page - 1) * limit : 0;

    const schoolFilter = schoolId ? 'WHERE s.school_id =$1' : '';
    const params = schoolId ? [schoolId] : []

    let queryStr = `
    SELECT * FROM students  s
    ${schoolFilter}
    ORDER BY s.created_at DESC`

    if (limit > 0) {
        queryStr += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
    }
    const result = await query(queryStr, params);

    return {
        students: result.rows
    };
}
export function rowToStudent(row: any) {
    return {
        id: row.id,
        admissionNumber: row.admission_number,
        admissionDate: row.admission_date,
        firstName: row.first_name,
        middleName: row.middle_name,
        lastName: row.last_name,
        studentAadhar: row.student_aadhar,
        fatherName: row.father_name,
        fatherAadhar: row.father_aadhar,
        motherName: row.mother_name,
        motherAadhar: row.mother_aadhar,
        studentClass: row.student_class,
        section: row.section,
        medium: row.medium,
        dob: row.date_of_birth,
        dateOfBirth: row.date_of_birth,
        gender: row.gender,
        location: row.location,
        address: row.address,
        admissionClass: row.admission_class,
        mobileNumber: row.mobile_number,
        parentMobile: row.parent_mobile,
        penNumber: row.pen_number,
        caste: row.caste,
        subCaste: row.sub_caste,
        religion: row.religion,
        motherTongue: row.mother_tongue,
        profilePhoto: row.profile_photo,
        emailAddress: row.email_address,
        status: row.status || 'active',
        password: row.password || '',
        schoolId: row.school_id,
        parentUserId: row.parent_user_id
    };
}
// }       const students = studentsResult.rows.map(row => {
// //             const student = rowToStudent(row);
// //             // Map fee fields from DB to frontend camelCase
// //             if (row.total_fee !== undefined) student.totalFee = parseFloat(row.total_fee || 0);
// //             if (row.fee_paid !== undefined) student.feePaid = parseFloat(row.fee_paid || 0);
// //             if (row.remaining_fee !== undefined) student.remainingFee = parseFloat(row.remaining_fee || 0);
// //             return student;
// //         });
