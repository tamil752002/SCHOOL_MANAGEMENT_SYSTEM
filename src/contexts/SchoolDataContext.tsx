import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import DatabaseService from '../services/DatabaseService';
import { calculateFeeStats as calculateFeeStatsService } from '../services/FeeService';
import {
  AttendanceRecord,
  ClassInfo,
  Exam,
  ExamRecord,
  FeeRecord,
  FeeStructure,
  FeeStructureStudentMapping,
  HolidayEvent,
  SchoolDataState,
  Student,
  StudentActivity,
  StudentEnrollment,
  StudyConductCertificate,
  Subject,
  SystemSettings,
  Teacher,
  TeacherLeaveApplication,
  TeacherLeaveBalance,
  StudentLeaveApplication
} from '../types';
import { useAuth } from './AuthContext';

interface SchoolDataContextType {
  students: Student[];
  addStudent: (student: Omit<Student, 'id'>) => void;
  updateStudent: (id: string, student: Partial<Student>) => void;
  updateStudentPassword: (studentId: string, newPassword: string) => void;
  deleteStudent: (id: string) => void;
  getStudentsByClass: (className: string, section?: string) => Student[];
  generateAdmissionNumber: () => string;
  attendanceRecords: AttendanceRecord[];
  markAttendance: (studentId: string, status: 'present' | 'absent', date: string, session: 'morning' | 'afternoon') => void;
  getAttendanceByStudent: (studentId: string, dateRange?: { start: string; end: string }) => AttendanceRecord[];
  getAttendanceByClass: (className: string, date: string, session?: 'morning' | 'afternoon') => AttendanceRecord[];
  feeRecords: FeeRecord[];
  feeStructures: FeeStructure[];
  feeStructureStudentMappings: FeeStructureStudentMapping[];
  addFeeRecord: (feeRecord: Omit<FeeRecord, 'id'>) => void;
  updateFeeRecord: (id: string, updates: Partial<FeeRecord>) => void;
  deleteFeeRecords: (criteria: { studentId?: string; feeType?: string; description?: string; academicYear?: string }) => Promise<boolean>;
  addFeeStructure: (structure: Omit<FeeStructure, 'id'>) => string;
  updateFeeStructure: (id: string, updates: Partial<FeeStructure>) => void;
  deleteFeeStructure: (id: string) => void;
  consolidateFeeRecords: () => number;
  cleanupDuplicateFees: () => number;
  getFeesByStudent: (studentId: string) => FeeRecord[];
  applyFeeStructureToStudents: (structureIdOrStructure: string | FeeStructure, oldStructure?: FeeStructure) => Promise<number>;
  cleanupRemovedOtherFeeRecords: (structure: FeeStructure, oldStructure: FeeStructure) => Promise<void>;
  addFeeStructureStudentMapping: (mapping: Omit<FeeStructureStudentMapping, 'id'>) => void;
  removeFeeStructureStudentMapping: (mappingId: string) => void;
  getStudentsForFeeStructure: (structureId: string, feeType?: 'books' | 'uniform' | 'van' | 'other', otherFeeName?: string) => string[];
  conductCertificates: StudyConductCertificate[];
  addConductCertificate: (certificate: Omit<StudyConductCertificate, 'id'>) => void;
  updateConductCertificate: (id: string, updates: Partial<StudyConductCertificate>) => void;
  getConductCertificateByStudent: (studentId: string) => StudyConductCertificate | undefined;
  recordCertificateDownload: (id: string) => void;
  examRecords: ExamRecord[];
  exams: Exam[];
  addExamRecord: (examRecord: Omit<ExamRecord, 'id'>) => void;
  updateExamRecord: (id: string, updates: Partial<ExamRecord>) => void;
  deleteExamRecord: (id: string) => void;
  addExam: (exam: Omit<Exam, 'id'>) => void;
  addExamFromApi: (exam: Exam) => void;
  updateExam: (id: string, updates: Partial<Exam>) => void;
  deleteExam: (id: string) => void;
  getExamsByStudent: (studentId: string) => ExamRecord[];
  getExamRecordsByStudent: (studentId: string) => ExamRecord[];
  studentActivities: StudentActivity[];
  addStudentActivity: (activity: Omit<StudentActivity, 'id'>) => void;
  getActivitiesByStudent: (studentId: string) => StudentActivity[];
  holidayEvents: HolidayEvent[];
  addHolidayEvent: (event: Omit<HolidayEvent, 'id'>) => void;
  deleteHolidayEvent: (id: string) => void;
  classes: ClassInfo[];
  addClass: (classInfo: ClassInfo) => void;
  updateClass: (className: string, updates: Partial<ClassInfo>) => void;
  deleteClass: (schoolId: string, classId: string) => Promise<void>;
  settings: SystemSettings;
  updateSettings: (updates: Partial<SystemSettings>) => void;
  teachers: Teacher[];
  subjects: Subject[];
  teacherLeaveBalances: TeacherLeaveBalance[];
  teacherLeaveApplications: TeacherLeaveApplication[];
  studentLeaveApplications: StudentLeaveApplication[];
  refreshTeachers: () => Promise<void>;
  refreshSubjects: () => Promise<void>;
  refreshClasses: (schoolId: string) => Promise<void>;
  refreshStudents: (schoolId: string) => Promise<void>;
  refreshLeaveData: (schoolId?: string, teacherId?: string, parentUserId?: string) => Promise<void>;
  generateStudentPassword: (firstName?: string, dob?: string) => string;
  getStudentStats: () => any;
  getAttendanceStats: (dateRange?: { start: string; end: string }) => any;
  getFeeStats: () => any;
  resetAllData: () => void;
  exportAllData: () => string;
  importAllData: (data: string) => Promise<boolean>;
  enrollments: StudentEnrollment[];
  switchAcademicYear: (schoolId: string, currentAcademicYear: string) => Promise<boolean>;
  refreshData: () => void;
}

const SchoolDataContext = createContext<SchoolDataContextType | undefined>(undefined);

const defaultSettings: SystemSettings = {
  schoolName: '',
  schoolAddress: '',
  schoolPhone: '',
  schoolEmail: '',
  currentAcademicYear: '2024-25',
  admissionNumberPrefix: '',
  admissionNumberLength: 4,
  attendanceThreshold: 75,
  feeReminderDays: 7,
  backupFrequency: 'daily',
  subjects: []
};

