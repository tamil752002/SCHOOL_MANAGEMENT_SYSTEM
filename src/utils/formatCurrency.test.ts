import { describe, expect, it } from 'vitest'
import { formatCurrency } from './formatCurrency'

describe('formatCurrency', () => {
    describe('Amounts less than 1000', () => {
        it('should format amounts less than 1000 with rupee symbol', () => {
            expect(formatCurrency(0)).toBe('₹0')
            expect(formatCurrency(100)).toBe('₹100')
            expect(formatCurrency(500)).toBe('₹500')
            expect(formatCurrency(999)).toBe('₹999')
        })

        it('should format amounts with proper locale formatting', () => {
            // Note: toLocaleString may format differently based on locale
            // Just check it contains the number
            const result = formatCurrency(1234)
            expect(result).toContain('1234')
            expect(result).toContain('₹')
        })
    })

    describe('Amounts in thousands (1000 to 99999)', () => {
        it('should format exact thousands without decimal', () => {
            expect(formatCurrency(1000)).toBe('₹1K')
            expect(formatCurrency(5000)).toBe('₹5K')
            expect(formatCurrency(10000)).toBe('₹10K')
        })

        it('should format thousands with one decimal place when needed', () => {
            expect(formatCurrency(1500)).toBe('₹1.5K')
            expect(formatCurrency(2500)).toBe('₹2.5K')
            expect(formatCurrency(12345)).toBe('₹12.3K')
            expect(formatCurrency(99900)).toBe('₹99.9K')
        })

        it('should handle amounts just below 100000', () => {
            // 99999 / 1000 = 99.999, which rounds to 100.0K
            expect(formatCurrency(99999)).toBe('₹100.0K')
        })
    })

    describe('Amounts in lakhs (100000 and above)', () => {
        it('should format exact lakhs without decimal', () => {
            expect(formatCurrency(100000)).toBe('₹1L')
            expect(formatCurrency(500000)).toBe('₹5L')
            expect(formatCurrency(1000000)).toBe('₹10L')
        })

        it('should format lakhs with one decimal place when needed', () => {
            expect(formatCurrency(150000)).toBe('₹1.5L')
            expect(formatCurrency(250000)).toBe('₹2.5L')
            expect(formatCurrency(1234567)).toBe('₹12.3L')
        })

        it('should handle very large amounts', () => {
            expect(formatCurrency(10000000)).toBe('₹100L')
            expect(formatCurrency(50000000)).toBe('₹500L')
        })
    })

    describe('Edge cases', () => {
        it('should handle zero', () => {
            expect(formatCurrency(0)).toBe('₹0')
        })

        it('should handle negative numbers', () => {
            // Note: This behavior depends on implementation
            // If negative numbers are not expected, this test can be adjusted
            expect(formatCurrency(-100)).toBe('₹-100')
        })

        it('should handle very small amounts', () => {
            expect(formatCurrency(1)).toBe('₹1')
            expect(formatCurrency(10)).toBe('₹10')
        })
    })
})

