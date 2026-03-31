import { TrendingUp, User, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';

const getApiBase = () => (import.meta.env.DEV ? window.location.origin : 'http://0.0.0.0:8000');

interface ExamGrowthPoint {
  subject?: string;
  examType: string;
  percentage: number;
  obtainedMarks: number;
  maxMarks: number;
  date?: string;
}

interface ByYearData {
  [year: string]: ExamGrowthPoint[];
}

export function StudentAcademicGrowth() {
  const { user } = useAuth();
  const { students, subjects } = useSchoolData();
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [byYear, setByYear] = useState<ByYearData>({});
  const [loading, setLoading] = useState(false);

  const isStudent = user?.role === 'student';
  const currentStudent = isStudent ? students.find(s => s.admissionNumber === user?.admissionNumber) : null;
  const effectiveStudentId = isStudent ? currentStudent?.id : selectedStudentId;

  const fetchGrowth = useCallback(async () => {
    if (!effectiveStudentId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSubjects.length > 0) params.set('subjects', selectedSubjects.join(','));
      const res = await fetch(`${getApiBase()}/api/students/${effectiveStudentId}/exam-growth?${params}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setByYear(data.byYear || {});
    } catch (e) {
      console.error(e);
      setByYear({});
    } finally {
      setLoading(false);
    }
  }, [effectiveStudentId, selectedSubjects]);

  useEffect(() => {
    if (effectiveStudentId) fetchGrowth();
    else setByYear({});
  }, [effectiveStudentId, fetchGrowth]);

  const years = Object.keys(byYear).sort();
  const allExamKeys = new Set<string>();
  years.forEach(year => (byYear[year] || []).forEach(p => allExamKeys.add(p.examType || 'Exam')));
  const examOrder = ['FA1', 'FA2', 'SA1', 'FA3', 'FA4', 'SA2', 'Annual', 'Weekend Exam', 'General Test'];
  const sortedExamKeys = Array.from(allExamKeys).sort((a, b) => {
    const ai = examOrder.indexOf(a);
    const bi = examOrder.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  const chartData = sortedExamKeys.map(examKey => {
    const point: Record<string, string | number> = { exam: examKey };
    years.forEach(year => {
      const list = (byYear[year] || []).filter(p => (p.examType || '') === examKey);
      if (selectedSubjects.length > 0) {
        const filtered = list.filter(p => selectedSubjects.includes(p.subject || ''));
        const avg = filtered.length > 0
          ? filtered.reduce((s, p) => s + p.percentage, 0) / filtered.length
          : null;
        if (avg != null) point[year] = Math.round(avg);
      } else {
        const avg = list.length > 0
          ? list.reduce((s, p) => s + p.percentage, 0) / list.length
          : null;
        if (avg != null) point[year] = Math.round(avg);
      }
    });
    return point;
  }).filter(row => years.some(y => row[y] != null));

  const colors = ['#0891b2', '#0d9488', '#059669', '#2563eb', '#7c3aed', '#dc2626', '#ea580c'];

  if (isStudent && !currentStudent) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        Student record not found.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-7 h-7 text-cyan-600 dark:text-cyan-400" />
          Student Academic Growth
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Compare exam performance across academic years by subject and exam type.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          {!isStudent && (
            <div className="min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Student</label>
              <select
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select student</option>
                {students.filter(s => (s.status || 'active') === 'active').map(s => (
                  <option key={s.id} value={s.id}>
                    {[s.firstName, s.lastName].filter(Boolean).join(' ')} • Class {s.studentClass}-{s.section}
                  </option>
                ))}
              </select>
            </div>
          )}
          {isStudent && (
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <User className="w-5 h-5" />
              <span className="font-medium">{[currentStudent?.firstName, currentStudent?.lastName].filter(Boolean).join(' ')}</span>
            </div>
          )}
          <div className="min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subjects (optional)</label>
            <select
              multiple
              value={selectedSubjects}
              onChange={e => {
                const opts = Array.from(e.target.selectedOptions, o => o.value).filter(Boolean);
                setSelectedSubjects(opts);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white min-h-[80px]"
            >
              {(subjects || []).map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Hold Ctrl/Cmd to select multiple</p>
          </div>
          <button
            onClick={() => fetchGrowth()}
            disabled={loading || !effectiveStudentId}
            className="px-4 py-2 rounded-xl gradient-primary text-white font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft border border-gray-200 dark:border-gray-700 p-6">
        {!effectiveStudentId && !isStudent ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            Select a student to view academic growth.
          </div>
        ) : loading && Object.keys(byYear).length === 0 ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            No exam data available for the selected filters.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-600" />
              <XAxis dataKey="exam" className="text-xs" stroke="currentColor" />
              <YAxis domain={[0, 100]} unit="%" className="text-xs" stroke="currentColor" />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid var(--gray-200)' }}
                formatter={(value: number) => [`${value}%`, '']}
                labelFormatter={label => `Exam: ${label}`}
              />
              <Legend />
              {years.map((year, i) => (
                <Line
                  key={year}
                  type="monotone"
                  dataKey={year}
                  name={year}
                  stroke={colors[i % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
