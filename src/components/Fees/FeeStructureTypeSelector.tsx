import { BookOpen, ChevronLeft, GraduationCap, Users } from 'lucide-react';

interface FeeStructureTypeSelectorProps {
  className: string;
  onBack: () => void;
  onTypeSelect: (type: 'curriculum' | 'semi_curriculum') => void;
}

export function FeeStructureTypeSelector({ className, onBack, onTypeSelect }: FeeStructureTypeSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Back to Classes</span>
        </button>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Class {className} - Fee Structure</h2>
        <p className="text-gray-600 dark:text-gray-400">Select the type of fee structure you want to manage</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Curriculum Fee Structure */}
        <div
          onClick={() => onTypeSelect('curriculum')}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border-2 border-blue-200 dark:border-blue-700 p-8 hover:shadow-lg hover:scale-105 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
              <GraduationCap className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 text-center">
            Curriculum Fees
          </h3>

          <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
            Fees that apply to all students in the class
          </p>

          <div className="space-y-3 mb-6">
            <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Tuition Fee</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>School Fee</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Exam Fee</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Other Fees</span>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium text-sm group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
              <span>Manage Curriculum Fees</span>
              <ChevronLeft className="w-4 h-4 ml-1 rotate-180" />
            </div>
          </div>
        </div>

        {/* Semi-Curriculum Fee Structure */}
        <div
          onClick={() => onTypeSelect('semi_curriculum')}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border-2 border-purple-200 dark:border-purple-700 p-8 hover:shadow-lg hover:scale-105 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
              <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>

          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 text-center">
            Semi-Curriculum Fees
          </h3>

          <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
            Fees that apply only to selected students
          </p>

          <div className="space-y-3 mb-6">
            <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Books Fee</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Uniform Fee</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Van Fee</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Other Fees</span>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center text-purple-600 dark:text-purple-400 font-medium text-sm group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
              <span>Manage Semi-Curriculum Fees</span>
              <ChevronLeft className="w-4 h-4 ml-1 rotate-180" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

