import {
  Activity,
  BarChart3,
  BookOpen,
  Building,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Mail,
  School,
  Search,
  Settings,
  TrendingUp,
  UserCircle,
  Users
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string, studentId?: string) => void;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
}

export function Sidebar({
  currentView,
  onViewChange,
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse
}: SidebarProps) {
  const { user } = useAuth();

  const adminMenuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'teachers', label: 'Teachers', icon: UserCircle },
    { id: 'classes', label: 'Classes', icon: School },
    { id: 'academic-year', label: 'Academic Year', icon: GraduationCap },
    { id: 'attendance', label: 'Attendance', icon: Calendar },
    { id: 'fees', label: 'Fee Management', icon: CreditCard },
    { id: 'exams', label: 'Examinations', icon: BookOpen },
    { id: 'leave', label: 'Leave', icon: FileText },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'academic-growth', label: 'Academic Growth', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const studentMenuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'My Attendance', icon: Calendar },
    { id: 'examTimetable', label: 'Exam Timetable', icon: Calendar },
    { id: 'results', label: 'Exam Results', icon: BookOpen },
    { id: 'academic-growth', label: 'Academic Growth', icon: TrendingUp },
    { id: 'activities', label: 'My Activities', icon: Activity },
    { id: 'certificate', label: 'Study Conduct', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const developerMenuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'schools', label: 'Schools', icon: Building },
    { id: 'admins', label: 'Admins', icon: Users },
    { id: 'contacts', label: 'Contacts', icon: Mail },
  ];

  let menuItems: MenuItem[] = [];

  if (user?.role === 'admin') {
    menuItems = adminMenuItems;
  } else if (user?.role === 'student') {
    menuItems = studentMenuItems;
  } else if (user?.role === 'teacher') {
    menuItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'teacher-attendance', label: 'My Attendance', icon: Calendar },
      { id: 'class-attendance', label: 'Class Attendance', icon: Users },
      { id: 'teacher-marks', label: 'Marks Entry', icon: BookOpen },
      { id: 'teacher-leave', label: 'Apply Leave', icon: FileText },
      { id: 'student-leaves', label: 'Student Leaves', icon: Activity },
      { id: 'search', label: 'Search', icon: Search },
      { id: 'settings', label: 'Settings', icon: Settings },
    ];
  } else if (user?.role === 'parent') {
    menuItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'attendance', label: 'Attendance', icon: Calendar },
      { id: 'fees', label: 'Fee Status', icon: CreditCard },
      { id: 'examTimetable', label: 'Exam Timetable', icon: CalendarDays },
      { id: 'results', label: 'Exam Results', icon: BookOpen },
      { id: 'apply-leave', label: 'Apply Leave', icon: FileText },
      { id: 'activities', label: 'Activities', icon: Activity },
      { id: 'settings', label: 'Settings', icon: Settings },
    ];
  } else if (user?.role === 'developer') {
    menuItems = developerMenuItems;
  }

  const handleItemClick = (itemId: string) => {
    onViewChange(itemId);
    // Only close fully if on mobile
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile sidebar backdrop - behind sidebar so sidebar can receive touch/scroll */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-800/60 z-30 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* Sidebar - z-40 so it's above backdrop and receives scroll/touch */}
      <div
        className={`fixed top-0 left-0 z-40 h-screen pt-16 transition-transform ${isOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 lg:z-20 bg-white border-r border-gray-200 dark:bg-gray-800 dark:border-gray-700 ${isCollapsed ? 'lg:w-16' : 'lg:w-64'
          } w-64 transition-all duration-300 flex flex-col`}
      >
        <div className="flex-1 flex flex-col min-h-0 px-3 py-4 overflow-y-auto overflow-x-hidden overscroll-contain">
          <ul className="space-y-2 font-medium flex-grow">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleItemClick(item.id)}
                    className={`flex items-center w-full p-2 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 group ${currentView === item.id
                      ? 'bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-500'
                      : 'text-gray-900 dark:text-white'
                      }`}
                  >
                    <Icon className={`w-5 h-5 transition duration-75 ${currentView === item.id
                      ? 'text-blue-600 dark:text-blue-500'
                      : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'
                      }`}
                    />
                    <span className={`ml-3 ${isCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Toggle collapse button at bottom */}
          <div className="flex justify-center p-4 mt-auto border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onToggleCollapse}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}