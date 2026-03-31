import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Admin, Contact, School, User } from '../types';

type LoginRole = 'admin' | 'teacher' | 'parent' | 'student';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, students?: any[], role?: LoginRole) => Promise<boolean>;
  lastLoginError: string | null;
  logout: () => void;
  isAuthenticated: boolean;
  schools: School[];
  admins: Admin[];
  contacts: Contact[];
  addSchool: (school: Omit<School, 'id' | 'createdAt'>) => void;
  updateSchool: (schoolId: string, updates: Partial<School>) => void;
  updateSchoolStatus: (schoolId: string, status: 'active' | 'blocked') => void;
  deleteSchool: (schoolId: string) => void;
  addAdmin: (admin: Omit<Admin, 'id' | 'createdAt'>) => void;
  updateAdmin: (adminId: string, updates: Partial<Admin>) => void;
  updateAdminStatus: (adminId: string, status: 'active' | 'blocked') => void;
  updateAdminPassword: (adminId: string, newPassword: string) => void;
  deleteAdmin: (adminId: string) => void;
  addContact: (contact: Omit<Contact, 'id' | 'createdAt' | 'status'>) => void;
  updateContactStatus: (contactId: string, status: 'new' | 'contacted' | 'resolved') => void;
  deleteContact: (contactId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Developer user credentials - keeping this as it's required
const developerUser = {
  id: 'dev1',
  username: 'developer@dev.dev',
  password: 'dev123',
  role: 'developer' as const,
  name: 'System Developer'
};

export function AuthProvider({ children }: { children: ReactNode }) {
  // Load user from localStorage on mount
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        return JSON.parse(savedUser);
      }
    } catch (error) {
      console.error('Error loading user from localStorage:', error);
    }
    return null;
  });
  const [schools, setSchools] = useState<School[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [lastLoginError, setLastLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Persist user to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem('user', JSON.stringify(user));
      } catch (error) {
        console.error('Error saving user to localStorage:', error);
      }
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  // Load developer data from Redis on mount
  useEffect(() => {
    const loadDeveloperData = async () => {
      try {
        const serverUrl = import.meta.env.DEV
          ? window.location.origin
          : 'http://0.0.0.0:8000';
        
        const response = await fetch(`${serverUrl}/api/developer-data`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data) {
            if (Array.isArray(data.schools)) {
              setSchools(data.schools);
            }
            if (Array.isArray(data.admins)) {
              setAdmins(data.admins);
            }
            if (Array.isArray(data.contacts)) {
              setContacts(data.contacts);
            }
            console.log('Developer data loaded from PostgreSQL');
          }
        } else {
          console.log('No developer data found in database, using defaults');
        }
      } catch (error) {
        console.error('Error loading developer data from database:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDeveloperData();
  }, []);

  // Save developer data to PostgreSQL whenever it changes
  useEffect(() => {
    if (isLoading) return; // Don't save on initial load

    const saveDeveloperData = async () => {
      try {
        const serverUrl = import.meta.env.DEV
          ? window.location.origin
          : 'http://0.0.0.0:8000';
        
        const dataToSave = {
          schools,
          admins,
          contacts
        };

        const response = await fetch(`${serverUrl}/api/developer-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dataToSave),
        });

        if (response.ok) {
          console.log('Developer data saved to PostgreSQL');
        } else {
          console.error('Failed to save developer data to PostgreSQL');
        }
      } catch (error) {
        console.error('Error saving developer data to PostgreSQL:', error);
      }
    };

    // Debounce the save operation
    const timeoutId = setTimeout(saveDeveloperData, 1000);
    return () => clearTimeout(timeoutId);
  }, [schools, admins, contacts, isLoading]);

  const login = async (username: string, password: string, students: any[] = [], role?: LoginRole): Promise<boolean> => {
    setLastLoginError(null);
    // Check developer login (client-side only, no API) - role is ignored for developer
    if (username === developerUser.username && password === developerUser.password) {
      const { password: _, ...userWithoutPassword } = developerUser;
      setUser(userWithoutPassword);
      return true;
    }

    // Try server-side login for admin, teacher, parent, student
    try {
      const serverUrl = import.meta.env.DEV ? window.location.origin : (window as any).__SERVER_URL__ || 'http://0.0.0.0:8000';
      const response = await fetch(`${serverUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (response.status === 403) {
        const data = await response.json().catch(() => ({}));
        setLastLoginError(data?.error || 'Account is inactive or you have left the school. Please contact the school office.');
        return false;
      }
      if (response.ok) {
        const data = await response.json();
        const u = data?.user;
        if (u && ['admin', 'student', 'teacher', 'parent'].includes(u.role)) {
          // Enforce selected role: credentials must match the role chosen on login
          if (role != null && u.role !== role) {
            return false;
          }
          setUser({
            id: u.id,
            username: u.username,
            role: u.role,
            name: u.name || '',
            ...(u.role === 'student' && { admissionNumber: u.username }),
            ...(u.schoolId && { schoolId: u.schoolId }),
            ...(u.teacherId && { teacherId: u.teacherId }),
            ...(u.studentIds && { studentIds: u.studentIds })
          });
          return true;
        }
      }
    } catch (err) {
      console.warn('Auth API login failed, falling back to client-side check:', err);
    }

    // Fallback: client-side admin login (when API not available or failed)
    if (role == null || role === 'admin') {
      const adminRecord = admins.find(a => a.email === username || a.username === username);
      if (adminRecord && adminRecord.password === password) {
        const adminSchool = schools.find(s => s.id === adminRecord.schoolId);
        if (adminRecord.status === 'blocked' || (adminSchool && adminSchool.status === 'blocked')) {
          return false;
        }
        setUser({
          id: adminRecord.id,
          username: adminRecord.username,
          role: 'admin',
          name: adminRecord.name,
          schoolId: adminRecord.schoolId
        });
        return true;
      }
    }

    // Fallback: client-side student login (when API not available or failed)
    if (role == null || role === 'student') {
      const studentRecord = students.find(s => s.studentAadhar === username || s.admissionNumber === username);
      if (studentRecord && studentRecord.password === password) {
        if (studentRecord.status !== 'active') {
          setLastLoginError('Account is inactive or you have left the school. Please contact the school office.');
          return false; // Deactivated, transferred, or graduated students cannot access
        }
        const studentSchool = schools.find(s => s.id === studentRecord.schoolId);
        if (studentSchool && studentSchool.status === 'blocked') {
          return false;
        }
        setUser({
          id: studentRecord.id,
          username: studentRecord.admissionNumber,
          role: 'student',
          name: `${studentRecord.firstName} ${studentRecord.lastName || ''}`.trim(),
          admissionNumber: studentRecord.admissionNumber
        });
        return true;
      }
    }

    // Teacher and parent: only via API; no client-side fallback, so if role was teacher/parent and API failed or returned wrong role, we already returned false above
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  // School management functions
  const addSchool = (school: Omit<School, 'id' | 'createdAt'>) => {
    const newSchool: School = {
      ...school,
      id: `school${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setSchools([...schools, newSchool]);
  };

  const updateSchool = (schoolId: string, updates: Partial<School>) => {
    setSchools(schools.map(school =>
      school.id === schoolId ? { ...school, ...updates } : school
    ));
  };

  const updateSchoolStatus = (schoolId: string, status: 'active' | 'blocked') => {
    setSchools(schools.map(school =>
      school.id === schoolId ? { ...school, status } : school
    ));
  };

  const deleteSchool = (schoolId: string) => {
    setSchools(schools.filter(school => school.id !== schoolId));
  };

  // Admin management functions
  const addAdmin = (admin: Omit<Admin, 'id' | 'createdAt'>) => {
    const newAdmin: Admin = {
      ...admin,
      id: `admin${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setAdmins([...admins, newAdmin]);
  };

  const updateAdmin = (adminId: string, updates: Partial<Admin>) => {
    setAdmins(admins.map(admin =>
      admin.id === adminId ? { ...admin, ...updates } : admin
    ));
  };

  const updateAdminStatus = (adminId: string, status: 'active' | 'blocked') => {
    setAdmins(admins.map(admin =>
      admin.id === adminId ? { ...admin, status } : admin
    ));
  };

  const updateAdminPassword = (adminId: string, newPassword: string) => {
    setAdmins(admins.map(admin =>
      admin.id === adminId ? { ...admin, password: newPassword } : admin
    ));
  };

  const deleteAdmin = (adminId: string) => {
    setAdmins(admins.filter(admin => admin.id !== adminId));
  };

  const addContact = (contact: Omit<Contact, 'id' | 'createdAt' | 'status'>) => {
    const newContact = {
      ...contact,
      id: `contact-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'new' as const
    };
    setContacts(prev => [newContact, ...prev]);
  };

  const updateContactStatus = (contactId: string, status: 'new' | 'contacted' | 'resolved') => {
    setContacts(prev =>
      prev.map(contact =>
        contact.id === contactId ? { ...contact, status } : contact
      )
    );
  };

  const deleteContact = (contactId: string) => {
    setContacts(prev => prev.filter(contact => contact.id !== contactId));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        lastLoginError,
        logout,
        isAuthenticated: !!user,
        schools,
        admins,
        contacts,
        addSchool,
        updateSchool,
        updateSchoolStatus,
        deleteSchool,
        addAdmin,
        updateAdmin,
        updateAdminStatus,
        updateAdminPassword,
        deleteAdmin,
        addContact,
        updateContactStatus,
        deleteContact
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}