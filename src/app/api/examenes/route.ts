import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readExamenes, writeExamenes, getExamenById, saveExamen, deleteExamen } from '@/lib/examenesDb';
import { ExamenData, RecursoEducativo } from '@/lib/recursos';

const PRIMARY_RECURSOS_FILE = path.join(process.cwd(), 'data', 'recursos.json');
const TMP_RECURSOS_FILE = path.join('/tmp', 'recursos.json');

function updateRecursosList(recurso: RecursoEducativo) {
  const tryRead = (filePath: string): RecursoEducativo[] | null => {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return null;
  };

  const list = tryRead(PRIMARY_RECURSOS_FILE) || tryRead(TMP_RECURSOS_FILE) || [];
  const idx = list.findIndex(r => r.id === recurso.id || (r.examenId && r.examenId === recurso.examenId));
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...recurso };
  } else {
    list.unshift(recurso);
  }

  const serialized = JSON.stringify(list, null, 2);
  try {
    fs.writeFileSync(PRIMARY_RECURSOS_FILE, serialized, 'utf-8');
  } catch {
    try {
      fs.writeFileSync(TMP_RECURSOS_FILE, serialized, 'utf-8');
    } catch {}
  }
}

function removeRecursoById(id: string) {
  const tryRead = (filePath: string): RecursoEducativo[] | null => {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return null;
  };

  const list = tryRead(PRIMARY_RECURSOS_FILE) || tryRead(TMP_RECURSOS_FILE) || [];
  const filtered = list.filter(r => r.id !== id && r.examenId !== id);
  const serialized = JSON.stringify(filtered, null, 2);
  try {
    fs.writeFileSync(PRIMARY_RECURSOS_FILE, serialized, 'utf-8');
  } catch {
    try {
      fs.writeFileSync(TMP_RECURSOS_FILE, serialized, 'utf-8');
    } catch {}
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const includeClave = searchParams.get('includeClave') === 'true';

    if (id) {
      const exam = getExamenById(id);
      if (!exam) {
        return NextResponse.json({ success: false, error: 'Examen no encontrado' }, { status: 404 });
      }

      // Si es para alumno (includeClave !== true), ocultar estrictamente la clave de respuestas correctas
      if (!includeClave) {
        const sanitizedPreguntas = exam.preguntas.map(p => {
          const { respuestaCorrecta, explicacion, ...rest } = p;
          return {
            ...rest,
            // Ocultar cualquier indicio de clave en las opciones
            opciones: rest.opciones.map(opt => ({
              inciso: opt.inciso,
              texto: opt.texto
            }))
          };
        });

        return NextResponse.json({
          success: true,
          examen: {
            ...exam,
            preguntas: sanitizedPreguntas,
            isClaveHidden: true
          }
        });
      }

      // Para el maestro o administrador: incluye todas las claves de respuesta
      return NextResponse.json({
        success: true,
        examen: exam,
        isClaveHidden: false
      });
    }

    const all = readExamenes();
    return NextResponse.json({ success: true, examenes: all });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { examen, autorRol, autorEmail, autorNombre } = body || {};

    if (!examen || !Array.isArray(examen.preguntas) || examen.preguntas.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'El examen debe contener al menos una pregunta de opción múltiple con su clave de respuesta.' 
      }, { status: 400 });
    }

    // Regla de seguridad: Alumnos y tutores no pueden crear exámenes
    if (autorRol === 'alumno' || autorRol === 'tutor') {
      return NextResponse.json({ 
        success: false, 
        error: 'Acción no autorizada: Los alumnos no pueden crear ni publicar exámenes.' 
      }, { status: 403 });
    }

    const examId = examen.id || `exam-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const recursoId = examen.recursoId || `rec-exam-${Date.now()}`;

    const newExamen: ExamenData = {
      id: examId,
      recursoId,
      titulo: String(examen.titulo || 'Examen de Evaluación').trim(),
      descripcion: String(examen.descripcion || 'Examen de opción múltiple').trim(),
      semestre: examen.semestre || '1°',
      grupo: examen.grupo || 'TODOS',
      materia: String(examen.materia || 'PENSAMIENTO MATEMÁTICO').trim(),
      docenteNombre: String(autorNombre || examen.docenteNombre || 'Docente CECYTE').trim(),
      docenteEmail: String(autorEmail || examen.docenteEmail || '').trim().toLowerCase(),
      googleFormUrl: examen.googleFormUrl || undefined,
      googleSheetUrl: examen.googleSheetUrl || undefined,
      totalPreguntas: examen.preguntas.length,
      respuestasCount: examen.respuestasCount || 0,
      fechaCreacion: examen.fechaCreacion || new Date().toISOString(),
      preguntas: examen.preguntas.map((p: any, idx: number) => ({
        id: p.id || `p-${idx + 1}-${Math.random().toString(36).substr(2, 4)}`,
        numero: idx + 1,
        texto: String(p.texto || '').trim(),
        opciones: Array.isArray(p.opciones) ? p.opciones.map((o: any) => ({
          inciso: String(o.inciso || 'A').toUpperCase(),
          texto: String(o.texto || '').trim()
        })) : [],
        respuestaCorrecta: String(p.respuestaCorrecta || 'A').toUpperCase(),
        puntos: Number(p.puntos) || 1,
        explicacion: p.explicacion ? String(p.explicacion).trim() : undefined
      }))
    };

    saveExamen(newExamen);

    // Crear recurso educativo correspondiente para aparecer en la lista de recursos
    const nuevoRecurso: RecursoEducativo = {
      id: recursoId,
      examenId: examId,
      titulo: `📝 ${newExamen.titulo}`,
      descripcion: `${newExamen.descripcion || 'Examen interactivo contestado por formulario'} • ${newExamen.totalPreguntas} preguntas de opción múltiple.`,
      tipo: 'examen',
      semestre: newExamen.semestre,
      grupo: newExamen.grupo,
      materia: newExamen.materia,
      autorNombre: newExamen.docenteNombre,
      autorEmail: newExamen.docenteEmail,
      autorRol: 'docente',
      estado: 'aprobado', // Los exámenes creados por docentes entran aprobados
      totalPreguntas: newExamen.totalPreguntas,
      googleFormUrl: newExamen.googleFormUrl,
      googleSheetUrl: newExamen.googleSheetUrl,
      fechaCreacion: newExamen.fechaCreacion,
      vistas: 0
    };

    updateRecursosList(nuevoRecurso);

    return NextResponse.json({
      success: true,
      examen: newExamen,
      recurso: nuevoRecurso,
      message: `¡Examen "${newExamen.titulo}" convertido y publicado exitosamente con ${newExamen.totalPreguntas} preguntas!`
    });

  } catch (err: any) {
    console.error('Error al guardar examen:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID de examen requerido' }, { status: 400 });
    }

    deleteExamen(id);
    removeRecursoById(id);

    return NextResponse.json({ success: true, message: 'Examen eliminado correctamente.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
