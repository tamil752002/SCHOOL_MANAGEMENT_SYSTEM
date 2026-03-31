import { Calendar, CheckCircle, TrendingUp, Users, XCircle, Plus } from 'lucide-react';
import { useState } from 'react';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { ClassAttendance } from './ClassAttendance';
import { ClassAttendanceGrid } from './ClassAttendanceGrid';

export function AttendanceMain() {
  const { getStudentsByClass, getAttendanceByClass, holidayEvents, addHolidayEvent, deleteHolidayEvent } = useSchoolData() as any;
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'classes' | 'holidays'>('classes');
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayForm, setHolidayForm] = useState({
    type: 'holiday' as 'holiday' | 'event',
    title: '',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const { classes } = useSchoolData() as any;

  // Fix date handling to ensure local timezone is properly respected
  const getCurrentDate = () => {
    const now = new Date();
    // Format to YYYY-MM-DD in local timezone
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const today = getCurrentDate();

  // Sort holidays by startDate ascending
  const sortedHolidayEvents = [...holidayEvents].sort((a: any, b: any) => {
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

  if (selectedClass) {
    return (
      <ClassAttendance
        className={selectedClass}
        onBack={() => setSelectedClass(null)}
      />
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Attendance Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {activeTab === 'classes' 
              ? `Select a class to mark attendance for ${new Date().toLocaleDateString()}`
              : 'Manage holidays and events'}
          </p>
        </div>
        {activeTab === 'holidays' && (
          <button
            onClick={() => setShowHolidayModal(true)}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Mark Holiday/Event</span>
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('classes')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'classes'
                ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Classes
          </button>
          <button
            onClick={() => setActiveTab('holidays')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'holidays'
                ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Holidays/Events
          </button>
        </div>
      </div>

      {/* Holiday/Event Modal */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Mark Holiday or Event</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select
                  value={holidayForm.type}
                  onChange={e => setHolidayForm(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="holiday">Holiday</option>
                  <option value="event">Event</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={holidayForm.title}
                  onChange={e => setHolidayForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g. Diwali Break"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={holidayForm.startDate}
                    onChange={e => setHolidayForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                  <input
                    type="date"
                    value={holidayForm.endDate}
                    onChange={e => setHolidayForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason / Event Name</label>
                <textarea
                  value={holidayForm.reason}
                  onChange={e => setHolidayForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowHolidayModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!holidayForm.startDate || !holidayForm.endDate || !holidayForm.reason || !holidayForm.title) {
                    alert('Please fill all fields');
                    return;
                  }
                  addHolidayEvent({
                    ...holidayForm,
                    schoolId: '' // Context will handle schoolId
                  });
                  setShowHolidayModal(false);
                  setHolidayForm({ type: 'holiday', title: '', startDate: '', endDate: '', reason: '' });
                }}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'classes' && (
        <>
          {/* Today's Summary - Moved to top */}
      <div className="mb-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Today's Attendance Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {(() => {
            const totalStudents = (classes || []).reduce((sum: number, cls: any) => sum + getStudentsByClass(cls.name).length, 0);
            const totalPossibleSessions = totalStudents * 2; // Each student has 2 sessions per day
            const totalPresent = (classes || []).reduce((sum: number, cls: any) => {
              const attendanceMorning = getAttendanceByClass(cls.name, today, 'morning');
              const attendanceAfternoon = getAttendanceByClass(cls.name, today, 'afternoon');
              const attendance = [...attendanceMorning, ...attendanceAfternoon];
              return sum + attendance.filter((a: any) => a.status === 'present').length;
            }, 0);
            const totalAbsent = (classes || []).reduce((sum: number, cls: any) => {
              const attendanceMorning = getAttendanceByClass(cls.name, today, 'morning');
              const attendanceAfternoon = getAttendanceByClass(cls.name, today, 'afternoon');
              const attendance = [...attendanceMorning, ...attendanceAfternoon];
              return sum + attendance.filter((a: any) => a.status === 'absent').length;
            }, 0);
            const overallRate = totalPossibleSessions > 0 ? ((totalPresent / totalPossibleSessions) * 100) : 0;

            return [
              {
                title: 'Total Students',
                value: totalStudents,
                icon: Users,
                color: 'text-blue-600 dark:text-blue-400',
                bgColor: 'bg-blue-50 dark:bg-blue-900/30'
              },
              {
                title: 'Present',
                value: totalPresent,
                icon: CheckCircle,
                color: 'text-green-600 dark:text-green-400',
                bgColor: 'bg-green-50 dark:bg-green-900/30'
              },
              {
                title: 'Absent',
                value: totalAbsent,
                icon: XCircle,
                color: 'text-red-600 dark:text-red-400',
                bgColor: 'bg-red-50 dark:bg-red-900/30'
              },
              {
                title: 'Attendance Rate',
                value: `${overallRate.toFixed(1)}%`,
                icon: TrendingUp,
                color: 'text-purple-600 dark:text-purple-400',
                bgColor: 'bg-purple-50 dark:bg-purple-900/30'
              }
            ].map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className={`${stat.bgColor} rounded-xl p-4`}>
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-8 h-8 ${stat.color}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
                      <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      <ClassAttendanceGrid
        classes={(classes || []).map((c: { name: string; sections: string[] }) => ({ name: c.name, sections: c.sections || [] }))}
        today={today}
        getStudentsByClass={getStudentsByClass}
        getAttendanceByClass={getAttendanceByClass}
        onSelectClass={setSelectedClass}
      />
        </>
      )}

      {activeTab === 'holidays' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Holidays & Events</h2>
          </div>
          
          {sortedHolidayEvents.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg">No holidays or events scheduled</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Click "Mark Holiday/Event" to add one</p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto pr-2 space-y-4">
              {sortedHolidayEvents.map((event: any) => (
                <div
                  key={event.id}
                  className={`flex items-center justify-between p-4 rounded-xl border ${
                    event.type === 'holiday'
                      ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300'
                      : 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-300'
                  }`}
                >
                  <div className="flex-1">
                    <p className="font-bold text-base">{event.title || event.reason}</p>
                    <p className="text-sm opacity-75 mt-1">
                      {event.startDate === event.endDate 
                        ? event.startDate 
                        : `${event.startDate} to ${event.endDate}`}
                    </p>
                    {event.reason && event.title && (
                      <p className="text-sm opacity-90 mt-2">{event.reason}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete "${event.title || event.reason}"?`)) {
                        deleteHolidayEvent(event.id);
                      }
                    }}
                    className="ml-4 hover:scale-110 transition-transform text-red-600 dark:text-red-400"
                    title="Delete event"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}