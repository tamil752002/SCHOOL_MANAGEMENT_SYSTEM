import { Award, BookOpen, Download, TrendingUp, Users } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { sortClasses } from '../../utils/sortClasses';

export function ExamReports() {
  const { students, examRecords, exams, classes } = useSchoolData();
  const { user } = useAuth();
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  // Debug logging
  console.log('ExamReports Component - Current user:', user);
  console.log('ExamReports Component - Is this a student view?', user?.role === 'student');

  // For student view, filter only their records
  const isStudent = user?.role === 'student';
  const studentRecord = isStudent ? students.find(s => s.admissionNumber === user?.admissionNumber) : null;
  console.log('ExamReports Component - Found student record:', studentRecord);
  console.log('ExamReports Component - Using student view?', isStudent);

  const filteredRecords = examRecords.filter(record => {
    // For students, only show their own records
    if (isStudent && studentRecord) {
      if (record.studentId !== studentRecord.id) return false;
    }

    const student = students.find(s => s.id === record.studentId);
    const matchesExam = !selectedExam || record.examType === selectedExam;
    const matchesClass = !selectedClass || (student && student.studentClass === selectedClass);
    return matchesExam && matchesClass;
  });

  // Calculate class-wise performance (only for admin view)
  const classPerformance = !isStudent ? classes.map(cls => {
    const classStudents = students.filter(s => s.studentClass === cls.name);
    const classRecords = examRecords.filter(record => {
      const student = students.find(s => s.id === record.studentId);
      return student && student.studentClass === cls.name;
    });

    const totalMarks = classRecords.reduce((sum, record) => sum + record.obtainedMarks, 0);
    const totalMaxMarks = classRecords.reduce((sum, record) => sum + record.maxMarks, 0);
    const averagePercentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;

    const gradeDistribution = classRecords.reduce((acc, record) => {
      acc[record.grade] = (acc[record.grade] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      className: cls.name,
      totalStudents: classStudents.length,
      totalRecords: classRecords.length,
      averagePercentage,
      gradeDistribution
    };
  }) : [];

  // Subject-wise performance
  const subjectPerformance = filteredRecords.reduce((acc, record) => {
    if (!acc[record.subject]) {
      acc[record.subject] = {
        totalMarks: 0,
        totalMaxMarks: 0,
        count: 0,
        grades: {}
      };
    }

    acc[record.subject].totalMarks += record.obtainedMarks;
    acc[record.subject].totalMaxMarks += record.maxMarks;
    acc[record.subject].count += 1;
    acc[record.subject].grades[record.grade] = (acc[record.subject].grades[record.grade] || 0) + 1;

    return acc;
  }, {} as Record<string, any>);

  // Top performers (only for admin view)
  const studentPerformance = !isStudent ? students.map(student => {
    const studentRecords = examRecords.filter(r => r.studentId === student.id);
    const totalMarks = studentRecords.reduce((sum, r) => sum + r.obtainedMarks, 0);
    const totalMaxMarks = studentRecords.reduce((sum, r) => sum + r.maxMarks, 0);
    const percentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;

    return {
      student,
      percentage,
      totalRecords: studentRecords.length
    };
  }).filter(p => p.totalRecords > 0).sort((a, b) => b.percentage - a.percentage) : [];

  // Student's personal performance
  const studentPerformanceByExam = isStudent && studentRecord ?
    exams.map(exam => {
      const studentExamRecords = examRecords.filter(
        r => r.studentId === studentRecord.id && r.examType === exam.name
      );

      const totalMarks = studentExamRecords.reduce((sum, r) => sum + r.obtainedMarks, 0);
      const totalMaxMarks = studentExamRecords.reduce((sum, r) => sum + r.maxMarks, 0);
      const percentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;

      return {
        exam,
        percentage,
        totalRecords: studentExamRecords.length,
        records: studentExamRecords
      };
    }).filter(p => p.totalRecords > 0) : [];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Exam Type</label>
              <select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Exams</option>
                <option value="FA1">FA1</option>
                <option value="FA2">FA2</option>
                <option value="SA1">SA1</option>
                <option value="FA3">FA3</option>
                <option value="FA4">FA4</option>
                <option value="SA2">SA2</option>
                <option value="Annual">Annual</option>
                <option value="Weekend Exam">Weekend Exam</option>
                <option value="General Test">General Test</option>
              </select>
            </div>
            {!isStudent && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All Classes</option>
                  {sortClasses(classes).map(cls => (
                    <option key={cls.name} value={cls.name}>Class {cls.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex space-x-2 ml-auto">
            <button className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
              <Download className="w-4 h-4" />
              <span>Export PDF</span>
            </button>
            <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Records</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{filteredRecords.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <Award className="w-8 h-8 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">A+ Grades</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {filteredRecords.filter(r => r.grade === 'A+').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Average %</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {filteredRecords.length > 0 ?
                  ((filteredRecords.reduce((sum, r) => sum + r.obtainedMarks, 0) /
                    filteredRecords.reduce((sum, r) => sum + r.maxMarks, 0)) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <Users className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pass Rate</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {filteredRecords.length > 0 ?
                  ((filteredRecords.filter(r => r.grade !== 'F').length / filteredRecords.length) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {isStudent ? (
        // Student View - Only show Subject-wise Performance
        <div className="space-y-6">
          {/* Student's Exam Results */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">My Exam Results</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Exam Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Marks</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{record.examType}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{record.subject}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {record.obtainedMarks}/{record.maxMarks}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${record.grade === 'A+' || record.grade === 'A' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                          record.grade === 'B+' || record.grade === 'B' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                            record.grade === 'C' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                              'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }`}>
                          {record.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        No exam records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Subject Performance */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">My Subject Performance</h3>
            <div className="space-y-4">
              {Object.entries(subjectPerformance).map(([subject, data]) => {
                const percentage = (data.totalMarks / data.totalMaxMarks) * 100;
                return (
                  <div key={subject} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">{subject}</h4>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{data.count} records</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">Average: {percentage.toFixed(1)}%</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        Grade: {Object.keys(data.grades).sort()[0] || 'N/A'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-500 dark:bg-green-400 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
              {Object.keys(subjectPerformance).length === 0 && (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  No subject performance data available
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Admin View
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Class Performance */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Class-wise Performance</h3>
            <div className="space-y-4">
              {classPerformance.map((performance, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-900 dark:text-white">Class {performance.className}</h4>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{performance.totalStudents} students</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Records:</span>
                      <span className="font-medium ml-1 text-gray-900 dark:text-gray-100">{performance.totalRecords}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Average:</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400 ml-1">{performance.averagePercentage.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full"
                      style={{ width: `${performance.averagePercentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subject Performance */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Subject-wise Performance</h3>
            <div className="space-y-4">
              {Object.entries(subjectPerformance).map(([subject, data]) => {
                const percentage = (data.totalMarks / data.totalMaxMarks) * 100;
                return (
                  <div key={subject} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">{subject}</h4>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{data.count} records</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">Average: {percentage.toFixed(1)}%</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        A+: {data.grades['A+'] || 0} | A: {data.grades['A'] || 0}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-500 dark:bg-green-400 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Performers */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 lg:col-span-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Top Performers</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Class</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Average %</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Exams</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {studentPerformance.slice(0, 10).map((performance, index) => (
                    <tr key={performance.student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                            index === 1 ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400' :
                              index === 2 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                                'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                            }`}>
                            {index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{performance.student.studentName}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{performance.student.admissionNumber}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                        {performance.student.studentClass}-{performance.student.section}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-lg font-bold text-green-600 dark:text-green-400">{performance.percentage.toFixed(1)}%</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{performance.totalRecords}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}