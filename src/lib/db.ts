import { createClient } from '@supabase/supabase-js';

// Types
export interface Alumno {
  id: string;
  matricula: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
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

const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Supabase client instance (or null)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Initial pre-seeded mock students with Unsplash avatars
const MOCK_ALUMNOS: Alumno[] = [
  {
    id: 'student-1',
    matricula: 'DOJ-2026-001',
    nombre: 'Carlos',
    apellido_paterno: 'Martínez',
    apellido_materno: 'López',
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
    nombre: 'Sofía',
    apellido_paterno: 'Herrera',
    apellido_materno: 'Díaz',
    grado: '3°',
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
    nombre: 'Mateo',
    apellido_paterno: 'Ramírez',
    apellido_materno: 'Gómez',
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
    nombre: 'Valentina',
    apellido_paterno: 'Castro',
    apellido_materno: 'Vega',
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
    nombre: 'Sebastián',
    apellido_paterno: 'Ortiz',
    apellido_materno: 'Flores',
    grado: '5°',
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
        hora: '07:38:20',
        dispositivo: 'Tablet Acceso Principal',
        ubicacion: 'Entrada Principal',
        escaneado_por: 'Prefecto Juan',
        created_at: `${formatD(today)}T07:38:20.000Z`
      }
    ];

    localStorage.setItem('dojoia_asistencias', JSON.stringify(mockAsistencias));
  }
};

