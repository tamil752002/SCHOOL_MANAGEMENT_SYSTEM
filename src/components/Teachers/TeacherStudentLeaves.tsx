import { Activity, CheckCircle, ListTodo, RefreshCw, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { StudentLeaveApplication } from '../../types';

const getApiBase = () => (import.meta.env.DEV ? window.location.origin : 'http://0.0.0.0:8000');

function formatDate(s: string) {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function TeacherStudentLeaves() {
  const { user } = useAuth();
  const { studentLeaveApplications, teachers, refreshLeaveData } = useSchoolData();
  const teacherId = (user as { teacherId?: string })?.teacherId;
  const schoolId = (user as { schoolId?: string })?.schoolId;

  const [activeTab, setActiveTab] = useState<'latest' | 'checked'>('latest');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const myInchargeClasses = teachers
    .find(t => t.id === teacherId)
    ?.classes?.filter(c => c.isIncharge)
    .map(c => ({ className: c.className, section: c.section })) || [];

  const inChargeFilter = (a: StudentLeaveApplication) =>
    myInchargeClasses.some(ic => a.studentClass === ic.className && a.section === ic.section);

  const latest = useMemo(
    () => studentLeaveApplications.filter(a => a.status === 'pending' && inChargeFilter(a)),
    [studentLeaveApplications, myInchargeClasses]
  );

  const checkedRaw = useMemo(
    () => studentLeaveApplications.filter(a => a.status !== 'pending' && inChargeFilter(a)),
    [studentLeaveApplications, myInchargeClasses]
  );

  const checked = useMemo(() => {
    let list = [...checkedRaw];
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
  }, [checkedRaw, searchTerm, filterMonth, filterDateFrom, filterDateTo]);

  useEffect(() => {
    if (schoolId) refreshLeaveData(schoolId);
  }, [schoolId, refreshLeaveData]);

  const handleReview = async (id: string, status: 'approved' | 'rejected') => {
    setLoadingId(id);
    try {
      await fetch(`${getApiBase()}/api/leave/student-applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reviewedBy: user?.id })
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
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <Activity className="w-8 h-8" />
        Student Leaves
      </h1>
      {myInchargeClasses.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
          You are not set as class incharge for any class. Student leave applications for your incharge class(es) will appear here.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setActiveTab('latest')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'latest'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <ListTodo className="w-4 h-4 shrink-0" />
                Latest ({latest.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('checked')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'checked'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <CheckCircle className="w-4 h-4 shrink-0" />
                Checked ({checkedRaw.length})
              </button>
            </div>
            <button
              onClick={() => schoolId && refreshLeaveData(schoolId)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {activeTab === 'latest' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-medium text-gray-900 dark:text-white">Latest leave requests</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Approve or reject to move to Checked.</p>
              </div>
              {latest.length === 0 ? (
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
                      {latest.map(app => (
                        <tr key={app.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{app.studentName || app.studentId}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{app.studentClass}-{app.section}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 capitalize">{app.leaveType}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{formatDate(app.fromDate)} – {formatDate(app.toDate)}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={app.reason || ''}>{app.reason || '–'}</td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              onClick={() => handleReview(app.id, 'approved')}
                              disabled={loadingId === app.id}
                              className="text-green-600 dark:text-green-400 hover:underline text-sm disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReview(app.id, 'rejected')}
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
            </div>
          )}

          {activeTab === 'checked' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 space-y-3">
                <h2 className="font-medium text-gray-900 dark:text-white">Checked leave applications</h2>
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
              {checked.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  {checkedRaw.length === 0 ? 'No checked leaves yet.' : 'No matches for the current filters.'}
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
                      {checked.map(app => (
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
