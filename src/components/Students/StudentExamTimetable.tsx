import { ArrowLeft, Calendar, CheckCircle, ChevronRight, Clock } from 'lucide-react';
import { useState } from 'react';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { Exam, ExamScheduleEntry, Student } from '../../types';
import { formatDateOnly, parseDateOnly, todayYMD } from '../../utils/dateHelpers';

interface StudentExamTimetableProps {
  student: Student;
  onBack?: () => void;
}

type TabId = 'exams' | 'completed';

function formatDate(d: string) {
  return formatDateOnly(d, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTimeSlot(slot: 'morning' | 'afternoon') {
  return slot === 'morning' ? 'Morning' : 'Afternoon';
}

/** Get working days between start and end (skip Sundays), as YYYY-MM-DD (local calendar). */
function getWorkingDays(startDate: string, endDate: string): string[] {
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
}

/** Build schedule from exam: use schedule if present, else derive from subjects + date range */
function getScheduleSorted(exam: Exam): ExamScheduleEntry[] {
  if (exam.schedule && exam.schedule.length > 0) {
    return [...exam.schedule].sort((a, b) => {
      const da = parseDateOnly(a.date)?.getTime() ?? 0;
      const db = parseDateOnly(b.date)?.getTime() ?? 0;
      if (da !== db) return da - db;
      return a.timeSlot === 'morning' && b.timeSlot === 'afternoon' ? -1 : a.timeSlot === 'afternoon' && b.timeSlot === 'morning' ? 1 : 0;
    });
  }
  const days = getWorkingDays(exam.startDate, exam.endDate);
  const subjects = (exam.subjects && exam.subjects.length > 0)
    ? exam.subjects
    : [exam.subject].filter(Boolean) as string[];
  const entries: ExamScheduleEntry[] = [];
  if (subjects.length > 0) {
    subjects.forEach((subject, i) => {
      const date = days[i] || days[0];
      entries.push({
        id: `fallback_${i}_${date}`,
        date,
        subject: subject || 'Subject',
        timeSlot: 'morning',
        maxMarks: exam.totalMarks ? Math.round((exam.totalMarks || 0) / subjects.length) : undefined
      });
    });
  } else {
    entries.push({
      id: 'fallback_0',
      date: exam.startDate,
      subject: exam.name || exam.type || 'Exam',
      timeSlot: 'morning'
    });
  }
  return entries.sort((a, b) => {
    const da = parseDateOnly(a.date)?.getTime() ?? 0;
    const db = parseDateOnly(b.date)?.getTime() ?? 0;
    if (da !== db) return da - db;
    return a.timeSlot === 'morning' && b.timeSlot === 'afternoon' ? -1 : a.timeSlot === 'afternoon' && b.timeSlot === 'morning' ? 1 : 0;
  });
}

export function StudentExamTimetable({ student, onBack }: StudentExamTimetableProps) {
  const { exams } = useSchoolData();
  const [activeTab, setActiveTab] = useState<TabId>('exams');
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

  const today = todayYMD();

  const forClass = exams.filter((e) => e.className === student.studentClass);

  const upcomingExams = forClass.filter((e) => {
    return e.endDate >= today && (e.status === 'scheduled' || e.status === 'ongoing');
  });

  const completedExams = forClass.filter((e) => {
    return e.endDate < today || e.status === 'completed';
  });

  const examList = activeTab === 'exams' ? upcomingExams : completedExams;

  if (selectedExam) {
    const sorted = getScheduleSorted(selectedExam);
    const examName = selectedExam.name || selectedExam.type || 'Exam';
    const dateRange = `${formatDate(selectedExam.startDate)} – ${formatDate(selectedExam.endDate)}`;

    return (
      <div className="p-6 max-w-4xl mx-auto">
        {onBack && (
          <button
            type="button"
            onClick={() => setSelectedExam(null)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {activeTab === 'exams' ? 'Exams' : 'Completed'}
          </button>
        )}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{examName}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {dateRange}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Time Slot
                  </th>
                  {sorted.some((e) => e.maxMarks != null) && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Max Marks
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sorted.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{idx + 1}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{row.subject}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{formatDate(row.date)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {formatTimeSlot(row.timeSlot)}
                    </td>
                    {sorted.some((e) => e.maxMarks != null) && (
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{row.maxMarks ?? '–'}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Exam Timetable</h1>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('exams')}
          className={`px-4 py-2 rounded-t-lg font-medium flex items-center gap-2 transition-colors ${
            activeTab === 'exams'
              ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-b-0 border-gray-200 dark:border-gray-700 -mb-px'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Exams
          {upcomingExams.length > 0 && (
            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full">
              {upcomingExams.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-t-lg font-medium flex items-center gap-2 transition-colors ${
            activeTab === 'completed'
              ? 'bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 border border-b-0 border-gray-200 dark:border-gray-700 -mb-px'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Completed
          {completedExams.length > 0 && (
            <span className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full">
              {completedExams.length}
            </span>
          )}
        </button>
      </div>

      <div className="space-y-3">
        {examList.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-500 dark:text-gray-400">
            {activeTab === 'exams' ? (
              <>
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming exams for your class.</p>
              </>
            ) : (
              <>
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No completed exams to show.</p>
              </>
            )}
          </div>
        ) : (
          examList.map((exam) => {
            const name = exam.name || exam.type || 'Exam';
            const dateRange = `${formatDate(exam.startDate)} – ${formatDate(exam.endDate)}`;
            return (
              <button
                type="button"
                key={exam.id}
                onClick={() => setSelectedExam(exam)}
                className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${activeTab === 'exams' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                    {activeTab === 'exams' ? (
                      <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{dateRange}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
