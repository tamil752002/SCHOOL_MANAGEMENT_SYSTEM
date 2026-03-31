import { ArrowLeft, Building, Edit, Lock, Mail, Phone, Plus, Save, Unlock, User, UserX, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { School } from '../../types';
import { AdminForm } from './AdminForm';

interface SchoolDetailProps {
    schoolId: string;
    onBack: () => void;
}

export function SchoolDetail({ schoolId, onBack }: SchoolDetailProps) {
    const { schools, admins, updateSchool, updateSchoolStatus, deleteSchool, updateAdminStatus, deleteAdmin } = useAuth();
    const [showAdminForm, setShowAdminForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const school = schools.find(s => s.id === schoolId);
    const schoolAdmins = admins.filter(a => a.schoolId === schoolId);

    const [editFormData, setEditFormData] = useState<Partial<School> | null>(null);

    const handleEditClick = () => {
        if (school) {
            setEditFormData({
                name: school.name,
                address: school.address,
                contactNumber: school.contactNumber,
                email: school.email,
                studentUserIdPrefix: school.studentUserIdPrefix || ''
            });
            setIsEditing(true);
        }
    };

    const handleCancelEdit = () => {
        setEditFormData(null);
        setIsEditing(false);
    };

    const handleSaveEdit = () => {
        if (school && editFormData) {
            // Update school data using the updateSchool function
            updateSchool(school.id, editFormData);
            setIsEditing(false);
            setEditFormData(null);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (editFormData) {
            setEditFormData({
                ...editFormData,
                [name]: value
            });
        }
    };

    if (!school) {
        return (
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                <button
                    onClick={onBack}
                    className="flex items-center text-blue-600 dark:text-blue-400 mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Schools
                </button>
                <p className="text-center text-gray-500 dark:text-gray-400">School not found</p>
            </div>
        );
    }

    // Render edit form
    if (isEditing && editFormData) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit School</h2>
                        <button
                            onClick={handleCancelEdit}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                School Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={editFormData.name || ''}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Address
                            </label>
                            <textarea
                                id="address"
                                name="address"
                                value={editFormData.address || ''}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                rows={3}
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
                                value={editFormData.contactNumber || ''}
                                onChange={handleInputChange}
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
                                value={editFormData.email || ''}
                                onChange={handleInputChange}
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
                                value={editFormData.studentUserIdPrefix || ''}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                maxLength={8}
                                required
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Prefix must be unique and up to 8 characters.</p>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={handleCancelEdit}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Regular view mode
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6">
                <button
                    onClick={onBack}
                    className="flex items-center text-blue-600 dark:text-blue-400 mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Schools
                </button>

                {/* School Header */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                            <Building className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" />
                            {school.name}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {school.status === 'active' ? (
                                <span className="text-green-600 dark:text-green-400">Active</span>
                            ) : (
                                <span className="text-red-600 dark:text-red-400">Blocked</span>
                            )}
                        </p>
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={handleEditClick}
                            className="bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 px-3 py-2 rounded-md flex items-center"
                        >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit School
                        </button>

                        {school.status === 'active' ? (
                            <button
                                onClick={() => updateSchoolStatus(school.id, 'blocked')}
                                className="bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 px-3 py-2 rounded-md flex items-center"
                            >
                                <Lock className="w-4 h-4 mr-1" />
                                Block School
                            </button>
                        ) : (
                            <button
                                onClick={() => updateSchoolStatus(school.id, 'active')}
                                className="bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 px-3 py-2 rounded-md flex items-center"
                            >
                                <Unlock className="w-4 h-4 mr-1" />
                                Unblock School
                            </button>
                        )}
                        <button
                            onClick={() => {
                                deleteSchool(school.id);
                                onBack();
                            }}
                            className="bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 px-3 py-2 rounded-md flex items-center"
                        >
                            <UserX className="w-4 h-4 mr-1" />
                            Delete School
                        </button>
                    </div>
                </div>

                {/* School Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* School Info */}
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">School Information</h2>
                        <div className="space-y-3">
                            <div className="flex items-start">
                                <Mail className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 mr-2" />
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                                    <p className="text-gray-900 dark:text-white">{school.email}</p>
                                </div>
                            </div>
                            <div className="flex items-start">
                                <Phone className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 mr-2" />
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Contact</p>
                                    <p className="text-gray-900 dark:text-white">{school.contactNumber}</p>
                                </div>
                            </div>
                            <div className="flex items-start">
                                <Building className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 mr-2" />
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
                                    <p className="text-gray-900 dark:text-white">{school.address}</p>
                                </div>
                            </div>
                            <div className="flex items-start">
                                <User className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 mr-2" />
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Student ID Prefix</p>
                                    <p className="text-gray-900 dark:text-white">{school.studentUserIdPrefix || 'Not set'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Statistics */}
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Statistics</h2>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Administrators</span>
                                <span className="font-medium text-gray-900 dark:text-white">{schoolAdmins.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Status</span>
                                <span className={`font-medium ${school.status === 'active' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {school.status.charAt(0).toUpperCase() + school.status.slice(1)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Created</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {new Date(school.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Admins Section */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">School Administrators</h2>
                        <button
                            onClick={() => setShowAdminForm(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Admin
                        </button>
                    </div>
                    {schoolAdmins.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Name</th>
                                        <th scope="col" className="px-6 py-3">Username</th>
                                        <th scope="col" className="px-6 py-3">Email</th>
                                        <th scope="col" className="px-6 py-3">Phone</th>
                                        <th scope="col" className="px-6 py-3">Status</th>
                                        <th scope="col" className="px-6 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {schoolAdmins.map((admin) => (
                                        <tr key={admin.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                            <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                                <div className="flex items-center">
                                                    <User className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                                                    {admin.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">{admin.username}</td>
                                            <td className="px-6 py-4">{admin.email}</td>
                                            <td className="px-6 py-4">{admin.phoneNumber}</td>
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
                                            <td className="px-6 py-4 flex space-x-2">
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
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                            <p className="text-gray-500 dark:text-gray-400">No administrators found for this school.</p>
                        </div>
                    )}
                    {/* Add Admin Modal */}
                    {showAdminForm && (
                        <AdminForm
                            onClose={() => setShowAdminForm(false)}
                            defaultSchoolId={school.id}
                        />
                    )}
                </div>
            </div>
        </div>
    );
} 