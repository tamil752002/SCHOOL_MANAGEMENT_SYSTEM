import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSchoolData } from '../../contexts/SchoolDataContext'
import { fireEvent, mockAttendanceRecord, mockExam, mockFeeRecord, mockStudent, render, screen, waitFor } from '../../test/test-utils'
import { ReportsMain } from './ReportsMain'

// Mock the context hook
vi.mock('../../contexts/SchoolDataContext', () => ({
    useSchoolData: vi.fn()
}))

describe('ReportsMain Component', () => {
    const mockUseSchoolData = useSchoolData as vi.MockedFunction<typeof useSchoolData>

    beforeEach(() => {
        mockUseSchoolData.mockReturnValue({
            students: [mockStudent],
            attendanceRecords: [mockAttendanceRecord],
            feeRecords: [mockFeeRecord],
            studentActivities: [],
            exams: [mockExam],
            classes: [{ name: '10', teacher: 'Teacher Name' }],
            addStudent: vi.fn(),
            updateStudent: vi.fn(),
            deleteStudent: vi.fn(),
            getStudentsByClass: vi.fn(() => [mockStudent]),
            generateStudentPassword: vi.fn(),
            addAttendanceRecord: vi.fn(),
            updateAttendanceRecord: vi.fn(),
            deleteAttendanceRecord: vi.fn(),
            getAttendanceByClass: vi.fn(),
            addFeeRecord: vi.fn(),
            updateFeeRecord: vi.fn(),
            deleteFeeRecord: vi.fn(),
            addStudentActivity: vi.fn(),
            updateStudentActivity: vi.fn(),
            deleteStudentActivity: vi.fn(),
            addExam: vi.fn(),
            updateExam: vi.fn(),
            deleteExam: vi.fn(),
            addExamResult: vi.fn(),
            updateExamResult: vi.fn(),
            deleteExamResult: vi.fn(),
            addFeeStructure: vi.fn(),
            updateFeeStructure: vi.fn(),
            deleteFeeStructure: vi.fn(),
            applyFeeStructureToStudents: vi.fn()
        })
    })

    describe('Report Type Selection', () => {
        it('should render all report type buttons', () => {
            render(<ReportsMain />)

            expect(screen.getByText(/student report/i)).toBeInTheDocument()
            expect(screen.getByText(/attendance report/i)).toBeInTheDocument()
            expect(screen.getByText(/fee report/i)).toBeInTheDocument()
            expect(screen.getByText(/exam report/i)).toBeInTheDocument()
            expect(screen.getByText(/activity report/i)).toBeInTheDocument()
        })

        it('should select report type when button is clicked', async () => {
            render(<ReportsMain />)
            const studentReportButton = screen.getByText(/student report/i)

            fireEvent.click(studentReportButton)

            await waitFor(() => {
                expect(studentReportButton).toHaveClass('border-blue-500')
            })
        })

        it('should show different report types when different buttons are clicked', async () => {
            render(<ReportsMain />)

            // Click student report
            const studentReportButton = screen.getByText(/student report/i)
            fireEvent.click(studentReportButton)

            await waitFor(() => {
                expect(screen.getByText(/student report/i)).toBeInTheDocument()
            })

            // Click attendance report
            const attendanceReportButton = screen.getByText(/attendance report/i)
            fireEvent.click(attendanceReportButton)

            await waitFor(() => {
                expect(screen.getByText(/attendance report/i)).toBeInTheDocument()
            })
        })
    })

    describe('Export Buttons', () => {
        beforeEach(async () => {
            render(<ReportsMain />)
            const studentReportButton = screen.getByText(/student report/i)
            fireEvent.click(studentReportButton)

            await waitFor(() => {
                expect(screen.getByText(/student report/i)).toBeInTheDocument()
            })
        })

        it('should render PDF export button', () => {
            expect(screen.getByText(/pdf/i)).toBeInTheDocument()
        })

        it('should render Excel export button', () => {
            expect(screen.getByText(/excel/i)).toBeInTheDocument()
        })

        it('should export PDF when PDF button is clicked', async () => {
            // Mock window.open
            const mockOpen = vi.fn()
            Object.defineProperty(window, 'open', {
                value: mockOpen,
                writable: true
            })

            const pdfButton = screen.getByText(/pdf/i)
            fireEvent.click(pdfButton)

            expect(mockOpen).toHaveBeenCalled()
        })

        it('should export Excel when Excel button is clicked', async () => {
            // Mock window.open
            const mockOpen = vi.fn()
            Object.defineProperty(window, 'open', {
                value: mockOpen,
                writable: true
            })

            const excelButton = screen.getByText(/excel/i)
            fireEvent.click(excelButton)

            expect(mockOpen).toHaveBeenCalled()
        })
    })

    describe('Filter Controls', () => {
        beforeEach(async () => {
            render(<ReportsMain />)
            const studentReportButton = screen.getByText(/student report/i)
            fireEvent.click(studentReportButton)

            await waitFor(() => {
                expect(screen.getByText(/student report/i)).toBeInTheDocument()
            })
        })

        it('should render class filter', () => {
            expect(screen.getByText(/all classes/i)).toBeInTheDocument()
        })

        it('should filter by class when class is selected', async () => {
            const classFilter = screen.getByText(/all classes/i)

            fireEvent.click(classFilter)

            await waitFor(() => {
                expect(screen.getByText('10')).toBeInTheDocument()
            })
        })

        it('should render date range filters', () => {
            expect(screen.getByLabelText(/from date/i)).toBeInTheDocument()
            expect(screen.getByLabelText(/to date/i)).toBeInTheDocument()
        })

        it('should update date range when dates are selected', async () => {
            const fromDateInput = screen.getByLabelText(/from date/i)
            const toDateInput = screen.getByLabelText(/to date/i)

            fireEvent.change(fromDateInput, { target: { value: '2024-01-01' } })
            fireEvent.change(toDateInput, { target: { value: '2024-01-31' } })

            await waitFor(() => {
                expect(fromDateInput).toHaveValue('2024-01-01')
                expect(toDateInput).toHaveValue('2024-01-31')
            })
        })
    })

    describe('Student Report Specific Buttons', () => {
        beforeEach(async () => {
            render(<ReportsMain />)
            const studentReportButton = screen.getByText(/student report/i)
            fireEvent.click(studentReportButton)

            await waitFor(() => {
                expect(screen.getByText(/student report/i)).toBeInTheDocument()
            })
        })

        it('should render Generate Report button', () => {
            expect(screen.getByText(/generate report/i)).toBeInTheDocument()
        })

        it('should generate student report when Generate Report button is clicked', async () => {
            const generateButton = screen.getByText(/generate report/i)
            fireEvent.click(generateButton)

            await waitFor(() => {
                expect(screen.getByText(/student list/i)).toBeInTheDocument()
            })
        })

        it('should render status filter for students', () => {
            expect(screen.getByText(/all status/i)).toBeInTheDocument()
        })

        it('should filter students by status', async () => {
            const statusFilter = screen.getByText(/all status/i)

            fireEvent.click(statusFilter)

            await waitFor(() => {
                expect(screen.getByText(/active/i)).toBeInTheDocument()
                expect(screen.getByText(/inactive/i)).toBeInTheDocument()
            })
        })
    })

    describe('Attendance Report Specific Buttons', () => {
        beforeEach(async () => {
            render(<ReportsMain />)
            const attendanceReportButton = screen.getByText(/attendance report/i)
            fireEvent.click(attendanceReportButton)

            await waitFor(() => {
                expect(screen.getByText(/attendance report/i)).toBeInTheDocument()
            })
        })

        it('should render Generate Report button for attendance', () => {
            expect(screen.getByText(/generate report/i)).toBeInTheDocument()
        })

        it('should generate attendance report when Generate Report button is clicked', async () => {
            const generateButton = screen.getByText(/generate report/i)
            fireEvent.click(generateButton)

            await waitFor(() => {
                expect(screen.getByText(/attendance summary/i)).toBeInTheDocument()
            })
        })

        it('should render attendance status filter', () => {
            expect(screen.getByText(/all attendance/i)).toBeInTheDocument()
        })

        it('should filter by attendance status', async () => {
            const attendanceFilter = screen.getByText(/all attendance/i)

            fireEvent.click(attendanceFilter)

            await waitFor(() => {
                expect(screen.getByText(/present/i)).toBeInTheDocument()
                expect(screen.getByText(/absent/i)).toBeInTheDocument()
            })
        })
    })

    describe('Fee Report Specific Buttons', () => {
        beforeEach(async () => {
            render(<ReportsMain />)
            const feeReportButton = screen.getByText(/fee report/i)
            fireEvent.click(feeReportButton)

            await waitFor(() => {
                expect(screen.getByText(/fee report/i)).toBeInTheDocument()
            })
        })

        it('should render Generate Report button for fees', () => {
            expect(screen.getByText(/generate report/i)).toBeInTheDocument()
        })

        it('should generate fee report when Generate Report button is clicked', async () => {
            const generateButton = screen.getByText(/generate report/i)
            fireEvent.click(generateButton)

            await waitFor(() => {
                expect(screen.getByText(/fee summary/i)).toBeInTheDocument()
            })
        })

        it('should render fee status filter', () => {
            expect(screen.getByText(/all fee status/i)).toBeInTheDocument()
        })

        it('should filter by fee status', async () => {
            const feeStatusFilter = screen.getByText(/all fee status/i)

            fireEvent.click(feeStatusFilter)

            await waitFor(() => {
                expect(screen.getByText(/paid/i)).toBeInTheDocument()
                expect(screen.getByText(/pending/i)).toBeInTheDocument()
                expect(screen.getByText(/overdue/i)).toBeInTheDocument()
            })
        })
    })

    describe('Exam Report Specific Buttons', () => {
        beforeEach(async () => {
            render(<ReportsMain />)
            const examReportButton = screen.getByText(/exam report/i)
            fireEvent.click(examReportButton)

            await waitFor(() => {
                expect(screen.getByText(/exam report/i)).toBeInTheDocument()
            })
        })

        it('should render Generate Report button for exams', () => {
            expect(screen.getByText(/generate report/i)).toBeInTheDocument()
        })

        it('should generate exam report when Generate Report button is clicked', async () => {
            const generateButton = screen.getByText(/generate report/i)
            fireEvent.click(generateButton)

            await waitFor(() => {
                expect(screen.getByText(/exam results/i)).toBeInTheDocument()
            })
        })

        it('should render exam selection dropdown', () => {
            expect(screen.getByText(/select exam/i)).toBeInTheDocument()
        })

        it('should select exam when dropdown is clicked', async () => {
            const examSelect = screen.getByText(/select exam/i)

            fireEvent.click(examSelect)

            await waitFor(() => {
                expect(screen.getByText(/mid term/i)).toBeInTheDocument()
            })
        })
    })

    describe('Activity Report Specific Buttons', () => {
        beforeEach(async () => {
            render(<ReportsMain />)
            const activityReportButton = screen.getByText(/activity report/i)
            fireEvent.click(activityReportButton)

            await waitFor(() => {
                expect(screen.getByText(/activity report/i)).toBeInTheDocument()
            })
        })

        it('should render Generate Report button for activities', () => {
            expect(screen.getByText(/generate report/i)).toBeInTheDocument()
        })

        it('should generate activity report when Generate Report button is clicked', async () => {
            const generateButton = screen.getByText(/generate report/i)
            fireEvent.click(generateButton)

            await waitFor(() => {
                expect(screen.getByText(/activity summary/i)).toBeInTheDocument()
            })
        })

        it('should render activity type filter', () => {
            expect(screen.getByText(/all activities/i)).toBeInTheDocument()
        })

        it('should filter by activity type', async () => {
            const activityFilter = screen.getByText(/all activities/i)

            fireEvent.click(activityFilter)

            await waitFor(() => {
                expect(screen.getByText(/positive/i)).toBeInTheDocument()
                expect(screen.getByText(/negative/i)).toBeInTheDocument()
            })
        })
    })

    describe('Report Content Display', () => {
        it('should display report content when generated', async () => {
            render(<ReportsMain />)
            const studentReportButton = screen.getByText(/student report/i)
            fireEvent.click(studentReportButton)

            await waitFor(() => {
                expect(screen.getByText(/student report/i)).toBeInTheDocument()
            })

            const generateButton = screen.getByText(/generate report/i)
            fireEvent.click(generateButton)

            await waitFor(() => {
                expect(screen.getByText(/student list/i)).toBeInTheDocument()
                expect(screen.getByText(/john doe/i)).toBeInTheDocument()
            })
        })

        it('should show no data message when no data is available', async () => {
            mockUseSchoolData.mockReturnValue({
                ...mockUseSchoolData(),
                students: [],
                attendanceRecords: [],
                feeRecords: [],
                exams: []
            })

            render(<ReportsMain />)
            const studentReportButton = screen.getByText(/student report/i)
            fireEvent.click(studentReportButton)

            await waitFor(() => {
                expect(screen.getByText(/student report/i)).toBeInTheDocument()
            })

            const generateButton = screen.getByText(/generate report/i)
            fireEvent.click(generateButton)

            await waitFor(() => {
                expect(screen.getByText(/no data available/i)).toBeInTheDocument()
            })
        })
    })

    describe('Loading States', () => {
        it('should show loading state when generating report', async () => {
            render(<ReportsMain />)
            const studentReportButton = screen.getByText(/student report/i)
            fireEvent.click(studentReportButton)

            await waitFor(() => {
                expect(screen.getByText(/student report/i)).toBeInTheDocument()
            })

            const generateButton = screen.getByText(/generate report/i)
            fireEvent.click(generateButton)

            await waitFor(() => {
                expect(screen.getByText(/generating/i)).toBeInTheDocument()
            })
        })
    })

    describe('Export Functionality', () => {
        it('should export different formats correctly', async () => {
            render(<ReportsMain />)
            const studentReportButton = screen.getByText(/student report/i)
            fireEvent.click(studentReportButton)

            await waitFor(() => {
                expect(screen.getByText(/student report/i)).toBeInTheDocument()
            })

            // Generate report first
            const generateButton = screen.getByText(/generate report/i)
            fireEvent.click(generateButton)

            await waitFor(() => {
                expect(screen.getByText(/student list/i)).toBeInTheDocument()
            })

            // Test PDF export
            const pdfButton = screen.getByText(/pdf/i)
            fireEvent.click(pdfButton)

            // Test Excel export
            const excelButton = screen.getByText(/excel/i)
            fireEvent.click(excelButton)
        })
    })
}) 