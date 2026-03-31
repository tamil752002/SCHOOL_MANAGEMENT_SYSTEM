import { Calendar, CheckCircle, Users } from 'lucide-react';
import { sortClasses } from '../../utils/sortClasses';

export interface ClassInfoForGrid {
  name: string;
  sections: string[];
}

interface ClassAttendanceGridProps {
  classes: ClassInfoForGrid[];
  today: string;
  getStudentsByClass: (className: string, section?: string) => { id: string }[];
  getAttendanceByClass: (className: string, date: string, session?: 'morning' | 'afternoon') => { studentId: string; status: string }[];
  onSelectClass: (className: string) => void;
  title?: string;
  subtitle?: string;
}

export function ClassAttendanceGrid({
  classes,
  today,
  getStudentsByClass,
  getAttendanceByClass,
  onSelectClass,
  title = "Today's Attendance",
  subtitle
}: ClassAttendanceGridProps) {
  const sortedClasses = sortClasses(classes.map(c => ({ name: c.name, sections: c.sections, medium: [] as string[] })));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {sortedClasses.map((classInfo: { name: string; sections: string[] }, index: number) => {
        const students = getStudentsByClass(classInfo.name);
        const todayAttendanceMorning = getAttendanceByClass(classInfo.name, today, 'morning');
        const todayAttendanceAfternoon = getAttendanceByClass(classInfo.name, today, 'afternoon');
        const todayAttendance = [...todayAttendanceMorning, ...todayAttendanceAfternoon];
        const presentCount = todayAttendance.filter((a: { status: string }) => a.status === 'present').length;
        const absentCount = todayAttendance.filter((a: { status: string }) => a.status === 'absent').length;
        const totalMarked = presentCount + absentCount;
        const totalPossibleSessions = students.length * 2;
        const attendanceRate = totalPossibleSessions > 0 ? (presentCount / totalPossibleSessions) * 100 : 0;
        const isCompleted = totalMarked === totalPossibleSessions;

        return (
          <div
            key={index}
            onClick={() => onSelectClass(classInfo.name)}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:scale-105 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-right">
                {isCompleted ? (
                  <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Complete</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 text-orange-600 dark:text-orange-400">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-medium">Pending</span>
                  </div>
                )}
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Class {classInfo.name}
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Students</span>
                <span className="font-semibold text-gray-900 dark:text-white">{students.length}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Present Today</span>
                <span className="font-semibold text-green-600 dark:text-green-400">{presentCount}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Absent Today</span>
                <span className="font-semibold text-red-600 dark:text-red-400">{absentCount}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Sections</span>
                <span className="font-semibold text-gray-900 dark:text-white">{classInfo.sections.join(', ') || '–'}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Progress</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">{totalMarked}/{totalPossibleSessions}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full transition-all ${isCompleted ? 'bg-green-500 dark:bg-green-400' : 'bg-blue-500 dark:bg-blue-400'}`}
                  style={{ width: `${totalPossibleSessions > 0 ? (totalMarked / totalPossibleSessions) * 100 : 0}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Attendance Rate</span>
                <span>{attendanceRate.toFixed(0)}%</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium text-sm group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
              <Calendar className="w-4 h-4 mr-1" />
              {isCompleted ? 'View Attendance' : 'Mark Attendance'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
