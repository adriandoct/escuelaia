"use strict";

'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Save, Trash2, Clock, BookOpen, User, 
  MapPin, Calendar, Layers, CheckCircle2 
} from 'lucide-react';
import { 
  BloqueHorario, 
  DiaSemana, 
  DIAS_SEMANA, 
  MODULOS_OFICIALES, 
  addBloqueHorario, 
  updateBloqueHorario, 
  deleteBloqueHorario,
  getStoredHorarios,
  getMaestroPalette
} from '@/lib/horarios';

interface EditarClaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  bloqueToEdit: BloqueHorario | null;
  defaultGrado?: string;
  defaultGrupo?: string;
  defaultDia?: DiaSemana;
  defaultModulo?: number;
  onSaved: (allHorarios: BloqueHorario[]) => void;
}

export default function EditarClaseModal({
  isOpen,
  onClose,
  bloqueToEdit,
  defaultGrado = '1°',
  defaultGrupo = '1A',
  defaultDia = 'Lunes',
  defaultModulo = 1,
  onSaved
}: EditarClaseModalProps) {
  const isEditing = Boolean(bloqueToEdit);

  const [grado, setGrado] = useState(defaultGrado);
  const [grupo, setGrupo] = useState(defaultGrupo);
  const [dia, setDia] = useState<DiaSemana>(defaultDia);
  const [modulo, setModulo] = useState<number>(defaultModulo);
  const [materia, setMateria] = useState('');
  const [maestro, setMaestro] = useState('');
  const [aula, setAula] = useState('Aula 101');
  const [turno, setTurno] = useState<'Matutino' | 'Vespertino'>('Matutino');

  useEffect(() => {
    if (bloqueToEdit) {
      setGrado(bloqueToEdit.grado);
      setGrupo(bloqueToEdit.grupo);
      setDia(bloqueToEdit.dia);
      setModulo(bloqueToEdit.modulo);
      setMateria(bloqueToEdit.materia);
      setMaestro(bloqueToEdit.maestro);
      setAula(bloqueToEdit.aula || 'Aula 101');
      setTurno(bloqueToEdit.turno || 'Matutino');
    } else {
      setGrado(defaultGrado);
      setGrupo(defaultGrupo);
      setDia(defaultDia);
      setModulo(defaultModulo);
      setMateria('');
      setMaestro('');
      setAula('Aula 101');
      setTurno('Matutino');
    }
  }, [bloqueToEdit, defaultGrado, defaultGrupo, defaultDia, defaultModulo, isOpen]);

  if (!isOpen) return null;

  const matchedMod = MODULOS_OFICIALES.find(m => m.modulo === modulo) || MODULOS_OFICIALES[0];
  const teacherPalette = getMaestroPalette(maestro || 'Docente');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materia.trim() || !maestro.trim()) {
      alert('Por favor ingresa la materia y el nombre del maestro.');
      return;
    }

    if (isEditing && bloqueToEdit) {
      updateBloqueHorario(bloqueToEdit.id, {
        grado,
        grupo,
        dia,
        modulo,
        horaInicio: matchedMod.horaInicio,
        horaFin: matchedMod.horaFin,
        materia: materia.trim(),
        maestro: maestro.trim(),
        aula: aula.trim(),
        turno
      });
    } else {
      addBloqueHorario({
        grado,
        grupo,
        dia,
        modulo,
        horaInicio: matchedMod.horaInicio,
        horaFin: matchedMod.horaFin,
        materia: materia.trim(),
        maestro: maestro.trim(),
        aula: aula.trim(),
        turno,
        ciclo: '2026-1'
      });
    }

    const updated = getStoredHorarios();
    onSaved(updated);
    onClose();
  };

  const handleDelete = () => {
    if (!bloqueToEdit) return;
    if (confirm(`¿Eliminar la clase de "${bloqueToEdit.materia}" de ${bloqueToEdit.dia}?`)) {
      deleteBloqueHorario(bloqueToEdit.id);
      const updated = getStoredHorarios();
      onSaved(updated);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#090d16] border border-emerald-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl text-gray-200 max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Glow */}
        <div className="absolute top-0 right-0 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10 shrink-0">
          <div>
            <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
              <span>👑 Administración de Horarios</span>
            </div>
            <h3 className="text-xl font-black text-white mt-1">
              {isEditing ? 'Editar Clase de Horario' : 'Asignar Nueva Clase'}
            </h3>
            <p className="text-xs text-gray-400">
              Configura el docente a cargo, materia, módulo y aula para el grupo {grado} &quot;{grupo}&quot;.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          
          {/* Grado y Grupo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Grado:
              </label>
              <select
                value={grado}
                onChange={(e) => setGrado(e.target.value)}
                className="w-full glass-input py-2 px-3 rounded-xl text-xs text-white"
              >
                <option value="1°" className="bg-gray-900">1° Semestre</option>
                <option value="2°" className="bg-gray-900">2° Semestre</option>
                <option value="3°" className="bg-gray-900">3° Semestre</option>
                <option value="4°" className="bg-gray-900">4° Semestre</option>
                <option value="5°" className="bg-gray-900">5° Semestre</option>
                <option value="6°" className="bg-gray-900">6° Semestre</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Grupo:
              </label>
              <input
                type="text"
                value={grupo}
                onChange={(e) => setGrupo(e.target.value.toUpperCase())}
                placeholder="Ej. 1A, 3APGA..."
                required
                className="w-full glass-input py-2 px-3 rounded-xl text-xs text-white font-mono uppercase"
              />
            </div>
          </div>

          {/* Día y Módulo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Día de la Semana:
              </label>
              <select
                value={dia}
                onChange={(e) => setDia(e.target.value as DiaSemana)}
                className="w-full glass-input py-2 px-3 rounded-xl text-xs text-white"
              >
                {DIAS_SEMANA.map(d => (
                  <option key={d} value={d} className="bg-gray-900">{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Módulo / Horario:
              </label>
              <select
                value={modulo}
                onChange={(e) => setModulo(parseInt(e.target.value, 10))}
                className="w-full glass-input py-2 px-3 rounded-xl text-xs text-white font-mono"
              >
                {MODULOS_OFICIALES.filter(m => !m.esReceso).map(m => (
                  <option key={m.modulo} value={m.modulo} className="bg-gray-900">
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Materia */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Nombre de la Materia / Asignatura:
            </label>
            <div className="relative">
              <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
              <input
                type="text"
                value={materia}
                onChange={(e) => setMateria(e.target.value)}
                placeholder="Ej. Matemáticas I, Programación, Inglés..."
                required
                className="w-full glass-input py-2.5 pl-10 pr-3 rounded-xl text-xs text-white"
              />
            </div>
          </div>

          {/* Docente / Maestro */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Docente / Maestro a Cargo:
              </label>
              {maestro && (
                <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${teacherPalette.badgeBg} ${teacherPalette.badgeText} border ${teacherPalette.badgeBorder}`}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: teacherPalette.accent }}></span>
                  <span>Color: {teacherPalette.nombre}</span>
                </span>
              )}
            </div>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
              <input
                type="text"
                value={maestro}
                onChange={(e) => setMaestro(e.target.value)}
                placeholder="Ej. Prof. Marcos Hernández, Profa. Mariana López..."
                required
                className="w-full glass-input py-2.5 pl-10 pr-3 rounded-xl text-xs text-white"
              />
            </div>
          </div>

          {/* Aula y Turno */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Aula / Laboratorio:
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                <input
                  type="text"
                  value={aula}
                  onChange={(e) => setAula(e.target.value)}
                  placeholder="Aula 101, Lab Cómputo..."
                  className="w-full glass-input py-2 pl-9 pr-3 rounded-xl text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Turno:
              </label>
              <select
                value={turno}
                onChange={(e) => setTurno(e.target.value as 'Matutino' | 'Vespertino')}
                className="w-full glass-input py-2 px-3 rounded-xl text-xs text-white"
              >
                <option value="Matutino" className="bg-gray-900">Matutino</option>
                <option value="Vespertino" className="bg-gray-900">Vespertino</option>
              </select>
            </div>
          </div>

          {/* Color Preview Card */}
          {maestro && (
            <div className={`p-3.5 rounded-2xl border ${teacherPalette.bgCard} ${teacherPalette.borderCard} transition-all`}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] uppercase font-bold text-gray-400">Previsualización de Tarjeta de Horario:</span>
                <span className="text-[10px] text-gray-400 font-mono">{matchedMod.horaInicio} - {matchedMod.horaFin}</span>
              </div>
              <p className="font-extrabold text-sm text-white mt-1">{materia || 'Nombre de la Materia'}</p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                <div className="flex items-center space-x-1.5">
                  <div className={`w-5 h-5 rounded-full ${teacherPalette.avatarBg} text-[10px] font-bold flex items-center justify-center shrink-0`}>
                    {maestro.replace(/prof(a)?\.?/i, '').trim().charAt(0) || 'D'}
                  </div>
                  <span className="text-xs font-semibold text-white">{maestro}</span>
                </div>
                <span className="text-[10px] font-mono text-gray-300 bg-white/10 px-2 py-0.5 rounded-md">
                  📍 {aula || 'Aula 101'}
                </span>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            {isEditing ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-bold transition-all cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Eliminar Clase</span>
              </button>
            ) : <div></div>}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl glass-panel text-xs font-semibold text-gray-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <Save size={15} />
                <span>{isEditing ? 'Actualizar Clase' : 'Guardar en Horario'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
