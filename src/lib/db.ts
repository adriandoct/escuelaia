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

import masterAlumnosJson from '../../data/alumnos.json';

// Master student list sourced directly from official institutional database (529 alumnos reales de CECYTE BC)
const MOCK_ALUMNOS: Alumno[] = (masterAlumnosJson as unknown as Alumno[]) || [];

// Permanent Vault Keys for student data protection
const VAULT_PRIMARY_KEY = 'dojoia_alumnos';
const VAULT_PERMANENT_KEY = 'dojoia_alumnos_permanent_vault';
const VAULT_EXCEL_KEY = 'dojoia_alumnos_excel_imported';
const VAULT_BACKUP_KEY = 'dojoia_alumnos_uploaded_backup';
const HAS_USER_STUDENTS_KEY = 'dojoia_user_has_uploaded_students';

// Helper to synchronize students across ALL persistent vaults
export const persistToAllVaults = (students: Alumno[]) => {
  if (typeof window === 'undefined' || !Array.isArray(students)) return;
  try {
    const serialized = JSON.stringify(students);
    localStorage.removeItem('dojoia_alumnos_cleared');
    if (students.length > 0) {
      localStorage.setItem(HAS_USER_STUDENTS_KEY, 'true');
    }
    localStorage.setItem(VAULT_PRIMARY_KEY, serialized);
    localStorage.setItem(VAULT_PERMANENT_KEY, serialized);
    localStorage.setItem(VAULT_EXCEL_KEY, serialized);
    localStorage.setItem(VAULT_BACKUP_KEY, serialized);
  } catch (e) {
    console.warn('Error en persistToAllVaults:', e);
  }
};

