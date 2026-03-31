import { describe, expect, it } from 'vitest'
import { sortClasses, sortClassNamesArray } from './sortClasses'
import { ClassInfo } from '../types'

describe('sortClasses', () => {
    describe('Non-numeric classes', () => {
        it('should sort non-numeric classes in predefined order', () => {
            const classes: ClassInfo[] = [
                { name: 'UKG', sections: ['A'], medium: ['English'] },
                { name: 'Nursery', sections: ['A'], medium: ['English'] },
                { name: 'LKG', sections: ['A'], medium: ['English'] }
            ]

            const sorted = sortClasses(classes)
            expect(sorted[0].name).toBe('Nursery')
            expect(sorted[1].name).toBe('LKG')
            expect(sorted[2].name).toBe('UKG')
        })

        it('should place predefined non-numeric classes before numeric classes', () => {
            const classes: ClassInfo[] = [
                { name: '10', sections: ['A'], medium: ['English'] },
                { name: 'Nursery', sections: ['A'], medium: ['English'] },
                { name: '1', sections: ['A'], medium: ['English'] }
            ]

            const sorted = sortClasses(classes)
            expect(sorted[0].name).toBe('Nursery')
            expect(sorted[1].name).toBe('1')
            expect(sorted[2].name).toBe('10')
        })
    })

    describe('Numeric classes', () => {
        it('should sort numeric classes in numerical order', () => {
            const classes: ClassInfo[] = [
                { name: '10', sections: ['A'], medium: ['English'] },
                { name: '1', sections: ['A'], medium: ['English'] },
                { name: '5', sections: ['A'], medium: ['English'] },
                { name: '2', sections: ['A'], medium: ['English'] }
            ]

            const sorted = sortClasses(classes)
            expect(sorted[0].name).toBe('1')
            expect(sorted[1].name).toBe('2')
            expect(sorted[2].name).toBe('5')
            expect(sorted[3].name).toBe('10')
        })

        it('should handle two-digit numeric classes correctly', () => {
            const classes: ClassInfo[] = [
                { name: '12', sections: ['A'], medium: ['English'] },
                { name: '10', sections: ['A'], medium: ['English'] },
                { name: '11', sections: ['A'], medium: ['English'] }
            ]

            const sorted = sortClasses(classes)
            expect(sorted[0].name).toBe('10')
            expect(sorted[1].name).toBe('11')
            expect(sorted[2].name).toBe('12')
        })
    })

    describe('Mixed classes', () => {
        it('should sort mixed numeric and non-numeric classes correctly', () => {
            const classes: ClassInfo[] = [
                { name: '10', sections: ['A'], medium: ['English'] },
                { name: 'LKG', sections: ['A'], medium: ['English'] },
                { name: '1', sections: ['A'], medium: ['English'] },
                { name: 'Nursery', sections: ['A'], medium: ['English'] },
                { name: '5', sections: ['A'], medium: ['English'] },
                { name: 'UKG', sections: ['A'], medium: ['English'] }
            ]

            const sorted = sortClasses(classes)
            expect(sorted[0].name).toBe('Nursery')
            expect(sorted[1].name).toBe('LKG')
            expect(sorted[2].name).toBe('UKG')
            expect(sorted[3].name).toBe('1')
            expect(sorted[4].name).toBe('5')
            expect(sorted[5].name).toBe('10')
        })
    })

    describe('Unknown non-numeric classes', () => {
        it('should sort unknown non-numeric classes alphabetically', () => {
            const classes: ClassInfo[] = [
                { name: 'Zebra', sections: ['A'], medium: ['English'] },
                { name: 'Alpha', sections: ['A'], medium: ['English'] },
                { name: 'Beta', sections: ['A'], medium: ['English'] }
            ]

            const sorted = sortClasses(classes)
            expect(sorted[0].name).toBe('Alpha')
            expect(sorted[1].name).toBe('Beta')
            expect(sorted[2].name).toBe('Zebra')
        })

        it('should place unknown non-numeric classes after predefined ones but before numeric', () => {
            const classes: ClassInfo[] = [
                { name: '10', sections: ['A'], medium: ['English'] },
                { name: 'Custom', sections: ['A'], medium: ['English'] },
                { name: 'Nursery', sections: ['A'], medium: ['English'] }
            ]

            const sorted = sortClasses(classes)
            expect(sorted[0].name).toBe('Nursery')
            expect(sorted[1].name).toBe('Custom')
            expect(sorted[2].name).toBe('10')
        })
    })
})

describe('sortClassNamesArray', () => {
    it('should sort class name strings correctly', () => {
        const classNames = ['10', 'LKG', '1', 'Nursery', '5', 'UKG']
        const sorted = sortClassNamesArray(classNames)
        
        expect(sorted[0]).toBe('Nursery')
        expect(sorted[1]).toBe('LKG')
        expect(sorted[2]).toBe('UKG')
        expect(sorted[3]).toBe('1')
        expect(sorted[4]).toBe('5')
        expect(sorted[5]).toBe('10')
    })

    it('should not mutate the original array', () => {
        const classNames = ['10', '1', '5']
        const original = [...classNames]
        sortClassNamesArray(classNames)
        
        expect(classNames).toEqual(original)
    })
})




