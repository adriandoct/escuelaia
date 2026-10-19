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
  ShieldCheck, Layers, ArrowRight, X, CloudUpload, HardDrive, Copy, CheckCheck
} from 'lucide-react';
import { 
  MATERIAS_DEFAULT, 
  TeacherDayStore, 
  MatrizSabanaRow,
  getDailyRecord, 
  getStoredDailyRecords,
  saveDailyRecord, 
  resolveStudentStatus, 
  downloadSpreadsheetWorkbook,
  buildMatrizSabanaRows,
  formatDateShort,
  getStoredClassDates,
  saveStoredClassDates,
  getMateriaWebhooksMap,
  setMateriaWebhook,
  GOOGLE_APPS_SCRIPT_TEMPLATE
} from '@/lib/spreadsheet';

export default function TeacherDashboardPage() {
  const { user } = useAuth();
  
  const [students, setStudents] = useState<Alumno[]>([]);
  const [todayLogs, setTodayLogs] = useState<Asistencia[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('1°');
  const [selectedGroup, setSelectedGroup] = useState<string>('A');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // VIEW MODE TOGGLE (Matching user screenshot: Matriz Sábana vs Detallada)
  const [viewMode, setViewMode] = useState<'sabana' | 'detallada'>('sabana');

  // Dates state (dynamic class dates as columns in Matriz Sábana)
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [classDates, setClassDates] = useState<string[]>([]);
  const [newDateInput, setNewDateInput] = useState<string>('');
  const [showAddDate, setShowAddDate] = useState(false);

  // Subject state
  const [selectedMateria, setSelectedMateria] = useState<string>('all'); // 'all' or specific subject name

  // Attendance and Participations states
  const [participaciones, setParticipaciones] = useState<Record<string, number>>({});
  const [asistenciasOverride, setAsistenciasOverride] = useState<Record<string, 'presente' | 'retardo' | 'ausente' | 'justificado'>>({});
  const [participacionesPorMateria, setParticipacionesPorMateria] = useState<Record<string, Record<string, number>>>({});
  const [asistenciasPorMateria, setAsistenciasPorMateria] = useState<Record<string, Record<string, 'presente' | 'retardo' | 'ausente' | 'justificado'>>>({});

  // UI state for saving / feedback
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [lastDriveBackupTime, setLastDriveBackupTime] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'info' | 'warning';
    message: string;
    details?: string;
  } | null>(null);

  // Spreadsheet In-App Viewer Modal
  const [isSpreadsheetModalOpen, setIsSpreadsheetModalOpen] = useState(false);
  const [activeSheetTab, setActiveSheetTab] = useState<string>('Matriz Sábana (Fechas)');

  // Google Drive Backup Modal
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [googleWebhookUrl, setGoogleWebhookUrl] = useState<string>('');
  const [materiaWebhooksMap, setMateriaWebhooksMap] = useState<Record<string, string>>({});
  const [modalMateriaTarget, setModalMateriaTarget] = useState<string>('all');
  const [copiedScript, setCopiedScript] = useState(false);

  // Initial load
  useEffect(() => {
    loadData();
    if (typeof window !== 'undefined') {
      const savedWh = localStorage.getItem('dojoia_google_sheets_webhook') || '';
      setGoogleWebhookUrl(savedWh);
      setMateriaWebhooksMap(getMateriaWebhooksMap());
    }
  }, []);

  // When grade or group changes, load dates and stored records
  useEffect(() => {
    const dates = getStoredClassDates(selectedGrade, selectedGroup);
    setClassDates(dates);
    loadStoredDay(selectedDate, selectedGrade, selectedGroup);
  }, [selectedGrade, selectedGroup]);

  // When date changes, reload that day's state
  useEffect(() => {
    loadStoredDay(selectedDate, selectedGrade, selectedGroup);
  }, [selectedDate]);

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

  // Cycle code in Matriz Sábana: A -> Ap -> App -> Rp -> J. -> '' -> A (per date and materia)
  const handleCycleCodeForDate = (studentId: string, dateStr: string, currentCode: string) => {
    let nextStatus: 'presente' | 'retardo' | 'ausente' | 'justificado' = 'presente';
    let nextPart = 0;

    const trimmed = (currentCode || '').trim();
    if (trimmed === 'A') {
      nextStatus = 'presente';
      nextPart = 1; // 'Ap'
    } else if (trimmed === 'Ap') {
      nextStatus = 'presente';
      nextPart = 2; // 'App'
    } else if (trimmed.startsWith('App')) {
      nextStatus = 'retardo';
      nextPart = 1; // 'Rp'
    } else if (trimmed === 'Rp' || trimmed === 'R') {
      nextStatus = 'justificado';
      nextPart = 0; // 'J.'
    } else if (trimmed === 'J.' || trimmed === 'J') {
      nextStatus = 'ausente';
      nextPart = 0; // ''
    } else {
      nextStatus = 'presente';
      nextPart = 0; // 'A'
    }

    if (dateStr === selectedDate) {
      handleSetAttendance(studentId, nextStatus);

      if (selectedMateria === 'all') {
        setParticipaciones(prev => ({ ...prev, [studentId]: nextPart }));
        setParticipacionesPorMateria(prev => {
          const next = { ...prev };
          MATERIAS_DEFAULT.forEach(m => {
            next[m] = { ...(next[m] || {}), [studentId]: nextPart };
          });
          return next;
        });
      } else {
        setParticipacionesPorMateria(prev => ({
          ...prev,
          [selectedMateria]: {
            ...(prev[selectedMateria] || {}),
            [studentId]: nextPart
          }
        }));
      }
    } else {
      // Historical date editing
      const all = getStoredDailyRecords();
      let record = all.find(r => r.fecha === dateStr && r.grado === selectedGrade && r.grupo === selectedGroup);
      if (!record) {
        record = {
          fecha: dateStr,
          grado: selectedGrade,
          grupo: selectedGroup,
          docente: user?.name || 'Profesor Titular',
          updatedAt: new Date().toISOString(),
          participaciones: {},
          asistenciasOverride: {},
          participacionesPorMateria: {},
          asistenciasPorMateria: {}
        };
        all.push(record);
      }

      if (selectedMateria === 'all') {
        record.asistenciasOverride = record.asistenciasOverride || {};
        record.participaciones = record.participaciones || {};
        record.asistenciasOverride[studentId] = nextStatus;
        record.participaciones[studentId] = nextPart;
        record.asistenciasPorMateria = record.asistenciasPorMateria || {};
        record.participacionesPorMateria = record.participacionesPorMateria || {};
        MATERIAS_DEFAULT.forEach(m => {
          record!.asistenciasPorMateria![m] = { ...(record!.asistenciasPorMateria![m] || {}), [studentId]: nextStatus };
          record!.participacionesPorMateria![m] = { ...(record!.participacionesPorMateria![m] || {}), [studentId]: nextPart };
        });
      } else {
        record.asistenciasPorMateria = record.asistenciasPorMateria || {};
        record.participacionesPorMateria = record.participacionesPorMateria || {};
        record.asistenciasPorMateria[selectedMateria] = {
          ...(record.asistenciasPorMateria[selectedMateria] || {}),
          [studentId]: nextStatus
        };
        record.participacionesPorMateria[selectedMateria] = {
          ...(record.participacionesPorMateria[selectedMateria] || {}),
          [studentId]: nextPart
        };
      }

      record.updatedAt = new Date().toISOString();
      localStorage.setItem('dojoia_docente_diario', JSON.stringify(all));
      setLastSavedTime(new Date().toLocaleTimeString());
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

  // Add new class date to the matrix
  const handleAddNewDate = () => {
    if (!newDateInput) return;
    if (!classDates.includes(newDateInput)) {
      const updated = [...classDates, newDateInput].sort();
      setClassDates(updated);
      saveStoredClassDates(selectedGrade, selectedGroup, updated);
      setSelectedDate(newDateInput);
    }
    setNewDateInput('');
    setShowAddDate(false);
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

  // Build Matriz Sábana Rows for rendering
  const allDailyRecords = useMemo(() => getStoredDailyRecords(), [lastSavedTime]);

  const matrizSabanaRows: MatrizSabanaRow[] = useMemo(() => {
    return buildMatrizSabanaRows(
      classStudents,
      classDates,
      todayLogs,
      selectedDate,
      participaciones,
      asistenciasOverride,
      allDailyRecords,
      selectedMateria,
      participacionesPorMateria,
      asistenciasPorMateria
    );
  }, [classStudents, classDates, todayLogs, selectedDate, participaciones, asistenciasOverride, allDailyRecords, selectedMateria, participacionesPorMateria, asistenciasPorMateria]);

  // MAIN ACTION 1: GUARDAR EL DÍA
  const handleSaveDay = async () => {
    setIsSaving(true);
    try {
      const storeRecord: TeacherDayStore = {
        fecha: selectedDate,
        grado: selectedGrade,
        grupo: selectedGroup,
        materia: selectedMateria !== 'all' ? selectedMateria : undefined,
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
        particleCount: 65,
        spread: 60,
        origin: { y: 0.7 }
      });

      const nowTime = new Date().toLocaleTimeString();
      setLastSavedTime(nowTime);

      const totalParts = Object.values(participaciones).reduce((a, b) => a + b, 0);

      setFeedbackBanner({
        type: 'success',
        message: `¡Día de clase guardado con éxito (${formatDateShort(selectedDate)})!`,
        details: `Se actualizaron las asistencias y participaciones en la hoja de cálculo Matriz Sábana y en todas las materias (${MATERIAS_DEFAULT.length} materias) para ${selectedGrade} "${selectedGroup}". Total de participaciones registradas hoy: ${totalParts}.`
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
      const allLogs = await db.getAsistencias();
      const allStudents = await db.getAlumnos();
      setStudents(allStudents);
      setTodayLogs(allLogs);

      loadStoredDay(selectedDate, selectedGrade, selectedGroup);

      const storeRecord: TeacherDayStore = {
        fecha: selectedDate,
        grado: selectedGrade,
        grupo: selectedGroup,
        materia: selectedMateria !== 'all' ? selectedMateria : undefined,
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
        message: '¡Matriz Sábana y asistencias actualizadas!',
        details: `Se sincronizaron los nuevos registros de escaneo institucional y se refrescó la hoja de cálculo para todas las fechas y materias.`
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

  // MAIN ACTION 3: SUBIR AL GOOGLE DRIVE (RESPALDO AUTOMÁTICO EN LA NUBE)
  const handleUploadToGoogleDrive = async () => {
    setIsUploadingDrive(true);
    try {
      // 1. Prepare export rows formatted exactly as the Matriz Sábana
      const exportRows = matrizSabanaRows.map(r => {
        const rowObj: Record<string, any> = {
          'NO.': r.index,
          'MATRÍCULA': r.matricula,
          'NOMBRE DEL ALUMNO': r.nombre
        };

        classDates.forEach(d => {
          const label = formatDateShort(d);
          rowObj[label] = r.fechas[d]?.code || '';
        });

        rowObj['ASIST (A)'] = r.asistenciasTotal;
        rowObj['RET (R)'] = r.retardosTotal;
        rowObj['FALT (F)'] = r.faltasTotal;
        rowObj['PART. TOTAL'] = r.participacionesTotal;
        rowObj['PUNTOS (PTS)'] = r.puntosTotal;
        rowObj['% ASISTENCIA'] = `${r.porcentajeAsistencia}%`;

        return rowObj;
      });

      const currentMateriaWebhooks = getMateriaWebhooksMap();
      const targetWebhook = (selectedMateria !== 'all' && currentMateriaWebhooks[selectedMateria]) || googleWebhookUrl;
      const targetMateriaName = selectedMateria !== 'all' ? selectedMateria : 'Todas las materias';

      const payload = {
        fecha: selectedDate,
        grado: selectedGrade,
        grupo: selectedGroup,
        materia: targetMateriaName,
        docente: user?.name || 'Docente',
        rows: exportRows,
        webhookUrl: targetWebhook
      };

      // 2. Post to Drive Backup API
      const res = await fetch('/api/drive-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      const timeNow = new Date().toLocaleTimeString();
      setLastDriveBackupTime(timeNow);

      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.6 }
      });

      let detailsMsg = `Se generó el respaldo de la Matriz Sábana para "${targetMateriaName}" (${classStudents.length} alumnos, ${classDates.length} fechas).`;
      if (targetWebhook && data.webhookResult?.ok) {
        detailsMsg += ` ¡Se sincronizó exitosamente con tu Google Sheet de "${targetMateriaName}" en Google Drive!`;
      } else if (targetWebhook) {
        detailsMsg += ` Se transmitió la solicitud a tu Webhook de Google Sheets para "${targetMateriaName}".`;
      } else {
        detailsMsg += ' Para enlace directo a tu Google Sheet en Drive, configura tu Webhook en el botón de ajustes.';
      }

      setFeedbackBanner({
        type: 'success',
        message: `☁️ ¡Respaldo subido a Google Drive para ${targetMateriaName}!`,
        details: detailsMsg
      });

      setTimeout(() => {
        setFeedbackBanner(null);
      }, 8000);
    } catch (err: any) {
      alert(`Error al subir respaldo a Google Drive: ${err.message || err}`);
    } finally {
      setIsUploadingDrive(false);
    }
  };

  // SUBIR RESPALDO DE TODAS LAS MATERIAS (6 HOJAS) A GOOGLE DRIVE
  const handleUploadAllMateriasToGoogleDrive = async () => {
    setIsUploadingDrive(true);
    try {
      const currentMateriaWebhooks = getMateriaWebhooksMap();
      let syncedCount = 0;

      for (const mat of MATERIAS_DEFAULT) {
        const rowsForMateria = buildMatrizSabanaRows(
          classStudents,
          classDates,
          todayLogs,
          selectedDate,
          participaciones,
          asistenciasOverride,
          allDailyRecords,
          mat,
          participacionesPorMateria,
          asistenciasPorMateria
        );

        const exportRows = rowsForMateria.map(r => {
          const rowObj: Record<string, any> = {
            'NO.': r.index,
            'MATRÍCULA': r.matricula,
            'NOMBRE DEL ALUMNO': r.nombre
          };
          classDates.forEach(d => {
            const label = formatDateShort(d);
            rowObj[label] = r.fechas[d]?.code || '';
          });
          rowObj['ASIST (A)'] = r.asistenciasTotal;
          rowObj['RET (R)'] = r.retardosTotal;
          rowObj['FALT (F)'] = r.faltasTotal;
          rowObj['PART. TOTAL'] = r.participacionesTotal;
          rowObj['PUNTOS (PTS)'] = r.puntosTotal;
          rowObj['% ASISTENCIA'] = `${r.porcentajeAsistencia}%`;
          return rowObj;
        });

        const targetWebhook = currentMateriaWebhooks[mat] || googleWebhookUrl;
        await fetch('/api/drive-backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fecha: selectedDate,
            grado: selectedGrade,
            grupo: selectedGroup,
            materia: mat,
            docente: user?.name || 'Docente',
            rows: exportRows,
            webhookUrl: targetWebhook
          })
        });
        syncedCount++;
      }

      const timeNow = new Date().toLocaleTimeString();
      setLastDriveBackupTime(timeNow);

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      setFeedbackBanner({
        type: 'success',
        message: `☁️ ¡Respaldo completado para las ${syncedCount} materias en Google Drive!`,
        details: `Se generaron y actualizaron las hojas de cálculo individuales para cada materia (${MATERIAS_DEFAULT.join(', ')}) con la fecha ${formatDateShort(selectedDate)}.`
      });

      setTimeout(() => {
        setFeedbackBanner(null);
      }, 8000);
    } catch (err: any) {
      alert(`Error al subir respaldo de todas las materias: ${err.message || err}`);
    } finally {
      setIsUploadingDrive(false);
    }
  };

  // MAIN ACTION 4: DESCARGAR HOJA DE CÁLCULO (.XLSX)
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

  // Copy Google Apps Script code to clipboard
  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
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
          HEADER BANNER CON CONTROLES PRINCIPALES Y RESPALDO EN DRIVE
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
            <span className="text-cyan-400 font-mono">Clase de hoy: {formatDateShort(selectedDate)}</span>
            {lastSavedTime && (
              <>
                <span>•</span>
                <span className="text-gray-400 text-xs">Guardado a las: {lastSavedTime}</span>
              </>
            )}
            {lastDriveBackupTime && (
              <>
                <span>•</span>
                <span className="text-emerald-400 text-xs font-semibold">☁️ Respaldo Drive: {lastDriveBackupTime}</span>
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
            className="flex items-center space-x-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition-all transform active:scale-95 cursor-pointer disabled:opacity-50"
            title="Guardar asistencias y participaciones del día en la hoja de cálculo para todas las materias"
          >
            <Save size={17} className={isSaving ? 'animate-spin' : ''} />
            <span>{isSaving ? 'Guardando en Hoja...' : 'Guardar el Día'}</span>
          </button>

          {/* Button: Subir al Drive (Respaldo en la nube) */}
          <button
            onClick={handleUploadToGoogleDrive}
            disabled={isUploadingDrive}
            className="flex items-center space-x-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-cyan-500/25 transition-all transform active:scale-95 cursor-pointer disabled:opacity-50"
            title="Subir y respaldar la hoja de cálculo directamente en Google Drive"
          >
            <CloudUpload size={17} className={isUploadingDrive ? 'animate-spin text-cyan-200' : ''} />
            <span>{isUploadingDrive ? 'Subiendo a Drive...' : 'Subir a Drive (Respaldo)'}</span>
          </button>

          {/* Button: Actualizar */}
          <button
            onClick={handleRefreshAndSync}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl glass-panel text-xs sm:text-sm font-semibold text-gray-200 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="Actualizar escaneos del lector y sincronizar hoja de cálculo"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-emerald-400' : ''} />
            <span>Actualizar</span>
          </button>

          {/* Button: Descargar Excel (.xlsx) */}
          <button
            onClick={handleDownloadExcel}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/40 text-gray-300 hover:text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer"
            title="Descargar libro de Excel completo (.xlsx) con la Matriz Sábana y hojas de todas las materias"
          >
            <Download size={16} className="text-emerald-400" />
            <span className="hidden sm:inline">Descargar .xlsx</span>
          </button>

          {/* Button: Config Google Drive */}
          <button
            onClick={() => setIsDriveModalOpen(true)}
            className="p-2.5 sm:p-3 rounded-xl glass-panel text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="Configuración de sincronización automática con Google Drive"
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
          VIEW MODE TOGGLE: VISTA MATRIZ SÁBANA VS VISTA DETALLADA (EXACTO A LA IMAGEN)
          ========================================================================= */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Toggle Buttons (Matching user screenshot style) */}
        <div className="flex items-center space-x-2 p-1.5 rounded-2xl bg-[#030712]/90 border border-white/10 shadow-lg">
          <button
            type="button"
            onClick={() => setViewMode('sabana')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              viewMode === 'sabana'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-lg shadow-emerald-500/30 ring-1 ring-emerald-300'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>📊</span>
            <span>Vista Matriz Sábana (Fechas x Alumnos)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('detallada')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              viewMode === 'detallada'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-lg shadow-emerald-500/30 ring-1 ring-emerald-300 font-extrabold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>📑</span>
            <span>Vista Detallada (Fila por Fila)</span>
          </button>
        </div>

        {/* Roster Search Input (Matching user screenshot style) */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
          <input
            type="text"
            placeholder="Buscar por matrícula o alumno..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full glass-input py-2.5 pl-9 pr-4 rounded-xl text-xs text-white"
          />
        </div>

      </div>

      {/* =========================================================================
          FILTROS: GRADO, GRUPO, FECHA DE CLASE Y MATERIA
          ========================================================================= */}
      <div className="glass-panel p-5 rounded-3xl space-y-4">
        
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
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

          {/* Active Class Date Picker & Add Date button */}
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center space-x-1">
              <Calendar size={14} className="text-emerald-400" />
              <span>Día de Clase:</span>
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
              Hoy ({formatDateShort(new Date().toISOString().split('T')[0])})
            </button>

            {/* Quick add date to matrix */}
            {showAddDate ? (
              <div className="inline-flex items-center space-x-1">
                <input
                  type="date"
                  value={newDateInput}
                  onChange={(e) => setNewDateInput(e.target.value)}
                  className="glass-input py-1 px-2 rounded-lg text-xs text-white"
                />
                <button
                  onClick={handleAddNewDate}
                  className="px-2 py-1 bg-emerald-500 text-black font-bold text-xs rounded-lg cursor-pointer"
                >
                  OK
                </button>
                <button
                  onClick={() => setShowAddDate(false)}
                  className="p-1 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddDate(true)}
                className="px-2.5 py-1.5 rounded-xl glass-panel text-[11px] font-semibold text-cyan-400 hover:text-white flex items-center space-x-1 cursor-pointer"
                title="Agregar otra fecha de clase a la matriz sábana"
              >
                <Plus size={12} />
                <span>+ Agregar Fecha</span>
              </button>
            )}
          </div>

        </div>

        {/* Subjects Selector Bar */}
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
          STATISTICS CARDS SUMMARY
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
          <span className="text-[10px] text-emerald-500/70 font-semibold">Hoy ({formatDateShort(selectedDate)})</span>
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
          <span className="text-[10px] text-red-500/70 font-semibold">Falta</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-purple-500/20 bg-purple-500/5">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] uppercase font-bold">Participaciones</span>
            <Award size={16} className="text-purple-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-purple-400 mt-1.5">{classStats.totalPart}</p>
          <span className="text-[10px] text-purple-400/70 font-semibold">Hoy ({formatDateShort(selectedDate)})</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-blue-500/20 bg-blue-500/5">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] uppercase font-bold">Fechas Sábana</span>
            <Layers size={16} className="text-cyan-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-cyan-400 mt-1.5">{classDates.length}</p>
          <span className="text-[10px] text-cyan-400/70 font-semibold">Sesiones registradas</span>
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
          VISTA 1: MATRIZ SÁBANA (FECHAS X ALUMNOS) - EXACTO A LA CAPTURA DEL USUARIO
          ========================================================================= */}
      {viewMode === 'sabana' && (
        <div className="glass-panel p-6 rounded-3xl space-y-4 border border-emerald-500/20">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-extrabold text-white flex items-center space-x-2">
                <span>Matriz Sábana de Asistencias y Participaciones</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-mono border border-emerald-500/30">
                  {selectedGrade} &quot;{selectedGroup}&quot;
                </span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Columnas dinámicas por fecha de clase. Haz clic en cualquier celda para alternar el estatus (A/R/F/J).
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleUploadToGoogleDrive}
                disabled={isUploadingDrive}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-300 hover:bg-blue-500/30 text-xs font-bold transition-all cursor-pointer"
              >
                <CloudUpload size={14} className={isUploadingDrive ? 'animate-spin' : ''} />
                <span>Respaldar en Google Drive</span>
              </button>
            </div>
          </div>

          {classStudents.length === 0 ? (
            <div className="text-center py-12 text-gray-500 space-y-2">
              <Users size={32} className="mx-auto text-gray-600" />
              <p className="text-sm font-semibold">No se encontraron alumnos para el grupo {selectedGrade} &quot;{selectedGroup}&quot;.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#030712]/60">
              <table className="w-full text-left text-xs font-mono">
                
                {/* Table Header exactly matching user screenshot */}
                <thead>
                  <tr className="border-b border-white/10 text-gray-300 text-[11px] uppercase font-bold bg-[#040916]">
                    <th className="py-3 px-3 w-10">NO.</th>
                    <th className="py-3 px-3 min-w-[130px]">MATRÍCULA</th>
                    <th className="py-3 px-4 min-w-[220px]">NOMBRE DEL ALUMNO</th>
                    
                    {/* Date columns */}
                    {classDates.map(dateStr => {
                      const isTodayDate = dateStr === selectedDate;
                      return (
                        <th 
                          key={dateStr} 
                          className={`py-3 px-2 text-center min-w-[65px] ${
                            isTodayDate ? 'bg-emerald-500/10 text-emerald-400 border-x border-emerald-500/20' : ''
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <span>{formatDateShort(dateStr)}</span>
                            {isTodayDate && (
                              <span className="text-[9px] font-normal text-emerald-400/80">Hoy</span>
                            )}
                          </div>
                        </th>
                      );
                    })}

                    {/* Summary Totals columns */}
                    <th className="py-3 px-3 text-center min-w-[75px] text-emerald-400 bg-emerald-500/5">ASIST (A)</th>
                    <th className="py-3 px-3 text-center min-w-[70px] text-amber-400 bg-amber-500/5">RET (R)</th>
                    <th className="py-3 px-3 text-center min-w-[70px] text-red-400 bg-red-500/5">FALT (F)</th>
                    <th className="py-3 px-3 text-center min-w-[85px] text-purple-400 bg-purple-500/5">PART. TOTAL</th>
                    <th className="py-3 px-3 text-center min-w-[80px] text-yellow-400 bg-yellow-500/5">PUNTOS (PTS)</th>
                    <th className="py-3 px-3 text-center min-w-[85px] text-teal-400 bg-teal-500/5">% ASISTENCIA</th>
                  </tr>
                </thead>

                {/* Table Rows exactly matching user screenshot */}
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {matrizSabanaRows.map((row) => (
                    <tr key={row.alumnoId} className="hover:bg-white/[0.03] transition-colors">
                      
                      {/* NO. */}
                      <td className="py-3 px-3 text-gray-500 font-bold">{row.index}</td>

                      {/* MATRÍCULA */}
                      <td className="py-3 px-3 font-mono text-cyan-400 font-semibold">{row.matricula}</td>

                      {/* NOMBRE DEL ALUMNO */}
                      <td className="py-3 px-4 font-bold text-white tracking-wide">
                        {row.nombre}
                      </td>

                      {/* DATES BADGES */}
                      {classDates.map(dateStr => {
                        const cellData = row.fechas[dateStr] || { code: '', status: 'A', participaciones: 0 };
                        const isToday = dateStr === selectedDate;
                        const code = cellData.code;

                        return (
                          <td 
                            key={dateStr}
                            className={`py-2 px-1 text-center ${
                              isToday ? 'bg-emerald-500/5 border-x border-emerald-500/10' : ''
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleCycleCodeForDate(row.alumnoId, dateStr, code)}
                              className={`min-w-[32px] h-7 px-1 rounded-md font-mono font-bold text-xs transition-all cursor-pointer inline-flex items-center justify-center ${
                                code.startsWith('App') ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40 shadow-sm' :
                                code.startsWith('Ap') ? 'bg-teal-500/25 text-teal-300 border border-teal-500/40 shadow-sm' :
                                code === 'A' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                code.startsWith('R') ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                code.startsWith('J') ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                                'bg-transparent text-gray-600 hover:bg-white/5 border border-transparent'
                              }`}
                              title={`Clic para alternar en ${formatDateShort(dateStr)}: ${code || 'Falta'} (A, Ap, App, Rp, J.)`}
                            >
                              {code || '—'}
                            </button>
                          </td>
                        );
                      })}

                      {/* ASIST (A) */}
                      <td className="py-3 px-3 text-center font-bold text-emerald-400 bg-emerald-500/5 font-mono">
                        {row.asistenciasTotal}
                      </td>

                      {/* RET (R) */}
                      <td className="py-3 px-3 text-center font-bold text-amber-400 bg-amber-500/5 font-mono">
                        {row.retardosTotal}
                      </td>

                      {/* FALT (F) */}
                      <td className="py-3 px-3 text-center font-bold text-red-400 bg-red-500/5 font-mono">
                        {row.faltasTotal}
                      </td>

                      {/* PART. TOTAL */}
                      <td className="py-3 px-3 text-center font-bold text-purple-400 bg-purple-500/5 font-mono">
                        {row.participacionesTotal}
                      </td>

                      {/* PUNTOS (PTS) */}
                      <td className="py-3 px-3 text-center font-bold text-yellow-400 bg-yellow-500/5 font-mono">
                        {row.puntosTotal.toFixed(1)}
                      </td>

                      {/* % ASISTENCIA */}
                      <td className="py-3 px-3 text-center font-black text-teal-400 bg-teal-500/5 font-mono">
                        {row.porcentajeAsistencia}%
                      </td>

                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          )}

        </div>
      )}

      {/* =========================================================================
          VISTA 2: VISTA DETALLADA (FILA POR FILA CON FOTO, ASISTENCIAS Y PARTICIPACIONES)
          ========================================================================= */}
      {viewMode === 'detallada' && (
        <div className="glass-panel p-6 rounded-3xl space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>Lista Detallada - {selectedGrade} Grado &quot;{selectedGroup}&quot;</span>
                <span className="text-xs font-normal text-gray-400">({classStudents.length} alumnos inscritos)</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Clase seleccionada: <strong className="text-emerald-400">{formatDateShort(selectedDate)}</strong> • Materia: <strong className="text-cyan-400">{selectedMateria === 'all' ? 'Todas las Materias' : selectedMateria}</strong>
              </p>
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
                            <button
                              type="button"
                              onClick={() => handleModifyParticipation(student.id, -1)}
                              disabled={studentPart <= 0}
                              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent text-gray-300 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                              title="Restar participación"
                            >
                              <Minus size={13} />
                            </button>

                            <span className={`w-9 text-center font-black text-sm font-mono ${
                              studentPart > 0 ? 'text-purple-400' : 'text-gray-500'
                            }`}>
                              {studentPart}
                            </span>

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
      )}

      {/* =========================================================================
          MODAL: CONFIGURACIÓN GOOGLE DRIVE / SHEETS (RESPALDO EN LA NUBE)
          ========================================================================= */}
      {isDriveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border border-blue-500/30 p-6 space-y-5 shadow-2xl">
            
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <CloudUpload className="text-cyan-400" size={22} />
                <span>Respaldo Automático en Google Drive</span>
              </h3>
              <button
                onClick={() => setIsDriveModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs text-gray-300">
              <p>
                Cada vez que haces clic en <strong className="text-emerald-400">&quot;Guardar el Día&quot;</strong> o <strong className="text-cyan-400">&quot;Subir a Drive&quot;</strong>, el sistema actualiza la <strong>hoja de cálculo de la materia en tu Google Drive</strong> con la fecha de la clase (por ejemplo hoy, columna N) registrando asistencias y participaciones (<span className="text-emerald-400 font-mono">A, Ap, App, Rp, J.</span>).
              </p>
              <p>
                Puedes tener una hoja de cálculo individual para cada materia o una hoja compartida. Configura el enlace de cada una a continuación:
              </p>
            </div>

            {/* Materia Selector in Drive Modal */}
            <div className="space-y-2.5 p-4 rounded-2xl bg-black/40 border border-white/10">
              <label className="text-xs font-bold text-white flex items-center justify-between">
                <span>Configurar Hoja de Cálculo de:</span>
                <span className="text-[10px] text-cyan-400 font-semibold font-mono">
                  {modalMateriaTarget === 'all' ? '⭐ Todas las Materias (General)' : modalMateriaTarget}
                </span>
              </label>

              <div className="flex items-center flex-wrap gap-1.5 pb-2">
                <button
                  type="button"
                  onClick={() => setModalMateriaTarget('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                    modalMateriaTarget === 'all'
                      ? 'bg-cyan-500 text-black font-extrabold shadow-sm'
                      : 'glass-panel text-gray-400 hover:text-white'
                  }`}
                >
                  ⭐ General
                </button>
                {MATERIAS_DEFAULT.map(mat => (
                  <button
                    key={mat}
                    type="button"
                    onClick={() => setModalMateriaTarget(mat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-all ${
                      modalMateriaTarget === mat
                        ? 'bg-emerald-500 text-black font-bold shadow-sm'
                        : 'glass-panel text-gray-400 hover:text-white'
                    }`}
                  >
                    {mat}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-300">
                  URL del Webhook de Google Sheets para &quot;{modalMateriaTarget === 'all' ? 'Todas las Materias' : modalMateriaTarget}&quot;:
                </label>
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={modalMateriaTarget === 'all' ? googleWebhookUrl : (materiaWebhooksMap[modalMateriaTarget] || '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (modalMateriaTarget === 'all') {
                      setGoogleWebhookUrl(val);
                    } else {
                      setMateriaWebhooksMap(prev => ({ ...prev, [modalMateriaTarget]: val }));
                    }
                  }}
                  className="w-full glass-input py-2 px-3 rounded-xl text-xs text-white font-mono"
                />
                <span className="text-[10px] text-gray-400 block mt-1">
                  Al pulsar &quot;Guardar el Día&quot; o &quot;Subir a Drive&quot;, los registros se sincronizarán directamente en la hoja de esta materia en tu Google Drive.
                </span>
              </div>
            </div>

            {/* Google Apps Script Helper Accordion */}
            <div className="space-y-2 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-300 flex items-center space-x-1.5">
                  <HardDrive size={15} />
                  <span>¿Cómo obtener tu Webhook de Google Drive en 1 minuto?</span>
                </span>
                <button
                  onClick={handleCopyScript}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-[11px] font-semibold transition-all cursor-pointer"
                >
                  {copiedScript ? <CheckCheck size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copiedScript ? '¡Código Copiado!' : 'Copiar Código'}</span>
                </button>
              </div>

              <ol className="text-[11px] text-gray-400 list-decimal list-inside space-y-1 pt-1">
                <li>Abre la hoja de cálculo de tu materia en <strong>Google Drive</strong>.</li>
                <li>Haz clic en el menú <strong>Extensiones &gt; Apps Script</strong>.</li>
                <li>Borra lo que haya, pega el código copiado con el botón de arriba y presiona <strong>Guardar</strong>.</li>
                <li>Haz clic en <strong>Implementar &gt; Nueva Implementación &gt; Aplicación Web</strong>.</li>
                <li>En <em>&quot;Quién tiene acceso&quot;</em> selecciona <strong>Cualquier usuario</strong> y haz clic en <em>Implementar</em>.</li>
                <li>Copia la URL que te da Google y pégala en el campo de arriba de esa materia.</li>
              </ol>

              <div className="pt-2 flex items-center justify-between">
                <a 
                  href="https://drive.google.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[11px] text-cyan-400 hover:underline flex items-center space-x-1"
                >
                  <span>Abrir Google Drive</span>
                  <ExternalLink size={12} />
                </a>
                <a 
                  href="https://docs.google.com/spreadsheets" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[11px] text-emerald-400 hover:underline flex items-center space-x-1"
                >
                  <span>Abrir Google Sheets</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2">
              <div className="flex items-center flex-wrap gap-2">
                <button
                  onClick={() => {
                    handleUploadToGoogleDrive();
                    setIsDriveModalOpen(false);
                  }}
                  disabled={isUploadingDrive}
                  className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs transition-all cursor-pointer flex items-center space-x-1.5"
                  title="Subir la matriz de la materia seleccionada actualmente"
                >
                  <CloudUpload size={14} />
                  <span>Subir Materia Seleccionada</span>
                </button>

                <button
                  onClick={() => {
                    handleUploadAllMateriasToGoogleDrive();
                    setIsDriveModalOpen(false);
                  }}
                  disabled={isUploadingDrive}
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs transition-all cursor-pointer flex items-center space-x-1.5"
                  title="Actualizar y respaldar las hojas de cálculo de cada una de las 6 materias"
                >
                  <Layers size={14} />
                  <span>Subir TODAS las Materias (6 Hojas)</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsDriveModalOpen(false)}
                  className="px-4 py-2 rounded-xl glass-panel text-xs text-gray-400 hover:text-white cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('dojoia_google_sheets_webhook', googleWebhookUrl.trim());
                      Object.entries(materiaWebhooksMap).forEach(([mat, url]) => {
                        setMateriaWebhook(mat, url);
                      });
                    }
                    setIsDriveModalOpen(false);
                    alert('Configuraciones de Google Sheets guardadas con éxito.');
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-all cursor-pointer"
                >
                  Guardar Enlaces
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
