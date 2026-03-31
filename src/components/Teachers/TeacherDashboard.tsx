import { Calendar, FileText, UserCircle, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';

const getApiBase = () => (import.meta.env.DEV ? window.location.origin : 'http://0.0.0.0:8000');

export function TeacherDashboard() {
  const { user } = useAuth();
  const { teacherLeaveBalances, studentLeaveApplications, refreshLeaveData } = useSchoolData();
  const teacherId = (user as { teacherId?: string })?.teacherId;
  const [myClassesToday, setMyClassesToday] = useState<{ className: string; section: string; session: string; subjectName: string }[]>([]);

  useEffect(() => {
    if (teacherId) {
      fetch(`${getApiBase()}/api/attendance/my-classes-today?teacherId=${teacherId}`)
        .then(r => r.ok ? r.json() : [])
        .then(setMyClassesToday);
      refreshLeaveData(undefined, teacherId, undefined);
    }
  }, [teacherId, refreshLeaveData]);

  const pendingStudentLeaves = studentLeaveApplications.filter(a => a.status === 'pending');
  const balanceByType = teacherLeaveBalances.reduce((acc, b) => {
    acc[b.leaveType] = (b.allowed || 0) - (b.used || 0);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Teacher Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <UserCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Today&apos;s classes</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{myClassesToday.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Leave balance (Sick)</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{balanceByType['sick'] ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Calendar className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Casual / LOP</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {balanceByType['casual'] ?? 0} / {balanceByType['loss_of_pay'] ?? 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending student leaves</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{pendingStudentLeaves.length}</p>
            </div>
          </div>
        </div>
      </div>
      {myClassesToday.length > 0 && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Today&apos;s schedule</h2>
          <ul className="space-y-2">
            {myClassesToday.map((c, i) => (
              <li key={i} className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>Class {c.className}-{c.section} ({c.session})</span>
                <span>{c.subjectName}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
