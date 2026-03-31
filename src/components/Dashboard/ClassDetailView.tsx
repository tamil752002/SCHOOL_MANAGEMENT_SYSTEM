import { ArrowLeft, BookOpen, Calendar, DollarSign, FileText, TrendingUp, UserCircle, Users } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { Student } from '../../types';

const getApiBase = () => (import.meta.env.DEV ? window.location.origin : 'http://0.0.0.0:8000');

interface ClassDetailViewProps {
    className: string;
    onBack: () => void;
}

// Helper function to safely get student display name
function getStudentDisplayName(student: Student & { studentName?: string }): string {
    if (student.studentName && student.studentName.trim()) {
        return student.studentName;
    }
    const parts = [student.firstName, student.middleName, student.lastName].filter(Boolean);
    return parts.join(' ').trim() || '';
}

const normalizeClass = (name: string) =>
    (name || '').toLowerCase().replace(/^class\s+/g, '').replace(/\s+class$/g, '').replace(/st|nd|rd|th/g, '').trim();

export function ClassDetailView({ className, onBack }: ClassDetailViewProps) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const {
        students,
        classes,
        teachers,
        getStudentsByClass,
        getAttendanceByClass,
        feeRecords,
        examRecords,
        studentActivities,
        getFeesByStudent,
        refreshClasses
    } = useSchoolData();
    const schoolId = (user as { schoolId?: string })?.schoolId;

    const [savingIncharge, setSavingIncharge] = useState(false);

    const classInfo = classes.find(c => normalizeClass(c.name) === normalizeClass(className));
    const inchargeTeacher = classInfo?.classInchargeTeacherId
        ? teachers.find((t: { id: string }) => t.id === classInfo.classInchargeTeacherId)
        : null;

    const classStudents = getStudentsByClass(className);
    const today = new Date().toISOString().split('T')[0];
    // Get attendance for both sessions today
    const todayAttendanceMorning = getAttendanceByClass(className, today, 'morning');
    const todayAttendanceAfternoon = getAttendanceByClass(className, today, 'afternoon');
    const todayAttendance = [...todayAttendanceMorning, ...todayAttendanceAfternoon];

    // Calculate various statistics based on sessions
    const totalStudents = classStudents.length;
    const totalPossibleSessions = totalStudents * 2; // Each student has 2 sessions per day
    const presentSessions = todayAttendance.filter(a => a.status === 'present').length;
    const absentSessions = todayAttendance.filter(a => a.status === 'absent').length;
    const attendancePercentage = totalPossibleSessions > 0 ? (presentSessions / totalPossibleSessions) * 100 : 0;

    // Fee statistics for the class - use getFeesByStudent to get deduplicated fees
    const classFeeRecords: typeof feeRecords = [];
    classStudents.forEach(student => {
        const studentFees = getFeesByStudent(student.id);
        classFeeRecords.push(...studentFees);
    });

    const totalFeesCollected = classFeeRecords
        .filter(r => r.status === 'paid')
        .reduce((sum, r) => sum + (r.paidAmount || r.amount), 0);

    const totalFeesPending = classFeeRecords
        .filter(r => r.status === 'pending' || r.status === 'overdue')
        .reduce((sum, r) => sum + r.amount, 0);

    const feeCollectionRate = (totalFeesCollected + totalFeesPending) > 0 ?
        (totalFeesCollected / (totalFeesCollected + totalFeesPending)) * 100 : 100;

    // Exam statistics
    const classExamRecords = examRecords.filter(record => {
        const student = students.find(s => s.id === record.studentId);
        return student && student.studentClass === className;
    });

    const averageMarks = classExamRecords.length > 0 ?
        classExamRecords.reduce((sum, record) => sum + (record.obtainedMarks / record.maxMarks) * 100, 0) / classExamRecords.length : 0;

    // Recent activities for this class
    const classActivities = studentActivities.filter(activity => {
        const student = students.find(s => s.id === activity.studentId);
        return student && student.studentClass === className;
    }).slice(0, 5);

    // Grade distribution
    const gradeDistribution = classExamRecords.reduce((acc, record) => {
        acc[record.grade] = (acc[record.grade] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="p-4 sm:p-6 space-y-6 min-w-0 overflow-x-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 sm:mb-8">
                <button
                    onClick={onBack}
                    className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors self-start"
                >
                    <ArrowLeft className="w-5 h-5 flex-shrink-0" />
                    <span>Back to Dashboard</span>
                </button>
                <div className="sm:border-l border-gray-300 dark:border-gray-600 sm:pl-4">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Class {className} Report</h1>
                    <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">Comprehensive overview and statistics</p>
                </div>
            </div>

            {/* In-charge teacher */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <UserCircle className="w-4 h-4" />
                    Class in-charge
                </h3>
                {inchargeTeacher ? (
                    <p className="text-gray-900 dark:text-white font-medium">{inchargeTeacher.name}</p>
                ) : (
                    <p className="text-gray-500 dark:text-gray-400">No in-charge assigned.</p>
                )}
                {classInfo?.id && schoolId && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <label htmlFor="incharge-select" className="text-sm text-gray-600 dark:text-gray-400">Set in-charge:</label>
                        <select
                            id="incharge-select"
                            value={classInfo.classInchargeTeacherId || ''}
                            disabled={savingIncharge}
                            onChange={async (e) => {
                                const teacherId = e.target.value || null;
                                setSavingIncharge(true);
                                try {
                                    const res = await fetch(`${getApiBase()}/api/classes/${classInfo.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ classInchargeTeacherId: teacherId || null })
                                    });
                                    if (res.ok) await refreshClasses(schoolId);
                                } finally {
                                    setSavingIncharge(false);
                                }
                            }}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">— None —</option>
                            {teachers.map((t: { id: string; name: string }) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        {savingIncharge && <span className="text-xs text-gray-500 dark:text-gray-400">Saving…</span>}
                        <a
                            href="/teachers"
                            onClick={(e) => { e.preventDefault(); navigate('/teachers'); }}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            Assign in Teachers →
                        </a>
                    </div>
                )}
                {(!classInfo?.id || !schoolId) && (
                    <a
                        href="/teachers"
                        onClick={(e) => { e.preventDefault(); navigate('/teachers'); }}
                        className="inline-block mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        Assign in Teachers →
                    </a>
                )}
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-600 dark:text-blue-300 text-sm font-medium">Total Students</p>
                            <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{totalStudents}</p>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Active enrolled</p>
                        </div>
                        <div className="bg-blue-600 p-3 rounded-xl">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-6 border border-green-100 dark:border-green-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-green-600 dark:text-green-300 text-sm font-medium">Today's Attendance</p>
                            <p className="text-3xl font-bold text-green-900 dark:text-green-100">{attendancePercentage.toFixed(1)}%</p>
                            <p className="text-xs text-green-700 dark:text-green-300 mt-1">{presentSessions}/{totalPossibleSessions} sessions present</p>
                        </div>
                        <div className="bg-green-600 p-3 rounded-xl">
                            <Calendar className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-6 border border-purple-100 dark:border-purple-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-purple-600 dark:text-purple-300 text-sm font-medium">Fee Collection</p>
                            <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{feeCollectionRate.toFixed(1)}%</p>
                            <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">₹{totalFeesCollected.toLocaleString()} collected</p>
                        </div>
                        <div className="bg-purple-600 p-3 rounded-xl">
                            <DollarSign className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-6 border border-orange-100 dark:border-orange-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-orange-600 dark:text-orange-300 text-sm font-medium">Average Score</p>
                            <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">{averageMarks.toFixed(1)}%</p>
                            <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">{classExamRecords.length} exam records</p>
                        </div>
                        <div className="bg-orange-600 p-3 rounded-xl">
                            <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Student List */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Students in Class {className}</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto overflow-x-hidden">
                        {classStudents.map(student => {
                            const studentAttendance = todayAttendance.find(a => a.studentId === student.id);
                            // Use getFeesByStudent to get deduplicated fees (removes old duplicate entries)
                            const studentFees = getFeesByStudent(student.id);
                            const pendingFees = studentFees.filter(f => f.status === 'pending' || f.status === 'overdue').length;

                            return (
                                <div key={student.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg min-w-0">
                                    <div className="flex items-center space-x-3 min-w-0 flex-shrink-0">
                                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                                            <span className="text-blue-600 dark:text-blue-300 font-semibold text-sm">
                                                {(getStudentDisplayName(student) || '?').charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium text-gray-900 dark:text-white truncate">{getStudentDisplayName(student) || 'Unknown Student'}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 truncate">Section {student.section} • {student.admissionNumber}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                                        {studentAttendance && (
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${studentAttendance.status === 'present'
                                                ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                                                : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'
                                                }`}>
                                                {studentAttendance.status}
                                            </span>
                                        )}
                                        {pendingFees > 0 && (
                                            <span className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap">
                                                {pendingFees} pending fees
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Performance & Activities */}
                <div className="space-y-6">
                    {/* Grade Distribution */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Grade Distribution</h3>
                        {Object.keys(gradeDistribution).length > 0 ? (
                            <div className="space-y-3">
                                {Object.entries(gradeDistribution).map(([grade, count]) => (
                                    <div key={grade} className="flex items-center justify-between">
                                        <span className="font-medium text-gray-900 dark:text-white">Grade {grade}</span>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                                <div
                                                    className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full"
                                                    style={{ width: `${(count / classExamRecords.length) * 100}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-sm text-gray-600 dark:text-gray-300">{count}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No exam records available</p>
                        )}
                    </div>

                    {/* Recent Activities */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Class Activities</h3>
                        <div className="space-y-3">
                            {classActivities.length > 0 ? (
                                classActivities.map(activity => {
                                    const student = students.find(s => s.id === activity.studentId);
                                    return (
                                        <div key={activity.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">{activity.title}</p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-300">{student ? getStudentDisplayName(student) : 'Unknown Student'}</p>
                                                </div>
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${activity.type === 'positive'
                                                    ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                                                    : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300'
                                                    }`}>
                                                    {activity.type}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-gray-500 dark:text-gray-400 text-center py-4">No recent activities</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons - wrap on small screens */}
            <div className="flex flex-wrap gap-3 sm:gap-4">
                <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span>Mark Attendance</span>
                </button>
                <button className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                    <DollarSign className="w-4 h-4 flex-shrink-0" />
                    <span>Collect Fees</span>
                </button>
                <button className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                    <BookOpen className="w-4 h-4 flex-shrink-0" />
                    <span>Enter Marks</span>
                </button>
                <button className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span>Generate Report</span>
                </button>
            </div>
        </div>
    );
} 