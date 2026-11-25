import fs from 'fs';
import path from 'path';
import { ExamenData, RespuestaExamenAlumno } from './recursos';

const PRIMARY_EXAMENES_FILE = path.join(process.cwd(), 'data', 'examenes.json');
const TMP_EXAMENES_FILE = path.join('/tmp', 'examenes.json');

const PRIMARY_RESPUESTAS_FILE = path.join(process.cwd(), 'data', 'examenes_respuestas.json');
const TMP_RESPUESTAS_FILE = path.join('/tmp', 'examenes_respuestas.json');

const DEFAULT_EXAMENES: ExamenData[] = [
  {
    id: 'exam-001',
    recursoId: 'rec-exam-001',
    titulo: 'Examen Parcial: Cálculo de Costos y Prorrateo',
    descripcion: 'Evaluación de opción múltiple con clave sobre registro de inventarios perpetuos y cálculo de costos de producción.',
    semestre: '3°',
    grupo: '3APGA',
    materia: 'SUB. 2 ASISTE EN EL CÁLCULO DE COSTOS',
    docenteNombre: 'NORMAN ROY CÁRDENAS OSUNA',
    docenteEmail: 'normanroy.cardenas@cecytebc.edu.mx',
    fechaCreacion: '2026-11-20T10:00:00Z',
    googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLScCEC_EXAMPLE/viewform',
    googleSheetUrl: 'https://docs.google.com/spreadsheets/d/1CEC_EXAMPLE_SHEET/edit',
    totalPreguntas: 5,
    respuestasCount: 3,
    preguntas: [
      {
        id: 'p-1',
        numero: 1,
        texto: '¿Cuál es el objetivo principal del sistema de inventarios perpetuos en una empresa manufacturera?',
        opciones: [
          { inciso: 'A', texto: 'Contar físicamente la mercancía únicamente al final del año fiscal.' },
          { inciso: 'B', texto: 'Conocer en cualquier momento el valor de las existencias y el costo de lo vendido en tiempo real.' },
          { inciso: 'C', texto: 'Reducir el pago de impuestos estatales mediante deducciones no comprobadas.' },
          { inciso: 'D', texto: 'Eliminar el registro de mermas y desperdicios de almacén.' }
        ],
        respuestaCorrecta: 'B',
        puntos: 2
      },
      {
        id: 'p-2',
        numero: 2,
        texto: 'En el método PEPS (Primeras Entradas, Primeras Salidas), las mercancías que se venden se valúan a:',
        opciones: [
          { inciso: 'A', texto: 'Los precios de adquisición más recientes en el mercado.' },
          { inciso: 'B', texto: 'El promedio ponderado de todas las compras del mes.' },
          { inciso: 'C', texto: 'Los precios de las primeras compras efectuadas que aún están en existencia.' },
          { inciso: 'D', texto: 'El precio de reposición cotizado por el proveedor.' }
        ],
        respuestaCorrecta: 'C',
        puntos: 2
      },
      {
        id: 'p-3',
        numero: 3,
        texto: '¿Qué cuenta contable se acredita cuando se registra una salida de materia prima del almacén a producción?',
        opciones: [
          { inciso: 'A', texto: 'Almacén de Materias Primas' },
          { inciso: 'B', texto: 'Producción en Proceso' },
          { inciso: 'C', texto: 'Costo de Ventas' },
          { inciso: 'D', texto: 'Proveedores Nacionales' }
        ],
        respuestaCorrecta: 'A',
        puntos: 2
      },
      {
        id: 'p-4',
        numero: 4,
        texto: 'El prorrateo primario de costos indirectos de fabricación consiste en:',
        opciones: [
          { inciso: 'A', texto: 'Distribuir los costos de los departamentos de servicio a los departamentos productivos.' },
          { inciso: 'B', texto: 'Asignar los costos indirectos generales entre todos los centros de costos o departamentos.' },
          { inciso: 'C', texto: 'Aplicar el margen de utilidad esperado sobre el precio de lista al cliente.' },
          { inciso: 'D', texto: 'Calcular los sueldos y salarios directos del personal obrero.' }
        ],
        respuestaCorrecta: 'B',
        puntos: 2
      },
      {
        id: 'p-5',
        numero: 5,
        texto: 'Si el inventario inicial es de $50,000, las compras netas son de $120,000 y el inventario final es de $40,000, ¿cuál es el costo de ventas?',
        opciones: [
          { inciso: 'A', texto: '$110,000' },
          { inciso: 'B', texto: '$120,000' },
          { inciso: 'C', texto: '$130,000' },
          { inciso: 'D', texto: '$140,000' }
        ],
        respuestaCorrecta: 'C',
        puntos: 2
      }
    ]
  }
];

