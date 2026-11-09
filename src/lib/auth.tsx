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
  numero_empleado?: string;
  phone?: string;
  avatarUrl?: string;
  isSuperAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  loginWithCredentials: (emailOrEmployeeNum: string, pass: string) => { success: boolean; error?: string };
  loginWithGoogle: (email: string, name?: string, roleOverride?: Role) => { success: boolean; error?: string };
  loginWithMatricula: (matricula: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  usersRolesMap: Record<string, Role>;
  usersPasswordsMap: Record<string, string>;
  usersNamesMap: Record<string, string>;
  usersEmployeeNumbersMap: Record<string, string>;
  usersPhonesMap: Record<string, string>;
  assignUserRole: (email: string, newRole: Role) => void;
  assignUserPassword: (email: string, newPassword: string) => void;
  addUserAccount: (email: string, role: Role, password?: string, name?: string, numero_empleado?: string, phone?: string) => void;
  updateUserAccount: (oldEmail: string, newEmail: string, newRole: Role, newPassword?: string, name?: string, numero_empleado?: string, phone?: string) => void;
  deleteUserAccount: (email: string) => void;
  importUsersBulk: (users: Array<{ name: string; numero_empleado: string; email: string; phone?: string; celular?: string; role?: Role; password?: string }>) => Promise<{ success: boolean; count: number; error?: string }>;
  validateInstitutionalDomain: (email: string) => boolean;
}

const DEFAULT_USERS_ROLES: Record<string, Role> = {
  'admin@admin.com': 'administrador',
  'admin.general@cecytebc.edu.mx': 'administrador',
  'orden.general@cecytebc.edu.mx': 'encargado_orden',
  'prefecto.juan@cecytebc.edu.mx': 'encargado_orden',
  'docente.marcos@cecytebc.edu.mx': 'docente',
  'profesora.mariana@cecytebc.edu.mx': 'docente',
  'normanroy.cardenas@cecytebc.edu.mx': 'docente',
  'natanael.duran@cecytebc.edu.mx': 'docente',
  'maquirre@cecytebc.edu.mx': 'docente',
  'martin.garibay@cecytebc.edu.mx': 'docente',
  'luciaedith.loera@cecytebc.edu.mx': 'docente',
  'jose.ruiz@cecytebc.edu.mx': 'docente',
  'roxannejudith.moreno@cecytebc.edu.mx': 'docente',
  'oswaldo.sainz@cecytebc.edu.mx': 'docente',
  'leonardo.gallegos@cecytebc.edu.mx': 'docente',
  'beatriz.acosta@cecytebc.edu.mx': 'docente',
  'lindylisay.leija@cecytebc.edu.mx': 'docente',
  'filiberto.domingues@cecytebc.edu.mx': 'docente',
  'filiberto.dominguez@cecytebc.edu.mx': 'docente',
  'jfigueroa@cecytebc.edu.mx': 'administrador',
  'alcarranza@cecytebc.edu.mx': 'administrador',
  'oacontreras@cecytebc.edu.mx': 'administrador',
  'anunez@cecytebc.edu.mx': 'administrador',
  'emora@cecytebc.edu.mx': 'administrador',
  'apulido@cecytebc.edu.mx': 'administrador',
  'sjsanchez@cecytebc.edu.mx': 'administrador',
  'kshernandez@cecytebc.edu.mx': 'administrador',
  'adrian.silva@cecytebc.edu.mx': 'administrador',
  'sanjuana.aguas@cecytebc.edu.mx': 'administrador',
  'finzunza@cecytebc.edu.mx': 'administrador',
  'gmoreno@cecytebc.edu.mx': 'administrador',
  'ifdelaguila@cecytebc.edu.mx': 'administrador',
  'freddy.martinez@cecytebc.edu.mx': 'administrador',
  'ciarenas@cecytebc.edu.mx': 'administrador',
  'mmoroyoqui@cecytebc.edu.mx': 'administrador',
  'aeramirez@cecytebc.edu.mx': 'administrador'
};

