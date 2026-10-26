"use strict";

'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth, Role } from '@/lib/auth';
import { LogIn, LogOut, Shield, User, Sparkles, BookOpen, QrCode, Users } from 'lucide-react';

export default function HeaderNav() {
  const { user, openLoginModal, logout } = useAuth();

  const getRoleBadge = (role?: Role) => {
    switch (role) {
      case 'administrador':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black tracking-wider uppercase">
            <span>👑</span>
            <span>Administrador</span>
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

          {/* Nav Links based on Role */}
          <nav className="hidden md:flex items-center space-x-2 text-xs font-semibold text-gray-300">
            
            {/* Admin & Order Supervisor get QR Scanner */}
            {(!user || user.role === 'administrador' || user.role === 'encargado_orden') && (
              <Link 
                href="/scanner" 
                className="hover:text-cyan-400 transition-colors py-1.5 px-3 rounded-lg hover:bg-white/5 flex items-center space-x-1.5"
              >
                <QrCode size={14} className="text-cyan-400" />
                <span>Escáner QR</span>
              </Link>
            )}

            {/* Admin & Order Supervisor get Main Dashboard */}
            {(!user || user.role === 'administrador' || user.role === 'encargado_orden') && (
              <Link 
                href="/dashboard" 
                className="hover:text-cyan-400 transition-colors py-1.5 px-3 rounded-lg hover:bg-white/5 flex items-center space-x-1.5"
              >
                <Shield size={14} className="text-blue-400" />
                <span>{user ? (user.role === 'encargado_orden' ? 'Panel Disciplinar' : 'Panel Admin') : 'Dashboard Principal'}</span>
              </Link>
            )}

            {/* Teacher Panel */}
            {(!user || user.role === 'administrador' || user.role === 'docente') && (
              <Link 
                href="/dashboard/teacher" 
                className="hover:text-emerald-400 transition-colors py-1.5 px-3 rounded-lg hover:bg-white/5 flex items-center space-x-1.5"
              >
                <BookOpen size={14} className="text-emerald-400" />
                <span>Panel Docente</span>
              </Link>
            )}

            {/* Students list */}
            <Link 
              href="/dashboard/students" 
              className="hover:text-cyan-400 transition-colors py-1.5 px-3 rounded-lg hover:bg-white/5 flex items-center space-x-1.5"
            >
              <Users size={14} className="text-gray-400" />
              <span>Alumnos</span>
            </Link>

            {/* Admin QR stickers report */}
            {(!user || user.role === 'administrador') && (
              <Link 
                href="/dashboard/qr-report" 
                className="hover:text-cyan-400 transition-colors py-1.5 px-3 rounded-lg hover:bg-white/5 flex items-center space-x-1.5 text-cyan-300 font-bold"
                title="Generar e imprimir etiquetas QR por grupo (1.5x1.5 cm)"
              >
                <QrCode size={14} className="text-cyan-400" />
                <span>Reporte QRs (1.5cm)</span>
              </Link>
            )}

            {/* Admin user role manager */}
            {user?.role === 'administrador' && (
              <Link 
                href="/dashboard/roles" 
                className="hover:text-amber-400 transition-colors py-1.5 px-3 rounded-lg hover:bg-white/5 flex items-center space-x-1.5 text-amber-300 font-bold"
              >
                <Sparkles size={14} />
                <span>Permisos Roles</span>
              </Link>
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
                  {getRoleBadge(user.role)}
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
        {(!user || user.role === 'administrador' || user.role === 'encargado_orden') && (
          <Link href="/scanner" className="hover:text-cyan-400 py-1 px-2">🎥 Escáner</Link>
        )}
        {(!user || user.role === 'administrador' || user.role === 'encargado_orden') && (
          <Link href="/dashboard" className="hover:text-cyan-400 py-1 px-2">🛡️ Orden</Link>
        )}
        {(!user || user.role === 'administrador' || user.role === 'docente') && (
          <Link href="/dashboard/teacher" className="hover:text-emerald-400 py-1 px-2">👨‍🏫 Docente</Link>
        )}
        <Link href="/dashboard/students" className="hover:text-cyan-400 py-1 px-2">👦 Alumnos</Link>
        {user?.role === 'administrador' && (
          <Link href="/dashboard/roles" className="hover:text-amber-400 py-1 px-2">⚙️ Roles</Link>
        )}
      </div>
    </header>
  );
}
