import { Activity, AlertTriangle, ArrowLeft, Calendar, CheckCircle, Clock, CreditCard, Download, Eye, EyeOff, FileText, Plus, RefreshCw, Info, XCircle, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { Student, HolidayEvent, AttendanceRecord } from '../../types';
import { ActivityForm } from './ActivityForm';
import { calculateFeeStats } from '../../services/FeeService';

interface StudentProfileProps {
    student: Student;
    onBack: () => void;
}

export function StudentProfile({ student, onBack }: StudentProfileProps) {
    const { getFeesByStudent, getActivitiesByStudent, updateStudent, generateStudentPassword, getAttendanceByStudent, getExamRecordsByStudent, holidayEvents, studentLeaveApplications } = useSchoolData() as any;
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'overview' | 'fees' | 'activities' | 'attendance' | 'examination' | 'examTimetable' | 'holidays' | 'leaves'>('overview');
    const [showActivityForm, setShowActivityForm] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [attendanceMonth, setAttendanceMonth] = useState(new Date().getMonth());
    const [attendanceYear, setAttendanceYear] = useState(new Date().getFullYear());

    const handleResetPassword = () => {
        if (window.confirm('Are you sure you want to reset this student\'s password? The old password will no longer work.')) {
            const newPassword = generateStudentPassword(student.firstName, student.dob);
            updateStudent(student.id, { password: newPassword });
            alert(`Password reset successfully!\n\nNew Login Details:\nUsername: ${student.admissionNumber}\nPassword: ${newPassword}\n\nPlease share these credentials with the student.`);
        }
    };

    const feeRecords = getFeesByStudent(student.id);
    const activities = getActivitiesByStudent(student.id);

    const currentDate = new Date();

    const formatDateString = (date: Date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const attendanceStartDate = new Date(attendanceYear, attendanceMonth, 1);
    const attendanceEndDate = new Date(attendanceYear, attendanceMonth + 1, 0);
    const attendanceRecords = getAttendanceByStudent(student.id, {
        start: formatDateString(attendanceStartDate),
        end: formatDateString(attendanceEndDate)
    });
    const allAttendanceRecords = getAttendanceByStudent(student.id);

    const examRecords = getExamRecordsByStudent(student.id);
    const { totalAmount: totalFeesAmount, totalCollected: totalPaidAmount, totalPending: pendingAmount } = calculateFeeStats(feeRecords);

    const feesByYear = feeRecords.reduce((acc: any, record: any) => {
        if (!acc[record.academicYear]) {
            acc[record.academicYear] = [];
        }
        acc[record.academicYear].push(record);
        return acc;
    }, {});

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
            case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
            case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
            case 'partial': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'paid': return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />;
            case 'pending': return <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
            case 'overdue': return <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />;
            case 'partial': return <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
            default: return <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
        }
    };

    const renderOverviewTab = () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Full Name</p>
                            <p className="font-medium text-gray-900 dark:text-white">{student.firstName} {student.lastName}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Admission Number</p>
                            <p className="font-medium text-gray-900 dark:text-white">{student.admissionNumber}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Class & Section</p>
                            <p className="font-medium text-gray-900 dark:text-white">Class {student.studentClass}-{student.section}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Medium</p>
                            <p className="font-medium text-gray-900 dark:text-white">{student.medium}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Date of Birth</p>
                            <p className="font-medium text-gray-900 dark:text-white">{formatDate(student.dob || '')}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Mobile Number</p>
                            <p className="font-medium text-gray-900 dark:text-white">{student.mobileNumber}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Father's Name</p>
                            <p className="font-medium text-gray-900 dark:text-white">{student.fatherName}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Mother's Name</p>
                            <p className="font-medium text-gray-900 dark:text-white">{student.motherName}</p>
                        </div>
                    </div>
                </div>

                {(user?.role === 'admin') && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Login Credentials</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Username</p>
                                <p className="font-medium text-gray-900 dark:text-white">{student.admissionNumber}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Password</p>
                                <div className="flex items-center space-x-2">
                                    <div className="flex-1 flex items-center space-x-2">
                                        <span className="font-medium text-gray-900 dark:text-white font-mono">
                                            {showPassword ? student.password || 'Not set' : '••••••••'}
                                        </span>
                                        <button
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <button
                                        onClick={handleResetPassword}
                                        className="flex items-center space-x-1 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-md hover:bg-orange-200 transition-colors text-sm"
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                        <span>Reset</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {user?.role !== 'teacher' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Fee Summary</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                            <CreditCard className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                            <p className="text-xl font-bold text-blue-600">₹{totalFeesAmount.toLocaleString()}</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                            <Download className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600 dark:text-gray-400">Paid</p>
                            <p className="text-xl font-bold text-green-600">₹{totalPaidAmount.toLocaleString()}</p>
                        </div>
                        <div className="text-center p-4 bg-red-50 dark:bg-red-900/30 rounded-lg">
                            <Calendar className="w-8 h-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                            <p className="text-xl font-bold text-red-600">₹{pendingAmount.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                )}
            </div>

            <div className="md:col-span-1">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activities</h3>
                        <button onClick={() => setActiveTab('activities')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">View All</button>
                    </div>
                    {activities.length === 0 ? <p className="text-center py-4 text-gray-500">No activities</p> : (
                        <div className="space-y-3">
                            {activities.slice(0, 3).map((a: any) => (
                                <div key={a.id} className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-700">
                                    <p className="font-medium text-sm">{a.title}</p>
                                    <p className="text-xs text-gray-500">{formatDate(a.date)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderFeesTab = () => (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
                    <div className="flex items-center space-x-3">
                        <CreditCard className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Fee</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">₹{totalFeesAmount.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6">
                    <div className="flex items-center space-x-3">
                        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Paid</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">₹{totalPaidAmount.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6">
                    <div className="flex items-center space-x-3">
                        <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Remaining</p>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">₹{pendingAmount.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fee Breakdown by Academic Year */}
            {Object.entries(feesByYear).map(([year, records]: [string, any]) => (
                <div key={year} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Academic Year: {year}</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                                    <th className="pb-2 text-gray-700 dark:text-gray-300">Fee Type</th>
                                    <th className="pb-2 text-gray-700 dark:text-gray-300">Amount</th>
                                    <th className="pb-2 text-gray-700 dark:text-gray-300">Paid</th>
                                    <th className="pb-2 text-gray-700 dark:text-gray-300">Remaining</th>
                                    <th className="pb-2 text-gray-700 dark:text-gray-300">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((r: any) => {
                                    const paidAmount = r.paidAmount || 0;
                                    const remainingAmount = r.amount - paidAmount;
                                    return (
                                        <tr key={r.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                                            <td className="py-2 capitalize text-gray-900 dark:text-white">{r.feeType}</td>
                                            <td className="py-2 text-gray-900 dark:text-white">₹{r.amount.toLocaleString()}</td>
                                            <td className="py-2">
                                                <span className={paidAmount > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>
                                                    ₹{paidAmount.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="py-2">
                                                <span className={remainingAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                                                    ₹{remainingAmount.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="py-2">
                                                <div className="flex items-center space-x-2">
                                                    {getStatusIcon(r.status)}
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getStatusColor(r.status)}`}>
                                                        {r.status}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderActivitiesTab = () => (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between mb-4">
                    <h3 className="text-lg font-semibold">Activity Records</h3>
                    {user?.role === 'admin' && <button onClick={() => setShowActivityForm(true)} className="px-3 py-1 bg-blue-600 text-white rounded">Add</button>}
                </div>
                {activities.length === 0 ? <p>No records</p> : (
                    <div className="space-y-4">
                        {activities.map((a: any) => (
                            <div key={a.id} className="p-4 border rounded-lg">
                                <p className="font-bold">{a.title}</p>
                                <p className="text-sm">{a.description}</p>
                                <p className="text-xs text-gray-500 mt-2">{formatDate(a.date)}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderHolidaysTab = () => (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4">School Calendar</h3>
                {holidayEvents.length === 0 ? <p className="text-center py-8">No holidays or events</p> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {holidayEvents.map((e: HolidayEvent) => (
                            <div key={e.id} className={`p-4 rounded-xl border ${e.type === 'holiday' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
                                <p className="font-bold">{e.reason}</p>
                                <p className="text-sm text-gray-600">{formatDate(e.startDate)} - {formatDate(e.endDate)}</p>
                                <span className="text-xs font-bold uppercase">{e.type}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderAttendanceTab = () => {
        const currentSchoolHolidays = (holidayEvents || []).filter((h: HolidayEvent) => h.schoolId === student.schoolId);
        const getHolidayForDate = (dateStr: string) => currentSchoolHolidays.find((h: HolidayEvent) => dateStr >= h.startDate && dateStr <= h.endDate);

        const norm = (d: string) => (d && d.includes('T') ? d.split('T')[0] : d) || '';

        const presentSessionsMonth = attendanceRecords.filter((r: AttendanceRecord) => r.status === 'present').length;
        const totalSessionsMonth = attendanceRecords.length;
        const monthPercentage = totalSessionsMonth > 0 ? (presentSessionsMonth / totalSessionsMonth) * 100 : 0;

        const presentSessionsOverall = allAttendanceRecords.filter((r: AttendanceRecord) => r.status === 'present').length;
        const totalSessionsOverall = allAttendanceRecords.length;
        const overallPercentage = totalSessionsOverall > 0 ? (presentSessionsOverall / totalSessionsOverall) * 100 : 0;

        const absentSessions = attendanceRecords.filter((r: AttendanceRecord) => r.status === 'absent').length;

        const daysInMonth = attendanceEndDate.getDate();
        const firstDayOfMonth = attendanceStartDate.getDay();
        const calendarDays: Array<{ day: number; morningRecord?: any; afternoonRecord?: any; holiday?: HolidayEvent } | null> = [];
        for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push(null);
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = formatDateString(new Date(attendanceYear, attendanceMonth, day));
            const morningRecord = attendanceRecords.find((r: AttendanceRecord) => norm(r.date) === dateStr && r.session === 'morning');
            const afternoonRecord = attendanceRecords.find((r: AttendanceRecord) => norm(r.date) === dateStr && r.session === 'afternoon');
            calendarDays.push({ day, morningRecord, afternoonRecord, holiday: getHolidayForDate(dateStr) });
        }

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const formatAttendanceDate = (dateString: string) => {
            try {
                const [y, m, d] = (dateString.includes('T') ? dateString.split('T')[0] : dateString).split('-').map(Number);
                return new Date(y, m - 1, d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
            } catch { return dateString; }
        };

        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Attendance Overview</h3>
                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={attendanceMonth}
                            onChange={(e) => setAttendanceMonth(parseInt(e.target.value))}
                            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                        >
                            {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                        <select
                            value={attendanceYear}
                            onChange={(e) => setAttendanceYear(parseInt(e.target.value))}
                            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                        >
                            {[currentDate.getFullYear(), currentDate.getFullYear() - 1, currentDate.getFullYear() - 2].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                        <button onClick={() => setActiveTab('holidays')} className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 text-sm">
                            <Calendar className="w-4 h-4"/> View Holidays
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-green-50 dark:bg-green-900/25 rounded-xl p-4 sm:p-5 border border-green-200 dark:border-green-800/50 min-w-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-800/50 flex-shrink-0">
                                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Present sessions</p>
                                <p className="text-lg sm:text-xl font-bold text-green-700 dark:text-green-300">{presentSessionsMonth} <span className="text-xs sm:text-sm font-normal text-gray-500">of {totalSessionsMonth}</span></p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/25 rounded-xl p-4 sm:p-5 border border-blue-200 dark:border-blue-800/50 min-w-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-800/50 flex-shrink-0">
                                <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Month %</p>
                                <p className="text-lg sm:text-xl font-bold text-blue-700 dark:text-blue-300">{monthPercentage.toFixed(1)}%</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-900/25 rounded-xl p-4 sm:p-5 border border-indigo-200 dark:border-indigo-800/50 min-w-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-800/50 flex-shrink-0">
                                <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Overall %</p>
                                <p className="text-lg sm:text-xl font-bold text-indigo-700 dark:text-indigo-300">{overallPercentage.toFixed(1)}%</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/25 rounded-xl p-4 sm:p-5 border border-red-200 dark:border-red-800/50 min-w-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-800/50 flex-shrink-0">
                                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Absent</p>
                                <p className="text-lg sm:text-xl font-bold text-red-700 dark:text-red-300">{absentSessions} <span className="text-xs sm:text-sm font-normal text-gray-500">sessions</span></p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        {monthNames[attendanceMonth]} {attendanceYear} · {formatDate(formatDateString(attendanceStartDate))} – {formatDate(formatDateString(attendanceEndDate))}
                    </p>
                    <div className="grid grid-cols-7 gap-2 mb-2">
                        {dayNames.map(d => (
                            <div key={d} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                        {calendarDays.map((cell, idx) => {
                            if (!cell) return <div key={`empty-${idx}`} className="h-14" />;
                            const { day, morningRecord, afternoonRecord, holiday } = cell;
                            const isToday = currentDate.getDate() === day && currentDate.getMonth() === attendanceMonth && currentDate.getFullYear() === attendanceYear;
                            let bg = 'bg-gray-50 dark:bg-gray-700/80';
                            let border = 'border-gray-200 dark:border-gray-600';
                            if (holiday) {
                                bg = holiday.type === 'holiday' ? 'bg-red-100 dark:bg-red-900/40' : 'bg-amber-100 dark:bg-amber-900/40';
                                border = holiday.type === 'holiday' ? 'border-red-300 dark:border-red-700' : 'border-amber-300 dark:border-amber-700';
                            } else if (isToday) {
                                bg = 'bg-blue-100 dark:bg-blue-900/40';
                                border = 'border-blue-400 dark:border-blue-600';
                            }
                            return (
                                <div key={day} className={`h-14 min-h-[3.5rem] p-1.5 border rounded-lg ${border} ${bg} flex flex-col shrink-0`} title={holiday ? (holiday.title || holiday.reason) : undefined}>
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">{day}</span>
                                    {holiday ? (
                                        <span className="text-[10px] leading-tight text-gray-600 dark:text-gray-400 truncate mt-0.5">{(holiday.title || holiday.reason).slice(0, 10)}</span>
                                    ) : (
                                        <div className="flex gap-1 flex-1 min-h-0 mt-1">
                                            <div className={`flex-1 min-w-0 rounded ${morningRecord?.status === 'present' ? 'bg-green-500' : morningRecord?.status === 'absent' ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`} title="Morning" />
                                            <div className={`flex-1 min-w-0 rounded ${afternoonRecord?.status === 'present' ? 'bg-green-500' : afternoonRecord?.status === 'absent' ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`} title="Afternoon" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1.5"><span className="inline-flex w-4 h-2 rounded bg-green-500"/> Present</span>
                        <span className="flex items-center gap-1.5"><span className="inline-flex w-4 h-2 rounded bg-red-500"/> Absent</span>
                        <span className="flex items-center gap-1.5"><span className="inline-flex w-4 h-2 rounded bg-gray-400"/> No record</span>
                        <span className="flex items-center gap-1.5"><span className="inline-flex w-3 h-3 rounded bg-red-100 dark:bg-red-900/40 border border-red-300"/> Holiday</span>
                        <span className="flex items-center gap-1.5"><span className="inline-flex w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/40 border border-amber-300"/> Event</span>
                    </div>
                </div>

                {attendanceRecords.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Recent attendance</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {[...attendanceRecords]
                                .sort((a, b) => (b.timestamp || b.date || '').localeCompare(a.timestamp || a.date || ''))
                                .slice(0, 8)
                                .map(record => (
                                    <div key={record.id} className="flex justify-between items-center py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-700/80">
                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                            {formatAttendanceDate(record.date)} · {record.session === 'morning' ? 'Morning' : 'Afternoon'}
                                        </span>
                                        <span className={`inline-flex items-center gap-1 text-sm font-medium ${record.status === 'present' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {record.status === 'present' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                            {record.status === 'present' ? 'Present' : 'Absent'}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const studentLeaves = (studentLeaveApplications || []).filter((a: { studentId: string }) => a.studentId === student.id);

    const renderLeavesTab = () => (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Leave history
                </h3>
                {studentLeaves.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">No leave applications recorded.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                                    <th className="pb-2 text-gray-700 dark:text-gray-300">Type</th>
                                    <th className="pb-2 text-gray-700 dark:text-gray-300">From</th>
                                    <th className="pb-2 text-gray-700 dark:text-gray-300">To</th>
                                    <th className="pb-2 text-gray-700 dark:text-gray-300">Reason</th>
                                    <th className="pb-2 text-gray-700 dark:text-gray-300">Status</th>
                                    <th className="pb-2 text-gray-700 dark:text-gray-300">Reviewed</th>
                                </tr>
                            </thead>
                            <tbody>
                                {studentLeaves
                                    .sort((a: { fromDate: string }, b: { fromDate: string }) => new Date(b.fromDate).getTime() - new Date(a.fromDate).getTime())
                                    .map((leave: { id: string; leaveType: string; fromDate: string; toDate: string; reason?: string; status: string; reviewedAt?: string }) => (
                                        <tr key={leave.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                                            <td className="py-2 capitalize text-gray-900 dark:text-white">{leave.leaveType}</td>
                                            <td className="py-2 text-gray-900 dark:text-white">{formatDate(leave.fromDate)}</td>
                                            <td className="py-2 text-gray-900 dark:text-white">{formatDate(leave.toDate)}</td>
                                            <td className="py-2 text-gray-600 dark:text-gray-300 max-w-xs truncate" title={leave.reason || ''}>{leave.reason || '–'}</td>
                                            <td className="py-2">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                                                    leave.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                                                    leave.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                                                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                                }`}>
                                                    {leave.status}
                                                </span>
                                            </td>
                                            <td className="py-2 text-gray-600 dark:text-gray-400">{leave.reviewedAt ? formatDate(leave.reviewedAt) : '–'}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="p-6">
            <div className="mb-6">
                <button onClick={onBack} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"><ArrowLeft className="w-5 h-5" /> Back</button>
            </div>

            <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
                {['overview', 'attendance', ...(user?.role !== 'teacher' ? ['fees'] : []), 'activities', 'examination', 'holidays', 'leaves'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-4 py-2 rounded-lg capitalize transition-colors ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'fees' && user?.role !== 'teacher' && renderFeesTab()}
            {activeTab === 'activities' && (
                <div className="space-y-6">
                    {renderActivitiesTab()}
                    {showActivityForm && <ActivityForm studentId={student.id} onClose={() => setShowActivityForm(false)} />}
                </div>
            )}
            {activeTab === 'attendance' && renderAttendanceTab()}
            {activeTab === 'holidays' && renderHolidaysTab()}
            {activeTab === 'leaves' && renderLeavesTab()}
        </div>
    );
}
