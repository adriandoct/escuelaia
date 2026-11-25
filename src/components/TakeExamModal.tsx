'use client';

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  FileSpreadsheet, CheckCircle2, AlertCircle, X, Check, 
  Clock, ArrowRight, ShieldCheck, User, RefreshCw, Award, Sparkles
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ExamenData, PreguntaExamen } from '@/lib/recursos';

interface TakeExamModalProps {
  examenId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: (resultado: any) => void;
  onFinished?: () => void;
  examenTitulo?: string;
  semestre?: string;
  grupo?: string;
  materia?: string;
}

export default function TakeExamModal({
  examenId,
  isOpen,
  onClose,
  onCompleted,
  onFinished,
  examenTitulo,
  semestre: defaultSemestre,
  grupo: defaultGrupo,
  materia: defaultMateria
}: TakeExamModalProps) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<ExamenData | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Student Information
  const [matricula, setMatricula] = useState('');
  const [nombre, setNombre] = useState('');
  const [semestre, setSemestre] = useState(defaultSemestre || '');
  const [grupo, setGrupo] = useState(defaultGrupo || '');

  // Selected Answers: preguntaId -> inciso (A, B, C, D)
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultado, setResultado] = useState<{
    aciertos: number;
    totalPreguntas: number;
    calificacion: number;
    porcentaje: number;
    aprobado: boolean;
  } | null>(null);

  // Load Exam (Sin Clave de Respuestas)
  useEffect(() => {
    if (!isOpen || !examenId) {
      setExam(null);
      setResultado(null);
      setRespuestas({});
      return;
    }

    // Pre-fill user data if available
    if (user) {
      if (user.matricula) setMatricula(user.matricula);
      if (user.name) setNombre(user.name);
      if (user.grado) setSemestre(user.grado);
      if (user.grupo) setGrupo(user.grupo);
    }

    const fetchExam = async () => {
      setLoading(true);
      setErrorMessage('');
      try {
        // includeClave=false: ESTRICTAMENTE SIN LA CLAVE DE RESPUESTAS PARA EL ALUMNO
        const res = await fetch(`/api/examenes?id=${encodeURIComponent(examenId)}&includeClave=false`);
        const data = await res.json();
        if (!data.success || !data.examen) {
          throw new Error(data.error || 'No se pudo cargar el examen.');
        }
        setExam(data.examen);
        if (!semestre && data.examen.semestre) setSemestre(data.examen.semestre);
        if (!grupo && data.examen.grupo) setGrupo(data.examen.grupo);
      } catch (err: any) {
        setErrorMessage(err.message || 'Error al cargar el examen.');
      } finally {
        setLoading(false);
      }
    };

    fetchExam();
  }, [isOpen, examenId, user]);

  if (!isOpen) return null;

  const handleSelectOption = (preguntaId: string, inciso: string) => {
    if (resultado) return; // Ya calificado
    setRespuestas(prev => ({
      ...prev,
      [preguntaId]: inciso
    }));
  };

  const answeredCount = Object.keys(respuestas).length;
  const totalQuestions = exam?.preguntas?.length || 0;
  const isAllAnswered = totalQuestions > 0 && answeredCount === totalQuestions;

  const handleSubmitExam = async () => {
    setErrorMessage('');
    if (!matricula.trim()) {
      setErrorMessage('Por favor ingresa tu número de matrícula escolar.');
      return;
    }

    if (!nombre.trim()) {
      setErrorMessage('Por favor ingresa tu nombre completo.');
      return;
    }

    if (!isAllAnswered) {
      const missingCount = totalQuestions - answeredCount;
      if (!confirm(`Aún tienes ${missingCount} pregunta(s) sin responder. ¿Deseas enviar el examen de todos modos?`)) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        examenId: exam?.id,
        alumnoMatricula: (matricula || '').trim(),
        alumnoNombre: (nombre || '').trim(),
        alumnoGrupo: (grupo || '').trim() || exam?.grupo || 'TODOS',
        alumnoSemestre: (semestre || '').trim() || exam?.semestre || '1°',
        respuestas
      };

      const res = await fetch('/api/examenes/respuestas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Error al registrar tu examen.');
      }

      setResultado(data.resultado);

      // Disparar confetti si el alumno aprueba (>= 6)
      if (data.resultado && data.resultado.calificacion >= 6) {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch {}
      }

      if (onCompleted) {
        onCompleted(data.resultado);
      }
      if (onFinished) {
        onFinished();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al enviar las respuestas del examen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl glass-panel bg-[#090e1c] border border-cyan-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-600/20 border border-purple-500/40 text-purple-300 flex items-center justify-center shadow-lg shadow-purple-500/10 shrink-0">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-purple-500/20 text-purple-300 font-extrabold px-2.5 py-0.5 rounded-full border border-purple-500/40 uppercase">
                  Examen Interactivo
                </span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-mono px-2 py-0.5 rounded-full border border-cyan-500/30">
                  {exam ? `${exam.semestre} • Grupo "${exam.grupo}"` : 'Cargando...'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                {exam?.titulo || 'Cargando examen escolar...'}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="py-20 text-center space-y-3">
            <RefreshCw size={30} className="animate-spin text-cyan-400 mx-auto" />
            <p className="text-xs text-gray-400">Preparando examen interactivo...</p>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start space-x-2.5 text-xs text-red-300 shrink-0">
            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Exam Content */}
        {!loading && exam && (
          <div className="overflow-y-auto pr-1 flex-1 space-y-5">
            
            {/* RESULT SCREEN IF ALREADY SUBMITTED */}
            {resultado ? (
              <div className="space-y-4 py-4 animate-fade-in">
                <div className={`p-6 rounded-3xl border text-center space-y-3 ${
                  resultado.aprobado
                    ? 'bg-gradient-to-br from-emerald-950/60 via-[#072418] to-black border-emerald-400 shadow-2xl shadow-emerald-500/20'
                    : 'bg-gradient-to-br from-amber-950/60 via-[#261706] to-black border-amber-400 shadow-2xl shadow-amber-500/20'
                }`}>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-xl ${
                    resultado.aprobado
                      ? 'bg-emerald-500 text-black'
                      : 'bg-amber-500 text-black'
                  }`}>
                    {resultado.aprobado ? '🎉' : '📚'}
                  </div>

                  <div>
                    <span className={`text-[11px] font-black uppercase px-3 py-1 rounded-full border ${
                      resultado.aprobado
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}>
                      {resultado.aprobado ? '¡Examen Aprobado!' : 'Requiere Repaso'}
                    </span>

                    <h2 className="text-3xl font-black text-white mt-2">
                      {resultado.calificacion} <span className="text-lg text-gray-400">/ 10</span>
                    </h2>

                    <p className="text-xs text-gray-300 mt-1">
                      Obtuviste <strong>{resultado.aciertos} de {resultado.totalPreguntas} aciertos</strong> ({resultado.porcentaje}%)
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-xs text-gray-300 max-w-md mx-auto leading-relaxed">
                    ✅ Tu resultado ha sido registrado automáticamente en la <strong>Hoja de Google Sheets del Docente {exam.docenteNombre}</strong>.
                  </div>
                </div>

                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs cursor-pointer shadow-lg shadow-cyan-500/20"
                  >
                    Finalizar y Cerrar
                  </button>
                </div>
              </div>
            ) : (
              /* ACTIVE EXAM TAKING */
              <>
                {/* Student Identification Bar */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                  <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                    <User size={14} className="text-cyan-400" />
                    <span>Datos del Alumno Evaluado</span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400">Matrícula (14 dígitos) *</label>
                      <input
                        type="text"
                        value={matricula}
                        onChange={(e) => setMatricula(e.target.value)}
                        placeholder="Ej: 24402080280001"
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs text-white border border-white/10 font-mono focus:border-cyan-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400">Nombre Completo del Alumno *</label>
                      <input
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Nombre(s) y Apellidos"
                        className="w-full glass-input px-3 py-2 rounded-xl text-xs text-white border border-white/10 focus:border-cyan-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="flex items-center justify-between text-xs font-bold text-gray-400 px-1">
                  <span>Progreso de Respuestas</span>
                  <span className="font-mono text-cyan-300">{answeredCount} de {totalQuestions} respondidas</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                    style={{ width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%` }}
                  />
                </div>

                {/* Questions list (SIN CLAVE) */}
                <div className="space-y-4 pt-1">
                  {exam.preguntas.map((q, idx) => {
                    const selectedOpt = respuestas[q.id];
                    return (
                      <div 
                        key={q.id || idx}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                          selectedOpt
                            ? 'bg-cyan-950/20 border-cyan-500/40'
                            : 'bg-black/30 border-white/10'
                        }`}
                      >
                        <div className="flex items-start space-x-3 mb-3">
                          <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                            selectedOpt
                              ? 'bg-cyan-500 text-black'
                              : 'bg-white/10 text-gray-300'
                          }`}>
                            {idx + 1}
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">
                            {q.texto}
                          </h4>
                        </div>

                        {/* Options choices */}
                        <div className="space-y-2 pl-2 sm:pl-10">
                          {q.opciones.map((opt) => {
                            const isSelected = selectedOpt === opt.inciso;
                            return (
                              <button
                                key={opt.inciso}
                                type="button"
                                onClick={() => handleSelectOption(q.id, opt.inciso)}
                                className={`w-full p-3 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center space-x-3 ${
                                  isSelected
                                    ? 'bg-cyan-500/25 border-cyan-400 text-white font-bold shadow-md shadow-cyan-500/10'
                                    : 'bg-white/[0.02] border-white/10 text-gray-300 hover:bg-white/5 hover:border-white/20'
                                }`}
                              >
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                                  isSelected
                                    ? 'border-cyan-400 bg-cyan-400 text-black font-black text-[10px]'
                                    : 'border-gray-500 bg-black/40 text-gray-400 text-[10px]'
                                }`}>
                                  {opt.inciso}
                                </div>
                                <span className="flex-1">{opt.texto}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Submit button bar */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400">
                    Docente titular: <strong>{exam.docenteNombre}</strong>
                  </span>

                  <button
                    type="button"
                    onClick={handleSubmitExam}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/20 flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Calificando examen...</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>Enviar Examen Terminado</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
