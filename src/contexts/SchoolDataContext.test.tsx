import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { SchoolDataProvider, useSchoolData } from './SchoolDataContext'
import { AuthProvider, useAuth } from './AuthContext'
import { Student, AttendanceRecord, FeeRecord, FeeStructure, Exam, ExamRecord, StudentActivity, ClassInfo, SystemSettings, StudyConductCertificate } from '../types'

// Mock DatabaseService to prevent actual API calls and memory issues
vi.mock('../services/DatabaseService', () => ({
    default: {
        loadAllPages: vi.fn().mockResolvedValue(null),
        saveData: vi.fn().mockResolvedValue(true).mockImplementation(() => Promise.resolve(true)),
        clearData: vi.fn().mockResolvedValue(true),
        getFeeStructure: vi.fn().mockResolvedValue(null),
        saveFeeStructure: vi.fn().mockResolvedValue(true),
        updateFeeStructure: vi.fn().mockResolvedValue(true)
    }
}))

// Mock AuthContext
const mockAuthValue = {
    user: { id: 'admin1', role: 'admin', schoolId: 'school1' },
    schools: [],
    admins: [],
    contacts: [],
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    addSchool: vi.fn(),
    updateSchool: vi.fn(),
    updateSchoolStatus: vi.fn(),
    deleteSchool: vi.fn(),
    addAdmin: vi.fn(),
    updateAdmin: vi.fn(),
    updateAdminStatus: vi.fn(),
    updateAdminPassword: vi.fn(),
    deleteAdmin: vi.fn(),
    addContact: vi.fn(),
    updateContactStatus: vi.fn(),
    deleteContact: vi.fn()
}

vi.mock('./AuthContext', () => ({
    useAuth: vi.fn(() => mockAuthValue),
    AuthProvider: ({ children }: { children: React.ReactNode }) => children
}))

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>
        <SchoolDataProvider>{children}</SchoolDataProvider>
    </AuthProvider>
)

