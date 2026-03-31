import { AlertTriangle, Calendar, CheckCircle, Clock, CreditCard, Download } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { FeeRecord, Student } from '../../types';
import { calculateFeeStats } from '../../services/FeeService';
import { downloadFeeReceipt, downloadFeeStatusReport } from '../../utils/feeReceiptPdf';

interface StudentFeesProps {
    overrideStudent?: Student | null;
}

export function StudentFees({ overrideStudent }: StudentFeesProps = {}) {
    const { students, getFeesByStudent, settings } = useSchoolData();
    const { user } = useAuth();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

    const studentRecord = overrideStudent ?? students.find(s => s.admissionNumber === user?.admissionNumber);
    const currentYear = settings?.currentAcademicYear || '';

    if (!studentRecord) {
        return (
            <div className="p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Student Record Not Found</h3>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Your student record could not be found. Please contact the administration.</p>
            </div>
        );
    }

    // Get student's fee records
    const allFeeRecords = getFeesByStudent(studentRecord.id);
    const feeRecords = selectedYear === 'all'
        ? allFeeRecords
        : allFeeRecords.filter(record => record.academicYear.includes(selectedYear));

    // Calculate statistics using centralized utility
    const { totalAmount: totalFeesAmount, totalCollected: totalPaidAmount, totalPending: pendingAmount } = calculateFeeStats(feeRecords);

    const paidRecords = feeRecords.filter(r => r.status === 'paid').length;
    const pendingRecords = feeRecords.filter(r => r.status === 'pending' || r.status === 'overdue').length;
    const partialRecords = feeRecords.filter(r => r.status === 'partial').length;

    // Group fee records by academic year
    const feesByYear = feeRecords.reduce<Record<string, FeeRecord[]>>((acc, record) => {
        if (!acc[record.academicYear]) {
            acc[record.academicYear] = [];
        }
        acc[record.academicYear].push(record);
        return acc;
    }, {});

    // Pending from previous years (for "Pending from previous years" subsection)
    const pendingFromPreviousYears = allFeeRecords.filter(
        r => r.academicYear !== currentYear && ['pending', 'partial', 'overdue'].includes(r.status)
    );

    // Get unique academic years for filter
    const academicYears = [...new Set(allFeeRecords.map(r => r.academicYear))].sort();

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
            default: return <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
        }
    };

    const handleDownloadReceipt = (record: FeeRecord) => () => {
        const sameYearRecords = allFeeRecords.filter(r => r.academicYear === record.academicYear);
        downloadFeeReceipt(record, studentRecord, settings, sameYearRecords);
    };

    const handleDownloadAllFeeStatus = () => {
        downloadFeeStatusReport(studentRecord, settings, allFeeRecords);
    };

    return (
        <div className="p-4 sm:p-6 min-w-0 overflow-x-hidden">
            {/* Header */}
            <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">My Fee Status</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm sm:text-base truncate">
                        {((studentRecord as Student & { studentName?: string }).studentName ?? [studentRecord.firstName, studentRecord.lastName].filter(Boolean).join(' ').trim()) || '—'} • Class {studentRecord.studentClass}-{studentRecord.section}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleDownloadAllFeeStatus}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 flex-shrink-0"
                >
                    <Download className="w-4 h-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">Download All Fee Status</span>
                </button>
            </div>

            {/* Academic Year Filter - isolated stacking so native dropdown renders in correct place on mobile */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 mb-6 overflow-visible">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="relative z-[100] isolate">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Academic Year</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="block w-full min-w-0 max-w-[200px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white appearance-none bg-white dark:bg-gray-700"
                            aria-label="Select academic year"
                        >
                            <option value="all">All Years</option>
                            {academicYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    {/* Summary Cards - stack on mobile so Total/Paid/Pending don't overlap */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        <div className="text-center p-3 min-w-0 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                            <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
                            <p className="font-bold text-blue-600 dark:text-blue-400 text-sm sm:text-base truncate" title={`₹${totalFeesAmount.toLocaleString()}`}>₹{totalFeesAmount.toLocaleString()}</p>
                        </div>
                        <div className="text-center p-3 min-w-0 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-1" />
                            <p className="text-xs text-gray-600 dark:text-gray-400">Paid</p>
                            <p className="font-bold text-green-600 dark:text-green-400 text-sm sm:text-base truncate" title={`₹${totalPaidAmount.toLocaleString()}`}>₹{totalPaidAmount.toLocaleString()}</p>
                        </div>
                        <div className="text-center p-3 min-w-0 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 mx-auto mb-1" />
                            <p className="text-xs text-gray-600 dark:text-gray-400">Pending</p>
                            <p className="font-bold text-red-600 dark:text-red-400 text-sm sm:text-base truncate" title={`₹${pendingAmount.toLocaleString()}`}>₹{pendingAmount.toLocaleString()}</p>
                        </div>
                        <div className="text-center p-3 min-w-0 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <Calendar className="w-6 h-6 text-gray-600 dark:text-gray-400 mx-auto mb-1" />
                            <p className="text-xs text-gray-600 dark:text-gray-400">Records</p>
                            <p className="font-bold text-gray-600 dark:text-gray-400">{feeRecords.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pending from previous years */}
            {pendingFromPreviousYears.length > 0 && (
                <div className="mb-6 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800 overflow-hidden">
                    <div className="px-6 py-3 border-b border-amber-200 dark:border-amber-800">
                        <h3 className="text-base font-semibold text-amber-900 dark:text-amber-200">Pending from previous years</h3>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">These dues carry over; pay when convenient.</p>
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
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                                                {record.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Fee Records by Academic Year */}
            {Object.keys(feesByYear).length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 border border-gray-200 dark:border-gray-700 text-center">
                    <CreditCard className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Fee Records</h3>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">No fee records found for the selected period.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(feesByYear)
                        .sort(([yearA], [yearB]) => yearB.localeCompare(yearA))
                        .map(([year, records]) => (
                            <div key={year} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                {/* Year Header */}
                                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-t-xl">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Academic Year: {year}</h3>
                                        <div className="flex items-center space-x-4 text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">
                                                {records.length} {records.length === 1 ? 'record' : 'records'}
                                            </span>
                                            <span className="text-green-600 dark:text-green-400 font-medium">
                                                ₹{records.reduce((sum, r) => {
                                                    if (r.status === 'paid') return sum + r.amount;
                                                    if (r.status === 'partial' && r.paidAmount) return sum + r.paidAmount;
                                                    return sum;
                                                }, 0).toLocaleString()} paid
                                            </span>
                                        </div>
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
                                                    Amount
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Due Date
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Payment Date
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
                                            {records.map(record => (
                                                <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
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
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">₹{record.amount.toLocaleString()}</p>
                                                            {record.paidAmount !== undefined && record.paidAmount > 0 && (
                                                                <p className="text-xs text-green-600 dark:text-green-400">
                                                                    Paid: ₹{record.paidAmount.toLocaleString()}
                                                                </p>
                                                            )}
                                                        </div>
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
                                                            <div>
                                                                <p className="text-sm text-gray-900 dark:text-gray-100">{record.receiptNumber}</p>
                                                                <button
                                                                    type="button"
                                                                    onClick={handleDownloadReceipt(record)}
                                                                    className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                                                                >
                                                                    <Download className="w-3.5 h-3.5" />
                                                                    Download
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-sm text-gray-400">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                </div>
            )}

            {/* Payment Summary */}
            {feeRecords.length > 0 && (
                <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600 dark:text-gray-300">Completed Payments</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{paidRecords}</p>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                            <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600 dark:text-gray-300">Pending Payments</p>
                            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{pendingRecords}</p>
                        </div>
                        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <CreditCard className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600 dark:text-gray-300">Partial Payments</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{partialRecords}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 