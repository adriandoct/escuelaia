'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { db, Alumno, Asistencia } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import { 
  sendWhatsAppNotification, 
  formatWhatsAppMessage, 
  getWhatsAppSendUrl, 
  getWhatsAppLogs, 
  WhatsAppLog 
} from '@/lib/whatsapp';
import { 
  Users, Search, UserCheck, UserX, Phone, MessageSquare, CheckCircle2, 
  AlertTriangle, Shield, Clock, Send, Edit3, ArrowRight, X, ExternalLink,
  Sparkles, RefreshCw, Filter, FileSpreadsheet, Download, Check, ShieldCheck,
  Building2, LogIn, LogOut, Info, Bell
} from 'lucide-react';

// Helper to determine if student has a valid named tutor
export const hasAssignedTutor = (tutor?: string): boolean => {
  if (!tutor) return false;
  const clean = tutor.trim();
  if (
    clean === '' || 
    clean.toLowerCase() === 'no asignado' || 
    clean.toLowerCase() === 'sin tutor' || 
    clean.toLowerCase() === 'pendiente' || 
    clean.toLowerCase().startsWith('tutor de ') ||
    clean.toLowerCase().startsWith('tutor del alumno')
  ) {
    return false;
  }
  return true;
};

export default function ParentsDashboardPage() {
  const { user } = useAuth();

  // Core Data States
  const [students, setStudents] = useState<Alumno[]>([]);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [waLogs, setWaLogs] = useState<WhatsAppLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [tutorStatusFilter, setTutorStatusFilter] = useState<'all' | 'unassigned' | 'assigned'>('all');
  const [campusStatusFilter, setCampusStatusFilter] = useState<'all' | 'inside' | 'outside' | 'none'>('all');

  // Tutor Assignment / Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Alumno | null>(null);
  const [tutorNameInput, setTutorNameInput] = useState('');
  const [tutorPhoneInput, setTutorPhoneInput] = useState('');
  const [tutorRelationshipInput, setTutorRelationshipInput] = useState('Madre');
  const [isSavingTutor, setIsSavingTutor] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // WhatsApp Message Preview & Direct Notify Modal States
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [selectedStudentForNotify, setSelectedStudentForNotify] = useState<Alumno | null>(null);
  const [notifyType, setNotifyType] = useState<'entrada' | 'salida'>('entrada');
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Tab State: 'students' or 'notifications_history'
  const [activeTab, setActiveTab] = useState<'students' | 'history'>('students');

  // Load Initial Data
  useEffect(() => {
    loadAllData();

    // Listen for live student updates and attendance triggers
    const handleStudentUpdate = (e: any) => {
      const updated: Alumno = e.detail;
      if (updated) {
        setStudents(prev => prev.map(s => (s.id === updated.id || s.matricula === updated.matricula) ? updated : s));
      }
    };

    const handleWaUpdate = () => {
      setWaLogs(getWhatsAppLogs());
    };

    window.addEventListener('dojoia_alumnos_updated', handleStudentUpdate);
    window.addEventListener('dojoia_whatsapp_logs_updated', handleWaUpdate);

    return () => {
      window.removeEventListener('dojoia_alumnos_updated', handleStudentUpdate);
      window.removeEventListener('dojoia_whatsapp_logs_updated', handleWaUpdate);
    };
  }, []);

  const loadAllData = async () => {
    try {
      setIsRefreshing(true);
      const [allStudents, allLogs] = await Promise.all([
        db.getAlumnos(),
        db.getAsistencias()
      ]);
      setStudents(allStudents);
      setAsistencias(allLogs);
      setWaLogs(getWhatsAppLogs());
    } catch (err) {
      console.error('Error loading parents module data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Build today's latest status map for each student
  const studentTodayStatusMap = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayLogs = asistencias.filter(l => l.fecha === todayStr);

    // Sort chronologically ascending so later records overwrite earlier ones
    const sorted = [...todayLogs].sort(
      (a, b) => new Date(`${a.fecha}T${a.hora}`).getTime() - new Date(`${b.fecha}T${b.hora}`).getTime()
    );

    const map = new Map<string, { status: 'entrada' | 'salida'; lastLog: Asistencia }>();
    sorted.forEach(log => {
      map.set(log.alumno_id, {
        status: log.tipo,
        lastLog: log
      });
    });

    return map;
  }, [asistencias]);

  // Available groups and grades
  const grades = useMemo(() => {
    return Array.from(new Set(students.map(s => s.grado).filter(Boolean))).sort();
  }, [students]);

  const groups = useMemo(() => {
    return Array.from(new Set(students.map(s => s.grupo).filter(Boolean))).sort();
  }, [students]);

  // Overall Statistics
  const stats = useMemo(() => {
    let assignedCount = 0;
    let unassignedCount = 0;
    let insideCount = 0;
    let outsideCount = 0;

    students.forEach(st => {
      if (hasAssignedTutor(st.tutor)) {
        assignedCount++;
      } else {
        unassignedCount++;
      }

      const statusInfo = studentTodayStatusMap.get(st.id);
      if (statusInfo?.status === 'entrada') {
        insideCount++;
      } else if (statusInfo?.status === 'salida') {
        outsideCount++;
      }
    });

    // WhatsApp logs sent today
    const todayStr = new Date().toISOString().split('T')[0];
    const waTodayCount = waLogs.filter(w => w.fecha === todayStr).length;

    return {
      total: students.length,
      assignedCount,
      unassignedCount,
      insideCount,
      outsideCount,
      waTodayCount
    };
  }, [students, studentTodayStatusMap, waLogs]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(st => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullName = `${st.nombre} ${st.apellido_paterno} ${st.apellido_materno || ''}`.toLowerCase();
        const mat = (st.matricula || '').toLowerCase();
        const tutor = (st.tutor || '').toLowerCase();
        const phone = (st.telefono || '').replace(/\D/g, '');
        const cleanQ = q.replace(/\D/g, '');

        const matchesName = fullName.includes(q);
        const matchesMat = mat.includes(q);
        const matchesTutor = tutor.includes(q);
        const matchesPhone = cleanQ ? phone.includes(cleanQ) : false;

        if (!matchesName && !matchesMat && !matchesTutor && !matchesPhone) {
          return false;
        }
      }

      // Grade filter
      if (gradeFilter && st.grado !== gradeFilter) return false;

      // Group filter
      if (groupFilter && st.grupo !== groupFilter) return false;

      // Tutor assignment filter
      const isAssigned = hasAssignedTutor(st.tutor);
      if (tutorStatusFilter === 'assigned' && !isAssigned) return false;
      if (tutorStatusFilter === 'unassigned' && isAssigned) return false;

      // Campus status filter
      const currentCampus = studentTodayStatusMap.get(st.id)?.status;
      if (campusStatusFilter === 'inside' && currentCampus !== 'entrada') return false;
      if (campusStatusFilter === 'outside' && currentCampus !== 'salida') return false;
      if (campusStatusFilter === 'none' && currentCampus !== undefined) return false;

      return true;
    });
  }, [students, searchQuery, gradeFilter, groupFilter, tutorStatusFilter, campusStatusFilter, studentTodayStatusMap]);

  // Open Tutor Edit Modal
  const handleOpenEditTutor = (student: Alumno) => {
    setEditingStudent(student);
    // If the tutor is currently generic ("Tutor de ..."), leave input empty so admin can type fresh name
    const currentTutor = student.tutor || '';
    if (hasAssignedTutor(currentTutor)) {
      setTutorNameInput(currentTutor);
    } else {
      setTutorNameInput('');
    }
    setTutorPhoneInput(student.telefono || '');
    setTutorRelationshipInput('Madre');
    setSaveError(null);
    setIsEditModalOpen(true);
  };

  // Save Tutor Information
  const handleSaveTutor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const trimmedName = tutorNameInput.trim();
    if (!trimmedName) {
      setSaveError('Por favor ingresa el nombre completo del tutor responsable.');
      return;
    }

    let cleanPhone = tutorPhoneInput.trim().replace(/[\s\-\(\)]/g, '');
    if (/^\d{10}$/.test(cleanPhone)) {
      cleanPhone = `+52${cleanPhone}`;
    } else if (/^52\d{10}$/.test(cleanPhone)) {
      cleanPhone = `+${cleanPhone}`;
    }

    setIsSavingTutor(true);
    setSaveError(null);

    try {
      const updated = await db.updateAlumno(editingStudent.id, {
        tutor: trimmedName,
        telefono: cleanPhone || editingStudent.telefono || '+52',
        matricula: editingStudent.matricula
      });

      // Update state locally
      setStudents(prev => prev.map(s => (s.id === updated.id || s.matricula === updated.matricula) ? updated : s));
      setIsEditModalOpen(false);
      showToast(`✅ Tutor "${updated.tutor}" asignado correctamente a ${updated.nombre}.`);
    } catch (err: any) {
      setSaveError('Error al guardar datos del tutor: ' + (err.message || err));
    } finally {
      setIsSavingTutor(false);
    }
  };

  // Open Notification Modal for Quick Notify
  const handleOpenNotifyModal = (student: Alumno, defaultType: 'entrada' | 'salida') => {
    setSelectedStudentForNotify(student);
    setNotifyType(defaultType);
    setIsNotifyModalOpen(true);
  };

  // Send WhatsApp Notification (Entry or Exit)
  const handleSendNotification = async () => {
    if (!selectedStudentForNotify) return;

    setIsSendingWhatsApp(true);
    try {
      // 1. Create or retrieve the attendance log
      const todayStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toTimeString().split(' ')[0];

      // Register attendance event to persist in system and reflect real status
      const { asistencia, alumno } = await db.registrarAsistencia(
        selectedStudentForNotify.matricula,
        notifyType,
        'Panel Padres de Familia',
        'Acceso Principal Plantel Urbivillas',
        user?.name || 'Administración Escolar'
      );

      // 2. Dispatch the WhatsApp notification
      const result = await sendWhatsAppNotification(alumno, asistencia);

      // Refresh data
      await loadAllData();
      setIsNotifyModalOpen(false);

      if (result.success) {
        showToast(
          `📲 Notificación de ${notifyType.toUpperCase()} enviada exitosamente a ${alumno.tutor} (${alumno.telefono}).`
        );
      } else {
        showToast(`⚠️ Alerta registrada en el sistema. Puedes enviar manualmente el WhatsApp.`);
      }
    } catch (err: any) {
      alert('Error al registrar y notificar: ' + (err.message || err));
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  // Get preview WhatsApp message for the modal
  const previewMessage = useMemo(() => {
    if (!selectedStudentForNotify) return '';
    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0];

    const mockLog: Asistencia = {
      id: 'preview',
      alumno_id: selectedStudentForNotify.id,
      tipo: notifyType,
      fecha: todayStr,
      hora: timeStr,
      ubicacion: 'Acceso Principal Plantel Urbivillas'
    };

    return formatWhatsAppMessage(selectedStudentForNotify, mockLog);
  }, [selectedStudentForNotify, notifyType]);

  // Export Parents & Tutors Directory
  const handleExportDirectory = () => {
    if (students.length === 0) return;

    const headers = ['Matrícula', 'Nombre Alumno', 'Grado', 'Grupo', 'Tutor Asignado', 'Teléfono Tutor / WhatsApp', 'Estado Asignación', 'Estado Hoy en Plantel'];
    const rows = students.map(st => {
      const isAssigned = hasAssignedTutor(st.tutor);
      const campusState = studentTodayStatusMap.get(st.id)?.status;
      const campusText = campusState === 'entrada' ? 'En el Plantel' : campusState === 'salida' ? 'Salió del Plantel' : 'Sin registro hoy';

      return [
        `"${st.matricula}"`,
        `"${st.nombre} ${st.apellido_paterno} ${st.apellido_materno || ''}".trim()`,
        `"${st.grado}"`,
        `"${st.grupo}"`,
        `"${st.tutor || 'No asignado'}"`,
        `"${st.telefono || ''}"`,
        `"${isAssigned ? 'Asignado' : 'Pendiente'}"`,
        `"${campusText}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Directorio_Tutores_CECYTE_Urbivillas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 max-w-md bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 p-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-center space-x-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          <div className="text-sm font-medium leading-snug">{toastMessage}</div>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-emerald-400 hover:text-white p-1 rounded-lg"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/30 text-purple-400 shadow-lg shadow-purple-500/10">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                Módulo de Padres de Familia y Tutores
                <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  Control & Alertas
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-400">
                Supervisión de tutores asignados, alertas automáticas de ingreso y salida al plantel vía WhatsApp.
              </p>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={loadAllData}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold border border-white/10 transition-all cursor-pointer disabled:opacity-50"
            title="Recargar datos de alumnos y asistencia"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-cyan-400' : ''} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={handleExportDirectory}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all cursor-pointer shadow-sm"
            title="Descargar lista completa en CSV/Excel"
          >
            <Download size={14} />
            <span>Exportar Directorio</span>
          </button>

          <Link
            href="/scanner"
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Building2 size={14} />
            <span>Ir al Escáner</span>
          </Link>
        </div>
      </div>

      {/* Live Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Students */}
        <div className="p-4 rounded-2xl bg-[#0b0f19] border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium mb-1">
            <span>Alumnos Totales</span>
            <Users size={16} className="text-gray-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats.total}</div>
          <div className="text-[10px] text-gray-500 mt-1">Matrícula CECYTE</div>
        </div>

        {/* Assigned Tutors */}
        <div 
          onClick={() => setTutorStatusFilter('assigned')}
          className="p-4 rounded-2xl bg-[#0b0f19] border border-emerald-500/20 hover:border-emerald-500/40 relative overflow-hidden cursor-pointer transition-all hover:bg-emerald-950/10"
        >
          <div className="flex items-center justify-between text-emerald-400 text-xs font-medium mb-1">
            <span>Con Tutor Asignado</span>
            <UserCheck size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{stats.assignedCount}</div>
          <div className="text-[10px] text-emerald-500/80 mt-1">
            {stats.total > 0 ? `${Math.round((stats.assignedCount / stats.total) * 100)}% cubierto` : '0%'}
          </div>
        </div>

        {/* Unassigned Tutors (CRITICAL ACTIONABLE) */}
        <div 
          onClick={() => setTutorStatusFilter('unassigned')}
          className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/40 hover:border-amber-400 relative overflow-hidden cursor-pointer transition-all hover:bg-amber-950/30 group shadow-lg shadow-amber-500/5"
        >
          <div className="flex items-center justify-between text-amber-300 text-xs font-bold mb-1">
            <span>Falta Nombre Tutor</span>
            <AlertTriangle size={16} className="text-amber-400 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-amber-300">{stats.unassignedCount}</div>
          <div className="text-[10px] text-amber-400/90 font-medium mt-1 group-hover:underline">
            Haz clic para completar ✍️
          </div>
        </div>

        {/* Currently in Campus */}
        <div 
          onClick={() => setCampusStatusFilter('inside')}
          className="p-4 rounded-2xl bg-[#0b0f19] border border-cyan-500/20 hover:border-cyan-500/40 relative overflow-hidden cursor-pointer transition-all hover:bg-cyan-950/10"
        >
          <div className="flex items-center justify-between text-cyan-400 text-xs font-medium mb-1">
            <span>En el Plantel</span>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
          </div>
          <div className="text-2xl font-black text-cyan-400">{stats.insideCount}</div>
          <div className="text-[10px] text-cyan-500/80 mt-1">Ingreso registrado hoy</div>
        </div>

        {/* Exited Campus */}
        <div 
          onClick={() => setCampusStatusFilter('outside')}
          className="p-4 rounded-2xl bg-[#0b0f19] border border-rose-500/20 hover:border-rose-500/40 relative overflow-hidden cursor-pointer transition-all hover:bg-rose-950/10"
        >
          <div className="flex items-center justify-between text-rose-400 text-xs font-medium mb-1">
            <span>Salieron Hoy</span>
            <LogOut size={16} className="text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">{stats.outsideCount}</div>
          <div className="text-[10px] text-rose-500/80 mt-1">Salida notificada</div>
        </div>

        {/* WhatsApp Alerts Sent Today */}
        <div 
          onClick={() => setActiveTab('history')}
          className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 hover:border-purple-500/40 relative overflow-hidden cursor-pointer transition-all hover:bg-purple-950/30"
        >
          <div className="flex items-center justify-between text-purple-300 text-xs font-medium mb-1">
            <span>Alertas WhatsApp</span>
            <MessageSquare size={16} className="text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-300">{stats.waTodayCount}</div>
          <div className="text-[10px] text-purple-400/80 mt-1">Enviadas a tutores hoy</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-white/10 space-x-4">
        <button
          onClick={() => setActiveTab('students')}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'students'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Users size={16} />
          <span>Directorio Alumnos y Tutores ({filteredStudents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Bell size={16} />
          <span>Historial de Notificaciones ({waLogs.length})</span>
        </button>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'students' ? (
        <div className="space-y-4">
          
          {/* Search and Filters Bar */}
          <div className="p-4 rounded-2xl bg-[#0b0f19] border border-white/5 space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar alumno por nombre, matrícula, nombre de tutor o celular..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none focus:border-purple-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Grade Filter */}
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-gray-300 text-xs font-medium focus:outline-none focus:border-purple-500"
              >
                <option value="">Todos los Grados</option>
                {grades.map(g => (
                  <option key={g} value={g}>Grado {g}</option>
                ))}
              </select>

              {/* Group Filter */}
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-gray-300 text-xs font-medium focus:outline-none focus:border-purple-500"
              >
                <option value="">Todos los Grupos</option>
                {groups.map(grp => (
                  <option key={grp} value={grp}>Grupo {grp}</option>
                ))}
              </select>
            </div>

            {/* Quick Filter Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5 text-xs">
              <span className="text-gray-400 font-semibold flex items-center space-x-1 mr-1">
                <Filter size={12} />
                <span>Filtrar por:</span>
              </span>

              {/* Tutor Filter Buttons */}
              <button
                onClick={() => setTutorStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  tutorStatusFilter === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                Todos ({students.length})
              </button>

              <button
                onClick={() => setTutorStatusFilter('unassigned')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
                  tutorStatusFilter === 'unassigned'
                    ? 'bg-amber-500 text-black font-extrabold shadow-sm'
                    : 'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
                }`}
              >
                <AlertTriangle size={12} />
                <span>⚠️ Falta Nombre Tutor ({stats.unassignedCount})</span>
              </button>

              <button
                onClick={() => setTutorStatusFilter('assigned')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
                  tutorStatusFilter === 'assigned'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20'
                }`}
              >
                <UserCheck size={12} />
                <span>✅ Con Tutor Asignado ({stats.assignedCount})</span>
              </button>

              <span className="text-white/20 mx-1">|</span>

              {/* Campus Attendance Filter Buttons */}
              <button
                onClick={() => setCampusStatusFilter(campusStatusFilter === 'inside' ? 'all' : 'inside')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
                  campusStatusFilter === 'inside'
                    ? 'bg-cyan-500 text-black font-extrabold'
                    : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                <span>En Plantel ({stats.insideCount})</span>
              </button>

              <button
                onClick={() => setCampusStatusFilter(campusStatusFilter === 'outside' ? 'all' : 'outside')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
                  campusStatusFilter === 'outside'
                    ? 'bg-rose-600 text-white font-extrabold'
                    : 'bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                <span>Salieron ({stats.outsideCount})</span>
              </button>

              {(searchQuery || gradeFilter || groupFilter || tutorStatusFilter !== 'all' || campusStatusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setGradeFilter('');
                    setGroupFilter('');
                    setTutorStatusFilter('all');
                    setCampusStatusFilter('all');
                  }}
                  className="ml-auto text-xs text-purple-400 hover:text-purple-300 underline cursor-pointer"
                >
                  Restablecer filtros
                </button>
              )}
            </div>
          </div>

          {/* Results Summary Bar */}
          <div className="flex items-center justify-between text-xs text-gray-400 px-1">
            <div>
              Mostrando <strong className="text-white">{filteredStudents.length}</strong> alumnos
              {tutorStatusFilter === 'unassigned' && (
                <span className="text-amber-300 ml-1 font-semibold">
                  (requieren que el administrador asigne el nombre del tutor)
                </span>
              )}
            </div>
            {filteredStudents.length > 0 && (
              <div className="text-[11px] text-gray-500">
                Usa los botones verdes y rojos para avisar al padre de familia
              </div>
            )}
          </div>

          {/* Students Grid / Cards */}
          {isLoading ? (
            <div className="p-12 text-center rounded-2xl bg-[#0b0f19] border border-white/5 space-y-3">
              <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
              <div className="text-sm text-gray-300">Cargando directorio de alumnos y tutores...</div>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#0b0f19] border border-white/5 space-y-3">
              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto opacity-75" />
              <div className="text-base font-bold text-white">No se encontraron alumnos con los filtros seleccionados</div>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Prueba borrando los filtros de búsqueda o seleccionando otro grupo escolar.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.map(student => {
                const isAssigned = hasAssignedTutor(student.tutor);
                const campusInfo = studentTodayStatusMap.get(student.id);
                const isInside = campusInfo?.status === 'entrada';
                const hasExited = campusInfo?.status === 'salida';
                const fullName = `${student.nombre} ${student.apellido_paterno} ${student.apellido_materno || ''}`.replace(/\s+/g, ' ').trim();

                return (
                  <div
                    key={student.id}
                    className={`p-4 rounded-2xl bg-[#0b0f19] border transition-all flex flex-col justify-between group ${
                      !isAssigned
                        ? 'border-amber-500/40 hover:border-amber-400 shadow-lg shadow-amber-500/5'
                        : isInside
                        ? 'border-cyan-500/30 hover:border-cyan-400/60'
                        : 'border-white/5 hover:border-white/15'
                    }`}
                  >
                    <div>
                      {/* Top Bar: Student Details & Campus Status Badge */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={student.foto_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${student.matricula}`}
                              alt={student.nombre}
                              className="w-11 h-11 rounded-xl bg-gray-800 object-cover border border-white/10"
                            />
                            {/* Live Campus Indicator Dot */}
                            <span 
                              className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#0b0f19] ${
                                isInside 
                                  ? 'bg-cyan-400 ring-2 ring-cyan-500/40' 
                                  : hasExited 
                                  ? 'bg-rose-500' 
                                  : 'bg-gray-600'
                              }`}
                              title={isInside ? 'En el plantel' : hasExited ? 'Salió del plantel' : 'Sin registro hoy'}
                            />
                          </div>

                          <div className="min-w-0">
                            <h3 className="text-sm font-extrabold text-white truncate group-hover:text-purple-300 transition-colors">
                              {fullName}
                            </h3>
                            <div className="flex items-center space-x-2 text-[11px] text-gray-400 font-mono mt-0.5">
                              <span className="text-cyan-400 font-bold">{student.grado} &quot;{student.grupo}&quot;</span>
                              <span>•</span>
                              <span>Mat: {student.matricula}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status in Campus Badge */}
                        <div className="shrink-0 text-right">
                          {isInside ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 text-[10px] font-black tracking-wider uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                              <span>En Plantel</span>
                            </span>
                          ) : hasExited ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/40 text-rose-400 text-[10px] font-black tracking-wider uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                              <span>Salió</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-[10px] font-medium">
                              Sin registro hoy
                            </span>
                          )}

                          {campusInfo?.lastLog && (
                            <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                              {campusInfo.lastLog.hora.slice(0, 5)} hrs
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tutor Assigned Information Card */}
                      <div className={`p-3 rounded-xl mb-3.5 ${
                        isAssigned 
                          ? 'bg-black/30 border border-white/5' 
                          : 'bg-amber-500/10 border border-amber-500/30'
                      }`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 flex items-center space-x-1">
                            <Shield size={11} className={isAssigned ? 'text-purple-400' : 'text-amber-400'} />
                            <span>Tutor Responsable:</span>
                          </span>

                          <button
                            onClick={() => handleOpenEditTutor(student)}
                            className="text-[11px] font-bold text-purple-400 hover:text-purple-300 flex items-center space-x-1 cursor-pointer hover:underline"
                          >
                            <Edit3 size={11} />
                            <span>{isAssigned ? 'Modificar' : 'Escribir Nombre'}</span>
                          </button>
                        </div>

                        {isAssigned ? (
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                              <span>👤</span>
                              <span className="truncate">{student.tutor}</span>
                            </div>
                            <div className="text-[11px] text-gray-300 flex items-center space-x-1.5 font-mono">
                              <Phone size={11} className="text-emerald-400 shrink-0" />
                              <span className="truncate">{student.telefono || 'Sin teléfono'}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="text-xs font-extrabold text-amber-300 flex items-center space-x-1">
                              <AlertTriangle size={13} className="shrink-0" />
                              <span>Sin tutor asignado con nombre</span>
                            </div>
                            <p className="text-[11px] text-amber-200/80 leading-tight">
                              El alumno no tiene registrado el nombre de su tutor. Haz clic en el botón para asignarlo.
                            </p>
                            <button
                              onClick={() => handleOpenEditTutor(student)}
                              className="w-full mt-1.5 py-1.5 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer"
                            >
                              <Edit3 size={12} />
                              <span>Escribir Nombre del Tutor</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notification Actions for this Student */}
                    <div className="pt-2 border-t border-white/5 space-y-2">
                      <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider flex items-center justify-between">
                        <span>Avisar al Tutor vía WhatsApp:</span>
                        {isInside && <span className="text-cyan-400 font-bold">● En Plantel</span>}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* Notify Inside/Entry */}
                        <button
                          onClick={() => handleOpenNotifyModal(student, 'entrada')}
                          className="py-2 px-2.5 rounded-xl bg-cyan-600/15 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 hover:text-cyan-200 text-[11px] font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer shadow-sm active:scale-95"
                          title="Enviar WhatsApp al tutor avisando que el alumno está en el plantel"
                        >
                          <LogIn size={13} className="text-cyan-400" />
                          <span>Avisar Ingreso</span>
                        </button>

                        {/* Notify Outside/Exit */}
                        <button
                          onClick={() => handleOpenNotifyModal(student, 'salida')}
                          className="py-2 px-2.5 rounded-xl bg-rose-600/15 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-[11px] font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer shadow-sm active:scale-95"
                          title="Enviar WhatsApp al tutor avisando que el alumno ya salió del plantel"
                        >
                          <LogOut size={13} className="text-rose-400" />
                          <span>Avisar Salida</span>
                        </button>
                      </div>

                      {/* Direct WhatsApp Web Chat Trigger */}
                      {student.telefono && (
                        <a
                          href={getWhatsAppSendUrl(student, {
                            id: 'direct-chat',
                            alumno_id: student.id,
                            tipo: isInside ? 'entrada' : 'salida',
                            fecha: new Date().toISOString().split('T')[0],
                            hora: new Date().toTimeString().split(' ')[0]
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-1.5 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                        >
                          <MessageSquare size={12} />
                          <span>Abrir Chat con Tutor</span>
                          <ExternalLink size={10} className="opacity-70" />
                        </a>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      ) : (
        /* History of Sent WhatsApp Notifications Tab */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#0b0f19] border border-white/5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <span>Historial de Mensajes Enviados a Padres de Familia</span>
              </h2>
              <p className="text-xs text-gray-400">
                Registro de notificaciones de ingreso y salida entregadas a los números de tutores.
              </p>
            </div>
            <div className="text-xs font-mono text-gray-400">
              Total registrados: <strong className="text-white">{waLogs.length}</strong>
            </div>
          </div>

          {waLogs.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#0b0f19] border border-white/5 space-y-2">
              <MessageSquare className="w-8 h-8 text-gray-500 mx-auto" />
              <div className="text-sm font-bold text-gray-300">Aún no hay notificaciones de WhatsApp registradas hoy</div>
              <p className="text-xs text-gray-500">
                Cuando los alumnos entren o salgan del plantel y se notifique a los tutores, aparecerán aquí.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0b0f19]">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-gray-400 uppercase font-semibold border-b border-white/5">
                  <tr>
                    <th className="px-4 py-3">Hora / Fecha</th>
                    <th className="px-4 py-3">Alumno</th>
                    <th className="px-4 py-3">Tutor Notificado</th>
                    <th className="px-4 py-3">Tipo de Evento</th>
                    <th className="px-4 py-3">Teléfono</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Mensaje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {waLogs.map(log => {
                    const isEntrada = log.tipo === 'entrada';
                    return (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 font-mono text-gray-400 whitespace-nowrap">
                          {log.hora} <span className="text-[10px] text-gray-500">({log.fecha})</span>
                        </td>
                        <td className="px-4 py-3 font-bold text-white whitespace-nowrap">
                          {log.alumno_nombre}
                        </td>
                        <td className="px-4 py-3 text-purple-300 whitespace-nowrap">
                          👤 {log.tutor || 'Tutor Responsable'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isEntrada ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold uppercase">
                              <span>🟢 Ingreso</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-bold uppercase">
                              <span>🔴 Salida</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-300 whitespace-nowrap">
                          {log.telefono}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center space-x-1 text-emerald-400 text-[11px] font-bold">
                            <CheckCircle2 size={12} />
                            <span>Entregado</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => {
                              alert(`Mensaje enviado:\n\n${log.mensaje}`);
                            }}
                            className="text-purple-400 hover:text-purple-300 underline font-semibold"
                          >
                            Ver texto
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Asignar / Escribir Nombre del Tutor (Admin Feature)               */}
      {/* ========================================================================= */}
      {isEditModalOpen && editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-[#0b0f19] border border-purple-500/30 p-6 shadow-2xl space-y-5">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <Edit3 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">
                    {hasAssignedTutor(editingStudent.tutor) ? 'Modificar Tutor' : 'Asignar Nombre de Tutor'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    Escribe el nombre del padre, madre o tutor legal que recibirá las alertas.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Target Student Quick Summary Card */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center space-x-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={editingStudent.foto_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${editingStudent.matricula}`}
                alt={editingStudent.nombre}
                className="w-11 h-11 rounded-xl bg-gray-800 object-cover border border-white/10"
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {editingStudent.nombre} {editingStudent.apellido_paterno} {editingStudent.apellido_materno || ''}
                </div>
                <div className="text-[11px] text-gray-400 font-mono">
                  Grupo: <span className="text-cyan-400 font-bold">{editingStudent.grado} &quot;{editingStudent.grupo}&quot;</span> • Matrícula: {editingStudent.matricula}
                </div>
              </div>
            </div>

            {saveError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center space-x-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleSaveTutor} className="space-y-4">
              
              {/* Tutor Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-300 flex items-center space-x-1">
                  <span>Nombre Completo del Tutor:</span>
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. María Elena Rosales Martínez"
                  value={tutorNameInput}
                  onChange={(e) => setTutorNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  autoFocus
                />
                <p className="text-[10px] text-gray-500">
                  Este nombre se utilizará en el saludo oficial del mensaje de WhatsApp.
                </p>
              </div>

              {/* Relationship / Parentesco */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-300">Parentesco o Relación:</label>
                <select
                  value={tutorRelationshipInput}
                  onChange={(e) => setTutorRelationshipInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="Madre">Madre de Familia</option>
                  <option value="Padre">Padre de Familia</option>
                  <option value="Tutor Legal">Tutor Legal / Custodio</option>
                  <option value="Abuelo/a">Abuelo / Abuela</option>
                  <option value="Tío/a">Tío / Tía</option>
                  <option value="Hermano/a Mayor">Hermano(a) Mayor</option>
                  <option value="Familiar Responsable">Familiar Responsable Autorizado</option>
                </select>
              </div>

              {/* WhatsApp Phone */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-300 flex items-center space-x-1">
                  <Phone size={12} className="text-emerald-400" />
                  <span>Teléfono Celular / WhatsApp del Tutor:</span>
                </label>
                <input
                  type="text"
                  placeholder="+52 686 123 4567 o 10 dígitos"
                  value={tutorPhoneInput}
                  onChange={(e) => setTutorPhoneInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-gray-500 text-sm font-mono focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
                <p className="text-[10px] text-gray-500">
                  Formato recomendado: 10 dígitos (se le asigna prefijo +52 automáticamente).
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSavingTutor}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-purple-500/20 transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingTutor ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Guardar y Asignar Tutor</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Vista Previa y Envío de Notificación WhatsApp                      */}
      {/* ========================================================================= */}
      {isNotifyModalOpen && selectedStudentForNotify && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-3xl bg-[#0b0f19] border border-cyan-500/30 p-6 shadow-2xl space-y-5">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-2xl border ${
                  notifyType === 'entrada'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}>
                  {notifyType === 'entrada' ? <LogIn className="w-6 h-6" /> : <LogOut className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">
                    Notificar {notifyType === 'entrada' ? 'Ingreso (En Plantel)' : 'Salida del Plantel'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    Se enviará la alerta oficial por WhatsApp al tutor asignado.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNotifyModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Recipient Details */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedStudentForNotify.foto_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedStudentForNotify.matricula}`}
                  alt={selectedStudentForNotify.nombre}
                  className="w-10 h-10 rounded-xl bg-gray-800 object-cover border border-white/10"
                />
                <div>
                  <div className="text-xs font-bold text-white">
                    {selectedStudentForNotify.nombre} {selectedStudentForNotify.apellido_paterno}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    Tutor: <strong className="text-purple-300">{selectedStudentForNotify.tutor || 'No asignado'}</strong>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-mono font-bold text-emerald-400">
                  {selectedStudentForNotify.telefono || 'Sin teléfono'}
                </div>
                <div className="text-[10px] text-gray-500">Destino WhatsApp</div>
              </div>
            </div>

            {/* Event Switcher */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNotifyType('entrada')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  notifyType === 'entrada'
                    ? 'bg-cyan-500 text-black font-extrabold shadow-md shadow-cyan-500/20'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <LogIn size={14} />
                <span>Confirmar que ENTRÓ al Plantel</span>
              </button>

              <button
                type="button"
                onClick={() => setNotifyType('salida')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  notifyType === 'salida'
                    ? 'bg-rose-500 text-white font-extrabold shadow-md shadow-rose-500/20'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <LogOut size={14} />
                <span>Confirmar que SALIÓ del Plantel</span>
              </button>
            </div>

            {/* Message Preview Box */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center space-x-1">
                <MessageSquare size={12} className="text-purple-400" />
                <span>Vista Previa del Mensaje Oficial:</span>
              </label>
              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 font-mono text-[11px] text-gray-300 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap selection:bg-purple-500">
                {previewMessage}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/10">
              {/* Direct Web WhatsApp Link */}
              <a
                href={getWhatsAppSendUrl(selectedStudentForNotify, {
                  id: 'modal-preview',
                  alumno_id: selectedStudentForNotify.id,
                  tipo: notifyType,
                  fecha: new Date().toISOString().split('T')[0],
                  hora: new Date().toTimeString().split(' ')[0]
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold border border-white/10 transition-all flex items-center justify-center space-x-1.5"
              >
                <ExternalLink size={14} />
                <span>Abrir en WhatsApp Web</span>
              </a>

              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsNotifyModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleSendNotification}
                  disabled={isSendingWhatsApp}
                  className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg disabled:opacity-50 ${
                    notifyType === 'entrada'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/20'
                      : 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-rose-500/20'
                  }`}
                >
                  {isSendingWhatsApp ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Registrando y Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Registrar y Notificar al Tutor</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
