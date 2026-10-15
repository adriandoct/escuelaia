import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'alumnos.json');

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
    console.error('Error reading data/alumnos.json:', err);
    return [];
  }
};

const writeLocalData = (data: any[]) => {
  try {
    ensureDataFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing data/alumnos.json:', err);
  }
};

export async function GET() {
  try {
    const students = readLocalData();
    return NextResponse.json({ success: true, data: students });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const incoming: any[] = Array.isArray(body) ? body : (body.alumnos || [body]);
    
    const existing = readLocalData();
    const map = new Map<string, any>();

    // Index existing
    existing.forEach((st) => {
      if (st && st.matricula !== undefined && st.matricula !== null) {
        const matKey = String(st.matricula).trim();
        if (matKey) map.set(matKey, { ...st, matricula: matKey });
      }
    });

    // Merge incoming without erasing
    incoming.forEach((st) => {
      if (st && st.matricula !== undefined && st.matricula !== null) {
        const matKey = String(st.matricula).trim();
        if (matKey && !map.has(matKey)) {
          map.set(matKey, {
            ...st,
            id: st.id ? String(st.id) : `student-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            matricula: matKey,
            qr_code: st.qr_code ? String(st.qr_code).trim() : matKey,
            created_at: st.created_at || new Date().toISOString()
          });
        }
      }
    });

    const merged = Array.from(map.values());
    writeLocalData(merged);

    return NextResponse.json({ success: true, data: merged });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'Missing student ID' }, { status: 400 });

    const existing = readLocalData();
    const idx = existing.findIndex(s => s.id === id);
    if (idx === -1) return NextResponse.json({ error: 'Student not found' }, { status: 400 });

    existing[idx] = { ...existing[idx], ...updates };
    writeLocalData(existing);

    return NextResponse.json({ success: true, data: existing[idx] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const all = searchParams.get('all');

    if (all === 'true') {
      writeLocalData([]);
      return NextResponse.json({ success: true, count: 0, message: 'Base de datos de alumnos vaciada con éxito' });
    }

    if (!id) return NextResponse.json({ error: 'Missing ID or parameter all=true' }, { status: 400 });

    const existing = readLocalData();
    const filtered = existing.filter(s => s.id !== id);
    writeLocalData(filtered);

    return NextResponse.json({ success: true, data: filtered });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

