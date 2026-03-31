import { jsPDF } from 'jspdf';
import { Download, FileText, Send } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { Student, StudyConductCertificate } from '../../types';

interface StudentConductCertificateProps {
    student: Student;
}

export function StudentConductCertificate({ student }: StudentConductCertificateProps) {
    const { user } = useAuth();
    const {
        settings,
        getConductCertificateByStudent,
        recordCertificateDownload,
        addConductCertificate,
        updateConductCertificate
    } = useSchoolData();

    const [certificate, setCertificate] = useState<StudyConductCertificate | undefined>(
        getConductCertificateByStudent(student.id)
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Unlike previous implementation, we no longer automatically create a certificate

    const generateCertificatePDF = () => {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        // Certificate dimensions
        const width = doc.internal.pageSize.getWidth();
        const height = doc.internal.pageSize.getHeight();

        // Add border
        doc.setDrawColor(0);
        doc.setLineWidth(1);
        doc.rect(10, 10, width - 20, height - 20);
        doc.setLineWidth(0.5);
        doc.rect(12, 12, width - 24, height - 24);

        // Add header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.text(settings.schoolName, width / 2, 30, { align: 'center' });

        doc.setFontSize(16);
        doc.text(settings.schoolAddress, width / 2, 40, { align: 'center' });

        doc.setFontSize(18);
        doc.text('STUDY AND CONDUCT CERTIFICATE', width / 2, 55, { align: 'center' });

        // Add content
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);

        // Current date
        const today = new Date();
        const formattedDate = today.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        doc.text(`Date: ${formattedDate}`, width - 30, 70, { align: 'right' });

        // Certificate text
        doc.setFontSize(12);
        doc.text(
            `This is to certify that ${student.studentName}, S/o ${student.fatherName} ` +
            `with Admission No: ${student.admissionNumber}, was a bonafide student of this institution in ` +
            `Class ${student.studentClass} (${student.section} section, ${student.medium} medium) during the academic year ${settings.currentAcademicYear}.`,
            width / 2,
            90,
            { align: 'center', maxWidth: width - 60 }
        );

        doc.text(
            `During his/her stay in this institution, his/her conduct and character were found to be GOOD.`,
            width / 2,
            110,
            { align: 'center' }
        );

        // Add school seal image if available
        if (settings.schoolSealImage) {
            try {
                doc.addImage(settings.schoolSealImage, 'JPEG', 50, 130, 40, 40);
            } catch (error) {
                console.error('Error adding school seal image:', error);
            }
        }

        // Add principal signature if available
        if (settings.principalSignatureImage) {
            try {
                doc.addImage(settings.principalSignatureImage, 'JPEG', width - 80, 130, 60, 30);
                doc.text('Principal', width - 50, 170, { align: 'center' });
            } catch (error) {
                console.error('Error adding principal signature image:', error);
            }
        } else {
            doc.text('Principal', width - 50, 150, { align: 'center' });
        }

        return doc;
    };

    const handleDownload = () => {
        const doc = generateCertificatePDF();
        doc.save(`study_conduct_certificate_${student.admissionNumber}.pdf`);

        // Record download and reset certificate status to require new request
        if (certificate) {
            recordCertificateDownload(certificate.id);

            // Reset the certificate status to require a new request
            setTimeout(() => {
                updateConductCertificate(certificate.id, {
                    status: 'completed' // Mark as completed to require a new request
                });
                setCertificate(prev => prev ? { ...prev, status: 'completed' } : prev);
            }, 1000);
        }
    };

    const requestCertificate = () => {
        setIsSubmitting(true);

        try {
            // Create a new certificate request or update existing one
            if (certificate) {
                // Update existing certificate if it's completed or rejected
                if (certificate.status === 'completed' || certificate.status === 'rejected') {
                    updateConductCertificate(certificate.id, {
                        status: 'pending',
                        issueDate: new Date().toISOString(),
                    });
                    setCertificate(prev => prev ? { ...prev, status: 'pending', issueDate: new Date().toISOString() } : prev);
                }
            } else {
                // Create a new certificate request
                const newCertificate: Omit<StudyConductCertificate, 'id'> = {
                    studentId: student.id,
                    issueDate: new Date().toISOString(),
                    academicYear: settings.currentAcademicYear,
                    status: 'pending',
                    downloadCount: 0
                };
                addConductCertificate(newCertificate);
                setCertificate(getConductCertificateByStudent(student.id));
            }

            alert('Your certificate request has been submitted successfully.');
        } catch (error) {
            console.error('Error requesting certificate:', error);
            alert('Failed to request certificate. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderCertificateStatus = () => {
        if (!certificate) {
            return (
                <div className="text-center p-6">
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        You haven't requested a study conduct certificate yet.
                    </p>
                    <button
                        onClick={requestCertificate}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 mx-auto bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                    >
                        <Send className="h-5 w-5" />
                        {isSubmitting ? 'Submitting...' : 'Request Certificate'}
                    </button>
                </div>
            );
        }

        switch (certificate.status) {
            case 'pending':
                return (
                    <div className="text-center p-6">
                        <p className="text-amber-600 dark:text-amber-400 mb-4">
                            Your certificate request is pending approval by the administration.
                        </p>
                        <p className="text-gray-600 dark:text-gray-400">
                            Requested on: {new Date(certificate.issueDate).toLocaleDateString()}
                        </p>
                    </div>
                );
            case 'rejected':
                return (
                    <div className="text-center p-6">
                        <p className="text-red-600 dark:text-red-400 mb-4">
                            Your certificate request was rejected.
                        </p>
                        <button
                            onClick={requestCertificate}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 mx-auto bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                        >
                            <Send className="h-5 w-5" />
                            {isSubmitting ? 'Submitting...' : 'Request Again'}
                        </button>
                    </div>
                );
            case 'completed':
                return (
                    <div className="text-center p-6">
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Your previous certificate has been downloaded.
                        </p>
                        <button
                            onClick={requestCertificate}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 mx-auto bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                        >
                            <Send className="h-5 w-5" />
                            {isSubmitting ? 'Submitting...' : 'Request New Certificate'}
                        </button>
                    </div>
                );
            case 'issued':
                console.log(settings);
                return (
                    <>
                        <div className="border p-6 mb-6 rounded-lg bg-gray-50 dark:bg-gray-700 relative">
                            <div className="absolute top-4 right-4 text-xs text-gray-500 dark:text-gray-400">
                                Preview
                            </div>
                            <div className="text-center">

                                <h3 className="font-bold text-lg">{settings.schoolName}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{settings.schoolAddress}</p>
                                <h4 className="font-bold mt-4">STUDY AND CONDUCT CERTIFICATE</h4>
                            </div>

                            <div className="mt-6">
                                <p className="text-right text-sm">
                                    Date: {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>

                                <p className="mt-4">
                                    This is to certify that <strong>{student.studentName}</strong>, S/o <strong>{student.fatherName}</strong> with
                                    Admission No: <strong>{student.admissionNumber}</strong>, was a bonafide student of this institution
                                    in Class <strong>{student.studentClass}</strong> ({student.section} section, {student.medium} medium)
                                    during the academic year <strong>{settings.currentAcademicYear}</strong>.
                                </p>

                                <p className="mt-4">
                                    During his/her stay in this institution, his/her conduct and character were found to be <strong>GOOD</strong>.
                                </p>

                                <div className="flex justify-between mt-10">
                                    <div className="w-1/4">
                                        {settings.schoolSealImage && (
                                            <div className="text-center">
                                                <div className="h-16 w-16 mx-auto mb-2 opacity-70">
                                                    <img
                                                        src={settings.schoolSealImage}
                                                        alt="School Seal"
                                                        className="object-contain h-full w-full"
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">School Seal</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="w-1/4 text-right">
                                        {settings.principalSignatureImage && (
                                            <div className="text-center">
                                                <div className="h-10 w-24 mx-auto mb-2">
                                                    <img
                                                        src={settings.principalSignatureImage}
                                                        alt="Principal Signature"
                                                        className="object-contain h-full w-full"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        <p className="text-sm font-semibold">Principal</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center mt-6">
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                            >
                                <Download className="h-5 w-5" /> Download Certificate
                            </button>
                        </div>

                        {certificate && (
                            <p className="text-xs text-center mt-4 text-gray-500 dark:text-gray-400">
                                Approved on: {new Date(certificate.issueDate).toLocaleDateString()}
                                {certificate.downloadCount > 0 && ` • Downloaded ${certificate.downloadCount} ${certificate.downloadCount === 1 ? 'time' : 'times'}`}
                                {certificate.lastDownloaded && ` • Last download: ${new Date(certificate.lastDownloaded).toLocaleDateString()}`}
                            </p>
                        )}
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <FileText className="h-6 w-6" /> Study and Conduct Certificate
            </h2>

            {renderCertificateStatus()}
        </div>
    );
} 