const DEFAULT_RESPUESTAS: RespuestaExamenAlumno[] = [
  {
    id: 'resp-001',
    examenId: 'exam-001',
    recursoId: 'rec-exam-001',
    alumnoMatricula: '24402080280001',
    alumnoNombre: 'CARLOS ALBERTO MARTÍNEZ RÍOS',
    alumnoGrupo: '3APGA',
    alumnoSemestre: '3°',
    respuestas: {
      'p-1': 'B',
      'p-2': 'C',
      'p-3': 'A',
      'p-4': 'B',
      'p-5': 'C'
    },
    aciertos: 5,
    totalPreguntas: 5,
    calificacion: 10,
    porcentaje: 100,
    fecha: '2026-11-21',
    hora: '11:15:30',
    tiempoSegundos: 420
  },
  {
    id: 'resp-002',
    examenId: 'exam-001',
    recursoId: 'rec-exam-001',
    alumnoMatricula: '24402080280002',
    alumnoNombre: 'MARÍA FERNANDA SÁNCHEZ LÓPEZ',
    alumnoGrupo: '3APGA',
    alumnoSemestre: '3°',
    respuestas: {
      'p-1': 'B',
      'p-2': 'C',
      'p-3': 'B',
      'p-4': 'B',
      'p-5': 'C'
    },
    aciertos: 4,
    totalPreguntas: 5,
    calificacion: 8,
    porcentaje: 80,
    fecha: '2026-11-21',
    hora: '11:32:10',
    tiempoSegundos: 580
  },
  {
    id: 'resp-003',
    examenId: 'exam-001',
    recursoId: 'rec-exam-001',
    alumnoMatricula: '24402080280003',
    alumnoNombre: 'JORGE LUIS GUTIÉRREZ HERNÁNDEZ',
    alumnoGrupo: '3APGA',
    alumnoSemestre: '3°',
    respuestas: {
      'p-1': 'B',
      'p-2': 'A',
      'p-3': 'A',
      'p-4': 'B',
      'p-5': 'C'
    },
    aciertos: 4,
    totalPreguntas: 5,
    calificacion: 8,
    porcentaje: 80,
    fecha: '2026-11-21',
    hora: '12:05:44',
    tiempoSegundos: 630
  }
];

function getWritablePath(primary: string, tmp: string): string {
  try {
    const dir = path.dirname(primary);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return primary;
  } catch {
    return tmp;
  }
}

export function readExamenes(): ExamenData[] {
  const tryRead = (filePath: string): ExamenData[] | null => {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return null;
  };

  const primary = tryRead(PRIMARY_EXAMENES_FILE);
  if (primary && primary.length > 0) return primary;

  const tmp = tryRead(TMP_EXAMENES_FILE);
  if (tmp && tmp.length > 0) return tmp;

  return DEFAULT_EXAMENES;
}

export function writeExamenes(data: ExamenData[]) {
  const target = getWritablePath(PRIMARY_EXAMENES_FILE, TMP_EXAMENES_FILE);
  const serialized = JSON.stringify(data, null, 2);
  try {
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(target, serialized, 'utf-8');
  } catch {
    try {
      fs.writeFileSync(TMP_EXAMENES_FILE, serialized, 'utf-8');
    } catch (e) {
      console.error('Error escribiendo examenes en /tmp:', e);
    }
  }
}

export function getExamenById(id: string): ExamenData | null {
  const list = readExamenes();
  return list.find(e => e.id === id || e.recursoId === id) || null;
}

export function saveExamen(examen: ExamenData): ExamenData {
  const list = readExamenes();
  const idx = list.findIndex(e => e.id === examen.id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...examen };
  } else {
    list.unshift(examen);
  }
  writeExamenes(list);
  return examen;
}

export function deleteExamen(id: string): boolean {
  const list = readExamenes();
  const filtered = list.filter(e => e.id !== id && e.recursoId !== id);
  writeExamenes(filtered);
  return filtered.length < list.length;
}

export function readRespuestas(): RespuestaExamenAlumno[] {
  const tryRead = (filePath: string): RespuestaExamenAlumno[] | null => {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return null;
  };

  const primary = tryRead(PRIMARY_RESPUESTAS_FILE);
  if (primary && primary.length > 0) return primary;

  const tmp = tryRead(TMP_RESPUESTAS_FILE);
  if (tmp && tmp.length > 0) return tmp;

  return DEFAULT_RESPUESTAS;
}

export function writeRespuestas(data: RespuestaExamenAlumno[]) {
  const target = getWritablePath(PRIMARY_RESPUESTAS_FILE, TMP_RESPUESTAS_FILE);
  const serialized = JSON.stringify(data, null, 2);
  try {
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(target, serialized, 'utf-8');
  } catch {
    try {
      fs.writeFileSync(TMP_RESPUESTAS_FILE, serialized, 'utf-8');
    } catch (e) {
      console.error('Error escribiendo respuestas de examen en /tmp:', e);
    }
  }
}

export function getRespuestasByExamen(examenId: string): RespuestaExamenAlumno[] {
  const all = readRespuestas();
  return all.filter(r => r.examenId === examenId || r.recursoId === examenId);
}

export function saveRespuestaAlumno(respuesta: RespuestaExamenAlumno): RespuestaExamenAlumno {
  const all = readRespuestas();
  // Si el alumno ya contestó este examen, actualizar su calificación
  const idx = all.findIndex(r => 
    (r.examenId === respuesta.examenId || r.recursoId === respuesta.recursoId) &&
    r.alumnoMatricula.toLowerCase() === respuesta.alumnoMatricula.toLowerCase()
  );

  if (idx >= 0) {
    all[idx] = { ...all[idx], ...respuesta };
  } else {
    all.unshift(respuesta);
  }

  writeRespuestas(all);

  // Actualizar contador en el examen
  const examenes = readExamenes();
  const examIdx = examenes.findIndex(e => e.id === respuesta.examenId || e.recursoId === respuesta.recursoId);
  if (examIdx >= 0) {
    const totalRespuestas = all.filter(r => r.examenId === examenes[examIdx].id).length;
    examenes[examIdx].respuestasCount = totalRespuestas;
    writeExamenes(examenes);
  }

  return respuesta;
}
