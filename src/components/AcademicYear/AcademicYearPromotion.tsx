import { GraduationCap, Loader2, Users } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';

function nextAcademicYear(current: string): string {
  const parts = current.split('-').map(s => parseInt(s, 10));
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return `${parts[0] + 1}-${parts[1] + 1}`;
  }
  const y = new Date().getFullYear();
  return `${y}-${y + 1}`;
}

const CLASS_ORDER = ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
function getNextClass(currentClass: string): string {
  const idx = CLASS_ORDER.indexOf(String(currentClass).trim());
  if (idx === -1) return '—';
  if (idx === CLASS_ORDER.length - 1) return 'Graduated';
  return CLASS_ORDER[idx + 1];
}

export function AcademicYearPromotion() {
  const { user } = useAuth();
  const { settings, enrollments, classes, refreshData } = useSchoolData();
  const [promoting, setPromoting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const adminUser = user?.role === 'admin' ? (user as { schoolId?: string }) : null;
  const schoolId = adminUser?.schoolId ?? null;
  const currentYear = settings?.currentAcademicYear || '';
  const nextYear = nextAcademicYear(currentYear);

  const currentEnrollments = (enrollments || []).filter(
    e => e.academicYear === currentYear && e.studentStatus !== 'transferred' && e.studentStatus !== 'graduated'
  );

  const byClass = currentEnrollments.reduce<Record<string, typeof currentEnrollments>>((acc, e) => {
    const key = `${e.className}-${e.section}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  const classKeys = Object.keys(byClass).sort((a, b) => {
    const [aClass, aSec] = a.split('-');
    const [bClass, bSec] = b.split('-');
    const aIdx = CLASS_ORDER.indexOf(aClass);
    const bIdx = CLASS_ORDER.indexOf(bClass);
    if (aIdx !== bIdx) return aIdx - bIdx;
    return (aSec || '').localeCompare(bSec || '');
  });

  const handlePromote = async () => {
    if (!schoolId) return;
    setPromoting(true);
    setMessage(null);
    try {
      const base = import.meta.env.DEV ? window.location.origin : 'http://0.0.0.0:8000';
      const res = await fetch(`${base}/api/enrollments/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          fromAcademicYear: currentYear,
          toAcademicYear: nextYear
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Promotion failed' });
        setConfirmOpen(false);
        return;
      }
      setMessage({ type: 'success', text: `Promotion complete. ${data.created || 0} students promoted. ${data.graduated || 0} graduated.` });
      setConfirmOpen(false);
      refreshData();
    } catch (e) {
      setMessage({ type: 'error', text: 'Network error' });
      setConfirmOpen(false);
    } finally {
      setPromoting(false);
    }
  };

  if (!schoolId) {
    return (
      <div className="p-6">
        <p className="text-gray-600 dark:text-gray-400">School context not available.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <GraduationCap className="w-7 h-7 text-cyan-600 dark:text-cyan-400" />
          Academic Year & Promotion
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Current year: <span className="font-medium text-gray-700 dark:text-gray-300">{currentYear}</span>
          {' → '}
          Next year: <span className="font-medium text-gray-700 dark:text-gray-300">{nextYear}</span>
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 px-4 py-3 rounded-xl text-sm ${message.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
            : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
            }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Promote to next year</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Create enrollments for {nextYear} and update student classes. Students in the top class will be marked graduated.
            </p>
          </div>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={promoting || currentEnrollments.length === 0}
            className="px-5 py-2.5 rounded-xl font-medium gradient-primary text-white shadow-soft hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {promoting ? <Loader2 className="w-5 h-5 animate-spin" /> : <GraduationCap className="w-5 h-5" />}
            Promote to {nextYear}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            Enrollments for {currentYear}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {currentEnrollments.length} active student(s). Preview shows next class after promotion.
          </p>
        </div>
        <div className="overflow-x-auto">
          {classKeys.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No enrollments for {currentYear}. Add students or switch academic year.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                  <th className="px-6 py-3">Class</th>
                  <th className="px-6 py-3">Student</th>
                  <th className="px-6 py-3">Admission No.</th>
                  <th className="px-6 py-3">Next class</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {classKeys.flatMap(key => {
                  const list = byClass[key] || [];
                  return list.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">
                        {e.className}-{e.section}
                      </td>
                      <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{e.studentName || '—'}</td>
                      <td className="px-6 py-3 text-gray-600 dark:text-gray-400">{e.admissionNumber || '—'}</td>
                      <td className="px-6 py-3">
                        <span className="text-cyan-600 dark:text-cyan-400 font-medium">
                          {getNextClass(e.className)}
                        </span>
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !promoting && setConfirmOpen(false)}>
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Confirm promotion</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Create enrollments for <strong>{nextYear}</strong> for all {currentEnrollments.length} active students and update their class/section. Students in the highest class will be marked as graduated.
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={promoting}
                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePromote}
                disabled={promoting}
                className="px-4 py-2 rounded-xl gradient-primary text-white font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {promoting && <Loader2 className="w-4 h-4 animate-spin" />}
                Promote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