const DEFAULT_USERS_PASSWORDS: Record<string, string> = {
  'admin@admin.com': '12345678Cecyte',
  'admin.general@cecytebc.edu.mx': 'Cecyte2026!',
  'orden.general@cecytebc.edu.mx': 'Cecyte2026!',
  'prefecto.juan@cecytebc.edu.mx': 'Cecyte2026!',
  'docente.marcos@cecytebc.edu.mx': 'Cecyte2026!',
  'profesora.mariana@cecytebc.edu.mx': 'Cecyte2026!',
  'normanroy.cardenas@cecytebc.edu.mx': '5014',
  'natanael.duran@cecytebc.edu.mx': '3499',
  'maquirre@cecytebc.edu.mx': '3495',
  'martin.garibay@cecytebc.edu.mx': '4415',
  'luciaedith.loera@cecytebc.edu.mx': '3376',
  'jose.ruiz@cecytebc.edu.mx': '6868',
  'roxannejudith.moreno@cecytebc.edu.mx': '5016',
  'oswaldo.sainz@cecytebc.edu.mx': '04731',
  'leonardo.gallegos@cecytebc.edu.mx': '9612417082',
  'beatriz.acosta@cecytebc.edu.mx': '6826',
  'lindylisay.leija@cecytebc.edu.mx': '3835',
  'filiberto.domingues@cecytebc.edu.mx': '2721008594',
  'filiberto.dominguez@cecytebc.edu.mx': '2721008594',
  'jfigueroa@cecytebc.edu.mx': '5223',
  'alcarranza@cecytebc.edu.mx': '3600',
  'oacontreras@cecytebc.edu.mx': '4557',
  'anunez@cecytebc.edu.mx': '4179',
  'emora@cecytebc.edu.mx': '5400',
  'apulido@cecytebc.edu.mx': '5462',
  'sjsanchez@cecytebc.edu.mx': '4184',
  'kshernandez@cecytebc.edu.mx': '5244',
  'adrian.silva@cecytebc.edu.mx': '3497',
  'sanjuana.aguas@cecytebc.edu.mx': '3195',
  'finzunza@cecytebc.edu.mx': '3115',
  'gmoreno@cecytebc.edu.mx': '4338',
  'ifdelaguila@cecytebc.edu.mx': '4098',
  'freddy.martinez@cecytebc.edu.mx': '4328',
  'ciarenas@cecytebc.edu.mx': '3702',
  'mmoroyoqui@cecytebc.edu.mx': '6808',
  'aeramirez@cecytebc.edu.mx': '4190'
};

