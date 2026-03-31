import { AlertTriangle, CreditCard, RefreshCw, Save, Search, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { FeeRecord } from '../../types';
import { calculateFeeStats, validateFeeRecord, getFeeBreakdownByType } from '../../services/FeeService';
import { formatCurrency } from '../../utils/formatCurrency';

interface FeeCollectionFormProps {
  onClose: () => void;
  editingRecord?: FeeRecord;
}

export function FeeCollectionForm({ onClose, editingRecord }: FeeCollectionFormProps) {
  const { students, addFeeRecord, settings, getFeesByStudent, updateFeeRecord, feeStructures } = useSchoolData();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string>(editingRecord?.studentId || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    feeType: (editingRecord
      ? (editingRecord.feeType === 'other' && editingRecord.description
        ? `other__${editingRecord.description}`
        : editingRecord.feeType)
      : 'tuition') as string,
    amount: editingRecord?.amount || 0,
    dueDate: editingRecord?.dueDate || '',
    paidDate: editingRecord?.paidDate || new Date().toISOString().split('T')[0],
    status: (editingRecord?.status || 'paid') as 'paid' | 'pending' | 'overdue' | 'partial',
    receiptNumber: editingRecord?.receiptNumber || '',
    paidAmount: editingRecord?.paidAmount || 0,
    description: editingRecord?.description || '',
    academicYear: editingRecord?.academicYear || settings.currentAcademicYear
  });

  useEffect(() => {
    if (editingRecord) {
      setSelectedStudent(editingRecord.studentId);
      setFormData({
        feeType: editingRecord.feeType === 'other' && editingRecord.description
          ? `other__${editingRecord.description}`
          : editingRecord.feeType,
        amount: editingRecord.amount,
        dueDate: editingRecord.dueDate,
        paidDate: editingRecord.paidDate || new Date().toISOString().split('T')[0],
        status: editingRecord.status,
        receiptNumber: editingRecord.receiptNumber || '',
        paidAmount: editingRecord.paidAmount || 0,
        description: editingRecord.description || '',
        academicYear: editingRecord.academicYear
      });
    }
  }, [editingRecord]);

  // Auto-generate receipt number when status is 'paid'
  useEffect(() => {
    if (formData.status === 'paid' && !editingRecord && !formData.receiptNumber) {
      generateReceiptNumber();
    }
  }, [formData.status, editingRecord]);

  const filteredStudents = students.filter(student => {
    const fullName = `${student.firstName || ''} ${student.lastName || ''}`.trim();
    return (fullName.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
           (student.admissionNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase());
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedStudent) {
      newErrors.student = 'Please select a student';
    }

    if (formData.amount <= 0) {
      newErrors.amount = 'Fee amount must be greater than 0';
    }

    if (!formData.academicYear.trim()) {
      newErrors.academicYear = 'Academic year is required';
    }

    const selectedStudentData = students.find(s => s.id === selectedStudent);
    const structure = selectedStudentData ? feeStructures.find(
      fs => fs.className === selectedStudentData.studentClass &&
        fs.academicYear === formData.academicYear
    ) : null;

    const validation = validateFeeRecord(
      { ...formData, feeType: resolvedFeeType, description: resolvedDescription },
      structure
    );
    if (!validation.valid) {
      newErrors.validation = validation.error || 'Invalid fee record';
    }

    if (formData.status === 'paid') {
      if (!formData.paidDate) {
        newErrors.paidDate = 'Payment date is required for paid status';
      }
    }

    if (formData.status === 'partial') {
      if (formData.paidAmount <= 0) {
        newErrors.paidAmount = 'Paid amount must be greater than 0 for partial payment';
      }
      if (formData.paidAmount >= formData.amount) {
        newErrors.paidAmount = 'Paid amount cannot be greater than or equal to total amount for partial payment';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    const feeTypeForSubmit = formData.feeType.startsWith('other__')
      ? 'other' as const
      : (formData.feeType as 'tuition' | 'school' | 'van' | 'books' | 'uniform' | 'exam' | 'other');
    const descriptionForSubmit = formData.feeType.startsWith('other__')
      ? formData.feeType.slice(7)
      : formData.description;

    try {
      if (editingRecord) {
        await updateFeeRecord(editingRecord.id, {
          feeType: feeTypeForSubmit,
          amount: formData.amount,
          dueDate: formData.dueDate,
          paidDate: formData.status === 'paid' || formData.status === 'partial' ? formData.paidDate : undefined,
          status: formData.status,
          receiptNumber: formData.receiptNumber || undefined,
          paidAmount: formData.status === 'paid' ? formData.amount :
            formData.status === 'partial' ? formData.paidAmount : undefined,
          description: descriptionForSubmit || undefined,
          academicYear: formData.academicYear
        });
        alert('Fee record updated successfully!');
        onClose();
        return;
      }

      const studentFees = getFeesByStudent(selectedStudent);
      const existingRecord = studentFees.find(
        record => record.feeType === feeTypeForSubmit &&
          record.academicYear === formData.academicYear &&
          (record.status === 'pending' || record.status === 'overdue' || record.status === 'partial') &&
          (feeTypeForSubmit !== 'other' || (record.description || '') === (descriptionForSubmit || ''))
      );

      if (existingRecord) {
        const newPaymentAmount = formData.status === 'paid' ? formData.amount :
          formData.status === 'partial' ? formData.paidAmount : 0;
        const currentPaid = existingRecord.paidAmount || (existingRecord.status === 'paid' ? existingRecord.amount : 0);
        const totalPaid = currentPaid + newPaymentAmount;
        const newStatus = totalPaid >= existingRecord.amount ? 'paid' : 'partial';

        await updateFeeRecord(existingRecord.id, {
          paidAmount: totalPaid,
          paidDate: formData.paidDate,
          status: newStatus,
          receiptNumber: formData.receiptNumber || existingRecord.receiptNumber,
          description: descriptionForSubmit || existingRecord.description
        });
        alert('Fee payment updated successfully!');
      } else {
        const feeData = {
          studentId: selectedStudent,
          ...formData,
          feeType: feeTypeForSubmit,
          description: descriptionForSubmit || formData.description,
          paidAmount: formData.status === 'paid' ? formData.amount : formData.paidAmount
        };
        await addFeeRecord(feeData);
        alert('Fee payment recorded successfully!');
      }

      onClose();
    } catch (error) {
      console.error('Error recording fee payment:', error);
      setErrors({ submit: 'Failed to record fee payment. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
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
    handleChange('receiptNumber', receiptNumber);
  };

  const selectedStudentData = students.find(s => s.id === selectedStudent);
  const studentFeeRecords = selectedStudent ? getFeesByStudent(selectedStudent) : [];
  const feeStats = calculateFeeStats(studentFeeRecords, formData.academicYear);
  const feeBreakdown = getFeeBreakdownByType(studentFeeRecords, formData.academicYear);

  const feeTypeLabels: Record<string, string> = {
    tuition: 'Tuition Fee',
    school: 'School Fee',
    exam: 'Exam Fee',
    books: 'Books Fee',
    uniform: 'Uniform Fee',
    van: 'Van Fee',
    other: 'Other'
  };

  // Build dropdown options: standard types with total > 0 for this student + each named "other" fee
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

  const feeTypeOptions: { value: string; label: string }[] = [];
  const standardTypes = ['tuition', 'school', 'van', 'books', 'uniform', 'exam'] as const;
  if (selectedStudentData) {
    standardTypes.forEach(type => {
      const data = feeBreakdown[type];
      if (data && data.total > 0) {
        feeTypeOptions.push({ value: type, label: feeTypeLabels[type] || type });
      }
    });
    Object.entries(otherFeesByDescription)
      .filter(([_, data]) => data.total > 0)
      .forEach(([description]) => {
        feeTypeOptions.push({ value: `other__${description}`, label: `${description} (other)` });
      });
  }
  if (feeTypeOptions.length === 0) {
    standardTypes.forEach(type => {
      feeTypeOptions.push({ value: type, label: feeTypeLabels[type] || type });
    });
    feeTypeOptions.push({ value: 'other', label: 'Other' });
  }

  const resolvedFeeType = formData.feeType.startsWith('other__')
    ? 'other' as const
    : formData.feeType as 'tuition' | 'school' | 'van' | 'books' | 'uniform' | 'exam' | 'other';
  const resolvedDescription = formData.feeType.startsWith('other__')
    ? formData.feeType.slice(7)
    : formData.description;
  const selectedBreakdown = formData.feeType.startsWith('other__')
    ? otherFeesByDescription[formData.feeType.slice(7)]
    : feeBreakdown[formData.feeType];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {editingRecord ? 'Update Fee Record' : 'Fee Collection'}
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
        {/* Student Selection */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            <Search className="w-5 h-5" />
            <span>Select Student</span>
          </h3>

          {!editingRecord && (
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
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Select Student *
            </label>
            <select
              value={selectedStudent}
              onChange={(e) => {
                setSelectedStudent(e.target.value);
                if (errors.student) {
                  setErrors(prev => ({ ...prev, student: '' }));
                }
              }}
              disabled={!!editingRecord}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.student ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                } ${editingRecord ? 'opacity-70 cursor-not-allowed' : ''}`}
              required
            >
              <option value="">Choose a student</option>
              {filteredStudents.map(student => {
                const fullName = `${student.firstName} ${student.lastName}`.trim();
                return (
                  <option key={student.id} value={student.id}>
                    {fullName} ({student.admissionNumber}) - Class {student.studentClass}
                  </option>
                );
              })}
            </select>
            {errors.student && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.student}</p>}
          </div>

          {selectedStudentData && (
            <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-3">Fee Breakdown by Type</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-blue-200 dark:border-blue-700">
                      <th className="text-left py-2 px-2 font-medium text-blue-900 dark:text-blue-300">Fee Type</th>
                      <th className="text-right py-2 px-2 font-medium text-blue-900 dark:text-blue-300">Total</th>
                      <th className="text-right py-2 px-2 font-medium text-blue-900 dark:text-blue-300">Paid</th>
                      <th className="text-right py-2 px-2 font-medium text-blue-900 dark:text-blue-300">Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const rows: JSX.Element[] = [];
                      // Process non-other fee types
                      Object.entries(feeBreakdown)
                        .filter(([feeType, data]) => feeType !== 'other' && data.total > 0)
                        .forEach(([feeType, data]) => {
                          rows.push(
                            <tr key={feeType} className="border-b border-blue-100 dark:border-blue-800/50">
                              <td className="py-2 px-2 text-gray-700 dark:text-gray-300">{feeTypeLabels[feeType] || feeType}</td>
                              <td className="py-2 px-2 text-right text-blue-700 dark:text-blue-400 font-medium">{formatCurrency(data.total)}</td>
                              <td className="py-2 px-2 text-right text-green-600 dark:text-green-400 font-medium">{formatCurrency(data.paid)}</td>
                              <td className={`py-2 px-2 text-right font-medium ${data.pending > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                {formatCurrency(data.pending)}
                              </td>
                            </tr>
                          );
                        });
                      // Add rows for each other fee description (using shared otherFeesByDescription)
                      Object.entries(otherFeesByDescription)
                        .filter(([_, data]) => data.total > 0)
                        .forEach(([description, data]) => {
                          rows.push(
                            <tr key={`other-${description}`} className="border-b border-blue-100 dark:border-blue-800/50">
                              <td className="py-2 px-2 text-gray-700 dark:text-gray-300">
                                <div className="flex flex-col">
                                  <span>{description}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">(other)</span>
                                </div>
                              </td>
                              <td className="py-2 px-2 text-right text-blue-700 dark:text-blue-400 font-medium">{formatCurrency(data.total)}</td>
                              <td className="py-2 px-2 text-right text-green-600 dark:text-green-400 font-medium">{formatCurrency(data.paid)}</td>
                              <td className={`py-2 px-2 text-right font-medium ${data.pending > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                {formatCurrency(data.pending)}
                              </td>
                            </tr>
                          );
                        });
                      return rows;
                    })()}
                    <tr className="border-t-2 border-blue-300 dark:border-blue-600 font-semibold">
                      <td className="py-2 px-2 text-blue-900 dark:text-blue-300">Total</td>
                      <td className="py-2 px-2 text-right text-blue-700 dark:text-blue-400">{formatCurrency(feeStats.totalAmount)}</td>
                      <td className="py-2 px-2 text-right text-green-600 dark:text-green-400">{formatCurrency(feeStats.totalCollected)}</td>
                      <td className={`py-2 px-2 text-right ${feeStats.totalPending > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {formatCurrency(feeStats.totalPending)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Fee Details */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <span>Fee Details</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fee Type *
              </label>
              <select
                value={formData.feeType}
                onChange={(e) => handleChange('feeType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                {feeTypeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₹</span>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
                  className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.amount ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              {errors.amount && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.amount}</p>}
              {selectedStudentData && selectedBreakdown && (
                <div className="mt-2 text-xs space-y-1">
                  <div className="flex flex-wrap items-center gap-1 text-gray-600 dark:text-gray-400">
                    <span className="text-blue-600 dark:text-blue-400 font-medium">Total: {formatCurrency(selectedBreakdown.total)}</span>
                    <span className="text-gray-500 dark:text-gray-500">-</span>
                    <span className="text-green-600 dark:text-green-400 font-medium">Paid: {formatCurrency(selectedBreakdown.paid)}</span>
                    <span className="text-gray-500 dark:text-gray-500">-</span>
                    <span className="text-orange-600 dark:text-orange-400 font-medium">Now Paying: {formatCurrency(formData.amount)}</span>
                    <span className="text-gray-500 dark:text-gray-500">=</span>
                    <span className={`font-semibold ${
                      (selectedBreakdown.total - selectedBreakdown.paid - formData.amount) > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      Remaining: {formatCurrency(Math.max(0, selectedBreakdown.total - selectedBreakdown.paid - formData.amount))}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial Payment</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Academic Year *
              </label>
              <input
                type="text"
                value={formData.academicYear}
                onChange={(e) => handleChange('academicYear', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.academicYear ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                placeholder="e.g., 2023-24"
                required
              />
              {errors.academicYear && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.academicYear}</p>}
            </div>

            {['pending', 'overdue'].includes(formData.status) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Due Date *
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleChange('dueDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            )}

            {['paid', 'partial'].includes(formData.status) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={formData.paidDate}
                  onChange={(e) => handleChange('paidDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            )}

            {formData.status === 'paid' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Receipt Number
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={formData.receiptNumber}
                    onChange={(e) => handleChange('receiptNumber', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter receipt number"
                  />
                  <button
                    type="button"
                    onClick={generateReceiptNumber}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                    title="Generate Receipt Number"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {formData.status === 'partial' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Paid Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₹</span>
                  <input
                    type="number"
                    value={formData.paidAmount}
                    onChange={(e) => handleChange('paidAmount', parseFloat(e.target.value) || 0)}
                    className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.paidAmount ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    min="0"
                    max={formData.amount}
                    step="0.01"
                  />
                </div>
                {errors.paidAmount && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.paidAmount}</p>}
                {formData.amount > 0 && formData.paidAmount > 0 && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Remaining: {formatCurrency(formData.amount - formData.paidAmount)}
                  </p>
                )}
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={3}
                placeholder="Additional notes or description..."
              />
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
            disabled={isLoading || !selectedStudent}
            className="flex items-center space-x-2 bg-blue-600 dark:bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isLoading ? 'Recording...' : 'Record Payment'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

