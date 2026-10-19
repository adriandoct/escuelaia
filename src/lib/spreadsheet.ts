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
  materia?: string; // Subject specific or global
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
  // fecha -> cellCode (e.g. 'A', 'Ap', 'App', 'Rp', 'J.', '')
  fechas: Record<string, { code: string; status: 'A' | 'R' | 'F' | 'J'; participaciones: number }>;
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
const MATERIA_WEBHOOKS_KEY = 'dojoia_materia_webhooks';

// Helper to encode (status + participaciones) into the teacher's exact cell code:
// 'A' = Asistencia, 'Ap' = Asistencia + 1 part., 'App' = Asistencia + 2 part., 'Rp' = Retardo + 1 part., 'J.' = Justificado, '' = Falta
export const formatCellCode = (
  status: 'presente' | 'retardo' | 'ausente' | 'justificado',
  participaciones: number = 0
): string => {
  if (status === 'justificado') return 'J.';
  if (status === 'ausente') return '';
  const base = status === 'retardo' ? 'R' : 'A';
  if (participaciones <= 0) return base;
  return base + 'p'.repeat(Math.min(participaciones, 5));
};

// Helper to parse cell code back to status and participations
export const parseCellCode = (
  code: string
): { status: 'presente' | 'retardo' | 'ausente' | 'justificado'; participaciones: number } => {
  const trimmed = (code || '').trim();
  if (!trimmed) return { status: 'ausente', participaciones: 0 };
  if (trimmed.startsWith('J') || trimmed.startsWith('j')) {
    return { status: 'justificado', participaciones: 0 };
  }
  const isRetardo = trimmed.startsWith('R') || trimmed.startsWith('r');
  const pCount = (trimmed.match(/p/gi) || []).length;
  return {
    status: isRetardo ? 'retardo' : 'presente',
    participaciones: pCount
  };
};

// Class dates matching the user's Google Sheet (from 02-sep to 19-oct today)
export const DEFAULT_CLASS_DATES = [
  '2026-09-02',
  '2026-09-05',
  '2026-09-12',
  '2026-09-19',
  '2026-09-23',
  '2026-09-26',
  '2026-09-30',
  '2026-10-03',
  '2026-10-10',
  '2026-10-14',
  '2026-10-17',
  '2026-10-19' // Hoy
];

// Seeded historical attendance codes matching the user's Google Sheet
const SEED_HISTORICAL_MAP: Record<string, Record<string, string>> = {
  'Dayanna Gissel Buitimea Garma': {
    '2026-09-02': 'A', '2026-09-19': 'Ap', '2026-09-23': 'Ap', '2026-09-30': 'Ap',
    '2026-10-03': 'A', '2026-10-14': 'Ap', '2026-10-17': 'J.'
  },
  'Astrid Cristina Diaz Moreno': {
    '2026-09-02': 'A', '2026-09-05': 'Ap', '2026-09-12': 'Ap', '2026-09-23': 'Ap',
    '2026-09-26': 'Ap', '2026-09-30': 'App', '2026-10-03': 'A', '2026-10-10': 'Ap', '2026-10-17': 'Ap'
  },
  'Julibeth Hernandez Herrera': {
    '2026-09-02': 'A', '2026-09-23': 'A', '2026-09-30': 'Ap', '2026-10-14': 'Ap'
  },
  'Blanca Estela Lopez Pablo': {
    '2026-09-02': 'A', '2026-09-12': 'Ap', '2026-09-19': 'Ap', '2026-09-23': 'Ap',
    '2026-09-26': 'Ap', '2026-10-10': 'Ap', '2026-10-14': 'Ap', '2026-10-17': 'Ap'
  },
  'Cecilia Todd Ambriz': {
    '2026-09-02': 'A', '2026-09-05': 'Ap', '2026-09-12': 'Ap', '2026-09-19': 'Ap',
    '2026-09-23': 'Ap', '2026-09-26': 'Ap', '2026-09-30': 'Ap', '2026-10-03': 'A',
    '2026-10-14': 'A', '2026-10-17': 'Ap'
  },
  'Alejandra Garcia Hernandez': {
    '2026-09-02': 'A', '2026-09-05': 'Rp', '2026-09-12': 'Ap', '2026-09-19': 'Ap',
    '2026-09-23': 'Ap', '2026-09-26': 'Ap', '2026-09-30': 'App', '2026-10-03': 'A',
    '2026-10-10': 'Ap', '2026-10-14': 'Ap', '2026-10-17': 'Ap'
  }
};

