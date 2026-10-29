"use strict";

'use client';

import React, { useState, useMemo } from 'react';
import { 
  BloqueHorario, 
  DiaSemana, 
  DIAS_SEMANA, 
  MODULOS_MATUTINO,
  MODULOS_VESPERTINO,
  MODULOS_JORNADA_COMPLETA,
  getMaestroPalette, 
  getMaestrosDirectory,
  sortGruposOficiales,
  normalizeTeacherName
} from '@/lib/horarios';
import { 
  Calendar, Clock, BookOpen, MapPin, Plus, Edit, 
  UploadCloud, Users, Coffee, Search, UserCheck, Layers, Sun, Moon
} from 'lucide-react';
import SubirHorariosModal from './SubirHorariosModal';
import EditarClaseModal from './EditarClaseModal';

interface HorarioSemanalGridProps {
  horarios: BloqueHorario[];
  isAdmin: boolean;
  onHorariosUpdated: (updated: BloqueHorario[]) => void;
  selectedGroup: string;
  onSelectGroup: (group: string) => void;
  selectedGrade: string;
  onSelectGrade: (grade: string) => void;
  onOpenReport?: () => void;
}

export default function HorarioSemanalGrid({
  horarios,
  isAdmin,
  onHorariosUpdated,
  selectedGroup,
  onSelectGroup,
  selectedGrade,
  onSelectGrade,
  onOpenReport
}: HorarioSemanalGridProps) {
  // Primary consultation mode: 'grupo' vs 'maestro'
  const [consultaModo, setConsultaModo] = useState<'grupo' | 'maestro'>('grupo');
  const [selectedMaestro, setSelectedMaestro] = useState<string>('NATANAEL DURÁN GARCÍA');
  const [teacherTurnoFilter, setTeacherTurnoFilter] = useState<'auto' | 'Matutino' | 'Vespertino' | 'Ambos'>('auto');
  const [maestroSearch, setMaestroSearch] = useState<string>('');
  const [turnoGrupoFilter, setTurnoGrupoFilter] = useState<'Todos' | 'Matutino' | 'Vespertino'>('Todos');

  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBloque, setEditingBloque] = useState<BloqueHorario | null>(null);
  const [slotToAdd, setSlotToAdd] = useState<{ dia: DiaSemana; modulo: number } | null>(null);

  // All teachers directory across the institution
  const allTeachers = useMemo(() => {
    return getMaestrosDirectory(horarios);
  }, [horarios]);

  // Ensure selectedMaestro is valid
  const activeMaestroName = useMemo(() => {
    if (allTeachers.some(t => t.nombre === selectedMaestro)) return selectedMaestro;
    return allTeachers[0]?.nombre || 'NATANAEL DURÁN GARCÍA';
  }, [allTeachers, selectedMaestro]);

  const activeMaestroInfo = useMemo(() => {
    return allTeachers.find(t => t.nombre === activeMaestroName) || allTeachers[0];
  }, [allTeachers, activeMaestroName]);

  // Extract all available groups and grades from schedules
  const allGroups = useMemo(() => {
    const set = new Set<string>();
    horarios.forEach(h => {
      const matchGrade = selectedGrade ? h.grado === selectedGrade : true;
      const matchTurno = turnoGrupoFilter === 'Todos' ? true : h.turno === turnoGrupoFilter;
      if (matchGrade && matchTurno) {
        set.add(h.grupo);
      }
    });
    const list = sortGruposOficiales(Array.from(set));
    if (list.length === 0) {
      const allSet = new Set<string>();
      horarios.forEach(h => allSet.add(h.grupo));
      return sortGruposOficiales(Array.from(allSet));
    }
    return list;
  }, [horarios, selectedGrade, turnoGrupoFilter]);

  const allGrades = useMemo(() => {
    const set = new Set<string>();
    horarios.forEach(h => set.add(h.grado));
    return Array.from(set).sort();
  }, [horarios]);

  // Active group fallback if current selectedGroup is filtered out
  const effectiveGroup = useMemo(() => {
    if (allGroups.includes(selectedGroup)) return selectedGroup;
    return allGroups[0] || '1A';
  }, [allGroups, selectedGroup]);

  // Filter schedules for active group
  const groupHorarios = useMemo(() => {
    return horarios.filter(h => h.grupo === effectiveGroup);
  }, [horarios, effectiveGroup]);

  // Detect shift of the active group
  const activeGroupTurno: 'Matutino' | 'Vespertino' = useMemo(() => {
    const first = groupHorarios[0];
    if (first?.turno) return first.turno;
    if (first?.horaInicio && first.horaInicio >= '13:30') return 'Vespertino';
    return ['1E', '3ASCM', '3BPGA', '5APGM', '5BPGM', '5APGA'].includes(effectiveGroup)
      ? 'Vespertino'
      : 'Matutino';
  }, [groupHorarios, effectiveGroup]);

  const activeGroupGrado = useMemo(() => {
    return groupHorarios[0]?.grado || `${effectiveGroup.charAt(0)}°`;
  }, [groupHorarios, effectiveGroup]);

  // Modules to display for the active group
  const groupModulos = useMemo(() => {
    return activeGroupTurno === 'Vespertino' ? MODULOS_VESPERTINO : MODULOS_MATUTINO;
  }, [activeGroupTurno]);

  // Teachers directory for this group
  const groupTeachers = useMemo(() => {
    return getMaestrosDirectory(groupHorarios);
  }, [groupHorarios]);

  // Map of (dia + horaInicio) or (dia + modulo) -> BloqueHorario for Group view
  const groupScheduleMap = useMemo(() => {
    const map = new Map<string, BloqueHorario>();
    groupHorarios.forEach(b => {
      map.set(`${b.dia}-${b.horaInicio}`, b);
      map.set(`${b.dia}-${b.modulo}`, b);
    });
    return map;
  }, [groupHorarios]);

  // Filter schedules for active Maestro
  const maestroHorarios = useMemo(() => {
    return horarios.filter(h => normalizeTeacherName(h.maestro, h.grupo) === activeMaestroName);
  }, [horarios, activeMaestroName]);

  // Modules to display for Maestro view
  const maestroModulos = useMemo(() => {
    if (teacherTurnoFilter === 'Matutino') return MODULOS_MATUTINO;
    if (teacherTurnoFilter === 'Vespertino') return MODULOS_VESPERTINO;
    if (teacherTurnoFilter === 'Ambos') return MODULOS_JORNADA_COMPLETA;

    // Auto-detect based on teacher's assigned blocks
    const hasMat = maestroHorarios.some(b => b.turno === 'Matutino' || b.horaInicio < '13:30');
    const hasVesp = maestroHorarios.some(b => b.turno === 'Vespertino' || b.horaInicio >= '13:30');
    if (hasMat && hasVesp) return MODULOS_JORNADA_COMPLETA;
    if (hasVesp) return MODULOS_VESPERTINO;
    return MODULOS_MATUTINO;
  }, [maestroHorarios, teacherTurnoFilter]);

  // Map of (dia + horaInicio) -> BloqueHorario for Maestro view
  const maestroScheduleMap = useMemo(() => {
    const map = new Map<string, BloqueHorario>();
    maestroHorarios.forEach(b => {
      map.set(`${b.dia}-${b.horaInicio}`, b);
      if (b.turno) {
        map.set(`${b.turno}-${b.dia}-${b.modulo}`, b);
      }
    });
    return map;
  }, [maestroHorarios]);

  // Filtered teacher list for search in Maestro mode
  const filteredTeachersList = useMemo(() => {
    if (!maestroSearch.trim()) return allTeachers;
    const q = maestroSearch.toLowerCase();
    return allTeachers.filter(t =>
      t.nombre.toLowerCase().includes(q) ||
      t.grupos.some(g => g.toLowerCase().includes(q)) ||
      t.materias.some(m => m.toLowerCase().includes(q))
    );
  }, [allTeachers, maestroSearch]);

  const handleEditClick = (bloque: BloqueHorario) => {
    if (!isAdmin) return;
    setEditingBloque(bloque);
    setSlotToAdd(null);
    setIsEditModalOpen(true);
  };

  const handleAddClick = (dia: DiaSemana, modulo: number) => {
    if (!isAdmin) return;
    setEditingBloque(null);
    setSlotToAdd({ dia, modulo });
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-6">

      {/* =========================================================================
          ADMIN PRIVILEGE CONTROL BAR
          ========================================================================= */}
      {isAdmin && (
        <div className="glass-panel p-4 rounded-3xl border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-[#0a101f] to-cyan-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-black flex items-center justify-center font-black shadow-lg shadow-amber-500/30 shrink-0">
              👑
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                  Modo Administrador Activo • CECYTE BC Urbivillas (2026-2)
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              </div>
              <p className="text-xs text-gray-300">
                Están cargados los <strong className="text-white">12 grupos oficiales (1A a 5APGA)</strong> y <strong className="text-white">{allTeachers.length} maestros</strong>. Puedes consultar por <strong className="text-cyan-300">Grupo</strong> o por <strong className="text-purple-300">Maestro</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer transform active:scale-95"
            >
              <UploadCloud size={16} />
              <span>Subir Horarios (.xlsx / .csv)</span>
            </button>

            <button
              onClick={() => {
                setEditingBloque(null);
                setSlotToAdd({ dia: 'Lunes', modulo: 1 });
                setIsEditModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 font-bold text-xs transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>+ Asignar Clase</span>
            </button>

            {onOpenReport && (
              <button
                onClick={onOpenReport}
                className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl glass-panel text-gray-200 hover:text-white font-semibold text-xs hover:bg-white/10 transition-all cursor-pointer"
              >
                <span>📑 Imprimir / Reportes</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MAIN CONSULTATION MODE SWITCHER: POR GRUPO vs POR MAESTRO
          ========================================================================= */}
      <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-cyan-500/30 bg-[#070b14]/90 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 block">
              Modalidad de Consulta de Horarios 2026-2
            </span>
            <h3 className="text-lg sm:text-xl font-black text-white">
              {consultaModo === 'grupo'
                ? '🏫 Consulta de Horarios por Grupo (12 Grupos)'
                : '👨‍🏫 Consulta de Horarios por Maestro / Docente'}
            </h3>
          </div>

          {/* Toggle Pills: Por Grupo vs Por Maestro */}
          <div className="flex items-center space-x-2 p-1.5 rounded-2xl bg-black/60 border border-white/10 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setConsultaModo('grupo')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                consultaModo === 'grupo'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 ring-1 ring-cyan-300'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers size={16} />
              <span>Consultar por GRUPO (12)</span>
            </button>

            <button
              type="button"
              onClick={() => setConsultaModo('maestro')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                consultaModo === 'maestro'
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/30 ring-1 ring-purple-300'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <UserCheck size={16} />
              <span>Consultar por MAESTRO ({allTeachers.length})</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            CONTROLS FOR MODE 1: CONSULTAR POR GRUPO
            ========================================================================= */}
        {consultaModo === 'grupo' && (
          <div className="pt-3 border-t border-white/10 space-y-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Semestre & Turno filters */}
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center space-x-1 mr-1">
                  <Calendar size={14} className="text-cyan-400" />
                  <span>Semestre:</span>
                </span>

                <button
                  onClick={() => onSelectGrade('')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    !selectedGrade
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                      : 'glass-panel text-gray-400 hover:text-white'
                  }`}
                >
                  Todos (12)
                </button>

                {allGrades.map(g => (
                  <button
                    key={g}
                    onClick={() => onSelectGrade(g)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedGrade === g
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                        : 'glass-panel text-gray-400 hover:text-white'
                    }`}
                  >
                    {g} Semestre
                  </button>
                ))}

                <div className="h-5 w-px bg-white/10 mx-1 hidden sm:block"></div>

                {/* Turno Filter */}
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">Turno:</span>
                {(['Todos', 'Matutino', 'Vespertino'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTurnoGrupoFilter(t)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                      turnoGrupoFilter === t
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'glass-panel text-gray-400 hover:text-white'
                    }`}
                  >
                    {t === 'Matutino' && <Sun size={12} className="text-amber-400" />}
                    {t === 'Vespertino' && <Moon size={12} className="text-indigo-400" />}
                    <span>{t}</span>
                  </button>
                ))}
              </div>

              {/* Group Select Dropdown */}
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Grupo Activo:
                </span>
                <select
                  value={effectiveGroup}
                  onChange={(e) => onSelectGroup(e.target.value)}
                  className="glass-input py-2 px-3 rounded-xl text-xs text-white font-mono font-bold"
                >
                  {allGroups.map(grp => (
                    <option key={grp} value={grp} className="bg-gray-900">
                      Grupo &quot;{grp}&quot;
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Group Chips for all 12 Groups */}
            <div className="pt-2 border-t border-white/5 flex items-center flex-wrap gap-1.5">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">
                Grupos Oficiales:
              </span>
              {allGroups.map(grp => {
                const isSelected = effectiveGroup === grp;
                const isVesp = ['1E', '3ASCM', '3BPGA', '5APGM', '5BPGM', '5APGA'].includes(grp);
                return (
                  <button
                    key={grp}
                    onClick={() => onSelectGroup(grp)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                      isSelected
                        ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/30 ring-1 ring-emerald-300 scale-105'
                        : 'glass-panel text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span>{grp}</span>
                    <span className={`text-[9px] px-1 rounded ${isSelected ? 'bg-black/20 text-black' : isVesp ? 'text-indigo-300' : 'text-amber-300'}`}>
                      {isVesp ? 'V' : 'M'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            CONTROLS FOR MODE 2: CONSULTAR POR MAESTRO
            ========================================================================= */}
        {consultaModo === 'maestro' && (
          <div className="pt-3 border-t border-white/10 space-y-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Teacher Picker & Search */}
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-purple-300 uppercase tracking-wider whitespace-nowrap">
                    👨‍🏫 Seleccionar Maestro:
                  </span>
                  <select
                    value={activeMaestroName}
                    onChange={(e) => setSelectedMaestro(e.target.value)}
                    className="glass-input py-2 px-3 rounded-xl text-xs sm:text-sm text-white font-bold border-purple-500/40"
                  >
                    {allTeachers.map(doc => (
                      <option key={doc.nombre} value={doc.nombre} className="bg-gray-900">
                        {doc.nombre} ({doc.totalHoras} hrs • Grupos: {doc.grupos.join(', ')})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={maestroSearch}
                    onChange={(e) => setMaestroSearch(e.target.value)}
                    placeholder="Filtrar maestro, materia o grupo..."
                    className="w-full glass-input pl-8 pr-3 py-1.5 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              {/* Shift view selector for Teacher */}
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Vista Turno:</span>
                {([
                  { id: 'auto', label: 'Automático' },
                  { id: 'Ambos', label: 'Jornada Completa' },
                  { id: 'Matutino', label: 'Matutino' },
                  { id: 'Vespertino', label: 'Vespertino' }
                ] as const).map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTeacherTurnoFilter(opt.id)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      teacherTurnoFilter === opt.id
                        ? 'bg-purple-500 text-white shadow-md'
                        : 'glass-panel text-gray-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Teacher Chips */}
            <div className="pt-2 border-t border-white/5 flex items-center flex-wrap gap-1.5">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">
                Maestros:
              </span>
              {filteredTeachersList.map(doc => {
                const isSelected = activeMaestroName === doc.nombre;
                return (
                  <button
                    key={doc.nombre}
                    type="button"
                    onClick={() => setSelectedMaestro(doc.nombre)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 border ${
                      isSelected
                        ? `${doc.palette.badgeBg} ${doc.palette.badgeBorder} text-white ring-2 ring-white scale-[1.03] shadow-lg`
                        : 'glass-panel border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: doc.palette.accent }}></span>
                    <span>{doc.nombre}</span>
                    <span className="text-[10px] font-mono opacity-75">({doc.totalHoras}h)</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          VIEW 1: HORARIO SEMANAL POR GRUPO
          ========================================================================= */}
      {consultaModo === 'grupo' && (
        <>
          {/* GROUP HEADER & STATS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl glass-panel border border-cyan-500/20">
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Horario Semanal • Grupo {activeGroupGrado} &quot;{effectiveGroup}&quot;
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full font-mono text-xs font-bold border ${
                  activeGroupTurno === 'Vespertino'
                    ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                }`}>
                  Turno {activeGroupTurno} • Ciclo 2026-2
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Plantel CECYTE BC Urbivillas • Haz clic en un maestro abajo para filtrar sus clases o ver su horario completo.
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-gray-400">Clases del Grupo</p>
                <p className="text-xl font-black text-cyan-400 font-mono">{groupHorarios.length} hrs/sem</p>
              </div>
              <div className="h-8 w-px bg-white/10"></div>
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-gray-400">Docentes Asignados</p>
                <p className="text-xl font-black text-emerald-400 font-mono">{groupTeachers.length} Maestros</p>
              </div>
            </div>
          </div>

          {/* WEEKLY SCHEDULE GRID FOR GROUP */}
          <div className="glass-panel p-4 sm:p-6 rounded-3xl overflow-hidden border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[780px]">
                <thead>
                  <tr className="border-b border-white/10 text-gray-300 text-xs font-black uppercase tracking-wider bg-[#060b18]">
                    <th className="py-3 px-3 w-32 text-center text-gray-400">
                      <div className="flex items-center justify-center space-x-1">
                        <Clock size={14} className="text-cyan-400" />
                        <span>Horario ({activeGroupTurno === 'Vespertino' ? 'Vesp.' : 'Mat.'})</span>
                      </div>
                    </th>
                    {DIAS_SEMANA.map(dia => (
                      <th key={dia} className="py-3 px-3 text-center min-w-[140px]">
                        <div className="flex flex-col items-center">
                          <span className="text-white text-xs">{dia}</span>
                          <span className="text-[10px] text-gray-500 font-normal">Grupo {effectiveGroup}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5">
                  {groupModulos.map((mod) => {
                    if (mod.esReceso) {
                      return (
                        <tr key={`receso-${mod.horaInicio}`} className="bg-amber-500/[0.04] border-y border-amber-500/20">
                          <td className="py-2.5 px-3 text-center font-mono text-xs font-bold text-amber-400">
                            {mod.horaInicio} - {mod.horaFin}
                          </td>
                          <td colSpan={5} className="py-2.5 px-4 text-center">
                            <div className="inline-flex items-center space-x-2 text-amber-300 font-extrabold text-xs tracking-widest uppercase">
                              <Coffee size={15} className="text-amber-400" />
                              <span>☕ R E C E S O   E S C O L A R ({mod.horaInicio} - {mod.horaFin})</span>
                              <Coffee size={15} className="text-amber-400" />
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={`mod-${mod.horaInicio}`} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-3 px-2 text-center align-middle font-mono border-r border-white/5 bg-[#030712]/50">
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-xs font-black text-cyan-400">{mod.modulo}° Hora</span>
                            <span className="text-[11px] text-gray-300 font-bold mt-0.5">{mod.horaInicio} - {mod.horaFin}</span>
                          </div>
                        </td>

                        {DIAS_SEMANA.map((dia) => {
                          const bloque = groupScheduleMap.get(`${dia}-${mod.horaInicio}`) || groupScheduleMap.get(`${dia}-${mod.modulo}`);
                          const isHighlighted = selectedTeacherFilter
                            ? (bloque && normalizeTeacherName(bloque.maestro, bloque.grupo) === selectedTeacherFilter)
                            : true;

                          if (bloque) {
                            const palette = getMaestroPalette(bloque.maestro);

                            return (
                              <td
                                key={`${dia}-${mod.horaInicio}`}
                                className={`p-1.5 align-top transition-all ${
                                  !isHighlighted ? 'opacity-25 grayscale-[60%]' : 'opacity-100'
                                }`}
                              >
                                <div
                                  onClick={() => isAdmin && handleEditClick(bloque)}
                                  className={`group relative p-2.5 sm:p-3 rounded-2xl border transition-all duration-200 flex flex-col justify-between h-full min-h-[94px] ${
                                    palette.bgCard
                                  } ${palette.borderCard} ${isAdmin ? 'cursor-pointer hover:scale-[1.02] shadow-lg' : ''}`}
                                >
                                  <div>
                                    <div className="flex items-start justify-between gap-1">
                                      <p className="font-extrabold text-xs text-white leading-tight">
                                        {bloque.materia}
                                      </p>
                                      {isAdmin && (
                                        <button
                                          type="button"
                                          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white p-0.5 cursor-pointer"
                                          title="Editar esta clase"
                                        >
                                          <Edit size={12} />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <div className="mt-2 space-y-1.5">
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedMaestro(normalizeTeacherName(bloque.maestro, bloque.grupo));
                                        setConsultaModo('maestro');
                                      }}
                                      title="Clic para ver el horario completo de este maestro"
                                      className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-bold max-w-full cursor-pointer hover:brightness-125 ${palette.badgeBg} ${palette.badgeBorder} ${palette.badgeText}`}
                                    >
                                      <div className={`w-4 h-4 rounded-full ${palette.avatarBg} text-[9px] font-black flex items-center justify-center shrink-0`}>
                                        {bloque.maestro.charAt(0) || 'D'}
                                      </div>
                                      <span className="truncate">{bloque.maestro}</span>
                                    </div>

                                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                                      <span className="flex items-center space-x-1">
                                        <MapPin size={10} className="text-gray-500" />
                                        <span>{bloque.aula || `Aula ${effectiveGroup}`}</span>
                                      </span>
                                      <span className="text-[9px] text-gray-400">{bloque.horaInicio}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td key={`${dia}-${mod.horaInicio}`} className="p-1.5 align-middle">
                              {isAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => handleAddClick(dia, mod.modulo)}
                                  className="w-full h-full min-h-[94px] rounded-2xl border border-dashed border-white/10 hover:border-cyan-500/40 hover:bg-cyan-500/5 text-gray-600 hover:text-cyan-400 flex flex-col items-center justify-center transition-all p-2 cursor-pointer group"
                                  title={`Asignar clase el ${dia} (${mod.horaInicio} - ${mod.horaFin})`}
                                >
                                  <Plus size={16} className="group-hover:scale-125 transition-transform" />
                                  <span className="text-[10px] font-semibold mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    + Asignar
                                  </span>
                                </button>
                              ) : (
                                <div className="w-full h-full min-h-[94px] rounded-2xl border border-white/5 bg-black/10 flex items-center justify-center text-gray-700 text-xs">
                                  <span>—</span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* TEACHER DIRECTORY & COLOR LEGEND FOR THIS GROUP */}
          <div className="glass-panel p-5 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-extrabold text-white flex items-center space-x-2">
                  <Users size={16} className="text-purple-400" />
                  <span>Asignaturas y Docentes del Grupo &quot;{effectiveGroup}&quot;</span>
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Haz clic en una tarjeta para resaltar sus horas en este grupo, o pulsa <strong className="text-cyan-300">&quot;Ver Horario Maestro&quot;</strong> para consultar todos sus grupos.
                </p>
              </div>

              {selectedTeacherFilter && (
                <button
                  onClick={() => setSelectedTeacherFilter(null)}
                  className="text-xs font-semibold text-cyan-400 hover:text-white px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 transition-all cursor-pointer flex items-center space-x-1"
                >
                  <span>✕ Quitar Filtro ({selectedTeacherFilter})</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {groupTeachers.map((doc) => {
                const isFiltered = selectedTeacherFilter === doc.nombre;

                return (
                  <div
                    key={doc.nombre}
                    onClick={() => setSelectedTeacherFilter(isFiltered ? null : doc.nombre)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      doc.palette.bgCard
                    } ${doc.palette.borderCard} ${
                      isFiltered ? 'ring-2 ring-white shadow-xl scale-[1.01]' : 'hover:scale-[1.01]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-full ${doc.palette.avatarBg} text-xs font-black flex items-center justify-center shrink-0 shadow-md`}>
                          {doc.nombre.charAt(0) || 'D'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-xs text-white truncate">{doc.nombre}</p>
                          <p className="text-[11px] text-gray-300 font-semibold mt-0.5 leading-snug">
                            {doc.materias.join(' • ')}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-black/40 text-emerald-300 font-mono text-xs font-black shrink-0">
                        {doc.totalHoras} hrs
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${doc.palette.badgeBg} ${doc.palette.badgeText}`}>
                        🎨 {doc.palette.nombre}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMaestro(doc.nombre);
                          setConsultaModo('maestro');
                        }}
                        className="text-[10px] font-extrabold text-cyan-300 hover:text-white bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/30 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                      >
                        👨‍🏫 Ver Horario Maestro →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* =========================================================================
          VIEW 2: HORARIO SEMANAL POR MAESTRO (DOCENTE)
          ========================================================================= */}
      {consultaModo === 'maestro' && activeMaestroInfo && (
        <>
          {/* MAESTRO HEADER & WORKLOAD SUMMARY CARD */}
          <div className={`p-5 sm:p-6 rounded-3xl border ${activeMaestroInfo.palette.bgCard} ${activeMaestroInfo.palette.borderCard} space-y-4`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className={`w-12 h-12 rounded-2xl ${activeMaestroInfo.palette.avatarBg} text-lg font-black flex items-center justify-center shrink-0 shadow-lg`}>
                  {activeMaestroInfo.nombre.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-200 text-[10px] font-black uppercase tracking-wider">
                      Horario Individual por Maestro • Ciclo 2026-2
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-gray-200 text-[10px] font-mono font-bold">
                      Turnos: {activeMaestroInfo.turnos.join(' y ')}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                    {activeMaestroInfo.nombre}
                  </h3>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Materias que imparte: <strong className="text-white">{activeMaestroInfo.materias.join(' • ')}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4 self-end lg:self-center">
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-gray-300">Grupos que Atiende</p>
                  <p className="text-xl font-black text-cyan-300 font-mono">{activeMaestroInfo.grupos.length} Grupos</p>
                </div>
                <div className="h-8 w-px bg-white/15"></div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-gray-300">Carga Total Semanal</p>
                  <p className="text-2xl font-black text-emerald-400 font-mono">{activeMaestroInfo.totalHoras} Horas</p>
                </div>
              </div>
            </div>

            {/* Groups breakdown chips for this teacher */}
            <div className="pt-3 border-t border-white/10 flex items-center flex-wrap gap-2">
              <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                Desglose por Grupo (clic para ir al grupo):
              </span>
              {activeMaestroInfo.grupos.map(grp => (
                <button
                  key={grp}
                  type="button"
                  onClick={() => {
                    onSelectGroup(grp);
                    setConsultaModo('grupo');
                  }}
                  className="px-3 py-1 rounded-xl bg-black/50 hover:bg-black/80 border border-white/15 hover:border-cyan-400 text-xs font-mono font-bold text-white flex items-center space-x-1.5 transition-all cursor-pointer"
                  title={`Ver horario completo del grupo ${grp}`}
                >
                  <span className="text-cyan-400">Grupo {grp}:</span>
                  <span className="text-emerald-400">{activeMaestroInfo.horasPorGrupo[grp] || 0} hrs/sem</span>
                </button>
              ))}
            </div>
          </div>

          {/* WEEKLY SCHEDULE GRID FOR MAESTRO */}
          <div className="glass-panel p-4 sm:p-6 rounded-3xl overflow-hidden border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[780px]">
                <thead>
                  <tr className="border-b border-white/10 text-gray-300 text-xs font-black uppercase tracking-wider bg-[#060b18]">
                    <th className="py-3 px-3 w-36 text-center text-gray-400">
                      <div className="flex items-center justify-center space-x-1">
                        <Clock size={14} className="text-purple-400" />
                        <span>Hora / Módulo</span>
                      </div>
                    </th>
                    {DIAS_SEMANA.map(dia => (
                      <th key={dia} className="py-3 px-3 text-center min-w-[145px]">
                        <div className="flex flex-col items-center">
                          <span className="text-white text-xs">{dia}</span>
                          <span className="text-[10px] text-purple-300 font-normal truncate max-w-[130px]">
                            {activeMaestroInfo.nombre}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5">
                  {maestroModulos.map((mod, idx) => {
                    const isFirstVesp = mod.horaInicio === '13:30' && idx > 0;

                    if (mod.esReceso) {
                      return (
                        <tr key={`rec-doc-${mod.horaInicio}`} className="bg-amber-500/[0.04] border-y border-amber-500/20">
                          <td className="py-2 px-3 text-center font-mono text-xs font-bold text-amber-400">
                            {mod.horaInicio} - {mod.horaFin}
                          </td>
                          <td colSpan={5} className="py-2 px-4 text-center">
                            <div className="inline-flex items-center space-x-2 text-amber-300 font-extrabold text-[11px] tracking-widest uppercase">
                              <Coffee size={14} className="text-amber-400" />
                              <span>☕ {mod.label}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <React.Fragment key={`doc-mod-${mod.horaInicio}`}>
                        {isFirstVesp && (
                          <tr className="bg-indigo-950/40 border-y border-indigo-500/30">
                            <td colSpan={6} className="py-1.5 px-4 text-center text-[11px] font-black uppercase tracking-widest text-indigo-300">
                              🌙 Inicio de Turno Vespertino (13:30 - 19:50)
                            </td>
                          </tr>
                        )}
                        <tr className="hover:bg-white/[0.01] transition-colors">
                          <td className="py-3 px-2 text-center align-middle font-mono border-r border-white/5 bg-[#030712]/50">
                            <div className="flex flex-col items-center justify-center">
                              <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                                mod.turno === 'Vespertino' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-amber-500/20 text-amber-300'
                              }`}>
                                {mod.modulo}° {mod.turno === 'Vespertino' ? 'Vesp.' : 'Mat.'}
                              </span>
                              <span className="text-xs text-white font-bold mt-1">{mod.horaInicio} - {mod.horaFin}</span>
                            </div>
                          </td>

                          {DIAS_SEMANA.map((dia) => {
                            const bloque = maestroScheduleMap.get(`${dia}-${mod.horaInicio}`) ||
                              (mod.turno ? maestroScheduleMap.get(`${mod.turno}-${dia}-${mod.modulo}`) : undefined);

                            if (bloque) {
                              const palette = activeMaestroInfo.palette;

                              return (
                                <td key={`${dia}-${mod.horaInicio}`} className="p-1.5 align-top">
                                  <div
                                    onClick={() => isAdmin && handleEditClick(bloque)}
                                    className={`p-2.5 sm:p-3 rounded-2xl border transition-all flex flex-col justify-between h-full min-h-[90px] ${
                                      palette.bgCard
                                    } ${palette.borderCard} ${isAdmin ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
                                  >
                                    {/* Top: Prominent Group Badge */}
                                    <div className="flex items-center justify-between gap-1 mb-1.5">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onSelectGroup(bloque.grupo);
                                          setConsultaModo('grupo');
                                        }}
                                        className="px-2.5 py-0.5 rounded-lg bg-emerald-500 text-black font-mono font-black text-xs shadow-sm hover:bg-emerald-400 transition-colors cursor-pointer"
                                        title={`Ir al horario del grupo ${bloque.grupo}`}
                                      >
                                        GRUPO {bloque.grupo}
                                      </button>
                                      <span className="text-[10px] font-mono text-gray-300 font-bold">
                                        {bloque.grado}
                                      </span>
                                    </div>

                                    {/* Middle: Subject Name */}
                                    <p className="font-extrabold text-xs text-white leading-snug">
                                      {bloque.materia}
                                    </p>

                                    {/* Bottom: Room & Time */}
                                    <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] text-gray-300 font-mono">
                                      <span>📍 {bloque.aula || `Aula ${bloque.grupo}`}</span>
                                      <span>{bloque.horaInicio}</span>
                                    </div>
                                  </div>
                                </td>
                              );
                            }

                            return (
                              <td key={`${dia}-${mod.horaInicio}`} className="p-1.5 align-middle">
                                <div className="w-full h-full min-h-[90px] rounded-2xl border border-white/5 bg-black/10 flex items-center justify-center text-gray-700 text-xs">
                                  <span>—</span>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Upload Modal (For Administrator) */}
      <SubirHorariosModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onHorariosUpdated={onHorariosUpdated}
      />

      {/* Edit / Add Modal (For Administrator) */}
      <EditarClaseModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingBloque(null);
          setSlotToAdd(null);
        }}
        bloqueToEdit={editingBloque}
        defaultGrado={activeGroupGrado}
        defaultGrupo={effectiveGroup}
        defaultDia={slotToAdd?.dia || 'Lunes'}
        defaultModulo={slotToAdd?.modulo || 1}
        onSaved={onHorariosUpdated}
      />

    </div>
  );
}
