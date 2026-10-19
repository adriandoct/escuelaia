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
  participaciones: Record<string, number>;
  asistenciasOverride: Record<string, 'presente' | 'retardo' | 'ausente' | 'justificado'>;
  participacionesPorMateria?: Record<string, Record<string, number>>;
  asistenciasPorMateria?: Record<string, Record<string, 'presente' | 'retardo' | 'ausente' | 'justificado'>>;
}

// Matrix Sábana row model (Dates as columns)
export interface MatrizSabanaRow {
  index: number;
  alumnoId: string;
  matricula: string;
  nombre: string;
  grado: string;
  grupo: string;
  // fecha -> { asistencia: 'A'|'R'|'F'|'J', participaciones: number }
  fechas: Record<string, { status: 'A' | 'R' | 'F' | 'J'; participaciones: number }>;
  asistenciasTotal: number;
  retardosTotal: number;
  faltasTotal: number;
  participacionesTotal: number;
  puntosTotal: number;
  porcentajeAsistencia: number;
}

const LOCAL_STORAGE_KEY = 'dojoia_docente_diario';
const GOOGLE_SHEET_WEBHOOK_KEY = 'dojoia_google_sheets_webhook';
const DATES_LIST_KEY = 'dojoia_fechas_clase';

// Standard class dates matching school cycle leading up to today (19 oct 2026)
export const DEFAULT_CLASS_DATES = [
  '2026-09-10',
  '2026-09-12',
  '2026-10-03',
  '2026-10-10',
  '2026-10-14',
  '2026-10-17',
  '2026-10-19' // Hoy
];

// Helper to format ISO date YYYY-MM-DD to short display (e.g. 19 oct, 12 sep)
export const formatDateShort = (isoDate: string): string => {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length < 3) return isoDate;
  const day = parseInt(parts[2], 10);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const monthName = months[monthIdx] || parts[1];
  return `${day} ${monthName}`;
};

