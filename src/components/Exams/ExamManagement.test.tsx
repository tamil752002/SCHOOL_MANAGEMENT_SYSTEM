import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSchoolData } from '../../contexts/SchoolDataContext'
import { fireEvent, mockExam, mockStudent, render, screen, waitFor } from '../../test/test-utils'
import { ExamManagement } from './ExamManagement'

// Mock the context hook
vi.mock('../../contexts/SchoolDataContext', () => ({
    useSchoolData: vi.fn()
}))

describe('ExamManagement Component', () => {
    const mockUseSchoolData = useSchoolData as vi.MockedFunction<typeof useSchoolData>

    beforeEach(() => {
        mockUseSchoolData.mockReturnValue({
            students: [mockStudent],
            attendanceRecords: [],
            feeRecords: [],
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

    describe('Tab Navigation', () => {
        it('should render Exams tab', () => {
            render(<ExamManagement />)
            expect(screen.getByText(/exams/i)).toBeInTheDocument()
        })

        it('should render Marks Entry tab', () => {
            render(<ExamManagement />)
            expect(screen.getByText(/marks entry/i)).toBeInTheDocument()
        })

        it('should render Reports tab', () => {
            render(<ExamManagement />)
            expect(screen.getByText(/reports/i)).toBeInTheDocument()
        })

        it('should switch to Marks Entry tab when clicked', async () => {
            render(<ExamManagement />)
            const marksEntryTab = screen.getByText(/marks entry/i)

            fireEvent.click(marksEntryTab)

            await waitFor(() => {
                expect(screen.getByText(/enter marks/i)).toBeInTheDocument()
            })
        })

        it('should switch to Reports tab when clicked', async () => {
            render(<ExamManagement />)
            const reportsTab = screen.getByText(/reports/i)

            fireEvent.click(reportsTab)

            await waitFor(() => {
                expect(screen.getByText(/exam reports/i)).toBeInTheDocument()
            })
        })
    })

    describe('Exam Management Buttons', () => {
        it('should render Add Exam button', () => {
            render(<ExamManagement />)
            expect(screen.getByText(/add exam/i)).toBeInTheDocument()
        })

        it('should open exam form when Add Exam button is clicked', async () => {
            render(<ExamManagement />)
            const addButton = screen.getByText(/add exam/i)

            fireEvent.click(addButton)

            await waitFor(() => {
                expect(screen.getByText(/add new exam/i)).toBeInTheDocument()
            })
        })

        it('should render Edit button for each exam', () => {
            render(<ExamManagement />)
            const editButtons = screen.getAllByTitle(/edit exam/i)
            expect(editButtons.length).toBeGreaterThan(0)
        })

        it('should open edit form when Edit button is clicked', async () => {
            render(<ExamManagement />)
            const editButton = screen.getByTitle(/edit exam/i)

            fireEvent.click(editButton)

            await waitFor(() => {
                expect(screen.getByText(/edit exam/i)).toBeInTheDocument()
            })
        })

        it('should render Delete button for each exam', () => {
            render(<ExamManagement />)
            const deleteButtons = screen.getAllByTitle(/delete exam/i)
            expect(deleteButtons.length).toBeGreaterThan(0)
        })

        it('should delete exam when Delete button is clicked', async () => {
            const mockDeleteExam = vi.fn()
            mockUseSchoolData.mockReturnValue({
                ...mockUseSchoolData(),
                deleteExam: mockDeleteExam
            })

            // Mock window.confirm
            const mockConfirm = vi.fn(() => true)
            Object.defineProperty(window, 'confirm', {
                value: mockConfirm,
                writable: true
            })

            render(<ExamManagement />)
            const deleteButton = screen.getByTitle(/delete exam/i)

            fireEvent.click(deleteButton)

            expect(mockConfirm).toHaveBeenCalled()
            expect(mockDeleteExam).toHaveBeenCalledWith(mockExam.id)
        })
    })

    describe('Exam Form Buttons', () => {
        beforeEach(async () => {
            render(<ExamManagement />)
            const addButton = screen.getByText(/add exam/i)
            fireEvent.click(addButton)

            await waitFor(() => {
                expect(screen.getByText(/add new exam/i)).toBeInTheDocument()
            })
        })

        it('should render Save button', () => {
            expect(screen.getByText(/save exam/i)).toBeInTheDocument()
        })

        it('should save exam when Save button is clicked', async () => {
            const mockAddExam = vi.fn()
            mockUseSchoolData.mockReturnValue({
                ...mockUseSchoolData(),
                addExam: mockAddExam
            })

            // Fill required fields
            const examTypeInput = screen.getByLabelText(/exam type/i)
            fireEvent.change(examTypeInput, { target: { value: 'Mid Term' } })

            const classNameInput = screen.getByLabelText(/class/i)
            fireEvent.change(classNameInput, { target: { value: '10' } })

            const subjectInput = screen.getByLabelText(/subject/i)
            fireEvent.change(subjectInput, { target: { value: 'Mathematics' } })

            const startDateInput = screen.getByLabelText(/start date/i)
            fireEvent.change(startDateInput, { target: { value: '2024-02-01' } })

            const endDateInput = screen.getByLabelText(/end date/i)
            fireEvent.change(endDateInput, { target: { value: '2024-02-01' } })

            const maxMarksInput = screen.getByLabelText(/max marks/i)
            fireEvent.change(maxMarksInput, { target: { value: '100' } })

            const saveButton = screen.getByText(/save exam/i)
            fireEvent.click(saveButton)

            expect(mockAddExam).toHaveBeenCalled()
        })

        it('should render Cancel button', () => {
            expect(screen.getByText(/cancel/i)).toBeInTheDocument()
        })

        it('should close form when Cancel button is clicked', async () => {
            const cancelButton = screen.getByText(/cancel/i)

            fireEvent.click(cancelButton)

            await waitFor(() => {
                expect(screen.queryByText(/add new exam/i)).not.toBeInTheDocument()
            })
        })
    })

    describe('Marks Entry Buttons', () => {
        beforeEach(async () => {
            render(<ExamManagement />)
            const marksEntryTab = screen.getByText(/marks entry/i)
            fireEvent.click(marksEntryTab)

            await waitFor(() => {
                expect(screen.getByText(/enter marks/i)).toBeInTheDocument()
            })
        })

        it('should render exam selection dropdown', () => {
            expect(screen.getByText(/select exam/i)).toBeInTheDocument()
        })

        it('should render subject selection dropdown', () => {
            expect(screen.getByText(/select subject/i)).toBeInTheDocument()
        })

        it('should render Save All Marks button', () => {
            expect(screen.getByText(/save all marks/i)).toBeInTheDocument()
        })

        it('should be disabled when no exam and subject are selected', () => {
            const saveButton = screen.getByText(/save all marks/i)
            expect(saveButton).toBeDisabled()
        })

        it('should be enabled when exam and subject are selected', async () => {
            // Select exam
            const examSelect = screen.getByText(/select exam/i)
            fireEvent.click(examSelect)

            await waitFor(() => {
                const examOption = screen.getByText(/mid term/i)
                fireEvent.click(examOption)
            })

            // Select subject
            const subjectSelect = screen.getByText(/select subject/i)
            fireEvent.click(subjectSelect)

            await waitFor(() => {
                const subjectOption = screen.getByText(/mathematics/i)
                fireEvent.click(subjectOption)
            })

            await waitFor(() => {
                const saveButton = screen.getByText(/save all marks/i)
                expect(saveButton).not.toBeDisabled()
            })
        })

        it('should save marks when Save All Marks button is clicked', async () => {
            const mockAddExamResult = vi.fn()
            mockUseSchoolData.mockReturnValue({
                ...mockUseSchoolData(),
                addExamResult: mockAddExamResult
            })

            // Select exam
            const examSelect = screen.getByText(/select exam/i)
            fireEvent.click(examSelect)

            await waitFor(() => {
                const examOption = screen.getByText(/mid term/i)
                fireEvent.click(examOption)
            })

            // Select subject
            const subjectSelect = screen.getByText(/select subject/i)
            fireEvent.click(subjectSelect)

            await waitFor(() => {
                const subjectOption = screen.getByText(/mathematics/i)
                fireEvent.click(subjectOption)
            })

            // Enter marks for a student
            const marksInput = screen.getByDisplayValue('')
            fireEvent.change(marksInput, { target: { value: '85' } })

            await waitFor(() => {
                const saveButton = screen.getByText(/save all marks/i)
                fireEvent.click(saveButton)
            })

            expect(mockAddExamResult).toHaveBeenCalled()
        })
    })

    describe('Exam Reports Buttons', () => {
        beforeEach(async () => {
            render(<ExamManagement />)
            const reportsTab = screen.getByText(/reports/i)
            fireEvent.click(reportsTab)

            await waitFor(() => {
                expect(screen.getByText(/exam reports/i)).toBeInTheDocument()
            })
        })

        it('should render exam selection for reports', () => {
            expect(screen.getByText(/select exam/i)).toBeInTheDocument()
        })

        it('should render class selection for reports', () => {
            expect(screen.getByText(/select class/i)).toBeInTheDocument()
        })

        it('should render Generate Report button', () => {
            expect(screen.getByText(/generate report/i)).toBeInTheDocument()
        })

        it('should generate report when Generate Report button is clicked', async () => {
            // Select exam
            const examSelect = screen.getByText(/select exam/i)
            fireEvent.click(examSelect)

            await waitFor(() => {
                const examOption = screen.getByText(/mid term/i)
                fireEvent.click(examOption)
            })

            // Select class
            const classSelect = screen.getByText(/select class/i)
            fireEvent.click(classSelect)

            await waitFor(() => {
                const classOption = screen.getByText('10')
                fireEvent.click(classOption)
            })

            const generateButton = screen.getByText(/generate report/i)
            fireEvent.click(generateButton)

            await waitFor(() => {
                expect(screen.getByText(/exam results/i)).toBeInTheDocument()
            })
        })

        it('should render Export button', () => {
            expect(screen.getByText(/export/i)).toBeInTheDocument()
        })

        it('should export report when Export button is clicked', async () => {
            // Mock window.open
            const mockOpen = vi.fn()
            Object.defineProperty(window, 'open', {
                value: mockOpen,
                writable: true
            })

            // Generate report first
            const examSelect = screen.getByText(/select exam/i)
            fireEvent.click(examSelect)

            await waitFor(() => {
                const examOption = screen.getByText(/mid term/i)
                fireEvent.click(examOption)
            })

            const classSelect = screen.getByText(/select class/i)
            fireEvent.click(classSelect)

            await waitFor(() => {
                const classOption = screen.getByText('10')
                fireEvent.click(classOption)
            })

            const generateButton = screen.getByText(/generate report/i)
            fireEvent.click(generateButton)

            await waitFor(() => {
                const exportButton = screen.getByText(/export/i)
                fireEvent.click(exportButton)
            })

            expect(mockOpen).toHaveBeenCalled()
        })
    })

    describe('Filter and Search', () => {
        it('should render status filter', () => {
            render(<ExamManagement />)
            expect(screen.getByText(/all status/i)).toBeInTheDocument()
        })

        it('should filter by status when status is selected', async () => {
            render(<ExamManagement />)
            const statusFilter = screen.getByText(/all status/i)

            fireEvent.click(statusFilter)

            await waitFor(() => {
                expect(screen.getByText(/completed/i)).toBeInTheDocument()
                expect(screen.getByText(/ongoing/i)).toBeInTheDocument()
                expect(screen.getByText(/upcoming/i)).toBeInTheDocument()
            })
        })

        it('should render class filter', () => {
            render(<ExamManagement />)
            expect(screen.getByText(/all classes/i)).toBeInTheDocument()
        })

        it('should filter by class when class is selected', async () => {
            render(<ExamManagement />)
            const classFilter = screen.getByText(/all classes/i)

            fireEvent.click(classFilter)

            await waitFor(() => {
                expect(screen.getByText('10')).toBeInTheDocument()
            })
        })
    })

    describe('Form Validation', () => {
        beforeEach(async () => {
            render(<ExamManagement />)
            const addButton = screen.getByText(/add exam/i)
            fireEvent.click(addButton)

            await waitFor(() => {
                expect(screen.getByText(/add new exam/i)).toBeInTheDocument()
            })
        })

        it('should show validation errors when Save is clicked with empty required fields', async () => {
            const saveButton = screen.getByText(/save exam/i)
            fireEvent.click(saveButton)

            await waitFor(() => {
                expect(screen.getByText(/exam type is required/i)).toBeInTheDocument()
                expect(screen.getByText(/class is required/i)).toBeInTheDocument()
                expect(screen.getByText(/subject is required/i)).toBeInTheDocument()
                expect(screen.getByText(/start date is required/i)).toBeInTheDocument()
                expect(screen.getByText(/end date is required/i)).toBeInTheDocument()
                expect(screen.getByText(/max marks is required/i)).toBeInTheDocument()
            })
        })

        it('should enable Save button when all required fields are filled', async () => {
            // Fill required fields
            const examTypeInput = screen.getByLabelText(/exam type/i)
            fireEvent.change(examTypeInput, { target: { value: 'Mid Term' } })

            const classNameInput = screen.getByLabelText(/class/i)
            fireEvent.change(classNameInput, { target: { value: '10' } })

            const subjectInput = screen.getByLabelText(/subject/i)
            fireEvent.change(subjectInput, { target: { value: 'Mathematics' } })

            const startDateInput = screen.getByLabelText(/start date/i)
            fireEvent.change(startDateInput, { target: { value: '2024-02-01' } })

            const endDateInput = screen.getByLabelText(/end date/i)
            fireEvent.change(endDateInput, { target: { value: '2024-02-01' } })

            const maxMarksInput = screen.getByLabelText(/max marks/i)
            fireEvent.change(maxMarksInput, { target: { value: '100' } })

            const saveButton = screen.getByText(/save exam/i)
            expect(saveButton).not.toBeDisabled()
        })
    })

    describe('Loading States', () => {
        it('should show loading state when saving exam', async () => {
            const mockAddExam = vi.fn().mockImplementation(() => {
                return new Promise(resolve => setTimeout(resolve, 100))
            })

            mockUseSchoolData.mockReturnValue({
                ...mockUseSchoolData(),
                addExam: mockAddExam
            })

            render(<ExamManagement />)
            const addButton = screen.getByText(/add exam/i)
            fireEvent.click(addButton)

            await waitFor(() => {
                expect(screen.getByText(/add new exam/i)).toBeInTheDocument()
            })

            // Fill required fields
            const examTypeInput = screen.getByLabelText(/exam type/i)
            fireEvent.change(examTypeInput, { target: { value: 'Mid Term' } })

            const classNameInput = screen.getByLabelText(/class/i)
            fireEvent.change(classNameInput, { target: { value: '10' } })

            const subjectInput = screen.getByLabelText(/subject/i)
            fireEvent.change(subjectInput, { target: { value: 'Mathematics' } })

            const startDateInput = screen.getByLabelText(/start date/i)
            fireEvent.change(startDateInput, { target: { value: '2024-02-01' } })

            const endDateInput = screen.getByLabelText(/end date/i)
            fireEvent.change(endDateInput, { target: { value: '2024-02-01' } })

            const maxMarksInput = screen.getByLabelText(/max marks/i)
            fireEvent.change(maxMarksInput, { target: { value: '100' } })

            const saveButton = screen.getByText(/save exam/i)
            fireEvent.click(saveButton)

            await waitFor(() => {
                expect(screen.getByText(/saving/i)).toBeInTheDocument()
            })
        })
    })
}) 