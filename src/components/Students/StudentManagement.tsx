import { Download, Filter, Plus, RefreshCw, Search, Upload, Users } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { sortClassNamesArray } from '../../utils/sortClasses';
import { Student } from '../../types';
import { CredentialsModal } from './CredentialsModal';
import { StudentForm } from './StudentForm';
import { StudentList } from './StudentList';

interface StudentManagementProps {
  onViewProfile?: (studentId: string) => void;
}

export function StudentManagement({ onViewProfile }: StudentManagementProps) {
  const { students, addStudent, updateStudent, getStudentsByClass, generateStudentPassword } = useSchoolData();
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [credentialsModal, setCredentialsModal] = useState<{
    isOpen: boolean;
    credentials: Array<{ admissionNumber: string; password: string; studentName?: string }>;
    title: string;
    successCount?: number;
    errorCount?: number;
  }>({
    isOpen: false,
    credentials: [],
    title: '',
    successCount: undefined,
    errorCount: undefined,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const classes = sortClassNamesArray(['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const status = (student.status || 'active').toLowerCase();
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && status === 'active') || (statusFilter === 'inactive' && status === 'inactive');
      const matchesSearch = !searchTerm.trim() ||
        (student.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.admissionNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${(student.firstName || '')} ${(student.lastName || '')}`.trim().toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = !filterClass ||
        String(student.studentClass || '').trim().toLowerCase() === String(filterClass || '').trim().toLowerCase();
      return matchesStatus && matchesSearch && matchesClass;
    });
  }, [students, searchTerm, filterClass, statusFilter]);

  const handleViewProfile = (studentId: string) => {
    onViewProfile?.(studentId);
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setShowForm(true);
  };

  const handleDeactivateStudent = (studentId: string) => {
    if (window.confirm('Mark this student as inactive? They will be hidden from the active list but can be reactivated later.')) {
      updateStudent(studentId, { status: 'inactive' });
    }
  };

  const handleActivateStudent = (studentId: string) => {
    updateStudent(studentId, { status: 'active' });
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingStudent(undefined);
  };

  const exportStudents = () => {
    try {
      const headers = [
        'Admission Number', 'Admission Date', 'Student Name', 'Student Aadhar',
        'Father Name', 'Father Aadhar', 'Mother Name', 'Mother Aadhar',
        'Class', 'Section', 'Medium', 'Date of Birth', 'Location',
        'Admission Class', 'Mobile Number', 'PEN Number', 'Caste',
        'Sub Caste', 'Religion', 'Mother Tongue', 'Status'
      ];

      const csvContent = [
        headers.join(','),
        ...filteredStudents.map(student => [
          student.admissionNumber,
          student.admissionDate,
          `"${student.studentName}"`,
          student.studentAadhar,
          `"${student.fatherName}"`,
          student.fatherAadhar,
          `"${student.motherName}"`,
          student.motherAadhar,
          student.studentClass,
          student.section,
          student.medium,
          student.dob,
          `"${student.location}"`,
          student.admissionClass,
          student.mobileNumber,
          student.penNumber,
          student.caste,
          student.subCaste,
          student.religion,
          student.motherTongue,
          student.status
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `students_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      alert('Student data exported successfully!');
    } catch (error) {
      alert('Error exporting student data. Please try again.');
      console.error('Export error:', error);
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const processImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n');
        const headers = lines[0].split(',');

        // Validate headers
        const expectedHeaders = [
          'Admission Number', 'Admission Date', 'Student Name', 'Student Aadhar',
          'Father Name', 'Father Aadhar', 'Mother Name', 'Mother Aadhar',
          'Class', 'Section', 'Medium', 'Date of Birth', 'Location',
          'Admission Class', 'Mobile Number', 'PEN Number', 'Caste',
          'Sub Caste', 'Religion', 'Mother Tongue', 'Status'
        ];

        if (headers.length !== expectedHeaders.length) {
          alert('Invalid CSV format. Please check the file structure.');
          return;
        }

        let successCount = 0;
        let errorCount = 0;
        const importedStudents: { admissionNumber: string, password: string, studentName: string }[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          try {
            const values = line.split(',').map(val => val.replace(/^"|"$/g, ''));

            if (values.length !== expectedHeaders.length) {
              errorCount++;
              continue;
            }

            const studentData = {
              admissionNumber: values[0],
              admissionDate: values[1],
              studentName: values[2],
              studentAadhar: values[3],
              fatherName: values[4],
              fatherAadhar: values[5],
              motherName: values[6],
              motherAadhar: values[7],
              studentClass: values[8],
              section: values[9],
              medium: values[10],
              dob: values[11],
              location: values[12],
              admissionClass: values[13],
              mobileNumber: values[14],
              penNumber: values[15],
              caste: values[16],
              subCaste: values[17],
              religion: values[18],
              motherTongue: values[19],
              status: 'active' as const,
              password: generateStudentPassword() // Ensure password is generated
            };

            // Basic validation
            if (!studentData.studentName || !studentData.admissionNumber || !studentData.studentClass) {
              errorCount++;
              continue;
            }

            addStudent(studentData);
            importedStudents.push({
              admissionNumber: studentData.admissionNumber,
              password: studentData.password,
              studentName: studentData.studentName
            });
            successCount++;
          } catch (error) {
            errorCount++;
          }
        }

        if (successCount > 0) {
          setCredentialsModal({
            isOpen: true,
            credentials: importedStudents,
            title: 'Import Completed - Login Credentials',
            successCount,
            errorCount
          });
        } else {
          alert(`Import completed!\nSuccessfully imported: ${successCount} students\nErrors: ${errorCount} records`);
        }
      } catch (error) {
        alert('Error processing file. Please check the file format.');
        console.error('Import error:', error);
      }
    };

    reader.readAsText(file);
    // Reset file input
    event.target.value = '';
  };

  const regeneratePasswordsForImportedStudents = () => {
    if (window.confirm('This will regenerate passwords for all students who don\'t have a password set. Continue?')) {
      let updatedCount = 0;
      const updatedPasswords: { admissionNumber: string, password: string, studentName: string }[] = [];

      students.forEach(student => {
        if (!student.password || student.password.length < 6) {
          const newPassword = generateStudentPassword();
          updateStudent(student.id, { password: newPassword });
          updatedPasswords.push({
            admissionNumber: student.admissionNumber,
            password: newPassword,
            studentName: student.studentName
          });
          updatedCount++;
        }
      });

      if (updatedCount > 0) {
        setCredentialsModal({
          isOpen: true,
          credentials: updatedPasswords,
          title: 'Password Regeneration - Login Credentials',
          successCount: updatedCount,
          errorCount: 0
        });
      } else {
        alert('All students already have valid passwords.');
      }
    }
  };

  const closeCredentialsModal = () => {
    setCredentialsModal(prev => ({ ...prev, isOpen: false }));
  };

  if (showForm) {
    return <StudentForm onClose={handleCloseForm} student={editingStudent} />;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Student Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage student records and information</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Student</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search by name or admission number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center space-x-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All Status</option>
            </select>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>

            <button
              onClick={exportStudents}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>

            <button
              onClick={handleImport}
              className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Import</span>
            </button>

            <button
              onClick={regeneratePasswordsForImportedStudents}
              className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-3 rounded-lg hover:bg-orange-700 transition-colors"
              title="Fix passwords for imported students"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Fix Passwords</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={processImportFile}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      </div>

      {/* Stats - only active counted in total */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Total Students</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                {students.filter(s => (s.status || 'active') === 'active').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
              <Search className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 dark:text-green-400 text-sm font-medium">Active Students</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                {students.filter(s => (s.status || 'active') === 'active').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-600 dark:bg-green-500 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">Classes</p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-300">
                {new Set(students.filter(s => (s.status || 'active') === 'active').map(s => s.studentClass)).size}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-600 dark:bg-yellow-500 rounded-lg flex items-center justify-center">
              <Filter className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">Search Results</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">{filteredStudents.length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-600 dark:bg-purple-500 rounded-lg flex items-center justify-center">
              <Search className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Student List */}
      <StudentList
        students={filteredStudents}
        onViewProfile={handleViewProfile}
        onEditStudent={handleEditStudent}
        onDeactivateStudent={handleDeactivateStudent}
        onActivateStudent={handleActivateStudent}
      />

      {/* Credentials Modal */}
      <CredentialsModal
        isOpen={credentialsModal.isOpen}
        onClose={closeCredentialsModal}
        credentials={credentialsModal.credentials}
        title={credentialsModal.title}
        successCount={credentialsModal.successCount}
        errorCount={credentialsModal.errorCount}
      />
    </div>
  );
}