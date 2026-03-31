import { SchoolDataState, Student, FeeRecord, AttendanceRecord, ExamRecord, Exam, FeeStructure, FeeStructureStudentMapping, StudentActivity, StudyConductCertificate, SystemSettings, ClassInfo, HolidayEvent, DeveloperStats, SchoolStatistics } from "../types";

/**
 * Database Service - Handles communication with PostgreSQL database through API endpoints
 */
class DatabaseService {
    // Define server URL based on environment
    private serverUrl = import.meta.env.DEV
        ? window.location.origin
        : 'http://0.0.0.0:8000'; // Default production server

    private baseUrl = '/api';
    private apiEndpoints = {
        getData: `${this.baseUrl}/data`,
        saveData: `${this.baseUrl}/data`,
        students: `${this.baseUrl}/students`,
        feeRecords: `${this.baseUrl}/fee-records`,
        attendance: `${this.baseUrl}/attendance`,
        exams: `${this.baseUrl}/exams`,
        developerSchoolStats: `${this.baseUrl}/developer/school-stats`,
    };

    /**
     * Get the full URL for an API endpoint
     */
    private getFullUrl(endpoint: string): string {
        return `${this.serverUrl}${endpoint}`;
    }

    /**
     * Loads all school data from PostgreSQL
     * @param schoolId Optional school ID to filter results
     * @returns Promise with the loaded data
     */
    async loadData(schoolId?: string): Promise<SchoolDataState | null> {
        try {
            console.log('Loading data from PostgreSQL API:', this.apiEndpoints.getData);

            const url = new URL(this.getFullUrl(this.apiEndpoints.getData));
            if (schoolId) url.searchParams.append('schoolId', schoolId);

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            if (!response.ok) {
                console.warn(`Database API responded with status: ${response.status}`);
                throw new Error(`Failed to load data: ${response.status}`);
            }

            const data = await response.json();
            if (!data || (Array.isArray(data) && data.length === 0) || (typeof data === 'object' && Object.keys(data).length === 0)) {
                console.log('No data received from database API');
                return null;
            }

            console.log('Data received from database API:', Object.keys(data).join(', '));
            console.log(`Students: ${data.students?.length || 0}, Classes: ${data.classes?.length || 0}`);

            return data;
        } catch (error) {
            console.error('Error loading data from database API:', error);
            return null;
        }
    }

    /**
     * Loads students for a specific class
     */
    async getStudentsByClass(className: string, schoolId?: string): Promise<Student[]> {
        try {
            const url = new URL(this.getFullUrl(`${this.apiEndpoints.students}`));
            url.searchParams.append('class', className);
            if (schoolId) url.searchParams.append('schoolId', schoolId);

            const response = await fetch(url.toString());

            if (!response.ok) {
                throw new Error(`Failed to load students: ${response.status}`);
            }

            const students = await response.json();
            console.log(`Loaded ${students.length} students for class ${className}`);
            return students;
        } catch (error) {
            console.error('Error loading students by class:', error);
            return [];
        }
    }

    /**
     * Loads a single student by ID
     */
    async getStudentById(id: string): Promise<Student | null> {
        try {
            const url = this.getFullUrl(`${this.apiEndpoints.students}/${encodeURIComponent(id)}`);
            const response = await fetch(url);

            if (response.status === 404) {
                return null;
            }

            if (!response.ok) {
                throw new Error(`Failed to load student: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error loading student:', error);
            return null;
        }
    }

    /**
     * Updates a single student
     */
    async updateStudent(id: string, student: Partial<Student>): Promise<boolean> {
        try {
            const url = this.getFullUrl(`${this.apiEndpoints.students}/${encodeURIComponent(id)}`);
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(student),
            });

            if (!response.ok) {
                throw new Error(`Failed to update student: ${response.status}`);
            }

            return true;
        } catch (error) {
            console.error('Error updating student:', error);
            return false;
        }
    }

    /**
     * Creates a new student
     */
    async createStudent(student: Omit<Student, 'id'>): Promise<Student | null> {
        try {
            const url = this.getFullUrl(this.apiEndpoints.students);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(student),
            });

            if (!response.ok) {
                throw new Error(`Failed to create student: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating student:', error);
            return null;
        }
    }

    /**
     * Updates a fee record (when student pays fee, this updates the student table)
     */
    async updateFeeRecord(id: string, feeRecord: Partial<FeeRecord>): Promise<boolean> {
        try {
            const url = this.getFullUrl(`${this.apiEndpoints.feeRecords}/${encodeURIComponent(id)}`);
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(feeRecord),
            });

            if (!response.ok) {
                throw new Error(`Failed to update fee record: ${response.status}`);
            }

            return true;
        } catch (error) {
            console.error('Error updating fee record:', error);
            return false;
        }
    }

