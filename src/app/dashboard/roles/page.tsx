"use strict";

'use client';

import React, { useState } from 'react';
import { useAuth, Role } from '@/lib/auth';
import { 
  Shield, CheckCircle2, Lock, Plus, Trash2, Key, Edit, X, Check, 
  Mail, AlertCircle, Eye, EyeOff, Sparkles, UserCheck 
} from 'lucide-react';

export default function RolesManagementPage() {
  const { 
    user, 
    usersRolesMap, 
    usersPasswordsMap, 
    assignUserRole, 
    assignUserPassword, 
    addUserAccount, 
    updateUserAccount, 
    deleteUserAccount, 
    validateInstitutionalDomain 
  } = useAuth();
  
  // Create / add form state
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<Role>('docente');
  const [newPassword, setNewPassword] = useState('Cecyte2026!');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Password Modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [targetPasswordEmail, setTargetPasswordEmail] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [showInputPassword, setShowInputPassword] = useState(false);

  // Edit User Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editOriginalEmail, setEditOriginalEmail] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<Role>('docente');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Access control check
  if (user?.role !== 'administrador') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center text-3xl">
          <Lock size={32} />
        </div>
        <h2 className="text-2xl font-bold text-white">Acceso Restringido</h2>
        <p className="text-gray-400 text-sm max-w-md">
          Este panel de configuración de privilegios y gestión de usuarios requiere permisos de <span className="text-amber-400 font-semibold">Administrador</span>.
        </p>
      </div>
    );
  }

  // Handle adding user with role and password
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const cleanEmail = newEmail.trim().toLowerCase();

    if (!cleanEmail) {
      setFeedback({ message: 'Ingresa un correo institucional.', type: 'error' });
      return;
    }

    if (!validateInstitutionalDomain(cleanEmail)) {
      setFeedback({ 
        message: 'Acceso inválido. Solo se permiten correos institucionales con dominio @cecytebc.edu.mx', 
        type: 'error' 
      });
      return;
    }

    addUserAccount(cleanEmail, newRole, newPassword.trim() || 'Cecyte2026!');
    setFeedback({ 
      message: `Usuario '${cleanEmail}' registrado exitosamente con rol '${newRole.toUpperCase()}' y contraseña asignada.`, 
      type: 'success' 
    });

    setNewEmail('');
    setNewPassword('Cecyte2026!');
  };

  // Open password modal
  const handleOpenPasswordModal = (email: string) => {
    setTargetPasswordEmail(email);
    setInputPassword(usersPasswordsMap[email] || '');
    setShowInputPassword(false);
    setIsPasswordModalOpen(true);
  };

  // Save new password
  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPassword.trim()) {
      alert('Por favor ingresa una contraseña válida.');
      return;
    }

    assignUserPassword(targetPasswordEmail, inputPassword.trim());
    setIsPasswordModalOpen(false);
    setFeedback({
      message: `Contraseña actualizada correctamente para ${targetPasswordEmail}`,
      type: 'success'
    });
  };

  // Open Edit User Modal
  const handleOpenEditModal = (email: string, currentRole: Role) => {
    setEditOriginalEmail(email);
    setEditEmail(email);
    setEditRole(currentRole);
    setEditPassword(usersPasswordsMap[email] || '');
    setShowEditPassword(false);
    setIsEditModalOpen(true);
  };

  // Save edited user
  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = editEmail.trim().toLowerCase();

    if (!cleanEmail) {
      alert('El correo no puede estar vacío.');
      return;
    }

    if (!validateInstitutionalDomain(cleanEmail)) {
      alert('El correo debe pertenecer al dominio institucional @cecytebc.edu.mx');
      return;
    }

    updateUserAccount(editOriginalEmail, cleanEmail, editRole, editPassword.trim() || undefined);
    setIsEditModalOpen(false);
    setFeedback({
      message: `Datos del usuario ${cleanEmail} actualizados correctamente.`,
      type: 'success'
    });
  };

  // Delete user account
  const handleDeleteUser = (email: string) => {
    if (email === 'admin@admin.com') {
      alert('La cuenta de Superadministrador principal no puede ser eliminada.');
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar al usuario ${email} del directorio institucional? Ya no podrá ingresar a la plataforma.`)) {
      return;
    }

    deleteUserAccount(email);
    setFeedback({
      message: `El usuario ${email} ha sido eliminado del directorio.`,
      type: 'success'
    });
  };

  const usersList = Object.entries(usersRolesMap);

  return (
    <div className="space-y-8 pb-10 flex-1 flex flex-col">
      
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-3xl border-amber-500/20 relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <span>👑 Panel de Control de Cuentas y Contraseñas</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Gestión de Usuarios, Roles y Contraseñas</h2>
          <p className="text-gray-400 text-sm">
            Edita usuarios, asigna contraseñas directas para su ingreso y administra permisos institucionales.
          </p>
        </div>
      </div>

      {/* Privileges Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Admin Card */}
        <div className="glass-panel p-6 rounded-3xl border-amber-500/30 relative overflow-hidden space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xl">
              👑
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Administrador</h3>
              <span className="text-[10px] text-amber-400 font-mono">admin@admin.com / @cecytebc.edu.mx</span>
            </div>
          </div>

          <div className="space-y-2 text-xs text-gray-300">
            <div className="flex items-center space-x-2">
              <CheckCircle2 size={14} className="text-amber-400 shrink-0" />
              <span>Control total de la plataforma y altas masivas.</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 size={14} className="text-amber-400 shrink-0" />
              <span>Gestión de credenciales y contraseñas de acceso.</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 size={14} className="text-amber-400 shrink-0" />
              <span>CRUD completo de Alumnos y QR.</span>
            </div>
          </div>
        </div>

        {/* Encargado de Orden Card */}
        <div className="glass-panel p-6 rounded-3xl border-cyan-500/30 relative overflow-hidden space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-xl">
              🛡️
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Encargado de Orden</h3>
              <span className="text-[10px] text-cyan-400 font-mono">Cuenta @cecytebc.edu.mx</span>
            </div>
          </div>

          <div className="space-y-2 text-xs text-gray-300">
            <div className="flex items-center space-x-2">
              <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />
              <span>Acceso al Escáner QR de entradas/salidas.</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />
              <span>Monitoreo de retardos e incidencias diarias.</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />
              <span>Supervisión de notificaciones WhatsApp.</span>
            </div>
          </div>
        </div>

        {/* Docente Card */}
        <div className="glass-panel p-6 rounded-3xl border-emerald-500/30 relative overflow-hidden space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xl">
              👨‍🏫
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Docente</h3>
              <span className="text-[10px] text-emerald-400 font-mono">Cuenta @cecytebc.edu.mx</span>
            </div>
          </div>

          <div className="space-y-2 text-xs text-gray-300">
            <div className="flex items-center space-x-2">
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
              <span>Pase de lista por Grado (1°, 3°, 5°) y Grupo.</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
              <span>Visualización de alumnos presentes y ausentes.</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
              <span>Registro manual de asistencia en el aula.</span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Grid: Add User Form & Users Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Add/Register Form (1 col) */}
        <div className="glass-panel p-6 rounded-3xl space-y-5">
          <div className="flex items-center space-x-2">
            <Plus size={18} className="text-amber-400" />
            <h3 className="text-base font-bold text-white">Registrar Usuario Institucional</h3>
          </div>

          {feedback && (
            <div className={`p-3 rounded-xl text-xs border flex items-start space-x-2 ${
              feedback.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {feedback.type === 'success' ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
              <span>{feedback.message}</span>
            </div>
          )}

          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Correo Institucional Gmail</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="ejemplo@cecytebc.edu.mx"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full glass-input py-2.5 px-3 rounded-xl text-xs text-white placeholder-gray-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Rol a Otorgar</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as Role)}
                className="w-full glass-input py-2.5 px-3 rounded-xl text-xs text-white bg-[#0a0f1c]"
              >
                <option value="docente">👨‍🏫 Docente</option>
                <option value="encargado_orden">🛡️ Encargado de Orden</option>
                <option value="administrador">👑 Administrador</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                <span>Contraseña de Ingreso</span>
                <span className="text-[10px] text-cyan-400">Para iniciar sesión directo</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Contraseña del usuario"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full glass-input py-2.5 px-3 pr-10 rounded-xl text-xs text-white font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="text-[10px] text-gray-500">
                El usuario podrá usar esta contraseña en la pantalla de inicio de sesión.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs shadow-lg shadow-amber-500/20 hover:opacity-95 transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              <Plus size={14} />
              <span>Registrar Usuario y Asignar Clave</span>
            </button>
          </form>
        </div>

        {/* Right Side: Users Directory Table (2 cols) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Directorio de Usuarios Institucionales y Permisos</h3>
            <span className="text-xs font-mono text-cyan-400 font-bold">{usersList.length} Registrados</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 uppercase font-semibold">
                  <th className="py-3 px-3">Usuario Institucional</th>
                  <th className="py-3 px-3">Rol Asignado</th>
                  <th className="py-3 px-3">Contraseña de Acceso</th>
                  <th className="py-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-200">
                {usersList.map(([email, role]) => {
                  const hasPassword = !!usersPasswordsMap[email] || (email === 'admin@admin.com');
                  const isProtectedSuperadmin = email === 'admin@admin.com';

                  return (
                    <tr key={email} className="hover:bg-white/[0.02] transition-colors">
                      {/* User email */}
                      <td className="py-3.5 px-3 font-semibold text-white">
                        <div className="flex items-center space-x-2">
                          <Mail size={14} className="text-cyan-400 shrink-0" />
                          <span className="truncate max-w-[180px] sm:max-w-none">{email}</span>
                          {isProtectedSuperadmin && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold shrink-0">SUPERADMIN</span>
                          )}
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-3">
                        {isProtectedSuperadmin ? (
                          <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            ADMINISTRADOR
                          </span>
                        ) : (
                          <select
                            value={role}
                            onChange={(e) => assignUserRole(email, e.target.value as Role)}
                            className="glass-input px-2 py-1 rounded-lg text-xs bg-[#0b101d] text-gray-200 border border-white/10"
                          >
                            <option value="docente">Docente</option>
                            <option value="encargado_orden">Encargado Orden</option>
                            <option value="administrador">Administrador</option>
                          </select>
                        )}
                      </td>

                      {/* Password Status / Action */}
                      <td className="py-3.5 px-3">
                        <button
                          type="button"
                          onClick={() => handleOpenPasswordModal(email)}
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                            hasPassword 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                          }`}
                          title="Clic para ver o cambiar la contraseña de acceso"
                        >
                          <Key size={12} />
                          <span>{hasPassword ? '•••••••• (Cambiar)' : 'Asignar Clave'}</span>
                        </button>
                      </td>

                      {/* Actions: Edit, Delete */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(email, role)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors cursor-pointer"
                            title="Editar usuario y contraseña"
                          >
                            <Edit size={14} />
                          </button>

                          {!isProtectedSuperadmin ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(email)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                              title="Eliminar usuario"
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : (
                            <span className="text-[10px] text-gray-500 px-1 font-mono">Inmutable</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* MODAL 1: Asignar / Cambiar Contraseña */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md glass-panel p-6 rounded-3xl border-cyan-500/30 bg-[#090d16] space-y-5 shadow-2xl">
            <button
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Key size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Asignar Contraseña de Acceso</h3>
                <p className="text-xs text-gray-400 truncate max-w-[260px]">{targetPasswordEmail}</p>
              </div>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">Nueva Contraseña</label>
                <div className="relative">
                  <input
                    type={showInputPassword ? 'text' : 'password'}
                    value={inputPassword}
                    onChange={(e) => setInputPassword(e.target.value)}
                    placeholder="Escribe la contraseña..."
                    className="w-full glass-input py-2.5 px-3.5 pr-10 rounded-xl text-xs text-white font-mono bg-[#080d1a] border border-cyan-500/30"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowInputPassword(!showInputPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showInputPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400">
                  El usuario podrá usar esta clave para ingresar a su panel desde la pantalla de login.
                </p>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl glass-panel text-xs text-gray-400 font-bold hover:bg-white/5 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <Check size={14} />
                  <span>Guardar Clave</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Editar Usuario Completo */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md glass-panel p-6 rounded-3xl border-cyan-500/30 bg-[#090d16] space-y-5 shadow-2xl">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Edit size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Editar Usuario Institucional</h3>
                <p className="text-xs text-gray-400 truncate max-w-[260px]">{editOriginalEmail}</p>
              </div>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">Correo Institucional</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  disabled={editOriginalEmail === 'admin@admin.com'}
                  className="w-full glass-input py-2.5 px-3.5 rounded-xl text-xs text-white bg-[#080d1a] border border-cyan-500/30 disabled:opacity-60"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">Rol Institucional</label>
                {editOriginalEmail === 'admin@admin.com' ? (
                  <input
                    type="text"
                    disabled
                    value="ADMINISTRADOR"
                    className="w-full glass-input py-2.5 px-3.5 rounded-xl text-xs text-amber-400 font-bold bg-[#080d1a] border border-amber-500/30 disabled:opacity-60"
                  />
                ) : (
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as Role)}
                    className="w-full glass-input py-2.5 px-3.5 rounded-xl text-xs text-white bg-[#080d1a] border border-cyan-500/30"
                  >
                    <option value="docente">👨‍🏫 Docente</option>
                    <option value="encargado_orden">🛡️ Encargado de Orden</option>
                    <option value="administrador">👑 Administrador</option>
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">Contraseña de Acceso</label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Contraseña del usuario"
                    className="w-full glass-input py-2.5 px-3.5 pr-10 rounded-xl text-xs text-white font-mono bg-[#080d1a] border border-cyan-500/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showEditPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl glass-panel text-xs text-gray-400 font-bold hover:bg-white/5 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <Check size={14} />
                  <span>Actualizar Usuario</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
