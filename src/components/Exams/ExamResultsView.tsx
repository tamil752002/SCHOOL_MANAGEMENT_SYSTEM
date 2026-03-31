import { useState, useMemo } from 'react';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import type { Student } from '../../types';
import { ChevronRight, ArrowLeft } from 'lucide-react';

interface ExamResultsViewProps {
  student: Student;
  title?: string;
  topContent?: React.ReactNode;
}

type ExamGroup = {
  key: string;
  name: string;
  sortDate: string;
  records: { id: string; subject?: string; maxMarks: number; obtainedMarks: number; grade: string }[];
};
type ExamRecordLike = { id: string; studentId: string; examId?: string; examType?: string; date?: string };

function gradeClass(grade: string) {
  if (grade === 'A+' || grade === 'A') return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';
  if (grade === 'B+' || grade === 'B') return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400';
  if (grade === 'C') return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';
  if (grade === 'D') return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400';
  return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400';
}

export function ExamResultsView({ student, title = 'My Examination Results', topContent }: ExamResultsViewProps) {
  const { students, examRecords, exams } = useSchoolData();
  const [selectedExamKey, setSelectedExamKey] = useState<string | null>(null);

  const examGroups = useMemo(() => {
    const records = examRecords.filter(r => r.studentId === student.id) as ExamRecordLike[];
    const byKey: Record<string, { records: ExamGroup['records']; sortDate: string }> = {};
    records.forEach(r => {
      const key = r.examId || `type:${r.examType || 'Other'}`;
      if (!byKey[key]) byKey[key] = { records: [], sortDate: r.date || '' };
      byKey[key].records.push({
        id: r.id,
        subject: (r as any).subject,
        maxMarks: (r as any).maxMarks,
        obtainedMarks: (r as any).obtainedMarks,
        grade: (r as any).grade
      });
      if (r.date && (!byKey[key].sortDate || r.date > byKey[key].sortDate)) {
        byKey[key].sortDate = r.date;
      }
    });
    const groups: ExamGroup[] = Object.entries(byKey).map(([key, { records: recs, sortDate: recDate }]) => {
      const exam = key.startsWith('type:') ? null : exams.find(e => e.id === key);
      const examType = key.startsWith('type:') ? key.replace('type:', '') : (exam?.type ?? 'Other');
      const name = exam ? (exam.name || exam.type || examType) : examType;
      const sortDate = exam?.endDate || recDate || '';
      return { key, name, sortDate, records: recs };
    });
    groups.sort((a, b) => (b.sortDate || '').localeCompare(a.sortDate || '', undefined, { numeric: true }));
    return groups;
  }, [examRecords, student.id, exams]);

  const selectedGroup = useMemo(() => {
    if (!selectedExamKey) return null;
    return examGroups.find(g => g.key === selectedExamKey) ?? null;
  }, [selectedExamKey, examGroups]);

  const classRank = useMemo(() => {
    if (!selectedGroup || !selectedExamKey) return null;
    const classmates = students.filter(
      s => s.studentClass === student.studentClass && s.section === student.section
    );
    const key = selectedExamKey;
    const isByExamId = !key.startsWith('type:');
    const typeVal = key.startsWith('type:') ? key.replace('type:', '') : '';
    const totals: { studentId: string; total: number }[] = classmates.map(s => {
      const recs = examRecords.filter(r => {
        if (r.studentId !== s.id) return false;
        if (isByExamId) return r.examId === key;
        return (r.examType || 'Other') === typeVal;
      });
      const total = recs.reduce((sum, r) => sum + r.obtainedMarks, 0);
      return { studentId: s.id, total };
    });
    totals.sort((a, b) => b.total - a.total);
    const idx = totals.findIndex(t => t.studentId === student.id);
    if (idx === -1) return null;
    return { rank: idx + 1, totalInClass: totals.length };
  }, [selectedGroup, selectedExamKey, student.id, student.studentClass, student.section, students, examRecords]);

  /** Subject-wise overall percentage across all exams (for display above cards) */
  const subjectWiseOverall = useMemo(() => {
    const records = examRecords.filter(r => r.studentId === student.id);
    const bySubject: Record<string, { totalMarks: number; totalMaxMarks: number }> = {};
    records.forEach(r => {
      const sub = r.subject || '—';
      if (!bySubject[sub]) bySubject[sub] = { totalMarks: 0, totalMaxMarks: 0 };
      bySubject[sub].totalMarks += r.obtainedMarks;
      bySubject[sub].totalMaxMarks += r.maxMarks;
    });
    return Object.entries(bySubject)
      .map(([subject, { totalMarks, totalMaxMarks }]) => ({
        subject,
        percentage: totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0,
        totalMarks,
        totalMaxMarks
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }, [examRecords, student.id]);

  if (examGroups.length === 0) {
    return (
      <div className="p-6 space-y-6">
        {topContent}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">No exam results available yet.</p>
        </div>
      </div>
    );
  }

  if (selectedGroup) {
    const totalObtained = selectedGroup.records.reduce((s, r) => s + r.obtainedMarks, 0);
    const totalMax = selectedGroup.records.reduce((s, r) => s + r.maxMarks, 0);
    const overallPct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

    return (
      <div className="p-6 space-y-6">
        {topContent}
        <button
          type="button"
          onClick={() => setSelectedExamKey(null)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to exams
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedGroup.name}</h1>

        {/* Rank and overall at top */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            {classRank != null && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">Class rank</span>
                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  #{classRank.rank}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  of {classRank.totalInClass} students
                </span>
              </div>
            )}
            <div className="text-right">
              <span className="text-sm text-gray-500 dark:text-gray-400">Overall</span>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {totalObtained}/{totalMax} ({overallPct.toFixed(1)}%)
              </p>
            </div>
          </div>
        </div>

        {/* Subject list */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Marks</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Percentage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {selectedGroup.records.map(record => {
                const pct = record.maxMarks > 0 ? (record.obtainedMarks / record.maxMarks) * 100 : 0;
                return (
                  <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {record.subject ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {record.obtainedMarks}/{record.maxMarks}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {pct.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${gradeClass(record.grade)}`}>
                        {record.grade}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {topContent}
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>

      {/* Subject-wise overall percentage from all exams */}
      {subjectWiseOverall.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Subject-wise overall (from all exams)
          </h3>
          <div className="flex flex-wrap gap-3">
            {subjectWiseOverall.map(({ subject, percentage, totalMarks, totalMaxMarks }) => (
              <div
                key={subject}
                className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 px-4 py-2.5"
              >
                <span className="font-medium text-gray-900 dark:text-white">{subject}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {totalMarks}/{totalMaxMarks}
                </span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {percentage.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {examGroups.map(group => {
          const totalObtained = group.records.reduce((s, r) => s + r.obtainedMarks, 0);
          const totalMax = group.records.reduce((s, r) => s + r.maxMarks, 0);
          const pct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
          return (
            <button
              key={group.key}
              type="button"
              onClick={() => setSelectedExamKey(group.key)}
              className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 text-left shadow-sm hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow transition"
            >
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{group.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {group.records.length} subject{group.records.length !== 1 ? 's' : ''} · {pct.toFixed(1)}%
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
