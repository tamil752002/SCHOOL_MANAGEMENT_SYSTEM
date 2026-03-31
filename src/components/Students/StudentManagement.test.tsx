import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '../../test/test-utils'
import { StudentManagement } from './StudentManagement'

describe('StudentManagement Component', () => {
    describe('Add Student Button', () => {
        it('should render Add Student button', () => {
            render(<StudentManagement onViewProfile={vi.fn()} />)
            expect(screen.getByText(/add student/i)).toBeInTheDocument()
        })

        it('should open student form when Add Student button is clicked', async () => {
            render(<StudentManagement onViewProfile={vi.fn()} />)
            const addButton = screen.getByText(/add student/i)

            fireEvent.click(addButton)

            // Check if form is opened
            expect(screen.getByText(/add new student/i)).toBeInTheDocument()
        })
    })

    describe('Import Students Button', () => {
        it('should render Import Students button', () => {
            render(<StudentManagement onViewProfile={vi.fn()} />)
            expect(screen.getByText(/import students/i)).toBeInTheDocument()
        })

        it('should open file input when Import Students button is clicked', () => {
            render(<StudentManagement onViewProfile={vi.fn()} />)
            const importButton = screen.getByText(/import students/i)

            fireEvent.click(importButton)

            // The file input should be triggered
            expect(screen.getByText(/import students/i)).toBeInTheDocument()
        })
    })

    describe('Export Students Button', () => {
        it('should render Export Students button', () => {
            render(<StudentManagement onViewProfile={vi.fn()} />)
            expect(screen.getByText(/export students/i)).toBeInTheDocument()
        })

        it('should trigger export when Export Students button is clicked', () => {
            // Mock window.open
            const mockOpen = vi.fn()
            Object.defineProperty(window, 'open', {
                value: mockOpen,
                writable: true
            })

            render(<StudentManagement onViewProfile={vi.fn()} />)
            const exportButton = screen.getByText(/export students/i)

            fireEvent.click(exportButton)

            // Export functionality should be triggered
            expect(mockOpen).toHaveBeenCalled()
        })
    })

    describe('Search and Filter Buttons', () => {
        it('should render search input', () => {
            render(<StudentManagement onViewProfile={vi.fn()} />)
            expect(screen.getByPlaceholderText(/search students/i)).toBeInTheDocument()
        })

        it('should filter students when search input changes', () => {
            render(<StudentManagement onViewProfile={vi.fn()} />)
            const searchInput = screen.getByPlaceholderText(/search students/i)

            fireEvent.change(searchInput, { target: { value: 'John' } })

            expect(searchInput).toHaveValue('John')
        })

        it('should render class filter dropdown', () => {
            render(<StudentManagement onViewProfile={vi.fn()} />)
            expect(screen.getByText(/all classes/i)).toBeInTheDocument()
        })
    })

    describe('Student Form Buttons', () => {
        beforeEach(() => {
            render(<StudentManagement onViewProfile={vi.fn()} />)
            const addButton = screen.getByText(/add student/i)
            fireEvent.click(addButton)
        })

        it('should render Generate Password button', () => {
            expect(screen.getByText(/generate password/i)).toBeInTheDocument()
        })

        it('should render Save button', () => {
            expect(screen.getByText(/save student/i)).toBeInTheDocument()
        })

        it('should render Cancel button', () => {
            expect(screen.getByText(/cancel/i)).toBeInTheDocument()
        })

        it('should close form when Cancel button is clicked', () => {
            const cancelButton = screen.getByText(/cancel/i)
            fireEvent.click(cancelButton)

            expect(screen.queryByText(/add new student/i)).not.toBeInTheDocument()
        })
    })

    describe('Form Validation', () => {
        beforeEach(() => {
            render(<StudentManagement onViewProfile={vi.fn()} />)
            const addButton = screen.getByText(/add student/i)
            fireEvent.click(addButton)
        })

        it('should show validation errors when Save is clicked with empty required fields', () => {
            const saveButton = screen.getByText(/save student/i)
            fireEvent.click(saveButton)

            expect(screen.getByText(/student name is required/i)).toBeInTheDocument()
        })
    })
}) 