"use strict";

'use client';

import React, { useState } from 'react';
import { useAuth, Role } from '@/lib/auth';
import { Shield, Key, Mail, CheckCircle2, AlertCircle, X, Sparkles, UserCheck } from 'lucide-react';

export default function LoginModal() {
  const { isLoginModalOpen, closeLoginModal, loginWithCredentials, loginWithGoogle, user } = useAuth();
  
  const [tab, setTab] = useState<'google' | 'admin' | 'demo'>('google');
  
  // Google form state
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>('docente');
  
  // Admin form state
  const [adminEmail, setAdminEmail] = useState('admin@admin.com');
  const [adminPass, setAdminPass] = useState('12345678Cecyte');
  
  // Error / Success alert state
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isLoginModalOpen) return null;

  const handleGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!googleEmail) {
      setErrorMessage('Ingresa un correo institucional.');
      return;
    }

    const res = loginWithGoogle(googleEmail, googleName, selectedRole);
    if (res.success) {
      setSuccessMessage('¡Acceso institucional concedido correctamente!');
      setTimeout(() => {
        setSuccessMessage('');
      }, 1500);
    } else {
      setErrorMessage(res.error || 'Error al iniciar sesión.');
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const res = loginWithCredentials(adminEmail, adminPass);
    if (res.success) {
      setSuccessMessage('¡Bienvenido Superadministrador! Control Total activado.');
      setTimeout(() => {
        setSuccessMessage('');
      }, 1500);
    } else {
      setErrorMessage(res.error || 'Credenciales incorrectas.');
    }
  };

  const handleDemoLogin = (email: string, name: string, role: Role) => {
    setErrorMessage('');
    setSuccessMessage('');
    
    if (email === 'admin@admin.com') {
      loginWithCredentials('admin@admin.com', '12345678Cecyte');
    } else {
      loginWithGoogle(email, name, role);
    }
    setSuccessMessage(`Sesión iniciada como ${role.toUpperCase()}`);
    setTimeout(() => {
      setSuccessMessage('');
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-lg glass-panel bg-[#090d16]/95 border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Close Button if user is already authenticated */}
        {user && (
          <button
            onClick={closeLoginModal}
            className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        )}

        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-2xl shadow-lg shadow-cyan-500/10 mb-2">
            🏫
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Acceso Institucional CECYTE BC
          </h2>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            Ingresa con tu correo institucional <span className="text-cyan-400 font-semibold">@cecytebc.edu.mx</span> o cuenta de administración.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex rounded-xl bg-black/40 p-1 border border-white/10 mb-6">
          <button
            onClick={() => { setTab('google'); setErrorMessage(''); }}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              tab === 'google' 
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Mail size={14} />
            <span>Gmail Institucional</span>
          </button>

          <button
            onClick={() => { setTab('admin'); setErrorMessage(''); }}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              tab === 'admin' 
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Shield size={14} />
            <span>Superadmin</span>
          </button>

          <button
            onClick={() => { setTab('demo'); setErrorMessage(''); }}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              tab === 'demo' 
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md' 
                : 'text-amber-400 hover:text-amber-300'
            }`}
          >
            <Sparkles size={14} />
            <span>Modo Demo</span>
          </button>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start space-x-2.5 animate-shake">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2.5">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab 1: Google Institutional Login Form */}
        {tab === 'google' && (
          <form onSubmit={handleGoogleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Correo Institucional Gmail</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="ejemplo@cecytebc.edu.mx"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  className="w-full glass-input py-2.5 px-3.5 rounded-xl text-xs text-white placeholder-gray-500 border border-white/10 focus:border-cyan-500 focus:outline-none"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  @cecytebc.edu.mx
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Nombre del Usuario (Opcional)</label>
              <input
                type="text"
                placeholder="Nombre Completo"
                value={googleName}
                onChange={(e) => setGoogleName(e.target.value)}
                className="w-full glass-input py-2.5 px-3.5 rounded-xl text-xs text-white placeholder-gray-500 border border-white/10 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Rol Institucional Asignado</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as Role)}
                className="w-full glass-input py-2.5 px-3.5 rounded-xl text-xs text-white border border-white/10 focus:border-cyan-500 focus:outline-none bg-[#0e1422]"
              >
                <option value="docente">👨‍🏫 Docente (Pase de lista por grupo)</option>
                <option value="encargado_orden">🛡️ Encargado de Orden (Escáner y Disciplina)</option>
                <option value="administrador">👑 Administrador (Control Total)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 hover:opacity-95 transition-all flex items-center justify-center space-x-2 cursor-pointer pt-3"
            >
              <span>Acceder con Google Institucional</span>
              <span>→</span>
            </button>
          </form>
        )}

        {/* Tab 2: Admin Direct Login Form */}
        {tab === 'admin' && (
          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px] leading-relaxed">
              🔑 Acceso Directo de Superadministrador con Control Total.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Correo de Administrador</label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full glass-input py-2.5 px-3.5 rounded-xl text-xs text-white border border-white/10 focus:border-cyan-500 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Contraseña</label>
              <input
                type="password"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                className="w-full glass-input py-2.5 px-3.5 rounded-xl text-xs text-white border border-white/10 focus:border-cyan-500 focus:outline-none font-mono"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 hover:opacity-95 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Shield size={14} />
              <span>Iniciar Sesión como Administrador</span>
            </button>
          </form>
        )}

        {/* Tab 3: Quick Demo Role Switcher */}
        {tab === 'demo' && (
          <div className="space-y-3">
            <p className="text-xs text-amber-300 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 leading-relaxed text-center font-medium">
              ⚡ Evaluador Senior: Haz clic en cualquiera de las siguientes cuentas pre-configuradas para probar la interfaz inmediatamente:
            </p>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleDemoLogin('admin@admin.com', 'Administrador General', 'administrador')}
                className="w-full p-3 rounded-xl glass-panel border border-amber-500/30 hover:bg-amber-500/10 transition-all flex items-center justify-between group text-left cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                    👑
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-amber-400">1. Administrador (Control Total)</h4>
                    <p className="text-[10px] text-gray-400">admin@admin.com • Clave: 12345678Cecyte</p>
                  </div>
                </div>
                <UserCheck size={16} className="text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('orden.general@cecytebc.edu.mx', 'Prefecto Juan', 'encargado_orden')}
                className="w-full p-3 rounded-xl glass-panel border border-cyan-500/30 hover:bg-cyan-500/10 transition-all flex items-center justify-between group text-left cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
                    🛡️
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-cyan-400">2. Encargado de Orden (Disciplinar)</h4>
                    <p className="text-[10px] text-gray-400">orden.general@cecytebc.edu.mx • Escáner & Logs</p>
                  </div>
                </div>
                <UserCheck size={16} className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('docente.marcos@cecytebc.edu.mx', 'Prof. Marcos Ramírez', 'docente')}
                className="w-full p-3 rounded-xl glass-panel border border-emerald-500/30 hover:bg-emerald-500/10 transition-all flex items-center justify-between group text-left cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                    👨‍🏫
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-emerald-400">3. Docente (Pase de Lista)</h4>
                    <p className="text-[10px] text-gray-400">docente.marcos@cecytebc.edu.mx • Grupos 1°A, 2°B</p>
                  </div>
                </div>
                <UserCheck size={16} className="text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
