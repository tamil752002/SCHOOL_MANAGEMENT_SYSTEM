import { CheckCircle, FileText, ListTodo, RefreshCw, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { Student } from '../../types';

const getApiBase = () => (import.meta.env.DEV ? window.location.origin : 'http://0.0.0.0:8000');

function formatDate(s: string) {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface ParentApplyLeaveProps {
  students: Student[];
  userId?: string;
}

export function ParentApplyLeave({ students, userId }: ParentApplyLeaveProps) {
  const { studentLeaveApplications, refreshLeaveData } = useSchoolData();
  const [studentId, setStudentId] = useState(students[0]?.id || '');
  const [leaveType, setLeaveType] = useState<'sick' | 'casual'>('sick');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [listTab, setListTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const childIds = useMemo(() => new Set(students.map(s => s.id)), [students]);
  const myApplications = useMemo(
    () => studentLeaveApplications.filter(a => childIds.has(a.studentId)),
    [studentLeaveApplications, childIds]
  );
  const sortedApplications = useMemo(
    () => [...myApplications].sort((a, b) => new Date(b.fromDate).getTime() - new Date(a.fromDate).getTime()),
    [myApplications]
  );
  const pendingOnly = useMemo(() => sortedApplications.filter(a => a.status === 'pending'), [sortedApplications]);
  const approvedOnly = useMemo(() => sortedApplications.filter(a => a.status === 'approved'), [sortedApplications]);
  const rejectedOnly = useMemo(() => sortedApplications.filter(a => a.status === 'rejected'), [sortedApplications]);

  const tabList =
    listTab === 'all'
      ? sortedApplications
      : listTab === 'pending'
        ? pendingOnly
        : listTab === 'approved'
          ? approvedOnly
          : rejectedOnly;
  const emptyMessage =
    listTab === 'all'
      ? 'No leave applications yet.'
      : listTab === 'pending'
        ? 'No pending leaves.'
        : listTab === 'approved'
          ? 'No approved leaves yet.'
          : 'No rejected leaves.';

  useEffect(() => {
    if (userId) refreshLeaveData(undefined, undefined, userId);
  }, [userId, refreshLeaveData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !studentId || !fromDate || !toDate) return;
    setSaving(true);
    try {
      await fetch(`${getApiBase()}/api/leave/student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, leaveType, fromDate, toDate, reason, appliedBy: userId })
      });
      setFromDate('');
      setToDate('');
      setReason('');
      if (userId) await refreshLeaveData(undefined, undefined, userId);
    } catch (err) {
      console.error(err);
      alert('Failed to submit leave');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <FileText className="w-8 h-8" />
        Apply Leave (Student)
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="font-medium text-gray-900 dark:text-white mb-4">New application</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Child</label>
              <select
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                required
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName} (Class {s.studentClass}-{s.section})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Leave type</label>
              <select
                value={leaveType}
                onChange={e => setLeaveType(e.target.value as 'sick' | 'casual')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="sick">Sick</option>
                <option value="casual">Casual</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">From date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">To date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Reason</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                rows={3}
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {saving ? 'Submitting...' : 'Submit'}
            </button>
          </form>
        </div>

        {/* Right: My applications */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col min-h-[320px]">
          <div className="flex border-b border-gray-200 dark:border-gray-700 flex-wrap">
            <button
              type="button"
              onClick={() => setListTab('all')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                listTab === 'all'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <ListTodo className="w-4 h-4 shrink-0" />
              My applications ({sortedApplications.length})
            </button>
            <button
              type="button"
              onClick={() => setListTab('pending')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                listTab === 'pending'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Pending ({pendingOnly.length})
            </button>
            <button
              type="button"
              onClick={() => setListTab('approved')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                listTab === 'approved'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <CheckCircle className="w-4 h-4 shrink-0" />
              Approved ({approvedOnly.length})
            </button>
            <button
              type="button"
              onClick={() => setListTab('rejected')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                listTab === 'rejected'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <XCircle className="w-4 h-4 shrink-0" />
              Rejected ({rejectedOnly.length})
            </button>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full min-w-[420px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3">To</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {tabList.map(app => {
                  const statusClass =
                    app.status === 'approved'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : app.status === 'rejected'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
                  return (
                    <tr key={app.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{app.studentName || app.studentId}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 capitalize">{app.leaveType}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatDate(app.fromDate)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatDate(app.toDate)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-[160px] truncate" title={app.reason || ''}>
                        {app.reason || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${statusClass}`}>
                          {app.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {tabList.length === 0 && (
              <p className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">{emptyMessage}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
