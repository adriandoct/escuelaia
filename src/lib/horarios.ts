import * as XLSX from 'xlsx';

export type DiaSemana = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes';

export const DIAS_SEMANA: DiaSemana[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

export interface ModuloHorario {
  modulo: number;
  horaInicio: string;
  horaFin: string;
  label: string;
  esReceso?: boolean;
}

export const MODULOS_OFICIALES: ModuloHorario[] = [
  { modulo: 1, horaInicio: '07:00', horaFin: '07:50', label: '1° Módulo (07:00 - 07:50)' },
  { modulo: 2, horaInicio: '07:50', horaFin: '08:40', label: '2° Módulo (07:50 - 08:40)' },
  { modulo: 3, horaInicio: '08:40', horaFin: '09:30', label: '3° Módulo (08:40 - 09:30)' },
  { modulo: 0, horaInicio: '09:30', horaFin: '10:00', label: 'RECESO ESCOLAR', esReceso: true },
  { modulo: 4, horaInicio: '10:00', horaFin: '10:50', label: '4° Módulo (10:00 - 10:50)' },
  { modulo: 5, horaInicio: '10:50', horaFin: '11:40', label: '5° Módulo (10:50 - 11:40)' },
  { modulo: 6, horaInicio: '11:40', horaFin: '12:30', label: '6° Módulo (11:40 - 12:30)' },
  { modulo: 7, horaInicio: '12:30', horaFin: '13:20', label: '7° Módulo (12:30 - 13:20)' },
  { modulo: 8, horaInicio: '13:20', horaFin: '14:10', label: '8° Módulo (13:20 - 14:10)' },
];

export interface BloqueHorario {
  id: string;
  grado: string;          // '1°', '3°', '5°'
  grupo: string;          // '1A', '1B', '3APGA', '5APGM', etc.
  dia: DiaSemana;
  horaInicio: string;     // '07:00'
  horaFin: string;        // '07:50'
  modulo: number;         // 1..8
  materia: string;        // e.g. 'Matemáticas I'
  maestro: string;        // e.g. 'Prof. Marcos Hernández'
  maestroEmail?: string;  // e.g. 'docente.marcos@cecytebc.edu.mx'
  aula: string;           // e.g. 'Aula 102', 'Lab. Cómputo 1'
  turno?: 'Matutino' | 'Vespertino';
  ciclo?: string;         // e.g. '2026-1'
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
  }
];

/**
 * Deterministically assigns a unique color palette based on teacher name
 */
