import { createClient } from '@supabase/supabase-js';

// Types
export interface Alumno {
  id: string;
  matricula: string;
  nombre: string;
  grado: string;
  grupo: string;
  tutor: string;
  telefono: string;
  foto_url?: string;
  qr_code: string;
  created_at?: string;
}

export interface Asistencia {
  id: string;
  alumno_id: string;
  tipo: 'entrada' | 'salida';
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:MM:SS
  dispositivo?: string;
  ubicacion?: string;
  escaneado_por?: string;
  created_at?: string;
  alumno?: Alumno; // Populated join
}

// Environment variables check
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const isSupabaseConfigured = supabaseUrl && supabaseAnonKey;

// Supabase client instance (or null)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Initial pre-seeded mock students with Unsplash avatars
const MOCK_ALUMNOS: Alumno[] = [
  {
    id: 'student-1',
    matricula: 'DOJ-2026-001',
    nombre: 'Carlos Martínez López',
    grado: '1°',
    grupo: 'A',
    tutor: 'Sra. Mariana López',
    telefono: '+525512345678',
    foto_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=200&h=200',
    qr_code: 'DOJ-2026-001',
    created_at: new Date().toISOString()
  },
  {
    id: 'student-2',
    matricula: 'DOJ-2026-002',
    nombre: 'Sofía Herrera Díaz',
    grado: '2°',
    grupo: 'B',
    tutor: 'Sr. Roberto Herrera',
    telefono: '+525523456789',
    foto_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200&h=200',
    qr_code: 'DOJ-2026-002',
    created_at: new Date().toISOString()
  },
  {
    id: 'student-3',
    matricula: 'DOJ-2026-003',
    nombre: 'Mateo Ramírez Gómez',
    grado: '3°',
    grupo: 'A',
    tutor: 'Sra. Patricia Gómez',
    telefono: '+525534567890',
    foto_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200&h=200',
    qr_code: 'DOJ-2026-003',
    created_at: new Date().toISOString()
  },
  {
    id: 'student-4',
    matricula: 'DOJ-2026-004',
    nombre: 'Valentina Castro Vega',
    grado: '1°',
    grupo: 'B',
    tutor: 'Sr. Fernando Castro',
    telefono: '+525545678901',
    foto_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200&h=200',
    qr_code: 'DOJ-2026-004',
    created_at: new Date().toISOString()
  },
  {
    id: 'student-5',
    matricula: 'DOJ-2026-005',
    nombre: 'Sebastián Ortiz Flores',
    grado: '2°',
    grupo: 'A',
    tutor: 'Sra. Carmen Flores',
    telefono: '+525556789012',
    foto_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200',
    qr_code: 'DOJ-2026-005',
    created_at: new Date().toISOString()
  }
];

// Helper to initialize local storage
const initLocalStorage = () => {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem('dojoia_alumnos')) {
    localStorage.setItem('dojoia_alumnos', JSON.stringify(MOCK_ALUMNOS));
  }

  if (!localStorage.getItem('dojoia_asistencias')) {
    // Seed some mock check-ins for today and yesterday
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const formatD = (d: Date) => d.toISOString().split('T')[0];

    const mockAsistencias: Asistencia[] = [
      {
        id: 'log-1',
        alumno_id: 'student-1',
        tipo: 'entrada',
        fecha: formatD(yesterday),
        hora: '07:12:15',
        dispositivo: 'Tablet Acceso Principal',
        ubicacion: 'Entrada Sur',
        escaneado_por: 'Prefecto Juan',
        created_at: `${formatD(yesterday)}T07:12:15.000Z`
      },
      {
        id: 'log-2',
        alumno_id: 'student-1',
        tipo: 'salida',
        fecha: formatD(yesterday),
        hora: '13:48:32',
        dispositivo: 'Tablet Acceso Principal',
        ubicacion: 'Entrada Sur',
        escaneado_por: 'Prefecto Juan',
        created_at: `${formatD(yesterday)}T13:48:32.000Z`
      },
      {
        id: 'log-3',
        alumno_id: 'student-2',
        tipo: 'entrada',
        fecha: formatD(yesterday),
        hora: '07:22:40',
        dispositivo: 'Celular Caseta',
        ubicacion: 'Caseta 1',
        escaneado_por: 'Seguridad Pedro',
        created_at: `${formatD(yesterday)}T07:22:40.000Z`
      },
      {
        id: 'log-4',
        alumno_id: 'student-3',
        tipo: 'entrada',
        fecha: formatD(today),
        hora: '07:05:12',
        dispositivo: 'Tablet Acceso Principal',
        ubicacion: 'Entrada Principal',
        escaneado_por: 'Prefecto Juan',
        created_at: `${formatD(today)}T07:05:12.000Z`
      },
      {
        id: 'log-5',
        alumno_id: 'student-4',
        tipo: 'entrada',
        fecha: formatD(today),
        hora: '07:38:20', // Late
        dispositivo: 'Tablet Acceso Principal',
        ubicacion: 'Entrada Principal',
        escaneado_por: 'Prefecto Juan',
        created_at: `${formatD(today)}T07:38:20.000Z`
      }
    ];

    localStorage.setItem('dojoia_asistencias', JSON.stringify(mockAsistencias));
  }
};

