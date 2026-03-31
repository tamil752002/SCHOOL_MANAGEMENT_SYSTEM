import {
  Activity,
  CheckCircle,
  FileText,
  ListTodo,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { StudentLeaveApplication, TeacherLeaveApplication } from '../../types';

const getApiBase = () => (import.meta.env.DEV ? window.location.origin : 'http://0.0.0.0:8000');

function formatDate(s: string) {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function LeaveManagement() {
  const { user } = useAuth();
  const {
    teacherLeaveApplications,
    studentLeaveApplications,
    refreshLeaveData,
  } = useSchoolData();
  const schoolId = (user as { schoolId?: string })?.schoolId;
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Teacher leave tabs
  const [teacherTab, setTeacherTab] = useState<'latest' | 'checked'>('latest');
  const teacherPending = useMemo(
    () => teacherLeaveApplications.filter(a => a.status === 'pending'),
    [teacherLeaveApplications]
  );
  const teacherChecked = useMemo(
    () => teacherLeaveApplications.filter(a => a.status !== 'pending'),
    [teacherLeaveApplications]
  );

  // Student leave tabs and filters (same as teacher panel)
  const [studentTab, setStudentTab] = useState<'latest' | 'checked'>('latest');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const studentLatest = useMemo(
    () => studentLeaveApplications.filter(a => a.status === 'pending'),
    [studentLeaveApplications]
  );
  const studentCheckedRaw = useMemo(
    () => studentLeaveApplications.filter(a => a.status !== 'pending'),
    [studentLeaveApplications]
  );
  const studentChecked = useMemo(() => {
    let list = [...studentCheckedRaw];
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      list = list.filter(
        a =>
          (a.studentName || '').toLowerCase().includes(term) ||
          (a.studentId || '').toLowerCase().includes(term)
      );
    }
    if (filterMonth) {
      const [y, m] = filterMonth.split('-').map(Number);
      list = list.filter(a => {
        const d = new Date(a.fromDate);
        return d.getFullYear() === y && d.getMonth() + 1 === m;
      });
    }
    if (filterDateFrom) {
      const from = new Date(filterDateFrom);
      list = list.filter(a => new Date(a.fromDate) >= from);
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo);
      list = list.filter(a => new Date(a.toDate) <= to);
    }
    return list.sort((a, b) => new Date(b.fromDate).getTime() - new Date(a.fromDate).getTime());
  }, [studentCheckedRaw, searchTerm, filterMonth, filterDateFrom, filterDateTo]);

  useEffect(() => {
    if (schoolId) refreshLeaveData(schoolId);
  }, [schoolId, refreshLeaveData]);

  const handleReviewTeacher = async (id: string, status: 'approved' | 'rejected') => {
    setLoadingId(id);
    try {
      const base = getApiBase();
      await fetch(`${base}/api/leave/teacher-applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reviewedBy: user?.id }),
      });
      if (schoolId) await refreshLeaveData(schoolId);
    } catch (e) {
      console.error(e);
      alert('Failed to update leave');
    } finally {
      setLoadingId(null);
    }
  };

  const handleReviewStudent = async (id: string, status: 'approved' | 'rejected') => {
    setLoadingId(id);
    try {
      await fetch(`${getApiBase()}/api/leave/student-applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reviewedBy: user?.id }),
      });
      if (schoolId) await refreshLeaveData(schoolId);
    } catch (e) {
      console.error(e);
      alert('Failed to update leave');
    } finally {
      setLoadingId(null);
    }
  };

  const monthOptions = (() => {
    const opts: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      opts.push({ value, label: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) });
    }
    return opts;
  })();

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="w-8 h-8" />
          Leave Management
        </h1>
        <button
          onClick={() => schoolId && refreshLeaveData(schoolId)}
          className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Window 1: Teacher leave applications (same pattern as student leave in teacher panel) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex justify-between items-center px-6 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex border-b border-transparent -mb-[1px]">
            <button
              type="button"
              onClick={() => setTeacherTab('latest')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                teacherTab === 'latest'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <ListTodo className="w-4 h-4 shrink-0" />
              Latest ({teacherPending.length})
            </button>
            <button
              type="button"
              onClick={() => setTeacherTab('checked')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                teacherTab === 'checked'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <CheckCircle className="w-4 h-4 shrink-0" />
              Checked ({teacherChecked.length})
            </button>
          </div>
        </div>
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Teacher leave applications
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {teacherTab === 'latest'
              ? 'Approve or reject to move to Checked.'
              : 'Previously approved or rejected applications.'}
          </p>
        </div>
        {teacherTab === 'latest' && (
          <>
            {teacherPending.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No pending teacher leave applications.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Teacher</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">From</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">To</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Reason</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {teacherPending.map((app: TeacherLeaveApplication) => (
                      <tr key={app.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {app.teacherName || app.teacherId}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 capitalize">{app.leaveType}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{app.fromDate}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{app.toDate}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">{app.reason || '–'}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => handleReviewTeacher(app.id, 'approved')}
                            disabled={loadingId === app.id}
                            className="text-green-600 dark:text-green-400 hover:underline text-sm disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReviewTeacher(app.id, 'rejected')}
                            disabled={loadingId === app.id}
                            className="text-red-600 dark:text-red-400 hover:underline text-sm disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        {teacherTab === 'checked' && (
          <>
            {teacherChecked.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No checked teacher leave applications yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Teacher</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">From</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">To</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Reason</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {teacherChecked.map((app: TeacherLeaveApplication) => (
                      <tr key={app.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {app.teacherName || app.teacherId}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 capitalize">{app.leaveType}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{formatDate(app.fromDate)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{formatDate(app.toDate)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={app.reason || ''}>{app.reason || '–'}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${
                              app.status === 'approved'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            }`}
                          >
                            {app.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Window 2: Student leave applications (same as teacher panel Student Leaves) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex justify-between items-center px-6 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex border-b border-transparent -mb-[1px]">
            <button
              type="button"
              onClick={() => setStudentTab('latest')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                studentTab === 'latest'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <ListTodo className="w-4 h-4 shrink-0" />
              Latest ({studentLatest.length})
            </button>
            <button
              type="button"
              onClick={() => setStudentTab('checked')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                studentTab === 'checked'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <CheckCircle className="w-4 h-4 shrink-0" />
              Checked ({studentCheckedRaw.length})
            </button>
          </div>
        </div>
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Student leave applications
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {studentTab === 'latest'
              ? 'Approve or reject to move to Checked.'
              : 'Previously approved or rejected applications. Use filters to search.'}
          </p>
        </div>
        {studentTab === 'latest' && (
          <>
            {studentLatest.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">No pending student leaves.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Class</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">From – To</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Reason</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {studentLatest.map((app: StudentLeaveApplication) => (
                      <tr key={app.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{app.studentName || app.studentId}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{app.studentClass}-{app.section}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 capitalize">{app.leaveType}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{formatDate(app.fromDate)} – {formatDate(app.toDate)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={app.reason || ''}>{app.reason || '–'}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => handleReviewStudent(app.id, 'approved')}
                            disabled={loadingId === app.id}
                            className="text-green-600 dark:text-green-400 hover:underline text-sm disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReviewStudent(app.id, 'rejected')}
                            disabled={loadingId === app.id}
                            className="text-red-600 dark:text-red-400 hover:underline text-sm disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        {studentTab === 'checked' && (
          <>
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by student name or ID..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <select
                  value={filterMonth}
                  onChange={e => setFilterMonth(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All months</option>
                  {monthOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={e => setFilterDateFrom(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                  title="From date"
                />
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={e => setFilterDateTo(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                  title="To date"
                />
              </div>
            </div>
            {studentChecked.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                {studentCheckedRaw.length === 0 ? 'No checked leaves yet.' : 'No matches for the current filters.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Class</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">From – To</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Reason</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Reviewed by</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {studentChecked.map((app: StudentLeaveApplication) => (
                      <tr key={app.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{app.studentName || app.studentId}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{app.studentClass}-{app.section}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 capitalize">{app.leaveType}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{formatDate(app.fromDate)} – {formatDate(app.toDate)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={app.reason || ''}>{app.reason || '–'}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${
                              app.status === 'approved'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            }`}
                          >
                            {app.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                          {app.reviewedByRole
                            ? `${app.status.charAt(0).toUpperCase() + app.status.slice(1)} by ${app.reviewedByRole.charAt(0).toUpperCase() + app.reviewedByRole.slice(1)}`
                            : '–'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
