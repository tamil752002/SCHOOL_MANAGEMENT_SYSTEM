import '@testing-library/jest-dom'
import React from 'react'
import { vi } from 'vitest'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
})

// Mock ResizeObserver
window.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}))

// Mock IntersectionObserver
window.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}))

// Mock all context hooks before any tests run
vi.mock('../contexts/AuthContext', () => ({
    useAuth: vi.fn(() => ({
        isAuthenticated: true,
        user: {
            id: 'admin1',
            name: 'Admin User',
            email: 'admin@school.com',
            role: 'admin',
            admissionNumber: undefined
        },
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn()
    })),
    AuthProvider: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children)
}))

vi.mock('../contexts/SchoolDataContext', () => ({
    useSchoolData: vi.fn(() => ({
        students: [{
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
            status: 'active'
        }],
        attendanceRecords: [],
        feeRecords: [],
        studentActivities: [],
        exams: [],
        examRecords: [],
        feeStructures: [],
        classes: [{ name: '10', sections: ['A', 'B'], medium: ['English', 'Telugu'] }],
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
        getStudentsByClass: vi.fn(() => []),
        generateAdmissionNumber: vi.fn(() => 'TEST0001'),
        generateStudentPassword: vi.fn(() => 'password123'),
        markAttendance: vi.fn(),
        getAttendanceByStudent: vi.fn(() => []),
        getAttendanceByClass: vi.fn(() => []),
        addFeeRecord: vi.fn(),
        updateFeeRecord: vi.fn(),
        addFeeStructure: vi.fn(),
        updateFeeStructure: vi.fn(),
        deleteFeeStructure: vi.fn(),
        consolidateFeeRecords: vi.fn(() => 5),
        getFeesByStudent: vi.fn(() => []),
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
    })),
    SchoolDataProvider: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children)
}))

vi.mock('../contexts/ThemeContext', () => ({
    useTheme: vi.fn(() => ({
        isDarkMode: false,
        toggleTheme: vi.fn()
    })),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children)
})) 