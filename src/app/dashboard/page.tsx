"use strict";

'use client';

import React, { useState, useEffect } from 'react';
import { db, Alumno, Asistencia } from '@/lib/db';
import { getWhatsAppLogs, WhatsAppLog, clearWhatsAppLogs } from '@/lib/whatsapp';
import { 
  Users, UserCheck, UserX, Clock, PhoneCall, Search, Filter, Download, RotateCcw, AlertTriangle, ArrowUpRight, Check, Send
} from 'lucide-react';

export default function DashboardPage() {
  const [students, setStudents] = useState<Alumno[]>([]);
  const [logs, setLogs] = useState<Asistencia[]>([]);
  const [waLogs, setWaLogs] = useState<WhatsAppLog[]>([]);
  
  // Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');

  // Stats States
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    scansToday: 0
  });

  useEffect(() => {
    loadData();

    // Event listeners to refresh data dynamically on new scans
    const handleScanAlert = () => {
      loadData();
    };

    const handleWaUpdate = (e: any) => {
      setWaLogs(e.detail || []);
    };

    window.addEventListener('dojoia_whatsapp_alert', handleScanAlert);
    window.addEventListener('dojoia_whatsapp_logs_updated', handleWaUpdate);

    return () => {
      window.removeEventListener('dojoia_whatsapp_alert', handleScanAlert);
      window.removeEventListener('dojoia_whatsapp_logs_updated', handleWaUpdate);
    };
  }, []);

  const loadData = async () => {
    try {
      const allStudents = await db.getAlumnos();
      const allLogs = await db.getAsistencias();
      const allWa = getWhatsAppLogs();

      setStudents(allStudents);
      setLogs(allLogs);
      setWaLogs(allWa);

      calculateStats(allStudents, allLogs);
    } catch (e) {
      console.error(e);
    }
  };

  const calculateStats = (studentList: Alumno[], logList: Asistencia[]) => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Logs registered today
    const todayLogs = logList.filter(l => l.fecha === todayStr);

    // Group logs by student to find their latest state today
    const studentStatusMap = new Map<string, 'entrada' | 'salida' | 'none'>();
    
    // Sort chronologically to get the latest status
    const sortedTodayLogs = [...todayLogs].sort(
      (a, b) => new Date(`${a.fecha}T${a.hora}`).getTime() - new Date(`${b.fecha}T${b.hora}`).getTime()
    );

    sortedTodayLogs.forEach(log => {
      studentStatusMap.set(log.alumno_id, log.tipo);
    });

    let presentCount = 0;
    let lateCount = 0;

    studentList.forEach(student => {
      const status = studentStatusMap.get(student.id) || 'none';
      if (status === 'entrada') {
        presentCount++;
      }
    });

    // Late threshold: check-in (entrada) after 07:30:00
    todayLogs.forEach(log => {
      if (log.tipo === 'entrada') {
        const timeParts = log.hora.split(':');
        const minutesSum = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
        if (minutesSum > 7 * 60 + 30) { // 7:30 AM
          lateCount++;
        }
      }
    });

    setStats({
      total: studentList.length,
      present: presentCount,
      absent: studentList.length - presentCount,
      late: lateCount,
      scansToday: todayLogs.length
    });
  };

  const handleResetData = () => {
    if (confirm('¿Restablecer la base de datos a los valores de prueba originales? Esto borrará los alumnos y asistencias actuales.')) {
      db.clearDatabase();
      clearWhatsAppLogs();
      loadData();
    }
  };

  // Filter logs logic
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.alumno?.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.alumno?.matricula.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter ? log.tipo === typeFilter : true;
    const matchesGrade = gradeFilter ? log.alumno?.grado === gradeFilter : true;

    return matchesSearch && matchesType && matchesGrade;
  });

  // Export to CSV helper
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert('No hay registros para exportar.');
      return;
    }

    const headers = ['Matricula', 'Nombre', 'Grado', 'Grupo', 'Tipo de Acceso', 'Fecha', 'Hora', 'Dispositivo', 'Responsable Scanner'];
    const rows = filteredLogs.map(l => [
      l.alumno?.matricula || '',
      l.alumno?.nombre || '',
      l.alumno?.grado || '',
      l.alumno?.grupo || '',
      l.tipo === 'entrada' ? 'Entrada' : 'Salida',
      l.fecha,
      l.hora,
      l.dispositivo || '',
      l.escaneado_por || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_accesos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Chart statistics calculations
  const getChartData = () => {
    // 1. Group accesses by hour interval
    const hours = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];
    const hourCounts = hours.map(h => {
      const matchHour = parseInt(h.split(':')[0]);
      return logs.filter(l => {
        const logHour = parseInt(l.hora.split(':')[0]);
        return logHour === matchHour;
      }).length;
    });

    const maxCount = Math.max(...hourCounts, 1);
    
    // 2. Access per grade levels
    const grades = ['1°', '2°', '3°'];
    const gradePresents = grades.map(g => {
      const gradeStudents = students.filter(s => s.grado === g);
      if (gradeStudents.length === 0) return 0;
      
      const presents = gradeStudents.filter(student => {
        const todayStr = new Date().toISOString().split('T')[0];
        const studentLogs = logs.filter(l => l.alumno_id === student.id && l.fecha === todayStr);
        if (studentLogs.length === 0) return false;
        
        // Latest log today
        const sorted = [...studentLogs].sort((a,b) => a.hora.localeCompare(b.hora));
        return sorted[sorted.length - 1].tipo === 'entrada';
      }).length;

      return Math.round((presents / gradeStudents.length) * 100);
    });

    return { hours, hourCounts, maxCount, grades, gradePresents };
  };

  const chartData = getChartData();

  return (
    <div className="space-y-8 pb-10 flex-1 flex flex-col">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Panel Administrativo</h2>
          <p className="text-gray-400 text-sm mt-1">Supervisa en tiempo real las estadísticas de ingresos, demoras y registros.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleResetData}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl glass-panel text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            title="Restablecer Datos de Prueba"
          >
            <RotateCcw size={16} />
            <span>Restablecer</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-semibold hover:bg-cyan-500/20 transition-all cursor-pointer"
          >
            <Download size={16} />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Numerical Stats Widgets Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/5 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs uppercase tracking-wider font-semibold">Total Alumnos</span>
            <Users size={16} className="text-cyan-400" />
          </div>
          <p className="text-3xl font-black text-white mt-3">{stats.total}</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs uppercase tracking-wider font-semibold">Presentes</span>
            <UserCheck size={16} className="text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-emerald-400 mt-3">{stats.present}</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/5 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs uppercase tracking-wider font-semibold">Ausentes</span>
            <UserX size={16} className="text-red-400" />
          </div>
          <p className="text-3xl font-black text-red-400 mt-3">{stats.absent}</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs uppercase tracking-wider font-semibold">Retardos</span>
            <Clock size={16} className="text-amber-400" />
          </div>
          <p className="text-3xl font-black text-amber-400 mt-3">{stats.late}</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group col-span-2 md:col-span-1">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs uppercase tracking-wider font-semibold">Escaneos Hoy</span>
            <ArrowUpRight size={16} className="text-blue-400" />
          </div>
          <p className="text-3xl font-black text-blue-400 mt-3">{stats.scansToday}</p>
        </div>

      </div>

      {/* Main Grid: Analytical Charts & Live WhatsApp Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Custom charts & Log history table (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Chart 1: Hourly Access Density */}
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Densidad Horaria de Accesos</h3>
              
              <div className="h-44 flex items-end justify-between gap-2 pt-4 relative">
                {chartData.hourCounts.map((val, idx) => {
                  const percent = Math.max(5, Math.round((val / chartData.maxCount) * 100));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center group h-full justify-end">
                      <div className="text-[10px] text-gray-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity font-bold">{val}</div>
                      <div 
                        style={{ height: `${percent}%` }}
                        className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-md group-hover:from-cyan-400 group-hover:to-cyan-300 transition-all shadow-[0_0_10px_rgba(6,182,212,0.1)] relative"
                      >
                        {val > 0 && <span className="absolute inset-x-0 top-0 h-1 bg-white/30 rounded-t-md"></span>}
                      </div>
                      <span className="text-[9px] text-gray-500 mt-2 font-mono">{chartData.hours[idx]}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart 2: Attendance Rates by Grades */}
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Tasa de Asistencia por Grado</h3>
              
              <div className="space-y-4 pt-2">
                {chartData.grades.map((grade, idx) => {
                  const percent = chartData.gradePresents[idx];
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-white">{grade} Grado</span>
                        <span className="text-cyan-400 font-bold">{percent}% presentes</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div 
                          style={{ width: `${percent}%` }}
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Logs Filter bar */}
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <h3 className="text-base font-bold text-white">Historial de Accesos</h3>
              
              {/* Controls */}
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                  <input
                    type="text"
                    placeholder="Filtrar por estudiante..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full glass-input py-1.5 pl-8 pr-3 rounded-lg text-xs"
                  />
                </div>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="glass-input px-3 py-1.5 rounded-lg text-xs"
                >
                  <option value="">Todos los Accesos</option>
                  <option value="entrada">Entradas</option>
                  <option value="salida">Salidas</option>
                </select>

                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="glass-input px-3 py-1.5 rounded-lg text-xs"
                >
                  <option value="">Todos los Grados</option>
                  <option value="1°">1°</option>
                  <option value="2°">2°</option>
                  <option value="3°">3°</option>
                </select>
              </div>
            </div>

            {/* Logs Table */}
            <div className="overflow-x-auto">
              {filteredLogs.length === 0 ? (
                <div className="text-center text-xs text-gray-500 py-8">
                  Ningún escaneo de acceso registrado.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-gray-400 uppercase tracking-wider font-semibold">
                      <th className="py-3 px-2">Alumno</th>
                      <th className="py-3 px-2">Matrícula</th>
                      <th className="py-3 px-2">Grado & Grupo</th>
                      <th className="py-3 px-2">Acceso</th>
                      <th className="py-3 px-2">Hora</th>
                      <th className="py-3 px-2">Notificación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {filteredLogs.slice(0, 15).map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-3 px-2 font-medium text-white flex items-center space-x-2.5">
                          {/* Mini Avatar */}
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-800 border border-white/10 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={log.alumno?.foto_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${log.alumno?.matricula}`} 
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span>{log.alumno?.nombre}</span>
                        </td>
                        <td className="py-3 px-2 font-mono">{log.alumno?.matricula}</td>
                        <td className="py-3 px-2 font-medium">{log.alumno?.grado} &quot;{log.alumno?.grupo}&quot;</td>
                        <td className="py-3 px-2">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.tipo === 'entrada' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}>
                            {log.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                          </span>
                        </td>
                        <td className="py-3 px-2 font-mono text-white">{log.hora}</td>
                        <td className="py-3 px-2 text-emerald-400 flex items-center space-x-1 font-semibold">
                          <Check size={12} />
                          <span>WhatsApp Enviado</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </div>

        </div>

        {/* Right Side: Smartphone Device Preview (1 col) */}
        <div className="flex flex-col">
          
          <div className="glass-panel p-6 rounded-2xl border-cyan-500/10 flex-1 flex flex-col space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>Notificaciones Live</span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </h3>
              <p className="text-gray-400 text-xs">Monitoreo de notificaciones enviadas a acudientes.</p>
            </div>

            {/* Smart Phone Container */}
            <div className="mx-auto w-[270px] h-[520px] rounded-[36px] border-[8px] border-[#1f2937] bg-[#07090e] shadow-2xl relative overflow-hidden flex flex-col shrink-0">
              
              {/* iPhone Notch Speaker */}
              <div className="absolute top-0 inset-x-0 h-5 flex justify-center z-30">
                <div className="w-24 h-4 bg-[#1f2937] rounded-b-xl flex items-center justify-center space-x-1.5 px-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
                  <div className="w-8 h-1 bg-[#2e3748] rounded-full"></div>
                </div>
              </div>

              {/* Status bar details inside phone */}
              <div className="h-9 bg-[#0b0e14] px-5 pt-3.5 flex justify-between items-center text-[8px] text-gray-500 z-20 shrink-0 font-bold">
                <span>07:12 AM</span>
                <div className="flex space-x-1 items-center">
                  <span>📶</span>
                  <span>🔋 98%</span>
                </div>
              </div>

              {/* WhatsApp Header App Bar inside phone */}
              <div className="bg-[#121b22] px-4 py-2 flex items-center space-x-2 border-b border-[#222d34] z-20 shrink-0">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-black text-[10px]">D</div>
                <div>
                  <h4 className="text-[10px] font-bold text-[#e9edef] leading-tight">Escuela DOJOIA</h4>
                  <p className="text-[7px] text-[#8696a0]">Notificaciones de Acceso</p>
                </div>
              </div>

              {/* Chat Messages Log Area inside phone */}
              <div className="flex-1 bg-[#0b141a] p-3 overflow-y-auto space-y-3 flex flex-col justify-start relative scrollbar-none">
                
                {/* Background WhatsApp style pattern */}
                <div className="absolute inset-0 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] opacity-[0.03] pointer-events-none"></div>

                {waLogs.length === 0 ? (
                  <div className="text-center text-gray-600 text-[9px] py-20 z-10 space-y-2">
                    <span>💬</span>
                    <p>Bandeja de salida vacía. Escanea un QR de alumno para simular notificaciones.</p>
                  </div>
                ) : (
                  waLogs.map((item) => (
                    <div key={item.id} className="bg-[#202c33] rounded-lg p-2.5 text-[9px] text-[#e9edef] max-w-[90%] border-l-2 border-[#00a884] self-start shadow-md z-10 animate-slide-up">
                      <div className="flex justify-between items-center text-[#8696a0] text-[7px] mb-1 font-semibold">
                        <span>Para: {item.tutor}</span>
                        <span>{item.telefono}</span>
                      </div>
                      
                      <p className="whitespace-pre-line leading-relaxed font-sans">{item.mensaje}</p>
                      
                      <div className="text-right text-[7px] text-[#8696a0] mt-1.5 flex items-center justify-end space-x-1">
                        <span>{item.hora.substring(0, 5)}</span>
                        <span className="text-[#53bdeb] flex">
                          <Check size={9} />
                          <Check size={9} className="-ml-1" />
                        </span>
                      </div>
                    </div>
                  ))
                )}

              </div>

              {/* Chat Input placeholder bar inside phone */}
              <div className="bg-[#121b22] p-2 flex items-center space-x-2 shrink-0">
                <div className="flex-1 bg-[#2a3942] rounded-full py-1 px-3 text-[8px] text-[#8696a0]">
                  Escribe un mensaje...
                </div>
                <div className="w-5 h-5 rounded-full bg-[#00a884] flex items-center justify-center text-white text-[10px]">
                  <Send size={10} />
                </div>
              </div>

            </div>

            {/* Clear logs link */}
            {waLogs.length > 0 && (
              <button
                onClick={() => {
                  clearWhatsAppLogs();
                  loadData();
                }}
                className="text-center text-xs text-gray-500 hover:text-red-400 hover:underline transition-colors mt-2"
              >
                Limpiar Historial de WhatsApp
              </button>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
