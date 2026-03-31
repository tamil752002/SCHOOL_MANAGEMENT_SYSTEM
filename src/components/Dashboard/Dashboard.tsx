import { AlertTriangle, BookOpen, Calendar, CheckCircle, CreditCard, DollarSign, Users } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { formatCurrency } from '../../utils/formatCurrency';
import { sortClasses } from '../../utils/sortClasses';
import { ClassDetailView } from './ClassDetailView';
import DashboardStatsService from '../../services/DashboardStatsService';

interface DashboardProps {
  onNavigate?: (view: string, studentId?: string) => void;
}

export function Dashboard({ onNavigate: onNavigateProp }: DashboardProps) {
  const navigate = useNavigate();
  const onNavigate = onNavigateProp ?? ((view: string) => navigate(`/${view}`));
  const {
    getAttendanceStats,
    getFeeStats,
    classes,
    attendanceRecords,
    feeRecords,
    studentActivities,
    students,
    exams,
    settings
  } = useSchoolData();

  const { user } = useAuth();
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  // Get current school ID from user context
  const getCurrentSchoolId = () => {
    if (user?.role === 'admin') {
      const adminUser = user as { id: string; role: string; schoolId?: string };
      return adminUser.schoolId;
    }
    return null;
  };

  // Filter students by current school
  const currentSchoolId = getCurrentSchoolId();
  const schoolStudents = currentSchoolId ?
    students.filter(student => student.schoolId === currentSchoolId) :
    students;

  const attendanceStats = getAttendanceStats();
  const feeStats = getFeeStats();

  // If a class is selected, show the detailed view
  if (selectedClass) {
    return (
      <ClassDetailView
        className={selectedClass}
        onBack={() => setSelectedClass(null)}
      />
    );
  }

  // Helper function to calculate time ago
  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInMs = Math.abs(now.getTime() - date.getTime());
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);

    // Handle invalid dates
    if (isNaN(diffInMs)) {
      return 'Unknown time';
    }

    // Very recent
    if (diffInSeconds < 30) return 'Just now';
    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;

    // Minutes
    if (diffInMinutes < 60) {
      return diffInMinutes === 1 ? '1 minute ago' : `${diffInMinutes} minutes ago`;
    }

    // Hours
    if (diffInHours < 24) {
      return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
    }

    // Days
    if (diffInDays < 7) {
      return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
    }

    // Weeks
    if (diffInWeeks < 4) {
      return diffInWeeks === 1 ? '1 week ago' : `${diffInWeeks} weeks ago`;
    }

    // Months  
    if (diffInMonths < 12) {
      return diffInMonths === 1 ? '1 month ago' : `${diffInMonths} months ago`;
    }

    // For older dates, show the actual date
    return date.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  // Parse date string (YYYY-MM-DD or ISO) as local date so "today" / "yesterday" work correctly
  const parseActivityDate = (value: string | Date | null | undefined): Date | null => {
    if (value == null) return null;
    try {
      const str = typeof value === 'string' ? value.trim() : '';
      if (str) {
        const d = new Date(value);
        if (!isNaN(d.getTime())) return d;
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
          const [y, m, d2] = str.split('-').map(Number);
          const local = new Date(y, m - 1, d2, 12, 0, 0);
          if (!isNaN(local.getTime())) return local;
        }
      }
    } catch {
      // ignore
    }
    return null;
  };

  const getActivityTimestamp = (originalTimestamp: string | Date | null | undefined, fallbackHoursAgo: number = 1): Date => {
    const parsed = parseActivityDate(originalTimestamp);
    if (parsed) return parsed;
    const fallback = new Date();
    fallback.setHours(fallback.getHours() - fallbackHoursAgo);
    return fallback;
  };

  const formatAbsoluteDate = (date: Date): string => {
    if (!date || isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const normalize = (name: string) => {
    if (!name) return '';
    return name.toLowerCase()
      .replace(/^class\s+/g, '')
      .replace(/\s+class$/g, '')
      .replace(/st|nd|rd|th/g, '')
      .trim();
  };

  const getRecentActivities = () => {
    const activities: Array<{
      type: string;
      message: string;
      time: string;
      timestamp: Date;
      priority: 'low' | 'medium' | 'high';
      category: string;
    }> = [];

    const now = new Date();

    const attendanceByClassAndDate = attendanceRecords.reduce((acc, record) => {
      // Only process records for students in the current school
      const student = schoolStudents.find(s => s.id === record.studentId);
      if (student) {
        const key = `${normalize(student.studentClass)}-${student.section}-${record.date}`;
        if (!acc[key]) {
          acc[key] = {
            className: student.studentClass,
            section: student.section,
            date: record.date,
            timestamp: record.timestamp,
            totalStudents: schoolStudents.filter(s => normalize(s.studentClass) === normalize(student.studentClass) && s.section === student.section).length,
            presentCount: 0,
            absentCount: 0,
            records: []
          };
        }
        acc[key].records.push(record);
        if (record.status === 'present') {
          acc[key].presentCount++;
        } else {
          acc[key].absentCount++;
        }
      }
      return acc;
    }, {} as Record<string, any>);

    // Convert to array and sort by timestamp, take recent 8 class attendance sessions
    const recentClassAttendance = Object.values(attendanceByClassAndDate)
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);

    recentClassAttendance.forEach((classAttendance: any, index) => {
      const recordTime = getActivityTimestamp(classAttendance.timestamp, index + 1);
      const attendanceRate = Math.round((classAttendance.presentCount / (classAttendance.presentCount + classAttendance.absentCount)) * 100);
      const totalMarked = classAttendance.presentCount + classAttendance.absentCount;

      activities.push({
        type: 'attendance',
        message: `📋 Attendance taken for Class ${classAttendance.className}-${classAttendance.section} - ${classAttendance.presentCount}/${totalMarked} present (${attendanceRate}% attendance)`,
        time: getTimeAgo(recordTime),
        timestamp: recordTime,
        priority: attendanceRate < 80 ? 'medium' : 'low',
        category: 'Attendance'
      });
    });

    // Get recent fee payments with more details (filtered by current school)
    const recentFeePayments = feeRecords
      .filter(record => {
        // Only include fee records for students in the current school
        const student = schoolStudents.find(s => s.id === record.studentId);
        return student && record.status === 'paid' && record.paidDate;
      })
      .sort((a, b) => new Date(b.paidDate!).getTime() - new Date(a.paidDate!).getTime())
      .slice(0, 12);

    recentFeePayments.forEach((record, index) => {
      const student = schoolStudents.find(s => s.id === record.studentId);
      if (student) {
        // Use actual payment date or create reasonable timestamp
        const paymentTime = getActivityTimestamp(record.paidDate || record.dueDate, (index + 1) * 2);
        activities.push({
          type: 'fee',
          message: `💰 Fee payment of ₹${(record.paidAmount || record.amount).toLocaleString()} received from ${student.firstName} ${student.lastName} (${record.feeType})`,
          time: getTimeAgo(paymentTime),
          timestamp: paymentTime,
          priority: 'medium',
          category: 'Finance'
        });
      }
    });

    // Get recent overdue fees (important alerts) (filtered by current school)
    const recentOverdueRecords = feeRecords
      .filter(record => {
        // Only include fee records for students in the current school
        const student = schoolStudents.find(s => s.id === record.studentId);
        return student && record.status === 'overdue';
      })
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
      .slice(0, 8);

    recentOverdueRecords.forEach((record, index) => {
      const student = schoolStudents.find(s => s.id === record.studentId);
      if (student) {
        const overdueTime = getActivityTimestamp(record.dueDate, (index + 1) * 24);
        const daysPastDue = Math.floor((now.getTime() - new Date(record.dueDate).getTime()) / (1000 * 60 * 60 * 24));
        activities.push({
          type: 'fee_overdue',
          message: `⚠️ ${student.firstName} ${student.lastName} has overdue ${record.feeType} payment (${Math.max(0, daysPastDue)} days past due)`,
          time: getTimeAgo(overdueTime),
          timestamp: overdueTime,
          priority: 'high',
          category: 'Finance Alert'
        });
      }
    });

    // Get recent student activities with enhanced messaging (filtered by current school)
    const recentStudentActivities = studentActivities
      .filter(activity => {
        // Only include activities for students in the current school
        const student = schoolStudents.find(s => s.id === activity.studentId);
        return student !== undefined;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 12);

    recentStudentActivities.forEach((activity, index) => {
      const student = schoolStudents.find(s => s.id === activity.studentId);
      if (student) {
        // Use actual activity date
        const activityTime = getActivityTimestamp(activity.date, (index + 1) * 6);
        activities.push({
          type: activity.type === 'positive' ? 'positive_activity' : 'negative_activity',
          message: `${activity.type === 'positive' ? '🌟' : '⚡'} ${activity.title} - ${student.firstName} ${student.lastName} (Class ${student.studentClass})`,
          time: getTimeAgo(activityTime),
          timestamp: activityTime,
          priority: activity.type === 'negative' ? 'high' : 'low',
          category: 'Student Activity'
        });
      }
    });

    // Get recent student admissions (new enrollments) (filtered by current school)
    const recentAdmissions = schoolStudents
      .filter(student => {
        const admissionDate = new Date(student.admissionDate);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return student.status === 'active' && admissionDate >= thirtyDaysAgo;
      })
      .sort((a, b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime())
      .slice(0, 10);

    recentAdmissions.forEach((student, index) => {
      const admissionTime = getActivityTimestamp(student.admissionDate, (index + 1) * 12);
      activities.push({
        type: 'student',
        message: `🎓 New student enrolled: ${student.firstName} ${student.lastName} in Class ${student.studentClass}-${student.section} (${student.admissionNumber})`,
        time: getTimeAgo(admissionTime),
        timestamp: admissionTime,
        priority: 'medium',
        category: 'Enrollment'
      });
    });

    // Get recent exam activities with detailed status (filtered by current school)
    const filteredExams = exams
      .filter(exam => {
        // Only include exams associated with the current school
        return !currentSchoolId || exam.schoolId === currentSchoolId;
      })
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
      .slice(0, 8);

    const { holidayEvents } = useSchoolData();
    const recentHolidays = (holidayEvents || [])
      .filter(event => !currentSchoolId || event.schoolId === currentSchoolId)
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
      .slice(0, 5);

    recentHolidays.forEach((event, index) => {
      const eventTime = getActivityTimestamp(event.startDate, index + 1);
      activities.push({
        type: 'holiday',
        message: `🏖️ ${event.type === 'holiday' ? 'Holiday' : 'Event'}: ${event.reason} (${event.startDate}${event.startDate !== event.endDate ? ` to ${event.endDate}` : ''})`,
        time: getTimeAgo(eventTime),
        timestamp: eventTime,
        priority: 'medium',
        category: 'Calendar'
      });
    });

    filteredExams.forEach((exam, index) => {
      const examTime = getActivityTimestamp(exam.startDate, (index + 1) * 8);

      if (exam.status === 'completed') {
        activities.push({
          type: 'exam',
          message: `📋 ${exam.type} exam completed for Class ${exam.className} - Results available`,
          time: getTimeAgo(examTime),
          timestamp: examTime,
          priority: 'medium',
          category: 'Examinations'
        });
      } else if (exam.status === 'ongoing') {
        activities.push({
          type: 'exam',
          message: `📝 ${exam.type} exam ongoing for Class ${exam.className} - In progress`,
          time: getTimeAgo(examTime),
          timestamp: examTime,
          priority: 'high',
          category: 'Examinations'
        });
      } else if (exam.status === 'scheduled') {
        const startDate = new Date(exam.startDate);
        const daysUntil = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Show scheduled exams starting within next 7 days
        if (daysUntil >= 0 && daysUntil <= 7) {
          activities.push({
            type: 'exam',
            message: `📅 ${exam.type} exam scheduled for Class ${exam.className} - Starts in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
            time: getTimeAgo(examTime),
            timestamp: examTime,
            priority: daysUntil <= 2 ? 'high' : 'medium',
            category: 'Examinations'
          });
        }
      }
    });

    // Add system-level activities
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Check for classes with low attendance today (filtered by current school)
    const lowAttendanceClasses = classes.filter(classInfo => {
      const classStudents = schoolStudents.filter(s => normalize(s.studentClass) === normalize(classInfo.name));
      if (classStudents.length === 0) return false;

      const todayAttendance = attendanceRecords.filter(record =>
        new Date(record.timestamp) >= todayStart &&
        classStudents.some(student => student.id === record.studentId) &&
        record.status === 'present'
      );

      const attendanceRate = (todayAttendance.length / classStudents.length) * 100;
      return attendanceRate < 75 && attendanceRate > 0; // Only if some attendance is marked but low
    });

    lowAttendanceClasses.forEach((classInfo, index) => {
      const alertTime = getActivityTimestamp(new Date(), (index + 1) * 2);
      activities.push({
        type: 'system_alert',
        message: `🔔 Low attendance alert: Class ${classInfo.name} has below 75% attendance today`,
        time: getTimeAgo(alertTime),
        timestamp: alertTime,
        priority: 'high',
        category: 'System Alert'
      });
    });

    // Sort all activities by timestamp (most recent first) and return top 12 with priority weighting
    const sortedActivities = activities
      .sort((a, b) => {
        // First sort by priority (high priority items float up slightly)
        const priorityWeight = { high: 0.1, medium: 0.05, low: 0 };
        const aPriorityTime = b.timestamp.getTime() + (priorityWeight[a.priority] * 1000 * 60 * 60); // Add priority weight in hours
        const bPriorityTime = a.timestamp.getTime() + (priorityWeight[b.priority] * 1000 * 60 * 60);
        return bPriorityTime - aPriorityTime;
      })
      .slice(0, 12);

    return sortedActivities;
  };

  // Function to get real-time pending tasks (filtered by current school)
  const getPendingTasks = () => {
    const tasks = [];

    // Count pending fee payments for current school students
    const pendingFeePayments = feeRecords.filter(r => {
      const student = schoolStudents.find(s => s.id === r.studentId);
      return student && (r.status === 'pending' || r.status === 'overdue');
    }).length;

    if (pendingFeePayments > 0) {
      tasks.push({
        task: 'Review pending fee payments',
        count: pendingFeePayments,
        priority: 'high' as const
      });
    }

    // Count students without today's attendance (filtered by current school)
    const today = new Date().toISOString().split('T')[0];
    let studentsWithoutAttendance = 0;
    classes.forEach(classInfo => {
      const classStudents = schoolStudents.filter(s => normalize(s.studentClass) === normalize(classInfo.name));
      const todayAttendance = attendanceRecords.filter(
        record => record.date === today &&
          classStudents.some(student => student.id === record.studentId)
      );
      studentsWithoutAttendance += Math.max(0, classStudents.length - todayAttendance.length);
    });

    if (studentsWithoutAttendance > 0) {
      tasks.push({
        task: 'Complete attendance marking',
        count: studentsWithoutAttendance,
        priority: 'medium' as const
      });
    }

    // Count overdue fee records (filtered by current school)
    const overdueRecords = feeRecords.filter(r => {
      const student = schoolStudents.find(s => s.id === r.studentId);
      if (!student) return false;

      const dueDate = new Date(r.dueDate);
      const now = new Date();
      return r.status === 'overdue' || (r.status === 'pending' && dueDate < now);
    }).length;

    if (overdueRecords > 0) {
      tasks.push({
        task: 'Follow up on overdue payments',
        count: overdueRecords,
        priority: 'high' as const
      });
    }

    // Count scheduled exams in next 7 days (filtered by current school)
    const upcomingExams = exams.filter(exam => {
      if (currentSchoolId && exam.schoolId !== currentSchoolId) return false;

      const startDate = new Date(exam.startDate);
      const now = new Date();
      const diffDays = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return exam.status === 'scheduled' && diffDays >= 0 && diffDays <= 7;
    }).length;

    if (upcomingExams > 0) {
      tasks.push({
        task: 'Prepare for upcoming exams',
        count: upcomingExams,
        priority: 'medium' as const
      });
    }

    // Count students with negative activities in last 30 days (filtered by current school)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentNegativeActivities = studentActivities.filter(activity => {
      const student = schoolStudents.find(s => s.id === activity.studentId);
      return student && activity.type === 'negative' && new Date(activity.date) >= thirtyDaysAgo;
    }).length;

    if (recentNegativeActivities > 0) {
      tasks.push({
        task: 'Address student behavioral issues',
        count: recentNegativeActivities,
        priority: 'low' as const
      });
    }

    return tasks;
  };

  // Quick action handlers
  const handleQuickAction = (action: string) => {
    if (!onNavigate) return;

    switch (action) {
      case 'addStudent':
        onNavigate('students');
        break;
      case 'markAttendance':
        onNavigate('attendance');
        break;
      case 'collectFees':
        onNavigate('fees');
        break;
      case 'enterMarks':
        onNavigate('exams');
        break;
      default:
        break;
    }
  };

  const recentActivities = getRecentActivities();
  const pendingTasks = getPendingTasks();

  // Calculate filtered stats for current school
  const currentSchoolStats = {
    totalStudents: schoolStudents.length,
    activeStudents: schoolStudents.filter(s => s.status === 'active').length
  };

  // Calculate real-time statistics using centralized service
  const studentStats = DashboardStatsService.calculateStudentStats(students, currentSchoolId);
  const attendanceTrendStats = DashboardStatsService.calculateAttendanceStats(
    students,
    attendanceRecords,
    currentSchoolId
  );
  const classStats = DashboardStatsService.calculateClassStats(classes, students, currentSchoolId);

  const stats = [
    {
      title: 'Total Students',
      value: currentSchoolStats.totalStudents.toString(),
      icon: Users,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-700 dark:text-blue-400',
      change: studentStats.formattedChange
    },
    {
      title: 'Average Attendance',
      value: `${attendanceStats.averageAttendance.toFixed(1)}%`,
      icon: CheckCircle,
      color: 'bg-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      textColor: 'text-green-700 dark:text-green-400',
      change: attendanceTrendStats.formattedChange
    },
    {
      title: 'Fee Collection',
      value: formatCurrency(feeStats.totalCollected),
      icon: DollarSign,
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      textColor: 'text-emerald-700 dark:text-emerald-400',
      change: `${feeStats.collectionRate.toFixed(1)}% collection rate`
    },
    {
      title: 'Active Classes',
      value: classes.length.toString(),
      icon: BookOpen,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      textColor: 'text-purple-700 dark:text-purple-400',
      change: 'Nursery to 12th'
    }
  ];

  const displayName = user?.name || 'Admin';

  return (
    <div className="p-6 space-y-8">
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Welcome back, {displayName}
          {settings?.currentAcademicYear && (
            <span className="ml-2 text-sm">· Academic year {settings.currentAcademicYear}</span>
          )}
        </p>
      </div>

      {/* Stats Grid - accent bar and updated card style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={`${stat.bgColor} rounded-2xl p-6 border border-gray-100 dark:border-gray-700 border-l-4 hover:shadow-lg transition-all relative overflow-hidden ${
                index === 0 ? 'border-l-blue-500' : index === 1 ? 'border-l-green-500' : index === 2 ? 'border-l-emerald-500' : 'border-l-purple-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
                  <p className={`text-3xl font-bold ${stat.textColor} mt-2`}>{stat.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.change}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-xl opacity-90`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Left: Classes 3x4 grid | Right: Recent Activities (2 rows) + Pending Tasks (2 rows) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {/* Classes Overview - 3 columns x 4 rows */}
        <div className="lg:col-span-2 flex flex-col min-h-0 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Classes Overview</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Nursery to 12th — click a class for details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 grid-rows-4 gap-4 min-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
          {sortClasses(classes).map((classInfo, index) => {
              // Filter students by class AND school
              const classStudentsCount = schoolStudents.filter(s => normalize(s.studentClass) === normalize(classInfo.name)).length;

              // Get attendance data for this class's students only
              const classAttendanceRecords = attendanceRecords.filter(record => {
                const student = schoolStudents.find(s => s.id === record.studentId && normalize(s.studentClass) === normalize(classInfo.name));
                return student !== undefined;
              });

              const presentCount = classAttendanceRecords.filter(r => r.status === 'present').length;
              const totalCount = classAttendanceRecords.length;
              const attendanceRate = totalCount > 0 ? (presentCount / totalCount) * 100 : 0;

              return (
                <div
                  key={index}
                  onClick={() => setSelectedClass(classInfo.name)}
                  className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl p-4 border border-gray-200 dark:border-gray-600 hover:shadow-md hover:scale-105 transition-all cursor-pointer"
                >
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Class {classInfo.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                      Sections: {classInfo.sections.join(', ')}
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300">Students:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{classStudentsCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300">Attendance:</span>
                        <span className="font-medium text-green-600 dark:text-green-400">{attendanceRate.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-green-500 dark:bg-green-400 h-2 rounded-full transition-all"
                          style={{ width: `${attendanceRate}%` }}
                        ></div>
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">Click for details →</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: 4-row grid — Recent Activities (2 rows), Pending Tasks (2 rows) */}
        <div className="grid grid-rows-4 gap-4 h-full min-h-[320px]">
          {/* Recent Activities - spans 2 rows */}
          <div className="row-span-2 min-h-0 flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 shrink-0">Recent Activities</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 shrink-0">Latest enrollments, payments, and attendance</p>
            <div className="space-y-3 min-h-0 overflow-y-auto pr-2 custom-scrollbar flex-1">
              {recentActivities.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">No recent activities found</p>
                </div>
              ) : (
                recentActivities.map((activity, index) => (
                  <div key={index} className={`flex items-start space-x-3 p-3 rounded-lg border-l-4 ${activity.priority === 'high' ? 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600' :
                    activity.priority === 'medium' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400 dark:border-yellow-600' :
                      'bg-gray-50 dark:bg-gray-800 border-gray-400 dark:border-gray-600'
                    }`}>
                    <div className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${activity.type === 'attendance' ? 'bg-blue-500' :
                      activity.type === 'fee' ? 'bg-green-500' :
                        activity.type === 'fee_overdue' ? 'bg-red-500' :
                          activity.type === 'exam' ? 'bg-purple-500' :
                            activity.type === 'positive_activity' ? 'bg-emerald-500' :
                              activity.type === 'negative_activity' ? 'bg-red-500' :
                                activity.type === 'student' ? 'bg-orange-500' :
                                  activity.type === 'system_alert' ? 'bg-red-600' : 'bg-gray-500'
                      }`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${activity.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' :
                          activity.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' :
                            'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400'
                          }`}>
                          {activity.category}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {activity.time}
                          <span className="mx-1">·</span>
                          <span title="Date">{formatAbsoluteDate(activity.timestamp)}</span>
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-200 leading-relaxed">{activity.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending Tasks - spans 2 rows */}
          <div className="row-span-2 min-h-0 flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 shrink-0">Pending Tasks</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 shrink-0">Items needing your attention</p>
            <div className="space-y-3 min-h-0 overflow-y-auto pr-2 custom-scrollbar flex-1">
              {pendingTasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-8 h-8 text-green-300 dark:text-green-600 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">All tasks completed!</p>
                </div>
              ) : (
                pendingTasks.map((task, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${task.priority === 'high' ? 'bg-red-500' :
                        task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}></div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{task.task}</span>
                    </div>
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 text-xs font-medium px-2 py-1 rounded-full">
                      {task.count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions - navigate to Students, Attendance, Fees, Examinations */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Quick Actions</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Jump to common tasks</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => handleQuickAction('addStudent')}
            className="flex flex-col items-center justify-center p-5 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-2" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-300">Add Student</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickAction('markAttendance')}
            className="flex flex-col items-center justify-center p-5 bg-green-50 dark:bg-green-900/20 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            <Calendar className="w-8 h-8 text-green-600 dark:text-green-400 mb-2" />
            <span className="text-sm font-medium text-green-900 dark:text-green-300">Mark Attendance</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickAction('collectFees')}
            className="flex flex-col items-center justify-center p-5 bg-purple-50 dark:bg-purple-900/20 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            <CreditCard className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-2" />
            <span className="text-sm font-medium text-purple-900 dark:text-purple-300">Collect Fees</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickAction('enterMarks')}
            className="flex flex-col items-center justify-center p-5 bg-amber-50 dark:bg-amber-900/20 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            <BookOpen className="w-8 h-8 text-amber-600 dark:text-amber-400 mb-2" />
            <span className="text-sm font-medium text-amber-900 dark:text-amber-300">Enter Marks</span>
          </button>
        </div>
      </div>
    </div>
  );
}