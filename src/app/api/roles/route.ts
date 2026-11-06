import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PRIMARY_FILE = path.join(process.cwd(), 'data', 'roles.json');
const TMP_FILE = path.join('/tmp', 'roles.json');

interface RolesData {
  roles: Record<string, string>;
  passwords: Record<string, string>;
}

const DEFAULT_DATA: RolesData = {
  roles: {
    'admin@admin.com': 'administrador',
    'admin.general@cecytebc.edu.mx': 'administrador',
    'orden.general@cecytebc.edu.mx': 'encargado_orden',
    'prefecto.juan@cecytebc.edu.mx': 'encargado_orden',
    'docente.marcos@cecytebc.edu.mx': 'docente',
    'profesora.mariana@cecytebc.edu.mx': 'docente'
  },
  passwords: {
    'admin@admin.com': '12345678Cecyte',
    'admin.general@cecytebc.edu.mx': 'Cecyte2026!',
    'orden.general@cecytebc.edu.mx': 'Cecyte2026!',
    'prefecto.juan@cecytebc.edu.mx': 'Cecyte2026!',
    'docente.marcos@cecytebc.edu.mx': 'Cecyte2026!',
    'profesora.mariana@cecytebc.edu.mx': 'Cecyte2026!'
  }
};

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

const readRolesData = () => {
  let data = { ...DEFAULT_DATA };

  const tryRead = (filePath: string) => {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          data = {
            roles: { ...data.roles, ...(parsed.roles || {}) },
            passwords: { ...data.passwords, ...(parsed.passwords || {}) }
          };
        }
      }
    } catch {
      // Ignorar errores de lectura
    }
  };

  tryRead(PRIMARY_FILE);
  tryRead(TMP_FILE);

  return data;
};

const writeRolesData = (data: typeof DEFAULT_DATA) => {
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
      console.error('Error escribiendo roles en /tmp:', e);
    }
  }
};

export async function GET() {
  try {
    const data = readRolesData();
    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, email, role, password, oldEmail, newEmail } = body || {};

    const current = readRolesData();
    const roles = { ...current.roles };
    const passwords = { ...current.passwords };

    if (action === 'assignRole' && email && role) {
      const cleanEmail = String(email).trim().toLowerCase();
      roles[cleanEmail] = role;
    } else if (action === 'assignPassword' && email && password) {
      const cleanEmail = String(email).trim().toLowerCase();
      passwords[cleanEmail] = String(password).trim();
    } else if (action === 'addUser' && email && role) {
      const cleanEmail = String(email).trim().toLowerCase();
      roles[cleanEmail] = role;
      if (password) {
        passwords[cleanEmail] = String(password).trim();
      }
    } else if (action === 'updateUser') {
      const cleanOld = String(oldEmail || '').trim().toLowerCase();
      const cleanNew = String(newEmail || cleanOld).trim().toLowerCase();
      if (cleanOld && cleanNew) {
        if (cleanOld !== cleanNew) {
          delete roles[cleanOld];
          const prevPass = passwords[cleanOld];
          delete passwords[cleanOld];
          if (password) {
            passwords[cleanNew] = String(password).trim();
          } else if (prevPass) {
            passwords[cleanNew] = prevPass;
          }
        } else if (password) {
          passwords[cleanNew] = String(password).trim();
        }
        if (role) {
          roles[cleanNew] = role;
        }
      }
    } else if (action === 'deleteUser' && email) {
      const cleanEmail = String(email).trim().toLowerCase();
      if (cleanEmail !== 'admin@admin.com') {
        delete roles[cleanEmail];
        delete passwords[cleanEmail];
      }
    } else if (action === 'syncAll' && body.roles) {
      // Merge bulk roles and passwords without deleting existing users
      Object.assign(roles, body.roles);
      if (body.passwords) {
        Object.assign(passwords, body.passwords);
      }
    }

    // Always ensure admin@admin.com remains protected
    roles['admin@admin.com'] = 'administrador';
    if (!passwords['admin@admin.com']) {
      passwords['admin@admin.com'] = '12345678Cecyte';
    }

    const updatedData = { roles, passwords };
    writeRolesData(updatedData);

    return NextResponse.json({ success: true, ...updatedData });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
