import * as XLSX from 'xlsx';
import masterHorariosJson from '../../data/horarios.json';

export type DiaSemana = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes';

export const DIAS_SEMANA: DiaSemana[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

export interface ModuloHorario {
  modulo: number;
  horaInicio: string;
  horaFin: string;
  label: string;
  turno?: 'Matutino' | 'Vespertino';
  esReceso?: boolean;
}

export const MODULOS_MATUTINO: ModuloHorario[] = [
  { modulo: 1, horaInicio: '07:00', horaFin: '07:50', label: '1° Módulo (07:00 - 07:50)', turno: 'Matutino' },
  { modulo: 2, horaInicio: '07:50', horaFin: '08:40', label: '2° Módulo (07:50 - 08:40)', turno: 'Matutino' },
  { modulo: 3, horaInicio: '08:40', horaFin: '09:30', label: '3° Módulo (08:40 - 09:30)', turno: 'Matutino' },
  { modulo: 0, horaInicio: '09:30', horaFin: '10:00', label: 'RECESO MATUTINO (09:30 - 10:00)', turno: 'Matutino', esReceso: true },
  { modulo: 4, horaInicio: '10:00', horaFin: '10:50', label: '4° Módulo (10:00 - 10:50)', turno: 'Matutino' },
  { modulo: 5, horaInicio: '10:50', horaFin: '11:40', label: '5° Módulo (10:50 - 11:40)', turno: 'Matutino' },
  { modulo: 6, horaInicio: '11:40', horaFin: '12:30', label: '6° Módulo (11:40 - 12:30)', turno: 'Matutino' },
  { modulo: 7, horaInicio: '12:30', horaFin: '13:20', label: '7° Módulo (12:30 - 13:20)', turno: 'Matutino' },
];

export const MODULOS_VESPERTINO: ModuloHorario[] = [
  { modulo: 1, horaInicio: '13:30', horaFin: '14:20', label: '1° Módulo Vesp. (13:30 - 14:20)', turno: 'Vespertino' },
  { modulo: 2, horaInicio: '14:20', horaFin: '15:10', label: '2° Módulo Vesp. (14:20 - 15:10)', turno: 'Vespertino' },
  { modulo: 3, horaInicio: '15:10', horaFin: '16:00', label: '3° Módulo Vesp. (15:10 - 16:00)', turno: 'Vespertino' },
  { modulo: 0, horaInicio: '16:00', horaFin: '16:30', label: 'RECESO VESPERTINO (16:00 - 16:30)', turno: 'Vespertino', esReceso: true },
  { modulo: 4, horaInicio: '16:30', horaFin: '17:20', label: '4° Módulo Vesp. (16:30 - 17:20)', turno: 'Vespertino' },
  { modulo: 5, horaInicio: '17:20', horaFin: '18:10', label: '5° Módulo Vesp. (17:20 - 18:10)', turno: 'Vespertino' },
  { modulo: 6, horaInicio: '18:10', horaFin: '19:00', label: '6° Módulo Vesp. (18:10 - 19:00)', turno: 'Vespertino' },
  { modulo: 7, horaInicio: '19:00', horaFin: '19:50', label: '7° Módulo Vesp. (19:00 - 19:50)', turno: 'Vespertino' },
];

export const MODULOS_JORNADA_COMPLETA: ModuloHorario[] = [
  ...MODULOS_MATUTINO,
  ...MODULOS_VESPERTINO,
];

// Default export for backward compatibility
export const MODULOS_OFICIALES: ModuloHorario[] = MODULOS_MATUTINO;

export function getModulosPorTurno(turno: 'Matutino' | 'Vespertino' | 'Ambos'): ModuloHorario[] {
  if (turno === 'Vespertino') return MODULOS_VESPERTINO;
  if (turno === 'Ambos') return MODULOS_JORNADA_COMPLETA;
  return MODULOS_MATUTINO;
}

export interface BloqueHorario {
  id: string;
  grado: string;          // '1°', '3°', '5°'
  grupo: string;          // '1A', '1B', '1C', '1D', '1E', '3APGM', '3APGA', '3ASCM', '3BPGA', '5APGM', '5BPGM', '5APGA'
  dia: DiaSemana;
  horaInicio: string;     // '07:00', '13:30', etc.
  horaFin: string;        // '07:50', '14:20', etc.
  modulo: number;         // 1..7
  materia: string;        // e.g. 'PENSAMIENTO MATEMÁTICO'
  maestro: string;        // e.g. 'ROXANNE JUDITH MORENO'
  maestroEmail?: string;
  aula: string;           // e.g. 'Aula 1A'
  turno?: 'Matutino' | 'Vespertino';
  ciclo?: string;         // '2026-2'
}

export interface MaestroColorPalette {
  id: string;
  nombre: string;
  accent: string;
  // UI Dark mode cards
  bgCard: string;
  borderCard: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  avatarBg: string;
  // Print mode (high contrast light for paper/PDF)
  printBg: string;
  printBorder: string;
  printText: string;
  printBadge: string;
}

export const PALETAS_COLORES: MaestroColorPalette[] = [
  {
    id: 'emerald',
    nombre: 'Esmeralda',
    accent: '#10B981',
    bgCard: 'bg-emerald-950/40 hover:bg-emerald-950/60',
    borderCard: 'border-emerald-500/40 hover:border-emerald-400',
    badgeBg: 'bg-emerald-500/20',
    badgeBorder: 'border-emerald-500/40',
    badgeText: 'text-emerald-300',
    avatarBg: 'bg-emerald-600 text-white',
    printBg: 'bg-emerald-50',
    printBorder: 'border-emerald-400',
    printText: 'text-emerald-900',
    printBadge: 'bg-emerald-100 text-emerald-800'
  },
  {
    id: 'blue',
    nombre: 'Azul Zafiro',
    accent: '#3B82F6',
    bgCard: 'bg-blue-950/40 hover:bg-blue-950/60',
    borderCard: 'border-blue-500/40 hover:border-blue-400',
    badgeBg: 'bg-blue-500/20',
    badgeBorder: 'border-blue-500/40',
    badgeText: 'text-blue-300',
    avatarBg: 'bg-blue-600 text-white',
    printBg: 'bg-blue-50',
    printBorder: 'border-blue-400',
    printText: 'text-blue-900',
    printBadge: 'bg-blue-100 text-blue-800'
  },
  {
    id: 'purple',
    nombre: 'Púrpura Amatista',
    accent: '#8B5CF6',
    bgCard: 'bg-purple-950/40 hover:bg-purple-950/60',
    borderCard: 'border-purple-500/40 hover:border-purple-400',
    badgeBg: 'bg-purple-500/20',
    badgeBorder: 'border-purple-500/40',
    badgeText: 'text-purple-300',
    avatarBg: 'bg-purple-600 text-white',
    printBg: 'bg-purple-50',
    printBorder: 'border-purple-400',
    printText: 'text-purple-900',
    printBadge: 'bg-purple-100 text-purple-800'
  },
  {
    id: 'amber',
    nombre: 'Ámbar Cálido',
    accent: '#F59E0B',
    bgCard: 'bg-amber-950/40 hover:bg-amber-950/60',
    borderCard: 'border-amber-500/40 hover:border-amber-400',
    badgeBg: 'bg-amber-500/20',
    badgeBorder: 'border-amber-500/40',
    badgeText: 'text-amber-300',
    avatarBg: 'bg-amber-600 text-white',
    printBg: 'bg-amber-50',
    printBorder: 'border-amber-400',
    printText: 'text-amber-900',
    printBadge: 'bg-amber-100 text-amber-800'
  },
  {
    id: 'rose',
    nombre: 'Rosa Carmín',
    accent: '#F43F5E',
    bgCard: 'bg-rose-950/40 hover:bg-rose-950/60',
    borderCard: 'border-rose-500/40 hover:border-rose-400',
    badgeBg: 'bg-rose-500/20',
    badgeBorder: 'border-rose-500/40',
    badgeText: 'text-rose-300',
    avatarBg: 'bg-rose-600 text-white',
    printBg: 'bg-rose-50',
    printBorder: 'border-rose-400',
    printText: 'text-rose-900',
    printBadge: 'bg-rose-100 text-rose-800'
  },
  {
    id: 'cyan',
    nombre: 'Cian Neón',
    accent: '#06B6D4',
    bgCard: 'bg-cyan-950/40 hover:bg-cyan-950/60',
    borderCard: 'border-cyan-500/40 hover:border-cyan-400',
    badgeBg: 'bg-cyan-500/20',
    badgeBorder: 'border-cyan-500/40',
    badgeText: 'text-cyan-300',
    avatarBg: 'bg-cyan-600 text-white',
    printBg: 'bg-cyan-50',
    printBorder: 'border-cyan-400',
    printText: 'text-cyan-900',
    printBadge: 'bg-cyan-100 text-cyan-800'
  },
  {
    id: 'fuchsia',
    nombre: 'Fucsia Magenta',
    accent: '#D946EF',
    bgCard: 'bg-fuchsia-950/40 hover:bg-fuchsia-950/60',
    borderCard: 'border-fuchsia-500/40 hover:border-fuchsia-400',
    badgeBg: 'bg-fuchsia-500/20',
    badgeBorder: 'border-fuchsia-500/40',
    badgeText: 'text-fuchsia-300',
    avatarBg: 'bg-fuchsia-600 text-white',
    printBg: 'bg-fuchsia-50',
    printBorder: 'border-fuchsia-400',
    printText: 'text-fuchsia-900',
    printBadge: 'bg-fuchsia-100 text-fuchsia-800'
  },
  {
    id: 'teal',
    nombre: 'Verde Turquesa',
    accent: '#14B8A6',
    bgCard: 'bg-teal-950/40 hover:bg-teal-950/60',
    borderCard: 'border-teal-500/40 hover:border-teal-400',
    badgeBg: 'bg-teal-500/20',
    badgeBorder: 'border-teal-500/40',
    badgeText: 'text-teal-300',
    avatarBg: 'bg-teal-600 text-white',
    printBg: 'bg-teal-50',
    printBorder: 'border-teal-400',
    printText: 'text-teal-900',
    printBadge: 'bg-teal-100 text-teal-800'
  },
  {
    id: 'indigo',
    nombre: 'Índigo Real',
    accent: '#6366F1',
    bgCard: 'bg-indigo-950/40 hover:bg-indigo-950/60',
    borderCard: 'border-indigo-500/40 hover:border-indigo-400',
    badgeBg: 'bg-indigo-500/20',
    badgeBorder: 'border-indigo-500/40',
    badgeText: 'text-indigo-300',
    avatarBg: 'bg-indigo-600 text-white',
    printBg: 'bg-indigo-50',
    printBorder: 'border-indigo-400',
    printText: 'text-indigo-900',
    printBadge: 'bg-indigo-100 text-indigo-800'
  },
  {
    id: 'orange',
    nombre: 'Naranja Fuego',
    accent: '#F97316',
    bgCard: 'bg-orange-950/40 hover:bg-orange-950/60',
    borderCard: 'border-orange-500/40 hover:border-orange-400',
    badgeBg: 'bg-orange-500/20',
    badgeBorder: 'border-orange-500/40',
    badgeText: 'text-orange-300',
    avatarBg: 'bg-orange-600 text-white',
    printBg: 'bg-orange-50',
    printBorder: 'border-orange-400',
    printText: 'text-orange-900',
    printBadge: 'bg-orange-100 text-orange-800'
  },
  {
    id: 'lime',
    nombre: 'Lima Neón',
    accent: '#84CC16',
    bgCard: 'bg-lime-950/40 hover:bg-lime-950/60',
    borderCard: 'border-lime-500/40 hover:border-lime-400',
    badgeBg: 'bg-lime-500/20',
    badgeBorder: 'border-lime-500/40',
    badgeText: 'text-lime-300',
    avatarBg: 'bg-lime-600 text-white',
    printBg: 'bg-lime-50',
    printBorder: 'border-lime-400',
    printText: 'text-lime-900',
    printBadge: 'bg-lime-100 text-lime-800'
  },
  {
    id: 'violet',
    nombre: 'Violeta Eléctrico',
    accent: '#7C3AED',
    bgCard: 'bg-violet-950/40 hover:bg-violet-950/60',
    borderCard: 'border-violet-500/40 hover:border-violet-400',
    badgeBg: 'bg-violet-500/20',
    badgeBorder: 'border-violet-500/40',
    badgeText: 'text-violet-300',
    avatarBg: 'bg-violet-600 text-white',
    printBg: 'bg-violet-50',
    printBorder: 'border-violet-400',
    printText: 'text-violet-900',
    printBadge: 'bg-violet-100 text-violet-800'
  },
  {
    id: 'sky',
    nombre: 'Azul Cielo',
    accent: '#0EA5E9',
    bgCard: 'bg-sky-950/40 hover:bg-sky-950/60',
    borderCard: 'border-sky-500/40 hover:border-sky-400',
    badgeBg: 'bg-sky-500/20',
    badgeBorder: 'border-sky-500/40',
    badgeText: 'text-sky-300',
    avatarBg: 'bg-sky-600 text-white',
    printBg: 'bg-sky-50',
    printBorder: 'border-sky-400',
    printText: 'text-sky-900',
    printBadge: 'bg-sky-100 text-sky-800'
  },
  {
    id: 'pink',
    nombre: 'Rosa Coral',
    accent: '#EC4899',
    bgCard: 'bg-pink-950/40 hover:bg-pink-950/60',
    borderCard: 'border-pink-500/40 hover:border-pink-400',
    badgeBg: 'bg-pink-500/20',
    badgeBorder: 'border-pink-500/40',
    badgeText: 'text-pink-300',
    avatarBg: 'bg-pink-600 text-white',
    printBg: 'bg-pink-50',
    printBorder: 'border-pink-400',
    printText: 'text-pink-900',
    printBadge: 'bg-pink-100 text-pink-800'
  }
];

/**
 * Normalizes teacher short names or variations across group sheets to their full official CECYTE BC name
 */
export function normalizeTeacherName(rawName: string, grupo?: string): string {
  const s = String(rawName || '').trim().toUpperCase().replace(/\s+/g, ' ');
  if (!s) return '';
  if (s.includes('NATANAEL')) return 'NATANAEL DURÁN GARCÍA';
  if (s.includes('ROXANNE') || (s === 'R' && (!grupo || grupo.toUpperCase() === '1E'))) return 'ROXANNE JUDITH MORENO';
  if (s.includes('NORMAN')) return 'NORMAN ROY CÁRDENAS';
  if (s.includes('FLORES') || s.includes('MARTÍN ERNESTO') || s.includes('MARTIN ERNESTO')) return 'MARTÍN ERNESTO FLORES';
  if (s.includes('LUCÍA') || s.includes('LUCIA') || s.includes('LOERA')) return 'LUCÍA EDITH LOERA';
  if (s.includes('LINDY') || s.includes('LEIJA')) return 'LINDY LISAY LEIJA';
  if (s.includes('GARIBAY')) return 'MARTÍN GARIBAY';
  if (s.includes('ALFREDO') || s.includes('RUÍZ') || s.includes('RUIZ')) return 'JOSÉ ALFREDO RUÍZ';
  if (s.includes('INTERINO INGL')) return 'INTERINO INGLÉS';
  if (s.includes('INTERINO LENGUA')) return 'INTERINO LENGUA';
  if (s.includes('INTERINO PROGRAMACI')) return 'INTERINO PROGRAMACIÓN';
  if (s === 'INTERINO 1') return 'INTERINO 1';
  if (s === 'INTERINO 2') return 'INTERINO 2';
  if (s === 'INTERINO' || s === 'INTERINO CIENCIAS') return 'INTERINO CIENCIAS';
  return s;
}

export function normalizeMateriaName(rawMat: string, grupo?: string, rawDoc?: string): string {
  const mat = String(rawMat || '').trim().replace(/\s+/g, ' ').toUpperCase();
  if (!mat) return '';
  if (grupo?.toUpperCase() === '1E' && mat === 'PENSAMIENTO' && String(rawDoc || '').trim().toUpperCase() === 'R') {
    return 'PENSAMIENTO MATEMÁTICO';
  }
  if (mat === 'PENSAMIENTO FOLOSÓFICO') return 'PENSAMIENTO FILOSÓFICO';
  if (mat === 'SUB. 1 CONSTRUYE APLICACIÓNES WEB') return 'SUB. 1 CONSTRUYE APLICACIONES WEB';
  if (mat === 'C SOCIAL') return 'CIENCIAS SOCIALES';
  return mat;
}

/**
 * Deterministically assigns a unique color palette based on teacher name
 */
export function getMaestroPalette(maestroName: string): MaestroColorPalette {
  if (!maestroName) return PALETAS_COLORES[0];

  const upper = maestroName.toUpperCase();
  if (upper.includes('NATANAEL')) return PALETAS_COLORES[0]; // Emerald
  if (upper.includes('FLORES')) return PALETAS_COLORES[1];   // Blue
  if (upper.includes('ROXANNE')) return PALETAS_COLORES[2];  // Purple
  if (upper.includes('NORMAN')) return PALETAS_COLORES[3];   // Amber
  if (upper.includes('LINDY')) return PALETAS_COLORES[4];    // Rose
  if (upper.includes('GARIBAY')) return PALETAS_COLORES[5];  // Cyan
  if (upper.includes('LUCÍA') || upper.includes('LUCIA')) return PALETAS_COLORES[6]; // Fuchsia
  if (upper.includes('ALFREDO')) return PALETAS_COLORES[7];  // Teal
  if (upper.includes('INTERINO INGL')) return PALETAS_COLORES[8]; // Indigo
  if (upper.includes('INTERINO PROGRAMACI')) return PALETAS_COLORES[9]; // Orange
  if (upper.includes('INTERINO 2')) return PALETAS_COLORES[10]; // Lime
  if (upper.includes('INTERINO CIENCIAS') || upper === 'INTERINO') return PALETAS_COLORES[11]; // Violet
  if (upper.includes('INTERINO 1')) return PALETAS_COLORES[12]; // Sky
  if (upper.includes('INTERINO LENGUA')) return PALETAS_COLORES[13]; // Pink

  let hash = 0;
  for (let i = 0; i < maestroName.length; i++) {
    hash = maestroName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETAS_COLORES.length;
  return PALETAS_COLORES[index];
}

const LOCAL_STORAGE_HORARIOS_KEY = 'dojoia_horarios_grupos_2026_2';
const LEGACY_HORARIOS_KEY = 'dojoia_horarios_grupos';

// Official master schedule list sourced directly from HORARIOS DE GRUPO 2026-2.xlsx (12 grupos, 351 bloques)
export const MOCK_HORARIOS_OFICIALES: BloqueHorario[] = (masterHorariosJson as unknown as BloqueHorario[]) || [];

// Canonical ordering of the 12 CECYTE BC Urbivillas groups
export const ORDEN_GRUPOS_OFICIALES = [
  '1A', '1B', '1C', '1D', '1E',
  '3APGM', '3APGA', '3ASCM', '3BPGA',
  '5APGM', '5BPGM', '5APGA'
];

export function sortGruposOficiales(grupos: string[]): string[] {
  return [...grupos].sort((a, b) => {
    const idxA = ORDEN_GRUPOS_OFICIALES.indexOf(a);
    const idxB = ORDEN_GRUPOS_OFICIALES.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
}

/**
 * Retrieve all group schedules from persistent storage or official 2026-2 master database
 */
export function getStoredHorarios(): BloqueHorario[] {
  if (typeof window === 'undefined') return MOCK_HORARIOS_OFICIALES;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_HORARIOS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure teacher names are always normalized
        return parsed.map(b => ({
          ...b,
          maestro: normalizeTeacherName(b.maestro, b.grupo),
          materia: normalizeMateriaName(b.materia, b.grupo, b.maestro)
        }));
      }
    }
    // Initialize with official 2026-2 schedules (12 groups)
    localStorage.setItem(LOCAL_STORAGE_HORARIOS_KEY, JSON.stringify(MOCK_HORARIOS_OFICIALES));
    localStorage.setItem(LEGACY_HORARIOS_KEY, JSON.stringify(MOCK_HORARIOS_OFICIALES));
    return MOCK_HORARIOS_OFICIALES;
  } catch (e) {
    console.error('Error al leer horarios de localStorage:', e);
    return MOCK_HORARIOS_OFICIALES;
  }
}

/**
 * Save group schedules to persistent storage and server API
 */
export function saveHorarios(horarios: BloqueHorario[], mode: 'replace' | 'merge' = 'replace'): void {
  if (typeof window === 'undefined') return;
  try {
    const normalized = horarios.map(b => ({
      ...b,
      maestro: normalizeTeacherName(b.maestro, b.grupo),
      materia: normalizeMateriaName(b.materia, b.grupo, b.maestro)
    }));
    localStorage.setItem(LOCAL_STORAGE_HORARIOS_KEY, JSON.stringify(normalized));
    localStorage.setItem(LEGACY_HORARIOS_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent('dojoia_horarios_updated', { detail: normalized }));

    // Persist asynchronously to server API (/api/horarios)
    fetch('/api/horarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, horarios: normalized })
    }).catch(() => {});
  } catch (e) {
    console.error('Error al guardar horarios:', e);
  }
}

