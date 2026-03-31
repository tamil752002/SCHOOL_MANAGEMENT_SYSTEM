import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { MarksEntry } from '../Exams/MarksEntry';

/**
 * Marks entry for teachers: only allows entering marks for the classes and subjects
 * the teacher is assigned to.
 */
export function TeacherMarksEntry() {
  const { user } = useAuth();
  const { teachers } = useSchoolData();
  const teacherId = (user as { teacherId?: string })?.teacherId;
  const teacher = teachers.find(t => t.id === teacherId);

  const allowedClassNames = teacher?.classes?.length
    ? [...new Set((teacher.classes ?? []).map(c => c.className || (c as { class_name?: string }).class_name).filter(Boolean))]
    : undefined;
  const allowedSubjectNames = teacher?.subjects?.length
    ? (teacher.subjects ?? []).map(s => s.name).filter(Boolean)
    : undefined;

  if (!teacherId) {
    return (
      <div className="p-6 text-center text-gray-600 dark:text-gray-400">
        Teacher profile not found. Please contact the administrator.
      </div>
    );
  }

  if (!teacher?.subjects?.length && !teacher?.classes?.length) {
    return (
      <div className="p-6 text-center text-gray-600 dark:text-gray-400">
        No classes or subjects assigned to you yet. Contact the administrator to get access to marks entry.
      </div>
    );
  }

  return (
    <MarksEntry
      allowedClassNames={allowedClassNames}
      allowedSubjectNames={allowedSubjectNames}
    />
  );
}
