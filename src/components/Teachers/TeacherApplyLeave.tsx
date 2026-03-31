import { CheckCircle, FileText, ListTodo, RefreshCw, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { TeacherLeaveApplication } from '../../types';

const getApiBase = () => (import.meta.env.DEV ? window.location.origin : 'http://0.0.0.0:8000');

function formatDate(s: string) {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function LeaveRow({ app }: { app: TeacherLeaveApplication }) {
  const statusClass =
    app.status === 'approved'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      : app.status === 'rejected'
        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
  return (
    <tr className="border-b border-gray-200 dark:border-gray-700 last:border-0">
      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white capitalize">{app.leaveType.replace('_', ' ')}</td>
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
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{app.reviewedAt ? formatDate(app.reviewedAt) : '—'}</td>
    </tr>
  );
}

function TeacherApplyLeave() {
  const { user } = useAuth();
  const { teacherLeaveBalances, teacherLeaveApplications, refreshLeaveData } = useSchoolData();
  const teacherId = (user as { teacherId?: string })?.teacherId;
  const [leaveType, setLeaveType] = useState<'sick' | 'casual' | 'loss_of_pay'>('sick');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [listTab, setListTab] = useState<'applied' | 'approved' | 'rejected'>('applied');

  const myApplications = teacherId
    ? teacherLeaveApplications.filter(a => a.teacherId === teacherId)
    : [];
  const sortedApplied = [...myApplications].sort(
    (a, b) => new Date(b.fromDate).getTime() - new Date(a.fromDate).getTime()
  );
  const approvedOnly = sortedApplied.filter(a => a.status === 'approved');
  const rejectedOnly = sortedApplied.filter(a => a.status === 'rejected');

  useEffect(() => {
    if (teacherId) refreshLeaveData(undefined, teacherId, undefined);
  }, [teacherId, refreshLeaveData]);

  const balanceByType = teacherLeaveBalances.reduce((acc, b) => {
    acc[b.leaveType] = (b.allowed || 0) - (b.used || 0);
    return acc;
  }, {} as Record<string, number>);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherId || !fromDate || !toDate) return;
    setSaving(true);
    try {
      await fetch(`${getApiBase()}/api/leave/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, leaveType, fromDate, toDate, reason })
      });
      setFromDate('');
      setToDate('');
      setReason('');
      if (teacherId) refreshLeaveData(undefined, teacherId, undefined);
    } catch (err) {
      console.error(err);
      alert('Failed to submit leave');
    } finally {
      setSaving(false);
    }
  };

  const tabList =
    listTab === 'applied'
      ? sortedApplied
      : listTab === 'approved'
        ? approvedOnly
        : rejectedOnly;
  const emptyMessage =
    listTab === 'applied'
      ? 'No leave applications yet.'
      : listTab === 'approved'
        ? 'No approved leaves yet.'
        : 'No rejected leaves.';

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <FileText className="w-8 h-8" />
        Apply Leave
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: balance cards + new application form */}
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Sick leave</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{balanceByType['sick'] ?? 0} days</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Casual leave</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{balanceByType['casual'] ?? 0} days</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Loss of pay</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{balanceByType['loss_of_pay'] ?? 0} days</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="font-medium text-gray-900 dark:text-white mb-4">New application</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Leave type</label>
                <select
                  value={leaveType}
                  onChange={e => setLeaveType(e.target.value as 'sick' | 'casual' | 'loss_of_pay')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="sick">Sick</option>
                  <option value="casual">Casual</option>
                  <option value="loss_of_pay">Loss of pay</option>
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
        </div>

        {/* Right: My applications (all) | Approved | Rejected */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col min-h-[320px]">
          <div className="flex border-b border-gray-200 dark:border-gray-700 flex-wrap">
            <button
              type="button"
              onClick={() => setListTab('applied')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                listTab === 'applied'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <ListTodo className="w-4 h-4 shrink-0" />
              My applications ({sortedApplied.length})
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
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3">To</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reviewed</th>
                </tr>
              </thead>
              <tbody>
                {tabList.map(app => (
                  <LeaveRow key={app.id} app={app} />
                ))}
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

export { TeacherApplyLeave };
