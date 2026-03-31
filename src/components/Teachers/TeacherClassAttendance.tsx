import { CheckCircle, TrendingUp, Users, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { ClassAttendance } from '../Attendance/ClassAttendance';
import { ClassAttendanceGrid, ClassInfoForGrid } from '../Attendance/ClassAttendanceGrid';
import type { ClassAttendancePersistRecord } from '../Attendance/ClassAttendance';

const getApiBase = () => (import.meta.env.DEV ? window.location.origin : 'http://0.0.0.0:8000');

interface InchargeSlot {
  id: string;
  className: string;
  section: string;
  session: string;
  subjectName: string;
}

export function TeacherClassAttendance() {
  const { user } = useAuth();
  const { getStudentsByClass, getAttendanceByClass } = useSchoolData();
  const teacherId = (user as { teacherId?: string })?.teacherId;
  const [slots, setSlots] = useState<InchargeSlot[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  useEffect(() => {
    if (teacherId) {
      fetch(`${getApiBase()}/api/attendance/my-classes-today?teacherId=${teacherId}`)
        .then((r) => (r.ok ? r.json() : []))
        .then(setSlots);
    }
  }, [teacherId]);

  // Build class list for grid: one entry per class name with sections (same shape as admin)
  const inchargeClasses: ClassInfoForGrid[] = slots.reduce<ClassInfoForGrid[]>((acc, slot) => {
    const existing = acc.find((c) => c.name === slot.className);
    if (existing) {
      if (!existing.sections.includes(slot.section)) existing.sections.push(slot.section);
    } else {
      acc.push({ name: slot.className, sections: [slot.section] });
    }
    return acc;
  }, []);

  const getCurrentDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };
  const today = getCurrentDate();

  const persistAttendance = async (records: ClassAttendancePersistRecord[]) => {
    const base = getApiBase();
    for (const r of records) {
      await fetch(`${base}/api/attendance/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: r.studentId,
          date: r.date,
          session: r.session,
          status: r.status
        })
      });
    }
  };

  if (selectedClass) {
    return (
      <ClassAttendance
        className={selectedClass}
        onBack={() => setSelectedClass(null)}
        persistAttendance={persistAttendance}
      />
    );
  }

  const totalStudents = inchargeClasses.reduce((sum, c) => sum + getStudentsByClass(c.name).length, 0);
  const totalPresent = inchargeClasses.reduce((sum, c) => {
    const am = getAttendanceByClass(c.name, today, 'morning');
    const pm = getAttendanceByClass(c.name, today, 'afternoon');
    return sum + [...am, ...pm].filter((a: { status: string }) => a.status === 'present').length;
  }, 0);
  const totalAbsent = inchargeClasses.reduce((sum, c) => {
    const am = getAttendanceByClass(c.name, today, 'morning');
    const pm = getAttendanceByClass(c.name, today, 'afternoon');
    return sum + [...am, ...pm].filter((a: { status: string }) => a.status === 'absent').length;
  }, 0);
  const totalPossibleSessions = totalStudents * 2;
  const overallRate = totalPossibleSessions > 0 ? (totalPresent / totalPossibleSessions) * 100 : 0;

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Class Attendance</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Only the class incharge can mark attendance. Select a class where you are the incharge.
        </p>
      </div>

      {inchargeClasses.length > 0 && (
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Today&apos;s Attendance Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Students</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalStudents}</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Present</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalPresent}</p>
                </div>
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Absent</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{totalAbsent}</p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Attendance Rate</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{overallRate.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {inchargeClasses.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            You are not set as class incharge for any class. Ask your admin to assign you as incharge in Teacher
            Management.
          </p>
        </div>
      ) : (
        <ClassAttendanceGrid
          classes={inchargeClasses}
          today={today}
          getStudentsByClass={getStudentsByClass}
          getAttendanceByClass={getAttendanceByClass}
          onSelectClass={setSelectedClass}
        />
      )}
    </div>
  );
}
