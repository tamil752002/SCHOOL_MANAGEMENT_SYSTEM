import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '../../test/test-utils'
import { Sidebar } from './Sidebar'
import { mockAdminUser, mockStudentUser } from '../../test/test-utils'

describe('Sidebar Component', () => {
    const mockOnViewChange = vi.fn()
    const mockOnClose = vi.fn()
    const mockOnToggleCollapse = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Admin Sidebar', () => {
        it('should render admin menu items', () => {
            render(<Sidebar 
                currentView="dashboard"
                onViewChange={mockOnViewChange}
                isOpen={true}
                onClose={mockOnClose}
                isCollapsed={false}
                onToggleCollapse={mockOnToggleCollapse}
            />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockAdminUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            expect(screen.getByText(/dashboard/i)).toBeInTheDocument()
            expect(screen.getByText(/students/i)).toBeInTheDocument()
            expect(screen.getByText(/attendance/i)).toBeInTheDocument()
            expect(screen.getByText(/fee management/i)).toBeInTheDocument()
        })

        it('should call onViewChange when menu item is clicked', () => {
            render(<Sidebar 
                currentView="dashboard"
                onViewChange={mockOnViewChange}
                isOpen={true}
                onClose={mockOnClose}
                isCollapsed={false}
                onToggleCollapse={mockOnToggleCollapse}
            />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockAdminUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            const studentsMenu = screen.getByText(/students/i)
            fireEvent.click(studentsMenu)
            
            expect(mockOnViewChange).toHaveBeenCalledWith('students')
        })
    })

    describe('Student Sidebar', () => {
        it('should render student menu items', () => {
            render(<Sidebar 
                currentView="profile"
                onViewChange={mockOnViewChange}
                isOpen={true}
                onClose={mockOnClose}
                isCollapsed={false}
                onToggleCollapse={mockOnToggleCollapse}
            />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockStudentUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            expect(screen.getByText(/my attendance/i)).toBeInTheDocument()
            expect(screen.getByText(/fee status/i)).toBeInTheDocument()
        })
    })

    describe('Collapse Toggle', () => {
        it('should render collapse toggle button', () => {
            render(<Sidebar 
                currentView="dashboard"
                onViewChange={mockOnViewChange}
                isOpen={true}
                onClose={mockOnClose}
                isCollapsed={false}
                onToggleCollapse={mockOnToggleCollapse}
            />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockAdminUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            const collapseButton = screen.getByTitle(/collapse/i)
            expect(collapseButton).toBeInTheDocument()
        })

        it('should call onToggleCollapse when collapse button is clicked', () => {
            render(<Sidebar 
                currentView="dashboard"
                onViewChange={mockOnViewChange}
                isOpen={true}
                onClose={mockOnClose}
                isCollapsed={false}
                onToggleCollapse={mockOnToggleCollapse}
            />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockAdminUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            const collapseButton = screen.getByTitle(/collapse/i)
            fireEvent.click(collapseButton)
            
            expect(mockOnToggleCollapse).toHaveBeenCalledTimes(1)
        })
    })

    describe('Active View Highlighting', () => {
        it('should highlight active menu item', () => {
            render(<Sidebar 
                currentView="students"
                onViewChange={mockOnViewChange}
                isOpen={true}
                onClose={mockOnClose}
                isCollapsed={false}
                onToggleCollapse={mockOnToggleCollapse}
            />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockAdminUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            const studentsMenu = screen.getByText(/students/i)
            expect(studentsMenu.closest('button')).toHaveClass('bg-blue-600')
        })
    })
})




