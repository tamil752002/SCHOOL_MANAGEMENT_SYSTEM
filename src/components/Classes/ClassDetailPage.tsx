import { ArrowLeft, Edit2, Users, UserCircle, Plus, Trash2, Save, Loader2, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import type { ClassSectionSubjectTeacher } from '../../types';

const getApiBase = () => (import.meta.env.DEV ? window.location.origin : 'http://0.0.0.0:8000');

interface ClassDetailPageProps {
  className: string;
  onBack: () => void;
}

function getStudentDisplayName(s: { firstName?: string; middleName?: string; lastName?: string; studentName?: string }): string {
  if (s.studentName?.trim()) return s.studentName;
  const parts = [s.firstName, s.middleName, s.lastName].filter(Boolean);
  return parts.join(' ').trim() || '–';
}

export function ClassDetailPage({ className, onBack }: ClassDetailPageProps) {
  const { user } = useAuth();
  const {
    classes,
    getStudentsByClass,
    teachers,
    subjects,
    refreshClasses,
    refreshTeachers,
    refreshStudents,
    updateClass,
    deleteClass
  } = useSchoolData();
  const schoolId = (user as { schoolId?: string })?.schoolId;

  const [activeTab, setActiveTab] = useState<'students' | 'teachers'>('students');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSections, setEditSections] = useState('');
  const [editMedium, setEditMedium] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [sectionAssignments, setSectionAssignments] = useState<{ subjectId: string; teacherId: string }[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [savingAssignments, setSavingAssignments] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [moveTargetSection, setMoveTargetSection] = useState('');
  const [moving, setMoving] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [addingSection, setAddingSection] = useState(false);

  const classInfo = classes.find(c => c.name === className);
  const sections = classInfo?.sections ?? ['A'];
  const effectiveSection = selectedSection || sections[0] || 'A';
  const classStudents = getStudentsByClass(className, effectiveSection);

  useEffect(() => {
    if (!selectedSection && sections.length) setSelectedSection(sections[0]);
  }, [sections, selectedSection]);

  useEffect(() => {
    if (activeTab !== 'teachers' || !schoolId || !className || !effectiveSection) return;
    setLoadingAssignments(true);
    fetch(
      `${getApiBase()}/api/classes/section-subject-teachers?schoolId=${schoolId}&className=${encodeURIComponent(className)}&section=${encodeURIComponent(effectiveSection)}`
    )
      .then(r => r.json())
      .then((data: ClassSectionSubjectTeacher[]) => {
        setSectionAssignments(Array.isArray(data) ? data.map(a => ({ subjectId: a.subjectId, teacherId: a.teacherId })) : []);
      })
      .catch(() => setSectionAssignments([]))
      .finally(() => setLoadingAssignments(false));
  }, [activeTab, schoolId, className, effectiveSection]);

  const handleAddSection = async () => {
    const name = newSectionName.trim().toUpperCase();
    if (!name || sections.includes(name)) return;
    if (!classInfo?.id && !schoolId) return;
    setAddingSection(true);
    try {
      const newSections = [...sections, name];
      updateClass(className, { sections: newSections });
      const classId = classInfo?.id;
      if (classId) {
        const res = await fetch(`${getApiBase()}/api/classes/${classId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sections: newSections })
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to update');
      }
      if (schoolId) await refreshClasses(schoolId);
      setNewSectionName('');
      setSelectedSection(name);
    } catch (e) {
      console.error(e);
    } finally {
      setAddingSection(false);
    }
  };

  const handleRemoveSection = async (sec: string) => {
    const inSection = getStudentsByClass(className, sec).length;
    if (inSection > 0 && !window.confirm(`${sec} has ${inSection} student(s). Remove section anyway? Students will keep their section value until moved.`)) return;
    const newSections = sections.filter(s => s !== sec);
    if (newSections.length === 0) return;
    const classId = classInfo?.id;
    if (classId) {
      try {
        await fetch(`${getApiBase()}/api/classes/${classId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sections: newSections })
        });
        if (schoolId) await refreshClasses(schoolId);
      } catch (e) {
        console.error(e);
        return;
      }
    }
    updateClass(className, { sections: newSections });
    if (selectedSection === sec) setSelectedSection(newSections[0]);
  };

  const handleSaveSectionTeachers = async () => {
    if (!schoolId) return;
    setSavingAssignments(true);
    try {
      const res = await fetch(`${getApiBase()}/api/classes/section-subject-teachers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          className,
          section: effectiveSection,
          assignments: sectionAssignments.filter(a => a.subjectId && a.teacherId)
        })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save');
      await refreshTeachers();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingAssignments(false);
    }
  };

  const handleBulkMove = async () => {
    if (!schoolId || !moveTargetSection || selectedStudentIds.size === 0) return;
    setMoving(true);
    try {
      const res = await fetch(`${getApiBase()}/api/students/bulk-move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          studentIds: Array.from(selectedStudentIds),
          targetClass: className,
          targetSection: moveTargetSection
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to move');
      await refreshStudents(schoolId);
      setSelectedStudentIds(new Set());
    } catch (e) {
      console.error(e);
    } finally {
      setMoving(false);
    }
  };

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const teachersForSubject = (subjectId: string) =>
    teachers.filter(t => t.subjects?.some(s => s.id === subjectId));

  const openEditModal = () => {
    setEditName(className);
    setEditSections(sections.join(', '));
    setEditMedium((classInfo?.medium || []).join(', '));
    setEditError('');
    setShowEditModal(true);
  };

  const handleEditClass = async () => {
    if (!classInfo?.id || !schoolId) return;
    setEditError('');
    const name = editName.trim();
    if (!name) {
      setEditError('Class name is required');
      return;
    }
    setSavingEdit(true);
    try {
      const sectionList = editSections.split(/[,;]/).map(s => s.trim()).filter(Boolean);
      const mediumList = editMedium.split(/[,;]/).map(s => s.trim()).filter(Boolean);
      const res = await fetch(`${getApiBase()}/api/classes/${classInfo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          sections: sectionList.length ? sectionList : ['A'],
          medium: mediumList.length ? mediumList : ['English']
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || 'Failed to update class');
        return;
      }
      updateClass(className, {
        name,
        sections: sectionList.length ? sectionList : ['A'],
        medium: mediumList.length ? mediumList : ['English']
      });
      await refreshClasses(schoolId);
      setShowEditModal(false);
      if (name !== className) onBack();
    } catch (e) {
      setEditError((e as Error).message || 'Failed to update class');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!classInfo?.id || !schoolId) return;
    setDeleting(true);
    try {
      await deleteClass(schoolId, classInfo.id);
      setShowDeleteConfirm(false);
      onBack();
    } catch (e) {
      setEditError((e as Error).message || 'Failed to delete class');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Classes</span>
          </button>
          <div className="border-l border-gray-300 dark:border-gray-600 pl-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Class {className}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Sections: {sections.join(', ') || '–'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openEditModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50"
          >
            <Edit2 className="w-4 h-4" />
            Edit class
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50"
          >
            <Trash2 className="w-4 h-4" />
            Delete class
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Manage sections</h3>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={newSectionName}
            onChange={e => setNewSectionName(e.target.value.toUpperCase())}
            placeholder="New section (e.g. D)"
            className="w-28 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={handleAddSection}
            disabled={addingSection || !newSectionName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {addingSection ? 'Adding…' : 'Add section'}
          </button>
          <div className="flex flex-wrap gap-2">
            {sections.map(sec => (
              <span key={sec} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm">
                {sec}
                <button
                  type="button"
                  onClick={() => handleRemoveSection(sec)}
                  className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded p-0.5"
                  title="Remove section"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-1">
          {(['students', 'teachers'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium text-sm rounded-t-lg flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 -mb-px'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab === 'students' && <Users className="w-4 h-4" />}
              {tab === 'teachers' && <UserCircle className="w-4 h-4" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'students' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Section</label>
            <select
              value={effectiveSection}
              onChange={e => setSelectedSection(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
            >
              {sections.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {selectedStudentIds.size > 0 && (
              <>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-2">Move to</label>
                <select
                  value={moveTargetSection}
                  onChange={e => setMoveTargetSection(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value="">Select section</option>
                  {sections.filter(s => s !== effectiveSection).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleBulkMove}
                  disabled={moving || !moveTargetSection}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                >
                  {moving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Move {selectedStudentIds.size} student(s)
                </button>
              </>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-12">
                    <input
                      type="checkbox"
                      checked={classStudents.length > 0 && classStudents.every(s => selectedStudentIds.has(s.id))}
                      onChange={e => {
                        if (e.target.checked) setSelectedStudentIds(new Set(classStudents.map(s => s.id)));
                        else setSelectedStudentIds(new Set());
                      }}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Admission No.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {classStudents.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">No students in this section.</td>
                  </tr>
                ) : (
                  classStudents.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.has(s.id)}
                          onChange={() => toggleStudentSelection(s.id)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">{getStudentDisplayName(s)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{s.admissionNumber}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'teachers' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Section</label>
            <select
              value={effectiveSection}
              onChange={e => setSelectedSection(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              {sections.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          {loadingAssignments ? (
            <p className="text-gray-500 dark:text-gray-400">Loading…</p>
          ) : (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Assign a teacher for each subject for section {effectiveSection}.</p>
              <div className="space-y-4 mb-6">
                {subjects.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">No subjects in school. Add subjects in Settings.</p>
                ) : (
                  subjects.map(subj => {
                    const current = sectionAssignments.find(a => a.subjectId === subj.id);
                    const options = teachersForSubject(subj.id);
                    return (
                      <div key={subj.id} className="flex flex-wrap items-center gap-3">
                        <label className="w-40 text-sm font-medium text-gray-700 dark:text-gray-300">{subj.name}</label>
                        <select
                          value={current?.teacherId ?? ''}
                          onChange={e => {
                            const teacherId = e.target.value;
                            setSectionAssignments(prev => {
                              const rest = prev.filter(a => a.subjectId !== subj.id);
                              if (!teacherId) return rest;
                              return [...rest, { subjectId: subj.id, teacherId }];
                            });
                          }}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white min-w-[200px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">– No teacher –</option>
                          {options.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })
                )}
              </div>
              <button
                type="button"
                onClick={handleSaveSectionTeachers}
                disabled={savingAssignments}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {savingAssignments && <Loader2 className="w-4 h-4 animate-spin" />}
                <Save className="w-4 h-4" />
                Save teachers for section {effectiveSection}
              </button>
            </>
          )}
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Class</h2>
              <button type="button" onClick={() => { setShowEditModal(false); setEditError(''); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={e => { e.preventDefault(); handleEditClass(); }} className="p-6 space-y-4">
              {editError && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{editError}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class name *</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="e.g. 5, Nursery" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sections (comma-separated)</label>
                <input type="text" value={editSections} onChange={e => setEditSections(e.target.value)} placeholder="A, B, C" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Medium (comma-separated)</label>
                <input type="text" value={editMedium} onChange={e => setEditMedium(e.target.value)} placeholder="English, Telugu" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowEditModal(false); setEditError(''); }} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
                <button type="submit" disabled={savingEdit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{savingEdit ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete class?</h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
              Delete class <strong>Class {className}</strong>? This will remove the class and its section/subject teacher assignments. Students in this class will keep their class value until you move them.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} disabled={deleting} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
              <button type="button" onClick={handleDeleteClass} disabled={deleting} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">{deleting ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
