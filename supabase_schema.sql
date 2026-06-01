-- ==========================================
-- Escuela IA - Supabase Database Schema Setup
-- Run this script in the Supabase SQL Editor
-- ==========================================

-- 1. Create ALUMNOS (Students) Table
CREATE TABLE IF NOT EXISTS alumnos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    matricula TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    apellido_paterno TEXT NOT NULL,
    apellido_materno TEXT DEFAULT '',
    grado TEXT NOT NULL,
    grupo TEXT NOT NULL,
    tutor TEXT NOT NULL,
    telefono TEXT NOT NULL,
    foto_url TEXT,
    qr_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create ASISTENCIAS (Attendance Logs) Table
CREATE TABLE IF NOT EXISTS asistencias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alumno_id UUID REFERENCES alumnos(id) ON DELETE CASCADE NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora TIME WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIME,
    dispositivo TEXT,
    ubicacion TEXT,
    escaneado_por TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on both tables
ALTER TABLE alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencias ENABLE ROW LEVEL SECURITY;

-- ALUMNOS policies for anonymous/public access (since client uses anon key)
CREATE POLICY "Allow public read access to alumnos" 
    ON alumnos FOR SELECT TO anon USING (true);

CREATE POLICY "Allow public insert access to alumnos" 
    ON alumnos FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow public update access to alumnos" 
    ON alumnos FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow public delete access to alumnos" 
    ON alumnos FOR DELETE TO anon USING (true);

-- ASISTENCIAS policies for anonymous/public access
CREATE POLICY "Allow public read access to asistencias" 
    ON asistencias FOR SELECT TO anon USING (true);

CREATE POLICY "Allow public insert access to asistencias" 
    ON asistencias FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow public update access to asistencias" 
    ON asistencias FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow public delete access to asistencias" 
    ON asistencias FOR DELETE TO anon USING (true);

-- ==========================================
-- SEED DATA (MOCK DATA)
-- ==========================================

-- Insert mock alumnos
INSERT INTO alumnos (id, matricula, nombre, apellido_paterno, apellido_materno, grado, grupo, tutor, telefono, foto_url, qr_code)
VALUES 
    ('d3b07384-d113-4a1d-a0b7-cc59218d6e1d', 'DOJ-2026-001', 'Carlos', 'Martínez', 'López', '1°', 'A', 'Sra. Mariana López', '+525512345678', 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=200&h=200', 'DOJ-2026-001'),
    ('2b1db1eb-4753-4bfd-a197-8d7667a42a03', 'DOJ-2026-002', 'Sofía', 'Herrera', 'Díaz', '2°', 'B', 'Sr. Roberto Herrera', '+525523456789', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200&h=200', 'DOJ-2026-002'),
    ('6c5e64e1-2c06-444f-94d1-fb81005a7698', 'DOJ-2026-003', 'Mateo', 'Ramírez', 'Gómez', '3°', 'A', 'Sra. Patricia Gómez', '+525534567890', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200&h=200', 'DOJ-2026-003'),
    ('12f170f3-e5b1-4c6e-82d8-21d743a18a56', 'DOJ-2026-004', 'Valentina', 'Castro', 'Vega', '1°', 'B', 'Sr. Fernando Castro', '+525545678901', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200&h=200', 'DOJ-2026-004'),
    ('97f2873c-623b-48ab-b003-7cb7f794de42', 'DOJ-2026-005', 'Sebastián', 'Ortiz', 'Flores', '2°', 'A', 'Sra. Carmen Flores', '+525556789012', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200', 'DOJ-2026-005')
ON CONFLICT (matricula) DO NOTHING;

-- Insert mock asistencias (referenced to the alumnos inserted above)
INSERT INTO asistencias (alumno_id, tipo, fecha, hora, dispositivo, ubicacion, escaneado_por, created_at)
VALUES
    -- Yesterday check-ins
    ('d3b07384-d113-4a1d-a0b7-cc59218d6e1d', 'entrada', CURRENT_DATE - INTERVAL '1 day', '07:12:15', 'Tablet Acceso Principal', 'Entrada Sur', 'Prefecto Juan', (CURRENT_DATE - INTERVAL '1 day' + TIME '07:12:15') AT TIME ZONE 'UTC'),
    ('d3b07384-d113-4a1d-a0b7-cc59218d6e1d', 'salida', CURRENT_DATE - INTERVAL '1 day', '13:48:32', 'Tablet Acceso Principal', 'Entrada Sur', 'Prefecto Juan', (CURRENT_DATE - INTERVAL '1 day' + TIME '13:48:32') AT TIME ZONE 'UTC'),
    ('2b1db1eb-4753-4bfd-a197-8d7667a42a03', 'entrada', CURRENT_DATE - INTERVAL '1 day', '07:22:40', 'Celular Caseta', 'Caseta 1', 'Seguridad Pedro', (CURRENT_DATE - INTERVAL '1 day' + TIME '07:22:40') AT TIME ZONE 'UTC'),
    -- Today check-ins
    ('6c5e64e1-2c06-444f-94d1-fb81005a7698', 'entrada', CURRENT_DATE, '07:05:12', 'Tablet Acceso Principal', 'Entrada Principal', 'Prefecto Juan', (CURRENT_DATE + TIME '07:05:12') AT TIME ZONE 'UTC'),
    ('12f170f3-e5b1-4c6e-82d8-21d743a18a56', 'entrada', CURRENT_DATE, '07:38:20', 'Tablet Acceso Principal', 'Entrada Principal', 'Prefecto Juan', (CURRENT_DATE + TIME '07:38:20') AT TIME ZONE 'UTC')
ON CONFLICT DO NOTHING;