// Database API Implementation
export const db = {
  isSandboxMode: () => {
    return !isSupabaseConfigured;
  },

  // Alumnos operations
  getAlumnos: async (): Promise<Alumno[]> => {
    if (supabase) {
      const { data, error } = await supabase
        .from('alumnos')
        .select('*')
        .order('nombre', { ascending: true });
      if (error) throw error;
      return data || [];
    } else {
      initLocalStorage();
      const raw = localStorage.getItem('dojoia_alumnos');
      const list: Alumno[] = raw ? JSON.parse(raw) : [];
      return list.sort((a, b) => a.nombre.localeCompare(b.nombre));
    }
  },

  getAlumnoByQR: async (qrCode: string): Promise<Alumno | null> => {
    if (supabase) {
      const { data, error } = await supabase
        .from('alumnos')
        .select('*')
        .eq('qr_code', qrCode)
        .maybeSingle();
      if (error) throw error;
      return data;
    } else {
      initLocalStorage();
      const list = await db.getAlumnos();
      return list.find(a => a.qr_code === qrCode || a.matricula === qrCode) || null;
    }
  },

  addAlumno: async (alumno: Omit<Alumno, 'id' | 'created_at'>): Promise<Alumno> => {
    if (supabase) {
      const { data, error } = await supabase
        .from('alumnos')
        .insert([{ ...alumno }])
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      initLocalStorage();
      const list = await db.getAlumnos();
      const newAlumno: Alumno = {
        ...alumno,
        id: `student-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        created_at: new Date().toISOString()
      };
      list.push(newAlumno);
      localStorage.setItem('dojoia_alumnos', JSON.stringify(list));
      return newAlumno;
    }
  },

  addAlumnosBulk: async (alumnos: Omit<Alumno, 'id' | 'created_at'>[]): Promise<Alumno[]> => {
    if (supabase) {
      const { data, error } = await supabase
        .from('alumnos')
        .insert(alumnos)
        .select();
      if (error) throw error;
      return data || [];
    } else {
      initLocalStorage();
      const list = await db.getAlumnos();
      const added: Alumno[] = [];
      
      alumnos.forEach((al, idx) => {
        const newAlumno: Alumno = {
          ...al,
          id: `student-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
          created_at: new Date().toISOString()
        };
        list.push(newAlumno);
        added.push(newAlumno);
      });
      
      localStorage.setItem('dojoia_alumnos', JSON.stringify(list));
      return added;
    }
  },

  updateAlumno: async (id: string, updates: Partial<Omit<Alumno, 'id' | 'created_at'>>): Promise<Alumno> => {
    if (supabase) {
      const { data, error } = await supabase
        .from('alumnos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      initLocalStorage();
      const list = await db.getAlumnos();
      const idx = list.findIndex(a => a.id === id);
      if (idx === -1) throw new Error('Student not found');
      const updated: Alumno = { ...list[idx], ...updates };
      list[idx] = updated;
      localStorage.setItem('dojoia_alumnos', JSON.stringify(list));
      return updated;
    }
  },

  deleteAlumno: async (id: string): Promise<boolean> => {
    if (supabase) {
      const { error } = await supabase
        .from('alumnos')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    } else {
      initLocalStorage();
      let list = await db.getAlumnos();
      const initialLen = list.length;
      list = list.filter(a => a.id !== id);
      localStorage.setItem('dojoia_alumnos', JSON.stringify(list));
      
      // Also delete related asistencias
      let asistencias = await db.getAsistencias();
      asistencias = asistencias.filter(a => a.alumno_id !== id);
      localStorage.setItem('dojoia_asistencias', JSON.stringify(asistencias));

      return list.length < initialLen;
    }
  },

  // Asistencia operations
  getAsistencias: async (): Promise<Asistencia[]> => {
    if (supabase) {
      const { data, error } = await supabase
        .from('asistencias')
        .select('*, alumnos(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Map supabase response to our join structure
      return (data || []).map((row: any) => ({
        ...row,
        alumno: row.alumnos // Map joined field
      }));
    } else {
      initLocalStorage();
      const raw = localStorage.getItem('dojoia_asistencias');
      const list: Asistencia[] = raw ? JSON.parse(raw) : [];
      const alumnos = await db.getAlumnos();
      
      // Resolve alumno relationship
      const enriched = list.map(item => ({
        ...item,
        alumno: alumnos.find(al => al.id === item.alumno_id)
      }));
      
      return enriched.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
    }
  },

  registrarAsistencia: async (
    matricula: string,
    tipoOverride?: 'entrada' | 'salida',
    dispositivo = 'Escaner Web',
    ubicacion = 'Acceso Principal',
    escaneadoPor = 'Admin'
  ): Promise<{ asistencia: Asistencia; alumno: Alumno; duplicateWarning: boolean }> => {
    // 1. Find student
    const alumno = await db.getAlumnoByQR(matricula);
    if (!alumno) {
      throw new Error(`Estudiante con matrícula/QR '${matricula}' no registrado.`);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0]; // HH:MM:SS

    // 2. Fetch all logs for today to determine entry vs exit (if not overridden) and check for duplicate scans
    const allAsistencias = await db.getAsistencias();
    const todayLogsForStudent = allAsistencias.filter(
      log => log.alumno_id === alumno.id && log.fecha === todayStr
    );

    // Security check: Check if scanned within last 30 seconds (prevent duplicate fast double-scans)
    const now = new Date();
    const duplicateWarning = todayLogsForStudent.some(log => {
      const logTime = new Date(`${log.fecha}T${log.hora}`);
      const diffMs = Math.abs(now.getTime() - logTime.getTime());
      return diffMs < 30000; // 30 seconds threshold
    });

    // Determine type: alternate entries/exits, or use override
    let tipo: 'entrada' | 'salida' = 'entrada';
    if (tipoOverride) {
      tipo = tipoOverride;
    } else if (todayLogsForStudent.length > 0) {
      // If the last log today was "entrada", this is a "salida" and vice-versa
      // Sort today's logs chronologically
      const sortedTodayLogs = [...todayLogsForStudent].sort(
        (a, b) => new Date(`${a.fecha}T${a.hora}`).getTime() - new Date(`${b.fecha}T${b.hora}`).getTime()
      );
      const lastLog = sortedTodayLogs[sortedTodayLogs.length - 1];
      tipo = lastLog.tipo === 'entrada' ? 'salida' : 'entrada';
    }

    // 3. Save entry
    let asistenciaData: Asistencia;

    if (supabase) {
      const { data, error } = await supabase
        .from('asistencias')
        .insert([
          {
            alumno_id: alumno.id,
            tipo,
            fecha: todayStr,
            hora: timeStr,
            dispositivo,
            ubicacion,
            escaneado_por: escaneadoPor
          }
        ])
        .select()
        .single();
      if (error) throw error;
      asistenciaData = { ...data, alumno };
    } else {
      const list = JSON.parse(localStorage.getItem('dojoia_asistencias') || '[]');
      asistenciaData = {
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        alumno_id: alumno.id,
        tipo,
        fecha: todayStr,
        hora: timeStr,
        dispositivo,
        ubicacion,
        escaneado_por: escaneadoPor,
        created_at: new Date().toISOString(),
        alumno
      };
      list.push(asistenciaData);
      localStorage.setItem('dojoia_asistencias', JSON.stringify(list));
    }

    // Trigger WhatsApp notification simulation (triggers a window-level event that the dashboard listens to)
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('dojoia_whatsapp_alert', {
        detail: { alumno, asistencia: asistenciaData }
      });
      window.dispatchEvent(event);
    }

    return { asistencia: asistenciaData, alumno, duplicateWarning };
  },

  clearDatabase: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('dojoia_alumnos');
    localStorage.removeItem('dojoia_asistencias');
    initLocalStorage();
  }
};
