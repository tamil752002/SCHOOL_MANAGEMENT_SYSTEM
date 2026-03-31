import { AlertTriangle, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { Student } from '../../types';

interface StudentAttendanceProps {
    student?: Student;
    overrideStudent?: Student | null;
}

export function StudentAttendance({ student: studentProp, overrideStudent }: StudentAttendanceProps = {}) {
    const { holidayEvents, students, getAttendanceByStudent } = useSchoolData();
    const { user } = useAuth();
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const studentRecord = overrideStudent ?? studentProp ?? students.find(s => s.admissionNumber === user?.admissionNumber);

    if (!studentRecord) {
        return (
            <div className="p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Student Record Not Found</h3>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Your student record could not be found. Please contact the administration.</p>
            </div>
        );
    }

    const currentSchoolHolidays = (holidayEvents || []).filter(h => h.schoolId === studentRecord.schoolId);

    // Format date string for API in local timezone
    const formatDateString = (date: Date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    // Helper to check if a date is within a holiday range
    const getHolidayForDate = (dateStr: string) => {
        return currentSchoolHolidays.find(h => {
            return dateStr >= h.startDate && dateStr <= h.endDate;
        });
    };

    // Get attendance records for the selected month
    const startDate = new Date(selectedYear, selectedMonth, 1);
    const endDate = new Date(selectedYear, selectedMonth + 1, 0);

    const attendanceRecords = getAttendanceByStudent(studentRecord.id, {
        start: formatDateString(startDate),
        end: formatDateString(endDate)
    });

    // Calculate statistics based on sessions (each day has 2 sessions: morning and afternoon)
    const totalSessions = attendanceRecords.length;
    const presentSessions = attendanceRecords.filter(record => record.status === 'present').length;
    const absentSessions = attendanceRecords.filter(record => record.status === 'absent').length;
    // Calculate total possible sessions for the month (days in month * 2)
    const daysInMonthCount = endDate.getDate();
    const totalPossibleSessions = daysInMonthCount * 2;
    const attendancePercentage = totalPossibleSessions > 0 ? (presentSessions / totalPossibleSessions) * 100 : 0;

    // Create a calendar view
    const daysInMonth = endDate.getDate();
    const firstDayOfMonth = startDate.getDay();
    const calendarDays = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDays.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(selectedYear, selectedMonth, day);
        const dateStr = formatDateString(currentDate);
        // Normalize date format for comparison
        // Find both morning and afternoon records for this date
        const morningRecord = attendanceRecords.find(record => {
            const recordDate = record.date ? (record.date.includes('T') ? record.date.split('T')[0] : record.date) : record.date;
            return recordDate === dateStr && record.session === 'morning';
        });
        const afternoonRecord = attendanceRecords.find(record => {
            const recordDate = record.date ? (record.date.includes('T') ? record.date.split('T')[0] : record.date) : record.date;
            return recordDate === dateStr && record.session === 'afternoon';
        });
        const holiday = getHolidayForDate(dateStr);
        calendarDays.push({ day, morningRecord, afternoonRecord, holiday });
    }

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const formatDate = (dateString: string) => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Attendance</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    {studentRecord.firstName} {studentRecord.lastName || ''} • Class {studentRecord.studentClass}-{studentRecord.section}
                </p>
            </div>

            {/* Month/Year Selector */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 mb-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center space-x-4 mb-4 md:mb-0">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Month</label>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            >
                                {monthNames.map((month, index) => (
                                    <option key={index} value={index}>{month}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            >
                                {[2023, 2024, 2025].map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Summary Stats - stack on very small screens to avoid squishing */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        <div className="text-center p-3 min-w-0 bg-green-50 dark:bg-green-900/30 rounded-lg">
                            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-1" />
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Present Session</p>
                            <p className="font-bold text-green-600 dark:text-green-400">{presentSessions}</p>
                        </div>
                        <div className="text-center p-3 min-w-0 bg-red-50 dark:bg-red-900/30 rounded-lg">
                            <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 mx-auto mb-1" />
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Absent Session</p>
                            <p className="font-bold text-red-600 dark:text-red-400">{absentSessions}</p>
                        </div>
                        <div className="text-center p-3 min-w-0 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Percentage</p>
                            <p className="font-bold text-blue-600 dark:text-blue-400">{attendancePercentage.toFixed(1)}%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Calendar View */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {monthNames[selectedMonth]} {selectedYear} Calendar
                </h3>

                <div className="grid grid-cols-7 gap-2 mb-4">
                    {dayNames.map(day => (
                        <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 p-2">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                    {calendarDays.map((dayData, index) => {
                        if (!dayData) {
                            return <div key={index} className="p-3"></div>;
                        }

                        const { day, morningRecord, afternoonRecord, holiday } = dayData;
                        const currentDate = new Date();
                        const isToday = currentDate.getDate() === day &&
                            currentDate.getMonth() === selectedMonth &&
                            currentDate.getFullYear() === selectedYear;

                        // Determine background color based on records
                        let bgColor = 'bg-gray-50 dark:bg-gray-700';
                        let borderColor = 'border-gray-200 dark:border-gray-700';
                        if (holiday) {
                            bgColor = holiday.type === 'holiday' ? 'bg-red-100 dark:bg-red-900/40' : 'bg-orange-100 dark:bg-orange-900/40';
                            borderColor = holiday.type === 'holiday' ? 'border-red-400' : 'border-orange-400';
                        } else if (isToday) {
                            bgColor = 'bg-blue-50 dark:bg-blue-900/30';
                            borderColor = 'border-blue-500 dark:border-blue-400';
                        }

                        return (
                            <div
                                key={day}
                                className={`p-2 text-center border rounded-lg ${borderColor} ${bgColor}`}
                                title={holiday ? `${holiday.type.toUpperCase()}: ${holiday.title || holiday.reason}` : undefined}
                            >
                                <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">{day}</div>
                                {holiday ? (
                                    <div className="text-[10px] leading-tight font-medium text-gray-700 dark:text-gray-200 truncate">
                                        {(holiday.title || holiday.reason).substring(0, 15)}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-0.5">
                                        {/* Morning session - left half */}
                                        <div className={`flex-1 h-6 rounded-l border-r border-gray-300 dark:border-gray-600 ${
                                            morningRecord?.status === 'present' 
                                                ? 'bg-green-500 dark:bg-green-600' 
                                                : morningRecord?.status === 'absent'
                                                ? 'bg-red-500 dark:bg-red-600'
                                                : 'bg-gray-300 dark:bg-gray-600'
                                        }`} title="Morning" />
                                        {/* Afternoon session - right half */}
                                        <div className={`flex-1 h-6 rounded-r ${
                                            afternoonRecord?.status === 'present' 
                                                ? 'bg-green-500 dark:bg-green-600' 
                                                : afternoonRecord?.status === 'absent'
                                                ? 'bg-red-500 dark:bg-red-600'
                                                : 'bg-gray-300 dark:bg-gray-600'
                                        }`} title="Afternoon" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="mt-6 flex flex-wrap justify-center gap-4">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-4 flex gap-0.5">
                            <div className="flex-1 bg-green-500 rounded-l"></div>
                            <div className="flex-1 bg-green-500 rounded-r"></div>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Present (Both Sessions)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-4 flex gap-0.5">
                            <div className="flex-1 bg-red-500 rounded-l"></div>
                            <div className="flex-1 bg-red-500 rounded-r"></div>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Absent (Both Sessions)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-4 flex gap-0.5">
                            <div className="flex-1 bg-green-500 rounded-l"></div>
                            <div className="flex-1 bg-red-500 rounded-r"></div>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Mixed (M/A)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-4 flex gap-0.5">
                            <div className="flex-1 bg-gray-300 dark:bg-gray-600 rounded-l"></div>
                            <div className="flex-1 bg-gray-300 dark:bg-gray-600 rounded-r"></div>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">No Record</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-red-100 dark:bg-red-900/40 border border-red-400 rounded"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Holiday</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-orange-100 dark:bg-orange-900/40 border border-orange-400 rounded"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Event</span>
                    </div>
                </div>
            </div>

            {/* Attendance History */}
            {attendanceRecords.length > 0 && (
                <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Attendance History</h3>
                    <div className="space-y-3">
                        {attendanceRecords.slice(0, 10).map(record => (
                            <div key={record.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {formatDate(record.date)} - {record.session === 'morning' ? 'Morning' : 'Afternoon'}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Marked at {new Date(record.timestamp).toLocaleTimeString()}
                                    </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {record.status === 'present' ? (
                                        <>
                                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                            <span className="text-green-600 dark:text-green-400 font-medium">Present</span>
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                            <span className="text-red-600 dark:text-red-400 font-medium">Absent</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
} 