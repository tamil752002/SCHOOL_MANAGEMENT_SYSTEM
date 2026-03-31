import { FeeRecord } from '../types';

export interface FeeStats {
  totalAmount: number;
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  collectionRate: number;
}

export interface FeeBreakdownItem {
  total: number;
  paid: number;
  pending: number;
}

export type FeeBreakdownByType = Record<string, FeeBreakdownItem>;

export interface ClassFeeStats {
  className: string;
  totalFee: number;
  paidFee: number;
  remainingFee: number;
  percentage: number;
  studentCount: number;
}

/**
 * Calculate fee statistics from fee records
 */
export const calculateFeeStats = (feeRecords: FeeRecord[], academicYear?: string): FeeStats => {
  const filteredRecords = academicYear 
    ? feeRecords.filter(r => r.academicYear === academicYear)
    : feeRecords;

  let totalAmount = 0;
  let totalCollected = 0;
  let totalOverdue = 0;

  filteredRecords.forEach(record => {
    totalAmount += record.amount;
    
    // Use paidAmount if available, otherwise assume amount if status is 'paid'
    const recordPaid = record.paidAmount !== undefined ? record.paidAmount : (record.status === 'paid' ? record.amount : 0);
    totalCollected += recordPaid;

    const isFullyPaid = recordPaid >= record.amount && record.amount > 0;

    if (!isFullyPaid && record.status === 'overdue') {
      totalOverdue += (record.amount - recordPaid);
    }
  });

  const totalPending = totalAmount - totalCollected;
  const collectionRate = totalAmount > 0 ? (totalCollected / totalAmount) * 100 : 0;

  return {
    totalAmount,
    totalCollected,
    totalPending,
    totalOverdue,
    collectionRate
  };
};

/**
 * Calculate fee breakdown by type
 */
export const getFeeBreakdownByType = (feeRecords: FeeRecord[], academicYear?: string): FeeBreakdownByType => {
  const breakdown: FeeBreakdownByType = {
    tuition: { total: 0, paid: 0, pending: 0 },
    school: { total: 0, paid: 0, pending: 0 },
    van: { total: 0, paid: 0, pending: 0 },
    books: { total: 0, paid: 0, pending: 0 },
    uniform: { total: 0, paid: 0, pending: 0 },
    exam: { total: 0, paid: 0, pending: 0 },
    other: { total: 0, paid: 0, pending: 0 }
  };

  const filteredRecords = academicYear 
    ? feeRecords.filter(r => r.academicYear === academicYear)
    : feeRecords;

  filteredRecords.forEach(record => {
    const feeType = record.feeType as string;
    if (!breakdown[feeType]) {
        breakdown[feeType] = { total: 0, paid: 0, pending: 0 };
    }

    const recordPaid = record.paidAmount !== undefined ? record.paidAmount : (record.status === 'paid' ? record.amount : 0);
    const isFullyPaid = recordPaid >= record.amount && record.amount > 0;
    
    breakdown[feeType].total += record.amount;
    breakdown[feeType].paid += recordPaid;
    
    if (!isFullyPaid) {
      breakdown[feeType].pending += (record.amount - recordPaid);
    }
  });

  return breakdown;
};

/**
 * Calculate fee breakdown by class
 */
export const getFeeBreakdownByClass = (
  feeRecords: FeeRecord[], 
  students: Array<{ id: string; studentClass: string }>,
  academicYear?: string
): Record<string, { total: number; paid: number; pending: number }> => {
  const classFeeMap: Record<string, { total: number; paid: number; pending: number }> = {};

  const filteredRecords = academicYear 
    ? feeRecords.filter(r => r.academicYear === academicYear)
    : feeRecords;

  filteredRecords.forEach(record => {
    const student = students.find(s => s.id === record.studentId);
    if (!student) return;

    const studentClass = student.studentClass;

    if (!classFeeMap[studentClass]) {
      classFeeMap[studentClass] = { total: 0, paid: 0, pending: 0 };
    }

    classFeeMap[studentClass].total += record.amount;

    const recordPaid = record.paidAmount !== undefined ? record.paidAmount : (record.status === 'paid' ? record.amount : 0);
    const isFullyPaid = recordPaid >= record.amount && record.amount > 0;

    if (isFullyPaid) {
      classFeeMap[studentClass].paid += record.amount;
    } else if (record.status === 'partial' && record.paidAmount) {
      classFeeMap[studentClass].paid += record.paidAmount;
      classFeeMap[studentClass].pending += (record.amount - record.paidAmount);
    } else {
      classFeeMap[studentClass].pending += record.amount;
    }
  });

  // Sort by class name numerically
  return Object.entries(classFeeMap)
    .sort((a, b) => {
      const aNum = parseInt(a[0]);
      const bNum = parseInt(b[0]);

      if (isNaN(aNum) && isNaN(bNum)) return a[0].localeCompare(b[0]);
      if (isNaN(aNum)) return -1;
      if (isNaN(bNum)) return 1;

      return aNum - bNum;
    })
    .reduce((acc, [className, data]) => {
      acc[className] = data;
      return acc;
    }, {} as Record<string, { total: number; paid: number; pending: number }>);
};