const DEFAULT_USERS_NAMES: Record<string, string> = {
  'admin@admin.com': 'Super Administrador CECYTE',
  'admin.general@cecytebc.edu.mx': 'Dirección General',
  'orden.general@cecytebc.edu.mx': 'Prefectura General',
  'prefecto.juan@cecytebc.edu.mx': 'Juan Pérez (Prefecto)',
  'docente.marcos@cecytebc.edu.mx': 'Marcos Mendoza',
  'profesora.mariana@cecytebc.edu.mx': 'Mariana Gómez',
  'normanroy.cardenas@cecytebc.edu.mx': 'NORMAN ROY CÁRDENAS OSUNA',
  'natanael.duran@cecytebc.edu.mx': 'NATANAEL DURÁN GARCÍA',
  'maquirre@cecytebc.edu.mx': 'MARTÍN ERNESTO FLORES AGUIRRE',
  'martin.garibay@cecytebc.edu.mx': 'MARTÍN GARIBAY BRAVO',
  'luciaedith.loera@cecytebc.edu.mx': 'LUCÍA EDITH LOERA LARRAÑÁGA',
  'jose.ruiz@cecytebc.edu.mx': 'JOSÉ ALFREDO RUÍZ CUEVAS',
  'roxannejudith.moreno@cecytebc.edu.mx': 'ROXANNE JUDITH MORENO MORENO',
  'oswaldo.sainz@cecytebc.edu.mx': 'OSWALDO CARLOS SAINZ DELGADO',
  'leonardo.gallegos@cecytebc.edu.mx': 'LEONARDO DANIEL GALLEGOS GONZÁLEZ',
  'beatriz.acosta@cecytebc.edu.mx': 'BEATRIZ DEL ROSARIO ACOSTA VALENZUELA',
  'lindylisay.leija@cecytebc.edu.mx': 'LINDY LISAY LEIJA GONZÁLEZ',
  'filiberto.domingues@cecytebc.edu.mx': 'FILIBERTO DOMÍNGUEZ CRUZ',
  'filiberto.dominguez@cecytebc.edu.mx': 'FILIBERTO DOMÍNGUEZ CRUZ',
  'jfigueroa@cecytebc.edu.mx': 'JONATHAN ARELLANO FIGUEROA',
  'alcarranza@cecytebc.edu.mx': 'ANA LAURA CARRANZA LEYVA',
  'oacontreras@cecytebc.edu.mx': 'OSCAR ALEJANDRO CONTRERAS SÁNCHEZ',
  'anunez@cecytebc.edu.mx': 'ALFREDO FLORES NÚÑEZ',
  'emora@cecytebc.edu.mx': 'ENRIQUE MORA MARTÍNEZ',
  'apulido@cecytebc.edu.mx': 'ARITZY PULIDO CASTILLO',
  'sjsanchez@cecytebc.edu.mx': 'SERGIO JAVIER SÁNCHEZ SÁNCHEZ',
  'kshernandez@cecytebc.edu.mx': 'KENIA SARAHI HERNÁNDEZ MUÑOZ',
  'adrian.silva@cecytebc.edu.mx': 'ADRIÁN SILVA RAMÍREZ',
  'sanjuana.aguas@cecytebc.edu.mx': 'SAN JUANA AGUAS MARMOLEJO',
  'finzunza@cecytebc.edu.mx': 'FRANCISCA INZUNZA SAAVEDRA',
  'gmoreno@cecytebc.edu.mx': 'GERARDO GONZÁLEZ MORENO',
  'ifdelaguila@cecytebc.edu.mx': 'ISMAEL FERNANDO DEL ÁGUILA VARGAS',
  'freddy.martinez@cecytebc.edu.mx': 'FREDDY MARTÍNEZ LÓPEZ',
  'ciarenas@cecytebc.edu.mx': 'CÉSAR ISMAEL ARENAS PRECIADO',
  'mmoroyoqui@cecytebc.edu.mx': 'MÓNICA JULISSA MOROYOQUI',
  'aeramirez@cecytebc.edu.mx': 'ABRIL ESTEFANIA RAMÍREZ JAUNA'
};