const defaultClasses: ClassInfo[] = [
  { name: 'Nursery', sections: ['A', 'B'], medium: ['English', 'Telugu'] },
  { name: 'LKG', sections: ['A', 'B'], medium: ['English', 'Telugu'] },
  { name: 'UKG', sections: ['A', 'B'], medium: ['English', 'Telugu'] },
  { name: '1', sections: ['A', 'B', 'C'], medium: ['English', 'Telugu'] },
  { name: '2', sections: ['A', 'B'], medium: ['English', 'Telugu'] },
  { name: '3', sections: ['A', 'B', 'C'], medium: ['English', 'Telugu'] },
  { name: '4', sections: ['A', 'B'], medium: ['English', 'Telugu'] },
  { name: '5', sections: ['A', 'B', 'C'], medium: ['English', 'Telugu'] },
  { name: '6', sections: ['A', 'B', 'C'], medium: ['English', 'Telugu', 'Hindi'] },
  { name: '7', sections: ['A', 'B'], medium: ['English', 'Telugu', 'Hindi'] },
  { name: '8', sections: ['A', 'B'], medium: ['English', 'Telugu', 'Hindi'] },
  { name: '9', sections: ['A', 'B'], medium: ['English', 'Telugu', 'Hindi'] },
  { name: '10', sections: ['A', 'B'], medium: ['English', 'Telugu', 'Hindi'] },
  { name: '11', sections: ['A'], medium: ['English'] },
  { name: '12', sections: ['A'], medium: ['English'] }
];

