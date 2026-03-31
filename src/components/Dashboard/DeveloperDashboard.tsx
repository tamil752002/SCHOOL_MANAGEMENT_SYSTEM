import { Eye, EyeOff, Lock, Plus, Search, Unlock, UserX } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AdminForm } from '../Developer/AdminForm';
import { ContactsManager } from '../Developer/ContactsManager';
import { SchoolDetail } from '../Developer/SchoolDetail';
import { SchoolForm } from '../Developer/SchoolForm';
import { DeveloperStatsDashboard } from './DeveloperStatsDashboard';

interface DeveloperDashboardProps {
    currentView?: string;
}

export function DeveloperDashboard({ currentView = 'dashboard' }: DeveloperDashboardProps) {
    const { schools, admins, updateSchoolStatus, deleteSchool, deleteAdmin, updateAdminStatus } = useAuth();
    const [showSchoolForm, setShowSchoolForm] = useState(false);
    const [showAdminForm, setShowAdminForm] = useState(false);
    const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);

    const togglePasswordVisibility = (id: string) => {
        setVisiblePasswords(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    // Filter schools based on search term
    const filteredSchools = schools.filter(school =>
        school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.contactNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Filter admins based on search term
    const filteredAdmins = admins.filter(admin =>
        admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schools.find(s => s.id === admin.schoolId)?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Handle selecting a school to view details
    const handleViewSchool = (schoolId: string) => {
        setSelectedSchoolId(schoolId);
    };

    // Handle going back from school detail view
    const handleBackToSchools = () => {
        setSelectedSchoolId(null);
    };

    // Render content based on currentView
    const renderContent = () => {
        switch (currentView) {
            case 'dashboard':
                return <DeveloperStatsDashboard />;
            
            case 'schools':
                return (
                    <>
                        {/* Search Box - Only visible when not viewing school details */}
                        {!selectedSchoolId && (
                    <div className="mb-6">
                        <div className="relative max-w-md">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <Search className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                placeholder="Search schools..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                        )}

                        {/* Schools Management */}
                        {!selectedSchoolId && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Schools Management</h2>
                            <button
                                onClick={() => setShowSchoolForm(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add School
                            </button>
                        </div>

                        {/* Schools Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Name</th>
                                        <th scope="col" className="px-6 py-3">Email</th>
                                        <th scope="col" className="px-6 py-3">Contact</th>
                                        <th scope="col" className="px-6 py-3">Status</th>
                                        <th scope="col" className="px-6 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSchools.length > 0 ? (
                                        filteredSchools.map((school) => (
                                            <tr key={school.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => handleViewSchool(school.id)}>
                                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                                    {school.name}
                                                </td>
                                                <td className="px-6 py-4">{school.email}</td>
                                                <td className="px-6 py-4">{school.contactNumber}</td>
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs ${school.status === 'active'
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                                            }`}
                                                    >
                                                        {school.status === 'active' ? 'Active' : 'Blocked'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 flex space-x-2" onClick={(e) => e.stopPropagation()}>
                                                    {school.status === 'active' ? (
                                                        <button
                                                            onClick={() => updateSchoolStatus(school.id, 'blocked')}
                                                            className="font-medium text-red-600 dark:text-red-500 hover:underline flex items-center"
                                                        >
                                                            <Lock className="w-4 h-4 mr-1" />
                                                            Block
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => updateSchoolStatus(school.id, 'active')}
                                                            className="font-medium text-green-600 dark:text-green-500 hover:underline flex items-center"
                                                        >
                                                            <Unlock className="w-4 h-4 mr-1" />
                                                            Unblock
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => deleteSchool(school.id)}
                                                        className="font-medium text-red-600 dark:text-red-500 hover:underline flex items-center"
                                                    >
                                                        <UserX className="w-4 h-4 mr-1" />
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr className="bg-white dark:bg-gray-800">
                                            <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                                No schools found matching your search.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Add School Form Modal */}
                        {showSchoolForm && (
                            <SchoolForm onClose={() => setShowSchoolForm(false)} />
                        )}
                    </div>
                )}

                        {/* School Detail View */}
                        {selectedSchoolId && (
                            <SchoolDetail
                                schoolId={selectedSchoolId}
                                onBack={handleBackToSchools}
                            />
                        )}
                    </>
                );

            case 'admins':
                return (
                    <>
                        {/* Search Box */}
                        <div className="mb-6">
                            <div className="relative max-w-md">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <Search className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="Search admins..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Admins Management */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Admins Management</h2>
                            <button
                                onClick={() => setShowAdminForm(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Admin
                            </button>
                        </div>

                        {/* Admins Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Name</th>
                                        <th scope="col" className="px-6 py-3">Username</th>
                                        <th scope="col" className="px-6 py-3">Email</th>
                                        <th scope="col" className="px-6 py-3">School</th>
                                        <th scope="col" className="px-6 py-3">Password</th>
                                        <th scope="col" className="px-6 py-3">Status</th>
                                        <th scope="col" className="px-6 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAdmins.length > 0 ? (
                                        filteredAdmins.map((admin) => {
                                            const adminSchool = schools.find(s => s.id === admin.schoolId);
                                            return (
                                                <tr key={admin.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => handleViewSchool(admin.schoolId)}>
                                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                                        {admin.name}
                                                    </td>
                                                    <td className="px-6 py-4">{admin.username}</td>
                                                    <td className="px-6 py-4">{admin.email}</td>
                                                    <td className="px-6 py-4">{adminSchool?.name || 'Unknown School'}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center">
                                                            <input
                                                                type={visiblePasswords[admin.id] ? "text" : "password"}
                                                                value={admin.password}
                                                                className="bg-transparent border-none mr-2"
                                                                readOnly
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    togglePasswordVisibility(admin.id);
                                                                }}
                                                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                                            >
                                                                {visiblePasswords[admin.id] ? (
                                                                    <EyeOff className="w-4 h-4" />
                                                                ) : (
                                                                    <Eye className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span
                                                            className={`px-2 py-1 rounded-full text-xs ${admin.status === 'active'
                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                                                }`}
                                                        >
                                                            {admin.status === 'active' ? 'Active' : 'Blocked'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 flex space-x-2" onClick={(e) => e.stopPropagation()}>
                                                        {admin.status === 'active' ? (
                                                            <button
                                                                onClick={() => updateAdminStatus(admin.id, 'blocked')}
                                                                className="font-medium text-red-600 dark:text-red-500 hover:underline flex items-center"
                                                            >
                                                                <Lock className="w-4 h-4 mr-1" />
                                                                Block
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => updateAdminStatus(admin.id, 'active')}
                                                                className="font-medium text-green-600 dark:text-green-500 hover:underline flex items-center"
                                                            >
                                                                <Unlock className="w-4 h-4 mr-1" />
                                                                Unblock
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => deleteAdmin(admin.id)}
                                                            className="font-medium text-red-600 dark:text-red-500 hover:underline flex items-center"
                                                        >
                                                            <UserX className="w-4 h-4 mr-1" />
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr className="bg-white dark:bg-gray-800">
                                            <td colSpan={7} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                                No admins found matching your search.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Add Admin Form Modal */}
                        {showAdminForm && (
                            <AdminForm onClose={() => setShowAdminForm(false)} />
                        )}
                    </div>
                    </>
                );

            case 'contacts':
                return <ContactsManager />;

            default:
                return <DeveloperStatsDashboard />;
        }
    };

    return (
        <div className="container mx-auto px-4 py-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Developer Dashboard</h1>
                {renderContent()}
            </div>
        </div>
    );
} 