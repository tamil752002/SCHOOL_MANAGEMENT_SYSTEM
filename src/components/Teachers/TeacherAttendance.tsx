import { Calendar, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const getApiBase = () => (import.meta.env.DEV ? window.location.origin : 'http://0.0.0.0:8000');

export function TeacherAttendance() {
  const { user } = useAuth();
  const teacherId = (user as { teacherId?: string })?.teacherId;
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [session, setSession] = useState<'morning' | 'afternoon'>('morning');
  const [status, setStatus] = useState<'present' | 'absent'>('present');
  const [records, setRecords] = useState<{ date: string; session: string; status: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!teacherId) return;
    const from = new Date();
    from.setDate(from.getDate() - 30);
    fetch(`${getApiBase()}/api/attendance/teacher?teacherId=${teacherId}&from=${from.toISOString().split('T')[0]}&to=${new Date().toISOString().split('T')[0]}`)
      .then(r => r.ok ? r.json() : [])
      .then(setRecords);
  }, [teacherId]);

  const handleMark = async () => {
    if (!teacherId) return;
    setSaving(true);
    try {
      await fetch(`${getApiBase()}/api/attendance/teacher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, date, session, status })
      });
      setRecords(prev => [...prev.filter(r => !(r.date === date && r.session === session)), { date, session, status }]);
    } catch (e) {
      console.error(e);
      alert('Failed to mark attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <Calendar className="w-8 h-8" />
        My Attendance
      </h1>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-md">
        <h2 className="font-medium text-gray-900 dark:text-white mb-4">Mark attendance</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Session</label>
            <select
              value={session}
              onChange={e => setSession(e.target.value as 'morning' | 'afternoon')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as 'present' | 'absent')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="present">Present</option>
              <option value="absent">Absent</option>
            </select>
          </div>
          <button
            onClick={handleMark}
            disabled={saving}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {saving ? 'Saving...' : 'Mark'}
          </button>
        </div>
      </div>
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <h2 className="px-6 py-3 font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700">Recent records</h2>
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {records.slice(0, 20).map((r, i) => (
            <li key={i} className="px-6 py-3 flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">{r.date} ({r.session})</span>
              <span className={r.status === 'present' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{r.status}</span>
            </li>
          ))}
          {records.length === 0 && <li className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">No records yet.</li>}
        </ul>
      </div>
    </div>
  );
}
