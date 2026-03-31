import { Edit, Eye, Phone, UserCheck, UserX } from 'lucide-react';
import { Student } from '../../types';

interface StudentListProps {
  students: Student[];
  onViewProfile?: (studentId: string) => void;
  onEditStudent?: (student: Student) => void;
  onDeactivateStudent?: (studentId: string) => void;
  onActivateStudent?: (studentId: string) => void;
}

export function StudentList({ students, onViewProfile, onEditStudent, onDeactivateStudent, onActivateStudent }: StudentListProps) {

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Student Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Class & Section
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Parent Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {students.map((student) => (
              <tr 
                key={student.id} 
                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => onViewProfile?.(student.id)}
              >
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {student.firstName} {student.lastName || ''}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{student.admissionNumber}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{student.dob}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Class {student.studentClass} {student.section}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{student.medium} Medium</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{student.fatherName}</p>
                    <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                      <Phone className="w-3 h-3" />
                      <span>{student.mobileNumber}</span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{student.location}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    (student.status || 'active') === 'active'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                  }`}>
                    {(student.status || 'active') === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    {(student.status || 'active') === 'inactive' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onActivateStudent?.(student.id);
                        }}
                        className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                        title="Activate Student"
                      >
                        <UserCheck className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewProfile?.(student.id);
                      }}
                      className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="View Profile"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditStudent?.(student);
                      }}
                      className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                      title="Edit Student"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {(student.status || 'active') === 'active' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeactivateStudent?.(student.id);
                        }}
                        className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                        title="Deactivate Student"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
