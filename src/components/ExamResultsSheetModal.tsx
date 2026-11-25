'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, FileSpreadsheet, Download, Copy, Check, ExternalLink, 
  RefreshCw, Search, Award, Users, CheckCircle2, XCircle, 
  TrendingUp, BarChart3, HelpCircle, ArrowUpDown, ShieldCheck
} from 'lucide-react';
import { ExamenData, RespuestaExamenAlumno } from '@/lib/recursos';

interface ExamResultsSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  examenId: string;
  examenTitulo?: string;
}

interface EstadisticasExamen {
  totalAlumnos: number;
  promedio: number;
  aprobados: number;
  reprobados: number;
  porcentajeAprobacion: number;
  mejorCalificacion: number;
  menorCalificacion: number;
}

export default function ExamResultsSheetModal({
  isOpen,
  onClose,
  examenId,
  examenTitulo
}: ExamResultsSheetModalProps) {
  const [examen, setExamen] = useState<ExamenData | null>(null);
  const [respuestas, setRespuestas] = useState<RespuestaExamenAlumno[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasExamen | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'aprobados' | 'reprobados'>('all');
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'hoja' | 'clave' | 'estadisticas'>('hoja');

  // Cargar datos del examen y respuestas del servidor
  const loadData = async () => {
    if (!examenId) return;
    setIsLoading(true);
    try {
      // 1. Obtener detalles del examen con clave
      const resExam = await fetch(`/api/examenes?id=${encodeURIComponent(examenId)}&includeClave=true`);
      const dataExam = await resExam.json();
      if (dataExam.success && dataExam.examen) {
        setExamen(dataExam.examen);
      }

      // 2. Obtener respuestas de alumnos
      const resResp = await fetch(`/api/examenes/respuestas?examenId=${encodeURIComponent(examenId)}`);
      const dataResp = await resResp.json();
      if (dataResp.success) {
        setRespuestas(dataResp.respuestas || []);
        setEstadisticas(dataResp.estadisticas || null);
      }
    } catch (err) {
      console.error('Error cargando respuestas de examen:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen && examenId) {
      loadData();
    }
  }, [isOpen, examenId]);

  // Filtrado de respuestas por búsqueda y estado
  const filteredRespuestas = useMemo(() => {
    return respuestas.filter(r => {
      if (statusFilter === 'aprobados' && r.calificacion < 6) return false;
      if (statusFilter === 'reprobados' && r.calificacion >= 6) return false;

      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase().trim();
        const matchName = r.alumnoNombre.toLowerCase().includes(q);
        const matchMat = r.alumnoMatricula.toLowerCase().includes(q);
        const matchGrp = (r.alumnoGrupo || '').toLowerCase().includes(q);
        if (!matchName && !matchMat && !matchGrp) return false;
      }
      return true;
    });
  }, [respuestas, searchFilter, statusFilter]);

  // Copiar tabla en formato TSV para pegar directamente en Google Sheets con Ctrl+V
  const handleCopyTSVForGoogleSheets = () => {
    if (respuestas.length === 0) return;

    const headers = [
      'No.',
      'Marca temporal',
      'Matrícula',
      'Nombre del Alumno',
      'Semestre',
      'Grupo',
      'Calificación (0-10)',
      'Aciertos',
      'Total Preguntas',
      'Porcentaje (%)',
      'Resultado'
    ];

    if (examen?.preguntas) {
      examen.preguntas.forEach((p, idx) => {
        headers.push(`P${idx + 1} (Clave: ${p.respuestaCorrecta})`);
      });
    }

    const rows = respuestas.map((r, i) => {
      const baseRow = [
        i + 1,
        `${r.fecha} ${r.hora}`,
        r.alumnoMatricula,
        r.alumnoNombre,
        r.alumnoSemestre || '',
        r.alumnoGrupo || '',
        r.calificacion,
        r.aciertos,
        r.totalPreguntas,
        `${r.porcentaje}%`,
        r.calificacion >= 6 ? 'APROBADO' : 'REPROBADO'
      ];

      if (examen?.preguntas) {
        examen.preguntas.forEach(p => {
          const resp = r.respuestas[p.id] || '-';
          const esCorrecta = resp === p.respuestaCorrecta ? '✓' : '✗';
          baseRow.push(`${resp} ${esCorrecta}`);
        });
      }

      return baseRow.join('\t');
    });

    const tsvContent = [headers.join('\t'), ...rows].join('\n');
    navigator.clipboard.writeText(tsvContent).then(() => {
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 3000);
    });
  };

  // Descarga directa del archivo Excel (.xlsx) formateado como Google Sheets
  const handleDownloadExcel = () => {
    const url = `/api/examenes/respuestas?examenId=${encodeURIComponent(examenId)}&format=xlsx`;
    window.open(url, '_blank');
  };

  // Descarga CSV para Google Drive
  const handleDownloadCSV = () => {
    const url = `/api/examenes/respuestas?examenId=${encodeURIComponent(examenId)}&format=csv`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-6xl max-h-[94vh] bg-[#0b0f19] border border-emerald-500/30 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.15)] flex flex-col overflow-hidden text-white">
        
        {/* Cabecera Tipo Google Sheets */}
        <div className="p-4 sm:p-6 border-b border-white/10 bg-gradient-to-r from-emerald-950/40 via-[#0e1626] to-[#0b0f19] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shrink-0">
              <FileSpreadsheet size={26} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
                  <ShieldCheck size={12} /> Google Sheets en Vivo
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {examen?.semestre || 'Semestre'} - Grupo &quot;{examen?.grupo || 'Todos'}&quot;
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {examen?.materia || 'Materia'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                {examen?.titulo || examenTitulo || 'Resultados de Evaluación'}
              </h2>
              <p className="text-xs text-gray-400">
                Docente: <strong className="text-gray-200">{examen?.docenteNombre || 'CECYTE'}</strong> • Clave automática calificada al 100%
              </p>
            </div>
          </div>

          {/* Botones de Acción de Exportación */}
          <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
            <button
              onClick={() => { setIsRefreshing(true); loadData(); }}
              disabled={isRefreshing}
              title="Recargar respuestas"
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 transition-all cursor-pointer"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-emerald-400' : ''} />
            </button>

            <button
              onClick={handleCopyTSVForGoogleSheets}
              title="Copiar datos tabulares para pegar directamente en Google Sheets con Ctrl+V"
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-gray-200 hover:text-white transition-all flex items-center space-x-1.5 cursor-pointer shadow"
            >
              {copiedSuccess ? (
                <>
                  <Check size={14} className="text-emerald-400" />
                  <span className="text-emerald-300">¡Copiado para Google Sheets!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copiar para Sheets (Ctrl+V)</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadExcel}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-black text-white transition-all flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-emerald-600/30 hover:scale-[1.02]"
            >
              <Download size={14} />
              <span>Descargar Excel (.xlsx)</span>
            </button>

            <button
              onClick={handleDownloadCSV}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-emerald-500/30 text-xs font-semibold text-emerald-300 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <span>CSV</span>
            </button>

            {examen?.googleSheetUrl && (
              <a
                href={examen.googleSheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white transition-all flex items-center space-x-1.5"
              >
                <ExternalLink size={14} />
                <span>Abrir en Google Drive</span>
              </a>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all cursor-pointer border border-white/10"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Resumen de Métricas Superiores */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-black/40 border-b border-white/10">
          <div className="glass-panel p-3 rounded-2xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
              <span>Alumnos Evaluados</span>
              <Users size={14} className="text-cyan-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white">
              {estadisticas?.totalAlumnos ?? respuestas.length}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              Grupo {examen?.grupo || 'Todos'}
            </div>
          </div>

          <div className="glass-panel p-3 rounded-2xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
              <span>Promedio General</span>
              <Award size={14} className="text-amber-400" />
            </div>
            <div className={`text-xl sm:text-2xl font-black ${
              (estadisticas?.promedio || 0) >= 8 ? 'text-emerald-400' :
              (estadisticas?.promedio || 0) >= 6 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {estadisticas?.promedio ?? 0} <span className="text-xs text-gray-400">/ 10</span>
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              Base 10.0 ponderada
            </div>
          </div>

          <div className="glass-panel p-3 rounded-2xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
              <span>Aprobación</span>
              <TrendingUp size={14} className="text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400">
              {estadisticas?.porcentajeAprobacion ?? 0}%
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              {estadisticas?.aprobados ?? 0} aprobados • {estadisticas?.reprobados ?? 0} reprobados
            </div>
          </div>

          <div className="glass-panel p-3 rounded-2xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
              <span>Rango de Notas</span>
              <BarChart3 size={14} className="text-purple-400" />
            </div>
            <div className="text-base sm:text-lg font-black text-white mt-1">
              Max: <span className="text-emerald-400">{estadisticas?.mejorCalificacion ?? 0}</span> • Min: <span className="text-red-400">{estadisticas?.menorCalificacion ?? 0}</span>
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              {examen?.totalPreguntas || 0} reactivos totales
            </div>
          </div>
        </div>

        {/* Sub-Tabs de navegación interna */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2 border-b border-white/10 bg-[#0d121f]">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveSubTab('hoja')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeSubTab === 'hoja'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileSpreadsheet size={13} />
              <span>Hoja de Cálculo ({respuestas.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('clave')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeSubTab === 'clave'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <HelpCircle size={13} />
              <span>Clave Oficial de Reactivos ({examen?.preguntas?.length || 0})</span>
            </button>
          </div>

          {activeSubTab === 'hoja' && (
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar alumno o matrícula..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-8 pr-3 py-1 text-xs rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 w-44 sm:w-60"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="bg-black/40 border border-white/10 text-gray-300 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
              >
                <option value="all">Todos ({respuestas.length})</option>
                <option value="aprobados">Aprobados (≥ 6.0)</option>
                <option value="reprobados">Reprobados (&lt; 6.0)</option>
              </select>
            </div>
          )}
        </div>

        {/* Contenido Principal con Scroll */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-[#090d16]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <RefreshCw size={30} className="animate-spin text-emerald-400" />
              <p className="text-xs text-gray-400 font-semibold">Cargando hoja de cálculo de Google Sheets...</p>
            </div>
          ) : activeSubTab === 'hoja' ? (
            respuestas.length === 0 ? (
              <div className="text-center py-20 glass-panel rounded-3xl border border-white/10 max-w-md mx-auto p-8">
                <FileSpreadsheet size={44} className="mx-auto text-emerald-400 mb-3 opacity-60" />
                <h3 className="text-base font-bold text-white">Aún no hay respuestas registradas</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Los alumnos de este grupo ({examen?.grupo}) podrán ingresar al examen desde su portal para responderlo sin ver la clave. En cuanto lo envíen, aparecerán aquí automáticamente en tiempo real.
                </p>
              </div>
            ) : (
              <div className="border border-white/10 rounded-2xl overflow-hidden bg-black/50 shadow-2xl">
                <div className="overflow-x-auto max-h-[55vh]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#0e1726] sticky top-0 z-10 border-b border-emerald-500/30 text-gray-300 font-mono text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 border-r border-white/10 w-12 text-center text-gray-400">#</th>
                        <th className="py-2.5 px-3 border-r border-white/10 whitespace-nowrap">Marca Temporal</th>
                        <th className="py-2.5 px-3 border-r border-white/10 whitespace-nowrap">Matrícula</th>
                        <th className="py-2.5 px-4 border-r border-white/10 whitespace-nowrap">Nombre del Alumno</th>
                        <th className="py-2.5 px-3 border-r border-white/10 text-center">Gpo</th>
                        <th className="py-2.5 px-3 border-r border-white/10 text-center font-bold text-emerald-300">Calificación</th>
                        <th className="py-2.5 px-3 border-r border-white/10 text-center">Aciertos</th>
                        <th className="py-2.5 px-3 border-r border-white/10 text-center">%</th>
                        <th className="py-2.5 px-3 border-r border-white/10 text-center">Estado</th>
                        
                        {/* Columnas dinámicas de preguntas con la clave del docente */}
                        {examen?.preguntas?.map((p, idx) => (
                          <th 
                            key={p.id} 
                            title={`Pregunta ${idx + 1}: ${p.texto} | Clave correcta: ${p.respuestaCorrecta}`}
                            className="py-2.5 px-3 border-r border-white/10 text-center whitespace-nowrap bg-purple-950/30 text-purple-300 font-bold"
                          >
                            P{idx + 1} ({p.respuestaCorrecta})
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                      {filteredRespuestas.map((r, index) => {
                        const isApproved = r.calificacion >= 6;
                        return (
                          <tr key={r.id || index} className="hover:bg-emerald-500/5 transition-colors">
                            <td className="py-2 px-3 border-r border-white/5 text-center text-gray-500">
                              {index + 1}
                            </td>
                            <td className="py-2 px-3 border-r border-white/5 text-gray-400 whitespace-nowrap">
                              {r.fecha} {r.hora}
                            </td>
                            <td className="py-2 px-3 border-r border-white/5 text-cyan-300 font-semibold whitespace-nowrap">
                              {r.alumnoMatricula}
                            </td>
                            <td className="py-2 px-4 border-r border-white/5 text-white font-sans font-medium whitespace-nowrap">
                              {r.alumnoNombre}
                            </td>
                            <td className="py-2 px-3 border-r border-white/5 text-center text-gray-300">
                              {r.alumnoGrupo || '-'}
                            </td>
                            <td className={`py-2 px-3 border-r border-white/5 text-center font-black text-xs ${
                              r.calificacion >= 8 ? 'text-emerald-400 bg-emerald-500/10' :
                              r.calificacion >= 6 ? 'text-amber-400 bg-amber-500/10' : 'text-red-400 bg-red-500/10'
                            }`}>
                              {r.calificacion.toFixed(1)}
                            </td>
                            <td className="py-2 px-3 border-r border-white/5 text-center text-gray-300 whitespace-nowrap">
                              {r.aciertos} / {r.totalPreguntas}
                            </td>
                            <td className="py-2 px-3 border-r border-white/5 text-center text-gray-400">
                              {r.porcentaje}%
                            </td>
                            <td className="py-2 px-3 border-r border-white/5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                isApproved
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
                              }`}>
                                {isApproved ? 'APROBADO' : 'REPROBADO'}
                              </span>
                            </td>

                            {/* Desglose de respuestas por pregunta */}
                            {examen?.preguntas?.map(p => {
                              const respAlumno = r.respuestas[p.id] || '-';
                              const esCorrecta = respAlumno === p.respuestaCorrecta;
                              return (
                                <td 
                                  key={p.id}
                                  className={`py-2 px-3 border-r border-white/5 text-center font-bold ${
                                    respAlumno === '-' 
                                      ? 'text-gray-600'
                                      : esCorrecta 
                                      ? 'text-emerald-400 bg-emerald-500/5' 
                                      : 'text-red-400 bg-red-500/5'
                                  }`}
                                >
                                  {respAlumno} {respAlumno !== '-' && (esCorrecta ? '✓' : '✗')}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-[#0e1726] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-2">
                  <span>
                    Mostrando <strong className="text-white">{filteredRespuestas.length}</strong> de <strong className="text-white">{respuestas.length}</strong> evaluaciones registradas
                  </span>
                  <div className="flex items-center space-x-3 text-[11px]">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Aprobado (≥ 6.0)
                    </span>
                    <span className="flex items-center gap-1 text-red-400">
                      <span className="w-2 h-2 rounded-full bg-red-400"></span> Reprobado (&lt; 6.0)
                    </span>
                  </div>
                </div>
              </div>
            )
          ) : (
            /* Vista de Clave Oficial de Reactivos */
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck size={16} className="text-purple-400" />
                    Clave de Respuestas Correctas del Docente
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Esta clave es estrictamente privada y el sistema la utiliza para calificar a los alumnos sin que ellos puedan verla.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold shrink-0">
                  {examen?.preguntas?.length || 0} Reactivos
                </span>
              </div>

              {examen?.preguntas?.map((p, pIdx) => (
                <div key={p.id} className="glass-panel p-4 rounded-2xl border border-white/10 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-bold text-sm text-white">
                      {p.numero || pIdx + 1}. {p.texto}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-black text-xs shrink-0">
                      Clave: {p.respuestaCorrecta}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {p.opciones.map(opt => {
                      const isCorrect = opt.inciso === p.respuestaCorrecta;
                      return (
                        <div
                          key={opt.inciso}
                          className={`p-2.5 rounded-xl border flex items-start space-x-2 ${
                            isCorrect
                              ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200 font-semibold'
                              : 'bg-black/30 border-white/5 text-gray-300'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] shrink-0 ${
                            isCorrect ? 'bg-emerald-500 text-black' : 'bg-white/10 text-gray-400'
                          }`}>
                            {opt.inciso}
                          </span>
                          <span className="leading-tight">{opt.texto}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pie de modal */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-[#0b0f19] flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Sincronización en vivo activada con Google Drive y hojas de cálculo CECYTE</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all cursor-pointer"
          >
            Cerrar Visor
          </button>
        </div>

      </div>
    </div>
  );
}
