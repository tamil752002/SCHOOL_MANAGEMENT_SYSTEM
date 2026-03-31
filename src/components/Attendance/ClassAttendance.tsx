import { Calendar, CheckCircle, ChevronLeft, Save, Users, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSchoolData } from '../../contexts/SchoolDataContext';

export interface ClassAttendancePersistRecord {
  studentId: string;
  date: string;
  session: 'morning' | 'afternoon';
  status: 'present' | 'absent';
}

interface ClassAttendanceProps {
  className: string;
  onBack: () => void;
  /** When provided (e.g. teacher panel), attendance is also persisted to API */
  persistAttendance?: (records: ClassAttendancePersistRecord[]) => Promise<void>;
  /** Initial section filter (e.g. when teacher is incharge of one section only) */
  initialSection?: string;
}

export function ClassAttendance({ className, onBack, persistAttendance, initialSection }: ClassAttendanceProps) {
  const { getStudentsByClass, markAttendance, getAttendanceByClass, students: allStudents, attendanceRecords, holidayEvents } = useSchoolData();
  
  // Fix date handling to ensure local timezone is properly respected
  const getCurrentDate = () => {
    const now = new Date();
    // Format to YYYY-MM-DD in local timezone
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  // Helper to determine session based on current time
  const getDefaultSession = (): 'morning' | 'afternoon' => {
    const now = new Date();
    const hour = now.getHours();
    // Morning: 9 AM - 1 PM (9 to 13), Afternoon: After 1 PM
    return hour >= 9 && hour < 13 ? 'morning' : 'afternoon';
  };

  const [selectedDate, setSelectedDate] = useState(getCurrentDate());
  const [selectedSection, setSelectedSection] = useState<string>(initialSection ?? 'all');
  const [selectedSession, setSelectedSession] = useState<'morning' | 'afternoon'>(getDefaultSession());
  const students = getStudentsByClass(className, selectedSection === 'all' ? undefined : selectedSection);
  const [attendanceData, setAttendanceData] = useState<Record<string, 'present' | 'absent'>>({});

  const isHoliday = (date: string) => {
    return holidayEvents.some((event: any) => {
      if (event.type !== 'holiday') return false;
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      const current = new Date(date);
      // Reset hours to compare dates only
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      current.setHours(0,0,0,0);
      return current >= start && current <= end;
    });
  };

  const holidayReason = (date: string) => {
    return holidayEvents.find((event: any) => {
      if (event.type !== 'holiday') return false;
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      const current = new Date(date);
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      current.setHours(0,0,0,0);
      return current >= start && current <= end;
    })?.reason;
  };

  const holidayInfo = isHoliday(selectedDate);

  const availableSections = allStudents
    .filter(s => {
      const normalize = (name: string) => {
        if (!name) return '';
        return name.toLowerCase()
          .replace(/^class\s+/g, '')
          .replace(/\s+class$/g, '')
          .replace(/st|nd|rd|th/g, '')
          .trim();
      };
      return normalize(s.studentClass) === normalize(className);
    })
    .reduce((acc: string[], s) => {
      if (!acc.includes(s.section)) acc.push(s.section);
      return acc;
    }, [])
    .sort();

  const [isSaving, setIsSaving] = useState(false);
  const [showSavedNotification, setShowSavedNotification] = useState(false);

  // Load existing attendance data when date, class, or session changes
  useEffect(() => {
    const loadExistingAttendance = () => {
      const existingAttendance = getAttendanceByClass(className, selectedDate, selectedSession);
      const attendanceMap: Record<string, 'present' | 'absent'> = {};

      existingAttendance.forEach(record => {
        attendanceMap[record.studentId] = record.status;
      });

      setAttendanceData(attendanceMap);
      console.log('Loaded attendance for class', className, 'date', selectedDate, 'session', selectedSession, 'records:', existingAttendance.length);
    };

    loadExistingAttendance();
  }, [className, selectedDate, selectedSession, getAttendanceByClass, allStudents, attendanceRecords]);

  const handleAttendanceChange = (studentId: string, status: 'present' | 'absent') => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const markAllPresent = () => {
    const allPresent = students.reduce((acc, student) => ({
      ...acc,
      [student.id]: 'present' as const
    }), {});
    setAttendanceData(allPresent);
  };

  const saveAttendance = async () => {
    if (holidayInfo) return;
    setIsSaving(true);
    try {
      const normalizedDate = selectedDate.includes('T') ? selectedDate.split('T')[0] : selectedDate;
      
      for (const [studentId, status] of Object.entries(attendanceData)) {
        markAttendance(studentId, status, normalizedDate, selectedSession);
      }

      if (persistAttendance) {
        const records: ClassAttendancePersistRecord[] = Object.entries(attendanceData).map(([studentId, status]) => ({
          studentId,
          date: normalizedDate,
          session: selectedSession,
          status
        }));
        await persistAttendance(records);
      }

      setShowSavedNotification(true);
      setTimeout(() => {
        setShowSavedNotification(false);
      }, 3000);

    } catch (error) {
      alert('Error saving attendance');
    } finally {
      setIsSaving(false);
    }
  };

  const presentCount = Object.values(attendanceData).filter(status => status === 'present').length;
  const absentCount = Object.values(attendanceData).filter(status => status === 'absent').length;
  const totalMarked = presentCount + absentCount;

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Saved Notification Toast */}
      {showSavedNotification && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right duration-300">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Attendance saved successfully!</span>
          </div>
        </div>
      )}

      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Back to Classes</span>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Class {className} Attendance</h1>
            <p className="text-gray-600 dark:text-gray-400">Mark attendance for {students.length} students</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Section:</span>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Sections</option>
                {availableSections.map(section => (
                  <option key={section} value={section}>Section {section}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Session:</span>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value as 'morning' | 'afternoon')}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="morning">Morning (9 AM - 1 PM)</option>
                <option value="afternoon">Afternoon (After 1 PM)</option>
              </select>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Holiday Warning */}
        {holidayInfo && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-center space-x-3 text-red-700 dark:text-red-300">
            <XCircle className="w-5 h-5" />
            <div>
              <p className="font-bold">Attendance Disabled</p>
              <p className="text-sm">This day is marked as a holiday: {holidayReason(selectedDate)}</p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Students</span>
            </div>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-300 mt-1">{students.length}</p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-600 dark:text-green-400">Present</span>
            </div>
            <p className="text-2xl font-bold text-green-900 dark:text-green-300 mt-1">{presentCount}</p>
          </div>

          <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="text-sm font-medium text-red-600 dark:text-red-400">Absent</span>
            </div>
            <p className="text-2xl font-bold text-red-900 dark:text-red-300 mt-1">{absentCount}</p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Marked</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-200 mt-1">{totalMarked}/{students.length}</p>
          </div>
        </div>

        {/* Actions */}
        {!holidayInfo && (
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={markAllPresent}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Mark All Present (100%)</span>
            </button>

            <button
              onClick={saveAttendance}
              disabled={totalMarked === 0 || isSaving}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isSaving ? 'Saving...' : 'Save Attendance'}</span>
            </button>
          </div>
        )}

        {/* Student List */}
        {!holidayInfo && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {students.map((student) => {
              const status = attendanceData[student.id];

              return (
                <div
                  key={student.id}
                  className={`border-2 rounded-lg p-4 transition-all ${status === 'present'
                    ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                    : status === 'absent'
                      ? 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{student.firstName} {student.lastName}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{student.admissionNumber}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">Section {student.section}</p>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAttendanceChange(student.id, 'present')}
                        className={`p-2 rounded-lg transition-all ${status === 'present'
                          ? 'bg-green-600 dark:bg-green-700 text-white'
                          : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600 dark:hover:text-green-400'
                          }`}
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => handleAttendanceChange(student.id, 'absent')}
                        className={`p-2 rounded-lg transition-all ${status === 'absent'
                          ? 'bg-red-600 dark:bg-red-700 text-white'
                          : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400'
                          }`}
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
