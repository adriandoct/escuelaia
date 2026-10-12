"use strict";

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Role = 'administrador' | 'encargado_orden' | 'docente';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
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

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load custom role mappings
    const savedRoles = localStorage.getItem('dojoia_users_roles');
    if (savedRoles) {
      try {
        setUsersRolesMap(JSON.parse(savedRoles));
      } catch (e) {
        console.error('Error loading stored user roles:', e);
      }
    }

    // Load custom passwords
    const savedPasswords = localStorage.getItem('dojoia_users_passwords');
    if (savedPasswords) {
      try {
        setUsersPasswordsMap({ ...DEFAULT_USERS_PASSWORDS, ...JSON.parse(savedPasswords) });
      } catch (e) {
        console.error('Error loading stored user passwords:', e);
      }
    } else {
      localStorage.setItem('dojoia_users_passwords', JSON.stringify(DEFAULT_USERS_PASSWORDS));
    }

    // Load active session
    const savedUser = localStorage.getItem('dojoia_active_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Error loading stored active user:', e);
      }
    } else {
      // Default initial session: Superadmin admin@admin.com
      const defaultUser: User = {
        id: 'super-admin-1',
        name: 'Administrador General',
        email: 'admin@admin.com',
        role: 'administrador',
        isSuperAdmin: true,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200',
      };
      setUser(defaultUser);
      localStorage.setItem('dojoia_active_user', JSON.stringify(defaultUser));
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
    setIsLoginModalOpen(false);
    return { success: true };
  };

  const logout = () => {
    saveActiveUser(null);
    setIsLoginModalOpen(true);
  };

  const assignUserRole = (email: string, newRole: Role) => {
    const cleanEmail = email.trim().toLowerCase();
    const updatedMap = { ...usersRolesMap, [cleanEmail]: newRole };
    setUsersRolesMap(updatedMap);
    localStorage.setItem('dojoia_users_roles', JSON.stringify(updatedMap));

    // If current logged-in user is updated, sync their active session role
    if (user && user.email.toLowerCase() === cleanEmail) {
      saveActiveUser({ ...user, role: newRole });
    }
  };

  const assignUserPassword = (email: string, newPassword: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const updatedPasswords = { ...usersPasswordsMap, [cleanEmail]: newPassword };
    setUsersPasswordsMap(updatedPasswords);
    localStorage.setItem('dojoia_users_passwords', JSON.stringify(updatedPasswords));
  };

  const addUserAccount = (email: string, role: Role, password?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const updatedRoles = { ...usersRolesMap, [cleanEmail]: role };
    setUsersRolesMap(updatedRoles);
    localStorage.setItem('dojoia_users_roles', JSON.stringify(updatedRoles));

    if (password) {
      const updatedPasswords = { ...usersPasswordsMap, [cleanEmail]: password };
      setUsersPasswordsMap(updatedPasswords);
      localStorage.setItem('dojoia_users_passwords', JSON.stringify(updatedPasswords));
    }
  };

  const updateUserAccount = (oldEmail: string, newEmail: string, newRole: Role, newPassword?: string) => {
    const cleanOld = oldEmail.trim().toLowerCase();
    const cleanNew = newEmail.trim().toLowerCase();

    const updatedRoles = { ...usersRolesMap };
    delete updatedRoles[cleanOld];
    updatedRoles[cleanNew] = newRole;
    setUsersRolesMap(updatedRoles);
    localStorage.setItem('dojoia_users_roles', JSON.stringify(updatedRoles));

    const updatedPasswords = { ...usersPasswordsMap };
    const prevPass = updatedPasswords[cleanOld];
    delete updatedPasswords[cleanOld];
    if (newPassword) {
      updatedPasswords[cleanNew] = newPassword;
    } else if (prevPass) {
      updatedPasswords[cleanNew] = prevPass;
    }
    setUsersPasswordsMap(updatedPasswords);
    localStorage.setItem('dojoia_users_passwords', JSON.stringify(updatedPasswords));

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
    localStorage.setItem('dojoia_users_roles', JSON.stringify(updatedRoles));

    const updatedPasswords = { ...usersPasswordsMap };
    delete updatedPasswords[cleanEmail];
    setUsersPasswordsMap(updatedPasswords);
    localStorage.setItem('dojoia_users_passwords', JSON.stringify(updatedPasswords));
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
