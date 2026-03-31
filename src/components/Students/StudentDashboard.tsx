import React, { useState } from 'react';
import { Activity, AlertTriangle, BookOpen, Calendar, CheckCircle, CreditCard, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { Student } from '../../types';

interface StudentDashboardProps {
    overrideStudent?: Student | null;
}

export function StudentDashboard({ overrideStudent }: StudentDashboardProps = {}) {
    const { holidayEvents, students, getFeesByStudent, getActivitiesByStudent, getAttendanceByStudent } = useSchoolData();
    const { user } = useAuth();

    const studentRecord = overrideStudent ?? students.find(s => s.admissionNumber === user?.admissionNumber);

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

    // Get student's data
    const feeRecords = getFeesByStudent(studentRecord.id);
    const activitiesData = getActivitiesByStudent(studentRecord.id);
    const activities = [...activitiesData].map(a => ({ ...a, category: a.category as string }));

    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const attendanceRecords = getAttendanceByStudent(studentRecord.id, {
        start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    // Calculate statistics
    const totalFeesAmount = feeRecords.reduce((total, record) => total + record.amount, 0);
    const totalPaidAmount = feeRecords.reduce((total, record) => {
        if (record.status === 'paid') return total + record.amount;
        if (record.status === 'partial' && record.paidAmount) return total + record.paidAmount;
        return total;
    }, 0);
    const pendingAmount = totalFeesAmount - totalPaidAmount;

    // Calculate attendance based on sessions (each day has 2 sessions: morning and afternoon)
    const presentSessions = attendanceRecords.filter(record => record.status === 'present').length;
    const totalSessions = attendanceRecords.length;
    // Calculate total possible sessions for the period (approximately)
    const startDate = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
    const endDate = new Date();
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalPossibleSessions = daysDiff * 2;
    const attendancePercentage = totalPossibleSessions > 0 ? (presentSessions / totalPossibleSessions) * 100 : 0;

    const [selectedActivity, setSelectedActivity] = useState<any>(null);
    const [selectedHoliday, setSelectedHoliday] = useState<any>(null);
    const recentActivities = activities.slice(0, 5);
    
    // Get current date in YYYY-MM-DD format for comparison
    const getCurrentDateString = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    };
    const today = getCurrentDateString();
    
    // Filter out past events and sort by startDate ascending (upcoming first)
    const sortedHolidays = [...currentSchoolHolidays]
        .filter((holiday: any) => holiday.endDate >= today) // Only show events that haven't ended
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()); // Sort by startDate ascending

    const positiveActivities = activities.filter(a => a.type === 'positive').length;
    const negativeActivities = activities.filter(a => a.type === 'negative').length;

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="p-6">
            {/* Welcome Header */}
            <div className="mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome, {studentRecord.firstName} {studentRecord.lastName || ''}!</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Class {studentRecord.studentClass}-{studentRecord.section} • {studentRecord.medium} Medium •
                        Admission No: {studentRecord.admissionNumber}
                    </p>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">This Month Attendance</p>
                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">{attendancePercentage.toFixed(1)}%</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    <div className="mt-2 text-xs text-blue-700 dark:text-blue-300">
                        {presentSessions} out of {totalPossibleSessions} sessions
                    </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-green-600 dark:text-green-400 text-sm font-medium">Fees Paid</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-300">₹{totalPaidAmount.toLocaleString()}</p>
                        </div>
                        <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    <div className="mt-2 text-xs text-green-700 dark:text-blue-300">
                        Total fees: ₹{totalFeesAmount.toLocaleString()}
                    </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-red-600 dark:text-red-400 text-sm font-medium">Pending Fees</p>
                            <p className="text-2xl font-bold text-red-900 dark:text-red-300">₹{pendingAmount.toLocaleString()}</p>
                        </div>
                        <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
                            <CreditCard className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    <div className="mt-2 text-xs text-red-700 dark:text-blue-300">
                        {feeRecords.filter(r => r.status === 'pending' || r.status === 'overdue').length} pending payments
                    </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">Total Activities</p>
                            <p className="text-2xl font-bold text-purple-900 dark:text-blue-300">{activities.length}</p>
                        </div>
                        <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    <div className="mt-2 text-xs text-purple-700 dark:text-blue-300">
                        {positiveActivities} positive, {negativeActivities} negative
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Recent Activities and Holidays/Events */}
                <div className="space-y-6">
                    {/* Recent Activities */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activities</h3>

                        {recentActivities.length === 0 ? (
                            <div className="text-center py-8">
                                <Activity className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                <p className="text-gray-500 dark:text-gray-400">No activities recorded yet</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {recentActivities.map((activity: any) => (
                                    <div
                                        key={activity.id}
                                        className={`p-4 rounded-lg border transition-all ${
                                            activity.type === 'positive'
                                                ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                                                : 'border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className={`font-medium ${
                                                    activity.type === 'positive' ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'
                                                }`}>
                                                    {activity.title}
                                                </h4>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                    Category: <span className="capitalize">{activity.category}</span>
                                                </p>
                                            </div>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(activity.date)}</span>
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{activity.description}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Holidays/Events */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Holidays/Events</h3>

                        {sortedHolidays.length === 0 ? (
                            <div className="text-center py-8">
                                <Calendar className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                <p className="text-gray-500 dark:text-gray-400">No upcoming holidays or events</p>
                            </div>
                        ) : (
                            <div className="max-h-[500px] overflow-y-auto pr-2 space-y-4">
                                {sortedHolidays.map((holiday: any) => (
                                    <div
                                        key={holiday.id}
                                        onClick={() => setSelectedHoliday(holiday)}
                                        className={`p-4 rounded-lg border cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all ${
                                            holiday.type === 'holiday'
                                                ? 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                                                : 'border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className={`font-medium ${
                                                    holiday.type === 'holiday' ? 'text-red-700 dark:text-red-400' : 'text-orange-700 dark:text-orange-400'
                                                }`}>
                                                    {holiday.title || (holiday.type === 'holiday' ? 'Holiday' : 'Event')}
                                                </h4>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                    {holiday.startDate}{holiday.startDate !== holiday.endDate ? ` to ${holiday.endDate}` : ''}
                                                </p>
                                            </div>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(holiday.startDate)}</span>
                                        </div>
                                        {holiday.reason && (
                                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                                                {holiday.reason.length > 50 ? holiday.reason.substring(0, 50) + '...' : holiday.reason}
                                            </p>
                                        )}
                                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium flex items-center">
                                            Click to view details
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal for Holiday/Event Details */}
                {selectedHoliday && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                                    <Calendar className={`w-5 h-5 mr-2 ${selectedHoliday.type === 'holiday' ? 'text-red-500' : 'text-orange-500'}`} />
                                    {selectedHoliday.title || (selectedHoliday.type === 'holiday' ? 'Holiday' : 'Event')} Details
                                </h3>
                                <button 
                                    onClick={() => setSelectedHoliday(null)}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                >
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="p-6 space-y-5">
                                <div>
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Title</p>
                                    <p className="mt-1.5 text-gray-900 dark:text-white font-semibold text-lg">
                                        {selectedHoliday.title || (selectedHoliday.type === 'holiday' ? 'Holiday' : 'Event')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Date / Date Range</p>
                                    <p className="mt-1.5 text-gray-900 dark:text-white font-semibold text-lg">
                                        {selectedHoliday.startDate}{selectedHoliday.startDate !== selectedHoliday.endDate ? ` to ${selectedHoliday.endDate}` : ''}
                                    </p>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700">
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Reason</p>
                                    <p className="text-gray-900 dark:text-white leading-relaxed whitespace-pre-wrap">{selectedHoliday.reason || 'No reason provided.'}</p>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                                <button
                                    onClick={() => setSelectedHoliday(null)}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all active:scale-95"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Fee Status - only for parent dashboard (when viewing a child); hidden on student panel */}
                {overrideStudent && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Fee Status</h3>

                    {feeRecords.length === 0 ? (
                        <div className="text-center py-8">
                            <CreditCard className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                            <p className="text-gray-500 dark:text-gray-400">No fee records found</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Fee Summary - stack on mobile so amounts don't overlap */}
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                                    <div className="min-w-0">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                                        <p className="font-bold text-gray-900 dark:text-white truncate" title={`₹${totalFeesAmount.toLocaleString()}`}>₹{totalFeesAmount.toLocaleString()}</p>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Paid</p>
                                        <p className="font-bold text-green-600 dark:text-green-400 truncate" title={`₹${totalPaidAmount.toLocaleString()}`}>₹{totalPaidAmount.toLocaleString()}</p>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                                        <p className="font-bold text-red-600 dark:text-red-400 truncate" title={`₹${pendingAmount.toLocaleString()}`}>₹{pendingAmount.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Fee Records */}
                            <div className="space-y-3">
                                <h4 className="font-medium text-gray-900 dark:text-white">Recent Payments</h4>
                                {feeRecords.slice(0, 3).map(record => (
                                    <div key={record.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg min-w-0">
                                        <div className="min-w-0">
                                            <p className="font-medium text-gray-900 dark:text-white capitalize">{record.feeType}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {record.academicYear} • Due: {formatDate(record.dueDate)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 sm:text-right flex-shrink-0">
                                            <p className="font-medium text-gray-900 dark:text-white">₹{record.amount.toLocaleString()}</p>
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${record.status === 'paid' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                                                    record.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' :
                                                        record.status === 'overdue' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' :
                                                            'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                                                }`}>
                                                {record.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                )}
            </div>

            {/* Quick Actions - proper spacing on mobile so buttons don't look merged */}
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <button
                        onClick={() => window.location.hash = '#attendance'}
                        className="p-4 min-w-0 flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800">
                        <Calendar className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400 mb-2 flex-shrink-0" />
                        <p className="text-xs sm:text-sm font-medium text-blue-900 dark:text-blue-300 text-center leading-tight">View Attendance</p>
                    </button>
                    <button
                        onClick={() => window.location.hash = '#fees'}
                        className="p-4 min-w-0 flex flex-col items-center justify-center bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors border border-transparent hover:border-green-200 dark:hover:border-green-800">
                        <CreditCard className="w-7 h-7 sm:w-8 sm:h-8 text-green-600 dark:text-green-400 mb-2 flex-shrink-0" />
                        <p className="text-xs sm:text-sm font-medium text-green-900 dark:text-green-300 text-center leading-tight">Check Fees</p>
                    </button>
                    <button
                        onClick={() => window.location.hash = '#results'}
                        className="p-4 min-w-0 flex flex-col items-center justify-center bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors border border-transparent hover:border-purple-200 dark:hover:border-purple-800">
                        <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 text-purple-600 dark:text-purple-400 mb-2 flex-shrink-0" />
                        <p className="text-xs sm:text-sm font-medium text-purple-900 dark:text-purple-300 text-center leading-tight">View Results</p>
                    </button>
                    <button
                        onClick={() => window.location.hash = '#activities'}
                        className="p-4 min-w-0 flex flex-col items-center justify-center bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors border border-transparent hover:border-orange-200 dark:hover:border-orange-800">
                        <Activity className="w-7 h-7 sm:w-8 sm:h-8 text-orange-600 dark:text-orange-400 mb-2 flex-shrink-0" />
                        <p className="text-xs sm:text-sm font-medium text-orange-900 dark:text-orange-300 text-center leading-tight">My Activities</p>
                    </button>
                </div>
            </div>
        </div>
    );
}