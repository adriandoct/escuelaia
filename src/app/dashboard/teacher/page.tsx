"use strict";

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db, Alumno, Asistencia } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import confetti from 'canvas-confetti';
import { 
  BookOpen, CheckCircle, Clock, XCircle, Users, Search, Filter, Download, 
  UserCheck, AlertTriangle, RefreshCw, Save, FileSpreadsheet, Eye, Award, 
  Plus, Minus, Check, Calendar, Sparkles, Settings, ExternalLink, HelpCircle, 
  ShieldCheck, Layers, ArrowRight, X
} from 'lucide-react';
import { 
  MATERIAS_DEFAULT, 
  TeacherDayStore, 
  getDailyRecord, 
  saveDailyRecord, 
  resolveStudentStatus, 
  downloadSpreadsheetWorkbook,
  generateSubjectsWorkbook
} from '@/lib/spreadsheet';

export default function TeacherDashboardPage() {
  const { user } = useAuth();
  
  const [students, setStudents] = useState<Alumno[]>([]);
  const [todayLogs, setTodayLogs] = useState<Asistencia[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('1°');
  const [selectedGroup, setSelectedGroup] = useState<string>('A');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Date and Subject states
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedMateria, setSelectedMateria] = useState<string>('all'); // 'all' or specific subject name

  // Attendance and Participations states
  const [participaciones, setParticipaciones] = useState<Record<string, number>>({});
  const [asistenciasOverride, setAsistenciasOverride] = useState<Record<string, 'presente' | 'retardo' | 'ausente' | 'justificado'>>({});
  const [participacionesPorMateria, setParticipacionesPorMateria] = useState<Record<string, Record<string, number>>>({});
  const [asistenciasPorMateria, setAsistenciasPorMateria] = useState<Record<string, Record<string, 'presente' | 'retardo' | 'ausente' | 'justificado'>>>({});

  // UI state for saving / feedback
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'info';
    message: string;
    details?: string;
  } | null>(null);

  // Spreadsheet In-App Viewer Modal
  const [isSpreadsheetModalOpen, setIsSpreadsheetModalOpen] = useState(false);
  const [activeSheetTab, setActiveSheetTab] = useState<string>('Concentrado General');

  // Google Sheets Webhook Configuration Modal
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [googleWebhookUrl, setGoogleWebhookUrl] = useState<string>('');

  // Initial load
  useEffect(() => {
    loadData();
    if (typeof window !== 'undefined') {
      const savedWh = localStorage.getItem('dojoia_google_sheets_webhook') || '';
      setGoogleWebhookUrl(savedWh);
    }
  }, []);

  // When date, grade, or group changes, reload records
  useEffect(() => {
    loadStoredDay(selectedDate, selectedGrade, selectedGroup);
  }, [selectedDate, selectedGrade, selectedGroup]);

  const loadData = async () => {
    setLoading(true);
    try {
      const allStudents = await db.getAlumnos();
      const allLogs = await db.getAsistencias();
      setStudents(allStudents);
      setTodayLogs(allLogs);
    } catch (e) {
      console.error('Error al cargar datos base:', e);
    } finally {
      setLoading(false);
    }
  };

  // Load saved attendance and participations for the chosen date, grade, group
  const loadStoredDay = (dateStr: string, grade: string, group: string) => {
    const record = getDailyRecord(dateStr, grade, group);
    if (record) {
      setParticipaciones(record.participaciones || {});
      setAsistenciasOverride(record.asistenciasOverride || {});
      setParticipacionesPorMateria(record.participacionesPorMateria || {});
      setAsistenciasPorMateria(record.asistenciasPorMateria || {});
      setLastSavedTime(new Date(record.updatedAt).toLocaleTimeString());
    } else {
      // Clean for fresh day
      setParticipaciones({});
      setAsistenciasOverride({});
      setParticipacionesPorMateria({});
      setAsistenciasPorMateria({});
      setLastSavedTime(null);
    }
  };

  // Filter students for the current grade & group
  const classStudents = useMemo(() => {
    return students.filter(s => {
      const matchesGrade = s.grado === selectedGrade;
      const matchesGroup = s.grupo === selectedGroup;
      const fullName = `${s.nombre} ${s.apellido_paterno} ${s.apellido_materno || ''}`.toLowerCase();
      const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || s.matricula.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesGrade && matchesGroup && matchesSearch;
    });
  }, [students, selectedGrade, selectedGroup, searchQuery]);

  // Compute student status for the current session/materia
  const getStudentCurrentStatus = useCallback((studentId: string) => {
    // If specific materia selected and has custom override
    if (selectedMateria !== 'all' && asistenciasPorMateria[selectedMateria]?.[studentId]) {
      const status = asistenciasPorMateria[selectedMateria][studentId];
      const labels = { presente: 'Presente', retardo: 'Retardo', ausente: 'Ausente', justificado: 'Justificado' };
      const colors = {
        presente: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        retardo: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        ausente: 'text-red-400 bg-red-500/10 border-red-500/30',
        justificado: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
      };
      return { status, label: labels[status], color: colors[status], time: 'Manual' };
    }

    // Otherwise check general override or logs
    const resolved = resolveStudentStatus(studentId, todayLogs, asistenciasOverride);
    const colors = {
      presente: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      retardo: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      ausente: 'text-red-400 bg-red-500/10 border-red-500/30',
      justificado: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
    };
    return {
      status: resolved.status,
      label: resolved.label,
      color: colors[resolved.status],
      time: resolved.time
    };
  }, [selectedMateria, asistenciasPorMateria, todayLogs, asistenciasOverride]);

  // Compute participations for current student in selected materia
  const getStudentParticipations = useCallback((studentId: string): number => {
    if (selectedMateria !== 'all' && participacionesPorMateria[selectedMateria]?.[studentId] !== undefined) {
      return participacionesPorMateria[selectedMateria][studentId];
    }
    return participaciones[studentId] || 0;
  }, [selectedMateria, participacionesPorMateria, participaciones]);

  // Handle modifying attendance status
  const handleSetAttendance = (studentId: string, status: 'presente' | 'retardo' | 'ausente' | 'justificado') => {
    if (selectedMateria === 'all') {
      setAsistenciasOverride(prev => ({
        ...prev,
        [studentId]: status
      }));
      // Also propagate to all individual materias
      setAsistenciasPorMateria(prev => {
        const next = { ...prev };
        MATERIAS_DEFAULT.forEach(m => {
          next[m] = { ...(next[m] || {}), [studentId]: status };
        });
        return next;
      });
    } else {
      setAsistenciasPorMateria(prev => ({
        ...prev,
        [selectedMateria]: {
          ...(prev[selectedMateria] || {}),
          [studentId]: status
        }
      }));
    }
  };

  // Handle modifying participation count
  const handleModifyParticipation = (studentId: string, delta: number) => {
    if (selectedMateria === 'all') {
      setParticipaciones(prev => {
        const current = prev[studentId] || 0;
        const nextVal = Math.max(0, current + delta);
        return { ...prev, [studentId]: nextVal };
      });
      // Also propagate to all individual materias
      setParticipacionesPorMateria(prev => {
        const next = { ...prev };
        MATERIAS_DEFAULT.forEach(m => {
          const curM = next[m]?.[studentId] ?? (participaciones[studentId] || 0);
          next[m] = { ...(next[m] || {}), [studentId]: Math.max(0, curM + delta) };
        });
        return next;
      });
    } else {
      setParticipacionesPorMateria(prev => {
        const curM = prev[selectedMateria]?.[studentId] ?? (participaciones[studentId] || 0);
        const nextVal = Math.max(0, curM + delta);
        return {
          ...prev,
          [selectedMateria]: {
            ...(prev[selectedMateria] || {}),
            [studentId]: nextVal
          }
        };
      });
    }
  };

  // Mark all students in class as Present
  const handleMarkAllPresent = () => {
    const updatedOverrides: Record<string, 'presente' | 'retardo' | 'ausente' | 'justificado'> = {};
    classStudents.forEach(s => {
      updatedOverrides[s.id] = 'presente';
    });
    setAsistenciasOverride(prev => ({ ...prev, ...updatedOverrides }));

    if (selectedMateria === 'all') {
      setAsistenciasPorMateria(prev => {
        const next = { ...prev };
        MATERIAS_DEFAULT.forEach(m => {
          next[m] = { ...(next[m] || {}), ...updatedOverrides };
        });
        return next;
      });
    } else {
      setAsistenciasPorMateria(prev => ({
        ...prev,
        [selectedMateria]: {
          ...(prev[selectedMateria] || {}),
          ...updatedOverrides
        }
      }));
    }
  };

  // Reset to raw hardware scanner readings
  const handleResetToScans = () => {
    if (confirm('¿Restablecer las asistencias del grupo a las lecturas originales del escáner ZKTeco/lector institucional?')) {
      const nextOv = { ...asistenciasOverride };
      classStudents.forEach(s => {
        delete nextOv[s.id];
      });
      setAsistenciasOverride(nextOv);

      if (selectedMateria !== 'all') {
        setAsistenciasPorMateria(prev => {
          const next = { ...prev };
          if (next[selectedMateria]) {
            classStudents.forEach(s => {
              delete next[selectedMateria][s.id];
            });
          }
          return next;
        });
      }
    }
  };

  // Batch +1 participation to all currently present students
  const handleAddParticipationToPresent = () => {
    classStudents.forEach(s => {
      const { status } = getStudentCurrentStatus(s.id);
      if (status === 'presente') {
        handleModifyParticipation(s.id, 1);
      }
    });
  };

  // MAIN ACTION 1: GUARDAR EL DÍA
  const handleSaveDay = async () => {
    setIsSaving(true);
    try {
      // Consolidate complete store
      const storeRecord: TeacherDayStore = {
        fecha: selectedDate,
        grado: selectedGrade,
        grupo: selectedGroup,
        docente: user?.name || 'Profesor Titular',
        updatedAt: new Date().toISOString(),
        participaciones,
        asistenciasOverride,
        participacionesPorMateria,
        asistenciasPorMateria
      };

      await saveDailyRecord(storeRecord);

      // Trigger celebratory confetti
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 }
      });

      const nowTime = new Date().toLocaleTimeString();
      setLastSavedTime(nowTime);

      const totalParts = Object.values(participaciones).reduce((a, b) => a + b, 0);

      setFeedbackBanner({
        type: 'success',
        message: `¡Día guardado con éxito (${selectedDate})!`,
        details: `Se actualizaron las asistencias y participaciones en la hoja de cálculo en todas las materias (${MATERIAS_DEFAULT.length} materias) para el grupo ${selectedGrade} "${selectedGroup}". Total de participaciones registradas: ${totalParts}.`
      });

      setTimeout(() => {
        setFeedbackBanner(null);
      }, 7000);
    } catch (e: any) {
      alert(`Error al guardar el día: ${e.message || e}`);
    } finally {
      setIsSaving(false);
    }
  };

  // MAIN ACTION 2: ACTUALIZAR (Refresh + Re-sync Spreadsheet)
  const handleRefreshAndSync = async () => {
    setLoading(true);
    try {
      // Reload logs from database/scanners
      const allLogs = await db.getAsistencias();
      const allStudents = await db.getAlumnos();
      setStudents(allStudents);
      setTodayLogs(allLogs);

      // Re-load stored daily records
      loadStoredDay(selectedDate, selectedGrade, selectedGroup);

      // Re-sync store to ensure spreadsheet is updated
      const storeRecord: TeacherDayStore = {
        fecha: selectedDate,
        grado: selectedGrade,
        grupo: selectedGroup,
        docente: user?.name || 'Profesor Titular',
        updatedAt: new Date().toISOString(),
        participaciones,
        asistenciasOverride,
        participacionesPorMateria,
        asistenciasPorMateria
      };
      await saveDailyRecord(storeRecord);

      setFeedbackBanner({
        type: 'info',
        message: '¡Datos y Hoja de Cálculo actualizados!',
        details: `Se sincronizaron los nuevos registros de escaneo institucional y se refrescó la hoja de cálculo para todas las materias.`
      });

      setTimeout(() => {
        setFeedbackBanner(null);
      }, 5000);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // MAIN ACTION 3: DESCARGAR HOJA DE CÁLCULO (.XLSX)
  const handleDownloadExcel = () => {
    downloadSpreadsheetWorkbook(
      classStudents,
      todayLogs,
      selectedDate,
      selectedGrade,
      selectedGroup,
      participaciones,
      asistenciasOverride,
      [...MATERIAS_DEFAULT],
      user?.name || 'Profesor Titular',
      participacionesPorMateria,
      asistenciasPorMateria
    );
  };

  // Calculate stats for current class selection
  const classStats = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    let justified = 0;
    let totalPart = 0;

    classStudents.forEach(s => {
      const { status } = getStudentCurrentStatus(s.id);
      if (status === 'presente') present++;
      else if (status === 'retardo') late++;
      else if (status === 'justificado') justified++;
      else absent++;

      totalPart += getStudentParticipations(s.id);
    });

    return { present, late, absent, justified, totalPart };
  }, [classStudents, getStudentCurrentStatus, getStudentParticipations]);

  return (
    <div className="space-y-6 pb-12 flex-1 flex flex-col">
      
      {/* =========================================================================
          HEADER BANNER CON CONTROLES PRINCIPALES (GUARDAR DÍA / ACTUALIZAR / EXCEL)
          ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 glass-panel p-6 rounded-3xl border-emerald-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-1.5 z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <span>👨‍🏫 Panel Docente Oficial</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>CECYTE BC</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <span>Pase de Lista y Participaciones</span>
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm flex items-center space-x-2 flex-wrap">
            <span>Docente: <strong className="text-white">{user?.name || 'Profesor'}</strong></span>
            <span>•</span>
            <span className="text-emerald-400 font-mono">Sincronización multi-materia activa</span>
            {lastSavedTime && (
              <>
                <span>•</span>
                <span className="text-gray-400 text-xs">Guardado a las: {lastSavedTime}</span>
              </>
            )}
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center flex-wrap gap-2.5 z-10">
          
          {/* Button: Guardar el Día */}
          <button
            onClick={handleSaveDay}
            disabled={isSaving}
            className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all transform active:scale-95 cursor-pointer disabled:opacity-50"
            title="Guardar asistencias y participaciones del día en la hoja de cálculo para todas las materias"
          >
            <Save size={18} className={isSaving ? 'animate-spin' : ''} />
            <span>{isSaving ? 'Guardando en Hoja...' : 'Guardar el Día'}</span>
          </button>

          {/* Button: Actualizar */}
          <button
            onClick={handleRefreshAndSync}
            disabled={loading}
            className="flex items-center space-x-1.5 px-4 py-3 rounded-xl glass-panel text-sm font-semibold text-gray-200 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="Actualizar escaneos del lector y sincronizar hoja de cálculo"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin text-emerald-400' : ''} />
            <span>Actualizar</span>
          </button>

          {/* Button: Ver Hoja de Cálculo (Spreadsheet Modal) */}
          <button
            onClick={() => setIsSpreadsheetModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 text-sm font-semibold transition-all cursor-pointer"
            title="Ver vista previa de la hoja de cálculo con todas las materias"
          >
            <FileSpreadsheet size={17} />
            <span>Ver Hoja de Cálculo</span>
          </button>

          {/* Button: Descargar Excel (.xlsx) */}
          <button
            onClick={handleDownloadExcel}
            className="flex items-center space-x-1.5 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/40 text-gray-300 hover:text-white text-sm font-semibold transition-all cursor-pointer"
            title="Descargar libro de Excel completo (.xlsx) con hojas para todas las materias"
          >
            <Download size={17} className="text-emerald-400" />
            <span className="hidden sm:inline">Descargar Excel (.xlsx)</span>
          </button>

          {/* Button: Config / Google Sheets Webhook */}
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="p-3 rounded-xl glass-panel text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="Configuración de sincronización Google Sheets"
          >
            <Settings size={18} />
          </button>

        </div>
      </div>

      {/* =========================================================================
          CONFIRMATION BANNER / FEEDBACK
          ========================================================================= */}
      {feedbackBanner && (
        <div className={`p-4 rounded-2xl border flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
          feedbackBanner.type === 'success' 
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
            : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
        }`}>
          <div className="flex items-start space-x-3">
            <Sparkles className="shrink-0 mt-0.5 text-emerald-400" size={18} />
            <div>
              <p className="font-bold text-sm text-white">{feedbackBanner.message}</p>
              {feedbackBanner.details && (
                <p className="text-xs opacity-90 mt-0.5">{feedbackBanner.details}</p>
              )}
            </div>
          </div>
          <button 
            onClick={() => setFeedbackBanner(null)}
            className="text-gray-400 hover:text-white p-1 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* =========================================================================
          FILTROS: FECHA, MATERIA, GRADO, GRUPO Y BUSCADOR
          ========================================================================= */}
      <div className="glass-panel p-5 rounded-3xl space-y-4">
        
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Date Picker & Quick Today Button */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center space-x-1">
              <Calendar size={14} className="text-emerald-400" />
              <span>Fecha:</span>
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="glass-input py-1.5 px-3 rounded-xl text-xs text-white font-mono"
            />
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                selectedDate === new Date().toISOString().split('T')[0]
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'glass-panel text-gray-400 hover:text-white'
              }`}
            >
              Hoy
            </button>
          </div>

          {/* Grade & Group Pickers */}
          <div className="flex items-center flex-wrap gap-4">
            
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Grado:</span>
              {['1°', '3°', '5°'].map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGrade(g)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedGrade === g
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                      : 'glass-panel text-gray-400 hover:text-white'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Grupo:</span>
              {['A', 'B'].map((grp) => (
                <button
                  key={grp}
                  onClick={() => setSelectedGroup(grp)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedGroup === grp
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                      : 'glass-panel text-gray-400 hover:text-white'
                  }`}
                >
                  {grp}
                </button>
              ))}
            </div>

          </div>

          {/* Roster Search Input */}
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
            <input
              type="text"
              placeholder="Buscar por nombre o matrícula..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full glass-input py-2 pl-9 pr-4 rounded-xl text-xs text-white"
            />
          </div>

        </div>

        {/* Subjects Selector Bar (Todas las materias / Materia específica) */}
        <div className="pt-2 border-t border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
            <BookOpen size={14} className="text-cyan-400" />
            <span>Materia en Edición:</span>
          </div>

          <div className="flex items-center flex-wrap gap-1.5 w-full md:w-auto">
            <button
              onClick={() => setSelectedMateria('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedMateria === 'all'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                  : 'glass-panel text-gray-400 hover:text-white'
              }`}
            >
              ⭐ Todas las Materias (Global)
            </button>

            {MATERIAS_DEFAULT.map(mat => (
              <button
                key={mat}
                onClick={() => setSelectedMateria(mat)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedMateria === mat
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'glass-panel text-gray-400 hover:text-white'
                }`}
              >
                {mat}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* =========================================================================
          STATISTICS CARDS (ASISTENCIAS + PARTICIPACIONES DEL DÍA)
          ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        
        <div className="glass-panel p-4 rounded-2xl">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] uppercase font-bold">Total Grupo</span>
            <Users size={16} className="text-cyan-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white mt-1.5">{classStudents.length}</p>
          <span className="text-[10px] text-gray-500">{selectedGrade} &quot;{selectedGroup}&quot;</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-emerald-500/20">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] uppercase font-bold">Presentes</span>
            <CheckCircle size={16} className="text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1.5">{classStats.present}</p>
          <span className="text-[10px] text-emerald-500/70 font-semibold">En tiempo</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-amber-500/20">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] uppercase font-bold">Retardos</span>
            <Clock size={16} className="text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-400 mt-1.5">{classStats.late}</p>
          <span className="text-[10px] text-amber-500/70 font-semibold">Tarde</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-red-500/20">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] uppercase font-bold">Ausentes</span>
            <XCircle size={16} className="text-red-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-red-400 mt-1.5">{classStats.absent}</p>
          <span className="text-[10px] text-red-500/70 font-semibold">Sin registro</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-cyan-500/20">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] uppercase font-bold">Justificados</span>
            <ShieldCheck size={16} className="text-cyan-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-cyan-400 mt-1.5">{classStats.justified}</p>
          <span className="text-[10px] text-cyan-500/70 font-semibold">Con justificante</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-purple-500/20 bg-purple-500/5">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] uppercase font-bold">Participaciones</span>
            <Award size={16} className="text-purple-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-purple-400 mt-1.5">{classStats.totalPart}</p>
          <span className="text-[10px] text-purple-400/70 font-semibold">Puntos en clase</span>
        </div>

      </div>

      {/* =========================================================================
          BATCH ACTIONS SHORTCUTS BAR
          ========================================================================= */}
      <div className="flex items-center justify-between flex-wrap gap-3 glass-panel p-3.5 rounded-2xl text-xs">
        <div className="flex items-center space-x-2 text-gray-400">
          <Sparkles size={14} className="text-amber-400" />
          <span className="font-semibold text-gray-300">Acciones Rápidas del Docente:</span>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={handleMarkAllPresent}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 font-semibold transition-all cursor-pointer flex items-center space-x-1"
          >
            <Check size={13} />
            <span>Marcar Todos Presentes</span>
          </button>

          <button
            onClick={handleAddParticipationToPresent}
            className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 font-semibold transition-all cursor-pointer flex items-center space-x-1"
          >
            <Plus size={13} />
            <span>+1 Participación a Presentes</span>
          </button>

          <button
            onClick={handleResetToScans}
            className="px-3 py-1.5 rounded-lg glass-panel text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <span>Restablecer a Lector Físico</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TABLA DE ALUMNOS (PASE DE LISTA Y PARTICIPACIONES)
          ========================================================================= */}
      <div className="glass-panel p-6 rounded-3xl space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Lista de Clase - {selectedGrade} Grado &quot;{selectedGroup}&quot;</span>
              <span className="text-xs font-normal text-gray-400">({classStudents.length} alumnos inscritos)</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Edición activa:{' '}
              <span className="text-emerald-400 font-bold">
                {selectedMateria === 'all' ? 'Todas las Materias en simultáneo' : selectedMateria}
              </span>
              {' '}• Haz clic en los botones para alternar asistencia y ajustar participaciones (+/-).
            </p>
          </div>

          <div className="text-xs text-gray-400 flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span>P: Presente</span>
            </span>
            <span className="inline-flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span>R: Retardo</span>
            </span>
            <span className="inline-flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
              <span>A: Ausente</span>
            </span>
            <span className="inline-flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
              <span>J: Justificado</span>
            </span>
          </div>
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
                  <th className="py-3 px-3">No.</th>
                  <th className="py-3 px-3">Alumno</th>
                  <th className="py-3 px-3">Matrícula</th>
                  <th className="py-3 px-3 text-center">Asistencia del Día</th>
                  <th className="py-3 px-3 text-center">Participaciones</th>
                  <th className="py-3 px-3">Hora Entrada</th>
                  <th className="py-3 px-3">Tutor y Teléfono</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-200">
                {classStudents.map((student, idx) => {
                  const { status, label, color, time } = getStudentCurrentStatus(student.id);
                  const studentPart = getStudentParticipations(student.id);

                  return (
                    <tr key={student.id} className="hover:bg-white/[0.02] transition-colors">
                      
                      {/* Row Index */}
                      <td className="py-3.5 px-3 text-gray-500 font-mono text-[11px]">{idx + 1}</td>

                      {/* Student Info */}
                      <td className="py-3.5 px-3 font-medium text-white flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-800 border border-white/10 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={student.foto_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${student.matricula}`} 
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">
                            {student.apellido_paterno} {student.apellido_materno || ''} {student.nombre}
                          </p>
                          <p className="text-[10px] text-gray-400 font-mono">{student.grado} &quot;{student.grupo}&quot;</p>
                        </div>
                      </td>

                      {/* Matrícula */}
                      <td className="py-3.5 px-3 font-mono text-cyan-400">{student.matricula}</td>

                      {/* Asistencia Interactive Selector (P / R / A / J) */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex items-center space-x-1 p-1 rounded-xl bg-black/40 border border-white/10">
                          
                          {/* Presente */}
                          <button
                            type="button"
                            onClick={() => handleSetAttendance(student.id, 'presente')}
                            className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center ${
                              status === 'presente'
                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 ring-1 ring-emerald-400'
                                : 'text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                            }`}
                            title="Marcar Presente"
                          >
                            P
                          </button>

                          {/* Retardo */}
                          <button
                            type="button"
                            onClick={() => handleSetAttendance(student.id, 'retardo')}
                            className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center ${
                              status === 'retardo'
                                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30 ring-1 ring-amber-400'
                                : 'text-gray-400 hover:text-amber-400 hover:bg-amber-500/10'
                            }`}
                            title="Marcar Retardo"
                          >
                            R
                          </button>

                          {/* Ausente */}
                          <button
                            type="button"
                            onClick={() => handleSetAttendance(student.id, 'ausente')}
                            className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center ${
                              status === 'ausente'
                                ? 'bg-red-500 text-white shadow-md shadow-red-500/30 ring-1 ring-red-400'
                                : 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'
                            }`}
                            title="Marcar Ausente / Falta"
                          >
                            A
                          </button>

                          {/* Justificado */}
                          <button
                            type="button"
                            onClick={() => handleSetAttendance(student.id, 'justificado')}
                            className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center ${
                              status === 'justificado'
                                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30 ring-1 ring-cyan-400'
                                : 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10'
                            }`}
                            title="Marcar Falta Justificada"
                          >
                            J
                          </button>

                        </div>

                        <div className="mt-1">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${color}`}>
                            {label}
                          </span>
                        </div>
                      </td>

                      {/* Participaciones Counter (+ / -) */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex items-center space-x-1.5 p-1 rounded-xl bg-black/40 border border-white/10">
                          
                          {/* Minus Button */}
                          <button
                            type="button"
                            onClick={() => handleModifyParticipation(student.id, -1)}
                            disabled={studentPart <= 0}
                            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent text-gray-300 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                            title="Restar participación"
                          >
                            <Minus size={13} />
                          </button>

                          {/* Participation Count Badge */}
                          <span className={`w-9 text-center font-black text-sm font-mono ${
                            studentPart > 0 ? 'text-purple-400' : 'text-gray-500'
                          }`}>
                            {studentPart}
                          </span>

                          {/* Plus Button */}
                          <button
                            type="button"
                            onClick={() => handleModifyParticipation(student.id, 1)}
                            className="w-7 h-7 rounded-lg bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 hover:text-white border border-purple-500/30 transition-all cursor-pointer flex items-center justify-center"
                            title="Agregar participación (+1)"
                          >
                            <Plus size={13} />
                          </button>

                        </div>

                        {studentPart > 0 && (
                          <div className="text-[10px] text-purple-400/80 font-semibold mt-0.5">
                            +{(studentPart * 0.5).toFixed(1)} pts
                          </div>
                        )}
                      </td>

                      {/* Entrada Time */}
                      <td className="py-3.5 px-3 font-mono text-gray-300 text-xs">
                        {time}
                      </td>

                      {/* Tutor & Phone */}
                      <td className="py-3.5 px-3 text-xs">
                        <p className="text-gray-300">{student.tutor}</p>
                        <p className="text-gray-500 font-mono text-[10px]">{student.telefono}</p>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* =========================================================================
          MODAL: VISOR DE HOJA DE CÁLCULO (PREVIEW MULTI-SHEET EXCEL)
          ========================================================================= */}
      {isSpreadsheetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-6xl max-h-[90vh] rounded-3xl border border-cyan-500/30 flex flex-col overflow-hidden shadow-2xl">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <FileSpreadsheet size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                    <span>Hoja de Cálculo - CECYTE BC</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
                      Multi-Materia Activa
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400">
                    Fecha: <strong className="text-white">{selectedDate}</strong> • Grupo: <strong className="text-white">{selectedGrade} &quot;{selectedGroup}&quot;</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleDownloadExcel}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-all cursor-pointer"
                >
                  <Download size={15} />
                  <span>Descargar Archivo (.xlsx)</span>
                </button>
                <button
                  onClick={() => setIsSpreadsheetModalOpen(false)}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Sheets Navigation Tabs */}
            <div className="px-5 pt-3 border-b border-white/10 bg-black/20 flex items-center space-x-2 overflow-x-auto">
              <button
                onClick={() => setActiveSheetTab('Concentrado General')}
                className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                  activeSheetTab === 'Concentrado General'
                    ? 'border-cyan-400 text-cyan-300 bg-white/5'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Layers size={14} />
                <span>Concentrado General</span>
              </button>

              {MATERIAS_DEFAULT.map(mat => (
                <button
                  key={mat}
                  onClick={() => setActiveSheetTab(mat)}
                  className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer shrink-0 ${
                    activeSheetTab === mat
                      ? 'border-emerald-400 text-emerald-300 bg-white/5'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  {mat}
                </button>
              ))}
            </div>

            {/* Spreadsheet Grid Preview */}
            <div className="p-5 flex-1 overflow-auto bg-black/30">
              <div className="overflow-x-auto border border-white/10 rounded-2xl">
                <table className="w-full text-left text-xs font-mono">
                  
                  {/* Table Header */}
                  <thead className="bg-white/5 text-gray-300 border-b border-white/10 text-[11px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">No.</th>
                      <th className="py-2.5 px-3">Matrícula</th>
                      <th className="py-2.5 px-3">Nombre Completo</th>
                      <th className="py-2.5 px-3">Grado</th>
                      <th className="py-2.5 px-3">Grupo</th>
                      <th className="py-2.5 px-3">Asistencia</th>
                      <th className="py-2.5 px-3 text-center">Participaciones</th>
                      <th className="py-2.5 px-3">Puntos</th>
                      <th className="py-2.5 px-3">Docente Titular</th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {classStudents.map((s, idx) => {
                      const matStatusOv = activeSheetTab === 'Concentrado General'
                        ? asistenciasOverride[s.id]
                        : asistenciasPorMateria[activeSheetTab]?.[s.id] || asistenciasOverride[s.id];
                      
                      const resolved = resolveStudentStatus(s.id, todayLogs, matStatusOv ? { [s.id]: matStatusOv } : asistenciasOverride);
                      
                      const part = activeSheetTab === 'Concentrado General'
                        ? (participaciones[s.id] || 0)
                        : (participacionesPorMateria[activeSheetTab]?.[s.id] ?? (participaciones[s.id] || 0));

                      const fullName = `${s.apellido_paterno} ${s.apellido_materno || ''} ${s.nombre}`.trim().toUpperCase();

                      return (
                        <tr key={s.id} className="hover:bg-white/[0.03]">
                          <td className="py-2 px-3 text-gray-500">{idx + 1}</td>
                          <td className="py-2 px-3 text-cyan-400 font-bold">{s.matricula}</td>
                          <td className="py-2 px-3 font-semibold text-white">{fullName}</td>
                          <td className="py-2 px-3">{selectedGrade}</td>
                          <td className="py-2 px-3">{selectedGroup}</td>
                          <td className="py-2 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              resolved.status === 'presente' ? 'bg-emerald-500/20 text-emerald-300' :
                              resolved.status === 'retardo' ? 'bg-amber-500/20 text-amber-300' :
                              resolved.status === 'justificado' ? 'bg-cyan-500/20 text-cyan-300' :
                              'bg-red-500/20 text-red-300'
                            }`}>
                              {resolved.label.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-purple-400">{part}</td>
                          <td className="py-2 px-3 text-gray-400">{(part * 0.5).toFixed(1)} pts</td>
                          <td className="py-2 px-3 text-gray-400">{user?.name || 'Profesor'}</td>
                        </tr>
                      );
                    })}
                  </tbody>

                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs text-gray-400">
              <span>Mostrando pestaña: <strong className="text-white">{activeSheetTab}</strong> • Alumnos: {classStudents.length}</span>
              <button
                onClick={() => setIsSpreadsheetModalOpen(false)}
                className="px-4 py-2 rounded-xl glass-panel text-gray-300 hover:text-white cursor-pointer"
              >
                Cerrar Visor
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CONFIGURACIÓN GOOGLE SHEETS WEBHOOK (OPCIONAL)
          ========================================================================= */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-white/20 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Settings className="text-emerald-400" size={20} />
                <span>Configuración de Hoja de Cálculo</span>
              </h3>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Las asistencias y participaciones se guardan localmente y en el servidor en el formato multi-hoja de Excel (.xlsx). Si tu escuela cuenta con un Google Apps Script o Webhook de Google Sheets para sincronización en la nube, ingrésalo aquí:
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">URL del Webhook de Google Sheets (Opcional):</label>
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={googleWebhookUrl}
                onChange={(e) => setGoogleWebhookUrl(e.target.value)}
                className="w-full glass-input py-2 px-3 rounded-xl text-xs text-white font-mono"
              />
              <span className="text-[10px] text-gray-500">
                Al hacer clic en &quot;Guardar el Día&quot; o &quot;Actualizar&quot;, los registros también se enviarán automáticamente a esta URL.
              </span>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2 rounded-xl glass-panel text-xs text-gray-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('dojoia_google_sheets_webhook', googleWebhookUrl.trim());
                  }
                  setIsConfigModalOpen(false);
                  alert('Configuración de Google Sheets guardada.');
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-all cursor-pointer"
              >
                Guardar Configuración
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
