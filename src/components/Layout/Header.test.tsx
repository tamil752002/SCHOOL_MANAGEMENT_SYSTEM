import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '../../test/test-utils'
import { Header } from './Header'
import { mockAdminUser } from '../../test/test-utils'

describe('Header Component', () => {
    const mockOnToggleTheme = vi.fn()
    const mockOnNotificationClick = vi.fn()
    const mockOnSettingsClick = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Rendering', () => {
        it('should render header with SchoolHub title', () => {
            render(<Header 
                isDarkMode={false}
                onToggleTheme={mockOnToggleTheme}
                onNotificationClick={mockOnNotificationClick}
                onSettingsClick={mockOnSettingsClick}
            />)
            
            expect(screen.getByText(/schoolhub/i)).toBeInTheDocument()
        })

        it('should render theme toggle button', () => {
            render(<Header 
                isDarkMode={false}
                onToggleTheme={mockOnToggleTheme}
                onNotificationClick={mockOnNotificationClick}
                onSettingsClick={mockOnSettingsClick}
            />)
            
            expect(screen.getByTitle(/switch to dark mode/i)).toBeInTheDocument()
        })

        it('should render notification button', () => {
            render(<Header 
                isDarkMode={false}
                onToggleTheme={mockOnToggleTheme}
                onNotificationClick={mockOnNotificationClick}
                onSettingsClick={mockOnSettingsClick}
            />)
            
            expect(screen.getByTitle(/notifications/i)).toBeInTheDocument()
        })
    })

    describe('Theme Toggle', () => {
        it('should show moon icon in light mode', () => {
            render(<Header 
                isDarkMode={false}
                onToggleTheme={mockOnToggleTheme}
                onNotificationClick={mockOnNotificationClick}
                onSettingsClick={mockOnSettingsClick}
            />)
            
            expect(screen.getByTitle(/switch to dark mode/i)).toBeInTheDocument()
        })

        it('should show sun icon in dark mode', () => {
            render(<Header 
                isDarkMode={true}
                onToggleTheme={mockOnToggleTheme}
                onNotificationClick={mockOnNotificationClick}
                onSettingsClick={mockOnSettingsClick}
            />)
            
            expect(screen.getByTitle(/switch to light mode/i)).toBeInTheDocument()
        })

        it('should call onToggleTheme when theme button is clicked', () => {
            render(<Header 
                isDarkMode={false}
                onToggleTheme={mockOnToggleTheme}
                onNotificationClick={mockOnNotificationClick}
                onSettingsClick={mockOnSettingsClick}
            />)
            
            const themeButton = screen.getByTitle(/switch to dark mode/i)
            fireEvent.click(themeButton)
            
            expect(mockOnToggleTheme).toHaveBeenCalledTimes(1)
        })
    })

    describe('Notifications', () => {
        it('should call onNotificationClick when notification button is clicked', () => {
            render(<Header 
                isDarkMode={false}
                onToggleTheme={mockOnToggleTheme}
                onNotificationClick={mockOnNotificationClick}
                onSettingsClick={mockOnSettingsClick}
            />)
            
            const notificationButton = screen.getByTitle(/notifications/i)
            fireEvent.click(notificationButton)
            
            expect(mockOnNotificationClick).toHaveBeenCalledTimes(1)
        })

        it('should display notification badge when there are unread notifications', () => {
            render(<Header 
                isDarkMode={false}
                onToggleTheme={mockOnToggleTheme}
                onNotificationClick={mockOnNotificationClick}
                onSettingsClick={mockOnSettingsClick}
                unreadNotificationCount={5}
            />)
            
            expect(screen.getByText('5')).toBeInTheDocument()
        })

        it('should display 9+ when notification count exceeds 9', () => {
            render(<Header 
                isDarkMode={false}
                onToggleTheme={mockOnToggleTheme}
                onNotificationClick={mockOnNotificationClick}
                onSettingsClick={mockOnSettingsClick}
                unreadNotificationCount={15}
            />)
            
            expect(screen.getByText('9+')).toBeInTheDocument()
        })
    })

    describe('User Profile', () => {
        it('should render user profile dropdown', () => {
            render(<Header 
                isDarkMode={false}
                onToggleTheme={mockOnToggleTheme}
                onNotificationClick={mockOnNotificationClick}
                onSettingsClick={mockOnSettingsClick}
            />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockAdminUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            expect(screen.getByText(mockAdminUser.name)).toBeInTheDocument()
        })

        it('should show logout option in profile dropdown', async () => {
            render(<Header 
                isDarkMode={false}
                onToggleTheme={mockOnToggleTheme}
                onNotificationClick={mockOnNotificationClick}
                onSettingsClick={mockOnSettingsClick}
            />, {
                authValue: {
                    isAuthenticated: true,
                    user: mockAdminUser,
                    login: vi.fn(),
                    logout: vi.fn(),
                    register: vi.fn()
                }
            })
            
            const profileButton = screen.getByText(mockAdminUser.name)
            fireEvent.click(profileButton)
            
            await waitFor(() => {
                expect(screen.getByText(/logout/i)).toBeInTheDocument()
            })
        })
    })
})




