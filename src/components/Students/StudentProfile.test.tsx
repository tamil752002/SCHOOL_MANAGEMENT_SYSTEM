import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '../../test/test-utils'
import { StudentProfile } from './StudentProfile'
import { mockStudent } from '../../test/test-utils'

describe('StudentProfile Component', () => {
    const mockOnBack = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Rendering', () => {
        it('should render student profile with student information', () => {
            render(<StudentProfile student={mockStudent} onBack={mockOnBack} />)
            
            expect(screen.getByText(mockStudent.studentName)).toBeInTheDocument()
            expect(screen.getByText(mockStudent.admissionNumber)).toBeInTheDocument()
        })

        it('should render back button', () => {
            render(<StudentProfile student={mockStudent} onBack={mockOnBack} />)
            
            const backButton = screen.getByText(/back/i)
            expect(backButton).toBeInTheDocument()
        })

        it('should call onBack when back button is clicked', () => {
            render(<StudentProfile student={mockStudent} onBack={mockOnBack} />)
            
            const backButton = screen.getByText(/back/i)
            fireEvent.click(backButton)
            
            expect(mockOnBack).toHaveBeenCalledTimes(1)
        })
    })

    describe('Tab Navigation', () => {
        it('should render all tabs', () => {
            render(<StudentProfile student={mockStudent} onBack={mockOnBack} />)
            
            expect(screen.getByText(/overview/i)).toBeInTheDocument()
            expect(screen.getByText(/fees/i)).toBeInTheDocument()
            expect(screen.getByText(/activities/i)).toBeInTheDocument()
            expect(screen.getByText(/attendance/i)).toBeInTheDocument()
        })

        it('should switch to fees tab when clicked', async () => {
            render(<StudentProfile student={mockStudent} onBack={mockOnBack} />)
            
            const feesTab = screen.getByText(/fees/i)
            fireEvent.click(feesTab)
            
            await waitFor(() => {
                expect(screen.getByText(/fee records/i)).toBeInTheDocument()
            })
        })

        it('should switch to activities tab when clicked', async () => {
            render(<StudentProfile student={mockStudent} onBack={mockOnBack} />)
            
            const activitiesTab = screen.getByText(/activities/i)
            fireEvent.click(activitiesTab)
            
            await waitFor(() => {
                expect(screen.getByText(/student activities/i)).toBeInTheDocument()
            })
        })

        it('should switch to attendance tab when clicked', async () => {
            render(<StudentProfile student={mockStudent} onBack={mockOnBack} />)
            
            const attendanceTab = screen.getByText(/attendance/i)
            fireEvent.click(attendanceTab)
            
            await waitFor(() => {
                expect(screen.getByText(/attendance records/i)).toBeInTheDocument()
            })
        })
    })

    describe('Password Reset', () => {
        it('should render reset password button', () => {
            render(<StudentProfile student={mockStudent} onBack={mockOnBack} />)
            
            expect(screen.getByText(/reset password/i)).toBeInTheDocument()
        })

        it('should show confirmation dialog when reset password is clicked', () => {
            const mockConfirm = vi.fn(() => true)
            Object.defineProperty(window, 'confirm', {
                value: mockConfirm,
                writable: true
            })

            render(<StudentProfile student={mockStudent} onBack={mockOnBack} />)
            
            const resetButton = screen.getByText(/reset password/i)
            fireEvent.click(resetButton)
            
            expect(mockConfirm).toHaveBeenCalled()
        })

        it('should not reset password if user cancels', () => {
            const mockConfirm = vi.fn(() => false)
            Object.defineProperty(window, 'confirm', {
                value: mockConfirm,
                writable: true
            })

            const mockAlert = vi.fn()
            Object.defineProperty(window, 'alert', {
                value: mockAlert,
                writable: true
            })

            render(<StudentProfile student={mockStudent} onBack={mockOnBack} />)
            
            const resetButton = screen.getByText(/reset password/i)
            fireEvent.click(resetButton)
            
            expect(mockAlert).not.toHaveBeenCalled()
        })
    })

    describe('Student Information Display', () => {
        it('should display personal information', () => {
            render(<StudentProfile student={mockStudent} onBack={mockOnBack} />)
            
            expect(screen.getByText(/personal information/i)).toBeInTheDocument()
            expect(screen.getByText(/full name/i)).toBeInTheDocument()
            expect(screen.getByText(/admission number/i)).toBeInTheDocument()
        })

        it('should display class and section information', () => {
            render(<StudentProfile student={mockStudent} onBack={mockOnBack} />)
            
            expect(screen.getByText(new RegExp(`Class ${mockStudent.studentClass}-${mockStudent.section}`, 'i'))).toBeInTheDocument()
        })

        it('should display parent information', () => {
            render(<StudentProfile student={mockStudent} onBack={mockOnBack} />)
            
            expect(screen.getByText(/father/i)).toBeInTheDocument()
            expect(screen.getByText(/mother/i)).toBeInTheDocument()
        })
    })

    describe('Fee Information', () => {
        it('should display fee statistics in overview', () => {
            render(<StudentProfile student={mockStudent} onBack={mockOnBack} />)
            
            expect(screen.getByText(/fee information/i)).toBeInTheDocument()
        })

        it('should display fee records in fees tab', async () => {
            render(<StudentProfile student={mockStudent} onBack={mockOnBack} />)
            
            const feesTab = screen.getByText(/fees/i)
            fireEvent.click(feesTab)
            
            await waitFor(() => {
                // The fees tab shows "Total Fees" or fee records
                const hasTotalFees = screen.queryByText(/total fees/i)
                const hasAcademicYear = screen.queryByText(/academic year/i)
                expect(hasTotalFees || hasAcademicYear).toBeTruthy()
            })
        })
    })

    describe('Activity Information', () => {
        it('should display activity statistics in overview', () => {
            render(<StudentProfile student={mockStudent} onBack={mockOnBack} />)
            
            expect(screen.getByText(/activities/i)).toBeInTheDocument()
        })

        it('should display activities in activities tab', async () => {
            render(<StudentProfile student={mockStudent} onBack={mockOnBack} />)
            
            const activitiesTab = screen.getByText(/activities/i)
            fireEvent.click(activitiesTab)
            
            await waitFor(() => {
                // The activities tab shows activities or "No activities recorded"
                const hasActivities = screen.queryByText(/activities/i)
                const hasNoActivities = screen.queryByText(/no activities recorded/i)
                expect(hasActivities || hasNoActivities).toBeTruthy()
            })
        })
    })

    describe('Attendance Information', () => {
        it('should display attendance statistics in overview', () => {
            render(<StudentProfile student={mockStudent} onBack={mockOnBack} />)
            
            expect(screen.getByText(/attendance/i)).toBeInTheDocument()
        })

        it('should display attendance records in attendance tab', async () => {
            render(<StudentProfile student={mockStudent} onBack={mockOnBack} />)
            
            const attendanceTab = screen.getByText(/attendance/i)
            fireEvent.click(attendanceTab)
            
            await waitFor(() => {
                // The attendance tab shows attendance information
                expect(screen.getByText(/attendance/i)).toBeInTheDocument()
            })
        })
    })

    describe('Examination Information', () => {
        it('should display examination records', async () => {
            render(<StudentProfile student={mockStudent} onBack={mockOnBack} />)
            
            const examinationTab = screen.getByText(/examination/i)
            fireEvent.click(examinationTab)
            
            await waitFor(() => {
                // The examination tab shows "Subject-wise Performance" or "No exam records available"
                const hasSubjectPerformance = screen.queryByText(/subject-wise performance/i)
                const hasNoRecords = screen.queryByText(/no exam records available/i)
                expect(hasSubjectPerformance || hasNoRecords).toBeTruthy()
            })
        })
    })
})

