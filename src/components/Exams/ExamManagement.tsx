import { BookOpen, Calendar, CheckCircle, Plus, Trash2, TrendingUp, Users } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import DatabaseService from '../../services/DatabaseService';
import { Exam } from '../../types';
import { formatDateOnly, parseDateOnly, todayYMD } from '../../utils/dateHelpers';
import { sortClasses } from '../../utils/sortClasses';
import { ExamForm } from './ExamForm';
import { ExamReports } from './ExamReports';
import { MarksEntry } from './MarksEntry';

type TabId = 'overview' | 'create' | 'marks' | 'report' | 'completed';

export function ExamManagement() {
  const { user } = useAuth();
  const { exams, examRecords, students, classes, addExamFromApi, updateExam, deleteExam } = useSchoolData();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showExamForm, setShowExamForm] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [completedClassFilter, setCompletedClassFilter] = useState<string>('');

  const schoolId = user?.schoolId ?? undefined;

  const today = todayYMD();
  const todayDate = parseDateOnly(today)!;
  const oneWeekFromNow = new Date(todayDate);
  oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

  const upcomingExamsAll = exams.filter(
    (e) => e.startDate > today && e.status === 'scheduled'
  );
  const upcomingWithinWeek = upcomingExamsAll.filter((e) => {
    const start = parseDateOnly(e.startDate);
    return start && start <= oneWeekFromNow && start >= todayDate;
  });
  const ongoingExams = exams.filter((e) => {
    const start = parseDateOnly(e.startDate);
    const end = parseDateOnly(e.endDate);
    return start && end && start <= todayDate && todayDate <= end && e.status === 'ongoing';
  });
  // Completed = past end date OR status is completed (shown only on Completed Exam tab)
  const completedExams = exams.filter((e) => {
    return e.endDate < today || e.status === 'completed';
  });
  // Create Exam tab: only non-completed exams (so no edit/delete for completed ones there)
  const editableExams = exams.filter((e) => !completedExams.includes(e));

  const handleDeleteExam = async (id: string) => {
    if (!window.confirm('Delete this exam? All associated marks will be removed.')) return;
    const ok = await DatabaseService.deleteExam(id);
    if (ok) deleteExam(id);
  };

  const handleFormSave = async (items: (Omit<Exam, 'id'> & { id?: string })[]) => {
    for (const item of items) {
      if (item.id) {
        const updated = await DatabaseService.updateExam(item.id, item);
        if (updated) updateExam(item.id, updated);
      } else {
        const created = await DatabaseService.createExam({ ...item, schoolId } as Omit<Exam, 'id'>);
        if (created) addExamFromApi(created);
      }
    }
    setShowExamForm(false);
    setEditingExam(null);
  };

  const formatDate = (d: string) => formatDateOnly(d);

  const studentName = (s: { firstName: string; lastName?: string }) =>
    `${s.firstName} ${s.lastName || ''}`.trim();

  // Per-class top 2 by overall exam percentage
  const classNames = Array.from(new Set(students.map((s) => s.studentClass)));
  const sortedClassNames = sortClasses(classNames.map((name) => ({ name, sections: [], medium: [] }))).map(
    (c) => c.name
  );
  const recentResultsByClass = sortedClassNames.map((className) => {
    const classStudents = students.filter((s) => s.studentClass === className);
    const withPercentage = classStudents.map((student) => {
      const records = examRecords.filter((r) => r.studentId === student.id);
      const totalObtained = records.reduce((sum, r) => sum + r.obtainedMarks, 0);
      const totalMax = records.reduce((sum, r) => sum + r.maxMarks, 0);
      const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
      return { student, percentage, totalRecords: records.length };
    });
    const withRecords = withPercentage.filter((x) => x.totalRecords > 0);
    const topTwo = [...withRecords].sort((a, b) => b.percentage - a.percentage).slice(0, 2);
    return { className, topTwo };
  });

  const statCards = [
    { title: 'Total Exams', value: exams.length, icon: BookOpen, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { title: 'Upcoming', value: upcomingExamsAll.length, icon: Calendar, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
    { title: 'Ongoing', value: ongoingExams.length, icon: TrendingUp, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { title: 'Completed', value: completedExams.length, icon: Users, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  ];

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'create', label: 'Create Exam' },
    { id: 'marks', label: 'Marks Entry' },
    { id: 'report', label: 'Report' },
    { id: 'completed', label: 'Completed Exam' },
  ];

  const completedExamsFiltered =
    completedClassFilter === ''
      ? completedExams
      : completedExams.filter((e) => e.className === completedClassFilter);
  const completedClassOptions = sortClasses(classes || []).map((c) => c.name);

  const renderOverview = () => (
    <div className="space-y-6">
      {/* 4 stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className={`${stat.bg} rounded-xl p-6`}>
              <div className="flex items-center space-x-3">
                <Icon className={`w-8 h-8 ${stat.color}`} />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Row 1: Ongoing exams | Upcoming exams (within week) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Ongoing Exams</h3>
          {ongoingExams.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No ongoing exams</p>
          ) : (
            <ul className="space-y-3">
              {ongoingExams.map((exam) => (
                <li
                  key={exam.id}
                  className="flex justify-between items-start p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700/50"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{exam.name || exam.type}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Class {exam.className} · {formatDate(exam.startDate)} – {formatDate(exam.endDate)}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-orange-700 dark:text-orange-300">Ongoing</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Upcoming Exams (within a week)</h3>
          {upcomingWithinWeek.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No upcoming exams in the next 7 days</p>
          ) : (
            <ul className="space-y-3">
              {upcomingWithinWeek.map((exam) => (
                <li
                  key={exam.id}
                  className="flex justify-between items-start p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{exam.name || exam.type}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Class {exam.className} · {formatDate(exam.startDate)} – {formatDate(exam.endDate)}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Upcoming</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Row 2: Recent results – top 1 & 2 per class with overall % */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Results – Top 2 by Class</h3>
        {recentResultsByClass.every((c) => c.topTwo.length === 0) ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No exam results yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentResultsByClass.map(
              (c) =>
                c.topTwo.length > 0 && (
                  <div
                    key={c.className}
                    className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-700/30"
                  >
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Class {c.className}</h4>
                    <div className="space-y-2">
                      {c.topTwo.map((item, idx) => (
                        <div
                          key={item.student.id}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="flex items-center gap-2 text-sm">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold">
                              {idx + 1}
                            </span>
                            <span className="text-gray-900 dark:text-white truncate">
                              {studentName(item.student)}
                            </span>
                          </span>
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 shrink-0">
                            {item.percentage.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderCreateExam = () => (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Exams</h2>
        <button
          onClick={() => {
            setEditingExam(null);
            setShowExamForm(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Exam
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {editableExams.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p>No active exams. Create one to get started. Completed exams are on the Completed Exam tab.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name / Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dates</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {editableExams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{exam.name || exam.type}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{exam.type}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{exam.className}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(exam.startDate)} – {formatDate(exam.endDate)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          exam.status === 'ongoing'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                            : exam.status === 'scheduled'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                              : exam.status === 'completed'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {exam.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingExam(exam);
                            setShowExamForm(true);
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteExam(exam.id)}
                          className="text-red-600 dark:text-red-400 hover:underline text-sm flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showExamForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <ExamForm
              key={editingExam?.id ?? 'new'}
              onClose={() => {
                setShowExamForm(false);
                setEditingExam(null);
              }}
              initialData={editingExam}
              onSave={handleFormSave}
            />
          </div>
        </div>
      )}
    </>
  );

  const renderCompletedExam = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by class</label>
        <select
          value={completedClassFilter}
          onChange={(e) => setCompletedClassFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">All classes</option>
          {completedClassOptions.map((name) => (
            <option key={name} value={name}>
              Class {name}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {completedExamsFiltered.length} exam{completedExamsFiltered.length !== 1 ? 's' : ''} completed
          {completedClassFilter ? ` in Class ${completedClassFilter}` : ''}
        </span>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {completedExamsFiltered.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p>
              {completedClassFilter
                ? `No completed exams for Class ${completedClassFilter}`
                : 'No completed exams yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name / Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {completedExamsFiltered.map((exam) => (
                  <tr key={exam.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{exam.name || exam.type}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{exam.type}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{exam.className}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(exam.startDate)} – {formatDate(exam.endDate)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        Completed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Examination Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage exams, marks, and reports</p>
        </div>
      </div>

      {/* Tabs – same style as Fee Management */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
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

      {/* Tab content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'create' && renderCreateExam()}
      {activeTab === 'marks' && <MarksEntry />}
      {activeTab === 'report' && <ExamReports />}
      {activeTab === 'completed' && renderCompletedExam()}
    </div>
  );
}
