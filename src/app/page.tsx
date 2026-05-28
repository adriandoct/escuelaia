"use strict";

import Link from "next/link";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col justify-center items-center py-10">
      {/* Hero Section */}
      <div className="text-center max-w-4xl mx-auto space-y-6 mb-16">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold tracking-wide animate-pulse">
          <span>✨ Sistema Inteligente de Control de Accesos</span>
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none">
          Control de Asistencia <br className="hidden sm:inline" />
          Escolar con <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 bg-clip-text text-transparent">QR y WhatsApp</span>
        </h1>
        
        <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
          Gestiona ingresos y salidas en tiempo real. Importa listados desde Excel, genera credenciales digitales e informa automáticamente a los padres a través de notificaciones automatizadas.
        </p>

        {/* Call to actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
          <Link
            href="/scanner"
            className="w-full sm:w-auto relative group overflow-hidden rounded-xl p-[1px] focus:outline-none"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl group-hover:opacity-100 transition-opacity duration-300"></span>
            <div className="px-8 py-4 rounded-xl bg-[#08090d] text-base font-bold text-cyan-400 group-hover:text-white transition-colors relative flex items-center justify-center space-x-3 shadow-lg shadow-cyan-500/10">
              <span>🎥 Iniciar Escáner de Acceso</span>
              <span className="text-lg">→</span>
            </div>
          </Link>

          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-8 py-4 rounded-xl glass-panel text-base font-bold text-gray-200 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center space-x-2 hover:border-cyan-500/20"
          >
            <span>📊 Dashboard Administrativo</span>
          </Link>
        </div>
      </div>

      {/* Grid of Key Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mt-6">
        
        {/* Feature 1 */}
        <div className="glass-panel p-8 rounded-2xl relative overflow-hidden group hover:border-cyan-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors"></div>
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-2xl mb-6 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            📸
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Escaneo Inteligente</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Utiliza la cámara de cualquier celular, tablet o computadora para leer códigos QR. Reconocimiento de entrada/salida y reproducción de alertas de sonido inmediatas.
          </p>
        </div>

        {/* Feature 2 */}
        <div className="glass-panel p-8 rounded-2xl relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-2xl mb-6 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
            💬
          </div>
          <h3 className="text-xl font-bold text-white mb-2">WhatsApp Automático</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Informa al instante a padres y tutores con mensajes detallados indicando si el alumno entró o salió, la hora precisa y el estado del registro.
          </p>
        </div>

        {/* Feature 3 */}
        <div className="glass-panel p-8 rounded-2xl relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors"></div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl mb-6 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
            ⚡
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Base de Datos Híbrida</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Sincronización en tiempo real mediante Supabase, con soporte offline integrado y un Sandbox local que permite probar la aplicación sin configuraciones complejas.
          </p>
        </div>

      </div>

      {/* Database Setup Quick Info */}
      <div className="mt-16 w-full max-w-4xl p-6 rounded-2xl glass-panel border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h4 className="font-bold text-white text-sm sm:text-base">🚀 ¿Listo para conectar tu propio servidor?</h4>
          <p className="text-gray-400 text-xs sm:text-sm">Configura tu proyecto de Supabase en 5 minutos ingresando los datos de conexión.</p>
        </div>
        <a 
          href="https://supabase.com" 
          target="_blank" 
          rel="noreferrer"
          className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-all"
        >
          Crear Proyecto Supabase
        </a>
      </div>
    </div>
  );
}
