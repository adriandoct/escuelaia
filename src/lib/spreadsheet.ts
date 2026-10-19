import * as XLSX from 'xlsx';
import { Alumno, Asistencia } from './db';

export const MATERIAS_DEFAULT = [
  'Matemáticas',
  'Lengua y Comunicación',
  'Inglés',
  'Ciencias Naturales',
  'Humanidades y Ciencias Sociales',
  'Módulo Profesional Técnico'
] as const;

export type MateriaNombre = typeof MATERIAS_DEFAULT[number] | string;

export interface AlumnoMateriaRecord {
  alumnoId: string;
  matricula: string;
  nombre: string;
  grado: string;
  grupo: string;
  asistencia: 'presente' | 'retardo' | 'ausente' | 'justificado';
  horaEntrada?: string;
  participaciones: number;
  observaciones?: string;
}

export interface TeacherDayStore {
  fecha: string; // YYYY-MM-DD
  grado: string;
  grupo: string;
  docente: string;
  updatedAt: string;
  // participaciones per student id: { [studentId]: number }
  participaciones: Record<string, number>;
  // manual overrides of attendance: { [studentId]: 'presente' | 'retardo' | 'ausente' | 'justificado' }
  asistenciasOverride: Record<string, 'presente' | 'retardo' | 'ausente' | 'justificado'>;
  // subject-specific participaciones: { [materia]: { [studentId]: number } }
  participacionesPorMateria?: Record<string, Record<string, number>>;
  // subject-specific asistencias: { [materia]: { [studentId]: 'presente' | 'retardo' | 'ausente' | 'justificado' } }
  asistenciasPorMateria?: Record<string, Record<string, 'presente' | 'retardo' | 'ausente' | 'justificado'>>;
}

const LOCAL_STORAGE_KEY = 'dojoia_docente_diario';
const GOOGLE_SHEET_WEBHOOK_KEY = 'dojoia_google_sheets_webhook';

// Helper to get all saved daily records
export const getStoredDailyRecords = (): TeacherDayStore[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error al leer dojoia_docente_diario:', e);
    return [];
  }
};

// Helper to get record for specific date, grade, group
export const getDailyRecord = (fecha: string, grado: string, grupo: string): TeacherDayStore | null => {
  const all = getStoredDailyRecords();
  return all.find(r => r.fecha === fecha && r.grado === grado && r.grupo === grupo) || null;
};

// Helper to save daily record
export const saveDailyRecord = async (record: TeacherDayStore): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  try {
    const all = getStoredDailyRecords();
    const idx = all.findIndex(r => r.fecha === record.fecha && r.grado === record.grado && r.grupo === record.grupo);
    if (idx >= 0) {
      all[idx] = record;
    } else {
      all.push(record);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(all));

    // Also sync to server API
    try {
      await fetch('/api/docente-asistencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
    } catch (apiErr) {
      console.warn('No se pudo sincronizar con API de docente, guardado localmente:', apiErr);
    }

    // Optional Google Sheets Webhook sync
    const webhookUrl = localStorage.getItem(GOOGLE_SHEET_WEBHOOK_KEY);
    if (webhookUrl && webhookUrl.trim().startsWith('http')) {
      try {
        await fetch(webhookUrl.trim(), {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'guardar_dia_docente',
            ...record
          })
        });
      } catch (whErr) {
        console.warn('Error al enviar a Google Sheets Webhook:', whErr);
      }
    }

    return true;
  } catch (e) {
    console.error('Error al guardar registro diario:', e);
    return false;
  }
};