/**
 * Add or upsert a new schedule block
 */
export function addBloqueHorario(bloque: Omit<BloqueHorario, 'id'>): BloqueHorario {
  const all = getStoredHorarios();
  const newBloque: BloqueHorario = {
    ...bloque,
    maestro: normalizeTeacherName(bloque.maestro, bloque.grupo),
    materia: normalizeMateriaName(bloque.materia, bloque.grupo, bloque.maestro),
    id: `hor-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  };
  const updated = [...all, newBloque];
  saveHorarios(updated);
  return newBloque;
}

/**
 * Update an existing block
 */
export function updateBloqueHorario(id: string, updates: Partial<BloqueHorario>): BloqueHorario | null {
  const all = getStoredHorarios();
  const idx = all.findIndex(b => b.id === id);
  if (idx === -1) return null;
  const merged = { ...all[idx], ...updates };
  merged.maestro = normalizeTeacherName(merged.maestro, merged.grupo);
  merged.materia = normalizeMateriaName(merged.materia, merged.grupo, merged.maestro);
  all[idx] = merged;
  saveHorarios(all);
  return merged;
}

/**
 * Delete a schedule block
 */
export function deleteBloqueHorario(id: string): boolean {
  const all = getStoredHorarios();
  const filtered = all.filter(b => b.id !== id);
  saveHorarios(filtered);
  return filtered.length < all.length;
}

/**
 * Reset schedules back to official default CECYTE BC 2026-2 (12 groups) state
 */
export function resetHorariosToDefault(): BloqueHorario[] {
  saveHorarios(MOCK_HORARIOS_OFICIALES, 'replace');
  return MOCK_HORARIOS_OFICIALES;
}

/**
 * Extract list of teachers with their total workload, assigned groups, shifts, and colors
 */
export function getMaestrosDirectory(horarios: BloqueHorario[]) {
  const map = new Map<string, {
    nombre: string;
    email?: string;
    palette: MaestroColorPalette;
    totalHoras: number;
    materias: Set<string>;
    grupos: Set<string>;
    turnos: Set<string>;
    horasPorGrupo: Record<string, number>;
  }>();

  horarios.forEach(b => {
    if (!b.maestro) return;
    const key = normalizeTeacherName(b.maestro, b.grupo);
    if (!key) return;
    if (!map.has(key)) {
      map.set(key, {
        nombre: key,
        email: b.maestroEmail || `${key.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.')}@cecytebc.edu.mx`,
        palette: getMaestroPalette(key),
        totalHoras: 0,
        materias: new Set(),
        grupos: new Set(),
        turnos: new Set(),
        horasPorGrupo: {}
      });
    }
    const item = map.get(key)!;
    item.totalHoras += 1;
    item.materias.add(b.materia);
    item.grupos.add(b.grupo);
    if (b.turno) item.turnos.add(b.turno);
    item.horasPorGrupo[b.grupo] = (item.horasPorGrupo[b.grupo] || 0) + 1;
  });

  return Array.from(map.values()).map(m => ({
    ...m,
    materias: Array.from(m.materias),
    grupos: sortGruposOficiales(Array.from(m.grupos)),
    turnos: Array.from(m.turnos)
  })).sort((a, b) => b.totalHoras - a.totalHoras);
}