export function getMaestroPalette(maestroName: string): MaestroColorPalette {
  if (!maestroName) return PALETAS_COLORES[0];
  
  // Custom specific assignment for known teachers for maximum aesthetic harmony
  const lower = maestroName.toLowerCase();
  if (lower.includes('marcos')) return PALETAS_COLORES[0]; // Emerald
  if (lower.includes('mariana')) return PALETAS_COLORES[2]; // Purple
  if (lower.includes('roberto')) return PALETAS_COLORES[1]; // Blue
  if (lower.includes('claudia')) return PALETAS_COLORES[3]; // Amber
  if (lower.includes('david')) return PALETAS_COLORES[4]; // Rose
  if (lower.includes('elena')) return PALETAS_COLORES[5]; // Cyan
  if (lower.includes('alejandro')) return PALETAS_COLORES[8]; // Indigo
  if (lower.includes('patricia')) return PALETAS_COLORES[6]; // Fuchsia
  if (lower.includes('fernando')) return PALETAS_COLORES[9]; // Orange

  let hash = 0;
  for (let i = 0; i < maestroName.length; i++) {
    hash = maestroName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETAS_COLORES.length;
  return PALETAS_COLORES[index];
}

const LOCAL_STORAGE_HORARIOS_KEY = 'dojoia_horarios_grupos';

export const MOCK_HORARIOS_OFICIALES: BloqueHorario[] = [
  // ==========================================
  // GRUPO 1° "1A" (Turno Matutino)
  // ==========================================
  // Lunes
  { id: 'h-1a-l1', grado: '1°', grupo: '1A', dia: 'Lunes', horaInicio: '07:00', horaFin: '07:50', modulo: 1, materia: 'Matemáticas I (Álgebra)', maestro: 'Prof. Marcos Hernández', aula: 'Aula 101', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1a-l2', grado: '1°', grupo: '1A', dia: 'Lunes', horaInicio: '07:50', horaFin: '08:40', modulo: 2, materia: 'Matemáticas I (Álgebra)', maestro: 'Prof. Marcos Hernández', aula: 'Aula 101', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1a-l3', grado: '1°', grupo: '1A', dia: 'Lunes', horaInicio: '08:40', horaFin: '09:30', modulo: 3, materia: 'Lengua y Comunicación I', maestro: 'Profa. Mariana López', aula: 'Aula 101', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1a-l4', grado: '1°', grupo: '1A', dia: 'Lunes', horaInicio: '10:00', horaFin: '10:50', modulo: 4, materia: 'Lengua y Comunicación I', maestro: 'Profa. Mariana López', aula: 'Aula 101', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1a-l5', grado: '1°', grupo: '1A', dia: 'Lunes', horaInicio: '10:50', horaFin: '11:40', modulo: 5, materia: 'Inglés I', maestro: 'Prof. Roberto Sánchez', aula: 'Aula 101', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1a-l6', grado: '1°', grupo: '1A', dia: 'Lunes', horaInicio: '11:40', horaFin: '12:30', modulo: 6, materia: 'Cultura Digital I', maestro: 'Profa. Claudia Morales', aula: 'Lab. Cómputo 1', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1a-l7', grado: '1°', grupo: '1A', dia: 'Lunes', horaInicio: '12:30', horaFin: '13:20', modulo: 7, materia: 'Cultura Digital I', maestro: 'Profa. Claudia Morales', aula: 'Lab. Cómputo 1', turno: 'Matutino', ciclo: '2026-1' },

  // Martes
  { id: 'h-1a-m1', grado: '1°', grupo: '1A', dia: 'Martes', horaInicio: '07:00', horaFin: '07:50', modulo: 1, materia: 'Ciencias Naturales I', maestro: 'Prof. David González', aula: 'Lab. Ciencias', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1a-m2', grado: '1°', grupo: '1A', dia: 'Martes', horaInicio: '07:50', horaFin: '08:40', modulo: 2, materia: 'Ciencias Naturales I', maestro: 'Prof. David González', aula: 'Lab. Ciencias', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1a-m3', grado: '1°', grupo: '1A', dia: 'Martes', horaInicio: '08:40', horaFin: '09:30', modulo: 3, materia: 'Humanidades I', maestro: 'Profa. Elena Ramírez', aula: 'Aula 101', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1a-m4', grado: '1°', grupo: '1A', dia: 'Martes', horaInicio: '10:00', horaFin: '10:50', modulo: 4, materia: 'Matemáticas I (Álgebra)', maestro: 'Prof. Marcos Hernández', aula: 'Aula 101', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1a-m5', grado: '1°', grupo: '1A', dia: 'Martes', horaInicio: '10:50', horaFin: '11:40', modulo: 5, materia: 'Inglés I', maestro: 'Prof. Roberto Sánchez', aula: 'Aula 101', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1a-m6', grado: '1°', grupo: '1A', dia: 'Martes', horaInicio: '11:40', horaFin: '12:30', modulo: 6, materia: 'Ciencias Sociales I', maestro: 'Prof. Alejandro Vargas', aula: 'Aula 101', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1a-m7', grado: '1°', grupo: '1A', dia: 'Martes', horaInicio: '12:30', horaFin: '13:20', modulo: 7, materia: 'Educación Física / Taller', maestro: 'Prof. Fernando Torres', aula: 'Cancha Central', turno: 'Matutino', ciclo: '2026-1' },

  // Miércoles
  { id: 'h-1a-w1', grado: '1°', grupo: '1A', dia: 'Miércoles', horaInicio: '07:00', horaFin: '07:50', modulo: 1, materia: 'Lengua y Comunicación I', maestro: 'Profa. Mariana López', aula: 'Aula 101', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1a-w2', grado: '1°', grupo: '1A', dia: 'Miércoles', horaInicio: '07:50', horaFin: '08:40', modulo: 2, materia: 'Inglés I', maestro: 'Prof. Roberto Sánchez', aula: 'Aula 101', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1a-w3', grado: '1°', grupo: '1A', dia: 'Miércoles', horaInicio: '08:40', horaFin: '09:30', modulo: 3, materia: 'Matemáticas I (Álgebra)', maestro: 'Prof. Marcos Hernández', aula: 'Aula 101', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1a-w4', grado: '1°', grupo: '1A', dia: 'Miércoles', horaInicio: '10:00', horaFin: '10:50', modulo: 4, materia: 'Cultura Digital I', maestro: 'Profa. Claudia Morales', aula: 'Lab. Cómputo 1', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1a-w5', grado: '1°', grupo: '1A', dia: 'Miércoles', horaInicio: '10:50', horaFin: '11:40', modulo: 5, materia: 'Ciencias Naturales I', maestro: 'Prof. David González', aula: 'Lab. Ciencias', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1a-w6', grado: '1°', grupo: '1A', dia: 'Miércoles', horaInicio: '11:40', horaFin: '12:30', modulo: 6, materia: 'Ciencias Sociales I', maestro: 'Prof. Alejandro Vargas', aula: 'Aula 101', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1a-w7', grado: '1°', grupo: '1A', dia: 'Miércoles', horaInicio: '12:30', horaFin: '13:20', modulo: 7, materia: 'Tutoría y Socioemocional', maestro: 'Profa. Patricia Castillo', aula: 'Aula 101', turno: 'Matutino', ciclo: '2026-1' },

  // Jueves
  { id: 'h-1a-j1', grado: '1°', grupo: '1A', dia: 'Jueves', horaInicio: '07:00', horaFin: '07:50', modulo: 1, materia: 'Humanidades I', maestro: 'Profa. Elena Ramírez', aula: 'Aula 101', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1a-j2', grado: '1°', grupo: '1A', dia: 'Jueves', horaInicio: '07:50', horaFin: '08:40', modulo: 2, materia: 'Humanidades I', maestro: 'Profa. Elena Ramírez', aula: 'Aula 101', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1a-j3', grado: '1°', grupo: '1A', dia: 'Jueves', horaInicio: '08:40', horaFin: '09:30', modulo: 3, materia: 'Matemáticas I (Álgebra)', maestro: 'Prof. Marcos Hernández', aula: 'Aula 101', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1a-j4', grado: '1°', grupo: '1A', dia: 'Jueves', horaInicio: '10:00', horaFin: '10:50', modulo: 4, materia: 'Ciencias Naturales I', maestro: 'Prof. David González', aula: 'Lab. Ciencias', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1a-j5', grado: '1°', grupo: '1A', dia: 'Jueves', horaInicio: '10:50', horaFin: '11:40', modulo: 5, materia: 'Lengua y Comunicación I', maestro: 'Profa. Mariana López', aula: 'Aula 101', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1a-j6', grado: '1°', grupo: '1A', dia: 'Jueves', horaInicio: '11:40', horaFin: '12:30', modulo: 6, materia: 'Inglés I', maestro: 'Prof. Roberto Sánchez', aula: 'Aula 101', turno: 'Matutino', ciclo: '2026-1' },

  // Viernes
  { id: 'h-1a-v1', grado: '1°', grupo: '1A', dia: 'Viernes', horaInicio: '07:00', horaFin: '07:50', modulo: 1, materia: 'Cultura Digital I', maestro: 'Profa. Claudia Morales', aula: 'Lab. Cómputo 1', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1a-v2', grado: '1°', grupo: '1A', dia: 'Viernes', horaInicio: '07:50', horaFin: '08:40', modulo: 2, materia: 'Lengua y Comunicación I', maestro: 'Profa. Mariana López', aula: 'Aula 101', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1a-v3', grado: '1°', grupo: '1A', dia: 'Viernes', horaInicio: '08:40', horaFin: '09:30', modulo: 3, materia: 'Ciencias Sociales I', maestro: 'Prof. Alejandro Vargas', aula: 'Aula 101', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1a-v4', grado: '1°', grupo: '1A', dia: 'Viernes', horaInicio: '10:00', horaFin: '10:50', modulo: 4, materia: 'Matemáticas I (Álgebra)', maestro: 'Prof. Marcos Hernández', aula: 'Aula 101', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1a-v5', grado: '1°', grupo: '1A', dia: 'Viernes', horaInicio: '10:50', horaFin: '11:40', modulo: 5, materia: 'Inglés I', maestro: 'Prof. Roberto Sánchez', aula: 'Aula 101', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1a-v6', grado: '1°', grupo: '1A', dia: 'Viernes', horaInicio: '11:40', horaFin: '12:30', modulo: 6, materia: 'Educación Física / Taller', maestro: 'Prof. Fernando Torres', aula: 'Cancha Central', turno: 'Matutino', ciclo: '2026-1' },

  // ==========================================
  // GRUPO 1° "1B" (Turno Matutino)
  // ==========================================
  { id: 'h-1b-l1', grado: '1°', grupo: '1B', dia: 'Lunes', horaInicio: '07:00', horaFin: '07:50', modulo: 1, materia: 'Lengua y Comunicación I', maestro: 'Profa. Mariana López', aula: 'Aula 102', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1b-l2', grado: '1°', grupo: '1B', dia: 'Lunes', horaInicio: '07:50', horaFin: '08:40', modulo: 2, materia: 'Lengua y Comunicación I', maestro: 'Profa. Mariana López', aula: 'Aula 102', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1b-l3', grado: '1°', grupo: '1B', dia: 'Lunes', horaInicio: '08:40', horaFin: '09:30', modulo: 3, materia: 'Matemáticas I (Álgebra)', maestro: 'Prof. Marcos Hernández', aula: 'Aula 102', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1b-l4', grado: '1°', grupo: '1B', dia: 'Lunes', horaInicio: '10:00', horaFin: '10:50', modulo: 4, materia: 'Inglés I', maestro: 'Prof. Roberto Sánchez', aula: 'Aula 102', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1b-l5', grado: '1°', grupo: '1B', dia: 'Lunes', horaInicio: '10:50', horaFin: '11:40', modulo: 5, materia: 'Ciencias Naturales I', maestro: 'Prof. David González', aula: 'Lab. Ciencias', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-1b-l6', grado: '1°', grupo: '1B', dia: 'Lunes', horaInicio: '11:40', horaFin: '12:30', modulo: 6, materia: 'Cultura Digital I', maestro: 'Profa. Claudia Morales', aula: 'Lab. Cómputo 2', turno: 'Matutino', ciclo: '2026-1' },

  // ==========================================
  // GRUPO 3° "3APGA" (Técnico en Programación)
  // ==========================================
  { id: 'h-3apga-l1', grado: '3°', grupo: '3APGA', dia: 'Lunes', horaInicio: '07:00', horaFin: '07:50', modulo: 1, materia: 'Submódulo: Programa en Java y BD', maestro: 'Profa. Claudia Morales', aula: 'Lab. Programación A', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-3apga-l2', grado: '3°', grupo: '3APGA', dia: 'Lunes', horaInicio: '07:50', horaFin: '08:40', modulo: 2, materia: 'Submódulo: Programa en Java y BD', maestro: 'Profa. Claudia Morales', aula: 'Lab. Programación A', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-3apga-l3', grado: '3°', grupo: '3APGA', dia: 'Lunes', horaInicio: '08:40', horaFin: '09:30', modulo: 3, materia: 'Matemáticas III (Geometría Analítica)', maestro: 'Prof. Marcos Hernández', aula: 'Aula 201', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-3apga-l4', grado: '3°', grupo: '3APGA', dia: 'Lunes', horaInicio: '10:00', horaFin: '10:50', modulo: 4, materia: 'Inglés III', maestro: 'Prof. Roberto Sánchez', aula: 'Aula 201', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-3apga-l5', grado: '3°', grupo: '3APGA', dia: 'Lunes', horaInicio: '10:50', horaFin: '11:40', modulo: 5, materia: 'Ecosistemas y Conservación', maestro: 'Prof. David González', aula: 'Aula 201', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-3apga-l6', grado: '3°', grupo: '3APGA', dia: 'Lunes', horaInicio: '11:40', horaFin: '12:30', modulo: 6, materia: 'Lengua y Comunicación III', maestro: 'Profa. Mariana López', aula: 'Aula 201', turno: 'Matutino', ciclo: '2026-1' },
  
  // Martes 3APGA
  { id: 'h-3apga-m1', grado: '3°', grupo: '3APGA', dia: 'Martes', horaInicio: '07:00', horaFin: '07:50', modulo: 1, materia: 'Submódulo: Diseño de Software', maestro: 'Prof. Alejandro Vargas', aula: 'Lab. Programación A', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-3apga-m2', grado: '3°', grupo: '3APGA', dia: 'Martes', horaInicio: '07:50', horaFin: '08:40', modulo: 2, materia: 'Submódulo: Diseño de Software', maestro: 'Prof. Alejandro Vargas', aula: 'Lab. Programación A', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-3apga-m3', grado: '3°', grupo: '3APGA', dia: 'Martes', horaInicio: '08:40', horaFin: '09:30', modulo: 3, materia: 'Lengua y Comunicación III', maestro: 'Profa. Mariana López', aula: 'Aula 201', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-3apga-m4', grado: '3°', grupo: '3APGA', dia: 'Martes', horaInicio: '10:00', horaFin: '10:50', modulo: 4, materia: 'Matemáticas III (Geometría Analítica)', maestro: 'Prof. Marcos Hernández', aula: 'Aula 201', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-3apga-m5', grado: '3°', grupo: '3APGA', dia: 'Martes', horaInicio: '10:50', horaFin: '11:40', modulo: 5, materia: 'Humanidades III', maestro: 'Profa. Elena Ramírez', aula: 'Aula 201', turno: 'Matutino', ciclo: '2026-1' },

  // Miércoles 3APGA
  { id: 'h-3apga-w1', grado: '3°', grupo: '3APGA', dia: 'Miércoles', horaInicio: '07:00', horaFin: '07:50', modulo: 1, materia: 'Matemáticas III (Geometría Analítica)', maestro: 'Prof. Marcos Hernández', aula: 'Aula 201', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-3apga-w2', grado: '3°', grupo: '3APGA', dia: 'Miércoles', horaInicio: '07:50', horaFin: '08:40', modulo: 2, materia: 'Inglés III', maestro: 'Prof. Roberto Sánchez', aula: 'Aula 201', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-3apga-w3', grado: '3°', grupo: '3APGA', dia: 'Miércoles', horaInicio: '08:40', horaFin: '09:30', modulo: 3, materia: 'Submódulo: Programa en Java y BD', maestro: 'Profa. Claudia Morales', aula: 'Lab. Programación A', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-3apga-w4', grado: '3°', grupo: '3APGA', dia: 'Miércoles', horaInicio: '10:00', horaFin: '10:50', modulo: 4, materia: 'Submódulo: Programa en Java y BD', maestro: 'Profa. Claudia Morales', aula: 'Lab. Programación A', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-3apga-w5', grado: '3°', grupo: '3APGA', dia: 'Miércoles', horaInicio: '10:50', horaFin: '11:40', modulo: 5, materia: 'Tutoría Grupal', maestro: 'Profa. Mariana López', aula: 'Aula 201', turno: 'Matutino', ciclo: '2026-1' },

  // Jueves 3APGA
  { id: 'h-3apga-j1', grado: '3°', grupo: '3APGA', dia: 'Jueves', horaInicio: '07:00', horaFin: '07:50', modulo: 1, materia: 'Ecosistemas y Conservación', maestro: 'Prof. David González', aula: 'Lab. Ciencias', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-3apga-j2', grado: '3°', grupo: '3APGA', dia: 'Jueves', horaInicio: '07:50', horaFin: '08:40', modulo: 2, materia: 'Inglés III', maestro: 'Prof. Roberto Sánchez', aula: 'Aula 201', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-3apga-j3', grado: '3°', grupo: '3APGA', dia: 'Jueves', horaInicio: '08:40', horaFin: '09:30', modulo: 3, materia: 'Submódulo: Diseño de Software', maestro: 'Prof. Alejandro Vargas', aula: 'Lab. Programación A', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-3apga-j4', grado: '3°', grupo: '3APGA', dia: 'Jueves', horaInicio: '10:00', horaFin: '10:50', modulo: 4, materia: 'Humanidades III', maestro: 'Profa. Elena Ramírez', aula: 'Aula 201', turno: 'Matutino', ciclo: '2026-1' },

  // Viernes 3APGA
  { id: 'h-3apga-v1', grado: '3°', grupo: '3APGA', dia: 'Viernes', horaInicio: '07:00', horaFin: '07:50', modulo: 1, materia: 'Submódulo: Programa en Java y BD', maestro: 'Profa. Claudia Morales', aula: 'Lab. Programación A', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-3apga-v2', grado: '3°', grupo: '3APGA', dia: 'Viernes', horaInicio: '07:50', horaFin: '08:40', modulo: 2, materia: 'Submódulo: Programa en Java y BD', maestro: 'Profa. Claudia Morales', aula: 'Lab. Programación A', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-3apga-v3', grado: '3°', grupo: '3APGA', dia: 'Viernes', horaInicio: '08:40', horaFin: '09:30', modulo: 3, materia: 'Matemáticas III (Geometría Analítica)', maestro: 'Prof. Marcos Hernández', aula: 'Aula 201', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-3apga-v4', grado: '3°', grupo: '3APGA', dia: 'Viernes', horaInicio: '10:00', horaFin: '10:50', modulo: 4, materia: 'Lengua y Comunicación III', maestro: 'Profa. Mariana López', aula: 'Aula 201', turno: 'Matutino', ciclo: '2026-1' },

  // ==========================================
  // GRUPO 5° "5APGA" (Programación y Aplicaciones Web)
  // ==========================================
  { id: 'h-5apga-l1', grado: '5°', grupo: '5APGA', dia: 'Lunes', horaInicio: '07:00', horaFin: '07:50', modulo: 1, materia: 'Cálculo Integral', maestro: 'Prof. Marcos Hernández', aula: 'Aula 301', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-5apga-l2', grado: '5°', grupo: '5APGA', dia: 'Lunes', horaInicio: '07:50', horaFin: '08:40', modulo: 2, materia: 'Cálculo Integral', maestro: 'Prof. Marcos Hernández', aula: 'Aula 301', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-5apga-l3', grado: '5°', grupo: '5APGA', dia: 'Lunes', horaInicio: '08:40', horaFin: '09:30', modulo: 3, materia: 'Desarrollo de Aplicaciones Móviles', maestro: 'Profa. Claudia Morales', aula: 'Lab. Cómputo Avanzado', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-5apga-l4', grado: '5°', grupo: '5APGA', dia: 'Lunes', horaInicio: '10:00', horaFin: '10:50', modulo: 4, materia: 'Desarrollo de Aplicaciones Móviles', maestro: 'Profa. Claudia Morales', aula: 'Lab. Cómputo Avanzado', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-5apga-l5', grado: '5°', grupo: '5APGA', dia: 'Lunes', horaInicio: '10:50', horaFin: '11:40', modulo: 5, materia: 'Física II', maestro: 'Prof. David González', aula: 'Lab. Ciencias', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-5apga-l6', grado: '5°', grupo: '5APGA', dia: 'Lunes', horaInicio: '11:40', horaFin: '12:30', modulo: 6, materia: 'Inglés V', maestro: 'Prof. Roberto Sánchez', aula: 'Aula 301', turno: 'Matutino', ciclo: '2026-1' },

  // Martes 5APGA
  { id: 'h-5apga-m1', grado: '5°', grupo: '5APGA', dia: 'Martes', horaInicio: '07:00', horaFin: '07:50', modulo: 1, materia: 'Desarrollo de Aplicaciones Web', maestro: 'Prof. Alejandro Vargas', aula: 'Lab. Cómputo Avanzado', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-5apga-m2', grado: '5°', grupo: '5APGA', dia: 'Martes', horaInicio: '07:50', horaFin: '08:40', modulo: 2, materia: 'Desarrollo de Aplicaciones Web', maestro: 'Prof. Alejandro Vargas', aula: 'Lab. Cómputo Avanzado', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-5apga-m3', grado: '5°', grupo: '5APGA', dia: 'Martes', horaInicio: '08:40', horaFin: '09:30', modulo: 3, materia: 'Cálculo Integral', maestro: 'Prof. Marcos Hernández', aula: 'Aula 301', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-5apga-m4', grado: '5°', grupo: '5APGA', dia: 'Martes', horaInicio: '10:00', horaFin: '10:50', modulo: 4, materia: 'Física II', maestro: 'Prof. David González', aula: 'Lab. Ciencias', turno: 'Matutino', ciclo: '2026-1' },
  { id: 'h-5apga-m5', grado: '5°', grupo: '5APGA', dia: 'Martes', horaInicio: '10:50', horaFin: '11:40', modulo: 5, materia: 'Administración y Emprendimiento', maestro: 'Profa. Patricia Castillo', aula: 'Aula 301', turno: 'Matutino', ciclo: '2026-1' },
];

/**
 * Retrieve all group schedules from persistent storage or default mocks
 */
export function getStoredHorarios(): BloqueHorario[] {
  if (typeof window === 'undefined') return MOCK_HORARIOS_OFICIALES;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_HORARIOS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // Initialize with mock schedules
    localStorage.setItem(LOCAL_STORAGE_HORARIOS_KEY, JSON.stringify(MOCK_HORARIOS_OFICIALES));
    return MOCK_HORARIOS_OFICIALES;
  } catch (e) {
    console.error('Error al leer horarios de localStorage:', e);
    return MOCK_HORARIOS_OFICIALES;
  }
}

/**
 * Save group schedules to persistent storage
 */
export function saveHorarios(horarios: BloqueHorario[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_HORARIOS_KEY, JSON.stringify(horarios));
    window.dispatchEvent(new CustomEvent('dojoia_horarios_updated', { detail: horarios }));
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
  const updatedBloque = { ...all[idx], ...updates };
  all[idx] = updatedBloque;
  saveHorarios(all);
  return updatedBloque;
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
 * Reset schedules back to official default CECYTE BC state
 */
export function resetHorariosToDefault(): BloqueHorario[] {
  saveHorarios(MOCK_HORARIOS_OFICIALES);
  return MOCK_HORARIOS_OFICIALES;
}

/**
 * Extract list of teachers with their total workload, assigned groups, and colors
 */
export function getMaestrosDirectory(horarios: BloqueHorario[]) {
  const map = new Map<string, {
    nombre: string;
    email?: string;
    palette: MaestroColorPalette;
    totalHoras: number;
    materias: Set<string>;
    grupos: Set<string>;
  }>();

  horarios.forEach(b => {
    if (!b.maestro) return;
    const key = b.maestro.trim();
    if (!map.has(key)) {
      map.set(key, {
        nombre: key,
        email: b.maestroEmail || `${key.toLowerCase().replace(/[^a-z]/g, '.')}@cecytebc.edu.mx`,
        palette: getMaestroPalette(key),
        totalHoras: 0,
        materias: new Set(),
        grupos: new Set()
      });
    }
    const item = map.get(key)!;
    item.totalHoras += 1;
    item.materias.add(b.materia);
    item.grupos.add(`${b.grado} ${b.grupo}`);
  });

  return Array.from(map.values()).map(m => ({
    ...m,
    materias: Array.from(m.materias),
    grupos: Array.from(m.grupos)
  })).sort((a, b) => b.totalHoras - a.totalHoras);
}

/**
 * Export group schedules report to an Excel workbook (.xlsx)
 */
export function exportHorariosWorkbook(horarios: BloqueHorario[], grupoFilter?: string) {
  const wb = XLSX.utils.book_new();

  const filtered = grupoFilter && grupoFilter !== 'TODOS'
    ? horarios.filter(h => h.grupo === grupoFilter || `${h.grado} ${h.grupo}` === grupoFilter)
    : horarios;

  // 1. Raw Tabular Sheet
  const rawRows = filtered.map((h, i) => ({
    'No.': i + 1,
    'Ciclo': h.ciclo || '2026-1',
    'Grado': h.grado,
    'Grupo': h.grupo,
    'Día': h.dia,
    'Módulo': h.modulo,
    'Horario': `${h.horaInicio} - ${h.horaFin}`,
    'Materia': h.materia,
    'Docente / Maestro': h.maestro,
    'Aula / Espacio': h.aula,
    'Turno': h.turno || 'Matutino'
  }));

  const wsRaw = XLSX.utils.json_to_sheet(rawRows);
  XLSX.utils.book_append_sheet(wb, wsRaw, 'Listado Horarios');

  // 2. Summary by Teacher
  const teachers = getMaestrosDirectory(filtered);
  const teacherRows = teachers.map((t, i) => ({
    'No.': i + 1,
    'Docente': t.nombre,
    'Horas Semanales': t.totalHoras,
    'Grupos Asignados': t.grupos.join(', '),
    'Materias que Imparte': t.materias.join(', '),
    'Color Distintivo': t.palette.nombre
  }));

  const wsTeachers = XLSX.utils.json_to_sheet(teacherRows);
  XLSX.utils.book_append_sheet(wb, wsTeachers, 'Docentes y Cargas');

  const fileName = `Reporte_Horarios_CECYTEBC_${grupoFilter || 'TodosLosGrupos'}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Generate official downloadable template for bulk uploading schedules
 */
export function downloadHorariosExcelTemplate() {
  const wb = XLSX.utils.book_new();

  const sampleRows = [
    {
      'GRADO': '1°',
      'GRUPO': '1A',
      'DÍA': 'Lunes',
      'HORA_INICIO': '07:00',
      'HORA_FIN': '07:50',
      'MÓDULO': 1,
      'MATERIA': 'Matemáticas I (Álgebra)',
      'DOCENTE': 'Prof. Marcos Hernández',
      'AULA': 'Aula 101',
      'TURNO': 'Matutino'
    },
    {
      'GRADO': '1°',
      'GRUPO': '1A',
      'DÍA': 'Lunes',
      'HORA_INICIO': '07:50',
      'HORA_FIN': '08:40',
      'MÓDULO': 2,
      'MATERIA': 'Matemáticas I (Álgebra)',
      'DOCENTE': 'Prof. Marcos Hernández',
      'AULA': 'Aula 101',
      'TURNO': 'Matutino'
    },
    {
      'GRADO': '1°',
      'GRUPO': '1A',
      'DÍA': 'Lunes',
      'HORA_INICIO': '08:40',
      'HORA_FIN': '09:30',
      'MÓDULO': 3,
      'MATERIA': 'Lengua y Comunicación I',
      'DOCENTE': 'Profa. Mariana López',
      'AULA': 'Aula 101',
      'TURNO': 'Matutino'
    },
    {
      'GRADO': '1°',
      'GRUPO': '1A',
      'DÍA': 'Lunes',
      'HORA_INICIO': '10:00',
      'HORA_FIN': '10:50',
      'MÓDULO': 4,
      'MATERIA': 'Inglés I',
      'DOCENTE': 'Prof. Roberto Sánchez',
      'AULA': 'Aula 101',
      'TURNO': 'Matutino'
    },
    {
      'GRADO': '3°',
      'GRUPO': '3APGA',
      'DÍA': 'Lunes',
      'HORA_INICIO': '07:00',
      'HORA_FIN': '07:50',
      'MÓDULO': 1,
      'MATERIA': 'Programación Orientada a Objetos',
      'DOCENTE': 'Profa. Claudia Morales',
      'AULA': 'Lab. Cómputo 1',
      'TURNO': 'Matutino'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Horarios');
  XLSX.writeFile(wb, 'plantilla_horarios_grupo_cecytebc.xlsx');
}

/**
 * Parse an Excel/CSV file to BloqueHorario records
 */
export function parseHorariosFromMatrix(matrix: any[][]): { bloques: BloqueHorario[]; errors: string[] } {
  const bloques: BloqueHorario[] = [];
  const errors: string[] = [];

  if (!matrix || matrix.length < 2) {
    return { bloques: [], errors: ['El archivo no contiene suficientes filas de datos.'] };
  }

  // Find header row
  const headerRow = matrix[0].map(c => String(c || '').trim().toUpperCase());
  
  const colIndex = {
    grado: headerRow.findIndex(h => h.includes('GRADO') || h.includes('SEMESTRE')),
    grupo: headerRow.findIndex(h => h.includes('GRUPO')),
    dia: headerRow.findIndex(h => h.includes('DIA') || h.includes('DÍA')),
    horaInicio: headerRow.findIndex(h => h.includes('INICIO') || h.includes('HORA_INICIO') || h.includes('DESDE')),
    horaFin: headerRow.findIndex(h => h.includes('FIN') || h.includes('HORA_FIN') || h.includes('HASTA')),
    modulo: headerRow.findIndex(h => h.includes('MODULO') || h.includes('MÓDULO') || h.includes('HORA')),
    materia: headerRow.findIndex(h => h.includes('MATERIA') || h.includes('ASIGNATURA')),
    docente: headerRow.findIndex(h => h.includes('DOCENTE') || h.includes('MAESTRO') || h.includes('PROFESOR')),
    aula: headerRow.findIndex(h => h.includes('AULA') || h.includes('SALON') || h.includes('SALÓN') || h.includes('LAB')),
    turno: headerRow.findIndex(h => h.includes('TURNO'))
  };

  if (colIndex.materia === -1 || colIndex.docente === -1) {
    return {
      bloques: [],
      errors: ['No se encontraron las columnas requeridas (MATERIA y DOCENTE). Descarga la plantilla oficial para ver el formato.']
    };
  }

  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || row.length === 0 || row.every(c => c === '' || c === undefined || c === null)) continue;

    const rawGrado = colIndex.grado !== -1 ? String(row[colIndex.grado] || '1°').trim() : '1°';
    const rawGrupo = colIndex.grupo !== -1 ? String(row[colIndex.grupo] || '1A').trim() : '1A';
    const rawDia = colIndex.dia !== -1 ? String(row[colIndex.dia] || 'Lunes').trim() : 'Lunes';
    const rawMateria = String(row[colIndex.materia] || '').trim();
    const rawDocente = String(row[colIndex.docente] || '').trim();
    const rawAula = colIndex.aula !== -1 ? String(row[colIndex.aula] || 'Aula 101').trim() : 'Aula 101';
    const rawTurno = colIndex.turno !== -1 ? String(row[colIndex.turno] || 'Matutino').trim() : 'Matutino';

    if (!rawMateria || !rawDocente) {
      continue;
    }

    // Normalize day
    let normalizedDia: DiaSemana = 'Lunes';
    const diaUp = rawDia.toUpperCase();
    if (diaUp.includes('MAR')) normalizedDia = 'Martes';
    else if (diaUp.includes('MIE') || diaUp.includes('MIÉ')) normalizedDia = 'Miércoles';
    else if (diaUp.includes('JUE')) normalizedDia = 'Jueves';
    else if (diaUp.includes('VIE')) normalizedDia = 'Viernes';

    // Parse modulo / times
    let modulo = colIndex.modulo !== -1 ? parseInt(String(row[colIndex.modulo]), 10) : 1;
    if (isNaN(modulo) || modulo < 1 || modulo > 8) modulo = 1;

    const matchedOfficial = MODULOS_OFICIALES.find(m => m.modulo === modulo);
    const horaInicio = colIndex.horaInicio !== -1 && row[colIndex.horaInicio] 
      ? String(row[colIndex.horaInicio]).trim() 
      : (matchedOfficial?.horaInicio || '07:00');
    const horaFin = colIndex.horaFin !== -1 && row[colIndex.horaFin] 
      ? String(row[colIndex.horaFin]).trim() 
      : (matchedOfficial?.horaFin || '07:50');

    bloques.push({
      id: `hor-up-${Date.now()}-${r}-${Math.floor(Math.random() * 1000)}`,
      grado: rawGrado.includes('°') ? rawGrado : `${rawGrado}°`,
      grupo: rawGrupo,
      dia: normalizedDia,
      horaInicio,
      horaFin,
      modulo,
      materia: rawMateria,
      maestro: rawDocente,
      aula: rawAula,
      turno: rawTurno.toLowerCase().includes('vesp') ? 'Vespertino' : 'Matutino',
      ciclo: '2026-1'
    });
  }

  return { bloques, errors };
}
