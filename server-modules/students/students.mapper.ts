export const rowToStudent = (row: any) => {
    return {
        id: row.id,
        schoolId: row.school_id,
        admissionNo: row.admission_no,
        firstName: row.first_name,
        lastName: row.last_name,
        gender: row.gender,
        dob: row.dob,
        studentClass: row.student_class,
        section: row.section,
        phone: row.phone,
        email: row.email,
        address: row.address,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
};