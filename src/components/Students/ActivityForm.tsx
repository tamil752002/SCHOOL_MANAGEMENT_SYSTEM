import { Activity, AlertTriangle, Save, X } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';

interface ActivityFormProps {
    studentId: string;
    onClose: () => void;
    onSuccess?: () => void;
}

export function ActivityForm({ studentId, onClose, onSuccess }: ActivityFormProps) {
    const { addStudentActivity, students } = useSchoolData();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const student = students.find(s => s.id === studentId);

    const [formData, setFormData] = useState({
        type: 'positive' as 'positive' | 'negative',
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        category: 'academic' as 'academic' | 'behavior' | 'sports' | 'cultural' | 'disciplinary'
    });

    const activityCategories = [
        { value: 'academic', label: 'Academic' },
        { value: 'behavior', label: 'Behavior' },
        { value: 'sports', label: 'Sports' },
        { value: 'cultural', label: 'Cultural' },
        { value: 'disciplinary', label: 'Disciplinary' }
    ];

    const positiveActivities = [
        'Excellent performance in exam',
        'Outstanding project work',
        'Helpful to classmates',
        'Regular attendance',
        'Active participation in class',
        'Won in sports competition',
        'Participated in cultural event',
        'Leadership qualities shown',
        'Improved academic performance',
        'Good behavior'
    ];

    const negativeActivities = [
        'Late submission of assignment',
        'Irregular attendance',
        'Disruptive behavior in class',
        'Not following school rules',
        'Incomplete homework',
        'Fighting with classmates',
        'Disrespectful to teacher',
        'Damage to school property',
        'Bullying behavior',
        'Academic dishonesty'
    ];

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.title.trim()) {
            newErrors.title = 'Activity title is required';
        }

        if (!formData.description.trim()) {
            newErrors.description = 'Activity description is required';
        }

        if (!formData.date) {
            newErrors.date = 'Activity date is required';
        } else if (new Date(formData.date) > new Date()) {
            newErrors.date = 'Activity date cannot be in the future';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setErrors({});

        try {
            await addStudentActivity({
                studentId,
                type: formData.type,
                title: formData.title,
                description: formData.description,
                date: formData.date,
                category: formData.category,
                recordedBy: user?.id ?? undefined
            });

            alert('Student activity recorded successfully!');
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Error recording activity:', error);
            setErrors({ submit: 'Failed to record activity. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Clear related errors when user starts making changes
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handlePresetSelect = (preset: string) => {
        setFormData(prev => ({ ...prev, title: preset }));
        if (errors.title) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.title;
                return newErrors;
            });
        }
    };

    if (!student) {
        return (
            <div className="p-6 text-center bg-gray-50 dark:bg-gray-900 min-h-screen">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 max-w-md mx-auto">
                    <AlertTriangle className="w-12 h-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Student Not Found</h3>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">The selected student could not be found.</p>
                    <button
                        onClick={onClose}
                        className="mt-4 px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Record Student Activity</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Recording activity for {student.studentName} (Class {student.studentClass}-{student.section})
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Error Messages */}
            {errors.submit && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        <div className="text-sm text-red-700 dark:text-red-300">{errors.submit}</div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Activity Type and Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Activity Type *
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="relative">
                                <input
                                    type="radio"
                                    name="type"
                                    value="positive"
                                    checked={formData.type === 'positive'}
                                    onChange={(e) => handleChange('type', e.target.value)}
                                    className="sr-only"
                                />
                                <div className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${formData.type === 'positive'
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-green-300 dark:hover:border-green-600'
                                    }`}>
                                    <Activity className="w-5 h-5 mx-auto mb-1" />
                                    <div className="text-sm font-medium text-center">Positive</div>
                                </div>
                            </label>
                            <label className="relative">
                                <input
                                    type="radio"
                                    name="type"
                                    value="negative"
                                    checked={formData.type === 'negative'}
                                    onChange={(e) => handleChange('type', e.target.value)}
                                    className="sr-only"
                                />
                                <div className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${formData.type === 'negative'
                                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-amber-300 dark:hover:border-amber-600'
                                    }`}>
                                    <AlertTriangle className="w-5 h-5 mx-auto mb-1" />
                                    <div className="text-sm font-medium text-center">Negative</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Category *
                        </label>
                        <select
                            value={formData.category}
                            onChange={(e) => handleChange('category', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                        >
                            {activityCategories.map(category => (
                                <option key={category.value} value={category.value}>
                                    {category.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Date */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Activity Date *
                    </label>
                    <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => handleChange('date', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.date ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                            }`}
                        required
                    />
                    {errors.date && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.date}</p>}
                </div>

                {/* Quick Presets */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Quick Presets (Optional)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(formData.type === 'positive' ? positiveActivities : negativeActivities).map((preset, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => handlePresetSelect(preset)}
                                className={`p-2 text-sm text-left border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${formData.title === preset
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                    }`}
                            >
                                {preset}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Activity Title */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Activity Title *
                    </label>
                    <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => handleChange('title', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.title ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                            }`}
                        placeholder="Enter activity title..."
                        required
                    />
                    {errors.title && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.title}</p>}
                </div>

                {/* Activity Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Activity Description *
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.description ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                            }`}
                        rows={4}
                        placeholder="Provide detailed description of the activity..."
                        required
                    />
                    {errors.description && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.description}</p>}
                </div>

                {/* Preview */}
                {(formData.title || formData.description) && (
                    <div className={`p-4 rounded-lg border ${formData.type === 'positive'
                        ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                        : 'border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'
                        }`}>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Preview</h4>
                        <div className={`p-4 rounded-lg ${formData.type === 'positive'
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : 'bg-amber-100 dark:bg-amber-900/30'
                            }`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h5 className={`font-medium ${formData.type === 'positive'
                                        ? 'text-green-700 dark:text-green-300'
                                        : 'text-amber-700 dark:text-amber-300'
                                        }`}>
                                        {formData.title || 'Activity Title'}
                                    </h5>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        Category: <span className="capitalize">{formData.category}</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(formData.date).toLocaleDateString()}</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">Recorded by: {user?.name || 'Admin'}</p>
                                </div>
                            </div>
                            <p className="mt-3 text-gray-700 dark:text-gray-300">{formData.description || 'Activity description will appear here...'}</p>
                        </div>
                    </div>
                )}

                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex items-center space-x-2 bg-blue-600 dark:bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        <span>{isLoading ? 'Recording...' : 'Record Activity'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
} 