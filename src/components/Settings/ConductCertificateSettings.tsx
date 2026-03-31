import { Check, FileUp, Save } from 'lucide-react';
import { ChangeEvent, useRef, useState } from 'react';
import { useSchoolData } from '../../contexts/SchoolDataContext';

export function ConductCertificateSettings() {
    const { settings, updateSettings, conductCertificates, updateConductCertificate, students } = useSchoolData();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isApprovingAll, setIsApprovingAll] = useState(false);
    const [schoolSealPreview, setSchoolSealPreview] = useState<string | null>(settings.schoolSealImage || null);
    const [principalSignaturePreview, setPrincipalSignaturePreview] = useState<string | null>(settings.principalSignatureImage || null);
    const schoolSealInputRef = useRef<HTMLInputElement>(null);
    const principalSignatureInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: ChangeEvent<HTMLInputElement>, type: 'seal' | 'signature') => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size (max 1MB)
        if (file.size > 1024 * 1024) {
            alert('Image file is too large. Please upload an image smaller than 1MB.');
            e.target.value = '';
            return;
        }

        // Validate file type
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            alert('Invalid file type. Please upload a PNG or JPEG image.');
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            if (type === 'seal') {
                setSchoolSealPreview(result);
            } else {
                setPrincipalSignaturePreview(result);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSaveSettings = async () => {
        setIsSubmitting(true);
        try {
            await updateSettings({
                schoolSealImage: schoolSealPreview || undefined,
                principalSignatureImage: principalSignaturePreview || undefined
            });
            alert('Certificate settings saved successfully!');
        } catch (error) {
            console.error('Error saving certificate settings:', error);
            alert('Failed to save settings. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClearImage = (type: 'seal' | 'signature') => {
        if (type === 'seal') {
            setSchoolSealPreview(null);
            if (schoolSealInputRef.current) schoolSealInputRef.current.value = '';
        } else {
            setPrincipalSignaturePreview(null);
            if (principalSignatureInputRef.current) principalSignatureInputRef.current.value = '';
        }
    };

    const renderPendingCertificates = () => {
        const pendingCertificates = conductCertificates.filter(cert => cert.status === 'pending');

        if (pendingCertificates.length === 0) {
            return (
                <div className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No pending certificate requests.
                </div>
            );
        }

        return (
            <div className="mt-4">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Pending Certificate Requests ({pendingCertificates.length})
                    </h3>
                    <button
                        onClick={approveAllCertificates}
                        disabled={isApprovingAll}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <Check className="w-4 h-4" />
                        {isApprovingAll ? 'Approving...' : 'Approve All'}
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-gray-900 dark:text-white">
                        <thead className="bg-gray-100 dark:bg-gray-700">
                            <tr>
                                <th className="p-3">Student</th>
                                <th className="p-3">Class</th>
                                <th className="p-3">Requested Date</th>
                                <th className="p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingCertificates.map((certificate) => {
                                const student = students.find(s => s.id === certificate.studentId);
                                return (
                                    <tr key={certificate.id} className="border-b border-gray-200 dark:border-gray-700">
                                        <td className="p-3">{student?.studentName || 'Unknown Student'}</td>
                                        <td className="p-3">{student ? `${student.studentClass}-${student.section}` : 'N/A'}</td>
                                        <td className="p-3">{new Date(certificate.issueDate).toLocaleDateString()}</td>
                                        <td className="p-3">
                                            <button
                                                onClick={() => approveCertificate(certificate.id)}
                                                className="px-3 py-1 bg-green-600 text-white rounded mr-2 hover:bg-green-700 transition-colors"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => rejectCertificate(certificate.id)}
                                                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                            >
                                                Reject
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const getStudentById = (studentId: string) => {
        return students.find(student => student.id === studentId);
    };

    const approveCertificate = (certificateId: string) => {
        updateConductCertificate(certificateId, {
            status: 'issued',
            issueDate: new Date().toISOString()
        });
        alert('Certificate approved successfully.');
    };

    const rejectCertificate = (certificateId: string) => {
        if (confirm('Are you sure you want to reject this certificate request?')) {
            updateConductCertificate(certificateId, {
                status: 'rejected'
            });
            alert('Certificate request rejected.');
        }
    };

    const approveAllCertificates = async () => {
        if (confirm('Are you sure you want to approve all pending certificate requests?')) {
            setIsApprovingAll(true);

            try {
                const pendingCertificates = conductCertificates.filter(cert => cert.status === 'pending');
                const now = new Date().toISOString();

                // Process all pending certificates
                for (const cert of pendingCertificates) {
                    updateConductCertificate(cert.id, {
                        status: 'issued',
                        issueDate: now
                    });
                }

                alert(`Successfully approved ${pendingCertificates.length} certificate requests.`);
            } catch (error) {
                console.error('Error approving certificates:', error);
                alert('An error occurred while approving certificates.');
            } finally {
                setIsApprovingAll(false);
            }
        }
    };

    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Study Conduct Certificate Settings
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* School Seal Upload */}
                <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                        School Seal Image
                    </h3>
                    <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                        <div className="flex flex-col items-center mb-4">
                            {schoolSealPreview ? (
                                <div className="relative mb-4">
                                    <img
                                        src={schoolSealPreview}
                                        alt="School Seal Preview"
                                        className="h-32 w-32 object-contain border rounded-lg"
                                    />
                                    <button
                                        onClick={() => handleClearImage('seal')}
                                        className="absolute top-0 right-0 bg-red-600 text-white rounded-full h-6 w-6 flex items-center justify-center"
                                        title="Remove image"
                                    >
                                        ×
                                    </button>
                                </div>
                            ) : (
                                <div className="h-32 w-32 border rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-600 mb-4">
                                    <span className="text-gray-400 dark:text-gray-500">No image</span>
                                </div>
                            )}

                            <label className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors cursor-pointer">
                                <FileUp className="h-5 w-5" />
                                <span>Upload School Seal</span>
                                <input
                                    ref={schoolSealInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg"
                                    onChange={(e) => handleImageUpload(e, 'seal')}
                                    className="hidden"
                                />
                            </label>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                Upload a PNG or JPEG image (max 1MB)
                            </p>
                        </div>
                    </div>
                </div>

                {/* Principal Signature Upload */}
                <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                        Principal's Signature
                    </h3>
                    <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                        <div className="flex flex-col items-center mb-4">
                            {principalSignaturePreview ? (
                                <div className="relative mb-4">
                                    <img
                                        src={principalSignaturePreview}
                                        alt="Principal Signature Preview"
                                        className="h-20 w-40 object-contain border rounded-lg"
                                    />
                                    <button
                                        onClick={() => handleClearImage('signature')}
                                        className="absolute top-0 right-0 bg-red-600 text-white rounded-full h-6 w-6 flex items-center justify-center"
                                        title="Remove image"
                                    >
                                        ×
                                    </button>
                                </div>
                            ) : (
                                <div className="h-20 w-40 border rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-600 mb-4">
                                    <span className="text-gray-400 dark:text-gray-500">No image</span>
                                </div>
                            )}

                            <label className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors cursor-pointer">
                                <FileUp className="h-5 w-5" />
                                <span>Upload Signature</span>
                                <input
                                    ref={principalSignatureInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg"
                                    onChange={(e) => handleImageUpload(e, 'signature')}
                                    className="hidden"
                                />
                            </label>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                Upload a PNG or JPEG image (max 1MB)
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 flex justify-end">
                <button
                    onClick={handleSaveSettings}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Save className="h-5 w-5" />
                    <span>{isSubmitting ? 'Saving...' : 'Save Settings'}</span>
                </button>
            </div>

            <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Certificate Requests
                </h2>
                {renderPendingCertificates()}
            </div>
        </div>
    );
} 