    /**
     * Creates a new fee record
     */
    async createFeeRecord(feeRecord: Omit<FeeRecord, 'id'>): Promise<FeeRecord | null> {
        try {
            const url = this.getFullUrl(this.apiEndpoints.feeRecords);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(feeRecord),
            });

            if (!response.ok) {
                throw new Error(`Failed to create fee record: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating fee record:', error);
            return null;
        }
    }

    /**
     * Deletes fee records by criteria (only pending/partial/overdue records)
     */
    async deleteFeeRecords(criteria: {
        studentId?: string;
        feeType?: string;
        description?: string;
        academicYear?: string;
    }): Promise<boolean> {
        try {
            const url = this.getFullUrl(`${this.baseUrl}/fees/records`);
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(criteria),
            });

            if (!response.ok) {
                throw new Error(`Failed to delete fee records: ${response.status}`);
            }

            return true;
        } catch (error) {
            console.error('Error deleting fee records:', error);
            return false;
        }
    }

    /**
     * Saves data to the database
     */
    async saveData(data: Partial<SchoolDataState> & { schoolId?: string }): Promise<boolean> {
        try {
            console.log('Sending data to database API:', this.apiEndpoints.saveData);
            console.log(`Data includes: Students: ${data.students?.length || 0}, Classes: ${data.classes?.length || 0}, Holidays: ${data.holidayEvents?.length || 0}`);

            const response = await fetch(this.getFullUrl(this.apiEndpoints.saveData), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                console.warn(`Database API responded with status: ${response.status}`);
                throw new Error(`Failed to save data: ${response.status}`);
            }

            const result = await response.json();
            console.log('Database API response:', result);
            console.log('Data successfully saved to database');

            return true;
        } catch (error) {
            console.error('Error saving data to database:', error);
            return false;
        }
    }

    /**
     * Loads all pages of data (for backward compatibility)
     */
    async loadAllPages(schoolId?: string): Promise<any> {
        // PostgreSQL handles pagination server-side, so we just call loadData
        return this.loadData(schoolId);
    }

    // Added methods to match RedisService for backward compatibility if needed
    async clearData(): Promise<boolean> {
        console.warn('clearData not implemented for PostgreSQL. Please use specific delete endpoints.');
        return false;
    }

    async getFeeStructure(className: string, academicYear: string): Promise<FeeStructure | null> {
        try {
            const data = await this.loadData();
            if (!data || !data.feeStructures) return null;
            return data.feeStructures.find(s => s.className === className && s.academicYear === academicYear) || null;
        } catch (error) {
            console.error('Error getting fee structure:', error);
            return null;
        }
    }

    async saveFeeStructure(structure: Omit<FeeStructure, 'id'>): Promise<boolean> {
        try {
            const data = await this.loadData();
            const structures = data?.feeStructures || [];
            return await this.saveData({ feeStructures: [...structures, structure as FeeStructure] });
        } catch (error) {
            console.error('Error saving fee structure:', error);
            return false;
        }
    }

    async updateFeeStructure(id: string, structure: Partial<FeeStructure>): Promise<boolean> {
        try {
            const data = await this.loadData();
            const structures = data?.feeStructures || [];
            const updated = structures.map(s => s.id === id ? { ...s, ...structure } : s);
            return await this.saveData({ feeStructures: updated });
        } catch (error) {
            console.error('Error updating fee structure:', error);
            return false;
        }
    }

    /**
     * Gets school statistics for developer dashboard
     * @returns Promise with developer statistics including school stats
     */
    async getSchoolStatistics(): Promise<DeveloperStats | null> {
        try {
            const url = this.getFullUrl(this.apiEndpoints.developerSchoolStats);
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            if (!response.ok) {
                console.warn(`School statistics API responded with status: ${response.status}`);
                throw new Error(`Failed to load school statistics: ${response.status}`);
            }

            const data = await response.json();
            console.log('School statistics loaded:', data);
            return data;
        } catch (error) {
            console.error('Error loading school statistics:', error);
            return null;
        }
    }

    /**
     * Gets developer statistics (alias for getSchoolStatistics for consistency)
     */
    async getDeveloperStats(): Promise<DeveloperStats | null> {
        return this.getSchoolStatistics();
    }

    // ---------- Exam CRUD ----------
    async getExams(params?: { schoolId?: string; class?: string; academicYear?: string }): Promise<Exam[]> {
        try {
            const url = new URL(this.getFullUrl(this.apiEndpoints.exams));
            if (params?.schoolId) url.searchParams.append('schoolId', params.schoolId);
            if (params?.class) url.searchParams.append('class', params.class);
            if (params?.academicYear) url.searchParams.append('academicYear', params.academicYear);
            const response = await fetch(url.toString());
            if (!response.ok) throw new Error(`Failed to load exams: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error loading exams:', error);
            return [];
        }
    }