/**
 * Export group or teacher schedules report to an Excel workbook (.xlsx)
 */
export function exportHorariosWorkbook(horarios: BloqueHorario[], filterScope?: string) {
  const wb = XLSX.utils.book_new();

  const filtered = filterScope && filterScope !== 'TODOS'
    ? horarios.filter(h =>
        h.grupo === filterScope ||
        `${h.grado} ${h.grupo}` === filterScope ||
        normalizeTeacherName(h.maestro, h.grupo) === filterScope
      )
    : horarios;

  // 1. Raw Tabular Sheet
  const rawRows = filtered.map((h, i) => ({
    'No.': i + 1,
    'Ciclo': h.ciclo || '2026-2',
    'Grado': h.grado,
    'Grupo': h.grupo,
    'Turno': h.turno || 'Matutino',
    'Día': h.dia,
    'Módulo': h.modulo,
    'Horario': `${h.horaInicio} - ${h.horaFin}`,
    'Materia / Asignatura': h.materia,
    'Docente / Maestro': normalizeTeacherName(h.maestro, h.grupo),
    'Aula / Espacio': h.aula
  }));

  const wsRaw = XLSX.utils.json_to_sheet(rawRows);
  XLSX.utils.book_append_sheet(wb, wsRaw, 'Listado Horarios');

  // 2. Summary by Teacher
  const teachers = getMaestrosDirectory(filtered);
  const teacherRows = teachers.map((t, i) => ({
    'No.': i + 1,
    'Docente': t.nombre,
    'Horas Semanales': t.totalHoras,
    'Turnos': t.turnos.join(', '),
    'Grupos Asignados': t.grupos.join(', '),
    'Materias que Imparte': t.materias.join(' | '),
    'Color Distintivo': t.palette.nombre
  }));

  const wsTeachers = XLSX.utils.json_to_sheet(teacherRows);
  XLSX.utils.book_append_sheet(wb, wsTeachers, 'Docentes y Cargas');

  const safeName = (filterScope || 'TodosLosGrupos').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Reporte_Horarios_CECYTEBC_2026-2_${safeName}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Generate official downloadable template for bulk uploading schedules
 */
export function downloadHorariosExcelTemplate() {
  const wb = XLSX.utils.book_new();

  const sampleRows = MOCK_HORARIOS_OFICIALES.slice(0, 25).map(h => ({
    'GRADO': h.grado,
    'GRUPO': h.grupo,
    'TURNO': h.turno || 'Matutino',
    'DÍA': h.dia,
    'HORA_INICIO': h.horaInicio,
    'HORA_FIN': h.horaFin,
    'MÓDULO': h.modulo,
    'MATERIA': h.materia,
    'DOCENTE': h.maestro,
    'AULA': h.aula
  }));

  const ws = XLSX.utils.json_to_sheet(sampleRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Horarios');
  XLSX.writeFile(wb, 'plantilla_horarios_grupo_cecytebc_2026-2.xlsx');
}

/**
 * Parse a single sheet matrix that may be either:
 * A) CECYTE BC Visual Weekly Grid format (like each sheet in HORARIOS DE GRUPO 2026-2.xlsx)
 * B) Tabular column format (GRADO, GRUPO, DÍA, HORA_INICIO, MATERIA, DOCENTE...)
 */
export function parseHorariosFromMatrix(matrix: any[][], sheetName = '1A'): { bloques: BloqueHorario[]; errors: string[] } {
  const bloques: BloqueHorario[] = [];
  const errors: string[] = [];

  if (!matrix || matrix.length < 2) {
    return { bloques: [], errors: ['El archivo o pestaña no contiene suficientes filas de datos.'] };
  }

  // Detect if this sheet is a CECYTE BC visual weekly schedule grid:
  // Look for a row containing "HORARIO" and "LUNES"
  let horarioHeaderRowIdx = -1;
  let dayColsMap: { dia: DiaSemana; col: number }[] = [];

  for (let r = 0; r < Math.min(matrix.length, 15); r++) {
    const rowUp = (matrix[r] || []).map(c => String(c || '').trim().toUpperCase());
    const hasHorario = rowUp.some(c => c === 'HORARIO' || c === 'HORA');
    const hasLunes = rowUp.some(c => c.includes('LUNES'));
    if (hasHorario && hasLunes) {
      horarioHeaderRowIdx = r;
      const dMap: { dia: DiaSemana; col: number }[] = [];
      rowUp.forEach((cellVal, cIdx) => {
        if (cellVal.includes('LUNES')) dMap.push({ dia: 'Lunes', col: cIdx });
        else if (cellVal.includes('MARTES')) dMap.push({ dia: 'Martes', col: cIdx });
        else if (cellVal.includes('MIÉRCOLES') || cellVal.includes('MIERCOLES')) dMap.push({ dia: 'Miércoles', col: cIdx });
        else if (cellVal.includes('JUEVES')) dMap.push({ dia: 'Jueves', col: cIdx });
        else if (cellVal.includes('VIERNES')) dMap.push({ dia: 'Viernes', col: cIdx });
      });
      dayColsMap = dMap;
      break;
    }
  }

  // CASE A: CECYTE BC Visual Schedule Matrix (e.g. HORARIOS DE GRUPO 2026-2.xlsx)
  if (horarioHeaderRowIdx !== -1 && dayColsMap.length > 0) {
    // Extract group name & shift from top rows or sheetName
    let detectedGrupo = sheetName.trim().toUpperCase();
    let detectedTurno: 'Matutino' | 'Vespertino' = 'Matutino';

    for (let r = 0; r < horarioHeaderRowIdx; r++) {
      const rowText = (matrix[r] || []).map(c => String(c || '').trim()).join(' ').toUpperCase();
      if (rowText.includes('VESPERTINO')) detectedTurno = 'Vespertino';
      else if (rowText.includes('MATUTINO')) detectedTurno = 'Matutino';

      const grupoMatch = rowText.match(/GRUPO:\s*([A-Z0-9]+)/i);
      if (grupoMatch && grupoMatch[1]) {
        detectedGrupo = grupoMatch[1].trim().toUpperCase();
      }
    }

    const gradoDigit = detectedGrupo.match(/^[1-6]/)?.[0] || '1';
    const detectedGrado = `${gradoDigit}°`;

    // Also inspect bottom ASIGNATURA -> DOCENTE table if present for teacher name resolution
    const localTeacherAlias = new Map<string, string>();
    let asignaturaHeaderRow = -1;
    for (let r = horarioHeaderRowIdx + 1; r < matrix.length; r++) {
      const rowUp = (matrix[r] || []).map(c => String(c || '').trim().toUpperCase());
      if (rowUp.includes('ASIGNATURA') && rowUp.includes('DOCENTE')) {
        asignaturaHeaderRow = r;
        const asigCol = rowUp.indexOf('ASIGNATURA');
        const docCol = rowUp.indexOf('DOCENTE');
        for (let tr = r + 1; tr < matrix.length; tr++) {
          const asigVal = String(matrix[tr]?.[asigCol] || '').trim().toUpperCase();
          const docVal = String(matrix[tr]?.[docCol] || '').trim();
          if (asigVal && docVal) {
            localTeacherAlias.set(asigVal, normalizeTeacherName(docVal, detectedGrupo));
          }
        }
        break;
      }
    }

    const maxGridRow = asignaturaHeaderRow !== -1 ? asignaturaHeaderRow - 1 : matrix.length - 1;
    let modCounter = 0;

    const padTime = (t: string) => {
      if (!t) return '';
      const clean = t.trim();
      const [h, m] = clean.split(':');
      if (!h) return clean;
      return `${h.trim().padStart(2, '0')}:${(m || '00').trim().padStart(2, '0')}`;
    };

    for (let r = horarioHeaderRowIdx + 1; r <= maxGridRow; r++) {
      const row = matrix[r] || [];
      const timeCell = String(row[0] || '').trim();
      if (!timeCell || !timeCell.includes(':')) continue;

      const fullRowStr = row.map(c => String(c || '')).join(' ').toUpperCase();
      if (fullRowStr.includes('R E C E S O') || fullRowStr.includes('RECESO')) continue;

      modCounter++;
      const timeParts = timeCell.split('-').map(p => p.trim());
      const horaInicio = padTime(timeParts[0] || '07:00');
      const horaFin = padTime(timeParts[1] || '07:50');

      if (horaInicio >= '13:30') {
        detectedTurno = 'Vespertino';
      }

      const nextRow = matrix[r + 1] || [];

      dayColsMap.forEach(({ dia, col }) => {
        const rawMat = String(row[col] || '').trim();
        const rawDoc = String(nextRow[col] || '').trim();

        if (rawMat && (rawDoc || localTeacherAlias.has(rawMat.toUpperCase()))) {
          const materia = normalizeMateriaName(rawMat, detectedGrupo, rawDoc);
          const maestro = rawDoc
            ? normalizeTeacherName(rawDoc, detectedGrupo)
            : (localTeacherAlias.get(rawMat.toUpperCase()) || 'POR ASIGNAR');

          bloques.push({
            id: `hor-2026-2-${detectedGrupo.toLowerCase()}-${dia.slice(0, 2).toLowerCase()}-m${modCounter}-${r}`,
            grado: detectedGrado,
            grupo: detectedGrupo,
            dia,
            horaInicio,
            horaFin,
            modulo: modCounter,
            materia,
            maestro,
            aula: `Aula ${detectedGrupo}`,
            turno: detectedTurno,
            ciclo: '2026-2'
          });
        }
      });
    }

    return { bloques, errors };
  }

  // CASE B: Flat Tabular Format (Look for header row in first 10 rows)
  let headerRowIdx = 0;
  let colIndex = {
    grado: -1,
    grupo: -1,
    dia: -1,
    horaInicio: -1,
    horaFin: -1,
    modulo: -1,
    materia: -1,
    docente: -1,
    aula: -1,
    turno: -1
  };

  for (let r = 0; r < Math.min(matrix.length, 10); r++) {
    const headerRow = (matrix[r] || []).map(c => String(c || '').trim().toUpperCase());
    const matIdx = headerRow.findIndex(h => h.includes('MATERIA') || h.includes('ASIGNATURA'));
    const docIdx = headerRow.findIndex(h => h.includes('DOCENTE') || h.includes('MAESTRO') || h.includes('PROFESOR'));
    if (matIdx !== -1 && docIdx !== -1) {
      headerRowIdx = r;
      colIndex = {
        grado: headerRow.findIndex(h => h.includes('GRADO') || h.includes('SEMESTRE')),
        grupo: headerRow.findIndex(h => h.includes('GRUPO')),
        dia: headerRow.findIndex(h => h.includes('DIA') || h.includes('DÍA')),
        horaInicio: headerRow.findIndex(h => h.includes('INICIO') || h.includes('HORA_INICIO') || h.includes('DESDE')),
        horaFin: headerRow.findIndex(h => h.includes('FIN') || h.includes('HORA_FIN') || h.includes('HASTA')),
        modulo: headerRow.findIndex(h => h.includes('MODULO') || h.includes('MÓDULO') || h.includes('HORA')),
        materia: matIdx,
        docente: docIdx,
        aula: headerRow.findIndex(h => h.includes('AULA') || h.includes('SALON') || h.includes('SALÓN') || h.includes('LAB')),
        turno: headerRow.findIndex(h => h.includes('TURNO'))
      };
      break;
    }
  }

  if (colIndex.materia === -1 || colIndex.docente === -1) {
    return {
      bloques: [],
      errors: ['No se encontraron las columnas de horario en esta hoja.']
    };
  }

  for (let r = headerRowIdx + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || row.length === 0 || row.every(c => c === '' || c === undefined || c === null)) continue;

    const rawGrupo = colIndex.grupo !== -1 ? String(row[colIndex.grupo] || sheetName || '1A').trim().toUpperCase() : sheetName.toUpperCase();
    const defaultGrado = `${rawGrupo.match(/^[1-6]/)?.[0] || '1'}°`;
    const rawGrado = colIndex.grado !== -1 && row[colIndex.grado] ? String(row[colIndex.grado]).trim() : defaultGrado;
    const rawDia = colIndex.dia !== -1 ? String(row[colIndex.dia] || 'Lunes').trim() : 'Lunes';
    const rawMateria = String(row[colIndex.materia] || '').trim();
    const rawDocente = String(row[colIndex.docente] || '').trim();
    const rawAula = colIndex.aula !== -1 && row[colIndex.aula] ? String(row[colIndex.aula]).trim() : `Aula ${rawGrupo}`;
    const rawTurno = colIndex.turno !== -1 ? String(row[colIndex.turno] || 'Matutino').trim() : 'Matutino';

    if (!rawMateria || !rawDocente) continue;

    let normalizedDia: DiaSemana = 'Lunes';
    const diaUp = rawDia.toUpperCase();
    if (diaUp.includes('MAR')) normalizedDia = 'Martes';
    else if (diaUp.includes('MIE') || diaUp.includes('MIÉ')) normalizedDia = 'Miércoles';
    else if (diaUp.includes('JUE')) normalizedDia = 'Jueves';
    else if (diaUp.includes('VIE')) normalizedDia = 'Viernes';

    let modulo = colIndex.modulo !== -1 ? parseInt(String(row[colIndex.modulo]), 10) : 1;
    if (isNaN(modulo) || modulo < 1 || modulo > 8) modulo = 1;

    const isVesp = rawTurno.toLowerCase().includes('vesp');
    const modList = isVesp ? MODULOS_VESPERTINO : MODULOS_MATUTINO;
    const matchedOfficial = modList.find(m => m.modulo === modulo);

    const horaInicio = colIndex.horaInicio !== -1 && row[colIndex.horaInicio]
      ? String(row[colIndex.horaInicio]).trim()
      : (matchedOfficial?.horaInicio || (isVesp ? '13:30' : '07:00'));
    const horaFin = colIndex.horaFin !== -1 && row[colIndex.horaFin]
      ? String(row[colIndex.horaFin]).trim()
      : (matchedOfficial?.horaFin || (isVesp ? '14:20' : '07:50'));

    bloques.push({
      id: `hor-up-${Date.now()}-${r}-${Math.floor(Math.random() * 1000)}`,
      grado: rawGrado.includes('°') ? rawGrado : `${rawGrado}°`,
      grupo: rawGrupo,
      dia: normalizedDia,
      horaInicio,
      horaFin,
      modulo,
      materia: normalizeMateriaName(rawMateria, rawGrupo, rawDocente),
      maestro: normalizeTeacherName(rawDocente, rawGrupo),
      aula: rawAula,
      turno: isVesp || horaInicio >= '13:30' ? 'Vespertino' : 'Matutino',
      ciclo: '2026-2'
    });
  }

  return { bloques, errors };
}

/**
 * Parse an entire Excel workbook across ALL sheets (supports multi-group workbooks like HORARIOS DE GRUPO 2026-2.xlsx)
 */
export function parseHorariosFromWorkbook(wb: XLSX.WorkBook): { bloques: BloqueHorario[]; errors: string[] } {
  const allBloques: BloqueHorario[] = [];
  const sheetErrors: string[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const matrix: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const res = parseHorariosFromMatrix(matrix, sheetName);
    if (res.bloques.length > 0) {
      allBloques.push(...res.bloques);
    } else if (res.errors.length > 0) {
      sheetErrors.push(`Hoja "${sheetName}": ${res.errors[0]}`);
    }
  }

  if (allBloques.length === 0) {
    return {
      bloques: [],
      errors: sheetErrors.length > 0
        ? sheetErrors
        : ['No se encontraron bloques de horario válidos en ninguna pestaña del archivo.']
    };
  }

  return { bloques: allBloques, errors: [] };
}
