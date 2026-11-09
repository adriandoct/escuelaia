import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PRIMARY_FILE = path.join(process.cwd(), 'data', 'roles.json');
const TMP_FILE = path.join('/tmp', 'roles.json');

interface RolesData {
  roles: Record<string, string>;
  passwords: Record<string, string>;
  names: Record<string, string>;
  employeeNumbers: Record<string, string>;
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
  },
  names: {
    'admin@admin.com': 'Super Administrador CECYTE',
    'admin.general@cecytebc.edu.mx': 'Dirección General',
    'orden.general@cecytebc.edu.mx': 'Prefectura General',
    'prefecto.juan@cecytebc.edu.mx': 'Juan Pérez (Prefecto)',
    'docente.marcos@cecytebc.edu.mx': 'Marcos Mendoza',
    'profesora.mariana@cecytebc.edu.mx': 'Mariana Gómez'
  },
  employeeNumbers: {
    'admin@admin.com': 'EMP-0001',
    'admin.general@cecytebc.edu.mx': 'EMP-1001',
    'orden.general@cecytebc.edu.mx': 'EMP-2001',
    'prefecto.juan@cecytebc.edu.mx': 'EMP-2002',
    'docente.marcos@cecytebc.edu.mx': 'EMP-3001',
    'profesora.mariana@cecytebc.edu.mx': 'EMP-3002'
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

const readRolesData = (): RolesData => {
  let data: RolesData = { 
    roles: { ...DEFAULT_DATA.roles },
    passwords: { ...DEFAULT_DATA.passwords },
    names: { ...DEFAULT_DATA.names },
    employeeNumbers: { ...DEFAULT_DATA.employeeNumbers }
  };

  const tryRead = (filePath: string) => {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          data = {
            roles: { ...data.roles, ...(parsed.roles || {}) },
            passwords: { ...data.passwords, ...(parsed.passwords || {}) },
            names: { ...data.names, ...(parsed.names || {}) },
            employeeNumbers: { ...data.employeeNumbers, ...(parsed.employeeNumbers || {}) }
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

const writeRolesData = (data: RolesData) => {
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
    const { action, email, role, password, name, numero_empleado, oldEmail, newEmail } = body || {};

    const current = readRolesData();
    const roles: Record<string, string> = { ...current.roles };
    const passwords: Record<string, string> = { ...current.passwords };
    const names: Record<string, string> = { ...current.names };
    const employeeNumbers: Record<string, string> = { ...current.employeeNumbers };

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
      } else if (numero_empleado && !passwords[cleanEmail]) {
        passwords[cleanEmail] = String(numero_empleado).trim();
      } else if (!passwords[cleanEmail]) {
        passwords[cleanEmail] = 'Cecyte2026!';
      }
      if (name) names[cleanEmail] = String(name).trim();
      if (numero_empleado) employeeNumbers[cleanEmail] = String(numero_empleado).trim();
    } else if (action === 'updateUser') {
      const cleanOld = String(oldEmail || '').trim().toLowerCase();
      const cleanNew = String(newEmail || cleanOld).trim().toLowerCase();
      if (cleanOld && cleanNew) {
        if (cleanOld !== cleanNew) {
          delete roles[cleanOld];
          const prevPass = passwords[cleanOld];
          delete passwords[cleanOld];
          const prevName = names[cleanOld];
          delete names[cleanOld];
          const prevEmpNum = employeeNumbers[cleanOld];
          delete employeeNumbers[cleanOld];

          if (password) {
            passwords[cleanNew] = String(password).trim();
          } else if (prevPass) {
            passwords[cleanNew] = prevPass;
          }
          if (name) {
            names[cleanNew] = String(name).trim();
          } else if (prevName) {
            names[cleanNew] = prevName;
          }
          if (numero_empleado) {
            employeeNumbers[cleanNew] = String(numero_empleado).trim();
          } else if (prevEmpNum) {
            employeeNumbers[cleanNew] = prevEmpNum;
          }
        } else {
          if (password) passwords[cleanNew] = String(password).trim();
          if (name) names[cleanNew] = String(name).trim();
          if (numero_empleado) employeeNumbers[cleanNew] = String(numero_empleado).trim();
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
        delete names[cleanEmail];
        delete employeeNumbers[cleanEmail];
      }
    } else if (action === 'importUsers' && Array.isArray(body.users)) {
      body.users.forEach((u: any) => {
        if (!u || !u.email) return;
        const cleanEmail = String(u.email).trim().toLowerCase();
        if (cleanEmail === 'admin@admin.com') return; // Preservar superadmin

        // Rol
        if (u.role) roles[cleanEmail] = u.role;
        else if (!roles[cleanEmail]) roles[cleanEmail] = 'docente';

        // Nombre
        if (u.name) names[cleanEmail] = String(u.name).trim();

        // Número de Empleado
        if (u.numero_empleado) employeeNumbers[cleanEmail] = String(u.numero_empleado).trim();

        // Contraseña inicial: usar la proporcionada, el número de empleado o Cecyte2026!
        if (u.password) {
          passwords[cleanEmail] = String(u.password).trim();
        } else if (u.numero_empleado && !passwords[cleanEmail]) {
          passwords[cleanEmail] = String(u.numero_empleado).trim();
        } else if (!passwords[cleanEmail]) {
          passwords[cleanEmail] = 'Cecyte2026!';
        }
      });
    } else if (action === 'syncAll' && body.roles) {
      Object.assign(roles, body.roles);
      if (body.passwords) Object.assign(passwords, body.passwords);
      if (body.names) Object.assign(names, body.names);
      if (body.employeeNumbers) Object.assign(employeeNumbers, body.employeeNumbers);
    }

    // Always ensure admin@admin.com remains protected
    roles['admin@admin.com'] = 'administrador';
    if (!passwords['admin@admin.com']) {
      passwords['admin@admin.com'] = '12345678Cecyte';
    }
    if (!names['admin@admin.com']) {
      names['admin@admin.com'] = 'Super Administrador CECYTE';
    }

    const updatedData: RolesData = { roles, passwords, names, employeeNumbers };
    writeRolesData(updatedData);

    return NextResponse.json({ success: true, ...updatedData });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