describe('SchoolDataContext', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        ;(useAuth as any).mockReturnValue(mockAuthValue)
    })

    describe('SchoolDataProvider', () => {
        it('should provide school data context', async () => {
            const { result } = renderHook(() => useSchoolData(), { wrapper })

            await waitFor(() => {
                expect(result.current).toBeDefined()
                expect(result.current.students).toBeDefined()
                expect(result.current.attendanceRecords).toBeDefined()
                expect(result.current.feeRecords).toBeDefined()
            })
        })

        it('should initialize with arrays', async () => {
            const { result } = renderHook(() => useSchoolData(), { wrapper })

            await waitFor(() => {
                expect(Array.isArray(result.current.students)).toBe(true)
                expect(Array.isArray(result.current.attendanceRecords)).toBe(true)
                expect(Array.isArray(result.current.feeRecords)).toBe(true)
            })
        })
    })

    describe('Student Management', () => {
        it('should add a new student', async () => {
            const { result } = renderHook(() => useSchoolData(), { wrapper })

            const newStudent: Omit<Student, 'id'> = {
                admissionNumber: 'STU001',
                admissionDate: '2024-01-01',
                studentName: 'John Doe',
                fatherName: 'Father Doe',
                motherName: 'Mother Doe',
                studentClass: '10',
                section: 'A',
                medium: 'English',
                password: 'password123',
                status: 'active',
                schoolId: 'school1'
            }

            await act(async () => {
                result.current.addStudent(newStudent)
            })

            await waitFor(() => {
                expect(result.current.students.length).toBeGreaterThan(0)
            }, { timeout: 3000 })

            const addedStudent = result.current.students.find(s => s.studentName === 'John Doe')
            expect(addedStudent).toBeDefined()
            if (addedStudent) {
                expect(addedStudent.id).toBeDefined()
                expect(addedStudent.status).toBe('active')
            }
        })

        it('should update a student', async () => {
            const { result } = renderHook(() => useSchoolData(), { wrapper })

            const newStudent: Omit<Student, 'id'> = {
                admissionNumber: 'STU001',
                admissionDate: '2024-01-01',
                studentName: 'John Doe',
                fatherName: 'Father Doe',
                motherName: 'Mother Doe',
                studentClass: '10',
                section: 'A',
                medium: 'English',
                password: 'password123',
                status: 'active',
                schoolId: 'school1'
            }

            await act(async () => {
                result.current.addStudent(newStudent)
            })

            await waitFor(() => {
                expect(result.current.students.length).toBeGreaterThan(0)
            })

            const studentId = result.current.students.find(s => s.studentName === 'John Doe')?.id
            expect(studentId).toBeDefined()

            if (studentId) {
                await act(async () => {
                    result.current.updateStudent(studentId, { studentName: 'Jane Doe' })
                })

                await waitFor(() => {
                    const updated = result.current.students.find(s => s.id === studentId)
                    expect(updated?.studentName).toBe('Jane Doe')
                })
            }
        })

        it('should update student password', async () => {
            const { result } = renderHook(() => useSchoolData(), { wrapper })

            const newStudent: Omit<Student, 'id'> = {
                admissionNumber: 'STU001',
                admissionDate: '2024-01-01',
                studentName: 'John Doe',
                fatherName: 'Father Doe',
                motherName: 'Mother Doe',
                studentClass: '10',
                section: 'A',
                medium: 'English',
                password: 'password123',
                status: 'active',
                schoolId: 'school1'
            }

            await act(async () => {
                result.current.addStudent(newStudent)
            })

            await waitFor(() => {
                expect(result.current.students.length).toBeGreaterThan(0)
            })

            const studentId = result.current.students.find(s => s.studentName === 'John Doe')?.id
            expect(studentId).toBeDefined()

            if (studentId) {
                await act(async () => {
                    result.current.updateStudentPassword(studentId, 'newpassword123')
                })

                await waitFor(() => {
                    const updated = result.current.students.find(s => s.id === studentId)
                    expect(updated?.password).toBe('newpassword123')
                })
            }
        })

        it('should deactivate a student (delete sets status inactive)', async () => {
            const { result } = renderHook(() => useSchoolData(), { wrapper })

            const newStudent: Omit<Student, 'id'> = {
                admissionNumber: 'STU001',
                admissionDate: '2024-01-01',
                studentName: 'John Doe',
                fatherName: 'Father Doe',
                motherName: 'Mother Doe',
                studentClass: '10',
                section: 'A',
                medium: 'English',
                password: 'password123',
                status: 'active',
                schoolId: 'school1'
            }

            await act(async () => {
                result.current.addStudent(newStudent)
            })

            await waitFor(() => {
                expect(result.current.students.length).toBeGreaterThan(0)
            })

            const studentId = result.current.students.find(s => s.studentName === 'John Doe')?.id
            expect(studentId).toBeDefined()

            if (studentId) {
                await act(async () => {
                    result.current.deleteStudent(studentId)
                })

                await waitFor(() => {
                    const deactivated = result.current.students.find(s => s.id === studentId)
                    expect(deactivated?.status).toBe('inactive')
                })
            }
        })

        it('should get students by class', async () => {
            const { result } = renderHook(() => useSchoolData(), { wrapper })

            const student1: Omit<Student, 'id'> = {
                admissionNumber: 'STU001',
                admissionDate: '2024-01-01',
                studentName: 'John Doe',
                fatherName: 'Father Doe',
                motherName: 'Mother Doe',
                studentClass: '10',
                section: 'A',
                medium: 'English',
                password: 'password123',
                status: 'active',
                schoolId: 'school1'
            }

            const student2: Omit<Student, 'id'> = {
                admissionNumber: 'STU002',
                admissionDate: '2024-01-01',
                studentName: 'Jane Doe',
                fatherName: 'Father Doe',
                motherName: 'Mother Doe',
                studentClass: '9',
                section: 'A',
                medium: 'English',
                password: 'password123',
                status: 'active',
                schoolId: 'school1'
            }

            await act(async () => {
                result.current.addStudent(student1)
                result.current.addStudent(student2)
            })

            await waitFor(() => {
                expect(result.current.students.length).toBeGreaterThanOrEqual(2)
            })

            const class10Students = result.current.getStudentsByClass('10')
            expect(class10Students.length).toBeGreaterThan(0)
            expect(class10Students[0].studentClass).toBe('10')
        })

        it('should generate admission number', () => {
            const { result } = renderHook(() => useSchoolData(), { wrapper })

            const admissionNumber = result.current.generateAdmissionNumber()
            expect(admissionNumber).toBeDefined()
            expect(typeof admissionNumber).toBe('string')
        })
    })

    describe('Attendance Management', () => {
        it('should mark attendance', async () => {
            const { result } = renderHook(() => useSchoolData(), { wrapper })

            const newStudent: Omit<Student, 'id'> = {
                admissionNumber: 'STU001',
                admissionDate: '2024-01-01',
                studentName: 'John Doe',
                fatherName: 'Father Doe',
                motherName: 'Mother Doe',
                studentClass: '10',
                section: 'A',
                medium: 'English',
                password: 'password123',
                status: 'active',
                schoolId: 'school1'
            }

            await act(async () => {
                result.current.addStudent(newStudent)
            })

            await waitFor(() => {
                expect(result.current.students.length).toBeGreaterThan(0)
            })

            const studentId = result.current.students.find(s => s.studentName === 'John Doe')?.id
            expect(studentId).toBeDefined()

            if (studentId) {
                await act(async () => {
                    result.current.markAttendance(studentId, 'present', '2024-01-15')
                })

                await waitFor(() => {
                    expect(result.current.attendanceRecords.length).toBeGreaterThan(0)
                })

                const attendance = result.current.attendanceRecords.find(r => r.studentId === studentId)
                expect(attendance).toBeDefined()
                if (attendance) {
                    expect(attendance.status).toBe('present')
                    expect(attendance.studentId).toBe(studentId)
                }
            }
        })

        it('should get attendance by student', async () => {
            const { result } = renderHook(() => useSchoolData(), { wrapper })

            const newStudent: Omit<Student, 'id'> = {
                admissionNumber: 'STU001',
                admissionDate: '2024-01-01',
                studentName: 'John Doe',
                fatherName: 'Father Doe',
                motherName: 'Mother Doe',
                studentClass: '10',
                section: 'A',
                medium: 'English',
                password: 'password123',
                status: 'active',
                schoolId: 'school1'
            }

            await act(async () => {
                result.current.addStudent(newStudent)
            })

            await waitFor(() => {
                expect(result.current.students.length).toBeGreaterThan(0)
            })

            const studentId = result.current.students.find(s => s.studentName === 'John Doe')?.id
            expect(studentId).toBeDefined()

            if (studentId) {
                await act(async () => {
                    result.current.markAttendance(studentId, 'present', '2024-01-15')
                    result.current.markAttendance(studentId, 'absent', '2024-01-16')
                })

                await waitFor(() => {
                    expect(result.current.attendanceRecords.length).toBeGreaterThanOrEqual(2)
                })

                const attendance = result.current.getAttendanceByStudent(studentId)
                expect(attendance.length).toBeGreaterThanOrEqual(2)
            }
        })

        it('should get attendance by class', async () => {
            const { result } = renderHook(() => useSchoolData(), { wrapper })

            const student1: Omit<Student, 'id'> = {
                admissionNumber: 'STU001',
                admissionDate: '2024-01-01',
                studentName: 'John Doe',
                fatherName: 'Father Doe',
                motherName: 'Mother Doe',
                studentClass: '10',
                section: 'A',
                medium: 'English',
                password: 'password123',
                status: 'active',
                schoolId: 'school1'
            }

            await act(async () => {
                result.current.addStudent(student1)
            })

            await waitFor(() => {
                expect(result.current.students.length).toBeGreaterThan(0)
            })

            const studentId = result.current.students.find(s => s.studentName === 'John Doe')?.id
            expect(studentId).toBeDefined()

            if (studentId) {
                await act(async () => {
                    result.current.markAttendance(studentId, 'present', '2024-01-15')
                })

                await waitFor(() => {
                    expect(result.current.attendanceRecords.length).toBeGreaterThan(0)
                })

                const classAttendance = result.current.getAttendanceByClass('10', '2024-01-15')
                expect(classAttendance.length).toBeGreaterThan(0)
            }
        })
    })

    describe('Fee Management', () => {
        it('should add a fee record', async () => {
            const { result } = renderHook(() => useSchoolData(), { wrapper })

            const newFeeRecord: Omit<FeeRecord, 'id'> = {
                studentId: 'student1',
                feeType: 'tuition',
                amount: 5000,
                dueDate: '2024-03-31',
                status: 'pending',
                description: 'Tuition fee',
                academicYear: '2024-25'
            }

            await act(async () => {
                result.current.addFeeRecord(newFeeRecord)
            })

            await waitFor(() => {
                expect(result.current.feeRecords.length).toBeGreaterThan(0)
            })

            const fee = result.current.feeRecords.find(f => f.feeType === 'tuition')
            expect(fee).toBeDefined()
            if (fee) {
                expect(fee.feeType).toBe('tuition')
            }
        })

        it('should update a fee record', async () => {
            const { result } = renderHook(() => useSchoolData(), { wrapper })

            const newFeeRecord: Omit<FeeRecord, 'id'> = {
                studentId: 'student1',
                feeType: 'tuition',
                amount: 5000,
                dueDate: '2024-03-31',
                status: 'pending',
                description: 'Tuition fee',
                academicYear: '2024-25'
            }

            await act(async () => {
                result.current.addFeeRecord(newFeeRecord)
            })

            await waitFor(() => {
                expect(result.current.feeRecords.length).toBeGreaterThan(0)
            })

            const feeId = result.current.feeRecords.find(f => f.feeType === 'tuition')?.id
            expect(feeId).toBeDefined()

            if (feeId) {
                await act(async () => {
                    result.current.updateFeeRecord(feeId, { status: 'paid', paidAmount: 5000 })
                })

                await waitFor(() => {
                    const updated = result.current.feeRecords.find(f => f.id === feeId)
                    expect(updated?.status).toBe('paid')
                })
            }
        })

        it('should add a fee structure', async () => {
            const { result } = renderHook(() => useSchoolData(), { wrapper })

            const newFeeStructure: Omit<FeeStructure, 'id'> = {
                className: '10',
                academicYear: '2024-25',
                tuitionFee: 5000,
                schoolFee: 2000,
                vanFee: 0,
                booksFee: 1000,
                uniformFee: 0,
                examFee: 500,
                otherFees: [],
                schoolId: 'school1'
            }

            await act(async () => {
                result.current.addFeeStructure(newFeeStructure)
            })

            await waitFor(() => {
                expect(result.current.feeStructures.length).toBeGreaterThan(0)
            })

            const structure = result.current.feeStructures.find(s => s.className === '10')
            expect(structure).toBeDefined()
            if (structure) {
                expect(structure.className).toBe('10')
            }
        })

        it('should get fees by student', async () => {
            const { result } = renderHook(() => useSchoolData(), { wrapper })

            const newStudent: Omit<Student, 'id'> = {
                admissionNumber: 'STU001',
                admissionDate: '2024-01-01',
                studentName: 'John Doe',
                fatherName: 'Father Doe',
                motherName: 'Mother Doe',
                studentClass: '10',
                section: 'A',
                medium: 'English',
                password: 'password123',
                status: 'active',
                schoolId: 'school1'
            }

            await act(async () => {
                result.current.addStudent(newStudent)
            })

            await waitFor(() => {
                expect(result.current.students.length).toBeGreaterThan(0)
            })

            const studentId = result.current.students.find(s => s.studentName === 'John Doe')?.id
            expect(studentId).toBeDefined()

            if (studentId) {
                const newFeeRecord: Omit<FeeRecord, 'id'> = {
                    studentId,
                    feeType: 'tuition',
                    amount: 5000,
                    dueDate: '2024-03-31',
                    status: 'pending',
                    description: 'Tuition fee',
                    academicYear: '2024-25'
                }

                await act(async () => {
                    result.current.addFeeRecord(newFeeRecord)
                })

                await waitFor(() => {
                    expect(result.current.feeRecords.length).toBeGreaterThan(0)
                })

                const studentFees = result.current.getFeesByStudent(studentId)
                expect(studentFees.length).toBeGreaterThan(0)
            }
        })
    })

    describe('Exam Management', () => {
        it('should add an exam', async () => {
            const { result } = renderHook(() => useSchoolData(), { wrapper })

            const newExam: Omit<Exam, 'id'> = {
                type: 'FA1',
                className: '10',
                subjects: ['Math', 'Science'],
                startDate: '2024-02-01',
                endDate: '2024-02-05',
                status: 'scheduled',
                schoolId: 'school1'
            }

            await act(async () => {
                result.current.addExam(newExam)
            })

            await waitFor(() => {
                expect(result.current.exams.length).toBeGreaterThan(0)
            })

            const exam = result.current.exams.find(e => e.type === 'FA1')
            expect(exam).toBeDefined()
            if (exam) {
                expect(exam.type).toBe('FA1')
            }
        })

        it('should update an exam', async () => {
            const { result } = renderHook(() => useSchoolData(), { wrapper })

            const newExam: Omit<Exam, 'id'> = {
                type: 'FA1',
                className: '10',
                subjects: ['Math', 'Science'],
                startDate: '2024-02-01',
                endDate: '2024-02-05',
                status: 'scheduled',
                schoolId: 'school1'
            }

            await act(async () => {
                result.current.addExam(newExam)
            })

            await waitFor(() => {
                expect(result.current.exams.length).toBeGreaterThan(0)
            })

            const examId = result.current.exams.find(e => e.type === 'FA1')?.id
            expect(examId).toBeDefined()

            if (examId) {
                await act(async () => {
                    result.current.updateExam(examId, { status: 'ongoing' })
                })

                await waitFor(() => {
                    const updated = result.current.exams.find(e => e.id === examId)
                    expect(updated?.status).toBe('ongoing')
                })
            }
        })

        it('should add an exam record', async () => {
            const { result } = renderHook(() => useSchoolData(), { wrapper })

            const newExamRecord: Omit<ExamRecord, 'id'> = {
                studentId: 'student1',
                examId: 'exam1',
                examType: 'FA1',
                subject: 'Math',
                maxMarks: 100,
                obtainedMarks: 85,
                grade: 'A',
                status: 'scored'
            }

            await act(async () => {
                result.current.addExamRecord(newExamRecord)
            })

            await waitFor(() => {
                expect(result.current.examRecords.length).toBeGreaterThan(0)
            })

            const examRecord = result.current.examRecords.find(e => e.obtainedMarks === 85)
            expect(examRecord).toBeDefined()
            if (examRecord) {
                expect(examRecord.obtainedMarks).toBe(85)
            }
        })

        it('should get exams by student', async () => {
            const { result } = renderHook(() => useSchoolData(), { wrapper })

            const newStudent: Omit<Student, 'id'> = {
                admissionNumber: 'STU001',
                admissionDate: '2024-01-01',
                studentName: 'John Doe',
                fatherName: 'Father Doe',
                motherName: 'Mother Doe',
                studentClass: '10',
                section: 'A',
                medium: 'English',
                password: 'password123',
                status: 'active',
                schoolId: 'school1'
            }

            await act(async () => {
                result.current.addStudent(newStudent)
            })

            await waitFor(() => {
                expect(result.current.students.length).toBeGreaterThan(0)
            })

            const studentId = result.current.students.find(s => s.studentName === 'John Doe')?.id
            expect(studentId).toBeDefined()

            if (studentId) {
                const newExamRecord: Omit<ExamRecord, 'id'> = {
                    studentId,
                    examId: 'exam1',
                    examType: 'FA1',
                    subject: 'Math',
                    maxMarks: 100,
                    obtainedMarks: 85,
                    grade: 'A',
                    status: 'scored'
                }

                await act(async () => {
                    result.current.addExamRecord(newExamRecord)
                })

                await waitFor(() => {
                    expect(result.current.examRecords.length).toBeGreaterThan(0)
                })

                const studentExams = result.current.getExamsByStudent(studentId)
                expect(studentExams.length).toBeGreaterThan(0)
            }
        })
    })

    describe('Student Activities', () => {
        it('should add a student activity', async () => {
            const { result } = renderHook(() => useSchoolData(), { wrapper })

            const newActivity: Omit<StudentActivity, 'id'> = {
                studentId: 'student1',
                type: 'positive',
                title: 'Good behavior',
                description: 'Helped a classmate',
                date: '2024-01-15',
                category: 'Behavior'
            }

            await act(async () => {
                result.current.addStudentActivity(newActivity)
            })

            await waitFor(() => {
                expect(result.current.studentActivities.length).toBeGreaterThan(0)
            })

            const activity = result.current.studentActivities.find(a => a.type === 'positive')
            expect(activity).toBeDefined()
            if (activity) {
                expect(activity.type).toBe('positive')
            }
        })

        it('should get activities by student', async () => {
            const { result } = renderHook(() => useSchoolData(), { wrapper })

            const newStudent: Omit<Student, 'id'> = {
                admissionNumber: 'STU001',
                admissionDate: '2024-01-01',
                studentName: 'John Doe',
                fatherName: 'Father Doe',
                motherName: 'Mother Doe',
                studentClass: '10',
                section: 'A',
                medium: 'English',
                password: 'password123',
                status: 'active',
                schoolId: 'school1'
            }

            await act(async () => {
                result.current.addStudent(newStudent)
            })

            await waitFor(() => {
                expect(result.current.students.length).toBeGreaterThan(0)
            })

            const studentId = result.current.students.find(s => s.studentName === 'John Doe')?.id
            expect(studentId).toBeDefined()

            if (studentId) {
                const newActivity: Omit<StudentActivity, 'id'> = {
                    studentId,
                    type: 'positive',
                    title: 'Good behavior',
                    description: 'Helped a classmate',
                    date: '2024-01-15',
                    category: 'Behavior'
                }

                await act(async () => {
                    result.current.addStudentActivity(newActivity)
                })

                await waitFor(() => {
                    expect(result.current.studentActivities.length).toBeGreaterThan(0)
                })

                const activities = result.current.getActivitiesByStudent(studentId)
                expect(activities.length).toBeGreaterThan(0)
            }
        })
    })

    describe('Statistics', () => {
        it('should get student stats', async () => {
            const { result } = renderHook(() => useSchoolData(), { wrapper })

            const student1: Omit<Student, 'id'> = {
                admissionNumber: 'STU001',
                admissionDate: '2024-01-01',
                studentName: 'John Doe',
                fatherName: 'Father Doe',
                motherName: 'Mother Doe',
                studentClass: '10',
                section: 'A',
                medium: 'English',
                password: 'password123',
                status: 'active',
                schoolId: 'school1'
            }

            const student2: Omit<Student, 'id'> = {
                admissionNumber: 'STU002',
                admissionDate: '2024-01-01',
                studentName: 'Jane Doe',
                fatherName: 'Father Doe',
                motherName: 'Mother Doe',
                studentClass: '10',
                section: 'A',
                medium: 'English',
                password: 'password123',
                status: 'inactive',
                schoolId: 'school1'
            }

            await act(async () => {
                result.current.addStudent(student1)
                result.current.addStudent(student2)
            })

            await waitFor(() => {
                expect(result.current.students.length).toBeGreaterThanOrEqual(2)
            })

            const stats = result.current.getStudentStats()
            expect(stats.total).toBeGreaterThanOrEqual(2)
            expect(stats.active).toBeGreaterThanOrEqual(1)
            expect(stats.inactive).toBeGreaterThanOrEqual(1)
        })

        it('should get attendance stats', async () => {
            const { result } = renderHook(() => useSchoolData(), { wrapper })

            const newStudent: Omit<Student, 'id'> = {
                admissionNumber: 'STU001',
                admissionDate: '2024-01-01',
                studentName: 'John Doe',
                fatherName: 'Father Doe',
                motherName: 'Mother Doe',
                studentClass: '10',
                section: 'A',
                medium: 'English',
                password: 'password123',
                status: 'active',
                schoolId: 'school1'
            }

            await act(async () => {
                result.current.addStudent(newStudent)
            })

            await waitFor(() => {
                expect(result.current.students.length).toBeGreaterThan(0)
            }, { timeout: 5000 })

            const studentId = result.current.students.find(s => s.studentName === 'John Doe')?.id
            expect(studentId).toBeDefined()

            if (studentId) {
                await act(async () => {
                    result.current.markAttendance(studentId, 'present', '2024-01-15')
                    result.current.markAttendance(studentId, 'absent', '2024-01-16')
                })

                // Wait for attendance records to be added
                await waitFor(() => {
                    const records = result.current.attendanceRecords.filter(r => r.studentId === studentId)
                    expect(records.length).toBeGreaterThanOrEqual(2)
                }, { timeout: 5000 })

                const stats = result.current.getAttendanceStats()
                expect(stats).toBeDefined()
                expect(stats.totalPresent).toBeGreaterThanOrEqual(0)
                expect(stats.totalAbsent).toBeGreaterThanOrEqual(0)
            }
        })

        it('should get fee stats', async () => {
            const { result } = renderHook(() => useSchoolData(), { wrapper })

            const fee1: Omit<FeeRecord, 'id'> = {
                studentId: 'student1',
                feeType: 'tuition',
                amount: 5000,
                dueDate: '2024-03-31',
                status: 'paid',
                paidAmount: 5000,
                description: 'Tuition fee',
                academicYear: '2024-25'
            }

            const fee2: Omit<FeeRecord, 'id'> = {
                studentId: 'student2',
                feeType: 'tuition',
                amount: 5000,
                dueDate: '2024-03-31',
                status: 'pending',
                description: 'Tuition fee',
                academicYear: '2024-25'
            }

            await act(async () => {
                result.current.addFeeRecord(fee1)
                result.current.addFeeRecord(fee2)
            })

            await waitFor(() => {
                expect(result.current.feeRecords.length).toBeGreaterThanOrEqual(2)
            }, { timeout: 5000 })

            const stats = result.current.getFeeStats()
            expect(stats).toBeDefined()
            expect(typeof stats.totalCollected).toBe('number')
            expect(typeof stats.totalPending).toBe('number')
            expect(stats.totalCollected).toBeGreaterThanOrEqual(0)
            expect(stats.totalPending).toBeGreaterThanOrEqual(0)
        })
    })

    describe('Settings Management', () => {
        it('should update settings', () => {
            const { result } = renderHook(() => useSchoolData(), { wrapper })

            act(() => {
                result.current.updateSettings({ schoolName: 'Test School' })
            })

            expect(result.current.settings.schoolName).toBe('Test School')
        })
    })

    describe('Conduct Certificates', () => {
        it('should add a conduct certificate', async () => {
            const { result } = renderHook(() => useSchoolData(), { wrapper })

            const newCertificate: Omit<StudyConductCertificate, 'id'> = {
                studentId: 'student1',
                issueDate: '2024-01-15',
                academicYear: '2024-25',
                status: 'issued'
            }

            await act(async () => {
                result.current.addConductCertificate(newCertificate)
            })

            await waitFor(() => {
                expect(result.current.conductCertificates.length).toBeGreaterThan(0)
            }, { timeout: 5000 })
        })

        it('should get conduct certificate by student', async () => {
            const { result } = renderHook(() => useSchoolData(), { wrapper })

            const newCertificate: Omit<StudyConductCertificate, 'id'> = {
                studentId: 'student1',
                issueDate: '2024-01-15',
                academicYear: '2024-25',
                status: 'issued'
            }

            await act(async () => {
                result.current.addConductCertificate(newCertificate)
            })

            await waitFor(() => {
                expect(result.current.conductCertificates.length).toBeGreaterThan(0)
            }, { timeout: 5000 })

            const certificate = result.current.getConductCertificateByStudent('student1')
            expect(certificate).toBeDefined()
            if (certificate) {
                expect(certificate.studentId).toBe('student1')
            }
        })

        it('should record certificate download', async () => {
            const { result } = renderHook(() => useSchoolData(), { wrapper })

            const newCertificate: Omit<StudyConductCertificate, 'id'> = {
                studentId: 'student1',
                issueDate: '2024-01-15',
                academicYear: '2024-25',
                status: 'issued'
            }

            await act(async () => {
                result.current.addConductCertificate(newCertificate)
            })

            await waitFor(() => {
                expect(result.current.conductCertificates.length).toBeGreaterThan(0)
            }, { timeout: 5000 })

            const certificateId = result.current.conductCertificates.find(c => c.studentId === 'student1')?.id
            expect(certificateId).toBeDefined()

            if (certificateId) {
                await act(async () => {
                    result.current.recordCertificateDownload(certificateId)
                })

                await waitFor(() => {
                    const updated = result.current.conductCertificates.find(c => c.id === certificateId)
                    expect(updated?.downloadCount).toBeGreaterThanOrEqual(1)
                }, { timeout: 5000 })
            }
        })
    })

    describe('Data Management', () => {
        it('should export all data', () => {
            const { result } = renderHook(() => useSchoolData(), { wrapper })

            const exportedData = result.current.exportAllData()
            expect(exportedData).toBeDefined()
            expect(typeof exportedData).toBe('string')

            const parsed = JSON.parse(exportedData)
            expect(parsed).toHaveProperty('students')
            expect(parsed).toHaveProperty('attendanceRecords')
            expect(parsed).toHaveProperty('feeRecords')
            expect(parsed).toHaveProperty('examRecords')
            expect(parsed).toHaveProperty('exams')
            expect(parsed).toHaveProperty('studentActivities')
            expect(parsed).toHaveProperty('classes')
            expect(parsed).toHaveProperty('settings')
            expect(parsed).toHaveProperty('conductCertificates')
        })

        it('should import all data', async () => {
            const { result } = renderHook(() => useSchoolData(), { wrapper })

            const importData = {
                students: [{
                    id: '1',
                    admissionNumber: 'STU001',
                    studentName: 'John Doe',
                    studentClass: '10',
                    section: 'A',
                    medium: 'English',
                    status: 'active',
                    schoolId: 'school1'
                }],
                attendanceRecords: [],
                feeRecords: [],
                feeStructures: [],
                examRecords: [],
                exams: [],
                studentActivities: [],
                classes: [],
                settings: {},
                conductCertificates: []
            }

            await act(async () => {
                const success = await result.current.importAllData(JSON.stringify(importData))
                expect(success).toBe(true)
            })

            await waitFor(() => {
                expect(result.current.students.length).toBe(1)
            })
        })
    })
})