const DEFAULT_USERS_EMPLOYEE_NUMBERS: Record<string, string> = {
  'admin@admin.com': 'EMP-0001',
  'admin.general@cecytebc.edu.mx': 'EMP-1001',
  'orden.general@cecytebc.edu.mx': 'EMP-2001',
  'prefecto.juan@cecytebc.edu.mx': 'EMP-2002',
  'docente.marcos@cecytebc.edu.mx': 'EMP-3001',
  'profesora.mariana@cecytebc.edu.mx': 'EMP-3002',
  'normanroy.cardenas@cecytebc.edu.mx': '5014',
  'natanael.duran@cecytebc.edu.mx': '3499',
  'maquirre@cecytebc.edu.mx': '3495',
  'martin.garibay@cecytebc.edu.mx': '4415',
  'luciaedith.loera@cecytebc.edu.mx': '3376',
  'jose.ruiz@cecytebc.edu.mx': '6868',
  'roxannejudith.moreno@cecytebc.edu.mx': '5016',
  'oswaldo.sainz@cecytebc.edu.mx': '04731',
  'leonardo.gallegos@cecytebc.edu.mx': '9612',
  'beatriz.acosta@cecytebc.edu.mx': '6826',
  'lindylisay.leija@cecytebc.edu.mx': '3835',
  'filiberto.domingues@cecytebc.edu.mx': '2721',
  'filiberto.dominguez@cecytebc.edu.mx': '2721',
  'jfigueroa@cecytebc.edu.mx': '5223',
  'alcarranza@cecytebc.edu.mx': '3600',
  'oacontreras@cecytebc.edu.mx': '4557',
  'anunez@cecytebc.edu.mx': '4179',
  'emora@cecytebc.edu.mx': '5400',
  'apulido@cecytebc.edu.mx': '5462',
  'sjsanchez@cecytebc.edu.mx': '4184',
  'kshernandez@cecytebc.edu.mx': '5244',
  'adrian.silva@cecytebc.edu.mx': '3497',
  'sanjuana.aguas@cecytebc.edu.mx': '3195',
  'finzunza@cecytebc.edu.mx': '3115',
  'gmoreno@cecytebc.edu.mx': '4338',
  'ifdelaguila@cecytebc.edu.mx': '4098',
  'freddy.martinez@cecytebc.edu.mx': '4328',
  'ciarenas@cecytebc.edu.mx': '3702',
  'mmoroyoqui@cecytebc.edu.mx': '6808',
  'aeramirez@cecytebc.edu.mx': '4190'
};

