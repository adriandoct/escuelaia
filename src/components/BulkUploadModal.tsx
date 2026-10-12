"use strict";

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { db, Alumno } from '@/lib/db';
import { 
  Upload, FileSpreadsheet, X, Check, AlertCircle, Download, 
  Layers, CheckCircle2, Sparkles, Filter, Hash, User, Phone, CheckSquare
} from 'lucide-react';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (targetGroup?: string) => void;
}

interface ColumnOption {
  index: number;
  letter: string;
  name: string;
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

// Convert 0-indexed column number to Excel letter (0 -> A, 1 -> B, 26 -> AA)
const getExcelColumnLetter = (colIndex: number): string => {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
};

// String normalization for header comparison
const normalizeText = (val: unknown): string =>
  String(val ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const isMatriculaHeader = (text: string): boolean => {
  const norm = normalizeText(text);
  return (
    norm.includes('MATRICULA') ||
    norm.includes('CONTROL') ||
    norm.includes('EXPEDIENTE') ||
    norm.includes('ID ALUMNO') ||
    norm === 'ID' ||
    norm.includes('CVE') ||
    norm.includes('CLAVE') ||
    norm.includes('FOLIO') ||
    norm === 'REGISTRO' ||
    norm === 'CODIGO'
  );
};

const isNombreHeader = (text: string): boolean => {
  const norm = normalizeText(text);
  return (
    norm.includes('NOMBRE') ||
    norm.includes('ALUMNO') ||
    norm.includes('ESTUDIANTE') ||
    norm.includes('APELLIDO')
  );
};

const isTelefonoHeader = (text: string): boolean => {
  const norm = normalizeText(text);
  return (
    norm.includes('TELEFONO1') ||
    norm.includes('TELEFONO 1') ||
    norm.includes('TEL1') ||
    norm.includes('TEL 1') ||
    norm.includes('TELEFONO') ||
    norm.includes('TEL') ||
    norm.includes('CEL') ||
    norm.includes('WHATSAPP') ||
    norm.includes('MOVIL') ||
    norm.includes('CONTACTO')
  );
};

// Check if a row is a summary or repeated title row
const isSummaryOrHeaderRow = (matricula: string, nombre: string): boolean => {
  const normMat = normalizeText(matricula);
  const normNom = normalizeText(nombre);

  if (!normMat && !normNom) return true;

  // Header repetitions
  if (normMat.includes('MATRICULA') || normMat.includes('CONTROL') || normNom.includes('NOMBRE') || normNom.includes('ALUMNO')) {
    return true;
  }

  // Summary / report labels to ignore
  const ignoreKeywords = [
    'TOTAL', 'TOTALES', 'PROMEDIO', 'PROMEDIOS', 'APROBADO', 'APROBADOS',
    'REPROBADO', 'REPROBADOS', 'DOCENTE', 'PROFESOR', 'FIRMA', 'FECHA',
    'PARCIAL', 'PRIMER PARCIAL', 'SEGUNDO PARCIAL', 'TERCER PARCIAL',
    'SEMESTRE', 'ASIGNATURA', 'MATERIA', 'OBSERVACIONES',
    'HOMBRES', 'MUJERES', 'CANTIDAD', 'BAJAS', 'ALUMNOS INSCRITOS', 'GRUPO'
  ];

  for (const kw of ignoreKeywords) {
    if (normMat === kw || normMat.startsWith(kw) || normNom === kw || normNom.startsWith(kw)) {
      return true;
    }
  }

  return false;
};

export default function BulkUploadModal({ isOpen, onClose, onSuccess }: BulkUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File & Workbook state
  const [fileName, setFileName] = useState<string>('');
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  // 2D Matrix of the current sheet
  const [sheetMatrix, setSheetMatrix] = useState<unknown[][]>([]);
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(0);
  const [availableColumns, setAvailableColumns] = useState<ColumnOption[]>([]);

  // Selected column mappings
  const [colMatriculaIndex, setColMatriculaIndex] = useState<number>(-1);
  const [colNombreIndex, setColNombreIndex] = useState<number>(-1);
  const [colTelefonoIndex, setColTelefonoIndex] = useState<number>(-1);

  // Group & Grade configuration
  const [writtenGroup, setWrittenGroup] = useState<string>('A');
  const [selectedGrade, setSelectedGrade] = useState<string>('1°');
  const [customGrade, setCustomGrade] = useState<string>('');

  // Parsed students preview
  const [previewStudents, setPreviewStudents] = useState<ParsedStudentPreview[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<{ count: number; group: string } | null>(null);

  // Parse a sheet into raw 2D array and auto-detect header row & columns
  const loadSheetMatrix = useCallback((wb: XLSX.WorkBook, sheetName: string) => {
    try {
      const worksheet = wb.Sheets[sheetName];
      if (!worksheet) return;

      // Extract raw rows as 2D array to inspect without losing row positions
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: '' });
      if (!matrix || matrix.length === 0) {
        setSheetMatrix([]);
        setAvailableColumns([]);
        setPreviewStudents([]);
        return;
      }

      setSheetMatrix(matrix);

      // Find best header row (scan first 25 rows)
      let bestRowIndex = 0;
      let highestScore = -1;

      const maxScan = Math.min(25, matrix.length);
      for (let r = 0; r < maxScan; r++) {
        const row = matrix[r];
        if (!Array.isArray(row)) continue;

        let score = 0;
        let hasMatricula = false;
        let hasNombre = false;

        row.forEach((cell) => {
          const str = String(cell ?? '').trim();
          if (!str) return;

          if (isMatriculaHeader(str)) {
            score += 10;
            hasMatricula = true;
          }
          if (isNombreHeader(str)) {
            score += 10;
            hasNombre = true;
          }
          if (isTelefonoHeader(str)) {
            score += 8;
          }
        });

        // Boost if both matricula and nombre are in the same row
        if (hasMatricula && hasNombre) score += 20;

        if (score > highestScore && score > 0) {
          highestScore = score;
          bestRowIndex = r;
        }
      }

      setHeaderRowIndex(bestRowIndex);

      // Build column options from the detected header row
      const headerRow = matrix[bestRowIndex] || [];
      const cols: ColumnOption[] = [];
      const totalCols = Math.max(headerRow.length, ...matrix.slice(0, 10).map(r => r?.length || 0));

      for (let c = 0; c < totalCols; c++) {
        const rawName = String(headerRow[c] ?? '').trim();
        // If current header cell is empty, check previous row cell (for merged multi-level headers)
        const fallbackName = rawName || (bestRowIndex > 0 ? String(matrix[bestRowIndex - 1]?.[c] ?? '').trim() : '');
        const letter = getExcelColumnLetter(c);
        const label = fallbackName ? `${letter}: ${fallbackName}` : `Columna ${letter}`;

        cols.push({
          index: c,
          letter,
          name: label
        });
      }

      setAvailableColumns(cols);

      // Auto-detect column indices for Matricula, Nombre and Telefono
      let detectedMat = -1;
      let detectedNom = -1;
      let detectedTel = -1;

      cols.forEach(col => {
        const norm = normalizeText(col.name);
        if (detectedMat === -1 && isMatriculaHeader(norm)) {
          detectedMat = col.index;
        }
        if (detectedNom === -1 && isNombreHeader(norm)) {
          detectedNom = col.index;
        }
        if (detectedTel === -1 && isTelefonoHeader(norm)) {
          detectedTel = col.index;
        }
      });

      // Fallbacks if not found by header label: scan sample data rows (check column patterns)
      if (detectedMat === -1 || detectedNom === -1) {
        const sampleRows = matrix.slice(bestRowIndex + 1, bestRowIndex + 10);
        for (let c = 0; c < totalCols; c++) {
          const sampleValues = sampleRows.map(r => String(r?.[c] ?? '').trim()).filter(Boolean);
          if (sampleValues.length === 0) continue;

          // Check if looks like a student registration code (numeric or alphanumeric, 5-15 chars)
          const allLookLikeMatricula = sampleValues.every(v => /^[A-Za-z0-9\-_]{5,20}$/.test(v) && !v.includes(' '));
          if (detectedMat === -1 && allLookLikeMatricula) {
            detectedMat = c;
            continue;
          }

          // Check if looks like a full name (contains space, letters only)
          const allLookLikeNames = sampleValues.every(v => v.includes(' ') && /^[A-Za-zÁÉÍÓÚáéíóúñÑ\s\.]+$/.test(v));
          if (detectedNom === -1 && allLookLikeNames) {
            detectedNom = c;
          }
        }
      }

      setColMatriculaIndex(detectedMat !== -1 ? detectedMat : (cols[0]?.index ?? 0));
      setColNombreIndex(detectedNom !== -1 ? detectedNom : (cols[1]?.index ?? 1));
      setColTelefonoIndex(detectedTel !== -1 ? detectedTel : -1);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Error loading sheet matrix:', err);
      alert('Error al leer la hoja de trabajo: ' + msg);
    }
  }, []);

  // Recalculate parsed students preview when column mappings, matrix, or header row changes
  useEffect(() => {
    if (!sheetMatrix || sheetMatrix.length === 0) {
      setPreviewStudents([]);
      return;
    }

    if (colMatriculaIndex === -1 && colNombreIndex === -1) {
      setPreviewStudents([]);
      return;
    }

    const students: ParsedStudentPreview[] = [];
    const dataRows = sheetMatrix.slice(headerRowIndex + 1);

    dataRows.forEach((row, idx) => {
      if (!Array.isArray(row)) return;

      const rawMatricula = colMatriculaIndex >= 0 ? String(row[colMatriculaIndex] ?? '').trim() : '';
      const rawNombre = colNombreIndex >= 0 ? String(row[colNombreIndex] ?? '').trim() : '';
      const rawTelefono = colTelefonoIndex >= 0 ? String(row[colTelefonoIndex] ?? '').trim() : '';

      // Skip empty or summary rows (TOTALES, PROMEDIO, PARCIALES, etc.)
      if (isSummaryOrHeaderRow(rawMatricula, rawNombre)) {
        return;
      }

      // Check validation
      if (!rawMatricula || !rawNombre) {
        students.push({
          matricula: rawMatricula || `FILA-${idx + 1}`,
          nombreCompleto: rawNombre,
          nombre: rawNombre,
          apellido_paterno: '',
          apellido_materno: '',
          telefono: rawTelefono,
          tutor: '',
          isValid: false,
          errorReason: !rawMatricula ? 'Falta Matrícula' : 'Falta Nombre'
        });
        return;
      }

      // Split name intelligently into nombre and apellidos
      const parts = rawNombre.split(/\s+/).filter(Boolean);
      let finalNombre = rawNombre;
      let finalPaterno = '-';
      let finalMaterno = '';

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
        // 4+ words (e.g. "Juan Carlos Pérez Gómez")
        finalNombre = parts.slice(0, parts.length - 2).join(' ');
        finalPaterno = parts[parts.length - 2];
        finalMaterno = parts[parts.length - 1];
      }

      // Format telephone number
      let cleanPhone = rawTelefono ? rawTelefono.replace(/[\s\-\(\)]/g, '') : '+52';
      if (cleanPhone && cleanPhone !== '+52' && !cleanPhone.startsWith('+')) {
        cleanPhone = cleanPhone.length === 10 ? `+52${cleanPhone}` : `+${cleanPhone}`;
      }

      students.push({
        matricula: rawMatricula.toUpperCase(),
        nombreCompleto: rawNombre,
        nombre: finalNombre,
        apellido_paterno: finalPaterno,
        apellido_materno: finalMaterno,
        telefono: cleanPhone || '+52',
        tutor: `Tutor de ${finalNombre}`,
        isValid: true
      });
    });

    setPreviewStudents(students);
  }, [sheetMatrix, headerRowIndex, colMatriculaIndex, colNombreIndex, colTelefonoIndex]);

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

