import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '../../test/test-utils'
import { LoginForm } from './LoginForm'

describe('LoginForm Component', () => {
    const mockLogin = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Rendering', () => {
        it('should render login form', () => {
            render(<LoginForm />, {
                authValue: {
                    isAuthenticated: false,
                    user: null,
                    login: mockLogin,
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            expect(screen.getByText(/schoolhub/i)).toBeInTheDocument()
            expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
            expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
        })

        it('should render login button', () => {
            render(<LoginForm />, {
                authValue: {
                    isAuthenticated: false,
                    user: null,
                    login: mockLogin,
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            expect(screen.getByText(/sign in/i)).toBeInTheDocument()
        })
    })

    describe('Form Input', () => {
        it('should update username when typed', () => {
            render(<LoginForm />, {
                authValue: {
                    isAuthenticated: false,
                    user: null,
                    login: mockLogin,
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            const usernameInput = screen.getByLabelText(/username/i)
            fireEvent.change(usernameInput, { target: { value: 'admin' } })
            
            expect(usernameInput).toHaveValue('admin')
        })

        it('should update password when typed', () => {
            render(<LoginForm />, {
                authValue: {
                    isAuthenticated: false,
                    user: null,
                    login: mockLogin,
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            const passwordInput = screen.getByLabelText(/password/i)
            fireEvent.change(passwordInput, { target: { value: 'password123' } })
            
            expect(passwordInput).toHaveValue('password123')
        })
    })

    describe('Form Submission', () => {
        it('should call login function when form is submitted', async () => {
            mockLogin.mockResolvedValue(true)
            
            render(<LoginForm />, {
                authValue: {
                    isAuthenticated: false,
                    user: null,
                    login: mockLogin,
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            const usernameInput = screen.getByLabelText(/username/i)
            const passwordInput = screen.getByLabelText(/password/i)
            const submitButton = screen.getByText(/sign in/i)
            
            fireEvent.change(usernameInput, { target: { value: 'admin' } })
            fireEvent.change(passwordInput, { target: { value: 'password123' } })
            fireEvent.click(submitButton)
            
            await waitFor(() => {
                expect(mockLogin).toHaveBeenCalledWith('admin', 'password123', expect.any(Array))
            })
        })

        it('should display error message on login failure', async () => {
            mockLogin.mockResolvedValue(false)
            
            render(<LoginForm />, {
                authValue: {
                    isAuthenticated: false,
                    user: null,
                    login: mockLogin,
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            const usernameInput = screen.getByLabelText(/username/i)
            const passwordInput = screen.getByLabelText(/password/i)
            const submitButton = screen.getByText(/sign in/i)
            
            fireEvent.change(usernameInput, { target: { value: 'admin' } })
            fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
            fireEvent.click(submitButton)
            
            await waitFor(() => {
                expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument()
            })
        })

        it('should show loading state during login', async () => {
            mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)))
            
            render(<LoginForm />, {
                authValue: {
                    isAuthenticated: false,
                    user: null,
                    login: mockLogin,
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            const usernameInput = screen.getByLabelText(/username/i)
            const passwordInput = screen.getByLabelText(/password/i)
            const submitButton = screen.getByText(/sign in/i)
            
            fireEvent.change(usernameInput, { target: { value: 'admin' } })
            fireEvent.change(passwordInput, { target: { value: 'password123' } })
            fireEvent.click(submitButton)
            
            await waitFor(() => {
                expect(screen.getByText(/signing in/i)).toBeInTheDocument()
            })
        })
    })

    describe('Form Validation', () => {
        it('should require username and password', () => {
            render(<LoginForm />, {
                authValue: {
                    isAuthenticated: false,
                    user: null,
                    login: mockLogin,
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            const usernameInput = screen.getByLabelText(/username/i)
            const passwordInput = screen.getByLabelText(/password/i)
            
            expect(usernameInput).toBeRequired()
            expect(passwordInput).toBeRequired()
        })
    })

    describe('Theme Toggle', () => {
        it('should render theme toggle button', () => {
            render(<LoginForm />, {
                authValue: {
                    isAuthenticated: false,
                    user: null,
                    login: mockLogin,
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            expect(screen.getByTitle(/toggle theme/i)).toBeInTheDocument()
        })
    })
})




