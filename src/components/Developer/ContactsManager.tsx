import { Clock, Mail, Phone, Search, User, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Contact } from '../../types';

export function ContactsManager() {
    const { contacts, updateContactStatus, deleteContact } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'contacted' | 'resolved'>('all');
    const [showContactDetails, setShowContactDetails] = useState<Contact | null>(null);

    const filteredContacts = contacts?.filter(contact => {
        const matchesSearch =
            contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.phone.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || contact.status === statusFilter;

        return matchesSearch && matchesStatus;
    }) || [];

    const handleStatusChange = (contactId: string, newStatus: 'new' | 'contacted' | 'resolved') => {
        updateContactStatus(contactId, newStatus);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Contact Requests</h2>
                <div className="flex space-x-3">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Search className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Search contacts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                    >
                        <option value="all">All Status</option>
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="resolved">Resolved</option>
                    </select>
                </div>
            </div>

            {/* Contacts Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-3">Name</th>
                            <th scope="col" className="px-6 py-3">Email</th>
                            <th scope="col" className="px-6 py-3">Phone</th>
                            <th scope="col" className="px-6 py-3">Date</th>
                            <th scope="col" className="px-6 py-3">Status</th>
                            <th scope="col" className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredContacts.length > 0 ? (
                            filteredContacts.map((contact) => (
                                <tr key={contact.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                        {contact.name}
                                    </td>
                                    <td className="px-6 py-4">{contact.email}</td>
                                    <td className="px-6 py-4">{contact.phone}</td>
                                    <td className="px-6 py-4">
                                        {new Date(contact.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs ${contact.status === 'new'
                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                                    : contact.status === 'contacted'
                                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                                }`}
                                        >
                                            {contact.status.charAt(0).toUpperCase() + contact.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex space-x-3">
                                            <button
                                                onClick={() => setShowContactDetails(contact)}
                                                className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                                            >
                                                View
                                            </button>
                                            <div className="relative group">
                                                <button
                                                    className="font-medium text-purple-600 dark:text-purple-500 hover:underline"
                                                >
                                                    Status
                                                </button>
                                                <div className="absolute right-0 z-10 invisible bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-md group-hover:visible">
                                                    <ul className="py-1">
                                                        <li>
                                                            <button
                                                                onClick={() => handleStatusChange(contact.id, 'new')}
                                                                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                                            >
                                                                New
                                                            </button>
                                                        </li>
                                                        <li>
                                                            <button
                                                                onClick={() => handleStatusChange(contact.id, 'contacted')}
                                                                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                                            >
                                                                Contacted
                                                            </button>
                                                        </li>
                                                        <li>
                                                            <button
                                                                onClick={() => handleStatusChange(contact.id, 'resolved')}
                                                                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                                            >
                                                                Resolved
                                                            </button>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => deleteContact(contact.id)}
                                                className="font-medium text-red-600 dark:text-red-500 hover:underline"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                <td colSpan={6} className="px-6 py-4 text-center">
                                    No contacts found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Contact Details Modal */}
            {showContactDetails && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Contact Details</h2>
                            <button
                                onClick={() => setShowContactDetails(null)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-start">
                                <User className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 mr-2" />
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                                    <p className="text-gray-900 dark:text-white">{showContactDetails.name}</p>
                                </div>
                            </div>

                            <div className="flex items-start">
                                <Mail className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 mr-2" />
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                                    <p className="text-gray-900 dark:text-white">{showContactDetails.email}</p>
                                </div>
                            </div>

                            <div className="flex items-start">
                                <Phone className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 mr-2" />
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                                    <p className="text-gray-900 dark:text-white">{showContactDetails.phone}</p>
                                </div>
                            </div>

                            <div className="flex items-start">
                                <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 mr-2" />
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                                    <p className="text-gray-900 dark:text-white">
                                        {new Date(showContactDetails.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Message</p>
                                <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                    {showContactDetails.message}
                                </p>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">Status:</span>
                                    <select
                                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                        value={showContactDetails.status}
                                        onChange={(e) => handleStatusChange(
                                            showContactDetails.id,
                                            e.target.value as 'new' | 'contacted' | 'resolved'
                                        )}
                                    >
                                        <option value="new">New</option>
                                        <option value="contacted">Contacted</option>
                                        <option value="resolved">Resolved</option>
                                    </select>
                                </div>
                                <button
                                    onClick={() => {
                                        deleteContact(showContactDetails.id);
                                        setShowContactDetails(null);
                                    }}
                                    className="text-sm text-red-600 dark:text-red-500 hover:underline"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 