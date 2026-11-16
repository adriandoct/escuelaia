"use strict";

'use client';

import React, { useState } from 'react';
import { useAuth, Role } from '@/lib/auth';
import { Key, CheckCircle2, AlertCircle, X, Eye, EyeOff } from 'lucide-react';

export default function LoginModal() {
  const { isLoginModalOpen, closeLoginModal, loginWithCredentials, loginWithMatricula, user, usersPasswordsMap } = useAuth();
  
  const [tab, setTab] = useState<'password' | 'tutor'>('password');
  const [studentRoleMode, setStudentRoleMode] = useState<'alumno' | 'tutor'>('alumno');
  
  // Tutor/Alumno form state
  const [tutorMatricula, setTutorMatricula] = useState('');
  const [isTutorLoading, setIsTutorLoading] = useState(false);
  
  // Credentials form state
  const [credentialsEmail, setCredentialsEmail] = useState('');
  const [credentialsPass, setCredentialsPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Error / Success alert state
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isLoginModalOpen) return null;

  const handleTutorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!tutorMatricula.trim()) {
      setErrorMessage('Por favor ingresa la matrícula del alumno (14 dígitos).');
      return;
    }

    setIsTutorLoading(true);
    try {
      const res = await loginWithMatricula(tutorMatricula.trim(), studentRoleMode);
      if (res.success) {
        if (studentRoleMode === 'alumno') {
          setSuccessMessage('¡Bienvenido! Entrando al repositorio de recursos de tu semestre y grupo...');
          setTimeout(() => {
            window.location.href = '/dashboard/recursos';
          }, 800);
        } else {
          setSuccessMessage('¡Acceso concedido! Redirigiendo a tu módulo de tutor...');
          setTimeout(() => {
            window.location.href = '/dashboard/parents';
          }, 800);
        }
      } else {
        setErrorMessage(res.error || 'Matrícula no encontrada en la base de datos.');
      }
    } finally {
      setIsTutorLoading(false);
    }
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const res = loginWithCredentials(credentialsEmail, credentialsPass);
    if (res.success) {
      setSuccessMessage('¡Sesión iniciada con éxito! Redirigiendo a tu panel...');
      setTimeout(() => {
        setSuccessMessage('');
      }, 1500);
    } else {
      setErrorMessage(res.error || 'Credenciales incorrectas.');
    }
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
            Ingreso para personal institucional (Docentes, Encargados, Administrador) y Tutores de alumnos.
          </p>
        </div>

        {/* Navigation Tabs (2 Tabs: Personal y Tutor) */}
        <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-black/40 p-1 border border-white/10 mb-6">
          <button
            type="button"
            onClick={() => { setTab('password'); setErrorMessage(''); }}
            className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              tab === 'password' 
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Key size={14} />
            <span>Personal</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab('tutor'); setErrorMessage(''); }}
            className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              tab === 'tutor' 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md' 
                : 'text-emerald-400 hover:text-emerald-300'
            }`}
          >
            <span>🎒 Alumnos / Tutores</span>
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

        {/* Tab 1: Password Direct Login Form (Any user with password) */}
        {tab === 'password' && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px] leading-relaxed">
              🔑 Ingresa con cualquier cuenta registrada (Docente, Encargado de Orden o Administrador).
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Correo Institucional o Número de Empleado</label>
              <input
                type="text"
                placeholder="ejemplo@cecytebc.edu.mx o No. de Empleado (Ej: EMP-3001)"
                value={credentialsEmail}
                onChange={(e) => setCredentialsEmail(e.target.value)}
                className="w-full glass-input py-2.5 px-3.5 rounded-xl text-xs text-white border border-white/10 focus:border-cyan-500 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Tu contraseña asignada..."
                  value={credentialsPass}
                  onChange={(e) => setCredentialsPass(e.target.value)}
                  className="w-full glass-input py-2.5 px-3.5 pr-10 rounded-xl text-xs text-white border border-white/10 focus:border-cyan-500 focus:outline-none font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 hover:opacity-95 transition-all flex items-center justify-center space-x-2 cursor-pointer pt-3"
            >
              <Key size={14} />
              <span>Iniciar Sesión con Contraseña</span>
            </button>
          </form>
        )}

        {/* Tab: Alumno / Tutor Access by Matricula */}
        {tab === 'tutor' && (
          <form onSubmit={handleTutorSubmit} className="space-y-4">
            {/* Role selector toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-black/40 border border-emerald-500/20 text-xs">
              <button
                type="button"
                onClick={() => setStudentRoleMode('alumno')}
                className={`py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  studentRoleMode === 'alumno'
                    ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>🎓 Soy Alumno</span>
              </button>
              <button
                type="button"
                onClick={() => setStudentRoleMode('tutor')}
                className={`py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  studentRoleMode === 'tutor'
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>👨‍👩‍👧 Soy Padre / Tutor</span>
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs leading-relaxed space-y-1">
              <div className="font-bold flex items-center space-x-1.5 text-emerald-400">
                <span>{studentRoleMode === 'alumno' ? '🎓 Aula Virtual y Recursos' : '👨‍👩‍👧 Asistencias y Reportes'}</span>
                <span>{studentRoleMode === 'alumno' ? 'Acceso para Alumnos' : 'Acceso para Padres y Tutores'}</span>
              </div>
              <p className="text-[11px] text-gray-300">
                {studentRoleMode === 'alumno' 
                  ? 'Ingresa tu matrícula para acceder al repositorio de recursos, guías en PDF y videos de tu semestre y grupo.'
                  : 'Ingresa la matrícula escolar de tu hijo o hija para consultar sus asistencias y recibir reportes en tu teléfono.'}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">
                Matrícula Escolar (14 dígitos)
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={16}
                  placeholder="Ej: 25402080282223"
                  value={tutorMatricula}
                  onChange={(e) => setTutorMatricula(e.target.value.replace(/\s+/g, ''))}
                  className="w-full glass-input py-3 px-3.5 rounded-xl text-sm font-mono tracking-wider text-white border border-emerald-500/30 focus:border-emerald-400 focus:outline-none placeholder-gray-500 bg-black/40"
                  required
                  autoFocus
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono">
                  {tutorMatricula.length}/14
                </span>
              </div>
              <p className="text-[10px] text-gray-400">
                💡 Encuentra la matrícula en la credencial escolar o reporte de calificaciones.
              </p>
            </div>

            <button
              type="submit"
              disabled={isTutorLoading || !tutorMatricula.trim()}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>
                {isTutorLoading 
                  ? 'Verificando matrícula...' 
                  : studentRoleMode === 'alumno' 
                  ? 'Entrar a Mis Recursos de Clase (Alumno) →' 
                  : 'Consultar Reportes de Mi Alumno (Tutor) →'}
              </span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
