import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface AdminFormProps {
    onClose: () => void;
    defaultSchoolId?: string;
}

export function AdminForm({ onClose, defaultSchoolId }: AdminFormProps) {
    const { addAdmin, schools, admins } = useAuth();
    const [formData, setFormData] = useState({
        username: '',
        name: '',
        email: '',
        phoneNumber: '',
        schoolId: defaultSchoolId || '',
        password: 'admin_password', // Provide default password
        confirmPassword: 'admin_password',
        status: 'active' as const
    });
    const [error, setError] = useState('');
    const [suggestedUsername, setSuggestedUsername] = useState('');
    const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);

    useEffect(() => {
        if (defaultSchoolId) {
            setFormData(prev => ({ ...prev, schoolId: defaultSchoolId }));
        }
    }, [defaultSchoolId]);

    // Suggest username from Gmail
    useEffect(() => {
        if (
            formData.email.endsWith('@gmail.com') &&
            !usernameManuallyEdited
        ) {
            const local = formData.email.split('@')[0];
            if (local) {
                const suggestion = local.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                setSuggestedUsername(suggestion);
                setFormData(prev => ({ ...prev, username: suggestion }));
            }
        }
    }, [formData.email, usernameManuallyEdited]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'username') setUsernameManuallyEdited(true);
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUsernameSuggestion = () => {
        setFormData(prev => ({ ...prev, username: suggestedUsername }));
        setUsernameManuallyEdited(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.schoolId === '') {
            setError('Please select a school');
            return;
        }

        // Check uniqueness of admin username
        const usernameExists = admins.some(a => a.username.trim().toLowerCase() === formData.username.trim().toLowerCase());
        if (usernameExists) {
            setError('Admin username must be unique. This username is already used by another admin.');
            return;
        }

        // Check uniqueness of admin name
        const nameExists = admins.some(a => a.name.trim().toLowerCase() === formData.name.trim().toLowerCase());
        if (nameExists) {
            setError('Admin name must be unique. This name is already used by another admin.');
            return;
        }

        // Remove confirmPassword and create admin
        const { confirmPassword, ...adminData } = formData;
        addAdmin(adminData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Admin</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Full Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                required
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Name must be unique.</p>
                        </div>

                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Username
                            </label>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    required
                                />
                                {suggestedUsername && suggestedUsername !== formData.username && (
                                    <button
                                        type="button"
                                        onClick={handleUsernameSuggestion}
                                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                    >
                                        Use "{suggestedUsername}"
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Username must be unique. If using Gmail, a suggestion will appear.</p>
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Phone Number
                            </label>
                            <input
                                type="text"
                                id="phoneNumber"
                                name="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="schoolId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                School
                            </label>
                            <select
                                id="schoolId"
                                name="schoolId"
                                value={formData.schoolId}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                required
                                disabled={!!defaultSchoolId}
                            >
                                <option value="">Select a school</option>
                                {schools.map(school => (
                                    <option key={school.id} value={school.id}>
                                        {school.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                        >
                            Add Admin
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 