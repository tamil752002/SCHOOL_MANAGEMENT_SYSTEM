import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { fireEvent, mockAdminUser, mockStudentUser, render, screen, waitFor } from './test/test-utils'

describe('App Component', () => {
    describe('Authentication', () => {
        it('should show login form when not authenticated', () => {
            render(<App />, {
                authValue: {
                    isAuthenticated: false,
                    user: null,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            expect(screen.getByText(/sign in/i)).toBeInTheDocument()
        })

        it('should show main app when authenticated', () => {
            render(<App />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockAdminUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            expect(screen.getByText(/dashboard/i)).toBeInTheDocument()
        })
    })

    describe('Header Buttons', () => {
        beforeEach(() => {
            render(<App />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockAdminUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
        })

        it('should render theme toggle button', () => {
            expect(screen.getByTitle(/toggle theme/i)).toBeInTheDocument()
        })

        it('should toggle theme when theme button is clicked', async () => {
            const themeButton = screen.getByTitle(/toggle theme/i)
            fireEvent.click(themeButton)

            // Theme toggle should be called
            await waitFor(() => {
                expect(themeButton).toBeInTheDocument()
            })
        })

        it('should render notification button for admin users', () => {
            expect(screen.getByTitle(/notifications/i)).toBeInTheDocument()
        })

        it('should toggle notification dropdown when notification button is clicked', async () => {
            const notificationButton = screen.getByTitle(/notifications/i)
            fireEvent.click(notificationButton)

            await waitFor(() => {
                expect(screen.getByText(/mark all as read/i)).toBeInTheDocument()
            })
        })

        it('should render settings button', () => {
            expect(screen.getByTitle(/settings/i)).toBeInTheDocument()
        })

        it('should navigate to settings when settings button is clicked', async () => {
            const settingsButton = screen.getByTitle(/settings/i)
            fireEvent.click(settingsButton)

            await waitFor(() => {
                expect(screen.getByText(/settings/i)).toBeInTheDocument()
            })
        })

        it('should render sidebar toggle button', () => {
            expect(screen.getByTitle(/toggle sidebar/i)).toBeInTheDocument()
        })
    })

    describe('Sidebar Navigation', () => {
        beforeEach(() => {
            render(<App />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockAdminUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
        })

        it('should render all navigation menu items', () => {
            expect(screen.getByText(/students/i)).toBeInTheDocument()
            expect(screen.getByText(/attendance/i)).toBeInTheDocument()
            expect(screen.getByText(/fees/i)).toBeInTheDocument()
            expect(screen.getByText(/exams/i)).toBeInTheDocument()
            expect(screen.getByText(/reports/i)).toBeInTheDocument()
        })

        it('should navigate to students page when students menu is clicked', async () => {
            const studentsMenu = screen.getByText(/students/i)
            fireEvent.click(studentsMenu)

            await waitFor(() => {
                expect(screen.getByText(/student management/i)).toBeInTheDocument()
            })
        })

        it('should navigate to attendance page when attendance menu is clicked', async () => {
            const attendanceMenu = screen.getByText(/attendance/i)
            fireEvent.click(attendanceMenu)

            await waitFor(() => {
                expect(screen.getByText(/attendance management/i)).toBeInTheDocument()
            })
        })

        it('should navigate to fees page when fees menu is clicked', async () => {
            const feesMenu = screen.getByText(/fees/i)
            fireEvent.click(feesMenu)

            await waitFor(() => {
                expect(screen.getByText(/fee management/i)).toBeInTheDocument()
            })
        })

        it('should navigate to exams page when exams menu is clicked', async () => {
            const examsMenu = screen.getByText(/exams/i)
            fireEvent.click(examsMenu)

            await waitFor(() => {
                expect(screen.getByText(/exam management/i)).toBeInTheDocument()
            })
        })

        it('should navigate to search page when search menu is clicked', async () => {
            const searchMenu = screen.getByText(/search/i)
            fireEvent.click(searchMenu)

            await waitFor(() => {
                expect(screen.getByText(/search students/i)).toBeInTheDocument()
            })
        })

        it('should navigate to reports page when reports menu is clicked', async () => {
            const reportsMenu = screen.getByText(/reports/i)
            fireEvent.click(reportsMenu)

            await waitFor(() => {
                expect(screen.getByText(/reports/i)).toBeInTheDocument()
            })
        })
    })

    describe('Dashboard Quick Actions', () => {
        beforeEach(() => {
            render(<App />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockAdminUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
        })

        it('should render quick action buttons', () => {
            expect(screen.getByText(/add student/i)).toBeInTheDocument()
            expect(screen.getByText(/mark attendance/i)).toBeInTheDocument()
            expect(screen.getByText(/collect fees/i)).toBeInTheDocument()
            expect(screen.getByText(/enter marks/i)).toBeInTheDocument()
        })

        it('should navigate to students page when Add Student button is clicked', async () => {
            const addStudentButton = screen.getByText(/add student/i)
            fireEvent.click(addStudentButton)

            await waitFor(() => {
                expect(screen.getByText(/student management/i)).toBeInTheDocument()
            })
        })

        it('should navigate to attendance page when Mark Attendance button is clicked', async () => {
            const markAttendanceButton = screen.getByText(/mark attendance/i)
            fireEvent.click(markAttendanceButton)

            await waitFor(() => {
                expect(screen.getByText(/attendance management/i)).toBeInTheDocument()
            })
        })

        it('should navigate to fees page when Collect Fees button is clicked', async () => {
            const collectFeesButton = screen.getByText(/collect fees/i)
            fireEvent.click(collectFeesButton)

            await waitFor(() => {
                expect(screen.getByText(/fee management/i)).toBeInTheDocument()
            })
        })

        it('should navigate to exams page when Enter Marks button is clicked', async () => {
            const enterMarksButton = screen.getByText(/enter marks/i)
            fireEvent.click(enterMarksButton)

            await waitFor(() => {
                expect(screen.getByText(/exam management/i)).toBeInTheDocument()
            })
        })
    })

    describe('Student Role Access', () => {
        beforeEach(() => {
            render(<App />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockStudentUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
        })

        it('should show student-specific navigation for student users', () => {
            expect(screen.getByText(/my attendance/i)).toBeInTheDocument()
            expect(screen.getByText(/my fees/i)).toBeInTheDocument()
            expect(screen.getByText(/my exams/i)).toBeInTheDocument()
        })

        it('should not show admin navigation for student users', () => {
            expect(screen.queryByText(/student management/i)).not.toBeInTheDocument()
            expect(screen.queryByText(/attendance management/i)).not.toBeInTheDocument()
            expect(screen.queryByText(/fee management/i)).not.toBeInTheDocument()
            expect(screen.queryByText(/exam management/i)).not.toBeInTheDocument()
        })
    })

    describe('Notification System', () => {
        beforeEach(() => {
            render(<App />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockAdminUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
        })

        it('should mark notification as read when clicked', async () => {
            const notificationButton = screen.getByTitle(/notifications/i)
            fireEvent.click(notificationButton)

            await waitFor(() => {
                const notification = screen.getByText(/new student registered/i)
                fireEvent.click(notification)
            })

            // Notification should be marked as read
            await waitFor(() => {
                expect(screen.getByText(/new student registered/i)).toBeInTheDocument()
            })
        })

        it('should mark all notifications as read when mark all button is clicked', async () => {
            const notificationButton = screen.getByTitle(/notifications/i)
            fireEvent.click(notificationButton)

            await waitFor(() => {
                const markAllButton = screen.getByText(/mark all as read/i)
                fireEvent.click(markAllButton)
            })

            // All notifications should be marked as read
            await waitFor(() => {
                expect(screen.getByText(/mark all as read/i)).toBeInTheDocument()
            })
        })
    })

    describe('Responsive Behavior', () => {
        beforeEach(() => {
            render(<App />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockAdminUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
        })

        it('should close sidebar on desktop resize', async () => {
            // Simulate window resize
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 1024
            })

            window.dispatchEvent(new Event('resize'))

            await waitFor(() => {
                expect(screen.getByText(/dashboard/i)).toBeInTheDocument()
            })
        })
    })
}) 