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
  assignUserRole: (email: string, newRole: Role) => void;
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [usersRolesMap, setUsersRolesMap] = useState<Record<string, Role>>(DEFAULT_USERS_ROLES);

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

  const loginWithCredentials = (email: string, pass: string): { success: boolean; error?: string } => {
    const cleanEmail = email.trim().toLowerCase();
    
    if (cleanEmail === 'admin@admin.com') {
      if (pass === '12345678Cecyte') {
        const adminUser: User = {
          id: 'super-admin-1',
          name: 'Administrador General',
          email: 'admin@admin.com',
          role: 'administrador',
          isSuperAdmin: true,
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200',
        };
        saveActiveUser(adminUser);
        setIsLoginModalOpen(false);
        return { success: true };
      } else {
        return { success: false, error: 'Contraseña incorrecta para admin@admin.com' };
      }
    }

    return { success: false, error: 'Correo no registrado para acceso por clave. Utiliza la opción de Gmail Institucional @cecytebc.edu.mx' };
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
    let role: Role = roleOverride || usersRolesMap[cleanEmail] || 'docente';
    
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
        assignUserRole,
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
