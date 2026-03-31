import { ArrowLeft, Lock, LogIn, Moon, School, Sun, User, Eye, EyeOff } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { useTheme } from '../../contexts/ThemeContext';

type LoginRole = 'admin' | 'teacher' | 'parent' | 'student';

const ROLE_LABELS: Record<LoginRole, string> = {
  admin: 'Admin',
  teacher: 'Teacher',
  parent: 'Parent',
  student: 'Student'
};

const ROLE_PLACEHOLDERS: Record<LoginRole, string> = {
  admin: 'Email or username',
  teacher: 'Employee ID or email',
  parent: 'Mobile / Email',
  student: 'Admission number'
};

interface LoginFormProps {
  onBackToLanding?: () => void;
  onDevLoginClick?: () => void;
}

export function LoginForm({ onBackToLanding, onDevLoginClick }: LoginFormProps = {}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<LoginRole>('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, lastLoginError } = useAuth();
  const { students } = useSchoolData();
  const { isDarkMode, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const success = await login(username, password, students, selectedRole);
      if (!success) {
        setError(lastLoginError || 'Invalid credentials or wrong login type. Please select the correct role (Admin/Teacher/Parent/Student) and use matching credentials.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex">
      {/* Left side - Branding (EduHub style) - hidden on small screens */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-90" />
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-12 lg:px-16">
          {onBackToLanding ? (
            <button
              onClick={onBackToLanding}
              className="flex items-center gap-3 mb-8 text-white/90 hover:text-white transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <School className="w-7 h-7 text-white" />
              </div>
              <span className="font-display font-bold text-2xl text-white">SchoolHub</span>
            </button>
          ) : (
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <School className="w-7 h-7 text-white" />
              </div>
              <span className="font-display font-bold text-2xl text-white">SchoolHub</span>
            </div>
          )}
          <h1 className="font-display text-4xl lg:text-5xl font-bold text-white mb-6">
            Welcome back to your school management hub
          </h1>
          <p className="text-white/80 text-lg mb-8">
            Access your dashboard to manage students, teachers, fees, and more.
            Everything you need in one place.
          </p>
          <div className="flex gap-8">
            <div>
              <p className="text-3xl font-bold text-white">1000+</p>
              <p className="text-white/70">Schools</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">50K+</p>
              <p className="text-white/70">Students</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">99%</p>
              <p className="text-white/70">Uptime</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md">
          {/* Theme toggle - top right */}
          <div className="flex justify-end mb-6">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              aria-label={isDarkMode ? 'Light mode' : 'Dark mode'}
            >
              {isDarkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>

          {/* Mobile logo */}
          {onBackToLanding && (
            <div className="flex lg:hidden items-center justify-center gap-2 mb-8">
              <button
                onClick={onBackToLanding}
                className="flex items-center gap-2 text-gray-900 dark:text-white"
              >
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                  <School className="w-6 h-6 text-white" />
                </div>
                <span className="font-display font-bold text-xl">SchoolHub</span>
              </button>
            </div>
          )}

          <div className="text-center lg:text-left mb-8">
            <h2 className="font-display text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Sign in to your account
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Enter your credentials to access the dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                I am
              </label>
              <div className="flex gap-2 flex-wrap">
                {(['admin', 'teacher', 'parent', 'student'] as LoginRole[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedRole === role
                        ? 'gradient-primary text-white shadow-glow'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {ROLE_LABELS[role]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {ROLE_LABELS[selectedRole]} login
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all dark:bg-slate-700 dark:text-white"
                  placeholder={ROLE_PLACEHOLDERS[selectedRole]}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all dark:bg-slate-700 dark:text-white"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full gradient-primary text-white py-3 px-4 rounded-lg font-medium shadow-glow hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Sign In</span>
                </>
              )}
            </button>

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              {onBackToLanding && (
                <button
                  type="button"
                  onClick={onBackToLanding}
                  className="py-2 px-4 rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-gray-700 dark:text-gray-300 text-sm"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </button>
              )}
              {onDevLoginClick && (
                <button
                  type="button"
                  onClick={onDevLoginClick}
                  className="py-2 px-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm"
                >
                  Developer? Sign in here
                </button>
              )}
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onBackToLanding}
              className="text-cyan-600 dark:text-cyan-400 font-medium hover:underline"
            >
              Contact us for a demo
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