// Get stored dates for a group
export const getStoredClassDates = (grado: string, grupo: string): string[] => {
  if (typeof window === 'undefined') return DEFAULT_CLASS_DATES;
  try {
    const raw = localStorage.getItem(`${DATES_LIST_KEY}_${grado}_${grupo}`);
    if (raw) {
      const parsed: string[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure today is included
        const todayStr = new Date().toISOString().split('T')[0];
        if (!parsed.includes(todayStr)) {
          parsed.push(todayStr);
          parsed.sort();
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_CLASS_DATES;
};

// Save custom dates
export const saveStoredClassDates = (grado: string, grupo: string, dates: string[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${DATES_LIST_KEY}_${grado}_${grupo}`, JSON.stringify(dates));
  } catch (e) {
    console.error(e);
  }
};

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

    // Update stored dates list if new date
    const dates = getStoredClassDates(record.grado, record.grupo);
    if (!dates.includes(record.fecha)) {
      dates.push(record.fecha);
      dates.sort();
      saveStoredClassDates(record.grado, record.grupo, dates);
    }

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

// Build Matriz Sábana Rows for all dates x students
export const buildMatrizSabanaRows = (
  students: Alumno[],
  classDates: string[],
  todayLogs: Asistencia[],
  currentDate: string,
  participaciones: Record<string, number>,
  asistenciasOverride: Record<string, 'presente' | 'retardo' | 'ausente' | 'justificado'>,
  allDailyRecords: TeacherDayStore[]
): MatrizSabanaRow[] => {
  return students.map((s, idx) => {
    const fechasMap: Record<string, { status: 'A' | 'R' | 'F' | 'J'; participaciones: number }> = {};
    let totalA = 0;
    let totalR = 0;
    let totalF = 0;
    let totalPart = 0;

    classDates.forEach(date => {
      let st: 'A' | 'R' | 'F' | 'J' = 'A';
      let part = 0;

      if (date === currentDate) {
        // Today / active selected date
        const current = resolveStudentStatus(s.id, todayLogs, asistenciasOverride);
        if (current.status === 'presente') st = 'A';
        else if (current.status === 'retardo') st = 'R';
        else if (current.status === 'justificado') st = 'J';
        else st = 'F';
        part = participaciones[s.id] || 0;
      } else {
        // Historical date from stored records
        const hist = allDailyRecords.find(r => r.fecha === date && r.grado === s.grado && r.grupo === s.grupo);
        if (hist) {
          const ov = hist.asistenciasOverride?.[s.id];
          if (ov === 'presente') st = 'A';
          else if (ov === 'retardo') st = 'R';
          else if (ov === 'justificado') st = 'J';
          else if (ov === 'ausente') st = 'F';
          else st = 'A'; // default present if class held
          part = hist.participaciones?.[s.id] || 0;
        } else {
          // Default historical baseline
          st = 'A';
          part = 0;
        }
      }

      fechasMap[date] = { status: st, participaciones: part };

      if (st === 'A') totalA++;
      else if (st === 'R') totalR++;
      else if (st === 'F') totalF++;

      totalPart += part;
    });

    const totalSesiones = classDates.length;
    // % de asistencia considerando retardos como 0.8
    const efectivas = totalA + (totalR * 0.8);
    const porcentaje = totalSesiones > 0 ? Math.min(100, Math.round((efectivas / totalSesiones) * 100)) : 100;
    const puntos = totalPart * 0.5;

    return {
      index: idx + 1,
      alumnoId: s.id,
      matricula: s.matricula,
      nombre: `${s.apellido_paterno} ${s.apellido_materno || ''} ${s.nombre}`.trim().toUpperCase(),
      grado: s.grado,
      grupo: s.grupo,
      fechas: fechasMap,
      asistenciasTotal: totalA,
      retardosTotal: totalR,
      faltasTotal: totalF,
      participacionesTotal: totalPart,
      puntosTotal: puntos,
      porcentajeAsistencia: porcentaje
    };
  });
};

// Generates the comprehensive Multi-Sheet Excel Workbook (Matriz Sábana + Individual Subjects)
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
  const allDailyRecords = getStoredDailyRecords();
  const classDates = getStoredClassDates(grado, grupo);

  // 1. Matriz Sábana Sheet (EXACT format from user's image)
  const sabanaRows = buildMatrizSabanaRows(
    students,
    classDates,
    todayLogs,
    fecha,
    participaciones,
    asistenciasOverride,
    allDailyRecords
  );

  const sabanaExcelData = sabanaRows.map(r => {
    const row: Record<string, any> = {
      'NO.': r.index,
      'MATRÍCULA': r.matricula,
      'NOMBRE DEL ALUMNO': r.nombre
    };

    // Date columns
    classDates.forEach(d => {
      const label = formatDateShort(d);
      const cellData = r.fechas[d];
      row[label] = cellData ? cellData.status : 'A';
    });

    // Summary columns
    row['ASIST (A)'] = r.asistenciasTotal;
    row['RET (R)'] = r.retardosTotal;
    row['FALT (F)'] = r.faltasTotal;
    row['PART. TOTAL'] = r.participacionesTotal;
    row['PUNTOS (PTS)'] = r.puntosTotal;
    row['% ASISTENCIA'] = `${r.porcentajeAsistencia}%`;

    return row;
  });

  const wsSabana = XLSX.utils.json_to_sheet(sabanaExcelData);
  wsSabana['!cols'] = [
    { wch: 6 },  // NO.
    { wch: 16 }, // MATRÍCULA
    { wch: 36 }, // NOMBRE
    ...classDates.map(() => ({ wch: 10 })), // FECHAS
    { wch: 12 }, // ASIST
    { wch: 10 }, // RET
    { wch: 10 }, // FALT
    { wch: 14 }, // PART. TOTAL
    { wch: 14 }, // PUNTOS
    { wch: 14 }  // % ASISTENCIA
  ];
  XLSX.utils.book_append_sheet(wb, wsSabana, 'Matriz Sábana (Fechas)');

  // 2. Concentrado General Sheet
  const concentradoRows = students.map((s, idx) => {
    const generalStatus = resolveStudentStatus(s.id, todayLogs, asistenciasOverride);
    const globalPart = participaciones[s.id] || 0;
    const fullName = `${s.apellido_paterno} ${s.apellido_materno || ''} ${s.nombre}`.trim().toUpperCase();

    const row: Record<string, any> = {
      'No.': idx + 1,
      'Matrícula': s.matricula,
      'Nombre del Alumno': fullName,
      'Grado': grado,
      'Grupo': grupo,
      'Fecha': fecha,
      'Estatus Hoy': generalStatus.label.toUpperCase(),
      'Hora Entrada': generalStatus.time,
      'Total Participaciones': globalPart,
      'Tutor Registrado': s.tutor,
      'Teléfono Tutor': s.telefono
    };

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
  XLSX.utils.book_append_sheet(wb, wsConcentrado, 'Concentrado General');

  // 3. Individual Sheet for EACH Materia
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
  const fileName = `Respaldo_Drive_Matriz_Sabana_${cleanGrade}${grupo}_${fecha}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

// Ready-to-use Google Apps Script code for the user's Google Sheet in Google Drive
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `
/**
 * GOOGLE APPS SCRIPT - RESPALDO AUTOMÁTICO EN GOOGLE DRIVE
 * Pega este código en tu Google Sheet (Extensiones > Apps Script)
 * y haz clic en Implementar > Nueva Implementación > Aplicación Web (Acceso: Cualquier usuario).
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = data.sheetName || "Matriz Sábana";
    var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    
    // Si viene la matriz sábana completa
    if (data.rows && Array.isArray(data.rows)) {
      sheet.clearContents();
      var headers = Object.keys(data.rows[0]);
      var matrix = [headers];
      
      data.rows.forEach(function(r) {
        var row = [];
        headers.forEach(function(h) {
          row.push(r[h] !== undefined ? r[h] : "");
        });
        matrix.push(row);
      });
      
      sheet.getRange(1, 1, matrix.length, headers.length).setValues(matrix);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0f172a").setFontColor("#38bdf8");
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Respaldo actualizado correctamente en Google Drive"
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`.trim();
