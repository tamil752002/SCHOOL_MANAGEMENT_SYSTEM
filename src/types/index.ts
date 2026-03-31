// Core types for the school management system

export interface User {
  id: string;
  username: string;
  role: 'developer' | 'admin' | 'student' | 'teacher' | 'parent';
  name: string;
  admissionNumber?: string;
  schoolId?: string;
  teacherId?: string;
  studentIds?: string[];
}

export interface School {
  id: string;
  name: string;
  address: string;
  contactNumber: string;
  email: string;
  status: 'active' | 'blocked';
  createdAt: string;
  studentUserIdPrefix: string; // Unique prefix for student user IDs
}

export interface Admin {
  id: string;
  username: string;
  name: string;
  schoolId: string;
  email: string;
  phoneNumber: string;
  status: 'active' | 'blocked';
  createdAt: string;
  password: string;
}

export interface Student {
  id: string;
  admissionNumber: string;
  admissionDate: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  studentAadhar?: string;
  fatherName: string;
  fatherAadhar?: string;
  motherName: string;
  motherAadhar?: string;
  studentClass: string;
  section: string;
  medium: string;
  dob?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  location?: string;
  address?: string;
  admissionClass?: string;
  mobileNumber?: string;
  parentMobile?: string;
  penNumber?: string;
  caste?: string;
  subCaste?: string;
  religion?: string;
  motherTongue?: string;
  profilePhoto?: string;
  emailAddress?: string;
  status: 'active' | 'inactive' | 'transferred' | 'graduated';
  password: string;
  schoolId: string;
  totalFee?: number;
  feePaid?: number;
  remainingFee?: number;
  parentUserId?: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  session: 'morning' | 'afternoon';
  status: 'present' | 'absent';
  markedBy: string;
  timestamp: string;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  feeType: 'tuition' | 'school' | 'exam' | 'van' | 'uniform' | 'books' | 'other';
  amount: number; // This represents the fee applied (total fee from fee structure)
  dueDate: string;
  paidDate?: string;
  status: 'paid' | 'pending' | 'overdue' | 'partial';
  receiptNumber?: string;
  paidAmount?: number; // This represents the fee paid
  description: string;
  academicYear: string;
  collectedBy?: string;
  // Explicit tracking fields (calculated from amount and paidAmount)
  feeApplied?: number; // Total fee applied from fee structure (same as amount)
  feePaid?: number; // Amount paid (same as paidAmount)
  remainingFee?: number; // Remaining fee = feeApplied - feePaid
  /** Amounts applied TO this fee from other fees' overpayment */
  allocationsFrom?: { fromFeeLabel: string; amount: number }[];
  /** Amounts applied FROM this fee's overpayment to other fees */
  allocationsTo?: { toFeeLabel: string; amount: number }[];
}

export interface FeeStructure {
  id: string;
  className: string;
  academicYear: string;
  structureType: 'curriculum' | 'semi_curriculum';
  // Curriculum fees (Type 1): applies to ALL students
  tuitionFee: number;
  schoolFee: number;
  examFee: number;
  // Semi-curriculum fees (Type 2): applies to SELECTED students only
  booksFee: number;
  uniformFee: number;
  vanFee: number;
  otherFees: { name: string; amount: number }[];
  schoolId?: string; // School identifier
}

export interface FeeStructureStudentMapping {
  id: string;
  feeStructureId: string;
  studentId: string;
  feeType: 'books' | 'uniform' | 'van' | 'other';
  /** When feeType is 'other', identifies which other fee (e.g. "Lab Fee") so each is mapped individually. */
  otherFeeName?: string;
  createdAt?: string;
}

export interface ExamRecord {
  id: string;
  studentId: string;
  examId?: string;
  examType?: 'FA1' | 'FA2' | 'SA1' | 'FA3' | 'FA4' | 'SA2' | 'Annual' | 'Weekend Exam' | 'General Test';
  subject?: string;
  subjectId?: string;
  maxMarks: number;
  obtainedMarks: number;
  grade: string;
  date?: string;
  academicYear?: string;
  remarks?: string;
  status: 'pending' | 'scored' | 'absent';
}

export interface ExamScheduleEntry {
  id: string;
  date: string;
  subject: string;
  timeSlot: 'morning' | 'afternoon';
  maxMarks?: number;
}

export interface Exam {
  id: string;
  name?: string;
  type: 'FA1' | 'FA2' | 'SA1' | 'FA3' | 'FA4' | 'SA2' | 'Annual' | 'Weekend Exam' | 'General Test' | string;
  className: string;
  subjects?: string[];
  subject?: string;
  startDate: string; // Keep for backward compatibility
  endDate: string; // Keep for backward compatibility
  schedule?: ExamScheduleEntry[]; // New: individual exam schedule entries
  academicYear?: string;
  totalMarks?: number;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  schoolId?: string; // School identifier
}

export interface StudentActivity {
  id: string;
  studentId: string;
  type: 'positive' | 'negative';
  title: string;
  description: string;
  date: string;
  recordedBy?: string;
  category: string;
}

