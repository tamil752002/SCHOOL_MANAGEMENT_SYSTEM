import { BookOpen, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSchoolData } from '../../contexts/SchoolDataContext';

export interface MarksEntryProps {
  /** When set (e.g. for teacher), only these class names are shown in the class dropdown */
  allowedClassNames?: string[];
  /** When set (e.g. for teacher), only these subject names are shown in the subject dropdown */
  allowedSubjectNames?: string[];
}

export function MarksEntry({ allowedClassNames, allowedSubjectNames }: MarksEntryProps = {}) {
  const { exams, addExamRecord, updateExamRecord, getStudentsByClass, classes, examRecords } = useSchoolData();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  type MarksDataEntry = { obtainedMarks: number; maxMarks: number; recordId?: string };
  const [marksData, setMarksData] = useState<Record<string, MarksDataEntry>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [globalMaxMarks, setGlobalMaxMarks] = useState<number>(0);

  // Restrict classes/subjects when acting as teacher
  const effectiveClasses = allowedClassNames?.length
    ? classes.filter(c => allowedClassNames.includes(c.name))
    : classes;
  const selectedExamData = exams.find(exam => exam.id === selectedExam);
  const effectiveSubjectOptions = (selectedExamData?.subjects ?? []).filter(
    s => !allowedSubjectNames?.length || allowedSubjectNames.includes(s)
  );

  // Filter exams by selected class
  const filteredExams = selectedClass 
    ? exams.filter(exam => exam.className === selectedClass)
    : [];

  const classStudents = selectedExamData ? getStudentsByClass(selectedExamData.className) : [];

  // Max marks from exam schedule for selected subject (for pre-fill and display)
  const scheduleMaxMarks = selectedExamData && selectedSubject
    ? (selectedExamData.schedule?.find((e) => e.subject === selectedSubject)?.maxMarks ?? 100)
    : 100;

  // Load existing marks when exam and subject are selected (only when subject changes)
  useEffect(() => {
    if (selectedExam && selectedSubject && selectedExamData && classStudents.length > 0) {
      const existingMarks: Record<string, MarksDataEntry> = {};
      const maxFromSchedule = selectedExamData.schedule?.find((e) => e.subject === selectedSubject)?.maxMarks ?? 100;

      classStudents.forEach(student => {
        // Find existing exam record for this student, this specific exam (by id only), and subject
        const existingRecord = examRecords.find(record =>
          record.studentId === student.id &&
          record.subject === selectedSubject &&
          record.examId === selectedExam
        );

        if (existingRecord) {
          // Load existing marks from database (keep stored maxMarks, or fall back to schedule)
          const marksEntry: MarksDataEntry = {
            obtainedMarks: existingRecord.obtainedMarks,
            maxMarks: existingRecord.maxMarks ?? maxFromSchedule,
            recordId: existingRecord.id
          };
          existingMarks[student.id] = marksEntry;
        } else {
          // Initialize with schedule max marks when no record exists
          existingMarks[student.id] = {
            obtainedMarks: 0,
            maxMarks: maxFromSchedule
          };
        }
      });

      setMarksData(existingMarks);
      setGlobalMaxMarks(maxFromSchedule);
    } else if (!selectedExam || !selectedSubject) {
      setMarksData({});
      setGlobalMaxMarks(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExam, selectedSubject]);

  // Helper function to get dates between start and end, skipping Sundays
  const getDatesBetween = (startDate: string, endDate: string): string[] => {
    if (!startDate || !endDate) return [];
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      // Skip Sundays (day 0)
      if (dayOfWeek !== 0) {
        dates.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  // Get the date for the selected subject from exam schedule
  const getDateForSubject = (): string => {
    if (!selectedExamData || !selectedSubject) {
      return new Date().toISOString().split('T')[0];
    }

    // First, try to find the date from the schedule entry for this subject
    if (selectedExamData.schedule && selectedExamData.schedule.length > 0) {
      const subjectEntry = selectedExamData.schedule.find(
        entry => entry.subject === selectedSubject
      );
      if (subjectEntry && subjectEntry.date) {
        return subjectEntry.date;
      }
    }

    // If no schedule entry found, use start date from exam
    if (selectedExamData.startDate) {
      // Get all dates from start to end, skipping Sundays
      const dates = getDatesBetween(selectedExamData.startDate, selectedExamData.endDate || selectedExamData.startDate);
      // Return the first date (first day, skipping Sundays)
      return dates.length > 0 ? dates[0] : selectedExamData.startDate;
    }

    // Fallback to today's date
    return new Date().toISOString().split('T')[0];
  };

  const calculateGrade = (obtained: number, max: number): string => {
    const percentage = (obtained / max) * 100;
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 35) return 'D';
    return 'F';
  };

  const handleMarksChange = (studentId: string, field: 'obtainedMarks' | 'maxMarks', value: number) => {
    setMarksData(prev => ({
      ...prev,
      [studentId]: {
        obtainedMarks: prev[studentId]?.obtainedMarks || 0,
        maxMarks: prev[studentId]?.maxMarks || 0,
        recordId: prev[studentId]?.recordId,
        [field]: value
      }
    }));
  };

  const handleSaveMarks = async () => {
    if (!selectedExam || !selectedSubject) {
      alert('Please select exam and subject');
      return;
    }

    setIsLoading(true);

    try {
      for (const [studentId, marks] of Object.entries(marksData)) {
        const effectiveMaxMarks = marks.maxMarks || globalMaxMarks || 100;
        if (marks.obtainedMarks !== undefined && effectiveMaxMarks > 0) {
          const grade = calculateGrade(marks.obtainedMarks, effectiveMaxMarks);

          // Check if record already exists
          if (marks.recordId) {
            // Update existing record
            updateExamRecord(marks.recordId, {
              obtainedMarks: marks.obtainedMarks,
              maxMarks: effectiveMaxMarks,
              grade,
              status: 'scored'
            });
          } else {
            // Check if a record exists for this student, this specific exam (by id), and subject
            const existingRecord = examRecords.find(record =>
              record.studentId === studentId &&
              record.subject === selectedSubject &&
              record.examId === selectedExam
            );

            if (existingRecord) {
              // Update existing record
              updateExamRecord(existingRecord.id, {
                obtainedMarks: marks.obtainedMarks,
                maxMarks: effectiveMaxMarks,
                grade,
                status: 'scored'
              });
            } else {
              // Create new record tied to this specific exam
              addExamRecord({
                studentId,
                examId: selectedExam,
                examType: selectedExamData!.type as 'FA1' | 'FA2' | 'SA1' | 'FA3' | 'FA4' | 'SA2' | 'Annual' | 'Weekend Exam' | 'General Test',
                subject: selectedSubject,
                maxMarks: effectiveMaxMarks,
                obtainedMarks: marks.obtainedMarks,
                grade,
                date: getDateForSubject(),
                academicYear: selectedExamData!.academicYear,
                status: 'scored'
              });
            }
          }
        }
      }

      alert('Marks saved successfully!');
      setMarksData({});
    } catch (error) {
      alert('Error saving marks');
    } finally {
      setIsLoading(false);
    }
  };

  const setMaxMarksForAll = (maxMarks: number) => {
    setGlobalMaxMarks(maxMarks);
    const updatedMarks = { ...marksData };
    classStudents.forEach(student => {
      updatedMarks[student.id] = {
        obtainedMarks: updatedMarks[student.id]?.obtainedMarks || 0,
        maxMarks: maxMarks,
        recordId: updatedMarks[student.id]?.recordId
      };
    });
    setMarksData(updatedMarks);
  };

  return (
    <div className="space-y-6">
      {/* Selection Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Select Class, Exam and Subject</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Class *
            </label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedExam('');
                setSelectedSubject('');
                setMarksData({});
                setGlobalMaxMarks(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="">Choose a class</option>
              {effectiveClasses.map(cls => (
                <option key={cls.name} value={cls.name}>
                  Class {cls.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Exam *
            </label>
            <select
              value={selectedExam}
              onChange={(e) => {
                setSelectedExam(e.target.value);
                setSelectedSubject('');
                setMarksData({});
                setGlobalMaxMarks(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              disabled={!selectedClass}
            >
              <option value="">Choose an exam</option>
              {filteredExams.map(exam => (
                <option key={exam.id} value={exam.id}>
                  {exam.name} ({exam.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Subject *
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              disabled={!selectedExamData}
            >
              <option value="">Choose a subject</option>
              {effectiveSubjectOptions.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
        </div>

                        {selectedExamData && selectedSubject && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-300">
                  {selectedExamData.name} - {selectedSubject}
                </h4>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Class {selectedExamData.className} • {classStudents.length} students
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-blue-900 dark:text-blue-300">Max Marks for All (from schedule: {scheduleMaxMarks}):</label>
                <input
                  type="number"
                  placeholder={String(scheduleMaxMarks)}
                  value={globalMaxMarks || ''}
                  className="w-24 px-3 py-2 border border-blue-300 dark:border-blue-600 rounded text-center dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    if (value > 0) {
                      setMaxMarksForAll(value);
                    } else {
                      setGlobalMaxMarks(0);
                    }
                  }}
                  required
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Marks Entry Table */}
      {selectedExamData && selectedSubject && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Enter Marks</h3>
            <button
              onClick={handleSaveMarks}
              disabled={isLoading || Object.keys(marksData).length === 0}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isLoading ? 'Saving...' : 'Save All Marks'}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Obtained Marks
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Percentage
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Grade
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {classStudents.map((student) => {
                  const studentMarks = marksData[student.id] || { obtainedMarks: 0, maxMarks: 0 };
                  // Use global max marks if student's maxMarks is not set
                  const effectiveMaxMarks = studentMarks.maxMarks || globalMaxMarks || 100;
                  const obtainedMarks = studentMarks.obtainedMarks || 0;
                  
                  // Calculate percentage and grade - show them if maxMarks > 0
                  const hasValidMarks = effectiveMaxMarks > 0;
                  const percentage = hasValidMarks ?
                    ((obtainedMarks / effectiveMaxMarks) * 100).toFixed(1) : '-';
                  const grade = hasValidMarks ?
                    calculateGrade(obtainedMarks, effectiveMaxMarks) : '-';

                  return (
                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{student.studentName}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{student.admissionNumber}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">Section {student.section}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          value={studentMarks.obtainedMarks ?? ''}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const value = inputValue === '' ? 0 : parseInt(inputValue) || 0;
                            handleMarksChange(student.id, 'obtainedMarks', value);
                          }}
                          className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          placeholder="0"
                          min="0"
                          max={effectiveMaxMarks}
                        />
                        {effectiveMaxMarks > 0 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">/ {effectiveMaxMarks}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {percentage !== '-' ? `${percentage}%` : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {grade !== '-' ? (
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${grade === 'A+' || grade === 'A' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                            grade === 'B+' || grade === 'B' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                              grade === 'C' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                grade === 'D' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                                  grade === 'F' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                                    'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                            }`}>
                            {grade}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!selectedClass && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Select a Class</h3>
          <p className="text-gray-500 dark:text-gray-400">Choose a class, exam and subject to start entering marks</p>
        </div>
      )}
    </div>
  );
}