          // Infer clean group name from sheet name
          const candidateGroup = initialSheet.replace(/hoja\s*\d*/i, '').replace(/sheet\s*\d*/i, '').trim();
          setWrittenGroup(candidateGroup ? candidateGroup.toUpperCase() : 'A');

          loadSheetMatrix(wb, initialSheet);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        alert('Error al procesar el archivo Excel: ' + msg);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Switch sheet
  const handleSelectSheet = (sheet: string) => {
    setSelectedSheet(sheet);
    if (workbook) {
      const candidateGroup = sheet.replace(/hoja\s*\d*/i, '').replace(/sheet\s*\d*/i, '').trim();
      if (candidateGroup) {
        setWrittenGroup(candidateGroup.toUpperCase());
      }
      loadSheetMatrix(workbook, sheet);
    }
  };

  // Change header row index manually if needed
  const handleChangeHeaderRow = (newRowIdx: number) => {
    setHeaderRowIndex(newRowIdx);
    if (sheetMatrix && sheetMatrix[newRowIdx]) {
      const headerRow = sheetMatrix[newRowIdx];
      const cols: ColumnOption[] = [];
      const totalCols = Math.max(headerRow.length, ...sheetMatrix.slice(0, 10).map(r => r?.length || 0));

      for (let c = 0; c < totalCols; c++) {
        const rawName = String(headerRow[c] ?? '').trim();
        const letter = getExcelColumnLetter(c);
        cols.push({
          index: c,
          letter,
          name: rawName ? `${letter}: ${rawName}` : `Columna ${letter}`
        });
      }
      setAvailableColumns(cols);
    }
  };

