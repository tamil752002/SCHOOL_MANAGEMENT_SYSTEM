import { createHash, randomUUID } from 'crypto';
import { appendFileSync } from 'fs';

// Helper function to write debug logs
export function writeDebugLog(logData) {
    try {
        const logPath = './debug.log';
        appendFileSync(logPath, JSON.stringify(logData) + '\n', 'utf8');
    } catch (err) {
        // Silently fail if log file can't be written
    }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns the string as-is if it's a valid UUID, otherwise null (for optional UUID columns like recorded_by). */
export function optionalUUID(str) {
    if (!str || typeof str !== 'string') return null;
    return UUID_REGEX.test(str.trim()) ? str.trim() : null;
}

// Helper function to convert string ID to UUID (deterministic)
export function stringToUUID(str) {
    if (!str) return null;
    if (UUID_REGEX.test(str)) {
        return str;
    }
    const hash = createHash('md5').update(str).digest('hex');
    return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
}

// Helper function to generate UUID for new records
export function generateUUID() {
    return randomUUID();
}

// Convert database row to student object
export function rowToStudent(row) {
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

// Convert student object to database row
export function studentToRow(student) {
    const firstName = student.firstName || student.studentName?.split(' ')[0] || '';
    const lastName = student.lastName || student.studentName?.split(' ').slice(1).join(' ') || '';
    
    return {
        admission_number: student.admissionNumber,
        admission_date: student.admissionDate,
        first_name: firstName,
        middle_name: student.middleName,
        last_name: lastName,
        student_aadhar: student.studentAadhar,
        father_name: student.fatherName,
        father_aadhar: student.fatherAadhar,
        mother_name: student.motherName,
        mother_aadhar: student.motherAadhar,
        student_class: student.studentClass,
        section: student.section,
        medium: student.medium,
        date_of_birth: student.dateOfBirth || student.dob,
        gender: student.gender,
        location: student.location,
        address: student.address,
        admission_class: student.admissionClass,
        mobile_number: student.mobileNumber,
        parent_mobile: student.parentMobile,
        pen_number: student.penNumber,
        caste: student.caste,
        sub_caste: student.subCaste,
        religion: student.religion,
        mother_tongue: student.motherTongue,
        profile_photo: student.profilePhoto,
        email_address: student.emailAddress,
        status: student.status || 'active',
        school_id: student.schoolId,
        parent_user_id: student.parentUserId
    };
}
