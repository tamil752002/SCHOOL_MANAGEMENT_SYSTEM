import { BookOpen, Plus, Save, Trash2, X } from 'lucide-react';
import React, { useState } from 'react';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { ExamScheduleEntry, Exam } from '../../types';
import { sortClasses } from '../../utils/sortClasses';
import { parseDateOnly, toDateOnly } from '../../utils/dateHelpers';

interface ExamFormProps {
  onClose?: () => void;
  initialData?: Exam | null;
  /** When provided, form submits via this callback instead of context addExam/updateExam (e.g. for API persist). */
  onSave?: (exams: (Omit<Exam, 'id'> & { id?: string })[]) => void;
}

/** Build schedule entries from date range and subjects (for edit when schedule not persisted). */
function buildScheduleFromDates(
  startDate: string,
  endDate: string,
  subjects: string[]
): ExamScheduleEntry[] {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!start || !end) return [];
  const dates: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    if (current.getDay() !== 0) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
    }
    current.setDate(current.getDate() + 1);
  }
  return dates.map((date, i) => ({
    id: `schedule_${i}_${date}_${Math.random().toString(36).substr(2, 9)}`,
    date,
    subject: subjects[i % subjects.length] || '',
    timeSlot: 'morning' as const,
    maxMarks: 100
  }));
}

