"use strict";

'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { Role } from '@/lib/auth';
import { 
  Upload, FileSpreadsheet, FileText, X, Check, AlertCircle, Download, 
  CheckCircle2, Sparkles, User, Hash, Mail, ArrowRight, ShieldCheck,
  RefreshCw, Info
} from 'lucide-react';

interface ImportPersonalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (count: number) => void;
  importUsersBulk: (users: Array<{ name: string; numero_empleado: string; email: string; phone?: string; celular?: string; role?: Role; password?: string }>) => Promise<{ success: boolean; count: number; error?: string }>;
}

export interface ParsedEmployee {
  name: string;
  numero_empleado: string;
  email: string;
  phone?: string;
  role: Role;
  password?: string;
  isValid: boolean;
  errorReason?: string;
}

export default function ImportPersonalModal({
  isOpen,
  onClose,
  onImportSuccess,
  importUsersBulk
}: ImportPersonalModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsedEmployees, setParsedEmployees] = useState<ParsedEmployee[]>([]);
  
  // Default options
  const [defaultRole, setDefaultRole] = useState<Role>('docente');
  const [passwordMode, setPasswordMode] = useState<'empNum' | 'cecyte' | 'custom'>('empNum');
  const [customPassword, setCustomPassword] = useState('Cecyte2026!');

  if (!isOpen) return null;

  const resetState = () => {
    setFile(null);
    setErrorMessage(null);
    setParsedEmployees([]);
    setIsProcessing(false);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Helper to normalize strings for comparison
  const normalize = (str: string) =>
    str.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const parseRole = (rawRole: string, fallback?: Role): Role => {
    const norm = normalize(rawRole);
    if (norm.includes('admin') || norm.includes('director') || norm.includes('coordinad') || norm.includes('administrativ') || norm.includes('secretari') || norm.includes('oficin') || norm.includes('apoyo')) return 'administrador';
    if (norm.includes('orden') || norm.includes('prefect') || norm.includes('seguridad') || norm.includes('disciplina')) return 'encargado_orden';
    if (norm.includes('docente') || norm.includes('maestr') || norm.includes('profesor') || norm.includes('tutor') || norm.includes('acad')) return 'docente';
    return fallback || defaultRole;
  };

  // Excel (.xlsx, .xls, .csv) parser
  const processExcelFile = async (f: File) => {
    const buffer = await f.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    if (!sheet) throw new Error('El archivo Excel no contiene hojas de datos.');

    const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (!rawRows || rawRows.length < 2) {
      throw new Error('El archivo no contiene suficientes filas de datos.');
    }

    // Find header row (search first 10 rows)
    let headerRowIndex = 0;
    let nameCol = -1;
    let empNumCol = -1;
    let phoneCol = -1;
    let emailCol = -1;
    let roleCol = -1;

    for (let r = 0; r < Math.min(10, rawRows.length); r++) {
      const row = rawRows[r];
      if (!Array.isArray(row)) continue;

      row.forEach((cell, idx) => {
        const text = normalize(String(cell || ''));
        const isSequential = text === 'no' || text === 'no.' || text === '#' || text === 'num' || text === 'num.' || text === 'consecutivo';

        if (nameCol === -1 && (text.includes('nombre') || (text.includes('docente') && !text.includes('rol')) || text.includes('personal') || text.includes('trabajador'))) {
          nameCol = idx;
        }
        if (empNumCol === -1 && !isSequential && (text.includes('empleado') || text.includes('clave') || text.includes('id') || text.includes('nomina') || text.includes('control') || text.includes('no. emp') || text.includes('no emp'))) {
          if (idx !== nameCol) empNumCol = idx;
        }
        if (phoneCol === -1 && (text.includes('celular') || text.includes('telefono') || text.includes('tel') || text.includes('movil') || text.includes('phone'))) {
          phoneCol = idx;
        }
        if (emailCol === -1 && (text.includes('correo') || text.includes('email') || text.includes('mail') || text.includes('institucional'))) {
          emailCol = idx;
        }
        if (roleCol === -1 && (text.includes('rol') || text.includes('puesto') || text.includes('cargo') || text.includes('funcion'))) {
          roleCol = idx;
        }
      });

      if (emailCol !== -1 && (nameCol !== -1 || empNumCol !== -1)) {
        headerRowIndex = r;
        break;
      }
    }

    // Fallbacks if not auto-detected by headers
    if (nameCol === -1) nameCol = 0;
    if (empNumCol === -1) empNumCol = 1;
    if (emailCol === -1) emailCol = 2;

    const list: ParsedEmployee[] = [];
    let currentSectionRole: Role = defaultRole;

    for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      const rowJoined = normalize(row.join(' '));
      // Detect section headers spanning across rows (e.g. ADMINISTRATIVOS, DOCENTES)
      if (rowJoined.includes('administrativ') && !rowJoined.includes('@')) {
        currentSectionRole = 'administrador';
        continue;
      }
      if ((rowJoined.includes('docente') || rowJoined.includes('maestr') || rowJoined.includes('profesor')) && !rowJoined.includes('@')) {
        currentSectionRole = 'docente';
        continue;
      }
      if ((rowJoined.includes('prefect') || rowJoined.includes('orden')) && !rowJoined.includes('@')) {
        currentSectionRole = 'encargado_orden';
        continue;
      }
      // Skip repeated header rows
      if (rowJoined.includes('nombre') && (rowJoined.includes('empleado') || rowJoined.includes('correo'))) {
        continue;
      }

      const rawName = String(row[nameCol] || '').trim();
      const rawEmpNum = empNumCol !== -1 ? String(row[empNumCol] || '').trim() : '';
      const rawPhone = phoneCol !== -1 ? String(row[phoneCol] || '').trim() : '';
      const rawEmail = String(row[emailCol] || '').trim().toLowerCase();
      const rawRole = roleCol !== -1 ? String(row[roleCol] || '') : '';

      // Skip empty row
      if (!rawName && !rawEmpNum && !rawEmail && !rawPhone) continue;

      let email = rawEmail;
      // If email doesn't have @, attempt creating from name or empNum if domain can be added
      if (email && !email.includes('@')) {
        email = `${email}@cecytebc.edu.mx`;
      }

      const isValidEmail = Boolean(email && email.includes('@') && email.includes('.'));
      const isValid = Boolean(isValidEmail && (rawName || rawEmpNum));
      let errorReason: string | undefined = undefined;

      if (!isValidEmail) {
        errorReason = 'Correo electrónico inválido o ausente.';
      } else if (!rawName && !rawEmpNum) {
        errorReason = 'Falta nombre o número de empleado.';
      }

      list.push({
        name: rawName || `Empleado ${rawEmpNum}`,
        numero_empleado: rawEmpNum || `EMP-${r}`,
        email,
        phone: rawPhone,
        role: rawRole ? parseRole(rawRole, currentSectionRole) : currentSectionRole,
        isValid,
        errorReason
      });
    }

    return list;
  };

  // Word (.docx) parser
  const processWordFile = async (f: File) => {
    const arrayBuffer = await f.arrayBuffer();
    
    // First try converting to HTML to inspect tables
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
    const html = htmlResult.value;

    const list: ParsedEmployee[] = [];

    // Check if HTML has table rows
    if (html.includes('<table')) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const tableRows = Array.from(doc.querySelectorAll('tr'));

      if (tableRows.length > 1) {
        let nameCol = 0;
        let empNumCol = 1;
        let phoneCol = -1;
        let emailCol = 2;

        const firstRowCells = Array.from(tableRows[0].querySelectorAll('th, td')).map(c => normalize(c.textContent || ''));
        firstRowCells.forEach((text, idx) => {
          const isSequential = text === 'no' || text === 'no.' || text === '#' || text === 'num' || text === 'num.' || text === 'consecutivo';
          if (nameCol === -1 && (text.includes('nombre') || text.includes('docente') || text.includes('personal'))) nameCol = idx;
          if (empNumCol === -1 && !isSequential && (text.includes('empleado') || text.includes('clave') || text.includes('id') || text.includes('no. emp') || text.includes('no emp'))) empNumCol = idx;
          if (phoneCol === -1 && (text.includes('celular') || text.includes('telefono') || text.includes('tel') || text.includes('movil') || text.includes('phone'))) phoneCol = idx;
          if (emailCol === -1 && (text.includes('correo') || text.includes('email') || text.includes('mail'))) emailCol = idx;
        });

        let currentWordSectionRole: Role = defaultRole;

        for (let i = 1; i < tableRows.length; i++) {
          const cells = Array.from(tableRows[i].querySelectorAll('td'));
          if (cells.length === 0) continue;

          const rowText = normalize(cells.map(c => c.textContent || '').join(' '));
          if (rowText.includes('administrativ') && !rowText.includes('@')) {
            currentWordSectionRole = 'administrador';
            continue;
          }
          if ((rowText.includes('docente') || rowText.includes('maestr') || rowText.includes('profesor')) && !rowText.includes('@')) {
            currentWordSectionRole = 'docente';
            continue;
          }
          if ((rowText.includes('prefect') || rowText.includes('orden')) && !rowText.includes('@')) {
            currentWordSectionRole = 'encargado_orden';
            continue;
          }

          const rawName = (cells[nameCol]?.textContent || '').trim();
          const rawEmpNum = empNumCol !== -1 ? (cells[empNumCol]?.textContent || '').trim() : '';
          const rawPhone = phoneCol !== -1 ? (cells[phoneCol]?.textContent || '').trim() : '';
          let rawEmail = (cells[emailCol]?.textContent || '').trim().toLowerCase();

          if (!rawName && !rawEmpNum && !rawEmail && !rawPhone) continue;

          if (rawEmail && !rawEmail.includes('@')) {
            rawEmail = `${rawEmail}@cecytebc.edu.mx`;
          }

          const isValidEmail = Boolean(rawEmail && rawEmail.includes('@') && rawEmail.includes('.'));
          const isValid = Boolean(isValidEmail && (rawName || rawEmpNum));

          list.push({
            name: rawName || `Empleado ${rawEmpNum}`,
            numero_empleado: rawEmpNum || `EMP-${i}`,
            email: rawEmail,
            phone: rawPhone,
            role: currentWordSectionRole,
            isValid,
            errorReason: isValid ? undefined : 'Correo o datos incompletos en fila de tabla Word.'
          });
        }
      }
    }

    // If no table or empty, fallback to raw text parsing line by line
    if (list.length === 0) {
      const textResult = await mammoth.extractRawText({ arrayBuffer });
      const lines = textResult.value.split('\n').map(l => l.trim()).filter(Boolean);
      let textSectionRole: Role = defaultRole;

      // Search for email addresses in text lines
      lines.forEach((line, idx) => {
        const normLine = normalize(line);
        if (normLine.includes('administrativ') && !normLine.includes('@')) {
          textSectionRole = 'administrador';
          return;
        }
        if ((normLine.includes('docente') || normLine.includes('maestr')) && !normLine.includes('@')) {
          textSectionRole = 'docente';
          return;
        }
        if ((normLine.includes('prefect') || normLine.includes('orden')) && !normLine.includes('@')) {
          textSectionRole = 'encargado_orden';
          return;
        }

        const emailMatch = line.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) {
          const email = emailMatch[1].toLowerCase();
          
          // Attempt to extract employee number
          const empNumMatch = line.match(/(?:emp|empleado|no\.?|id|clave)[:\s-]*([a-zA-Z0-9_-]+)/i) ||
                              line.match(/\b([A-Z]{2,4}[-]?\d{3,6}|\d{4,8})\b/);
          const empNum = empNumMatch ? empNumMatch[1] : `EMP-${idx + 1}`;

          // Attempt to extract name (strip out email and empNum from line)
          let cleanName = line
            .replace(emailMatch[0], '')
            .replace(/correo:?/i, '')
            .replace(/nombre:?/i, '')
            .replace(/empleado:?/i, '')
            .replace(/no\.?:?/i, '')
            .replace(/[-|]/g, ' ')
            .trim();

          if (empNumMatch) {
            cleanName = cleanName.replace(empNumMatch[0], '').trim();
          }

          list.push({
            name: cleanName || email.split('@')[0].replace('.', ' ').toUpperCase(),
            numero_empleado: empNum,
            email,
            role: textSectionRole,
            isValid: true
          });
        }
      });
    }

    if (list.length === 0) {
      throw new Error('No se detectaron tablas o listas de correos con formato reconocible en el documento Word.');
    }

    return list;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const ext = selected.name.split('.').pop()?.toLowerCase();
      let parsed: ParsedEmployee[] = [];

      if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        parsed = await processExcelFile(selected);
      } else if (ext === 'docx') {
        parsed = await processWordFile(selected);
      } else {
        throw new Error('Formato no soportado. Por favor sube un archivo Excel (.xlsx, .xls, .csv) o Word (.docx).');
      }

      if (parsed.length === 0) {
        throw new Error('No se encontraron registros de empleados en el documento.');
      }

      setParsedEmployees(parsed);
    } catch (err: any) {
      console.error('Error procesando archivo:', err);
      setErrorMessage(err.message || 'Error al procesar el archivo.');
      setParsedEmployees([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Nombre Completo': 'Mtro. Roberto Hernández Silva',
        'Numero de Empleado': 'EMP-4011',
        'Correo Institucional': 'roberto.hernandez@cecytebc.edu.mx',
        'Rol': 'Docente'
      },
      {
        'Nombre Completo': 'Lic. Andrea Morales Cruz',
        'Numero de Empleado': 'EMP-4012',
        'Correo Institucional': 'andrea.morales@cecytebc.edu.mx',
        'Rol': 'Encargado Orden'
      },
      {
        'Nombre Completo': 'Ing. Carlos Ortiz Vega',
        'Numero de Empleado': 'EMP-4013',
        'Correo Institucional': 'carlos.ortiz@cecytebc.edu.mx',
        'Rol': 'Docente'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Personal');
    XLSX.writeFile(wb, 'plantilla_personal_cecytebc.xlsx');
  };

  const handleConfirmImport = async () => {
    const validEmployees = parsedEmployees.filter(e => e.isValid);
    if (validEmployees.length === 0) {
      setErrorMessage('No hay registros válidos para importar.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = validEmployees.map(emp => {
        let finalPassword = emp.password;
        if (!finalPassword) {
          if (passwordMode === 'empNum') {
            finalPassword = emp.numero_empleado || 'Cecyte2026!';
          } else if (passwordMode === 'cecyte') {
            finalPassword = 'Cecyte2026!';
          } else {
            finalPassword = customPassword || 'Cecyte2026!';
          }
        }

        return {
          name: emp.name,
          numero_empleado: emp.numero_empleado,
          email: emp.email,
          phone: emp.phone,
          celular: emp.phone,
          role: emp.role || defaultRole,
          password: finalPassword
        };
      });

      const res = await importUsersBulk(payload);
      if (res.success) {
        onImportSuccess(res.count);
        handleClose();
      } else {
        setErrorMessage(res.error || 'Error al guardar los registros en el sistema.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error en la importación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = parsedEmployees.filter(e => e.isValid).length;
  const invalidCount = parsedEmployees.length - validCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div 
        className="relative w-full max-w-4xl glass-panel bg-[#090d16]/95 border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(6,182,212,0.15)] my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Upload size={22} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>Importar Personal Institucional</span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30 font-bold uppercase">
                  Word / Excel
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Carga masiva de nombre, número de empleado y correo electrónico para registro y autenticación.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-400 hover:text-cyan-300 text-xs font-semibold transition-all cursor-pointer self-start sm:self-auto"
            title="Descargar archivo modelo en Excel con las columnas requeridas"
          >
            <Download size={14} />
            <span>Descargar Plantilla Excel</span>
          </button>
        </div>

        {/* Upload Zone */}
        {!file && (
          <div className="py-8 space-y-6">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-cyan-500/30 hover:border-cyan-400/60 rounded-3xl p-8 sm:p-12 text-center bg-cyan-500/[0.02] hover:bg-cyan-500/[0.05] transition-all cursor-pointer group space-y-4"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv, .docx"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 group-hover:scale-110 group-hover:bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto transition-all">
                <Upload size={28} />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  Selecciona o arrastra tu archivo Word o Excel
                </h3>
                <p className="text-xs text-gray-400">
                  Formatos compatibles: <strong className="text-cyan-300">.xlsx</strong>, <strong className="text-cyan-300">.xls</strong>, <strong className="text-cyan-300">.csv</strong> o documentos Word <strong className="text-blue-300">.docx</strong>
                </p>
              </div>

              <div className="inline-flex items-center space-x-3 text-[11px] text-gray-400 pt-2">
                <span className="flex items-center gap-1">
                  <FileSpreadsheet size={13} className="text-emerald-400" />
                  <span>Tablas Excel</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <FileText size={13} className="text-blue-400" />
                  <span>Tablas o Listas Word</span>
                </span>
              </div>
            </div>

            {/* Information Card */}
            <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-gray-300 space-y-2">
              <div className="flex items-center space-x-2 text-cyan-400 font-bold">
                <Info size={15} />
                <span>¿Qué columnas o campos debe contener el documento?</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-gray-400 pl-1">
                <li><strong className="text-white">Nombre Completo:</strong> Nombre del docente o empleado.</li>
                <li><strong className="text-white">Número de Empleado:</strong> Su clave o ID de nómina (ejemplo: EMP-3001 o 52401).</li>
                <li><strong className="text-white">Correo Institucional:</strong> Cuenta oficial @cecytebc.edu.mx.</li>
                <li><strong className="text-white">Rol (Opcional):</strong> Docente, Personal Administrativo, Encargado de Orden o Administrador.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div className="py-16 text-center space-y-4">
            <RefreshCw size={32} className="animate-spin text-cyan-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Procesando y validando documento...</h3>
            <p className="text-xs text-gray-400">Extrayendo nombres, números de empleado y correos institucionales.</p>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="my-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start space-x-3">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <span className="font-bold">Aviso:</span>
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Preview and Configuration Section */}
        {file && !isProcessing && parsedEmployees.length > 0 && (
          <div className="py-6 space-y-6">
            
            {/* File & Global Settings Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
              
              {/* File Info */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-400">Archivo Cargado</label>
                <div className="flex items-center space-x-2 text-xs font-semibold text-white">
                  {file.name.endsWith('.docx') ? <FileText size={16} className="text-blue-400" /> : <FileSpreadsheet size={16} className="text-emerald-400" />}
                  <span className="truncate max-w-[200px]">{file.name}</span>
                </div>
                <button
                  type="button"
                  onClick={resetState}
                  className="text-[11px] text-cyan-400 hover:underline pt-0.5 cursor-pointer block"
                >
                  Cambiar archivo
                </button>
              </div>

              {/* Default Role Selection */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-400">Rol por Defecto</label>
                <select
                  value={defaultRole}
                  onChange={(e) => {
                    const r = e.target.value as Role;
                    setDefaultRole(r);
                    setParsedEmployees(prev => prev.map(p => ({ ...p, role: r })));
                  }}
                  className="w-full glass-input px-3 py-1.5 rounded-xl text-xs text-white bg-[#0a0f1d] border-white/10"
                >
                  <option value="docente">👨‍🏫 Docente (Pase de lista)</option>
                  <option value="administrador">👑 Personal Administrativo / Administrador</option>
                  <option value="encargado_orden">🛡️ Encargado de Orden (Escáner)</option>
                </select>
              </div>

              {/* Password Policy */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-400">Contraseña Inicial de Acceso</label>
                <select
                  value={passwordMode}
                  onChange={(e) => setPasswordMode(e.target.value as any)}
                  className="w-full glass-input px-3 py-1.5 rounded-xl text-xs text-white bg-[#0a0f1d] border-white/10"
                >
                  <option value="empNum">🔑 Su Número de Empleado (Recomendado)</option>
                  <option value="cecyte">🏫 Cecyte2026! (Institucional)</option>
                  <option value="custom">✏️ Contraseña personalizada</option>
                </select>
                {passwordMode === 'custom' && (
                  <input
                    type="text"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="Contraseña..."
                    className="w-full glass-input px-3 py-1 rounded-lg text-xs text-white bg-[#0a0f1d] border-white/10 mt-1"
                  />
                )}
              </div>

            </div>

            {/* Counts Badge */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-3">
                <span className="font-bold text-white">Vista Previa de Empleados:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 text-[11px]">
                  ✓ {validCount} Listos para Registrar
                </span>
                {invalidCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 font-bold border border-red-500/20 text-[11px]">
                    ⚠ {invalidCount} con Error
                  </span>
                )}
              </div>
              <span className="text-gray-400 text-[11px]">Total: {parsedEmployees.length} registros</span>
            </div>

            {/* Preview Table */}
            <div className="max-h-72 overflow-y-auto rounded-2xl border border-white/10 glass-panel">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[#090d16] border-b border-white/10 text-gray-400 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3">Nombre Completo</th>
                    <th className="py-2.5 px-3">No. Empleado</th>
                    <th className="py-2.5 px-3">Correo Institucional</th>
                    <th className="py-2.5 px-3">Rol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {parsedEmployees.map((emp, idx) => (
                    <tr key={idx} className={emp.isValid ? 'hover:bg-white/[0.02]' : 'bg-red-500/5'}>
                      <td className="py-2.5 px-3">
                        {emp.isValid ? (
                          <span className="text-emerald-400 inline-flex items-center gap-1 font-bold text-[10px]">
                            <CheckCircle2 size={13} /> Listo
                          </span>
                        ) : (
                          <span className="text-red-400 inline-flex items-center gap-1 font-bold text-[10px]" title={emp.errorReason}>
                            <AlertCircle size={13} /> Error
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-white">
                        {emp.name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-cyan-300">
                        {emp.numero_empleado}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-gray-300">
                        {emp.email}
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          value={emp.role}
                          onChange={(e) => {
                            const newR = e.target.value as Role;
                            setParsedEmployees(prev => prev.map((item, i) => i === idx ? { ...item, role: newR } : item));
                          }}
                          className="glass-input px-2 py-0.5 rounded text-[11px] bg-[#0b101d] text-gray-200 border border-white/10"
                        >
                          <option value="docente">Docente</option>
                          <option value="encargado_orden">Encargado Orden</option>
                          <option value="administrador">Administrador</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
              <div className="text-xs text-gray-400 flex items-center space-x-1.5">
                <ShieldCheck size={16} className="text-cyan-400 shrink-0" />
                <span>
                  Los empleados podrán iniciar sesión con su correo o número de empleado y su clave asignada.
                </span>
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isSubmitting || validCount === 0}
                  className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Registrando en BD...</span>
                    </>
                  ) : (
                    <>
                      <span>Registrar {validCount} Empleados</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

