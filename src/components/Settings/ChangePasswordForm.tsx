import { Eye, EyeOff, Lock } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';

interface ChangePasswordFormProps {
    userId: string;
    userType: 'admin' | 'student';
    onPasswordChanged: () => void;
}

export function ChangePasswordForm({ userId, userType, onPasswordChanged }: ChangePasswordFormProps) {
    const { admins, updateAdminPassword } = useAuth();
    const { students, updateStudentPassword } = useSchoolData();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validate passwords
        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        try {
            // For admin users
            if (userType === 'admin') {
                const admin = admins.find(a => a.id === userId);
                if (!admin) {
                    setError('Admin not found');
                    return;
                }

                // Verify old password
                if (admin.password !== oldPassword) {
                    setError('Current password is incorrect');
                    return;
                }

                // Update password
                updateAdminPassword(userId, newPassword);
                setSuccess('Password updated successfully');
                onPasswordChanged();
            }
            // For student users
            else if (userType === 'student') {
                const student = students.find(s => s.id === userId);
                if (!student) {
                    setError('Student not found');
                    return;
                }

                // Verify old password
                if (student.password !== oldPassword) {
                    setError('Current password is incorrect');
                    return;
                }

                // Update password
                updateStudentPassword(userId, newPassword);
                setSuccess('Student password updated successfully');
                onPasswordChanged();
            }

            // Clear form
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setError('Failed to update password');
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Change Password</h2>

            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="oldPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Current Password
                        </label>
                        <div className="relative">
                            <input
                                id="oldPassword"
                                type={showOldPassword ? 'text' : 'password'}
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white pr-10"
                                required
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                onClick={() => setShowOldPassword(!showOldPassword)}
                            >
                                {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            New Password
                        </label>
                        <div className="relative">
                            <input
                                id="newPassword"
                                type={showNewPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white pr-10"
                                required
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <input
                                id="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white pr-10"
                                required
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg text-sm">
                            {success}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-offset-gray-800 flex items-center justify-center"
                    >
                        <Lock className="w-4 h-4 mr-2" />
                        Update Password
                    </button>
                </div>
            </form>
        </div>
    );
} 