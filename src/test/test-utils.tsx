import { render, RenderOptions } from '@testing-library/react'
import React from 'react'
import { vi } from 'vitest'
import { ClassInfo } from '../types'

// Mock data for testing
export const mockStudent = {
    id: '1',
    admissionNumber: 'STU001',
    admissionDate: '2024-01-15',
    studentName: 'John Doe',
    studentAadhar: '123456789012',
    fatherName: 'Father Doe',
    fatherAadhar: '123456789013',
    motherName: 'Mother Doe',
    motherAadhar: '123456789014',
    studentClass: '10',
    section: 'A',
    medium: 'English',
    dob: '2008-05-15',
    location: 'Mumbai',
    admissionClass: '10',
    mobileNumber: '9876543210',
    penNumber: 'PEN001',
    caste: 'General',
    subCaste: 'General',
    religion: 'Hindu',
    motherTongue: 'Hindi',
    password: 'password123',
    status: 'active' as const,
    schoolId: 'school1'
}

export const mockAdminUser = {
    id: 'admin1',
    name: 'Admin User',
    email: 'admin@school.com',
    role: 'admin' as const,
    admissionNumber: undefined
}

export const mockStudentUser = {
    id: 'student1',
    name: 'John Doe',
    email: 'john@school.com',
    role: 'student' as const,
    admissionNumber: 'STU001'
}

export const mockFeeRecord = {
    id: 'fee1',
    studentId: '1',
    feeType: 'tuition' as const,
    amount: 5000,
    dueDate: '2024-02-15',
    status: 'pending' as const,
    paidAmount: 0,
    description: 'Tuition fee',
    academicYear: '2024-25'
}

export const mockAttendanceRecord = {
    id: 'att1',
    studentId: '1',
    date: '2024-01-15',
    status: 'present' as const,
    markedBy: 'admin',
    timestamp: '2024-01-15T09:00:00Z'
}

export const mockExam = {
    id: 'exam1',
    type: 'FA1' as const,
    className: '10',
    subjects: ['Mathematics', 'Science'],
    startDate: '2024-02-01',
    endDate: '2024-02-05',
    status: 'completed' as const,
    academicYear: '2024-25'
}

// Complete mock for SchoolDataContext
export const createMockSchoolData = () => ({
    students: [mockStudent],
    attendanceRecords: [mockAttendanceRecord],
    feeRecords: [mockFeeRecord],
    studentActivities: [],
    exams: [mockExam],
    examRecords: [],
    feeStructures: [],
    classes: [{ name: '10', sections: ['A', 'B'], medium: ['English', 'Telugu'] }] as ClassInfo[],
    settings: {
        schoolName: 'Test School',
        schoolAddress: 'Test Address',
        schoolPhone: '+91 1234567890',
        schoolEmail: 'test@school.com',
        currentAcademicYear: '2024-25',
        admissionNumberPrefix: 'TEST',
        admissionNumberLength: 4,
        attendanceThreshold: 75,
        feeReminderDays: 7,
        backupFrequency: 'daily'
    },
    addStudent: vi.fn(),
    updateStudent: vi.fn(),
    deleteStudent: vi.fn(),
    getStudentsByClass: vi.fn(() => [mockStudent]),
    generateAdmissionNumber: vi.fn(() => 'TEST0001'),
    generateStudentPassword: vi.fn(() => 'password123'),
    markAttendance: vi.fn(),
    getAttendanceByStudent: vi.fn(() => [mockAttendanceRecord]),
    getAttendanceByClass: vi.fn(() => [mockAttendanceRecord]),
    addFeeRecord: vi.fn(),
    updateFeeRecord: vi.fn(),
    addFeeStructure: vi.fn(),
    updateFeeStructure: vi.fn(),
    deleteFeeStructure: vi.fn(),
    consolidateFeeRecords: vi.fn(() => 5),
    getFeesByStudent: vi.fn(() => [mockFeeRecord]),
    applyFeeStructureToStudents: vi.fn(() => 5),
    addExamRecord: vi.fn(),
    addExam: vi.fn(),
    updateExam: vi.fn(),
    getExamsByStudent: vi.fn(() => []),
    addStudentActivity: vi.fn(),
    getActivitiesByStudent: vi.fn(() => []),
    addClass: vi.fn(),
    updateClass: vi.fn(),
    deleteClass: vi.fn(() => Promise.resolve()),
    updateSettings: vi.fn(),
    updateStudentPassword: vi.fn(),
    getExamRecordsByStudent: vi.fn(() => []),
    addConductCertificate: vi.fn(),
    updateConductCertificate: vi.fn(),
    getConductCertificateByStudent: vi.fn(() => undefined),
    recordCertificateDownload: vi.fn(),
    conductCertificates: [],
    cleanupDuplicateFees: vi.fn(() => 0),
    getStudentStats: vi.fn(() => ({
        total: 1,
        active: 1,
        inactive: 0,
        byClass: { '10': 1 }
    })),
    getAttendanceStats: vi.fn(() => ({
        totalPresent: 1,
        totalAbsent: 0,
        averageAttendance: 100,
        byClass: { '10': { present: 1, absent: 0, percentage: 100 } }
    })),
    getFeeStats: vi.fn(() => ({
        totalCollected: 0,
        totalPending: 5000,
        totalOverdue: 0,
        collectionRate: 0
    })),
    resetAllData: vi.fn(),
    exportAllData: vi.fn(() => '{}'),
    importAllData: vi.fn(() => Promise.resolve(true))
})

// Default mock values
const defaultAuthValue = {
    isAuthenticated: true,
    user: mockAdminUser,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn()
}

const defaultSchoolDataValue = createMockSchoolData()

const defaultThemeValue = {
    isDarkMode: false,
    toggleTheme: vi.fn()
}

// Custom render function that includes all providers with default mock values
const AllTheProviders = ({
    children,
    authValue = defaultAuthValue,
    schoolDataValue = defaultSchoolDataValue,
    themeValue = defaultThemeValue
}: {
    children: React.ReactNode
    authValue?: any
    schoolDataValue?: any
    themeValue?: any
}) => {
    return (
        <div data-testid="test-providers">
            {children}
        </div>
    )
}

const customRender = (
    ui: React.ReactElement,
    options?: Omit<RenderOptions, 'wrapper'> & {
        authValue?: any
        schoolDataValue?: any
        themeValue?: any
    }
) => {
    const { authValue, schoolDataValue, themeValue, ...renderOptions } = options || {}
    return render(ui, {
        wrapper: ({ children }) => AllTheProviders({
            children,
            authValue,
            schoolDataValue,
            themeValue
        }),
        ...renderOptions
    })
}

// Re-export everything
export * from '@testing-library/react'

// Override render method
export { customRender as render }
