import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSchoolData } from '../../contexts/SchoolDataContext'
import { fireEvent, mockFeeRecord, mockStudent, render, screen, waitFor } from '../../test/test-utils'
import { FeeManagement } from './FeeManagement'

// Mock the context hook
vi.mock('../../contexts/SchoolDataContext', () => ({
    useSchoolData: vi.fn()
}))

describe('FeeManagement Component', () => {
    const mockUseSchoolData = useSchoolData as vi.MockedFunction<typeof useSchoolData>

    beforeEach(() => {
        mockUseSchoolData.mockReturnValue({
            students: [mockStudent],
            attendanceRecords: [],
            feeRecords: [mockFeeRecord],
            studentActivities: [],
            exams: [],
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
            applyFeeStructureToStudents: vi.fn(() => 5)
        })
    })

    describe('Tab Navigation', () => {
        it('should render Overview tab', () => {
            render(<FeeManagement />)
            expect(screen.getByText(/overview/i)).toBeInTheDocument()
        })

        it('should render Structure tab', () => {
            render(<FeeManagement />)
            expect(screen.getByText(/structure/i)).toBeInTheDocument()
        })

        it('should switch to Structure tab when clicked', async () => {
            render(<FeeManagement />)
            const structureTab = screen.getByText(/structure/i)

            fireEvent.click(structureTab)

            await waitFor(() => {
                expect(screen.getByText(/fee structures/i)).toBeInTheDocument()
            })
        })
    })

    describe('Fee Collection Buttons', () => {
        it('should render Update button for fee records', () => {
            render(<FeeManagement />)
            expect(screen.getByText(/update/i)).toBeInTheDocument()
        })

        it('should open collection form when Update button is clicked', async () => {
            render(<FeeManagement />)
            const updateButton = screen.getByText(/update/i)

            fireEvent.click(updateButton)

            await waitFor(() => {
                expect(screen.getByText(/collect fee/i)).toBeInTheDocument()
            })
        })
    })

    describe('Fee Structure Buttons', () => {
        beforeEach(async () => {
            render(<FeeManagement />)
            const structureTab = screen.getByText(/structure/i)
            fireEvent.click(structureTab)

            await waitFor(() => {
                expect(screen.getByText(/fee structures/i)).toBeInTheDocument()
            })
        })

        it('should render Add Fee Structure button', () => {
            expect(screen.getByText(/add fee structure/i)).toBeInTheDocument()
        })

        it('should open fee structure form when Add Fee Structure button is clicked', async () => {
            const addButton = screen.getByText(/add fee structure/i)

            fireEvent.click(addButton)

            await waitFor(() => {
                expect(screen.getByText(/add new fee structure/i)).toBeInTheDocument()
            })
        })

        it('should render Apply to Students button for each structure', () => {
            expect(screen.getByText(/apply to students/i)).toBeInTheDocument()
        })

        it('should apply fee structure when Apply to Students button is clicked', async () => {
            const mockApplyFeeStructureToStudents = vi.fn(() => 5)
            mockUseSchoolData.mockReturnValue({
                ...mockUseSchoolData(),
                applyFeeStructureToStudents: mockApplyFeeStructureToStudents
            })

            // Mock window.alert
            const mockAlert = vi.fn()
            Object.defineProperty(window, 'alert', {
                value: mockAlert,
                writable: true
            })

            const applyButton = screen.getByText(/apply to students/i)

            fireEvent.click(applyButton)

            expect(mockApplyFeeStructureToStudents).toHaveBeenCalled()
            expect(mockAlert).toHaveBeenCalledWith(
                expect.stringContaining('Successfully applied fee structure!')
            )
        })

        it('should render Edit button for each structure', () => {
            expect(screen.getByText(/edit/i)).toBeInTheDocument()
        })

        it('should open edit form when Edit button is clicked', async () => {
            const editButton = screen.getByText(/edit/i)

            fireEvent.click(editButton)

            await waitFor(() => {
                expect(screen.getByText(/edit fee structure/i)).toBeInTheDocument()
            })
        })

        it('should render Delete button for each structure', () => {
            expect(screen.getByText(/delete/i)).toBeInTheDocument()
        })

        it('should delete fee structure when Delete button is clicked', async () => {
            const mockDeleteFeeStructure = vi.fn()
            mockUseSchoolData.mockReturnValue({
                ...mockUseSchoolData(),
                deleteFeeStructure: mockDeleteFeeStructure
            })

            // Mock window.confirm
            const mockConfirm = vi.fn(() => true)
            Object.defineProperty(window, 'confirm', {
                value: mockConfirm,
                writable: true
            })

            // Mock window.alert
            const mockAlert = vi.fn()
            Object.defineProperty(window, 'alert', {
                value: mockAlert,
                writable: true
            })

            const deleteButton = screen.getByText(/delete/i)

            fireEvent.click(deleteButton)

            expect(mockConfirm).toHaveBeenCalled()
            expect(mockDeleteFeeStructure).toHaveBeenCalled()
            expect(mockAlert).toHaveBeenCalledWith(
                expect.stringContaining('Fee structure and associated fee records deleted successfully!')
            )
        })
    })

    describe('Fee Structure Form Buttons', () => {
        beforeEach(async () => {
            render(<FeeManagement />)
            const structureTab = screen.getByText(/structure/i)
            fireEvent.click(structureTab)

            await waitFor(() => {
                expect(screen.getByText(/fee structures/i)).toBeInTheDocument()
            })

            const addButton = screen.getByText(/add fee structure/i)
            fireEvent.click(addButton)

            await waitFor(() => {
                expect(screen.getByText(/add new fee structure/i)).toBeInTheDocument()
            })
        })

        it('should render Save button', () => {
            expect(screen.getByText(/save structure/i)).toBeInTheDocument()
        })

        it('should save fee structure when Save button is clicked', async () => {
            const mockAddFeeStructure = vi.fn()
            mockUseSchoolData.mockReturnValue({
                ...mockUseSchoolData(),
                addFeeStructure: mockAddFeeStructure
            })

            // Fill required fields
            const classNameInput = screen.getByLabelText(/class/i)
            fireEvent.change(classNameInput, { target: { value: '10' } })

            const feeTypeInput = screen.getByLabelText(/fee type/i)
            fireEvent.change(feeTypeInput, { target: { value: 'Tuition' } })

            const amountInput = screen.getByLabelText(/amount/i)
            fireEvent.change(amountInput, { target: { value: '5000' } })

            const saveButton = screen.getByText(/save structure/i)
            fireEvent.click(saveButton)

            expect(mockAddFeeStructure).toHaveBeenCalled()
        })

        it('should render Cancel button', () => {
            expect(screen.getByText(/cancel/i)).toBeInTheDocument()
        })

        it('should close form when Cancel button is clicked', async () => {
            const cancelButton = screen.getByText(/cancel/i)

            fireEvent.click(cancelButton)

            await waitFor(() => {
                expect(screen.queryByText(/add new fee structure/i)).not.toBeInTheDocument()
            })
        })
    })

    describe('Fee Collection Form Buttons', () => {
        beforeEach(async () => {
            render(<FeeManagement />)
            const updateButton = screen.getByText(/update/i)
            fireEvent.click(updateButton)

            await waitFor(() => {
                expect(screen.getByText(/collect fee/i)).toBeInTheDocument()
            })
        })

        it('should render Collect Fee button', () => {
            expect(screen.getByText(/collect fee/i)).toBeInTheDocument()
        })

        it('should collect fee when Collect Fee button is clicked', async () => {
            const mockUpdateFeeRecord = vi.fn()
            mockUseSchoolData.mockReturnValue({
                ...mockUseSchoolData(),
                updateFeeRecord: mockUpdateFeeRecord
            })

            // Fill required fields
            const amountInput = screen.getByLabelText(/amount paid/i)
            fireEvent.change(amountInput, { target: { value: '5000' } })

            const collectButton = screen.getByText(/collect fee/i)
            fireEvent.click(collectButton)

            expect(mockUpdateFeeRecord).toHaveBeenCalled()
        })

        it('should render Close button', () => {
            expect(screen.getByText(/close/i)).toBeInTheDocument()
        })

        it('should close form when Close button is clicked', async () => {
            const closeButton = screen.getByText(/close/i)

            fireEvent.click(closeButton)

            await waitFor(() => {
                expect(screen.queryByText(/collect fee/i)).not.toBeInTheDocument()
            })
        })
    })

    describe('Filter and Search', () => {
        it('should render status filter', () => {
            render(<FeeManagement />)
            expect(screen.getByText(/all status/i)).toBeInTheDocument()
        })

        it('should filter by status when status is selected', async () => {
            render(<FeeManagement />)
            const statusFilter = screen.getByText(/all status/i)

            fireEvent.click(statusFilter)

            await waitFor(() => {
                expect(screen.getByText(/paid/i)).toBeInTheDocument()
                expect(screen.getByText(/pending/i)).toBeInTheDocument()
                expect(screen.getByText(/overdue/i)).toBeInTheDocument()
            })
        })

        it('should render class filter', () => {
            render(<FeeManagement />)
            expect(screen.getByText(/all classes/i)).toBeInTheDocument()
        })

        it('should filter by class when class is selected', async () => {
            render(<FeeManagement />)
            const classFilter = screen.getByText(/all classes/i)

            fireEvent.click(classFilter)

            await waitFor(() => {
                expect(screen.getByText('10')).toBeInTheDocument()
            })
        })
    })

    describe('Form Validation', () => {
        beforeEach(async () => {
            render(<FeeManagement />)
            const structureTab = screen.getByText(/structure/i)
            fireEvent.click(structureTab)

            await waitFor(() => {
                expect(screen.getByText(/fee structures/i)).toBeInTheDocument()
            })

            const addButton = screen.getByText(/add fee structure/i)
            fireEvent.click(addButton)

            await waitFor(() => {
                expect(screen.getByText(/add new fee structure/i)).toBeInTheDocument()
            })
        })

        it('should show validation errors when Save is clicked with empty required fields', async () => {
            const saveButton = screen.getByText(/save structure/i)
            fireEvent.click(saveButton)

            await waitFor(() => {
                expect(screen.getByText(/class is required/i)).toBeInTheDocument()
                expect(screen.getByText(/fee type is required/i)).toBeInTheDocument()
                expect(screen.getByText(/amount is required/i)).toBeInTheDocument()
            })
        })

        it('should enable Save button when all required fields are filled', async () => {
            // Fill required fields
            const classNameInput = screen.getByLabelText(/class/i)
            fireEvent.change(classNameInput, { target: { value: '10' } })

            const feeTypeInput = screen.getByLabelText(/fee type/i)
            fireEvent.change(feeTypeInput, { target: { value: 'Tuition' } })

            const amountInput = screen.getByLabelText(/amount/i)
            fireEvent.change(amountInput, { target: { value: '5000' } })

            const saveButton = screen.getByText(/save structure/i)
            expect(saveButton).not.toBeDisabled()
        })
    })

    describe('Loading States', () => {
        it('should show loading state when saving fee structure', async () => {
            const mockAddFeeStructure = vi.fn().mockImplementation(() => {
                return new Promise(resolve => setTimeout(resolve, 100))
            })

            mockUseSchoolData.mockReturnValue({
                ...mockUseSchoolData(),
                addFeeStructure: mockAddFeeStructure
            })

            render(<FeeManagement />)
            const structureTab = screen.getByText(/structure/i)
            fireEvent.click(structureTab)

            await waitFor(() => {
                expect(screen.getByText(/fee structures/i)).toBeInTheDocument()
            })

            const addButton = screen.getByText(/add fee structure/i)
            fireEvent.click(addButton)

            await waitFor(() => {
                expect(screen.getByText(/add new fee structure/i)).toBeInTheDocument()
            })

            // Fill required fields
            const classNameInput = screen.getByLabelText(/class/i)
            fireEvent.change(classNameInput, { target: { value: '10' } })

            const feeTypeInput = screen.getByLabelText(/fee type/i)
            fireEvent.change(feeTypeInput, { target: { value: 'Tuition' } })

            const amountInput = screen.getByLabelText(/amount/i)
            fireEvent.change(amountInput, { target: { value: '5000' } })

            const saveButton = screen.getByText(/save structure/i)
            fireEvent.click(saveButton)

            await waitFor(() => {
                expect(screen.getByText(/saving/i)).toBeInTheDocument()
            })
        })
    })
}) 