// Compute attendance status based on logs and overrides
export const resolveStudentStatus = (
  studentId: string,
  todayLogs: Asistencia[],
  overrides?: Record<string, 'presente' | 'retardo' | 'ausente' | 'justificado'>
): { status: 'presente' | 'retardo' | 'ausente' | 'justificado'; label: string; time: string } => {
  // Check override first
  if (overrides && overrides[studentId]) {
    const ov = overrides[studentId];
    const labels: Record<string, string> = {
      presente: 'Presente',
      retardo: 'Retardo',
      ausente: 'Ausente',
      justificado: 'Justificado'
    };
    return { status: ov, label: labels[ov] || ov, time: ov === 'ausente' ? '-' : 'Manual' };
  }

  // Fallback to scans
  const studentLogs = todayLogs.filter(l => l.alumno_id === studentId);
  if (studentLogs.length === 0) {
    return { status: 'ausente', label: 'Ausente', time: '-' };
  }

  const sorted = [...studentLogs].sort((a, b) => a.hora.localeCompare(b.hora));
  const firstEntry = sorted.find(l => l.tipo === 'entrada');
  if (!firstEntry) {
    return { status: 'ausente', label: 'Ausente', time: '-' };
  }

  const [h, m] = firstEntry.hora.split(':').map(Number);
  const minutes = (h || 0) * 60 + (m || 0);
  const isLate = minutes > (7 * 60 + 30);

  if (isLate) {
    return { status: 'retardo', label: 'Retardo', time: firstEntry.hora };
  }

  return { status: 'presente', label: 'Presente', time: firstEntry.hora };
};

