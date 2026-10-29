"use strict";

'use client';

import React, { useState, useMemo } from 'react';
import { 
  BloqueHorario, 
  DiaSemana, 
  DIAS_SEMANA, 
  MODULOS_OFICIALES, 
  getMaestroPalette, 
  getMaestrosDirectory,
  exportHorariosWorkbook 
} from '@/lib/horarios';
import { 
  Printer, Download, ArrowLeft, Filter, Sparkles, 
  BookOpen, Users, Calendar, Clock, MapPin, CheckCircle2, 
  FileText, Award
} from 'lucide-react';

interface ReporteHorariosPorGrupoProps {
  horarios: BloqueHorario[];
  initialGroup?: string;
  initialGrade?: string;
  onBackToGrid: () => void;
}

export default function ReporteHorariosPorGrupo({
  horarios,
  initialGroup = '1A',
  initialGrade = '1°',
  onBackToGrid
}: ReporteHorariosPorGrupoProps) {
  const [selectedGroup, setSelectedGroup] = useState<string>(initialGroup);
  const [viewScope, setViewScope] = useState<'individual' | 'consolidado' | 'docentes'>('individual');

  // All distinct groups
  const allGroups = useMemo(() => {
    const set = new Set<string>();
    horarios.forEach(h => set.add(h.grupo));
    return Array.from(set).sort();
  }, [horarios]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    exportHorariosWorkbook(horarios, viewScope === 'individual' ? selectedGroup : 'TODOS');
  };

  // Helper to build a schedule matrix for a specific group
  const buildGroupMatrix = (grp: string) => {
    const groupBlocks = horarios.filter(h => h.grupo === grp);
    const map = new Map<string, BloqueHorario>();
    groupBlocks.forEach(b => {
      map.set(`${b.dia}-${b.modulo}`, b);
    });

    const teachers = getMaestrosDirectory(groupBlocks);
    const sampleGrado = groupBlocks[0]?.grado || '1°';
    const sampleTurno = groupBlocks[0]?.turno || 'Matutino';

    return { groupBlocks, map, teachers, sampleGrado, sampleTurno };
  };

  // Render a single group's official institutional schedule card
  const renderSingleGroupReport = (grp: string, showPageBreak = false) => {
    const { groupBlocks, map, teachers, sampleGrado, sampleTurno } = buildGroupMatrix(grp);

    return (
      <div 
        key={grp}
        className={`bg-white text-gray-900 p-6 sm:p-8 rounded-3xl shadow-xl border border-gray-200 print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none mb-10 ${
          showPageBreak ? 'break-after-page page-break-always' : ''
        }`}
      >
        
        {/* =========================================================================
            INSTITUTIONAL HEADER (CECYTE BC)
            ========================================================================= */}
        <div className="border-b-2 border-emerald-700 pb-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/lions_kai_logo.png" 
              alt="CECYTE BC" 
              className="h-14 w-auto object-contain print:h-12"
            />
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight text-emerald-800 uppercase">
                Colegio de Estudios Científicos y Tecnológicos de BC
              </h2>
              <p className="text-xs font-bold text-gray-700 uppercase">
                Plantel CECYTE BC • Dirección Académica • Control Escolar
              </p>
              <p className="text-[11px] text-gray-500 font-semibold">
                Ciclo Escolar: <span className="text-gray-900 font-bold">2026-1</span> • Turno: <span className="text-gray-900 font-bold">{sampleTurno}</span>
              </p>
            </div>
          </div>

          <div className="sm:text-right bg-emerald-50 print:bg-transparent p-3 rounded-2xl border border-emerald-200 print:border-none">
            <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
              Horario Oficial de Grupo
            </span>
            <span className="text-2xl font-black text-emerald-900 font-mono">
              {sampleGrado} &quot;{grp}&quot;
            </span>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Fecha de Emisión: {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* =========================================================================
            WEEKLY SCHEDULE TABLE (PRINT-READY CLEAN DESIGN)
            ========================================================================= */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-gray-300 text-xs font-sans">
            <thead>
              <tr className="bg-emerald-800 text-white font-bold uppercase tracking-wider text-[11px]">
                <th className="border border-emerald-700 py-2.5 px-2 text-center w-28">
                  Hora / Módulo
                </th>
                {DIAS_SEMANA.map(dia => (
                  <th key={dia} className="border border-emerald-700 py-2.5 px-3 text-center">
                    {dia}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULOS_OFICIALES.map((mod) => {
                if (mod.esReceso) {
                  return (
                    <tr key={`rec-${mod.modulo}`} className="bg-amber-100/70 border-y border-amber-300">
                      <td className="border border-gray-300 py-1.5 px-2 text-center font-mono font-bold text-amber-900 text-[10px]">
                        {mod.horaInicio} - {mod.horaFin}
                      </td>
                      <td colSpan={5} className="border border-gray-300 py-1.5 px-3 text-center text-amber-900 font-black text-[11px] uppercase tracking-widest">
                        ☕ Receso Escolar Institucional
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={`mod-${mod.modulo}`} className="hover:bg-gray-50">
                    <td className="border border-gray-300 py-2 px-2 text-center bg-gray-50 font-mono">
                      <span className="font-bold text-gray-900 block text-[11px]">{mod.modulo}° Módulo</span>
                      <span className="text-[10px] text-gray-500">{mod.horaInicio} - {mod.horaFin}</span>
                    </td>

                    {DIAS_SEMANA.map((dia) => {
                      const bloque = map.get(`${dia}-${mod.modulo}`);
                      if (bloque) {
                        const palette = getMaestroPalette(bloque.maestro);

                        return (
                          <td 
                            key={`${dia}-${mod.modulo}`}
                            className={`border border-gray-300 p-2 align-top ${palette.printBg}`}
                          >
                            <div className="flex flex-col justify-between h-full min-h-[58px]">
                              <p className={`font-bold text-[11px] leading-tight ${palette.printText}`}>
                                {bloque.materia}
                              </p>
                              
                              <div className="mt-1 pt-1 border-t border-gray-200/80 flex items-center justify-between text-[10px]">
                                <span className={`inline-block font-semibold px-1.5 py-0.5 rounded text-[9px] ${palette.printBadge}`}>
                                  {bloque.maestro}
                                </span>
                                <span className="font-mono text-gray-600 font-semibold text-[9px]">
                                  {bloque.aula || 'Aula 101'}
                                </span>
                              </div>
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={`${dia}-${mod.modulo}`} className="border border-gray-300 p-2 text-center text-gray-300 text-xs">
                          —
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* =========================================================================
            ACADEMIC LOAD SUMMARY TABLE (MATERIAS, DOCENTES Y HORAS SEMANALES)
            ========================================================================= */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-xs font-black uppercase text-gray-700 tracking-wider mb-2 flex items-center space-x-1">
            <BookOpen size={14} className="text-emerald-700" />
            <span>Desglose de Asignaturas y Carga Docente del Grupo {sampleGrado} &quot;{grp}&quot;</span>
          </h4>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-gray-300 text-[11px]">
              <thead>
                <tr className="bg-gray-100 text-gray-700 uppercase font-bold text-[10px]">
                  <th className="border border-gray-300 py-1.5 px-2 w-8 text-center">No.</th>
                  <th className="border border-gray-300 py-1.5 px-3">Asignatura / Módulo</th>
                  <th className="border border-gray-300 py-1.5 px-3">Docente Responsable</th>
                  <th className="border border-gray-300 py-1.5 px-2 text-center">Color Distintivo</th>
                  <th className="border border-gray-300 py-1.5 px-2 text-center w-24">Horas / Sem</th>
                  <th className="border border-gray-300 py-1.5 px-3 text-center w-28">Aula Base</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t, idx) => (
                  <tr key={t.nombre} className="hover:bg-gray-50">
                    <td className="border border-gray-300 py-1.5 px-2 text-center font-mono text-gray-500">{idx + 1}</td>
                    <td className="border border-gray-300 py-1.5 px-3 font-semibold text-gray-900">{t.materias.join(', ')}</td>
                    <td className="border border-gray-300 py-1.5 px-3 font-bold text-gray-800">{t.nombre}</td>
                    <td className="border border-gray-300 py-1.5 px-2 text-center">
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[9px] font-bold ${t.palette.printBadge}`}>
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: t.palette.accent }}></span>
                        <span>{t.palette.nombre}</span>
                      </span>
                    </td>
                    <td className="border border-gray-300 py-1.5 px-2 text-center font-mono font-bold text-emerald-800">
                      {t.totalHoras} hrs
                    </td>
                    <td className="border border-gray-300 py-1.5 px-3 text-center font-mono text-gray-600">
                      Aula 101 / Lab
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-bold">
                  <td colSpan={4} className="border border-gray-300 py-1.5 px-3 text-right uppercase text-gray-700">
                    Total Carga Semanal del Grupo:
                  </td>
                  <td className="border border-gray-300 py-1.5 px-2 text-center font-mono font-black text-emerald-900">
                    {groupBlocks.length} horas
                  </td>
                  <td className="border border-gray-300"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Institutional Signatures */}
          <div className="mt-10 grid grid-cols-2 gap-8 text-center text-xs font-semibold text-gray-700 pt-6">
            <div className="border-t border-gray-400 pt-2">
              <p className="font-bold text-gray-900">Lic. Encargado de Control Escolar</p>
              <p className="text-[10px] text-gray-500">CECYTE BC</p>
            </div>
            <div className="border-t border-gray-400 pt-2">
              <p className="font-bold text-gray-900">Dirección del Plantel</p>
              <p className="text-[10px] text-gray-500">Sello y Firma Institucional</p>
            </div>
          </div>

        </div>

      </div>
    );
  };

  // Render teachers overall workload report
  const renderTeachersWorkloadReport = () => {
    const allTeachers = getMaestrosDirectory(horarios);

    return (
      <div className="bg-white text-gray-900 p-6 sm:p-8 rounded-3xl shadow-xl border border-gray-200 print:border-none print:shadow-none print:p-0">
        
        <div className="border-b-2 border-emerald-700 pb-4 mb-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lions_kai_logo.png" alt="CECYTE BC" className="h-12 w-auto object-contain" />
            <div>
              <h2 className="text-base font-black text-emerald-800 uppercase">
                Plantilla y Carga Horaria de Maestros por Grupo
              </h2>
              <p className="text-xs text-gray-600 font-bold">
                Reporte Consolidado de Distribución Docente • Ciclo 2026-1
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-200">
            {allTeachers.length} Docentes Registrados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-gray-300 text-xs">
            <thead>
              <tr className="bg-emerald-800 text-white uppercase text-[11px]">
                <th className="border border-emerald-700 py-2.5 px-3">Docente</th>
                <th className="border border-emerald-700 py-2.5 px-3">Color Asignado</th>
                <th className="border border-emerald-700 py-2.5 px-3">Grupos Donde Imparte</th>
                <th className="border border-emerald-700 py-2.5 px-3">Materias Asignadas</th>
                <th className="border border-emerald-700 py-2.5 px-3 text-center">Horas Semanales</th>
              </tr>
            </thead>
            <tbody>
              {allTeachers.map((doc) => (
                <tr key={doc.nombre} className="hover:bg-gray-50">
                  <td className="border border-gray-300 py-2.5 px-3 font-bold text-gray-900">
                    {doc.nombre}
                  </td>
                  <td className="border border-gray-300 py-2.5 px-3">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-[10px] font-bold ${doc.palette.printBadge}`}>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: doc.palette.accent }}></span>
                      <span>{doc.palette.nombre}</span>
                    </span>
                  </td>
                  <td className="border border-gray-300 py-2.5 px-3 font-mono font-semibold text-emerald-800">
                    {doc.grupos.join(', ')}
                  </td>
                  <td className="border border-gray-300 py-2.5 px-3 text-gray-700">
                    {doc.materias.join(', ')}
                  </td>
                  <td className="border border-gray-300 py-2.5 px-3 text-center font-mono font-black text-emerald-900 text-sm">
                    {doc.totalHoras} hrs
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    );
  };

  return (
    <div className="space-y-6">

      {/* =========================================================================
          CONTROLS TOOLBAR (PRINT, EXPORT, SCOPE SELECTOR) - HIDDEN ON PRINT
          ========================================================================= */}
      <div className="print:hidden glass-panel p-5 rounded-3xl space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onBackToGrid}
              className="p-2.5 rounded-xl glass-panel text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Volver a la vista de Horario Semanal"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h3 className="text-xl font-black text-white flex items-center space-x-2">
                <span>📑 Reporte Oficial de Horarios por Grupo</span>
              </h3>
              <p className="text-xs text-gray-400">
                Formato institucional listo para imprimir en papel, guardar como PDF o descargar a Excel.
              </p>
            </div>
          </div>

          {/* Action buttons: Print and Excel */}
          <div className="flex items-center flex-wrap gap-2.5">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer transform active:scale-95"
            >
              <Printer size={16} />
              <span>🖨️ Imprimir / Guardar PDF</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/40 text-gray-200 hover:text-white font-bold text-xs transition-all cursor-pointer"
            >
              <Download size={16} className="text-emerald-400" />
              <span>Exportar Excel (.xlsx)</span>
            </button>
          </div>

        </div>

        {/* Scope Selector (Individual vs Consolidado vs Docentes) */}
        <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tipo de Reporte:</span>
            <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-black/40 border border-white/10 text-xs font-bold">
              <button
                onClick={() => setViewScope('individual')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewScope === 'individual'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Grupo Individual
              </button>

              <button
                onClick={() => setViewScope('consolidado')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewScope === 'consolidado'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Consolidado (Todos los Grupos)
              </button>

              <button
                onClick={() => setViewScope('docentes')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewScope === 'docentes'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Carga por Docente
              </button>
            </div>
          </div>

          {/* Group Picker if in individual mode */}
          {viewScope === 'individual' && (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Seleccionar Grupo:</span>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="glass-input py-1.5 px-3 rounded-xl text-xs text-white font-mono font-bold"
              >
                {allGroups.map(grp => (
                  <option key={grp} value={grp} className="bg-gray-900">
                    Grupo &quot;{grp}&quot;
                  </option>
                ))}
              </select>
            </div>
          )}

        </div>

      </div>

      {/* =========================================================================
          REPORT VIEWING CONTAINER (PRINTED ON SCREEN AND PAPER)
          ========================================================================= */}
      <div id="print-report-container" className="print:m-0 print:p-0">
        {viewScope === 'individual' && renderSingleGroupReport(selectedGroup)}

        {viewScope === 'consolidado' && (
          <div>
            {allGroups.map((grp) => renderSingleGroupReport(grp, true))}
          </div>
        )}

        {viewScope === 'docentes' && renderTeachersWorkloadReport()}
      </div>

    </div>
  );
}
