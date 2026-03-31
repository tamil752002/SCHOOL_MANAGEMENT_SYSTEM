import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '../../test/test-utils'
import { ClassAttendance } from './ClassAttendance'
import { mockStudent } from '../../test/test-utils'

describe('ClassAttendance Component', () => {
    const mockOnBack = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Rendering', () => {
        it('should render class attendance page', () => {
            render(<ClassAttendance className="10" onBack={mockOnBack} />)
            
            expect(screen.getByText(/attendance for class 10/i)).toBeInTheDocument()
        })

        it('should render back button', () => {
            render(<ClassAttendance className="10" onBack={mockOnBack} />)
            
            const backButton = screen.getByText(/back/i)
            expect(backButton).toBeInTheDocument()
        })

        it('should call onBack when back button is clicked', () => {
            render(<ClassAttendance className="10" onBack={mockOnBack} />)
            
            const backButton = screen.getByText(/back/i)
            fireEvent.click(backButton)
            
            expect(mockOnBack).toHaveBeenCalledTimes(1)
        })
    })

    describe('Date Selection', () => {
        it('should render date picker', () => {
            render(<ClassAttendance className="10" onBack={mockOnBack} />)
            
            expect(screen.getByLabelText(/select date/i)).toBeInTheDocument()
        })

        it('should change date when date picker is used', async () => {
            render(<ClassAttendance className="10" onBack={mockOnBack} />)
            
            const dateInput = screen.getByLabelText(/select date/i)
            const newDate = '2024-01-20'
            
            fireEvent.change(dateInput, { target: { value: newDate } })
            
            await waitFor(() => {
                expect(dateInput).toHaveValue(newDate)
            })
        })
    })

    describe('Mark All Present', () => {
        it('should render mark all present button', () => {
            render(<ClassAttendance className="10" onBack={mockOnBack} />)
            
            expect(screen.getByText(/mark all present/i)).toBeInTheDocument()
        })

        it('should mark all students as present when button is clicked', async () => {
            render(<ClassAttendance className="10" onBack={mockOnBack} />)
            
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
    })

    describe('Individual Attendance', () => {
        it('should render present and absent buttons for each student', () => {
            render(<ClassAttendance className="10" onBack={mockOnBack} />)
            
            expect(screen.getByText(/present/i)).toBeInTheDocument()
            expect(screen.getByText(/absent/i)).toBeInTheDocument()
        })

        it('should toggle attendance status when buttons are clicked', async () => {
            render(<ClassAttendance className="10" onBack={mockOnBack} />)
            
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
    })

    describe('Save Attendance', () => {
        it('should render save attendance button', () => {
            render(<ClassAttendance className="10" onBack={mockOnBack} />)
            
            expect(screen.getByText(/save attendance/i)).toBeInTheDocument()
        })

        it('should save attendance when button is clicked', async () => {
            render(<ClassAttendance className="10" onBack={mockOnBack} />)
            
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
            
            await waitFor(() => {
                expect(screen.getByText(/attendance saved successfully/i)).toBeInTheDocument()
            })
        })
    })

    describe('Statistics', () => {
        it('should display attendance statistics', () => {
            render(<ClassAttendance className="10" onBack={mockOnBack} />)
            
            expect(screen.getByText(/total students/i)).toBeInTheDocument()
            expect(screen.getByText(/present/i)).toBeInTheDocument()
            expect(screen.getByText(/absent/i)).toBeInTheDocument()
        })

        it('should update statistics when attendance is marked', async () => {
            render(<ClassAttendance className="10" onBack={mockOnBack} />)
            
            const presentButtons = screen.getAllByRole('button')
            const presentButton = presentButtons.find(btn =>
                btn.textContent?.includes('present') && !btn.classList.contains('bg-green-600')
            )
            
            if (presentButton) {
                fireEvent.click(presentButton)
                
                await waitFor(() => {
                    // Statistics should be updated
                    expect(screen.getByText(/1/i)).toBeInTheDocument()
                })
            }
        })
    })
})




