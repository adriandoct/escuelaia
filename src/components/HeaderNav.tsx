"use strict";

'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth, Role } from '@/lib/auth';
import { LogIn, LogOut, Shield, User, Sparkles, BookOpen, QrCode, Users, HeartHandshake } from 'lucide-react';

export default function HeaderNav() {
  const { user, openLoginModal, logout } = useAuth();

  const getRoleBadge = (role?: Role, isSuperAdmin?: boolean) => {
    switch (role) {
      case 'administrador':
        return isSuperAdmin ? (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[10px] font-black tracking-wider uppercase shadow-sm">
            <span>👑</span>
            <span>Superadmin</span>
          </span>
        ) : (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black tracking-wider uppercase">
            <span>👑</span>
            <span>Administrador</span>
          </span>
        );
      case 'administrativo':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-black tracking-wider uppercase">
            <span>📋</span>
            <span>Administrativo</span>
          </span>
        );
      case 'encargado_orden':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-black tracking-wider uppercase">
            <span>🛡️</span>
            <span>Encargado de Orden</span>
          </span>
        );
      case 'docente':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black tracking-wider uppercase">
            <span>👨‍🏫</span>
            <span>Docente</span>
          </span>
        );
      case 'tutor':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-[10px] font-black tracking-wider uppercase">
            <span>👨‍👩‍👧</span>
            <span>Tutor</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#040508]/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo and Nav Links */}
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-2 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/lions_kai_logo.png" 
              alt="Lions Kai Logo" 
              className="h-9 w-auto object-contain"
            />
            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-black tracking-widest text-white leading-tight">CECYTE BC</span>
              <span className="text-[9px] font-mono text-cyan-400">DOJOIA ACCESS</span>
            </div>
          </Link>

          {/* Nav Links strictly filtered by Role */}
          <nav className="hidden md:flex items-center space-x-2 text-xs font-semibold text-gray-300">
            
            {/* 1. TUTOR: ONLY "Padres / Tutores" */}
            {user?.role === 'tutor' && (
              <Link 
                href="/dashboard/parents" 
                className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold py-1.5 px-3.5 rounded-lg flex items-center space-x-2"
                title="Módulo de Padres de Familia y Tutores"
              >
                <HeartHandshake size={15} className="text-emerald-400" />
                <span>Padres / Tutores</span>
              </Link>
            )}

            {/* 2. DOCENTE: ONLY "Panel Docente" */}
            {user?.role === 'docente' && (
              <Link 
                href="/dashboard/teacher" 
                className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold py-1.5 px-3.5 rounded-lg flex items-center space-x-2"
              >
                <BookOpen size={15} className="text-emerald-400" />
                <span>Panel Docente</span>
              </Link>
            )}

            {/* 3. ENCARGADO DE ORDEN: Escáner QR y Asistencia por Grupo */}
            {user?.role === 'encargado_orden' && (
              <>
                <Link 
                  href="/scanner" 
                  className="hover:text-cyan-400 transition-colors py-1.5 px-3 rounded-lg hover:bg-white/5 flex items-center space-x-1.5"
                >
                  <QrCode size={14} className="text-cyan-400" />
                  <span>Escáner QR</span>
                </Link>
                <Link 
                  href="/dashboard" 
                  className="bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold py-1.5 px-3.5 rounded-lg flex items-center space-x-1.5"
                >
                  <Shield size={14} className="text-cyan-400" />
                  <span>Asistencia por Grupo</span>
                </Link>
              </>
            )}

            {/* 4. ADMINISTRADOR, ADMINISTRATIVO Y SUPERADMIN: Acceso Completo */}
            {(user?.role === 'administrador' || user?.role === 'administrativo' || user?.isSuperAdmin || user?.email === 'admin@admin.com') && (
              <>
                <Link 
                  href="/scanner" 
                  className="hover:text-cyan-400 transition-colors py-1.5 px-3 rounded-lg hover:bg-white/5 flex items-center space-x-1.5"
                >
                  <QrCode size={14} className="text-cyan-400" />
                  <span>Escáner QR</span>
                </Link>

                <Link 
                  href="/dashboard" 
                  className="hover:text-cyan-400 transition-colors py-1.5 px-3 rounded-lg hover:bg-white/5 flex items-center space-x-1.5"
                >
                  <Shield size={14} className="text-blue-400" />
                  <span>Dashboard</span>
                </Link>

                <Link 
                  href="/dashboard/teacher" 
                  className="hover:text-emerald-400 transition-colors py-1.5 px-3 rounded-lg hover:bg-white/5 flex items-center space-x-1.5"
                >
                  <BookOpen size={14} className="text-emerald-400" />
                  <span>Panel Docente</span>
                </Link>

                <Link 
                  href="/dashboard/students" 
                  className="hover:text-cyan-400 transition-colors py-1.5 px-3 rounded-lg hover:bg-white/5 flex items-center space-x-1.5"
                >
                  <Users size={14} className="text-gray-400" />
                  <span>Alumnos</span>
                </Link>

                <Link 
                  href="/dashboard/parents" 
                  className="hover:text-purple-400 transition-colors py-1.5 px-3 rounded-lg hover:bg-white/5 flex items-center space-x-1.5 text-purple-300 font-bold"
                >
                  <HeartHandshake size={14} className="text-purple-400" />
                  <span>Padres / Tutores</span>
                </Link>

                <Link 
                  href="/dashboard/qr-report" 
                  className="hover:text-cyan-400 transition-colors py-1.5 px-3 rounded-lg hover:bg-white/5 flex items-center space-x-1.5 text-cyan-300 font-bold"
                >
                  <QrCode size={14} className="text-cyan-400" />
                  <span>Reporte QRs (1.5cm)</span>
                </Link>

                {(user?.isSuperAdmin || user?.email === 'admin@admin.com') && (
                  <Link 
                    href="/dashboard/roles" 
                    className="hover:text-amber-400 transition-colors py-1.5 px-3 rounded-lg hover:bg-white/5 flex items-center space-x-1.5 text-amber-300 font-bold"
                  >
                    <Sparkles size={14} />
                    <span>Permisos Roles</span>
                  </Link>
                )}
              </>
            )}

            {/* 5. Invitado / Sin Sesión: Solicitar autenticación */}
            {!user && (
              <>
                <Link 
                  href="/scanner" 
                  className="hover:text-cyan-400 transition-colors py-1.5 px-3 rounded-lg hover:bg-white/5 flex items-center space-x-1.5"
                >
                  <QrCode size={14} className="text-cyan-400" />
                  <span>Escáner QR</span>
                </Link>

                <button
                  onClick={openLoginModal}
                  className="bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:text-white hover:bg-cyan-500/25 py-1.5 px-3 rounded-lg transition-all flex items-center space-x-1.5 font-bold cursor-pointer"
                >
                  <LogIn size={14} />
                  <span>Iniciar Sesión</span>
                </button>
              </>
            )}

          </nav>
        </div>

        {/* User Account Controls */}
        <div className="flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex flex-col items-end">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-white max-w-[140px] truncate">{user.name}</span>
                  {getRoleBadge(user.role, user.isSuperAdmin || user.email === 'admin@admin.com')}
                </div>
                <span className="text-[10px] text-gray-400 font-mono">{user.email}</span>
              </div>

              <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 bg-gray-800 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
                  alt={user.name}
                  className="w-full h-full object-cover" 
                />
              </div>

              <button
                onClick={openLoginModal}
                className="px-2.5 py-1.5 rounded-lg glass-panel text-[11px] font-semibold text-cyan-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer hidden sm:flex items-center space-x-1"
                title="Cambiar Rol / Cuenta"
              >
                <span>Cambiar</span>
              </button>

              <button
                onClick={logout}
                className="p-2 rounded-lg glass-panel text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                title="Cerrar Sesión"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={openLoginModal}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 hover:opacity-90 transition-all cursor-pointer"
            >
              <LogIn size={14} />
              <span>Acceso Institucional</span>
            </button>
          )}
        </div>

      </div>

      {/* Mobile nav links */}
      <div className="md:hidden flex items-center justify-around py-2 border-t border-white/5 bg-black/40 text-[11px] font-semibold text-gray-300">
        {user?.role === 'tutor' ? (
          <Link href="/dashboard/parents" className="text-teal-400 font-bold py-1 px-3 flex items-center space-x-1.5">
            <span>👨‍👩‍👧</span>
            <span>Módulo Padres / Tutores</span>
          </Link>
        ) : user?.role === 'docente' ? (
          <Link href="/dashboard/teacher" className="text-emerald-400 font-bold py-1 px-3 flex items-center space-x-1.5">
            <span>👨‍🏫</span>
            <span>Panel Docente (Mi Horario)</span>
          </Link>
        ) : user?.role === 'encargado_orden' ? (
          <>
            <Link href="/scanner" className="hover:text-cyan-400 py-1 px-2">🎥 Escáner QR</Link>
            <Link href="/dashboard" className="text-cyan-400 font-bold py-1 px-2">🛡️ Asistencia por Grupo</Link>
          </>
        ) : !user ? (
          <>
            <Link href="/scanner" className="hover:text-cyan-400 py-1 px-3">🎥 Escáner QR</Link>
            <button onClick={openLoginModal} className="text-cyan-400 font-bold py-1 px-3 flex items-center space-x-1 cursor-pointer">
              <span>🔑 Iniciar Sesión</span>
            </button>
          </>
        ) : (
          <>
            <Link href="/scanner" className="hover:text-cyan-400 py-1 px-2">🎥 Escáner</Link>
            <Link href="/dashboard" className="hover:text-cyan-400 py-1 px-2">🛡️ Orden</Link>
            <Link href="/dashboard/teacher" className="hover:text-emerald-400 py-1 px-2">👨‍🏫 Docente</Link>
            <Link href="/dashboard/students" className="hover:text-cyan-400 py-1 px-2">👦 Alumnos</Link>
            <Link href="/dashboard/parents" className="hover:text-purple-400 py-1 px-2 text-purple-300">👨‍👩‍👧 Padres</Link>
            {(user?.role === 'administrador' || user?.role === 'administrativo' || user?.isSuperAdmin || user?.email === 'admin@admin.com') && (
              <Link href="/dashboard/qr-report" className="hover:text-cyan-400 py-1 px-2 text-cyan-300 font-bold">🖨️ QRs 1.5cm</Link>
            )}
            {(user?.isSuperAdmin || user?.email === 'admin@admin.com') && (
              <Link href="/dashboard/roles" className="hover:text-amber-400 py-1 px-2">⚙️ Roles</Link>
            )}
          </>
        )}
      </div>
    </header>
  );
}
