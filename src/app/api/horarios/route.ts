import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PRIMARY_FILE = path.join(process.cwd(), 'data', 'horarios.json');
const TMP_FILE = path.join('/tmp', 'horarios.json');

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

  const tryRead = (filePath: string) => {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const list = JSON.parse(raw || '[]');
        if (Array.isArray(list)) {
          list.forEach(item => {
            if (item && item.grupo && item.dia && item.horaInicio) {
              const key = `${item.grupo}-${item.dia}-${item.horaInicio}`;
              map.set(key, item);
            }
          });
        }
      }
    } catch {
      // Ignore read errors on inaccessible paths
    }
  };

  tryRead(PRIMARY_FILE);
  tryRead(TMP_FILE);

  return Array.from(map.values());
};

const writeLocalData = (data: any[]) => {
  const target = getWritablePath();
  try {
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(target, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    try {
      fs.writeFileSync(TMP_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error escribiendo datos de horarios en disco:', e);
    }
  }
};

export async function GET() {
  try {
    const horarios = readLocalData();
    return NextResponse.json({ success: true, data: horarios });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mode = body.mode || 'replace';
    const incoming: any[] = Array.isArray(body) ? body : (body.horarios || []);

    if (mode === 'replace') {
      writeLocalData(incoming);
      return NextResponse.json({ success: true, data: incoming });
    }

    const existing = readLocalData();
    const map = new Map<string, any>();

    existing.forEach(item => {
      if (item && item.grupo && item.dia && item.horaInicio) {
        map.set(`${item.grupo}-${item.dia}-${item.horaInicio}`, item);
      }
    });

    incoming.forEach(item => {
      if (item && item.grupo && item.dia && item.horaInicio) {
        map.set(`${item.grupo}-${item.dia}-${item.horaInicio}`, item);
      }
    });

    const merged = Array.from(map.values());
    writeLocalData(merged);

    return NextResponse.json({ success: true, data: merged });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

