"use strict";

'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import { 
  X, UploadCloud, FileSpreadsheet, Download, CheckCircle2, 
  AlertTriangle, Sparkles, RefreshCw
} from 'lucide-react';
import { 
  BloqueHorario, 
  parseHorariosFromWorkbook, 
  downloadHorariosExcelTemplate, 
  getStoredHorarios, 
  saveHorarios,
  resetHorariosToDefault,
  sortGruposOficiales
} from '@/lib/horarios';

interface SubirHorariosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHorariosUpdated: (horarios: BloqueHorario[]) => void;
}

export default function SubirHorariosModal({ isOpen, onClose, onHorariosUpdated }: SubirHorariosModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [parsedBloques, setParsedBloques] = useState<BloqueHorario[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (file: File) => {
    setErrors([]);
    setSuccessMessage(null);
    setFileName(file.name);
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
      const result = parseHorariosFromWorkbook(wb);

      if (result.errors.length > 0 && result.bloques.length === 0) {
        setErrors(result.errors);
        setParsedBloques([]);
      } else if (result.bloques.length === 0) {
        setErrors(['No se pudieron extraer bloques válidos del archivo. Verifica que contenga pestañas de grupo o columnas de Materia y Docente.']);
        setParsedBloques([]);
      } else {
        setParsedBloques(result.bloques);
      }
    } catch (e: any) {
      setErrors([`Error al procesar el archivo Excel: ${e.message || e}`]);
      setParsedBloques([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (parsedBloques.length === 0) return;

    let finalHorarios: BloqueHorario[] = [];
    if (importMode === 'replace') {
      finalHorarios = parsedBloques;
    } else {
      const existing = getStoredHorarios();
      const map = new Map<string, BloqueHorario>();
      existing.forEach(b => map.set(`${b.grupo}-${b.dia}-${b.horaInicio}`, b));
      parsedBloques.forEach(b => map.set(`${b.grupo}-${b.dia}-${b.horaInicio}`, b));
      finalHorarios = Array.from(map.values());
    }

    saveHorarios(finalHorarios, importMode);
    onHorariosUpdated(finalHorarios);

    confetti({
      particleCount: 75,
      spread: 70,
      origin: { y: 0.6 }
    });

    const grpCount = new Set(parsedBloques.map(b => b.grupo)).size;
    setSuccessMessage(`¡Se han cargado exitosamente ${parsedBloques.length} bloques de clase (${grpCount} grupos) con docentes normalizados!`);
    setTimeout(() => {
      onClose();
      setParsedBloques([]);
      setFileName('');
      setSuccessMessage(null);
    }, 1500);
  };

  const handleLoadOfficialDemo = () => {
    const defaults = resetHorariosToDefault();
    onHorariosUpdated(defaults);

    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.6 }
    });

    setSuccessMessage('¡Se cargaron los 12 grupos oficiales de HORARIOS DE GRUPO 2026-2 (1A a 5APGA, 351 clases)!');
    setTimeout(() => {
      onClose();
      setSuccessMessage(null);
    }, 1500);
  };

  // Group and teacher summary from parsed preview
  const groupsDetected = sortGruposOficiales(Array.from(new Set(parsedBloques.map(b => b.grupo))));
  const teachersDetected = Array.from(new Set(parsedBloques.map(b => b.maestro)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#090d16] border border-cyan-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl text-gray-200 max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold uppercase tracking-wider">
              <span>👑 Privilegio de Administrador</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white flex items-center space-x-2">
              <UploadCloud className="text-cyan-400" size={24} />
              <span>Subir Horarios de Grupo (2026-2)</span>
            </h3>
            <p className="text-xs text-gray-400">
              Soporta libros multipestaña de CECYTE BC (<strong className="text-gray-200">HORARIOS DE GRUPO 2026-2.xlsx</strong> con los 12 grupos) o plantillas tabulares.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-5 pr-1">

          {/* Quick template and official 2026-2 load buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={downloadHorariosExcelTemplate}
              className="flex items-center justify-center space-x-2 p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 text-xs font-bold transition-all cursor-pointer group"
            >
              <Download size={16} className="group-hover:-translate-y-0.5 transition-transform" />
              <span>Descargar Plantilla Oficial (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handleLoadOfficialDemo}
              className="flex items-center justify-center space-x-2 p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 hover:bg-cyan-500/20 text-xs font-bold transition-all cursor-pointer group"
            >
              <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />
              <span>Cargar los 12 Grupos Oficiales 2026-2</span>
            </button>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-3 ${
              isDragging 
                ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]' 
                : 'border-white/15 bg-black/40 hover:border-cyan-500/40 hover:bg-white/[0.02]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              className="hidden"
            />

            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <FileSpreadsheet size={28} />
            </div>

            <div>
              <p className="text-sm font-bold text-white">
                {fileName ? fileName : 'Selecciona o arrastra HORARIOS DE GRUPO 2026-2.xlsx'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Formatos compatibles: Microsoft Excel multipestaña (.xlsx, .xls) o CSV (.csv)
              </p>
            </div>

            <span className="px-4 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-semibold">
              Explorar archivos en tu equipo
            </span>
          </div>

          {/* Feedback & Errors */}
          {errors.length > 0 && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 space-y-1 text-xs">
              <div className="flex items-center space-x-2 font-bold text-red-400">
                <AlertTriangle size={16} />
                <span>No se pudo procesar el archivo:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 opacity-90">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center space-x-2 text-xs font-bold animate-in fade-in">
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Parsed Preview */}
          {parsedBloques.length > 0 && (
            <div className="space-y-3 glass-panel p-4 rounded-2xl border border-white/10 bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span className="text-xs font-extrabold text-white">
                    Vista Previa de Detección ({parsedBloques.length} bloques de clase)
                  </span>
                </div>
                <span className="text-[11px] text-cyan-300 font-bold">
                  {groupsDetected.length} grupos • {teachersDetected.length} maestros
                </span>
              </div>

              {/* Group Badges preview */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-bold uppercase text-gray-400">Grupos detectados ({groupsDetected.length}):</p>
                <div className="flex flex-wrap gap-1.5">
                  {groupsDetected.map(g => (
                    <span key={g} className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-mono font-bold">
                      {g}
                    </span>
                  ))}
                </div>
              </div>

              {/* Teacher Badges preview */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-bold uppercase text-gray-400">Maestros normalizados ({teachersDetected.length}):</p>
                <div className="flex flex-wrap gap-1.5">
                  {teachersDetected.map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                      👨‍🏫 {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Mode Selection */}
              <div className="pt-2 border-t border-white/5 space-y-1.5">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Modo de Inserción:</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      importMode === 'replace'
                        ? 'bg-cyan-500/15 border-cyan-500 text-white font-bold ring-1 ring-cyan-400'
                        : 'glass-panel text-gray-400 hover:text-white'
                    }`}
                  >
                    <p className="font-bold flex items-center space-x-1">
                      <span>🔄 Reemplazar todo</span>
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Sustituye los horarios actuales con este archivo</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportMode('merge')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      importMode === 'merge'
                        ? 'bg-cyan-500/15 border-cyan-500 text-white font-bold ring-1 ring-cyan-400'
                        : 'glass-panel text-gray-400 hover:text-white'
                    }`}
                  >
                    <p className="font-bold flex items-center space-x-1">
                      <span>➕ Combinar / Actualizar</span>
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Actualiza los grupos del archivo sin borrar otros</p>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl glass-panel text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={parsedBloques.length === 0 || isProcessing}
            onClick={handleConfirmImport}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isProcessing ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>Confirmar y Guardar Horarios ({parsedBloques.length})</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
