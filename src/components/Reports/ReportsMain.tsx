import { BarChart3, BookOpen, Calendar, Download, FileText, TrendingUp, Users } from 'lucide-react';
import { useState } from 'react';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { ExamReports } from '../Exams/ExamReports';
import { formatCurrency } from '../../utils/formatCurrency';
import { sortClasses } from '../../utils/sortClasses';

export function ReportsMain() {
  const {
    students,
    getStudentStats,
    getAttendanceStats,
    getFeeStats,
    examRecords,
    classes,
    feeRecords
  } = useSchoolData();

  const [selectedReport, setSelectedReport] = useState('overview');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const studentStats = getStudentStats();
  const attendanceStats = getAttendanceStats({ start: dateRange.start, end: dateRange.end });
  const feeStats = getFeeStats();

  const reportTypes = [
    { id: 'overview', label: 'Overview Report', icon: BarChart3 },
    { id: 'attendance', label: 'Attendance Report', icon: Calendar },
    { id: 'academic', label: 'Academic Report', icon: TrendingUp },
    { id: 'exam', label: 'Exam Report', icon: BookOpen },
    { id: 'financial', label: 'Financial Report', icon: FileText },
    { id: 'student', label: 'Student Report', icon: Users }
  ];

  const generatePDF = (reportType: string) => {
    // In a real application, this would generate and download a PDF
    alert(`Generating ${reportType} PDF report...`);
  };

  const generateExcel = (reportType: string) => {
    // In a real application, this would generate and download an Excel file
    alert(`Generating ${reportType} Excel report...`);
  };

  const renderOverviewReport = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Students</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{studentStats.total}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">Active: {studentStats.active}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <Calendar className="w-8 h-8 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Attendance</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{attendanceStats.averageAttendance.toFixed(1)}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">Present: {attendanceStats.totalPresent}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Fee Collection</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{feeStats.collectionRate.toFixed(1)}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">{formatCurrency(feeStats.totalCollected)}</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/30 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <FileText className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Exam Records</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{examRecords.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">Total entries</p>
            </div>
          </div>
        </div>
      </div>

      {/* Class-wise Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Class-wise Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Students</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Attendance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Exam Records</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fee Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {sortClasses(classes).map((cls) => {
                const classStudents = students.filter(s => s.studentClass === cls.name);
                const classAttendance = attendanceStats.byClass[cls.name];
                const classExamRecords = examRecords.filter(record => {
                  const student = students.find(s => s.id === record.studentId);
                  return student && student.studentClass === cls.name;
                });

                return (
                  <tr key={cls.name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">Class {cls.name}</td>
                    <td className="px-6 py-4 text-gray-900 dark:text-gray-300">{classStudents.length}</td>
                    <td className="px-6 py-4">
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        {classAttendance ? classAttendance.percentage.toFixed(1) : 0}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-900 dark:text-gray-300">{classExamRecords.length}</td>
                    <td className="px-6 py-4">
                      <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-medium px-2 py-1 rounded-full">
                        Good
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Monthly Trends</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">Attendance Trend</h4>
            <div className="space-y-3">
              {Array.from({ length: 6 }, (_, i) => {
                const month = new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'short' });
                const percentage = 75 + Math.random() * 20;
                return (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="w-12 text-sm font-medium text-gray-600 dark:text-gray-400">{month}</div>
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-green-500 dark:bg-green-400 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="w-12 text-sm font-medium text-gray-900 dark:text-gray-200 text-right">
                      {percentage.toFixed(0)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">Fee Collection Trend</h4>
            <div className="space-y-3">
              {Array.from({ length: 6 }, (_, i) => {
                const month = new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'short' });
                const amount = 50000 + Math.random() * 100000;
                const maxAmount = 150000;
                return (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="w-12 text-sm font-medium text-gray-600 dark:text-gray-400">{month}</div>
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full"
                          style={{ width: `${(amount / maxAmount) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="w-16 text-sm font-medium text-gray-900 dark:text-gray-200 text-right">
                      ₹{(amount / 1000).toFixed(0)}K
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAttendanceReport = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Attendance Analysis</h3>

        {/* Attendance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
            <h4 className="font-medium text-green-900 dark:text-green-300">Total Present</h4>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{attendanceStats.totalPresent}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-4">
            <h4 className="font-medium text-red-900 dark:text-red-300">Total Absent</h4>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{attendanceStats.totalAbsent}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 dark:text-blue-300">Average Rate</h4>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{attendanceStats.averageAttendance.toFixed(1)}%</p>
          </div>
        </div>

        {/* Class-wise Attendance */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Present</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Absent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Percentage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {Object.entries(attendanceStats.byClass).map(([className, data]) => (
                <tr key={className} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">Class {className}</td>
                  <td className="px-6 py-4 text-green-600 dark:text-green-400 font-medium">{data.present}</td>
                  <td className="px-6 py-4 text-red-600 dark:text-red-400 font-medium">{data.absent}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-green-500 dark:bg-green-400 h-2 rounded-full"
                          style={{ width: `${data.percentage}%` }}
                        ></div>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-gray-200">{data.percentage.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${data.percentage >= 90 ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                      data.percentage >= 75 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' :
                        'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                      }`}>
                      {data.percentage >= 90 ? 'Excellent' : data.percentage >= 75 ? 'Good' : 'Needs Attention'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderFinancialReport = () => {
    // Filter records by date range
    const filteredFeeRecords = feeRecords.filter(record => {
      const recordDate = new Date(record.paidDate || record.dueDate);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      return recordDate >= startDate && recordDate <= endDate;
    });

    // Calculate fee breakdown by type
    const feeBreakdown = filteredFeeRecords.reduce((acc, record) => {
      if (!acc[record.feeType]) {
        acc[record.feeType] = { total: 0, paid: 0, pending: 0 };
      }
      acc[record.feeType].total += record.amount;
      if (record.status === 'paid') {
        acc[record.feeType].paid += record.amount;
      } else if (record.status === 'partial' && record.paidAmount) {
        acc[record.feeType].paid += record.paidAmount;
        acc[record.feeType].pending += (record.amount - record.paidAmount);
      } else {
        acc[record.feeType].pending += record.amount;
      }
      return acc;
    }, {} as Record<string, { total: number; paid: number; pending: number }>);

    // Class-wise collection
    const classWiseStats = classes.map(cls => {
      const classStudents = students.filter(s => s.studentClass === cls.name);
      const classRecords = filteredFeeRecords.filter(record => {
        const student = students.find(s => s.id === record.studentId);
        return student && student.studentClass === cls.name;
      });

      const totalCollected = classRecords
        .filter(r => r.status === 'paid')
        .reduce((sum, r) => sum + (r.paidAmount || r.amount), 0);

      const totalPending = classRecords
        .filter(r => r.status === 'pending' || r.status === 'overdue')
        .reduce((sum, r) => sum + r.amount, 0);

      return {
        className: cls.name,
        totalStudents: classStudents.length,
        totalCollected,
        totalPending,
        collectionRate: totalPending > 0 ? (totalCollected / (totalCollected + totalPending)) * 100 : 100
      };
    });

    const totalCollected = Object.values(feeBreakdown).reduce((sum, data) => sum + data.paid, 0);
    const totalPending = Object.values(feeBreakdown).reduce((sum, data) => sum + data.pending, 0);
    const totalAmount = totalCollected + totalPending;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Collected</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalCollected)}</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Pending</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{formatCurrency(totalPending)}</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Amount</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Collection Rate</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {totalAmount > 0 ? ((totalCollected / totalAmount) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Fee Type Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Fee Type Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fee Type</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Collected</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pending</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Collection %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {Object.entries(feeBreakdown).map(([feeType, data]) => {
                  const collectionPercentage = data.total > 0 ? (data.paid / data.total) * 100 : 0;
                  return (
                    <tr key={feeType} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white capitalize">{feeType}</td>
                      <td className="px-6 py-4 text-right text-gray-900 dark:text-gray-300">{formatCurrency(data.total)}</td>
                      <td className="px-6 py-4 text-right text-green-600 dark:text-green-400">{formatCurrency(data.paid)}</td>
                      <td className="px-6 py-4 text-right text-red-600 dark:text-red-400">{formatCurrency(data.pending)}</td>
                      <td className="px-6 py-4 text-right text-gray-900 dark:text-gray-300">{collectionPercentage.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Class-wise Collection */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Class-wise Collection</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Class</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Students</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Collected</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pending</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Collection %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {sortClasses(classWiseStats.map(c => ({ name: c.className, sections: [], medium: [] }))).map(cls => {
                  const stats = classWiseStats.find(c => c.className === cls.name);
                  if (!stats) return null;
                  return (
                    <tr key={cls.name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">Class {cls.name}</td>
                      <td className="px-6 py-4 text-right text-gray-900 dark:text-gray-300">{stats.totalStudents}</td>
                      <td className="px-6 py-4 text-right text-green-600 dark:text-green-400">{formatCurrency(stats.totalCollected)}</td>
                      <td className="px-6 py-4 text-right text-red-600 dark:text-red-400">{formatCurrency(stats.totalPending)}</td>
                      <td className="px-6 py-4 text-right text-gray-900 dark:text-gray-300">{stats.collectionRate.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderStudentReport = () => {
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedStudent, setSelectedStudent] = useState('');

    const filteredStudents = students.filter(student => {
      const matchesClass = !selectedClass || student.studentClass === selectedClass;
      const matchesStudent = !selectedStudent || student.id === selectedStudent;
      return matchesClass && matchesStudent;
    });

    return (
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Class</label>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedStudent('');
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Classes</option>
                {sortClasses(classes).map(cls => (
                  <option key={cls.name} value={cls.name}>Class {cls.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                disabled={!selectedClass}
              >
                <option value="">All Students</option>
                {filteredStudents.map(student => (
                  <option key={student.id} value={student.id}>{student.studentName} ({student.admissionNumber})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Student Performance Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Student Performance Report</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Class</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Attendance %</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Exam Records</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fee Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {filteredStudents.map(student => {
                  const studentAttendance = getAttendanceStats({ start: dateRange.start, end: dateRange.end });
                  const studentExamCount = examRecords.filter(r => r.studentId === student.id).length;
                  const studentFees = feeRecords.filter(r => r.studentId === student.id);
                  const hasPendingFees = studentFees.some(r => r.status === 'pending' || r.status === 'overdue');
                  
                  return (
                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{student.studentName}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{student.admissionNumber}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-900 dark:text-gray-300">
                        {student.studentClass}-{student.section}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          {studentAttendance.averageAttendance.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-900 dark:text-gray-300">{studentExamCount}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          hasPendingFees 
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' 
                            : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                        }`}>
                          {hasPendingFees ? 'Pending' : 'Clear'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Comprehensive reports and data insights</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex space-x-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => generatePDF(selectedReport)}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </button>
            <button
              onClick={() => generateExcel(selectedReport)}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            return (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all ${selectedReport === report.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
              >
                <Icon className="w-8 h-8 mb-2" />
                <span className="text-sm font-medium text-center">{report.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Report Content */}
      {selectedReport === 'overview' && renderOverviewReport()}
      {selectedReport === 'attendance' && renderAttendanceReport()}
      {selectedReport === 'academic' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Academic Report</h3>
          <p className="text-gray-500 dark:text-gray-400">Detailed academic performance analysis coming soon</p>
        </div>
      )}
      {selectedReport === 'exam' && <ExamReports />}
      {selectedReport === 'financial' && renderFinancialReport()}
      {selectedReport === 'student' && renderStudentReport()}
    </div>
  );
}