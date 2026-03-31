import { Student, AttendanceRecord, FeeRecord, ClassInfo } from '../types';

/**
 * Dashboard Statistics Service
 * Centralized service for calculating dashboard statistics with weekly trend comparisons
 */

export interface PeriodComparison {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  formattedChange: string;
}

export interface StudentStats {
  currentCount: number;
  previousCount: number;
  formattedChange: string;
}

export interface AttendanceStats {
  currentPercentage: number;
  previousPercentage: number;
  formattedChange: string;
}

export interface FeeStats {
  currentCollection: number;
  previousCollection: number;
  formattedChange: string;
}

export interface ClassStats {
  count: number;
  description: string;
}

class DashboardStatsService {
  /**
   * Get the start and end dates for the current week (Monday to Sunday)
   */
  private getCurrentWeekRange(): { start: Date; end: Date } {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const start = new Date(now.setDate(diff));
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  }

  /**
   * Get the start and end dates for the previous week (Monday to Sunday)
   */
  private getPreviousWeekRange(): { start: Date; end: Date } {
    const currentWeek = this.getCurrentWeekRange();
    const start = new Date(currentWeek.start);
    start.setDate(start.getDate() - 7);
    
    const end = new Date(currentWeek.end);
    end.setDate(end.getDate() - 7);
    
    return { start, end };
  }

  /**
   * Check if a date string falls within a date range
   */
  private isDateInRange(dateString: string, start: Date, end: Date): boolean {
    try {
      const date = new Date(dateString);
      // Handle date-only strings (YYYY-MM-DD)
      if (dateString.includes('T')) {
        date.setHours(0, 0, 0, 0);
      }
      return date >= start && date <= end;
    } catch {
      return false;
    }
  }

  /**
   * Format change string for display
   */
  private formatChange(current: number, previous: number, isPercentage: boolean = false): string {
    const change = current - previous;
    const changePercent = previous !== 0 ? ((change / previous) * 100) : (change !== 0 ? 100 : 0);
    
    if (change === 0) {
      return 'No change';
    }
    
    if (isPercentage) {
      const sign = changePercent >= 0 ? '+' : '';
      return `${sign}${changePercent.toFixed(1)}% from last week`;
    } else {
      const sign = change >= 0 ? '+' : '';
      return `${sign}${Math.abs(change)} this week`;
    }
  }

  /**
   * Filter students by school ID if provided
   */
  private filterBySchool<T extends { schoolId?: string }>(
    items: T[],
    schoolId?: string | null
  ): T[] {
    if (!schoolId) return items;
    return items.filter(item => item.schoolId === schoolId);
  }

  /**
   * Calculate student statistics with weekly comparison
   */
  calculateStudentStats(
    students: Student[],
    schoolId?: string | null
  ): StudentStats {
    const filteredStudents = this.filterBySchool(students, schoolId);
    const currentWeek = this.getCurrentWeekRange();
    const previousWeek = this.getPreviousWeekRange();

    // Count students admitted in current week
    const currentCount = filteredStudents.filter(student => {
      if (!student.admissionDate) return false;
      return this.isDateInRange(student.admissionDate, currentWeek.start, currentWeek.end);
    }).length;

    // Count students admitted in previous week
    const previousCount = filteredStudents.filter(student => {
      if (!student.admissionDate) return false;
      return this.isDateInRange(student.admissionDate, previousWeek.start, previousWeek.end);
    }).length;

    const formattedChange = this.formatChange(currentCount, previousCount, false);

    return {
      currentCount,
      previousCount,
      formattedChange
    };
  }