// Generates the comprehensive Multi-Sheet Excel Workbook for all subjects
export const generateSubjectsWorkbook = (
  students: Alumno[],
  todayLogs: Asistencia[],
  fecha: string,
  grado: string,
  grupo: string,
  participaciones: Record<string, number>,
  asistenciasOverride: Record<string, 'presente' | 'retardo' | 'ausente' | 'justificado'>,
  materias: string[] = [...MATERIAS_DEFAULT],
  docenteName: string = 'Docente CECYTE BC',
  participacionesPorMateria?: Record<string, Record<string, number>>,
  asistenciasPorMateria?: Record<string, Record<string, 'presente' | 'retardo' | 'ausente' | 'justificado'>>
): XLSX.WorkBook => {
  const wb = XLSX.utils.book_new();

  // 1. Concentrado General Sheet
  const concentradoRows = students.map((s, idx) => {
    const generalStatus = resolveStudentStatus(s.id, todayLogs, asistenciasOverride);
    const globalPart = participaciones[s.id] || 0;
    const fullName = `${s.apellido_paterno} ${s.apellido_materno || ''} ${s.nombre}`.trim().toUpperCase();

    // Summary row
    const row: Record<string, any> = {
      'No.': idx + 1,
      'Matrícula': s.matricula,
      'Nombre del Alumno': fullName,
      'Grado': grado,
      'Grupo': grupo,
      'Fecha': fecha,
      'Estatus General': generalStatus.label.toUpperCase(),
      'Hora Entrada': generalStatus.time,
      'Total Participaciones': globalPart,
      'Tutor Registrado': s.tutor,
      'Teléfono Tutor': s.telefono
    };

    // Add columns for each individual materia status
    materias.forEach(mat => {
      const matStatusOv = asistenciasPorMateria?.[mat]?.[s.id] || asistenciasOverride[s.id];
      const matStatus = matStatusOv ? matStatusOv.toUpperCase() : generalStatus.status.toUpperCase();
      const matPart = participacionesPorMateria?.[mat]?.[s.id] ?? globalPart;
      row[`${mat} (Asist.)`] = matStatus === 'PRESENTE' ? 'P' : matStatus === 'RETARDO' ? 'R' : matStatus === 'JUSTIFICADO' ? 'J' : 'A';
      row[`${mat} (Part.)`] = matPart;
    });

    return row;
  });

  const wsConcentrado = XLSX.utils.json_to_sheet(concentradoRows);
  // Auto-width columns
  wsConcentrado['!cols'] = [
    { wch: 5 },  // No.
    { wch: 16 }, // Matrícula
    { wch: 34 }, // Nombre
    { wch: 8 },  // Grado
    { wch: 8 },  // Grupo
    { wch: 12 }, // Fecha
    { wch: 16 }, // Estatus
    { wch: 14 }, // Hora
    { wch: 20 }, // Total Part.
    { wch: 26 }, // Tutor
    { wch: 16 }, // Tel
    ...materias.flatMap(() => [{ wch: 16 }, { wch: 14 }])
  ];
  XLSX.utils.book_append_sheet(wb, wsConcentrado, 'Concentrado General');

  // 2. Individual Sheet for EACH Materia
  materias.forEach(materia => {
    const materiaRows = students.map((s, idx) => {
      const matOv = asistenciasPorMateria?.[materia]?.[s.id] || asistenciasOverride[s.id];
      const general = resolveStudentStatus(s.id, todayLogs, matOv ? { [s.id]: matOv } : asistenciasOverride);
      const studentPart = participacionesPorMateria?.[materia]?.[s.id] ?? (participaciones[s.id] || 0);
      const fullName = `${s.apellido_paterno} ${s.apellido_materno || ''} ${s.nombre}`.trim().toUpperCase();

      return {
        'No.': idx + 1,
        'Matrícula': s.matricula,
        'Nombre del Alumno': fullName,
        'Grado': grado,
        'Grupo': grupo,
        'Asignatura / Materia': materia,
        'Fecha de Clase': fecha,
        'Asistencia': general.label.toUpperCase(),
        'Hora Registro': general.time,
        'Participaciones': studentPart,
        'Puntos Participación': (studentPart * 0.5).toFixed(1),
        'Docente Titular': docenteName,
        'Observaciones': general.status === 'ausente' ? 'Falta en sesión' : general.status === 'retardo' ? 'Ingreso con retardo' : 'Cumplió asistencia'
      };
    });

    const wsMateria = XLSX.utils.json_to_sheet(materiaRows);
    wsMateria['!cols'] = [
      { wch: 5 },  // No.
      { wch: 16 }, // Matrícula
      { wch: 34 }, // Nombre
      { wch: 8 },  // Grado
      { wch: 8 },  // Grupo
      { wch: 28 }, // Materia
      { wch: 14 }, // Fecha
      { wch: 15 }, // Asistencia
      { wch: 14 }, // Hora
      { wch: 16 }, // Participaciones
      { wch: 20 }, // Puntos
      { wch: 24 }, // Docente
      { wch: 28 }  // Observaciones
    ];

    // Truncate sheet name to max 31 chars (Excel limit)
    const cleanSheetName = materia.replace(/[\\/?*[\]]/g, '').slice(0, 31);
    XLSX.utils.book_append_sheet(wb, wsMateria, cleanSheetName);
  });

  return wb;
};

// Export to file download in browser
export const downloadSpreadsheetWorkbook = (
  students: Alumno[],
  todayLogs: Asistencia[],
  fecha: string,
  grado: string,
  grupo: string,
  participaciones: Record<string, number>,
  asistenciasOverride: Record<string, 'presente' | 'retardo' | 'ausente' | 'justificado'>,
  materias: string[] = [...MATERIAS_DEFAULT],
  docenteName: string = 'Docente CECYTE BC',
  participacionesPorMateria?: Record<string, Record<string, number>>,
  asistenciasPorMateria?: Record<string, Record<string, 'presente' | 'retardo' | 'ausente' | 'justificado'>>
) => {
  const wb = generateSubjectsWorkbook(
    students,
    todayLogs,
    fecha,
    grado,
    grupo,
    participaciones,
    asistenciasOverride,
    materias,
    docenteName,
    participacionesPorMateria,
    asistenciasPorMateria
  );

  const cleanGrade = grado.replace(/[°º]/g, '');
  const fileName = `Hoja_Calculo_Asistencias_Participaciones_${cleanGrade}${grupo}_${fecha}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
