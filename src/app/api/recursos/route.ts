import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { RecursoEducativo, extractYouTubeId, CANAL_YOUTUBE_OFICIAL } from '@/lib/recursos';

const PRIMARY_FILE = path.join(process.cwd(), 'data', 'recursos.json');
const TMP_FILE = path.join('/tmp', 'recursos.json');

const DEFAULT_RECURSOS: RecursoEducativo[] = [
  {
    id: 'rec-001',
    titulo: 'Guía Práctica de Pensamiento Matemático I - Ecuaciones Lineales',
    descripcion: 'Compendio de ejercicios resueltos y problemas de aplicación para el primer parcial de Pensamiento Matemático.',
    tipo: 'pdf',
    archivoUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    archivoNombre: 'Guia_Pensamiento_Matematico_1er_Semestre.pdf',
    archivoTamano: '1.8 MB',
    semestre: '1°',
    grupo: '1A',
    materia: 'PENSAMIENTO MATEMÁTICO',
    autorNombre: 'MARCOS MENDOZA',
    autorEmail: 'docente.marcos@cecytebc.edu.mx',
    autorRol: 'docente',
    estado: 'aprobado',
    validadoPor: 'admin@admin.com',
    fechaValidacion: '2026-11-10T14:30:00Z',
    fechaCreacion: '2026-11-10T12:00:00Z',
    vistas: 42
  },
  {
    id: 'rec-002',
    titulo: 'Video Tutorial: Cálculo de Costos Prorrateados e Inventarios',
    descripcion: 'Explicación detallada paso a paso para el registro de inventarios perpetuos y cálculo de costos de producción en empresas maquiladoras.',
    tipo: 'video',
    videoUrl: 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
    youtubeId: 'ScMzIvxBSi4',
    canalYoutube: 'cecytecopias@gmail.com',
    duracion: '14:25 min',
    semestre: '3°',
    grupo: '3APGA',
    materia: 'SUB. 2 ASISTE EN EL CÁLCULO DE COSTOS',
    autorNombre: 'NORMAN ROY CÁRDENAS OSUNA',
    autorEmail: 'normanroy.cardenas@cecytebc.edu.mx',
    autorRol: 'docente',
    estado: 'aprobado',
    validadoPor: 'admin@admin.com',
    fechaValidacion: '2026-11-12T10:15:00Z',
    fechaCreacion: '2026-11-12T09:00:00Z',
    vistas: 68
  },
  {
    id: 'rec-003',
    titulo: 'Antología de Lengua y Comunicación III - Ensayo Argumentativo',
    descripcion: 'Estructura, conectores discursivos y rúbrica oficial para la elaboración del ensayo final del semestre.',
    tipo: 'pdf',
    archivoUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    archivoNombre: 'Antologia_Lengua_Comunicacion_3.pdf',
    archivoTamano: '2.4 MB',
    semestre: '3°',
    grupo: '3BPGA',
    materia: 'LENGUA Y COMUNICACIÓN',
    autorNombre: 'MARIANA GÓMEZ',
    autorEmail: 'profesora.mariana@cecytebc.edu.mx',
    autorRol: 'docente',
    estado: 'aprobado',
    validadoPor: 'admin@admin.com',
    fechaValidacion: '2026-11-13T16:00:00Z',
    fechaCreacion: '2026-11-13T15:20:00Z',
    vistas: 35
  },
  {
    id: 'rec-004',
    titulo: 'Video Clase: Método de Valuación PEPS y Promedio Ponderado',
    descripcion: 'Video subido al canal institucional cecytecopias@gmail.com para el registro en tarjetas de almacén con ejemplos reales.',
    tipo: 'video',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    youtubeId: 'dQw4w9WgXcQ',
    canalYoutube: 'cecytecopias@gmail.com',
    duracion: '18:50 min',
    semestre: '3°',
    grupo: '3ASC',
    materia: 'CONTROL DE INVENTARIOS',
    autorNombre: 'MARTÍN ERNESTO FLORES AGUIRRE',
    autorEmail: 'maquirre@cecytebc.edu.mx',
    autorRol: 'docente',
    estado: 'pendiente',
    fechaCreacion: '2026-11-15T18:10:00Z',
    vistas: 0
  },
  {
    id: 'rec-005',
    titulo: 'Manual de Prácticas de Ciencias Naturales y Reacciones Químicas',
    descripcion: 'Guía de laboratorio para medidas de seguridad y balanceo de ecuaciones por tanteo y redox.',
    tipo: 'pdf',
    archivoUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    archivoNombre: 'Manual_Laboratorio_Quimica_1.pdf',
    archivoTamano: '3.1 MB',
    semestre: '1°',
    grupo: '1B',
    materia: 'CIENCIAS NATURALES',
    autorNombre: 'LUCÍA EDITH LOERA LARRAÑÁGA',
    autorEmail: 'luciaedith.loera@cecytebc.edu.mx',
    autorRol: 'docente',
    estado: 'pendiente',
    fechaCreacion: '2026-11-15T19:00:00Z',
    vistas: 0
  }
];

