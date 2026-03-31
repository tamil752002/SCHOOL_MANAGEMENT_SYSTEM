import { AlertTriangle, DollarSign, Save, X } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { FeeStructure } from '../../types';

interface FeeStructureFormProps {
  onClose: () => void;
  editingStructure?: FeeStructure;
  className: string;
  structureType: 'curriculum' | 'semi_curriculum';
}

export function FeeStructureForm({ onClose, editingStructure, className, structureType }: FeeStructureFormProps) {
  const { addFeeStructure, updateFeeStructure, settings, feeStructures, applyFeeStructureToStudents, cleanupRemovedOtherFeeRecords } = useSchoolData();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    className: editingStructure?.className || className,
    academicYear: editingStructure?.academicYear || settings.currentAcademicYear,
    structureType: editingStructure?.structureType || structureType,
    // Curriculum fees (Type 1)
    tuitionFee: editingStructure?.tuitionFee || 0,
    schoolFee: editingStructure?.schoolFee || 0,
    examFee: editingStructure?.examFee || 0,
    // Semi-curriculum fees (Type 2)
    booksFee: editingStructure?.booksFee || 0,
    uniformFee: editingStructure?.uniformFee || 0,
    vanFee: editingStructure?.vanFee || 0,
    otherFees: (() => {
      const raw = editingStructure?.otherFees;
      const arr = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && 'name' in raw ? [raw] : []);
      return arr.length > 0 ? arr : [{ name: '', amount: 0 }];
    })()
  });

  // Sync formData with editingStructure when it changes
  useEffect(() => {
    if (editingStructure) {
      setFormData({
        className: editingStructure.className || className,
        academicYear: editingStructure.academicYear || settings.currentAcademicYear,
        structureType: editingStructure.structureType || structureType,
        tuitionFee: editingStructure.tuitionFee || 0,
        schoolFee: editingStructure.schoolFee || 0,
        examFee: editingStructure.examFee || 0,
        booksFee: editingStructure.booksFee || 0,
        uniformFee: editingStructure.uniformFee || 0,
        vanFee: editingStructure.vanFee || 0,
        otherFees: (() => {
          const raw = editingStructure.otherFees;
          const arr = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && 'name' in raw ? [raw] : []);
          return arr.length > 0 ? arr : [{ name: '', amount: 0 }];
        })()
      });
    }
  }, [editingStructure, className, structureType, settings.currentAcademicYear]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.academicYear.trim()) {
      newErrors.academicYear = 'Academic year is required';
    }

    // Check for duplicate fee structure
    const existingStructure = feeStructures.find(
      fs => fs.className === formData.className && 
            fs.academicYear === formData.academicYear &&
            fs.structureType === formData.structureType
    );
    if (existingStructure && (!editingStructure || existingStructure.id !== editingStructure.id)) {
      newErrors.duplicate = `Fee structure for Class ${formData.className} (${formData.academicYear}) of type ${formData.structureType} already exists`;
    }

    // Validate fee amounts based on structure type
    if (formData.structureType === 'curriculum') {
      const curriculumFees = ['tuitionFee', 'schoolFee', 'examFee'];
      curriculumFees.forEach(field => {
        const value = formData[field as keyof typeof formData] as number;
        if (value < 0) {
          newErrors[field] = `${field.replace(/([A-Z])/g, ' $1').toLowerCase()} cannot be negative`;
        }
      });
    } else {
      const semiCurriculumFees = ['booksFee', 'uniformFee', 'vanFee'];
      semiCurriculumFees.forEach(field => {
        const value = formData[field as keyof typeof formData] as number;
        if (value < 0) {
          newErrors[field] = `${field.replace(/([A-Z])/g, ' $1').toLowerCase()} cannot be negative`;
        }
      });
    }

    // Validate other fees
    formData.otherFees.forEach((fee, index) => {
      if (fee.name.trim() && fee.amount < 0) {
        newErrors[`otherFee_${index}`] = 'Fee amount cannot be negative';
      }
      if (!fee.name.trim() && fee.amount > 0) {
        newErrors[`otherFeeName_${index}`] = 'Fee name is required when amount is specified';
      }
    });

    // Check if at least one fee is specified
    const hasMainFees = formData.structureType === 'curriculum'
      ? (formData.tuitionFee > 0 || formData.schoolFee > 0 || formData.examFee > 0)
      : (formData.booksFee > 0 || formData.uniformFee > 0 || formData.vanFee > 0);
    const hasOtherFees = formData.otherFees.some(fee => fee.name.trim() && fee.amount > 0);

    if (!hasMainFees && !hasOtherFees) {
      newErrors.noFees = 'Please specify at least one fee amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const filteredOtherFees = formData.otherFees.filter(fee => fee.name.trim() && fee.amount > 0);
      // Explicit array copy so all entries are persisted (avoid any single-item truncation)
      const otherFeesArray = filteredOtherFees.map(f => ({ name: String(f.name).trim(), amount: Number(f.amount) || 0 }));

      const structureData: Omit<FeeStructure, 'id'> = {
        className: formData.className,
        academicYear: formData.academicYear,
        structureType: formData.structureType,
        tuitionFee: formData.tuitionFee,
        schoolFee: formData.schoolFee,
        examFee: formData.examFee,
        booksFee: formData.booksFee,
        uniformFee: formData.uniformFee,
        vanFee: formData.vanFee,
        otherFees: otherFeesArray
      };

      if (editingStructure) {
        await updateFeeStructure(editingStructure.id, structureData);
        const updatedStructure: FeeStructure = {
          ...structureData,
          id: editingStructure.id
        };
        // For curriculum, cleanup removed "other" fee records from state and DB (semi-curriculum uses mapping-based delete in applyFeeStructureToStudents)
        if (formData.structureType === 'curriculum') {
          await cleanupRemovedOtherFeeRecords(updatedStructure, editingStructure);
        }

        if (formData.structureType === 'curriculum') {
          if (window.confirm('Fee structure updated. Would you like to apply this new structure to all active students in this class?')) {
            const count = await applyFeeStructureToStudents(updatedStructure, editingStructure);
            alert(`Fee structure updated and applied to ${count} students!`);
          } else {
            alert('Fee structure updated successfully!');
          }
        } else {
          const count = await applyFeeStructureToStudents(updatedStructure, editingStructure);
          alert(`Fee structure updated and applied to ${count} mapped students!`);
        }
      } else {
        const newId = await addFeeStructure(structureData);
        // Create a complete FeeStructure object with the new ID to pass to applyFeeStructureToStudents
        const newStructure: FeeStructure = {
          ...structureData,
          id: newId
        };
        
        if (formData.structureType === 'curriculum') {
          if (window.confirm('Fee structure saved. Would you like to apply it to all active students in this class?')) {
            const count = await applyFeeStructureToStudents(newStructure);
            alert(`Fee structure saved and applied to ${count} students!`);
          } else {
            alert('Fee structure saved successfully!');
          }
        } else {
          // For semi-curriculum fees, they need to be mapped manually via Student Fee Mapping
          alert('Fee structure saved successfully! Use "Manage Student Mapping" to assign fees to students.');
        }
      }
      onClose();
    } catch (error) {
      console.error('Error saving fee structure:', error);
      setErrors({ submit: 'Failed to save fee structure. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleNumberChange = (field: string, value: string) => {
    const numValue = Math.max(0, parseFloat(value) || 0);
    handleChange(field, numValue);
  };

  const addOtherFee = () => {
    setFormData(prev => ({
      ...prev,
      otherFees: [...prev.otherFees, { name: '', amount: 0 }]
    }));
  };

  const updateOtherFee = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      otherFees: prev.otherFees.map((fee, i) =>
        i === index ? { ...fee, [field]: field === 'amount' ? Math.max(0, parseFloat(value) || 0) : value } : fee
      )
    }));

    const errorKey = field === 'amount' ? `otherFee_${index}` : `otherFeeName_${index}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const removeOtherFee = (index: number) => {
    setFormData(prev => ({
      ...prev,
      otherFees: prev.otherFees.filter((_, i) => i !== index)
    }));
  };

  const calculateTotal = () => {
    if (formData.structureType === 'curriculum') {
      return formData.tuitionFee + formData.schoolFee + formData.examFee +
        formData.otherFees.reduce((sum, fee) => sum + fee.amount, 0);
    } else {
      return formData.booksFee + formData.uniformFee + formData.vanFee +
        formData.otherFees.reduce((sum, fee) => sum + fee.amount, 0);
    }
  };

  const totalFee = calculateTotal();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {editingStructure ? 'Edit Fee Structure' : `Create ${formData.structureType === 'curriculum' ? 'Curriculum' : 'Semi-Curriculum'} Fee Structure`}
        </h2>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {(errors.duplicate || errors.noFees || errors.submit) && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div className="text-sm text-red-700 dark:text-red-300">
              {errors.duplicate && <div>{errors.duplicate}</div>}
              {errors.noFees && <div>{errors.noFees}</div>}
              {errors.submit && <div>{errors.submit}</div>}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Class *
            </label>
            <input
              type="text"
              value={formData.className}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Academic Year *
            </label>
            <input
              type="text"
              value={formData.academicYear}
              onChange={(e) => handleChange('academicYear', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.academicYear ? 'border-red-300 dark:border-red-600' : 'border-gray-300'
                }`}
              placeholder="e.g., 2023-24"
              required
            />
            {errors.academicYear && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.academicYear}</p>}
          </div>
        </div>

        {/* Curriculum Fees */}
        {formData.structureType === 'curriculum' && (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
              <DollarSign className="w-5 h-5" />
              <span>Curriculum Fees (Applies to All Students)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { key: 'tuitionFee', label: 'Tuition Fee' },
                { key: 'schoolFee', label: 'School Fee' },
                { key: 'examFee', label: 'Exam Fee' }
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {label}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₹</span>
                    <input
                      type="number"
                      value={formData[key as keyof typeof formData] as number}
                      onChange={(e) => handleNumberChange(key, e.target.value)}
                      className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors[key] ? 'border-red-300 dark:border-red-600' : 'border-gray-300'
                        }`}
                      min="0"
                    />
                  </div>
                  {errors[key] && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors[key]}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Semi-Curriculum Fees */}
        {formData.structureType === 'semi_curriculum' && (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
              <DollarSign className="w-5 h-5" />
              <span>Semi-Curriculum Fees (Applies to Selected Students)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { key: 'booksFee', label: 'Books Fee' },
                { key: 'uniformFee', label: 'Uniform Fee' },
                { key: 'vanFee', label: 'Van Fee' }
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {label}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₹</span>
                    <input
                      type="number"
                      value={formData[key as keyof typeof formData] as number}
                      onChange={(e) => handleNumberChange(key, e.target.value)}
                      className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors[key] ? 'border-red-300 dark:border-red-600' : 'border-gray-300'
                        }`}
                      min="0"
                    />
                  </div>
                  {errors[key] && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors[key]}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other Fees */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Other Fees</h3>
            <button
              type="button"
              onClick={addOtherFee}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium text-sm"
            >
              + Add Fee
            </button>
          </div>

          <div className="space-y-3">
            {formData.otherFees.map((fee, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Fee name"
                    value={fee.name}
                    onChange={(e) => updateOtherFee(index, 'name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 ${errors[`otherFeeName_${index}`] ? 'border-red-300 dark:border-red-600' : 'border-gray-300'
                      }`}
                  />
                  {errors[`otherFeeName_${index}`] && (
                    <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors[`otherFeeName_${index}`]}</p>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₹</span>
                  <input
                    type="number"
                    placeholder="Amount"
                    value={fee.amount}
                    onChange={(e) => updateOtherFee(index, 'amount', e.target.value)}
                    className={`w-32 pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 ${errors[`otherFee_${index}`] ? 'border-red-300 dark:border-red-600' : 'border-gray-300'
                      }`}
                    min="0"
                  />
                  {errors[`otherFee_${index}`] && (
                    <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors[`otherFee_${index}`]}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeOtherFee(index)}
                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  title="Remove this fee"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-blue-900 dark:text-blue-300">Total Annual Fee:</span>
            <span className="text-2xl font-bold text-blue-900 dark:text-blue-300">₹{totalFee.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isLoading ? 'Saving...' : 'Save Structure'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

