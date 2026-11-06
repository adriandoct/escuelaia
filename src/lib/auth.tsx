"use strict";

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from './db';

export type Role = 'administrador' | 'encargado_orden' | 'docente' | 'tutor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  matricula?: string;
  avatarUrl?: string;
  isSuperAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  loginWithCredentials: (email: string, pass: string) => { success: boolean; error?: string };
  loginWithGoogle: (email: string, name?: string, roleOverride?: Role) => { success: boolean; error?: string };
  loginWithMatricula: (matricula: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  usersRolesMap: Record<string, Role>;
  usersPasswordsMap: Record<string, string>;
  assignUserRole: (email: string, newRole: Role) => void;
  assignUserPassword: (email: string, newPassword: string) => void;
  addUserAccount: (email: string, role: Role, password?: string) => void;
  updateUserAccount: (oldEmail: string, newEmail: string, newRole: Role, newPassword?: string) => void;
  deleteUserAccount: (email: string) => void;
  validateInstitutionalDomain: (email: string) => boolean;
}

const DEFAULT_USERS_ROLES: Record<string, Role> = {
  'admin@admin.com': 'administrador',
  'admin.general@cecytebc.edu.mx': 'administrador',
  'orden.general@cecytebc.edu.mx': 'encargado_orden',
  'prefecto.juan@cecytebc.edu.mx': 'encargado_orden',
  'docente.marcos@cecytebc.edu.mx': 'docente',
  'profesora.mariana@cecytebc.edu.mx': 'docente',
};

