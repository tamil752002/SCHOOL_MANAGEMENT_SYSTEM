import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '../../test/test-utils'
import { StudentDashboard } from './StudentDashboard'
import { mockStudent, mockStudentUser } from '../../test/test-utils'

describe('StudentDashboard Component', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Rendering', () => {
        it('should render welcome message with student name', () => {
            render(<StudentDashboard />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockStudentUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            expect(screen.getByText(new RegExp(`Welcome, ${mockStudent.studentName}`, 'i'))).toBeInTheDocument()
        })

        it('should display student class and section', () => {
            render(<StudentDashboard />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockStudentUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            expect(screen.getByText(new RegExp(`Class ${mockStudent.studentClass}-${mockStudent.section}`, 'i'))).toBeInTheDocument()
        })

        it('should display admission number', () => {
            render(<StudentDashboard />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockStudentUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            expect(screen.getByText(new RegExp(`Admission No: ${mockStudent.admissionNumber}`, 'i'))).toBeInTheDocument()
        })
    })

    describe('Statistics Cards', () => {
        it('should display attendance statistics', () => {
            render(<StudentDashboard />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockStudentUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            expect(screen.getByText(/this month attendance/i)).toBeInTheDocument()
        })

        it('should display fees paid statistics', () => {
            render(<StudentDashboard />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockStudentUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            expect(screen.getByText(/fees paid/i)).toBeInTheDocument()
        })

        it('should display pending fees statistics', () => {
            render(<StudentDashboard />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockStudentUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            expect(screen.getByText(/pending fees/i)).toBeInTheDocument()
        })

        it('should display activities statistics', () => {
            render(<StudentDashboard />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockStudentUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            expect(screen.getByText(/activities/i)).toBeInTheDocument()
        })
    })

    describe('Error Handling', () => {
        it('should display error message when student record not found', () => {
            render(<StudentDashboard />, {
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

    describe('Recent Activities', () => {
        it('should display recent activities section', () => {
            render(<StudentDashboard />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockStudentUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            expect(screen.getByText(/recent activities/i)).toBeInTheDocument()
        })
    })

    describe('Quick Links', () => {
        it('should display quick action links', () => {
            render(<StudentDashboard />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockStudentUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            expect(screen.getByText(/view profile/i)).toBeInTheDocument()
            expect(screen.getByText(/view attendance/i)).toBeInTheDocument()
            expect(screen.getByText(/view fees/i)).toBeInTheDocument()
        })
    })
})




