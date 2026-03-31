import { AlertTriangle, CheckCircle, ChevronLeft, Clock, CreditCard, Download, Layers, Plus, Trash2, Users, X } from 'lucide-react';
import { useState } from 'react';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { calculateFeeStats, getFeeBreakdownByType } from '../../services/FeeService';
import { formatCurrency } from '../../utils/formatCurrency';
import { BulkFeeCollection } from './BulkFeeCollection';
import { FeeAnalytics } from './FeeAnalytics';
import { FeeCollectionForm } from './FeeCollectionForm';
import { MultiFeeCollectionForm } from './MultiFeeCollectionForm';
import { FeeStructureForm } from './FeeStructureForm';
import { FeeStructureTypeSelector } from './FeeStructureTypeSelector';
import { FeeStructureView } from './FeeStructureView';
import { StudentFeeMapping } from './StudentFeeMapping';
import { FeeStructure, FeeRecord } from '../../types';

type ViewState = 'overview' | 'structure' | 'analytics';
type StructureViewState = 'list' | 'type-selector' | 'form' | 'mapping';

export function FeeManagement() {
  const { students, feeRecords, feeStructures, deleteFeeStructure, settings } = useSchoolData();
  const [activeTab, setActiveTab] = useState<ViewState>('overview');
  const [structureViewState, setStructureViewState] = useState<StructureViewState>('list');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStructureType, setSelectedStructureType] = useState<'curriculum' | 'semi_curriculum' | null>(null);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);
  const [showCollectionForm, setShowCollectionForm] = useState(false);
  const [showBulkCollectionForm, setShowBulkCollectionForm] = useState(false);
  const [showMultiFeeForm, setShowMultiFeeForm] = useState(false);
  /** When opening multi-fee form from student breakdown, pass this so the student stays selected after modal closes */
  const [multiFeePreselectedStudentId, setMultiFeePreselectedStudentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const feeStats = calculateFeeStats(feeRecords);
  const feeBreakdown = getFeeBreakdownByType(feeRecords);

  // Group fee records by student
  const groupedFeeRecords = feeRecords.reduce((acc, record) => {
    const studentId = record.studentId;
    if (!acc[studentId]) {
      acc[studentId] = [];
    }
    acc[studentId].push(record);
    return acc;
  }, {} as Record<string, typeof feeRecords>);

  const filteredStudentIds = Object.keys(groupedFeeRecords).filter(studentId => {
    const student = students.find(s => s.id === studentId);
    if (!student) return false;
    const matchesSearch = `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const studentRecords = groupedFeeRecords[studentId];
    const matchesStatus = !filterStatus || studentRecords.some(r => r.status === filterStatus);
    return matchesSearch && matchesStatus;
  });

  const sortedStudentIds = filteredStudentIds.sort((a, b) => {
    const latestA = Math.max(...groupedFeeRecords[a].map(r => new Date(r.dueDate).getTime()));
    const latestB = Math.max(...groupedFeeRecords[b].map(r => new Date(r.dueDate).getTime()));
    return latestB - latestA;
  });

  const handleClassSelect = (className: string) => {
    setSelectedClass(className);
    setStructureViewState('type-selector');
  };

  const handleTypeSelect = (type: 'curriculum' | 'semi_curriculum') => {
    setSelectedStructureType(type);
    const existing = feeStructures.find(
      fs => fs.className === selectedClass && 
            fs.academicYear === settings.currentAcademicYear &&
            fs.structureType === type
    );
    if (existing) {
      setEditingStructure(existing);
    } else {
      setEditingStructure(null);
    }
    setStructureViewState('form');
  };

  const handleStructureSaved = () => {
    setStructureViewState('list');
    setSelectedClass('');
    setSelectedStructureType(null);
    setEditingStructure(null);
  };

  const handleStructureDelete = (structureId: string) => {
    if (window.confirm('Are you sure you want to delete this fee structure? This will also remove all associated fee records.')) {
      deleteFeeStructure(structureId);
      alert('Fee structure deleted successfully!');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'partial': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
      case 'overdue': return <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case 'partial': return <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      default: return <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const renderStudentFeeBreakdown = () => {
    if (!selectedStudentId) return null;

    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return null;

    const studentRecords = groupedFeeRecords[selectedStudentId] || [];
    const { totalAmount, totalCollected: totalPaid, totalPending } = calculateFeeStats(studentRecords);
    const currentYear = settings?.currentAcademicYear || '';

    // Pending from previous years (carry-over)
    const pendingFromPreviousYears = studentRecords.filter(
      r => r.academicYear !== currentYear && ['pending', 'partial', 'overdue'].includes(r.status)
    );

    // Group fees by academic year
    const feesByYear = studentRecords.reduce<Record<string, FeeRecord[]>>((acc, record) => {
      if (!acc[record.academicYear]) {
        acc[record.academicYear] = [];
      }
      acc[record.academicYear].push(record);
      return acc;
    }, {});

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {student.firstName} {student.lastName}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {student.admissionNumber} • Class {student.studentClass}-{student.section}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setMultiFeePreselectedStudentId(selectedStudentId);
                  setShowMultiFeeForm(true);
                  setSelectedStudentId(null);
                }}
                className="flex items-center space-x-2 bg-emerald-600 dark:bg-emerald-500 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm"
              >
                <Layers className="w-4 h-4" />
                <span>Pay multiple fees</span>
              </button>
              <button
                onClick={() => setSelectedStudentId(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Fees</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totalAmount)}</p>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Paid</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalPaid)}</p>
                  </div>
                </div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
                    <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalPending)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending from previous years */}
            {pendingFromPreviousYears.length > 0 && (
              <div className="px-6 pb-6">
                <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800 overflow-hidden">
                  <div className="px-6 py-3 border-b border-amber-200 dark:border-amber-800">
                    <h3 className="text-base font-semibold text-amber-900 dark:text-amber-200">Pending from previous years</h3>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">Carry-over dues; collect when convenient.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-amber-100/50 dark:bg-amber-900/20">
                        <tr>
                          <th className="px-6 py-2 text-left text-xs font-medium text-amber-800 dark:text-amber-200 uppercase">Fee</th>
                          <th className="px-6 py-2 text-left text-xs font-medium text-amber-800 dark:text-amber-200 uppercase">Year</th>
                          <th className="px-6 py-2 text-left text-xs font-medium text-amber-800 dark:text-amber-200 uppercase">Amount / Paid</th>
                          <th className="px-6 py-2 text-left text-xs font-medium text-amber-800 dark:text-amber-200 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-200 dark:divide-amber-800">
                        {pendingFromPreviousYears.map(record => (
                          <tr key={record.id} className="hover:bg-amber-50/50 dark:hover:bg-amber-900/10">
                            <td className="px-6 py-3 font-medium text-gray-900 dark:text-white capitalize">
                              {record.feeType === 'other' && record.description ? record.description : record.feeType}
                            </td>
                            <td className="px-6 py-3">
                              <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-amber-200/80 dark:bg-amber-800/80 text-amber-900 dark:text-amber-100">
                                {record.academicYear}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-sm">
                              ₹{record.amount.toLocaleString()}
                              {record.paidAmount != null && record.paidAmount > 0 && (
                                <span className="text-green-600 dark:text-green-400 ml-1"> (Paid: ₹{record.paidAmount.toLocaleString()})</span>
                              )}
                            </td>
                            <td className="px-6 py-3">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                record.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                record.status === 'partial' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              }`}>
                                {record.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Fee Breakdown by Academic Year */}
            {Object.keys(feesByYear).length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-12 text-center">
                <CreditCard className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Fee Records</h3>
                <p className="text-gray-600 dark:text-gray-400 mt-2">No fee records found for this student.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(feesByYear)
                  .sort(([yearA], [yearB]) => yearB.localeCompare(yearA))
                  .map(([year, records]) => (
                    <div key={year} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                      {/* Year Header */}
                      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-t-xl">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Academic Year: {year}</h3>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {records.length} {records.length === 1 ? 'record' : 'records'}
                          </span>
                        </div>
                      </div>

                      {/* Fee Records Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Fee Type
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Total Amount
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Paid Amount
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Remaining
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Due Date
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Paid Date
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Receipt
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {records.map(record => {
                              const remaining = (record.remainingFee !== undefined) 
                                ? record.remainingFee 
                                : (record.amount - (record.paidAmount || 0));
                              return (
                                <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                  <td className="px-6 py-4">
                                    <div>
                                      <p className="font-medium text-gray-900 dark:text-white capitalize">{record.feeType}</p>
                                      {record.description && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{record.description}</p>
                                      )}
                                      {(record.allocationsFrom?.length ?? 0) > 0 && (
                                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                          Includes {record.allocationsFrom!.map(a => `₹${a.amount.toLocaleString()} from ${a.fromFeeLabel}`).join('; ')} (overpayment applied).
                                        </p>
                                      )}
                                      {(record.allocationsTo?.length ?? 0) > 0 && (
                                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                          ₹{record.allocationsTo!.map(a => `${a.amount.toLocaleString()} applied to ${a.toFeeLabel}`).join('; ')} (overpayment from this fee).
                                        </p>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(record.amount)}</p>
                                  </td>
                                  <td className="px-6 py-4">
                                    <p className="font-medium text-green-600 dark:text-green-400">
                                      {formatCurrency(record.paidAmount || 0)}
                                    </p>
                                  </td>
                                  <td className="px-6 py-4">
                                    <p className="font-medium text-red-600 dark:text-red-400">
                                      {formatCurrency(remaining)}
                                    </p>
                                  </td>
                                  <td className="px-6 py-4">
                                    <p className="text-sm text-gray-900 dark:text-gray-100">{formatDate(record.dueDate)}</p>
                                  </td>
                                  <td className="px-6 py-4">
                                    {record.paidDate ? (
                                      <p className="text-sm text-gray-900 dark:text-gray-100">{formatDate(record.paidDate)}</p>
                                    ) : (
                                      <span className="text-sm text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center space-x-2">
                                      {getStatusIcon(record.status)}
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                                        {record.status}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    {record.receiptNumber ? (
                                      <p className="text-sm text-gray-900 dark:text-gray-100">{record.receiptNumber}</p>
                                    ) : (
                                      <span className="text-sm text-gray-400">-</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Collected</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(feeStats.totalCollected)}</p>
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{formatCurrency(feeStats.totalPending)}</p>
            </div>
          </div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Overdue</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(feeStats.totalOverdue)}</p>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <CreditCard className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Collection Rate</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{feeStats.collectionRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Fee Payments */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Fee Payments</h3>
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-4 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="partial">Partial</option>
            </select>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowBulkCollectionForm(true)}
                className="flex items-center space-x-2 bg-purple-600 dark:bg-purple-500 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Users className="w-4 h-4" />
                <span>Bulk Collection</span>
              </button>
              <button
                onClick={() => setShowMultiFeeForm(true)}
                className="flex items-center space-x-2 bg-emerald-600 dark:bg-emerald-500 text-white px-4 py-3 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Layers className="w-4 h-4" />
                <span>Pay multiple fees</span>
              </button>
              <button
                onClick={() => setShowCollectionForm(true)}
                className="flex items-center space-x-2 bg-blue-600 dark:bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Collect Fee</span>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Student</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Fees</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Paid</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Pending</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sortedStudentIds.slice(0, 10).map((studentId) => {
                const student = students.find(s => s.id === studentId);
                const records = groupedFeeRecords[studentId];
                if (!student) return null;

                const { totalAmount, totalCollected: totalPaid, totalPending } = calculateFeeStats(records);
                const overallStatus = totalPending === 0 ? 'paid' : 
                                     totalPaid > 0 ? 'partial' : 
                                     records.some(r => r.status === 'overdue') ? 'overdue' : 'pending';

                return (
                  <tr 
                    key={studentId} 
                    onClick={() => setSelectedStudentId(studentId)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{student.firstName} {student.lastName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{student.admissionNumber}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Class {student.studentClass}-{student.section}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(totalAmount)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-green-600 dark:text-green-400">{formatCurrency(totalPaid)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-red-600 dark:text-red-400">{formatCurrency(totalPending)}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        overallStatus === 'paid'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : overallStatus === 'partial'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : overallStatus === 'overdue'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fee Breakdown Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Fee Breakdown</h3>
          <button
            onClick={() => setActiveTab('analytics')}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
          >
            View Detailed Analytics
          </button>
        </div>
        <div className="space-y-4">
          {Object.entries(feeBreakdown).map(([feeType, data]) => {
            if (data.total === 0) return null;
            const percentage = data.total > 0 ? (data.paid / data.total) * 100 : 0;
            return (
              <div key={feeType}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {feeType} Fee
                  </span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderFeeStructure = () => {
    if (structureViewState === 'list') {
      return <FeeStructureView onClassSelect={handleClassSelect} />;
    }

    if (structureViewState === 'type-selector') {
      return (
        <FeeStructureTypeSelector
          className={selectedClass}
          onBack={() => {
            setStructureViewState('list');
            setSelectedClass('');
          }}
          onTypeSelect={handleTypeSelect}
        />
      );
    }

    if (structureViewState === 'form') {
      return (
        <div>
          <div className="mb-4">
            <button
              onClick={() => {
                setStructureViewState('type-selector');
                setEditingStructure(null);
              }}
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
          </div>
          <FeeStructureForm
            className={selectedClass}
            structureType={selectedStructureType!}
            editingStructure={editingStructure || undefined}
            onClose={handleStructureSaved}
          />
          {editingStructure && (
            <div className="mt-4 flex space-x-2">
              {editingStructure.structureType === 'semi_curriculum' && (
                <button
                  onClick={() => setStructureViewState('mapping')}
                  className="flex items-center space-x-2 bg-purple-600 dark:bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Users className="w-4 h-4" />
                  <span>Manage Student Mapping</span>
                </button>
              )}
              <button
                onClick={() => handleStructureDelete(editingStructure.id)}
                className="flex items-center space-x-2 bg-red-600 dark:bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Structure</span>
              </button>
            </div>
          )}
        </div>
      );
    }

    if (structureViewState === 'mapping' && editingStructure) {
      return (
        <div>
          <div className="mb-4">
            <button
              onClick={() => setStructureViewState('form')}
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Back to Structure</span>
            </button>
          </div>
          <StudentFeeMapping
            feeStructure={editingStructure}
            onClose={() => setStructureViewState('form')}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Fee Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage fee collection and payment tracking</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center space-x-2 bg-green-600 dark:bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'structure', label: 'Fee Structure' },
              { id: 'analytics', label: 'Analytics' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as ViewState);
                  if (tab.id === 'structure') {
                    setStructureViewState('list');
                    setSelectedClass('');
                    setSelectedStructureType(null);
                    setEditingStructure(null);
                  }
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'structure' && renderFeeStructure()}
      {activeTab === 'analytics' && <FeeAnalytics />}

      {/* Modals */}
      {showCollectionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <FeeCollectionForm
              onClose={() => setShowCollectionForm(false)}
            />
          </div>
        </div>
      )}

      {showBulkCollectionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <BulkFeeCollection
              onClose={() => setShowBulkCollectionForm(false)}
            />
          </div>
        </div>
      )}

      {showMultiFeeForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <MultiFeeCollectionForm
              onClose={() => {
                setShowMultiFeeForm(false);
                setMultiFeePreselectedStudentId(null);
              }}
              initialStudentId={multiFeePreselectedStudentId ?? selectedStudentId ?? undefined}
            />
          </div>
        </div>
      )}

      {/* Student Fee Breakdown Modal */}
      {selectedStudentId && renderStudentFeeBreakdown()}
    </div>
  );
}

