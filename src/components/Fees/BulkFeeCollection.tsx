import { AlertTriangle, CheckCircle, CreditCard, RefreshCw, Search, Users, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { formatCurrency } from '../../utils/formatCurrency';
import { sortClasses } from '../../utils/sortClasses';

interface BulkFeeCollectionProps {
  onClose: () => void;
}

export function BulkFeeCollection({ onClose }: BulkFeeCollectionProps) {
  const { students, addFeeRecord, updateFeeRecord, settings, getFeesByStudent, classes } = useSchoolData();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<1 | 2>(1);

  const [formData, setFormData] = useState({
    feeType: 'tuition' as 'tuition' | 'school' | 'exam' | 'van' | 'uniform' | 'books' | 'other',
    amount: 0,
    dueDate: '',
    paidDate: new Date().toISOString().split('T')[0],
    status: 'paid' as 'paid' | 'pending' | 'overdue' | 'partial',
    receiptNumber: '',
    paidAmount: 0,
    description: '',
    academicYear: settings.currentAcademicYear
  });

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = !searchTerm.trim() || 
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = !selectedClass || 
        String(student.studentClass || '').trim().toLowerCase() === String(selectedClass || '').trim().toLowerCase();
      const matchesSection = !selectedSection || 
        String(student.section || '').trim().toLowerCase() === String(selectedSection || '').trim().toLowerCase();
      return matchesSearch && matchesClass && matchesSection;
    });
  }, [students, searchTerm, selectedClass, selectedSection]);

  const availableSections = selectedClass
    ? (classes.find(c => c.name === selectedClass)?.sections || [])
    : [];

  const handleSelectAll = () => {
    setSelectedStudents(filteredStudents.map(student => student.id));
  };

  const handleUnselectAll = () => {
    setSelectedStudents([]);
  };

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const generateBulkReceiptNumbers = () => {
    const prefix = 'RCP';
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear());
    const dateStr = `${day}${month}${year}`;
    const prefixLength = prefix.length;
    const dateLength = 8;
    const timestampLength = 14 - prefixLength - dateLength;
    
    const receiptNumbers: Record<string, string> = {};
    selectedStudents.forEach((studentId, index) => {
      const highResTime = performance.now();
      const millisecondsSinceMidnight = now.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const microseconds = Math.floor((highResTime % 1000) * 1000);
      const nanosecondsSinceMidnight = millisecondsSinceMidnight * 1000000 + microseconds * 1000 + index;
      const nanosecondStr = String(Math.floor(nanosecondsSinceMidnight)).slice(-timestampLength).padStart(timestampLength, '0');
      const uniqueReceipt = `${prefix}${dateStr}${nanosecondStr}`.slice(0, 14).padEnd(14, '0');
      receiptNumbers[studentId] = uniqueReceipt;
    });
    return receiptNumbers;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (selectedStudents.length === 0) {
      newErrors.students = 'Please select at least one student';
    }
    if (formData.amount <= 0) {
      newErrors.amount = 'Fee amount must be greater than 0';
    }
    if (!formData.paidDate) {
      newErrors.paidDate = 'Payment date is required';
    }
    if (!formData.academicYear.trim()) {
      newErrors.academicYear = 'Academic year is required';
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
      const receiptNumbers = generateBulkReceiptNumbers();
      let studentsProcessed = 0;

      for (const studentId of selectedStudents) {
        const studentFees = getFeesByStudent(studentId);
        const existingRecord = studentFees.find(record => 
          record.feeType === formData.feeType &&
          record.academicYear === formData.academicYear &&
          (record.status === 'pending' || record.status === 'overdue' || record.status === 'partial')
        );

        if (existingRecord) {
          const currentPaid = existingRecord.paidAmount || (existingRecord.status === 'paid' ? existingRecord.amount : 0);
          const paidAmount = currentPaid + formData.amount;
          const newStatus = paidAmount >= existingRecord.amount ? 'paid' : 'partial';
          await updateFeeRecord(existingRecord.id, {
            paidAmount,
            paidDate: formData.paidDate,
            status: newStatus,
            receiptNumber: receiptNumbers[studentId]
          });
        } else {
          await addFeeRecord({
            studentId,
            feeType: formData.feeType,
            amount: formData.amount,
            dueDate: formData.dueDate || new Date().toISOString().split('T')[0],
            paidDate: formData.paidDate,
            status: formData.status,
            receiptNumber: receiptNumbers[studentId],
            paidAmount: formData.status === 'paid' ? formData.amount : formData.paidAmount,
            description: formData.description,
            academicYear: formData.academicYear
          });
        }
        studentsProcessed++;
      }

      alert(`Successfully processed payments for ${studentsProcessed} students!`);
      onClose();
    } catch (error) {
      console.error('Error processing bulk fee payment:', error);
      setErrors({ submit: 'Failed to process payments. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStudentSelection = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
          <Search className="w-5 h-5" />
          <span>Select Students</span>
        </h3>
        <div className="flex space-x-2">
          <button type="button" onClick={handleSelectAll} className="text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-md">
            Select All
          </button>
          <button type="button" onClick={handleUnselectAll} className="text-sm bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 px-3 py-1 rounded-md">
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Name or admission number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class</label>
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setSelectedSection('');
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Classes</option>
            {sortClasses(classes).map(cls => (
              <option key={cls.name} value={cls.name}>Class {cls.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Section</label>
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            disabled={!selectedClass}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 ${!selectedClass ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <option value="">All Sections</option>
            {availableSections.map(section => (
              <option key={section} value={section}>{section}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  <input
                    type="checkbox"
                    checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                    onChange={e => e.target.checked ? handleSelectAll() : handleUnselectAll()}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Class</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">No students found</td>
                </tr>
              ) : (
                filteredStudents.map(student => (
                  <tr
                    key={student.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedStudents.includes(student.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                    onClick={() => handleToggleStudent(student.id)}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => handleToggleStudent(student.id)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{student.firstName} {student.lastName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{student.admissionNumber}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {student.studentClass}-{student.section}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-blue-800 dark:text-blue-300">
              {selectedStudents.length} students selected
            </span>
          </div>
          {selectedStudents.length > 0 && (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderFeeConfiguration = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
          <CreditCard className="w-5 h-5" />
          <span>Configure Fee Payment</span>
        </h3>
        <button type="button" onClick={() => setStep(1)} className="text-gray-600 dark:text-gray-400 hover:text-gray-800">
          Back to Student Selection
        </button>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Selected Students</h4>
        <div className="flex flex-wrap gap-2">
          {selectedStudents.map(studentId => {
            const student = students.find(s => s.id === studentId);
            if (!student) return null;
            return (
              <div key={studentId} className="bg-white dark:bg-gray-700 rounded-md px-2 py-1 text-xs">
                {student.firstName} {student.lastName}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
        <h4 className="font-medium text-gray-900 dark:text-white mb-4">Payment Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fee Type *</label>
            <select
              value={formData.feeType}
              onChange={(e) => setFormData(prev => ({ ...prev, feeType: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="tuition">Tuition Fee</option>
              <option value="school">School Fee</option>
              <option value="exam">Exam Fee</option>
              <option value="books">Books Fee</option>
              <option value="uniform">Uniform Fee</option>
              <option value="van">Van Fee</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₹</span>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 ${errors.amount ? 'border-red-300 dark:border-red-600' : ''}`}
                min="0"
                step="0.01"
              />
            </div>
            {errors.amount && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.amount}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Date *</label>
            <input
              type="date"
              value={formData.paidDate}
              onChange={(e) => setFormData(prev => ({ ...prev, paidDate: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 ${errors.paidDate ? 'border-red-300 dark:border-red-600' : ''}`}
            />
            {errors.paidDate && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.paidDate}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Academic Year *</label>
            <input
              type="text"
              value={formData.academicYear}
              onChange={(e) => setFormData(prev => ({ ...prev, academicYear: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 ${errors.academicYear ? 'border-red-300 dark:border-red-600' : ''}`}
              placeholder="e.g., 2023-24"
            />
            {errors.academicYear && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.academicYear}</p>}
          </div>
        </div>
      </div>

      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
        <h4 className="font-medium text-green-800 dark:text-green-300 mb-4">Payment Summary</h4>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Number of Students:</span>
            <span className="font-medium text-gray-900 dark:text-white">{selectedStudents.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Amount per Student:</span>
            <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(formData.amount)}</span>
          </div>
          <div className="pt-3 border-t border-green-200 dark:border-green-700 flex justify-between">
            <span className="font-medium text-green-800 dark:text-green-300">Total Amount:</span>
            <span className="font-bold text-green-800 dark:text-green-300 text-lg">
              {formatCurrency(selectedStudents.length * formData.amount)}
            </span>
          </div>
        </div>
      </div>

      {errors.submit && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div className="text-sm text-red-700 dark:text-red-400">{errors.submit}</div>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-4">
        <button type="button" onClick={() => setStep(1)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading}
          className="flex items-center space-x-2 bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>Complete Payment</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Bulk Fee Collection</h2>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      {step === 1 ? renderStudentSelection() : renderFeeConfiguration()}
    </div>
  );
}

