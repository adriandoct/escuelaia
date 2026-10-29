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
  resetHorariosToDefault
} from '@/lib/horarios';
import { 
  Calendar, Clock, BookOpen, MapPin, Plus, Edit, 
  Filter, Sparkles, UploadCloud, Users, Coffee, 
  Download, RefreshCw, CheckCircle2, ShieldCheck, Search
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
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBloque, setEditingBloque] = useState<BloqueHorario | null>(null);
  const [slotToAdd, setSlotToAdd] = useState<{ dia: DiaSemana; modulo: number } | null>(null);
  const [groupSearch, setGroupSearch] = useState('');

  // Extract all available groups and grades from schedules
  const allGroups = useMemo(() => {
    const set = new Set<string>();
    horarios.forEach(h => set.add(h.grupo));
    return Array.from(set).sort();
  }, [horarios]);

  const allGrades = useMemo(() => {
    const set = new Set<string>();
    horarios.forEach(h => set.add(h.grado));
    return Array.from(set).sort();
  }, [horarios]);

  // Filter schedules for active group
  const groupHorarios = useMemo(() => {
    return horarios.filter(h => {
      const matchGroup = selectedGroup ? h.grupo === selectedGroup : true;
      const matchGrade = selectedGrade ? h.grado === selectedGrade : true;
      return matchGroup && matchGrade;
    });
  }, [horarios, selectedGroup, selectedGrade]);

  // Teachers directory for this group
  const groupTeachers = useMemo(() => {
    return getMaestrosDirectory(groupHorarios);
  }, [groupHorarios]);

  // All teachers directory across the institution
  const allTeachers = useMemo(() => {
    return getMaestrosDirectory(horarios);
  }, [horarios]);

  // Map of (dia + modulo) -> BloqueHorario
  const scheduleMap = useMemo(() => {
    const map = new Map<string, BloqueHorario>();
    groupHorarios.forEach(b => {
      map.set(`${b.dia}-${b.modulo}`, b);
    });
    return map;
  }, [groupHorarios]);

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
                  Modo Administrador Activo
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              </div>
              <p className="text-xs text-gray-300">
                Tienes privilegios para <strong className="text-white">subir archivos de horario</strong>, agregar materias y asignar docentes a cada grupo.
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
                <span>📑 Ver Reportes</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          GROUP AND GRADE SELECTORS & SEARCH
          ========================================================================= */}
      <div className="glass-panel p-5 rounded-3xl space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Grade Chips */}
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center space-x-1 mr-1">
              <Calendar size={14} className="text-cyan-400" />
              <span>Semestre / Grado:</span>
            </span>

            <button
              onClick={() => onSelectGrade('')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                !selectedGrade
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                  : 'glass-panel text-gray-400 hover:text-white'
              }`}
            >
              Todos
            </button>

            {allGrades.map(g => (
              <button
                key={g}
                onClick={() => onSelectGrade(g)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedGrade === g
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                    : 'glass-panel text-gray-400 hover:text-white'
                }`}
              >
                {g} Semestre
              </button>
            ))}
          </div>

          {/* Group Search / Picker */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Grupo Activo:
            </span>
            <select
              value={selectedGroup}
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

        {/* Quick Group Chips */}
        <div className="pt-2 border-t border-white/5 flex items-center flex-wrap gap-1.5">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">
            Grupos Rápidos:
          </span>
          {allGroups.map(grp => {
            const isSelected = selectedGroup === grp;
            return (
              <button
                key={grp}
                onClick={() => onSelectGroup(grp)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/30 ring-1 ring-emerald-300'
                    : 'glass-panel text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {grp}
              </button>
            );
          })}
        </div>

      </div>

      {/* =========================================================================
          GROUP HEADER & STATS
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl glass-panel border border-cyan-500/20">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-xl sm:text-2xl font-black text-white">
              Horario Semanal - Grupo {selectedGrade || ''} &quot;{selectedGroup}&quot;
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold">
              Turno Matutino • Ciclo 2026-1
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Cada maestro tiene un color único asignado para diferenciar visualmente su presencia en cada aula y módulo.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-gray-400">Total Clases Semanales</p>
            <p className="text-xl font-black text-cyan-400 font-mono">{groupHorarios.length} Módulos</p>
          </div>
          <div className="h-8 w-px bg-white/10"></div>
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-gray-400">Docentes en Grupo</p>
            <p className="text-xl font-black text-emerald-400 font-mono">{groupTeachers.length} Maestros</p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          WEEKLY SCHEDULE GRID (LUNES A VIERNES X MÓDULOS)
          ========================================================================= */}
      <div className="glass-panel p-4 sm:p-6 rounded-3xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[780px]">
            
            {/* Header: Days of the week */}
            <thead>
              <tr className="border-b border-white/10 text-gray-300 text-xs font-black uppercase tracking-wider bg-[#060b18]">
                <th className="py-3 px-3 w-28 text-center text-gray-400">
                  <div className="flex items-center justify-center space-x-1">
                    <Clock size={14} className="text-cyan-400" />
                    <span>Módulo</span>
                  </div>
                </th>
                {DIAS_SEMANA.map(dia => (
                  <th key={dia} className="py-3 px-3 text-center min-w-[140px]">
                    <div className="flex flex-col items-center">
                      <span className="text-white text-xs">{dia}</span>
                      <span className="text-[10px] text-gray-500 font-normal">Clases grupales</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body: Modules Rows */}
            <tbody className="divide-y divide-white/5">
              {MODULOS_OFICIALES.map((mod) => {
                
                // Receso Escolar Row
                if (mod.esReceso) {
                  return (
                    <tr key={`receso-${mod.horaInicio}`} className="bg-amber-500/[0.04] border-y border-amber-500/20">
                      <td className="py-2.5 px-3 text-center font-mono text-xs font-bold text-amber-400">
                        {mod.horaInicio} - {mod.horaFin}
                      </td>
                      <td colSpan={5} className="py-2.5 px-4 text-center">
                        <div className="inline-flex items-center space-x-2 text-amber-300 font-extrabold text-xs tracking-widest uppercase">
                          <Coffee size={15} className="text-amber-400" />
                          <span>☕ Receso Escolar Institucional (30 Minutos)</span>
                          <Coffee size={15} className="text-amber-400" />
                        </div>
                      </td>
                    </tr>
                  );
                }

                // Regular class row
                return (
                  <tr key={`mod-${mod.modulo}`} className="hover:bg-white/[0.01] transition-colors">
                    
                    {/* Time Module Column */}
                    <td className="py-3 px-2 text-center align-middle font-mono border-r border-white/5 bg-[#030712]/50">
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-xs font-black text-cyan-400">{mod.modulo}° Módulo</span>
                        <span className="text-[11px] text-gray-400 mt-0.5">{mod.horaInicio} - {mod.horaFin}</span>
                      </div>
                    </td>

                    {/* Day Cells */}
                    {DIAS_SEMANA.map((dia) => {
                      const bloque = scheduleMap.get(`${dia}-${mod.modulo}`);
                      const isHighlighted = selectedTeacherFilter 
                        ? (bloque && bloque.maestro.toLowerCase().includes(selectedTeacherFilter.toLowerCase()))
                        : true;

                      // If block exists in this slot
                      if (bloque) {
                        const palette = getMaestroPalette(bloque.maestro);

                        return (
                          <td 
                            key={`${dia}-${mod.modulo}`} 
                            className={`p-1.5 align-top transition-all ${
                              !isHighlighted ? 'opacity-30 grayscale-[50%]' : 'opacity-100'
                            }`}
                          >
                            <div 
                              onClick={() => isAdmin && handleEditClick(bloque)}
                              className={`group relative p-2.5 sm:p-3 rounded-2xl border transition-all duration-200 flex flex-col justify-between h-full min-h-[96px] ${
                                palette.bgCard
                              } ${palette.borderCard} ${isAdmin ? 'cursor-pointer hover:scale-[1.02] shadow-lg' : ''}`}
                            >
                              
                              {/* Subject title & quick edit icon */}
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

                              {/* Teacher Badge with assigned color */}
                              <div className="mt-2 space-y-1.5">
                                <div className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-lg border text-[11px] font-bold max-w-full ${palette.badgeBg} ${palette.badgeBorder} ${palette.badgeText}`}>
                                  <div className={`w-4 h-4 rounded-full ${palette.avatarBg} text-[9px] font-black flex items-center justify-center shrink-0`}>
                                    {bloque.maestro.replace(/prof(a)?\.?/i, '').trim().charAt(0) || 'D'}
                                  </div>
                                  <span className="truncate">{bloque.maestro}</span>
                                </div>

                                {/* Room / Location */}
                                <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                                  <span className="flex items-center space-x-1">
                                    <MapPin size={11} className="text-gray-500" />
                                    <span>{bloque.aula || 'Aula 101'}</span>
                                  </span>
                                  <span className="text-[9px] text-gray-500">{bloque.horaInicio}</span>
                                </div>
                              </div>

                            </div>
                          </td>
                        );
                      }

                      // Empty slot
                      return (
                        <td key={`${dia}-${mod.modulo}`} className="p-1.5 align-middle">
                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={() => handleAddClick(dia, mod.modulo)}
                              className="w-full h-full min-h-[96px] rounded-2xl border border-dashed border-white/10 hover:border-cyan-500/40 hover:bg-cyan-500/5 text-gray-600 hover:text-cyan-400 flex flex-col items-center justify-center transition-all p-2 cursor-pointer group"
                              title={`Asignar clase el ${dia} en el ${mod.modulo}° módulo (${mod.horaInicio} - ${mod.horaFin})`}
                            >
                              <Plus size={16} className="group-hover:scale-125 transition-transform" />
                              <span className="text-[10px] font-semibold mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                + Asignar
                              </span>
                            </button>
                          ) : (
                            <div className="w-full h-full min-h-[96px] rounded-2xl border border-white/5 bg-black/10 flex items-center justify-center text-gray-700 text-xs">
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

      {/* =========================================================================
          TEACHER DIRECTORY & COLOR LEGEND (INTERACTIVE FILTER)
          ========================================================================= */}
      <div className="glass-panel p-5 rounded-3xl space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-extrabold text-white flex items-center space-x-2">
              <Users size={16} className="text-purple-400" />
              <span>Directorio de Maestros y Código de Colores Institucional</span>
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">
              Haz clic en cualquier maestro para resaltar exclusivamente sus clases en el horario del grupo.
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

        {/* Teacher Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {groupTeachers.map((doc) => {
            const isFiltered = selectedTeacherFilter === doc.nombre;

            return (
              <div
                key={doc.nombre}
                onClick={() => setSelectedTeacherFilter(isFiltered ? null : doc.nombre)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                  doc.palette.bgCard
                } ${doc.palette.borderCard} ${
                  isFiltered ? 'ring-2 ring-white shadow-xl scale-[1.02]' : 'hover:scale-[1.01]'
                }`}
              >
                <div className="flex items-start space-x-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-full ${doc.palette.avatarBg} text-xs font-black flex items-center justify-center shrink-0 shadow-md`}>
                    {doc.nombre.replace(/prof(a)?\.?/i, '').trim().charAt(0) || 'D'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-xs text-white truncate">{doc.nombre}</p>
                    <p className="text-[10px] text-gray-400 truncate">{doc.materias.join(', ')}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${doc.palette.badgeBg} ${doc.palette.badgeText}`}>
                        {doc.palette.nombre}
                      </span>
                      <span className="text-[10px] font-mono text-gray-300">
                        {doc.totalHoras} hrs/sem
                      </span>
                    </div>
                  </div>
                </div>

                <div className="w-3 h-3 rounded-full shrink-0 mt-1" style={{ backgroundColor: doc.palette.accent }}></div>
              </div>
            );
          })}
        </div>

      </div>

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
        defaultGrado={selectedGrade || '1°'}
        defaultGrupo={selectedGroup || '1A'}
        defaultDia={slotToAdd?.dia || 'Lunes'}
        defaultModulo={slotToAdd?.modulo || 1}
        onSaved={onHorariosUpdated}
      />

    </div>
  );
}