  /**
   * Calculate attendance statistics with weekly comparison
   */
  calculateAttendanceStats(
    students: Student[],
    attendanceRecords: AttendanceRecord[],
    schoolId?: string | null
  ): AttendanceStats {
    const filteredStudents = this.filterBySchool(students, schoolId);
    const studentIds = new Set(filteredStudents.map(s => s.id));
    const filteredRecords = attendanceRecords.filter(r => studentIds.has(r.studentId));

    const currentWeek = this.getCurrentWeekRange();
    const previousWeek = this.getPreviousWeekRange();

    // Calculate current week attendance
    const currentWeekRecords = filteredRecords.filter(record =>
      this.isDateInRange(record.date, currentWeek.start, currentWeek.end)
    );
    const currentPresent = currentWeekRecords.filter(r => r.status === 'present').length;
    const currentTotal = currentWeekRecords.length;
    const currentPercentage = currentTotal > 0 ? (currentPresent / currentTotal) * 100 : 0;

    // Calculate previous week attendance
    const previousWeekRecords = filteredRecords.filter(record =>
      this.isDateInRange(record.date, previousWeek.start, previousWeek.end)
    );
    const previousPresent = previousWeekRecords.filter(r => r.status === 'present').length;
    const previousTotal = previousWeekRecords.length;
    const previousPercentage = previousTotal > 0 ? (previousPresent / previousTotal) * 100 : 0;

    const formattedChange = this.formatChange(currentPercentage, previousPercentage, true);

    return {
      currentPercentage,
      previousPercentage,
      formattedChange
    };
  }

  /**
   * Calculate fee collection statistics with weekly comparison
   */
  calculateFeeStats(
    students: Student[],
    feeRecords: FeeRecord[],
    schoolId?: string | null
  ): FeeStats {
    const filteredStudents = this.filterBySchool(students, schoolId);
    const studentIds = new Set(filteredStudents.map(s => s.id));
    const filteredRecords = feeRecords.filter(r => studentIds.has(r.studentId));

    const currentWeek = this.getCurrentWeekRange();
    const previousWeek = this.getPreviousWeekRange();

    // Calculate current week fee collection (from paid records)
    const currentWeekRecords = filteredRecords.filter(record => {
      if (!record.paidDate || record.status !== 'paid') return false;
      return this.isDateInRange(record.paidDate, currentWeek.start, currentWeek.end);
    });
    const currentCollection = currentWeekRecords.reduce(
      (sum, r) => sum + (r.paidAmount || r.amount || 0),
      0
    );

    // Calculate previous week fee collection
    const previousWeekRecords = filteredRecords.filter(record => {
      if (!record.paidDate || record.status !== 'paid') return false;
      return this.isDateInRange(record.paidDate, previousWeek.start, previousWeek.end);
    });
    const previousCollection = previousWeekRecords.reduce(
      (sum, r) => sum + (r.paidAmount || r.amount || 0),
      0
    );

    const formattedChange = this.formatChange(currentCollection, previousCollection, false);

    return {
      currentCollection,
      previousCollection,
      formattedChange
    };
  }

  /**
   * Calculate class statistics
   */
  calculateClassStats(
    classes: ClassInfo[],
    students: Student[],
    schoolId?: string | null
  ): ClassStats {
    const filteredStudents = this.filterBySchool(students, schoolId);
    const activeClasses = classes.filter(classInfo => {
      // A class is active if it has at least one active student
      return filteredStudents.some(s => {
        const normalize = (name: string) => {
          if (!name) return '';
          return name.toLowerCase()
            .replace(/^class\s+/g, '')
            .replace(/\s+class$/g, '')
            .replace(/st|nd|rd|th/g, '')
            .trim();
        };
        return normalize(s.studentClass) === normalize(classInfo.name) && s.status === 'active';
      });
    });

    // Generate description from class names
    const classNames = classes.map(c => c.name).sort((a, b) => {
      const aNum = parseInt(a);
      const bNum = parseInt(b);
      if (isNaN(aNum) && isNaN(bNum)) return a.localeCompare(b);
      if (isNaN(aNum)) return -1;
      if (isNaN(bNum)) return 1;
      return aNum - bNum;
    });

    let description = 'Nursery to 12th';
    if (classNames.length > 0) {
      const first = classNames[0];
      const last = classNames[classNames.length - 1];
      if (first !== last) {
        description = `${first} to ${last}`;
      } else {
        description = first;
      }
    }

    return {
      count: activeClasses.length,
      description
    };
  }
}

// Export as singleton
export default new DashboardStatsService();

