import { Edit2, Eye, Plus, RefreshCw, School, Trash2, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { sortClasses } from '../../utils/sortClasses';
import { ClassDetailPage } from './ClassDetailPage';
import type { ClassInfo } from '../../types';

const getApiBase = () => (import.meta.env.DEV ? window.location.origin : 'http://0.0.0.0:8000');

export function ClassesManagement() {
  const { user } = useAuth();
  const { classes, students, teachers, refreshClasses, addClass, updateClass, deleteClass } = useSchoolData();
  const schoolId = (user as { schoolId?: string })?.schoolId;

  const [selectedClassName, setSelectedClassName] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createSections, setCreateSections] = useState('A, B');
  const [createMedium, setCreateMedium] = useState('English');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
  const [editName, setEditName] = useState('');
  const [editSections, setEditSections] = useState('');
  const [editMedium, setEditMedium] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  const [deleteConfirmClass, setDeleteConfirmClass] = useState<ClassInfo | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (schoolId) refreshClasses(schoolId);
  }, [schoolId, refreshClasses]);

  const sortedClasses = sortClasses(classes);

  const getStudentCountForClass = (clsName: string) =>
    students.filter(s => (s.studentClass || '').trim().toLowerCase() === clsName.trim().toLowerCase()).length;

  const getInchargeName = (cls: ClassInfo) => {
    if (!cls.classInchargeTeacherId) return '–';
    const t = teachers.find((te: { id: string }) => te.id === cls.classInchargeTeacherId);
    return t ? t.name : '–';
  };

  const handleCreateClass = async () => {
    setError('');
    const name = createName.trim();
    if (!name) {
      setError('Class name is required');
      return;
    }
    if (!schoolId) {
      setError('School not found');
      return;
    }
    setCreating(true);
    try {
      const sections = createSections.split(/[,;]/).map(s => s.trim()).filter(Boolean);
      const medium = createMedium.split(/[,;]/).map(s => s.trim()).filter(Boolean);
      const res = await fetch(`${getApiBase()}/api/classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, name, sections: sections.length ? sections : ['A'], medium: medium.length ? medium : ['English'] })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create class');
        return;
      }
      addClass({
        id: data.id,
        name: data.name,
        sections: data.sections || ['A'],
        medium: data.medium || ['English']
      });
      await refreshClasses(schoolId);
      setShowCreateModal(false);
      setCreateName('');
      setCreateSections('A, B');
      setCreateMedium('English');
    } catch (e) {
      setError((e as Error).message || 'Failed to create class');
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (cls: ClassInfo) => {
    setEditingClass(cls);
    setEditName(cls.name);
    setEditSections((cls.sections || []).join(', '));
    setEditMedium((cls.medium || []).join(', '));
    setEditError('');
  };

  const handleEditClass = async () => {
    if (!editingClass || !schoolId) return;
    setEditError('');
    const name = editName.trim();
    if (!name) {
      setEditError('Class name is required');
      return;
    }
    setSavingEdit(true);
    try {
      const sections = editSections.split(/[,;]/).map(s => s.trim()).filter(Boolean);
      const medium = editMedium.split(/[,;]/).map(s => s.trim()).filter(Boolean);
      const classId = editingClass.id;
      if (!classId) {
        setEditError('Class has no ID; cannot update.');
        return;
      }
      const res = await fetch(`${getApiBase()}/api/classes/${classId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, sections: sections.length ? sections : ['A'], medium: medium.length ? medium : ['English'] })
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || 'Failed to update class');
        return;
      }
      updateClass(editingClass.name, { name, sections: sections.length ? sections : ['A'], medium: medium.length ? medium : ['English'] });
      await refreshClasses(schoolId);
      setEditingClass(null);
    } catch (e) {
      setEditError((e as Error).message || 'Failed to update class');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!deleteConfirmClass || !schoolId) return;
    const classId = deleteConfirmClass.id;
    if (!classId) {
      setDeleteConfirmClass(null);
      return;
    }
    setDeleting(true);
    try {
      await deleteClass(schoolId, classId);
      setDeleteConfirmClass(null);
    } catch (e) {
      setError((e as Error).message || 'Failed to delete class');
    } finally {
      setDeleting(false);
    }
  };

  if (selectedClassName) {
    return (
      <ClassDetailPage
        className={selectedClassName}
        onBack={() => setSelectedClassName(null)}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Classes</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => schoolId && refreshClasses(schoolId)}
            className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Class
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">All classes</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">View, edit, or delete classes. Click View to manage sections and teachers.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">Class</th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">Sections</th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">Medium</th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">Students</th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">In-charge</th>
                <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sortedClasses.map((cls: ClassInfo) => {
                const studentCount = getStudentCountForClass(cls.name);
                const sectionList = (cls.sections || []).join(', ');
                const mediumList = (cls.medium || []).join(', ');
                return (
                  <tr key={cls.id || cls.name} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <School className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">Class {cls.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{sectionList || '–'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{mediumList || '–'}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{studentCount}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{getInchargeName(cls)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedClassName(cls.name)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(cls)}
                          className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg"
                          title="Edit class"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmClass(cls)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          title="Delete class"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {sortedClasses.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
            No classes yet. Click &quot;Add Class&quot; to create one.
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Class</h2>
              <button
                type="button"
                onClick={() => { setShowCreateModal(false); setError(''); }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={e => { e.preventDefault(); handleCreateClass(); }}
              className="p-6 space-y-4"
            >
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class name *</label>
                <input
                  type="text"
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  placeholder="e.g. 5, Nursery"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sections (comma-separated)</label>
                <input
                  type="text"
                  value={createSections}
                  onChange={e => setCreateSections(e.target.value)}
                  placeholder="A, B, C"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Medium (comma-separated)</label>
                <input
                  type="text"
                  value={createMedium}
                  onChange={e => setCreateMedium(e.target.value)}
                  placeholder="English, Telugu"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setError(''); }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Class</h2>
              <button
                type="button"
                onClick={() => { setEditingClass(null); setEditError(''); }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={e => { e.preventDefault(); handleEditClass(); }}
              className="p-6 space-y-4"
            >
              {editError && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{editError}</p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="e.g. 5, Nursery"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sections (comma-separated)</label>
                <input
                  type="text"
                  value={editSections}
                  onChange={e => setEditSections(e.target.value)}
                  placeholder="A, B, C"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Medium (comma-separated)</label>
                <input
                  type="text"
                  value={editMedium}
                  onChange={e => setEditMedium(e.target.value)}
                  placeholder="English, Telugu"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setEditingClass(null); setEditError(''); }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingEdit ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete class?</h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
              Delete class <strong>Class {deleteConfirmClass.name}</strong>? This will remove the class and its section/subject teacher assignments. Students in this class will keep their class value until you move them.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmClass(null)}
                disabled={deleting}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteClass}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
