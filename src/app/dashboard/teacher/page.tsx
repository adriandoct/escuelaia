"use strict";

'use client';

import React, { useState, useEffect } from 'react';
import { db, Alumno, Asistencia } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import { 
  BookOpen, CheckCircle, Clock, XCircle, Users, Search, Filter, Download, UserCheck, AlertTriangle, RefreshCw
} from 'lucide-react';

export default function TeacherDashboardPage() {
  const { user } = useAuth();
  
  const [students, setStudents] = useState<Alumno[]>([]);
  const [todayLogs, setTodayLogs] = useState<Asistencia[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('1°');
  const [selectedGroup, setSelectedGroup] = useState<string>('A');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const allStudents = await db.getAlumnos();
      const allLogs = await db.getAsistencias();
      const todayStr = new Date().toISOString().split('T')[0];
      const logsToday = allLogs.filter(l => l.fecha === todayStr);

      setStudents(allStudents);
      setTodayLogs(logsToday);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Filter students by Grade, Group and Search Query
  const classStudents = students.filter(s => {
    const matchesGrade = s.grado === selectedGrade;
    const matchesGroup = s.grupo === selectedGroup;
    const fullName = `${s.nombre} ${s.apellido_paterno} ${s.apellido_materno || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || s.matricula.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGrade && matchesGroup && matchesSearch;
  });

  // Calculate status for each student in the selected class
  const getStudentStatus = (studentId: string) => {
    const studentLogs = todayLogs.filter(l => l.alumno_id === studentId);
    if (studentLogs.length === 0) {
      return { status: 'ausente', label: 'Ausente', color: 'text-red-400 bg-red-500/10 border-red-500/20', time: '-' };
    }

    // Sort chronologically
    const sorted = [...studentLogs].sort((a, b) => a.hora.localeCompare(b.hora));
    const firstEntry = sorted.find(l => l.tipo === 'entrada');

    if (!firstEntry) {
      return { status: 'ausente', label: 'Ausente', color: 'text-red-400 bg-red-500/10 border-red-500/20', time: '-' };
    }

    // Check if late (after 07:30:00)
    const [h, m] = firstEntry.hora.split(':').map(Number);
    const minutes = h * 60 + m;
    const isLate = minutes > (7 * 60 + 30);

    if (isLate) {
      return { status: 'retardo', label: 'Retardo', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', time: firstEntry.hora };
    }

    return { status: 'presente', label: 'Presente', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', time: firstEntry.hora };
  };

  // Class Stats
  const classStats = classStudents.reduce((acc, student) => {
    const { status } = getStudentStatus(student.id);
    if (status === 'presente') acc.present++;
    else if (status === 'retardo') acc.late++;
    else acc.absent++;
    return acc;
  }, { present: 0, late: 0, absent: 0 });

  // Manual Attendance Registration by Teacher
  const handleRegisterManualAttendance = async (student: Alumno) => {
    try {
      await db.registrarAsistencia(
        student.matricula,
        'entrada',
        'Panel Docente',
        `Aula Grado ${student.grado} ${student.grupo}`,
        user?.name || 'Docente'
      );
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al registrar asistencia.');
    }
  };

  const handleExportClassList = () => {
    if (classStudents.length === 0) {
      alert('No hay alumnos en el grupo seleccionado.');
      return;
    }

    const headers = ['Matricula', 'Alumno', 'Grado', 'Grupo', 'Estado Hoy', 'Hora Entrada'];
    const rows = classStudents.map(s => {
      const { label, time } = getStudentStatus(s.id);
      return [
        s.matricula,
        `${s.nombre} ${s.apellido_paterno} ${s.apellido_materno || ''}`.trim(),
        s.grado,
        s.grupo,
        label,
        time
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `lista_asistencia_${selectedGrade}_${selectedGroup}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 pb-10 flex-1 flex flex-col">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-panel p-6 rounded-3xl border-emerald-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <span>👨‍🏫 Panel Exclusivo para Docentes</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Pase de Lista por Grupo</h2>
          <p className="text-gray-400 text-sm">
            Docente activo: <span className="text-white font-semibold">{user?.name || 'Profesor'}</span> ({user?.email})
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadData}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl glass-panel text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={handleExportClassList}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 transition-all cursor-pointer"
          >
            <Download size={16} />
            <span>Exportar Lista CSV</span>
          </button>
        </div>
      </div>

      {/* Class Selector Bar */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Grade & Group Pickers */}
        <div className="flex items-center space-x-4 w-full md:w-auto">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Grado:</span>
            {['1°', '2°', '3°'].map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGrade(g)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedGrade === g
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20'
                    : 'glass-panel text-gray-400 hover:text-white'
                }`}
              >
                {g} Grado
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Grupo:</span>
            {['A', 'B'].map((grp) => (
              <button
                key={grp}
                onClick={() => setSelectedGroup(grp)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedGroup === grp
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20'
                    : 'glass-panel text-gray-400 hover:text-white'
                }`}
              >
                Grupo {grp}
              </button>
            ))}
          </div>
        </div>

        {/* Roster Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            placeholder="Buscar alumno por nombre o matrícula..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full glass-input py-2 pl-9 pr-4 rounded-xl text-xs text-white"
          />
        </div>

      </div>

      {/* Class Statistics Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="glass-panel p-5 rounded-2xl">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs uppercase font-bold">Total Alumnos</span>
            <Users size={18} className="text-cyan-400" />
          </div>
          <p className="text-3xl font-black text-white mt-2">{classStudents.length}</p>
          <span className="text-[10px] text-gray-500">{selectedGrade} &quot;{selectedGroup}&quot;</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-emerald-500/20">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs uppercase font-bold">Presentes</span>
            <CheckCircle size={18} className="text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-emerald-400 mt-2">{classStats.present}</p>
          <span className="text-[10px] text-emerald-500/70 font-semibold">En tiempo reglamentario</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-amber-500/20">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs uppercase font-bold">Retardos</span>
            <Clock size={18} className="text-amber-400" />
          </div>
          <p className="text-3xl font-black text-amber-400 mt-2">{classStats.late}</p>
          <span className="text-[10px] text-amber-500/70 font-semibold">Ingreso posterior a 07:30</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-red-500/20">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs uppercase font-bold">Ausentes</span>
            <XCircle size={18} className="text-red-400" />
          </div>
          <p className="text-3xl font-black text-red-400 mt-2">{classStats.absent}</p>
          <span className="text-[10px] text-red-500/70 font-semibold">Sin registro de entrada hoy</span>
        </div>

      </div>

      {/* Class Roster Table */}
      <div className="glass-panel p-6 rounded-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <span>Lista de Clase - {selectedGrade} Grado &quot;{selectedGroup}&quot;</span>
            <span className="text-xs font-normal text-gray-400">({classStudents.length} alumnos inscritos)</span>
          </h3>
        </div>

        {classStudents.length === 0 ? (
          <div className="text-center py-12 text-gray-500 space-y-2">
            <Users size={32} className="mx-auto text-gray-600" />
            <p className="text-sm font-semibold">No se encontraron alumnos para el grupo {selectedGrade} &quot;{selectedGroup}&quot;.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 uppercase font-semibold">
                  <th className="py-3 px-3">Alumno</th>
                  <th className="py-3 px-3">Matrícula</th>
                  <th className="py-3 px-3">Tutor Registrado</th>
                  <th className="py-3 px-3">Teléfono Notificación</th>
                  <th className="py-3 px-3">Estado Hoy</th>
                  <th className="py-3 px-3">Hora Entrada</th>
                  <th className="py-3 px-3 text-right">Acciones Docente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-200">
                {classStudents.map((student) => {
                  const { status, label, color, time } = getStudentStatus(student.id);

                  return (
                    <tr key={student.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-3 font-medium text-white flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-800 border border-white/10 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={student.foto_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${student.matricula}`} 
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="font-semibold text-sm">
                          {student.nombre} {student.apellido_paterno} {student.apellido_materno || ''}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-mono text-cyan-400">{student.matricula}</td>
                      <td className="py-3.5 px-3 text-gray-300">{student.tutor}</td>
                      <td className="py-3.5 px-3 font-mono text-gray-400">{student.telefono}</td>

                      <td className="py-3.5 px-3">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${color}`}>
                          {status === 'presente' && <CheckCircle size={12} />}
                          {status === 'retardo' && <Clock size={12} />}
                          {status === 'ausente' && <XCircle size={12} />}
                          <span>{label}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-mono text-white">{time}</td>

                      <td className="py-3.5 px-3 text-right">
                        {status === 'ausente' ? (
                          <button
                            onClick={() => handleRegisterManualAttendance(student)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold transition-all cursor-pointer"
                          >
                            Registrar Asistencia
                          </button>
                        ) : (
                          <span className="text-gray-500 text-[11px]">Registrado ✓</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}
