import { Bell, Calendar, ChevronDown, LogOut, Menu, Moon, Settings, Sun, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';

interface HeaderProps {
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  onNotificationClick?: () => void;
  onSettingsClick?: () => void;
  onMenuClick?: () => void;
  unreadNotificationCount?: number;
}

export function Header({
  isDarkMode = false,
  onToggleTheme = () => { },
  onNotificationClick = () => { },
  onSettingsClick = () => { },
  onMenuClick,
  unreadNotificationCount = 0
}: HeaderProps) {
  const { user, logout } = useAuth();
  const { settings, enrollments, feeStructures, switchAcademicYear } = useSchoolData();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [yearSwitchLoading, setYearSwitchLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  const adminUser = user?.role === 'admin' ? (user as { schoolId?: string }) : null;
  const schoolId = adminUser?.schoolId ?? null;
  const currentYear = settings?.currentAcademicYear || '';

  const availableYears = Array.from(new Set([
    currentYear,
    ...(enrollments?.map(e => e.academicYear) || []),
    ...(feeStructures?.map(f => f.academicYear) || [])
  ].filter(Boolean))).sort().reverse();

  const handleSwitchYear = async (newYear: string) => {
    if (!schoolId || newYear === currentYear) { setShowYearDropdown(false); return; }
    setYearSwitchLoading(true);
    const ok = await switchAcademicYear(schoolId, newYear);
    setYearSwitchLoading(false);
    setShowYearDropdown(false);
    if (ok) setToast(`Switched to ${newYear}`);
    else setToast('Failed to switch year');
  };

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) setShowProfileDropdown(false);
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(target)) setShowYearDropdown(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 z-30">
      {toast && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-gray-800 dark:bg-gray-700 text-white text-sm shadow-lg">
          {toast}
        </div>
      )}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            {/* Mobile menu (hamburger) - visible only on small screens */}
            {onMenuClick && (
              <button
                onClick={onMenuClick}
                className="lg:hidden p-2 -ml-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Open menu"
                aria-label="Open navigation menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}
            <div className="flex-shrink-0">
              <h1 className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">SchoolHub</h1>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Academic Year Switcher - admin only */}
            {user?.role === 'admin' && schoolId && currentYear && (
              <div className="relative" ref={yearDropdownRef}>
                <button
                  onClick={() => setShowYearDropdown(!showYearDropdown)}
                  disabled={yearSwitchLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors"
                  title="Switch academic year"
                >
                  <Calendar className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span className="hidden sm:inline">{currentYear}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showYearDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showYearDropdown && (
                  <div className="absolute right-0 mt-1.5 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Academic Year</p>
                    </div>
                    {availableYears.map((year) => (
                      <button
                        key={year}
                        onClick={() => handleSwitchYear(year)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${year === currentYear ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                      >
                        {year} {year === currentYear ? ' (current)' : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notifications - show for all users */}
            <button
              onClick={onNotificationClick}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors relative"
              title={user?.role === 'developer' ? 'Contact Notifications' : 'Notifications'}
            >
              <Bell className="w-5 h-5" />
              {/* Notification badge - only show when there are unread notifications */}
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">{unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}</span>
                </span>
              )}
            </button>

            {/* User Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-500 dark:bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>

              {/* Dropdown Menu */}
              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      onSettingsClick();
                    }}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={logout}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}