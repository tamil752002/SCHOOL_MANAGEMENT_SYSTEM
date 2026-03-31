import { Database, Edit, Eye, Filter, LogOut, Plus, RefreshCw, Search, UserCheck, UserCircle, UserMinus, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { Teacher, Subject } from '../../types';
import { sortClassNamesArray } from '../../utils/sortClasses';

const getApiBase = () => (import.meta.env.DEV ? window.location.origin : 'http://0.0.0.0:8000');

interface TeacherManagementProps {
  onViewProfile?: (teacherId: string) => void;
}

export function TeacherManagement({ onViewProfile }: TeacherManagementProps = {}) {
  const { user } = useAuth();
  const { teachers, subjects, refreshTeachers } = useSchoolData();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'left'>('active');
  const [rejoinModal, setRejoinModal] = useState<Teacher | null>(null);
  const [rejoinDate, setRejoinDate] = useState('');
  const [rejoinLoading, setRejoinLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    email: '',
    phoneNumber: '',
    salary: '' as string | number,
    joinDate: '',
    subjectIds: [] as string[],
    classes: [] as { className: string; section: string; subjectId: string; subjectName?: string; isIncharge: boolean }[]
  });

  const schoolId = (user as { schoolId?: string })?.schoolId;
  const classNames = sortClassNamesArray(['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);
  const sections = ['A', 'B', 'C'];

  const filteredTeachers = useMemo(() => {
    let list = teachers;
    if (statusFilter === 'active') list = list.filter((t) => (t.status || 'active') === 'active');
    else if (statusFilter === 'inactive') list = list.filter((t) => t.status === 'inactive');
    else if (statusFilter === 'left') list = list.filter((t) => t.status === 'left');
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (t) =>
          (t.name || '').toLowerCase().includes(term) ||
          (t.username || '').toLowerCase().includes(term) ||
          (t.email || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [teachers, searchTerm, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setFormData({
      name: '',
      username: '',
      password: '',
      email: '',
      phoneNumber: '',
      salary: '',
      joinDate: new Date().toISOString().split('T')[0],
      subjectIds: [],
      classes: []
    });
    setShowForm(true);
  };

  const openEdit = (t: Teacher) => {
    setEditing(t);
    setFormData({
      name: t.name || '',
      username: t.username || '',
      password: '',
      email: t.email || '',
      phoneNumber: t.phoneNumber || '',
      salary: t.salary ?? '',
      joinDate: t.joinDate || '',
      subjectIds: (t.subjects || []).map(s => s.id),
      classes: (t.classes || []).map(c => ({
        className: c.className,
        section: c.section || 'A',
        subjectId: c.subjectId || '',
        subjectName: c.subjectName,
        isIncharge: !!c.isIncharge
      }))
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;
    const classesToSend = formData.subjectIds.length === 1
      ? formData.classes.map(c => ({ ...c, subjectId: c.subjectId || formData.subjectIds[0] }))
      : formData.classes;
    const hasMissingSubject = classesToSend.some(c => !c.subjectId || !formData.subjectIds.includes(c.subjectId));
    if (hasMissingSubject) {
      alert('Please select a subject for each class assignment.');
      return;
    }
    setLoading(true);
    try {
      const base = getApiBase();
      const body = {
        schoolId,
        name: formData.name,
        username: formData.username,
        password: formData.password || (editing ? undefined : 'temp123'),
        email: formData.email || undefined,
        phoneNumber: formData.phoneNumber || undefined,
        salary: formData.salary === '' ? undefined : Number(formData.salary),
        joinDate: formData.joinDate || undefined,
        subjectIds: formData.subjectIds,
        classes: classesToSend
      };
      if (editing) {
        await fetch(`${base}/api/teachers/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, password: body.password || undefined })
        });
      } else {
        await fetch(`${base}/api/teachers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }
      await refreshTeachers();
      setShowForm(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save teacher');
    } finally {
      setLoading(false);
    }
  };

  const toggleSubject = (id: string) => {
    setFormData(prev => ({
      ...prev,
      subjectIds: prev.subjectIds.includes(id) ? prev.subjectIds.filter(x => x !== id) : [...prev.subjectIds, id]
    }));
  };

  const addClass = () => {
    const defaultSubjectId = formData.subjectIds.length === 1 ? formData.subjectIds[0] : '';
    setFormData(prev => ({
      ...prev,
      classes: [...prev.classes, { className: classNames[0] || '', section: 'A', subjectId: defaultSubjectId, isIncharge: false }]
    }));
  };

  const updateClass = (index: number, field: string, value: string | boolean) => {
    setFormData(prev => {
      const next = [...prev.classes];
      const c = next[index] as Record<string, unknown>;
      c[field] = value;
      return { ...prev, classes: next };
    });
  };

  const removeClass = (index: number) => {
    setFormData(prev => ({ ...prev, classes: prev.classes.filter((_, i) => i !== index) }));
  };

  const handleSeedTeachers = async () => {
    if (!schoolId) return;
    setSeeding(true);
    try {
      const res = await fetch(`${getApiBase()}/api/teachers/seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Seed failed');
      await refreshTeachers();
      alert(data.message || `Seeded ${data.count || 0} teachers. Default password: Teacher@1`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to seed teachers');
    } finally {
      setSeeding(false);
    }
  };

  const handleDeactivateTeacher = async (t: Teacher) => {
    if (!window.confirm(`Mark "${t.name}" as inactive? They can be reactivated later from the Inactive filter.`)) return;
    try {
      const res = await fetch(`${getApiBase()}/api/teachers/${t.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'inactive' })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to deactivate teacher');
      }
      await refreshTeachers();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to deactivate teacher');
    }
  };

  const handleActivateTeacher = async (t: Teacher) => {
    try {
      const res = await fetch(`${getApiBase()}/api/teachers/${t.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to activate teacher');
      }
      await refreshTeachers();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to activate teacher');
    }
  };

  const handleMarkAsLeft = async (t: Teacher) => {
    if (!window.confirm(`Mark "${t.name}" as left? They can re-join later.`)) return;
    try {
      const res = await fetch(`${getApiBase()}/api/teachers/${t.id}/leave`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to mark as left');
      await refreshTeachers();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to mark as left');
    }
  };

  const handleRejoinTeacher = async () => {
    if (!rejoinModal) return;
    setRejoinLoading(true);
    try {
      const body = rejoinDate ? { joinDate: rejoinDate } : {};
      const res = await fetch(`${getApiBase()}/api/teachers/${rejoinModal.id}/rejoin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Failed to re-join');
      setRejoinModal(null);
      setRejoinDate('');
      await refreshTeachers();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to re-join');
    } finally {
      setRejoinLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Teacher Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage teacher records and information.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Teacher</span>
        </button>
      </div>

      {/* Search and filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search by name or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive' | 'left')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="active">Active</option>
              <option value="left">Left</option>
              <option value="inactive">Inactive</option>
              <option value="all">All Status</option>
            </select>
            <button
              onClick={() => refreshTeachers()}
              className="flex items-center space-x-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleSeedTeachers}
              disabled={seeding}
              className="flex items-center space-x-2 bg-amber-600 text-white px-4 py-3 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
              title="Create sample teachers with subjects and class assignments"
            >
              <Database className="w-4 h-4" />
              <span>{seeding ? 'Seeding…' : 'Seed sample teachers'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats - only active counted in total */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Total Teachers</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                {teachers.filter((t) => (t.status || 'active') === 'active').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
              <Search className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 dark:text-green-400 text-sm font-medium">Active Teachers</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                {teachers.filter((t) => (t.status || 'active') === 'active').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-600 dark:bg-green-500 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">Subjects</p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-300">
                {new Set(teachers.filter((t) => (t.status || 'active') === 'active').flatMap((t) => (t.subjects || []).map((s) => s.id))).size}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-600 dark:bg-yellow-500 rounded-lg flex items-center justify-center">
              <Filter className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">Search Results</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">{filteredTeachers.length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-600 dark:bg-purple-500 rounded-lg flex items-center justify-center">
              <Search className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Teacher table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subjects</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Classes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Salary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    {teachers.length === 0 ? 'No teachers yet. Add a teacher to get started.' : 'No teachers match your search.'}
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserCircle className="w-8 h-8 text-gray-400 mr-2" />
                        <span className="font-medium text-gray-900 dark:text-white">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {(t.subjects || []).map((s) => s.name).join(', ') || '–'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {(t.classes || []).map((c) => `${c.className}-${c.section}${c.subjectName ? ` (${c.subjectName})` : ''}${c.isIncharge ? ' Incharge' : ''}`).join(', ') || '–'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {t.salary != null ? `₹${Number(t.salary).toLocaleString()}` : '–'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        t.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        t.status === 'left' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {t.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {t.status === 'inactive' && (
                          <button
                            onClick={() => handleActivateTeacher(t)}
                            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title="Activate Teacher"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                        {t.status === 'left' && (
                          <button
                            onClick={() => { setRejoinModal(t); setRejoinDate(new Date().toISOString().split('T')[0]); }}
                            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-lg transition-colors"
                            title="Re-join"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                        {onViewProfile && (
                          <button
                            onClick={() => onViewProfile(t.id)}
                            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="View Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(t)}
                          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title="Edit Teacher"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {(t.status || 'active') === 'active' && (
                          <>
                            <button
                              onClick={() => handleMarkAsLeft(t)}
                              className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                              title="Mark as left"
                            >
                              <LogOut className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeactivateTeacher(t)}
                              className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                              title="Deactivate Teacher"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editing ? 'Edit Teacher' : 'Add Teacher'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={e => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  required
                  disabled={!!editing}
                />
              </div>
              {!editing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    required={!editing}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phoneNumber}
                    onChange={e => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Salary</label>
                  <input
                    type="number"
                    value={formData.salary}
                    onChange={e => setFormData(prev => ({ ...prev, salary: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Join Date</label>
                  <input
                    type="date"
                    value={formData.joinDate}
                    onChange={e => setFormData(prev => ({ ...prev, joinDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subjects</label>
                <div className="flex flex-wrap gap-2">
                  {(subjects || []).map((s: Subject) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSubject(s.id)}
                      className={`px-3 py-1 rounded-lg text-sm ${formData.subjectIds.includes(s.id) ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Classes</label>
                  <button type="button" onClick={addClass} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    + Add class
                  </button>
                </div>
                {formData.classes.map((c, idx) => (
                  <div key={idx} className="flex flex-wrap gap-2 items-center mb-2">
                    <select
                      value={c.className}
                      onChange={e => updateClass(idx, 'className', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    >
                      {classNames.map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    <select
                      value={c.section}
                      onChange={e => updateClass(idx, 'section', e.target.value)}
                      className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    >
                      {sections.map(sec => (
                        <option key={sec} value={sec}>{sec}</option>
                      ))}
                    </select>
                    {formData.subjectIds.length === 1 ? (
                      <span className="text-sm text-gray-600 dark:text-gray-400 px-2 py-1.5">
                        Subject: {(subjects || []).find(s => s.id === formData.subjectIds[0])?.name || '–'}
                      </span>
                    ) : (
                      <select
                        value={c.subjectId}
                        onChange={e => updateClass(idx, 'subjectId', e.target.value)}
                        className="min-w-[100px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        required
                      >
                        <option value="">Subject</option>
                        {(subjects || []).filter(s => formData.subjectIds.includes(s.id)).map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    )}
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={c.isIncharge}
                        onChange={e => updateClass(idx, 'isIncharge', e.target.checked)}
                      />
                      Incharge
                    </label>
                    <button type="button" onClick={() => removeClass(idx)} className="text-red-600 dark:text-red-400 p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {loading ? 'Saving...' : (editing ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rejoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !rejoinLoading && setRejoinModal(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Re-join teacher</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{rejoinModal.name}</p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Re-join date (optional)</label>
              <input
                type="date"
                value={rejoinDate}
                onChange={e => setRejoinDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => { setRejoinModal(null); setRejoinDate(''); }}
                disabled={rejoinLoading}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleRejoinTeacher}
                disabled={rejoinLoading}
                className="px-4 py-2 rounded-lg gradient-primary text-white font-medium disabled:opacity-50"
              >
                {rejoinLoading ? 'Saving...' : 'Re-join'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
