import { Building, Lock, Unlock, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DatabaseService from '../../services/DatabaseService';
import { DeveloperStats, SchoolStatistics } from '../../types';

export function DeveloperStatsDashboard() {
    const { updateSchoolStatus } = useAuth();
    const [stats, setStats] = useState<DeveloperStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadStatistics();
    }, []);

    const loadStatistics = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await DatabaseService.getSchoolStatistics();
            if (data) {
                setStats(data);
            } else {
                setError('Failed to load statistics');
            }
        } catch (err) {
            console.error('Error loading statistics:', err);
            setError('Failed to load statistics');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusToggle = async (schoolId: string, currentStatus: 'active' | 'blocked') => {
        const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
        await updateSchoolStatus(schoolId, newStatus);
        // Reload statistics after status change
        await loadStatistics();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-gray-600 dark:text-gray-400">Loading statistics...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-red-600 dark:text-red-400">{error}</div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-gray-600 dark:text-gray-400">No statistics available</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Schools</p>
                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                                {stats.totalSchools}
                            </p>
                        </div>
                        <Building className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="mt-4 flex gap-2 text-xs">
                        <span className="text-green-600 dark:text-green-400">
                            {stats.activeSchools} Active
                        </span>
                        <span className="text-red-600 dark:text-red-400">
                            {stats.blockedSchools} Blocked
                        </span>
                    </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-6 border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-600 dark:text-green-400 font-medium">Total Admins</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">
                                {stats.totalAdmins}
                            </p>
                        </div>
                        <Users className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Total Students</p>
                            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">
                                {stats.totalStudents}
                            </p>
                        </div>
                        <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                    </div>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-6 border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Active Schools</p>
                            <p className="text-2xl font-bold text-orange-900 dark:text-orange-100 mt-1">
                                {stats.activeSchools}
                            </p>
                        </div>
                        <Building className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                    </div>
                </div>
            </div>

            {/* School Statistics Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">School Statistics</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">School Name</th>
                                <th scope="col" className="px-6 py-3">Email</th>
                                <th scope="col" className="px-6 py-3">Contact</th>
                                <th scope="col" className="px-6 py-3">Admins</th>
                                <th scope="col" className="px-6 py-3">Students</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(stats.schoolStatistics ?? []).length > 0 ? (
                                (stats.schoolStatistics ?? []).map((school: SchoolStatistics) => (
                                    <tr
                                        key={school.schoolId}
                                        className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                            {school.schoolName}
                                        </td>
                                        <td className="px-6 py-4">{school.schoolEmail}</td>
                                        <td className="px-6 py-4">{school.schoolContact}</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                                {school.adminCount}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                                                {school.studentCount}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs ${
                                                    school.schoolStatus === 'active'
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                                }`}
                                            >
                                                {school.schoolStatus === 'active' ? 'Active' : 'Blocked'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex space-x-2">
                                                {school.schoolStatus === 'active' ? (
                                                    <button
                                                        onClick={() => handleStatusToggle(school.schoolId, 'active')}
                                                        className="font-medium text-red-600 dark:text-red-500 hover:underline flex items-center"
                                                        title="Block School"
                                                    >
                                                        <Lock className="w-4 h-4 mr-1" />
                                                        Block
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleStatusToggle(school.schoolId, 'blocked')}
                                                        className="font-medium text-green-600 dark:text-green-500 hover:underline flex items-center"
                                                        title="Unblock School"
                                                    >
                                                        <Unlock className="w-4 h-4 mr-1" />
                                                        Unblock
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr className="bg-white dark:bg-gray-800">
                                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                        No schools found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