    async getExamById(id: string): Promise<Exam | null> {
        try {
            const url = this.getFullUrl(`${this.apiEndpoints.exams}/${encodeURIComponent(id)}`);
            const response = await fetch(url);
            if (response.status === 404) return null;
            if (!response.ok) throw new Error(`Failed to load exam: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error loading exam:', error);
            return null;
        }
    }

    async createExam(exam: Omit<Exam, 'id'>): Promise<Exam | null> {
        try {
            const response = await fetch(this.getFullUrl(this.apiEndpoints.exams), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(exam),
            });
            if (!response.ok) throw new Error(`Failed to create exam: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error creating exam:', error);
            return null;
        }
    }

    async updateExam(id: string, updates: Partial<Exam>): Promise<Exam | null> {
        try {
            const response = await fetch(this.getFullUrl(`${this.apiEndpoints.exams}/${encodeURIComponent(id)}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            if (response.status === 404) return null;
            if (!response.ok) throw new Error(`Failed to update exam: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error updating exam:', error);
            return null;
        }
    }

    async deleteExam(id: string): Promise<boolean> {
        try {
            const response = await fetch(this.getFullUrl(`${this.apiEndpoints.exams}/${encodeURIComponent(id)}`), {
                method: 'DELETE',
            });
            if (response.status === 404) return false;
            if (!response.ok) throw new Error(`Failed to delete exam: ${response.status}`);
            return true;
        } catch (error) {
            console.error('Error deleting exam:', error);
            return false;
        }
    }

    async getExamRecords(params?: { schoolId?: string; examId?: string; studentId?: string; examType?: string; limit?: number; offset?: number }): Promise<ExamRecord[]> {
        try {
            const url = new URL(this.getFullUrl(`${this.apiEndpoints.exams}/records`));
            if (params?.schoolId) url.searchParams.append('schoolId', params.schoolId);
            if (params?.examId) url.searchParams.append('examId', params.examId);
            if (params?.studentId) url.searchParams.append('studentId', params.studentId);
            if (params?.examType) url.searchParams.append('examType', params.examType);
            if (params?.limit != null) url.searchParams.append('limit', String(params.limit));
            if (params?.offset != null) url.searchParams.append('offset', String(params.offset));
            const response = await fetch(url.toString());
            if (!response.ok) throw new Error(`Failed to load exam records: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error loading exam records:', error);
            return [];
        }
    }

    async createExamRecords(record: Omit<ExamRecord, 'id'> | Omit<ExamRecord, 'id'>[]): Promise<ExamRecord | ExamRecord[] | null> {
        try {
            const response = await fetch(this.getFullUrl(`${this.apiEndpoints.exams}/records`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(record),
            });
            if (!response.ok) throw new Error(`Failed to create exam record(s): ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error creating exam record(s):', error);
            return null;
        }
    }

    async updateExamRecord(id: string, updates: Partial<Pick<ExamRecord, 'obtainedMarks' | 'grade' | 'remarks' | 'status'>>): Promise<ExamRecord | null> {
        try {
            const response = await fetch(this.getFullUrl(`${this.apiEndpoints.exams}/records/${encodeURIComponent(id)}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            if (response.status === 404) return null;
            if (!response.ok) throw new Error(`Failed to update exam record: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error updating exam record:', error);
            return null;
        }
    }

    async deleteExamRecord(id: string): Promise<boolean> {
        try {
            const response = await fetch(this.getFullUrl(`${this.apiEndpoints.exams}/records/${encodeURIComponent(id)}`), {
                method: 'DELETE',
            });
            if (response.status === 404) return false;
            if (!response.ok) throw new Error(`Failed to delete exam record: ${response.status}`);
            return true;
        } catch (error) {
            console.error('Error deleting exam record:', error);
            return false;
        }
    }
}

// Export as singleton
export default new DatabaseService();

