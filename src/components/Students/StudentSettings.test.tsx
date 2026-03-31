import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '../../test/test-utils'
import { StudentSettings } from './StudentSettings'
import { mockStudentUser } from '../../test/test-utils'

describe('StudentSettings Component', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Rendering', () => {
        it('should render settings page', () => {
            render(<StudentSettings />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockStudentUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            expect(screen.getByText(/settings/i)).toBeInTheDocument()
        })

        it('should render all tabs', () => {
            render(<StudentSettings />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockStudentUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            expect(screen.getByText(/personal information/i)).toBeInTheDocument()
            expect(screen.getByText(/security/i)).toBeInTheDocument()
            expect(screen.getByText(/academic/i)).toBeInTheDocument()
        })
    })

    describe('Tab Navigation', () => {
        it('should switch to personal information tab', async () => {
            render(<StudentSettings />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockStudentUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            const personalTab = screen.getByText(/personal information/i)
            fireEvent.click(personalTab)
            
            await waitFor(() => {
                expect(screen.getByText(/full name/i)).toBeInTheDocument()
            })
        })

        it('should switch to security tab', async () => {
            render(<StudentSettings />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockStudentUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            const securityTab = screen.getByText(/security/i)
            fireEvent.click(securityTab)
            
            await waitFor(() => {
                expect(screen.getByText(/change password/i)).toBeInTheDocument()
            })
        })

        it('should switch to academic tab', async () => {
            render(<StudentSettings />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockStudentUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            const academicTab = screen.getByText(/academic/i)
            fireEvent.click(academicTab)
            
            await waitFor(() => {
                expect(screen.getByText(/academic information/i)).toBeInTheDocument()
            })
        })
    })

    describe('Personal Information', () => {
        it('should display personal information fields', () => {
            render(<StudentSettings />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockStudentUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            expect(screen.getByText(/full name/i)).toBeInTheDocument()
            expect(screen.getByText(/admission number/i)).toBeInTheDocument()
        })
    })

    describe('Password Change', () => {
        it('should render change password form in security tab', async () => {
            render(<StudentSettings />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockStudentUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            const securityTab = screen.getByText(/security/i)
            fireEvent.click(securityTab)
            
            await waitFor(() => {
                expect(screen.getByText(/change password/i)).toBeInTheDocument()
            })
        })
    })
})