const DEFAULT_USERS_PASSWORDS: Record<string, string> = {
  'admin@admin.com': '12345678Cecyte',
  'admin.general@cecytebc.edu.mx': 'Cecyte2026!',
  'orden.general@cecytebc.edu.mx': 'Cecyte2026!',
  'prefecto.juan@cecytebc.edu.mx': 'Cecyte2026!',
  'docente.marcos@cecytebc.edu.mx': 'Cecyte2026!',
  'profesora.mariana@cecytebc.edu.mx': 'Cecyte2026!',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [usersRolesMap, setUsersRolesMap] = useState<Record<string, Role>>(DEFAULT_USERS_ROLES);
  const [usersPasswordsMap, setUsersPasswordsMap] = useState<Record<string, string>>(DEFAULT_USERS_PASSWORDS);

  const persistRolesLocally = (roles?: Record<string, Role>, passwords?: Record<string, string>) => {
    if (typeof window === 'undefined') return;
    try {
      if (roles) {
        const serializedRoles = JSON.stringify(roles);
        localStorage.setItem('dojoia_users_roles', serializedRoles);
        localStorage.setItem('dojoia_users_roles_vault', serializedRoles);
      }
      if (passwords) {
        const serializedPass = JSON.stringify(passwords);
        localStorage.setItem('dojoia_users_passwords', serializedPass);
        localStorage.setItem('dojoia_users_passwords_vault', serializedPass);
      }
    } catch (e) {
      console.error('Error saving roles/passwords to local storage:', e);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Cargar roles locales de ambas bóvedas combinados con los por defecto
    let initialRoles: Record<string, Role> = { ...DEFAULT_USERS_ROLES };
    const savedRoles = localStorage.getItem('dojoia_users_roles') || localStorage.getItem('dojoia_users_roles_vault');
    if (savedRoles) {
      try {
        const parsed = JSON.parse(savedRoles);
        if (parsed && typeof parsed === 'object') {
          initialRoles = { ...initialRoles, ...parsed };
        }
      } catch (e) {
        console.error('Error loading stored user roles:', e);
      }
    }
    setUsersRolesMap(initialRoles);

    // 2. Cargar contraseñas locales
    let initialPasswords: Record<string, string> = { ...DEFAULT_USERS_PASSWORDS };
    const savedPasswords = localStorage.getItem('dojoia_users_passwords') || localStorage.getItem('dojoia_users_passwords_vault');
    if (savedPasswords) {
      try {
        const parsedPass = JSON.parse(savedPasswords);
        if (parsedPass && typeof parsedPass === 'object') {
          initialPasswords = { ...initialPasswords, ...parsedPass };
        }
      } catch (e) {
        console.error('Error loading stored user passwords:', e);
      }
    }
    setUsersPasswordsMap(initialPasswords);
    persistRolesLocally(initialRoles, initialPasswords);

    // 3. Sincronizar con el servidor (/api/roles) para persistencia permanente en la nube
    fetch('/api/roles')
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          if (data.roles && typeof data.roles === 'object') {
            setUsersRolesMap(prev => {
              const merged = { ...DEFAULT_USERS_ROLES, ...prev, ...data.roles };
              persistRolesLocally(merged);
              return merged;
            });
          }
          if (data.passwords && typeof data.passwords === 'object') {
            setUsersPasswordsMap(prev => {
              const mergedPass = { ...DEFAULT_USERS_PASSWORDS, ...prev, ...data.passwords };
              persistRolesLocally(undefined, mergedPass);
              return mergedPass;
            });
          }
        }
      })
      .catch(err => {
        console.warn('Nota: Trabajando con roles locales offline:', err);
      });

    // Load active session (only if explicitly authenticated by the user)
    const savedUser = localStorage.getItem('dojoia_active_user');
    const wasExplicitlyLoggedIn = localStorage.getItem('dojoia_user_explicitly_logged_in') === 'true';

    if (savedUser && wasExplicitlyLoggedIn) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.email) {
          setUser(parsed);
        } else {
          setUser(null);
          setIsLoginModalOpen(true);
        }
      } catch (e) {
        console.error('Error loading stored active user:', e);
        setUser(null);
        setIsLoginModalOpen(true);
      }
    } else {
      // By default: DO NOT enter as administrator. Always require explicit authentication.
      localStorage.removeItem('dojoia_active_user');
      localStorage.removeItem('dojoia_user_explicitly_logged_in');
      setUser(null);
      setIsLoginModalOpen(true);
    }
  }, []);

  const saveActiveUser = (u: User | null) => {
    setUser(u);
    if (u) {
      localStorage.setItem('dojoia_active_user', JSON.stringify(u));
    } else {
      localStorage.removeItem('dojoia_active_user');
    }
  };

  const validateInstitutionalDomain = (email: string): boolean => {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === 'admin@admin.com') return true;
    return cleanEmail.endsWith('@cecytebc.edu.mx');
  };

  // Direct login with email and password for ANY registered user
  const loginWithCredentials = (email: string, pass: string): { success: boolean; error?: string } => {
    const cleanEmail = email.trim().toLowerCase();

    // Check if user exists in the system
    const userRole = usersRolesMap[cleanEmail];
    if (!userRole) {
      return { 
        success: false, 
        error: `El usuario '${cleanEmail}' no está registrado en el directorio institucional.` 
      };
    }

    // Check password
    const expectedPassword = usersPasswordsMap[cleanEmail] || (cleanEmail === 'admin@admin.com' ? '12345678Cecyte' : undefined);
    if (!expectedPassword) {
      return {
        success: false,
        error: 'Este usuario no tiene contraseña asignada aún. El Administrador debe asignarle una en la sección de Permisos Roles.'
      };
    }

    if (pass !== expectedPassword) {
      return { 
        success: false, 
        error: `Contraseña incorrecta para ${cleanEmail}. Verifica mayúsculas y minúsculas.` 
      };
    }

    const userName = cleanEmail === 'admin@admin.com'
      ? 'Administrador General'
      : cleanEmail.split('@')[0].replace('.', ' ').toUpperCase();

    const loggedUser: User = {
      id: `usr-${Date.now()}`,
      name: userName,
      email: cleanEmail,
      role: userRole,
      isSuperAdmin: cleanEmail === 'admin@admin.com',
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanEmail}`,
    };

    saveActiveUser(loggedUser);
    localStorage.setItem('dojoia_user_explicitly_logged_in', 'true');
    setIsLoginModalOpen(false);
    return { success: true };
  };

  const loginWithGoogle = (
    email: string,
    name?: string,
    roleOverride?: Role
  ): { success: boolean; error?: string } => {
    const cleanEmail = email.trim().toLowerCase();

    if (!validateInstitutionalDomain(cleanEmail)) {
      return {
        success: false,
        error: 'Acceso Denegado. Solo se permiten cuentas institucionales con dominio @cecytebc.edu.mx',
      };
    }

    // Determine role
    const role: Role = roleOverride || usersRolesMap[cleanEmail] || 'docente';
    
    // Extract default name if not provided
    const userName = name || cleanEmail.split('@')[0].replace('.', ' ').toUpperCase();

    const loggedUser: User = {
      id: `usr-${Date.now()}`,
      name: userName,
      email: cleanEmail,
      role: role,
      isSuperAdmin: cleanEmail === 'admin@admin.com',
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanEmail}`,
    };

    saveActiveUser(loggedUser);
    localStorage.setItem('dojoia_user_explicitly_logged_in', 'true');
    setIsLoginModalOpen(false);
    return { success: true };
  };

  const loginWithMatricula = async (matricula: string): Promise<{ success: boolean; error?: string }> => {
    const cleanMat = String(matricula || '').trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!cleanMat) {
      return { success: false, error: 'Por favor ingresa la matrícula del alumno (14 dígitos).' };
    }

    try {
      const student = await db.getAlumnoByQR(cleanMat);
      if (!student) {
        return { 
          success: false, 
          error: `No se encontró ningún alumno con la matrícula '${cleanMat}'. Verifica que los dígitos sean correctos.` 
        };
      }

      const tutorName = student.tutor && student.tutor !== 'No asignado' && !student.tutor.toLowerCase().startsWith('tutor de')
        ? student.tutor
        : `Tutor de ${student.nombre}`;

      const loggedUser: User = {
        id: `tutor-${student.matricula}`,
        name: tutorName,
        email: `tutor.${student.matricula}@cecytebc.edu.mx`,
        role: 'tutor',
        matricula: student.matricula,
        avatarUrl: student.foto_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${student.matricula}`,
      };

      saveActiveUser(loggedUser);
      localStorage.setItem('dojoia_user_explicitly_logged_in', 'true');
      setIsLoginModalOpen(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error al validar matrícula.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('dojoia_user_explicitly_logged_in');
    saveActiveUser(null);
    setIsLoginModalOpen(true);
  };

  const assignUserRole = (email: string, newRole: Role) => {
    const cleanEmail = email.trim().toLowerCase();
    const updatedMap = { ...usersRolesMap, [cleanEmail]: newRole };
    setUsersRolesMap(updatedMap);
    persistRolesLocally(updatedMap);

    // Persistir en servidor permanentemente
    fetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'assignRole', email: cleanEmail, role: newRole })
    }).catch(err => console.error('Error sincronizando rol en servidor:', err));

    // If current logged-in user is updated, sync their active session role
    if (user && user.email.toLowerCase() === cleanEmail) {
      saveActiveUser({ ...user, role: newRole });
    }
  };

  const assignUserPassword = (email: string, newPassword: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const updatedPasswords = { ...usersPasswordsMap, [cleanEmail]: newPassword };
    setUsersPasswordsMap(updatedPasswords);
    persistRolesLocally(usersRolesMap, updatedPasswords);

    // Persistir en servidor permanentemente
    fetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'assignPassword', email: cleanEmail, password: newPassword })
    }).catch(err => console.error('Error sincronizando contraseña en servidor:', err));
  };

  const addUserAccount = (email: string, role: Role, password?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const updatedRoles = { ...usersRolesMap, [cleanEmail]: role };
    setUsersRolesMap(updatedRoles);

    let updatedPasswords = usersPasswordsMap;
    if (password) {
      updatedPasswords = { ...usersPasswordsMap, [cleanEmail]: password };
      setUsersPasswordsMap(updatedPasswords);
    }
    persistRolesLocally(updatedRoles, updatedPasswords);

    // Persistir en servidor permanentemente
    fetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addUser', email: cleanEmail, role, password })
    }).catch(err => console.error('Error sincronizando nuevo usuario en servidor:', err));
  };

  const updateUserAccount = (oldEmail: string, newEmail: string, newRole: Role, newPassword?: string) => {
    const cleanOld = oldEmail.trim().toLowerCase();
    const cleanNew = newEmail.trim().toLowerCase();

    const updatedRoles = { ...usersRolesMap };
    if (cleanOld !== cleanNew) {
      delete updatedRoles[cleanOld];
    }
    updatedRoles[cleanNew] = newRole;
    setUsersRolesMap(updatedRoles);

    const updatedPasswords = { ...usersPasswordsMap };
    const prevPass = updatedPasswords[cleanOld];
    if (cleanOld !== cleanNew) {
      delete updatedPasswords[cleanOld];
    }
    if (newPassword) {
      updatedPasswords[cleanNew] = newPassword;
    } else if (prevPass) {
      updatedPasswords[cleanNew] = prevPass;
    }
    setUsersPasswordsMap(updatedPasswords);
    persistRolesLocally(updatedRoles, updatedPasswords);

    // Persistir en servidor permanentemente
    fetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateUser', oldEmail: cleanOld, newEmail: cleanNew, role: newRole, password: newPassword })
    }).catch(err => console.error('Error sincronizando edición de usuario en servidor:', err));

    // Sync active session if it was this user
    if (user && user.email.toLowerCase() === cleanOld) {
      saveActiveUser({
        ...user,
        email: cleanNew,
        name: cleanNew.split('@')[0].replace('.', ' ').toUpperCase(),
        role: newRole,
      });
    }
  };

  const deleteUserAccount = (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === 'admin@admin.com') {
      alert('La cuenta de Superadministrador principal no puede ser eliminada.');
      return;
    }

    const updatedRoles = { ...usersRolesMap };
    delete updatedRoles[cleanEmail];
    setUsersRolesMap(updatedRoles);

    const updatedPasswords = { ...usersPasswordsMap };
    delete updatedPasswords[cleanEmail];
    setUsersPasswordsMap(updatedPasswords);

    persistRolesLocally(updatedRoles, updatedPasswords);

    // Persistir en servidor permanentemente
    fetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deleteUser', email: cleanEmail })
    }).catch(err => console.error('Error sincronizando eliminación de usuario en servidor:', err));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoginModalOpen,
        openLoginModal: () => setIsLoginModalOpen(true),
        closeLoginModal: () => setIsLoginModalOpen(false),
        loginWithCredentials,
        loginWithGoogle,
        loginWithMatricula,
        logout,
        usersRolesMap,
        usersPasswordsMap,
        assignUserRole,
        assignUserPassword,
        addUserAccount,
        updateUserAccount,
        deleteUserAccount,
        validateInstitutionalDomain,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
