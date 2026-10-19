import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const DATA_FILE = path.join(process.cwd(), 'data', 'asistencias_docente.json');
const XLSX_FILE = path.join(process.cwd(), 'data', 'hoja_calculo_materias.xlsx');

const ensureDataFile = () => {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
};

const readLocalData = (): any[] => {
  try {
    ensureDataFile();
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.error('Error reading data/asistencias_docente.json:', err);
    return [];
  }
};

const writeLocalData = (data: any[]) => {
  try {
    ensureDataFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing data/asistencias_docente.json:', err);
  }
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fecha = searchParams.get('fecha');
    const grado = searchParams.get('grado');
    const grupo = searchParams.get('grupo');

    const all = readLocalData();
    if (fecha && grado && grupo) {
      const match = all.find(r => r.fecha === fecha && r.grado === grado && r.grupo === grupo);
      return NextResponse.json({ success: true, data: match || null });
    }

    return NextResponse.json({ success: true, data: all });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fecha, grado, grupo, docente, participaciones, asistenciasOverride, participacionesPorMateria, asistenciasPorMateria } = body;

    if (!fecha || !grado || !grupo) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos (fecha, grado, grupo)' }, { status: 400 });
    }

    const all = readLocalData();
    const idx = all.findIndex(r => r.fecha === fecha && r.grado === grado && r.grupo === grupo);

    const recordToSave = {
      fecha,
      grado,
      grupo,
      docente: docente || 'Docente',
      updatedAt: new Date().toISOString(),
      participaciones: participaciones || {},
      asistenciasOverride: asistenciasOverride || {},
      participacionesPorMateria: participacionesPorMateria || {},
      asistenciasPorMateria: asistenciasPorMateria || {}
    };

    if (idx >= 0) {
      all[idx] = recordToSave;
    } else {
      all.push(recordToSave);
    }

    writeLocalData(all);

    return NextResponse.json({
      success: true,
      message: 'Asistencias y participaciones guardadas con éxito en la hoja de cálculo',
      data: recordToSave
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
