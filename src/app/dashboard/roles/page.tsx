"use strict";

'use client';

import React, { useState } from 'react';
import { useAuth, Role } from '@/lib/auth';
import { Shield, Sparkles, UserCheck, Mail, CheckCircle2, Lock, Plus, Trash2, Key } from 'lucide-react';

export default function RolesManagementPage() {
  const { user, usersRolesMap, assignUserRole, validateInstitutionalDomain } = useAuth();
  
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<Role>('docente');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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

  const handleAddOrUpdateRole = (e: React.FormEvent) => {
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

    assignUserRole(cleanEmail, newRole);
    setFeedback({ 
      message: `Rol '${newRole.toUpperCase()}' asignado exitosamente a ${cleanEmail}`, 
      type: 'success' 
    });
    setNewEmail('');
  };

  return (
    <div className="space-y-8 pb-10 flex-1 flex flex-col">
      
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-3xl border-amber-500/20 relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <span>👑 Panel de Control Total</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Gestión de Permisos y Roles Institucionales</h2>
          <p className="text-gray-400 text-sm">
            Administra los roles asignados a las cuentas institucionales Gmail <span className="text-cyan-400 font-semibold">@cecytebc.edu.mx</span>.
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
              <span>Control total de la plataforma.</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 size={14} className="text-amber-400 shrink-0" />
              <span>CRUD completo de Alumnos y QR.</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 size={14} className="text-amber-400 shrink-0" />
              <span>Asignación de roles y usuarios.</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 size={14} className="text-amber-400 shrink-0" />
              <span>Restablecimiento y exportación BD.</span>
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
              <span>Monitoreo de retardos e incidencias.</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />
              <span>Supervisión de notificaciones WhatsApp.</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />
              <span>Consulta de lista general de alumnos.</span>
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
              <span>Pase de lista por Grado y Grupo.</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
              <span>Visualización de estado (Presente/Ausente).</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
              <span>Registro manual de asistencia por aula.</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
              <span>Exportación de reporte de su grupo.</span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Grid: Assign Role Form & Configured Users Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Add/Update Form (1 col) */}
        <div className="glass-panel p-6 rounded-3xl space-y-5">
          <div className="flex items-center space-x-2">
            <Plus size={18} className="text-amber-400" />
            <h3 className="text-base font-bold text-white">Asignar / Cambiar Rol Institucional</h3>
          </div>

          {feedback && (
            <div className={`p-3 rounded-xl text-xs border ${
              feedback.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {feedback.message}
            </div>
          )}

          <form onSubmit={handleAddOrUpdateRole} className="space-y-4">
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

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs shadow-lg shadow-amber-500/20 hover:opacity-95 transition-all cursor-pointer"
            >
              Guardar Configuración de Rol
            </button>
          </form>
        </div>

        {/* Right Side: List of Users & Roles (2 cols) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Directorio de Usuarios Institucionales y Permisos</h3>
            <span className="text-xs font-mono text-cyan-400 font-bold">{Object.keys(usersRolesMap).length} Registrados</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 uppercase font-semibold">
                  <th className="py-3 px-3">Usuario Institucional</th>
                  <th className="py-3 px-3">Dominio Validado</th>
                  <th className="py-3 px-3">Rol Asignado</th>
                  <th className="py-3 px-3 text-right">Modificar Rol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-200">
                {Object.entries(usersRolesMap).map(([email, role]) => (
                  <tr key={email} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-3 font-semibold text-white flex items-center space-x-2">
                      <Mail size={14} className="text-cyan-400 shrink-0" />
                      <span>{email}</span>
                      {email === 'admin@admin.com' && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">SUPERADMIN</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-emerald-400">
                      {email.endsWith('@cecytebc.edu.mx') || email === 'admin@admin.com' ? 'Valido ✓' : 'Externo'}
                    </td>

                    <td className="py-3.5 px-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        role === 'administrador'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : role === 'encargado_orden'
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {role}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      {email === 'admin@admin.com' ? (
                        <span className="text-[10px] text-gray-500">Inmutable</span>
                      ) : (
                        <select
                          value={role}
                          onChange={(e) => assignUserRole(email, e.target.value as Role)}
                          className="glass-input px-2 py-1 rounded-lg text-xs bg-[#0b101d] text-gray-200"
                        >
                          <option value="docente">Docente</option>
                          <option value="encargado_orden">Encargado Orden</option>
                          <option value="administrador">Administrador</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
