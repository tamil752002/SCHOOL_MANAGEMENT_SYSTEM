import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSchoolData } from '../../contexts/SchoolDataContext'
import { fireEvent, mockAttendanceRecord, mockStudent, render, screen, waitFor } from '../../test/test-utils'
import { AttendanceMain } from './AttendanceMain'

// Mock the context hook
vi.mock('../../contexts/SchoolDataContext', () => ({
    useSchoolData: vi.fn()
}))

describe('AttendanceMain Component', () => {
    const mockUseSchoolData = useSchoolData as vi.MockedFunction<typeof useSchoolData>

    beforeEach(() => {
        mockUseSchoolData.mockReturnValue({
            students: [mockStudent],
            attendanceRecords: [mockAttendanceRecord],
            feeRecords: [],
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
            getAttendanceByClass: vi.fn(() => [mockAttendanceRecord]),
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

    describe('Class Selection', () => {
        it('should render class cards', () => {
            render(<AttendanceMain />)
            expect(screen.getByText(/class 10/i)).toBeInTheDocument()
        })

        it('should navigate to class attendance when class card is clicked', async () => {
            render(<AttendanceMain />)
            const classCard = screen.getByText(/class 10/i)

            fireEvent.click(classCard)

            await waitFor(() => {
                expect(screen.getByText(/attendance for class 10/i)).toBeInTheDocument()
            })
        })
    })

    describe('Class Attendance Buttons', () => {
        beforeEach(async () => {
            render(<AttendanceMain />)
            const classCard = screen.getByText(/class 10/i)
            fireEvent.click(classCard)

            await waitFor(() => {
                expect(screen.getByText(/attendance for class 10/i)).toBeInTheDocument()
            })
        })

        it('should render Mark All Present button', () => {
            expect(screen.getByText(/mark all present/i)).toBeInTheDocument()
        })

        it('should mark all students present when Mark All Present button is clicked', async () => {
            const markAllButton = screen.getByText(/mark all present/i)

            fireEvent.click(markAllButton)

            await waitFor(() => {
                // All students should be marked as present
                const presentButtons = screen.getAllByRole('button')
                const presentButton = presentButtons.find(btn =>
                    btn.textContent?.includes('present') && btn.classList.contains('bg-green-600')
                )
                expect(presentButton).toBeInTheDocument()
            })
        })

        it('should render Save Attendance button', () => {
            expect(screen.getByText(/save attendance/i)).toBeInTheDocument()
        })

        it('should be disabled when no attendance is marked', () => {
            const saveButton = screen.getByText(/save attendance/i)
            expect(saveButton).toBeDisabled()
        })

        it('should be enabled when attendance is marked', async () => {
            // Mark a student present first
            const presentButtons = screen.getAllByRole('button')
            const presentButton = presentButtons.find(btn =>
                btn.textContent?.includes('present') && !btn.classList.contains('bg-green-600')
            )

            if (presentButton) {
                fireEvent.click(presentButton)
            }

            await waitFor(() => {
                const saveButton = screen.getByText(/save attendance/i)
                expect(saveButton).not.toBeDisabled()
            })
        })

        it('should save attendance when Save Attendance button is clicked', async () => {
            const mockAddAttendanceRecord = vi.fn()
            mockUseSchoolData.mockReturnValue({
                ...mockUseSchoolData(),
                addAttendanceRecord: mockAddAttendanceRecord
            })

            // Mark a student present first
            const presentButtons = screen.getAllByRole('button')
            const presentButton = presentButtons.find(btn =>
                btn.textContent?.includes('present') && !btn.classList.contains('bg-green-600')
            )

            if (presentButton) {
                fireEvent.click(presentButton)
            }

            await waitFor(() => {
                const saveButton = screen.getByText(/save attendance/i)
                fireEvent.click(saveButton)
            })

            expect(mockAddAttendanceRecord).toHaveBeenCalled()
        })

        it('should render Back button', () => {
            expect(screen.getByText(/back/i)).toBeInTheDocument()
        })

        it('should go back to class selection when Back button is clicked', async () => {
            const backButton = screen.getByText(/back/i)

            fireEvent.click(backButton)

            await waitFor(() => {
                expect(screen.getByText(/attendance management/i)).toBeInTheDocument()
            })
        })
    })

    describe('Individual Student Attendance Buttons', () => {
        beforeEach(async () => {
            render(<AttendanceMain />)
            const classCard = screen.getByText(/class 10/i)
            fireEvent.click(classCard)

            await waitFor(() => {
                expect(screen.getByText(/attendance for class 10/i)).toBeInTheDocument()
            })
        })

        it('should render Present button for each student', () => {
            const presentButtons = screen.getAllByRole('button')
            const presentButton = presentButtons.find(btn =>
                btn.textContent?.includes('present')
            )
            expect(presentButton).toBeInTheDocument()
        })

        it('should mark student as present when Present button is clicked', async () => {
            const presentButtons = screen.getAllByRole('button')
            const presentButton = presentButtons.find(btn =>
                btn.textContent?.includes('present') && !btn.classList.contains('bg-green-600')
            )

            if (presentButton) {
                fireEvent.click(presentButton)

                await waitFor(() => {
                    expect(presentButton).toHaveClass('bg-green-600')
                })
            }
        })

        it('should render Absent button for each student', () => {
            const absentButtons = screen.getAllByRole('button')
            const absentButton = absentButtons.find(btn =>
                btn.textContent?.includes('absent')
            )
            expect(absentButton).toBeInTheDocument()
        })

        it('should mark student as absent when Absent button is clicked', async () => {
            const absentButtons = screen.getAllByRole('button')
            const absentButton = absentButtons.find(btn =>
                btn.textContent?.includes('absent') && !btn.classList.contains('bg-red-600')
            )

            if (absentButton) {
                fireEvent.click(absentButton)

                await waitFor(() => {
                    expect(absentButton).toHaveClass('bg-red-600')
                })
            }
        })

        it('should toggle attendance status when buttons are clicked', async () => {
            const presentButtons = screen.getAllByRole('button')
            const presentButton = presentButtons.find(btn =>
                btn.textContent?.includes('present') && !btn.classList.contains('bg-green-600')
            )
            const absentButton = presentButtons.find(btn =>
                btn.textContent?.includes('absent') && !btn.classList.contains('bg-red-600')
            )

            if (presentButton && absentButton) {
                // Mark present first
                fireEvent.click(presentButton)
                await waitFor(() => {
                    expect(presentButton).toHaveClass('bg-green-600')
                })

                // Then mark absent
                fireEvent.click(absentButton)
                await waitFor(() => {
                    expect(absentButton).toHaveClass('bg-red-600')
                    expect(presentButton).not.toHaveClass('bg-green-600')
                })
            }
        })
    })

    describe('Attendance Statistics', () => {
        beforeEach(async () => {
            render(<AttendanceMain />)
            const classCard = screen.getByText(/class 10/i)
            fireEvent.click(classCard)

            await waitFor(() => {
                expect(screen.getByText(/attendance for class 10/i)).toBeInTheDocument()
            })
        })

        it('should display attendance statistics', () => {
            expect(screen.getByText(/total students/i)).toBeInTheDocument()
            expect(screen.getByText(/present/i)).toBeInTheDocument()
            expect(screen.getByText(/absent/i)).toBeInTheDocument()
            expect(screen.getByText(/attendance rate/i)).toBeInTheDocument()
        })

        it('should update statistics when attendance is marked', async () => {
            const presentButtons = screen.getAllByRole('button')
            const presentButton = presentButtons.find(btn =>
                btn.textContent?.includes('present') && !btn.classList.contains('bg-green-600')
            )

            if (presentButton) {
                fireEvent.click(presentButton)

                await waitFor(() => {
                    // Statistics should be updated
                    expect(screen.getByText(/1/i)).toBeInTheDocument() // Present count
                })
            }
        })
    })

    describe('Date Selection', () => {
        beforeEach(async () => {
            render(<AttendanceMain />)
            const classCard = screen.getByText(/class 10/i)
            fireEvent.click(classCard)

            await waitFor(() => {
                expect(screen.getByText(/attendance for class 10/i)).toBeInTheDocument()
            })
        })

        it('should render date picker', () => {
            expect(screen.getByLabelText(/select date/i)).toBeInTheDocument()
        })

        it('should change date when date picker is used', async () => {
            const dateInput = screen.getByLabelText(/select date/i)
            const newDate = '2024-01-20'

            fireEvent.change(dateInput, { target: { value: newDate } })

            await waitFor(() => {
                expect(dateInput).toHaveValue(newDate)
            })
        })
    })

    describe('Loading States', () => {
        it('should show loading state when saving attendance', async () => {
            const mockAddAttendanceRecord = vi.fn().mockImplementation(() => {
                return new Promise(resolve => setTimeout(resolve, 100))
            })

            mockUseSchoolData.mockReturnValue({
                ...mockUseSchoolData(),
                addAttendanceRecord: mockAddAttendanceRecord
            })

            render(<AttendanceMain />)
            const classCard = screen.getByText(/class 10/i)
            fireEvent.click(classCard)

            await waitFor(() => {
                expect(screen.getByText(/attendance for class 10/i)).toBeInTheDocument()
            })

            // Mark a student present
            const presentButtons = screen.getAllByRole('button')
            const presentButton = presentButtons.find(btn =>
                btn.textContent?.includes('present') && !btn.classList.contains('bg-green-600')
            )

            if (presentButton) {
                fireEvent.click(presentButton)
            }

            await waitFor(() => {
                const saveButton = screen.getByText(/save attendance/i)
                fireEvent.click(saveButton)
            })

            await waitFor(() => {
                expect(screen.getByText(/saving/i)).toBeInTheDocument()
            })
        })
    })
}) 