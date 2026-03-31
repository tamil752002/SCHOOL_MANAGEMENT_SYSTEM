import { ArrowUpDown, CircleDollarSign, Download, GraduationCap } from 'lucide-react';
import { useState } from 'react';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { calculateFeeStats, getFeeBreakdownByType, getFeeBreakdownByClass, calculateClassFeeStats, getMonthlyCollectionData } from '../../services/FeeService';
import { formatCurrency } from '../../utils/formatCurrency';
import { sortClasses } from '../../utils/sortClasses';

export function FeeAnalytics() {
  const { feeRecords, students, settings, classes } = useSchoolData();
  const [viewMode, setViewMode] = useState<'fee-wise' | 'class-wise'>('class-wise');
  const [academicYear, setAcademicYear] = useState<string>(settings.currentAcademicYear);

  const feeStats = calculateFeeStats(feeRecords, academicYear);
  const feeBreakdown = getFeeBreakdownByType(feeRecords, academicYear);
  const classBreakdown = getFeeBreakdownByClass(feeRecords, students, academicYear);
  const monthlyData = getMonthlyCollectionData(feeRecords);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Fee Analytics</h3>
        <div className="flex items-center space-x-2">
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value={settings.currentAcademicYear}>{settings.currentAcademicYear}</option>
            <option value={(parseInt(settings.currentAcademicYear) - 1) + ''}>
              {(parseInt(settings.currentAcademicYear) - 1) + ''}
            </option>
          </select>
          <button className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <CircleDollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Fees</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(feeStats.totalAmount)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400">
              <CircleDollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Collected</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(feeStats.totalCollected)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
              <CircleDollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(feeStats.totalPending)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <ArrowUpDown className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Collection Rate</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{feeStats.collectionRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View Mode:</span>
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('class-wise')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'class-wise'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Class-wise
            </button>
            <button
              onClick={() => setViewMode('fee-wise')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'fee-wise'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Fee-wise
            </button>
          </div>
        </div>
      </div>

      {/* Class-wise View */}
      {viewMode === 'class-wise' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortClasses(classes || []).map((classInfo: any, index: number) => {
            const classStats = calculateClassFeeStats(classInfo.name, feeRecords, students, academicYear);

            return (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Class {classInfo.name}
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Fee</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(classStats.totalFee)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Paid Fee</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(classStats.paidFee)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Remaining Fee</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(classStats.remainingFee)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Students</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{classStats.studentCount}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full transition-all"
                      style={{ width: `${classStats.percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Collection Rate</span>
                    <span>{classStats.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fee-wise View */}
      {viewMode === 'fee-wise' && (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Fee Type Breakdown</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    <th className="px-6 py-3">Fee Type</th>
                    <th className="px-6 py-3 text-right">Total</th>
                    <th className="px-6 py-3 text-right">Collected</th>
                    <th className="px-6 py-3 text-right">Pending</th>
                    <th className="px-6 py-3 text-right">Collection %</th>
                    <th className="px-6 py-3">Progress</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {Object.entries(feeBreakdown).map(([feeType, data]) => {
                    if (data.total === 0) return null;
                    const collectionPercentage = data.total > 0 ? (data.paid / data.total) * 100 : 0;
                    return (
                      <tr key={feeType}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="capitalize">{feeType}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {formatCurrency(data.total)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-green-600 dark:text-green-400">
                          {formatCurrency(data.paid)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-red-600 dark:text-red-400">
                          {formatCurrency(data.pending)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {collectionPercentage.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                            <div
                              className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full"
                              style={{ width: `${collectionPercentage}%` }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Collection Trends</h4>
            <div className="h-64">
              <div className="flex items-end h-48 space-x-2">
                {Object.entries(monthlyData).map(([month, amount]) => {
                  const maxAmount = Math.max(...Object.values(monthlyData));
                  const heightPercentage = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
                  const monthNum = month.split('-')[1];
                  return (
                    <div key={month} className="flex flex-col items-center flex-1">
                      <div
                        className="w-full bg-blue-500 dark:bg-blue-600 rounded-t"
                        style={{ height: `${heightPercentage}%` }}
                      ></div>
                      <div className="text-xs mt-2 text-gray-600 dark:text-gray-400">
                        {new Date(2000, parseInt(monthNum) - 1).toLocaleString('default', { month: 'short' })}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        {formatCurrency(amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

