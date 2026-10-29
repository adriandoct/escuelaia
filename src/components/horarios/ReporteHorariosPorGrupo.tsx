"use strict";

'use client';

import React, { useState, useMemo } from 'react';
import { 
  BloqueHorario, 
  DIAS_SEMANA, 
  MODULOS_MATUTINO,
  MODULOS_VESPERTINO,
  MODULOS_JORNADA_COMPLETA,
  getMaestroPalette, 
  getMaestrosDirectory,
  exportHorariosWorkbook,
  sortGruposOficiales,
  normalizeTeacherName
} from '@/lib/horarios';
import { 
  Printer, Download, ArrowLeft, BookOpen, UserCheck, Users
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
  onBackToGrid
}: ReporteHorariosPorGrupoProps) {
  const [selectedGroup, setSelectedGroup] = useState<string>(initialGroup);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('NATANAEL DURÁN GARCÍA');
  const [viewScope, setViewScope] = useState<'individual' | 'maestro' | 'consolidado' | 'docentes'>('individual');

  // All distinct groups sorted officially (1A..5APGA)
  const allGroups = useMemo(() => {
    const set = new Set<string>();
    horarios.forEach(h => set.add(h.grupo));
    return sortGruposOficiales(Array.from(set));
  }, [horarios]);

  // All teachers directory
  const allTeachers = useMemo(() => {
    return getMaestrosDirectory(horarios);
  }, [horarios]);

  const effectiveTeacher = useMemo(() => {
    if (allTeachers.some(t => t.nombre === selectedTeacher)) return selectedTeacher;
    return allTeachers[0]?.nombre || 'NATANAEL DURÁN GARCÍA';
  }, [allTeachers, selectedTeacher]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const scope =
      viewScope === 'individual'
        ? selectedGroup
        : viewScope === 'maestro'
        ? effectiveTeacher
        : 'TODOS';
    exportHorariosWorkbook(horarios, scope);
  };

  // Helper to build a schedule matrix for a specific group
  const buildGroupMatrix = (grp: string) => {
    const groupBlocks = horarios.filter(h => h.grupo === grp);
    const map = new Map<string, BloqueHorario>();
    groupBlocks.forEach(b => {
      map.set(`${b.dia}-${b.horaInicio}`, b);
      map.set(`${b.dia}-${b.modulo}`, b);
    });

    const teachers = getMaestrosDirectory(groupBlocks);
    const sampleGrado = groupBlocks[0]?.grado || `${grp.charAt(0)}°`;
    const isVesp =
      groupBlocks[0]?.turno === 'Vespertino' ||
      (groupBlocks[0]?.horaInicio && groupBlocks[0].horaInicio >= '13:30') ||
      ['1E', '3ASCM', '3BPGA', '5APGM', '5BPGM', '5APGA'].includes(grp);
    const sampleTurno: 'Matutino' | 'Vespertino' = isVesp ? 'Vespertino' : 'Matutino';
    const modulos = sampleTurno === 'Vespertino' ? MODULOS_VESPERTINO : MODULOS_MATUTINO;

    return { groupBlocks, map, teachers, sampleGrado, sampleTurno, modulos };
  };

  // Render a single group's official institutional schedule card
  const renderSingleGroupReport = (grp: string, showPageBreak = false) => {
    const { groupBlocks, map, teachers, sampleGrado, sampleTurno, modulos } = buildGroupMatrix(grp);

    return (
      <div 
        key={grp}
        className={`bg-white text-gray-900 p-6 sm:p-8 rounded-3xl shadow-xl border border-gray-200 print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none mb-10 ${
          showPageBreak ? 'break-after-page page-break-always' : ''
        }`}
      >
        {/* INSTITUTIONAL HEADER (CECYTE BC PLANTEL URBIVILLAS) */}
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
                Colegio de Estudios Científicos y Tecnológicos del Estado de Baja California
              </h2>
              <p className="text-xs font-bold text-gray-700 uppercase">
                Plantel CECYTE Urbivillas • Horarios de Grupo 2026-2
              </p>
              <p className="text-[11px] text-gray-500 font-semibold">
                Ciclo Escolar: <span className="text-gray-900 font-bold">2026-2</span> • Turno: <span className="text-gray-900 font-bold uppercase">{sampleTurno}</span>
              </p>
            </div>
          </div>

          <div className="sm:text-right bg-emerald-50 print:bg-transparent p-3 rounded-2xl border border-emerald-200 print:border-none">
            <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
              Horario Oficial de Grupo
            </span>
            <span className="text-2xl font-black text-emerald-900 font-mono">
              GRUPO: {grp} ({sampleGrado})
            </span>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Turno {sampleTurno} • {groupBlocks.length} hrs/sem
            </p>
          </div>
        </div>

        {/* WEEKLY SCHEDULE TABLE FOR GROUP */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-gray-300 text-xs font-sans">
            <thead>
              <tr className="bg-emerald-800 text-white font-bold uppercase tracking-wider text-[11px]">
                <th className="border border-emerald-700 py-2.5 px-2 text-center w-28">
                  Horario
                </th>
                {DIAS_SEMANA.map(dia => (
                  <th key={dia} className="border border-emerald-700 py-2.5 px-3 text-center">
                    {dia}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modulos.map((mod) => {
                if (mod.esReceso) {
                  return (
                    <tr key={`rec-${mod.horaInicio}`} className="bg-amber-100/70 border-y border-amber-300">
                      <td className="border border-gray-300 py-1.5 px-2 text-center font-mono font-bold text-amber-900 text-[10px]">
                        {mod.horaInicio} - {mod.horaFin}
                      </td>
                      <td colSpan={5} className="border border-gray-300 py-1.5 px-3 text-center text-amber-900 font-black text-[11px] uppercase tracking-widest">
                        ☕ R E C E S O   E S C O L A R ({mod.horaInicio} - {mod.horaFin})
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={`mod-${mod.horaInicio}`} className="hover:bg-gray-50">
                    <td className="border border-gray-300 py-2 px-2 text-center bg-gray-50 font-mono">
                      <span className="font-bold text-gray-900 block text-[11px]">{mod.horaInicio} - {mod.horaFin}</span>
                      <span className="text-[9px] text-gray-500">{mod.modulo}° Hora ({sampleTurno})</span>
                    </td>

                    {DIAS_SEMANA.map((dia) => {
                      const bloque = map.get(`${dia}-${mod.horaInicio}`) || map.get(`${dia}-${mod.modulo}`);
                      if (bloque) {
                        const palette = getMaestroPalette(bloque.maestro);

                        return (
                          <td 
                            key={`${dia}-${mod.horaInicio}`}
                            className={`border border-gray-300 p-2 align-top ${palette.printBg}`}
                          >
                            <div className="flex flex-col justify-between h-full min-h-[54px]">
                              <p className={`font-bold text-[11px] leading-tight ${palette.printText}`}>
                                {bloque.materia}
                              </p>
                              
                              <div className="mt-1.5 pt-1 border-t border-gray-200/80 flex items-center justify-between text-[10px]">
                                <span className={`inline-block font-bold px-1.5 py-0.5 rounded text-[9px] ${palette.printBadge}`}>
                                  {bloque.maestro}
                                </span>
                              </div>
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={`${dia}-${mod.horaInicio}`} className="border border-gray-300 p-2 text-center text-gray-300 text-xs">
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

        {/* ACADEMIC LOAD SUMMARY TABLE (ASIGNATURA, DOCENTE Y HORAS X SEMANA) */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-xs font-black uppercase text-gray-700 tracking-wider mb-2 flex items-center space-x-1">
            <BookOpen size={14} className="text-emerald-700" />
            <span>Asignaturas y Docentes del Grupo &quot;{grp}&quot; (Ciclo 2026-2)</span>
          </h4>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-gray-300 text-[11px]">
              <thead>
                <tr className="bg-gray-100 text-gray-700 uppercase font-bold text-[10px]">
                  <th className="border border-gray-300 py-1.5 px-2 w-8 text-center">No.</th>
                  <th className="border border-gray-300 py-1.5 px-3">Asignatura</th>
                  <th className="border border-gray-300 py-1.5 px-3">Docente</th>
                  <th className="border border-gray-300 py-1.5 px-2 text-center w-28">Horas x Semana</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t, idx) => (
                  <tr key={t.nombre} className="hover:bg-gray-50">
                    <td className="border border-gray-300 py-1.5 px-2 text-center font-mono text-gray-500">{idx + 1}</td>
                    <td className="border border-gray-300 py-1.5 px-3 font-semibold text-gray-900">{t.materias.join(' / ')}</td>
                    <td className="border border-gray-300 py-1.5 px-3 font-bold text-gray-800">{t.nombre}</td>
                    <td className="border border-gray-300 py-1.5 px-2 text-center font-mono font-bold text-emerald-800">
                      {t.totalHoras} hrs
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-bold">
                  <td colSpan={3} className="border border-gray-300 py-1.5 px-3 text-right uppercase text-gray-700">
                    Total Horas Semanales del Grupo {grp}:
                  </td>
                  <td className="border border-gray-300 py-1.5 px-2 text-center font-mono font-black text-emerald-900">
                    {groupBlocks.length} hrs
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Render an individual teacher's official schedule card (HORARIO DE ACTIVIDADES POR MAESTRO)
  const renderSingleMaestroReport = (teacherName: string) => {
    const teacherBlocks = horarios.filter(h => normalizeTeacherName(h.maestro, h.grupo) === teacherName);
    const map = new Map<string, BloqueHorario>();
    teacherBlocks.forEach(b => {
      map.set(`${b.dia}-${b.horaInicio}`, b);
    });

    const hasMat = teacherBlocks.some(b => b.turno === 'Matutino' || b.horaInicio < '13:30');
    const hasVesp = teacherBlocks.some(b => b.turno === 'Vespertino' || b.horaInicio >= '13:30');
    const modulos = hasMat && hasVesp
      ? MODULOS_JORNADA_COMPLETA
      : hasVesp
      ? MODULOS_VESPERTINO
      : MODULOS_MATUTINO;

    const palette = getMaestroPalette(teacherName);

    // Group breakdown by (grupo + materia)
    const groupSubjectRows: { grupo: string; materia: string; turno: string; horas: number }[] = [];
    const gsMap = new Map<string, { grupo: string; materia: string; turno: string; horas: number }>();
    teacherBlocks.forEach(b => {
      const k = `${b.grupo}|${b.materia}`;
      if (!gsMap.has(k)) {
        gsMap.set(k, { grupo: b.grupo, materia: b.materia, turno: b.turno || 'Matutino', horas: 0 });
      }
      gsMap.get(k)!.horas += 1;
    });
    gsMap.forEach(v => groupSubjectRows.push(v));

    return (
      <div className="bg-white text-gray-900 p-6 sm:p-8 rounded-3xl shadow-xl border border-gray-200 print:border-none print:shadow-none print:p-0 mb-10">
        {/* HEADER OFICIAL HORARIO DE ACTIVIDADES POR DOCENTE */}
        <div className="border-b-2 border-emerald-700 pb-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lions_kai_logo.png" alt="CECYTE BC" className="h-14 w-auto object-contain print:h-12" />
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight text-emerald-800 uppercase">
                Colegio de Estudios Científicos y Tecnológicos del Estado de Baja California
              </h2>
              <p className="text-xs font-bold text-gray-700 uppercase">
                Plantel CECYTE Urbivillas • Horario Individual de Actividades Docentes
              </p>
              <p className="text-[11px] text-gray-500 font-semibold">
                Semestre: <span className="text-gray-900 font-bold">2026-2</span> • Clave CCT: <span className="text-gray-900 font-bold">02ETC0028K</span>
              </p>
            </div>
          </div>

          <div className="sm:text-right bg-emerald-50 print:bg-transparent p-3 rounded-2xl border border-emerald-200 print:border-none">
            <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
              Docente / Maestro
            </span>
            <span className="text-lg sm:text-xl font-black text-emerald-900">
              {teacherName}
            </span>
            <p className="text-[11px] font-bold text-emerald-700 mt-0.5 font-mono">
              Total Horas Frente a Grupo: {teacherBlocks.length} hrs/sem
            </p>
          </div>
        </div>

        {/* WEEKLY GRID FOR TEACHER */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-gray-300 text-xs font-sans">
            <thead>
              <tr className="bg-emerald-800 text-white font-bold uppercase tracking-wider text-[11px]">
                <th className="border border-emerald-700 py-2.5 px-2 text-center w-32">
                  Hora
                </th>
                {DIAS_SEMANA.map(dia => (
                  <th key={dia} className="border border-emerald-700 py-2.5 px-3 text-center">
                    {dia}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modulos.map((mod) => {
                if (mod.esReceso) {
                  return (
                    <tr key={`rec-doc-${mod.horaInicio}`} className="bg-amber-100/70 border-y border-amber-300">
                      <td className="border border-gray-300 py-1.5 px-2 text-center font-mono font-bold text-amber-900 text-[10px]">
                        {mod.horaInicio} - {mod.horaFin}
                      </td>
                      <td colSpan={5} className="border border-gray-300 py-1.5 px-3 text-center text-amber-900 font-black text-[11px] uppercase tracking-widest">
                        ☕ {mod.label}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={`mod-doc-${mod.horaInicio}`} className="hover:bg-gray-50">
                    <td className="border border-gray-300 py-2 px-2 text-center bg-gray-50 font-mono">
                      <span className="font-bold text-gray-900 block text-[11px]">{mod.horaInicio} - {mod.horaFin}</span>
                      <span className="text-[9px] text-gray-500">{mod.turno}</span>
                    </td>

                    {DIAS_SEMANA.map((dia) => {
                      const bloque = map.get(`${dia}-${mod.horaInicio}`);
                      if (bloque) {
                        return (
                          <td key={`${dia}-${mod.horaInicio}`} className={`border border-gray-300 p-2 align-top ${palette.printBg}`}>
                            <div className="flex flex-col justify-between h-full min-h-[50px]">
                              <div className="flex items-center justify-between">
                                <span className="px-2 py-0.5 rounded bg-emerald-800 text-white font-mono font-black text-[10px]">
                                  GRUPO {bloque.grupo}
                                </span>
                                <span className="text-[9px] font-mono text-gray-600 font-bold">
                                  {bloque.turno}
                                </span>
                              </div>
                              <p className={`font-bold text-[10px] leading-tight mt-1 ${palette.printText}`}>
                                {bloque.materia}
                              </p>
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={`${dia}-${mod.horaInicio}`} className="border border-gray-300 p-2 text-center text-gray-300 text-xs">
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

        {/* ACTIVIDADES DOCENTES FRENTE A GRUPO TABLE */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-xs font-black uppercase text-gray-700 tracking-wider mb-2">
            Actividades Docentes Frente a Grupo • {teacherName}
          </h4>
          <table className="w-full text-left border-collapse border border-gray-300 text-[11px]">
            <thead>
              <tr className="bg-gray-100 text-gray-700 uppercase font-bold text-[10px]">
                <th className="border border-gray-300 py-1.5 px-3 w-24 text-center">Grupo</th>
                <th className="border border-gray-300 py-1.5 px-3 w-28 text-center">Turno</th>
                <th className="border border-gray-300 py-1.5 px-3">Asignatura</th>
                <th className="border border-gray-300 py-1.5 px-3 w-28 text-center">Horas x Semana</th>
              </tr>
            </thead>
            <tbody>
              {groupSubjectRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="border border-gray-300 py-1.5 px-3 text-center font-mono font-black text-emerald-900">{row.grupo}</td>
                  <td className="border border-gray-300 py-1.5 px-3 text-center text-gray-700">{row.turno}</td>
                  <td className="border border-gray-300 py-1.5 px-3 font-semibold text-gray-900">{row.materia}</td>
                  <td className="border border-gray-300 py-1.5 px-3 text-center font-mono font-bold text-emerald-800">{row.horas} hrs</td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-bold">
                <td colSpan={3} className="border border-gray-300 py-1.5 px-3 text-right uppercase text-gray-700">
                  Total de Horas Clase:
                </td>
                <td className="border border-gray-300 py-1.5 px-3 text-center font-mono font-black text-emerald-900">
                  {teacherBlocks.length} hrs
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render teachers overall workload report
  const renderTeachersWorkloadReport = () => {
    return (
      <div className="bg-white text-gray-900 p-6 sm:p-8 rounded-3xl shadow-xl border border-gray-200 print:border-none print:shadow-none print:p-0">
        <div className="border-b-2 border-emerald-700 pb-4 mb-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lions_kai_logo.png" alt="CECYTE BC" className="h-12 w-auto object-contain" />
            <div>
              <h2 className="text-base font-black text-emerald-800 uppercase">
                Plantilla General y Carga Horaria de Maestros por Grupo
              </h2>
              <p className="text-xs text-gray-600 font-bold">
                Plantel CECYTE Urbivillas • Ciclo 2026-2 (12 Grupos)
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
                <th className="border border-emerald-700 py-2.5 px-3">Turnos</th>
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
                  <td className="border border-gray-300 py-2.5 px-3 text-gray-700 font-semibold">
                    {doc.turnos.join(', ')}
                  </td>
                  <td className="border border-gray-300 py-2.5 px-3 font-mono font-bold text-emerald-800">
                    {doc.grupos.join(', ')}
                  </td>
                  <td className="border border-gray-300 py-2.5 px-3 text-gray-700">
                    {doc.materias.join(' • ')}
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
      {/* CONTROLS TOOLBAR - HIDDEN ON PRINT */}
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
                <span>📑 Reportes Oficiales de Horarios (Por Grupo o Por Maestro)</span>
              </h3>
              <p className="text-xs text-gray-400">
                Formato institucional CECYTE BC Urbivillas 2026-2 listo para imprimir o exportar a Excel.
              </p>
            </div>
          </div>

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

        {/* Scope Selector */}
        <div className="pt-3 border-t border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Modalidad:</span>
            <div className="flex items-center flex-wrap gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 text-xs font-bold">
              <button
                onClick={() => setViewScope('individual')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewScope === 'individual'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                🏫 Por Grupo
              </button>

              <button
                onClick={() => setViewScope('maestro')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                  viewScope === 'maestro'
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <UserCheck size={14} />
                <span>👨‍🏫 Por Maestro</span>
              </button>

              <button
                onClick={() => setViewScope('consolidado')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewScope === 'consolidado'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                📚 Todos los Grupos (12)
              </button>

              <button
                onClick={() => setViewScope('docentes')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                  viewScope === 'docentes'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Users size={14} />
                <span>Resumen Cargas Docentes</span>
              </button>
            </div>
          </div>

          {viewScope === 'individual' && (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Grupo:</span>
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

          {viewScope === 'maestro' && (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Maestro:</span>
              <select
                value={effectiveTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="glass-input py-1.5 px-3 rounded-xl text-xs text-white font-bold"
              >
                {allTeachers.map(doc => (
                  <option key={doc.nombre} value={doc.nombre} className="bg-gray-900">
                    {doc.nombre} ({doc.totalHoras} hrs)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* REPORT VIEWING CONTAINER */}
      <div id="print-report-container" className="print:m-0 print:p-0">
        {viewScope === 'individual' && renderSingleGroupReport(selectedGroup)}

        {viewScope === 'maestro' && renderSingleMaestroReport(effectiveTeacher)}

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
