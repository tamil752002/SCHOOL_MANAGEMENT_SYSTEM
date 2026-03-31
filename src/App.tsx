import { useEffect, useState } from 'react';
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import { AttendanceMain } from './components/Attendance/AttendanceMain';
import { Dashboard } from './components/Dashboard/Dashboard';
import { DeveloperDashboard } from './components/Dashboard/DeveloperDashboard';
import { DevLoginPage } from './components/Auth/DevLoginPage';
import { ExamManagement } from './components/Exams/ExamManagement';
import { ExamReports } from './components/Exams/ExamReports';
import { ExamResultsView } from './components/Exams/ExamResultsView';
import { FeeManagement } from './components/Fees/FeeManagement';
import { LandingPage } from './components/Landing/LandingPage';
import { Header } from './components/Layout/Header';
import { NotificationDropdown } from './components/Layout/NotificationDropdown';
import { Sidebar } from './components/Layout/Sidebar';
import { ReportsMain } from './components/Reports/ReportsMain';
import { StudentAcademicGrowth } from './components/Reports/StudentAcademicGrowth';
import { AdvancedSearch } from './components/Search/AdvancedSearch';
import { Settings } from './components/Settings/Settings';
import { TeacherManagement } from './components/Teachers/TeacherManagement';
import { TeacherProfile } from './components/Teachers/TeacherProfile';
import { TeacherDashboard } from './components/Teachers/TeacherDashboard';
import { TeacherAttendance } from './components/Teachers/TeacherAttendance';
import { TeacherClassAttendance } from './components/Teachers/TeacherClassAttendance';
import { TeacherApplyLeave } from './components/Teachers/TeacherApplyLeave';
import { TeacherStudentLeaves } from './components/Teachers/TeacherStudentLeaves';
import { TeacherMarksEntry } from './components/Teachers/TeacherMarksEntry';
import { AcademicYearPromotion } from './components/AcademicYear/AcademicYearPromotion';
import { ClassesManagement } from './components/Classes/ClassesManagement';
import { LeaveManagement } from './components/Leave/LeaveManagement';
import { ParentApplyLeave } from './components/Parent/ParentApplyLeave';
import { StudentAttendance } from './components/Students/StudentAttendance';
import { StudentConductCertificate } from './components/Students/StudentConductCertificate';
import { StudentDashboard } from './components/Students/StudentDashboard';
import { StudentFees } from './components/Students/StudentFees';
import { StudentManagement } from './components/Students/StudentManagement';
import { StudentExamTimetable } from './components/Students/StudentExamTimetable';
import { StudentProfile } from './components/Students/StudentProfile';
import { StudentSettings } from './components/Students/StudentSettings';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SchoolDataProvider, useSchoolData } from './contexts/SchoolDataContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

