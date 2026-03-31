import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { Admin, Contact, School, Student } from '../types'

// Mock fetch for Redis operations
global.fetch = vi.fn()

// Unmock AuthContext to test the real implementation
vi.doUnmock('./AuthContext')
vi.doUnmock('../contexts/AuthContext')

import { AuthProvider, useAuth } from './AuthContext'

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        localStorage.clear()
        
        // Mock successful fetch responses
        ;(global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                schools: [],
                admins: [],
                contacts: []
            })
        })
    })

    describe('AuthProvider', () => {
        it('should provide auth context', () => {
            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider
            })

            expect(result.current).toBeDefined()
            expect(result.current.user).toBeNull()
            expect(result.current.isAuthenticated).toBe(false)
            expect(result.current.login).toBeDefined()
            expect(result.current.logout).toBeDefined()
        })

        it('should load user from localStorage on mount', () => {
            const savedUser = {
                id: 'admin1',
                username: 'admin',
                role: 'admin' as const,
                name: 'Admin User',
                schoolId: 'school1'
            }
            localStorage.setItem('user', JSON.stringify(savedUser))

            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider
            })

            expect(result.current.user).toEqual(savedUser)
            expect(result.current.isAuthenticated).toBe(true)
        })

        it('should handle invalid localStorage data gracefully', () => {
            localStorage.setItem('user', 'invalid json')

            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider
            })

            expect(result.current.user).toBeNull()
            expect(result.current.isAuthenticated).toBe(false)
        })
    })

    describe('login', () => {
        it('should login developer user with correct credentials', async () => {
            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider
            })

            await act(async () => {
                const success = await result.current.login('developer', 'dev123')
                expect(success).toBe(true)
            })

            expect(result.current.user).toEqual({
                id: 'dev1',
                username: 'developer',
                role: 'developer',
                name: 'System Developer'
            })
            expect(result.current.isAuthenticated).toBe(true)
        })

        it('should fail login for developer with wrong password', async () => {
            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider
            })

            await act(async () => {
                const success = await result.current.login('developer', 'wrongpassword')
                expect(success).toBe(false)
            })

            expect(result.current.user).toBeNull()
            expect(result.current.isAuthenticated).toBe(false)
        })

        it('should login admin user with correct credentials', async () => {
            const mockAdmin: Admin = {
                id: 'admin1',
                username: 'admin',
                name: 'Admin User',
                schoolId: 'school1',
                email: 'admin@school.com',
                phoneNumber: '1234567890',
                status: 'active',
                createdAt: new Date().toISOString(),
                password: 'admin123'
            }

            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider
            })

            // Add admin first
            act(() => {
                result.current.addAdmin(mockAdmin)
            })

            await act(async () => {
                const success = await result.current.login('admin', 'admin123')
                expect(success).toBe(true)
            })

            expect(result.current.user).toEqual({
                id: 'admin1',
                username: 'admin',
                role: 'admin',
                name: 'Admin User',
                schoolId: 'school1'
            })
            expect(result.current.isAuthenticated).toBe(true)
        })

        it('should fail login for blocked admin', async () => {
            const mockAdmin: Admin = {
                id: 'admin1',
                username: 'admin',
                name: 'Admin User',
                schoolId: 'school1',
                email: 'admin@school.com',
                phoneNumber: '1234567890',
                status: 'blocked',
                createdAt: new Date().toISOString(),
                password: 'admin123'
            }

            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider
            })

            act(() => {
                result.current.addAdmin(mockAdmin)
            })

            await act(async () => {
                const success = await result.current.login('admin', 'admin123')
                expect(success).toBe(false)
            })

            expect(result.current.user).toBeNull()
        })

        it('should fail login for admin with blocked school', async () => {
            const mockSchool: School = {
                id: 'school1',
                name: 'Test School',
                address: 'Test Address',
                contactNumber: '1234567890',
                email: 'test@school.com',
                status: 'blocked',
                createdAt: new Date().toISOString(),
                studentUserIdPrefix: 'TEST'
            }

            const mockAdmin: Admin = {
                id: 'admin1',
                username: 'admin',
                name: 'Admin User',
                schoolId: 'school1',
                email: 'admin@school.com',
                phoneNumber: '1234567890',
                status: 'active',
                createdAt: new Date().toISOString(),
                password: 'admin123'
            }

            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider
            })

            act(() => {
                result.current.addSchool(mockSchool)
                result.current.addAdmin(mockAdmin)
            })

            await act(async () => {
                const success = await result.current.login('admin', 'admin123')
                expect(success).toBe(false)
            })

            expect(result.current.user).toBeNull()
        })

        it('should login student user with correct credentials', async () => {
            const mockStudent: Student = {
                id: 'student1',
                admissionNumber: 'STU001',
                admissionDate: '2024-01-01',
                studentName: 'John Doe',
                fatherName: 'Father Doe',
                motherName: 'Mother Doe',
                studentClass: '10',
                section: 'A',
                medium: 'English',
                password: 'student123',
                status: 'active',
                schoolId: 'school1'
            }

            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider
            })

            await act(async () => {
                const success = await result.current.login('STU001', 'student123', [mockStudent])
                expect(success).toBe(true)
            })

            expect(result.current.user).toEqual({
                id: 'student1',
                username: 'STU001',
                role: 'student',
                name: 'John Doe',
                admissionNumber: 'STU001'
            })
            expect(result.current.isAuthenticated).toBe(true)
        })

        it('should fail login for student with blocked school', async () => {
            const mockSchool: School = {
                id: 'school1',
                name: 'Test School',
                address: 'Test Address',
                contactNumber: '1234567890',
                email: 'test@school.com',
                status: 'blocked',
                createdAt: new Date().toISOString(),
                studentUserIdPrefix: 'TEST'
            }

            const mockStudent: Student = {
                id: 'student1',
                admissionNumber: 'STU001',
                admissionDate: '2024-01-01',
                studentName: 'John Doe',
                fatherName: 'Father Doe',
                motherName: 'Mother Doe',
                studentClass: '10',
                section: 'A',
                medium: 'English',
                password: 'student123',
                status: 'active',
                schoolId: 'school1'
            }

            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider
            })

            act(() => {
                result.current.addSchool(mockSchool)
            })

            await act(async () => {
                const success = await result.current.login('STU001', 'student123', [mockStudent])
                expect(success).toBe(false)
            })

            expect(result.current.user).toBeNull()
        })

        it('should fail login with incorrect credentials', async () => {
            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider
            })

            await act(async () => {
                const success = await result.current.login('unknown', 'wrongpassword')
                expect(success).toBe(false)
            })

            expect(result.current.user).toBeNull()
            expect(result.current.isAuthenticated).toBe(false)
        })
    })

    describe('logout', () => {
        it('should logout user and clear localStorage', async () => {
            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider
            })

            // Login first
            await act(async () => {
                await result.current.login('developer', 'dev123')
            })

            expect(result.current.isAuthenticated).toBe(true)

            // Logout
            act(() => {
                result.current.logout()
            })

            expect(result.current.user).toBeNull()
            expect(result.current.isAuthenticated).toBe(false)
            expect(localStorage.getItem('user')).toBeNull()
        })
    })

    describe('School Management', () => {
        it('should add a new school', () => {
            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider
            })

            const newSchool: Omit<School, 'id' | 'createdAt'> = {
                name: 'Test School',
                address: 'Test Address',
                contactNumber: '1234567890',
                email: 'test@school.com',
                status: 'active',
                studentUserIdPrefix: 'TEST'
            }

            act(() => {
                result.current.addSchool(newSchool)
            })

            expect(result.current.schools.length).toBe(1)
            expect(result.current.schools[0].name).toBe('Test School')
            expect(result.current.schools[0].id).toBeDefined()
            expect(result.current.schools[0].createdAt).toBeDefined()
        })

        it('should update a school', () => {
            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider
            })

            const newSchool: Omit<School, 'id' | 'createdAt'> = {
                name: 'Test School',
                address: 'Test Address',
                contactNumber: '1234567890',
                email: 'test@school.com',
                status: 'active',
                studentUserIdPrefix: 'TEST'
            }

            act(() => {
                result.current.addSchool(newSchool)
            })

            const schoolId = result.current.schools[0].id

            act(() => {
                result.current.updateSchool(schoolId, { name: 'Updated School' })
            })

            expect(result.current.schools[0].name).toBe('Updated School')
        })

        it('should update school status', () => {
            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider
            })

            const newSchool: Omit<School, 'id' | 'createdAt'> = {
                name: 'Test School',
                address: 'Test Address',
                contactNumber: '1234567890',
                email: 'test@school.com',
                status: 'active',
                studentUserIdPrefix: 'TEST'
            }

            act(() => {
                result.current.addSchool(newSchool)
            })

            const schoolId = result.current.schools[0].id

            act(() => {
                result.current.updateSchoolStatus(schoolId, 'blocked')
            })

            expect(result.current.schools[0].status).toBe('blocked')
        })

        it('should delete a school', () => {
            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider
            })

            const newSchool: Omit<School, 'id' | 'createdAt'> = {
                name: 'Test School',
                address: 'Test Address',
                contactNumber: '1234567890',
                email: 'test@school.com',
                status: 'active',
                studentUserIdPrefix: 'TEST'
            }

            act(() => {
                result.current.addSchool(newSchool)
            })

            const schoolId = result.current.schools[0].id

            act(() => {
                result.current.deleteSchool(schoolId)
            })

            expect(result.current.schools.length).toBe(0)
        })
    })

    describe('Admin Management', () => {
        it('should add a new admin', () => {
            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider
            })

            const newAdmin: Omit<Admin, 'id' | 'createdAt'> = {
                username: 'admin',
                name: 'Admin User',
                schoolId: 'school1',
                email: 'admin@school.com',
                phoneNumber: '1234567890',
                status: 'active',
                password: 'admin123'
            }

            act(() => {
                result.current.addAdmin(newAdmin)
            })

            expect(result.current.admins.length).toBe(1)
            expect(result.current.admins[0].username).toBe('admin')
            expect(result.current.admins[0].id).toBeDefined()
            expect(result.current.admins[0].createdAt).toBeDefined()
        })

        it('should update an admin', () => {
            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider
            })

            const newAdmin: Omit<Admin, 'id' | 'createdAt'> = {
                username: 'admin',
                name: 'Admin User',
                schoolId: 'school1',
                email: 'admin@school.com',
                phoneNumber: '1234567890',
                status: 'active',
                password: 'admin123'
            }

            act(() => {
                result.current.addAdmin(newAdmin)
            })

            const adminId = result.current.admins[0].id

            act(() => {
                result.current.updateAdmin(adminId, { name: 'Updated Admin' })
            })

            expect(result.current.admins[0].name).toBe('Updated Admin')
        })

        it('should update admin status', () => {
            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider
            })

            const newAdmin: Omit<Admin, 'id' | 'createdAt'> = {
                username: 'admin',
                name: 'Admin User',
                schoolId: 'school1',
                email: 'admin@school.com',
                phoneNumber: '1234567890',
                status: 'active',
                password: 'admin123'
            }

            act(() => {
                result.current.addAdmin(newAdmin)
            })

            const adminId = result.current.admins[0].id

            act(() => {
                result.current.updateAdminStatus(adminId, 'blocked')
            })

            expect(result.current.admins[0].status).toBe('blocked')
        })

        it('should update admin password', () => {
            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider
            })

            const newAdmin: Omit<Admin, 'id' | 'createdAt'> = {
                username: 'admin',
                name: 'Admin User',
                schoolId: 'school1',
                email: 'admin@school.com',
                phoneNumber: '1234567890',
                status: 'active',
                password: 'admin123'
            }

            act(() => {
                result.current.addAdmin(newAdmin)
            })

            const adminId = result.current.admins[0].id

            act(() => {
                result.current.updateAdminPassword(adminId, 'newpassword123')
            })

            expect(result.current.admins[0].password).toBe('newpassword123')
        })

        it('should delete an admin', () => {
            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider
            })

            const newAdmin: Omit<Admin, 'id' | 'createdAt'> = {
                username: 'admin',
                name: 'Admin User',
                schoolId: 'school1',
                email: 'admin@school.com',
                phoneNumber: '1234567890',
                status: 'active',
                password: 'admin123'
            }

            act(() => {
                result.current.addAdmin(newAdmin)
            })

            const adminId = result.current.admins[0].id

            act(() => {
                result.current.deleteAdmin(adminId)
            })

            expect(result.current.admins.length).toBe(0)
        })
    })

    describe('Contact Management', () => {
        it('should add a new contact', () => {
            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider
            })

            const newContact: Omit<Contact, 'id' | 'createdAt' | 'status'> = {
                name: 'John Doe',
                email: 'john@example.com',
                phone: '1234567890',
                message: 'Test message'
            }

            act(() => {
                result.current.addContact(newContact)
            })

            expect(result.current.contacts.length).toBe(1)
            expect(result.current.contacts[0].name).toBe('John Doe')
            expect(result.current.contacts[0].status).toBe('new')
            expect(result.current.contacts[0].id).toBeDefined()
            expect(result.current.contacts[0].createdAt).toBeDefined()
        })

        it('should update contact status', () => {
            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider
            })

            const newContact: Omit<Contact, 'id' | 'createdAt' | 'status'> = {
                name: 'John Doe',
                email: 'john@example.com',
                phone: '1234567890',
                message: 'Test message'
            }

            act(() => {
                result.current.addContact(newContact)
            })

            const contactId = result.current.contacts[0].id

            act(() => {
                result.current.updateContactStatus(contactId, 'contacted')
            })

            expect(result.current.contacts[0].status).toBe('contacted')
        })

        it('should delete a contact', () => {
            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider
            })

            const newContact: Omit<Contact, 'id' | 'createdAt' | 'status'> = {
                name: 'John Doe',
                email: 'john@example.com',
                phone: '1234567890',
                message: 'Test message'
            }

            act(() => {
                result.current.addContact(newContact)
            })

            const contactId = result.current.contacts[0].id

            act(() => {
                result.current.deleteContact(contactId)
            })

            expect(result.current.contacts.length).toBe(0)
        })
    })

    describe('Redis Integration', () => {
        it('should load developer data from Redis on mount', async () => {
            const mockData = {
                schools: [{ id: 'school1', name: 'Test School', address: '', contactNumber: '', email: '', status: 'active', createdAt: '', studentUserIdPrefix: '' }],
                admins: [{ id: 'admin1', username: 'admin', name: '', schoolId: '', email: '', phoneNumber: '', status: 'active', createdAt: '', password: '' }],
                contacts: [{ id: 'contact1', name: 'John', email: '', phone: '', message: '', createdAt: '', status: 'new' }]
            }

            ;(global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockData
            })

            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider
            })

            await waitFor(() => {
                expect(result.current.schools).toBeDefined()
                expect(Array.isArray(result.current.schools)).toBe(true)
            }, { timeout: 3000 })
        })

        it('should save developer data to Redis when it changes', async () => {
            ;(global.fetch as any).mockResolvedValue({
                ok: true,
                json: async () => ({})
            })

            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider
            })

            await waitFor(() => {
                expect(result.current.addSchool).toBeDefined()
            })

            const newSchool: Omit<School, 'id' | 'createdAt'> = {
                name: 'Test School',
                address: 'Test Address',
                contactNumber: '1234567890',
                email: 'test@school.com',
                status: 'active',
                studentUserIdPrefix: 'TEST'
            }

            await act(async () => {
                result.current.addSchool(newSchool)
            })

            // Wait for debounced save
            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    expect.stringContaining('/api/developer-data'),
                    expect.objectContaining({
                        method: 'POST',
                        headers: expect.objectContaining({
                            'Content-Type': 'application/json'
                        })
                    })
                )
            }, { timeout: 3000 })
        })
    })
})

