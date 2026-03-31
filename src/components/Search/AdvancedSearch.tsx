import { Download, Edit, Eye, Filter, Phone, Search } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { sortClasses } from '../../utils/sortClasses';
import { SearchFilters, Student } from '../../types';

// Helper function to safely get student display name
function getStudentDisplayName(student: Student & { studentName?: string }): string {
    if (student.studentName && student.studentName.trim()) {
        return student.studentName;
    }
    const parts = [student.firstName, student.middleName, student.lastName].filter(Boolean);
    return parts.join(' ').trim() || '';
}

interface AdvancedSearchProps {
  onStudentClick?: (studentId: string) => void;
}

export function AdvancedSearch({ onStudentClick }: AdvancedSearchProps) {
  const { user } = useAuth();
  const { students, classes, getAttendanceByStudent, getFeesByStudent } = useSchoolData();
  const hideFeeInfo = user?.role === 'teacher';
  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: '',
    className: '',
    section: '',
    medium: '',
    status: '',
    feeStatus: '',
    attendanceRange: { min: 0, max: 100 },
    dateRange: { start: '', end: '' }
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const filteredStudents = students.filter(student => {
    // Basic search
    const studentName = getStudentDisplayName(student);
    const matchesSearch = !filters.searchTerm ||
      studentName.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      student.admissionNumber.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      student.fatherName.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      student.motherName.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      (student.mobileNumber && student.mobileNumber.includes(filters.searchTerm));

    // Class and section filters
    const matchesClass = !filters.className || student.studentClass === filters.className;
    const matchesSection = !filters.section || student.section === filters.section;
    const matchesMedium = !filters.medium || student.medium === filters.medium;
    const matchesStatus = !filters.status || student.status === filters.status;

    // Fee status filter (hidden for teacher)
    let matchesFeeStatus = true;
    if (!hideFeeInfo && filters.feeStatus) {
      const studentFees = getFeesByStudent(student.id);
      const hasPendingFees = studentFees.some(fee => fee.status === 'pending' || fee.status === 'overdue');
      const hasOverdueFees = studentFees.some(fee => fee.status === 'overdue');

      matchesFeeStatus =
        (filters.feeStatus === 'paid' && !hasPendingFees) ||
        (filters.feeStatus === 'pending' && hasPendingFees && !hasOverdueFees) ||
        (filters.feeStatus === 'overdue' && hasOverdueFees);
    }

    // Attendance filter
    let matchesAttendance = true;
    if (filters.dateRange.start && filters.dateRange.end) {
      const attendanceRecords = getAttendanceByStudent(student.id, filters.dateRange);
      const totalRecords = attendanceRecords.length;
      const presentRecords = attendanceRecords.filter(r => r.status === 'present').length;
      const attendancePercentage = totalRecords > 0 ? (presentRecords / totalRecords) * 100 : 0;

      matchesAttendance = attendancePercentage >= filters.attendanceRange.min &&
        attendancePercentage <= filters.attendanceRange.max;
    }

    return matchesSearch && matchesClass && matchesSection && matchesMedium &&
      matchesStatus && matchesFeeStatus && matchesAttendance;
  });

  const handleFilterChange = (field: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      className: '',
      section: '',
      medium: '',
      status: '',
      feeStatus: '',
      attendanceRange: { min: 0, max: 100 },
      dateRange: { start: '', end: '' }
    });
  };

  const exportResults = () => {
    const csvContent = [
      ['Name', 'Admission Number', 'Class', 'Section', 'Father Name', 'Mobile', 'Status'].join(','),
      ...filteredStudents.map(student => [
        getStudentDisplayName(student),
        student.admissionNumber,
        student.studentClass,
        student.section,
        student.fatherName,
        student.mobileNumber || '',
        student.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'search_results.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Advanced Search</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Search and filter students with advanced criteria</p>
        </div>
        <button
          onClick={exportResults}
          disabled={filteredStudents.length === 0}
          className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          <span>Export Results</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        {/* Basic Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name, admission number, parent name, or mobile number..."
            value={filters.searchTerm}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
        </div>

        {/* Advanced Filters Toggle */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
          >
            <Filter className="w-4 h-4" />
            <span>{showAdvanced ? 'Hide' : 'Show'} Advanced Filters</span>
          </button>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Found {filteredStudents.length} of {students.length} students
            </span>
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 underline"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class</label>
              <select
                value={filters.className}
                onChange={(e) => handleFilterChange('className', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
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
                value={filters.section}
                onChange={(e) => handleFilterChange('section', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Sections</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Medium</label>
              <select
                value={filters.medium}
                onChange={(e) => handleFilterChange('medium', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Mediums</option>
                <option value="English">English</option>
                <option value="Telugu">Telugu</option>
                <option value="Hindi">Hindi</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="transferred">Transferred</option>
              </select>
            </div>

            {!hideFeeInfo && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fee Status</label>
                <select
                  value={filters.feeStatus}
                  onChange={(e) => handleFilterChange('feeStatus', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All Fee Status</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Range</label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, start: e.target.value })}
                  className="flex-1 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, end: e.target.value })}
                  className="flex-1 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Attendance Range: {filters.attendanceRange.min}% - {filters.attendanceRange.max}%
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.attendanceRange.min}
                  onChange={(e) => handleFilterChange('attendanceRange', {
                    ...filters.attendanceRange,
                    min: parseInt(e.target.value)
                  })}
                  className="flex-1 accent-blue-500"
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.attendanceRange.max}
                  onChange={(e) => handleFilterChange('attendanceRange', {
                    ...filters.attendanceRange,
                    max: parseInt(e.target.value)
                  })}
                  className="flex-1 accent-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
        {filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Student Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Class & Section
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Parent Contact
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredStudents.map((student) => {
                  const attendanceRecords = getAttendanceByStudent(student.id);
                  const attendancePercentage = attendanceRecords.length > 0 ?
                    (attendanceRecords.filter(r => r.status === 'present').length / attendanceRecords.length) * 100 : 0;

                  const fees = hideFeeInfo ? [] : getFeesByStudent(student.id);
                  const hasPendingFees = fees.some(fee => fee.status === 'pending' || fee.status === 'overdue');

                  return (
                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                              {(getStudentDisplayName(student) || '?').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{getStudentDisplayName(student) || 'Unknown Student'}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{student.admissionNumber}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">DOB: {student.dob ? new Date(student.dob).toLocaleDateString() : 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">Class {student.studentClass}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Section {student.section}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{student.medium} Medium</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{student.fatherName}</p>
                          <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                            <Phone className="w-3 h-3" />
                            <span>{student.mobileNumber}</span>
                          </div>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{student.location}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${student.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                            student.status === 'inactive' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            }`}>
                            {student.status}
                          </span>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            <div>Attendance: {attendancePercentage.toFixed(0)}%</div>
                            {!hideFeeInfo && (
                              <div className={hasPendingFees ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                                Fees: {hasPendingFees ? 'Pending' : 'Clear'}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => onStudentClick?.(student.id)}
                            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="View Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onStudentClick?.(student.id)}
                            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title="Edit Student"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <a
                            href={`tel:${student.mobileNumber}`}
                            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                            title="Call Parent"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Search className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No students found</h3>
            <p className="text-gray-500 dark:text-gray-400">Try adjusting your search criteria or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}