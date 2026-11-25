import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import { getExamenById, getRespuestasByExamen, saveRespuestaAlumno } from '@/lib/examenesDb';
import { RespuestaExamenAlumno } from '@/lib/recursos';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const examenId = searchParams.get('examenId');
    const format = searchParams.get('format'); // 'xlsx' | 'csv' | 'json'

    if (!examenId) {
      return NextResponse.json({ success: false, error: 'ID de examen requerido' }, { status: 400 });
    }

    const examen = getExamenById(examenId);
    const respuestas = getRespuestasByExamen(examenId);

    // Calcular estadísticas generales
    const totalAlumnos = respuestas.length;
    const promedio = totalAlumnos > 0
      ? Number((respuestas.reduce((acc, r) => acc + r.calificacion, 0) / totalAlumnos).toFixed(1))
      : 0;
    const aprobados = respuestas.filter(r => r.calificacion >= 6).length;
    const porcentajeAprobacion = totalAlumnos > 0 ? Math.round((aprobados / totalAlumnos) * 100) : 0;
    const mejorCalificacion = totalAlumnos > 0 ? Math.max(...respuestas.map(r => r.calificacion)) : 0;
    const menorCalificacion = totalAlumnos > 0 ? Math.min(...respuestas.map(r => r.calificacion)) : 0;

    // Si se solicita descarga en Excel (.xlsx) tipo Google Sheets
    if (format === 'xlsx') {
      const wb = xlsx.utils.book_new();

      // Hoja 1: Resumen y Calificaciones
      const sheetData = respuestas.map((r, idx) => {
        const row: Record<string, any> = {
          'No.': idx + 1,
          'Marca temporal': `${r.fecha} ${r.hora}`,
          'Matrícula': r.alumnoMatricula,
          'Nombre del Alumno': r.alumnoNombre,
          'Semestre': r.alumnoSemestre,
          'Grupo': r.alumnoGrupo,
          'Calificación (0 - 10)': r.calificacion,
          'Aciertos': `${r.aciertos} / ${r.totalPreguntas}`,
          'Porcentaje (%)': `${r.porcentaje}%`,
          'Resultado': r.calificacion >= 6 ? 'APROBADO' : 'REPROBADO'
        };

        // Agregar desglose de cada pregunta si el examen existe
        if (examen && examen.preguntas) {
          examen.preguntas.forEach((p, pIdx) => {
            const respAlumno = r.respuestas[p.id] || '-';
            const esCorrecta = respAlumno === p.respuestaCorrecta;
            row[`P${pIdx + 1}: (Clave: ${p.respuestaCorrecta})`] = `${respAlumno} ${esCorrecta ? '✓' : '✗'}`;
          });
        }

        return row;
      });

      const ws1 = xlsx.utils.json_to_sheet(sheetData);

      // Ajustar ancho de columnas
      ws1['!cols'] = [
        { wch: 6 },
        { wch: 20 },
        { wch: 18 },
        { wch: 35 },
        { wch: 10 },
        { wch: 10 },
        { wch: 22 },
        { wch: 14 },
        { wch: 15 },
        { wch: 14 }
      ];

      xlsx.utils.book_append_sheet(wb, ws1, 'Resultados Google Sheet');

      // Hoja 2: Estadísticas del Examen
      const statsData = [
        { Métrica: 'Examen', Valor: examen?.titulo || 'Evaluación' },
        { Métrica: 'Materia', Valor: examen?.materia || 'General' },
        { Métrica: 'Docente', Valor: examen?.docenteNombre || 'Docente CECYTE' },
        { Métrica: 'Semestre / Grupo', Valor: `${examen?.semestre || ''} "${examen?.grupo || ''}"` },
        { Métrica: 'Total Alumnos Evaluados', Valor: totalAlumnos },
        { Métrica: 'Promedio General del Grupo', Valor: `${promedio} / 10` },
        { Métrica: 'Alumnos Aprobados (>= 6.0)', Valor: `${aprobados} (${porcentajeAprobacion}%)` },
        { Métrica: 'Alumnos Reprobados (< 6.0)', Valor: `${totalAlumnos - aprobados}` },
        { Métrica: 'Calificación Más Alta', Valor: `${mejorCalificacion} / 10` },
        { Métrica: 'Calificación Más Baja', Valor: `${menorCalificacion} / 10` },
        { Métrica: 'Fecha de Descarga', Valor: new Date().toLocaleString('es-MX') }
      ];
      const ws2 = xlsx.utils.json_to_sheet(statsData);
      ws2['!cols'] = [{ wch: 30 }, { wch: 40 }];
      xlsx.utils.book_append_sheet(wb, ws2, 'Estadísticas Generales');

      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const safeTitle = (examen?.titulo || 'Examen').replace(/[^a-zA-Z0-9_-]/g, '_');

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="GoogleSheets_Resultados_${safeTitle}.xlsx"`
        }
      });
    }

    // Si se solicita en CSV compatible con Google Sheets
    if (format === 'csv') {
      const headers = ['Marca temporal', 'Matricula', 'Nombre Alumno', 'Semestre', 'Grupo', 'Calificacion', 'Aciertos', 'Total Preguntas', 'Porcentaje', 'Estado'];
      const rows = respuestas.map(r => [
        `"${r.fecha} ${r.hora}"`,
        `"${r.alumnoMatricula}"`,
        `"${r.alumnoNombre}"`,
        `"${r.alumnoSemestre}"`,
        `"${r.alumnoGrupo}"`,
        r.calificacion,
        r.aciertos,
        r.totalPreguntas,
        `"${r.porcentaje}%"`,
        `"${r.calificacion >= 6 ? 'APROBADO' : 'REPROBADO'}"`
      ].join(','));

      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="Resultados_Google_Sheets.csv"'
        }
      });
    }

    return NextResponse.json({
      success: true,
      examen,
      respuestas,
      estadisticas: {
        totalAlumnos,
        promedio,
        aprobados,
        porcentajeAprobacion,
        mejorCalificacion,
        menorCalificacion
      }
    });

  } catch (err: any) {
    console.error('Error al obtener respuestas del examen:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { examenId, alumnoMatricula, alumnoNombre, alumnoGrupo, alumnoSemestre, respuestas, tiempoSegundos } = body || {};

    if (!examenId || !alumnoMatricula || !respuestas) {
      return NextResponse.json({ 
        success: false, 
        error: 'Faltan datos obligatorios para registrar el examen (examenId, matrícula y respuestas).' 
      }, { status: 400 });
    }

    const examen = getExamenById(examenId);
    if (!examen) {
      return NextResponse.json({ success: false, error: 'Examen no encontrado en el sistema.' }, { status: 404 });
    }

    // Calificar automáticamente contra la clave guardada por el maestro
    let aciertos = 0;
    const totalPreguntas = examen.preguntas.length;

    examen.preguntas.forEach((p) => {
      const respuestaAlumno = respuestas[p.id];
      if (respuestaAlumno && String(respuestaAlumno).trim().toUpperCase() === String(p.respuestaCorrecta).trim().toUpperCase()) {
        aciertos++;
      }
    });

    const porcentaje = totalPreguntas > 0 ? Math.round((aciertos / totalPreguntas) * 100) : 0;
    // Calificación de 0 a 10 con un decimal
    const calificacion = totalPreguntas > 0 ? Number(((aciertos / totalPreguntas) * 10).toFixed(1)) : 0;

    const now = new Date();
    const fecha = now.toISOString().split('T')[0];
    const hora = now.toTimeString().split(' ')[0];

    const nuevaRespuesta: RespuestaExamenAlumno = {
      id: `resp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      examenId: examen.id,
      recursoId: examen.recursoId,
      alumnoMatricula: String(alumnoMatricula).trim().toUpperCase(),
      alumnoNombre: String(alumnoNombre || 'Alumno CECYTE').trim().toUpperCase(),
      alumnoGrupo: String(alumnoGrupo || examen.grupo).trim().toUpperCase(),
      alumnoSemestre: String(alumnoSemestre || examen.semestre).trim(),
      respuestas,
      aciertos,
      totalPreguntas,
      calificacion,
      porcentaje,
      fecha,
      hora,
      tiempoSegundos: tiempoSegundos || undefined
    };

    saveRespuestaAlumno(nuevaRespuesta);

    return NextResponse.json({
      success: true,
      mensaje: '¡Examen enviado y calificado con éxito!',
      resultado: {
        alumnoMatricula: nuevaRespuesta.alumnoMatricula,
        alumnoNombre: nuevaRespuesta.alumnoNombre,
        aciertos,
        totalPreguntas,
        calificacion,
        porcentaje,
        aprobado: calificacion >= 6,
        fecha,
        hora
      }
    });

  } catch (err: any) {
    console.error('Error al procesar respuesta del examen:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