/**
 * Calculate class-wise fee statistics for analytics cards
 */
export const calculateClassFeeStats = (
  className: string,
  feeRecords: FeeRecord[],
  students: Array<{ id: string; studentClass: string }>,
  academicYear?: string
): ClassFeeStats => {
  const classStudents = students.filter(s => s.studentClass === className);
  const classStudentIds = classStudents.map(s => s.id);
  
  const filteredRecords = (academicYear 
    ? feeRecords.filter(r => r.academicYear === academicYear)
    : feeRecords
  ).filter(r => classStudentIds.includes(r.studentId));

  let totalFee = 0;
  let paidFee = 0;
  let remainingFee = 0;

  filteredRecords.forEach(record => {
    totalFee += record.amount;
    
    const recordPaid = record.paidAmount !== undefined ? record.paidAmount : (record.status === 'paid' ? record.amount : 0);
    paidFee += recordPaid;
    remainingFee += (record.amount - recordPaid);
  });

  const percentage = totalFee > 0 ? (paidFee / totalFee) * 100 : 0;

  return {
    className,
    totalFee,
    paidFee,
    remainingFee,
    percentage,
    studentCount: classStudents.length
  };
};

/**
 * Validate fee record against fee structure
 */
export const validateFeeRecord = (
  feeRecord: Partial<FeeRecord>,
  structure: { structureType: 'curriculum' | 'semi_curriculum' } | null
): { valid: boolean; error?: string } => {
  if (!feeRecord.amount || feeRecord.amount <= 0) {
    return { valid: false, error: 'Fee amount must be greater than 0' };
  }

  if (!feeRecord.academicYear) {
    return { valid: false, error: 'Academic year is required' };
  }

  // For semi-curriculum fees, validate that student is mapped (this check should be done at context level)
  if (structure?.structureType === 'semi_curriculum') {
    // Validation will be done in context where we have access to mappings
  }

  if (feeRecord.status === 'paid' && !feeRecord.paidDate) {
    return { valid: false, error: 'Payment date is required for paid status' };
  }

  if (feeRecord.status === 'partial') {
    if (!feeRecord.paidAmount || feeRecord.paidAmount <= 0) {
      return { valid: false, error: 'Paid amount must be greater than 0 for partial payment' };
    }
    if (feeRecord.paidAmount >= feeRecord.amount) {
      return { valid: false, error: 'Paid amount cannot be greater than or equal to total amount for partial payment' };
    }
  }

  return { valid: true };
};

/**
 * Get monthly collection data for trends
 */
export const getMonthlyCollectionData = (feeRecords: FeeRecord[]): Record<string, number> => {
  const monthlyData: Record<string, number> = {};
  const currentYear = new Date().getFullYear();

  // Initialize all months
  for (let i = 0; i < 12; i++) {
    const monthStr = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
    monthlyData[monthStr] = 0;
  }

  // Filter records with paid status and payment date in current year
  const paidRecords = feeRecords.filter(record =>
    (record.status === 'paid' || record.status === 'partial') &&
    record.paidDate &&
    record.paidDate.startsWith(currentYear.toString())
  );

  // Aggregate payments by month
  paidRecords.forEach(record => {
    if (!record.paidDate) return;

    const month = record.paidDate.substring(0, 7); // Get YYYY-MM format
    if (monthlyData[month] !== undefined) {
      if (record.status === 'paid') {
        monthlyData[month] += record.amount;
      } else if (record.status === 'partial' && record.paidAmount) {
        monthlyData[month] += record.paidAmount;
      }
    }
  });

  return monthlyData;
};