  // Download official template
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const sampleData = [
      {
        MATRICULA: 'DOJ-2026-101',
        NOMBRE: 'Carlos Martínez López',
        TELEFONO1: '+525512345678'
      },
      {
        MATRICULA: 'DOJ-2026-102',
        NOMBRE: 'Sofía Herrera Díaz',
        TELEFONO1: '+525523456789'
      },
      {
        MATRICULA: 'DOJ-2026-103',
        NOMBRE: 'Mateo Ramírez Gómez',
        TELEFONO1: '+525534567890'
      },
      {
        MATRICULA: 'DOJ-2026-104',
        NOMBRE: 'Valentina Castro Vega',
        TELEFONO1: '+525545678901'
      },
      {
        MATRICULA: 'DOJ-2026-105',
        NOMBRE: 'Sebastián Ortiz Flores',
        TELEFONO1: '+525556789012'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws['!cols'] = [{ wch: 18 }, { wch: 32 }, { wch: 20 }];

    XLSX.utils.book_append_sheet(wb, ws, 'Grupo A');
    XLSX.writeFile(wb, 'plantilla_matricula_nombre_telefono1.xlsx');
  };

  // Bulk import only Matricula, Nombre and Telefono1 (ignore all other columns)
  const handleBulkImport = async () => {
    const targetGroup = writtenGroup.trim().toUpperCase();
    if (!targetGroup) {
      alert('Por favor escribe el GRUPO asignado para esta lista.');
      return;
    }

    const effectiveGrade = selectedGrade === 'otro' ? (customGrade.trim() || '1°') : selectedGrade;
    const validStudents = previewStudents.filter(s => s.isValid);

    if (validStudents.length === 0) {
      alert('No se encontraron alumnos válidos para importar. Revisa el mapeo de columnas de Matrícula y Nombre.');
      return;
    }

    setIsProcessing(true);

    try {
      // ONLY include Matricula, Nombre, Telefono1 (and required system fields)
      // Discard all other columns from the Excel (grades, partials, totals, averages, etc.)
      const recordsToInsert: Omit<Alumno, 'id' | 'created_at'>[] = validStudents.map(s => ({
        matricula: s.matricula,
        nombre: s.nombre,
        apellido_paterno: s.apellido_paterno,
        apellido_materno: s.apellido_materno || '',
        grado: effectiveGrade,
        grupo: targetGroup,
        tutor: s.tutor,
        telefono: s.telefono || '+52',
        foto_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${s.matricula}`,
        qr_code: s.matricula
      }));

      await db.addAlumnosBulk(recordsToInsert);

      setImportStatus({
        count: recordsToInsert.length,
        group: targetGroup
      });

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

  if (!isOpen) return null;

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
                Subir Alumnos por Grupos (Excel)
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Filtro Estricto
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                Detecta y extrae únicamente <span className="font-mono text-cyan-400 font-bold">MATRÍCULA</span>, <span className="font-mono text-cyan-400 font-bold">NOMBRE</span> y <span className="font-mono text-cyan-400 font-bold">TELÉFONO 1</span>. Las demás columnas (parciales, promedios) son ignoradas.
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
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Plantilla Limpia</span>
                <p className="text-xs text-gray-400 mt-1">
                  Descarga un archivo con las 3 columnas exactas: MATRICULA, NOMBRE y TELEFONO1.
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
                    'Selecciona o arrastra tu lista de Excel o calificaciones (.xlsx, .xls, .csv)'
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Compatible con listas de parciales, actas de evaluación y hojas con encabezados complejos.
                </p>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
              >
                {fileName ? 'Cambiar Archivo' : 'Seleccionar Archivo de Alumnos'}
              </button>
            </div>

          </div>

          {/* Configuration Step: Worksheets & Group Writing */}
          {sheetNames.length > 0 && (
            <div className="glass-panel p-5 rounded-xl border-cyan-500/20 bg-cyan-950/20 space-y-4">
              
              <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                <Layers size={16} />
                <span>1. Selección de Hoja y Asignación de Grupo</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                
                {/* 1. Sheet Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-300 font-bold block">
                    Hoja de Trabajo activa:
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
                    Selecciona la pestaña correspondiente al grupo que deseas subir.
                  </p>
                </div>

                {/* 2. Group Input (Write Group) */}
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-300 font-bold flex items-center justify-between">
                    <span>Escribir Grupo Asignado:</span>
                    <span className="text-[10px] text-cyan-400 font-normal">Obligatorio</span>
                  </label>
                  <input
                    type="text"
                    value={writtenGroup}
                    onChange={(e) => setWrittenGroup(e.target.value.toUpperCase())}
                    placeholder="Ej. A, B, 1A, 101, Matutino-A..."
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
                    Grado Escolar:
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

            </div>
          )}

          {/* CRITICAL STEP: Column Mapping for Matricula, Nombre and Telefono1 */}
          {availableColumns.length > 0 && (
            <div className="glass-panel p-5 rounded-xl border-cyan-500/30 bg-[#0d1322] space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                  <Filter size={16} />
                  <span>2. Mapeo de Atributos Solicitados (Exclusivo Matricula, Nombre, Telefono1)</span>
                </div>

                <div className="flex items-center space-x-2 text-[11px] text-gray-400">
                  <span>Fila de Encabezados:</span>
                  <select
                    value={headerRowIndex}
                    onChange={(e) => handleChangeHeaderRow(Number(e.target.value))}
                    className="glass-input px-2 py-1 rounded-lg text-xs bg-[#080d1a] border border-cyan-500/30 text-cyan-300 font-mono font-bold"
                  >
                    {Array.from({ length: Math.min(15, sheetMatrix.length) }).map((_, r) => (
                      <option key={r} value={r}>
                        Fila {r + 1}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3 Strict Column Pickers */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. Matricula Selector */}
                <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <label className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <Hash size={14} className="text-cyan-400" />
                    <span>Columna de MATRÍCULA *</span>
                  </label>
                  <select
                    value={colMatriculaIndex}
                    onChange={(e) => setColMatriculaIndex(Number(e.target.value))}
                    className={`w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold bg-[#080d1a] ${
                      colMatriculaIndex >= 0 ? 'border-cyan-500/50 text-cyan-300' : 'border-red-500/50 text-red-300'
                    }`}
                  >
                    <option value={-1}>-- Seleccionar Columna --</option>
                    {availableColumns.map((col) => (
                      <option key={col.index} value={col.index}>
                        {col.name}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-gray-400 block">
                    No. de control, clave de alumno o ID.
                  </span>
                </div>

                {/* 2. Nombre Selector */}
                <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <label className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <User size={14} className="text-cyan-400" />
                    <span>Columna de NOMBRE *</span>
                  </label>
                  <select
                    value={colNombreIndex}
                    onChange={(e) => setColNombreIndex(Number(e.target.value))}
                    className={`w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold bg-[#080d1a] ${
                      colNombreIndex >= 0 ? 'border-cyan-500/50 text-cyan-300' : 'border-red-500/50 text-red-300'
                    }`}
                  >
                    <option value={-1}>-- Seleccionar Columna --</option>
                    {availableColumns.map((col) => (
                      <option key={col.index} value={col.index}>
                        {col.name}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-gray-400 block">
                    Nombre completo o apellidos del alumno.
                  </span>
                </div>

                {/* 3. Telefono1 Selector */}
                <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <label className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <Phone size={14} className="text-cyan-400" />
                    <span>Columna de TELEFONO 1</span>
                  </label>
                  <select
                    value={colTelefonoIndex}
                    onChange={(e) => setColTelefonoIndex(Number(e.target.value))}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold bg-[#080d1a] border-cyan-500/30 text-cyan-300"
                  >
                    <option value={-1}>-- Sin columna de teléfono (+52 por defecto) --</option>
                    {availableColumns.map((col) => (
                      <option key={col.index} value={col.index}>
                        {col.name}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-gray-400 block">
                    Teléfono celular o WhatsApp para notificaciones.
                  </span>
                </div>

              </div>

              <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/20 text-[11px] text-cyan-300/90 flex items-center space-x-2">
                <CheckSquare size={14} className="text-cyan-400 shrink-0" />
                <span>
                  <strong>Aviso:</strong> Solo se extraerán y guardarán la <strong>Matrícula</strong>, <strong>Nombre</strong> y <strong>Teléfono 1</strong>. Calificaciones, parciales, asistencias y promedios presentes en tu archivo serán ignorados por completo.
                </span>
              </div>

            </div>
          )}

          {/* Preview Table & Stats */}
          {previewStudents.length > 0 && (
            <div className="space-y-3">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-white text-sm">Vista Previa de Alumnos Detectados</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                    {validCount} alumnos listos
                  </span>
                  {errorCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/30">
                      {errorCount} filas omitidas/incompletas
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
                      {previewStudents.slice(0, 60).map((student, i) => (
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

                {previewStudents.length > 60 && (
                  <div className="py-2 px-4 bg-white/[0.02] border-t border-white/5 text-[11px] text-gray-400 text-center">
                    Mostrando primeros 60 registros de un total de {previewStudents.length} alumnos detectados.
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