function AppContent() {
  const { isAuthenticated, user } = useAuth();
  const {
    students,
    teachers,
    attendanceRecords,
    feeRecords,
    studentActivities,
    exams,
    examRecords,
    classes
  } = useSchoolData();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract view from URL path, default to 'dashboard'
  const getViewFromPath = (pathname: string): string => {
    const path = pathname.replace(/^\//, ''); // Remove leading slash
    if (!path || path === '/') return 'dashboard';
    // Handle student-profile with ID
    if (path.startsWith('student-profile/')) {
      return 'student-profile';
    }
    // Handle teacher-profile with ID
    if (path.startsWith('teacher-profile/')) {
      return 'teacher-profile';
    }
    return path;
  };

  const [currentView, setCurrentView] = useState(() => getViewFromPath(location.pathname));
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(() => {
    // Extract student ID from URL if present
    const match = location.pathname.match(/student-profile\/([^/]+)/);
    return match ? match[1] : null;
  });
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(() => {
    const match = location.pathname.match(/teacher-profile\/([^/]+)/);
    return match ? match[1] : null;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  const [parentSelectedChildId, setParentSelectedChildId] = useState<string | null>(null);

  // When parent logs in, default to first child
  useEffect(() => {
    if (user?.role === 'parent' && parentSelectedChildId === null) {
      const parentUser = user as { studentIds?: string[] };
      const firstChildId = students.find(s => (parentUser.studentIds || []).includes(s.id))?.id
        || students.find(s => s.parentUserId === user.id)?.id;
      if (firstChildId) setParentSelectedChildId(firstChildId);
    }
  }, [user?.role, user?.id, students, parentSelectedChildId]);

  // Sync currentView with URL changes (browser back/forward)
  useEffect(() => {
    const view = getViewFromPath(location.pathname);
    setCurrentView(view);

    const studentMatch = location.pathname.match(/student-profile\/([^/]+)/);
    if (studentMatch) {
      setSelectedStudentId(studentMatch[1]);
    } else if (view !== 'student-profile') {
      setSelectedStudentId(null);
    }

    const teacherMatch = location.pathname.match(/teacher-profile\/([^/]+)/);
    if (teacherMatch) {
      setSelectedTeacherId(teacherMatch[1]);
    } else if (view !== 'teacher-profile') {
      setSelectedTeacherId(null);
    }
  }, [location.pathname]);

  // Helper function to get time ago string
  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  // Helper function to create realistic timestamps for activities
  const getActivityTimestamp = (baseDate: string | Date, hoursOffset: number) => {
    const base = new Date(baseDate);
    base.setHours(base.getHours() - hoursOffset);
    return base;
  };

  // Generate real notifications from recent activities
  const generateNotifications = () => {
    const notifications: Array<{
      id: string;
      title: string;
      message: string;
      type: 'info' | 'success' | 'warning' | 'error';
      timestamp: Date;
      read: boolean;
    }> = [];

    const now = new Date();

    // Special case for developer - add contact notifications
    if (user?.role === 'developer') {
      // Mock contact notifications for developer
      const contactNotifications = [
        {
          id: 'contact_1',
          title: 'New School Contact Request',
          message: 'ABC International School has requested platform access',
          type: 'info' as const,
          timestamp: getActivityTimestamp(now, 2),
          read: readNotifications.has('contact_1')
        },
        {
          id: 'contact_2',
          title: 'Support Request',
          message: 'St. Mary\'s School needs assistance with fee module',
          type: 'warning' as const,
          timestamp: getActivityTimestamp(now, 8),
          read: readNotifications.has('contact_2')
        },
        {
          id: 'contact_3',
          title: 'Subscription Renewal',
          message: 'Delhi Public School subscription expiring in 7 days',
          type: 'error' as const,
          timestamp: getActivityTimestamp(now, 24),
          read: readNotifications.has('contact_3')
        }
      ];

      notifications.push(...contactNotifications);

      // Return early for developer with only contact notifications
      return notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    // Get recent student activities (last 10)
    const recentStudentActivities = studentActivities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    recentStudentActivities.forEach((activity, index) => {
      const student = students.find(s => s.id === activity.studentId);
      if (student) {
        const activityTime = typeof activity.date === 'object' ? activity.date : new Date(activity.date);
        const id = `activity_${activity.id}`;
        notifications.push({
          id,
          title: activity.type === 'positive' ? 'Positive Activity Recorded' : 'Student Activity Alert',
          message: `${activity.title} - ${[student.firstName, student.lastName].filter(Boolean).join(' ')} (Class ${student.studentClass})`,
          type: activity.type === 'positive' ? 'success' : 'warning',
          timestamp: activityTime,
          read: readNotifications.has(id)
        });
      }
    });

    // Get recent fee payments (last 10)
    const recentFeePayments = feeRecords
      .filter(record => record.status === 'paid' && record.paidDate)
      .sort((a, b) => {
        const dateA = a.paidDate ? new Date(a.paidDate).getTime() : 0;
        const dateB = b.paidDate ? new Date(b.paidDate).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 10);

    recentFeePayments.forEach((record, index) => {
      const student = students.find(s => s.id === record.studentId);
      if (student) {
        const paymentTime = record.paidDate ? new Date(record.paidDate) : new Date(record.dueDate);
        const id = `fee_${record.id}`;
        notifications.push({
          id,
          title: 'Fee Payment Received',
          message: `₹${(record.paidAmount || record.amount).toLocaleString()} received from ${[student.firstName, student.lastName].filter(Boolean).join(' ')}`,
          type: 'success',
          timestamp: paymentTime,
          read: readNotifications.has(id)
        });
      }
    });

    // Get recent overdue fees (last 5)
    const recentOverdueRecords = feeRecords
      .filter(record => record.status === 'overdue')
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
      .slice(0, 5);

    recentOverdueRecords.forEach((record, index) => {
      const student = students.find(s => s.id === record.studentId);
      if (student) {
        const overdueTime = new Date(record.dueDate);
        const daysPastDue = Math.floor((now.getTime() - overdueTime.getTime()) / (1000 * 60 * 60 * 24));
        const id = `overdue_${record.id}`;
        notifications.push({
          id,
          title: 'Overdue Fee Payment',
          message: `${[student.firstName, student.lastName].filter(Boolean).join(' ')} has overdue payment (${Math.max(0, daysPastDue)} days past due)`,
          type: 'error',
          timestamp: overdueTime,
          read: readNotifications.has(id)
        });
      }
    });

    // Get recent admissions (last 5)
    const recentAdmissions = students
      .filter(student => {
        const admissionDate = new Date(student.admissionDate);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return student.status === 'active' && admissionDate >= thirtyDaysAgo;
      })
      .sort((a, b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime())
      .slice(0, 5);

    recentAdmissions.forEach((student, index) => {
      const admissionTime = new Date(student.admissionDate);
      const id = `admission_${student.id}`;
      notifications.push({
        id,
        title: 'New Student Admission',
        message: `${[student.firstName, student.lastName].filter(Boolean).join(' ')} enrolled in Class ${student.studentClass}-${student.section}`,
        type: 'info',
        timestamp: admissionTime,
        read: readNotifications.has(id)
      });
    });

    // Get recent exam updates (last 5)
    const recentExams = exams
      .filter(exam => exam.status === 'completed' || exam.status === 'ongoing')
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
      .slice(0, 5);

    recentExams.forEach((exam, index) => {
      const examTime = new Date(exam.startDate);
      const id = `exam_${exam.id}`;
      notifications.push({
        id,
        title: exam.status === 'completed' ? 'Exam Completed' : 'Exam In Progress',
        message: `${exam.type} exam for Class ${exam.className} - ${exam.status === 'completed' ? 'Results available' : 'Currently ongoing'}`,
        type: exam.status === 'completed' ? 'success' : 'info',
        timestamp: examTime,
        read: readNotifications.has(id)
      });
    });

    // Check for classes with low attendance today
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lowAttendanceClasses = classes.filter(classInfo => {
      const classStudents = students.filter(s => s.studentClass === classInfo.name);
      if (classStudents.length === 0) return false;

      const todayAttendance = attendanceRecords.filter(record =>
        new Date(record.timestamp) >= todayStart &&
        classStudents.some(student => student.id === record.studentId) &&
        record.status === 'present'
      );

      const attendanceRate = (todayAttendance.length / classStudents.length) * 100;
      return attendanceRate < 75 && attendanceRate > 0;
    });

    lowAttendanceClasses.forEach((classInfo, index) => {
      const alertTime = new Date();
      const id = `low_attendance_${classInfo.name}`;
      notifications.push({
        id,
        title: 'Low Attendance Alert',
        message: `Class ${classInfo.name} has below 75% attendance today`,
        type: 'warning',
        timestamp: alertTime,
        read: readNotifications.has(id)
      });
    });

    // Sort by timestamp (most recent first) and return
    return notifications
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 30);
  };

  const notifications = generateNotifications();

  // Set initial view based on user role and URL
  useEffect(() => {
    if (!isAuthenticated) {
      // If not authenticated and not on landing page, stay on current page
      // The renderCurrentView will show LandingPage
      return;
    }
    
    const viewFromPath = getViewFromPath(location.pathname);
    
    // Only set default view if we're at root or landing
    if (location.pathname === '/' || location.pathname === '') {
      if (user?.role === 'student') {
        navigate('/dashboard', { replace: true });
        const studentRecord = students.find(s => s.admissionNumber === user.admissionNumber);
        if (studentRecord) {
          setSelectedStudentId(studentRecord.id);
        }
      } else if (user?.role === 'admin' || user?.role === 'developer') {
        navigate('/dashboard', { replace: true });
      }
    } else {
      // Sync with current URL - don't navigate, just update state
      setCurrentView(viewFromPath);
    }
  }, [user, students, isAuthenticated, navigate, location.pathname]);

  // Handle window resize to close sidebar on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock body scroll when mobile sidebar is open so the background doesn't scroll
  useEffect(() => {
    if (isSidebarOpen && typeof window !== 'undefined' && window.innerWidth < 1024) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isSidebarOpen]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleNotificationClick = () => {
    setIsNotificationOpen(!isNotificationOpen);
  };

  const handleSettingsClick = () => {
    navigate('/settings');
    setIsNotificationOpen(false);
  };

  const markNotificationAsRead = (id: string) => {
    setReadNotifications(prev => new Set([...prev, id]));
  };

  const markAllNotificationsAsRead = () => {
    setReadNotifications(new Set(notifications.map(n => n.id)));
  };

  // Calculate unread notification count
  const unreadNotificationCount = notifications.filter(notification => !notification.read).length;

  const renderCurrentView = () => {
    if (!isAuthenticated) {
      if (location.pathname === '/dev/login') {
        return <DevLoginPage onSuccess={() => navigate('/dashboard')} onBack={() => navigate('/')} />;
      }
      return <LandingPage onLoginClick={() => navigate('/dashboard')} onDevLoginClick={() => navigate('/dev/login')} />;
    }

    // Based on user role, render different dashboards
    if (user?.role === 'developer') {
      return <DeveloperDashboard currentView={currentView} />;
    } else if (user?.role === 'teacher') {
      switch (currentView) {
        case 'dashboard':
          return <TeacherDashboard />;
        case 'teacher-attendance':
          return <TeacherAttendance />;
        case 'class-attendance':
          return <TeacherClassAttendance />;
        case 'teacher-leave':
          return <TeacherApplyLeave />;
        case 'student-leaves':
          return <TeacherStudentLeaves />;
        case 'teacher-marks':
          return <TeacherMarksEntry />;
        case 'search':
          return <AdvancedSearch onStudentClick={(studentId) => handleViewChange('student-profile', studentId)} />;
        case 'student-profile':
          if (selectedStudentId) {
            const student = students.find(s => s.id === selectedStudentId);
            if (student) {
              return <StudentProfile student={student} onBack={() => handleViewChange('search')} />;
            }
          }
          return <AdvancedSearch onStudentClick={(studentId) => handleViewChange('student-profile', studentId)} />;
        case 'settings':
          return <Settings />;
        default:
          return <TeacherDashboard />;
      }
    } else if (user?.role === 'admin') {
      switch (currentView) {
        case 'dashboard':
          return <Dashboard />;
        case 'students':
          return <StudentManagement onViewProfile={(studentId) => handleViewChange('student-profile', studentId)} />;
        case 'teachers':
          return <TeacherManagement onViewProfile={(teacherId) => handleViewChange('teacher-profile', teacherId)} />;
        case 'teacher-profile':
          if (selectedTeacherId) {
            const teacher = teachers.find((t: { id: string }) => t.id === selectedTeacherId);
            if (teacher) {
              return <TeacherProfile teacher={teacher} onBack={() => handleViewChange('teachers')} />;
            }
          }
          return <TeacherManagement onViewProfile={(teacherId) => handleViewChange('teacher-profile', teacherId)} />;
        case 'classes':
          return <ClassesManagement />;
        case 'academic-year':
          return <AcademicYearPromotion />;
        case 'leave':
          return <LeaveManagement />;
        case 'attendance':
          return <AttendanceMain />;
        case 'fees':
          return <FeeManagement />;
        case 'exams':
          return <ExamManagement />;
        case 'search':
          return <AdvancedSearch onStudentClick={(studentId) => handleViewChange('student-profile', studentId)} />;
        case 'reports':
          return <ReportsMain />;
        case 'academic-growth':
          return <StudentAcademicGrowth />;
        case 'student-profile':
          if (selectedStudentId) {
            const student = students.find(s => s.id === selectedStudentId);
            if (student) {
              return <StudentProfile student={student} onBack={() => handleViewChange('students')} />;
            }
          }
          return <StudentManagement onViewProfile={(studentId) => handleViewChange('student-profile', studentId)} />;
        case 'reports-exam':
          return <ExamReports />;
        case 'settings':
          return <Settings />;
        default:
          return <Dashboard />;
      }
    } else if (user?.role === 'parent') {
      const parentUser = user as { id?: string; studentIds?: string[] };
      const children = students.filter(s => (parentUser.studentIds || []).includes(s.id) || s.parentUserId === parentUser.id);
      const effectiveChildId = parentSelectedChildId || children[0]?.id;
      const currentStudent = children.length ? (students.find(s => s.id === effectiveChildId) || children[0]) : null;

      if (children.length === 0) {
        return (
          <div className="p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">No children linked to your account. Please contact the school.</p>
          </div>
        );
      }

      const ChildSelector = () => (
        <div className="mb-4">
          <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Viewing</label>
          <select
            value={currentStudent?.id}
            onChange={e => setParentSelectedChildId(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            {children.map(c => (
              <option key={c.id} value={c.id}>{c.firstName} {c.lastName} (Class {c.studentClass}-{c.section})</option>
            ))}
          </select>
        </div>
      );

      switch (currentView) {
        case 'dashboard':
          return (
            <div className="p-6">
              <ChildSelector />
              <StudentDashboard overrideStudent={currentStudent} />
            </div>
          );
        case 'attendance':
          return (
            <div className="p-6">
              <ChildSelector />
              <StudentAttendance overrideStudent={currentStudent} />
            </div>
          );
        case 'fees':
          return (
            <div className="p-6">
              <ChildSelector />
              <StudentFees overrideStudent={currentStudent} />
            </div>
          );
        case 'examTimetable':
          return currentStudent ? <StudentExamTimetable student={currentStudent} onBack={() => handleViewChange('dashboard')} /> : null;
        case 'results':
          return currentStudent ? (
            <ExamResultsView
              student={currentStudent}
              title={`Examination Results – ${currentStudent.firstName} ${currentStudent.lastName}`}
              topContent={<ChildSelector />}
            />
          ) : null;
        case 'apply-leave':
          return <ParentApplyLeave students={children} userId={user?.id} />;
        case 'activities':
        case 'settings':
          return <Settings />;
        default:
          return <StudentDashboard overrideStudent={currentStudent} />;
      }
    } else if (user?.role === 'student') {
      const currentStudent = students.find(s => s.admissionNumber === user.admissionNumber);

      if (!currentStudent) {
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-red-600 text-xl">Student record not found</div>
            <p className="text-gray-600 mt-2">Please contact your administrator</p>
          </div>
        );
      }

      switch (currentView) {
        case 'dashboard':
          return <StudentDashboard />;
        case 'examTimetable':
          return <StudentExamTimetable student={currentStudent} onBack={() => handleViewChange('dashboard')} />;
        case 'attendance':
          return <StudentAttendance student={currentStudent} />;
        case 'results':
          return <ExamResultsView student={currentStudent} title="My Examination Results" />;
        case 'academic-growth':
          return <StudentAcademicGrowth />;
        case 'activities':
          const studentActivitiesList = studentActivities.filter(
            activity => activity.studentId === currentStudent.id
          );
          return (
            <div className="p-6">
              <h1 className="text-2xl font-bold mb-6">My Activities</h1>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Activity Records</h2>
                {/* Display activities */}
                {studentActivitiesList.length > 0 ? (
                  <div className="space-y-4">
                    {studentActivitiesList.map(activity => (
                      <div
                        key={activity.id}
                        className={`p-4 rounded-lg border ${activity.type === 'positive'
                          ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800'
                          : 'border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800'
                          }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className={`font-medium ${activity.type === 'positive'
                              ? 'text-green-700 dark:text-green-400'
                              : 'text-amber-700 dark:text-amber-400'
                              }`}>
                              {activity.title}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300 mt-1">{activity.description}</p>
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(activity.date).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className={`inline-block text-xs px-2 py-1 rounded-full ${activity.type === 'positive'
                            ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
                            : 'bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200'
                            }`}>
                            {activity.category}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No activity records found.
                  </div>
                )}
              </div>
            </div>
          );
        case 'certificate':
          return <StudentConductCertificate student={currentStudent} />;
        case 'settings':
          return <StudentSettings overrideStudent={currentStudent} />;
        default:
          return <StudentDashboard overrideStudent={currentStudent} />;
      }
    }

    // Default view if no conditions match
    return <Dashboard />;
  };

  const handleViewChange = (view: string, studentId?: string) => {
    // Prevent students from accessing admin-only views
    if (user?.role === 'student') {
      const allowedStudentViews = ['dashboard', 'attendance', 'examTimetable', 'results', 'academic-growth', 'activities', 'certificate', 'settings'];
      if (!allowedStudentViews.includes(view)) {
        return; // Block access to admin views
      }
    }

    // Navigate using React Router
    if (view === 'student-profile' && studentId) {
      navigate(`/student-profile/${studentId}`);
      setSelectedStudentId(studentId);
    } else if (view === 'teacher-profile' && studentId) {
      // Second arg is teacherId when view is teacher-profile
      navigate(`/teacher-profile/${studentId}`);
      setSelectedTeacherId(studentId);
    } else {
      navigate(`/${view}`);
    }

    setCurrentView(view);
    setIsNotificationOpen(false); // Close notifications when navigating
  };

  // Render the main layout when authenticated
  if (isAuthenticated) {
    return (
      <div className={isDarkMode ? 'dark' : ''}>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white overflow-x-hidden">
          <div className="relative min-w-0">
            <Header
              isDarkMode={isDarkMode}
              onToggleTheme={toggleTheme}
              onNotificationClick={handleNotificationClick}
              onSettingsClick={handleSettingsClick}
              onMenuClick={toggleSidebar}
              unreadNotificationCount={notifications.filter(n => !n.read).length}
            />

            {/* Notifications dropdown positioned relative to the header */}
            {isNotificationOpen && (
              <div className="absolute right-4 top-16 z-50">
                <NotificationDropdown
                  isOpen={isNotificationOpen}
                  notifications={notifications}
                  onClose={() => setIsNotificationOpen(false)}
                  onMarkAsRead={markNotificationAsRead}
                  onMarkAllAsRead={markAllNotificationsAsRead}
                />
              </div>
            )}
          </div>

          <Sidebar
            currentView={currentView}
            onViewChange={handleViewChange}
            isOpen={isSidebarOpen}
            onClose={closeSidebar}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapse}
          />
          <main className={`pt-16 transition-all duration-300 min-w-0 overflow-x-hidden ${isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
            <div className="px-4 py-6 sm:px-6 lg:px-8 min-w-0">
              {renderCurrentView()}
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Return the LandingPage if not authenticated
  return <LandingPage />;
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <SchoolDataProvider>
            <AppContent />
          </SchoolDataProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;