export function ExamForm({ onClose, initialData, onSave }: ExamFormProps) {
  const { addExam, updateExam, classes, settings } = useSchoolData();
  const [isLoading, setIsLoading] = useState(false);

  const initialSchedule =
    initialData?.schedule?.length
      ? initialData.schedule
      : initialData?.startDate && initialData?.endDate
        ? buildScheduleFromDates(
            toDateOnly(initialData.startDate),
            toDateOnly(initialData.endDate),
            initialData.subjects || []
          )
        : [];

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    type: (initialData?.type as any) || 'FA1',
    selectedClasses: initialData?.className ? [initialData.className] : [] as string[],
    academicYear: initialData?.academicYear || settings.currentAcademicYear,
    status: initialData?.status || 'scheduled' as const,
    startDate: toDateOnly(initialData?.startDate) || '',
    endDate: toDateOnly(initialData?.endDate) || '',
    twoExamsPerDay: false,
    singleExamTimeSlot: 'morning' as 'morning' | 'afternoon'
  });

  const [scheduleEntries, setScheduleEntries] = useState<ExamScheduleEntry[]>(initialSchedule);

  const examTypes = ['FA1', 'FA2', 'SA1', 'FA3', 'FA4', 'SA2', 'Annual', 'Weekend Exam', 'General Test'];
  
  // Get subjects from settings, with default fallback
  const defaultSubjects = [
    'Telugu', 'Hindi', 'English', 'Maths', 'Science', 'Biology', 'Physics',
    'Social Studies', 'General Knowledge', 'Computers'
  ];
  
  // Use custom subjects from settings if available, otherwise use defaults
  const availableSubjects = settings.subjects && settings.subjects.length > 0 
    ? settings.subjects 
    : defaultSubjects;

  const generateId = () => {
    return `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Helper function to get dates between start and end, skipping Sundays (local calendar)
  const getDatesBetween = (startDate: string, endDate: string): string[] => {
    const dates: string[] = [];
    const start = parseDateOnly(startDate);
    const end = parseDateOnly(endDate);
    if (!start || !end) return [];
    const current = new Date(start);
    while (current <= end) {
      if (current.getDay() !== 0) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, '0');
        const d = String(current.getDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${d}`);
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const scheduleExams = () => {
    // Auto-generate entries from start to end
    if (!formData.startDate || !formData.endDate) {
      alert('Please set exam start date and end date first');
      return;
    }
    
    const dates = getDatesBetween(formData.startDate, formData.endDate);
    const newEntries: ExamScheduleEntry[] = [];
    
    if (formData.twoExamsPerDay) {
      // 2 exams per day: add both morning and afternoon for each day
      dates.forEach(date => {
        // Add morning exam
        newEntries.push({
          id: generateId(),
          date: date,
          subject: '',
          timeSlot: 'morning',
          maxMarks: 100
        });
        // Add afternoon exam
        newEntries.push({
          id: generateId(),
          date: date,
          subject: '',
          timeSlot: 'afternoon',
          maxMarks: 100
        });
      });
    } else {
      // Single exam per day: add one entry per day with selected time slot
      dates.forEach(date => {
        newEntries.push({
          id: generateId(),
          date: date,
          subject: '',
          timeSlot: formData.singleExamTimeSlot,
          maxMarks: 100
        });
      });
    }
    
    // Replace schedule with generated entries so multiple taps don't create duplicates
    setScheduleEntries(newEntries);
  };

  const addScheduleEntry = () => {
    // Add a single blank entry at the end
    const newEntry: ExamScheduleEntry = {
      id: generateId(),
      date: '',
      subject: '',
      timeSlot: 'morning',
      maxMarks: 100
    };
    setScheduleEntries([...scheduleEntries, newEntry]);
  };

  const removeScheduleEntry = (id: string) => {
    setScheduleEntries(scheduleEntries.filter(entry => entry.id !== id));
  };

  const updateScheduleEntry = (id: string, field: keyof ExamScheduleEntry, value: any) => {
    // If updating date, validate it's within range
    if (field === 'date' && value && formData.startDate && formData.endDate) {
      const selectedDate = parseDateOnly(value);
      const startDate = parseDateOnly(formData.startDate);
      const endDate = parseDateOnly(formData.endDate);
      if (!selectedDate || !startDate || !endDate) {
        setScheduleEntries(scheduleEntries.map(entry => entry.id === id ? { ...entry, [field]: value } : entry));
        return;
      }
      // Check if date is outside range
      if (selectedDate < startDate || selectedDate > endDate) {
        const shouldUpdateRange = window.confirm(
          `The selected date (${value}) is outside the exam date range (${formData.startDate} to ${formData.endDate}).\n\n` +
          `Click OK to update the date range to include this date.\n` +
          `Click Cancel to remove this entry.`
        );
        
        if (shouldUpdateRange) {
          // Update the range to include the new date
          const newStartDate = selectedDate < startDate ? value : formData.startDate;
          const newEndDate = selectedDate > endDate ? value : formData.endDate;
          
          setFormData(prev => ({
            ...prev,
            startDate: newStartDate,
            endDate: newEndDate
          }));
          
          // Update the entry with the new date
          setScheduleEntries(scheduleEntries.map(entry => 
            entry.id === id ? { ...entry, [field]: value } : entry
          ));
        } else {
          // Cancel - remove the entry
          removeScheduleEntry(id);
        }
        return;
      }
    }
    
    setScheduleEntries(scheduleEntries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.selectedClasses.length === 0) {
      alert('Please select at least one class');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      alert('Please provide exam start date and end date');
      return;
    }
    if (scheduleEntries.length === 0) {
      alert('Please add at least one exam schedule entry');
      return;
    }

    // Validate all entries have required fields
    const invalidEntries = scheduleEntries.filter(entry => !entry.date || !entry.subject);
    if (invalidEntries.length > 0) {
      alert('Please fill in all required fields for all schedule entries');
      return;
    }

    // Use form dates if provided, otherwise calculate from schedule
    const dates = scheduleEntries.map(e => e.date).filter(Boolean).sort();
    const startDate = formData.startDate || dates[0] || '';
    const endDate = formData.endDate || dates[dates.length - 1] || '';

    // Get unique subjects from schedule
    const subjects = [...new Set(scheduleEntries.map(e => e.subject).filter(Boolean))];

    setIsLoading(true);

    const payload = {
      name: formData.name,
      type: formData.type,
      subjects,
      startDate,
      endDate,
      schedule: scheduleEntries,
      academicYear: formData.academicYear,
      status: formData.status
    };

    try {
      if (onSave) {
        if (initialData?.id) {
          onSave([{ ...payload, id: initialData.id, className: formData.selectedClasses[0] }]);
        } else {
          onSave(formData.selectedClasses.map((className) => ({ ...payload, className } as Omit<Exam, 'id'>)));
        }
        if (onClose) onClose();
      } else if (initialData) {
        await updateExam(initialData.id, {
          ...payload,
          className: formData.selectedClasses[0]
        });
      } else {
        for (const className of formData.selectedClasses) {
          addExam({ ...payload, className });
        }
        if (onClose) onClose();
      }
      // Reset form
      setFormData({
        name: '',
        type: 'FA1',
        selectedClasses: [],
        academicYear: settings.currentAcademicYear,
        status: 'scheduled',
        startDate: '',
        endDate: '',
        twoExamsPerDay: false,
        singleExamTimeSlot: 'morning'
      });
      setScheduleEntries([]);
    } catch (error) {
      alert('Error creating exam');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleClass = (className: string) => {
    setFormData(prev => ({
      ...prev,
      selectedClasses: prev.selectedClasses.includes(className)
        ? prev.selectedClasses.filter(c => c !== className)
        : [...prev.selectedClasses, className]
    }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {initialData ? 'Edit Exam' : 'Create New Exam'}
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Exam Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              placeholder="e.g., First Formative Assessment"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Exam Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              required
            >
              {examTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            {initialData ? (
              <>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Class
                </label>
                <div className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/50 text-gray-900 dark:text-white font-medium">
                  Class {formData.selectedClasses[0] || initialData.className}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Class cannot be changed when editing. This exam is for this class only.
                </p>
              </>
            ) : (
              <>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Classes * (Choose multiple)
                </label>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {sortClasses(classes).map(cls => (
                      <label
                        key={cls.name}
                        className={`flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          formData.selectedClasses.includes(cls.name)
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 dark:text-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.selectedClasses.includes(cls.name)}
                          onChange={() => toggleClass(cls.name)}
                          className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700"
                        />
                        <span className="font-medium">Class {cls.name}</span>
                      </label>
                    ))}
                  </div>
                  {formData.selectedClasses.length > 0 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                      Selected: {formData.selectedClasses.length} class{formData.selectedClasses.length !== 1 ? 'es' : ''}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Academic Year
            </label>
            <input
              type="text"
              value={formData.academicYear}
              onChange={(e) => handleChange('academicYear', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Exam Start Date *
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Exam End Date *
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => handleChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              required
            />
          </div>
        </div>

        {/* Exam Schedule Options */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 space-y-4">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.twoExamsPerDay}
              onChange={(e) => handleChange('twoExamsPerDay', e.target.checked)}
              className="w-5 h-5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700"
            />
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                2 Exams Per Day
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                When enabled, each day will have 2 exams (morning and afternoon). When disabled, each day will have 1 exam.
              </p>
            </div>
          </label>

          {!formData.twoExamsPerDay && (
            <div className="ml-8 pt-2 border-t border-gray-200 dark:border-gray-600">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time Slot for Single Exam Per Day
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="singleExamTimeSlot"
                    value="morning"
                    checked={formData.singleExamTimeSlot === 'morning'}
                    onChange={(e) => handleChange('singleExamTimeSlot', e.target.value as 'morning' | 'afternoon')}
                    className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:bg-gray-700"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Morning</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="singleExamTimeSlot"
                    value="afternoon"
                    checked={formData.singleExamTimeSlot === 'afternoon'}
                    onChange={(e) => handleChange('singleExamTimeSlot', e.target.value as 'morning' | 'afternoon')}
                    className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:bg-gray-700"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Afternoon</span>
                </label>
              </div>
            </div>
          )}

          <div className="ml-8 pt-2 border-t border-gray-200 dark:border-gray-600">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Click "Schedule Exams" to auto-generate schedule entries for all days from start to end date (excluding Sundays).
              Use "Add Entry" to manually add a single blank entry.
            </p>
          </div>
        </div>

        {/* Exam Schedule Entries */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
              <BookOpen className="w-5 h-5" />
              <span>Exam Schedule *</span>
            </h3>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={scheduleExams}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule Exams</span>
              </button>
              <button
                type="button"
                onClick={addScheduleEntry}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Entry</span>
              </button>
            </div>
          </div>

          {scheduleEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No schedule entries added yet. Click "Add Entry" to start.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {scheduleEntries.map((entry, index) => {
                // Get subjects already selected in other entries
                const selectedSubjects = scheduleEntries
                  .filter(e => e.id !== entry.id && e.subject && e.subject !== '__other__')
                  .map(e => e.subject);
                
                // Filter available subjects - exclude already selected ones, but keep the current entry's subject
                const availableSubjectsForEntry = availableSubjects.filter(
                  subject => !selectedSubjects.includes(subject) || entry.subject === subject
                );

                return (
                <div key={entry.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 dark:text-white">Entry {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeScheduleEntry(entry.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={entry.date}
                        onChange={(e) => updateScheduleEntry(entry.id, 'date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Subject *
                      </label>
                      <select
                        value={entry.subject}
                        onChange={(e) => updateScheduleEntry(entry.id, 'subject', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        required
                      >
                        <option value="">Select Subject</option>
                        {availableSubjectsForEntry.map(subject => (
                          <option key={subject} value={subject}>{subject}</option>
                        ))}
                        <option value="__other__">Other (Custom)</option>
                      </select>
                    </div>
                    {entry.subject === '__other__' && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Custom Subject Name *
                        </label>
                        <input
                          type="text"
                          placeholder="Enter subject name"
                          onChange={(e) => updateScheduleEntry(entry.id, 'subject', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Time Slot *
                      </label>
                      <select
                        value={entry.timeSlot}
                        onChange={(e) => updateScheduleEntry(entry.id, 'timeSlot', e.target.value as 'morning' | 'afternoon')}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        required
                      >
                        <option value="morning">Morning</option>
                        <option value="afternoon">Afternoon</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Max Marks
                      </label>
                      <input
                        type="number"
                        value={entry.maxMarks || ''}
                        onChange={(e) => updateScheduleEntry(entry.id, 'maxMarks', parseInt(e.target.value) || 100)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        min="0"
                        placeholder="100"
                      />
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}

          <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
            Total entries: {scheduleEntries.length}
          </p>
        </div>

        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || scheduleEntries.length === 0}
            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isLoading ? 'Creating...' : 'Create Exam'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
