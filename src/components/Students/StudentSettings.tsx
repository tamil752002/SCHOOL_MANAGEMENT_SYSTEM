import { LockKeyhole, School, User } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { Student } from '../../types';
import { ChangePasswordForm } from '../Settings/ChangePasswordForm';

interface StudentSettingsProps {
    overrideStudent?: Student | null;
}

export function StudentSettings({ overrideStudent }: StudentSettingsProps = {} as StudentSettingsProps) {
    const { user } = useAuth();
    const { students } = useSchoolData();
    const [activeTab, setActiveTab] = useState<'personal' | 'security' | 'academic'>('personal');

    const studentDetails = overrideStudent ?? students.find(s => s.id === user?.id || s.userId === user?.id);

    const tabs = [
        { id: 'personal', label: 'Personal Information', icon: User },
        { id: 'security', label: 'Security', icon: LockKeyhole },
        { id: 'academic', label: 'Academic', icon: School }
    ];

    const renderPersonalInfoTab = () => (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Personal Information</h3>

            {studentDetails ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Full Name</p>
                        <p className="font-medium text-gray-900 dark:text-white">{[studentDetails.firstName, studentDetails.lastName].filter(Boolean).join(' ')}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Admission Number</p>
                        <p className="font-medium text-gray-900 dark:text-white">{studentDetails.admissionNumber}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Class & Section</p>
                        <p className="font-medium text-gray-900 dark:text-white">Class {studentDetails.studentClass}-{studentDetails.section}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Medium</p>
                        <p className="font-medium text-gray-900 dark:text-white">{studentDetails.medium}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Date of Birth</p>
                        <p className="font-medium text-gray-900 dark:text-white">{formatDate(studentDetails.dob)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Mobile Number</p>
                        <p className="font-medium text-gray-900 dark:text-white">{studentDetails.mobileNumber}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Father's Name</p>
                        <p className="font-medium text-gray-900 dark:text-white">{studentDetails.fatherName}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Mother's Name</p>
                        <p className="font-medium text-gray-900 dark:text-white">{studentDetails.motherName}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Admission Date</p>
                        <p className="font-medium text-gray-900 dark:text-white">{formatDate(studentDetails.admissionDate)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Location</p>
                        <p className="font-medium text-gray-900 dark:text-white">{studentDetails.location}</p>
                    </div>
                </div>
            ) : (
                <p className="text-gray-500 dark:text-gray-400">No student details found.</p>
            )}
        </div>
    );

    const renderSecurityTab = () => (
        <div className="space-y-6">
            {user && (
                <ChangePasswordForm
                    userId={user.id}
                    userType="student"
                    onPasswordChanged={() => {
                        // Show success message or other actions after password change
                    }}
                />
            )}
        </div>
    );

    const renderAcademicTab = () => (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Grading System</h3>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Grade
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Percentage Range
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Description
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {[
                            { grade: 'A+', range: '90-100%', desc: 'Outstanding' },
                            { grade: 'A', range: '80-89%', desc: 'Excellent' },
                            { grade: 'B+', range: '70-79%', desc: 'Very Good' },
                            { grade: 'B', range: '60-69%', desc: 'Good' },
                            { grade: 'C', range: '50-59%', desc: 'Average' },
                            { grade: 'D', range: '35-49%', desc: 'Below Average' },
                            { grade: 'F', range: '0-34%', desc: 'Fail' }
                        ].map((item, index) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">{item.grade}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">{item.range}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">{item.desc}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // Helper function to format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your account preferences</p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar */}
                <div className="lg:w-64">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                        <nav className="space-y-2">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors ${activeTab === tab.id
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-700 dark:border-blue-400'
                                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span className="font-medium">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                    {activeTab === 'personal' && renderPersonalInfoTab()}
                    {activeTab === 'security' && renderSecurityTab()}
                    {activeTab === 'academic' && renderAcademicTab()}
                </div>
            </div>
        </div>
    );
} 