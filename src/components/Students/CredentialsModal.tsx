import { Check, Copy, Download, Info, Key, X } from 'lucide-react';
import { useState } from 'react';

interface StudentCredential {
    admissionNumber: string;
    password: string;
    studentName?: string;
}

interface CredentialsModalProps {
    isOpen: boolean;
    onClose: () => void;
    credentials: StudentCredential[];
    title: string;
    successCount?: number;
    errorCount?: number;
}

export function CredentialsModal({
    isOpen,
    onClose,
    credentials,
    title,
    successCount,
    errorCount
}: CredentialsModalProps) {
    const [copiedRows, setCopiedRows] = useState<Set<string>>(new Set());

    if (!isOpen) return null;

    const copyToClipboard = async (text: string, admissionNumber: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedRows(prev => new Set(prev).add(admissionNumber));
            setTimeout(() => {
                setCopiedRows(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(admissionNumber);
                    return newSet;
                });
            }, 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    const copyRowCredentials = (credential: StudentCredential) => {
        const text = `Username: ${credential.admissionNumber}\nPassword: ${credential.password}`;
        copyToClipboard(text, credential.admissionNumber);
    };

    const copyAllCredentials = () => {
        const allText = credentials
            .map(c => `Username: ${c.admissionNumber}\nPassword: ${c.password}`)
            .join('\n\n');
        navigator.clipboard.writeText(allText);
    };

    const downloadCredentials = () => {
        const csvContent = [
            'Student ID,Password',
            ...credentials.map(c => `${c.admissionNumber},${c.password}`)
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `student_credentials_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
                        {(successCount !== undefined || errorCount !== undefined) && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {successCount !== undefined && `Successfully processed: ${successCount} students`}
                                {errorCount !== undefined && errorCount > 0 && ` • Errors: ${errorCount} records`}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {credentials.length} credential{credentials.length !== 1 ? 's' : ''} generated
                        </span>
                        {credentials.length > 0 && (
                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded-full">
                                Share with parents
                            </span>
                        )}
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={copyAllCredentials}
                            className="flex items-center space-x-2 bg-gray-600 dark:bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors text-sm"
                        >
                            <Copy className="w-4 h-4" />
                            <span>Copy All</span>
                        </button>
                        <button
                            onClick={downloadCredentials}
                            className="flex items-center space-x-2 bg-green-600 dark:bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-sm"
                        >
                            <Download className="w-4 h-4" />
                            <span>Download CSV</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                    <div className="overflow-y-auto max-h-full">
                        <div className="p-6">
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                                <div className="flex items-start space-x-3">
                                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                                    <div>
                                        <h3 className="font-medium text-blue-900 dark:text-blue-300">Important Information</h3>
                                        <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                                            Please share these login credentials with the respective students/parents.
                                            Make sure to keep this information secure and ask them to change their passwords after first login.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {credentials.length > 0 ? (
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                        Student Details
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                        Login Credentials
                                                    </th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                {credentials.map((credential, index) => (
                                                    <tr key={credential.admissionNumber} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="flex-shrink-0">
                                                                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                                                        <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                                                                            {credential.studentName ? credential.studentName.charAt(0).toUpperCase() : credential.admissionNumber.charAt(0)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                                        {credential.studentName || 'Unknown Student'}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                        ID: {credential.admissionNumber}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="space-y-2">
                                                                <div className="flex items-center space-x-2">
                                                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-16">Username:</span>
                                                                    <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100 font-mono">
                                                                        {credential.admissionNumber}
                                                                    </code>
                                                                </div>
                                                                <div className="flex items-center space-x-2">
                                                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-16">Password:</span>
                                                                    <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100 font-mono">
                                                                        {credential.password}
                                                                    </code>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={() => copyRowCredentials(credential)}
                                                                className={`inline-flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${copiedRows.has(credential.admissionNumber)
                                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                                    }`}
                                                            >
                                                                {copiedRows.has(credential.admissionNumber) ? (
                                                                    <>
                                                                        <Check className="w-3 h-3" />
                                                                        <span>Copied</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Copy className="w-3 h-3" />
                                                                        <span>Copy</span>
                                                                    </>
                                                                )}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Key className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Credentials Available</h3>
                                    <p className="text-gray-500 dark:text-gray-400">There are no login credentials to display.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
} 