// Database API Implementation with Fault-Tolerant Dual Persistence
export const db = {
  isSandboxMode: () => {
    return !isSupabaseConfigured;
  },

  // Alumnos operations with indestructible multi-layer persistence
  getAlumnos: async (): Promise<Alumno[]> => {
    initLocalStorage();

    // Map to hold master student records by matricula
    const studentMap = new Map<string, Alumno>();

    // Layer 1: Load from localStorage (primary client cache + permanent Excel backup)
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('dojoia_alumnos');
        if (raw) {
          const list: Alumno[] = JSON.parse(raw);
          list.forEach(s => { if (s && s.matricula) studentMap.set(s.matricula, s); });
        }
        // Also check immutable imported backup key
        const rawBackup = localStorage.getItem('dojoia_alumnos_excel_imported');
        if (rawBackup) {
          const importedList: Alumno[] = JSON.parse(rawBackup);
          importedList.forEach(s => { if (s && s.matricula && !studentMap.has(s.matricula)) studentMap.set(s.matricula, s); });
        }
      } catch (e) {
        console.warn('Error leyendo alumnos de localStorage:', e);
      }
    }

    // Layer 2: Load from Server API route (/api/alumnos) backed by data/alumnos.json on disk
    try {
      if (typeof window !== 'undefined') {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch('/api/alumnos', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          if (json && json.success && Array.isArray(json.data)) {
            json.data.forEach((s: Alumno) => {
              if (s && s.matricula && !studentMap.has(s.matricula)) {
                studentMap.set(s.matricula, s);
              }
            });
          }
        }
      }
    } catch {
      // Local or static fallback
    }

    // Layer 3: Sync with Supabase with a fast 2-second timeout so it never hangs
    if (supabase) {
      try {
        const supabasePromise = supabase
          .from('alumnos')
          .select('*')
          .order('apellido_paterno', { ascending: true })
          .order('apellido_materno', { ascending: true })
          .order('nombre', { ascending: true });

        const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) =>
          setTimeout(() => reject(new Error('Supabase timeout')), 2000)
        );

        const result: any = await Promise.race([supabasePromise, timeoutPromise]);
        if (result && !result.error && Array.isArray(result.data)) {
          result.data.forEach((s: Alumno) => {
            // MERGE: Nunca sobreescribir alumnos existentes
            if (s && s.matricula && !studentMap.has(s.matricula)) {
              studentMap.set(s.matricula, s);
            }
          });
        }
      } catch (e) {
        // Supabase offline / DNS failure
      }
    }

    // Fallback seed if completely empty
    if (studentMap.size === 0) {
      MOCK_ALUMNOS.forEach(s => studentMap.set(s.matricula, s));
    }

    const finalList = Array.from(studentMap.values()).sort((a, b) => {
      const patCompare = (a.apellido_paterno || '').localeCompare(b.apellido_paterno || '');
      if (patCompare !== 0) return patCompare;
      const matCompare = (a.apellido_materno || '').localeCompare(b.apellido_materno || '');
      if (matCompare !== 0) return matCompare;
      return (a.nombre || '').localeCompare(b.nombre || '');
    });

    // Save merged master list back to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('dojoia_alumnos', JSON.stringify(finalList));
    }

    return finalList;
  },

  getAlumnoByQR: async (qrCode: string): Promise<Alumno | null> => {
    initLocalStorage();
    const list = await db.getAlumnos();
    return list.find(a => a.qr_code === qrCode || a.matricula === qrCode) || null;
  },

  addAlumno: async (alumno: Omit<Alumno, 'id' | 'created_at'>): Promise<Alumno> => {
    initLocalStorage();
    const list = await db.getAlumnos();
    const newAlumno: Alumno = {
      ...alumno,
      id: `student-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      created_at: new Date().toISOString()
    };
    list.push(newAlumno);

    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('dojoia_alumnos', JSON.stringify(list));
      try {
        const rawBackup = localStorage.getItem('dojoia_alumnos_excel_imported');
        const backupList: Alumno[] = rawBackup ? JSON.parse(rawBackup) : [];
        backupList.push(newAlumno);
        localStorage.setItem('dojoia_alumnos_excel_imported', JSON.stringify(backupList));
      } catch (e) {
        console.warn('Backup error:', e);
      }

      // Persist to disk API
      fetch('/api/alumnos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([newAlumno])
      }).catch(() => {});
    }

    // Background sync to Supabase
    if (supabase) {
      try {
        supabase.from('alumnos').insert([newAlumno]).then();
      } catch {}
    }

    return newAlumno;
  },

  // Bulk add students: STRICTLY PRESERVES all existing records and saves across all layers
  addAlumnosBulk: async (alumnos: Omit<Alumno, 'id' | 'created_at'>[]): Promise<Alumno[]> => {
    initLocalStorage();
    const currentList = await db.getAlumnos();
    const studentMap = new Map<string, Alumno>();
    currentList.forEach(s => studentMap.set(s.matricula, s));

    const newlyAdded: Alumno[] = [];

    alumnos.forEach((al, idx) => {
      const existing = studentMap.get(al.matricula);
      if (existing) {
        // PRESERVAR registro existente intacto
        newlyAdded.push(existing);
      } else {
        const newAlumno: Alumno = {
          ...al,
          id: `student-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
          created_at: new Date().toISOString()
        };
        studentMap.set(al.matricula, newAlumno);
        newlyAdded.push(newAlumno);
      }
    });

    const fullList = Array.from(studentMap.values());

    // 1. Save to localStorage active list AND permanent Excel backup key
    if (typeof window !== 'undefined') {
      localStorage.setItem('dojoia_alumnos', JSON.stringify(fullList));

      try {
        const rawBackup = localStorage.getItem('dojoia_alumnos_excel_imported');
        const backupList: Alumno[] = rawBackup ? JSON.parse(rawBackup) : [];
        const backupMap = new Map<string, Alumno>();
        backupList.forEach(s => backupMap.set(s.matricula, s));
        newlyAdded.forEach(s => backupMap.set(s.matricula, s));
        localStorage.setItem('dojoia_alumnos_excel_imported', JSON.stringify(Array.from(backupMap.values())));
      } catch (e) {
        console.warn('Error guardando respaldo permanente de importación:', e);
      }
    }

    // 2. Persist to server disk via /api/alumnos route
    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/alumnos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fullList)
        });
      } catch (e) {
        console.warn('Error persistiendo a disco /api/alumnos:', e);
      }
    }

    // 3. Background sync to Supabase
    if (supabase) {
      try {
        supabase
          .from('alumnos')
          .upsert(fullList, { onConflict: 'matricula', ignoreDuplicates: true })
          .then();
      } catch (e) {
        console.warn('Supabase bulk upsert ignorado:', e);
      }
    }

    return fullList;
  },

  updateAlumno: async (id: string, updates: Partial<Omit<Alumno, 'id' | 'created_at'>>): Promise<Alumno> => {
    initLocalStorage();
    const list = await db.getAlumnos();
    const idx = list.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Student not found');
    const updated: Alumno = { ...list[idx], ...updates };
    list[idx] = updated;

    if (typeof window !== 'undefined') {
      localStorage.setItem('dojoia_alumnos', JSON.stringify(list));
      fetch('/api/alumnos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      }).catch(() => {});
    }

    if (supabase) {
      try {
        supabase.from('alumnos').update(updates).eq('id', id).then();
      } catch {}
    }

    return updated;
  },

  deleteAlumno: async (id: string): Promise<boolean> => {
    initLocalStorage();
    let list = await db.getAlumnos();
    const initialLen = list.length;
    list = list.filter(a => a.id !== id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dojoia_alumnos', JSON.stringify(list));
      // Also update backup
      try {
        const rawBackup = localStorage.getItem('dojoia_alumnos_excel_imported');
        if (rawBackup) {
          const backupList: Alumno[] = JSON.parse(rawBackup);
          localStorage.setItem('dojoia_alumnos_excel_imported', JSON.stringify(backupList.filter(a => a.id !== id)));
        }
      } catch {}

      fetch(`/api/alumnos?id=${id}`, { method: 'DELETE' }).catch(() => {});
    }

    let asistencias = await db.getAsistencias();
    asistencias = asistencias.filter(a => a.alumno_id !== id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dojoia_asistencias', JSON.stringify(asistencias));
    }

    if (supabase) {
      try {
        await supabase
          .from('alumnos')
          .delete()
          .eq('id', id);
      } catch (e) {
        console.warn('Supabase delete falló:', e);
      }
    }

    return list.length < initialLen;
  },

  // Asistencia operations
  getAsistencias: async (): Promise<Asistencia[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('asistencias')
          .select('*, alumnos(*)')
          .order('created_at', { ascending: false });
        
        if (!error && data && data.length > 0) {
          return (data || []).map((row: any) => ({
            ...row,
            alumno: row.alumnos
          }));
        }
      } catch (e) {
        console.warn('Supabase getAsistencias no disponible, usando local:', e);
      }
    }

    initLocalStorage();
    if (typeof window === 'undefined') return [];

    const raw = localStorage.getItem('dojoia_asistencias');
    const list: Asistencia[] = raw ? JSON.parse(raw) : [];
    const alumnos = await db.getAlumnos();

    const enriched = list.map(item => ({
      ...item,
      alumno: alumnos.find(al => al.id === item.alumno_id)
    }));

    return enriched.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
  },

  registrarAsistencia: async (
    matricula: string,
    tipoOverride?: 'entrada' | 'salida',
    dispositivo = 'Escaner Web',
    ubicacion = 'Acceso Principal',
    escaneadoPor = 'Admin'
  ): Promise<{ asistencia: Asistencia; alumno: Alumno; duplicateWarning: boolean }> => {
    const alumno = await db.getAlumnoByQR(matricula);
    if (!alumno) {
      throw new Error(`Estudiante con matrícula/QR '${matricula}' no registrado.`);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0];

    const allAsistencias = await db.getAsistencias();
    const todayLogsForStudent = allAsistencias.filter(
      log => log.alumno_id === alumno.id && log.fecha === todayStr
    );

    const now = new Date();
    const duplicateWarning = todayLogsForStudent.some(log => {
      const logTime = new Date(`${log.fecha}T${log.hora}`);
      const diffMs = Math.abs(now.getTime() - logTime.getTime());
      return diffMs < 30000;
    });

    let tipo: 'entrada' | 'salida' = 'entrada';
    if (tipoOverride) {
      tipo = tipoOverride;
    } else if (todayLogsForStudent.length > 0) {
      const sortedTodayLogs = [...todayLogsForStudent].sort(
        (a, b) => new Date(`${a.fecha}T${a.hora}`).getTime() - new Date(`${b.fecha}T${b.hora}`).getTime()
      );
      const lastLog = sortedTodayLogs[sortedTodayLogs.length - 1];
      tipo = lastLog.tipo === 'entrada' ? 'salida' : 'entrada';
    }

    initLocalStorage();
    const list = JSON.parse(typeof window !== 'undefined' ? localStorage.getItem('dojoia_asistencias') || '[]' : '[]');
    const asistenciaData: Asistencia = {
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
    if (typeof window !== 'undefined') {
      localStorage.setItem('dojoia_asistencias', JSON.stringify(list));
    }

    if (supabase) {
      try {
        await supabase
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
          ]);
      } catch (e) {
        console.warn('Supabase registrarAsistencia no disponible, guardado en local:', e);
      }
    }

    if (typeof window !== 'undefined') {
      const event = new CustomEvent('dojoia_whatsapp_alert', {
        detail: { alumno, asistencia: asistenciaData }
      });
      window.dispatchEvent(event);
    }

    return { asistencia: asistenciaData, alumno, duplicateWarning };
  },

  clearDatabase: () => {
    // Safety: disabled by default
    console.warn('clearDatabase called');
  }
};
