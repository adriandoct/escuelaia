import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PRIMARY_FILE = path.join(process.cwd(), 'data', 'alumnos.json');
const TMP_FILE = path.join('/tmp', 'alumnos.json');

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

const readLocalData = (): any[] => {
  const map = new Map<string, any>();

  // Helper to safely parse file
  const tryRead = (filePath: string) => {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const list = JSON.parse(raw || '[]');
        if (Array.isArray(list)) {
          list.forEach(st => {
            if (st && st.matricula) {
              const mat = String(st.matricula).trim();
              if (mat && !map.has(mat)) map.set(mat, st);
            }
          });
        }
      }
    } catch (e) {
      // Ignorar errores de lectura en paths no accesibles
    }
  };

  // Read TMP_FILE first so runtime updates on serverless/Vercel take precedence over static PRIMARY_FILE
  tryRead(TMP_FILE);
  tryRead(PRIMARY_FILE);

  return Array.from(map.values());
};

const writeLocalData = (data: any[]) => {
  const target = getWritablePath();
  try {
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(target, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    try {
      // Fallback a /tmp
      fs.writeFileSync(TMP_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error escribiendo datos de alumnos en disco:', e);
    }
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
    const idx = existing.findIndex(s => s.id === id || s.matricula === id || (updates.matricula && s.matricula === updates.matricula));
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

