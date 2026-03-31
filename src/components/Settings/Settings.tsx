import { Bell, Database, Download, FileText, School, Shield, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ChangePasswordForm } from './ChangePasswordForm';
import { ConductCertificateSettings } from './ConductCertificateSettings';

const getApiBase = () => (import.meta.env.DEV ? window.location.origin : 'http://0.0.0.0:8000');

export function Settings() {
  const { settings, updateSettings, resetAllData, exportAllData, importAllData, subjects: subjectsFromApi, refreshSubjects } = useSchoolData();
  const { user, schools } = useAuth(); // Add schools to get admin's school data
  const { isDarkMode, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState(settings);
  const [isLoading, setIsLoading] = useState(false);
  const [schoolData, setSchoolData] = useState<any>(null);
  const [newSubject, setNewSubject] = useState('');
  const [subjectSaving, setSubjectSaving] = useState(false);

  // Find the current admin's school if user is an admin (normalize IDs for comparison - DB may return UUID as string)
  useEffect(() => {
    if (user?.role === 'admin' && user.schoolId) {
      const match = schools.find(s => String(s.id) === String(user.schoolId));
      setSchoolData(match ?? null);
    } else {
      setSchoolData(null);
    }
  }, [user, schools]);

  // Sync formData with settings from context whenever settings change or school data changes
  useEffect(() => {
    // Check if we are already editing and have unsaved changes to subjects
    // This prevents the refresh from wiping out the newly added subject before save
    const hasUnsavedSubjects = formData.subjects?.length !== settings.subjects?.length;
    
    // Always start with the base settings
    let updatedFormData = { 
      ...settings,
      subjects: hasUnsavedSubjects ? (formData.subjects || []) : (settings.subjects || []),
      schoolSealImage: settings.schoolSealImage || '',
      principalSignatureImage: settings.principalSignatureImage || ''
    };

    // Merge school data with settings when available
    if (schoolData && user?.role === 'admin') {
      console.log('Updating form data with school information:', schoolData);

      // Update form data with school information
      updatedFormData = {
        ...updatedFormData,
        schoolName: schoolData.name || updatedFormData.schoolName,
        schoolAddress: schoolData.address || updatedFormData.schoolAddress,
        schoolPhone: schoolData.contactNumber || updatedFormData.schoolPhone,
        schoolEmail: schoolData.email || updatedFormData.schoolEmail,
        admissionNumberPrefix: schoolData.studentUserIdPrefix || updatedFormData.admissionNumberPrefix
      };
    }

    // Set the updated form data
    setFormData(updatedFormData);
  }, [settings, schoolData, user]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Create a copy of formData and explicitly include subjects and images
      const settingsToSave = {
        ...formData,
        subjects: formData.subjects || [],
        schoolSealImage: formData.schoolSealImage,
        principalSignatureImage: formData.principalSignatureImage
      };
      
      await updateSettings(settingsToSave);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (field: 'schoolSealImage' | 'principalSignatureImage', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      handleChange(field, base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addSubject = async () => {
    if (!newSubject.trim()) return;
    const schoolId = (user as { schoolId?: string })?.schoolId;
    setSubjectSaving(true);
    try {
      const res = await fetch(`${getApiBase()}/api/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: schoolId || null, name: newSubject.trim() })
      });
      if (!res.ok) throw new Error(await res.text());
      await refreshSubjects();
      setNewSubject('');
    } catch (e) {
      console.error(e);
      alert('Failed to add subject');
    } finally {
      setSubjectSaving(false);
    }
  };

  const removeSubject = async (id: string, isDefault?: boolean) => {
    if (isDefault) return;
    setSubjectSaving(true);
    try {
      const res = await fetch(`${getApiBase()}/api/subjects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      await refreshSubjects();
    } catch (e) {
      console.error(e);
      alert('Failed to delete subject');
    } finally {
      setSubjectSaving(false);
    }
  };

  const exportData = () => {
    try {
      const dataToExport = exportAllData();
      const blob = new Blob([dataToExport], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `school_complete_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      alert('Data exported successfully!');
    } catch (error) {
      alert('Error exporting data');
    }
  };

  const handleImportData = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const success = await importAllData(text);
        if (success) {
          alert('Data imported successfully!');
          // formData will be automatically updated via useEffect when settings context updates
        } else {
          alert('Error importing data. Please check the file format.');
        }
      } catch (error) {
        alert('Error reading file');
      }
    };
    input.click();
  };

  const handleResetData = () => {
    const confirmed = window.confirm(
      'Are you sure you want to reset data for this school? This will permanently delete:\n\n' +
      '• All student records for this school\n' +
      '• All attendance data for this school\n' +
      '• All fee records for this school\n' +
      '• All exam data for this school\n' +
      '• All activities for this school\n' +
      '• All settings for this school\n\n' +
      'This action cannot be undone!'
    );

    if (confirmed) {
      const doubleConfirmed = window.confirm(
        'FINAL WARNING: This will delete all data for this school. Are you absolutely sure?'
      );

      if (doubleConfirmed) {
        try {
          resetAllData();
          alert('All data for this school has been reset successfully!');
          // formData will be automatically updated via useEffect when settings context resets
        } catch (error) {
          alert('Error resetting data');
        }
      }
    }
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      {/* School Information section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">School Information</h3>
        <p className="text-sm text-amber-600 dark:text-amber-400 mb-4 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md">
          These school details can only be modified by system developers. Please contact the developer team for any changes.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              School Name *
            </label>
            <input
              type="text"
              value={schoolData?.name ?? formData.schoolName ?? ''}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg"
              disabled
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              School Phone *
            </label>
            <input
              type="tel"
              value={schoolData?.contactNumber ?? formData.schoolPhone ?? ''}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg"
              disabled
              readOnly
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              School Address *
            </label>
            <textarea
              value={schoolData?.address ?? formData.schoolAddress ?? ''}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg"
              rows={3}
              disabled
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              School Email *
            </label>
            <input
              type="email"
              value={schoolData?.email ?? formData.schoolEmail ?? ''}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg"
              disabled
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Academic Year *
            </label>
            <input
              type="text"
              value={formData.currentAcademicYear}
              onChange={(e) => handleChange('currentAcademicYear', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="2024-25"
              required
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Admission Number Configuration</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Admission Number Prefix *
            </label>
            <input
              type="text"
              value={formData.admissionNumberPrefix}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg"
              placeholder="SUV"
              disabled
              readOnly
            />
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              This prefix can only be set by developers when creating the school and cannot be changed.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Number Length *
            </label>
            <input
              type="number"
              value={formData.admissionNumberLength}
              onChange={(e) => handleChange('admissionNumberLength', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="3"
              max="6"
              required
            />
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Preview:</strong> {formData.admissionNumberPrefix}{'0'.repeat(formData.admissionNumberLength - 1)}1
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            Example admission numbers will follow this format
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Appearance</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Dark Mode</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Toggle between light and dark themes</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={isDarkMode}
                onChange={toggleTheme}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Image Uploads Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">School Branding</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              School Seal (Image)
            </label>
            <div className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              {formData.schoolSealImage ? (
                <div className="relative mb-4">
                  <img src={formData.schoolSealImage} alt="School Seal" className="h-32 w-32 object-contain" />
                  <button 
                    onClick={() => handleChange('schoolSealImage', '')}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-500">No seal uploaded</p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload('schoolSealImage', e)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Principal Signature (Image)
            </label>
            <div className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              {formData.principalSignatureImage ? (
                <div className="relative mb-4">
                  <img src={formData.principalSignatureImage} alt="Principal Signature" className="h-16 w-48 object-contain" />
                  <button 
                    onClick={() => handleChange('principalSignatureImage', '')}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-500">No signature uploaded</p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload('principalSignatureImage', e)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            Save Images
          </button>
        </div>
      </div>
    </div>
  );

  const renderAcademicSettings = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Academic Configuration</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Minimum Attendance Threshold (%) *
            </label>
            <input
              type="number"
              value={formData.attendanceThreshold}
              onChange={(e) => handleChange('attendanceThreshold', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              max="100"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Students below this threshold will be flagged
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fee Reminder Days *
            </label>
            <input
              type="number"
              value={formData.feeReminderDays}
              onChange={(e) => handleChange('feeReminderDays', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="1"
              max="30"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Send fee reminders this many days before due date
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Academic Settings'
            )}
          </button>
        </div>
      </div>

      {/* Subject Management (uses /api/subjects) */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Subject Management</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Add custom subjects for exams. Default subjects (Telugu, Hindi, English, etc.) are always available; only custom subjects can be removed.
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSubject())}
            placeholder="Enter subject name"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
          <button
            type="button"
            onClick={addSubject}
            disabled={subjectSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {subjectSaving ? 'Adding...' : 'Add Subject'}
          </button>
        </div>

        {(subjectsFromApi && subjectsFromApi.length > 0) ? (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subjects:</h4>
            <div className="flex flex-wrap gap-2">
              {subjectsFromApi.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-300 px-3 py-1 rounded-lg"
                >
                  <span className="text-sm font-medium">{sub.name}</span>
                  {sub.isDefault ? (
                    <span className="text-xs text-gray-500 dark:text-gray-400">(default)</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeSubject(sub.id, sub.isDefault)}
                      disabled={subjectSaving}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">No subjects loaded. Add one above or ensure school is selected.</p>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Subjects'
            )}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Grading System</h3>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-700 dark:text-gray-300">
            <div>Grade</div>
            <div>Percentage Range</div>
            <div>Description</div>
          </div>

          {[
            { grade: 'A+', range: '90-100%', desc: 'Outstanding' },
            { grade: 'A', range: '80-89%', desc: 'Excellent' },
            { grade: 'B+', range: '70-79%', desc: 'Very Good' },
            { grade: 'B', range: '60-69%', desc: 'Good' },
            { grade: 'C', range: '50-59%', desc: 'Average' },
            { grade: 'D', range: '35-49%', desc: 'Below Average' },
            { grade: 'F', range: '0-34%', desc: 'Fail' }
          ].map((item, index) => (
            <div key={index} className="grid grid-cols-3 gap-4 py-2 border-b border-gray-100 dark:border-gray-700 text-sm">
              <div className="font-medium text-gray-900 dark:text-white">{item.grade}</div>
              <div className="text-gray-600 dark:text-gray-400">{item.range}</div>
              <div className="text-gray-600 dark:text-gray-400">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Notification Preferences</h3>

        <div className="space-y-4">
          {[
            { id: 'attendance', label: 'Attendance Alerts', desc: 'Notify when student attendance falls below threshold' },
            { id: 'fees', label: 'Fee Reminders', desc: 'Send automatic fee payment reminders' },
            { id: 'exams', label: 'Exam Notifications', desc: 'Notify about upcoming exams and results' },
            { id: 'admissions', label: 'New Admissions', desc: 'Alert when new students are admitted' },
            { id: 'reports', label: 'Report Generation', desc: 'Notify when reports are ready for download' }
          ].map((notification) => (
            <div key={notification.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">{notification.label}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{notification.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      {/* Change Password Form */}
      {user && (
        <ChangePasswordForm
          userId={user.id}
          userType={user.role === 'admin' ? 'admin' : 'student'}
          onPasswordChanged={() => {
            // Show success message or other actions after password change
          }}
        />
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Security Configuration</h3>

        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Password Policy</h4>
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" defaultChecked />
                <span className="text-sm text-gray-700 dark:text-gray-300">Require minimum 8 characters</span>
              </label>
              <label className="flex items-center space-x-3">
                <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" defaultChecked />
                <span className="text-sm text-gray-700 dark:text-gray-300">Require uppercase and lowercase letters</span>
              </label>
              <label className="flex items-center space-x-3">
                <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Require special characters</span>
              </label>
              <label className="flex items-center space-x-3">
                <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Force password change every 90 days</span>
              </label>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Session Management</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Session Timeout (minutes)
                </label>
                <input
                  type="number"
                  defaultValue="30"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="5"
                  max="480"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max Login Attempts
                </label>
                <input
                  type="number"
                  defaultValue="5"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="3"
                  max="10"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBackupSettings = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Backup Configuration</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Backup Frequency *
            </label>
            <select
              value={formData.backupFrequency}
              onChange={(e) => handleChange('backupFrequency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Retention Period
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              defaultValue="30"
            >
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
            </select>
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <h4 className="font-medium text-yellow-900 dark:text-yellow-300 mb-2">Important Notes:</h4>
          <ul className="text-sm text-yellow-800 dark:text-yellow-400 space-y-1">
            <li>• Backups are stored locally in your browser</li>
            <li>• Export data regularly for external backup</li>
            <li>• Clear browser data will remove all backups</li>
          </ul>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Data Management</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Export All Data</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Download complete backup of all students, fees, exams, attendance & settings</p>
            </div>
            <button
              onClick={exportData}
              className="flex items-center space-x-2 bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Import Data</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Restore all data from exported backup file</p>
            </div>
            <button
              onClick={handleImportData}
              className="flex items-center space-x-2 bg-green-600 dark:bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
            >
              <Download className="w-4 h-4 rotate-180" />
              <span>Import</span>
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border border-red-200 dark:border-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div>
              <h4 className="font-medium text-red-900 dark:text-red-300">Reset School Data</h4>
              <p className="text-sm text-red-600 dark:text-red-400">Permanently delete all data for this school only</p>
            </div>
            <button
              onClick={handleResetData}
              className="bg-red-600 dark:bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabs = () => (
    <div className="flex flex-wrap mb-6 gap-2">
      <button
        onClick={() => setActiveTab('general')}
        className={`px-4 py-2 rounded-md ${activeTab === 'general'
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
          }`}
      >
        <School className="w-4 h-4 inline mr-1" /> General
      </button>
      <button
        onClick={() => setActiveTab('academic')}
        className={`px-4 py-2 rounded-md ${activeTab === 'academic'
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
          }`}
      >
        <User className="w-4 h-4 inline mr-1" /> Academic
      </button>
      <button
        onClick={() => setActiveTab('certificates')}
        className={`px-4 py-2 rounded-md ${activeTab === 'certificates'
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
          }`}
      >
        <FileText className="w-4 h-4 inline mr-1" /> Certificates
      </button>
      <button
        onClick={() => setActiveTab('notifications')}
        className={`px-4 py-2 rounded-md ${activeTab === 'notifications'
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
          }`}
      >
        <Bell className="w-4 h-4 inline mr-1" /> Notifications
      </button>
      <button
        onClick={() => setActiveTab('security')}
        className={`px-4 py-2 rounded-md ${activeTab === 'security'
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
          }`}
      >
        <Shield className="w-4 h-4 inline mr-1" /> Security
      </button>
      <button
        onClick={() => setActiveTab('backup')}
        className={`px-4 py-2 rounded-md ${activeTab === 'backup'
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
          }`}
      >
        <Database className="w-4 h-4 inline mr-1" /> Backup & Restore
      </button>
    </div>
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-8">Settings</h1>

      {renderTabs()}

      {activeTab === 'general' && renderGeneralSettings()}
      {activeTab === 'academic' && renderAcademicSettings()}
      {activeTab === 'certificates' && <ConductCertificateSettings />}
      {activeTab === 'notifications' && renderNotificationSettings()}
      {activeTab === 'security' && renderSecuritySettings()}
      {activeTab === 'backup' && renderBackupSettings()}
    </div>
  );
}
