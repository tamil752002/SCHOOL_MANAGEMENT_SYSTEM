import { X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface SchoolFormProps {
    onClose: () => void;
}

export function SchoolForm({ onClose }: SchoolFormProps) {
    const { addSchool, schools } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        contactNumber: '',
        email: '',
        status: 'active' as const,
        studentUserIdPrefix: ''
    });
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Check uniqueness of studentUserIdPrefix
        const prefixExists = schools.some(s => (s.studentUserIdPrefix || '').toLowerCase() === formData.studentUserIdPrefix.toLowerCase());
        if (prefixExists) {
            setError('Student UserID Prefix must be unique. This prefix is already used by another school.');
            return;
        }
        addSchool(formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add School</h2>
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
                                School Name
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
                        </div>

                        <div>
                            <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Address
                            </label>
                            <input
                                type="text"
                                id="address"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Contact Number
                            </label>
                            <input
                                type="text"
                                id="contactNumber"
                                name="contactNumber"
                                value={formData.contactNumber}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                required
                            />
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
                            <label htmlFor="studentUserIdPrefix" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Student UserID Prefix
                            </label>
                            <input
                                type="text"
                                id="studentUserIdPrefix"
                                name="studentUserIdPrefix"
                                value={formData.studentUserIdPrefix}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                required
                                maxLength={8}
                                placeholder="e.g. ABC, XYZ, etc."
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Prefix must be unique and up to 8 characters.</p>
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
                            Add School
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 