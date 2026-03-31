import { ChevronRight, GraduationCap } from 'lucide-react';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { sortClasses } from '../../utils/sortClasses';

interface FeeStructureViewProps {
  onClassSelect: (className: string) => void;
}

export function FeeStructureView({ onClassSelect }: FeeStructureViewProps) {
  const { classes, getStudentsByClass, feeStructures } = useSchoolData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Fee Structure Management</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Select a class to manage fee structures</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sortClasses(classes || []).map((classInfo: any, index: number) => {
          const students = getStudentsByClass(classInfo.name);
          const curriculumStructure = feeStructures.find(
            fs => fs.className === classInfo.name && fs.structureType === 'curriculum'
          );
          const semiCurriculumStructure = feeStructures.find(
            fs => fs.className === classInfo.name && fs.structureType === 'semi_curriculum'
          );
          const hasStructure = curriculumStructure || semiCurriculumStructure;

          return (
            <div
              key={index}
              onClick={() => onClassSelect(classInfo.name)}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:scale-105 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                  <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-right">
                  {hasStructure ? (
                    <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                      <span className="text-sm font-medium">Configured</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-orange-600 dark:text-orange-400">
                      <span className="text-sm font-medium">Not Set</span>
                    </div>
                  )}
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Class {classInfo.name}
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Students</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{students.length}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Sections</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{classInfo.sections.join(', ')}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Curriculum Fee</span>
                  <span className={`font-semibold ${curriculumStructure ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    {curriculumStructure ? 'Set' : 'Not Set'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Semi-Curriculum Fee</span>
                  <span className={`font-semibold ${semiCurriculumStructure ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    {semiCurriculumStructure ? 'Set' : 'Not Set'}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium text-sm group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                <span>Manage Fee Structure</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