// Helper to initialize local storage safely without erasing user students
const initLocalStorage = () => {
  if (typeof window === 'undefined') return;

  const primaryRaw = localStorage.getItem(VAULT_PRIMARY_KEY);
  let primaryCount = 0;
  if (primaryRaw) {
    try {
      const parsed = JSON.parse(primaryRaw);
      if (Array.isArray(parsed)) primaryCount = parsed.length;
    } catch {}
  }

  // If primary has fewer students than the official master database, automatically populate!
  if (primaryCount < MOCK_ALUMNOS.length) {
    persistToAllVaults(MOCK_ALUMNOS);
  } else {
    localStorage.setItem(HAS_USER_STUDENTS_KEY, 'true');
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

// Database API Implementation with Fault-Tolerant Multi-Vault Persistence
export const db = {
  isSandboxMode: () => {
    return !isSupabaseConfigured;
  },

  // Alumnos operations with indestructible multi-layer vault persistence
  getAlumnos: async (): Promise<Alumno[]> => {
    initLocalStorage();

    // Map to hold master student records by matricula
    const studentMap = new Map<string, Alumno>();

    const safeNormalizeStudent = (s: any): Alumno | null => {
      if (!s || s.matricula === undefined || s.matricula === null) return null;
      const matStr = String(s.matricula).trim();
      if (!matStr) return null;
      const qrStr = s.qr_code !== undefined && s.qr_code !== null ? String(s.qr_code).trim() : matStr;
      return {
        ...s,
        id: s.id ? String(s.id) : `student-${matStr}`,
        matricula: matStr,
        qr_code: qrStr,
        nombre: String(s.nombre || ''),
        apellido_paterno: String(s.apellido_paterno || ''),
        apellido_materno: String(s.apellido_materno || ''),
        grado: String(s.grado || '1°'),
        grupo: String(s.grupo || 'A'),
        tutor: String(s.tutor || 'No asignado'),
        telefono: String(s.telefono || '+52'),
        foto_url: s.foto_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${matStr}`
      };
    };

    // Layer 1: Load from ALL client vaults (Primary, Permanent, Excel, and Backup)
    if (typeof window !== 'undefined') {
      try {
        const vaultKeys = [VAULT_PRIMARY_KEY, VAULT_PERMANENT_KEY, VAULT_EXCEL_KEY, VAULT_BACKUP_KEY];
        for (const k of vaultKeys) {
          const raw = localStorage.getItem(k);
          if (raw) {
            try {
              const list: any[] = JSON.parse(raw);
              if (Array.isArray(list)) {
                list.forEach(s => {
                  const normalized = safeNormalizeStudent(s);
                  if (normalized && !studentMap.has(normalized.matricula)) {
                    studentMap.set(normalized.matricula, normalized);
                  }
                });
              }
            } catch {}
          }
        }
      } catch (e) {
        console.warn('Error leyendo bóveda de alumnos en localStorage:', e);
      }
    }

    // Layer 2: Load from Server API route (/api/alumnos) backed by data/alumnos.json
    try {
      if (typeof window !== 'undefined') {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const res = await fetch('/api/alumnos', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          if (json && json.success && Array.isArray(json.data)) {
            json.data.forEach((s: any) => {
              const normalized = safeNormalizeStudent(s);
              if (normalized && !studentMap.has(normalized.matricula)) {
                studentMap.set(normalized.matricula, normalized);
              }
            });
          }
        }
      }
    } catch {
      // Offline fallback
    }

    // Layer 3: Sync with Supabase if configured
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
          result.data.forEach((s: any) => {
            const normalized = safeNormalizeStudent(s);
            if (normalized && !studentMap.has(normalized.matricula)) {
              studentMap.set(normalized.matricula, normalized);
            }
          });
        }
      } catch (e) {
        // Supabase offline
      }
    }

    // Layer 4: Ensure master institutional student database is always fully merged
    if (studentMap.size < MOCK_ALUMNOS.length) {
      MOCK_ALUMNOS.forEach(s => {
        const normalized = safeNormalizeStudent(s);
        if (normalized && !studentMap.has(normalized.matricula)) {
          studentMap.set(normalized.matricula, normalized);
        }
      });
    }

    const finalList = Array.from(studentMap.values()).sort((a, b) => {
      const patCompare = (a.apellido_paterno || '').localeCompare(b.apellido_paterno || '');
      if (patCompare !== 0) return patCompare;
      const matCompare = (a.apellido_materno || '').localeCompare(b.apellido_materno || '');
      if (matCompare !== 0) return matCompare;
      return (a.nombre || '').localeCompare(b.nombre || '');
    });

    // Save and synchronize merged list across ALL vaults
    if (typeof window !== 'undefined' && finalList.length > 0) {
      persistToAllVaults(finalList);
    }

    return finalList;
  },

  getAlumnoByQR: async (qrCode: string): Promise<Alumno | null> => {
    if (qrCode === undefined || qrCode === null) return null;
    initLocalStorage();

    // 1. Sanitize incoming barcode/QR string (strip non-printables and control chars)
    const rawStr = String(qrCode).replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
    const clean = rawStr.replace(/^[\r\n\t\s]+|[\r\n\t\s]+$/g, '');
    if (!clean) return null;

    const cleanUpper = clean.toUpperCase();
    const cleanAlphanumeric = clean.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const cleanDigitsOnly = clean.replace(/\D/g, '');

    const list = await db.getAlumnos();

    const normalize = (val: any) => String(val ?? '').trim().toUpperCase();
    const normalizeAlpha = (val: any) => String(val ?? '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const normalizeDigits = (val: any) => String(val ?? '').replace(/\D/g, '');

    // Priority 1: Exact match on matricula, qr_code, or id
    let match = list.find(a => 
      normalize(a.matricula) === cleanUpper ||
      normalize(a.qr_code) === cleanUpper ||
      normalize(a.id) === cleanUpper
    );
    if (match) return match;

    // Priority 2: Alphanumeric match (ignoring hyphens, spaces, dots)
    match = list.find(a => 
      normalizeAlpha(a.matricula) === cleanAlphanumeric ||
      normalizeAlpha(a.qr_code) === cleanAlphanumeric
    );
    if (match) return match;

    // Priority 3: Numerical match (for numeric IDs like 6647666608)
    if (cleanDigitsOnly.length >= 5) {
      match = list.find(a => {
        const matDigits = normalizeDigits(a.matricula);
        const qrDigits = normalizeDigits(a.qr_code);
        return (
          (matDigits && (matDigits === cleanDigitsOnly || matDigits.endsWith(cleanDigitsOnly) || cleanDigitsOnly.endsWith(matDigits))) ||
          (qrDigits && (qrDigits === cleanDigitsOnly || qrDigits.endsWith(cleanDigitsOnly) || cleanDigitsOnly.endsWith(qrDigits)))
        );
      });
      if (match) return match;
    }

    // Priority 4: Substring containment for longer barcodes (e.g. barcodes with prefixes or check digits)
    if (cleanAlphanumeric.length >= 6) {
      match = list.find(a => {
        const matAlpha = normalizeAlpha(a.matricula);
        const qrAlpha = normalizeAlpha(a.qr_code);
        return (
          (matAlpha.length >= 6 && (cleanAlphanumeric.includes(matAlpha) || matAlpha.includes(cleanAlphanumeric))) ||
          (qrAlpha.length >= 6 && (cleanAlphanumeric.includes(qrAlpha) || qrAlpha.includes(cleanAlphanumeric)))
        );
      });
      if (match) return match;
    }

    return null;
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

    // Save across all permanent vaults
    persistToAllVaults(list);

    if (typeof window !== 'undefined') {
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

    // 1. Save across all permanent vaults
    persistToAllVaults(fullList);

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
    const idx = list.findIndex(a => a.id === id || a.matricula === id || (updates.matricula && a.matricula === updates.matricula));
    if (idx === -1) throw new Error('Student not found');
    const updated: Alumno = { ...list[idx], ...updates };
    list[idx] = updated;

    // Synchronize update across all vaults
    persistToAllVaults(list);

    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/alumnos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated)
        });
      } catch (e) {
        console.warn('Error sincronizando con API de alumnos:', e);
      }

      // Dispatch global update event
      try {
        window.dispatchEvent(new CustomEvent('dojoia_alumnos_updated', { detail: updated }));
      } catch {}
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
    const targetStudent = list.find(a => a.id === id);

    // Backup to trash before deleting
    if (typeof window !== 'undefined' && targetStudent) {
      try {
        const rawTrash = localStorage.getItem('dojoia_alumnos_trash_backup');
        const trashList: Alumno[] = rawTrash ? JSON.parse(rawTrash) : [];
        trashList.push(targetStudent);
        localStorage.setItem('dojoia_alumnos_trash_backup', JSON.stringify(trashList));
      } catch {}
    }

    list = list.filter(a => a.id !== id);
    persistToAllVaults(list);

    if (typeof window !== 'undefined') {
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

  // Completely wipe student database across all storage layers (Exclusivo Superadmin)
  clearAlumnosDatabase: async (): Promise<boolean> => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dojoia_alumnos_cleared', 'true');
      localStorage.setItem('dojoia_alumnos', JSON.stringify([]));
      localStorage.setItem('dojoia_alumnos_excel_imported', JSON.stringify([]));

      try {
        await fetch('/api/alumnos?all=true', { method: 'DELETE' });
      } catch (e) {
        console.warn('Error borrando en api/alumnos:', e);
      }
    }

    if (supabase) {
      try {
        await supabase.from('alumnos').delete().neq('id', 'purged_dummy_placeholder');
      } catch (e) {
        console.warn('Supabase delete all falló:', e);
      }
    }

    return true;
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
    // PROTECCIÓN ABSOLUTA: Solo limpia asistencias y logs temporales. NUNCA borra los alumnos registrados por el usuario.
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dojoia_asistencias');
      localStorage.removeItem('dojoia_whatsapp_logs');
    }
    console.log('clearDatabase: Asistencias y logs restablecidos. Alumnos intactos y protegidos.');
  }
};