export interface StudentEnrollment {
  id: string;
  schoolId: string;
  studentId: string;
  academicYear: string;
  className: string;
  section: string;
  enrollmentType: 'new_admission' | 'promoted' | 'readmission' | 'transfer_in';
  enrolledAt?: string;
  leftAt?: string;
  createdAt?: string;
  updatedAt?: string;
  studentName?: string;
  admissionNumber?: string;
  studentStatus?: string;
}

export interface ClassInfo {
  id?: string;
  name: string;
  sections: string[];
  medium: string[];
  classTeacher?: string;
  classInchargeTeacherId?: string;
}

export interface ClassSectionSubjectTeacher {
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
}

export interface Teacher {
  id: string;
  userId?: string;
  schoolId: string;
  name: string;
  username?: string;
  email?: string;
  phoneNumber?: string;
  salary?: number;
  joinDate?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  subjects?: { id: string; name: string }[];
  classes?: { className: string; section: string; subjectId: string; subjectName?: string; isIncharge?: boolean }[];
  leaveBalance?: { leaveType: string; year: number; allowed: number; used: number }[];
  leftAt?: string;
}

export interface Subject {
  id: string;
  schoolId?: string | null;
  name: string;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TeacherLeaveBalance {
  id?: string;
  teacherId: string;
  leaveType: 'sick' | 'casual' | 'loss_of_pay';
  year: number;
  allowed: number;
  used: number;
}

export interface TeacherLeaveApplication {
  id: string;
  teacherId: string;
  teacherName?: string;
  leaveType: 'sick' | 'casual' | 'loss_of_pay';
  fromDate: string;
  toDate: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: string;
  createdAt?: string;
}

export interface StudentLeaveApplication {
  id: string;
  studentId: string;
  studentName?: string;
  studentClass?: string;
  section?: string;
  leaveType: 'sick' | 'casual';
  fromDate: string;
  toDate: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: string;
  reviewedBy?: string;
  reviewedByRole?: string;
  createdAt?: string;
}

export interface TeacherAttendance {
  id: string;
  teacherId: string;
  date: string;
  session: 'morning' | 'afternoon';
  status: 'present' | 'absent';
  markedAt?: string;
  markedBy?: string;
}

export interface SearchFilters {
  searchTerm: string;
  className: string;
  section: string;
  medium: string;
  status: string;
  feeStatus: string;
  attendanceRange: { min: number; max: number };
  dateRange: { start: string; end: string };
}

export interface SystemSettings {
  schoolName: string;
  schoolAddress: string;
  schoolPhone: string;
  schoolEmail: string;
  currentAcademicYear: string;
  admissionNumberPrefix: string;
  admissionNumberLength: number;
  attendanceThreshold: number;
  feeReminderDays: number;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  schoolSealImage?: string;
  principalSignatureImage?: string;
  subjects?: string[]; // Custom subjects list
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  createdAt: string;
  status: 'new' | 'contacted' | 'resolved';
}

export interface StudyConductCertificate {
  id: string;
  studentId: string;
  issueDate: string;
  academicYear?: string;
  certificateNumber?: string;
  characterRating?: string;
  attendance?: number;
  remarks?: string;
  status?: 'issued' | 'pending' | 'rejected' | 'completed';
  downloadCount?: number;
  lastDownloaded?: string;
  downloadHistory?: string[];
}

export interface HolidayEvent {
  id: string;
  type: 'holiday' | 'event';
  title?: string;
  startDate: string;
  endDate: string;
  reason: string;
  schoolId: string;
}

export interface SchoolStatistics {
  schoolId: string;
  schoolName: string;
  schoolEmail: string;
  schoolContact: string;
  schoolStatus: 'active' | 'blocked';
  adminCount: number;
  studentCount: number;
  createdAt: string;
}

export interface DeveloperStats {
  totalSchools: number;
  totalAdmins: number;
  totalStudents: number;
  activeSchools: number;
  blockedSchools: number;
  schoolStatistics: SchoolStatistics[];
}

// SchoolDataState interface for Redis service
export interface SchoolDataState {
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  feeRecords: FeeRecord[];
  feeStructures: FeeStructure[];
  feeStructureStudentMappings: FeeStructureStudentMapping[];
  examRecords: ExamRecord[];
  exams: Exam[];
  studentActivities: StudentActivity[];
  classes: ClassInfo[];
  settings: SystemSettings;
  conductCertificates: StudyConductCertificate[];
  holidayEvents: HolidayEvent[];
  teachers: Teacher[];
  subjects: Subject[];
  teacherLeaveBalances: TeacherLeaveBalance[];
  teacherLeaveApplications: TeacherLeaveApplication[];
  studentLeaveApplications: StudentLeaveApplication[];
  enrollments?: StudentEnrollment[];
  pagination?: {
    page: number;
    limit: number;
    totalStudents: number;
    totalAttendance: number;
    hasMore: boolean;
  };
  lastSaved?: string;
  version?: string;
}