export function SchoolDataProvider({ children }: { children: ReactNode }) {
  const { user, schools } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [feeStructureStudentMappings, setFeeStructureStudentMappings] = useState<FeeStructureStudentMapping[]>([]);
  const [examRecords, setExamRecords] = useState<ExamRecord[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [studentActivities, setStudentActivities] = useState<StudentActivity[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>(defaultClasses);
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [conductCertificates, setConductCertificates] = useState<StudyConductCertificate[]>([]);
  const [holidayEvents, setHolidayEvents] = useState<HolidayEvent[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teacherLeaveBalances, setTeacherLeaveBalances] = useState<TeacherLeaveBalance[]>([]);
  const [teacherLeaveApplications, setTeacherLeaveApplications] = useState<TeacherLeaveApplication[]>([]);
  const [studentLeaveApplications, setStudentLeaveApplications] = useState<StudentLeaveApplication[]>([]);
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (user?.role === 'admin') {
      const adminUser = user as { id: string; role: string; schoolId?: string };
      if (adminUser.schoolId) {
        const school = schools.find(s => String(s.id) === String(adminUser.schoolId));
        if (school) {
          setSettings(prev => ({
            ...prev,
            schoolName: school.name || prev.schoolName,
            schoolAddress: school.address || prev.schoolAddress,
            schoolPhone: school.contactNumber || prev.schoolPhone,
            schoolEmail: school.email || prev.schoolEmail,
            admissionNumberPrefix: school.studentUserIdPrefix || prev.admissionNumberPrefix
          }));
        }
      }
    }
  }, [user, schools]);

  const getCurrentSchoolId = (): string | null => {
    if (!user) return null;
    const u = user as { role: string; schoolId?: string };
    // Both admin and student have schoolId (student gets it from auth API) so they load their school's data
    return u.schoolId || null;
  };

  const generateUniqueId = (): string => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `${timestamp}_${random}`;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentSchoolId = getCurrentSchoolId();
        const data = await DatabaseService.loadAllPages(currentSchoolId || undefined);
        if (data && typeof data === 'object') {
          console.log('Data loaded successfully from PostgreSQL');
          setStudents(Array.isArray(data.students) ? data.students : []);
          setAttendanceRecords(Array.isArray(data.attendanceRecords) 
            ? data.attendanceRecords.map((r: AttendanceRecord) => ({ ...r, session: r.session || 'morning' }))
            : []);
          setFeeRecords(Array.isArray(data.feeRecords) ? data.feeRecords : []);
          setFeeStructures(Array.isArray(data.feeStructures) ? data.feeStructures : []);
          setFeeStructureStudentMappings(Array.isArray(data.feeStructureStudentMappings) ? data.feeStructureStudentMappings : []);
          setExamRecords(Array.isArray(data.examRecords) ? data.examRecords : []);
          setExams(Array.isArray(data.exams) ? data.exams : []);
          setStudentActivities(Array.isArray(data.studentActivities) ? data.studentActivities : []);
          setClasses(Array.isArray(data.classes) && data.classes.length > 0 ? data.classes : defaultClasses);
          let mergedSettings = data.settings ? { ...defaultSettings, ...data.settings } : defaultSettings;
          // Merge in school info from developer data so Settings always shows school name/address/etc.
          if (user?.role === 'admin') {
            const adminUser = user as { schoolId?: string };
            if (adminUser.schoolId && schools.length > 0) {
              const school = schools.find(s => String(s.id) === String(adminUser.schoolId));
              if (school) {
                mergedSettings = {
                  ...mergedSettings,
                  schoolName: school.name || mergedSettings.schoolName,
                  schoolAddress: school.address || mergedSettings.schoolAddress,
                  schoolPhone: school.contactNumber || mergedSettings.schoolPhone,
                  schoolEmail: school.email || mergedSettings.schoolEmail,
                  admissionNumberPrefix: school.studentUserIdPrefix || mergedSettings.admissionNumberPrefix
                };
              }
            }
          }
          setSettings(mergedSettings);
          setConductCertificates(Array.isArray(data.conductCertificates) ? data.conductCertificates : []);
          setTeachers(Array.isArray(data.teachers) ? data.teachers : []);
          setSubjects(Array.isArray(data.subjects) ? data.subjects : []);
          setTeacherLeaveBalances(Array.isArray(data.teacherLeaveBalances) ? data.teacherLeaveBalances : []);
          setTeacherLeaveApplications(Array.isArray(data.teacherLeaveApplications) ? data.teacherLeaveApplications : []);
          setStudentLeaveApplications(Array.isArray(data.studentLeaveApplications) ? data.studentLeaveApplications : []);
          setEnrollments(Array.isArray(data.enrollments) ? data.enrollments : []);

          const holidayEvents = Array.isArray(data.holidayEvents) ? data.holidayEvents : [];
          setHolidayEvents(holidayEvents.map((e: any) => {
            // Normalize startDate to YYYY-MM-DD format
            let startDate = e.startDate;
            if (startDate) {
              if (startDate instanceof Date) {
                const year = startDate.getFullYear();
                const month = String(startDate.getMonth() + 1).padStart(2, '0');
                const day = String(startDate.getDate()).padStart(2, '0');
                startDate = `${year}-${month}-${day}`;
              } else if (typeof startDate === 'string') {
                // Remove time and timezone info
                if (startDate.includes('T')) startDate = startDate.split('T')[0];
                if (startDate.includes('+') || startDate.includes('Z')) {
                  startDate = startDate.split('+')[0].split('Z')[0].split('T')[0];
                }
              }
            }
            
            // Normalize endDate to YYYY-MM-DD format
            let endDate = e.endDate;
            if (endDate) {
              if (endDate instanceof Date) {
                const year = endDate.getFullYear();
                const month = String(endDate.getMonth() + 1).padStart(2, '0');
                const day = String(endDate.getDate()).padStart(2, '0');
                endDate = `${year}-${month}-${day}`;
              } else if (typeof endDate === 'string') {
                // Remove time and timezone info
                if (endDate.includes('T')) endDate = endDate.split('T')[0];
                if (endDate.includes('+') || endDate.includes('Z')) {
                  endDate = endDate.split('+')[0].split('Z')[0].split('T')[0];
                }
              }
            }
            
            return {
              ...e,
              startDate,
              endDate
            };
          }));
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, [user, schools, refreshTrigger]);

  useEffect(() => {
    const saveDataTimeout = setTimeout(async () => {
      // Don't save if students array is empty (to avoid overwriting with empty data during initial load)
      const currentSchoolId = getCurrentSchoolId();
      if (students.length === 0 && !currentSchoolId) {
        return;
      }

      const dataToSave: SchoolDataState = {
        students,
        attendanceRecords,
        feeRecords,
        feeStructures,
        feeStructureStudentMappings,
        examRecords,
        exams,
        studentActivities,
        classes,
        settings,
        conductCertificates,
        holidayEvents,
        teachers,
        subjects,
        teacherLeaveBalances,
        teacherLeaveApplications,
        studentLeaveApplications,
        lastSaved: new Date().toISOString(),
        version: '2.0'
      };
      
      const hasData = students.length > 0 || attendanceRecords.length > 0 || feeRecords.length > 0 ||
        examRecords.length > 0 || studentActivities.length > 0 || holidayEvents.length > 0;
      
      if (hasData || Object.keys(settings).length > 0) {
        console.log('Context triggering save, holiday events count:', holidayEvents.length);
        // Explicitly pass schoolId if available
        const payload = currentSchoolId ? { ...dataToSave, schoolId: currentSchoolId } : dataToSave;
        await DatabaseService.saveData(payload as any);
      }
    }, 1000);
    return () => clearTimeout(saveDataTimeout);
  }, [students, attendanceRecords, feeRecords, feeStructures, feeStructureStudentMappings, examRecords, exams, studentActivities, classes, settings, conductCertificates, holidayEvents, teachers, subjects, teacherLeaveBalances, teacherLeaveApplications, studentLeaveApplications, user]);

  const generateStudentPassword = (firstName?: string, dob?: string) => {
    if (!firstName || !dob) return Math.random().toString(36).slice(-8);
    const firstThree = firstName.substring(0, 3).toLowerCase();
    let formattedDob = dob;
    if (dob.includes('-')) {
      const [year, month, day] = dob.split('-');
      formattedDob = `${day}/${month}/${year}`;
    }
    return `${firstThree}${formattedDob}`;
  };

  const generateAdmissionNumber = () => {
    let prefix = settings.admissionNumberPrefix;
    if (user?.role === 'admin') {
      const adminUser = user as { id: string; role: string; schoolId?: string };
      if (adminUser.schoolId) {
        const school = schools.find(s => s.id === adminUser.schoolId);
        if (school?.studentUserIdPrefix) {
          prefix = school.studentUserIdPrefix;
          if (settings.admissionNumberPrefix !== prefix) {
            setSettings(prev => ({ ...prev, admissionNumberPrefix: prefix }));
          }
        }
      }
    }
    const existingNumbers = students.map(s =>
      parseInt((s.admissionNumber || '').replace(prefix || '', ''))
    ).filter(n => !isNaN(n));
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    return `${prefix}${nextNumber.toString().padStart(settings.admissionNumberLength, '0')}`;
  };

  const addStudent = async (studentData: Omit<Student, 'id'>) => {
    const currentSchoolId = getCurrentSchoolId();
    const schoolId = studentData.schoolId || currentSchoolId || 'school1';
    const newStudent: Student = {
      ...studentData,
      id: generateUniqueId(),
      status: 'active',
      schoolId
    };
    setStudents(prev => [...prev, newStudent]);
  };

  const updateStudent = (id: string, updates: Partial<Student>) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const updateStudentPassword = (studentId: string, newPassword: string) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, password: newPassword } : s));
  };

  const deleteStudent = (id: string) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status: 'inactive' as const } : s));
  };

  const getStudentsByClass = (className: string, section?: string) => {
    const currentSchoolId = getCurrentSchoolId();
    
    // Resolve the actual school UUID if currentSchoolId exists
    // The user's schoolId might be in a different format (e.g., "school1767585152549")
    // but students have UUID schoolIds, so we need to find the matching school
    let resolvedSchoolId: string | null = null;
    let shouldFilterBySchool = false;
    
    if (currentSchoolId && schools && schools.length > 0) {
      // Try to find school by matching user's schoolId with school's id
      const matchingSchool = schools.find(s => s.id === currentSchoolId);
      if (matchingSchool) {
        resolvedSchoolId = matchingSchool.id;
        shouldFilterBySchool = true;
      } else {
        // If no exact match, check if any students have a schoolId that matches currentSchoolId
        // If formats are incompatible (UUID vs string), disable school filtering to show all students
        const hasMatchingStudent = students.some(s => s.schoolId === currentSchoolId);
        if (hasMatchingStudent) {
          resolvedSchoolId = currentSchoolId;
          shouldFilterBySchool = true;
        } else {
          // Formats don't match - disable school filtering to avoid excluding all students
          shouldFilterBySchool = false;
        }
      }
    }
    
    // Normalize className for filtering: "Class 3", "3rd Class", "3" -> "3"
    const normalize = (name: string) => {
      if (!name) return '';
      return name.toLowerCase()
        .replace(/^class\s+/g, '') // remove "class " at start
        .replace(/\s+class$/g, '') // remove " class" at end
        .replace(/st|nd|rd|th/g, '') // remove ordinal suffixes
        .trim();
    };

    const targetClass = normalize(className);

    const filtered = students.filter(s => {
      // Normalize class names for comparison
      const studentClassNormalized = normalize(s.studentClass || '');
      const classMatches = studentClassNormalized === targetClass;
      
      // Handle status - default to 'active' if undefined/null/empty
      const studentStatus = (s.status || 'active').toLowerCase().trim();
      const statusMatches = studentStatus === 'active';
      
      // Check section match
      const sectionMatches = !section || (s.section || '').trim() === section.trim();
      
      // Check school ID match
      // Only filter by school if we have a valid resolvedSchoolId and shouldFilterBySchool is true
      // Otherwise, show all students (handles format mismatches gracefully)
      const schoolMatches = !shouldFilterBySchool || 
                           !resolvedSchoolId || 
                           !s.schoolId || 
                           s.schoolId === resolvedSchoolId;
      
      return classMatches && sectionMatches && statusMatches && schoolMatches;
    });

    return filtered;
  };

  const markAttendance = (studentId: string, status: 'present' | 'absent', date: string, session: 'morning' | 'afternoon') => {
    setAttendanceRecords(prev => [
      ...prev.filter(r => !(r.studentId === studentId && r.date === date && r.session === session)),
      { id: generateUniqueId(), studentId, date, session, status, markedBy: 'admin', timestamp: new Date().toISOString() }
    ]);
  };

  const getAttendanceByStudent = (studentId: string, dateRange?: { start: string; end: string }) => {
    return attendanceRecords.filter(r => {
      if (r.studentId !== studentId) return false;
      if (!dateRange) return true;
      const d = new Date(r.date);
      return d >= new Date(dateRange.start) && d <= new Date(dateRange.end);
    });
  };

  const getAttendanceByClass = (className: string, date: string, session?: 'morning' | 'afternoon') => {
    const studentIds = getStudentsByClass(className).map(s => s.id);
    const normalizedDate = date.includes('T') ? date.split('T')[0] : date;
    return attendanceRecords.filter(r => {
      const rd = r.date.includes('T') ? r.date.split('T')[0] : r.date;
      const matchesStudent = studentIds.includes(r.studentId);
      const matchesDate = rd === normalizedDate;
      const matchesSession = session ? r.session === session : true;
      return matchesStudent && matchesDate && matchesSession;
    });
  };

  const addFeeRecord = (feeData: Omit<FeeRecord, 'id'>) => {
    setFeeRecords(prev => [...prev, { ...feeData, id: generateUniqueId() }]);
  };

  const addFeeRecords = (records: (Omit<FeeRecord, 'id'>)[]) => {
    if (records.length === 0) return;
    setFeeRecords(prev => [...prev, ...records.map(r => ({ ...r, id: generateUniqueId() }))]);
  };

  const updateFeeRecord = (id: string, updates: Partial<FeeRecord>) => {
    setFeeRecords(prev => prev.map(r => {
      if (r.id === id) {
        const updated = { ...r, ...updates };
        
        // Recalculate remaining amount when amount is updated
        if (updates.amount !== undefined) {
          const newAmount = updates.amount;
          const currentPaidAmount = updated.paidAmount || 0;
          
          // If new amount is less than paid amount, adjust paid amount
          if (newAmount < currentPaidAmount) {
            updated.paidAmount = newAmount;
            updated.status = 'paid';
          } else if (newAmount === currentPaidAmount && currentPaidAmount > 0) {
            updated.status = 'paid';
          } else if (currentPaidAmount > 0 && currentPaidAmount < newAmount) {
            updated.status = 'partial';
          }
          
          // Remaining amount is calculated as amount - paidAmount
          // Database will handle this via generated column, but we ensure consistency
        }
        
        return updated;
      }
      return r;
    }));
  };

  const deleteFeeRecords = async (criteria: {
    studentId?: string;
    feeType?: string;
    description?: string;
    academicYear?: string;
  }) => {
    const success = await DatabaseService.deleteFeeRecords(criteria);
    if (success) {
      // Remove from local state - only delete pending/partial/overdue records
      setFeeRecords(prev => prev.filter(r => {
        // Keep record if it's paid (preserve historical data)
        if (r.status === 'paid') return true;
        
        // Check if record matches all criteria
        if (criteria.studentId && r.studentId !== criteria.studentId) return true;
        if (criteria.feeType && r.feeType !== criteria.feeType) return true;
        if (criteria.description && r.description !== criteria.description) return true;
        if (criteria.academicYear && r.academicYear !== criteria.academicYear) return true;
        
        // If all criteria match, delete the record
        return false;
      }));
    }
    return success;
  };

  const addFeeStructure = (struct: Omit<FeeStructure, 'id'>) => {
    const otherFees = Array.isArray(struct.otherFees) ? [...struct.otherFees] : (struct.otherFees && typeof struct.otherFees === 'object' && ('name' in struct.otherFees || 'amount' in struct.otherFees) ? [{ ...struct.otherFees as { name: string; amount: number } }] : []);
    const newStructure = { ...struct, id: generateUniqueId(), otherFees };
    setFeeStructures(prev => [...prev, newStructure]);
    return newStructure.id;
  };

  const updateFeeStructure = (id: string, updates: Partial<FeeStructure>) => {
    setFeeStructures(prev => prev.map(s => {
      if (s.id !== id) return s;
      const merged = { ...s, ...updates };
      if (updates.otherFees !== undefined) {
        merged.otherFees = Array.isArray(updates.otherFees) ? [...updates.otherFees] : (updates.otherFees && typeof updates.otherFees === 'object' && ('name' in updates.otherFees || 'amount' in updates.otherFees) ? [{ ...updates.otherFees as { name: string; amount: number } }] : []);
      }
      return merged;
    }));
  };

  const deleteFeeStructure = (id: string) => {
    setFeeStructures(prev => prev.filter(s => s.id !== id));
  };

  const getFeesByStudent = (studentId: string) => {
    return feeRecords.filter(r => r.studentId === studentId);
  };

  const addConductCertificate = (cert: Omit<StudyConductCertificate, 'id'>) => {
    setConductCertificates(prev => [...prev, { ...cert, id: generateUniqueId() }]);
  };

  const updateConductCertificate = (id: string, updates: Partial<StudyConductCertificate>) => {
    setConductCertificates(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const getConductCertificateByStudent = (studentId: string) => {
    return conductCertificates.find(c => c.studentId === studentId);
  };

  const recordCertificateDownload = (id: string) => {
    setConductCertificates(prev => prev.map(c => 
      c.id === id ? { ...c, downloadHistory: [...(c.downloadHistory || []), new Date().toISOString()] } : c
    ));
  };

  const addExamRecord = (record: Omit<ExamRecord, 'id'>) => {
    setExamRecords(prev => [...prev, { ...record, id: generateUniqueId() }]);
  };

  const updateExamRecord = (id: string, updates: Partial<ExamRecord>) => {
    setExamRecords(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const deleteExamRecord = (id: string) => {
    setExamRecords(prev => prev.filter(r => r.id !== id));
  };

  const addExam = (exam: Omit<Exam, 'id'>) => {
    setExams(prev => [...prev, { ...exam, id: generateUniqueId() }]);
  };

  const addExamFromApi = (exam: Exam) => {
    setExams(prev => (prev.some(e => e.id === exam.id) ? prev : [...prev, exam]));
  };

  const updateExam = (id: string, updates: Partial<Exam>) => {
    setExams(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const deleteExam = (id: string) => {
    setExams(prev => prev.filter(e => e.id !== id));
    setExamRecords(prev => prev.filter(r => r.examId !== id));
  };

  const getExamsByStudent = (studentId: string) => {
    return examRecords.filter(r => r.studentId === studentId);
  };

  const getExamRecordsByStudent = (studentId: string) => {
    return examRecords.filter(r => r.studentId === studentId);
  };

  const addStudentActivity = (activity: Omit<StudentActivity, 'id'>) => {
    setStudentActivities(prev => [...prev, { ...activity, id: generateUniqueId() }]);
  };

  const getActivitiesByStudent = (studentId: string) => {
    return studentActivities.filter(a => a.studentId === studentId);
  };

  const addClass = (info: ClassInfo) => {
    setClasses(prev => [...prev, info]);
  };

  const updateClass = (name: string, updates: Partial<ClassInfo>) => {
    setClasses(prev => prev.map(c => c.name === name ? { ...c, ...updates } : c));
  };

  const getApiBase = () => (import.meta.env.DEV ? window.location.origin : 'http://0.0.0.0:8000');

  const deleteClass = async (schoolId: string, classId: string) => {
    const base = getApiBase();
    const res = await fetch(`${base}/api/classes/${classId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to delete class');
    }
    await refreshClasses(schoolId);
  };


  const refreshTeachers = async () => {
    const schoolId = getCurrentSchoolId();
    if (!schoolId) return;
    try {
      const res = await fetch(`${getApiBase()}/api/teachers?schoolId=${schoolId}`);
      if (res.ok) {
        const data = await res.json();
        setTeachers(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('refreshTeachers', e);
    }
  };

  const refreshSubjects = async () => {
    const schoolId = getCurrentSchoolId();
    try {
      const url = schoolId ? `${getApiBase()}/api/subjects?schoolId=${schoolId}` : `${getApiBase()}/api/subjects`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSubjects(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('refreshSubjects', e);
    }
  };

  const refreshClasses = async (schoolId: string) => {
    try {
      const res = await fetch(`${getApiBase()}/api/classes?schoolId=${schoolId}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setClasses(list.map((row: { id?: string; name: string; sections?: string[]; medium?: string[]; classTeacher?: string; classInchargeTeacherId?: string | null }) => ({
          id: row.id,
          name: row.name,
          sections: row.sections ?? [],
          medium: row.medium ?? [],
          classTeacher: row.classTeacher,
          classInchargeTeacherId: row.classInchargeTeacherId ?? undefined
        })));
      }
    } catch (e) {
      console.error('refreshClasses', e);
    }
  };

  const refreshStudents = async (schoolId: string) => {
    try {
      const res = await fetch(`${getApiBase()}/api/students?schoolId=${schoolId}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('refreshStudents', e);
    }
  };

  const switchAcademicYear = async (schoolId: string, currentAcademicYear: string): Promise<boolean> => {
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/api/settings/academic-year`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, currentAcademicYear })
      });
      if (!res.ok) return false;
      setRefreshTrigger(t => t + 1);
      return true;
    } catch (e) {
      console.error('switchAcademicYear', e);
      return false;
    }
  };

  const refreshLeaveData = async (schoolId?: string, teacherId?: string, parentUserId?: string) => {
    const base = getApiBase();
    try {
      if (schoolId) {
        const [tla, sla] = await Promise.all([
          fetch(`${base}/api/leave/teacher-applications?schoolId=${schoolId}`).then(r => r.ok ? r.json() : []),
          fetch(`${base}/api/leave/student?schoolId=${schoolId}`).then(r => r.ok ? r.json() : [])
        ]);
        setTeacherLeaveApplications(Array.isArray(tla) ? tla : []);
        setStudentLeaveApplications(Array.isArray(sla) ? sla : []);
      }
      if (teacherId) {
        const [bal, myApp] = await Promise.all([
          fetch(`${base}/api/leave/balance?teacherId=${teacherId}`).then(r => r.ok ? r.json() : []),
          fetch(`${base}/api/leave/my-applications?teacherId=${teacherId}`).then(r => r.ok ? r.json() : [])
        ]);
        setTeacherLeaveBalances(Array.isArray(bal) ? bal.map((b: TeacherLeaveBalance) => ({ ...b, teacherId })) : []);
        setTeacherLeaveApplications(prev => Array.isArray(myApp) ? myApp : prev);
      }
      if (parentUserId) {
        const res = await fetch(`${base}/api/leave/student?parentUserId=${parentUserId}`);
        if (res.ok) {
          const data = await res.json();
          setStudentLeaveApplications(Array.isArray(data) ? data : []);
        }
      }
    } catch (e) {
      console.error('refreshLeaveData', e);
    }
  };

  const addHolidayEvent = (eventData: Omit<HolidayEvent, 'id'>) => {
    const currentSchoolId = getCurrentSchoolId();
    // Ensure schoolId is explicitly set on the event
    const newEvent: HolidayEvent = { 
      ...eventData, 
      id: generateUniqueId(),
      schoolId: eventData.schoolId || currentSchoolId || 'school1'
    };
    console.log('Adding holiday event with schoolId:', newEvent.schoolId);
    setHolidayEvents(prev => [...prev, newEvent]);
  };

  const deleteHolidayEvent = (id: string) => {
    setHolidayEvents(prev => prev.filter(e => e.id !== id));
  };

  const updateSettings = (updates: Partial<SystemSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const getStudentStats = () => {
    const currentSchoolId = getCurrentSchoolId();
    const ss = students.filter(s => !currentSchoolId || s.schoolId === currentSchoolId);
    const stats = { total: ss.length, active: ss.filter(s => s.status === 'active').length, inactive: ss.filter(s => s.status !== 'active').length, byClass: {} as any };
    ss.forEach(s => { if (s.studentClass) stats.byClass[s.studentClass] = (stats.byClass[s.studentClass] || 0) + 1; });
    return stats;
  };

  const getAttendanceStats = (dateRange?: { start: string; end: string }) => {
    const currentSchoolId = getCurrentSchoolId();
    const ss = students.filter(s => !currentSchoolId || s.schoolId === currentSchoolId);
    const sids = new Set(ss.map(s => s.id));
    const rs = attendanceRecords.filter(r => sids.has(r.studentId));
    const frs = !dateRange ? rs : rs.filter(r => { const d = new Date(r.date); return d >= new Date(dateRange.start) && d <= new Date(dateRange.end); });
    const stats = { totalPresent: frs.filter(r => r.status === 'present').length, totalAbsent: frs.filter(r => r.status === 'absent').length, averageAttendance: 0, byClass: {} as any };
    const total = stats.totalPresent + stats.totalAbsent;
    stats.averageAttendance = total > 0 ? (stats.totalPresent / total) * 100 : 0;
    return stats;
  };

  const getFeeStats = () => {
    const currentSchoolId = getCurrentSchoolId();
    const ss = students.filter(s => !currentSchoolId || s.schoolId === currentSchoolId);
    const sids = new Set(ss.map(s => s.id));
    const sfs = feeRecords.filter(r => sids.has(r.studentId));
    // Use centralized service for calculations
    const stats = calculateFeeStatsService(sfs);
    return {
      totalCollected: stats.totalCollected,
      totalPending: stats.totalPending,
      totalOverdue: stats.totalOverdue,
      collectionRate: stats.collectionRate
    };
  };

  const resetAllData = () => {
    if (window.confirm('Reset all data?')) {
      setStudents([]); setAttendanceRecords([]); setFeeRecords([]); setFeeStructures([]); setExamRecords([]); setExams([]); setStudentActivities([]); setConductCertificates([]);
    }
  };

  const exportAllData = () => JSON.stringify({ students, attendanceRecords, feeRecords, feeStructures, examRecords, exams, studentActivities, classes, settings, conductCertificates, version: '2.0' });

  const importAllData = async (str: string) => {
    try {
      const data = JSON.parse(str);
      if (data.students) setStudents(data.students);
      if (data.attendanceRecords) setAttendanceRecords(
        data.attendanceRecords.map((r: AttendanceRecord) => ({ ...r, session: r.session || 'morning' }))
      );
      if (data.feeRecords) setFeeRecords(data.feeRecords);
      if (data.feeStructures) setFeeStructures(data.feeStructures);
      if (data.examRecords) setExamRecords(data.examRecords);
      if (data.exams) setExams(data.exams);
      if (data.studentActivities) setStudentActivities(data.studentActivities);
      if (data.classes) setClasses(data.classes);
      if (data.settings) setSettings(data.settings);
      if (data.conductCertificates) setConductCertificates(data.conductCertificates);
      return true;
    } catch { return false; }
  };

  const consolidateFeeRecords = () => 0;
  const cleanupDuplicateFees = () => {
    // Find and remove duplicate fee records
    // Duplicates are defined as: same studentId, feeType, and academicYear
    const seen = new Map<string, string>(); // key: "studentId|feeType|academicYear", value: recordId to keep
    const duplicatesToRemove: string[] = [];

    feeRecords.forEach(record => {
      const key = `${record.studentId}|${record.feeType}|${record.academicYear}`;
      const existingId = seen.get(key);
      
      if (existingId) {
        // Found a duplicate - decide which one to keep
        const existingRecord = feeRecords.find(r => r.id === existingId);
        if (existingRecord) {
          // Keep the one with payment info, or the one with higher amount, or the newer one
          const shouldKeepExisting = 
            (existingRecord.status === 'paid' || existingRecord.status === 'partial') ||
            (existingRecord.amount > record.amount) ||
            (existingRecord.amount === record.amount && existingRecord.id > record.id);
          
          if (shouldKeepExisting) {
            duplicatesToRemove.push(record.id);
          } else {
            duplicatesToRemove.push(existingId);
            seen.set(key, record.id);
          }
        }
      } else {
        seen.set(key, record.id);
      }
    });

    // Remove duplicates
    duplicatesToRemove.forEach(id => {
      setFeeRecords(prev => prev.filter(r => r.id !== id));
    });

    return duplicatesToRemove.length;
  };
  const cleanupRemovedOtherFeeRecords = async (structure: FeeStructure, oldStructure: FeeStructure): Promise<void> => {
    const oldOtherFees = (oldStructure.otherFees || []).filter(f => (f.name || '').trim());
    const newOtherFees = (structure.otherFees || []).filter(f => (f.name || '').trim() && f.amount > 0);
    const removedOtherFeeNames = oldOtherFees.slice(newOtherFees.length).map(f => (f.name || '').trim()).filter(Boolean);
    if (removedOtherFeeNames.length === 0) return;
    const classStudents = getStudentsByClass(structure.className);
    const academicYear = structure.academicYear;
    const deletePromises: Promise<boolean>[] = [];
    removedOtherFeeNames.forEach(removedFeeName => {
      classStudents.forEach(student => {
        const hasRecord = feeRecords.some(r =>
          r.studentId === student.id &&
          r.feeType === 'other' &&
          r.description === removedFeeName &&
          r.academicYear === academicYear &&
          (r.status === 'pending' || r.status === 'partial' || r.status === 'overdue')
        );
        if (hasRecord) {
          deletePromises.push(deleteFeeRecords({
            studentId: student.id,
            feeType: 'other',
            description: removedFeeName,
            academicYear
          }));
        }
      });
    });
    await Promise.all(deletePromises);
  };

  const applyFeeStructureToStudents = async (structureIdOrStructure: string | FeeStructure, oldStructure?: FeeStructure): Promise<number> => {
    // If a FeeStructure object is passed, use it directly; otherwise look it up by ID
    let structure: FeeStructure | undefined;
    if (typeof structureIdOrStructure === 'string') {
      structure = feeStructures.find(fs => fs.id === structureIdOrStructure);
    } else {
      structure = structureIdOrStructure;
    }
    if (!structure) return 0;

    const classStudents = getStudentsByClass(structure.className);
    if (classStudents.length === 0) return 0;

    let count = 0;
    const academicYear = structure.academicYear;

    // Helper function to update fee record with remaining amount recalculation
    const updateFeeRecordWithRecalc = (existing: FeeRecord, newAmount: number) => {
      const currentPaidAmount = existing.paidAmount || 0;
      let updates: Partial<FeeRecord> = { amount: newAmount };
      
      // Recalculate remaining amount
      if (newAmount < currentPaidAmount) {
        updates.paidAmount = newAmount;
        updates.status = 'paid';
      } else if (newAmount === currentPaidAmount && currentPaidAmount > 0) {
        updates.status = 'paid';
      } else if (currentPaidAmount > 0 && currentPaidAmount < newAmount) {
        updates.status = 'partial';
      }
      
      updateFeeRecord(existing.id, updates);
    };

    if (structure.structureType === 'curriculum') {
      // Type 1 (Curriculum): Auto-apply to ALL students in class
      const oldOtherFees = (oldStructure?.otherFees || []).filter(f => (f.name || '').trim());
      const newOtherFees = (structure.otherFees || []).filter(f => (f.name || '').trim() && f.amount > 0);

      if (oldStructure) {
        // 1) Rename by index: same-index name change is an update, not delete+add (avoids duplicate)
        const renamePairs = Math.min(oldOtherFees.length, newOtherFees.length);
        for (let i = 0; i < renamePairs; i++) {
          const oldName = (oldOtherFees[i].name || '').trim();
          const newName = (newOtherFees[i].name || '').trim();
          const newAmount = newOtherFees[i].amount;
          if (oldName === newName) {
            // Same name: just update amount if needed
            classStudents.forEach(student => {
              const existing = feeRecords.find(r =>
                r.studentId === student.id && r.feeType === 'other' && r.description === oldName && r.academicYear === academicYear
              );
              if (existing && (existing.status === 'pending' || existing.status === 'partial')) {
                updateFeeRecordWithRecalc(existing, newAmount);
              }
            });
          } else {
            // Rename: update description and amount so we don't create duplicate
            classStudents.forEach(student => {
              const existing = feeRecords.find(r =>
                r.studentId === student.id && r.feeType === 'other' && r.description === oldName && r.academicYear === academicYear
              );
              if (existing && (existing.status === 'pending' || existing.status === 'partial')) {
                updateFeeRecord(existing.id, { description: newName, amount: newAmount });
              }
            });
          }
        }
        // 2) Delete fee records for "other" fees that were removed (await so DB is updated)
        const removedOtherFeeNames = oldOtherFees.slice(newOtherFees.length).map(f => (f.name || '').trim()).filter(Boolean);
        const deletePromises: Promise<boolean>[] = [];
        removedOtherFeeNames.forEach(removedFeeName => {
          classStudents.forEach(student => {
            const hasRecord = feeRecords.some(r =>
              r.studentId === student.id &&
              r.feeType === 'other' &&
              r.description === removedFeeName &&
              r.academicYear === academicYear &&
              (r.status === 'pending' || r.status === 'partial' || r.status === 'overdue')
            );
            if (hasRecord) {
              deletePromises.push(deleteFeeRecords({
                studentId: student.id,
                feeType: 'other',
                description: removedFeeName,
                academicYear
              }));
            }
          });
        });
        await Promise.all(deletePromises);
      }

      // Collect all new "other" fee records to add in one batch (avoids React batching overwriting)
      const allOtherFeesToAdd: (Omit<FeeRecord, 'id'>)[] = [];

      // Create or update fee records for all students
      classStudents.forEach(student => {
        // Tuition Fee
        if (structure.tuitionFee > 0) {
          const existing = feeRecords.find(r => 
            r.studentId === student.id && 
            r.feeType === 'tuition' && 
            r.academicYear === academicYear
          );
          if (existing) {
            // Update existing record - preserve payment info for pending/partial fees
            if (existing.status === 'pending' || existing.status === 'partial') {
              updateFeeRecordWithRecalc(existing, structure.tuitionFee);
            }
            // If already paid, don't update (preserve historical data)
          } else {
            addFeeRecord({
              studentId: student.id,
              feeType: 'tuition',
              amount: structure.tuitionFee,
              dueDate: new Date().toISOString().split('T')[0],
              status: 'pending',
              description: 'Tuition Fee',
              academicYear
            });
          }
        }

        // School Fee
        if (structure.schoolFee > 0) {
          const existing = feeRecords.find(r => 
            r.studentId === student.id && 
            r.feeType === 'school' && 
            r.academicYear === academicYear
          );
          if (existing) {
            // Update existing record - preserve payment info for pending/partial fees
            if (existing.status === 'pending' || existing.status === 'partial') {
              updateFeeRecordWithRecalc(existing, structure.schoolFee);
            }
            // If already paid, don't update (preserve historical data)
          } else {
            addFeeRecord({
              studentId: student.id,
              feeType: 'school',
              amount: structure.schoolFee,
              dueDate: new Date().toISOString().split('T')[0],
              status: 'pending',
              description: 'School Fee',
              academicYear
            });
          }
        }

        // Exam Fee
        if (structure.examFee > 0) {
          const existing = feeRecords.find(r => 
            r.studentId === student.id && 
            r.feeType === 'exam' && 
            r.academicYear === academicYear
          );
          if (existing) {
            // Update existing record - preserve payment info for pending/partial fees
            if (existing.status === 'pending' || existing.status === 'partial') {
              updateFeeRecordWithRecalc(existing, structure.examFee);
            }
            // If already paid, don't update (preserve historical data)
          } else {
            addFeeRecord({
              studentId: student.id,
              feeType: 'exam',
              amount: structure.examFee,
              dueDate: new Date().toISOString().split('T')[0],
              status: 'pending',
              description: 'Exam Fee',
              academicYear
            });
          }
        }

        // Other Fees - collect ALL new other-fee records for this student (add in one batch later)
        (structure.otherFees || []).forEach(otherFee => {
          if (otherFee.amount > 0 && otherFee.name.trim()) {
            const existing = feeRecords.find(r =>
              r.studentId === student.id &&
              r.feeType === 'other' &&
              r.description === otherFee.name &&
              r.academicYear === academicYear
            );
            if (existing) {
              if (existing.status === 'pending' || existing.status === 'partial') {
                updateFeeRecordWithRecalc(existing, otherFee.amount);
              }
            } else {
              allOtherFeesToAdd.push({
                studentId: student.id,
                feeType: 'other',
                amount: otherFee.amount,
                dueDate: new Date().toISOString().split('T')[0],
                status: 'pending',
                description: otherFee.name,
                academicYear
              });
            }
          }
        });

        count++;
      });

      addFeeRecords(allOtherFeesToAdd);
    } else {
      // Type 2 (Semi-curriculum): Only apply to mapped students
      // First, handle deletion of removed "other" fees (await so DB is updated)
      if (oldStructure) {
        const oldOtherFeeNames = new Set((oldStructure.otherFees || []).map(f => f.name));
        const newOtherFeeNames = new Set((structure.otherFees || []).map(f => f.name));
        const removedOtherFeeNames = Array.from(oldOtherFeeNames).filter(name => !newOtherFeeNames.has(name));
        const semiDeletePromises: Promise<boolean>[] = [];
        removedOtherFeeNames.forEach(removedFeeName => {
          const mappingsForThisFee = feeStructureStudentMappings.filter(
            m => m.feeStructureId === structure.id && m.feeType === 'other' && (m.otherFeeName || '') === removedFeeName
          );
          mappingsForThisFee.forEach(mapping => {
            semiDeletePromises.push(deleteFeeRecords({
              studentId: mapping.studentId,
              feeType: 'other',
              description: removedFeeName,
              academicYear
            }));
          });
        });
        await Promise.all(semiDeletePromises);
      }

      // Update fee records for all students that are already mapped to this structure
      const mappings = feeStructureStudentMappings.filter(
        m => m.feeStructureId === structure.id
      );
      
      mappings.forEach(mapping => {
        const student = students.find(s => s.id === mapping.studentId);
        if (!student) return;

        if (mapping.feeType === 'other') {
          // For 'other' in semi-curriculum, apply only the one other fee this mapping refers to (by otherFeeName)
          const otherFeeName = (mapping.otherFeeName || '').trim();
          const otherFee = (structure.otherFees || []).find(f => (f.name || '').trim() === otherFeeName);
          if (otherFee && otherFee.amount > 0) {
            const existing = feeRecords.find(r =>
              r.studentId === mapping.studentId &&
              r.feeType === 'other' &&
              r.description === otherFeeName &&
              r.academicYear === academicYear
            );
            if (existing) {
              if (existing.status === 'pending' || existing.status === 'partial') {
                updateFeeRecordWithRecalc(existing, otherFee.amount);
              }
            } else {
              addFeeRecord({
                studentId: mapping.studentId,
                feeType: 'other',
                amount: otherFee.amount,
                dueDate: new Date().toISOString().split('T')[0],
                status: 'pending',
                description: otherFeeName,
                academicYear
              });
            }
            count++;
          }
        } else {
          // Handle books, uniform, van fees
          let feeAmount = 0;
          let description = '';

          switch (mapping.feeType) {
            case 'books':
              feeAmount = structure.booksFee;
              description = 'Books Fee';
              break;
            case 'uniform':
              feeAmount = structure.uniformFee;
              description = 'Uniform Fee';
              break;
            case 'van':
              feeAmount = structure.vanFee;
              description = 'Van Fee';
              break;
          }

          if (feeAmount > 0) {
            const existing = feeRecords.find(r => 
              r.studentId === mapping.studentId && 
              r.feeType === mapping.feeType && 
              r.academicYear === academicYear
            );
            
            if (existing) {
              // Update existing record - preserve payment info for pending/partial fees
              if (existing.status === 'pending' || existing.status === 'partial') {
                updateFeeRecordWithRecalc(existing, feeAmount);
              }
              // If already paid, don't update (preserve historical data)
            } else {
              // Create new fee record if it doesn't exist
              addFeeRecord({
                studentId: mapping.studentId,
                feeType: mapping.feeType,
                amount: feeAmount,
                dueDate: new Date().toISOString().split('T')[0],
                status: 'pending',
                description,
                academicYear
              });
            }
            count++;
          }
        }
      });
    }

    return count;
  };

  const addFeeStructureStudentMapping = (mapping: Omit<FeeStructureStudentMapping, 'id'>) => {
    const otherName = mapping.feeType === 'other' ? (mapping.otherFeeName || '').trim() : '';
    const existingMapping = feeStructureStudentMappings.find(
      m => m.feeStructureId === mapping.feeStructureId &&
           m.studentId === mapping.studentId &&
           m.feeType === mapping.feeType &&
           (mapping.feeType !== 'other' || (m.otherFeeName || '') === otherName)
    );
    if (existingMapping) return;

    const newMapping: FeeStructureStudentMapping = {
      ...mapping,
      otherFeeName: mapping.feeType === 'other' ? otherName : undefined,
      id: generateUniqueId(),
      createdAt: new Date().toISOString()
    };
    setFeeStructureStudentMappings(prev => [...prev, newMapping]);

    const structure = feeStructures.find(fs => fs.id === mapping.feeStructureId);
    if (!structure) return;

    if (mapping.feeType === 'other') {
      const otherFee = (structure.otherFees || []).find(f => (f.name || '').trim() === otherName);
      if (otherFee && otherFee.amount > 0) {
        const existing = feeRecords.find(r =>
          r.studentId === mapping.studentId &&
          r.feeType === 'other' &&
          r.description === otherName &&
          r.academicYear === structure.academicYear
        );
        if (!existing) {
          addFeeRecord({
            studentId: mapping.studentId,
            feeType: 'other',
            amount: otherFee.amount,
            dueDate: new Date().toISOString().split('T')[0],
            status: 'pending',
            description: otherName,
            academicYear: structure.academicYear
          });
        }
      }
      return;
    }

    let feeAmount = 0;
    let description = '';
    switch (mapping.feeType) {
      case 'books': feeAmount = structure.booksFee; description = 'Books Fee'; break;
      case 'uniform': feeAmount = structure.uniformFee; description = 'Uniform Fee'; break;
      case 'van': feeAmount = structure.vanFee; description = 'Van Fee'; break;
    }
    if (feeAmount > 0) {
      const existing = feeRecords.find(r =>
        r.studentId === mapping.studentId &&
        r.feeType === mapping.feeType &&
        r.academicYear === structure.academicYear
      );
      if (!existing) {
        addFeeRecord({
          studentId: mapping.studentId,
          feeType: mapping.feeType,
          amount: feeAmount,
          dueDate: new Date().toISOString().split('T')[0],
          status: 'pending',
          description,
          academicYear: structure.academicYear
        });
      } else if (existing.status === 'pending' || existing.status === 'partial') {
        updateFeeRecord(existing.id, { amount: feeAmount });
      }
    }
  };

  const removeFeeStructureStudentMapping = (mappingId: string) => {
    const mapping = feeStructureStudentMappings.find(m => m.id === mappingId);
    setFeeStructureStudentMappings(prev => prev.filter(m => m.id !== mappingId));

    if (mapping) {
      const structure = feeStructures.find(fs => fs.id === mapping.feeStructureId);
      if (structure) {
        const isOther = mapping.feeType === 'other';
        const otherName = (mapping.otherFeeName || '').trim();
        const feeRecord = feeRecords.find(r => {
          if (r.studentId !== mapping.studentId || r.academicYear !== structure.academicYear) return false;
          if (isOther) return r.feeType === 'other' && r.description === otherName;
          return r.feeType === mapping.feeType;
        });
        if (feeRecord && feeRecord.status === 'pending') {
          setFeeRecords(prev => prev.filter(r => r.id !== feeRecord.id));
        }
      }
    }
  };

  const getStudentsForFeeStructure = (structureId: string, feeType?: 'books' | 'uniform' | 'van' | 'other', otherFeeName?: string): string[] => {
    const mappings = feeStructureStudentMappings.filter(m => {
      if (m.feeStructureId !== structureId) return false;
      if (!feeType) return true;
      if (m.feeType !== feeType) return false;
      if (feeType === 'other' && otherFeeName !== undefined) {
        return (m.otherFeeName || '') === otherFeeName;
      }
      return true;
    });
    return mappings.map(m => m.studentId);
  };

  return (
    <SchoolDataContext.Provider value={{
      students, addStudent, updateStudent, updateStudentPassword, deleteStudent, getStudentsByClass, generateAdmissionNumber,
      attendanceRecords, markAttendance, getAttendanceByStudent, getAttendanceByClass,
      feeRecords, feeStructures, feeStructureStudentMappings, addFeeRecord, updateFeeRecord, deleteFeeRecords, addFeeStructure, updateFeeStructure, deleteFeeStructure,
      consolidateFeeRecords, cleanupDuplicateFees, getFeesByStudent, applyFeeStructureToStudents, cleanupRemovedOtherFeeRecords,
      addFeeStructureStudentMapping, removeFeeStructureStudentMapping, getStudentsForFeeStructure,
      conductCertificates, addConductCertificate, updateConductCertificate, getConductCertificateByStudent, recordCertificateDownload,
      examRecords, exams, addExamRecord, updateExamRecord, deleteExamRecord, addExam, addExamFromApi, updateExam, deleteExam, getExamsByStudent, getExamRecordsByStudent,
      studentActivities, addStudentActivity, getActivitiesByStudent,
      holidayEvents, addHolidayEvent, deleteHolidayEvent,
      classes, addClass, updateClass, deleteClass,
      settings, updateSettings,
      teachers, subjects, teacherLeaveBalances, teacherLeaveApplications, studentLeaveApplications,
      refreshTeachers, refreshSubjects, refreshClasses, refreshStudents, refreshLeaveData,
      generateStudentPassword, getStudentStats, getAttendanceStats, getFeeStats, resetAllData, exportAllData, importAllData,
      enrollments, switchAcademicYear, refreshData: () => setRefreshTrigger(t => t + 1)
    }}>
      {children}
    </SchoolDataContext.Provider>
  );
}

export function useSchoolData() {
  const context = useContext(SchoolDataContext);
  if (context === undefined) throw new Error('useSchoolData must be used within a SchoolDataProvider');
  return context;
}
