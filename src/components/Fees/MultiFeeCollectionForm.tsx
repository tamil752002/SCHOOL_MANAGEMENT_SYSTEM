import { AlertTriangle, CreditCard, RefreshCw, Save, Search, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { calculateFeeStats, getFeeBreakdownByType } from '../../services/FeeService';
import { formatCurrency } from '../../utils/formatCurrency';

interface MultiFeeCollectionFormProps {
  onClose: () => void;
  /** When opening from a student's fee view, pre-select this student */
  initialStudentId?: string;
}

const FEE_TYPE_LABELS: Record<string, string> = {
  tuition: 'Tuition Fee',
  school: 'School Fee',
  exam: 'Exam Fee',
  books: 'Books Fee',
  uniform: 'Uniform Fee',
  van: 'Van Fee',
  other: 'Other'
};

const STANDARD_TYPES = ['tuition', 'school', 'van', 'books', 'uniform', 'exam'] as const;

export function MultiFeeCollectionForm({ onClose, initialStudentId }: MultiFeeCollectionFormProps) {
  const { students, addFeeRecord, settings, getFeesByStudent, updateFeeRecord } = useSchoolData();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string>(initialStudentId || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    paidDate: new Date().toISOString().split('T')[0],
    receiptNumber: '',
    academicYear: settings.currentAcademicYear
  });

  /** key -> amount to pay now. key is fee type or "other__description" */
  const [amountsByKey, setAmountsByKey] = useState<Record<string, number>>({});

  useEffect(() => {
    if (initialStudentId) {
      setSelectedStudent(initialStudentId);
    }
  }, [initialStudentId]);

  useEffect(() => {
    if (!formData.receiptNumber) {
      const prefix = 'RCP';
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear());
      const dateStr = `${day}${month}${year}`;
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const secondsSinceMidnight = Math.floor((now.getTime() - midnight.getTime()) / 1000);
      const secondsLength = 14 - prefix.length - 8;
      const secondsStr = String(secondsSinceMidnight).slice(-secondsLength).padStart(secondsLength, '0');
      const receiptNumber = `${prefix}${dateStr}${secondsStr}`.slice(0, 14).padEnd(14, '0');
      setFormData(prev => ({ ...prev, receiptNumber }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredStudents = students.filter(student => {
    const fullName = `${student.firstName || ''} ${student.lastName || ''}`.trim();
    return (fullName.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
           (student.admissionNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase());
  });

  const selectedStudentData = students.find(s => s.id === selectedStudent);
  const studentFeeRecords = selectedStudent ? getFeesByStudent(selectedStudent) : [];
  const feeStats = calculateFeeStats(studentFeeRecords, formData.academicYear);
  const feeBreakdown = getFeeBreakdownByType(studentFeeRecords, formData.academicYear);

  const otherFeesByDescription = selectedStudentData
    ? studentFeeRecords
        .filter(record => record.feeType === 'other' && record.academicYear === formData.academicYear)
        .reduce((acc, record) => {
          const desc = record.description || 'Other';
          if (!acc[desc]) {
            acc[desc] = { total: 0, paid: 0, pending: 0 };
          }
          const recordPaid = record.paidAmount !== undefined ? record.paidAmount : (record.status === 'paid' ? record.amount : 0);
          const isFullyPaid = recordPaid >= record.amount && record.amount > 0;
          acc[desc].total += record.amount;
          acc[desc].paid += recordPaid;
          if (!isFullyPaid) {
            acc[desc].pending += (record.amount - recordPaid);
          }
          return acc;
        }, {} as Record<string, { total: number; paid: number; pending: number }>)
    : {};

  /** Build rows: each fee type (standard + other by description) with pending > 0 */
  const feeRows: { key: string; label: string; total: number; paid: number; pending: number }[] = [];
  if (selectedStudentData) {
    STANDARD_TYPES.forEach(type => {
      const data = feeBreakdown[type];
      if (data && data.total > 0 && data.pending > 0) {
        feeRows.push({
          key: type,
          label: FEE_TYPE_LABELS[type] || type,
          total: data.total,
          paid: data.paid,
          pending: data.pending
        });
      }
    });
    Object.entries(otherFeesByDescription)
      .filter(([_, data]) => data.total > 0 && data.pending > 0)
      .forEach(([description, data]) => {
        feeRows.push({
          key: `other__${description}`,
          label: `${description} (other)`,
          total: data.total,
          paid: data.paid,
          pending: data.pending
        });
      });
  }

  const totalToPay = feeRows.reduce((sum, row) => {
    const amt = amountsByKey[row.key] ?? 0;
    return sum + amt;
  }, 0);

  const setAmountForKey = (key: string, value: number) => {
    setAmountsByKey(prev => ({ ...prev, [key]: value }));
  };

  const setPayFullForRow = (row: { key: string; pending: number }) => {
    setAmountsByKey(prev => ({ ...prev, [row.key]: row.pending }));
  };

  const generateReceiptNumber = () => {
    const prefix = 'RCP';
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear());
    const dateStr = `${day}${month}${year}`;
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const secondsSinceMidnight = Math.floor((now.getTime() - midnight.getTime()) / 1000);
    const secondsLength = 14 - prefix.length - 8;
    const secondsStr = String(secondsSinceMidnight).slice(-secondsLength).padStart(secondsLength, '0');
    const receiptNumber = `${prefix}${dateStr}${secondsStr}`.slice(0, 14).padEnd(14, '0');
    setFormData(prev => ({ ...prev, receiptNumber }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!selectedStudent) {
      newErrors.student = 'Please select a student';
    }
    if (!formData.academicYear.trim()) {
      newErrors.academicYear = 'Academic year is required';
    }
    if (!formData.paidDate) {
      newErrors.paidDate = 'Payment date is required';
    }
    if (feeRows.length === 0 && selectedStudent) {
      newErrors.fees = 'This student has no pending fees for the selected academic year';
    }
    const hasAnyPayment = feeRows.some(row => (amountsByKey[row.key] ?? 0) > 0);
    if (selectedStudent && feeRows.length > 0 && !hasAnyPayment) {
      newErrors.amounts = 'Enter at least one amount to pay';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const studentFees = getFeesByStudent(selectedStudent);
      const receiptNumber = formData.receiptNumber || undefined;
      const paidDate = formData.paidDate;
      let processed = 0;

      for (const row of feeRows) {
        const amountToPay = amountsByKey[row.key] ?? 0;
        if (amountToPay <= 0) continue;

        const isOther = row.key.startsWith('other__');
        const feeType = isOther ? 'other' as const : (row.key as 'tuition' | 'school' | 'van' | 'books' | 'uniform' | 'exam');
        const description = isOther ? row.key.slice(7) : '';

        const existingRecord = studentFees.find(
          record =>
            record.feeType === feeType &&
            record.academicYear === formData.academicYear &&
            (record.status === 'pending' || record.status === 'overdue' || record.status === 'partial') &&
            (feeType !== 'other' || (record.description || '') === description)
        );

        if (existingRecord) {
          const currentPaid = existingRecord.paidAmount ?? (existingRecord.status === 'paid' ? existingRecord.amount : 0);
          const totalPaid = currentPaid + amountToPay;
          const newStatus = totalPaid >= existingRecord.amount ? 'paid' : 'partial';

          await updateFeeRecord(existingRecord.id, {
            paidAmount: totalPaid,
            paidDate,
            status: newStatus,
            receiptNumber: receiptNumber || existingRecord.receiptNumber,
            description: feeType === 'other' ? description : existingRecord.description
          });
          processed++;
        } else {
          const dueDate = paidDate || new Date().toISOString().split('T')[0];
          await addFeeRecord({
            studentId: selectedStudent,
            feeType,
            amount: row.total,
            dueDate,
            paidDate,
            status: amountToPay >= row.pending ? 'paid' : 'partial',
            receiptNumber,
            paidAmount: amountToPay,
            description: feeType === 'other' ? description : '',
            academicYear: formData.academicYear
          });
          processed++;
        }
      }

      if (processed > 0) {
        alert(`Payment recorded for ${processed} fee type(s). Total: ${formatCurrency(totalToPay)}`);
        onClose();
      } else {
        setErrors({ submit: 'No payments could be applied. Check that pending records exist.' });
      }
    } catch (error) {
      console.error('Error recording multi-fee payment:', error);
      setErrors({ submit: 'Failed to record payments. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Pay multiple fees (one student)
        </h2>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {errors.submit && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div className="text-sm text-red-700 dark:text-red-400">{errors.submit}</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Student selection */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            <Search className="w-5 h-5" />
            <span>Select Student</span>
          </h3>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search by name or admission number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Student *</label>
            <select
              value={selectedStudent}
              onChange={(e) => {
                setSelectedStudent(e.target.value);
                setAmountsByKey({});
                if (errors.student) setErrors(prev => ({ ...prev, student: '' }));
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.student ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'}`}
              required
            >
              <option value="">Choose a student</option>
              {filteredStudents.map(student => {
                const fullName = `${student.firstName} ${student.lastName}`.trim();
                return (
                  <option key={student.id} value={student.id}>
                    {fullName} ({student.admissionNumber}) – Class {student.studentClass}
                  </option>
                );
              })}
            </select>
            {errors.student && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.student}</p>}
          </div>

          {selectedStudentData && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Total pending for {formData.academicYear}: {formatCurrency(feeStats.totalPending)}
              </p>
            </div>
          )}
        </div>

        {/* Fee breakdown and amounts */}
        {selectedStudentData && feeRows.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span>Fees to pay</span>
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Enter amount to pay for each fee type. One receipt will be used for the entire payment.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-600">
                    <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300">Fee type</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-700 dark:text-gray-300">Total</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-700 dark:text-gray-300">Paid</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-700 dark:text-gray-300">Pending</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-700 dark:text-gray-300">Pay now</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-700 dark:text-gray-300">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {feeRows.map(row => (
                    <tr key={row.key} className="border-b border-gray-100 dark:border-gray-700/50">
                      <td className="py-2 px-2 text-gray-700 dark:text-gray-300">{row.label}</td>
                      <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">{formatCurrency(row.total)}</td>
                      <td className="py-2 px-2 text-right text-green-600 dark:text-green-400">{formatCurrency(row.paid)}</td>
                      <td className="py-2 px-2 text-right text-red-600 dark:text-red-400 font-medium">{formatCurrency(row.pending)}</td>
                      <td className="py-2 px-2 text-right">
                        <div className="relative inline-block">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                          <input
                            type="number"
                            min={0}
                            max={row.pending}
                            step={0.01}
                            value={amountsByKey[row.key] ?? ''}
                            onChange={(e) => setAmountForKey(row.key, parseFloat(e.target.value) || 0)}
                            className="w-24 pl-6 pr-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                            placeholder="0"
                          />
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <button
                          type="button"
                          onClick={() => setPayFullForRow(row)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Pay full
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalToPay > 0 && (
              <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                Total amount to pay: {formatCurrency(totalToPay)}
              </p>
            )}
            {errors.amounts && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.amounts}</p>}
            {errors.fees && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.fees}</p>}
          </div>
        )}

        {selectedStudentData && feeRows.length === 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              No pending fees for this student in {formData.academicYear}. Use single fee collection if you need to add a new fee.
            </p>
          </div>
        )}

        {/* Common fields */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Academic year *</label>
            <input
              type="text"
              value={formData.academicYear}
              onChange={(e) => setFormData(prev => ({ ...prev, academicYear: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.academicYear ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
              placeholder="e.g. 2024-25"
              required
            />
            {errors.academicYear && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.academicYear}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment date *</label>
            <input
              type="date"
              value={formData.paidDate}
              onChange={(e) => setFormData(prev => ({ ...prev, paidDate: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.paidDate ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'}`}
            />
            {errors.paidDate && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.paidDate}</p>}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Receipt number (one for all)</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={formData.receiptNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, receiptNumber: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Auto-generated if empty"
              />
              <button
                type="button"
                onClick={generateReceiptNumber}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                title="Generate receipt number"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !selectedStudent || feeRows.length === 0}
            className="flex items-center space-x-2 bg-blue-600 dark:bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isLoading ? 'Recording...' : `Record payment${totalToPay > 0 ? ` (${formatCurrency(totalToPay)})` : ''}`}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