const getWritablePath = () => {
  try {
    const dir = path.dirname(PRIMARY_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return PRIMARY_FILE;
  } catch {
    return TMP_FILE;
  }
};

const readRecursos = (): RecursoEducativo[] => {
  const tryRead = (filePath: string): RecursoEducativo[] | null => {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignorar errores de lectura
    }
    return null;
  };

  const primary = tryRead(PRIMARY_FILE);
  if (primary && primary.length > 0) return primary;

  const tmp = tryRead(TMP_FILE);
  if (tmp && tmp.length > 0) return tmp;

  return DEFAULT_RECURSOS;
};

const writeRecursos = (data: RecursoEducativo[]) => {
  const target = getWritablePath();
  const serialized = JSON.stringify(data, null, 2);
  try {
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(target, serialized, 'utf-8');
  } catch {
    try {
      fs.writeFileSync(TMP_FILE, serialized, 'utf-8');
    } catch (e) {
      console.error('Error escribiendo recursos en /tmp:', e);
    }
  }
};

export async function GET() {
  try {
    const recursos = readRecursos();
    return NextResponse.json({ success: true, recursos });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, recurso, id, validadoPor, motivoRechazo } = body || {};

    const recursos = readRecursos();

    if (action === 'create' && recurso) {
      const isAutoApproved = recurso.autorRol === 'administrador' || recurso.autorRol === 'superadmin';
      
      let youtubeId = recurso.youtubeId;
      if (recurso.tipo === 'video' && recurso.videoUrl && !youtubeId) {
        youtubeId = extractYouTubeId(recurso.videoUrl) || undefined;
      }

      const nuevo: RecursoEducativo = {
        id: recurso.id || `rec-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        titulo: String(recurso.titulo || 'Recurso Educativo').trim(),
        descripcion: String(recurso.descripcion || '').trim(),
        tipo: recurso.tipo === 'video' ? 'video' : 'pdf',
        archivoUrl: recurso.archivoUrl || undefined,
        archivoNombre: recurso.archivoNombre || undefined,
        archivoTamano: recurso.archivoTamano || undefined,
        videoUrl: recurso.videoUrl || undefined,
        youtubeId: youtubeId,
        canalYoutube: recurso.canalYoutube || CANAL_YOUTUBE_OFICIAL,
        duracion: recurso.duracion || undefined,
        semestre: recurso.semestre || '1°',
        grupo: recurso.grupo || 'TODOS',
        materia: String(recurso.materia || 'General').trim(),
        autorNombre: String(recurso.autorNombre || 'Docente CECYTE').trim(),
        autorEmail: String(recurso.autorEmail || '').trim().toLowerCase(),
        autorRol: recurso.autorRol || 'docente',
        estado: isAutoApproved ? 'aprobado' : 'pendiente',
        validadoPor: isAutoApproved ? (validadoPor || recurso.autorEmail) : undefined,
        fechaValidacion: isAutoApproved ? new Date().toISOString() : undefined,
        fechaCreacion: new Date().toISOString(),
        vistas: 0
      };

      recursos.unshift(nuevo);
      writeRecursos(recursos);

      return NextResponse.json({ 
        success: true, 
        recurso: nuevo, 
        message: isAutoApproved 
          ? 'Recurso aprobado y publicado de inmediato por el Administrador.' 
          : 'Recurso subido exitosamente. Ha quedado en estado PENDIENTE de validación por el Administrador/Superadmin.' 
      });
    }

    if (action === 'approve' && id) {
      const idx = recursos.findIndex(r => r.id === id);
      if (idx === -1) {
        return NextResponse.json({ success: false, error: 'Recurso no encontrado' }, { status: 404 });
      }

      recursos[idx].estado = 'aprobado';
      recursos[idx].validadoPor = validadoPor || 'Administrador CECYTE';
      recursos[idx].fechaValidacion = new Date().toISOString();
      delete recursos[idx].motivoRechazo;

      writeRecursos(recursos);
      return NextResponse.json({ success: true, recurso: recursos[idx], message: '¡Recurso aprobado y publicado oficialmente!' });
    }

    if (action === 'reject' && id) {
      const idx = recursos.findIndex(r => r.id === id);
      if (idx === -1) {
        return NextResponse.json({ success: false, error: 'Recurso no encontrado' }, { status: 404 });
      }

      recursos[idx].estado = 'rechazado';
      recursos[idx].validadoPor = validadoPor || 'Administrador CECYTE';
      recursos[idx].fechaValidacion = new Date().toISOString();
      recursos[idx].motivoRechazo = motivoRechazo || 'El contenido no cumple con los requerimientos académicos del plantel.';

      writeRecursos(recursos);
      return NextResponse.json({ success: true, recurso: recursos[idx], message: 'Recurso marcado como rechazado.' });
    }

    if (action === 'delete' && id) {
      const filtered = recursos.filter(r => r.id !== id);
      writeRecursos(filtered);
      return NextResponse.json({ success: true, message: 'Recurso eliminado del repositorio.' });
    }

    if (action === 'incrementViews' && id) {
      const idx = recursos.findIndex(r => r.id === id);
      if (idx !== -1) {
        recursos[idx].vistas = (recursos[idx].vistas || 0) + 1;
        writeRecursos(recursos);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Acción no válida' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
