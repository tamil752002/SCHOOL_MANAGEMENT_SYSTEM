import { Calendar, Eye, EyeOff, MapPin, Phone, RefreshCw, Save, User, Users, X } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { sortClassNamesArray } from '../../utils/sortClasses';
import { Student } from '../../types';
import { CredentialsModal } from './CredentialsModal';

interface StudentFormProps {
  onClose: () => void;
  student?: Student;
}

export function StudentForm({ onClose, student }: StudentFormProps) {
  const { user } = useAuth();
  const { addStudent, updateStudent, generateAdmissionNumber, generateStudentPassword } = useSchoolData();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [credentialsModal, setCredentialsModal] = useState<{
    isOpen: boolean;
    credentials: Array<{ admissionNumber: string; password: string; studentName?: string }>;
    title: string;
  }>({
    isOpen: false,
    credentials: [],
    title: '',
  });

  const [formData, setFormData] = useState(() => ({
    admissionNumber: student?.admissionNumber || generateAdmissionNumber(),
    admissionDate: student?.admissionDate || new Date().toISOString().split('T')[0],
    firstName: student?.firstName || '',
    middleName: student?.middleName || '',
    lastName: student?.lastName || '',
    studentAadhar: student?.studentAadhar || '',
    fatherName: student?.fatherName || '',
    fatherAadhar: student?.fatherAadhar || '',
    motherName: student?.motherName || '',
    motherAadhar: student?.motherAadhar || '',
    studentClass: student?.studentClass || '',
    section: student?.section || '',
    medium: student?.medium || 'English',
    dob: student?.dob || '',
    location: student?.location || '',
    admissionClass: student?.admissionClass || '',
    mobileNumber: student?.mobileNumber || '',
    penNumber: student?.penNumber || '',
    caste: student?.caste || '',
    subCaste: student?.subCaste || '',
    religion: student?.religion || '',
    motherTongue: student?.motherTongue || '',
    password: student?.password || ''
  }));

  const classes = sortClassNamesArray(['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);
  const sections = ['A', 'B', 'C'];
  const mediums = ['English', 'Telugu', 'Hindi'];
  const religions = ['Hindu', 'Christian', 'Muslim', 'Other'];

  const handleGeneratePassword = () => {
    if (formData.firstName && formData.dob) {
      const newPassword = generateStudentPassword(formData.firstName, formData.dob);
      setFormData(prev => ({ ...prev, password: newPassword }));
    } else {
      alert('Please enter First Name and Date of Birth first');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent multiple submissions
    setIsLoading(true);

    try {
      let finalPassword = formData.password;
      if (!student && !finalPassword) {
        finalPassword = generateStudentPassword(formData.firstName, formData.dob);
      }

      const studentData = {
        ...formData,
        password: finalPassword,
        status: student?.status || ('active' as const),
        schoolId: student?.schoolId || (user as any)?.schoolId || ''
      };
      if (student) {
        await updateStudent(student.id, studentData);
        alert('Student updated successfully!');
        onClose();
      } else {
        await addStudent(studentData);
        setCredentialsModal({
          isOpen: true,
          credentials: [{
            admissionNumber: studentData.admissionNumber,
            password: studentData.password,
            studentName: `${studentData.firstName} ${studentData.lastName || ''}`.trim()
          }],
          title: 'Student Added - Login Credentials'
        });
        setFormData({
          admissionNumber: generateAdmissionNumber(),
          admissionDate: new Date().toISOString().split('T')[0],
          firstName: '',
          middleName: '',
          lastName: '',
          studentAadhar: '',
          fatherName: '',
          fatherAadhar: '',
          motherName: '',
          motherAadhar: '',
          studentClass: '',
          section: '',
          medium: 'English',
          dob: '',
          location: '',
          admissionClass: '',
          mobileNumber: '',
          penNumber: '',
          caste: '',
          subCaste: '',
          religion: '',
          motherTongue: '',
          password: ''
        });
      }
    } catch (error) {
      console.error('Error saving student:', error);
      alert('Error saving student data');
    } finally {
      setIsLoading(false);
    }
  };

  const closeCredentialsModal = () => {
    setCredentialsModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      if (!student && (field === 'firstName' || field === 'dob')) {
        if (newData.firstName && newData.dob) {
           newData.password = generateStudentPassword(newData.firstName, newData.dob);
        }
      }
      return newData;
    });
  };

  return (
    <div className="p-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {student ? 'Edit Student' : 'Add New Student'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Student Information</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Admission Number *
                  </label>
                  <input
                    type="text"
                    value={formData.admissionNumber}
                    onChange={(e) => handleChange('admissionNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    required
                    readOnly={!!student}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Admission Date *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <input
                      type="date"
                      value={formData.admissionDate}
                      onChange={(e) => handleChange('admissionDate', e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    value={formData.middleName}
                    onChange={(e) => handleChange('middleName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Student Aadhar Number
                </label>
                <input
                  type="text"
                  value={formData.studentAadhar}
                  onChange={(e) => handleChange('studentAadhar', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  maxLength={12}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Student Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      className="w-full px-3 py-2 pr-20 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-3">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={handleGeneratePassword}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        title="Generate new password"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">First 3 chars of name + dob (dd/mm/yyyy)</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Parent Information</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Father's Name *
                  </label>
                  <input
                    type="text"
                    value={formData.fatherName}
                    onChange={(e) => handleChange('fatherName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Father's Aadhar Number
                  </label>
                  <input
                    type="text"
                    value={formData.fatherAadhar}
                    onChange={(e) => handleChange('fatherAadhar', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    maxLength={12}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Mother's Name *
                  </label>
                  <input
                    type="text"
                    value={formData.motherName}
                    onChange={(e) => handleChange('motherName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Mother's Aadhar Number
                  </label>
                  <input
                    type="text"
                    value={formData.motherAadhar}
                    onChange={(e) => handleChange('motherAadhar', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    maxLength={12}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Mobile Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <input
                      type="tel"
                      value={formData.mobileNumber}
                      onChange={(e) => handleChange('mobileNumber', e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      required
                      maxLength={10}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Academic Information</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Class *
                  </label>
                  <select
                    value={formData.studentClass}
                    onChange={(e) => handleChange('studentClass', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="">Select Class</option>
                    {classes.map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Section *
                  </label>
                  <select
                    value={formData.section}
                    onChange={(e) => handleChange('section', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="">Select Section</option>
                    {sections.map(section => (
                      <option key={section} value={section}>{section}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Medium *
                  </label>
                  <select
                    value={formData.medium}
                    onChange={(e) => handleChange('medium', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    {mediums.map(medium => (
                      <option key={medium} value={medium}>{medium}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date of Birth *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => handleChange('dob', e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Admission Class
                  </label>
                  <input
                    type="text"
                    value={formData.admissionClass}
                    onChange={(e) => handleChange('admissionClass', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="Class at time of admission"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Additional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    PEN Number
                  </label>
                  <input
                    type="text"
                    value={formData.penNumber}
                    onChange={(e) => handleChange('penNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Caste
                  </label>
                  <input
                    type="text"
                    value={formData.caste}
                    onChange={(e) => handleChange('caste', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sub Caste
                  </label>
                  <input
                    type="text"
                    value={formData.subCaste}
                    onChange={(e) => handleChange('subCaste', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Religion
                  </label>
                  <select
                    value={formData.religion}
                    onChange={(e) => handleChange('religion', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select Religion</option>
                    {religions.map(religion => (
                      <option key={religion} value={religion}>{religion}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Mother Tongue
                  </label>
                  <input
                    type="text"
                    value={formData.motherTongue}
                    onChange={(e) => handleChange('motherTongue', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end space-x-4 border-t border-gray-200 dark:border-gray-700 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>{student ? 'Update Student' : 'Save Student'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <CredentialsModal
        isOpen={credentialsModal.isOpen}
        onClose={closeCredentialsModal}
        credentials={credentialsModal.credentials}
        title={credentialsModal.title}
      />
    </div>
  );
}
