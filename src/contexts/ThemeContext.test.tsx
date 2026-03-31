import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { ThemeProvider, useTheme } from './ThemeContext'

describe('ThemeContext', () => {
    beforeEach(() => {
        // Reset document classes
        document.documentElement.classList.remove('dark')
        
        // Mock matchMedia
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation(query => ({
                matches: query === '(prefers-color-scheme: dark)',
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        })
    })

    describe('ThemeProvider', () => {
        it('should provide theme context', () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider
            })

            expect(result.current).toBeDefined()
            expect(result.current.isDarkMode).toBeDefined()
            expect(result.current.toggleTheme).toBeDefined()
        })

        it('should initialize with dark mode if system prefers dark', () => {
            Object.defineProperty(window, 'matchMedia', {
                writable: true,
                value: vi.fn().mockImplementation(() => ({
                    matches: true,
                    media: '(prefers-color-scheme: dark)',
                    onchange: null,
                    addListener: vi.fn(),
                    removeListener: vi.fn(),
                    addEventListener: vi.fn(),
                    removeEventListener: vi.fn(),
                    dispatchEvent: vi.fn(),
                })),
            })

            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider
            })

            expect(result.current.isDarkMode).toBe(true)
        })

        it('should initialize with light mode if system prefers light', () => {
            Object.defineProperty(window, 'matchMedia', {
                writable: true,
                value: vi.fn().mockImplementation(() => ({
                    matches: false,
                    media: '(prefers-color-scheme: dark)',
                    onchange: null,
                    addListener: vi.fn(),
                    removeListener: vi.fn(),
                    addEventListener: vi.fn(),
                    removeEventListener: vi.fn(),
                    dispatchEvent: vi.fn(),
                })),
            })

            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider
            })

            expect(result.current.isDarkMode).toBe(false)
        })

        it('should add dark class to document when dark mode is enabled', () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider
            })

            act(() => {
                if (!result.current.isDarkMode) {
                    result.current.toggleTheme()
                }
            })

            expect(document.documentElement.classList.contains('dark')).toBe(true)
        })

        it('should remove dark class from document when light mode is enabled', () => {
            // Start with dark mode
            document.documentElement.classList.add('dark')

            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider
            })

            act(() => {
                if (result.current.isDarkMode) {
                    result.current.toggleTheme()
                }
            })

            expect(document.documentElement.classList.contains('dark')).toBe(false)
        })
    })

    describe('toggleTheme', () => {
        it('should toggle from light to dark mode', () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider
            })

            const initialMode = result.current.isDarkMode

            act(() => {
                result.current.toggleTheme()
            })

            expect(result.current.isDarkMode).toBe(!initialMode)
        })

        it('should toggle from dark to light mode', () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider
            })

            // Set to dark mode first
            act(() => {
                if (!result.current.isDarkMode) {
                    result.current.toggleTheme()
                }
            })

            const darkMode = result.current.isDarkMode
            expect(darkMode).toBe(true)

            // Toggle to light
            act(() => {
                result.current.toggleTheme()
            })

            expect(result.current.isDarkMode).toBe(false)
        })

        it('should update document class when toggling', () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider
            })

            const initialHasDark = document.documentElement.classList.contains('dark')

            act(() => {
                result.current.toggleTheme()
            })

            const afterToggleHasDark = document.documentElement.classList.contains('dark')
            expect(afterToggleHasDark).toBe(!initialHasDark)
        })
    })

    describe('useTheme hook', () => {
        it('should work when used within ThemeProvider', () => {
            const { result } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider
            })

            expect(result.current).toBeDefined()
            expect(result.current.isDarkMode).toBeDefined()
            expect(result.current.toggleTheme).toBeDefined()
        })

        it('should return same theme state across multiple calls', () => {
            const { result: result1 } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider
            })

            const { result: result2 } = renderHook(() => useTheme(), {
                wrapper: ThemeProvider
            })

            // Both should have the same initial state (based on system preference)
            expect(result1.current.isDarkMode).toBe(result2.current.isDarkMode)
        })
    })
})

