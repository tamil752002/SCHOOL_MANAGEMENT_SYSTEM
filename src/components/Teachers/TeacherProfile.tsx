import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  FileText,
  UserCircle,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { Exam, Teacher, TeacherAttendance, TeacherLeaveApplication } from '../../types';

const getApiBase = () => (import.meta.env.DEV ? window.location.origin : 'http://0.0.0.0:8000');

interface TeacherProfileProps {
  teacher: Teacher;
  onBack: () => void;
}

export function TeacherProfile({ teacher, onBack }: TeacherProfileProps) {
  const { exams, teacherLeaveApplications } = useSchoolData();
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'exams' | 'leaves'>('overview');
  const [attendanceMonth, setAttendanceMonth] = useState(new Date().getMonth());
  const [attendanceYear, setAttendanceYear] = useState(new Date().getFullYear());
  const [teacherAttendance, setTeacherAttendance] = useState<TeacherAttendance[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const formatDateString = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const fetchTeacherAttendance = useCallback(async () => {
    const start = new Date(attendanceYear, attendanceMonth, 1);
    const end = new Date(attendanceYear, attendanceMonth + 1, 0);
    setAttendanceLoading(true);
    try {
      const base = getApiBase();
      const res = await fetch(
        `${base}/api/attendance/teacher?teacherId=${encodeURIComponent(teacher.id)}&from=${formatDateString(start)}&to=${formatDateString(end)}`
      );
      if (res.ok) {
        const data = await res.json();
        setTeacherAttendance(
          Array.isArray(data)
            ? data.map((r: { date: string; session: string; status: string; id: string; teacherId: string; markedAt?: string; markedBy?: string }) => ({
                id: r.id,
                teacherId: r.teacherId,
                date: r.date && typeof r.date === 'string' && r.date.includes('T') ? r.date.split('T')[0] : r.date,
                session: r.session as 'morning' | 'afternoon',
                status: r.status as 'present' | 'absent',
                markedAt: r.markedAt,
                markedBy: r.markedBy,
              }))
            : []
        );
      } else {
        setTeacherAttendance([]);
      }
    } catch {
      setTeacherAttendance([]);
    } finally {
      setAttendanceLoading(false);
    }
  }, [teacher.id, attendanceMonth, attendanceYear]);

  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchTeacherAttendance();
    }
  }, [activeTab, fetchTeacherAttendance]);

  const teacherLeaves = (teacherLeaveApplications || []).filter(
    (a: TeacherLeaveApplication) => a.teacherId === teacher.id
  );

  const teacherClassNames = new Set((teacher.classes || []).map((c) => c.className));
  const teacherSubjectNames = new Set((teacher.subjects || []).map((s) => s.name));
  const teacherSubjectIds = new Set((teacher.subjects || []).map((s) => s.id));

  const examsForTeacher = (exams || []).filter((exam) => {
    const classMatch = teacherClassNames.has(exam.className);
    const examSubjects = exam.subjects && exam.subjects.length > 0 ? exam.subjects : (exam.subject ? [exam.subject] : []);
    const subjectMatch =
      examSubjects.some(
        (s: string) => teacherSubjectNames.has(s) || teacherSubjectIds.has(s)
      );
    return classMatch && subjectMatch;
  });

  const renderOverviewTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Personal & Employment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Full Name</p>
              <p className="font-medium text-gray-900 dark:text-white">{teacher.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
              <p className="font-medium text-gray-900 dark:text-white">{teacher.email || '–'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
              <p className="font-medium text-gray-900 dark:text-white">{teacher.phoneNumber || '–'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Join Date</p>
              <p className="font-medium text-gray-900 dark:text-white">{formatDate(teacher.joinDate || '')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Salary</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {teacher.salary != null ? `₹${Number(teacher.salary).toLocaleString()}` : '–'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
              <p className="font-medium text-gray-900 dark:text-white">{teacher.status || 'active'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Subjects</h3>
          <p className="text-gray-700 dark:text-gray-300">
            {(teacher.subjects || []).map((s) => s.name).join(', ') || '–'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Classes & subjects handled</h3>
          {(teacher.classes || []).length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No class assignments.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-2 text-gray-700 dark:text-gray-300">Class – Section</th>
                    <th className="pb-2 text-gray-700 dark:text-gray-300">Subject</th>
                    <th className="pb-2 text-gray-700 dark:text-gray-300">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {(teacher.classes || []).map((c, idx) => (
                    <tr key={idx} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                      <td className="py-2 text-gray-900 dark:text-white">
                        Class {c.className} – {c.section}
                      </td>
                      <td className="py-2 text-gray-700 dark:text-gray-300">{c.subjectName || '–'}</td>
                      <td className="py-2">
                        {c.isIncharge ? (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            Incharge
                          </span>
                        ) : (
                          '–'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="md:col-span-1">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <UserCircle className="w-12 h-12 text-gray-400" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{teacher.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{teacher.username || '–'}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {(teacher.subjects || []).map((s) => s.name).join(', ') || 'No subjects'}
          </p>
        </div>
      </div>
    </div>
  );

  const renderAttendanceTab = () => {
    const attendanceStartDate = new Date(attendanceYear, attendanceMonth, 1);
    const attendanceEndDate = new Date(attendanceYear, attendanceMonth + 1, 0);
    const norm = (d: string) => (d && d.includes('T') ? d.split('T')[0] : d) || '';

    const presentSessionsMonth = teacherAttendance.filter((r) => r.status === 'present').length;
    const totalSessionsMonth = teacherAttendance.length;
    const monthPercentage = totalSessionsMonth > 0 ? (presentSessionsMonth / totalSessionsMonth) * 100 : 0;
    const absentSessions = teacherAttendance.filter((r) => r.status === 'absent').length;

    const daysInMonth = attendanceEndDate.getDate();
    const firstDayOfMonth = attendanceStartDate.getDay();
    const calendarDays: Array<{
      day: number;
      morningRecord?: TeacherAttendance;
      afternoonRecord?: TeacherAttendance;
    } | null> = [];
    for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateString(new Date(attendanceYear, attendanceMonth, day));
      const morningRecord = teacherAttendance.find((r) => norm(r.date) === dateStr && r.session === 'morning');
      const afternoonRecord = teacherAttendance.find((r) => norm(r.date) === dateStr && r.session === 'afternoon');
      calendarDays.push({ day, morningRecord, afternoonRecord });
    }

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Teacher Attendance</h3>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={attendanceMonth}
              onChange={(e) => setAttendanceMonth(parseInt(e.target.value))}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            >
              {monthNames.map((m, i) => (
                <option key={i} value={i}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={attendanceYear}
              onChange={(e) => setAttendanceYear(parseInt(e.target.value))}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            >
              {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {attendanceLoading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading attendance…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-green-50 dark:bg-green-900/25 rounded-xl p-4 sm:p-5 border border-green-200 dark:border-green-800/50 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-800/50 flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Present sessions</p>
                    <p className="text-lg sm:text-xl font-bold text-green-700 dark:text-green-300">
                      {presentSessionsMonth} <span className="text-xs sm:text-sm font-normal text-gray-500">of {totalSessionsMonth}</span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/25 rounded-xl p-4 sm:p-5 border border-blue-200 dark:border-blue-800/50 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-800/50 flex-shrink-0">
                    <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Month %</p>
                    <p className="text-lg sm:text-xl font-bold text-blue-700 dark:text-blue-300">
                      {monthPercentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/25 rounded-xl p-4 sm:p-5 border border-red-200 dark:border-red-800/50 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100 dark:bg-red-800/50 flex-shrink-0">
                    <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Absent</p>
                    <p className="text-lg sm:text-xl font-bold text-red-700 dark:text-red-300">
                      {absentSessions} <span className="text-xs sm:text-sm font-normal text-gray-500">sessions</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {monthNames[attendanceMonth]} {attendanceYear}
              </p>
              <div className="grid grid-cols-7 gap-2 mb-2">
                {dayNames.map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((cell, idx) => {
                  if (!cell) return <div key={`empty-${idx}`} className="h-14" />;
                  const { day, morningRecord, afternoonRecord } = cell;
                  const currentDate = new Date();
                  const isToday =
                    currentDate.getDate() === day &&
                    currentDate.getMonth() === attendanceMonth &&
                    currentDate.getFullYear() === attendanceYear;
                  const bg = isToday ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-50 dark:bg-gray-700/80';
                  const border = isToday ? 'border-blue-400 dark:border-blue-600' : 'border-gray-200 dark:border-gray-600';
                  return (
                    <div
                      key={day}
                      className={`h-14 min-h-[3.5rem] p-1.5 border rounded-lg ${border} ${bg} flex flex-col shrink-0`}
                    >
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">{day}</span>
                      <div className="flex gap-1 flex-1 min-h-0 mt-1">
                        <div
                          className={`flex-1 min-w-0 rounded ${
                            morningRecord?.status === 'present'
                              ? 'bg-green-500'
                              : morningRecord?.status === 'absent'
                                ? 'bg-red-500'
                                : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                          title="Morning"
                        />
                        <div
                          className={`flex-1 min-w-0 rounded ${
                            afternoonRecord?.status === 'present'
                              ? 'bg-green-500'
                              : afternoonRecord?.status === 'absent'
                                ? 'bg-red-500'
                                : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                          title="Afternoon"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="inline-flex w-4 h-2 rounded bg-green-500" /> Present
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-flex w-4 h-2 rounded bg-red-500" /> Absent
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-flex w-4 h-2 rounded bg-gray-400" /> No record
                </span>
              </div>
            </div>

            {teacherAttendance.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Recent attendance</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {[...teacherAttendance]
                    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                    .slice(0, 8)
                    .map((record) => (
                      <div
                        key={record.id}
                        className="flex justify-between items-center py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-700/80"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {formatDate(record.date)} · {record.session === 'morning' ? 'Morning' : 'Afternoon'}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-sm font-medium ${
                            record.status === 'present' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {record.status === 'present' ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          {record.status === 'present' ? 'Present' : 'Absent'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderExamsTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Exams for classes & subjects handled
        </h3>
        {examsForTeacher.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No exams found for this teacher&apos;s classes and subjects.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-2 text-gray-700 dark:text-gray-300">Type</th>
                  <th className="pb-2 text-gray-700 dark:text-gray-300">Class</th>
                  <th className="pb-2 text-gray-700 dark:text-gray-300">Subjects</th>
                  <th className="pb-2 text-gray-700 dark:text-gray-300">Date range</th>
                  <th className="pb-2 text-gray-700 dark:text-gray-300">Status</th>
                </tr>
              </thead>
              <tbody>
                {examsForTeacher.map((exam: Exam) => (
                  <tr key={exam.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                    <td className="py-2 text-gray-900 dark:text-white">{exam.type || '–'}</td>
                    <td className="py-2 text-gray-700 dark:text-gray-300">Class {exam.className}</td>
                    <td className="py-2 text-gray-700 dark:text-gray-300">
                      {(exam.subjects && exam.subjects.length > 0 ? exam.subjects : exam.subject ? [exam.subject] : []).join(', ') || '–'}
                    </td>
                    <td className="py-2 text-gray-700 dark:text-gray-300">
                      {formatDate(exam.startDate || '')} – {formatDate(exam.endDate || '')}
                    </td>
                    <td className="py-2">
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          exam.status === 'completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : exam.status === 'ongoing'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {exam.status || '–'}
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

  const renderLeavesTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Leave history
        </h3>
        {teacherLeaves.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No leave applications recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-2 text-gray-700 dark:text-gray-300">Type</th>
                  <th className="pb-2 text-gray-700 dark:text-gray-300">From</th>
                  <th className="pb-2 text-gray-700 dark:text-gray-300">To</th>
                  <th className="pb-2 text-gray-700 dark:text-gray-300">Reason</th>
                  <th className="pb-2 text-gray-700 dark:text-gray-300">Status</th>
                  <th className="pb-2 text-gray-700 dark:text-gray-300">Reviewed</th>
                </tr>
              </thead>
              <tbody>
                {[...teacherLeaves]
                  .sort((a, b) => new Date(b.fromDate).getTime() - new Date(a.fromDate).getTime())
                  .map((leave) => (
                    <tr key={leave.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                      <td className="py-2 text-gray-900 dark:text-white capitalize">{leave.leaveType}</td>
                      <td className="py-2 text-gray-700 dark:text-gray-300">{formatDate(leave.fromDate)}</td>
                      <td className="py-2 text-gray-700 dark:text-gray-300">{formatDate(leave.toDate)}</td>
                      <td className="py-2 text-gray-700 dark:text-gray-300">{leave.reason || '–'}</td>
                      <td className="py-2">
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full capitalize ${
                            leave.status === 'approved'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : leave.status === 'rejected'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}
                        >
                          {leave.status}
                        </span>
                      </td>
                      <td className="py-2 text-gray-700 dark:text-gray-300">
                        {leave.reviewedAt ? formatDate(leave.reviewedAt) : '–'}
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
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
        >
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
      </div>

      <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
        {(['overview', 'attendance', 'exams', 'leaves'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg capitalize transition-colors ${
              activeTab === tab ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'attendance' && renderAttendanceTab()}
      {activeTab === 'exams' && renderExamsTab()}
      {activeTab === 'leaves' && renderLeavesTab()}
    </div>
  );
}
