import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '../../test/test-utils'
import { StudentFees } from './StudentFees'
import { mockStudentUser } from '../../test/test-utils'

describe('StudentFees Component', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Rendering', () => {
        it('should render fees page for student', () => {
            render(<StudentFees />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockStudentUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            expect(screen.getByText(/fees/i)).toBeInTheDocument()
        })

        it('should display fee statistics', () => {
            render(<StudentFees />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockStudentUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            expect(screen.getByText(/total fees/i)).toBeInTheDocument()
            expect(screen.getByText(/paid/i)).toBeInTheDocument()
            expect(screen.getByText(/pending/i)).toBeInTheDocument()
        })

        it('should display year filter', () => {
            render(<StudentFees />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockStudentUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            expect(screen.getByText(/select academic year/i)).toBeInTheDocument()
        })
    })

    describe('Fee Records Display', () => {
        it('should display fee records grouped by academic year', () => {
            render(<StudentFees />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockStudentUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            expect(screen.getByText(/fee records/i)).toBeInTheDocument()
        })
    })

    describe('Error Handling', () => {
        it('should display error message when student record not found', () => {
            render(<StudentFees />, {
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

    describe('Year Filter', () => {
        it('should filter fees by selected academic year', () => {
            render(<StudentFees />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockStudentUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            const yearSelect = screen.getByLabelText(/select academic year/i)
            fireEvent.change(yearSelect, { target: { value: '2023-24' } })
            
            expect(yearSelect).toHaveValue('2023-24')
        })
    })
})




