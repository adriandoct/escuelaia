"use strict";

export type RecursoTipo = 'pdf' | 'video';
export type RecursoEstado = 'pendiente' | 'aprobado' | 'rechazado';

export interface RecursoEducativo {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: RecursoTipo;
  
  // Archivo PDF
  archivoUrl?: string; // Data URI Base64, blob o URL pública
  archivoNombre?: string;
  archivoTamano?: string;
  
  // Video YouTube
  videoUrl?: string; // Enlace https://www.youtube.com/watch?v=... o https://youtu.be/...
  youtubeId?: string; // ID de 11 caracteres de YouTube
  canalYoutube?: string; // Por defecto: 'cecytecopias@gmail.com'
  duracion?: string;
  
  // Asignación académica obligatoria
  semestre: string; // '1°' | '3°' | '5°' | 'TODOS'
  grupo: string; // 'TODOS' | '1A' | '1B' | '1C' | '1D' | '1E' | '3APGA' | '3BPGA' | '3ASC' | '5APGA' | etc.
  materia: string; // Asignatura o módulo técnico
  
  // Datos del creador / autor
  autorNombre: string;
  autorEmail: string;
  autorRol: 'docente' | 'alumno' | 'administrador' | 'superadmin' | 'administrativo';
  
  // Flujo de validación obligatoria (Administrador / Superadmin)
  estado: RecursoEstado;
  validadoPor?: string;
  fechaValidacion?: string;
  motivoRechazo?: string;
  
  // Auditoría
  fechaCreacion: string;
  vistas?: number;
}

export const CANAL_YOUTUBE_OFICIAL = 'URBIVILLASCECYTE';
export const YOUTUBE_STUDIO_URL = 'https://studio.youtube.com/channel/';
export const YOUTUBE_UPLOAD_DIRECT_URL = 'https://www.youtube.com/upload';

/**
 * Extrae de forma segura el ID de 11 caracteres de cualquier URL de YouTube
 * Admite: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID, youtube.com/embed/ID
 */
export function extractYouTubeId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const cleanUrl = url.trim();

  // Si ya es un ID de 11 caracteres alfanuméricos
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
    return cleanUrl;
  }

  const match = cleanUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i);
  return match ? match[1] : null;
}

/**
 * Genera la URL embed lista para iframe
 */
export function getYouTubeEmbedUrl(youtubeIdOrUrl: string): string {
  const id = extractYouTubeId(youtubeIdOrUrl) || youtubeIdOrUrl;
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
}

/**
 * Genera la miniatura oficial de YouTube en alta definición
 */
export function getYouTubeThumbnail(youtubeIdOrUrl: string): string {
  const id = extractYouTubeId(youtubeIdOrUrl) || youtubeIdOrUrl;
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

/**
 * Genera el enlace canónico para ver en YouTube
 */
export function getYouTubeWatchUrl(youtubeIdOrUrl: string): string {
  const id = extractYouTubeId(youtubeIdOrUrl) || youtubeIdOrUrl;
  return `https://www.youtube.com/watch?v=${id}`;
}

/**
 * Genera un título recomendado para subir el video al canal cecytecopias@gmail.com
 * manteniendo una nomenclatura estándar por semestre y grupo
 */
export function formatYouTubeTitle(semestre: string, grupo: string, materia: string, titulo: string): string {
  const semStr = semestre === 'TODOS' ? 'General' : semestre;
  const grpStr = grupo === 'TODOS' ? 'Todos' : grupo;
  return `[CECYTE BC ${semStr} ${grpStr}] ${materia} - ${titulo}`;
}

const VAULT_RECURSOS_KEY = 'dojoia_recursos_vault';

export function getCachedRecursos(): RecursoEducativo[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(VAULT_RECURSOS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error leyendo recursos del almacenamiento local:', e);
  }
  return [];
}

export function saveCachedRecursos(recursos: RecursoEducativo[]) {
  if (typeof window === 'undefined' || !Array.isArray(recursos)) return;
  try {
    localStorage.setItem(VAULT_RECURSOS_KEY, JSON.stringify(recursos));
  } catch (e) {
    console.error('Error guardando recursos en almacenamiento local:', e);
  }
}