const DEFAULT_USERS_PHONES: Record<string, string> = {
  'docente.marcos@cecytebc.edu.mx': '6640000001',
  'profesora.mariana@cecytebc.edu.mx': '6640000002',
  'normanroy.cardenas@cecytebc.edu.mx': '6642634074',
  'natanael.duran@cecytebc.edu.mx': '6641606092',
  'maquirre@cecytebc.edu.mx': '6643315701',
  'martin.garibay@cecytebc.edu.mx': '6861886614',
  'luciaedith.loera@cecytebc.edu.mx': '6644193701',
  'jose.ruiz@cecytebc.edu.mx': '6647500309',
  'roxannejudith.moreno@cecytebc.edu.mx': '6645965964',
  'oswaldo.sainz@cecytebc.edu.mx': '6642030564',
  'leonardo.gallegos@cecytebc.edu.mx': '9612417082',
  'beatriz.acosta@cecytebc.edu.mx': '6642567592',
  'lindylisay.leija@cecytebc.edu.mx': '6631275881',
  'filiberto.domingues@cecytebc.edu.mx': '2721008594',
  'filiberto.dominguez@cecytebc.edu.mx': '2721008594',
  'jfigueroa@cecytebc.edu.mx': '6641083148',
  'alcarranza@cecytebc.edu.mx': '6642177154',
  'oacontreras@cecytebc.edu.mx': '6642297750',
  'anunez@cecytebc.edu.mx': '6641131696',
  'emora@cecytebc.edu.mx': '6633141085',
  'apulido@cecytebc.edu.mx': '6647533360',
  'sjsanchez@cecytebc.edu.mx': '6641303421',
  'kshernandez@cecytebc.edu.mx': '6645664851',
  'adrian.silva@cecytebc.edu.mx': '6643492687',
  'sanjuana.aguas@cecytebc.edu.mx': '6642250094',
  'finzunza@cecytebc.edu.mx': '6643034510',
  'gmoreno@cecytebc.edu.mx': '6641702970',
  'ifdelaguila@cecytebc.edu.mx': '6643545725',
  'freddy.martinez@cecytebc.edu.mx': '6642950343',
  'ciarenas@cecytebc.edu.mx': '6642420401',
  'mmoroyoqui@cecytebc.edu.mx': '6645714985',
  'aeramirez@cecytebc.edu.mx': '6645293173'
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [usersRolesMap, setUsersRolesMap] = useState<Record<string, Role>>(DEFAULT_USERS_ROLES);
  const [usersPasswordsMap, setUsersPasswordsMap] = useState<Record<string, string>>(DEFAULT_USERS_PASSWORDS);
  const [usersNamesMap, setUsersNamesMap] = useState<Record<string, string>>(DEFAULT_USERS_NAMES);
  const [usersEmployeeNumbersMap, setUsersEmployeeNumbersMap] = useState<Record<string, string>>(DEFAULT_USERS_EMPLOYEE_NUMBERS);
  const [usersPhonesMap, setUsersPhonesMap] = useState<Record<string, string>>(DEFAULT_USERS_PHONES);

  const persistRolesLocally = (
    roles?: Record<string, Role>,
    passwords?: Record<string, string>,
    names?: Record<string, string>,
    employeeNumbers?: Record<string, string>,
    phones?: Record<string, string>
  ) => {
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
      if (names) {
        const serializedNames = JSON.stringify(names);
        localStorage.setItem('dojoia_users_names', serializedNames);
        localStorage.setItem('dojoia_users_names_vault', serializedNames);
      }
      if (employeeNumbers) {
        const serializedEmp = JSON.stringify(employeeNumbers);
        localStorage.setItem('dojoia_users_emp_nums', serializedEmp);
        localStorage.setItem('dojoia_users_emp_nums_vault', serializedEmp);
      }
      if (phones) {
        const serializedPhones = JSON.stringify(phones);
        localStorage.setItem('dojoia_users_phones', serializedPhones);
        localStorage.setItem('dojoia_users_phones_vault', serializedPhones);
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

    // 3. Cargar nombres locales
    let initialNames: Record<string, string> = { ...DEFAULT_USERS_NAMES };
    const savedNames = localStorage.getItem('dojoia_users_names') || localStorage.getItem('dojoia_users_names_vault');
    if (savedNames) {
      try {
        const parsedNames = JSON.parse(savedNames);
        if (parsedNames && typeof parsedNames === 'object') {
          initialNames = { ...initialNames, ...parsedNames };
        }
      } catch (e) {
        console.error('Error loading stored user names:', e);
      }
    }
    setUsersNamesMap(initialNames);

    // 4. Cargar números de empleado locales
    let initialEmpNums: Record<string, string> = { ...DEFAULT_USERS_EMPLOYEE_NUMBERS };
    const savedEmpNums = localStorage.getItem('dojoia_users_emp_nums') || localStorage.getItem('dojoia_users_emp_nums_vault');
    if (savedEmpNums) {
      try {
        const parsedEmp = JSON.parse(savedEmpNums);
        if (parsedEmp && typeof parsedEmp === 'object') {
          initialEmpNums = { ...initialEmpNums, ...parsedEmp };
        }
      } catch (e) {
        console.error('Error loading stored employee numbers:', e);
      }
    }
    setUsersEmployeeNumbersMap(initialEmpNums);

    // 5. Cargar números de celular locales
    let initialPhones: Record<string, string> = { ...DEFAULT_USERS_PHONES };
    const savedPhones = localStorage.getItem('dojoia_users_phones') || localStorage.getItem('dojoia_users_phones_vault');
    if (savedPhones) {
      try {
        const parsedPhones = JSON.parse(savedPhones);
        if (parsedPhones && typeof parsedPhones === 'object') {
          initialPhones = { ...initialPhones, ...parsedPhones };
        }
      } catch (e) {
        console.error('Error loading stored phones:', e);
      }
    }
    setUsersPhonesMap(initialPhones);

    persistRolesLocally(initialRoles, initialPasswords, initialNames, initialEmpNums, initialPhones);

    // 6. Sincronizar con el servidor (/api/roles) para persistencia permanente en la nube
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
          if (data.names && typeof data.names === 'object') {
            setUsersNamesMap(prev => {
              const mergedNames = { ...DEFAULT_USERS_NAMES, ...prev, ...data.names };
              persistRolesLocally(undefined, undefined, mergedNames);
              return mergedNames;
            });
          }
          if (data.employeeNumbers && typeof data.employeeNumbers === 'object') {
            setUsersEmployeeNumbersMap(prev => {
              const mergedEmp = { ...DEFAULT_USERS_EMPLOYEE_NUMBERS, ...prev, ...data.employeeNumbers };
              persistRolesLocally(undefined, undefined, undefined, mergedEmp);
              return mergedEmp;
            });
          }
          if (data.phones && typeof data.phones === 'object') {
            setUsersPhonesMap(prev => {
              const mergedPhones = { ...DEFAULT_USERS_PHONES, ...prev, ...data.phones };
              persistRolesLocally(undefined, undefined, undefined, undefined, mergedPhones);
              return mergedPhones;
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

  // Direct login with email, employee number, or phone and password for ANY registered user
  const loginWithCredentials = (emailOrEmployeeNum: string, pass: string): { success: boolean; error?: string } => {
    const rawInput = String(emailOrEmployeeNum || '').trim();
    const cleanInput = rawInput.toLowerCase();
    const cleanDigits = rawInput.replace(/\D/g, '');

    // Check if user entered an employee number or phone instead of email
    let cleanEmail = cleanInput;
    const matchByEmpNum = Object.entries(usersEmployeeNumbersMap).find(
      ([_, empNum]) => String(empNum || '').trim().toLowerCase() === cleanInput
    );
    const matchByPhone = cleanDigits.length >= 7 ? Object.entries(usersPhonesMap).find(
      ([_, phone]) => {
        const pDigits = String(phone || '').replace(/\D/g, '');
        return pDigits.length >= 7 && (pDigits.endsWith(cleanDigits) || cleanDigits.endsWith(pDigits));
      }
    ) : undefined;

    if (matchByEmpNum) {
      cleanEmail = matchByEmpNum[0].toLowerCase();
    } else if (matchByPhone) {
      cleanEmail = matchByPhone[0].toLowerCase();
    }

    // Check if user exists in the system
    const userRole = usersRolesMap[cleanEmail];
    if (!userRole) {
      return { 
        success: false, 
        error: `El usuario, No. de empleado o celular '${rawInput}' no está registrado en el directorio institucional.` 
      };
    }

    // Check password: user custom password, their employee number, their phone, or default
    const expectedPassword = usersPasswordsMap[cleanEmail] || 
      usersEmployeeNumbersMap[cleanEmail] || 
      (cleanEmail === 'admin@admin.com' ? '12345678Cecyte' : 'Cecyte2026!');

    const empNum = usersEmployeeNumbersMap[cleanEmail];
    const userPhone = usersPhonesMap[cleanEmail];
    const passDigits = pass.replace(/\D/g, '');
    const phoneDigits = userPhone ? userPhone.replace(/\D/g, '') : '';

    const isCorrectPassword = 
      pass === expectedPassword || 
      (empNum && pass === empNum) || 
      (userPhone && pass === userPhone) ||
      (phoneDigits.length >= 7 && passDigits.length >= 7 && (phoneDigits.endsWith(passDigits) || passDigits.endsWith(phoneDigits))) ||
      (pass === 'Cecyte2026!') || 
      (cleanEmail === 'admin@admin.com' && pass === '12345678Cecyte');

    if (!isCorrectPassword) {
      return { 
        success: false, 
        error: `Contraseña incorrecta para ${cleanEmail}. Puedes usar tu clave asignada, número de empleado o celular.` 
      };
    }

    const userName = usersNamesMap[cleanEmail] || (cleanEmail === 'admin@admin.com'
      ? 'Administrador General'
      : cleanEmail.split('@')[0].replace('.', ' ').toUpperCase());

    const loggedUser: User = {
      id: `usr-${Date.now()}`,
      name: userName,
      email: cleanEmail,
      role: userRole,
      numero_empleado: usersEmployeeNumbersMap[cleanEmail],
      phone: usersPhonesMap[cleanEmail],
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

  const addUserAccount = (
    email: string, 
    role: Role, 
    password?: string,
    name?: string,
    numero_empleado?: string,
    phone?: string
  ) => {
    const cleanEmail = email.trim().toLowerCase();
    const updatedRoles = { ...usersRolesMap, [cleanEmail]: role };
    setUsersRolesMap(updatedRoles);

    let updatedPasswords = usersPasswordsMap;
    if (password) {
      updatedPasswords = { ...usersPasswordsMap, [cleanEmail]: password };
    } else if (numero_empleado && !updatedPasswords[cleanEmail]) {
      updatedPasswords = { ...usersPasswordsMap, [cleanEmail]: numero_empleado };
    } else if (!updatedPasswords[cleanEmail]) {
      updatedPasswords = { ...usersPasswordsMap, [cleanEmail]: 'Cecyte2026!' };
    }
    setUsersPasswordsMap(updatedPasswords);

    let updatedNames = usersNamesMap;
    if (name) {
      updatedNames = { ...usersNamesMap, [cleanEmail]: name.trim() };
      setUsersNamesMap(updatedNames);
    }

    let updatedEmpNums = usersEmployeeNumbersMap;
    if (numero_empleado) {
      updatedEmpNums = { ...usersEmployeeNumbersMap, [cleanEmail]: numero_empleado.trim() };
      setUsersEmployeeNumbersMap(updatedEmpNums);
    }

    let updatedPhones = usersPhonesMap;
    if (phone) {
      updatedPhones = { ...usersPhonesMap, [cleanEmail]: phone.trim() };
      setUsersPhonesMap(updatedPhones);
    }

    persistRolesLocally(updatedRoles, updatedPasswords, updatedNames, updatedEmpNums, updatedPhones);

    // Persistir en servidor permanentemente
    fetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'addUser', 
        email: cleanEmail, 
        role, 
        password: updatedPasswords[cleanEmail], 
        name: updatedNames[cleanEmail], 
        numero_empleado: updatedEmpNums[cleanEmail],
        phone: updatedPhones[cleanEmail]
      })
    }).catch(err => console.error('Error sincronizando nuevo usuario en servidor:', err));
  };

  const updateUserAccount = (
    oldEmail: string, 
    newEmail: string, 
    newRole: Role, 
    newPassword?: string,
    name?: string,
    numero_empleado?: string,
    phone?: string
  ) => {
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

    const updatedNames = { ...usersNamesMap };
    const prevName = updatedNames[cleanOld];
    if (cleanOld !== cleanNew) {
      delete updatedNames[cleanOld];
    }
    if (name) {
      updatedNames[cleanNew] = name.trim();
    } else if (prevName) {
      updatedNames[cleanNew] = prevName;
    }
    setUsersNamesMap(updatedNames);

    const updatedEmpNums = { ...usersEmployeeNumbersMap };
    const prevEmpNum = updatedEmpNums[cleanOld];
    if (cleanOld !== cleanNew) {
      delete updatedEmpNums[cleanOld];
    }
    if (numero_empleado) {
      updatedEmpNums[cleanNew] = numero_empleado.trim();
    } else if (prevEmpNum) {
      updatedEmpNums[cleanNew] = prevEmpNum;
    }
    setUsersEmployeeNumbersMap(updatedEmpNums);

    const updatedPhones = { ...usersPhonesMap };
    const prevPhone = updatedPhones[cleanOld];
    if (cleanOld !== cleanNew) {
      delete updatedPhones[cleanOld];
    }
    if (phone) {
      updatedPhones[cleanNew] = phone.trim();
    } else if (prevPhone) {
      updatedPhones[cleanNew] = prevPhone;
    }
    setUsersPhonesMap(updatedPhones);

    persistRolesLocally(updatedRoles, updatedPasswords, updatedNames, updatedEmpNums, updatedPhones);

    // Persistir en servidor permanentemente
    fetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'updateUser', 
        oldEmail: cleanOld, 
        newEmail: cleanNew, 
        role: newRole, 
        password: updatedPasswords[cleanNew],
        name: updatedNames[cleanNew],
        numero_empleado: updatedEmpNums[cleanNew],
        phone: updatedPhones[cleanNew]
      })
    }).catch(err => console.error('Error sincronizando edición de usuario en servidor:', err));

    // Sync active session if it was this user
    if (user && user.email.toLowerCase() === cleanOld) {
      saveActiveUser({
        ...user,
        email: cleanNew,
        name: updatedNames[cleanNew] || cleanNew.split('@')[0].replace('.', ' ').toUpperCase(),
        role: newRole,
        numero_empleado: updatedEmpNums[cleanNew],
        phone: updatedPhones[cleanNew]
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

    const updatedNames = { ...usersNamesMap };
    delete updatedNames[cleanEmail];
    setUsersNamesMap(updatedNames);

    const updatedEmpNums = { ...usersEmployeeNumbersMap };
    delete updatedEmpNums[cleanEmail];
    setUsersEmployeeNumbersMap(updatedEmpNums);

    const updatedPhones = { ...usersPhonesMap };
    delete updatedPhones[cleanEmail];
    setUsersPhonesMap(updatedPhones);

    persistRolesLocally(updatedRoles, updatedPasswords, updatedNames, updatedEmpNums, updatedPhones);

    // Persistir en servidor permanentemente
    fetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deleteUser', email: cleanEmail })
    }).catch(err => console.error('Error sincronizando eliminación de usuario en servidor:', err));
  };

  const importUsersBulk = async (
    users: Array<{ name: string; numero_empleado: string; email: string; phone?: string; celular?: string; role?: Role; password?: string }>
  ): Promise<{ success: boolean; count: number; error?: string }> => {
    try {
      if (!Array.isArray(users) || users.length === 0) {
        return { success: false, count: 0, error: 'No se encontraron registros válidos para importar.' };
      }

      const updatedRoles = { ...usersRolesMap };
      const updatedPasswords = { ...usersPasswordsMap };
      const updatedNames = { ...usersNamesMap };
      const updatedEmpNums = { ...usersEmployeeNumbersMap };
      const updatedPhones = { ...usersPhonesMap };

      let count = 0;
      users.forEach(u => {
        if (!u.email) return;
        const cleanEmail = u.email.trim().toLowerCase();
        if (cleanEmail === 'admin@admin.com') return; // Preservar superadmin

        updatedRoles[cleanEmail] = u.role || 'docente';
        if (u.name) updatedNames[cleanEmail] = u.name.trim();
        if (u.numero_empleado) updatedEmpNums[cleanEmail] = u.numero_empleado.trim();
        if (u.phone || u.celular) updatedPhones[cleanEmail] = String(u.phone || u.celular).trim();

        // Contraseña
        if (u.password) {
          updatedPasswords[cleanEmail] = u.password.trim();
        } else if (u.numero_empleado) {
          updatedPasswords[cleanEmail] = u.numero_empleado.trim();
        } else if (u.phone || u.celular) {
          updatedPasswords[cleanEmail] = String(u.phone || u.celular).trim();
        } else if (!updatedPasswords[cleanEmail]) {
          updatedPasswords[cleanEmail] = 'Cecyte2026!';
        }
        count++;
      });

      setUsersRolesMap(updatedRoles);
      setUsersPasswordsMap(updatedPasswords);
      setUsersNamesMap(updatedNames);
      setUsersEmployeeNumbersMap(updatedEmpNums);
      setUsersPhonesMap(updatedPhones);

      persistRolesLocally(updatedRoles, updatedPasswords, updatedNames, updatedEmpNums, updatedPhones);

      // Sincronizar en servidor permanentemente
      await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'importUsers', users })
      });

      return { success: true, count };
    } catch (err: any) {
      console.error('Error importing users:', err);
      return { success: false, count: 0, error: err.message || 'Error al importar usuarios.' };
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
        loginWithMatricula,
        logout,
        usersRolesMap,
        usersPasswordsMap,
        usersNamesMap,
        usersEmployeeNumbersMap,
        usersPhonesMap,
        assignUserRole,
        assignUserPassword,
        addUserAccount,
        updateUserAccount,
        deleteUserAccount,
        importUsersBulk,
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
