import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '../../test/test-utils'
import { StudentAttendance } from './StudentAttendance'
import { mockStudentUser } from '../../test/test-utils'

describe('StudentAttendance Component', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Rendering', () => {
        it('should render attendance page for student', () => {
            render(<StudentAttendance />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockStudentUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            expect(screen.getByText(/attendance/i)).toBeInTheDocument()
        })

        it('should display month and year selectors', () => {
            render(<StudentAttendance />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockStudentUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            expect(screen.getByText(/select month/i)).toBeInTheDocument()
            expect(screen.getByText(/select year/i)).toBeInTheDocument()
        })

        it('should display attendance statistics', () => {
            render(<StudentAttendance />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockStudentUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            expect(screen.getByText(/attendance percentage/i)).toBeInTheDocument()
            expect(screen.getByText(/present days/i)).toBeInTheDocument()
            expect(screen.getByText(/absent days/i)).toBeInTheDocument()
        })
    })

    describe('Calendar View', () => {
        it('should display calendar for selected month', () => {
            render(<StudentAttendance />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockStudentUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            expect(screen.getByText(/calendar/i)).toBeInTheDocument()
        })
    })

    describe('Error Handling', () => {
        it('should display error message when student record not found', () => {
            render(<StudentAttendance />, {
                authValue: {
                    isAuthenticated: true,
                    user: {
                        id: 'student1',
                        name: 'Unknown Student',
                        role: 'student',
                        admissionNumber: 'UNKNOWN'
                    },
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            expect(screen.getByText(/student record not found/i)).toBeInTheDocument()
        })
    })

    describe('Month Selection', () => {
        it('should change displayed month when month selector changes', () => {
            render(<StudentAttendance />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockStudentUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            const monthSelect = screen.getByLabelText(/select month/i)
            fireEvent.change(monthSelect, { target: { value: '0' } })
            
            expect(monthSelect).toHaveValue('0')
        })
    })

    describe('Year Selection', () => {
        it('should change displayed year when year selector changes', () => {
            render(<StudentAttendance />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockStudentUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            const yearSelect = screen.getByLabelText(/select year/i)
            fireEvent.change(yearSelect, { target: { value: '2023' } })
            
            expect(yearSelect).toHaveValue('2023')
        })
    })
})