// Helper to look up seeded code matching user's Google Sheet
export const getHistoricalSeedCode = (studentName: string, date: string): string | undefined => {
  const norm = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const target = norm(studentName);

  for (const [seedName, dateMap] of Object.entries(SEED_HISTORICAL_MAP)) {
    const sNorm = norm(seedName);
    if (
      target.includes(sNorm) || 
      sNorm.includes(target) || 
      (sNorm.split(' ')[0] === target.split(' ')[0] && sNorm.split(' ').slice(-1)[0] === target.split(' ').slice(-1)[0])
    ) {
      return dateMap[date] !== undefined ? dateMap[date] : '';
    }
  }
  return undefined;
};

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

// Per-Materia Google Sheets Webhook manager
export const getMateriaWebhooksMap = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(MATERIA_WEBHOOKS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

export const setMateriaWebhook = (materia: string, url: string) => {
  if (typeof window === 'undefined') return;
  try {
    const current = getMateriaWebhooksMap();
    if (url.trim()) {
      current[materia] = url.trim();
    } else {
      delete current[materia];
    }
    localStorage.setItem(MATERIA_WEBHOOKS_KEY, JSON.stringify(current));
  } catch (e) {
    console.error(e);
  }
};

// Get stored dates for a group
export const getStoredClassDates = (grado: string, grupo: string): string[] => {
  if (typeof window === 'undefined') return DEFAULT_CLASS_DATES;
  try {
    const raw = localStorage.getItem(`${DATES_LIST_KEY}_${grado}_${grupo}`);
    if (raw) {
      const parsed: string[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
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

// Helper to get record for specific date, grade, group, materia
export const getDailyRecord = (fecha: string, grado: string, grupo: string, materia?: string): TeacherDayStore | null => {
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

    // Check specific Materia Webhook or General Webhook
    const materiaWebhooks = getMateriaWebhooksMap();
    const targetWebhook = (record.materia && materiaWebhooks[record.materia]) || localStorage.getItem(GOOGLE_SHEET_WEBHOOK_KEY);

    if (targetWebhook && targetWebhook.trim().startsWith('http')) {
      try {
        await fetch(targetWebhook.trim(), {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'guardar_dia_docente',
            materia: record.materia || 'Todas las materias',
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

// Build Matriz Sábana Rows for all dates x students (matching user's notation A, Ap, App, Rp, J.)
export const buildMatrizSabanaRows = (
  students: Alumno[],
  classDates: string[],
  todayLogs: Asistencia[],
  currentDate: string,
  participaciones: Record<string, number>,
  asistenciasOverride: Record<string, 'presente' | 'retardo' | 'ausente' | 'justificado'>,
  allDailyRecords: TeacherDayStore[],
  selectedMateria: string = 'all',
  participacionesPorMateria?: Record<string, Record<string, number>>,
  asistenciasPorMateria?: Record<string, Record<string, 'presente' | 'retardo' | 'ausente' | 'justificado'>>
): MatrizSabanaRow[] => {
  return students.map((s, idx) => {
    const fechasMap: Record<string, { code: string; status: 'A' | 'R' | 'F' | 'J'; participaciones: number }> = {};
    let totalA = 0;
    let totalR = 0;
    let totalF = 0;
    let totalPart = 0;

    const studentFullName = `${s.nombre} ${s.apellido_paterno} ${s.apellido_materno || ''}`.trim();

    classDates.forEach(date => {
      let code = '';
      let st: 'A' | 'R' | 'F' | 'J' = 'A';
      let part = 0;

      if (date === currentDate) {
        // Today / active selected date
        const studentStatusOv = (selectedMateria !== 'all' && asistenciasPorMateria?.[selectedMateria]?.[s.id])
          ? asistenciasPorMateria[selectedMateria][s.id]
          : asistenciasOverride[s.id];

        const effectiveOverrides = {
          ...asistenciasOverride,
          ...(studentStatusOv ? { [s.id]: studentStatusOv } : {})
        };

        const current = resolveStudentStatus(s.id, todayLogs, effectiveOverrides);

        const matPart = selectedMateria !== 'all'
          ? participacionesPorMateria?.[selectedMateria]?.[s.id]
          : undefined;
        part = matPart ?? participaciones[s.id] ?? 0;
        code = formatCellCode(current.status, part);

        if (current.status === 'presente') st = 'A';
        else if (current.status === 'retardo') st = 'R';
        else if (current.status === 'justificado') st = 'J';
        else st = 'F';
      } else {
        // Historical date from stored records
        const hist = allDailyRecords.find(r => r.fecha === date && r.grado === s.grado && r.grupo === s.grupo);
        if (hist) {
          const matOv = selectedMateria !== 'all' ? hist.asistenciasPorMateria?.[selectedMateria]?.[s.id] : undefined;
          const ov = matOv ?? hist.asistenciasOverride?.[s.id];

          const matPart = selectedMateria !== 'all' ? hist.participacionesPorMateria?.[selectedMateria]?.[s.id] : undefined;
          part = matPart ?? hist.participaciones?.[s.id] ?? 0;

          if (ov === 'presente') st = 'A';
          else if (ov === 'retardo') st = 'R';
          else if (ov === 'justificado') st = 'J';
          else if (ov === 'ausente') st = 'F';
          else st = 'A';

          code = formatCellCode(ov || 'presente', part);
        } else {
          // Check seeded historical baseline matching user's Google Sheet
          const seededUserEntry = getHistoricalSeedCode(studentFullName, date);
          if (seededUserEntry !== undefined) {
            code = seededUserEntry;
            const parsed = parseCellCode(code);
            part = parsed.participaciones;
            if (!code.trim()) {
              st = 'F';
            } else if (parsed.status === 'presente') {
              st = 'A';
            } else if (parsed.status === 'retardo') {
              st = 'R';
            } else if (parsed.status === 'justificado') {
              st = 'J';
            } else {
              st = 'F';
            }
          } else {
            code = 'A';
            st = 'A';
            part = 0;
          }
        }
      }

      fechasMap[date] = { code, status: st, participaciones: part };

      if (st === 'A') totalA++;
      else if (st === 'R') totalR++;
      else if (st === 'F') totalF++;

      totalPart += part;
    });

    const totalSesiones = classDates.length;
    const efectivas = totalA + (totalR * 0.8);
    const porcentaje = totalSesiones > 0 ? Math.min(100, Math.round((efectivas / totalSesiones) * 100)) : 100;
    const puntos = totalPart * 0.5;

    return {
      index: idx + 1,
      alumnoId: s.id,
      matricula: s.matricula,
      nombre: studentFullName.toUpperCase(),
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
  asistenciasPorMateria?: Record<string, Record<string, 'presente' | 'retardo' | 'ausente' | 'justificado'>>,
  selectedMateria: string = 'all'
): XLSX.WorkBook => {
  const wb = XLSX.utils.book_new();
  const allDailyRecords = getStoredDailyRecords();
  const classDates = getStoredClassDates(grado, grupo);

  // 1. Matriz Sábana Sheet (Exact Google Sheet layout: Column B: Nombre, Columns C..N: Fechas, then Totals)
  const sabanaRows = buildMatrizSabanaRows(
    students,
    classDates,
    todayLogs,
    fecha,
    participaciones,
    asistenciasOverride,
    allDailyRecords,
    selectedMateria
  );

  const sabanaExcelData = sabanaRows.map(r => {
    const row: Record<string, any> = {
      'No.': r.index,
      'Matrícula': r.matricula,
      'Nombre': r.nombre
    };

    // Dates as columns with exact cell notation (A, Ap, App, Rp, J., '')
    classDates.forEach(d => {
      const label = formatDateShort(d);
      const cellData = r.fechas[d];
      row[label] = cellData ? cellData.code : '';
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
    { wch: 6 },  // No.
    { wch: 16 }, // Matrícula
    { wch: 36 }, // Nombre
    ...classDates.map(() => ({ wch: 10 })), // Fechas
    { wch: 12 }, // ASIST
    { wch: 10 }, // RET
    { wch: 10 }, // FALT
    { wch: 14 }, // PART. TOTAL
    { wch: 14 }, // PUNTOS
    { wch: 14 }  // % ASISTENCIA
  ];
  XLSX.utils.book_append_sheet(wb, wsSabana, 'Matriz Sábana (General)');

  // 2. Individual Sheet for EACH Materia
  materias.forEach(materia => {
    const materiaSabanaRows = buildMatrizSabanaRows(
      students,
      classDates,
      todayLogs,
      fecha,
      participacionesPorMateria?.[materia] || participaciones,
      asistenciasPorMateria?.[materia] || asistenciasOverride,
      allDailyRecords,
      materia
    );

    const materiaData = materiaSabanaRows.map(r => {
      const row: Record<string, any> = {
        'No.': r.index,
        'Matrícula': r.matricula,
        'Nombre': r.nombre
      };

      classDates.forEach(d => {
        const label = formatDateShort(d);
        const cellData = r.fechas[d];
        row[label] = cellData ? cellData.code : '';
      });

      row['ASIST (A)'] = r.asistenciasTotal;
      row['RET (R)'] = r.retardosTotal;
      row['FALT (F)'] = r.faltasTotal;
      row['PART. TOTAL'] = r.participacionesTotal;
      row['PUNTOS (PTS)'] = r.puntosTotal;
      row['% ASISTENCIA'] = `${r.porcentajeAsistencia}%`;

      return row;
    });

    const wsMateria = XLSX.utils.json_to_sheet(materiaData);
    wsMateria['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 36 },
      ...classDates.map(() => ({ wch: 10 })),
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 }
    ];

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
  asistenciasPorMateria?: Record<string, Record<string, 'presente' | 'retardo' | 'ausente' | 'justificado'>>,
  selectedMateria: string = 'all'
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
    asistenciasPorMateria,
    selectedMateria
  );

  const cleanGrade = grado.replace(/[°º]/g, '');
  const prefix = selectedMateria !== 'all' ? selectedMateria.replace(/\s+/g, '_') : 'Todas_Materias';
  const fileName = `Hoja_Calculo_${prefix}_${cleanGrade}${grupo}_${fecha}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

// Ready-to-use Google Apps Script code for Google Sheets in Google Drive
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `
/**
 * GOOGLE APPS SCRIPT - SINCRONIZACIÓN Y RESPALDO EN GOOGLE DRIVE
 * Pega este código en tu Google Sheet (Extensiones > Apps Script)
 * y haz clic en Implementar > Nueva Implementación > Aplicación Web (Acceso: Cualquier usuario).
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Si viene una materia específica, usa la hoja de esa materia
    var targetSheetName = data.materia || data.sheetName || "Matriz Sábana";
    var sheet = ss.getSheetByName(targetSheetName) || ss.insertSheet(targetSheetName);
    
    if (data.rows && Array.isArray(data.rows) && data.rows.length > 0) {
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
      // Estilo de encabezado institucional
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight("bold")
        .setBackground("#0f172a")
        .setFontColor("#38bdf8")
        .setHorizontalAlignment("center");
      
      sheet.autoResizeColumns(1, headers.length);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Hoja de cálculo '" + targetSheetName + "' actualizada correctamente en Google Drive"
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`.trim();
