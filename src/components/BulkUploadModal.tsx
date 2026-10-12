"use strict";

'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { db, Alumno } from '@/lib/db';
import { 
  Upload, FileSpreadsheet, X, Check, AlertCircle, Download, 
  Layers, CheckCircle2, Sparkles 
} from 'lucide-react';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (targetGroup?: string) => void;
}

interface ParsedStudentPreview {
  matricula: string;
  nombreCompleto: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  telefono: string;
  tutor: string;
  isValid: boolean;
  errorReason?: string;
}

export default function BulkUploadModal({ isOpen, onClose, onSuccess }: BulkUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File & Workbook state
  const [fileName, setFileName] = useState<string>('');
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  // Group & Grade configuration
  const [writtenGroup, setWrittenGroup] = useState<string>('A');
  const [selectedGrade, setSelectedGrade] = useState<string>('1°');
  const [customGrade, setCustomGrade] = useState<string>('');

  // Parsed students preview
  const [previewStudents, setPreviewStudents] = useState<ParsedStudentPreview[]>([]);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<{ count: number; group: string } | null>(null);

  if (!isOpen) return null;

  // Helper to normalize strings for header matching (removes accents, trims, uppercase)
  const normalizeHeader = (str: unknown): string =>
    String(str ?? '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const findValueByKeys = (row: Record<string, unknown>, candidateKeys: string[]): string => {
    const rowKeys = Object.keys(row);
    for (const cand of candidateKeys) {
      const normCand = normalizeHeader(cand);
      const matchedKey = rowKeys.find(k => normalizeHeader(k) === normCand);
      if (matchedKey !== undefined && row[matchedKey] !== undefined && row[matchedKey] !== null) {
        const val = String(row[matchedKey]).trim();
        if (val.length > 0) return val;
      }
    }
    return '';
  };

  // Parse a specific worksheet from the workbook
  const parseSheetData = (wb: XLSX.WorkBook, sheetName: string) => {
    try {
      const worksheet = wb.Sheets[sheetName];
      if (!worksheet) return;

      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
      if (rawRows.length === 0) {
        setPreviewStudents([]);
        setDetectedColumns([]);
        return;
      }

      // Collect detected column names from first rows
      const allFoundKeys = Array.from(new Set(rawRows.flatMap(r => Object.keys(r))));
      setDetectedColumns(allFoundKeys);

      const parsedList: ParsedStudentPreview[] = rawRows.map((row, idx) => {
        // Detect NOMBRE, MATRICULA, TELEFONO1
        const nombreVal = findValueByKeys(row, [
          'NOMBRE', 'NOMBRE COMPLETO', 'NOMBRES', 'ALUMNO', 'ESTUDIANTE', 'NAME', 'FULL NAME'
        ]);
        const matriculaVal = findValueByKeys(row, [
          'MATRICULA', 'MATRICULA ESCOLAR', 'MATRÍCULA', 'ID', 'EXPEDIENTE', 'CODIGO', 'CLAVE', 'CVE'
        ]);
        const telefonoVal = findValueByKeys(row, [
          'TELEFONO1', 'TELEFONO 1', 'TELEFONO', 'TEL1', 'TEL', 'WHATSAPP', 'CELULAR', 'PHONE'
        ]);
        const tutorVal = findValueByKeys(row, ['TUTOR', 'PADRE', 'APODERADO', 'CONTACTO']);

        // Check if separate paternal/maternal last names exist
        const patVal = findValueByKeys(row, ['APELLIDO PATERNO', 'APELLIDO_PATERNO', 'PATERNO']);
        const matVal = findValueByKeys(row, ['APELLIDO MATERNO', 'APELLIDO_MATERNO', 'MATERNO']);

        // Check for missing required values
        if (!nombreVal && !matriculaVal) {
          return {
            matricula: '',
            nombreCompleto: '',
            nombre: '',
            apellido_paterno: '',
            apellido_materno: '',
            telefono: '',
            tutor: '',
            isValid: false,
            errorReason: 'Fila vacía o sin atributos'
          };
        }

        if (!matriculaVal) {
          return {
            matricula: `TEMP-${idx + 1}`,
            nombreCompleto: nombreVal,
            nombre: nombreVal,
            apellido_paterno: '',
            apellido_materno: '',
            telefono: telefonoVal,
            tutor: tutorVal,
            isValid: false,
            errorReason: 'Falta la Matrícula del alumno'
          };
        }

        if (!nombreVal) {
          return {
            matricula: matriculaVal,
            nombreCompleto: '',
            nombre: '',
            apellido_paterno: '',
            apellido_materno: '',
            telefono: telefonoVal,
            tutor: tutorVal,
            isValid: false,
            errorReason: 'Falta el Nombre del alumno'
          };
        }

        // Split name intelligently if paternal not provided separately
        let finalNombre = nombreVal;
        let finalPaterno = patVal || '';
        let finalMaterno = matVal || '';

        if (!finalPaterno) {
          const parts = nombreVal.split(/\s+/).filter(Boolean);
          if (parts.length === 1) {
            finalNombre = parts[0];
            finalPaterno = '-';
            finalMaterno = '';
          } else if (parts.length === 2) {
            finalNombre = parts[0];
            finalPaterno = parts[1];
            finalMaterno = '';
          } else if (parts.length === 3) {
            finalNombre = parts[0];
            finalPaterno = parts[1];
            finalMaterno = parts[2];
          } else {
            // E.g. "Juan Carlos García Hernández"
            finalNombre = parts.slice(0, parts.length - 2).join(' ');
            finalPaterno = parts[parts.length - 2];
            finalMaterno = parts[parts.length - 1];
          }
        }

        // Format phone number clean
        let cleanPhone = telefonoVal ? telefonoVal.replace(/\s+/g, '') : '+52';
        if (cleanPhone && !cleanPhone.startsWith('+')) {
          cleanPhone = cleanPhone.length === 10 ? `+52${cleanPhone}` : `+${cleanPhone}`;
        }

        return {
          matricula: matriculaVal.toUpperCase(),
          nombreCompleto: nombreVal,
          nombre: finalNombre,
          apellido_paterno: finalPaterno,
          apellido_materno: finalMaterno,
          telefono: cleanPhone,
          tutor: tutorVal || `Tutor de ${finalNombre}`,
          isValid: true
        };
      }).filter(s => s.isValid || s.errorReason !== 'Fila vacía o sin atributos');

      setPreviewStudents(parsedList);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Error parsing worksheet:', err);
      alert('Error al leer la hoja de trabajo: ' + msg);
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);

        if (wb.SheetNames.length > 0) {
          const initialSheet = wb.SheetNames[0];
          setSelectedSheet(initialSheet);

          // Infer clean group name from sheet name if possible
          const candidateGroup = initialSheet.replace(/hoja\s*\d*/i, '').replace(/sheet\s*\d*/i, '').trim();
          const defaultGroup = candidateGroup ? candidateGroup : 'A';
          setWrittenGroup(defaultGroup);

          parseSheetData(wb, initialSheet);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        alert('Error al procesar el archivo Excel: ' + msg);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Handle switching sheets in workbook
  const handleSelectSheet = (sheet: string) => {
    setSelectedSheet(sheet);
    if (workbook) {
      // Suggest sheet name as written group if it looks like a group name
      const candidateGroup = sheet.replace(/hoja\s*\d*/i, '').replace(/sheet\s*\d*/i, '').trim();
      if (candidateGroup) {
        setWrittenGroup(candidateGroup);
      }
      parseSheetData(workbook, sheet);
    }
  };

  // Download official sample Excel template
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const sampleData = [
      {
        NOMBRE: 'Carlos Martínez López',
        MATRICULA: 'DOJ-2026-101',
        TELEFONO1: '+525512345678'
      },
      {
        NOMBRE: 'Sofía Herrera Díaz',
        MATRICULA: 'DOJ-2026-102',
        TELEFONO1: '+525523456789'
      },
      {
        NOMBRE: 'Mateo Ramírez Gómez',
        MATRICULA: 'DOJ-2026-103',
        TELEFONO1: '+525534567890'
      },
      {
        NOMBRE: 'Valentina Castro Vega',
        MATRICULA: 'DOJ-2026-104',
        TELEFONO1: '+525545678901'
      },
      {
        NOMBRE: 'Sebastián Ortiz Flores',
        MATRICULA: 'DOJ-2026-105',
        TELEFONO1: '+525556789012'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    // Set column widths for readability
    ws['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 18 }];

    XLSX.utils.book_append_sheet(wb, ws, 'Grupo A');
    XLSX.writeFile(wb, 'plantilla_estudiantes_grupo.xlsx');
  };

  // Final submission: bulk insert students to database
  const handleBulkImport = async () => {
    const targetGroup = writtenGroup.trim().toUpperCase();
    if (!targetGroup) {
      alert('Por favor escribe o especifica el GRUPO asignado para esta hoja.');
      return;
    }

    const effectiveGrade = selectedGrade === 'otro' ? (customGrade.trim() || '1°') : selectedGrade;
    const validStudents = previewStudents.filter(s => s.isValid);

    if (validStudents.length === 0) {
      alert('No se encontraron estudiantes válidos para importar en esta hoja.');
      return;
    }

    setIsProcessing(true);

    try {
      const recordsToInsert: Omit<Alumno, 'id' | 'created_at'>[] = validStudents.map(s => ({
        matricula: s.matricula,
        nombre: s.nombre,
        apellido_paterno: s.apellido_paterno,
        apellido_materno: s.apellido_materno || '',
        grado: effectiveGrade,
        grupo: targetGroup,
        tutor: s.tutor,
        telefono: s.telefono,
        foto_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${s.matricula}`,
        qr_code: s.matricula
      }));

      await db.addAlumnosBulk(recordsToInsert);

      setImportStatus({
        count: recordsToInsert.length,
        group: targetGroup
      });

      // Notify parent to refresh and filter by this newly uploaded group
      setTimeout(() => {
        setIsProcessing(false);
        onSuccess(targetGroup);
        onClose();
      }, 1200);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setIsProcessing(false);
      alert(`Error al guardar en la base de datos: ${msg}`);
    }
  };

  const validCount = previewStudents.filter(s => s.isValid).length;
  const errorCount = previewStudents.filter(s => !s.isValid).length;
  const effectiveGradeDisplay = selectedGrade === 'otro' ? (customGrade || '1°') : selectedGrade;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] glass-panel rounded-2xl border-cyan-500/20 bg-[#090d16] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-start justify-between bg-gradient-to-r from-cyan-950/40 via-blue-950/20 to-transparent">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                Carga Masiva de Estudiantes por Grupo
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Excel / CSV
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                Importa listas con atributos <span className="font-mono text-cyan-400 font-bold">NOMBRE</span>, <span className="font-mono text-cyan-400 font-bold">MATRICULA</span> y <span className="font-mono text-cyan-400 font-bold">TELEFONO1</span>.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          
          {/* Top Options: Template Download & File Upload */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Template Box */}
            <div className="glass-panel p-4 rounded-xl border-white/5 bg-white/[0.02] flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Plantilla Oficial</span>
                <p className="text-xs text-gray-400 mt-1">
                  Descarga el formato exacto de Excel con las columnas requeridas para evitar errores.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 border border-cyan-500/30 text-xs font-bold transition-all cursor-pointer"
              >
                <Download size={14} />
                <span>Descargar Plantilla (.xlsx)</span>
              </button>
            </div>

            {/* Upload Box (2 cols) */}
            <div className="md:col-span-2 glass-panel p-4 rounded-xl border-dashed border-cyan-500/30 bg-cyan-950/10 flex flex-col justify-center items-center text-center space-y-3 relative hover:border-cyan-400/60 transition-all">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
                id="excel-file-input"
              />
              
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Upload size={22} />
              </div>

              <div>
                <p className="text-sm font-bold text-white">
                  {fileName ? (
                    <span className="text-cyan-400 font-mono">{fileName}</span>
                  ) : (
                    'Selecciona o arrastra tu archivo de Excel (.xlsx, .xls o .csv)'
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  El sistema detectará automáticamente las hojas de cálculo y las columnas.
                </p>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
              >
                {fileName ? 'Reemplazar Archivo' : 'Explorar Archivo'}
              </button>
            </div>

          </div>

          {/* Configuration Step: Worksheets & Group Writing */}
          {sheetNames.length > 0 && (
            <div className="glass-panel p-5 rounded-xl border-cyan-500/20 bg-cyan-950/20 space-y-4">
              
              <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                <Layers size={16} />
                <span>Configuración de Hoja y Asignación de Grupo</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                
                {/* 1. Sheet Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-300 font-bold block">
                    1. Hoja de Trabajo del archivo:
                  </label>
                  <select
                    value={selectedSheet}
                    onChange={(e) => handleSelectSheet(e.target.value)}
                    className="w-full glass-input px-3 py-2.5 rounded-xl text-sm bg-[#080d1a] border border-cyan-500/30 text-white font-semibold cursor-pointer"
                  >
                    {sheetNames.map((s) => (
                      <option key={s} value={s}>
                        📄 {s}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-400">
                    Cambia de hoja si tu archivo tiene varios grupos por pestañas.
                  </p>
                </div>

                {/* 2. Group Input (Write Group) */}
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-300 font-bold flex items-center justify-between">
                    <span>2. Escribir Grupo Asignado:</span>
                    <span className="text-[10px] text-cyan-400 font-normal">Obligatorio</span>
                  </label>
                  <input
                    type="text"
                    value={writtenGroup}
                    onChange={(e) => setWrittenGroup(e.target.value.toUpperCase())}
                    placeholder="Ej. A, B, 101, A-Matutino..."
                    className="w-full glass-input px-3 py-2.5 rounded-xl text-sm font-black text-cyan-400 uppercase tracking-wider bg-[#080d1a] border border-cyan-500/40"
                  />
                  {/* Quick Select Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-gray-500">Rápidos:</span>
                    {['A', 'B', 'C'].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setWrittenGroup(g)}
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold transition-all ${
                          writtenGroup === g 
                            ? 'bg-cyan-500 text-black' 
                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                    {selectedSheet && (
                      <button
                        type="button"
                        onClick={() => {
                          const clean = selectedSheet.replace(/hoja\s*\d*/i, '').replace(/sheet\s*\d*/i, '').trim();
                          if (clean) setWrittenGroup(clean.toUpperCase());
                        }}
                        className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-cyan-300 hover:bg-white/10 font-bold"
                        title="Usar nombre de la hoja como grupo"
                      >
                        Usar nombre hoja
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. Grade Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-300 font-bold block">
                    3. Grado Escolar:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['1°', '2°', '3°'].map((grade) => (
                      <button
                        key={grade}
                        type="button"
                        onClick={() => setSelectedGrade(grade)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                          selectedGrade === grade
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black border-cyan-400 font-extrabold shadow-sm'
                            : 'bg-white/5 text-gray-300 border-white/5 hover:bg-white/10'
                        }`}
                      >
                        {grade}
                      </button>
                    ))}
                  </div>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedGrade(selectedGrade === 'otro' ? '1°' : 'otro')}
                      className="text-[11px] text-gray-400 hover:text-cyan-400 underline"
                    >
                      {selectedGrade === 'otro' ? 'Usar grado estándar' : 'Escribir grado personalizado'}
                    </button>
                    {selectedGrade === 'otro' && (
                      <input
                        type="text"
                        value={customGrade}
                        onChange={(e) => setCustomGrade(e.target.value)}
                        placeholder="Ej. 4°, Semestre 1..."
                        className="w-full mt-1.5 glass-input px-3 py-1.5 rounded-lg text-xs bg-[#080d1a]"
                      />
                    )}
                  </div>
                </div>

              </div>

              {/* Detected columns feedback */}
              {detectedColumns.length > 0 && (
                <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-400">
                  <span className="font-semibold text-gray-300">Columnas encontradas en esta hoja:</span>
                  {detectedColumns.map(col => (
                    <span key={col} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px] text-cyan-300">
                      {col}
                    </span>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* Preview Table & Stats */}
          {previewStudents.length > 0 && (
            <div className="space-y-3">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-white text-sm">Vista Previa de Alumnos Detectados</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                    {validCount} listos
                  </span>
                  {errorCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/30">
                      {errorCount} con advertencia
                    </span>
                  )}
                </div>

                <div className="text-xs text-gray-400 flex items-center space-x-2">
                  <span>Asignando a:</span>
                  <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded">
                    Grado {effectiveGradeDisplay}
                  </span>
                  <span className="font-extrabold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 rounded">
                    Grupo &quot;{writtenGroup || 'SIN ASIGNAR'}&quot;
                  </span>
                </div>
              </div>

              {/* Table Container */}
              <div className="glass-panel rounded-xl border-white/5 overflow-hidden">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-[#0d1322] border-b border-white/10 text-gray-400 uppercase text-[10px] tracking-wider z-10">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Matrícula</th>
                        <th className="py-2.5 px-3">Nombre(s)</th>
                        <th className="py-2.5 px-3">Apellidos</th>
                        <th className="py-2.5 px-3">Teléfono 1</th>
                        <th className="py-2.5 px-3">Grupo Asignado</th>
                        <th className="py-2.5 px-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-300">
                      {previewStudents.slice(0, 50).map((student, i) => (
                        <tr key={student.matricula || i} className={student.isValid ? 'hover:bg-white/[0.02]' : 'bg-red-500/[0.04]'}>
                          <td className="py-2 px-3 text-gray-500 font-mono">{i + 1}</td>
                          <td className="py-2 px-3 font-mono font-bold text-cyan-400">
                            {student.matricula}
                          </td>
                          <td className="py-2 px-3 font-semibold text-white">
                            {student.nombre}
                          </td>
                          <td className="py-2 px-3 text-gray-300">
                            {student.apellido_paterno} {student.apellido_materno}
                          </td>
                          <td className="py-2 px-3 font-mono text-gray-400">
                            {student.telefono}
                          </td>
                          <td className="py-2 px-3">
                            <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-mono font-bold">
                              {writtenGroup || '-'}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            {student.isValid ? (
                              <span className="inline-flex items-center space-x-1 text-emerald-400 text-[11px] font-semibold">
                                <Check size={13} />
                                <span>Válido</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 text-red-400 text-[11px] font-semibold" title={student.errorReason}>
                                <AlertCircle size={13} />
                                <span>{student.errorReason || 'Incompleto'}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {previewStudents.length > 50 && (
                  <div className="py-2 px-4 bg-white/[0.02] border-t border-white/5 text-[11px] text-gray-400 text-center">
                    Mostrando primeros 50 registros de un total de {previewStudents.length}.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Success Toast banner if recently imported */}
          {importStatus && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-3 text-emerald-300">
              <CheckCircle2 size={24} className="text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-sm">
                  ¡Alumnos importados con éxito!
                </p>
                <p className="text-xs text-emerald-400/80">
                  Se subieron {importStatus.count} estudiantes al Grupo &quot;{importStatus.group}&quot;. Actualizando directorio...
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-[#06080f] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-400 flex items-center space-x-2">
            <Sparkles size={14} className="text-cyan-400" />
            <span>
              Generación automática de códigos QR y credenciales digitales para cada alumno.
            </span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl glass-panel text-xs text-gray-400 font-bold hover:bg-white/5 transition-all cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleBulkImport}
              disabled={isProcessing || validCount === 0 || !writtenGroup.trim()}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>
                    Importar {validCount > 0 ? `${validCount} Alumnos` : 'Estudiantes'} al Grupo &quot;{writtenGroup || '...'}&quot;
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
