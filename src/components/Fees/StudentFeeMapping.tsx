import { CheckCircle, Search, Users, X } from 'lucide-react';
import React, { useState, useMemo, useEffect } from 'react';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { FeeStructure } from '../../types';

interface StudentFeeMappingProps {
  feeStructure: FeeStructure;
  onClose: () => void;
}

export function StudentFeeMapping({ feeStructure, onClose }: StudentFeeMappingProps) {
  const { 
    getStudentsByClass, 
    addFeeStructureStudentMapping, 
    removeFeeStructureStudentMapping,
    feeStructureStudentMappings,
    getStudentsForFeeStructure
  } = useSchoolData();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFeeType, setSelectedFeeType] = useState<'books' | 'uniform' | 'van' | 'other'>('books');
  const [selectedOtherFeeName, setSelectedOtherFeeName] = useState<string>('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  const classStudents = getStudentsByClass(feeStructure.className);

  const existingMappings = useMemo(() => {
    return getStudentsForFeeStructure(
      feeStructure.id,
      selectedFeeType,
      selectedFeeType === 'other' ? selectedOtherFeeName : undefined
    );
  }, [feeStructure.id, selectedFeeType, selectedOtherFeeName, feeStructureStudentMappings]);

  useEffect(() => {
    setSelectedStudents(existingMappings);
  }, [existingMappings, selectedFeeType, selectedOtherFeeName]);

  const filteredStudents = useMemo(() => {
    return classStudents.filter(student => {
      const fullName = `${student.firstName || ''} ${student.lastName || ''}`.trim();
      return (fullName.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
             (student.admissionNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    });
  }, [classStudents, searchTerm]);

  const handleToggleStudent = (studentId: string) => {
    const isSelected = existingMappings.includes(studentId);
    if (isSelected) {
      const mapping = feeStructureStudentMappings.find(
        m => m.feeStructureId === feeStructure.id &&
             m.studentId === studentId &&
             m.feeType === selectedFeeType &&
             (selectedFeeType !== 'other' || (m.otherFeeName || '') === selectedOtherFeeName)
      );
      if (mapping) removeFeeStructureStudentMapping(mapping.id);
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    } else {
      addFeeStructureStudentMapping({
        feeStructureId: feeStructure.id,
        studentId,
        feeType: selectedFeeType,
        ...(selectedFeeType === 'other' && selectedOtherFeeName ? { otherFeeName: selectedOtherFeeName } : {})
      });
      setSelectedStudents(prev => [...prev, studentId]);
    }
  };

  const handleSelectAll = () => {
    const allIds = filteredStudents.map(s => s.id);
    allIds.forEach(id => {
      if (!existingMappings.includes(id)) {
        addFeeStructureStudentMapping({
          feeStructureId: feeStructure.id,
          studentId: id,
          feeType: selectedFeeType,
          ...(selectedFeeType === 'other' && selectedOtherFeeName ? { otherFeeName: selectedOtherFeeName } : {})
        });
      }
    });
    setSelectedStudents(allIds);
  };

  const handleUnselectAll = () => {
    existingMappings.forEach(studentId => {
      const mapping = feeStructureStudentMappings.find(
        m => m.feeStructureId === feeStructure.id &&
             m.studentId === studentId &&
             m.feeType === selectedFeeType &&
             (selectedFeeType !== 'other' || (m.otherFeeName || '') === selectedOtherFeeName)
      );
      if (mapping) removeFeeStructureStudentMapping(mapping.id);
    });
    setSelectedStudents([]);
  };

  type FeeOption = { value: 'books' | 'uniform' | 'van' | 'other'; otherFeeName?: string; label: string; amount: number };
  const feeTypeOptions: FeeOption[] = [
    { value: 'books', label: 'Books Fee', amount: feeStructure.booksFee },
    { value: 'uniform', label: 'Uniform Fee', amount: feeStructure.uniformFee },
    { value: 'van', label: 'Van Fee', amount: feeStructure.vanFee },
    ...(feeStructure.otherFees || [])
      .filter(f => f.name && (f.name as string).trim())
      .map(f => ({ value: 'other' as const, otherFeeName: (f.name as string).trim(), label: (f.name as string).trim(), amount: Number(f.amount) || 0 }))
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Student Fee Mapping</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Class {feeStructure.className} - Select students for {selectedFeeType === 'other' ? selectedOtherFeeName || 'other' : selectedFeeType} fee
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Fee Type Selector */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Fee Type
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {feeTypeOptions.map((option, idx) => {
            const isSelected = option.value === selectedFeeType && (option.value !== 'other' || (option.otherFeeName || '') === selectedOtherFeeName);
            return (
              <button
                key={option.value === 'other' ? `other-${option.otherFeeName}-${idx}` : option.value}
                type="button"
                onClick={() => {
                  setSelectedFeeType(option.value);
                  setSelectedOtherFeeName(option.value === 'other' ? (option.otherFeeName || '') : '');
                }}
                className={`p-3 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-400'
                }`}
              >
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white">{option.label}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">₹{option.amount.toLocaleString()}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={handleSelectAll}
            className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={handleUnselectAll}
            className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Selected Count */}
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span className="font-medium text-blue-800 dark:text-blue-300">
            {existingMappings.length} students selected for {selectedFeeType === 'other' ? selectedOtherFeeName || 'other' : selectedFeeType} fee
          </span>
        </div>
      </div>

      {/* Student List */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredStudents.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                No students found
              </div>
            ) : (
              filteredStudents.map(student => {
                // Use existingMappings to determine selection state for accurate display
                const isSelected = existingMappings.includes(student.id);
                const fullName = `${student.firstName} ${student.lastName}`.trim();

                return (
                  <div
                    key={student.id}
                    onClick={() => handleToggleStudent(student.id)}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleStudent(student.id)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">{fullName}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {student.admissionNumber} • Section {student.section}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}

